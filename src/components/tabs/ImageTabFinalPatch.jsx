// src/components/tabs/ImageTabFinalPatch.jsx
// FINAL PATCH — adds ALL remaining features to ImageTab
// Import everything from here into ImageTab.jsx
// Works for ML engineers, photographers, designers, researchers, doctors, content creators — everyone

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// 🔴 CRITICAL — LIGHTBOX WITH KEYBOARD NAVIGATION
// ══════════════════════════════════════════════════════════════════════════════
export function EnhancedLightbox({ image, images, onClose, onOpenLightbox }) {
  const [zoom, setZoom]     = useState(1);
  const [panX, setPanX]     = useState(0);
  const [panY, setPanY]     = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({x:0,y:0});
  const [compare, setCompare] = useState(null);

  const validImages = images.filter(i => i.src);
  const currentIdx  = validImages.findIndex(i => i.name === image?.name);

  const goNext = useCallback(() => {
    if (currentIdx < validImages.length - 1) {
      setZoom(1); setPanX(0); setPanY(0);
      onOpenLightbox(validImages[currentIdx + 1]);
    }
  }, [currentIdx, validImages, onOpenLightbox]);

  const goPrev = useCallback(() => {
    if (currentIdx > 0) {
      setZoom(1); setPanX(0); setPanY(0);
      onOpenLightbox(validImages[currentIdx - 1]);
    }
  }, [currentIdx, validImages, onOpenLightbox]);

  useEffect(() => {
    const handler = e => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft')  goPrev();
      if (e.key === 'Escape')     onClose();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.25, 4));
      if (e.key === '-')          setZoom(z => Math.max(z - 0.25, 0.5));
      if (e.key === '0')          { setZoom(1); setPanX(0); setPanY(0); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onClose]);

  if (!image) return null;

  const handleMouseDown = e => { setDragging(true); setDragStart({x:e.clientX-panX, y:e.clientY-panY}); };
  const handleMouseMove = e => { if(dragging&&zoom>1) { setPanX(e.clientX-dragStart.x); setPanY(e.clientY-dragStart.y); } };
  const handleMouseUp   = () => setDragging(false);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.92)', zIndex:9999, display:'flex', flexDirection:'column', backdropFilter:'blur(6px)' }}
      onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', background:'rgba(0,0,0,.5)', flexShrink:0 }}>
        <div>
          <span style={{ fontWeight:700, fontSize:'13px', color:'#fff' }}>{image.name}</span>
          <span style={{ fontSize:'11px', color:'rgba(255,255,255,.5)', marginLeft:'12px' }}>
            {currentIdx+1} / {validImages.length} · {image.width}×{image.height}px · {image.class} · {(image.size/1024).toFixed(1)}KB
          </span>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <span style={{ fontSize:'11px', color:'rgba(255,255,255,.4)' }}>← → navigate · +/- zoom · 0 reset · Esc close</span>
          <button onClick={()=>setZoom(z=>Math.max(z-.25,.5))} style={{ background:'rgba(255,255,255,.1)', border:'none', color:'#fff', borderRadius:'4px', padding:'4px 10px', cursor:'pointer' }}>−</button>
          <span style={{ color:'rgba(255,255,255,.6)', fontSize:'12px', minWidth:'40px', textAlign:'center' }}>{Math.round(zoom*100)}%</span>
          <button onClick={()=>setZoom(z=>Math.min(z+.25,4))} style={{ background:'rgba(255,255,255,.1)', border:'none', color:'#fff', borderRadius:'4px', padding:'4px 10px', cursor:'pointer' }}>+</button>
          <button onClick={()=>{setZoom(1);setPanX(0);setPanY(0);}} style={{ background:'rgba(255,255,255,.1)', border:'none', color:'#fff', borderRadius:'4px', padding:'4px 10px', cursor:'pointer' }}>1:1</button>
          <button onClick={()=>{ const cmpIdx=(currentIdx+1)%validImages.length; setCompare(validImages[cmpIdx]); }} style={{ background:'rgba(59,130,246,.3)', border:'none', color:'#fff', borderRadius:'4px', padding:'4px 10px', cursor:'pointer', fontSize:'11px' }}>Compare</button>
          <button onClick={onClose} style={{ background:'rgba(239,68,68,.3)', border:'none', color:'#fff', borderRadius:'4px', padding:'4px 12px', cursor:'pointer', fontSize:'16px' }}>×</button>
        </div>
      </div>

      {/* Image area */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative' }}>
        {/* Prev button */}
        {currentIdx > 0 && (
          <button onClick={goPrev} style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,.15)', border:'none', color:'#fff', borderRadius:'50%', width:'44px', height:'44px', fontSize:'20px', cursor:'pointer', zIndex:2, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        )}

        {/* Main image */}
        <div style={{ flex:compare?1:1, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', cursor:zoom>1?'grab':'default', borderRight:compare?'2px solid rgba(255,255,255,.2)':undefined }}
          onMouseDown={handleMouseDown}>
          <img src={image.src} alt={image.name} style={{
            maxWidth:'100%', maxHeight:'100%', objectFit:'contain', userSelect:'none',
            transform:`scale(${zoom}) translate(${panX/zoom}px,${panY/zoom}px)`,
            transition:dragging?'none':'transform .1s',
          }}/>
        </div>

        {/* Compare image */}
        {compare && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
            <div style={{ position:'absolute', top:'10px', left:'10px', background:'rgba(0,0,0,.6)', color:'#fff', fontSize:'11px', padding:'4px 8px', borderRadius:'4px' }}>{compare.name}</div>
            <img src={compare.src} alt={compare.name} style={{ maxWidth:'100%', maxHeight:'90%', objectFit:'contain' }}/>
            <button onClick={()=>setCompare(null)} style={{ position:'absolute', top:'10px', right:'10px', background:'rgba(239,68,68,.6)', border:'none', color:'#fff', borderRadius:'4px', padding:'3px 8px', cursor:'pointer' }}>✕ Close Compare</button>
          </div>
        )}

        {/* Next button */}
        {currentIdx < validImages.length - 1 && (
          <button onClick={goNext} style={{ position:'absolute', right:'16px', top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,.15)', border:'none', color:'#fff', borderRadius:'50%', width:'44px', height:'44px', fontSize:'20px', cursor:'pointer', zIndex:2, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
        )}
      </div>

      {/* Stats footer */}
      <div style={{ display:'flex', gap:'16px', padding:'10px 16px', background:'rgba(0,0,0,.5)', flexWrap:'wrap', flexShrink:0 }}>
        {[
          ['Brightness', image.avgBrightness+'/255'],
          ['Contrast',   image.contrast],
          ['Sharpness',  image.sharpness?.toFixed(2)||'—'],
          ['Noise',      image.noiseEst?.toFixed(1)||'—'],
          ['Avg R',      image.avgR],
          ['Avg G',      image.avgG],
          ['Avg B',      image.avgB],
          ['Color Mode', image.colorMode],
          ['Has Alpha',  image.hasAlpha?'✅ Yes':'❌ No'],
          ['Duplicate',  image.isDuplicate?'⚠ Yes':'✅ No'],
          ['Blurry',     image.isBlurry?'⚠ Yes':'✅ No'],
          ['EXIF Date',  image.exifDate||'—'],
          ['Camera',     image.exifCamera||'—'],
        ].map(([l,v])=>(
          <div key={l} style={{ textAlign:'center' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#fff' }}>{v}</div>
            <div style={{ fontSize:'9px', color:'rgba(255,255,255,.4)' }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 🔴 PAGINATED IMAGE GRID
// ══════════════════════════════════════════════════════════════════════════════
export function PaginatedImageGrid({ images, onOpenLightbox, onMoveClass, classes, pageSize=40 }) {
  const [page,         setPage]         = useState(1);
  const [selectedClass,setSelectedClass]= useState('all');
  const [showDupOnly,  setShowDupOnly]  = useState(false);
  const [showBlurOnly, setShowBlurOnly] = useState(false);
  const [showDarkOnly, setShowDarkOnly] = useState(false);
  const [searchText,   setSearchText]   = useState('');
  const [sortBy,       setSortBy]       = useState('class');
  const [movingImg,    setMovingImg]    = useState(null);

  const filtered = useMemo(() => {
    let list = [...images];
    if (showDupOnly)   list = list.filter(i => i.isDuplicate);
    if (showBlurOnly)  list = list.filter(i => i.isBlurry);
    if (showDarkOnly)  list = list.filter(i => i.isDark);
    if (selectedClass !== 'all') list = list.filter(i => i.class === selectedClass);
    if (searchText)    list = list.filter(i => i.name.toLowerCase().includes(searchText.toLowerCase()) || i.class.toLowerCase().includes(searchText.toLowerCase()));
    if (sortBy === 'brightness') list.sort((a,b) => a.avgBrightness - b.avgBrightness);
    else if (sortBy === 'sharpness') list.sort((a,b) => (a.sharpness||0) - (b.sharpness||0));
    else if (sortBy === 'size')  list.sort((a,b) => b.width*b.height - a.width*a.height);
    else if (sortBy === 'name')  list.sort((a,b) => a.name.localeCompare(b.name));
    else list.sort((a,b) => a.class.localeCompare(b.class));
    return list;
  }, [images, showDupOnly, showBlurOnly, showDarkOnly, selectedClass, searchText, sortBy]);

  const totalPages = Math.ceil(filtered.filter(i=>i.src).length / pageSize);
  const visible    = filtered.filter(i=>i.src).slice((page-1)*pageSize, page*pageSize);

  // Reset page on filter change
  useEffect(() => setPage(1), [showDupOnly, showBlurOnly, showDarkOnly, selectedClass, searchText, sortBy]);

  const classColors = ['#00CBA8','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316'];

  return (
    <div>
      {/* Filters row */}
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'10px', alignItems:'center' }}>
        <input type="text" value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="Search name or class..." style={{ padding:'5px 10px', fontSize:'11px', borderRadius:'6px', border:'1px solid var(--border)', minWidth:'160px' }}/>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:'5px 10px', fontSize:'11px', borderRadius:'6px', border:'1px solid var(--border)' }}>
          <option value="class">Sort: Class</option>
          <option value="name">Sort: Name</option>
          <option value="brightness">Sort: Brightness ↑</option>
          <option value="sharpness">Sort: Sharpness ↑</option>
          <option value="size">Sort: Size ↓</option>
        </select>
      </div>

      {/* Class filter pills */}
      <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', marginBottom:'10px', alignItems:'center' }}>
        <button onClick={()=>setSelectedClass('all')} style={{ padding:'4px 10px', borderRadius:'5px', fontSize:'11px', cursor:'pointer', background:selectedClass==='all'?'rgba(0,203,168,.12)':'#fff', color:selectedClass==='all'?'#00CBA8':'var(--muted)', border:selectedClass==='all'?'1.5px solid #00CBA8':'1px solid var(--border)' }}>
          All ({images.length})
        </button>
        {classes.map((cls,i) => (
          <button key={cls.name} onClick={()=>setSelectedClass(cls.name)} style={{ padding:'4px 10px', borderRadius:'5px', fontSize:'11px', cursor:'pointer', background:selectedClass===cls.name?`${classColors[i%classColors.length]}20`:'#fff', color:selectedClass===cls.name?classColors[i%classColors.length]:'var(--muted)', border:selectedClass===cls.name?`1.5px solid ${classColors[i%classColors.length]}`:'1px solid var(--border)' }}>
            {cls.name} ({cls.count})
          </button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', gap:'6px' }}>
          {[['Dups', showDupOnly, setShowDupOnly,'#EF4444'], ['Blurry', showBlurOnly, setShowBlurOnly,'#F59E0B'], ['Dark', showDarkOnly, setShowDarkOnly,'#6366F1']].map(([label, val, setter, color]) => (
            <label key={label} style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', color:val?color:'var(--muted)', cursor:'pointer', fontWeight:val?700:400 }}>
              <input type="checkbox" checked={val} onChange={e=>setter(e.target.checked)} style={{ accentColor:color }}/>
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'10px' }}>
        Showing {(page-1)*pageSize+1}–{Math.min(page*pageSize, filtered.filter(i=>i.src).length)} of {filtered.filter(i=>i.src).length.toLocaleString()} images
        {filtered.length !== images.length && <span style={{ color:'#00CBA8', marginLeft:'8px' }}>({images.length - filtered.length} hidden by filters)</span>}
      </div>

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:'8px' }}>
        {visible.map((img, i) => (
          <div key={i} style={{ border:'1px solid var(--border)', borderRadius:'8px', overflow:'hidden', background:'#F8FAFC', cursor:'pointer', position:'relative', transition:'border-color .15s' }}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#00CBA8'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
            onClick={() => onOpenLightbox(img)}>
            <div style={{ aspectRatio:'1', overflow:'hidden', background:'#E2E8F0', position:'relative' }}>
              <img src={img.src} alt={img.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .2s' }}
                onMouseEnter={e=>e.target.style.transform='scale(1.05)'}
                onMouseLeave={e=>e.target.style.transform='scale(1)'}/>
              {/* Badges */}
              <div style={{ position:'absolute', top:'4px', right:'4px', display:'flex', flexDirection:'column', gap:'2px', alignItems:'flex-end' }}>
                {img.isDuplicate  && <span style={{ background:'#EF4444', color:'#fff', borderRadius:'3px', padding:'1px 4px', fontSize:'8px', fontWeight:700 }}>DUP</span>}
                {img.isBlurry     && <span style={{ background:'#F59E0B', color:'#fff', borderRadius:'3px', padding:'1px 4px', fontSize:'8px', fontWeight:700 }}>BLUR</span>}
                {img.isDark       && <span style={{ background:'#374151', color:'#fff', borderRadius:'3px', padding:'1px 4px', fontSize:'8px', fontWeight:700 }}>DARK</span>}
                {img.hasAlpha     && <span style={{ background:'#8B5CF6', color:'#fff', borderRadius:'3px', padding:'1px 4px', fontSize:'8px', fontWeight:700 }}>α</span>}
              </div>
              {img.error && <div style={{ position:'absolute', inset:0, background:'rgba(239,68,68,.8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'10px', fontWeight:700 }}>ERROR</div>}
            </div>
            <div style={{ padding:'6px 8px' }}>
              <div style={{ fontSize:'9px', color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{img.name}</div>
              <div style={{ fontSize:'10px', color:'var(--text)', fontWeight:600, marginTop:'1px' }}>{img.width}×{img.height}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'1px' }}>
                <span style={{ fontSize:'9px', color:'#00CBA8' }}>{img.class}</span>
                <button onClick={e=>{e.stopPropagation(); setMovingImg(img);}} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:'11px', padding:'0', lineHeight:1 }} title="Move to class">⇄</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Move to class modal */}
      {movingImg && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:'12px', padding:'24px', maxWidth:'340px', width:'100%', boxShadow:'0 10px 40px rgba(0,0,0,.2)' }}>
            <div style={{ fontWeight:700, color:'var(--text)', fontSize:'14px', marginBottom:'6px' }}>Move Image to Class</div>
            <div style={{ fontSize:'12px', color:'var(--muted)', marginBottom:'14px' }}>{movingImg.name} (currently: <strong>{movingImg.class}</strong>)</div>
            <div style={{ display:'grid', gap:'6px', marginBottom:'14px' }}>
              {classes.filter(c=>c.name!==movingImg.class).map(cls=>(
                <button key={cls.name} onClick={()=>{ onMoveClass(movingImg.name, cls.name); setMovingImg(null); }} style={{ background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'6px', padding:'9px 14px', fontSize:'12px', cursor:'pointer', textAlign:'left', fontWeight:600, color:'var(--text)', transition:'all .15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#00CBA8';e.currentTarget.style.color='#00CBA8';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text)';}}>
                  → {cls.name} ({cls.count} images)
                </button>
              ))}
            </div>
            <button onClick={()=>setMovingImg(null)} style={{ width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'6px', padding:'8px', fontSize:'12px', cursor:'pointer', color:'var(--muted)' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', gap:'6px', justifyContent:'center', alignItems:'center', marginTop:'16px', flexWrap:'wrap' }}>
          <button onClick={()=>setPage(1)} disabled={page===1} style={{ padding:'5px 10px', borderRadius:'5px', fontSize:'11px', cursor:page===1?'default':'pointer', background:'#fff', border:'1px solid var(--border)', color:page===1?'#CBD5E1':'var(--muted)' }}>«</button>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{ padding:'5px 10px', borderRadius:'5px', fontSize:'11px', cursor:page===1?'default':'pointer', background:'#fff', border:'1px solid var(--border)', color:page===1?'#CBD5E1':'var(--muted)' }}>‹</button>
          {Array.from({length:Math.min(7,totalPages)}).map((_,i)=>{
            let p = page <= 4 ? i+1 : page >= totalPages-3 ? totalPages-6+i : page-3+i;
            if(p<1||p>totalPages) return null;
            return(
              <button key={p} onClick={()=>setPage(p)} style={{ padding:'5px 12px', borderRadius:'5px', fontSize:'11px', cursor:'pointer', background:page===p?'#00CBA8':'#fff', color:page===p?'#fff':'var(--muted)', border:page===p?'none':'1px solid var(--border)', fontWeight:page===p?700:400 }}>{p}</button>
            );
          })}
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ padding:'5px 10px', borderRadius:'5px', fontSize:'11px', cursor:page===totalPages?'default':'pointer', background:'#fff', border:'1px solid var(--border)', color:page===totalPages?'#CBD5E1':'var(--muted)' }}>›</button>
          <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={{ padding:'5px 10px', borderRadius:'5px', fontSize:'11px', cursor:page===totalPages?'default':'pointer', background:'#fff', border:'1px solid var(--border)', color:page===totalPages?'#CBD5E1':'var(--muted)' }}>»</button>
          <span style={{ fontSize:'11px', color:'var(--muted)' }}>Page {page} of {totalPages}</span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 🔴 QUICK ACTION BUTTONS
// ══════════════════════════════════════════════════════════════════════════════
export function QuickActionBar({ stats, images, onRemoveBlurry, onRemoveDark, onRemoveDuplicates, onRemoveErrors }) {
  if (!stats) return null;
  const actions = [
    { label:`Remove ${stats.duplicates} Duplicates`, count:stats.duplicates,    color:'#EF4444', bg:'rgba(239,68,68,.08)', border:'rgba(239,68,68,.25)',    fn:onRemoveDuplicates, icon:'🔄' },
    { label:`Remove ${stats.blurryImages} Blurry`,   count:stats.blurryImages,  color:'#F59E0B', bg:'rgba(245,158,11,.08)', border:'rgba(245,158,11,.25)',   fn:onRemoveBlurry,     icon:'🌫' },
    { label:`Remove ${stats.darkImages} Dark`,        count:stats.darkImages,    color:'#6366F1', bg:'rgba(99,102,241,.08)', border:'rgba(99,102,241,.25)',    fn:onRemoveDark,       icon:'🌑' },
    { label:`Remove ${stats.errors} Errors`,          count:stats.errors,        color:'#DC2626', bg:'rgba(220,38,38,.08)', border:'rgba(220,38,38,.25)',     fn:onRemoveErrors,     icon:'❌' },
  ].filter(a => a.count > 0);

  if (!actions.length) {
    return (
      <div style={{ padding:'12px 16px', background:'rgba(0,203,168,.06)', border:'1px solid rgba(0,203,168,.2)', borderRadius:'8px', fontSize:'12px', color:'#00956B' }}>
        ✅ No issues found — dataset is clean and ready
      </div>
    );
  }

  return (
    <div style={{ padding:'14px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontSize:'11px', color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px' }}>⚡ Quick Actions</div>
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
        {actions.map(a => (
          <button key={a.label} onClick={() => window.confirm(`${a.label} from dataset? This cannot be undone.`) && a.fn()} style={{
            background:a.bg, color:a.color, border:`1px solid ${a.border}`,
            borderRadius:'6px', padding:'8px 16px', fontSize:'12px', cursor:'pointer', fontWeight:700,
            display:'flex', alignItems:'center', gap:'6px'
          }}>
            {a.icon} {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 🔴 EXPORT TRAIN/VAL/TEST AS 3 SEPARATE ZIPs
// ══════════════════════════════════════════════════════════════════════════════
export function ExportSplitZips({ images, stats, splitRatio, resizeW, resizeH }) {
  const [exporting,  setExporting]  = useState(false);
  const [progress,   setProgress]   = useState('');
  const [fmt,        setFmt]        = useState('jpeg');
  const [quality,    setQuality]    = useState(90);

  const exportSplitZips = async () => {
    if (!images.length) return;
    setExporting(true);

    try {
      // Load JSZip
      if (!window.JSZip) {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        document.head.appendChild(s);
        await new Promise(r => { s.onload = r; });
      }

      const [tr, va, te] = splitRatio;
      const zips = { train: new window.JSZip(), val: new window.JSZip(), test: new window.JSZip() };
      const splitNames = ['train','val','test'];
      const splitPcts  = [tr/100, va/100, te/100];

      // Group by class, shuffle, split
      const byClass = {};
      images.filter(i => i.src && !i.error && !i.isDuplicate).forEach(img => {
        if (!byClass[img.class]) byClass[img.class] = [];
        byClass[img.class].push(img);
      });

      let totalDone = 0;
      const totalImgs = images.filter(i=>i.src&&!i.error&&!i.isDuplicate).length;

      for (const [cls, imgs] of Object.entries(byClass)) {
        const shuffled = [...imgs].sort(() => Math.random() - 0.5);
        const n  = shuffled.length;
        const nTr = Math.floor(n * tr/100);
        const nVa = Math.floor(n * va/100);
        const splits = { train:shuffled.slice(0,nTr), val:shuffled.slice(nTr,nTr+nVa), test:shuffled.slice(nTr+nVa) };

        for (const [splitName, splitImgs] of Object.entries(splits)) {
          for (const img of splitImgs) {
            setProgress(`Packing ${++totalDone}/${totalImgs} → ${splitName}/${cls}/${img.name}`);
            const i2 = new Image();
            const loaded = await new Promise(res => {
              i2.onload  = () => res(true);
              i2.onerror = () => res(false); // skip broken images
              i2.src = img.src;
            });
            if (!loaded || !i2.naturalWidth) continue; // skip if failed to load
            const c = document.createElement('canvas');
            c.width = resizeW; c.height = resizeH;
            c.getContext('2d').drawImage(i2, 0, 0, resizeW, resizeH);
            const mime = fmt==='png'?'image/png':fmt==='webp'?'image/webp':'image/jpeg';
            const b64 = c.toDataURL(mime, quality/100).split(',')[1];
            const ext = fmt==='png'?'png':fmt==='webp'?'webp':'jpg';
            const fname = img.name.replace(/\.[^.]+$/, '') + '.' + ext;
            zips[splitName].folder(cls).file(fname, b64, {base64:true});
          }
        }
      }

      // Download all 3 zips
      for (const splitName of splitNames) {
        setProgress(`Compressing ${splitName}.zip...`);
        const blob = await zips[splitName].generateAsync({type:'blob', compression:'DEFLATE', compressionOptions:{level:6}});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `datasmithy_${splitName}_${resizeW}x${resizeH}.zip`;
        a.click();
        await new Promise(r => setTimeout(r, 500));
      }

      setProgress('✅ All 3 ZIPs downloaded!');
      setTimeout(() => setProgress(''), 3000);
    } catch(e) {
      setProgress('❌ Export failed: ' + e.message);
    }
    setExporting(false);
  };

  const [tr,va,te] = splitRatio;
  const valid = images.filter(i=>i.src&&!i.error&&!i.isDuplicate).length;

  return (
    <div style={{ padding:'16px', background:'rgba(0,203,168,.06)', border:'1px solid rgba(0,203,168,.2)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>
        📦 Export as 3 Separate Train/Val/Test ZIPs
      </div>
      <div style={{ display:'flex', gap:'16px', marginBottom:'12px', flexWrap:'wrap', fontSize:'12px', color:'var(--muted)' }}>
        <span>🟢 train.zip: {Math.floor(valid*tr/100).toLocaleString()} images</span>
        <span>🔵 val.zip: {Math.floor(valid*va/100).toLocaleString()} images</span>
        <span>🟡 test.zip: {Math.floor(valid*te/100).toLocaleString()} images</span>
      </div>
      <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap', marginBottom:'12px' }}>
        {[['jpeg','JPEG'],['png','PNG'],['webp','WebP']].map(([v,l])=>(
          <button key={v} onClick={()=>setFmt(v)} style={{ padding:'4px 12px', borderRadius:'5px', fontSize:'11px', cursor:'pointer', background:fmt===v?'rgba(0,203,168,.15)':'#fff', color:fmt===v?'#00CBA8':'var(--muted)', border:fmt===v?'1.5px solid #00CBA8':'1px solid var(--border)' }}>{l}</button>
        ))}
        {fmt!=='png'&&(
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <span style={{ fontSize:'11px', color:'var(--muted)' }}>Quality:</span>
            <input type="range" min={60} max={100} value={quality} onChange={e=>setQuality(Number(e.target.value))} style={{ width:'100px', accentColor:'#00CBA8' }}/>
            <span style={{ fontSize:'11px', color:'#00CBA8', fontWeight:700 }}>{quality}%</span>
          </div>
        )}
      </div>
      {progress && (
        <div style={{ fontSize:'11px', color:progress.startsWith('✅')?'#00956B':progress.startsWith('❌')?'#DC2626':'#1D4ED8', marginBottom:'10px', padding:'6px 10px', background:'rgba(59,130,246,.06)', borderRadius:'5px' }}>
          {progress}
        </div>
      )}
      <button onClick={exportSplitZips} disabled={exporting} className="btn-primary" style={{ fontSize:'12px', padding:'9px 22px' }}>
        {exporting ? '⏳ Exporting...' : `📦 Export ${valid.toLocaleString()} images as 3 ZIPs`}
      </button>
      <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'6px' }}>Randomly shuffled · stratified by class · {resizeW}×{resizeH}px</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 🟡 EXIF METADATA READER (browser-native, no library)
// ══════════════════════════════════════════════════════════════════════════════
// Call this in analyzePixels or loadImage for JPEG files
export const readEXIF = async (file) => {
  if (!file.type.includes('jpeg') && !file.name.toLowerCase().endsWith('.jpg') && !file.name.toLowerCase().endsWith('.jpeg')) {
    return {};
  }
  try {
    const buf = await file.arrayBuffer();
    const view = new DataView(buf);
    if (view.getUint16(0) !== 0xFFD8) return {};

    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset);
      const length = view.getUint16(offset + 2);
      if (marker === 0xFFE1) { // APP1 = EXIF
        const exifStr = String.fromCharCode(...new Uint8Array(buf, offset+4, 6));
        if (!exifStr.startsWith('Exif')) break;
        const tiffStart = offset + 10;
        const littleEndian = view.getUint16(tiffStart) === 0x4949;
        const getU16 = (o) => view.getUint16(tiffStart+o, littleEndian);
        const getU32 = (o) => view.getUint32(tiffStart+o, littleEndian);
        const getString = (o, len) => {
          let str = '';
          for (let i=0; i<len-1; i++) {
            const c = view.getUint8(tiffStart+o+i);
            if (c === 0) break;
            str += String.fromCharCode(c);
          }
          return str.trim();
        };

        const ifdOffset = getU32(4);
        const numEntries = getU16(ifdOffset);
        const result = {};

        for (let i=0; i<numEntries; i++) {
          const entryOffset = ifdOffset + 2 + i*12;
          const tag   = getU16(entryOffset);
          const type  = getU16(entryOffset+2);
          const count = getU32(entryOffset+4);
          const valOffset = entryOffset + 8;
          // For ASCII (type=2): if value fits in 4 bytes use inline, else use pointer
          const isASCII = type === 2;
          const strOff  = (isASCII && count <= 4) ? entryOffset+8 : getU32(valOffset);
          if (tag === 0x010F && isASCII) result.exifMake    = getString(strOff, count);
          if (tag === 0x0110 && isASCII) result.exifModel   = getString(strOff, count);
          if (tag === 0x0132 && isASCII) result.exifDate    = getString(strOff, count);
          if (tag === 0x9003 && isASCII) result.exifOrigDate= getString(strOff, count);
          // Rational fields (type=5): numerator/denominator pairs
          if (type === 5 || type === 10) {
            const rOff = getU32(valOffset);
            const num  = getU32(rOff);
            const den  = getU32(rOff+4) || 1;
            if (tag === 0x920A) result.exifFocal   = `${(num/den).toFixed(1)}mm`;
            if (tag === 0x829A) result.exifExposure= den > num ? `1/${Math.round(den/num)}s` : `${(num/den).toFixed(2)}s`;
            if (tag === 0x829D) result.exifFNum    = `f/${(num/den).toFixed(1)}`;
          }
          // Short (type=3) for ISO
          if (tag === 0x8827 && type === 3) result.exifISO = `ISO ${getU16(valOffset)}`;
        }
        result.exifCamera = [result.exifMake, result.exifModel].filter(Boolean).join(' ') || null;
        return result;
      }
      if ((marker & 0xFF00) !== 0xFF00) break;
      offset += 2 + length;
    }
  } catch(e) {}
  return {};
};

export function EXIFDisplay({ images }) {
  const withExif = images.filter(i => i.exifCamera || i.exifDate || i.exifOrigDate);
  if (!withExif.length) {
    return <div style={{ fontSize:'12px', color:'var(--muted)' }}>No EXIF metadata found. EXIF is only available in JPEG files taken with cameras/phones.</div>;
  }
  const cameras = [...new Set(withExif.map(i=>i.exifCamera).filter(Boolean))];
  const dates   = withExif.filter(i=>i.exifOrigDate||i.exifDate).map(i=>i.exifOrigDate||i.exifDate).sort();
  return (
    <div style={{ display:'grid', gap:'12px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
        <div style={{ padding:'12px', background:'#F8FAFC', borderRadius:'8px', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:'10px', color:'var(--muted)', fontWeight:600, marginBottom:'6px', textTransform:'uppercase' }}>Cameras Used</div>
          {cameras.length ? cameras.map(c=><div key={c} style={{ fontSize:'12px', color:'var(--text)', padding:'2px 0' }}>📷 {c}</div>) : <div style={{ fontSize:'12px', color:'var(--muted)' }}>—</div>}
        </div>
        <div style={{ padding:'12px', background:'#F8FAFC', borderRadius:'8px', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:'10px', color:'var(--muted)', fontWeight:600, marginBottom:'6px', textTransform:'uppercase' }}>Date Range</div>
          {dates.length >= 2 ? (
            <><div style={{ fontSize:'12px', color:'var(--text)' }}>📅 From: {dates[0]}</div><div style={{ fontSize:'12px', color:'var(--text)' }}>📅 To: {dates[dates.length-1]}</div></>
          ) : dates.length === 1 ? <div style={{ fontSize:'12px', color:'var(--text)' }}>📅 {dates[0]}</div> : <div style={{ fontSize:'12px', color:'var(--muted)' }}>—</div>}
        </div>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ fontSize:'10px', borderCollapse:'collapse', width:'100%' }}>
          <thead><tr style={{ background:'#F1F5F9' }}>
            {['Filename','Camera','Date','Exposure','Aperture','ISO','Focal'].map(h=><th key={h} style={{ padding:'6px 8px', textAlign:'left', color:'var(--muted)', fontWeight:600, borderBottom:'1px solid var(--border)' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {withExif.slice(0,20).map((img,i)=>(
              <tr key={i} style={{ borderBottom:'1px solid #F1F5F9' }}>
                <td style={{ padding:'6px 8px', fontFamily:'monospace', color:'var(--text)', maxWidth:'120px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{img.name}</td>
                <td style={{ padding:'6px 8px', color:'var(--muted)' }}>{img.exifCamera||'—'}</td>
                <td style={{ padding:'6px 8px', color:'var(--muted)', whiteSpace:'nowrap' }}>{img.exifOrigDate||img.exifDate||'—'}</td>
                <td style={{ padding:'6px 8px', color:'var(--muted)' }}>{img.exifExposure||'—'}</td>
                <td style={{ padding:'6px 8px', color:'var(--muted)' }}>{img.exifFNum||'—'}</td>
                <td style={{ padding:'6px 8px', color:'var(--muted)' }}>{img.exifISO||'—'}</td>
                <td style={{ padding:'6px 8px', color:'var(--muted)' }}>{img.exifFocal||'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {withExif.length > 20 && <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'4px' }}>Showing 20 of {withExif.length} images with EXIF</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 🟡 DETAILED PER-CHANNEL COLOR HISTOGRAM
// ══════════════════════════════════════════════════════════════════════════════
export function DetailedColorHistogram({ images }) {
  const BINS = 32;
  const rBins = new Array(BINS).fill(0);
  const gBins = new Array(BINS).fill(0);
  const bBins = new Array(BINS).fill(0);

  images.filter(i=>!i.error).forEach(img => {
    if (img.avgR !== undefined) {
      const ri = Math.min(Math.floor(img.avgR / (256/BINS)), BINS-1);
      const gi = Math.min(Math.floor(img.avgG / (256/BINS)), BINS-1);
      const bi = Math.min(Math.floor(img.avgB / (256/BINS)), BINS-1);
      rBins[ri]++; gBins[gi]++; bBins[bi]++;
    }
  });

  const maxVal = Math.max(...rBins, ...gBins, ...bBins) || 1;
  const W=560, H=110, PAD=24, barW=(W-PAD*2)/BINS;

  return (
    <div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'5px' }}>Per-Channel Color Histogram (R/G/B distribution across all images)</div>
      <svg viewBox={`0 0 ${W} ${H+18}`} style={{ width:'100%', maxWidth:'600px', height:'auto' }}>
        {rBins.map((v,i)=><rect key={`r${i}`} x={PAD+i*barW+1} y={H-(v/maxVal)*(H-PAD)} width={barW-2} height={(v/maxVal)*(H-PAD)} fill="rgba(239,68,68,.5)" rx={1}/>)}
        {gBins.map((v,i)=><rect key={`g${i}`} x={PAD+i*barW+1} y={H-(v/maxVal)*(H-PAD)} width={barW-2} height={(v/maxVal)*(H-PAD)} fill="rgba(34,197,94,.5)" rx={1}/>)}
        {bBins.map((v,i)=><rect key={`b${i}`} x={PAD+i*barW+1} y={H-(v/maxVal)*(H-PAD)} width={barW-2} height={(v/maxVal)*(H-PAD)} fill="rgba(59,130,246,.5)" rx={1}/>)}
        <line x1={PAD} y1={H} x2={W-PAD} y2={H} stroke="#E2E8F0" strokeWidth={1}/>
        <text x={PAD} y={H+13} fontSize="9" fill="#94A3B8">0</text>
        <text x={W/2} y={H+13} fontSize="9" fill="#94A3B8" textAnchor="middle">128</text>
        <text x={W-PAD} y={H+13} fontSize="9" fill="#94A3B8" textAnchor="end">255</text>
      </svg>
      <div style={{ display:'flex', gap:'12px', marginTop:'4px' }}>
        {[['#EF4444','Red'],['#22C55E','Green'],['#3B82F6','Blue']].map(([c,l])=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'10px', color:'var(--muted)' }}>
            <div style={{ width:'12px', height:'8px', background:c, opacity:.7, borderRadius:'2px' }}/>{l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 🟡 ALPHA/TRANSPARENCY DETECTION
// Add this to analyzePixels function in ImageTab.jsx
// ══════════════════════════════════════════════════════════════════════════════
export const detectAlpha = (canvas) => {
  try {
    const ctx = canvas.getContext('2d');
    const d   = ctx.getImageData(0, 0, Math.min(canvas.width,256), Math.min(canvas.height,256)).data;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] < 255) return true;
    }
    return false;
  } catch(e) { return false; }
};

export function AlphaAnalysis({ images }) {
  const withAlpha    = images.filter(i => i.hasAlpha);
  const withoutAlpha = images.filter(i => !i.hasAlpha && !i.error);
  return (
    <div style={{ padding:'14px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>
        🔲 Transparency / Alpha Channel Detection
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
        <div style={{ textAlign:'center', padding:'10px', background:'rgba(139,92,246,.08)', border:'1px solid rgba(139,92,246,.2)', borderRadius:'8px' }}>
          <div style={{ fontSize:'22px', fontWeight:800, color:'#7C3AED' }}>{withAlpha.length}</div>
          <div style={{ fontSize:'10px', color:'var(--muted)' }}>Images with transparency</div>
        </div>
        <div style={{ textAlign:'center', padding:'10px', background:'rgba(0,203,168,.08)', border:'1px solid rgba(0,203,168,.2)', borderRadius:'8px' }}>
          <div style={{ fontSize:'22px', fontWeight:800, color:'#00CBA8' }}>{withoutAlpha.length}</div>
          <div style={{ fontSize:'10px', color:'var(--muted)' }}>Opaque images</div>
        </div>
      </div>
      {withAlpha.length > 0 && (
        <>
          <div style={{ fontSize:'11px', color:'#7C3AED', marginBottom:'8px', fontWeight:600 }}>
            ⚠ {withAlpha.length} transparent images — ML models need RGB not RGBA. Convert before training.
          </div>
          <div style={{ background:'#1E1E2E', borderRadius:'6px', padding:'10px', fontSize:'10px', color:'#CDD6F4', fontFamily:'monospace', marginBottom:'8px' }}>
            <div style={{ color:'#6C7086' }}># Convert alpha to white background</div>
            <div style={{ color:'#CBA6F7' }}>from PIL import Image</div>
            <div>img = Image.open("image.png").convert("RGBA")</div>
            <div>bg = Image.new("RGB", img.size, (255,255,255))</div>
            <div>bg.paste(img, mask=img.split()[3])  <span style={{ color:'#6C7086' }}># alpha mask</span></div>
            <div>bg.save("image_rgb.jpg")</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(60px,1fr))', gap:'6px' }}>
            {withAlpha.filter(i=>i.src).slice(0,8).map((img,i)=>(
              <div key={i} style={{ border:'2px solid #8B5CF6', borderRadius:'4px', overflow:'hidden', background:'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0/8px 8px' }}>
                <img src={img.src} alt="" style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }}/>
                <div style={{ padding:'2px 4px', fontSize:'8px', color:'#7C3AED', fontWeight:700, background:'rgba(139,92,246,.1)' }}>α {img.name.split('.').pop().toUpperCase()}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 🟢 WEBCAM CAPTURE
// ══════════════════════════════════════════════════════════════════════════════
export function WebcamCapture({ onImagesReady }) {
  const videoRef  = useRef(null);
  const [stream,  setStream]  = useState(null);
  const [photos,  setPhotos]  = useState([]);
  const [cls,     setCls]     = useState('captured');
  const [error,   setError]   = useState('');

  // Cleanup stream on unmount to prevent memory/resource leak
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const startCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video:{ width:640, height:480 } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setError('');
    } catch(e) { setError('Camera access denied: ' + e.message); }
  };

  const stopCam = () => {
    stream?.getTracks().forEach(t=>t.stop());
    setStream(null);
  };

  const capture = () => {
    if (!videoRef.current) return;
    const c = document.createElement('canvas');
    c.width  = videoRef.current.videoWidth  || 640;
    c.height = videoRef.current.videoHeight || 480;
    c.getContext('2d').drawImage(videoRef.current, 0, 0);
    const src = c.toDataURL('image/jpeg', 0.9);
    setPhotos(prev => [...prev, { src, class:cls, name:`capture_${Date.now()}.jpg` }]);
  };

  const sendToAnalysis = () => {
    if (!photos.length) return;
    // Convert to File objects
    const files = photos.map(p => {
      const arr = atob(p.src.split(',')[1]);
      const u8  = new Uint8Array(arr.length);
      for (let i=0; i<arr.length; i++) u8[i] = arr.charCodeAt(i);
      const f = new File([u8], p.name, { type:'image/jpeg' });
      f._zipPath = `${p.class}/${p.name}`;
      return f;
    });
    onImagesReady(files);
    stopCam();
  };

  return (
    <div style={{ padding:'16px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>📷 Webcam Capture</div>
      {error && <div style={{ color:'#DC2626', fontSize:'12px', marginBottom:'8px' }}>❌ {error}</div>}
      {!stream ? (
        <button onClick={startCam} className="btn-primary" style={{ fontSize:'12px' }}>📷 Start Camera</button>
      ) : (
        <div>
          <video ref={videoRef} autoPlay muted style={{ width:'100%', maxWidth:'320px', borderRadius:'8px', display:'block', marginBottom:'10px' }}/>
          <div style={{ display:'flex', gap:'8px', marginBottom:'12px', alignItems:'center', flexWrap:'wrap' }}>
            <input value={cls} onChange={e=>setCls(e.target.value)} placeholder="Class name..." style={{ padding:'5px 10px', borderRadius:'5px', border:'1px solid var(--border)', fontSize:'12px', width:'140px' }}/>
            <button onClick={capture} style={{ background:'#00CBA8', color:'#fff', border:'none', borderRadius:'6px', padding:'7px 16px', fontSize:'12px', fontWeight:700, cursor:'pointer' }}>📸 Capture</button>
            <button onClick={stopCam} style={{ background:'rgba(239,68,68,.1)', color:'#DC2626', border:'1px solid rgba(239,68,68,.3)', borderRadius:'6px', padding:'7px 14px', fontSize:'12px', cursor:'pointer' }}>Stop</button>
          </div>
          {photos.length > 0 && (
            <>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'10px' }}>
                {photos.map((p,i)=><img key={i} src={p.src} alt="" style={{ width:'60px', height:'60px', objectFit:'cover', borderRadius:'4px', border:'1px solid var(--border)' }}/>)}
              </div>
              <button onClick={sendToAnalysis} className="btn-primary" style={{ fontSize:'12px' }}>
                ✅ Analyse {photos.length} captured images
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 🟢 COCO + YOLO EXPORT (for object detection datasets)
// ══════════════════════════════════════════════════════════════════════════════
export function AnnotationExport({ images, stats }) {
  const exportCOCO = () => {
    const classMap = {};
    stats.classes.forEach((c,i) => { classMap[c.name] = i; });
    const coco = {
      info: { description:'DataSmithy Export', year:new Date().getFullYear() },
      categories: stats.classes.map((c,i) => ({ id:i, name:c.name, supercategory:'object' })),
      images: images.filter(i=>!i.error).map((img,i) => ({
        id:i, file_name:img.name, width:img.width, height:img.height,
        class:img.class, class_id:classMap[img.class]||0,
      })),
      annotations: images.filter(i=>!i.error).map((img,i) => ({
        id:i, image_id:i, category_id:classMap[img.class]||0,
        bbox:[0,0,img.width,img.height],
        area:img.width*img.height, iscrowd:0,
      })),
    };
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(coco,null,2)],{type:'application/json'}));
    a.download='datasmithy_coco_annotations.json'; a.click();
  };

  const exportYOLO = () => {
    // YOLO format: class_id cx cy w h (normalized)
    const classMap = {};
    stats.classes.forEach((c,i) => { classMap[c.name] = i; });
    const lines = ['# DataSmithy YOLO format labels', '# class_id cx cy width height (all normalized 0-1)', ''];
    const classesLines = stats.classes.map(c=>c.name).join('\n');
    // For classification datasets, bbox = full image
    const labels = images.filter(i=>!i.error).map(img =>
      `${classMap[img.class]||0} 0.5 0.5 1.0 1.0`
    );
    const a1=document.createElement('a');
    a1.href=URL.createObjectURL(new Blob([classesLines],{type:'text/plain'}));
    a1.download='classes.txt'; a1.click();
    setTimeout(()=>{
      const a2=document.createElement('a');
      a2.href=URL.createObjectURL(new Blob([[...lines,...labels].join('\n')],{type:'text/plain'}));
      a2.download='datasmithy_yolo_labels.txt'; a2.click();
    },400);
  };

  const exportTFRecord = () => {
    // TFRecord is binary — we export the Python code to create it
    const code = `# ── Generate TFRecord from your image folder ─────────────────────────
import tensorflow as tf
import os
from PIL import Image
import io

CLASSES = ${JSON.stringify(stats.classes.map(c=>c.name))}
DATASET_DIR = "./processed"  # after split

def create_tf_example(image_path, label_id, label_name):
    with open(image_path, 'rb') as f:
        img_data = f.read()
    img = Image.open(io.BytesIO(img_data))
    w, h = img.size
    return tf.train.Example(features=tf.train.Features(feature={
        'image/encoded': tf.train.Feature(bytes_list=tf.train.BytesList(value=[img_data])),
        'image/format':  tf.train.Feature(bytes_list=tf.train.BytesList(value=[b'jpeg'])),
        'image/width':   tf.train.Feature(int64_list=tf.train.Int64List(value=[w])),
        'image/height':  tf.train.Feature(int64_list=tf.train.Int64List(value=[h])),
        'image/label':   tf.train.Feature(int64_list=tf.train.Int64List(value=[label_id])),
        'image/class/text': tf.train.Feature(bytes_list=tf.train.BytesList(value=[label_name.encode()])),
    }))

for split in ['train','val','test']:
    writer = tf.io.TFRecordWriter(f'{split}.tfrecord')
    for label_id, cls in enumerate(CLASSES):
        cls_dir = os.path.join(DATASET_DIR, split, cls)
        if not os.path.exists(cls_dir): continue
        for fname in os.listdir(cls_dir):
            if not fname.lower().endswith(('.jpg','.jpeg','.png')): continue
            fpath = os.path.join(cls_dir, fname)
            example = create_tf_example(fpath, label_id, cls)
            writer.write(example.SerializeToString())
    writer.close()
    print(f"Created {split}.tfrecord")
`;
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([code],{type:'text/plain'}));
    a.download='create_tfrecord.py'; a.click();
  };

  return (
    <div style={{ padding:'14px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'6px' }}>📐 Annotation & Format Export</div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px', lineHeight:1.6 }}>
        For object detection, segmentation, or specialized ML frameworks:
      </div>
      <div style={{ display:'grid', gap:'8px' }}>
        <div style={{ display:'flex', gap:'10px', alignItems:'center', padding:'10px 14px', background:'#fff', borderRadius:'6px', border:'1px solid var(--border)', flexWrap:'wrap' }}>
          <span style={{ fontSize:'16px' }}>🟦</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:'12px', color:'var(--text)' }}>COCO Format (JSON)</div>
            <div style={{ fontSize:'10px', color:'var(--muted)' }}>Detectron2, MMDetection, YOLO v5/v8 — full image bbox annotations</div>
          </div>
          <button onClick={exportCOCO} style={{ background:'rgba(59,130,246,.1)', color:'#1D4ED8', border:'1px solid rgba(59,130,246,.3)', borderRadius:'5px', padding:'5px 12px', fontSize:'11px', cursor:'pointer', fontWeight:600 }}>↓ COCO JSON</button>
        </div>
        <div style={{ display:'flex', gap:'10px', alignItems:'center', padding:'10px 14px', background:'#fff', borderRadius:'6px', border:'1px solid var(--border)', flexWrap:'wrap' }}>
          <span style={{ fontSize:'16px' }}>🟥</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:'12px', color:'var(--text)' }}>YOLO Format (TXT)</div>
            <div style={{ fontSize:'10px', color:'var(--muted)' }}>Ultralytics YOLO — classes.txt + normalized label file</div>
          </div>
          <button onClick={exportYOLO} style={{ background:'rgba(239,68,68,.1)', color:'#DC2626', border:'1px solid rgba(239,68,68,.3)', borderRadius:'5px', padding:'5px 12px', fontSize:'11px', cursor:'pointer', fontWeight:600 }}>↓ YOLO TXT</button>
        </div>
        <div style={{ display:'flex', gap:'10px', alignItems:'center', padding:'10px 14px', background:'#fff', borderRadius:'6px', border:'1px solid var(--border)', flexWrap:'wrap' }}>
          <span style={{ fontSize:'16px' }}>🟧</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:'12px', color:'var(--text)' }}>TFRecord Format (.py)</div>
            <div style={{ fontSize:'10px', color:'var(--muted)' }}>TensorFlow Object Detection API — Python script to generate .tfrecord</div>
          </div>
          <button onClick={exportTFRecord} style={{ background:'rgba(245,158,11,.1)', color:'#B45309', border:'1px solid rgba(245,158,11,.3)', borderRadius:'5px', padding:'5px 12px', fontSize:'11px', cursor:'pointer', fontWeight:600 }}>↓ TFRecord .py</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 🟡 TIMM + WANDB + FASTAI PYTHON CODE
// ══════════════════════════════════════════════════════════════════════════════
export const genAdvancedPython = (stats, split) => {
  const cls = stats.classes.map(c=>c.name);
  const [tr,va,te] = split;
  return `# ══════════════════════════════════════════════════════════════════
# DataSmithy — Advanced ML Code (Timm + WandB + FastAI)
# Classes : ${cls.join(', ')}
# Images  : ${stats.totalImages}
# ══════════════════════════════════════════════════════════════════

# ── Timm (PyTorch Image Models) — 400+ architectures ──────────────
# pip install timm
import timm, torch
import torch.nn as nn

# Browse all models: timm.list_models(pretrained=True)
# Recommended for your ${stats.totalImages} image dataset:
${stats.totalImages < stats.classes.length*500
  ? "model = timm.create_model('mobilenetv3_small_100', pretrained=True, num_classes=" + cls.length + ")"
  : stats.totalImages < stats.classes.length*5000
  ? "model = timm.create_model('efficientnet_b0', pretrained=True, num_classes=" + cls.length + ")"
  : "model = timm.create_model('efficientnet_b3', pretrained=True, num_classes=" + cls.length + ")"}
# Other great options:
# timm.create_model('convnext_tiny', pretrained=True, num_classes=${cls.length})   # ConvNeXt
# timm.create_model('vit_small_patch16_224', pretrained=True, num_classes=${cls.length})  # ViT
# timm.create_model('swin_tiny_patch4_window7_224', pretrained=True, num_classes=${cls.length}) # Swin

# Get model-specific transforms
data_config = timm.data.resolve_model_data_config(model)
transform   = timm.data.create_transform(**data_config, is_training=True)

optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=0.05)
scheduler = torch.optim.lr_scheduler.OneCycleLR(optimizer, max_lr=3e-4, epochs=20, steps_per_epoch=100)


# ── WandB Experiment Tracking ─────────────────────────────────────
# pip install wandb
import wandb

wandb.init(
    project="datasmithy-${stats.classes.map(c=>c.name).join('-').slice(0,30)}",
    config={
        "architecture": "efficientnet_b0",
        "dataset":      "${stats.totalImages} images, ${cls.length} classes",
        "epochs":       20,
        "batch_size":   32,
        "lr":           3e-4,
        "img_size":     [${stats.avgWidth}, ${stats.avgHeight}],
        "split":        "${tr}/${va}/${te}",
        "health_score": ${stats.health},
    }
)

# In training loop:
# wandb.log({"train_loss": loss, "train_acc": acc, "val_loss": val_loss, "val_acc": val_acc})
# wandb.log({"lr": scheduler.get_last_lr()[0]})

# Log example predictions:
# wandb.log({"predictions": wandb.Image(img, caption=f"Pred: {pred_class}")})

# At end:
# wandb.finish()


# ── FastAI (high-level, rapid prototyping) ────────────────────────
# pip install fastai
from fastai.vision.all import *

path = Path("./processed")

# Create DataBlock
dblock = DataBlock(
    blocks    = (ImageBlock, CategoryBlock),
    get_items = get_image_files,
    splitter  = GrandparentSplitter(train_name='train', valid_name='val'),
    get_y     = parent_label,
    item_tfms = Resize(${stats.avgWidth}),
    batch_tfms= aug_transforms(
        mult=2.0, size=${stats.avgWidth},
        min_scale=0.75, flip_vert=False,
        max_lighting=0.4, max_warp=0.2
    )
)
dls = dblock.dataloaders(path, bs=32)
dls.show_batch(max_n=9, figsize=(8,8))

# One-cycle training with learning rate finder
learn = vision_learner(dls, resnet34, metrics=[accuracy, error_rate])
learn.lr_find()

# Train frozen base
learn.fine_tune(20, base_lr=3e-3)

# Export for deployment
learn.export('model_fastai.pkl')

# Inference
learn_inf = load_learner('model_fastai.pkl')
pred, pred_idx, probs = learn_inf.predict(PILImage.create('test_image.jpg'))
print(f"Prediction: {pred} ({probs[pred_idx]:.2%} confidence)")


# ── MLflow Alternative to WandB ───────────────────────────────────
# pip install mlflow
import mlflow
import mlflow.pytorch

mlflow.set_experiment("datasmithy-experiment")
with mlflow.start_run():
    mlflow.log_params({"model":"efficientnet_b0", "epochs":20, "lr":3e-4})
    # In loop: mlflow.log_metrics({"train_loss":loss, "val_acc":val_acc}, step=epoch)
    mlflow.pytorch.log_model(model, "model")


# ── Grad-CAM Visualization (post-training) ────────────────────────
# pip install grad-cam
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
import cv2, numpy as np

target_layers = [model.layer4[-1]]  # last conv layer
cam = GradCAM(model=model, target_layers=target_layers)

img = cv2.imread("test.jpg")
img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB) / 255.0
input_tensor = transform(Image.fromarray((img_rgb*255).astype(np.uint8))).unsqueeze(0)

grayscale_cam = cam(input_tensor=input_tensor, targets=[ClassifierOutputTarget(0)])
visualization = show_cam_on_image(img_rgb, grayscale_cam[0])
cv2.imwrite("gradcam.jpg", cv2.cvtColor((visualization*255).astype(np.uint8), cv2.COLOR_RGB2BGR))
print("Grad-CAM saved: gradcam.jpg")
`;
};

// ══════════════════════════════════════════════════════════════════════════════
// 🟢 AUTO-RENAME IMAGES SEQUENTIALLY
// ══════════════════════════════════════════════════════════════════════════════
export function AutoRenamer({ images, onRename }) {
  const [prefix,  setPrefix]  = useState('img');
  const [padded,  setPadded]  = useState(true);
  const [preview, setPreview] = useState(false);

  const classCounts = {};
  const renamed = images.map(img => {
    if (!classCounts[img.class]) classCounts[img.class] = 1;
    const n = classCounts[img.class]++;
    const num = padded ? String(n).padStart(4,'0') : n;
    const ext = img.name.split('.').pop().toLowerCase();
    return { ...img, newName:`${img.class}_${prefix}_${num}.${ext}` };
  });

  return (
    <div style={{ padding:'14px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>🔤 Auto-Rename Images</div>
      <div style={{ display:'flex', gap:'10px', alignItems:'center', marginBottom:'12px', flexWrap:'wrap' }}>
        <div>
          <label style={{ fontSize:'10px', color:'var(--muted)', display:'block', marginBottom:'3px' }}>Prefix</label>
          <input value={prefix} onChange={e=>setPrefix(e.target.value)} style={{ padding:'5px 10px', borderRadius:'5px', border:'1px solid var(--border)', fontSize:'12px', width:'100px' }}/>
        </div>
        <label style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', color:'var(--muted)', cursor:'pointer', marginTop:'14px' }}>
          <input type="checkbox" checked={padded} onChange={e=>setPadded(e.target.checked)} style={{ accentColor:'#00CBA8' }}/>
          Zero-padded (0001)
        </label>
        <button onClick={()=>setPreview(!preview)} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'5px', padding:'5px 12px', fontSize:'11px', cursor:'pointer', color:'var(--muted)', marginTop:'14px' }}>
          {preview?'Hide':'Preview'}
        </button>
        <button onClick={()=>{ if(window.confirm(`Rename all ${images.length} images?`)) onRename(renamed); }} style={{ background:'#00CBA8', color:'#fff', border:'none', borderRadius:'5px', padding:'6px 14px', fontSize:'12px', fontWeight:700, cursor:'pointer', marginTop:'14px' }}>
          ✅ Apply Rename
        </button>
      </div>
      {preview && (
        <div style={{ maxHeight:'180px', overflowY:'auto', background:'#1E1E2E', borderRadius:'6px', padding:'10px', fontFamily:'monospace', fontSize:'10px' }}>
          {renamed.slice(0,20).map((img,i)=>(
            <div key={i} style={{ color:img.name===img.newName?'#6C7086':'#A6E3A1', padding:'1px 0' }}>
              {img.name} <span style={{ color:'#555' }}>→</span> {img.newName}
            </div>
          ))}
          {renamed.length > 20 && <div style={{ color:'#6C7086', marginTop:'4px' }}>...and {renamed.length-20} more</div>}
        </div>
      )}
      <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'6px' }}>
        Pattern: <code style={{ background:'#F1F5F9', padding:'1px 5px', borderRadius:'3px' }}>{'{class}'}_{prefix}_{padded?'0001':'1'}.jpg</code>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 🟡 SHAREABLE REPORT LINK (uses Firebase like tabular version)
// ══════════════════════════════════════════════════════════════════════════════
export function ShareableImageReport({ stats, user, splitRatio }) {
  const [shareUrl,   setShareUrl]   = useState('');
  const [generating, setGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const generate = async () => {
    if (!user) { alert('Sign in to generate shareable links'); return; }
    setGenerating(true);
    try {
      const { saveReport } = await import('../../firebase/db.jsx');
      const id = await saveReport({
        type:         'image_dataset',
        fileName:     `Image Dataset (${stats.classes.map(c=>c.name).join(', ')})`,
        totalImages:  stats.totalImages,
        classes:      stats.classes,
        health:       stats.health,
        avgWidth:     stats.avgWidth,
        avgHeight:    stats.avgHeight,
        duplicates:   stats.duplicates,
        blurryImages: stats.blurryImages||0,
        imbalance:    stats.imbalance,
        colorModes:   stats.colorModes,
        split:        { train:splitRatio[0], val:splitRatio[1], test:splitRatio[2] },
        uid:          user.uid,
      });
      if (id) setShareUrl(`${window.location.origin}/report/${id}`);
      else alert('Failed to generate link');
    } catch(e) { alert('Error: ' + e.message); }
    setGenerating(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(shareUrl).then(()=>{
      setLinkCopied(true); setTimeout(()=>setLinkCopied(false), 2000);
    });
  };

  return (
    <div style={{ padding:'14px', background:'rgba(139,92,246,.06)', border:'1px solid rgba(139,92,246,.2)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'#7C3AED', fontSize:'13px', marginBottom:'6px' }}>🔗 Shareable Report Link</div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'10px' }}>Generate a public link to share your dataset analysis with your team.</div>
      {!shareUrl ? (
        <button onClick={generate} disabled={generating||!user} style={{ background:'rgba(139,92,246,.15)', color:'#7C3AED', border:'1.5px solid rgba(139,92,246,.4)', borderRadius:'6px', padding:'7px 16px', fontSize:'12px', fontWeight:600, cursor:(!user||generating)?'not-allowed':'pointer', opacity:!user?0.5:1 }}>
          {generating ? '⏳ Generating...' : '🔗 Generate Shareable Link'}
        </button>
      ) : (
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', padding:'8px 12px', background:'rgba(139,92,246,.06)', border:'1px solid rgba(139,92,246,.2)', borderRadius:'6px' }}>
          <span style={{ fontSize:'11px', color:'#7C3AED', fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{shareUrl}</span>
          <button onClick={copy} style={{ background:'#7C3AED', color:'#fff', border:'none', borderRadius:'5px', padding:'4px 12px', fontSize:'11px', cursor:'pointer', fontWeight:600 }}>
            {linkCopied?'✅ Copied':'📋 Copy'}
          </button>
        </div>
      )}
      {!user && <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'4px' }}>Sign in to generate shareable links</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NON-ML USE CASES GUIDE
// ══════════════════════════════════════════════════════════════════════════════
export function UseCasesGuide() {
  const cases = [
    {
      icon:'📸', title:'Photographers & Creators',
      uses:['Check for duplicate shots from a session','Find dark/blurry/overexposed images instantly','Analyze color palette and mood of a photo set','Resize entire batch for social media','Sort by brightness for consistent editing workflow']
    },
    {
      icon:'🎨', title:'Designers & Artists',
      uses:['Check image consistency before exporting assets','Detect transparency (alpha) in PNGs','Verify all assets are same size/format','Extract dominant colors per category','Batch convert to WebP for web optimization']
    },
    {
      icon:'🏥', title:'Medical & Research',
      uses:['Check scan quality (sharpness, contrast) before analysis','Detect duplicate scans','Verify consistent image dimensions across dataset','EXIF metadata for date/device tracking','Generate dataset card for research paper']
    },
    {
      icon:'🛒', title:'E-commerce & Business',
      uses:['Check product image quality before upload','Detect duplicate product photos','Verify white/transparent backgrounds','Batch resize for marketplace requirements','Consistency check across product categories']
    },
    {
      icon:'🎓', title:'Students & Educators',
      uses:['Learn about image quality metrics (sharpness, brightness)','Understand class balance in visual datasets','Explore EDA concepts with real data','Generate Python code to learn preprocessing','Dataset card for academic submissions']
    },
    {
      icon:'🔬', title:'Scientists & Data Teams',
      uses:['Dataset health report for peer review','Before/after quality comparison','Stratified sampling for experiments','Export in standard formats (COCO, YOLO)','WandB/MLflow integration for experiment tracking']
    },
  ];

  return (
    <div className="card" style={{ padding:'20px' }}>
      <div style={{ color:'#00CBA8', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'16px', paddingBottom:'6px', borderBottom:'1px solid var(--border)' }}>
        🌍 Who This Helps — Not Just ML Engineers
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'12px' }}>
        {cases.map(c => (
          <div key={c.title} style={{ padding:'14px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
            <div style={{ fontSize:'22px', marginBottom:'6px' }}>{c.icon}</div>
            <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'8px' }}>{c.title}</div>
            <ul style={{ margin:0, paddingLeft:'14px' }}>
              {c.uses.map((u,i)=>(
                <li key={i} style={{ fontSize:'11px', color:'var(--muted)', lineHeight:1.7 }}>{u}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATION GUIDE — READ THIS
// ══════════════════════════════════════════════════════════════════════════════
/*
STEP 1 — Add import at top of ImageTab.jsx:
import {
  EnhancedLightbox, PaginatedImageGrid, QuickActionBar,
  ExportSplitZips, EXIFDisplay, readEXIF, DetailedColorHistogram,
  AlphaAnalysis, detectAlpha, WebcamCapture, AnnotationExport,
  genAdvancedPython, AutoRenamer, ShareableImageReport, UseCasesGuide
} from './ImageTabFinalPatch.jsx';

STEP 2 — In analyzePixels / loadImage, add EXIF + alpha:
  // After loading image:
  const exifData = await readEXIF(file);
  const hasAlpha = detectAlpha(canvas);
  results.push({ ...otherFields, ...exifData, hasAlpha });

STEP 3 — Replace Lightbox with EnhancedLightbox:
  {lightbox && <EnhancedLightbox image={lightbox} images={images} onClose={()=>setLightbox(null)} onOpenLightbox={setLightbox}/>}

STEP 4 — Replace static grid with PaginatedImageGrid in the 'grid' tab:
  <PaginatedImageGrid
    images={filteredImages}
    classes={stats.classes}
    onOpenLightbox={setLightbox}
    onMoveClass={(imgName, newClass) => {
      const newImages = images.map(i => i.name===imgName ? {...i, class:newClass} : i);
      computeStats(newImages);
    }}
  />

STEP 5 — Add QuickActionBar to Overview tab (after health warnings):
  <QuickActionBar
    stats={stats}
    images={images}
    onRemoveBlurry={()=>computeStats(images.filter(i=>!i.isBlurry))}
    onRemoveDark={()=>computeStats(images.filter(i=>!i.isDark))}
    onRemoveDuplicates={()=>{ setBeforeStats({...stats}); computeStats(images.filter(i=>!i.isDuplicate)); }}
    onRemoveErrors={()=>computeStats(images.filter(i=>!i.error))}
  />

STEP 6 — Add to Export tab:
  <ExportSplitZips images={images} stats={stats} splitRatio={splitRatio} resizeW={resizeW} resizeH={resizeH}/>
  <AnnotationExport images={images} stats={stats}/>
  <ShareableImageReport stats={stats} user={user} splitRatio={splitRatio}/>

STEP 7 — Add new sub-tabs:
  { id:'exif',    label:'📷 EXIF'       },
  { id:'alpha',   label:'🔲 Alpha'      },
  { id:'webcam',  label:'📸 Webcam'     },
  { id:'rename',  label:'🔤 Rename'     },
  { id:'adv_code',label:'🚀 Adv. Code' },
  { id:'uses',    label:'🌍 Use Cases'  },

STEP 8 — Add tab panels:
  {activeView==='exif'     && <div className="card" style={{padding:'20px'}}><ST>EXIF Metadata</ST><EXIFDisplay images={images}/></div>}
  {activeView==='alpha'    && <div className="card" style={{padding:'20px'}}><ST>Alpha/Transparency</ST><AlphaAnalysis images={images}/></div>}
  {activeView==='webcam'   && <div className="card" style={{padding:'20px'}}><ST>Webcam Capture</ST><WebcamCapture onImagesReady={processImages}/></div>}
  {activeView==='rename'   && <div className="card" style={{padding:'20px'}}><ST>Auto-Rename</ST><AutoRenamer images={images} onRename={renamed=>{ setImages(renamed); computeStats(renamed); }}/></div>}
  {activeView==='adv_code' && <div className="card" style={{padding:'20px'}}><ST>Advanced Code (Timm + WandB + FastAI)</ST>
    <div style={{display:'flex',gap:'6px',marginBottom:'8px'}}>
      <button onClick={()=>navigator.clipboard.writeText(genAdvancedPython(stats,splitRatio))} className="btn-primary" style={{fontSize:'11px',padding:'5px 14px'}}>📋 Copy</button>
      <button onClick={()=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([genAdvancedPython(stats,splitRatio)],{type:'text/plain'})); a.download='advanced_pipeline.py'; a.click(); }} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'5px',padding:'5px 14px',fontSize:'11px',cursor:'pointer',color:'var(--muted)'}}>↓ .py</button>
    </div>
    <div style={{background:'#1E1E2E',borderRadius:'8px',padding:'14px',maxHeight:'420px',overflowY:'auto',fontFamily:'JetBrains Mono,monospace',fontSize:'11px',color:'#CDD6F4',lineHeight:1.7,whiteSpace:'pre-wrap'}}>
      {genAdvancedPython(stats,splitRatio).split('\n').map((line,i)=>{let c='#CDD6F4';if(line.startsWith('#'))c='#6C7086';else if(line.startsWith('import')||line.startsWith('from'))c='#CBA6F7';else if(line.includes('print('))c='#A6E3A1';return<div key={i} style={{color:c}}>{line||'\u00A0'}</div>;})}
    </div>
  </div>}
  {activeView==='uses'     && <UseCasesGuide/>}

STEP 9 — Add to Charts tab:
  <DetailedColorHistogram images={images}/>

STEP 10 — Show UseCasesGuide on empty state (before upload):
  Replace empty state with <UseCasesGuide/> or show it below the upload card

Done! Every feature from red, yellow, and green lists is now fully implemented.
*/