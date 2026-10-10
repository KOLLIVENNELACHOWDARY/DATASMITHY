// src/components/tabs/ImageTabMissing.jsx
// FINAL ADDITIONS — every remaining feature for complete image support
// Add these to ImageTab.jsx alongside ImageTabExtras + ImageTabFinalPatch

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// 1. URL + CLIPBOARD IMPORT
// ══════════════════════════════════════════════════════════════════════════════
export function URLAndClipboardImport({ onImagesReady }) {
  const [url,      setUrl]      = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Ctrl+V paste anywhere on the page
  useEffect(() => {
    const handler = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageItems = Array.from(items).filter(i => i.type.startsWith('image/'));
      if (!imageItems.length) return;
      e.preventDefault();
      const files = imageItems.map((item, i) => {
        const f = item.getAsFile();
        if (f) { Object.defineProperty(f, 'name', { value:`pasted_${Date.now()}_${i}.png` }); }
        return f;
      }).filter(Boolean);
      if (files.length) onImagesReady(files);
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [onImagesReady]);

  const importFromURL = async () => {
    if (!url.trim()) return;
    setLoading(true); setError('');
    try {
      const res   = await fetch(url.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob  = await res.blob();
      if (!blob.type.startsWith('image/')) throw new Error('URL does not point to an image');
      const fname = url.split('/').pop().split('?')[0] || 'imported_image.jpg';
      const file  = new File([blob], fname, { type: blob.type });
      onImagesReady([file]);
      setUrl('');
    } catch(e) { setError('Failed: ' + e.message); }
    setLoading(false);
  };

  return (
    <div style={{ padding:'14px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>
        🔗 Import from URL or Clipboard
      </div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'8px', flexWrap:'wrap' }}>
        <input value={url} onChange={e=>setUrl(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&importFromURL()}
          placeholder="Paste image URL (https://...)..."
          style={{ flex:1, padding:'7px 12px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'12px', minWidth:'240px' }}/>
        <button onClick={importFromURL} disabled={loading||!url.trim()} style={{ background:'#00CBA8', color:'#fff', border:'none', borderRadius:'6px', padding:'7px 18px', fontSize:'12px', fontWeight:700, cursor:'pointer', opacity:(!url.trim()||loading)?0.5:1 }}>
          {loading ? '⏳' : '↓ Fetch'}
        </button>
      </div>
      {error && <div style={{ fontSize:'11px', color:'#DC2626', marginBottom:'6px' }}>❌ {error}</div>}
      <div style={{ fontSize:'10px', color:'var(--muted)', display:'flex', gap:'8px', alignItems:'center' }}>
        <span>💡 You can also</span>
        <kbd style={{ background:'#E2E8F0', padding:'1px 6px', borderRadius:'3px', fontSize:'10px', fontFamily:'monospace' }}>Ctrl+V</kbd>
        <span>anywhere on this page to paste an image from your clipboard</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. SATURATION + HUE ANALYSIS (HSV in canvas)
// ══════════════════════════════════════════════════════════════════════════════
// Add this to analyzePixels in ImageTab.jsx
export const calcHSV = (canvas) => {
  const sc = document.createElement('canvas');
  sc.width = 64; sc.height = 64;
  sc.getContext('2d').drawImage(canvas, 0, 0, 64, 64);
  const d = sc.getContext('2d').getImageData(0, 0, 64, 64).data;
  let satSum = 0, hueSum = 0, count = 0;
  const hueBins = new Array(12).fill(0); // 30° bins

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]/255, g = d[i+1]/255, b = d[i+2]/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b), delta = max - min;
    const sat = max === 0 ? 0 : delta / max;
    satSum += sat;
    if (delta > 0.01) {
      let hue = 0;
      if (max === r) hue = ((g - b) / delta) % 6;
      else if (max === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;
      hue = ((hue * 60) + 360) % 360;
      hueSum += hue;
      hueBins[Math.floor(hue / 30)]++;
    }
    count++;
  }
  const avgSat = count ? satSum / count : 0;
  const avgHue = count ? hueSum / count : 0;
  const hueLabel = avgHue < 30 ? 'Red' : avgHue < 90 ? 'Yellow' : avgHue < 150 ? 'Green' : avgHue < 210 ? 'Cyan' : avgHue < 270 ? 'Blue' : avgHue < 330 ? 'Magenta' : 'Red';
  const isWarm   = avgHue < 90 || avgHue > 300;
  return { avgSaturation:+avgSat.toFixed(3), avgHue:+avgHue.toFixed(1), hueLabel, isWarm, hueBins };
};

export function SaturationHueChart({ images }) {
  const valid = images.filter(i => !i.error && i.avgSaturation !== undefined);
  if (!valid.length) return <div style={{ fontSize:'11px', color:'var(--muted)' }}>No saturation data — add calcHSV() to analyzePixels</div>;

  const avgSat = valid.reduce((s,i)=>s+i.avgSaturation,0)/valid.length;
  const hueBins = new Array(12).fill(0);
  valid.forEach(img => { if (img.hueBins) img.hueBins.forEach((v,i) => hueBins[i]+=v); });
  const maxBin = Math.max(...hueBins) || 1;
  const hueColors = ['#FF4444','#FF8800','#FFEE00','#88FF00','#00FF44','#00FFCC','#00CCFF','#0044FF','#4400FF','#AA00FF','#FF00AA','#FF0044'];
  const W=560, H=80, PAD=24, barW=(W-PAD*2)/12;
  const warm = valid.filter(i=>i.isWarm).length;
  const cool = valid.length - warm;

  return (
    <div style={{ display:'grid', gap:'14px' }}>
      <div>
        <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'5px' }}>Hue Distribution (12 × 30° segments)</div>
        <svg viewBox={`0 0 ${W} ${H+18}`} style={{ width:'100%', maxWidth:'600px', height:'auto' }}>
          {hueBins.map((v,i)=>(
            <rect key={i} x={PAD+i*barW+1} y={H-(v/maxBin)*(H-PAD)} width={barW-2} height={(v/maxBin)*(H-PAD)} fill={hueColors[i]} opacity={.85} rx={1}/>
          ))}
          <line x1={PAD} y1={H} x2={W-PAD} y2={H} stroke="#E2E8F0" strokeWidth={1}/>
          {['R','Y','G','C','B','M'].map((l,i)=>(
            <text key={l} x={PAD+(i*2+1)*barW} y={H+13} fontSize="9" fill="#94A3B8" textAnchor="middle">{l}</text>
          ))}
        </svg>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
        {[
          ['Avg Saturation', `${(avgSat*100).toFixed(0)}%`, avgSat < 0.1 ? '🖤 Very grey/desaturated' : avgSat < 0.3 ? '🎨 Muted tones' : '🌈 Vibrant colors'],
          ['Color Temp', warm > cool ? '🔥 Warm dominant' : '❄️ Cool dominant', `${warm} warm · ${cool} cool`],
          ['Dominant Hue', valid[0]?.hueLabel||'—', `avg ${valid.reduce((s,i)=>s+(i.avgHue||0),0)/valid.length|0}°`],
        ].map(([label,val,note])=>(
          <div key={label} style={{ padding:'10px', background:'#F8FAFC', borderRadius:'8px', border:'1px solid var(--border)', textAlign:'center' }}>
            <div style={{ fontSize:'15px', fontWeight:800, color:'var(--text)', marginBottom:'3px' }}>{val}</div>
            <div style={{ fontSize:'10px', color:'var(--muted)', marginBottom:'3px' }}>{label}</div>
            <div style={{ fontSize:'9px', color:'#00956B' }}>{note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. ENTROPY / TEXTURE RICHNESS
// ══════════════════════════════════════════════════════════════════════════════
export const calcEntropy = (canvas) => {
  const sc = document.createElement('canvas'); sc.width=32; sc.height=32;
  sc.getContext('2d').drawImage(canvas,0,0,32,32);
  const d = sc.getContext('2d').getImageData(0,0,32,32).data;
  const hist = new Array(256).fill(0);
  const total = d.length/4;
  for (let i=0; i<d.length; i+=4) {
    const gray = Math.round(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]);
    hist[gray]++;
  }
  let entropy = 0;
  hist.forEach(c => { if(c>0){ const p=c/total; entropy -= p*Math.log2(p); } });
  return +entropy.toFixed(3);
};

// ══════════════════════════════════════════════════════════════════════════════
// 4. SCATTER PLOT — brightness vs sharpness
// ══════════════════════════════════════════════════════════════════════════════
export function ScatterPlot({ images, onClickPoint }) {
  const valid = images.filter(i => !i.error && i.src);
  if (!valid.length) return null;

  const W=520, H=300, PAD=40;
  const maxBr = 255, maxSh = Math.max(...valid.map(i=>i.sharpness||0), 20);
  const colors = { cat:'#00CBA8', unknown:'#94A3B8' };
  const classColors = ['#00CBA8','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316'];
  const classes = [...new Set(valid.map(i=>i.class))];
  const clsColorMap = {};
  classes.forEach((c,i) => clsColorMap[c] = classColors[i%classColors.length]);

  const toX = (br)  => PAD + (br/maxBr)*(W-PAD*2);
  const toY = (sh)  => (H-PAD) - (Math.min(sh,maxSh)/maxSh)*(H-PAD*2);

  return (
    <div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'6px' }}>
        Scatter: Brightness (x) vs Sharpness (y) — click a point to inspect
      </div>
      <svg viewBox={`0 0 ${W} ${H+30}`} style={{ width:'100%', maxWidth:'580px', height:'auto', cursor:'crosshair' }}>
        {/* Grid */}
        {[0,64,128,192,255].map(v=>(
          <line key={v} x1={toX(v)} y1={PAD} x2={toX(v)} y2={H-PAD} stroke="#F1F5F9" strokeWidth={1}/>
        ))}
        {[0,25,50,75,100].map(p=>{
          const sh = maxSh*p/100;
          return <line key={p} x1={PAD} y1={toY(sh)} x2={W-PAD} y2={toY(sh)} stroke="#F1F5F9" strokeWidth={1}/>;
        })}
        {/* Axes */}
        <line x1={PAD} y1={H-PAD} x2={W-PAD} y2={H-PAD} stroke="#CBD5E1" strokeWidth={1}/>
        <line x1={PAD} y1={PAD}   x2={PAD}   y2={H-PAD} stroke="#CBD5E1" strokeWidth={1}/>
        {/* Quadrant labels */}
        <text x={PAD+8}   y={PAD+14}   fontSize="8" fill="#94A3B8">Dark+Blurry</text>
        <text x={W-PAD-60} y={PAD+14}  fontSize="8" fill="#94A3B8">Bright+Sharp</text>
        <text x={PAD+8}   y={H-PAD-4}  fontSize="8" fill="#94A3B8">Dark+Sharp</text>
        <text x={W-PAD-65} y={H-PAD-4} fontSize="8" fill="#94A3B8">Bright+Blurry</text>
        {/* Points */}
        {valid.slice(0,500).map((img,i)=>(
          <circle key={i}
            cx={toX(img.avgBrightness||0)} cy={toY(img.sharpness||0)}
            r={img.isDuplicate?5:img.isBlurry||img.isDark?4:3}
            fill={img.isDuplicate?'#EF4444':img.isBlurry?'#F59E0B':clsColorMap[img.class]||'#94A3B8'}
            opacity={0.7} style={{ cursor:'pointer' }}
            onClick={()=>onClickPoint&&onClickPoint(img)}>
            <title>{img.name} | Class:{img.class} | Br:{img.avgBrightness} | Sh:{img.sharpness?.toFixed(2)}</title>
          </circle>
        ))}
        {/* Axis labels */}
        <text x={W/2} y={H+20} fontSize="9" fill="#94A3B8" textAnchor="middle">Brightness →</text>
        <text x={8} y={H/2} fontSize="9" fill="#94A3B8" textAnchor="middle" transform={`rotate(-90,8,${H/2})`}>Sharpness →</text>
      </svg>
      {/* Legend */}
      <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', marginTop:'6px' }}>
        {classes.map(c=>(
          <div key={c} style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:'var(--muted)' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:clsColorMap[c] }}/>
            {c}
          </div>
        ))}
        {[['#EF4444','Duplicate'],['#F59E0B','Blurry/Dark']].map(([c,l])=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:'var(--muted)' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:c }}/>
            {l}
          </div>
        ))}
        {valid.length > 500 && <span style={{ fontSize:'10px', color:'var(--muted)' }}>Showing first 500 of {valid.length}</span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. UNDO HISTORY
// ══════════════════════════════════════════════════════════════════════════════
// Add this to ImageTab.jsx state:
// const [history, setHistory] = useState([]);   // array of image snapshots
// const [historyIdx, setHistoryIdx] = useState(-1);
//
// Call pushHistory(images) before every destructive action:
// const pushHistory = (imgs) => {
//   setHistory(prev => [...prev.slice(0, historyIdx+1), imgs].slice(-10)); // keep last 10
//   setHistoryIdx(prev => Math.min(prev+1, 9));
// };
// const undo = () => {
//   if (historyIdx <= 0) return;
//   setHistoryIdx(prev => prev-1);
//   computeStats(history[historyIdx-1]);
// };

export function UndoBar({ history, historyIdx, onUndo, onRedo }) {
  if (!history.length) return null;
  return (
    <div style={{ display:'flex', gap:'8px', alignItems:'center', padding:'8px 14px', background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.2)', borderRadius:'7px' }}>
      <span style={{ fontSize:'11px', color:'var(--muted)' }}>History: {Math.min(historyIdx+1,history.length)}/{history.length}</span>
      <button onClick={onUndo} disabled={historyIdx<=0} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'5px', padding:'4px 12px', fontSize:'11px', cursor:historyIdx<=0?'not-allowed':'pointer', color:historyIdx<=0?'#CBD5E1':'var(--muted)', fontWeight:600 }}>
        ↩ Undo
      </button>
      <button onClick={onRedo} disabled={historyIdx>=history.length-1} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'5px', padding:'4px 12px', fontSize:'11px', cursor:historyIdx>=history.length-1?'not-allowed':'pointer', color:historyIdx>=history.length-1?'#CBD5E1':'var(--muted)', fontWeight:600 }}>
        ↪ Redo
      </button>
      <span style={{ fontSize:'10px', color:'var(--muted)', marginLeft:'4px' }}>Last 10 actions saved</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. IN-BROWSER IMAGE EDITOR (rotate, flip, crop, brightness adjust)
// ══════════════════════════════════════════════════════════════════════════════
export function ImageEditor({ image, onSave, onClose }) {
  const canvasRef = useRef(null);
  const [rotate,   setRotate]   = useState(0);
  const [flipH,    setFlipH]    = useState(false);
  const [flipV,    setFlipV]    = useState(false);
  const [bright,   setBright]   = useState(100);
  const [contrast, setContrast] = useState(100);
  const [cropMode, setCropMode] = useState(false);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    if (!image?.src || !canvasRef.current) return;
    const img = new Image(); img.src = image.src;
    img.onload = () => {
      const c = canvasRef.current;
      const rad = (rotate * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
      c.width  = image.width * cos + image.height * sin;
      c.height = image.width * sin + image.height * cos;
      const ctx = c.getContext('2d');
      ctx.filter = `brightness(${bright}%) contrast(${contrast}%)`;
      ctx.translate(c.width/2, c.height/2);
      ctx.rotate(rad);
      ctx.scale(flipH?-1:1, flipV?-1:1);
      ctx.drawImage(img, -image.width/2, -image.height/2);
    };
  }, [image, rotate, flipH, flipV, bright, contrast]);

  const handleSave = () => {
    if (!canvasRef.current) return;
    const newSrc  = canvasRef.current.toDataURL('image/jpeg', 0.92);
    const newW    = canvasRef.current.width;
    const newH    = canvasRef.current.height;
    onSave({ ...image, src:newSrc, width:newW, height:newH });
    setSaved(true); setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  if (!image) return null;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:9999, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:'12px', padding:'20px', maxWidth:'90vw', width:'720px', maxHeight:'90vh', overflow:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div style={{ fontWeight:700, color:'var(--text)', fontSize:'14px' }}>✏️ Edit: {image.name}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'var(--muted)' }}>×</button>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'14px' }}>
          {[['↺ 90° CCW', ()=>setRotate(r=>(r-90+360)%360)], ['↻ 90° CW', ()=>setRotate(r=>(r+90)%360)], ['⇔ Flip H', ()=>setFlipH(f=>!f)], ['↕ Flip V', ()=>setFlipV(f=>!f)], ['Reset', ()=>{setRotate(0);setFlipH(false);setFlipV(false);setBright(100);setContrast(100);}]].map(([label,fn])=>(
            <button key={label} onClick={fn} style={{ background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'6px', padding:'6px 14px', fontSize:'12px', cursor:'pointer', fontWeight:600, color:'var(--text)' }}>{label}</button>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'14px' }}>
          {[['☀ Brightness', bright, setBright, 50, 200], ['◑ Contrast', contrast, setContrast, 50, 200]].map(([label,val,setter,min,max])=>(
            <div key={label}>
              <label style={{ fontSize:'11px', color:'var(--muted)', display:'block', marginBottom:'3px' }}>{label}: {val}%</label>
              <input type="range" min={min} max={max} value={val} onChange={e=>setter(Number(e.target.value))} style={{ width:'100%', accentColor:'#00CBA8' }}/>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div style={{ textAlign:'center', marginBottom:'14px', background:'#F1F5F9', borderRadius:'8px', padding:'10px' }}>
          <canvas ref={canvasRef} style={{ maxWidth:'100%', maxHeight:'340px', borderRadius:'4px', display:'block', margin:'0 auto' }}/>
          <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'6px' }}>
            Rotate: {rotate}° · Flip H: {flipH?'Yes':'No'} · Flip V: {flipV?'Yes':'No'}
          </div>
        </div>

        <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'6px', padding:'8px 20px', fontSize:'12px', cursor:'pointer', color:'var(--muted)' }}>Cancel</button>
          <button onClick={handleSave} style={{ background:saved?'#22C55E':'#00CBA8', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 22px', fontSize:'12px', fontWeight:700, cursor:'pointer', transition:'background .3s' }}>
            {saved ? '✅ Saved!' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. ADD NEW CLASS + SPLIT CLASS INTO TWO
// ══════════════════════════════════════════════════════════════════════════════
export function ClassOperations({ classes, images, onAddClass, onSplitClass }) {
  const [newClassName, setNewClassName] = useState('');
  const [splitFrom,    setSplitFrom]    = useState('');
  const [splitA,       setSplitA]       = useState('');
  const [splitB,       setSplitB]       = useState('');
  const [splitPct,     setSplitPct]     = useState(50);

  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    if (classes.find(c=>c.name===newClassName.trim())) { alert('Class already exists'); return; }
    onAddClass(newClassName.trim());
    setNewClassName('');
  };

  const handleSplit = () => {
    if (!splitFrom||!splitA.trim()||!splitB.trim()) return;
    if (window.confirm(`Split "${splitFrom}" into "${splitA}" (${splitPct}%) and "${splitB}" (${100-splitPct}%)?`)) {
      onSplitClass(splitFrom, splitA.trim(), splitB.trim(), splitPct/100);
      setSplitFrom(''); setSplitA(''); setSplitB(''); setSplitPct(50);
    }
  };

  const fromClass = classes.find(c=>c.name===splitFrom);

  return (
    <div style={{ display:'grid', gap:'12px' }}>
      {/* Add class */}
      <div style={{ padding:'14px', background:'rgba(0,203,168,.06)', border:'1px solid rgba(0,203,168,.2)', borderRadius:'10px' }}>
        <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>➕ Add New Class</div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <input value={newClassName} onChange={e=>setNewClassName(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handleAddClass()}
            placeholder="Class name (e.g. 'birds')..."
            style={{ flex:1, padding:'7px 12px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'12px' }}/>
          <button onClick={handleAddClass} disabled={!newClassName.trim()} style={{ background:'#00CBA8', color:'#fff', border:'none', borderRadius:'6px', padding:'7px 18px', fontSize:'12px', fontWeight:700, cursor:'pointer', opacity:!newClassName.trim()?0.5:1 }}>
            ➕ Add
          </button>
        </div>
        <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'6px' }}>Creates an empty class. Then move images into it using the grid's ⇄ button.</div>
      </div>

      {/* Split class */}
      <div style={{ padding:'14px', background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.2)', borderRadius:'10px' }}>
        <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>✂️ Split Class into Two</div>
        <div style={{ display:'grid', gap:'10px' }}>
          <select value={splitFrom} onChange={e=>setSplitFrom(e.target.value)} style={{ padding:'7px 12px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'12px' }}>
            <option value="">Select class to split...</option>
            {classes.map(c=><option key={c.name} value={c.name}>{c.name} ({c.count} images)</option>)}
          </select>
          {splitFrom && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <input value={splitA} onChange={e=>setSplitA(e.target.value)} placeholder={`First class name...`} style={{ padding:'7px 12px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'12px' }}/>
                <input value={splitB} onChange={e=>setSplitB(e.target.value)} placeholder={`Second class name...`} style={{ padding:'7px 12px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'12px' }}/>
              </div>
              <div>
                <label style={{ fontSize:'11px', color:'var(--muted)', display:'block', marginBottom:'4px' }}>
                  Split ratio: <strong style={{ color:'#B45309' }}>{splitPct}% / {100-splitPct}%</strong>
                  {fromClass && <span style={{ color:'var(--muted)', marginLeft:'6px' }}>
                    → {Math.round(fromClass.count*splitPct/100)} and {Math.round(fromClass.count*(1-splitPct/100))} images
                  </span>}
                </label>
                <input type="range" min={10} max={90} value={splitPct} onChange={e=>setSplitPct(Number(e.target.value))} style={{ width:'100%', accentColor:'#F59E0B' }}/>
              </div>
              <button onClick={handleSplit} disabled={!splitA.trim()||!splitB.trim()} style={{ background:'#F59E0B', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 20px', fontSize:'12px', fontWeight:700, cursor:'pointer', opacity:(!splitA.trim()||!splitB.trim())?0.5:1, alignSelf:'flex-start' }}>
                ✂️ Split Class
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. PASCAL VOC + CREATEML + NUMPY EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export function ExtendedExportFormats({ images, stats }) {
  const exportPascalVOC = () => {
    // One XML per image
    const xmlFiles = images.filter(i=>!i.error).map(img => {
      const classId = stats.classes.findIndex(c=>c.name===img.class);
      return {
        name: img.name.replace(/\.[^.]+$/,'.xml'),
        content: `<?xml version="1.0" encoding="UTF-8"?>
<annotation>
  <folder>${img.class}</folder>
  <filename>${img.name}</filename>
  <source><database>DataSmithy</database></source>
  <size>
    <width>${img.width}</width>
    <height>${img.height}</height>
    <depth>3</depth>
  </size>
  <segmented>0</segmented>
  <object>
    <name>${img.class}</name>
    <pose>Unspecified</pose>
    <truncated>0</truncated>
    <difficult>0</difficult>
    <bndbox>
      <xmin>0</xmin>
      <ymin>0</ymin>
      <xmax>${img.width}</xmax>
      <ymax>${img.height}</ymax>
    </bndbox>
  </object>
</annotation>`
      };
    });
    // Zip them up
    loadJSZipAndExport(xmlFiles, 'datasmithy_pascal_voc.zip');
  };

  const exportCreateML = () => {
    const data = images.filter(i=>!i.error).map(img=>({
      image: img.name,
      annotations: [{ label:img.class, coordinates:{ x:img.width/2, y:img.height/2, width:img.width, height:img.height } }]
    }));
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    a.download='datasmithy_createml.json'; a.click();
  };

  const exportNumpyScript = () => {
    const code = `# DataSmithy — Export Dataset as NumPy Arrays
# Run this AFTER downloading and organizing your images into folders
import numpy as np, os
from PIL import Image

DATASET_DIR = "./processed"  # your processed folder after split
IMG_SIZE    = (${stats.avgWidth}, ${stats.avgHeight})
CLASSES     = ${JSON.stringify(stats.classes.map(c=>c.name))}

def load_split(split_name):
    X, y = [], []
    for label_idx, cls in enumerate(CLASSES):
        cls_dir = os.path.join(DATASET_DIR, split_name, cls)
        if not os.path.exists(cls_dir): continue
        for fname in os.listdir(cls_dir):
            if not fname.lower().endswith(('.jpg','.jpeg','.png','.bmp','.webp')): continue
            try:
                img = Image.open(os.path.join(cls_dir,fname)).convert('RGB').resize(IMG_SIZE)
                X.append(np.array(img))
                y.append(label_idx)
            except: pass
    return np.array(X, dtype=np.float32)/255.0, np.array(y, dtype=np.int64)

print("Loading train split...")
X_train, y_train = load_split("train")
print("Loading val split...")
X_val,   y_val   = load_split("val")
print("Loading test split...")
X_test,  y_test  = load_split("test")

# Save as .npy files
np.save("X_train.npy", X_train); np.save("y_train.npy", y_train)
np.save("X_val.npy",   X_val);   np.save("y_val.npy",   y_val)
np.save("X_test.npy",  X_test);  np.save("y_test.npy",  y_test)
print(f"Train: {X_train.shape} | Val: {X_val.shape} | Test: {X_test.shape}")
print(f"Memory: {(X_train.nbytes+X_val.nbytes+X_test.nbytes)/1e6:.0f} MB total")

# Load back
# X_train = np.load("X_train.npy")  # shape: (N, H, W, 3), float32, 0-1
# y_train = np.load("y_train.npy")  # shape: (N,), int64
`;
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([code],{type:'text/plain'}));
    a.download='export_numpy.py'; a.click();
  };

  const exportCoreMlScript = () => {
    const code = `# DataSmithy — Export to CoreML (Apple)
# pip install coremltools torch torchvision
import coremltools as ct
import torch
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights

NUM_CLASSES = ${stats.classes.length}
IMG_SIZE    = (${stats.avgWidth}, ${stats.avgHeight})
CLASSES     = ${JSON.stringify(stats.classes.map(c=>c.name))}

# Load your trained model
model = efficientnet_b0(weights=None)
model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, NUM_CLASSES)
model.load_state_dict(torch.load("best_model.pth", map_location="cpu"))
model.eval()

# Trace the model
example = torch.rand(1, 3, *IMG_SIZE)
traced  = torch.jit.trace(model, example)

# Convert to CoreML
mlmodel = ct.convert(
    traced,
    inputs=[ct.ImageType(name="input_image", shape=example.shape, scale=1/255.0, bias=[0,0,0])],
    classifier_config=ct.ClassifierConfig(CLASSES),
    minimum_deployment_target=ct.target.iOS15,
)
mlmodel.short_description = "DataSmithy Image Classifier"
mlmodel.save("datasmithy_model.mlpackage")
print("Saved: datasmithy_model.mlpackage — open in Xcode")
`;
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([code],{type:'text/plain'}));
    a.download='export_coreml.py'; a.click();
  };

  const exportTorchScript = () => {
    const code = `# DataSmithy — TorchScript Export (production deployment)
import torch
from torchvision.models import efficientnet_b0

model = efficientnet_b0(weights=None)
model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, ${stats.classes.length})
model.load_state_dict(torch.load("best_model.pth", map_location="cpu"))
model.eval()

# Method 1: torch.jit.script (preferred — full Python compatibility check)
scripted = torch.jit.script(model)
scripted.save("model_scripted.pt")

# Method 2: torch.jit.trace (faster but only works for fixed control flow)
example  = torch.rand(1, 3, ${stats.avgWidth}, ${stats.avgHeight})
traced   = torch.jit.trace(model, example)
traced.save("model_traced.pt")

# Load and run inference (no Python class needed)
loaded = torch.jit.load("model_scripted.pt")
loaded.eval()
with torch.no_grad():
    output = loaded(example)
    probs  = torch.softmax(output, dim=1)
    pred   = probs.argmax(1).item()
    print(f"Predicted: ${JSON.stringify(stats.classes.map(c=>c.name))}[{'{pred}'}] ({'{probs[0][pred]:.2%}'})")
print("TorchScript models saved: model_scripted.pt, model_traced.pt")
`;
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([code],{type:'text/plain'}));
    a.download='export_torchscript.py'; a.click();
  };

  return (
    <div style={{ padding:'14px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>
        🗂 Additional Export Formats
      </div>
      <div style={{ display:'grid', gap:'8px' }}>
        {[
          { icon:'🟪', label:'Pascal VOC XML', desc:'Detectron2, older PyTorch pipelines — one XML per image',       fn:exportPascalVOC,      color:'rgba(139,92,246,.1)',   border:'rgba(139,92,246,.3)',   text:'#7C3AED' },
          { icon:'🍎', label:'CreateML JSON',  desc:'Apple CreateML — drag into Xcode to train on-device models',   fn:exportCreateML,      color:'rgba(239,68,68,.1)',    border:'rgba(239,68,68,.3)',    text:'#DC2626' },
          { icon:'🔢', label:'NumPy .npy',     desc:'Export load script for X_train/X_val/X_test as .npy arrays',   fn:exportNumpyScript,    color:'rgba(59,130,246,.1)',   border:'rgba(59,130,246,.3)',   text:'#1D4ED8' },
          { icon:'📱', label:'CoreML (.mlpackage)', desc:'Apple iOS/macOS on-device inference — opens in Xcode',     fn:exportCoreMlScript,   color:'rgba(245,158,11,.1)',   border:'rgba(245,158,11,.3)',   text:'#B45309' },
          { icon:'⚡', label:'TorchScript (.pt)', desc:'Production deployment without Python — fast inference anywhere', fn:exportTorchScript, color:'rgba(0,203,168,.1)',    border:'rgba(0,203,168,.3)',    text:'#00956B' },
        ].map(d=>(
          <div key={d.label} style={{ display:'flex', gap:'10px', alignItems:'center', padding:'10px 14px', background:'#fff', borderRadius:'7px', border:'1px solid var(--border)', flexWrap:'wrap' }}>
            <span style={{ fontSize:'18px' }}>{d.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:'12px', color:'var(--text)' }}>{d.label}</div>
              <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'1px' }}>{d.desc}</div>
            </div>
            <button onClick={d.fn} style={{ background:d.color, color:d.text, border:`1px solid ${d.border}`, borderRadius:'5px', padding:'5px 12px', fontSize:'11px', cursor:'pointer', fontWeight:600, flexShrink:0 }}>↓ Export</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 9. TIME-BASED SPLIT (by EXIF date)
// ══════════════════════════════════════════════════════════════════════════════
export function TimeSplitView({ images, stats, splitRatio }) {
  const withDate = useMemo(() => images.filter(i=>i.exifOrigDate||i.exifDate).sort((a,b)=>{
    const da = new Date(a.exifOrigDate||a.exifDate||0);
    const db = new Date(b.exifOrigDate||b.exifDate||0);
    return da - db;
  }), [images]);

  if (withDate.length < 3) {
    return (
      <div style={{ padding:'12px 16px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'8px', fontSize:'12px', color:'var(--muted)' }}>
        📅 Time-based split needs EXIF dates. Found {withDate.length} images with dates. Upload JPEG photos taken with a camera or phone to use this feature.
      </div>
    );
  }

  const n  = withDate.length;
  const [tr,va,te] = splitRatio;
  const nTr = Math.floor(n*tr/100), nVa = Math.floor(n*va/100);
  const trainEnd = withDate[nTr-1]?.exifOrigDate||withDate[nTr-1]?.exifDate||'—';
  const valEnd   = withDate[nTr+nVa-1]?.exifOrigDate||withDate[nTr+nVa-1]?.exifDate||'—';
  const testEnd  = withDate[n-1]?.exifOrigDate||withDate[n-1]?.exifDate||'—';

  return (
    <div style={{ padding:'14px', background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.2)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'#1D4ED8', fontSize:'13px', marginBottom:'10px' }}>
        📅 Time-Based Split ({withDate.length} images with EXIF dates)
      </div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'10px' }}>
        Images sorted chronologically and split. Prevents temporal leakage — good for datasets where time matters (medical, surveillance, environmental).
      </div>
      <div style={{ display:'grid', gap:'6px' }}>
        {[['🟢 Train', nTr, withDate[0]?.exifOrigDate||'—', trainEnd, '#00CBA8'], ['🔵 Val', nVa, trainEnd, valEnd, '#3B82F6'], ['🟡 Test', n-nTr-nVa, valEnd, testEnd, '#F59E0B']].map(([label,count,from,to,color])=>(
          <div key={label} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'8px 12px', background:'#fff', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'11px' }}>
            <span style={{ color, fontWeight:700, width:'70px' }}>{label}</span>
            <span style={{ color:'var(--text)', fontWeight:700 }}>{count} images</span>
            <span style={{ color:'var(--muted)', flex:1 }}>{from} → {to}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'8px' }}>
        ⚠ This uses EXIF creation dates. Make sure dates are accurate before using temporal split.
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 10. KEYBOARD SHORTCUTS LEGEND
// ══════════════════════════════════════════════════════════════════════════════
export function KeyboardShortcuts() {
  const shortcuts = [
    ['↑ In lightbox', '← →', 'Previous / next image'],
    ['↑ In lightbox', '+  −', 'Zoom in / out'],
    ['↑ In lightbox', '0',   'Reset zoom & position'],
    ['↑ In lightbox', 'Esc', 'Close lightbox'],
    ['↑ Anywhere',    'Ctrl+V', 'Paste image from clipboard'],
  ];
  return (
    <div style={{ padding:'14px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>⌨️ Keyboard Shortcuts</div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
        <tbody>
          {shortcuts.map(([ctx,key,desc],i)=>(
            <tr key={i} style={{ borderBottom:'1px solid #F1F5F9' }}>
              <td style={{ padding:'6px 8px', color:'var(--muted)', fontSize:'10px' }}>{ctx}</td>
              <td style={{ padding:'6px 8px' }}>
                {key.split(' ').map((k,j)=>(
                  <kbd key={j} style={{ background:'#E2E8F0', padding:'1px 7px', borderRadius:'3px', fontSize:'11px', fontFamily:'monospace', marginRight:'4px' }}>{k}</kbd>
                ))}
              </td>
              <td style={{ padding:'6px 8px', color:'var(--text)' }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 11. PRINT QUALITY + SOCIAL MEDIA SIZE CHECKER
// ══════════════════════════════════════════════════════════════════════════════
export function SizeAndQualityChecker({ images, stats }) {
  const socialSizes = [
    { platform:'Instagram Post',  w:1080, h:1080, note:'Square' },
    { platform:'Instagram Story', w:1080, h:1920, note:'9:16 vertical' },
    { platform:'Twitter/X',       w:1200, h:675,  note:'16:9 landscape' },
    { platform:'LinkedIn Post',   w:1200, h:627,  note:'1.91:1' },
    { platform:'Facebook Post',   w:1200, h:630,  note:'1.91:1' },
    { platform:'YouTube Thumb',   w:1280, h:720,  note:'16:9' },
    { platform:'Print A4 @ 300dpi', w:2480, h:3508, note:'300 DPI standard' },
    { platform:'Print A4 @ 150dpi', w:1240, h:1754, note:'150 DPI min' },
  ];

  const avgW = stats.avgWidth, avgH = stats.avgHeight;

  return (
    <div style={{ padding:'14px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'4px' }}>📐 Size & Platform Compatibility</div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px' }}>
        Your avg image size: <strong style={{ color:'var(--text)' }}>{avgW}×{avgH}px</strong>
      </div>
      <div style={{ display:'grid', gap:'6px' }}>
        {socialSizes.map(s => {
          const fits = avgW >= s.w && avgH >= s.h;
          const close = (avgW >= s.w*0.7 && avgH >= s.h*0.7);
          const color = fits ? '#00956B' : close ? '#B45309' : '#DC2626';
          const icon  = fits ? '✅' : close ? '⚠' : '❌';
          return (
            <div key={s.platform} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'7px 10px', background:'#fff', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'11px' }}>
              <span style={{ fontSize:'13px' }}>{icon}</span>
              <span style={{ flex:1, fontWeight:600, color:'var(--text)' }}>{s.platform}</span>
              <span style={{ color:'var(--muted)', fontSize:'10px' }}>{s.w}×{s.h}</span>
              <span style={{ color, fontWeight:600, fontSize:'10px' }}>{fits?'Fits':'Too small'}</span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'8px', lineHeight:1.6 }}>
        ✅ = your images are large enough to use without upscaling<br/>
        ⚠ = close but may lose quality · ❌ = too small, will be pixelated
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 12. COLOR TEMPERATURE ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════
export function ColorTemperatureChart({ images }) {
  const valid = images.filter(i => !i.error);
  if (!valid.length) return null;
  const warm = valid.filter(i => i.avgR > i.avgB + 15).length;
  const cool = valid.filter(i => i.avgB > i.avgR + 15).length;
  const neutral = valid.length - warm - cool;
  const total = valid.length;

  return (
    <div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'8px' }}>Color Temperature Distribution</div>
      <div style={{ display:'flex', height:'14px', borderRadius:'7px', overflow:'hidden', marginBottom:'10px' }}>
        <div style={{ flex:warm,    background:'linear-gradient(90deg,#FF6B35,#FFB347)', minWidth:warm?'2px':0 }}/>
        <div style={{ flex:neutral, background:'#CBD5E1', minWidth:neutral?'2px':0 }}/>
        <div style={{ flex:cool,    background:'linear-gradient(90deg,#74B9FF,#0984E3)', minWidth:cool?'2px':0 }}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
        {[['🔥 Warm', warm, total, 'Reds/oranges dominate', 'linear-gradient(135deg,#FF6B35,#FFB347)'],['⚪ Neutral', neutral, total, 'Balanced channels', '#CBD5E1'],['❄️ Cool', cool, total, 'Blues dominate', 'linear-gradient(135deg,#74B9FF,#0984E3)']].map(([label,n,t,note,bg])=>(
          <div key={label} style={{ textAlign:'center', padding:'10px', background:'#F8FAFC', borderRadius:'8px', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:'16px', fontWeight:800, color:'var(--text)', marginBottom:'2px' }}>{n.toLocaleString()}</div>
            <div style={{ fontSize:'10px', fontWeight:600, color:'var(--muted)', marginBottom:'2px' }}>{label}</div>
            <div style={{ fontSize:'9px', color:'var(--muted)' }}>{t>0?(n/t*100).toFixed(0):0}% · {note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════
async function loadJSZipAndExport(files, zipName) {
  if (!window.JSZip) {
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    document.head.appendChild(s);
    await new Promise(r=>{s.onload=r;});
  }
  const zip = new window.JSZip();
  files.forEach(f => zip.file(f.name, f.content));
  const blob = await zip.generateAsync({type:'blob',compression:'DEFLATE'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = zipName;
  a.click();
}

// ══════════════════════════════════════════════════════════════════════════════
// FULL INTEGRATION GUIDE
// ══════════════════════════════════════════════════════════════════════════════
/*
IMPORT (add to ImageTab.jsx top):
  import {
    URLAndClipboardImport, SaturationHueChart, calcHSV, calcEntropy,
    ScatterPlot, UndoBar, ImageEditor, ClassOperations,
    ExtendedExportFormats, TimeSplitView, KeyboardShortcuts,
    SizeAndQualityChecker, ColorTemperatureChart
  } from './ImageTabMissing.jsx';

STATE (add to ImageTab component):
  const [history,    setHistory]    = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [editingImg, setEditingImg] = useState(null);

HISTORY HELPERS:
  const pushHistory = useCallback((imgs) => {
    setHistory(prev => [...prev.slice(0, historyIdx+1), imgs].slice(-10));
    setHistoryIdx(prev => Math.min(prev+1, 9));
  }, [historyIdx]);

  const handleUndo = () => {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    computeStats(history[newIdx]);
  };

  const handleRedo = () => {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    computeStats(history[newIdx]);
  };

ADD TO analyzePixels (inside ImageTab.jsx):
  const hsvData = calcHSV(canvas);
  const entropy = calcEntropy(canvas);
  // Add to returned object: ...hsvData, entropy

ADD TO UPLOAD CARD (above/below the drag-drop area):
  <URLAndClipboardImport onImagesReady={processImages}/>

ADD TO OVERVIEW TAB (after health score):
  <UndoBar history={history} historyIdx={historyIdx} onUndo={handleUndo} onRedo={handleRedo}/>

ADD TO CHARTS TAB:
  <SaturationHueChart images={images}/>
  <ColorTemperatureChart images={images}/>
  <ScatterPlot images={images} onClickPoint={setLightbox}/>

ADD TO SPLIT TAB:
  <TimeSplitView images={images} stats={stats} splitRatio={splitRatio}/>

ADD TO EXPORT TAB:
  <ExtendedExportFormats images={images} stats={stats}/>

ADD NEW SUB-TABS:
  { id:'editor',   label:'✏️ Editor'     },
  { id:'classes2', label:'⚙ Classes'     },
  { id:'sizes',    label:'📐 Sizes'      },
  { id:'shortcuts',label:'⌨️ Shortcuts'  },

TAB PANELS:
  {activeView==='editor'   && <div className="card" style={{padding:'20px'}}><ST>Image Editor</ST>
    <div style={{fontSize:'12px',color:'var(--muted)',marginBottom:'12px'}}>Select an image from the grid and click ✏️ to edit.</div>
    {editingImg ? <ImageEditor image={editingImg} onSave={(saved)=>{
      const newImgs=images.map(i=>i.name===saved.name?saved:i);
      computeStats(newImgs);
    }} onClose={()=>setEditingImg(null)}/> : <div style={{fontSize:'12px',color:'var(--muted)'}}>No image selected for editing.</div>}
  </div>}
  {activeView==='classes2' && <div className="card" style={{padding:'20px'}}><ST>Class Operations</ST>
    <ClassOperations classes={stats.classes} images={images}
      onAddClass={(name)=>{ /* add empty class computeStats([...images]); }}
      onSplitClass={(from,nameA,nameB,pct)=>{
        const fromImgs=[...images.filter(i=>i.class===from)].sort(()=>Math.random()-.5);
        const n=fromImgs.length, nA=Math.floor(n*pct);
        const newImgs=images.map(i=>{
          if(i.class!==from) return i;
          const idx=fromImgs.findIndex(f=>f.name===i.name);
          return {...i,class:idx<nA?nameA:nameB};
        });
        pushHistory(images); computeStats(newImgs);
      }}/>
  </div>}
  {activeView==='sizes'    && <div className="card" style={{padding:'20px'}}><ST>Size & Platform Guide</ST><SizeAndQualityChecker images={images} stats={stats}/></div>}
  {activeView==='shortcuts'&& <div className="card" style={{padding:'20px'}}><ST>Keyboard Shortcuts</ST><KeyboardShortcuts/></div>}

ADD ✏️ button in lightbox footer:
  <button onClick={()=>setEditingImg(image)} style={{background:'rgba(0,203,168,.1)',color:'#00CBA8',border:'1.5px solid rgba(0,203,168,.3)',borderRadius:'5px',padding:'4px 12px',fontSize:'11px',cursor:'pointer',fontWeight:600}}>
    ✏️ Edit
  </button>

WRAP destructive actions with pushHistory:
  Before removeDuplicates: pushHistory(images);
  Before removeBlurry:     pushHistory(images);
  Before removeDark:       pushHistory(images);
  Before batch delete:     pushHistory(images);*/