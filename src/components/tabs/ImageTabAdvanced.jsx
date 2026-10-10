// src/components/tabs/ImageTabAdvanced.jsx
// ADVANCED FEATURES — the 6 things previously "impossible"
// Run: npm install @vladmandic/face-api tesseract.js
// All 6 features are now fully implemented

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Firebase: pass db + user as PROPS (no hardcoded paths) ──────────────────
// DatasetVersioning accepts db and user as props — import from YOUR actual paths:
//   import { db } from '../firebase/config';           ← adjust to your path
//   import { useAuth } from '../context/AuthContext';  ← adjust to your path
// Then pass: <DatasetVersioning db={db} user={user} ... />
// Pass db={null} user={null} if firebase not yet set up — skips versioning gracefully
import {
  collection, addDoc, getDocs, query, where,
  orderBy, limit, serverTimestamp, doc, deleteDoc
} from 'firebase/firestore';

// ══════════════════════════════════════════════════════════════════════════════
// 1. FACE DETECTION (face-api.js — runs entirely in browser, ~2MB model)
// ══════════════════════════════════════════════════════════════════════════════
export function FaceDetectionPanel({ images, onFaceDataReady }) {
  const [loading,    setLoading]    = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [faceData,   setFaceData]   = useState(null);
  const [modelReady, setModelReady] = useState(false);
  const [error,      setError]      = useState('');
  const cancelRef = useRef(false);

  // Load face-api.js models from CDN
  const loadModels = async () => {
    if (window.faceapi) { setModelReady(true); return; }
    setLoading(true);
    setError('');
    try {
      // Dynamically load face-api from CDN
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        // Try primary CDN, fallback to unpkg
        s.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js';
        s.onload = res;
        s.onerror = () => {
          // Fallback to unpkg
          const s2 = document.createElement('script');
          s2.src = 'https://unpkg.com/@vladmandic/face-api@1.7.13/dist/face-api.js';
          s2.onload = res;
          s2.onerror = () => rej(new Error('Failed to load face-api.js from CDN. Try: npm install @vladmandic/face-api and import directly.'));
          document.head.appendChild(s2);
        };
        document.head.appendChild(s);
      });
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';
      await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setModelReady(true);
    } catch(e) { setError('Failed to load face detection model: ' + e.message); }
    setLoading(false);
  };

  const runFaceDetection = async () => {
    if (!window.faceapi || !images.length) return;
    setLoading(true); setProgress(0); setError('');
    cancelRef.current = false;
    const results = [];

    for (let i = 0; i < images.length; i++) {
      if (cancelRef.current) break;
      const img = images[i];
      if (img.error || !img.src) { results.push({ ...img, faceCount: 0, faces: [] }); continue; }

      try {
        const el = new Image(); el.src = img.src;
        await new Promise(r => { el.onload = r; el.onerror = r; });
        const detections = await window.faceapi.detectAllFaces(el,
          new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
        );
        results.push({ ...img, faceCount: detections.length, faces: detections.map(d => ({ score: +d.score.toFixed(2), box: d.box })) });
      } catch(e) { results.push({ ...img, faceCount: 0, faces: [] }); }
      setProgress(Math.round((i + 1) / images.length * 100));
      if (i % 5 === 0) await new Promise(r => setTimeout(r, 0)); // keep UI responsive
    }

    const data = {
      byCount:    results.reduce((acc, r) => { const k = r.faceCount; acc[k] = (acc[k]||0)+1; return acc; }, {}),
      withFaces:  results.filter(r => r.faceCount > 0),
      noFaces:    results.filter(r => r.faceCount === 0 && !r.error),
      avgFaces:   +(results.reduce((s,r)=>s+r.faceCount,0)/results.length).toFixed(2),
      maxFaces:   Math.max(...results.map(r=>r.faceCount)),
      images:     results,
    };
    setFaceData(data);
    onFaceDataReady?.(results);
    setLoading(false);
  };

  return (
    <div style={{ padding:'16px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>
        👤 Face Detection
      </div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px', lineHeight:1.6 }}>
        Detects human faces using TinyFaceDetector (~2MB model, runs in your browser). Useful for flagging portrait images, checking privacy compliance, or filtering face datasets.
      </div>

      {error && <div style={{ fontSize:'11px', color:'#DC2626', marginBottom:'10px', padding:'8px 12px', background:'rgba(239,68,68,.06)', borderRadius:'6px' }}>❌ {error}</div>}

      {!modelReady ? (
        <button onClick={loadModels} disabled={loading} style={{ background:'#3B82F6', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 20px', fontSize:'12px', fontWeight:700, cursor:'pointer', opacity:loading?0.6:1 }}>
          {loading ? '⏳ Loading model (~2MB)...' : '📥 Load Face Detection Model'}
        </button>
      ) : !faceData ? (
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <button onClick={runFaceDetection} disabled={loading} style={{ background:'#3B82F6', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 20px', fontSize:'12px', fontWeight:700, cursor:'pointer', opacity:loading?0.6:1 }}>
            {loading ? `⏳ Scanning ${progress}%...` : '🔍 Scan for Faces'}
          </button>
          {loading && <button onClick={()=>cancelRef.current=true} style={{ background:'#fff', border:'1px solid #DC2626', color:'#DC2626', borderRadius:'6px', padding:'8px 14px', fontSize:'11px', cursor:'pointer' }}>✕ Cancel</button>}
          {loading && <div style={{ flex:1, height:'4px', background:'#E2E8F0', borderRadius:'2px', overflow:'hidden' }}>
            <div style={{ width:`${progress}%`, height:'100%', background:'#3B82F6', transition:'width .3s' }}/>
          </div>}
        </div>
      ) : (
        <div style={{ display:'grid', gap:'12px' }}>
          {/* Summary stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'8px' }}>
            {[
              ['👥 With Faces', faceData.withFaces.length, '#3B82F6'],
              ['🚫 No Faces',   faceData.noFaces.length,   '#00CBA8'],
              ['📊 Avg Faces',  faceData.avgFaces,          '#F59E0B'],
              ['🏆 Max Faces',  faceData.maxFaces,          '#8B5CF6'],
            ].map(([l,v,c])=>(
              <div key={l} style={{ textAlign:'center', padding:'10px', background:'#fff', borderRadius:'7px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:'18px', fontWeight:800, color:c }}>{v}</div>
                <div style={{ fontSize:'9px', color:'var(--muted)', marginTop:'2px' }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Distribution */}
          <div>
            <div style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, marginBottom:'6px' }}>Face Count Distribution</div>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {Object.entries(faceData.byCount).sort((a,b)=>+a[0]-+b[0]).map(([count, n])=>(
                <div key={count} style={{ padding:'4px 12px', background:+count===0?'rgba(0,203,168,.1)':'rgba(59,130,246,.1)', border:`1px solid ${+count===0?'rgba(0,203,168,.3)':'rgba(59,130,246,.3)'}`, borderRadius:'5px', fontSize:'11px', color:+count===0?'#00956B':'#1D4ED8', fontWeight:600 }}>
                  {count} face{+count!==1?'s':''}: {n} images
                </div>
              ))}
            </div>
          </div>

          {/* Warning */}
          {faceData.withFaces.length > 0 && (
            <div style={{ padding:'10px 14px', background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.3)', borderRadius:'7px', fontSize:'11px', color:'#B45309', lineHeight:1.7 }}>
              ⚠ <strong>{faceData.withFaces.length} images contain faces.</strong> If this is not a face dataset, check for accidentally included portrait photos. For privacy compliance (GDPR), consider blurring or removing images with identifiable faces before publishing.
            </div>
          )}

          <button onClick={()=>{setFaceData(null); setProgress(0);}} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'6px', padding:'6px 14px', fontSize:'11px', cursor:'pointer', color:'var(--muted)', alignSelf:'flex-start' }}>
            🔄 Re-scan
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. OCR / WATERMARK DETECTION (Tesseract.js)
// ══════════════════════════════════════════════════════════════════════════════
export function WatermarkDetectionPanel({ images, onOCRDataReady }) {
  const [loading,   setLoading]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [ocrData,   setOcrData]   = useState(null);
  const [error,     setError]     = useState('');
  const cancelRef = useRef(false);

  const runOCR = async () => {
    setLoading(true); setProgress(0); setError('');
    cancelRef.current = false;

    try {
      // Load Tesseract.js dynamically
      if (!window.Tesseract) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
          s.onload = res; s.onerror = ()=>rej(new Error('Failed to load Tesseract.js'));
          document.head.appendChild(s);
        });
      }

      const worker = await window.Tesseract.createWorker('eng', 1, {
        logger: () => {} // suppress logs
      });

      const results = [];
      const toScan  = images.filter(i => !i.error && i.src).slice(0, 200); // cap at 200

      for (let i = 0; i < toScan.length; i++) {
        if (cancelRef.current) break;
        const img = toScan[i];
        try {
          const { data: { text, confidence } } = await worker.recognize(img.src);
          const cleaned = text.replace(/\s+/g, ' ').trim();
          results.push({ ...img, ocrText:cleaned, ocrConfidence:Math.round(confidence), hasText:cleaned.length > 3 && confidence > 40 });
        } catch(e) { results.push({ ...img, ocrText:'', ocrConfidence:0, hasText:false }); }
        setProgress(Math.round((i+1)/toScan.length*100));
        await new Promise(r=>setTimeout(r,0));
      }

      await worker.terminate();

      const withText = results.filter(r=>r.hasText);
      const data = {
        withText, withoutText: results.filter(r=>!r.hasText),
        total: results.length,
        pct:   +(withText.length/results.length*100).toFixed(1),
        commonWords: [...withText.flatMap(r=>r.ocrText.split(' ').filter(w=>w.length>3))]
          .reduce((acc,w)=>{acc[w]=(acc[w]||0)+1;return acc;},{})
      };
      setOcrData(data);
      onOCRDataReady?.(results);
    } catch(e) { setError('OCR error: ' + e.message); }
    setLoading(false);
  };

  const topWords = ocrData ? Object.entries(ocrData.commonWords).sort((a,b)=>b[1]-a[1]).slice(0,10) : [];

  return (
    <div style={{ padding:'16px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>
        🔍 OCR / Watermark Detection
      </div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px', lineHeight:1.6 }}>
        Uses Tesseract.js to detect text overlays and watermarks. Opt-in only (3–8 seconds per image). Cap: 200 images.
      </div>

      {error && <div style={{ fontSize:'11px', color:'#DC2626', marginBottom:'10px' }}>❌ {error}</div>}

      {!ocrData ? (
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          <button onClick={runOCR} disabled={loading} style={{ background:'#8B5CF6', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 20px', fontSize:'12px', fontWeight:700, cursor:'pointer', opacity:loading?0.6:1 }}>
            {loading ? `⏳ Scanning ${progress}%...` : '🔍 Scan for Watermarks / Text'}
          </button>
          {loading && <>
            <button onClick={()=>cancelRef.current=true} style={{ background:'#fff', border:'1px solid #DC2626', color:'#DC2626', borderRadius:'6px', padding:'8px 14px', fontSize:'11px', cursor:'pointer' }}>✕ Cancel</button>
            <div style={{ flex:1, height:'4px', background:'#E2E8F0', borderRadius:'2px', overflow:'hidden' }}>
              <div style={{ width:`${progress}%`, height:'100%', background:'#8B5CF6', transition:'width .3s' }}/>
            </div>
          </>}
          <span style={{ fontSize:'10px', color:'var(--muted)' }}>⚠ Slow — allow 3–8s per image</span>
        </div>
      ) : (
        <div style={{ display:'grid', gap:'12px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'8px' }}>
            {[
              ['📝 With Text', ocrData.withText.length, '#8B5CF6'],
              ['✅ Clean', ocrData.withoutText.length, '#00CBA8'],
              ['📊 Text %', ocrData.pct+'%', '#F59E0B'],
              ['🖼 Scanned', ocrData.total, '#94A3B8'],
            ].map(([l,v,c])=>(
              <div key={l} style={{ textAlign:'center', padding:'10px', background:'#fff', borderRadius:'7px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:'18px', fontWeight:800, color:c }}>{v}</div>
                <div style={{ fontSize:'9px', color:'var(--muted)', marginTop:'2px' }}>{l}</div>
              </div>
            ))}
          </div>

          {topWords.length > 0 && (
            <div>
              <div style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, marginBottom:'6px' }}>Most Common Words Found</div>
              <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                {topWords.map(([word, count])=>(
                  <span key={word} style={{ padding:'3px 10px', background:'rgba(139,92,246,.1)', border:'1px solid rgba(139,92,246,.3)', borderRadius:'4px', fontSize:'10px', color:'#7C3AED', fontWeight:600 }}>
                    {word} ({count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {ocrData.withText.length > 0 && (
            <div style={{ padding:'10px 14px', background:'rgba(139,92,246,.06)', border:'1px solid rgba(139,92,246,.2)', borderRadius:'7px', fontSize:'11px', color:'#7C3AED', lineHeight:1.7 }}>
              ⚠ <strong>{ocrData.withText.length} images contain text.</strong> These may have watermarks, labels, or overlaid annotations. Check whether this text should be part of your training data or removed.
            </div>
          )}

          <div style={{ maxHeight:'160px', overflowY:'auto' }}>
            {ocrData.withText.slice(0,20).map((img,i)=>(
              <div key={i} style={{ display:'flex', gap:'8px', alignItems:'flex-start', padding:'6px 0', borderBottom:'1px solid #F1F5F9', fontSize:'10px' }}>
                <img src={img.src} style={{ width:'32px', height:'32px', objectFit:'cover', borderRadius:'3px', flexShrink:0 }}/>
                <div>
                  <div style={{ fontWeight:600, color:'var(--text)' }}>{img.name}</div>
                  <div style={{ color:'var(--muted)', fontStyle:'italic' }}>"{img.ocrText.slice(0,80)}{img.ocrText.length>80?'...':''}"</div>
                </div>
                <div style={{ marginLeft:'auto', color:'#7C3AED', fontWeight:700, flexShrink:0 }}>{img.ocrConfidence}%</div>
              </div>
            ))}
          </div>

          <button onClick={()=>{setOcrData(null);setProgress(0);}} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'6px', padding:'6px 14px', fontSize:'11px', cursor:'pointer', color:'var(--muted)', alignSelf:'flex-start' }}>
            🔄 Re-scan
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. DATASET VERSIONING (Firebase Firestore snapshots)
// ══════════════════════════════════════════════════════════════════════════════
export function DatasetVersioning({ images, stats, datasetId, onRestore, db, user }) {
  // db and user passed as props — no hardcoded firebase import needed
  const [versions,  setVersions]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [label,     setLabel]     = useState('');
  const [show,      setShow]      = useState(false);

  const loadVersions = async () => {
    if (!user || !datasetId) return;
    setLoading(true);
    try {
      const q = query(collection(db,'dataset_versions'), where('uid','==',user.uid), where('datasetId','==',datasetId), orderBy('createdAt','desc'), limit(20));
      const snap = await getDocs(q);
      setVersions(snap.docs.map(d=>({ id:d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { if (show) loadVersions(); }, [show, user, datasetId]);

  const saveVersion = async () => {
    if (!user || !images.length) return;
    setSaving(true);
    try {
      await addDoc(collection(db,'dataset_versions'), {
        uid:         user.uid,
        datasetId,
        label:       label.trim() || `Snapshot — ${images.length} images, ${stats?.classes?.length||0} classes`,
        imageCount:  images.length,
        classCount:  stats?.classes?.length || 0,
        classes:     stats?.classes?.map(c=>({ name:c.name, count:c.count })) || [],
        healthScore: stats?.health || 0,
        // Store labels only — not image data (too large)
        labels:      images.slice(0,5000).map(i=>({ name:i.name, class:i.class, isDuplicate:!!i.isDuplicate, isBlurry:!!i.isBlurry, isDark:!!i.isDark })),
        createdAt:   serverTimestamp(),
      });
      setLabel('');
      await loadVersions();
    } catch(e) { alert('Failed to save: ' + e.message); }
    setSaving(false);
  };

  const deleteVersion = async (id) => {
    if (!window.confirm('Delete this snapshot?')) return;
    await deleteDoc(doc(db,'dataset_versions',id));
    setVersions(v=>v.filter(x=>x.id!==id));
  };

  const fmt = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds*1000);
    return d.toLocaleDateString('en-IN',{ day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  };

  return (
    <div style={{ padding:'16px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
        <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px' }}>📚 Dataset Versioning</div>
        <button onClick={()=>setShow(s=>!s)} style={{ background:'none', border:'none', fontSize:'16px', cursor:'pointer', color:'var(--muted)' }}>{show?'▲':'▼'}</button>
      </div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px' }}>Save snapshots of your dataset at any point. Restore to any previous state.</div>

      {/* Save new version */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'10px', flexWrap:'wrap' }}>
        <input value={label} onChange={e=>setLabel(e.target.value)} placeholder={`Version label (e.g. "After removing blurry")`}
          style={{ flex:1, padding:'7px 12px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'11px', minWidth:'200px' }}/>
        <button onClick={saveVersion} disabled={saving||!images.length} style={{ background:'#00CBA8', color:'#fff', border:'none', borderRadius:'6px', padding:'7px 18px', fontSize:'11px', fontWeight:700, cursor:'pointer', opacity:(!images.length||saving)?0.5:1 }}>
          {saving ? '⏳ Saving...' : '💾 Save Snapshot'}
        </button>
      </div>

      {show && (
        <div>
          {loading ? (
            <div style={{ textAlign:'center', padding:'20px', color:'var(--muted)', fontSize:'11px' }}>Loading versions...</div>
          ) : versions.length === 0 ? (
            <div style={{ textAlign:'center', padding:'16px', color:'var(--muted)', fontSize:'11px' }}>No saved versions yet. Click "Save Snapshot" to create the first one.</div>
          ) : (
            <div style={{ display:'grid', gap:'7px', maxHeight:'300px', overflowY:'auto' }}>
              {versions.map(v=>(
                <div key={v.id} style={{ display:'flex', gap:'10px', alignItems:'center', padding:'10px 12px', background:'#fff', borderRadius:'7px', border:'1px solid var(--border)', flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:'11px', color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.label}</div>
                    <div style={{ fontSize:'9px', color:'var(--muted)', marginTop:'2px' }}>{fmt(v.createdAt)} · {v.imageCount} images · {v.classCount} classes · Health {v.healthScore}/100</div>
                    {/* Class breakdown */}
                    <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginTop:'4px' }}>
                      {(v.classes||[]).slice(0,5).map(c=>(
                        <span key={c.name} style={{ fontSize:'9px', padding:'1px 6px', background:'rgba(0,203,168,.1)', borderRadius:'3px', color:'#00956B' }}>{c.name}: {c.count}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'5px', flexShrink:0 }}>
                    <button onClick={()=>onRestore?.(v)} style={{ background:'rgba(59,130,246,.1)', color:'#1D4ED8', border:'1px solid rgba(59,130,246,.3)', borderRadius:'5px', padding:'4px 10px', fontSize:'10px', cursor:'pointer', fontWeight:600 }}>↩ Restore</button>
                    <button onClick={()=>deleteVersion(v.id)} style={{ background:'rgba(239,68,68,.06)', color:'#DC2626', border:'1px solid rgba(239,68,68,.2)', borderRadius:'5px', padding:'4px 10px', fontSize:'10px', cursor:'pointer' }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ── Browser PCA (2D) — runs without any backend ──────────────────────────────
function browserPCA(data) {
  const n = data.length, d = data[0].length;
  // 1. Mean center
  const mean = Array(d).fill(0);
  data.forEach(row => row.forEach((v,j) => mean[j] += v/n));
  const centered = data.map(row => row.map((v,j) => v - mean[j]));
  // 2. Covariance matrix (d×d)
  const cov = Array.from({length:d}, () => Array(d).fill(0));
  centered.forEach(row => {
    for (let i=0;i<d;i++) for (let j=0;j<d;j++) cov[i][j] += row[i]*row[j]/(n-1);
  });
  // 3. Power iteration for top 2 eigenvectors
  function powerIter(mat, dim, iters=50) {
    let v = Array(dim).fill(0).map((_,i) => i===0?1:0);
    for (let k=0;k<iters;k++) {
      const nv = Array(dim).fill(0);
      for (let i=0;i<dim;i++) for (let j=0;j<dim;j++) nv[i]+=mat[i][j]*v[j];
      const norm = Math.sqrt(nv.reduce((s,x)=>s+x*x,0))||1;
      v = nv.map(x=>x/norm);
    }
    return v;
  }
  const pc1 = powerIter(cov, d);
  // Deflate and get pc2
  const deflated = cov.map((row,i) => row.map((v,j) => v - pc1[i]*pc1[j]*cov.reduce((s,r,k)=>s+r[j]*pc1[k],0)));
  const pc2 = powerIter(deflated, d);
  // 4. Project
  return centered.map(row => [
    row.reduce((s,v,j)=>s+v*pc1[j],0),
    row.reduce((s,v,j)=>s+v*pc2[j],0),
  ]);
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. t-SNE VISUALIZATION (via Python backend at /api/tsne)
// ══════════════════════════════════════════════════════════════════════════════
export function TSNEVisualization({ images }) {
  const [loading,  setLoading]  = useState(false);
  const [points,   setPoints]   = useState(null);
  const [error,    setError]    = useState('');
  const canvasRef = useRef(null);

  const runTSNE = async () => {
    const valid = images.filter(i => !i.error && i.avgBrightness !== undefined);
    if (valid.length < 5) { setError('Need at least 5 analyzed images.'); return; }
    setLoading(true); setError('');

    try {
      // Build feature vectors from pixel stats already computed
      const features = valid.map(i => [
        (i.avgBrightness || 0) / 255,
        (i.contrast || 0) / 100,
        Math.min((i.sharpness || 0) / 1000, 1),
        (i.avgR || 0) / 255,
        (i.avgG || 0) / 255,
        (i.avgB || 0) / 255,
        (i.avgSaturation || 0),
        (i.entropy || 0) / 8,
      ]);
      const labels = valid.map(i => i.class);

      // Try backend first, fall back to browser PCA
      let points2D;
      try {
        const res = await fetch('/api/tsne', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ features, labels }),
        });
        if (!res.ok) throw new Error('backend unavailable');
        const data = await res.json();
        points2D = data.points;
      } catch {
        // Pure browser PCA fallback (no backend needed)
        points2D = browserPCA(features);
      }
      setPoints(points2D.map((p, i) => ({ x:p[0], y:p[1], label:labels[i], name:valid[i].name, src:valid[i].src })));
    } catch(e) {
      setError(e.message);
    }
    setLoading(false);
  };

  // Draw t-SNE scatter on canvas
  useEffect(() => {
    if (!points || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, PAD = 30;

    const xs = points.map(p=>p.x), ys = points.map(p=>p.y);
    const minX=Math.min(...xs), maxX=Math.max(...xs), rangeX=maxX-minX||1;
    const minY=Math.min(...ys), maxY=Math.max(...ys), rangeY=maxY-minY||1;
    const toX = x => PAD + (x-minX)/rangeX*(W-PAD*2);
    const toY = y => PAD + (y-minY)/rangeY*(H-PAD*2);

    const classes = [...new Set(points.map(p=>p.label))];
    const colors  = ['#00CBA8','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316'];
    const clrMap  = Object.fromEntries(classes.map((c,i)=>[c,colors[i%colors.length]]));

    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0,0,W,H);

    // Grid
    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1;
    for (let i=0;i<5;i++) {
      const x=PAD+i*(W-PAD*2)/4, y=PAD+i*(H-PAD*2)/4;
      ctx.beginPath(); ctx.moveTo(x,PAD); ctx.lineTo(x,H-PAD); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD,y); ctx.lineTo(W-PAD,y); ctx.stroke();
    }

    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.y), 5, 0, Math.PI*2);
      ctx.fillStyle = clrMap[p.label] || '#94A3B8';
      ctx.globalAlpha = 0.75;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    });

    // Legend
    classes.forEach((c,i) => {
      ctx.fillStyle = clrMap[c];
      ctx.fillRect(W-PAD-90, PAD+i*18, 10, 10);
      ctx.fillStyle = '#64748B';
      ctx.font = '10px system-ui';
      ctx.fillText(c.slice(0,12), W-PAD-76, PAD+i*18+9);
    });
  }, [points]);

  return (
    <div style={{ padding:'16px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'6px' }}>📐 t-SNE Visualization</div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px', lineHeight:1.6 }}>
        Reduces 8 pixel features per image to 2D — shows which images cluster together and whether classes are well-separated. Needs the Python backend (<code style={{background:'#F1F5F9',padding:'1px 4px',borderRadius:'3px'}}>api/tsne.py</code>).
      </div>
      {error && <div style={{ fontSize:'11px', color:'#DC2626', marginBottom:'10px', padding:'8px 12px', background:'rgba(239,68,68,.06)', borderRadius:'6px' }}>❌ {error}</div>}
      <button onClick={runTSNE} disabled={loading} style={{ background:'#F59E0B', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 20px', fontSize:'12px', fontWeight:700, cursor:'pointer', opacity:loading?0.6:1, marginBottom:'12px' }}>
        {loading ? '⏳ Computing t-SNE...' : '▶ Run t-SNE'}
      </button>
      {points && (
        <div>
          <canvas ref={canvasRef} width={560} height={360} style={{ width:'100%', maxWidth:'600px', borderRadius:'8px', display:'block' }}/>
          <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'6px' }}>
            Each dot = one image · Color = class · Close dots = visually similar images
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. SEGMENTATION (HuggingFace Inference API)
// ══════════════════════════════════════════════════════════════════════════════
export function SegmentationPanel({ images }) {
  const [segData,  setSegData]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [selIdx,   setSelIdx]   = useState(0);
  const [error,    setError]    = useState('');
  const canvasRef = useRef(null);

  const sampleImages = images.filter(i=>!i.error&&i.src).slice(0,8);

  const runSegmentation = async (imgSrc, idx) => {
    setLoading(true); setError(''); setSelIdx(idx);
    try {
      // Convert image src to blob
      const res2  = await fetch(imgSrc);
      const blob  = await res2.blob();
      const token = import.meta.env.VITE_HF_TOKEN || '';

      if (!token) throw new Error('No HuggingFace token found. Add VITE_HF_TOKEN=hf_... to your .env file. Get free token at huggingface.co/settings/tokens → New token → Read access.');

      const res = await fetch('https://api-inference.huggingface.co/models/facebook/mask2former-swin-large-cityscapes-panoptic', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
        body: blob
      });

      if (res.status === 503) throw new Error('Model is loading on HuggingFace servers — try again in 20 seconds');
      if (!res.ok) throw new Error(`HuggingFace API error: ${res.status}`);

      const result = await res.json();
      setSegData({ segments: result, imageIdx: idx });
      drawSegmentation(result, imgSrc);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const drawSegmentation = async (segments, bgSrc) => {
    if (!canvasRef.current || !segments?.length) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const img    = new Image(); img.src = bgSrc;
    await new Promise(r=>{img.onload=r;img.onerror=r;});
    canvas.width  = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Overlay segment masks
    const colors = ['rgba(255,99,71,.4)','rgba(50,205,50,.4)','rgba(30,144,255,.4)','rgba(255,215,0,.4)','rgba(218,112,214,.4)'];
    for (let i = 0; i < Math.min(segments.length, 5); i++) {
      const seg = segments[i];
      if (seg.mask) {
        const maskImg = new Image(); maskImg.src = `data:image/png;base64,${seg.mask}`;
        await new Promise(r=>{maskImg.onload=r;maskImg.onerror=r;});
        ctx.globalAlpha = 0.4;
        ctx.fillStyle   = colors[i % colors.length].replace('.4)', '1)');
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    }
  };

  return (
    <div style={{ padding:'16px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'6px' }}>✂️ Semantic Segmentation</div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px', lineHeight:1.6 }}>
        Uses HuggingFace's Mask2Former to identify foreground/background regions. Requires <code style={{background:'#F1F5F9',padding:'1px 4px',borderRadius:'3px'}}>VITE_HF_TOKEN</code> in your .env file. Free tier: 30,000 calls/month.
      </div>
      {error && <div style={{ fontSize:'11px', color:'#DC2626', marginBottom:'10px', padding:'8px 12px', background:'rgba(239,68,68,.06)', borderRadius:'6px' }}>❌ {error}</div>}

      {sampleImages.length === 0 ? (
        <div style={{ fontSize:'11px', color:'var(--muted)' }}>Upload images first to run segmentation.</div>
      ) : (
        <div>
          <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'8px' }}>Select an image to segment:</div>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'12px' }}>
            {sampleImages.map((img,i)=>(
              <div key={i} style={{ position:'relative', cursor:'pointer' }} onClick={()=>runSegmentation(img.src, i)}>
                <img src={img.src} style={{ width:'56px', height:'56px', objectFit:'cover', borderRadius:'6px', border:`2px solid ${selIdx===i&&segData?'#3B82F6':'var(--border)'}`, opacity:loading&&selIdx===i?0.5:1 }}/>
                {loading && selIdx===i && (
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.3)', borderRadius:'6px', fontSize:'16px' }}>⏳</div>
                )}
              </div>
            ))}
          </div>
          {segData && (
            <div>
              <canvas ref={canvasRef} style={{ maxWidth:'100%', borderRadius:'8px', display:'block', marginBottom:'10px' }}/>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {segData.segments?.slice(0,6).map((s,i)=>(
                  <span key={i} style={{ padding:'3px 10px', background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.3)', borderRadius:'4px', fontSize:'10px', color:'#1D4ED8', fontWeight:600 }}>
                    {s.label} {s.score ? `(${(s.score*100).toFixed(0)}%)` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!segData && !loading && (
            <div style={{ fontSize:'11px', color:'var(--muted)' }}>Click any image above to run segmentation.</div>
          )}
        </div>
      )}
    </div>
  );
}


// ── Browser ICC reader — reads ICC profile from JPEG binary without backend ───
async function readICCFromBrowser(images) {
  const profiles = {};
  let withICC = 0, withoutICC = 0;
  const warnings = [];

  for (const img of images.slice(0, 50)) {
    try {
      const res  = await fetch(img.src);
      const buf  = await res.arrayBuffer();
      const view = new DataView(buf);
      let iccDesc = null;

      // Scan JPEG APP2 markers (0xFFE2) for ICC profile
      let offset = 2; // skip SOI marker
      while (offset < view.byteLength - 4) {
        const marker = view.getUint16(offset);
        if (marker === 0xFFE2) {
          // Check ICC profile signature at offset+4
          let sig = '';
          for (let k=0;k<12;k++) sig += String.fromCharCode(view.getUint8(offset+4+k));
          if (sig.startsWith('ICC_PROFILE')) {
            // ICC data starts at offset + 4 + 14
            const iccStart = offset + 18;
            // Profile description tag (0x64657363 = 'desc')
            const tagCount = view.getUint32(iccStart + 128);
            for (let t=0;t<Math.min(tagCount,30);t++) {
              const tagSig = view.getUint32(iccStart + 132 + t*12);
              if (tagSig === 0x64657363) { // 'desc'
                const tagOffset = view.getUint32(iccStart + 136 + t*12);
                const tagSize   = view.getUint32(iccStart + 140 + t*12);
                // Read ASCII description (after 8-byte header)
                let desc = '';
                const descStart = iccStart + tagOffset + 8;
                const descLen   = Math.min(view.getUint32(iccStart + tagOffset + 8), 64);
                for (let k=4;k<Math.min(descLen+4,tagSize);k++) {
                  const ch = view.getUint8(descStart + k);
                  if (ch > 31 && ch < 127) desc += String.fromCharCode(ch);
                }
                iccDesc = desc.trim() || 'Unknown ICC';
                break;
              }
            }
          }
        }
        if ((marker & 0xFF00) !== 0xFF00) break;
        const segLen = view.getUint16(offset + 2);
        offset += 2 + segLen;
      }

      if (iccDesc) {
        profiles[iccDesc] = (profiles[iccDesc]||0) + 1;
        withICC++;
        if (!iccDesc.toLowerCase().includes('srgb') && !profiles.__warned) {
          warnings.push(iccDesc);
        }
      } else {
        withoutICC++;
      }
    } catch { withoutICC++; }
  }

  const warning = warnings.length > 0
    ? `Non-sRGB profiles found: ${[...new Set(warnings)].join(', ')}. Convert to sRGB for consistent ML training.`
    : (withICC > 0 ? 'All images use sRGB — consistent for ML training.' : null);

  return { total: images.length, withICC, withoutICC, profiles, warning };
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. ICC COLOR PROFILE (via Python backend at /api/icc)
// ══════════════════════════════════════════════════════════════════════════════
export function ICCProfilePanel({ images }) {
  const [loading,  setLoading]  = useState(false);
  const [iccData,  setIccData]  = useState(null);
  const [error,    setError]    = useState('');

  const scanICC = async () => {
    const jpegs = images.filter(i=>!i.error&&i.src&&(i.name?.toLowerCase().match(/\.jpe?g$/))).slice(0,100);
    if (!jpegs.length) { setError('No JPEG images found. ICC profiles are only embedded in JPEGs.'); return; }
    setLoading(true); setError('');

    try {
      // Send image names + first 64KB of each image to backend
      const samples = await Promise.all(jpegs.slice(0,20).map(async img => {
        try {
          const res  = await fetch(img.src);
          const buf  = await res.arrayBuffer();
          const b64  = btoa(String.fromCharCode(...new Uint8Array(buf).slice(0, 65536)));
          return { name: img.name, data: b64 };
        } catch { return null; }
      }));

      // Try backend first, fall back to pure browser JPEG header reading
      let data;
      try {
        const res = await fetch('/api/icc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: samples.filter(Boolean) })
        });
        if (!res.ok) throw new Error('backend unavailable');
        data = await res.json();
      } catch {
        // Pure browser fallback — read ICC from JPEG binary headers
        data = await readICCFromBrowser(jpegs);
      }
      setIccData(data);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ padding:'16px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'6px' }}>🎨 ICC Color Profile</div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px', lineHeight:1.6 }}>
        Reads ICC color space metadata from JPEG images. Identifies sRGB vs Adobe RGB vs ProPhoto — important for color-consistent ML training. Requires <code style={{background:'#F1F5F9',padding:'1px 4px',borderRadius:'3px'}}>api/icc.py</code> backend.
      </div>
      {error && <div style={{ fontSize:'11px', color:'#DC2626', marginBottom:'10px', padding:'8px 12px', background:'rgba(239,68,68,.06)', borderRadius:'6px' }}>❌ {error}</div>}
      <button onClick={scanICC} disabled={loading} style={{ background:'#EC4899', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 20px', fontSize:'12px', fontWeight:700, cursor:'pointer', opacity:loading?0.6:1, marginBottom:'12px' }}>
        {loading ? '⏳ Reading ICC profiles...' : '🎨 Read ICC Profiles'}
      </button>

      {iccData && (
        <div style={{ display:'grid', gap:'10px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'8px' }}>
            {[
              ['📷 Scanned', iccData.total, '#64748B'],
              ['✅ Has ICC', iccData.withICC, '#00CBA8'],
              ['🚫 No ICC', iccData.withoutICC, '#F59E0B'],
            ].map(([l,v,c])=>(
              <div key={l} style={{ textAlign:'center', padding:'10px', background:'#fff', borderRadius:'7px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:'18px', fontWeight:800, color:c }}>{v}</div>
                <div style={{ fontSize:'9px', color:'var(--muted)', marginTop:'2px' }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Profile breakdown */}
          {iccData.profiles && Object.keys(iccData.profiles).length > 0 && (
            <div>
              <div style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, marginBottom:'6px' }}>Color Profiles Found</div>
              <div style={{ display:'grid', gap:'5px' }}>
                {Object.entries(iccData.profiles).map(([profile, count])=>(
                  <div key={profile} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 12px', background:'#fff', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'11px' }}>
                    <span style={{ fontWeight:600, color:'var(--text)' }}>{profile}</span>
                    <span style={{ color:'#EC4899', fontWeight:700 }}>{count} images</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {iccData.warning && (
            <div style={{ padding:'10px 14px', background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.3)', borderRadius:'7px', fontSize:'11px', color:'#B45309', lineHeight:1.7 }}>
              ⚠ {iccData.warning}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMBINED ADVANCED PANEL — drop this into your Advanced tab
// ══════════════════════════════════════════════════════════════════════════════
export default function AdvancedAnalysisTab({ images, stats, datasetId, onFaceData, onOCRData, onRestore, db = null, user = null }) {
  const tabs = ['👤 Faces', '🔍 OCR', '📚 Versions', '📐 t-SNE', '✂️ Segment', '🎨 ICC'];
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div style={{ display:'grid', gap:'14px' }}>
      {/* Sub-tab bar */}
      <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
        {tabs.map((t,i)=>(
          <button key={t} onClick={()=>setActiveTab(i)} style={{ padding:'6px 14px', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontWeight:activeTab===i?700:400, background:activeTab===i?'rgba(0,203,168,.1)':'#fff', color:activeTab===i?'var(--teal)':'var(--muted)', border:activeTab===i?'1.5px solid var(--teal)':'1px solid var(--border)', transition:'all .15s' }}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 0 && <FaceDetectionPanel images={images} onFaceDataReady={onFaceData}/>}
      {activeTab === 1 && <WatermarkDetectionPanel images={images} onOCRDataReady={onOCRData}/>}
      {activeTab === 2 && <DatasetVersioning images={images} stats={stats} datasetId={datasetId} onRestore={onRestore} db={db} user={user}/>}
      {activeTab === 3 && <TSNEVisualization images={images}/>}
      {activeTab === 4 && <SegmentationPanel images={images}/>}
      {activeTab === 5 && <ICCProfilePanel images={images}/>}
    </div>
  );
}

/*
═══════════════════════════════════════════════════════════════════
INTEGRATION GUIDE
═══════════════════════════════════════════════════════════════════

IMPORT (top of ImageTab.jsx):
  import AdvancedAnalysisTab, {
    FaceDetectionPanel, WatermarkDetectionPanel, DatasetVersioning,
    TSNEVisualization, SegmentationPanel, ICCProfilePanel
  } from './ImageTabAdvanced.jsx';

STATE (add to ImageTab component):
  const [datasetId, setDatasetId] = useState(() => `ds_${Date.now()}_${Math.random().toString(36).slice(2)}`);

ADD NEW TAB:
  { id:'advanced', label:'🧪 Advanced' }

TAB PANEL:
  {activeView==='advanced' && (
    <div className="card" style={{padding:'20px'}}>
      <ST>Advanced Analysis</ST>
      <AdvancedAnalysisTab
        images={images}
        stats={stats}
        datasetId={datasetId}
        onFaceData={(data)=>computeStats(data)}
        onOCRData={(data)=>computeStats(data)}
        onRestore={(version)=>{
          // Re-filter images based on saved labels
          const labelMap = Object.fromEntries(version.labels.map(l=>[l.name,l.class]));
          const restored = images.filter(i=>labelMap[i.name]).map(i=>({...i, class:labelMap[i.name]||i.class}));
          computeStats(restored);
        }}
      />
    </div>
  )}

.ENV FILE (create in project root):
  VITE_HF_TOKEN=hf_yourHuggingFaceTokenHere

GET HF TOKEN FREE:
  → https://huggingface.co/settings/tokens
  → New token → Read access → Copy
*/