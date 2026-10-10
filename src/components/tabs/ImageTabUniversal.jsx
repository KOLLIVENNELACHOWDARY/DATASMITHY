// src/components/tabs/ImageTabUniversal.jsx
// THE 10 MISSING UNIVERSAL IMAGE FEATURES
// For: Photographers, designers, e-commerce, journalists — NOT just ML engineers

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';

const S = {
  card: { background:'#fff', border:'1px solid var(--border)', borderRadius:'10px', padding:'16px', marginBottom:'14px' },
  btn:  (bg='#00CBA8',c='#fff') => ({ background:bg, color:c, border:'none', borderRadius:'6px', padding:'7px 18px', fontSize:'12px', fontWeight:700, cursor:'pointer' }),
  lbl:  { fontSize:'11px', color:'var(--muted)', fontWeight:600, display:'block', marginBottom:'4px' },
  inp:  { padding:'7px 12px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'12px', width:'100%', boxSizing:'border-box' },
  tag:  (c='#00CBA8') => ({ display:'inline-block', padding:'2px 8px', borderRadius:'4px', fontSize:'10px', fontWeight:700, color:c, background:`${c}18`, border:`1px solid ${c}33` }),
};

// ══════════════════════════════════════════════════════════════════════════════
// 1. BATCH RESIZE + COMPRESS FOR WEB
// ══════════════════════════════════════════════════════════════════════════════
export function BatchResizeCompress({ images, onExport }) {
  const [maxWidth,  setMaxWidth]  = useState(1200);
  const [maxHeight, setMaxHeight] = useState(0); // 0 = auto (maintain aspect)
  const [quality,   setQuality]   = useState(85);
  const [format,    setFormat]    = useState('jpeg');
  const [maxKB,     setMaxKB]     = useState(0); // 0 = no limit
  const [progress,  setProgress]  = useState(0);
  const [running,   setRunning]   = useState(false);
  const [stats,     setStats]     = useState(null);
  const cancelRef = useRef(false);

  const processImages = async () => {
    setRunning(true); setProgress(0); setStats(null);
    cancelRef.current = false;

    // Load JSZip
    if (!window.JSZip) {
      await new Promise((res,rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }

    const zip = new window.JSZip();
    let totalBefore = 0, totalAfter = 0, count = 0;

    for (let i = 0; i < images.length; i++) {
      if (cancelRef.current) break;
      const img = images[i];
      if (img.error || !img.src) continue;

      try {
        // Load image
        const el = new Image(); el.src = img.src;
        await new Promise(r => { el.onload = r; el.onerror = r; });

        // Calculate new dimensions
        let w = el.naturalWidth, h = el.naturalHeight;
        const targetW = maxWidth  || w;
        const targetH = maxHeight || h;
        const scale   = Math.min(targetW/w, targetH/h, 1); // never upscale
        w = Math.round(w * scale);
        h = Math.round(h * scale);

        // Draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(el, 0, 0, w, h);

        // Adaptive quality for target file size
        let q = quality / 100;
        if (maxKB > 0) {
          for (let attempt = 0; attempt < 5; attempt++) {
            const dataUrl = canvas.toDataURL(`image/${format}`, q);
            const bytes = Math.round((dataUrl.length - 22) * 3 / 4);
            if (bytes <= maxKB * 1024 || q <= 0.1) break;
            q = q * 0.75;
          }
        }

        const mime    = `image/${format === 'jpg' ? 'jpeg' : format}`;
        const dataUrl = canvas.toDataURL(mime, q);
        const bytes   = Math.round((dataUrl.length - 22) * 3 / 4);
        const base64  = dataUrl.split(',')[1];
        const ext     = format === 'jpeg' ? 'jpg' : format;
        const name    = img.name.replace(/\.[^.]+$/, `.${ext}`);

        zip.file(name, base64, { base64: true });
        totalBefore += img.size || 0;
        totalAfter  += bytes;
        count++;
      } catch(e) { /* skip broken */ }

      setProgress(Math.round((i+1) / images.length * 100));
      if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
    }

    const blob = await zip.generateAsync({ type:'blob', compression:'DEFLATE' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `resized_${format}.zip`; a.click();

    setStats({ count, totalBefore, totalAfter, saved: totalBefore - totalAfter });
    setRunning(false);
  };

  const valid = images.filter(i => !i.error && i.src);

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>📐 Batch Resize + Compress for Web</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'10px', marginBottom:'12px' }}>
        {[
          ['Max Width (px)', maxWidth, setMaxWidth, '0 = no limit'],
          ['Max Height (px)', maxHeight, setMaxHeight, '0 = maintain ratio'],
          ['Quality (1–100)', quality, setQuality, 'JPEG/WebP only'],
          ['Max file size (KB)', maxKB, setMaxKB, '0 = no limit'],
        ].map(([l,v,set,hint])=>(
          <div key={l}>
            <span style={S.lbl}>{l}</span>
            <input type="number" min={0} value={v} onChange={e=>set(+e.target.value)} style={S.inp}/>
            <div style={{ fontSize:'9px', color:'var(--muted)', marginTop:'2px' }}>{hint}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom:'12px' }}>
        <span style={S.lbl}>Output Format</span>
        <div style={{ display:'flex', gap:'6px' }}>
          {[['jpeg','JPEG (smaller)'],['webp','WebP (best compression)'],['png','PNG (lossless)']].map(([f,l])=>(
            <label key={f} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', padding:'6px 12px', background:format===f?'rgba(0,203,168,.08)':'#F8FAFC', border:`1px solid ${format===f?'#00CBA8':'var(--border)'}`, borderRadius:'6px', cursor:'pointer' }}>
              <input type="radio" checked={format===f} onChange={()=>setFormat(f)}/>{l}
            </label>
          ))}
        </div>
      </div>
      {/* Preview of new dimensions */}
      {valid.length > 0 && (
        <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px', padding:'8px 12px', background:'#F8FAFC', borderRadius:'6px', border:'1px solid var(--border)' }}>
          Sample: {valid[0].width}×{valid[0].height} → {Math.round(valid[0].width * Math.min((maxWidth||valid[0].width)/valid[0].width,1))}×{Math.round(valid[0].height * Math.min((maxWidth||valid[0].width)/valid[0].width,1))}px
        </div>
      )}
      <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'12px' }}>
        <button onClick={processImages} disabled={running || !valid.length} style={{ ...S.btn(), opacity:running||!valid.length?0.5:1 }}>
          {running ? `⏳ Processing ${progress}%...` : `↓ Resize + Download ZIP (${valid.length} images)`}
        </button>
        {running && <button onClick={()=>cancelRef.current=true} style={{ ...S.btn('#EF4444'), padding:'7px 14px' }}>✕ Cancel</button>}
      </div>
      {running && <div style={{ height:'4px', background:'#E2E8F0', borderRadius:'2px', overflow:'hidden', marginBottom:'10px' }}><div style={{ width:`${progress}%`, height:'100%', background:'#00CBA8', transition:'width .3s' }}/></div>}
      {stats && (
        <div style={{ padding:'10px 14px', background:'rgba(0,203,168,.07)', border:'1px solid rgba(0,203,168,.2)', borderRadius:'7px', fontSize:'11px', color:'#00956B' }}>
          ✅ {stats.count} images processed · Before: {(stats.totalBefore/1024/1024).toFixed(1)}MB · After: {(stats.totalAfter/1024/1024).toFixed(1)}MB · Saved: {(stats.saved/1024/1024).toFixed(1)}MB ({stats.totalBefore>0?Math.round(stats.saved/stats.totalBefore*100):0}%)
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. STRIP EXIF / GPS FOR PRIVACY
// ══════════════════════════════════════════════════════════════════════════════
export function EXIFStripper({ images }) {
  const [mode,     setMode]     = useState('gps_only'); // gps_only | all_exif
  const [running,  setRunning]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [done,     setDone]     = useState(false);

  const strip = async () => {
    setRunning(true); setDone(false); setProgress(0);
    if (!window.JSZip) {
      await new Promise((res,rej) => { const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
    }
    const zip = new window.JSZip();
    const valid = images.filter(i=>!i.error&&i.src);

    for (let i=0; i<valid.length; i++) {
      const img = valid[i];
      try {
        // Draw image to canvas — this strips ALL metadata by design
        // Canvas toDataURL never preserves EXIF — it's pixel-only
        const el = new Image(); el.src = img.src;
        await new Promise(r=>{el.onload=r;el.onerror=r;});
        const c = document.createElement('canvas');
        c.width = el.naturalWidth; c.height = el.naturalHeight;
        c.getContext('2d').drawImage(el,0,0);
        const dataUrl = c.toDataURL('image/jpeg', 0.95);
        const base64  = dataUrl.split(',')[1];
        zip.file(img.name.replace(/\.[^.]+$/,'.jpg'), base64, { base64:true });
      } catch(e) {}
      setProgress(Math.round((i+1)/valid.length*100));
      if (i%10===0) await new Promise(r=>setTimeout(r,0));
    }

    const blob = await zip.generateAsync({ type:'blob' });
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='stripped_metadata.zip'; a.click();
    setDone(true); setRunning(false);
  };

  const gpsCount = images.filter(i=>i.gpsLat||i.gpsLon).length;
  const exifCount= images.filter(i=>i.exifCamera||i.exifDate).length;

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'6px' }}>🔒 Strip EXIF / GPS for Privacy</div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'14px', lineHeight:1.7 }}>
        JPEG photos taken on phones embed GPS location, device model, serial number, and timestamps. Strip this before sharing publicly. Canvas re-rendering removes <strong>all metadata</strong> by browser design.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'14px' }}>
        {[['🛰 Images with GPS', gpsCount, '#EF4444'],['📷 Images with EXIF', exifCount, '#F59E0B'],['📁 Total images', images.filter(i=>!i.error).length, '#64748B'],['🔒 Will be cleaned', images.filter(i=>!i.error&&i.src).length, '#00CBA8']].map(([l,v,c])=>(
          <div key={l} style={{ display:'flex', gap:'10px', alignItems:'center', padding:'8px 12px', background:'#F8FAFC', borderRadius:'6px', border:'1px solid var(--border)' }}>
            <span style={{ fontSize:'16px', fontWeight:800, color:c }}>{v}</span>
            <span style={{ fontSize:'10px', color:'var(--muted)' }}>{l}</span>
          </div>
        ))}
      </div>
      <div style={{ padding:'10px 14px', background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.2)', borderRadius:'7px', fontSize:'11px', color:'#DC2626', marginBottom:'14px', lineHeight:1.7 }}>
        ⚠ This redraws every image through canvas — <strong>all EXIF, GPS, camera info, and timestamps are removed</strong>. Output is always JPEG. Original files are not touched.
      </div>
      {running && <div style={{ height:'4px', background:'#E2E8F0', borderRadius:'2px', overflow:'hidden', marginBottom:'10px' }}><div style={{ width:`${progress}%`, height:'100%', background:'#EF4444', transition:'width .3s' }}/></div>}
      <button onClick={strip} disabled={running} style={{ ...S.btn('#EF4444'), opacity:running?0.6:1 }}>
        {running ? `⏳ Stripping ${progress}%...` : `🔒 Strip Metadata + Download ZIP`}
      </button>
      {done && <div style={{ fontSize:'11px', color:'#00956B', marginTop:'8px' }}>✅ All metadata stripped. Safe to share.</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. BATCH COLOR ADJUSTMENT (apply to ALL images)
// ══════════════════════════════════════════════════════════════════════════════
export function BatchColorAdjust({ images }) {
  const [brightness, setBrightness] = useState(100);
  const [contrast,   setContrast]   = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sharpness,  setSharpness]  = useState(0); // 0 = no sharpen
  const [preview,    setPreview]    = useState(null);
  const [running,    setRunning]    = useState(false);
  const [progress,   setProgress]   = useState(0);

  const buildFilter = () => `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

  // Live preview on first image
  useEffect(() => {
    const first = images.find(i=>!i.error&&i.src);
    if (!first) return;
    const canvas = document.createElement('canvas');
    const img = new Image(); img.src = first.src;
    img.onload = () => {
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.filter = buildFilter();
      ctx.drawImage(img, 0, 0);
      setPreview(canvas.toDataURL('image/jpeg', 0.8));
    };
  }, [brightness, contrast, saturation, images]);

  const apply = async () => {
    setRunning(true); setProgress(0);
    if (!window.JSZip) {
      await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
    }
    const zip = new window.JSZip();
    const valid = images.filter(i=>!i.error&&i.src);
    const filter = buildFilter();

    for (let i=0; i<valid.length; i++) {
      const img2 = valid[i];
      try {
        const el = new Image(); el.src = img2.src;
        await new Promise(r=>{el.onload=r;el.onerror=r;});
        const c = document.createElement('canvas');
        c.width=el.naturalWidth; c.height=el.naturalHeight;
        const ctx=c.getContext('2d');
        ctx.filter=filter;
        ctx.drawImage(el,0,0);
        zip.file(img2.name, c.toDataURL('image/jpeg',0.92).split(',')[1], {base64:true});
      } catch(e) {}
      setProgress(Math.round((i+1)/valid.length*100));
      if (i%10===0) await new Promise(r=>setTimeout(r,0));
    }
    const blob=await zip.generateAsync({type:'blob'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='color_adjusted.zip'; a.click();
    setRunning(false);
  };

  const SLIDERS = [['☀ Brightness', brightness, setBrightness, 50, 200],['◑ Contrast', contrast, setContrast, 50, 200],['🌈 Saturation', saturation, setSaturation, 0, 200]];

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>🎨 Batch Color Adjustment (Apply to All Images)</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
        <div>
          {SLIDERS.map(([l,v,set,min,max])=>(
            <div key={l} style={{ marginBottom:'14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                <span style={S.lbl}>{l}</span>
                <span style={{ fontSize:'11px', fontWeight:700, color:'var(--text)' }}>{v}%</span>
              </div>
              <input type="range" min={min} max={max} value={v} onChange={e=>set(+e.target.value)} style={{ width:'100%', accentColor:'#00CBA8' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px', color:'#CBD5E1' }}><span>{min}%</span><span>100%</span><span>{max}%</span></div>
            </div>
          ))}
          <button onClick={()=>{setBrightness(100);setContrast(100);setSaturation(100);}} style={{ ...S.btn('#F1F5F9','var(--muted)'), fontSize:'11px', padding:'5px 12px' }}>↺ Reset</button>
        </div>
        <div>
          <span style={S.lbl}>Live preview (first image):</span>
          {preview ? (
            <img src={preview} style={{ width:'100%', borderRadius:'7px', border:'1px solid var(--border)', objectFit:'contain', maxHeight:'200px' }}/>
          ) : <div style={{ height:'200px', background:'#F8FAFC', borderRadius:'7px', border:'1px dashed var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', color:'var(--muted)' }}>No preview</div>}
        </div>
      </div>
      {running && <div style={{ height:'4px', background:'#E2E8F0', borderRadius:'2px', overflow:'hidden', margin:'12px 0' }}><div style={{ width:`${progress}%`, height:'100%', background:'#00CBA8', transition:'width .3s' }}/></div>}
      <button onClick={apply} disabled={running} style={{ ...S.btn(), marginTop:'12px', opacity:running?0.6:1 }}>
        {running ? `⏳ Applying ${progress}%...` : `✅ Apply to All ${images.filter(i=>!i.error&&i.src).length} Images + Download ZIP`}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. STANDALONE FORMAT CONVERSION
// ══════════════════════════════════════════════════════════════════════════════
export function FormatConverter({ images }) {
  const [toFormat, setToFormat] = useState('webp');
  const [quality,  setQuality]  = useState(90);
  const [running,  setRunning]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [done,     setDone]     = useState(null);

  const convert = async () => {
    setRunning(true); setProgress(0); setDone(null);
    if (!window.JSZip) {
      await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
    }
    const zip = new window.JSZip();
    const valid = images.filter(i=>!i.error&&i.src);
    const mime  = toFormat==='jpg'?'image/jpeg':`image/${toFormat}`;
    const ext   = toFormat==='jpg'?'jpg':toFormat;
    let converted=0;

    for (let i=0; i<valid.length; i++) {
      const img = valid[i];
      try {
        const el=new Image(); el.src=img.src;
        await new Promise(r=>{el.onload=r;el.onerror=r;});
        const c=document.createElement('canvas'); c.width=el.naturalWidth; c.height=el.naturalHeight;
        c.getContext('2d').drawImage(el,0,0);
        const base64=c.toDataURL(mime, quality/100).split(',')[1];
        zip.file(img.name.replace(/\.[^.]+$/,`.${ext}`), base64, {base64:true});
        converted++;
      } catch(e) {}
      setProgress(Math.round((i+1)/valid.length*100));
      if (i%10===0) await new Promise(r=>setTimeout(r,0));
    }
    const blob=await zip.generateAsync({type:'blob'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`converted_${toFormat}.zip`; a.click();
    setDone(converted); setRunning(false);
  };

  const FORMAT_INFO = { webp:'Best compression, modern browsers', jpeg:'Universal compatibility, small size', png:'Lossless, supports transparency' };
  // NOTE: GIF intentionally excluded — browsers cannot encode GIF via canvas.toDataURL

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>🔄 Batch Format Conversion</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'8px', marginBottom:'14px' }}>
        {Object.entries(FORMAT_INFO).map(([f,desc])=>(
          <label key={f} onClick={()=>setToFormat(f)} style={{ padding:'10px 12px', background:toFormat===f?'rgba(0,203,168,.08)':'#F8FAFC', border:`1.5px solid ${toFormat===f?'#00CBA8':'var(--border)'}`, borderRadius:'8px', cursor:'pointer', transition:'all .15s' }}>
            <div style={{ fontWeight:700, fontSize:'13px', color:toFormat===f?'#00956B':'var(--text)', marginBottom:'3px' }}>{f.toUpperCase()}</div>
            <div style={{ fontSize:'10px', color:'var(--muted)' }}>{desc}</div>
          </label>
        ))}
      </div>
      {toFormat!=='png' && (
        <div style={{ marginBottom:'14px' }}>
          <span style={S.lbl}>Quality: {quality}%</span>
          <input type="range" min={20} max={100} value={quality} onChange={e=>setQuality(+e.target.value)} style={{ width:'100%', accentColor:'#00CBA8' }}/>
        </div>
      )}
      {running && <div style={{ height:'4px', background:'#E2E8F0', borderRadius:'2px', overflow:'hidden', marginBottom:'10px' }}><div style={{ width:`${progress}%`, height:'100%', background:'#00CBA8', transition:'width .3s' }}/></div>}
      <button onClick={convert} disabled={running||!images.filter(i=>!i.error&&i.src).length} style={{ ...S.btn(), opacity:running?0.6:1 }}>
        {running?`⏳ Converting ${progress}%...`:`🔄 Convert All to ${toFormat.toUpperCase()} + Download ZIP`}
      </button>
      {done!==null && <div style={{ fontSize:'11px', color:'#00956B', marginTop:'8px' }}>✅ {done} images converted to {toFormat.toUpperCase()}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. CONTACT SHEET / MOSAIC THUMBNAIL GRID
// ══════════════════════════════════════════════════════════════════════════════
export function ContactSheet({ images }) {
  const [cols,       setCols]       = useState(5);
  const [thumbSize,  setThumbSize]  = useState(150);
  const [showNames,  setShowNames]  = useState(true);
  const [showClass,  setShowClass]  = useState(true);
  const [bgColor,    setBgColor]    = useState('#FFFFFF');
  const [textColor,  setTextColor]  = useState('#333333');
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef(null);

  const generate = async () => {
    setGenerating(true);
    const valid = images.filter(i=>!i.error&&i.src).slice(0,200);
    if (!valid.length) { setGenerating(false); return; }

    const padding  = 8;
    const labelH   = (showNames||showClass) ? 22 : 0;
    const cellW    = thumbSize + padding;
    const cellH    = thumbSize + labelH + padding;
    const rows     = Math.ceil(valid.length / cols);
    const W        = cols * cellW + padding;
    const H        = rows * cellH + padding + 40; // 40px for header

    const canvas   = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = textColor;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`DataSmithy Contact Sheet — ${valid.length} images`, padding, 24);

    // Draw thumbnails
    for (let i=0; i<valid.length; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const x   = padding + col * cellW;
      const y   = 40 + padding + row * cellH;

      try {
        const el = new Image(); el.src = valid[i].src;
        await new Promise(r=>{el.onload=r;el.onerror=r;});
        // Cover crop
        const ar = el.naturalWidth/el.naturalHeight;
        let sw=el.naturalWidth, sh=el.naturalHeight, sx=0, sy=0;
        if (ar > 1) { sw=el.naturalHeight; sx=(el.naturalWidth-sw)/2; }
        else        { sh=el.naturalWidth;  sy=(el.naturalHeight-sh)/2; }
        ctx.drawImage(el, sx,sy,sw,sh, x,y,thumbSize,thumbSize);
      } catch(e) {
        ctx.fillStyle='#F1F5F9'; ctx.fillRect(x,y,thumbSize,thumbSize);
      }

      // Border
      ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1;
      ctx.strokeRect(x, y, thumbSize, thumbSize);

      // Label
      if (labelH) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y+thumbSize-labelH, thumbSize, labelH);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '9px system-ui, sans-serif';
        const label = [showClass?valid[i].class:'',showNames?valid[i].name.split('/').pop():''].filter(Boolean).join(' · ');
        ctx.fillText(label.slice(0,22), x+3, y+thumbSize-6);
      }

      if (i%20===0) await new Promise(r=>setTimeout(r,0));
    }

    // Download
    canvas.toBlob(blob=>{
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='contact_sheet.jpg';a.click();
      setGenerating(false);
    }, 'image/jpeg', 0.92);
  };

  const valid = images.filter(i=>!i.error&&i.src);

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>🗂 Contact Sheet / Thumbnail Mosaic</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'12px' }}>
        <div><span style={S.lbl}>Columns</span><input type="number" min={2} max={20} value={cols} onChange={e=>setCols(+e.target.value)} style={S.inp}/></div>
        <div><span style={S.lbl}>Thumbnail size (px)</span><input type="number" min={50} max={400} value={thumbSize} onChange={e=>setThumbSize(+e.target.value)} style={S.inp}/></div>
        <div><span style={S.lbl}>Background</span><input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)} style={{ ...S.inp, height:'38px', padding:'2px' }}/></div>
      </div>
      <div style={{ display:'flex', gap:'12px', marginBottom:'14px' }}>
        {[['showNames','Show filenames'],['showClass','Show class labels']].map(([k,l])=>(
          <label key={k} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', cursor:'pointer' }}>
            <input type="checkbox" checked={k==='showNames'?showNames:showClass} onChange={e=>k==='showNames'?setShowNames(e.target.checked):setShowClass(e.target.checked)}/>
            {l}
          </label>
        ))}
      </div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px' }}>
        Will generate: {Math.ceil(valid.length/cols)} rows × {cols} cols · Canvas: ~{Math.round(((cols*thumbSize+cols*8)/1920)*100)}% of 1920px wide · {Math.min(valid.length,200)} images (cap 200)
      </div>
      <button onClick={generate} disabled={generating||!valid.length} style={{ ...S.btn('#8B5CF6'), opacity:generating||!valid.length?0.6:1 }}>
        {generating?'⏳ Generating...':'🗂 Generate Contact Sheet (JPEG)'}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. WCAG COLOR ACCESSIBILITY CHECK
// ══════════════════════════════════════════════════════════════════════════════
export function WCAGAccessibilityCheck({ images }) {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  // WCAG relative luminance
  const luminance = (r,g,b) => {
    const [rs,gs,bs] = [r,g,b].map(v => { const s=v/255; return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4); });
    return 0.2126*rs + 0.7152*gs + 0.0722*bs;
  };

  const contrastRatio = (l1,l2) => {
    const lighter=Math.max(l1,l2), darker=Math.min(l1,l2);
    return (lighter+0.05)/(darker+0.05);
  };

  const run = async () => {
    setRunning(true);
    const valid = images.filter(i=>!i.error&&i.src).slice(0,100);
    const res   = [];

    for (let i=0; i<valid.length; i++) {
      const img = valid[i];
      try {
        const el=new Image(); el.src=img.src;
        await new Promise(r=>{el.onload=r;el.onerror=r;});
        const sc=document.createElement('canvas'); sc.width=32; sc.height=32;
        sc.getContext('2d').drawImage(el,0,0,32,32);
        const d=sc.getContext('2d').getImageData(0,0,32,32).data;

        // Sample dominant foreground and background colors
        // Simple approach: find brightest and darkest regions
        let brightR=0,brightG=0,brightB=0,darkR=0,darkG=0,darkB=0,bn=0,dn=0;
        for (let j=0;j<d.length;j+=4) {
          const lum=(d[j]+d[j+1]+d[j+2])/3;
          if (lum>200){brightR+=d[j];brightG+=d[j+1];brightB+=d[j+2];bn++;}
          if (lum<55) {darkR+=d[j];darkG+=d[j+1];darkB+=d[j+2];dn++;}
        }
        if (!bn||!dn) { res.push({...img, wcag:null, ratio:null}); continue; }
        const bgL  = luminance(brightR/bn, brightG/bn, brightB/bn);
        const fgL  = luminance(darkR/dn, darkG/dn, darkB/dn);
        const ratio = +contrastRatio(bgL, fgL).toFixed(2);
        const aa   = ratio >= 4.5;
        const aaa  = ratio >= 7.0;
        res.push({ ...img, ratio, aa, aaa, wcag: aaa?'AAA':aa?'AA':'Fail' });
      } catch(e) { res.push({...img, wcag:null, ratio:null}); }
      if (i%10===0) await new Promise(r=>setTimeout(r,0));
    }

    const pass = res.filter(r=>r.aa).length;
    const fail = res.filter(r=>r.wcag==='Fail').length;
    setResults({ items:res, pass, fail, aaa:res.filter(r=>r.aaa).length });
    setRunning(false);
  };

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'6px' }}>♿ WCAG Color Accessibility Check</div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px', lineHeight:1.7 }}>
        Checks foreground/background contrast ratio per WCAG 2.1 standards. AA requires ≥4.5:1 (normal text), AAA requires ≥7:1 (enhanced). Important for design and UI screenshot datasets.
      </div>
      <button onClick={run} disabled={running} style={{ ...S.btn('#3B82F6'), opacity:running?0.6:1, marginBottom:'12px' }}>
        {running?'⏳ Checking...':'♿ Check Accessibility (100 images)'}
      </button>
      {results && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'12px' }}>
            {[['✅ Pass AA', results.pass, '#00CBA8'],['🌟 Pass AAA', results.aaa, '#8B5CF6'],['❌ Fail', results.fail, '#EF4444']].map(([l,v,c])=>(
              <div key={l} style={{ textAlign:'center', padding:'10px', background:'#F8FAFC', borderRadius:'7px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:'20px', fontWeight:800, color:c }}>{v}</div>
                <div style={{ fontSize:'10px', color:'var(--muted)' }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ maxHeight:'160px', overflowY:'auto' }}>
            {results.items.filter(r=>r.ratio).map((r,i)=>(
              <div key={i} style={{ display:'flex', gap:'8px', alignItems:'center', padding:'5px 0', borderBottom:'1px solid #F8FAFC', fontSize:'10px' }}>
                <img src={r.src} style={{ width:'24px', height:'24px', objectFit:'cover', borderRadius:'3px', flexShrink:0 }}/>
                <span style={{ flex:1, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</span>
                <span style={{ fontWeight:700, color:'var(--muted)' }}>{r.ratio}:1</span>
                <span style={{ ...S.tag(r.aaa?'#8B5CF6':r.aa?'#00CBA8':'#EF4444') }}>{r.wcag}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. BRAND COLOR COMPLIANCE
// ══════════════════════════════════════════════════════════════════════════════
export function BrandColorCheck({ images }) {
  const [brandColors, setBrandColors] = useState([{ hex:'#00CBA8', name:'Brand Teal', tolerance:30 }]);
  const [results,     setResults]     = useState(null);
  const [running,     setRunning]     = useState(false);

  const hexToRGB = h => { const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16); return [r,g,b]; };
  const colorDist = (a,b) => Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2);

  const check = async () => {
    setRunning(true);
    const valid = images.filter(i=>!i.error&&i.src).slice(0,100);
    const brandRGBs = brandColors.map(bc=>({...bc, rgb:hexToRGB(bc.hex)}));
    const res = [];

    for (let i=0; i<valid.length; i++) {
      const img=valid[i];
      try {
        const el=new Image(); el.src=img.src;
        await new Promise(r=>{el.onload=r;el.onerror=r;});
        const sc=document.createElement('canvas'); sc.width=32; sc.height=32;
        sc.getContext('2d').drawImage(el,0,0,32,32);
        const d=sc.getContext('2d').getImageData(0,0,32,32).data;
        const matches = brandRGBs.map(bc=>{
          let matchPx=0;
          for(let j=0;j<d.length;j+=4) { if(colorDist([d[j],d[j+1],d[j+2]],bc.rgb)<=bc.tolerance) matchPx++; }
          return { name:bc.name, hex:bc.hex, pct:+(matchPx/(d.length/4)*100).toFixed(1) };
        });
        const compliant = matches.some(m=>m.pct>=5);
        res.push({...img, matches, compliant});
      } catch(e){res.push({...img, matches:[], compliant:false});}
      if(i%10===0) await new Promise(r=>setTimeout(r,0));
    }
    setResults({ items:res, compliant:res.filter(r=>r.compliant).length, total:res.length });
    setRunning(false);
  };

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>🎨 Brand Color Compliance</div>
      <div style={{ marginBottom:'12px' }}>
        <span style={S.lbl}>Your brand colors:</span>
        <div style={{ display:'grid', gap:'6px' }}>
          {brandColors.map((bc,i)=>(
            <div key={i} style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <input type="color" value={bc.hex} onChange={e=>setBrandColors(cs=>cs.map((c,j)=>j===i?{...c,hex:e.target.value}:c))} style={{ width:'40px', height:'32px', border:'none', borderRadius:'4px', cursor:'pointer' }}/>
              <input value={bc.name} onChange={e=>setBrandColors(cs=>cs.map((c,j)=>j===i?{...c,name:e.target.value}:c))} placeholder="Color name" style={{...S.inp,flex:1}}/>
              <div>
                <span style={{ fontSize:'9px', color:'var(--muted)', display:'block' }}>Tolerance: {bc.tolerance}</span>
                <input type="range" min={5} max={80} value={bc.tolerance} onChange={e=>setBrandColors(cs=>cs.map((c,j)=>j===i?{...c,tolerance:+e.target.value}:c))} style={{ width:'80px', accentColor:bc.hex }}/>
              </div>
              <button onClick={()=>setBrandColors(cs=>cs.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', color:'#DC2626', cursor:'pointer', fontSize:'16px' }}>×</button>
            </div>
          ))}
          <button onClick={()=>setBrandColors(cs=>[...cs,{hex:'#3B82F6',name:'Brand Color',tolerance:30}])} style={{ ...S.btn('#F1F5F9','var(--muted)'), alignSelf:'flex-start', fontSize:'11px', padding:'5px 12px' }}>+ Add Color</button>
        </div>
      </div>
      <button onClick={check} disabled={running||!brandColors.length} style={{ ...S.btn('#EC4899'), marginBottom:'12px', opacity:running?0.6:1 }}>
        {running?'⏳ Checking...':'🎨 Check Brand Colors'}
      </button>
      {results && (
        <div>
          <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
            <span style={S.tag('#00CBA8')}>✅ Compliant: {results.compliant}/{results.total}</span>
            <span style={S.tag('#EF4444')}>❌ Off-brand: {results.total-results.compliant}</span>
          </div>
          <div style={{ maxHeight:'160px', overflowY:'auto' }}>
            {results.items.slice(0,20).map((r,i)=>(
              <div key={i} style={{ display:'flex', gap:'8px', alignItems:'center', padding:'5px 0', borderBottom:'1px solid #F8FAFC', fontSize:'10px' }}>
                <img src={r.src} style={{ width:'24px', height:'24px', objectFit:'cover', borderRadius:'3px', flexShrink:0 }}/>
                <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text)' }}>{r.name}</span>
                {r.matches.map(m=><span key={m.name} style={{ ...S.tag(m.pct>=5?'#00CBA8':'#94A3B8'), fontSize:'9px' }}>{m.name}: {m.pct}%</span>)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. WHITE/SOLID BACKGROUND DETECTION (e-commerce)
// ══════════════════════════════════════════════════════════════════════════════
export function BackgroundDetector({ images }) {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [threshold, setThreshold] = useState(240); // brightness threshold for "white"

  const detect = async () => {
    setRunning(true);
    const valid = images.filter(i=>!i.error&&i.src);
    const res   = [];

    for (let i=0; i<valid.length; i++) {
      const img=valid[i];
      try {
        const el=new Image(); el.src=img.src;
        await new Promise(r=>{el.onload=r;el.onerror=r;});
        const sc=document.createElement('canvas'); sc.width=64; sc.height=64;
        sc.getContext('2d').drawImage(el,0,0,64,64);
        const d=sc.getContext('2d').getImageData(0,0,64,64).data;
        const total=d.length/4;

        // Sample edges (border pixels) — background usually there
        let edgePxs=[], allPxs=[];
        for(let j=0;j<d.length;j+=4){
          const idx=j/4, row=Math.floor(idx/64), col=idx%64;
          const px=[d[j],d[j+1],d[j+2]];
          allPxs.push(px);
          if(row<4||row>59||col<4||col>59) edgePxs.push(px);
        }

        const avgBg = edgePxs.reduce((s,p)=>[s[0]+p[0],s[1]+p[1],s[2]+p[2]],[0,0,0]).map(v=>v/edgePxs.length);
        const bgBrightness=(avgBg[0]+avgBg[1]+avgBg[2])/3;
        const isWhiteBg=bgBrightness>=threshold;
        const isBlackBg=bgBrightness<30;
        const isSolidBg=edgePxs.every(p=>Math.abs(p[0]-avgBg[0])<25&&Math.abs(p[1]-avgBg[1])<25&&Math.abs(p[2]-avgBg[2])<25);
        const bgHex='#'+avgBg.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');

        res.push({...img, bgBrightness:Math.round(bgBrightness), isWhiteBg, isBlackBg, isSolidBg, bgHex});
      } catch(e){res.push({...img, bgBrightness:0, isWhiteBg:false, isSolidBg:false});}
      if(i%10===0) await new Promise(r=>setTimeout(r,0));
    }
    setResults({ items:res, white:res.filter(r=>r.isWhiteBg).length, black:res.filter(r=>r.isBlackBg).length, solid:res.filter(r=>r.isSolidBg).length });
    setRunning(false);
  };

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'6px' }}>🛒 Background Detection (E-Commerce)</div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px', lineHeight:1.7 }}>
        Detects whether product images have white, black, or solid color backgrounds. Essential for e-commerce catalog consistency and marketplace requirements (Amazon, Flipkart require white backgrounds).
      </div>
      <div style={{ marginBottom:'12px' }}>
        <span style={S.lbl}>White threshold (brightness ≥ {threshold} = white background)</span>
        <input type="range" min={200} max={255} value={threshold} onChange={e=>setThreshold(+e.target.value)} style={{ width:'100%', accentColor:'#00CBA8' }}/>
      </div>
      <button onClick={detect} disabled={running} style={{ ...S.btn('#F59E0B','#000'), marginBottom:'12px', opacity:running?0.6:1 }}>
        {running?'⏳ Detecting...':'🛒 Detect Backgrounds'}
      </button>
      {results && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'12px' }}>
            {[['⬜ White bg', results.white, '#64748B'],['⬛ Black bg', results.black, '#1E293B'],['🔲 Solid bg', results.solid, '#3B82F6']].map(([l,v,c])=>(
              <div key={l} style={{ textAlign:'center', padding:'10px', background:'#F8FAFC', borderRadius:'7px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:'18px', fontWeight:800, color:c }}>{v}</div>
                <div style={{ fontSize:'9px', color:'var(--muted)' }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'10px' }}>
            <span style={S.tag(results.white/results.items.length>=0.8?'#00CBA8':'#F59E0B')}>{Math.round(results.white/results.items.length*100)}% white bg</span>
            {results.white/results.items.length<0.8&&<span style={{ fontSize:'11px', color:'#B45309' }}>⚠ Amazon/Flipkart require ≥85% white background coverage</span>}
          </div>
          <div style={{ maxHeight:'160px', overflowY:'auto' }}>
            {results.items.slice(0,20).map((r,i)=>(
              <div key={i} style={{ display:'flex', gap:'8px', alignItems:'center', padding:'4px 0', borderBottom:'1px solid #F8FAFC', fontSize:'10px' }}>
                <img src={r.src} style={{ width:'24px', height:'24px', objectFit:'cover', borderRadius:'3px', flexShrink:0 }}/>
                <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', color:'var(--text)' }}>{r.name}</span>
                <div style={{ width:'14px', height:'14px', borderRadius:'3px', background:r.bgHex, border:'1px solid #E2E8F0', flexShrink:0 }}/>
                <span style={S.tag(r.isWhiteBg?'#00CBA8':r.isSolidBg?'#3B82F6':'#94A3B8')}>{r.isWhiteBg?'White':r.isBlackBg?'Black':r.isSolidBg?'Solid':'Complex'}</span>
                <span style={{ color:'var(--muted)' }}>{r.bgBrightness}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 9. ADD TEXT WATERMARK TO ALL IMAGES
// ══════════════════════════════════════════════════════════════════════════════
export function WatermarkAdder({ images }) {
  const [text,      setText]      = useState('© DataSmithy 2025');
  const [position,  setPosition]  = useState('bottom-right');
  const [fontSize,  setFontSize]  = useState(24);
  const [opacity,   setOpacity]   = useState(60);
  const [color,     setColor]     = useState('#FFFFFF');
  const [running,   setRunning]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [done,      setDone]      = useState(null);
  const previewRef = useRef(null);

  // Live preview
  useEffect(() => {
    const first = images.find(i=>!i.error&&i.src);
    if (!first||!previewRef.current) return;
    const el=new Image(); el.src=first.src;
    el.onload=()=>{
      const c=previewRef.current;
      const scale=Math.min(300/el.naturalWidth,200/el.naturalHeight,1);
      c.width=el.naturalWidth*scale; c.height=el.naturalHeight*scale;
      const ctx=c.getContext('2d');
      ctx.drawImage(el,0,0,c.width,c.height);
      ctx.globalAlpha=opacity/100;
      ctx.fillStyle=color;
      ctx.font=`bold ${Math.round(fontSize*scale)}px system-ui`;
      const tw=ctx.measureText(text).width;
      const pad=10*scale;
      const positions={
        'top-left':    [pad,      fontSize*scale+pad],
        'top-right':   [c.width-tw-pad, fontSize*scale+pad],
        'center':      [(c.width-tw)/2, c.height/2],
        'bottom-left': [pad,      c.height-pad],
        'bottom-right':[c.width-tw-pad, c.height-pad],
      };
      const [wx,wy]=positions[position]||positions['bottom-right'];
      ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=3;
      ctx.fillText(text, wx, wy);
      ctx.globalAlpha=1;
    };
  }, [text, position, fontSize, opacity, color, images]);

  const apply = async () => {
    setRunning(true); setProgress(0); setDone(null);
    if (!window.JSZip) {
      await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
    }
    const zip = new window.JSZip();
    const valid = images.filter(i=>!i.error&&i.src);
    let count = 0;

    for (let i=0; i<valid.length; i++) {
      const img=valid[i];
      try {
        const el=new Image(); el.src=img.src;
        await new Promise(r=>{el.onload=r;el.onerror=r;});
        const c=document.createElement('canvas'); c.width=el.naturalWidth; c.height=el.naturalHeight;
        const ctx=c.getContext('2d');
        ctx.drawImage(el,0,0);
        ctx.globalAlpha=opacity/100;
        ctx.fillStyle=color;
        ctx.font=`bold ${fontSize}px system-ui, sans-serif`;
        const tw=ctx.measureText(text).width;
        const pad=20;
        const positions={
          'top-left':    [pad,      fontSize+pad],
          'top-right':   [c.width-tw-pad,  fontSize+pad],
          'center':      [(c.width-tw)/2, c.height/2],
          'bottom-left': [pad,      c.height-pad],
          'bottom-right':[c.width-tw-pad,  c.height-pad],
        };
        const [wx,wy]=positions[position]||positions['bottom-right'];
        ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=4;
        ctx.fillText(text,wx,wy);
        ctx.globalAlpha=1;
        zip.file(img.name, c.toDataURL('image/jpeg',0.92).split(',')[1], {base64:true});
        count++;
      } catch(e){}
      setProgress(Math.round((i+1)/valid.length*100));
      if(i%10===0) await new Promise(r=>setTimeout(r,0));
    }
    const blob=await zip.generateAsync({type:'blob'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='watermarked.zip'; a.click();
    setDone(count); setRunning(false);
  };

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>💧 Add Watermark to All Images</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
        <div>
          <div style={{ marginBottom:'10px' }}><span style={S.lbl}>Watermark Text</span><input value={text} onChange={e=>setText(e.target.value)} style={S.inp}/></div>
          <div style={{ marginBottom:'10px' }}><span style={S.lbl}>Position</span>
            <select value={position} onChange={e=>setPosition(e.target.value)} style={S.inp}>
              {['top-left','top-right','center','bottom-left','bottom-right'].map(p=><option key={p} value={p}>{p.replace('-',' ')}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'10px' }}>
            <div><span style={S.lbl}>Size: {fontSize}px</span><input type="range" min={10} max={120} value={fontSize} onChange={e=>setFontSize(+e.target.value)} style={{ width:'100%', accentColor:'#00CBA8' }}/></div>
            <div><span style={S.lbl}>Opacity: {opacity}%</span><input type="range" min={10} max={100} value={opacity} onChange={e=>setOpacity(+e.target.value)} style={{ width:'100%', accentColor:'#00CBA8' }}/></div>
            <div><span style={S.lbl}>Color</span><input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{ ...S.inp, height:'36px', padding:'2px' }}/></div>
          </div>
        </div>
        <div>
          <span style={S.lbl}>Live Preview:</span>
          <canvas ref={previewRef} style={{ maxWidth:'100%', borderRadius:'7px', border:'1px solid var(--border)', display:'block' }}/>
        </div>
      </div>
      {running && <div style={{ height:'4px', background:'#E2E8F0', borderRadius:'2px', overflow:'hidden', margin:'10px 0' }}><div style={{ width:`${progress}%`, height:'100%', background:'#00CBA8', transition:'width .3s' }}/></div>}
      <button onClick={apply} disabled={running||!text.trim()||!images.filter(i=>!i.error).length} style={{ ...S.btn(), marginTop:'10px', opacity:running?0.6:1 }}>
        {running?`⏳ Watermarking ${progress}%...`:`💧 Add to All ${images.filter(i=>!i.error).length} Images + Download ZIP`}
      </button>
      {done!==null && <div style={{ fontSize:'11px', color:'#00956B', marginTop:'8px' }}>✅ {done} images watermarked</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 10. PRODUCT IMAGE CONSISTENCY SCORE
// ══════════════════════════════════════════════════════════════════════════════
export function ConsistencyScorePanel({ images, stats }) {
  const valid = images.filter(i=>!i.error&&i.src);
  if (!valid.length) return null;

  const aspectRatios = valid.map(i=>+(i.width/i.height).toFixed(2));
  const brightnesses = valid.map(i=>i.avgBrightness||0);
  const sharpnesses  = valid.map(i=>i.sharpness||0);
  const sizes        = valid.map(i=>i.size||0);

  const stdDev = arr => { const m=arr.reduce((s,v)=>s+v,0)/arr.length; return Math.sqrt(arr.reduce((s,v)=>s+(v-m)**2,0)/arr.length); };
  const cv     = arr => { const m=arr.reduce((s,v)=>s+v,0)/arr.length; return m>0?stdDev(arr)/m:0; }; // coefficient of variation

  const arCV    = cv(aspectRatios);
  const brightCV= cv(brightnesses);
  const sharpCV = cv(sharpnesses);
  const sizeCV  = cv(sizes);

  const arScore     = Math.max(0, 100 - arCV*500);
  const brightScore = Math.max(0, 100 - brightCV*200);
  const sharpScore  = Math.max(0, 100 - sharpCV*150);
  const sizeScore   = Math.max(0, 100 - sizeCV*100);
  const overall     = Math.round((arScore+brightScore+sharpScore+sizeScore)/4);

  const scores = [
    ['📐 Aspect Ratio', arScore, 'Consistent dimensions', 'Inconsistent sizes'],
    ['☀ Brightness', brightScore, 'Consistent lighting', 'Variable lighting'],
    ['🔭 Sharpness', sharpScore, 'Consistent focus', 'Variable focus'],
    ['📁 File Size', sizeScore, 'Similar file sizes', 'Wildly different sizes'],
  ];

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'14px' }}>📊 Product Image Consistency Score</div>
      {/* Overall */}
      <div style={{ display:'flex', alignItems:'center', gap:'16px', padding:'14px 16px', background:overall>=80?'rgba(0,203,168,.06)':overall>=60?'rgba(245,158,11,.06)':'rgba(239,68,68,.06)', border:`1px solid ${overall>=80?'rgba(0,203,168,.2)':overall>=60?'rgba(245,158,11,.2)':'rgba(239,68,68,.2)'}`, borderRadius:'8px', marginBottom:'16px' }}>
        <div style={{ fontSize:'42px', fontWeight:900, color:overall>=80?'#00CBA8':overall>=60?'#F59E0B':'#EF4444' }}>{overall}</div>
        <div>
          <div style={{ fontWeight:700, fontSize:'14px', color:'var(--text)' }}>Overall Consistency / 100</div>
          <div style={{ fontSize:'11px', color:'var(--muted)', marginTop:'2px' }}>{overall>=80?'✅ Highly consistent — ready for e-commerce':overall>=60?'⚠ Moderately consistent — some variation':'❌ Low consistency — standardize before publishing'}</div>
        </div>
      </div>
      {/* Per-dimension scores */}
      <div style={{ display:'grid', gap:'10px' }}>
        {scores.map(([label,score,good,bad])=>(
          <div key={label}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
              <span style={{ fontSize:'11px', fontWeight:600, color:'var(--text)' }}>{label}</span>
              <span style={{ fontSize:'11px', fontWeight:700, color:score>=80?'#00CBA8':score>=60?'#F59E0B':'#EF4444' }}>{Math.round(score)}/100 · {score>=70?good:bad}</span>
            </div>
            <div style={{ height:'8px', background:'#F1F5F9', borderRadius:'4px', overflow:'hidden' }}>
              <div style={{ width:`${score}%`, height:'100%', background:score>=80?'#00CBA8':score>=60?'#F59E0B':'#EF4444', borderRadius:'4px', transition:'width .5s' }}/>
            </div>
          </div>
        ))}
      </div>
      {overall < 80 && (
        <div style={{ marginTop:'14px', padding:'10px 14px', background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.2)', borderRadius:'7px', fontSize:'11px', color:'#B45309', lineHeight:1.7 }}>
          💡 <strong>Recommendations:</strong>{' '}
          {arScore<70?'Resize all images to the same aspect ratio. ':''}{brightScore<70?'Use Batch Color Adjustment to normalize brightness. ':''}{sharpScore<70?'Review and remove blurry images. ':''}{sizeScore<70?'Compress large images with Batch Resize. ':''}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN TAB — combines all 10 universal features
// ══════════════════════════════════════════════════════════════════════════════
export default function ImageTabUniversal({ images, stats }) {
  const [subTab, setSubTab] = useState('resize');

  const SUBTABS = [
    { id:'resize',      label:'📐 Resize/Compress' },
    { id:'watermark',   label:'💧 Watermark' },
    { id:'exifstrip',   label:'🔒 Strip EXIF' },
    { id:'coloradj',    label:'🎨 Color Adjust' },
    { id:'convert',     label:'🔄 Format Convert' },
    { id:'contact',     label:'🗂 Contact Sheet' },
    { id:'wcag',        label:'♿ Accessibility' },
    { id:'brand',       label:'🎨 Brand Colors' },
    { id:'background',  label:'🛒 Background' },
    { id:'consistency', label:'📊 Consistency' },
  ];

  return (
    <div style={{ display:'grid', gap:'14px' }}>
      <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
        {SUBTABS.map(t=>(
          <button key={t.id} onClick={()=>setSubTab(t.id)} style={{ padding:'5px 12px', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontWeight:subTab===t.id?700:400, background:subTab===t.id?'rgba(0,203,168,.1)':'#fff', color:subTab===t.id?'#00956B':'var(--muted)', border:subTab===t.id?'1.5px solid #00CBA8':'1px solid var(--border)', transition:'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>
      {subTab==='resize'      && <BatchResizeCompress images={images}/>}
      {subTab==='watermark'   && <WatermarkAdder images={images}/>}
      {subTab==='exifstrip'   && <EXIFStripper images={images}/>}
      {subTab==='coloradj'    && <BatchColorAdjust images={images}/>}
      {subTab==='convert'     && <FormatConverter images={images}/>}
      {subTab==='contact'     && <ContactSheet images={images}/>}
      {subTab==='wcag'        && <WCAGAccessibilityCheck images={images}/>}
      {subTab==='brand'       && <BrandColorCheck images={images}/>}
      {subTab==='background'  && <BackgroundDetector images={images}/>}
      {subTab==='consistency' && <ConsistencyScorePanel images={images} stats={stats}/>}
    </div>
  );
}

/*
═══════════════════════════════════════════════════════════════
INTEGRATION GUIDE — add to ImageTab.jsx
═══════════════════════════════════════════════════════════════
IMPORT:
  import ImageTabUniversal from './ImageTabUniversal.jsx';

ADD TO TABS array inside ImageTab:
  { id:'universal', label:'🌐 Universal' }

TAB PANEL:
  {activeView === 'universal' && (
    <ImageTabUniversal images={images} stats={stats}/>
  )}

THAT'S IT. All 10 features work from images state already in ImageTab.
No additional props or wiring needed beyond images + stats.
*/