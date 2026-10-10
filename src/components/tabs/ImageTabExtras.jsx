// src/components/tabs/ImageTabExtras.jsx
// Supplementary components for ImageTab — all missing features added
// Import these into ImageTab.jsx and wire them in as shown at the bottom

import React, { useState, useMemo } from 'react';

// ── 1. CANCEL PROCESSING ─────────────────────────────────────────────────────
// Add this ref inside ImageTab component:
//   const cancelRef = useRef(false);
// In processImages loop, check:
//   if(cancelRef.current) { setAnalyzing(false); setProgress('Cancelled.'); cancelRef.current=false; return; }
// Add this button next to the progress bar:
export function CancelButton({ onCancel }) {
  return (
    <button onClick={onCancel} style={{
      background:'rgba(239,68,68,.1)', color:'#DC2626',
      border:'1px solid rgba(239,68,68,.3)', borderRadius:'5px',
      padding:'4px 12px', fontSize:'11px', cursor:'pointer', fontWeight:600, marginLeft:'10px'
    }}>
      ✕ Cancel
    </button>
  );
}

// ── 2. NEAR-DUPLICATE DETECTION (Hamming distance) ───────────────────────────
// Hamming distance between two hash strings — lower = more similar
const hammingDist = (a, b) => {
  let dist = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
};

export function NearDuplicateFinder({ images, onMarkRemove }) {
  const [threshold, setThreshold] = useState(8);
  const [pairs, setPairs] = useState([]);
  const [running, setRunning] = useState(false);

  const findNearDups = () => {
    setRunning(true);
    const valid = images.filter(i => i.hash && i.src && !i.error);
    const found = [];
    for (let i = 0; i < valid.length; i++) {
      for (let j = i + 1; j < valid.length; j++) {
        const dist = hammingDist(valid[i].hash, valid[j].hash);
        if (dist > 0 && dist <= threshold) {
          found.push({ a: valid[i], b: valid[j], dist });
        }
      }
    }
    found.sort((a, b) => a.dist - b.dist);
    setPairs(found.slice(0, 20));
    setRunning(false);
  };

  return (
    <div style={{ padding:'16px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>
        🔍 Near-Duplicate Detection (Hamming Distance)
      </div>
      <div style={{ display:'flex', gap:'12px', alignItems:'center', marginBottom:'12px', flexWrap:'wrap' }}>
        <div>
          <label style={{ fontSize:'11px', color:'var(--muted)', display:'block', marginBottom:'3px' }}>
            Similarity threshold: <strong style={{ color:'var(--teal)' }}>{threshold}</strong> bits
          </label>
          <input type="range" min={1} max={20} value={threshold} onChange={e=>setThreshold(Number(e.target.value))}
            style={{ width:'180px', accentColor:'#00CBA8' }} />
          <div style={{ fontSize:'9px', color:'var(--muted)', marginTop:'2px' }}>
            Lower = more strict (0=exact, 20=very similar)
          </div>
        </div>
        <button onClick={findNearDups} disabled={running} style={{
          background:'#00CBA8', color:'#fff', border:'none', borderRadius:'6px',
          padding:'8px 18px', fontSize:'12px', fontWeight:700, cursor:'pointer'
        }}>
          {running ? '⏳ Scanning...' : '🔍 Find Near-Duplicates'}
        </button>
      </div>

      {pairs.length > 0 && (
        <div style={{ display:'grid', gap:'10px' }}>
          <div style={{ fontSize:'12px', color:'#B45309' }}>
            ⚠ Found {pairs.length} near-duplicate pairs:
          </div>
          {pairs.map((pair, i) => (
            <div key={i} style={{ display:'flex', gap:'12px', alignItems:'center', padding:'10px', background:'#fff', borderRadius:'8px', border:'1px solid #FDE68A' }}>
              <img src={pair.a.src} alt="" style={{ width:'60px', height:'60px', objectFit:'cover', borderRadius:'4px' }}/>
              <div style={{ fontSize:'11px', color:'var(--muted)', textAlign:'center' }}>
                <div style={{ fontWeight:700, color:'#B45309' }}>dist: {pair.dist}</div>
                <div>{pair.dist <= 3 ? '🔴 Very similar' : pair.dist <= 8 ? '🟡 Similar' : '🟢 Somewhat similar'}</div>
              </div>
              <img src={pair.b.src} alt="" style={{ width:'60px', height:'60px', objectFit:'cover', borderRadius:'4px' }}/>
              <div style={{ flex:1, fontSize:'10px', color:'var(--muted)' }}>
                <div>{pair.a.name}</div>
                <div>{pair.b.name}</div>
              </div>
              <button onClick={() => onMarkRemove(pair.b.name)} style={{
                background:'rgba(239,68,68,.1)', color:'#DC2626', border:'1px solid rgba(239,68,68,.3)',
                borderRadius:'5px', padding:'4px 10px', fontSize:'10px', cursor:'pointer', fontWeight:600
              }}>Remove B</button>
            </div>
          ))}
        </div>
      )}
      {pairs.length === 0 && !running && (
        <div style={{ fontSize:'11px', color:'var(--muted)', fontStyle:'italic' }}>
          Click "Find Near-Duplicates" to scan. This compares all image pairs (may be slow for large datasets).
        </div>
      )}
    </div>
  );
}

// ── 3. PER-CLASS QUALITY TABLE ────────────────────────────────────────────────
export function ClassQualityTable({ images, classes }) {
  const data = useMemo(() => {
    return classes.map(cls => {
      const imgs = images.filter(i => i.class === cls.name && !i.error);
      const bright = imgs.map(i => i.avgBrightness);
      const contrast = imgs.map(i => i.contrast);
      const sharp = imgs.map(i => i.sharpness || 0);
      const avgB = bright.length ? +(bright.reduce((a,b)=>a+b,0)/bright.length).toFixed(1) : 0;
      const avgC = contrast.length ? +(contrast.reduce((a,b)=>a+b,0)/contrast.length).toFixed(1) : 0;
      const avgS = sharp.length ? +(sharp.reduce((a,b)=>a+b,0)/sharp.length).toFixed(2) : 0;
      const dups = imgs.filter(i=>i.isDuplicate).length;
      const blurry = imgs.filter(i=>i.isBlurry).length;
      const dark = imgs.filter(i=>i.isDark).length;
      return { name:cls.name, count:cls.count, avgBrightness:avgB, avgContrast:avgC, avgSharpness:avgS, dups, blurry, dark };
    });
  }, [images, classes]);

  const badge = (val, good, warn) => {
    const color = val <= good ? '#00956B' : val <= warn ? '#B45309' : '#DC2626';
    return <span style={{ color, fontWeight:700 }}>{val}</span>;
  };

  return (
    <div>
      <div style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, marginBottom:'8px', textTransform:'uppercase', letterSpacing:'1px' }}>
        Per-Class Quality Breakdown
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
          <thead>
            <tr style={{ background:'#F1F5F9' }}>
              {['Class','Count','Brightness','Contrast','Sharpness','Dups','Blurry','Dark'].map(h=>(
                <th key={h} style={{ padding:'8px 10px', textAlign:'left', color:'var(--muted)', fontWeight:600, fontSize:'10px', textTransform:'uppercase', letterSpacing:'.5px', borderBottom:'1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.name} style={{ borderBottom:'1px solid #F1F5F9', background:i%2===0?'#fff':'#FAFAFA' }}>
                <td style={{ padding:'8px 10px', fontFamily:'monospace', fontWeight:700, color:'var(--text)' }}>{row.name}</td>
                <td style={{ padding:'8px 10px', color:'var(--text)' }}>{row.count.toLocaleString()}</td>
                <td style={{ padding:'8px 10px' }}>{badge(row.avgBrightness > 200 || row.avgBrightness < 60 ? 1 : 0, 0, 0)} {row.avgBrightness}</td>
                <td style={{ padding:'8px 10px', color:'var(--text)' }}>{row.avgContrast}</td>
                <td style={{ padding:'8px 10px' }}><span style={{ color:row.avgSharpness<2?'#DC2626':row.avgSharpness<5?'#B45309':'#00956B', fontWeight:700 }}>{row.avgSharpness}</span></td>
                <td style={{ padding:'8px 10px' }}>{badge(row.dups, 0, 2)} {row.dups}</td>
                <td style={{ padding:'8px 10px' }}>{badge(row.blurry, 0, 2)} {row.blurry}</td>
                <td style={{ padding:'8px 10px' }}>{badge(row.dark, 0, 2)} {row.dark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 4. STRATIFIED SPLIT ───────────────────────────────────────────────────────
export function StratifiedSplitView({ stats, splitRatio }) {
  const [tr, va, te] = splitRatio;
  return (
    <div style={{ padding:'14px', background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.2)', borderRadius:'8px' }}>
      <div style={{ fontWeight:700, color:'#1D4ED8', fontSize:'12px', marginBottom:'10px' }}>
        🎯 Stratified Split — Class ratios preserved in all splits
      </div>
      <div style={{ display:'grid', gap:'6px' }}>
        {stats.classes.map(cls => {
          const trainN = Math.round(cls.count * tr / 100);
          const valN   = Math.round(cls.count * va / 100);
          const testN  = cls.count - trainN - valN;
          return (
            <div key={cls.name} style={{ display:'grid', gridTemplateColumns:'120px 1fr 60px 60px 60px', gap:'8px', alignItems:'center', fontSize:'11px' }}>
              <span style={{ fontFamily:'monospace', fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cls.name}</span>
              <div style={{ display:'flex', height:'8px', borderRadius:'4px', overflow:'hidden' }}>
                <div style={{ flex:trainN, background:'#00CBA8' }}/>
                <div style={{ flex:valN,   background:'#3B82F6' }}/>
                <div style={{ flex:testN,  background:'#F59E0B' }}/>
              </div>
              <span style={{ color:'#00CBA8', textAlign:'center' }}>{trainN}</span>
              <span style={{ color:'#3B82F6', textAlign:'center' }}>{valN}</span>
              <span style={{ color:'#F59E0B', textAlign:'center' }}>{testN}</span>
            </div>
          );
        })}
        <div style={{ display:'grid', gridTemplateColumns:'120px 1fr 60px 60px 60px', gap:'8px', fontSize:'10px', color:'var(--muted)', marginTop:'4px' }}>
          <span/>
          <span/>
          <span style={{ textAlign:'center' }}>Train</span>
          <span style={{ textAlign:'center' }}>Val</span>
          <span style={{ textAlign:'center' }}>Test</span>
        </div>
      </div>
    </div>
  );
}

// ── 5. K-FOLD CROSS VALIDATION ────────────────────────────────────────────────
export function KFoldView({ stats }) {
  const [k, setK] = useState(5);
  return (
    <div style={{ padding:'14px', background:'rgba(139,92,246,.06)', border:'1px solid rgba(139,92,246,.2)', borderRadius:'8px' }}>
      <div style={{ fontWeight:700, color:'#7C3AED', fontSize:'12px', marginBottom:'10px' }}>
        🔄 K-Fold Cross Validation
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
        <label style={{ fontSize:'11px', color:'var(--muted)' }}>Number of folds:</label>
        {[3,5,10].map(n => (
          <button key={n} onClick={() => setK(n)} style={{
            padding:'4px 12px', borderRadius:'5px', fontSize:'11px', cursor:'pointer',
            background: k===n ? 'rgba(139,92,246,.15)' : '#fff',
            color:      k===n ? '#7C3AED' : 'var(--muted)',
            border:     k===n ? '1.5px solid #7C3AED' : '1px solid var(--border)',
          }}>{n}-Fold</button>
        ))}
      </div>
      <div style={{ display:'grid', gap:'6px' }}>
        {Array.from({length:k}).map((_,fold) => {
          const foldSize = Math.round(stats.totalImages / k);
          const isVal = fold === 0;
          return (
            <div key={fold} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'11px' }}>
              <span style={{ width:'50px', color:'var(--muted)' }}>Fold {fold+1}</span>
              <div style={{ flex:1, display:'flex', height:'14px', borderRadius:'4px', overflow:'hidden', gap:'1px' }}>
                {Array.from({length:k}).map((_,i) => (
                  <div key={i} style={{
                    flex:1, height:'100%',
                    background: i===fold ? '#7C3AED' : '#00CBA8',
                    opacity: i===fold ? 1 : 0.3,
                  }}/>
                ))}
              </div>
              <span style={{ width:'80px', color:isVal?'#7C3AED':'#00CBA8', fontWeight:isVal?700:400 }}>
                {isVal ? `Val: ${foldSize}` : `Train: ${stats.totalImages - foldSize}`}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:'10px', fontSize:'10px', color:'var(--muted)' }}>
        Each fold: ~{Math.round(stats.totalImages/k)} images. Run all {k} folds, average the results for reliable evaluation.
      </div>
    </div>
  );
}

// ── 6. DATASET CARD GENERATOR (HuggingFace README.md) ────────────────────────
export function DatasetCardGenerator({ stats, splitRatio }) {
  const [copied, setCopied] = useState(false);

  const card = `---
license: mit
task_categories:
- image-classification
language:
- en
tags:
- image
- classification
- datasmithy
size_categories:
- ${stats.totalImages < 1000 ? 'n<1K' : stats.totalImages < 10000 ? '1K<n<10K' : '10K<n<100K'}
---

# Dataset Card

## Overview
| Property | Value |
|---|---|
| Total Images | ${stats.totalImages.toLocaleString()} |
| Classes | ${stats.classes.length} |
| Avg Image Size | ${stats.avgWidth}×${stats.avgHeight}px |
| Color Mode | ${Object.keys(stats.colorModes || {}).join(', ')} |
| Health Score | ${stats.health}/100 |
| Generated with | [DataSmithy](https://datasmithy.vercel.app) |

## Class Distribution
| Class | Count | % |
|---|---|---|
${stats.classes.map(c => `| ${c.name} | ${c.count.toLocaleString()} | ${c.pct}% |`).join('\n')}

## Data Splits
| Split | % | Approx Images |
|---|---|---|
| Train | ${splitRatio[0]}% | ${Math.round(stats.totalImages * splitRatio[0]/100).toLocaleString()} |
| Validation | ${splitRatio[1]}% | ${Math.round(stats.totalImages * splitRatio[1]/100).toLocaleString()} |
| Test | ${splitRatio[2]}% | ${Math.round(stats.totalImages * splitRatio[2]/100).toLocaleString()} |

## Quality Metrics
- **Duplicates**: ${stats.duplicates}
- **Blurry Images**: ${stats.blurryImages || 0}
- **Dark Images**: ${stats.darkImages}
- **Avg Brightness**: ${stats.avgBrightness}/255
- **Avg Contrast**: ${stats.avgContrast}
- **Class Imbalance**: ${stats.imbalance}%

## Usage
from datasets import load_dataset
ds = load_dataset("your-username/your-dataset-name")


## Citation
@dataset{your_dataset_${new Date().getFullYear()},
  title = {Your Dataset Name},
  year  = {${new Date().getFullYear()}},
  url   = {https://huggingface.co/datasets/your-username/your-dataset},
};

  const copy = () => {
    navigator.clipboard.writeText(card).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([card], { type:'text/markdown' }));
    a.download = 'README.md';
    a.click();
  };

  return (
    <div>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>
        🤗 Dataset Card (HuggingFace README.md)
      </div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
        <button onClick={copy} style={{ background:copied?'rgba(0,203,168,.1)':'#fff', color:copied?'#00CBA8':'var(--muted)', border:'1px solid var(--border)', borderRadius:'5px', padding:'5px 14px', fontSize:'11px', cursor:'pointer', fontWeight:600 }}>
          {copied ? '✅ Copied!' : '📋 Copy Markdown'}
        </button>
        <button onClick={download} style={{ background:'rgba(139,92,246,.1)', color:'#7C3AED', border:'1px solid rgba(139,92,246,.3)', borderRadius:'5px', padding:'5px 14px', fontSize:'11px', cursor:'pointer', fontWeight:600 }}>
          ↓ Download README.md
        </button>
      </div>
      <div style={{ background:'#1E1E2E', borderRadius:'8px', padding:'14px', maxHeight:'320px', overflowY:'auto', fontFamily:'JetBrains Mono,monospace', fontSize:'10px', color:'#CDD6F4', lineHeight:1.7, whiteSpace:'pre-wrap' }}>
        {card.split('\n').map((line, i) => {
          let color = '#CDD6F4';
          if (line.startsWith('#')) color = '#89DCEB';
          else if (line.startsWith('|')) color = '#A6E3A1';
          else if (line.startsWith('-')) color = '#F5C2E7';
          else if (line.startsWith('```')) color = '#6C7086';
          return <div key={i} style={{ color }}>{line || '\u00A0'}</div>;
        })}
      </div>
    </div>
  );
}

// ── 7. BATCH SELECT + DELETE ──────────────────────────────────────────────────
export function BatchImageManager({ images, onDeleteSelected }) {
  const [selected, setSelected] = useState(new Set());

  const toggle = (name) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const selectAll   = () => setSelected(new Set(images.filter(i=>i.src).map(i=>i.name)));
  const selectDups  = () => setSelected(new Set(images.filter(i=>i.isDuplicate).map(i=>i.name)));
  const selectBlur  = () => setSelected(new Set(images.filter(i=>i.isBlurry).map(i=>i.name)));
  const selectDark  = () => setSelected(new Set(images.filter(i=>i.isDark).map(i=>i.name)));
  const clearSel    = () => setSelected(new Set());

  const handleDelete = () => {
    if (!selected.size) return;
    if (!window.confirm(`Remove ${selected.size} selected images from dataset?`)) return;
    onDeleteSelected([...selected]);
    setSelected(new Set());
  };

  return (
    <div>
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'12px', alignItems:'center' }}>
        <span style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600 }}>Select:</span>
        {[['All', selectAll], ['Duplicates', selectDups], ['Blurry', selectBlur], ['Dark', selectDark], ['Clear', clearSel]].map(([label, fn]) => (
          <button key={label} onClick={fn} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'5px', padding:'4px 10px', fontSize:'11px', color:'var(--muted)', cursor:'pointer' }}>
            {label}
          </button>
        ))}
        {selected.size > 0 && (
          <button onClick={handleDelete} style={{ background:'#EF4444', color:'#fff', border:'none', borderRadius:'5px', padding:'5px 14px', fontSize:'12px', fontWeight:700, cursor:'pointer', marginLeft:'auto' }}>
            🗑 Remove {selected.size} selected
          </button>
        )}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))', gap:'6px', maxHeight:'340px', overflowY:'auto' }}>
        {images.filter(i=>i.src).map((img, i) => (
          <div key={i} onClick={() => toggle(img.name)} style={{
            border:`2px solid ${selected.has(img.name) ? '#EF4444' : 'var(--border)'}`,
            borderRadius:'6px', overflow:'hidden', cursor:'pointer',
            background: selected.has(img.name) ? 'rgba(239,68,68,.08)' : '#F8FAFC',
            position:'relative'
          }}>
            {selected.has(img.name) && (
              <div style={{ position:'absolute', top:'4px', right:'4px', width:'18px', height:'18px', borderRadius:'50%', background:'#EF4444', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', color:'#fff', fontWeight:900, zIndex:1 }}>✓</div>
            )}
            <img src={img.src} alt={img.name} style={{ width:'100%', aspectRatio:'1', objectFit:'cover', opacity:selected.has(img.name)?0.6:1 }}/>
            <div style={{ padding:'3px 5px', fontSize:'8px', color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{img.class}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:'8px', fontSize:'10px', color:'var(--muted)' }}>
        {selected.size > 0 ? `${selected.size} images selected` : 'Click images to select them'}
      </div>
    </div>
  );
}

// ── 8. PIE CHART ──────────────────────────────────────────────────────────────
export function ClassPieChart({ classes }) {
  const total = classes.reduce((s, c) => s + c.count, 0);
  const colors = ['#00CBA8','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#84CC16','#A855F7'];
  const R = 90, CX = 110, CY = 110;
  const { slices } = classes.reduce((acc, cls, i) => {
    const angle    = (cls.count / total) * 2 * Math.PI;
    const endAngle = acc.angle + angle;
    const x1 = CX + R * Math.cos(acc.angle);
    const y1 = CY + R * Math.sin(acc.angle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    const largeArc  = angle > Math.PI ? 1 : 0;
    const midAngle  = acc.angle + angle / 2;
    const path = `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${largeArc},1 ${x2},${y2} Z`;
    acc.slices.push({ path, color:colors[i%colors.length], cls });
    acc.angle = endAngle;
    return acc;
  }, { slices:[], angle:-Math.PI/2 });

  return (
    <div style={{ display:'flex', gap:'20px', alignItems:'center', flexWrap:'wrap' }}>
      <svg viewBox="0 0 220 220" style={{ width:'180px', height:'180px', flexShrink:0 }}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth={2}>
            <title>{s.cls.name}: {s.cls.count} ({s.cls.pct}%)</title>
          </path>
        ))}
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
        {classes.map((cls, i) => (
          <div key={cls.name} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'12px' }}>
            <div style={{ width:'12px', height:'12px', borderRadius:'3px', background:colors[i%colors.length], flexShrink:0 }}/>
            <span style={{ color:'var(--text)', fontFamily:'monospace', fontWeight:600 }}>{cls.name}</span>
            <span style={{ color:'var(--muted)' }}>{cls.count.toLocaleString()} ({cls.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 9. DOMINANT COLOR PALETTE ─────────────────────────────────────────────────
export function ColorPaletteByClass({ images, classes }) {
  // Extract dominant colors per class using median cut approximation
  const palettes = useMemo(() => {
    return classes.map(cls => {
      const imgs = images.filter(i => i.class === cls.name && !i.error);
      if (!imgs.length) return { name:cls.name, colors:[] };
      // Average RGB per class as dominant color
      const avgR = imgs.reduce((s,i)=>s+i.avgR,0)/imgs.length;
      const avgG = imgs.reduce((s,i)=>s+i.avgG,0)/imgs.length;
      const avgB = imgs.reduce((s,i)=>s+i.avgB,0)/imgs.length;
      // Generate 5 color variants
      const colors = [
        `rgb(${Math.round(avgR)},${Math.round(avgG)},${Math.round(avgB)})`,
        `rgb(${Math.round(avgR*.8)},${Math.round(avgG*.8)},${Math.round(avgB*.8)})`,
        `rgb(${Math.min(255,Math.round(avgR*1.2))},${Math.min(255,Math.round(avgG*1.2))},${Math.min(255,Math.round(avgB*1.2))})`,
        `rgb(${Math.round(avgR)},${Math.round(avgG*.7)},${Math.round(avgB*.7)})`,
        `rgb(${Math.round(avgR*.7)},${Math.round(avgG)},${Math.round(avgB*.7)})`,
      ];
      return { name:cls.name, colors };
    });
  }, [images, classes]);

  return (
    <div>
      <div style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, marginBottom:'10px', textTransform:'uppercase', letterSpacing:'1px' }}>
        Color Palette by Class (avg RGB distribution)
      </div>
      <div style={{ display:'grid', gap:'10px' }}>
        {palettes.map(p => (
          <div key={p.name} style={{ display:'flex', gap:'10px', alignItems:'center' }}>
            <span style={{ width:'100px', fontFamily:'monospace', fontSize:'11px', fontWeight:600, color:'var(--text)', flexShrink:0 }}>{p.name}</span>
            <div style={{ display:'flex', gap:'4px' }}>
              {p.colors.map((c, i) => (
                <div key={i} title={c} style={{ width:'32px', height:'32px', background:c, borderRadius:'4px', border:'1px solid rgba(0,0,0,.1)', cursor:'default' }}/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 10. RECOMMENDATIONS PANEL ─────────────────────────────────────────────────
export function RecommendationsPanel({ stats }) {
  const items = [];
  if (stats.duplicates > 0)
    items.push({ priority:'🔴', text:`Remove ${stats.duplicates} duplicate images — they bias model training`, action:'Go to Quality tab → Remove All' });
  if (stats.imbalance > 30)
    items.push({ priority:'🔴', text:`Fix class imbalance (${stats.imbalance}%) — model will be biased toward majority class`, action:'Use WeightedRandomSampler (in Python code) or augment minority classes' });
  if (stats.blurryImages > 0)
    items.push({ priority:'🔴', text:`Remove or retake ${stats.blurryImages} blurry images — they degrade model accuracy`, action:'Go to Quality tab → filter blurry images' });
  if (stats.sizeVariety > 1)
    items.push({ priority:'🟡', text:`Resize all images to consistent ${stats.avgWidth}×${stats.avgHeight}px before training`, action:'Go to Export tab → export resized ZIP' });
  if (stats.darkImages > stats.totalImages * 0.1)
    items.push({ priority:'🟡', text:`${stats.darkImages} dark images detected — add brightness augmentation`, action:'Already included in generated Python code (brightness_range=[0.7,1.3])' });
  if (stats.totalImages < stats.classes.length * 100)
    items.push({ priority:'🟡', text:`Small dataset (< 100/class) — use heavy augmentation and transfer learning`, action:'Python code uses EfficientNet + ImageNet weights — correct approach' });
  if (stats.imbalance > 10 && stats.imbalance <= 30)
    items.push({ priority:'🟡', text:`Moderate class imbalance (${stats.imbalance}%) — WeightedRandomSampler will help`, action:'Already included in generated PyTorch code' });
  if (stats.errors > 0)
    items.push({ priority:'🟡', text:`${stats.errors} images failed to load — remove corrupt files`, action:'Go to Quality tab → scroll to failed images list' });
  if (stats.health >= 90)
    items.push({ priority:'🟢', text:'Dataset health is excellent — ready for ML training', action:'Download pipeline.py and start training' });
  else if (items.length === 0)
    items.push({ priority:'🟢', text:'No critical issues found — dataset looks good', action:'Fix yellow warnings above for best results' });

  return (
    <div style={{ padding:'16px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>
        🎯 Prioritized Recommendations
      </div>
      <div style={{ display:'grid', gap:'8px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ padding:'10px 14px', background:'#fff', borderRadius:'7px', border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', gap:'8px', alignItems:'flex-start' }}>
              <span style={{ fontSize:'14px', flexShrink:0 }}>{item.priority}</span>
              <div>
                <div style={{ fontSize:'12px', color:'var(--text)', fontWeight:600, lineHeight:1.4 }}>{item.text}</div>
                <div style={{ fontSize:'11px', color:'#00956B', marginTop:'3px' }}>→ {item.action}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 11. EXPORT FORMAT OPTIONS ─────────────────────────────────────────────────
export function ExportFormatOptions({ onExport, imageCount }) {
  const [fmt,     setFmt]     = useState('jpeg');
  const [quality, setQuality] = useState(92);
  const [resizeW, setResizeW] = useState(224);
  const [resizeH, setResizeH] = useState(224);
  const [keepAR,  setKeepAR]  = useState(true);

  return (
    <div style={{ padding:'16px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>
        🎨 Export Format & Quality Options
      </div>
      <div style={{ display:'grid', gap:'12px' }}>
        <div>
          <label style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, display:'block', marginBottom:'6px' }}>Format:</label>
          <div style={{ display:'flex', gap:'6px' }}>
            {[['jpeg','JPEG (smaller)'],['png','PNG (lossless)'],['webp','WebP (best)']].map(([val,label])=>(
              <button key={val} onClick={()=>setFmt(val)} style={{ padding:'5px 14px', borderRadius:'5px', fontSize:'11px', cursor:'pointer', background:fmt===val?'rgba(0,203,168,.12)':'#fff', color:fmt===val?'#00CBA8':'var(--muted)', border:fmt===val?'1.5px solid #00CBA8':'1px solid var(--border)' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {fmt !== 'png' && (
          <div>
            <label style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, display:'block', marginBottom:'4px' }}>
              Quality: <strong style={{ color:'var(--teal)' }}>{quality}%</strong>
              {quality >= 90 ? ' (high)' : quality >= 70 ? ' (medium)' : ' (compressed)'}
            </label>
            <input type="range" min={50} max={100} step={1} value={quality} onChange={e=>setQuality(Number(e.target.value))}
              style={{ width:'220px', accentColor:'#00CBA8' }}/>
          </div>
        )}
        <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
          <div>
            <label style={{ fontSize:'11px', color:'var(--muted)', display:'block', marginBottom:'3px' }}>Width</label>
            <input type="number" value={resizeW} onChange={e=>{ setResizeW(Number(e.target.value)); if(keepAR)setResizeH(Number(e.target.value)); }}
              style={{ width:'70px', padding:'4px 8px', fontSize:'11px', borderRadius:'5px', border:'1px solid var(--border)' }}/>
          </div>
          <span style={{ marginTop:'16px', color:'var(--muted)' }}>×</span>
          <div>
            <label style={{ fontSize:'11px', color:'var(--muted)', display:'block', marginBottom:'3px' }}>Height</label>
            <input type="number" value={resizeH} onChange={e=>setResizeH(Number(e.target.value))}
              style={{ width:'70px', padding:'4px 8px', fontSize:'11px', borderRadius:'5px', border:'1px solid var(--border)' }}/>
          </div>
          <label style={{ marginTop:'16px', display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', color:'var(--muted)', cursor:'pointer' }}>
            <input type="checkbox" checked={keepAR} onChange={e=>setKeepAR(e.target.checked)} style={{ accentColor:'#00CBA8' }}/>
            Square
          </label>
          <div style={{ marginTop:'16px', display:'flex', gap:'4px', flexWrap:'wrap' }}>
            {[64,128,224,256,299,512].map(sz=>(
              <button key={sz} onClick={()=>{setResizeW(sz);setResizeH(sz);}} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'3px', padding:'2px 7px', fontSize:'10px', cursor:'pointer', color:'var(--muted)' }}>
                {sz}
              </button>
            ))}
          </div>
        </div>
        <button onClick={()=>onExport(fmt, quality/100, resizeW, resizeH)} style={{ background:'#00CBA8', color:'#fff', border:'none', borderRadius:'6px', padding:'9px 22px', fontSize:'12px', fontWeight:700, cursor:'pointer', alignSelf:'flex-start' }}>
          📦 Export {imageCount.toLocaleString()} images as .{fmt} ZIP
        </button>
      </div>
    </div>
  );
}

// ── 12. MIN/MAX PIXEL VALUES PER CHANNEL ──────────────────────────────────────
export function ChannelStats({ images }) {
  const valid = images.filter(i => !i.error);
  if (!valid.length) return null;
  const stats = {
    minR: Math.min(...valid.map(i=>i.avgR)), maxR: Math.max(...valid.map(i=>i.avgR)),
    minG: Math.min(...valid.map(i=>i.avgG)), maxG: Math.max(...valid.map(i=>i.avgG)),
    minB: Math.min(...valid.map(i=>i.avgB)), maxB: Math.max(...valid.map(i=>i.avgB)),
    avgR: +(valid.reduce((s,i)=>s+i.avgR,0)/valid.length).toFixed(1),
    avgG: +(valid.reduce((s,i)=>s+i.avgG,0)/valid.length).toFixed(1),
    avgB: +(valid.reduce((s,i)=>s+i.avgB,0)/valid.length).toFixed(1),
  };
  return (
    <div>
      <div style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, marginBottom:'8px', textTransform:'uppercase', letterSpacing:'1px' }}>
        Channel Statistics (per-image averages)
      </div>
      <table style={{ borderCollapse:'collapse', fontSize:'11px', width:'100%' }}>
        <thead>
          <tr style={{ background:'#F1F5F9' }}>
            {['Channel','Min','Avg','Max','Range'].map(h=>(
              <th key={h} style={{ padding:'7px 10px', textAlign:'left', color:'var(--muted)', fontWeight:600, fontSize:'10px', borderBottom:'1px solid var(--border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[['Red','#EF4444',stats.minR,stats.avgR,stats.maxR],['Green','#22C55E',stats.minG,stats.avgG,stats.maxG],['Blue','#3B82F6',stats.minB,stats.avgB,stats.maxB]].map(([ch,color,min,avg,max])=>(
            <tr key={ch} style={{ borderBottom:'1px solid #F1F5F9' }}>
              <td style={{ padding:'7px 10px', color, fontWeight:700 }}>{ch}</td>
              <td style={{ padding:'7px 10px', color:'var(--muted)' }}>{min.toFixed(1)}</td>
              <td style={{ padding:'7px 10px', color:'var(--text)', fontWeight:700 }}>{avg}</td>
              <td style={{ padding:'7px 10px', color:'var(--muted)' }}>{max.toFixed(1)}</td>
              <td style={{ padding:'7px 10px', color:'var(--muted)' }}>{(max-min).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop:'10px', padding:'8px 12px', background:'rgba(59,130,246,.06)', borderRadius:'6px', fontSize:'11px', color:'#1D4ED8' }}>
        PyTorch normalization: <code>Normalize([{(stats.avgR/255).toFixed(3)},{(stats.avgG/255).toFixed(3)},{(stats.avgB/255).toFixed(3)}], [std_r, std_g, std_b])</code>
      </div>
    </div>
  );
}

// ── 13. BEFORE/AFTER CLEANUP COMPARISON ───────────────────────────────────────
export function BeforeAfterCleanup({ beforeStats, afterStats }) {
  if (!beforeStats || !afterStats) return null;
  const rows = [
    ['Total Images', beforeStats.totalImages, afterStats.totalImages, false],
    ['Duplicates',   beforeStats.duplicates,  afterStats.duplicates,  true],
    ['Blurry',       beforeStats.blurryImages||0, afterStats.blurryImages||0, true],
    ['Errors',       beforeStats.errors,      afterStats.errors,      true],
    ['Health Score', beforeStats.health,      afterStats.health,      false],
  ];
  return (
    <div style={{ padding:'16px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>
        📊 Before → After Cleanup
      </div>
      <div style={{ display:'grid', gap:'8px' }}>
        {rows.map(([label, before, after, lowerIsBetter]) => {
          const improved = lowerIsBetter ? after < before : after > before;
          const diff = after - before;
          return (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'8px 12px', background:'#fff', borderRadius:'6px', border:'1px solid var(--border)' }}>
              <span style={{ width:'110px', fontSize:'11px', color:'var(--muted)', fontWeight:600 }}>{label}</span>
              <span style={{ fontSize:'14px', fontWeight:700, color:'var(--muted)', textDecoration:'line-through' }}>{before}</span>
              <span style={{ color:'var(--muted)', fontSize:'12px' }}>→</span>
              <span style={{ fontSize:'16px', fontWeight:800, color:improved?'#00956B':diff===0?'var(--muted)':'#DC2626' }}>{after}</span>
              {diff !== 0 && (
                <span style={{ fontSize:'11px', color:improved?'#00956B':'#DC2626', fontWeight:600 }}>
                  ({diff > 0 ? '+' : ''}{diff}) {improved ? '✅' : '⚠'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 14. RENAME / MERGE CLASSES ────────────────────────────────────────────────
export function ClassManager({ classes, images, onRenameClass, onMergeClasses }) {
  const [renameFrom, setRenameFrom] = useState('');
  const [renameTo,   setRenameTo]   = useState('');
  const [mergeA,     setMergeA]     = useState('');
  const [mergeB,     setMergeB]     = useState('');
  const [mergeName,  setMergeName]  = useState('');

  const handleRename = () => {
    if (!renameFrom || !renameTo.trim()) return;
    if (window.confirm(`Rename class "${renameFrom}" to "${renameTo.trim()}"?`)) {
      onRenameClass(renameFrom, renameTo.trim());
      setRenameFrom(''); setRenameTo('');
    }
  };

  const handleMerge = () => {
    if (!mergeA || !mergeB || mergeA === mergeB || !mergeName.trim()) return;
    if (window.confirm(`Merge "${mergeA}" + "${mergeB}" into "${mergeName.trim()}"?`)) {
      onMergeClasses(mergeA, mergeB, mergeName.trim());
      setMergeA(''); setMergeB(''); setMergeName('');
    }
  };

  return (
    <div style={{ display:'grid', gap:'14px' }}>
      <div style={{ padding:'14px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
        <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>✏️ Rename Class</div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          <select value={renameFrom} onChange={e=>setRenameFrom(e.target.value)} style={{ padding:'6px 10px', borderRadius:'5px', border:'1px solid var(--border)', fontSize:'12px' }}>
            <option value="">Select class...</option>
            {classes.map(c=><option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
          </select>
          <span style={{ color:'var(--muted)' }}>→</span>
          <input type="text" value={renameTo} onChange={e=>setRenameTo(e.target.value)} placeholder="New name..."
            style={{ padding:'6px 10px', borderRadius:'5px', border:'1px solid var(--border)', fontSize:'12px', width:'140px' }}/>
          <button onClick={handleRename} disabled={!renameFrom||!renameTo.trim()} style={{ background:'#00CBA8', color:'#fff', border:'none', borderRadius:'5px', padding:'7px 16px', fontSize:'12px', fontWeight:700, cursor:'pointer', opacity:(!renameFrom||!renameTo.trim())?0.5:1 }}>
            Rename
          </button>
        </div>
      </div>
      <div style={{ padding:'14px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
        <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>🔀 Merge Two Classes</div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          <select value={mergeA} onChange={e=>setMergeA(e.target.value)} style={{ padding:'6px 10px', borderRadius:'5px', border:'1px solid var(--border)', fontSize:'12px' }}>
            <option value="">Class A...</option>
            {classes.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <span style={{ color:'var(--muted)' }}>+</span>
          <select value={mergeB} onChange={e=>setMergeB(e.target.value)} style={{ padding:'6px 10px', borderRadius:'5px', border:'1px solid var(--border)', fontSize:'12px' }}>
            <option value="">Class B...</option>
            {classes.filter(c=>c.name!==mergeA).map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <span style={{ color:'var(--muted)' }}>→</span>
          <input type="text" value={mergeName} onChange={e=>setMergeName(e.target.value)} placeholder="Merged name..."
            style={{ padding:'6px 10px', borderRadius:'5px', border:'1px solid var(--border)', fontSize:'12px', width:'130px' }}/>
          <button onClick={handleMerge} disabled={!mergeA||!mergeB||!mergeName.trim()} style={{ background:'#3B82F6', color:'#fff', border:'none', borderRadius:'5px', padding:'7px 16px', fontSize:'12px', fontWeight:700, cursor:'pointer', opacity:(!mergeA||!mergeB||!mergeName.trim())?0.5:1 }}>
            Merge
          </button>
        </div>
        <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'6px' }}>
          Merging re-labels all images from Class A and B into the merged class name.
        </div>
      </div>
    </div>
  );
}

// ── 15. OUTLIER IMAGES (far from class mean brightness) ───────────────────────
export function OutlierImages({ images, classes, onOpenLightbox }) {
  const outliers = useMemo(() => {
    const result = [];
    classes.forEach(cls => {
      const imgs = images.filter(i => i.class === cls.name && !i.error);
      if (imgs.length < 3) return;
      const avgBr = imgs.reduce((s,i)=>s+i.avgBrightness,0)/imgs.length;
      const stdBr = Math.sqrt(imgs.reduce((s,i)=>s+Math.pow(i.avgBrightness-avgBr,2),0)/imgs.length);
      imgs.forEach(img => {
        const zscore = stdBr > 0 ? Math.abs(img.avgBrightness - avgBr) / stdBr : 0;
        if (zscore > 2.5) result.push({ ...img, zscore:+zscore.toFixed(2), classAvgBr:+avgBr.toFixed(1) });
      });
    });
    return result.sort((a,b)=>b.zscore-a.zscore).slice(0,12);
  }, [images, classes]);

  if (!outliers.length) {
    return <div style={{ fontSize:'12px', color:'#00956B' }}>✅ No outlier images detected</div>;
  }

  return (
    <div>
      <div style={{ fontSize:'12px', color:'#B45309', marginBottom:'10px' }}>
        ⚠ {outliers.length} outlier images detected (brightness z-score &gt; 2.5σ from class mean):
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:'8px' }}>
        {outliers.map((img, i) => (
          <div key={i} onClick={() => onOpenLightbox(img)} style={{ border:'2px solid #F59E0B', borderRadius:'6px', overflow:'hidden', cursor:'pointer', background:'#FFFBEB' }}>
            <img src={img.src} alt={img.name} style={{ width:'100%', aspectRatio:'1', objectFit:'cover' }}/>
            <div style={{ padding:'4px 6px' }}>
              <div style={{ fontSize:'9px', color:'#B45309', fontWeight:700 }}>z={img.zscore}σ</div>
              <div style={{ fontSize:'8px', color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{img.class}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOW TO INTEGRATE INTO ImageTab.jsx
// ══════════════════════════════════════════════════════════════════════════════
/*
1. Add import at top of ImageTab.jsx:
   import {
     CancelButton, NearDuplicateFinder, ClassQualityTable, StratifiedSplitView,
     KFoldView, DatasetCardGenerator, BatchImageManager, ClassPieChart,
     ColorPaletteByClass, RecommendationsPanel, ExportFormatOptions,
     ChannelStats, BeforeAfterCleanup, ClassManager, OutlierImages
   } from './ImageTabExtras.jsx';

2. Add state inside ImageTab component:
   const cancelRef = useRef(false);
   const [beforeStats, setBeforeStats] = useState(null);
   const [showBatch, setShowBatch] = useState(false);

3. In processImages loop, add at start of each iteration:
   if(cancelRef.current){ setAnalyzing(false); setProgress('Cancelled'); cancelRef.current=false; return; }

4. Add CancelButton next to progress bar:
   {analyzing && <CancelButton onCancel={()=>cancelRef.current=true}/>}

5. Save beforeStats before removeDuplicates:
   const removeDuplicates = () => {
     setBeforeStats({...stats}); // save snapshot
     const clean = images.filter(i=>!i.isDuplicate);
     computeStats(clean);
   };

6. onRenameClass handler:
   const handleRenameClass = (from, to) => {
     const newImages = images.map(img => img.class===from ? {...img, class:to} : img);
     setImages(newImages); computeStats(newImages);
   };

7. onMergeClasses handler:
   const handleMergeClasses = (a, b, merged) => {
     const newImages = images.map(img => (img.class===a||img.class===b) ? {...img, class:merged} : img);
     setImages(newImages); computeStats(newImages);
   };

8. onDeleteSelected handler:
   const handleDeleteSelected = (names) => {
     const nameSet = new Set(names);
     const newImages = images.filter(i => !nameSet.has(i.name));
     computeStats(newImages);
   };

9. Add new sub-tabs to the tabs array:
   { id:'neardup',   label:'🔍 Near-Dups'    },
   { id:'manage',    label:'⚙ Manage'        },
   { id:'recommend', label:'🎯 Actions'       },
   { id:'card',      label:'📝 Dataset Card' },

10. Add tab panels:
   {activeView==='neardup'   && <div className="card" style={{padding:'20px'}}><ST>Near-Duplicate Detection</ST><NearDuplicateFinder images={images} onMarkRemove={name=>handleDeleteSelected([name])}/></div>}
   {activeView==='manage'    && <div className="card" style={{padding:'20px'}}><ST>Manage Classes & Images</ST><ClassManager classes={stats.classes} images={images} onRenameClass={handleRenameClass} onMergeClasses={handleMergeClasses}/><div style={{marginTop:'16px'}}/><ST>Batch Select & Remove</ST><BatchImageManager images={images} onDeleteSelected={handleDeleteSelected}/></div>}
   {activeView==='recommend' && <div className="card" style={{padding:'20px'}}><ST>Action Items</ST><RecommendationsPanel stats={stats}/>{beforeStats&&<div style={{marginTop:'14px'}}><BeforeAfterCleanup beforeStats={beforeStats} afterStats={stats}/></div>}</div>}
   {activeView==='card'      && <div className="card" style={{padding:'20px'}}><ST>Dataset Card</ST><DatasetCardGenerator stats={stats} splitRatio={splitRatio}/></div>}

11. Add to Charts tab:
   <ClassPieChart classes={stats.classes}/>
   <ColorPaletteByClass images={images} classes={stats.classes}/>
   <ChannelStats images={images}/>

12. Add to Quality tab:
   <OutlierImages images={images} classes={stats.classes} onOpenLightbox={setLightbox}/>

13. Add to Split tab:
   <StratifiedSplitView stats={stats} splitRatio={splitRatio}/>
   <KFoldView stats={stats}/>

14. Replace Export ZIP button with:
   <ExportFormatOptions onExport={(fmt,quality,w,h)=>{/* use exportResizedZip with these params }} imageCount={images.filter(i=>!i.isDuplicate&&!i.error).length}/>
*/