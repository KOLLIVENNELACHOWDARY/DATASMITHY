// src/components/tabs/ImageTab.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ShareButton from '../Sharebutton.jsx';

/* ─── Design tokens ───────────────────────────────────────── */
const C = { teal:'#00CBA8', tealDim:'rgba(0,203,168,.1)', tealBorder:'rgba(0,203,168,.35)',
            blue:'#3B82F6', amber:'#F59E0B', red:'#EF4444', purple:'#8B5CF6',
            text:'var(--text,#0F172A)', muted:'var(--muted,#64748B)', border:'var(--border,#E2E8F0)',
            bg:'var(--bg,#fff)', surface:'#F8FAFC' };
const COLORS = ['#00CBA8','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#EC4899','#14B8A6','#F97316'];

/* ─── Tiny UI atoms ───────────────────────────────────────── */
const Card = ({children,style={}}) => (
  <div className="card" style={{padding:'18px 20px',...style}}>{children}</div>
);
const SectionTitle = ({children}) => (
  <div style={{color:C.teal,fontSize:'10px',fontWeight:700,letterSpacing:'1.5px',
    textTransform:'uppercase',marginBottom:'12px',paddingBottom:'6px',
    borderBottom:`1px solid ${C.border}`}}>{children}</div>
);
const PrimaryBtn = ({onClick,children,disabled,color=C.teal,style={}}) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding:'8px 18px',borderRadius:'8px',border:'none',cursor:disabled?'not-allowed':'pointer',
    background:color,color:'#fff',fontWeight:700,fontSize:'12px',
    opacity:disabled?.55:1,transition:'all .15s',...style}}>{children}</button>
);
const GhostBtn = ({onClick,children,color=C.muted}) => (
  <button onClick={onClick} style={{padding:'6px 12px',borderRadius:'7px',border:`1px solid ${C.border}`,
    background:C.surface,cursor:'pointer',fontSize:'11px',color,fontWeight:600}}>{children}</button>
);

/* Quick numeric badge control — user-friendly count picker */
const CountPicker = ({label,value,onChange,min=1,max=20}) => (
  <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
    <span style={{fontSize:'11px',color:C.muted,fontWeight:600}}>{label}</span>
    <div style={{display:'flex',alignItems:'center',gap:'3px'}}>
      {[1,3,6,10,20].filter(n=>n>=min&&n<=max).map(n=>(
        <button key={n} onClick={()=>onChange(n)} style={{
          width:'30px',height:'28px',borderRadius:'5px',border:'none',cursor:'pointer',
          fontSize:'11px',fontWeight:value===n?800:500,
          background:value===n?C.teal:C.surface,color:value===n?'#fff':C.muted,
          outline:value===n?`1.5px solid ${C.teal}`:`1px solid ${C.border}`,transition:'all .12s'
        }}>{n}</button>
      ))}
    </div>
    <span style={{fontSize:'11px',color:C.teal,fontWeight:700}}>{value}</span>
  </div>
);

/* Compact slider with visual value */
const Slider = ({label,value,min,max,step=1,onChange,unit='',presets=[]}) => (
  <div style={{marginBottom:'14px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'5px'}}>
      <span style={{fontSize:'11px',fontWeight:600,color:C.text}}>{label}</span>
      <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
        {presets.map(p=>(
          <button key={p.v} onClick={()=>onChange(p.v)} title={p.label} style={{
            fontSize:'9px',padding:'2px 6px',borderRadius:'4px',border:'none',cursor:'pointer',
            background:value===p.v?C.teal:C.surface,color:value===p.v?'#fff':C.muted,
            outline:value===p.v?`1px solid ${C.teal}`:`1px solid ${C.border}`}}>{p.label}</button>
        ))}
        <span style={{fontSize:'12px',fontWeight:700,color:C.teal,minWidth:'42px',textAlign:'right'}}>{value}{unit}</span>
      </div>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e=>onChange(Number(e.target.value))}
      style={{width:'100%',accentColor:C.teal,height:'4px'}} />
  </div>
);

/* Step progress bar — like tabular tab */
const StepBar = ({steps, current}) => (
  <div style={{display:'flex',alignItems:'center',gap:0,padding:'10px 16px',
    background:C.surface,borderBottom:`1px solid ${C.border}`,overflowX:'auto'}}>
    {steps.map((s,i)=>{
      const done  = i < current;
      const active= i === current;
      return (
        <React.Fragment key={s.id}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',flexShrink:0,minWidth:'64px'}}>
            <div style={{fontSize:'16px'}}>{done?'✅':active?s.icon:s.icon}</div>
            <span style={{fontSize:'9px',fontWeight:active?700:500,
              color:done?C.teal:active?C.text:C.muted,textAlign:'center',lineHeight:1.2}}>{s.label}</span>
          </div>
          {i<steps.length-1&&<div style={{flex:1,height:'2px',background:done?C.teal:C.border,minWidth:'16px',margin:'0 2px',marginBottom:'12px'}}/>}
        </React.Fragment>
      );
    })}
  </div>
);

/* ─── Canvas helpers ────────────────────────────────────────── */
function loadImg(src) {
  return new Promise(res => {
    const el = new window.Image();
    el.onload  = () => res(el);
    el.onerror = () => res(null);
    if (src && !src.startsWith('blob:') && !src.startsWith('data:')) el.crossOrigin = 'anonymous';
    el.src = src;
  });
}

function applyFilter(el, filter, W, H, quality=0.92) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  if (filter && filter !== 'none') ctx.filter = filter;
  ctx.drawImage(el, 0, 0, W, H);
  ctx.filter = 'none';
  return { cv, ctx };
}

function applyWatermark(el, W, H, text, position, opacity, size) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.drawImage(el, 0, 0, W, H);
  ctx.globalAlpha = opacity / 100;
  ctx.fillStyle = '#ffffff';
  ctx.font      = `bold ${size}px Arial, sans-serif`;
  ctx.textAlign = position.includes('right') ? 'right' : position.includes('center') ? 'center' : 'left';
  const pad = size * 0.6;
  const x   = position.includes('right')  ? W - pad : position.includes('center') ? W / 2 : pad;
  const y   = position.includes('bottom') ? H - pad : position.includes('middle')  ? H / 2 : pad + size;
  // Shadow
  ctx.shadowColor   = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur    = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
  return cv;
}

/* ─── Analysis ───────────────────────────────────────────────── */
async function analyseImage(img) {
  const el = await loadImg(img.src);
  if (!el) return { ...img, error: true };
  try {
    const SZ = 32;
    const cv = document.createElement('canvas'); cv.width = SZ; cv.height = SZ;
    const ctx = cv.getContext('2d'); ctx.drawImage(el, 0, 0, SZ, SZ);
    const px = ctx.getImageData(0, 0, SZ, SZ).data;
    let r=0,g=0,b=0,n=0;
    for (let i=0;i<px.length;i+=4){r+=px[i];g+=px[i+1];b+=px[i+2];n++;}
    const brightness = Math.round((r+g+b)/(3*n));
    let variance=0;
    for (let i=0;i<px.length;i+=4){const l=(px[i]+px[i+1]+px[i+2])/3;variance+=(l-brightness)**2;}
    const sharpness = Math.round(Math.sqrt(variance/n)*10)/10;
    let hash='';
    for (let i=0;i<px.length;i+=Math.floor(px.length/16)||1) hash+=px[i].toString(16);
    const features=[brightness/255,sharpness/100,r/n/255,g/n/255,b/n/255,
                    el.naturalWidth/1000,el.naturalHeight/1000,(r-b)/n/255];
    return { ...img, w:el.naturalWidth, h:el.naturalHeight, brightness, sharpness,
      isDark:brightness<60, isBright:brightness>210, isBlurry:sharpness<8,
      hash, features, cls: img.cls||img.label||img.name?.split('/')[0]?.replace(/[_-]/g,' ')||'unknown' };
  } catch { return { ...img, error:true }; }
}

function calcStats(imgs) {
  if (!imgs.length) return null;
  const clsMap={};let dark=0,blurry=0,dupes=0,err=0;const ws=[],hs=[];
  imgs.forEach(img=>{
    if(img.error){err++;return;}
    const cls=img.cls||'unknown';clsMap[cls]=(clsMap[cls]||0)+1;
    if(img.isDark)dark++;if(img.isBlurry)blurry++;if(img.isDuplicate)dupes++;
    if(img.w)ws.push(img.w);if(img.h)hs.push(img.h);
  });
  const classes=Object.entries(clsMap).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);
  const mx=Math.max(...classes.map(c=>c.count),1),mn=Math.min(...classes.map(c=>c.count),1);
  const imbalance=classes.length>1?Math.round((1-mn/mx)*100):0;
  const avg=arr=>arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):0;
  let health=100;
  health-=Math.min(20,dupes*3);health-=imbalance>30?15:0;
  health-=Math.min(15,blurry*3);health-=Math.min(10,dark*2);health-=Math.min(20,err*5);
  return {total:imgs.length,classes,imbalance,darkCount:dark,blurryCount:blurry,
    dupeCount:dupes,errCount:err,avgW:avg(ws),avgH:avg(hs),health:Math.max(0,Math.min(100,Math.round(health)))};
}

/* ─── Image edit lightbox ─────────────────────────────────────── */
function ImageEditLightbox({img,classes,onClose,onDelete,onRename,onMove,onApplyEdit}) {
  const [tab,setTab]   = useState('view');
  const [br,setBr]     = useState(100);
  const [co,setCo]     = useState(100);
  const [sa,setSa]     = useState(100);
  const [hu,setHu]     = useState(0);
  const [edited,setEdited] = useState(null);
  const [name,setName] = useState(img.name||'');
  const [saving,setSaving] = useState(false);

  const applyEdit = async () => {
    setSaving(true);
    const el = await loadImg(img.src);
    if (el) {
      const {cv} = applyFilter(el,`brightness(${br}%) contrast(${co}%) saturate(${sa}%) hue-rotate(${hu}deg)`,el.naturalWidth,el.naturalHeight);
      setEdited(cv.toDataURL('image/jpeg',.92));
    }
    setSaving(false);
  };

  const saveEdit = () => { if(edited) onApplyEdit(edited); onClose(); };

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.92)',zIndex:9999,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'10px',padding:'12px'}}>
      <div onClick={e=>e.stopPropagation()} style={{maxWidth:'92vw',maxHeight:'78vh',position:'relative'}}>
        <img src={edited||img.src} alt={img.name}
          style={{maxWidth:'100%',maxHeight:'72vh',borderRadius:'10px',objectFit:'contain',display:'block',
            filter:tab==='edit'&&!edited?`brightness(${br}%) contrast(${co}%) saturate(${sa}%) hue-rotate(${hu}deg)`:'none'}} />
        {img.w&&<div style={{position:'absolute',top:'8px',left:'8px',background:'rgba(0,0,0,.6)',color:'#fff',
          borderRadius:'5px',padding:'2px 8px',fontSize:'10px'}}>{img.w}×{img.h}</div>}
        {edited&&<div style={{position:'absolute',top:'8px',right:'8px',background:'rgba(0,203,168,.85)',color:'#fff',
          borderRadius:'5px',padding:'2px 8px',fontSize:'10px',fontWeight:700}}>EDITED</div>}
      </div>

      <div onClick={e=>e.stopPropagation()} style={{display:'flex',gap:'6px',flexWrap:'wrap',justifyContent:'center',
        background:'rgba(255,255,255,.05)',padding:'10px 14px',borderRadius:'12px',maxWidth:'92vw'}}>
        {/* Tabs */}
        {['view','edit','info','rename'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:'5px 12px',borderRadius:'6px',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:tab===t?700:500,
            background:tab===t?C.teal:'rgba(255,255,255,.12)',color:'#fff'}}>
            {t==='view'?'👁 View':t==='edit'?'✏ Edit':t==='info'?'ℹ Info':'📝 Rename'}
          </button>
        ))}
        <button onClick={onDelete} style={{padding:'5px 12px',borderRadius:'6px',border:'none',cursor:'pointer',
          fontSize:'11px',fontWeight:600,background:'rgba(239,68,68,.8)',color:'#fff'}}>🗑 Delete</button>
        {classes.length>1&&<select onChange={e=>e.target.value&&onMove(e.target.value)} defaultValue=""
          style={{padding:'5px 8px',borderRadius:'6px',fontSize:'11px',border:'none',cursor:'pointer',background:'rgba(255,255,255,.15)',color:'#fff'}}>
          <option value="">↕ Move to…</option>
          {classes.map(c=><option key={c.name} value={c.name} style={{color:'#000'}}>{c.name}</option>)}
        </select>}
        <button onClick={()=>{const a=document.createElement('a');a.href=edited||img.src;a.download=img.name||'image.jpg';a.click();}}
          style={{padding:'5px 12px',borderRadius:'6px',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:600,background:'rgba(59,130,246,.8)',color:'#fff'}}>⬇ Save</button>
        <button onClick={onClose} style={{padding:'5px 12px',borderRadius:'6px',border:'none',cursor:'pointer',
          fontSize:'11px',background:'rgba(255,255,255,.12)',color:'#fff'}}>✕ Close</button>
      </div>

      {/* Edit panel */}
      {tab==='edit'&&(
        <div onClick={e=>e.stopPropagation()} style={{background:'rgba(15,23,42,.95)',borderRadius:'12px',
          padding:'14px',maxWidth:'420px',width:'92vw'}}>
          <div style={{display:'grid',gap:'10px'}}>
            {[['Brightness',br,setBr,50,200,'%',[{v:100,label:'100'},{v:130,label:'130'},{v:80,label:'80'}]],
              ['Contrast',  co,setCo,50,200,'%',[{v:100,label:'100'},{v:130,label:'130'}]],
              ['Saturation',sa,setSa,0, 200,'%',[{v:100,label:'100'},{v:0,label:'Gray'},{v:150,label:'Vivid'}]],
              ['Hue Rotate',hu,setHu,0, 360,'°',[{v:0,label:'0'},{v:90,label:'90'},{v:180,label:'180'}]]
            ].map(([lbl,val,setV,mn,mx,unit,presets])=>(
              <div key={lbl}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',marginBottom:'3px'}}>
                  <span style={{color:'#94A3B8'}}>{lbl}</span>
                  <div style={{display:'flex',gap:'4px'}}>
                    {presets.map(p=><button key={p.v} onClick={()=>setV(p.v)} style={{fontSize:'8px',padding:'1px 5px',borderRadius:'3px',border:'none',cursor:'pointer',background:val===p.v?C.teal:'rgba(255,255,255,.1)',color:'#fff'}}>{p.label}</button>)}
                    <span style={{color:C.teal,fontWeight:700,minWidth:'34px',textAlign:'right'}}>{val}{unit}</span>
                  </div>
                </div>
                <input type="range" min={mn} max={mx} value={val} onChange={e=>setV(Number(e.target.value))} style={{width:'100%',accentColor:C.teal}} />
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:'6px',marginTop:'12px'}}>
            <PrimaryBtn onClick={applyEdit} disabled={saving} style={{flex:1}}>{saving?'⏳ Rendering…':'👁 Preview Edit'}</PrimaryBtn>
            {edited&&<PrimaryBtn onClick={saveEdit} color={C.blue} style={{flex:1}}>✅ Apply & Close</PrimaryBtn>}
            <GhostBtn onClick={()=>{setEdited(null);setBr(100);setCo(100);setSa(100);setHu(0);}}>↩ Reset</GhostBtn>
          </div>
        </div>
      )}
      {tab==='info'&&(
        <div onClick={e=>e.stopPropagation()} style={{background:'rgba(15,23,42,.95)',borderRadius:'12px',
          padding:'14px',maxWidth:'320px',width:'92vw',fontSize:'11px',color:'#94A3B8',lineHeight:2}}>
          <div><strong style={{color:'#fff'}}>Name:</strong> {img.name||'—'}</div>
          <div><strong style={{color:'#fff'}}>Class:</strong> {img.cls||'—'}</div>
          <div><strong style={{color:'#fff'}}>Size:</strong> {img.w||'?'}×{img.h||'?'}px</div>
          <div><strong style={{color:'#fff'}}>Brightness:</strong> {img.brightness||'?'}/255</div>
          <div><strong style={{color:'#fff'}}>Sharpness:</strong> {img.sharpness||'?'}</div>
          {img.isDuplicate&&<div style={{color:'#EF4444'}}>⚠ Duplicate detected</div>}
          {img.isBlurry&&<div style={{color:'#F59E0B'}}>⚠ Low sharpness</div>}
          {img.isDark&&<div style={{color:'#94A3B8'}}>⚠ Dark image</div>}
        </div>
      )}
      {tab==='rename'&&(
        <div onClick={e=>e.stopPropagation()} style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onRename(name)}
            style={{padding:'8px 12px',borderRadius:'7px',border:'none',fontSize:'12px',width:'200px'}} autoFocus />
          <PrimaryBtn onClick={()=>onRename(name)}>✓ Save</PrimaryBtn>
        </div>
      )}
    </div>
  );
}

/* ─── Canvas Annotation (proper canvas drawing) ─────────────── */
function CanvasAnnotator({img, boxes, onAddBox, onDelBox, annotCls, clsColors}) {
  const canvasRef = useRef();
  const [drawing,  setDrawing]  = useState(false);
  const [start,    setStart]    = useState(null);
  const [currRect, setCurrRect] = useState(null);
  const imgElRef   = useRef();

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    const imgEl = imgElRef.current;
    if (!cv || !imgEl || !imgEl.complete) return;
    const W = imgEl.clientWidth, H = imgEl.clientHeight;
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    // Draw saved boxes
    (boxes||[]).forEach((box, i) => {
      const bx=box.x*W, by=box.y*H, bw=box.w*W, bh=box.h*H;
      const color = clsColors[box.cls] || C.teal;
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = color + 'cc';
      ctx.fillRect(bx, by-16, Math.max(ctx.measureText(box.cls).width+20,60), 16);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial';
      ctx.fillText(box.cls, bx+4, by-4);
      // Delete X button
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(bx+bw-14, by-14, 14, 14);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Arial';
      ctx.fillText('✕', bx+bw-11, by-4);
    });
    // Draw current rect
    if (currRect) {
      const {x,y,w,h} = currRect;
      ctx.strokeStyle = '#00CBA8'; ctx.lineWidth = 2; ctx.setLineDash([5,3]);
      ctx.strokeRect(x*W, y*H, w*W, h*H);
      ctx.fillStyle = 'rgba(0,203,168,.08)';
      ctx.fillRect(x*W, y*H, w*W, h*H);
      ctx.setLineDash([]);
    }
  }, [boxes, currRect, clsColors]);

  useEffect(() => { draw(); }, [draw]);

  const getPos = e => {
    const cv = canvasRef.current;
    const rect = cv.getBoundingClientRect();
    return {x:(e.clientX-rect.left)/cv.width, y:(e.clientY-rect.top)/cv.height};
  };

  const handleClick = e => {
    // Check if clicking on a delete X of any box
    const cv = canvasRef.current;
    const rect = cv.getBoundingClientRect();
    const mx = e.clientX-rect.left, my = e.clientY-rect.top;
    const W=cv.width, H=cv.height;
    for (let i=(boxes||[]).length-1; i>=0; i--) {
      const b=boxes[i];
      const delX=(b.x+b.w)*W-14, delY=(b.y+b.h-16/H)*H-14;
      if (mx>=delX&&mx<=delX+14&&my>=delY&&my<=delY+14) {
        onDelBox(i); return;
      }
    }
  };

  const onDown = e => {
    handleClick(e);
    const p = getPos(e);
    setStart(p); setDrawing(true); setCurrRect(null);
  };
  const onMove = e => {
    if (!drawing||!start) return;
    const p = getPos(e);
    setCurrRect({x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),
                  w:Math.abs(p.x-start.x),h:Math.abs(p.y-start.y)});
  };
  const onUp = e => {
    if (currRect&&currRect.w>.02&&currRect.h>.02) onAddBox({...currRect,cls:annotCls});
    setDrawing(false); setStart(null); setCurrRect(null);
  };

  return (
    <div style={{position:'relative',display:'inline-block',width:'100%'}}>
      <img ref={imgElRef} src={img?.src} alt="" draggable={false} onLoad={draw}
        style={{width:'100%',display:'block',borderRadius:'8px',border:`1px solid ${C.border}`,userSelect:'none'}} />
      <canvas ref={canvasRef}
        style={{position:'absolute',inset:0,cursor:'crosshair',width:'100%',height:'100%',borderRadius:'8px'}}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
        onMouseLeave={e=>{if(drawing)onUp(e);}} />
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────── */

export default function ImageTab({ activeView:propView, setActiveView:setPropView, onProcessed }) {
  const [_v,_sv]  = useState('import');
  const view      = propView    ?? _v;
  const setView   = setPropView ?? _sv;

  const [images,   setImages]   = useState([]);
  const [stats,    setStats]    = useState(null);
  const [busy,     setBusy]     = useState('');
  const [error,    setError]    = useState('');
  const [lightbox, setLightbox] = useState(null); // {img, index}

  // Import
  const [importMode,setImportMode] = useState('upload');
  const [hfId,     setHfId]    = useState('');
  const [hfBusy,   setHfBusy]  = useState(false);
  const [hfMsg,    setHfMsg]   = useState('');
  const fileRef = useRef(); const zipRef = useRef();

  // Tools
  const [toolTab,  setToolTab]  = useState('resize');
  const [toolRes,  setToolRes]  = useState(null);
  const [prevCount,setPrevCount]= useState(6);
  const [resizeW,  setResizeW]  = useState(224);
  const [resizeH,  setResizeH]  = useState(224);
  const [lockAR,   setLockAR]   = useState(true);
  const [quality,  setQuality]  = useState(90);
  const [brightness,setBrightness]=useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation,setSaturation]=useState(100);
  const [hue,      setHue]      = useState(0);
  const [wText,    setWText]    = useState('DataSmithy');
  const [wPos,     setWPos]     = useState('bottom-right');
  const [wOpacity, setWOpacity] = useState(70);
  const [wSize,    setWSize]    = useState(24);

  // History / undo
  const [history,  setHistory]  = useState([]);
  const saveHistory = () => setHistory(h=>[...h.slice(-4),images]);

  // Grid
  const [search,   setSearch]   = useState('');
  const [filterCls,setFilterCls]= useState('all');
  const [filterIss,setFilterIss]= useState('all');
  const [selected, setSelected] = useState(new Set());

  // Classes
  const [editCls,  setEditCls]  = useState(null);
  const [editClsName,setEditClsName]=useState('');

  // Augment
  const [augImg,   setAugImg]   = useState(null);
  const [augSeed,  setAugSeed]  = useState(1);

  // Split
  const [split,    setSplit]    = useState([70,15,15]);

  // Advanced
  const [advTab,   setAdvTab]   = useState('faces');
  const [faceRes,  setFaceRes]  = useState(null);
  const [faceThresh,setFaceThresh]=useState(8);
  const [pcaPts,   setPcaPts]   = useState(null);
  const [iccRes,   setIccRes]   = useState(null);
  const [noiseRes, setNoiseRes] = useState(null);
  const [aspectRes,setAspectRes]= useState(null);
  // Annotation
  const [annotBoxes,setAnnotBoxes]=useState({});
  const [annotSel, setAnnotSel] = useState(0);
  const [annotCls, setAnnotCls] = useState('');

  // Pipeline
  const [pipeline, setPipeline] = useState([]);
  const [pipRunning,setPipRunning]=useState(false);
  const [pipLog,   setPipLog]   = useState([]);
  const [pipPreset,setPipPreset]=useState(null);

  // Step progress
  const stepIndex = !stats ? 0 : view==='overview'||view==='classes'||view==='charts' ? 1
    : view==='universal'||view==='augment' ? 2 : view==='pipeline' ? 3 : view==='export' ? 4 : 1;
  const STEPS = [
    {id:'import',  icon:'📥', label:'Import'},
    {id:'analyze', icon:'🔍', label:'Analyse'},
    {id:'configure',icon:'⚙', label:'Configure'},
    {id:'pipeline',icon:'⚡', label:'Pipeline'},
    {id:'export',  icon:'📦', label:'Export'},
  ];

  const SAMPLES = [
    {name:'Cats vs Dogs',emoji:'🐱🐶',desc:'30 images · 2 classes',
     imgs:[...[...Array(15)].map((_,i)=>({src:`https://picsum.photos/seed/cat${i+1}/224/224`,name:`cat_${i+1}.jpg`,cls:'cats',label:'cats'})),
           ...[...Array(15)].map((_,i)=>({src:`https://picsum.photos/seed/dog${i+10}/224/224`,name:`dog_${i+1}.jpg`,cls:'dogs',label:'dogs'}))]},
    {name:'Traffic Signs',emoji:'🚦',desc:'40 images · 4 classes',
     imgs:['stop','yield','speed','warning'].flatMap((cls,ci)=>[...Array(10)].map((_,i)=>({src:`https://picsum.photos/seed/${cls}${i+ci*5}/224/224`,name:`${cls}_${i+1}.jpg`,cls,label:cls})))},
    {name:'Medical (demo)',emoji:'🏥',desc:'20 images · 2 classes',
     imgs:[...[...Array(10)].map((_,i)=>({src:`https://picsum.photos/seed/norm${i}/224/224`,name:`normal_${i+1}.jpg`,cls:'normal',label:'normal'})),
           ...[...Array(10)].map((_,i)=>({src:`https://picsum.photos/seed/abn${i}/224/224`,name:`abnormal_${i+1}.jpg`,cls:'abnormal',label:'abnormal'}))]},
  ];

  // Process images after import
  const process = useCallback(async (imgs) => {
    setBusy('Analysing images…'); setError('');
    const seen=new Set(); const out=[];
    for (let i=0;i<imgs.length;i++) {
      setBusy(`Analysing ${i+1}/${imgs.length}…`);
      const res = await analyseImage(imgs[i]);
      res.isDuplicate = !!(res.hash && seen.has(res.hash));
      if (res.hash) seen.add(res.hash);
      out.push(res);
    }
    setImages(out); setStats(calcStats(out));
    setBusy(''); setView('overview');
    if (onProcessed) onProcessed();
  }, [onProcessed]);

  // File handlers
  const addFiles = files => {
    const imgs = Array.from(files).filter(f=>f.type.startsWith('image/')).map(f=>({
      src:URL.createObjectURL(f), name:f.name,
      cls:f.webkitRelativePath?.split('/')[1]||f.name.split(/[_-]/)[0]||'unknown',
    }));
    if (!imgs.length){setError('No image files found.');return;}
    const all=[...images,...imgs]; setImages(all); process(all);
  };

  const addZip = async file => {
    setBusy('Extracting ZIP…');
    try {
      const {default:JSZip}=await import('https://cdn.skypack.dev/jszip');
      const zip=await JSZip.loadAsync(file);
      const entries=Object.values(zip.files).filter(f=>!f.dir&&/\.(jpe?g|png|webp|bmp)$/i.test(f.name));
      const imgs=[];
      for(const e of entries){const blob=await e.async('blob');const parts=e.name.split('/');imgs.push({src:URL.createObjectURL(blob),name:parts[parts.length-1],cls:parts.length>1?parts[parts.length-2]:'unknown'});}
      if(!imgs.length){setError('No images found in ZIP.');setBusy('');return;}
      const all=[...images,...imgs];setImages(all);process(all);
    }catch(e){setError('ZIP error: '+e.message);setBusy('');}
  };

  const handleDrop=e=>{e.preventDefault();const files=Array.from(e.dataTransfer.files);const zip=files.find(f=>f.name.endsWith('.zip'));if(zip)addZip(zip);else addFiles(files);};

  // Image ops
  const delImg=(idx)=>{const u=images.filter((_,i)=>i!==idx);setImages(u);setStats(calcStats(u));setLightbox(null);};
  const renImg=(idx,n)=>{const u=images.map((img,i)=>i===idx?{...img,name:n}:img);setImages(u);setLightbox({img:u[idx],index:idx});};
  const moveImg=(idx,cls)=>{const u=images.map((img,i)=>i===idx?{...img,cls,label:cls}:img);setImages(u);setStats(calcStats(u));};
  const applyEditToImg=(idx,src)=>{const u=images.map((img,i)=>i===idx?{...img,src}:img);setImages(u);};
  const delSel=()=>{const u=images.filter((_,i)=>!selected.has(i));setImages(u);setStats(calcStats(u));setSelected(new Set());};
  const renameCls=(old,nw)=>{if(!nw||nw===old)return;const u=images.map(img=>img.cls===old?{...img,cls:nw,label:nw}:img);setImages(u);setStats(calcStats(u));setEditCls(null);};
  const deleteCls=cls=>{if(!window.confirm(`Delete all "${cls}" images?`))return;const u=images.filter(img=>img.cls!==cls);setImages(u);setStats(calcStats(u));};
  const delDupes=()=>{const s=new Set();const u=images.filter(img=>{if(!img.hash||s.has(img.hash))return false;s.add(img.hash);return true;});setImages(u);setStats(calcStats(u));};
  const delIssue=type=>{const u=images.filter(img=>type==='blurry'?!img.isBlurry:type==='dark'?!img.isDark:!img.isBright);setImages(u);setStats(calcStats(u));};

  // Tool runner
  const runTool = async (label, getW, getH, getFilter, drawFn) => {
    setBusy('Generating preview…'); setToolRes(null); setError('');
    const results=[];
    for (const img of images.slice(0,prevCount)) {
      const el=await loadImg(img.src);
      if(!el)continue;
      try {
        const W=getW?getW(el):el.naturalWidth;
        const H=getH?getH(el):el.naturalHeight;
        let cv;
        if(drawFn) {
          cv=drawFn(el,W,H);
        } else {
          const filter=getFilter?getFilter():'none';
          cv=applyFilter(el,filter,W,H).cv;
        }
        results.push({src:cv.toDataURL('image/jpeg',quality/100),orig:img.src,name:img.name,cls:img.cls,w:W,h:H});
      }catch(e){console.warn(e);}
    }
    setBusy('');
    if(results.length) setToolRes({label,images:results,total:images.length,applied:false});
    else setError('Preview failed — images may be cross-origin. Upload directly as files.');
  };

  const applyToolToAll = async () => {
    if(!toolRes)return;
    saveHistory(); setBusy(`Applying to all ${images.length} images…`);
    const isResize=/resize/i.test(toolRes.label);
    const updated=[];
    for(const img of images){
      const el=await loadImg(img.src);
      if(!el){updated.push(img);continue;}
      try{
        const W=isResize?resizeW:el.naturalWidth;
        const H=isResize?(lockAR?Math.round(el.naturalHeight*resizeW/Math.max(el.naturalWidth,1)):resizeH):el.naturalHeight;
        let cv;
        if(/watermark/i.test(toolRes.label)){
          cv=applyWatermark(el,W,H,wText,wPos,wOpacity,wSize);
        } else {
          const filter=getToolFilter(toolRes.label);
          cv=applyFilter(el,filter,W,H).cv;
        }
        updated.push({...img,src:cv.toDataURL('image/jpeg',quality/100),w:W,h:H});
      }catch{updated.push(img);}
    }
    setImages(updated);setStats(calcStats(updated));setToolRes({...toolRes,applied:true});setBusy('');
  };

  const getToolFilter=label=>{
    if(/color|colour|adjust/i.test(label)) return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg)`;
    if(/sharpen/i.test(label)) return 'contrast(130%) saturate(110%)';
    if(/blur/i.test(label))    return 'blur(2px)';
    if(/gray/i.test(label))    return 'grayscale(100%)';
    if(/sepia/i.test(label))   return 'sepia(80%)';
    if(/invert/i.test(label))  return 'invert(100%)';
    if(/contrast/i.test(label))return 'contrast(200%) brightness(90%)';
    return 'none';
  };

  const downloadToolRes=async()=>{
    if(!toolRes)return;
    for(const img of toolRes.images){const a=document.createElement('a');a.href=img.src;a.download=img.name;a.click();await new Promise(r=>setTimeout(r,80));}
  };

  // PCA
  const runPCA=()=>{
    const valid=images.filter(i=>i.features&&!i.error);
    if(valid.length<4){setPcaPts([]);return;}
    const data=valid.map(i=>i.features),d=data[0].length,n=data.length;
    const mean=Array(d).fill(0);data.forEach(row=>row.forEach((v,j)=>mean[j]+=v/n));
    const centered=data.map(row=>row.map((v,j)=>v-mean[j]));
    const cov=Array.from({length:d},()=>Array(d).fill(0));
    centered.forEach(row=>{for(let i=0;i<d;i++)for(let j=0;j<d;j++)cov[i][j]+=row[i]*row[j]/(n-1);});
    const powerIter=mat=>{let v=Array(d).fill(0).map((_,i)=>i===0?1:0.01);for(let k=0;k<60;k++){const nv=Array(d).fill(0);for(let i=0;i<d;i++)for(let j=0;j<d;j++)nv[i]+=mat[i][j]*v[j];const nm=Math.sqrt(nv.reduce((s,x)=>s+x*x,0))||1;v=nv.map(x=>x/nm);}return v;};
    const pc1=powerIter(cov);
    const l1=cov.reduce((s,row,i)=>s+row.reduce((ss,v,j)=>ss+v*pc1[j]*pc1[i],0),0);
    const deflated=cov.map((row,i)=>row.map((v,j)=>v-l1*pc1[i]*pc1[j]));
    const pc2=powerIter(deflated);
    const pts=centered.map((row,i)=>({x:row.reduce((s,v,j)=>s+v*pc1[j],0),y:row.reduce((s,v,j)=>s+v*pc2[j],0),cls:valid[i].cls,name:valid[i].name}));
    setPcaPts(pts);
  };

  const runFaces=async()=>{
    setBusy('Scanning…');const results=[];
    for(const img of images){const el=await loadImg(img.src);if(!el){results.push({...img,faceCount:0,skinRatio:0});continue;}
    const cv=document.createElement('canvas');cv.width=32;cv.height=32;const ctx=cv.getContext('2d');ctx.drawImage(el,0,0,32,32);
    const px=ctx.getImageData(0,0,32,32).data;let skin=0;
    for(let i=0;i<px.length;i+=4){const r=px[i],g=px[i+1],b=px[i+2];if(r>95&&g>40&&b>20&&r>g&&r>b&&Math.abs(r-g)>15)skin++;}
    const ratio=Math.round(skin/1024*100);results.push({...img,faceCount:ratio>=faceThresh&&ratio<70?1:0,skinRatio:ratio});}
    setFaceRes(results);setBusy('');
  };

  const runICC=async()=>{
    setBusy('Analysing colour modes…');const perImg=[];
    for(const img of images.slice(0,50)){const el=await loadImg(img.src);if(!el){perImg.push({name:img.name,cls:img.cls,mode:'Unknown',r:0,g:0,b:0});continue;}
    const cv=document.createElement('canvas');cv.width=16;cv.height=16;const ctx=cv.getContext('2d');ctx.drawImage(el,0,0,16,16);
    const px=ctx.getImageData(0,0,16,16).data;let rS=0,gS=0,bS=0,n2=0;
    for(let i=0;i<px.length;i+=4){rS+=px[i];gS+=px[i+1];bS+=px[i+2];n2++;}
    const isGray=Math.abs(rS-gS)<n2*6&&Math.abs(gS-bS)<n2*6;
    perImg.push({name:img.name,cls:img.cls,mode:isGray?'Grayscale':'RGB',r:Math.round(rS/n2),g:Math.round(gS/n2),b:Math.round(bS/n2)});}
    const modes={};perImg.forEach(p=>{modes[p.mode]=(modes[p.mode]||0)+1;});
    setIccRes({perImg,modes});setBusy('');
  };

  const runNoise=async()=>{
    setBusy('Analysing noise…');const results=[];
    for(const img of images.slice(0,50)){const el=await loadImg(img.src);if(!el){results.push({...img,noiseLevel:0,isNoisy:false});continue;}
    const cv=document.createElement('canvas');cv.width=32;cv.height=32;const ctx=cv.getContext('2d');ctx.drawImage(el,0,0,32,32);
    const px=ctx.getImageData(0,0,32,32).data;let noise=0,cnt=0;
    for(let x=1;x<31;x++)for(let y=1;y<31;y++){const i=(y*32+x)*4;const lum=(px[i]+px[i+1]+px[i+2])/3;[[0,-1],[0,1],[-1,0],[1,0]].forEach(([dx,dy])=>{const ai=((y+dy)*32+(x+dx))*4;noise+=Math.abs(lum-(px[ai]+px[ai+1]+px[ai+2])/3);cnt++;});}
    const lvl=Math.round(noise/cnt);results.push({...img,noiseLevel:lvl,isNoisy:lvl>25});}
    const noisy=results.filter(r=>r.isNoisy).length;setNoiseRes({images:results,noisy,avg:Math.round(results.reduce((s,r)=>s+r.noiseLevel,0)/Math.max(1,results.length))});setBusy('');
  };

  const runAspect=()=>{const map={};images.filter(i=>i.w&&i.h).forEach(img=>{const r=(img.w/img.h).toFixed(2);map[r]=(map[r]||0)+1;});setAspectRes({ratios:Object.entries(map).sort((a,b)=>b[1]-a[1]),unique:Object.keys(map).length});};

  // Annotation helpers
  const addAnnotBox=(box)=>setAnnotBoxes(prev=>({...prev,[annotSel]:[...(prev[annotSel]||[]),box]}));
  const delAnnotBox=(i)=>setAnnotBoxes(prev=>({...prev,[annotSel]:(prev[annotSel]||[]).filter((_,j)=>j!==i)}));

  const clsColors = Object.fromEntries((stats?.classes||[]).map((c,i)=>[c.name, COLORS[i%COLORS.length]]));
  const annotClsList = stats?.classes?.length ? stats.classes.map(c=>c.name) : ['object'];

  const exportAnnot=fmt=>{
    const clsNames=[...new Set(Object.values(annotBoxes).flat().map(b=>b.cls))];
    if(fmt==='yolo'){const lines=images.map((img,i)=>{const bxs=annotBoxes[i]||[];return bxs.map(b=>`${clsNames.indexOf(b.cls)} ${(b.x+b.w/2).toFixed(6)} ${(b.y+b.h/2).toFixed(6)} ${b.w.toFixed(6)} ${b.h.toFixed(6)}`).join('\n');}).filter(Boolean);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain'}));a.download='annotations.txt';a.click();}
    else{const coco={images:images.map((img,i)=>({id:i+1,file_name:img.name,width:img.w||224,height:img.h||224})),categories:clsNames.map((n,i)=>({id:i+1,name:n})),annotations:Object.entries(annotBoxes).flatMap(([ii,bxs])=>bxs.map((b,bi)=>{const iw=images[ii]?.w||224,ih=images[ii]?.h||224;return{id:Number(ii)*100+bi,image_id:Number(ii)+1,category_id:clsNames.indexOf(b.cls)+1,bbox:[b.x*iw,b.y*ih,b.w*iw,b.h*ih],area:b.w*iw*b.h*ih,iscrowd:0};}))};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(coco,null,2)],{type:'application/json'}));a.download='annotations.json';a.click();}
  };

  const exportZip=async()=>{try{const {default:JSZip}=await import('https://cdn.skypack.dev/jszip');const zip=new JSZip();for(const img of images){const r=await fetch(img.src);const blob=await r.blob();zip.folder(img.cls||'unknown').file(img.name||'img.jpg',blob);}const a=document.createElement('a');a.href=URL.createObjectURL(await zip.generateAsync({type:'blob'}));a.download='dataset.zip';a.click();}catch(e){alert('ZIP failed: '+e.message);}};
  const exportCSV=()=>{const csv='filename,class,width,height,brightness,sharpness,is_duplicate,is_blurry\n'+images.map(i=>`${i.name||''},${i.cls||''},${i.w||''},${i.h||''},${i.brightness||''},${i.sharpness||''},${i.isDuplicate||false},${i.isBlurry||false}`).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='metadata.csv';a.click();};
  const exportFormat=fmt=>{
    if(fmt==='yolo'){const c=(stats?.classes||[]).map(cl=>cl.name).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([c],{type:'text/plain'}));a.download='classes.txt';a.click();return;}
    if(fmt==='coco'){const c=JSON.stringify({categories:(stats?.classes||[]).map((cl,i)=>({id:i+1,name:cl.name})),images:images.map((img,i)=>({id:i+1,file_name:img.name,width:img.w,height:img.h}))},null,2);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([c],{type:'application/json'}));a.download='dataset.json';a.click();return;}
    if(fmt==='report'){
      const hc=stats?.health>=80?'#00956B':stats?.health>=60?'#D97706':'#DC2626';
      const c=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dataset Report</title>
<style>body{font-family:system-ui;max-width:860px;margin:40px auto;padding:24px;color:#0F172A;}h1{color:#00CBA8;}
table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #E2E8F0;padding:8px 12px;text-align:left;font-size:13px;}
th{background:#F8FAFC;font-weight:700;}.health{font-size:52px;font-weight:900;color:${hc};}</style></head><body>
<h1>🖼 Image Dataset Health Report</h1><p>Generated by <strong>DataSmithy</strong> · ${new Date().toLocaleDateString()}</p>
<div class="health">${stats?.health||0}</div><p><em>Health Score / 100</em></p>
<h2>Summary</h2><table><tr><th>Metric</th><th>Value</th></tr>
<tr><td>Total Images</td><td>${stats?.total||0}</td></tr>
<tr><td>Classes</td><td>${stats?.classes?.map(c=>c.name).join(', ')||'—'}</td></tr>
<tr><td>Avg Size</td><td>${stats?.avgW||0}×${stats?.avgH||0}px</td></tr>
<tr><td>Duplicates</td><td>${stats?.dupeCount||0}</td></tr>
<tr><td>Blurry</td><td>${stats?.blurryCount||0}</td></tr>
<tr><td>Dark</td><td>${stats?.darkCount||0}</td></tr>
<tr><td>Imbalance</td><td>${stats?.imbalance||0}%</td></tr></table>
<h2>Class Distribution</h2><table><tr><th>Class</th><th>Count</th><th>%</th></tr>
${stats?.classes?.map(c=>`<tr><td>${c.name}</td><td>${c.count}</td><td>${Math.round(c.count/(stats?.total||1)*100)}%</td></tr>`).join('')||''}
</table><p style="font-size:11px;color:#94A3B8">DataSmithy · datasmithy.vercel.app</p></body></html>`;
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([c],{type:'text/html'}));a.download='health_report.html';a.click();
    }
  };

  const hc = stats?.health>=80?'#00956B':stats?.health>=60?'#D97706':'#DC2626';
  const filtered = images.filter(img=>{
    if(filterCls!=='all'&&img.cls!==filterCls)return false;
    if(filterIss==='dupes'&&!img.isDuplicate)return false;
    if(filterIss==='blurry'&&!img.isBlurry)return false;
    if(filterIss==='dark'&&!img.isDark)return false;
    if(search&&!img.name?.toLowerCase().includes(search.toLowerCase())&&!img.cls?.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  const PIPELINE_PRESETS = [
    {icon:'🚀',name:'ML Ready',steps:[{id:'resize',label:'Resize 224×224',W:224,H:224},{id:'strip',label:'Strip EXIF'},{id:'dedup',label:'Remove Dupes'}]},
    {icon:'🌐',name:'Web Optimised',steps:[{id:'resize',label:'Resize 512px',W:512,H:512},{id:'watermark',label:'Add Watermark'}]},
    {icon:'🧹',name:'Clean Dataset',steps:[{id:'dedup',label:'Remove Dupes'},{id:'blur',label:'Remove Blurry'},{id:'dark',label:'Remove Dark'}]},
    {icon:'🎨',name:'Colour Boost',steps:[{id:'filter',label:'Vivid Colours',filter:'saturate(150%) contrast(110%)'},{id:'strip',label:'Strip EXIF'}]},
    {icon:'📊',name:'Research Pack',steps:[{id:'resize',label:'Resize 256×256',W:256,H:256},{id:'strip',label:'Strip EXIF'}]},
    {icon:'🏥',name:'Medical Prep',steps:[{id:'gray',label:'Convert Grayscale',filter:'grayscale(100%)'},{id:'strip',label:'Strip EXIF'}]},
  ];

  const runPipelineSteps = async (steps) => {
    setPipRunning(true); setPipLog([]); saveHistory();
    const log=[];
    const STEP_FNS = {
      resize: async(imgs,step)=>{const res=[];for(const img of imgs){const el=await loadImg(img.src);if(!el){res.push(img);continue;}const W=step.W||224;const H=lockAR?Math.round(el.naturalHeight*W/Math.max(el.naturalWidth,1)):step.H||W;const {cv}=applyFilter(el,'none',W,H);res.push({...img,src:cv.toDataURL('image/jpeg',.92),w:W,h:H});}return res;},
      strip:  async(imgs)=>{const res=[];for(const img of imgs){const el=await loadImg(img.src);if(!el){res.push(img);continue;}const {cv}=applyFilter(el,'none',el.naturalWidth,el.naturalHeight);res.push({...img,src:cv.toDataURL('image/jpeg',.92)});}return res;},
      watermark:async(imgs)=>{const res=[];for(const img of imgs){const el=await loadImg(img.src);if(!el){res.push(img);continue;}const cv=applyWatermark(el,el.naturalWidth,el.naturalHeight,wText,wPos,wOpacity,wSize);res.push({...img,src:cv.toDataURL('image/jpeg',.92)});}return res;},
      filter: async(imgs,step)=>{const res=[];for(const img of imgs){const el=await loadImg(img.src);if(!el){res.push(img);continue;}const {cv}=applyFilter(el,step.filter||'none',el.naturalWidth,el.naturalHeight);res.push({...img,src:cv.toDataURL('image/jpeg',.92)});}return res;},
      gray:   async(imgs,step)=>{const res=[];for(const img of imgs){const el=await loadImg(img.src);if(!el){res.push(img);continue;}const {cv}=applyFilter(el,'grayscale(100%)',el.naturalWidth,el.naturalHeight);res.push({...img,src:cv.toDataURL('image/jpeg',.92)});}return res;},
      dedup:  async(imgs)=>{const s=new Set();return imgs.filter(i=>{if(!i.hash||s.has(i.hash))return false;s.add(i.hash);return true;});},
      blur:   async(imgs)=>imgs.filter(i=>!i.isBlurry),
      dark:   async(imgs)=>imgs.filter(i=>!i.isDark),
    };
    let current=[...images];
    for(const step of steps){
      log.push(`▶ ${step.label}…`);setPipLog([...log]);
      const before=current.length;
      if(STEP_FNS[step.id]) current=await STEP_FNS[step.id](current,step);
      log.push(`✅ Done (${before}→${current.length})`);
      await new Promise(r=>setTimeout(r,80));
    }
    setImages(current);setStats(calcStats(current));
    log.push(`🎉 Pipeline complete! ${current.length} images ready.`);
    setPipLog([...log]);setPipRunning(false);
  };

  const loadHF=async()=>{
    if(!hfId.trim()){setHfMsg('Enter a dataset ID');return;}
    setHfBusy(true);setHfMsg('⏳ Loading…');
    try{const r=await fetch(`https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(hfId.trim())}&config=default&split=train&offset=0&limit=100`);if(!r.ok)throw new Error('Not found');const data=await r.json();const rows=(data.rows||[]).map(r=>r.row||r);if(!rows.length)throw new Error('No rows');const keys=Object.keys(rows[0]||{});const urlKey=keys.find(k=>['url','image_url','path','src'].includes(k.toLowerCase()));if(!urlKey)throw new Error('No image URL column');const lblKey=keys.find(k=>['label','class','category'].includes(k.toLowerCase()));const imgs=rows.filter(r=>r[urlKey]).slice(0,60).map(r=>({src:r[urlKey],name:(r[lblKey]||'img')+'_'+Math.random().toString(36).slice(2,6)+'.jpg',cls:String(r[lblKey]||'unknown'),label:String(r[lblKey]||'unknown')}));setImages(imgs);process(imgs);setHfMsg(`✅ Loaded ${imgs.length} images`);}
    catch(e){setHfMsg('❌ '+e.message);}
    setHfBusy(false);
  };

  return (
    <div style={{display:'grid',gap:0}}>
      {/* Step bar */}
      <StepBar steps={STEPS} current={stepIndex} />

      <div style={{display:'grid',gap:'14px',padding:'14px 16px'}}>

        {/* Lightbox */}
        {lightbox && stats && (
          <ImageEditLightbox
            img={lightbox.img} classes={stats.classes}
            onClose={()=>setLightbox(null)}
            onDelete={()=>delImg(lightbox.index)}
            onRename={n=>renImg(lightbox.index,n)}
            onMove={cls=>{moveImg(lightbox.index,cls);setLightbox(null);}}
            onApplyEdit={src=>applyEditToImg(lightbox.index,src)} />
        )}

        {/* Status bar */}
        {busy && (
          <div style={{padding:'10px 14px',background:C.tealDim,border:`1px solid ${C.tealBorder}`,borderRadius:'8px',display:'flex',gap:'10px',alignItems:'center'}}>
            <div style={{width:'14px',height:'14px',border:`2px solid ${C.border}`,borderTopColor:C.teal,borderRadius:'50%',animation:'spin 1s linear infinite',flexShrink:0}} />
            <span style={{fontSize:'12px',color:'#00956B',fontWeight:600}}>{busy}</span>
          </div>
        )}
        {error && (
          <div style={{padding:'10px 14px',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:'8px',fontSize:'12px',color:'#DC2626',display:'flex',justifyContent:'space-between'}}>
            ❌ {error}
            <button onClick={()=>setError('')} style={{background:'none',border:'none',color:'#DC2626',cursor:'pointer'}}>✕</button>
          </div>
        )}

        {/* Quick action bar */}
        {stats && view!=='import' && (
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap',alignItems:'center'}}>
            <GhostBtn onClick={()=>{setView('import');setImportMode('merge');}}>➕ Add More</GhostBtn>
            {history.length>0 && <GhostBtn onClick={()=>{const p=history[history.length-1];setHistory(h=>h.slice(0,-1));setImages(p);setStats(calcStats(p));setToolRes(null);}} color={C.amber}>↩ Undo ({history.length})</GhostBtn>}
            <GhostBtn onClick={()=>{if(window.confirm('Clear all?')){setImages([]);setStats(null);setView('import');}}} color={C.red}>🗑 Clear</GhostBtn>
            <div style={{marginLeft:'auto',fontSize:'10px',color:C.muted,display:'flex',gap:'8px',alignItems:'center'}}>
              <span style={{fontWeight:700,color:hc}}>♥ {stats.health}/100</span>
              <span>{stats.total} images · {stats.classes.length} classes</span>
            </div>
          </div>
        )}

        {/* ── IMPORT ───────────────────────────────────────────────────── */}
        {view==='import' && (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:'8px',marginBottom:'14px'}}>
              {[{icon:'📁',label:'Upload Files',id:'upload',color:C.teal},{icon:'📦',label:'Upload ZIP',id:'zip',color:C.blue},{icon:'🤗',label:'HuggingFace',id:'hf',color:C.amber},{icon:'🎯',label:'Samples',id:'samples',color:'#EC4899'},{icon:'➕',label:'Merge More',id:'merge',color:C.purple}].map(opt=>{
                const active=importMode===opt.id;
                return (
                  <button key={opt.id} onClick={()=>setImportMode(opt.id)} style={{padding:'14px 8px',borderRadius:'10px',border:'none',cursor:'pointer',textAlign:'center',background:active?opt.color+'18':'#F8FAFC',outline:active?`2px solid ${opt.color}`:`1px solid ${C.border}`,transition:'all .15s'}}>
                    <div style={{fontSize:'22px',marginBottom:'5px'}}>{opt.icon}</div>
                    <div style={{fontWeight:700,color:active?opt.color:C.text,fontSize:'11px'}}>{opt.label}</div>
                  </button>
                );
              })}
            </div>
            {(importMode==='upload') && (
              <Card>
                <div onDrop={handleDrop} onDragOver={e=>e.preventDefault()} onClick={()=>fileRef.current?.click()}
                  style={{border:`2px dashed ${C.border}`,borderRadius:'10px',padding:'36px 24px',textAlign:'center',cursor:'pointer',background:'#FAFCFF',transition:'all .2s'}}
                  onMouseOver={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.background=C.tealDim;}}
                  onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background='#FAFCFF';}}>
                  <div style={{fontSize:'40px',marginBottom:'10px'}}>📷</div>
                  <div style={{fontWeight:700,fontSize:'15px',color:C.text,marginBottom:'6px'}}>Click to browse or drag & drop</div>
                  <div style={{fontSize:'12px',color:C.muted,marginBottom:'16px'}}>JPG · PNG · WebP · BMP · GIF</div>
                  <PrimaryBtn onClick={e=>{e.stopPropagation();fileRef.current?.click();}}>📁 Browse Images</PrimaryBtn>
                </div>
                <div style={{marginTop:'10px',padding:'10px 14px',background:C.surface,borderRadius:'7px',fontSize:'11px',color:C.muted}}>
                  💡 Organise in class subfolders then upload as ZIP for auto-labelling
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>addFiles(e.target.files)} />
              </Card>
            )}
            {importMode==='zip' && (
              <Card>
                <SectionTitle>📦 Upload ZIP File</SectionTitle>
                <div onDrop={e=>{e.preventDefault();const f=Array.from(e.dataTransfer.files).find(x=>x.name.endsWith('.zip'));if(f)addZip(f);}} onDragOver={e=>e.preventDefault()} onClick={()=>zipRef.current?.click()}
                  style={{border:`2px dashed ${C.blue}`,borderRadius:'10px',padding:'32px',textAlign:'center',cursor:'pointer',background:'rgba(59,130,246,.04)'}}>
                  <div style={{fontSize:'40px',marginBottom:'10px'}}>📦</div>
                  <div style={{fontWeight:700,fontSize:'14px',color:C.text,marginBottom:'12px'}}>Click or drag ZIP file here</div>
                  <PrimaryBtn onClick={e=>{e.stopPropagation();zipRef.current?.click();}} color={C.blue}>📦 Select ZIP</PrimaryBtn>
                </div>
                <div style={{marginTop:'10px',padding:'10px',background:'#1E1E2E',borderRadius:'7px',fontFamily:'monospace',fontSize:'11px',color:'#A6E22E',lineHeight:1.8}}>
                  dataset.zip/<br/>&nbsp;&nbsp;<b>cats</b>/img001.jpg img002.jpg<br/>&nbsp;&nbsp;<b>dogs</b>/img001.jpg img002.jpg
                </div>
                <input ref={zipRef} type="file" accept=".zip" style={{display:'none'}} onChange={e=>e.target.files[0]&&addZip(e.target.files[0])} />
              </Card>
            )}
            {importMode==='hf' && (
              <Card>
                <SectionTitle>🤗 HuggingFace Dataset</SectionTitle>
                <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>
                  <input value={hfId} onChange={e=>setHfId(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadHF()}
                    placeholder="Dataset ID — e.g. cifar10, cats_vs_dogs"
                    style={{padding:'9px 12px',borderRadius:'7px',border:`1px solid ${C.border}`,fontSize:'12px',flex:1}} />
                  <PrimaryBtn onClick={loadHF} disabled={hfBusy}>{hfBusy?'⏳':'Load'}</PrimaryBtn>
                </div>
                <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'10px'}}>
                  {['cifar10','mnist','fashion_mnist','cats_vs_dogs','svhn'].map(id=>(
                    <button key={id} onClick={()=>setHfId(id)} style={{fontSize:'10px',padding:'3px 10px',borderRadius:'4px',border:`1px solid ${C.border}`,background:C.surface,cursor:'pointer',color:C.muted}}>{id}</button>
                  ))}
                </div>
                {hfMsg && <div style={{fontSize:'12px',padding:'8px 12px',borderRadius:'7px',color:hfMsg.startsWith('✅')?'#00956B':'#DC2626',background:hfMsg.startsWith('✅')?C.tealDim:'rgba(239,68,68,.08)'}}>{hfMsg}</div>}
              </Card>
            )}
            {importMode==='samples' && (
              <Card>
                <SectionTitle>🎯 Sample Datasets</SectionTitle>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'10px'}}>
                  {SAMPLES.map(ds=>(
                    <button key={ds.name} onClick={()=>{setImages(ds.imgs);process(ds.imgs);}} style={{padding:'16px',borderRadius:'10px',border:`1px solid ${C.border}`,background:'#fff',cursor:'pointer',textAlign:'left',transition:'all .15s'}}
                      onMouseOver={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.background=C.tealDim;}}
                      onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background='#fff';}}>
                      <div style={{fontSize:'24px',marginBottom:'6px'}}>{ds.emoji}</div>
                      <div style={{fontWeight:700,color:C.text,fontSize:'12px',marginBottom:'3px'}}>{ds.name}</div>
                      <div style={{fontSize:'10px',color:C.muted}}>{ds.desc}</div>
                    </button>
                  ))}
                </div>
              </Card>
            )}
            {importMode==='merge'&&images.length>0&&(
              <Card>
                <SectionTitle>➕ Merge More Images</SectionTitle>
                <p style={{fontSize:'12px',color:C.muted,marginBottom:'12px'}}>Current: <strong>{images.length}</strong> images. Add more below.</p>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  <PrimaryBtn onClick={()=>{const el=document.createElement('input');el.type='file';el.multiple=true;el.accept='image/*';el.onchange=e=>addFiles(e.target.files);el.click();}}>📁 Add Images</PrimaryBtn>
                  <PrimaryBtn color={C.blue} onClick={()=>{const el=document.createElement('input');el.type='file';el.accept='.zip';el.onchange=e=>{if(e.target.files[0])addZip(e.target.files[0]);};el.click();}}>📦 Add ZIP</PrimaryBtn>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
        {!stats && view!=='import' && (
          <div style={{textAlign:'center',padding:'60px 24px',color:'var(--muted,#64748B)'}}>
            <div style={{fontSize:'48px',marginBottom:'12px'}}>📷</div>
            <div style={{fontSize:'16px',fontWeight:700,color:'var(--text,#0F172A)',marginBottom:'8px'}}>No images yet</div>
            <div style={{fontSize:'13px',marginBottom:'20px'}}>Import images to unlock this tab</div>
            <button onClick={()=>setView('import')} style={{padding:'10px 24px',borderRadius:'8px',background:'#00CBA8',color:'#fff',border:'none',fontSize:'13px',fontWeight:700,cursor:'pointer'}}>
              📥 Go to Import
            </button>
          </div>
        )}

        {stats && view==='overview' && (
          <Card>
            <SectionTitle>Dataset Overview</SectionTitle>
            <div style={{display:'flex',gap:'20px',marginBottom:'20px',flexWrap:'wrap'}}>
              <div style={{textAlign:'center',flexShrink:0}}>
                <div style={{fontSize:'52px',fontWeight:900,color:hc,lineHeight:1}}>{stats.health}</div>
                <div style={{fontSize:'10px',color:C.muted,fontWeight:700,textTransform:'uppercase'}}>Health Score</div>
                <div style={{marginTop:'8px',height:'4px',width:'80px',background:'#E2E8F0',borderRadius:'2px',overflow:'hidden'}}>
                  <div style={{width:`${stats.health}%`,height:'100%',background:hc,borderRadius:'2px'}} />
                </div>
              </div>
              <div style={{flex:1,minWidth:'180px',display:'flex',flexDirection:'column',gap:'4px'}}>
                {[
                  [stats.dupeCount===0,'✅ No duplicates',`⚠ ${stats.dupeCount} duplicates found`],
                  [stats.imbalance<20,`✅ Balanced (${stats.imbalance}% imbalance)`,`⚠ ${stats.imbalance}% class imbalance`],
                  [stats.blurryCount===0,'✅ No blurry images',`⚠ ${stats.blurryCount} blurry images`],
                  [stats.darkCount===0,'✅ No dark images',`⚠ ${stats.darkCount} dark images`],
                  [stats.errCount===0,'✅ All images loaded',`❌ ${stats.errCount} failed`],
                ].map(([ok,g,b],i)=>(
                  <div key={i} style={{fontSize:'12px',color:ok?'#00956B':'#B45309'}}>{ok?g:b}</div>
                ))}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(70px,1fr))',gap:'7px'}}>
              {[['🖼','Images',stats.total,''],['🏷','Classes',stats.classes.length,''],['⚠','Dupes',stats.dupeCount,stats.dupeCount>0?C.red:''],
                ['📐','Width',stats.avgW+'px',''],['📐','Height',stats.avgH+'px',''],['💡','Brightness',stats.avgBrightness,''],
                ['💧','Blurry',stats.blurryCount,stats.blurryCount>0?C.amber:''],['🌑','Dark',stats.darkCount,stats.darkCount>0?C.red:''],
                ['📊','Imbalance',stats.imbalance+'%',stats.imbalance>30?C.amber:''],['♥','Health',stats.health,hc],
              ].map(([icon,label,value,color])=>(
                <div key={label} style={{textAlign:'center',padding:'10px 6px',background:C.surface,borderRadius:'8px',border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:'16px',marginBottom:'3px'}}>{icon}</div>
                  <div style={{fontSize:'14px',fontWeight:800,color:color||C.text}}>{value}</div>
                  <div style={{fontSize:'8px',color:C.muted,marginTop:'1px'}}>{label}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── CLASSES ──────────────────────────────────────────────────── */}
        {stats && view==='classes' && (
          <Card>
            <SectionTitle>Class Distribution</SectionTitle>
            <div style={{display:'grid',gap:'8px'}}>
              {stats.classes.map((cls,i)=>{
                const color=COLORS[i%COLORS.length];const pct=Math.round(cls.count/stats.total*100);const isEd=editCls===cls.name;
                return (
                  <div key={cls.name} style={{padding:'10px 12px',borderRadius:'8px',background:C.surface,border:`1px solid ${C.border}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                      {isEd ? (
                        <div style={{display:'flex',gap:'5px',flex:1}}>
                          <input value={editClsName} onChange={e=>setEditClsName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&renameCls(cls.name,editClsName)}
                            style={{padding:'4px 8px',borderRadius:'4px',border:`1px solid ${C.border}`,fontSize:'11px',flex:1}} autoFocus />
                          <PrimaryBtn onClick={()=>renameCls(cls.name,editClsName)} style={{padding:'4px 10px',fontSize:'10px'}}>✓</PrimaryBtn>
                          <GhostBtn onClick={()=>setEditCls(null)}>✕</GhostBtn>
                        </div>
                      ) : (
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <div style={{width:'10px',height:'10px',borderRadius:'50%',background:color}} />
                          <span style={{fontFamily:'monospace',fontWeight:700,fontSize:'12px'}}>{cls.name}</span>
                          <span style={{fontSize:'10px',color:C.muted}}>{cls.count} · {pct}%</span>
                        </div>
                      )}
                      {!isEd && (
                        <div style={{display:'flex',gap:'5px'}}>
                          <GhostBtn onClick={()=>{setEditCls(cls.name);setEditClsName(cls.name);}} color={C.blue}>✏ Rename</GhostBtn>
                          <GhostBtn onClick={()=>deleteCls(cls.name)} color={C.red}>🗑</GhostBtn>
                        </div>
                      )}
                    </div>
                    <div style={{height:'12px',background:'#E2E8F0',borderRadius:'4px',overflow:'hidden'}}>
                      <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:'4px',minWidth:'2px'}} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ── BROWSE / GRID ─────────────────────────────────────────────── */}
        {stats && view==='grid' && (
          <div>
            <Card style={{marginBottom:'10px'}}>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search…" style={{padding:'6px 10px',borderRadius:'6px',border:`1px solid ${C.border}`,fontSize:'11px',width:'130px'}} />
                <select value={filterCls} onChange={e=>setFilterCls(e.target.value)} style={{padding:'6px',borderRadius:'6px',border:`1px solid ${C.border}`,fontSize:'11px'}}>
                  <option value="all">All classes</option>
                  {stats.classes.map(c=><option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
                </select>
                <select value={filterIss} onChange={e=>setFilterIss(e.target.value)} style={{padding:'6px',borderRadius:'6px',border:`1px solid ${C.border}`,fontSize:'11px'}}>
                  <option value="all">All images</option>
                  <option value="dupes">Duplicates</option>
                  <option value="blurry">Blurry</option>
                  <option value="dark">Dark</option>
                </select>
                {selected.size>0 && <PrimaryBtn onClick={delSel} color={C.red}>🗑 Delete {selected.size}</PrimaryBtn>}
                <span style={{fontSize:'11px',color:C.muted,marginLeft:'auto'}}>{filtered.length} images</span>
              </div>
            </Card>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:'8px'}}>
              {filtered.slice(0,120).map((img,i)=>{
                const ri=images.indexOf(img);const isSel=selected.has(ri);
                return (
                  <div key={i} style={{position:'relative',border:`2px solid ${isSel?C.blue:C.border}`,borderRadius:'8px',overflow:'hidden',cursor:'pointer',transition:'border-color .15s'}}
                    onMouseOver={e=>{if(!isSel)e.currentTarget.style.borderColor=C.teal;}}
                    onMouseOut={e=>{if(!isSel)e.currentTarget.style.borderColor=C.border;}}>
                    <div onClick={e=>{e.stopPropagation();setSelected(prev=>{const n=new Set(prev);n.has(ri)?n.delete(ri):n.add(ri);return n;})}}
                      style={{position:'absolute',top:'4px',left:'4px',zIndex:2,width:'16px',height:'16px',borderRadius:'3px',background:isSel?C.blue:'rgba(255,255,255,.8)',border:`1px solid ${isSel?C.blue:'rgba(0,0,0,.25)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',color:'#fff'}}>
                      {isSel&&'✓'}
                    </div>
                    {/* Click to open edit lightbox */}
                    <div onClick={()=>setLightbox({img,index:ri})} style={{aspectRatio:'1',overflow:'hidden',background:'#E2E8F0'}}>
                      <img src={img.src} alt={img.name} style={{width:'100%',height:'100%',objectFit:'cover',transition:'transform .2s'}}
                        onMouseOver={e=>e.target.style.transform='scale(1.08)'}
                        onMouseOut={e=>e.target.style.transform='scale(1)'} />
                    </div>
                    <div style={{position:'absolute',top:'4px',right:'4px',display:'flex',flexDirection:'column',gap:'2px'}}>
                      {img.isDuplicate&&<span style={{fontSize:'7px',padding:'1px 4px',borderRadius:'2px',background:'#EF4444',color:'#fff',fontWeight:700}}>DUP</span>}
                      {img.isBlurry&&<span style={{fontSize:'7px',padding:'1px 4px',borderRadius:'2px',background:'#F59E0B',color:'#fff',fontWeight:700}}>BLR</span>}
                      {img.isDark&&<span style={{fontSize:'7px',padding:'1px 4px',borderRadius:'2px',background:'#1E293B',color:'#fff',fontWeight:700}}>DRK</span>}
                    </div>
                    <div style={{padding:'5px 6px',background:'#fff'}}>
                      <div style={{fontSize:'9px',color:C.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{img.name}</div>
                      <span style={{fontSize:'10px',color:C.teal,fontWeight:600}}>{img.cls}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {filtered.length>120&&<div style={{textAlign:'center',padding:'12px',color:C.muted,fontSize:'12px'}}>Showing 120/{filtered.length} — use filters to narrow</div>}
          </div>
        )}

        {/* ── QUALITY ──────────────────────────────────────────────────── */}
        {stats && view==='quality' && (
          <div style={{display:'grid',gap:'12px'}}>
            {[
              {label:'🔄 Duplicates',count:stats.dupeCount,filter:img=>img.isDuplicate,color:'#EF4444',onRemove:delDupes},
              {label:'💧 Blurry',count:stats.blurryCount,filter:img=>img.isBlurry,color:'#F59E0B',onRemove:()=>delIssue('blurry')},
              {label:'🌑 Dark',count:stats.darkCount,filter:img=>img.isDark,color:'#1E293B',onRemove:()=>delIssue('dark')},
              {label:'💡 Over-bright',count:images.filter(i=>i.isBright).length,filter:img=>img.isBright,color:'#D97706',onRemove:()=>delIssue('bright')},
            ].map(({label,count,filter,color,onRemove})=>(
              <Card key={label}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                  <div style={{fontWeight:700,color:C.text,fontSize:'13px'}}>{label} ({count})</div>
                  {count>0&&<PrimaryBtn onClick={onRemove} color={color} style={{fontSize:'11px',padding:'5px 14px'}}>🗑 Remove All</PrimaryBtn>}
                </div>
                {count===0?<div style={{color:'#00956B',fontSize:'12px'}}>✅ None found</div>:(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(60px,1fr))',gap:'5px'}}>
                    {images.filter(filter).slice(0,12).map((img,i)=>(
                      <div key={i} style={{border:`2px solid ${color}`,borderRadius:'6px',overflow:'hidden',cursor:'pointer',position:'relative'}} onClick={()=>setLightbox({img,index:images.indexOf(img)})}>
                        <img src={img.src} alt="" style={{width:'100%',aspectRatio:'1',objectFit:'cover'}} />
                        <div onClick={e=>{e.stopPropagation();delImg(images.indexOf(img));}}
                          style={{position:'absolute',top:'2px',right:'2px',background:`${color}dd`,color:'#fff',borderRadius:'2px',padding:'1px 4px',fontSize:'8px',cursor:'pointer',fontWeight:700}}>✕</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* ── CHARTS ───────────────────────────────────────────────────── */}
        {stats && view==='charts' && (
          <div style={{display:'grid',gap:'12px'}}>
            <Card>
              <SectionTitle>Class Distribution</SectionTitle>
              {stats.classes.map((cls,i)=>{const color=COLORS[i%COLORS.length];const pct=Math.round(cls.count/stats.total*100);return(
                <div key={cls.name} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
                  <div style={{width:'90px',fontSize:'10px',color:C.muted,textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flexShrink:0}}>{cls.name}</div>
                  <div style={{flex:1,height:'18px',background:'#F1F5F9',borderRadius:'4px',overflow:'hidden'}}>
                    <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:'4px',minWidth:'2px',display:'flex',alignItems:'center',paddingLeft:'5px'}}>
                      {pct>8&&<span style={{color:'#fff',fontSize:'9px',fontWeight:700}}>{pct}%</span>}
                    </div>
                  </div>
                  <div style={{width:'60px',fontSize:'10px',color:C.muted,flexShrink:0}}>{cls.count} imgs</div>
                </div>
              );})}
            </Card>
            <Card>
              <SectionTitle>Quality Metrics</SectionTitle>
              {[['☀ Brightness',stats.avgBrightness,255,'#F59E0B'],['🔍 Sharpness',Math.min(stats.avgSharpness*10,100),100,'#8B5CF6']].map(([l,v,m,c])=>(
                <div key={l} style={{marginBottom:'12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',marginBottom:'5px'}}>
                    <span style={{fontWeight:700}}>{l}</span><span style={{color:C.muted}}>{Math.round(v)}/{m}</span>
                  </div>
                  <div style={{height:'8px',background:'#F1F5F9',borderRadius:'5px',overflow:'hidden'}}>
                    <div style={{width:`${Math.min(v/m*100,100)}%`,height:'100%',background:c,borderRadius:'5px'}} />
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <SectionTitle>Per-Class Quality</SectionTitle>
              {stats.classes.map((cls,i)=>{const clsImgs=images.filter(img=>img.cls===cls.name);return(
                <div key={cls.name} style={{display:'grid',gridTemplateColumns:'110px repeat(4,1fr)',gap:'8px',padding:'5px 0',borderBottom:`1px solid #F1F5F9`,alignItems:'center'}}>
                  <span style={{fontFamily:'monospace',fontWeight:700,fontSize:'11px',color:COLORS[i%COLORS.length],overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cls.name}</span>
                  <span style={{fontSize:'11px',color:C.muted}}>Dupes: {clsImgs.filter(i=>i.isDuplicate).length}</span>
                  <span style={{fontSize:'11px',color:C.muted}}>Blurry: {clsImgs.filter(i=>i.isBlurry).length}</span>
                  <span style={{fontSize:'11px',color:C.muted}}>Dark: {clsImgs.filter(i=>i.isDark).length}</span>
                  <span style={{fontSize:'11px',color:C.muted}}>Total: {cls.count}</span>
                </div>
              );})}
            </Card>
          </div>
        )}

        {/* ── TOOLS / CONFIGURE ─────────────────────────────────────────── */}
        {stats && view==='universal' && (
          <div style={{display:'grid',gap:'12px'}}>
            {/* Tool tabs */}
            <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
              {[['resize','📐 Resize'],['color','🎨 Colour'],['filter','✨ Filter'],['watermark','💧 Watermark'],['strip','🔒 Strip EXIF'],['convert','🔄 Convert']].map(([id,l])=>(
                <button key={id} onClick={()=>{setToolTab(id);setToolRes(null);}} style={{padding:'7px 14px',borderRadius:'7px',fontSize:'11px',border:'none',cursor:'pointer',fontWeight:toolTab===id?700:400,background:toolTab===id?C.tealDim:'#F1F5F9',color:toolTab===id?'#00956B':C.muted,outline:toolTab===id?`1.5px solid ${C.tealBorder}`:`1px solid ${C.border}`}}>{l}</button>
              ))}
            </div>

            <Card>
              {/* ── Resize ── */}
              {toolTab==='resize' && (
                <div>
                  <SectionTitle>📐 Resize All Images</SectionTitle>
                  {/* Preset size chips */}
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'14px'}}>
                    {[{s:224,l:'224 — ImageNet'},{s:256,l:'256'},{s:128,l:'128'},{s:512,l:'512'},{s:64,l:'64 — Tiny'}].map(({s,l})=>(
                      <button key={s} onClick={()=>{setResizeW(s);setResizeH(s);}} style={{padding:'5px 12px',borderRadius:'6px',fontSize:'11px',border:`1px solid ${resizeW===s?C.teal:C.border}`,background:resizeW===s?C.tealDim:C.surface,cursor:'pointer',color:resizeW===s?C.teal:C.muted,fontWeight:resizeW===s?700:400}}>{l}</button>
                    ))}
                  </div>
                  <Slider label="Width"  value={resizeW} min={32} max={1024} step={32} onChange={v=>{setResizeW(v);if(lockAR&&stats.avgW&&stats.avgH)setResizeH(Math.round(v*stats.avgH/stats.avgW));}} unit="px" />
                  <Slider label="Height" value={resizeH} min={32} max={1024} step={32} onChange={setResizeH} unit="px" />
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
                    <input type="checkbox" id="lockAR" checked={lockAR} onChange={e=>setLockAR(e.target.checked)} style={{accentColor:C.teal}} />
                    <label htmlFor="lockAR" style={{fontSize:'12px',color:C.muted,cursor:'pointer'}}>Lock aspect ratio</label>
                    <span style={{fontSize:'11px',color:C.muted,marginLeft:'auto'}}>→ {resizeW}×{lockAR?Math.round(resizeH*resizeW/resizeW):resizeH}px</span>
                  </div>
                  <Slider label="Output quality" value={quality} min={10} max={100} onChange={setQuality} unit="%" presets={[{v:70,label:'70%'},{v:85,label:'85%'},{v:95,label:'95%'}]} />
                  <PrimaryBtn disabled={!!busy} onClick={()=>runTool('Resize',el=>resizeW,el=>lockAR?Math.round(el.naturalHeight*resizeW/Math.max(el.naturalWidth,1)):resizeH,()=>'none')}>
                    {busy?'⏳ Processing…':'▶ Preview Resize'}
                  </PrimaryBtn>
                </div>
              )}

              {/* ── Colour ── */}
              {toolTab==='color' && (
                <div>
                  <SectionTitle>🎨 Colour Adjustments</SectionTitle>
                  <Slider label="Brightness" value={brightness} min={10} max={300} onChange={setBrightness} unit="%" presets={[{v:100,label:'100'},{v:130,label:'130'},{v:80,label:'80'}]} />
                  <Slider label="Contrast"   value={contrast}   min={10} max={300} onChange={setContrast}   unit="%" presets={[{v:100,label:'100'},{v:130,label:'130'}]} />
                  <Slider label="Saturation" value={saturation} min={0}  max={300} onChange={setSaturation} unit="%" presets={[{v:100,label:'100'},{v:0,label:'Gray'},{v:200,label:'Vivid'}]} />
                  <Slider label="Hue Rotate" value={hue}        min={0}  max={360} onChange={setHue}        unit="°" presets={[{v:0,label:'0°'},{v:90,label:'90°'},{v:180,label:'180°'}]} />
                  {/* Live filter preview strip */}
                  <div style={{padding:'10px',background:C.surface,borderRadius:'7px',marginBottom:'12px',display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    {[['Warm',{b:110,s:120,h:10,c:100}],['Cool',{b:90,s:90,h:200,c:110}],['Vivid',{s:200,c:130,b:105,h:0}],['Film',{c:110,s:80,b:95,h:15}],['Reset',{b:100,c:100,s:100,h:0}]].map(([nm,v])=>(
                      <button key={nm} onClick={()=>{setBrightness(v.b);setContrast(v.c);setSaturation(v.s);setHue(v.h);}} style={{fontSize:'10px',padding:'3px 10px',borderRadius:'5px',border:`1px solid ${C.border}`,background:'#fff',cursor:'pointer',color:C.muted}}>{nm}</button>
                    ))}
                  </div>
                  <PrimaryBtn disabled={!!busy} onClick={()=>runTool('Colour adjust',null,null,()=>`brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg)`)}>▶ Preview</PrimaryBtn>
                </div>
              )}

              {/* ── Filter ── */}
              {toolTab==='filter' && (
                <div>
                  <SectionTitle>✨ One-Click Filters</SectionTitle>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                    {[['✨ Sharpen','contrast(130%) saturate(110%)'],['💧 Soft Blur','blur(1.5px)'],['⬛ Grayscale','grayscale(100%)'],['🟫 Sepia','sepia(80%)'],['🔄 Invert','invert(100%)'],['🌗 High Contrast','contrast(200%) brightness(90%)'],['🌅 Warm Film','sepia(30%) saturate(120%) brightness(105%)'],['🌊 Cool Tone','hue-rotate(200deg) saturate(80%)']].map(([nm,filter])=>(
                      <button key={nm} onClick={()=>runTool(nm,null,null,()=>filter)} disabled={!!busy}
                        style={{padding:'12px',borderRadius:'8px',border:`1px solid ${C.border}`,background:'#fff',cursor:busy?'wait':'pointer',fontSize:'12px',fontWeight:600,color:C.text,transition:'all .15s'}}
                        onMouseOver={e=>{if(!busy){e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.background=C.tealDim;}}}
                        onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background='#fff';}}>
                        {nm}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Watermark ── */}
              {toolTab==='watermark' && (
                <div>
                  <SectionTitle>💧 Add Watermark</SectionTitle>
                  <div style={{marginBottom:'12px'}}>
                    <div style={{fontSize:'11px',fontWeight:600,color:C.text,marginBottom:'5px'}}>Watermark Text</div>
                    <input value={wText} onChange={e=>setWText(e.target.value)} placeholder="Your text here"
                      style={{padding:'8px 12px',borderRadius:'7px',border:`1px solid ${C.border}`,fontSize:'12px',width:'100%',boxSizing:'border-box'}} />
                  </div>
                  <Slider label="Opacity" value={wOpacity} min={10} max={100} onChange={setWOpacity} unit="%" presets={[{v:30,label:'30'},{v:60,label:'60'},{v:90,label:'90'}]} />
                  <Slider label="Font Size" value={wSize} min={10} max={80} onChange={setWSize} unit="px" presets={[{v:16,label:'16'},{v:24,label:'24'},{v:40,label:'40'}]} />
                  <div style={{marginBottom:'12px'}}>
                    <div style={{fontSize:'11px',fontWeight:600,color:C.text,marginBottom:'6px'}}>Position</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'4px',maxWidth:'280px'}}>
                      {[['top-left','↖'],['top-center','↑'],['top-right','↗'],['middle-left','←'],['middle','·'],['middle-right','→'],['bottom-left','↙'],['bottom-center','↓'],['bottom-right','↘']].map(([pos,arrow])=>(
                        <button key={pos} onClick={()=>setWPos(pos)} style={{padding:'8px 4px',borderRadius:'5px',fontSize:'16px',border:`1px solid ${wPos===pos?C.teal:C.border}`,background:wPos===pos?C.tealDim:'#F8FAFC',cursor:'pointer',color:wPos===pos?C.teal:C.muted}}>{arrow}</button>
                      ))}
                    </div>
                  </div>
                  {/* Live preview of watermark */}
                  {images[0] && (
                    <div style={{marginBottom:'12px',padding:'10px',background:C.surface,borderRadius:'8px',border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:'10px',color:C.muted,marginBottom:'6px',fontWeight:600}}>PREVIEW (simulated)</div>
                      <div style={{position:'relative',display:'inline-block',maxWidth:'200px'}}>
                        <img src={images[0].src} alt="" style={{width:'100%',display:'block',borderRadius:'6px',opacity:0.9}} />
                        <div style={{
                          position:'absolute',
                          ...(wPos.includes('bottom')?{bottom:'8px'}:wPos.includes('middle')?{top:'50%',transform:'translateY(-50%)'}:{top:'8px'}),
                          ...(wPos.includes('right')?{right:'8px',textAlign:'right'}:wPos.includes('center')?{left:'50%',transform:(wPos.includes('middle')?'translate(-50%,-50%)':'translateX(-50%)'),textAlign:'center'}:{left:'8px',textAlign:'left'}),
                          color:'#fff',fontWeight:'bold',fontSize:`${Math.round(wSize*0.6)}px`,
                          textShadow:'0 1px 4px rgba(0,0,0,.8)',
                          opacity:wOpacity/100,
                          pointerEvents:'none',
                        }}>{wText}</div>
                      </div>
                    </div>
                  )}
                  <PrimaryBtn disabled={!!busy} onClick={()=>runTool('Watermark',el=>el.naturalWidth,el=>el.naturalHeight,null,(el,W,H)=>applyWatermark(el,W,H,wText,wPos,wOpacity,wSize))}>▶ Preview Watermark</PrimaryBtn>
                </div>
              )}

              {/* ── Strip EXIF ── */}
              {toolTab==='strip' && (
                <div>
                  <SectionTitle>🔒 Strip EXIF / Metadata</SectionTitle>
                  <p style={{fontSize:'12px',color:C.muted,lineHeight:1.7,marginBottom:'14px'}}>Removes all EXIF metadata — GPS location, camera model, timestamps, author info — by redrawing through canvas.</p>
                  <div style={{padding:'14px',background:C.surface,borderRadius:'8px',border:`1px solid ${C.border}`,marginBottom:'14px'}}>
                    {['🛰 GPS / Location data','📷 Camera model & serial','📅 Date & timestamps','🔧 ISO, aperture, shutter','👤 Author / copyright'].map(item=>(
                      <div key={item} style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'12px',color:C.muted,padding:'2px 0'}}><span style={{color:'#DC2626'}}>✓</span>{item}</div>
                    ))}
                  </div>
                  <PrimaryBtn disabled={!!busy} onClick={()=>runTool('Strip EXIF',null,null,()=>'none')}>▶ Strip EXIF from All</PrimaryBtn>
                </div>
              )}

              {/* ── Convert ── */}
              {toolTab==='convert' && (
                <div>
                  <SectionTitle>🔄 Format Conversion</SectionTitle>
                  <Slider label="JPEG Quality" value={quality} min={10} max={100} onChange={setQuality} unit="%" presets={[{v:70,label:'70%'},{v:85,label:'85%'},{v:95,label:'95%'}]} />
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'12px'}}>
                    {[['📷 JPEG','.jpg'],['🖼 PNG','.png'],['⚡ WebP','.webp']].map(([nm,ext])=>(
                      <button key={nm} onClick={()=>runTool(`Convert ${nm}`,null,null,()=>'none')} disabled={!!busy}
                        style={{padding:'14px',borderRadius:'8px',border:`1px solid ${C.border}`,background:'#fff',cursor:busy?'wait':'pointer',fontWeight:700,fontSize:'13px',color:C.text,transition:'all .15s'}}
                        onMouseOver={e=>{e.currentTarget.style.borderColor=C.teal;}}
                        onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;}}>
                        {nm}<div style={{fontSize:'10px',color:C.muted,fontWeight:400,marginTop:'2px'}}>{ext}</div>
                      </button>
                    ))}
                  </div>
                  <div style={{padding:'10px 12px',background:C.tealDim,borderRadius:'7px',fontSize:'12px',color:'#00956B'}}>⚡ WebP is typically 25–35% smaller than JPEG at equal quality.</div>
                </div>
              )}
            </Card>

            {/* Preview count picker */}
            <Card style={{padding:'12px 18px'}}>
              <CountPicker label="Preview count:" value={prevCount} onChange={setPrevCount} min={1} max={Math.min(20,images.length)} />
            </Card>

            {/* Tool result preview */}
            {toolRes && (
              <Card style={{border:toolRes.applied?`2px solid ${C.teal}`:`1px solid ${C.border}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px',flexWrap:'wrap',gap:'8px'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:'13px',color:C.text}}>
                      {toolRes.applied?'✅ Applied:':'👁 Preview:'} {toolRes.label}
                    </div>
                    <div style={{fontSize:'11px',color:C.muted,marginTop:'3px'}}>
                      {toolRes.applied
                        ?`Applied to all ${toolRes.total} images — hit Undo to revert`
                        :`First ${toolRes.images.length} images — click Apply to process all ${toolRes.total}`}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    {!toolRes.applied && <PrimaryBtn onClick={applyToolToAll} disabled={!!busy}>{busy?'⏳':'✅ Apply to All '+toolRes.total}</PrimaryBtn>}
                    {toolRes.applied && history.length>0 && (
                      <GhostBtn color={C.amber} onClick={()=>{const p=history[history.length-1];setHistory(h=>h.slice(0,-1));setImages(p);setStats(calcStats(p));setToolRes(null);}}>↩ Undo</GhostBtn>
                    )}
                    <GhostBtn onClick={downloadToolRes} color={C.blue}>⬇ Download</GhostBtn>
                    <GhostBtn onClick={()=>setToolRes(null)}>✕</GhostBtn>
                  </div>
                </div>
                {/* Before / After grid */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:'8px'}}>
                  {toolRes.images.map((img,i)=>(
                    <div key={i} style={{borderRadius:'8px',overflow:'hidden',border:`1px solid ${C.border}`,cursor:'pointer'}}
                      onClick={()=>setLightbox({img:{...img,name:img.name,cls:img.cls},index:i})}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',height:'90px'}}>
                        <div style={{position:'relative',overflow:'hidden'}}>
                          <img src={img.orig||img.src} alt="" style={{width:'100%',height:'90px',objectFit:'cover',display:'block'}} />
                          <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,.55)',color:'#fff',fontSize:'7px',textAlign:'center',padding:'2px'}}>Before</div>
                        </div>
                        <div style={{position:'relative',overflow:'hidden',borderLeft:`1px solid ${C.border}`}}>
                          <img src={img.src} alt="" style={{width:'100%',height:'90px',objectFit:'cover',display:'block'}} />
                          <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,203,168,.7)',color:'#fff',fontSize:'7px',textAlign:'center',padding:'2px'}}>After</div>
                        </div>
                      </div>
                      <div style={{padding:'3px 6px',fontSize:'8px',color:C.muted,borderTop:`1px solid #F1F5F9`,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {img.name} {img.w&&img.h?`(${img.w}×${img.h})`:''} <span style={{color:'#94A3B8',fontSize:'7px'}}>Click to edit</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── AUGMENTATION ─────────────────────────────────────────────── */}
        {stats && view==='augment' && (
          <Card>
            <SectionTitle>Augmentation Preview</SectionTitle>
            <p style={{fontSize:'12px',color:C.muted,lineHeight:1.7,marginBottom:'14px'}}>Select an image below → see 6 augmented variants → download any individually or run all via Pipeline.</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(68px,1fr))',gap:'6px',marginBottom:'14px'}}>
              {images.slice(0,20).map((img,i)=>(
                <div key={i} onClick={()=>setAugImg(img)} style={{border:`2px solid ${augImg?.src===img.src?C.teal:C.border}`,borderRadius:'6px',overflow:'hidden',cursor:'pointer',transition:'border-color .15s'}}>
                  <img src={img.src} alt="" style={{width:'100%',aspectRatio:'1',objectFit:'cover'}} />
                </div>
              ))}
            </div>
            {augImg ? (
              <div>
                <div style={{display:'flex',gap:'8px',marginBottom:'14px',flexWrap:'wrap',alignItems:'center'}}>
                  <PrimaryBtn onClick={()=>setAugSeed(s=>s+1)}>🔄 New Seed #{augSeed}</PrimaryBtn>
                  {[0,1,2,3,4,5].map(v=>(
                    <button key={v} onClick={async()=>{
                      const el=new window.Image();el.src=augImg.src;
                      await new Promise(r=>{el.onload=r;});
                      const {cv}=applyFilter(el,`hue-rotate(${((augSeed+v)*47)%40}deg) brightness(${85+((augSeed+v)*13)%30}%) contrast(${88+((augSeed+v)*17)%24}%) saturate(${80+((augSeed+v)*11)%40}%)`,el.naturalWidth,el.naturalHeight);
                      const a=document.createElement('a');a.href=cv.toDataURL('image/jpeg',.9);a.download=`aug_${v+1}_seed${augSeed}.jpg`;a.click();
                    }} style={{padding:'5px 10px',borderRadius:'6px',background:C.tealDim,color:'#00956B',border:`1px solid ${C.tealBorder}`,fontSize:'10px',fontWeight:600,cursor:'pointer'}}>⬇ #{v+1}</button>
                  ))}
                </div>
                <div style={{display:'flex',gap:'10px',overflowX:'auto',paddingBottom:'4px'}}>
                  <div style={{flexShrink:0,textAlign:'center'}}>
                    <div style={{fontSize:'9px',fontWeight:700,color:C.muted,marginBottom:'4px',textTransform:'uppercase'}}>Original</div>
                    <img src={augImg.src} alt="" style={{width:'160px',height:'160px',objectFit:'cover',borderRadius:'8px',border:`1px solid ${C.border}`,display:'block'}} />
                  </div>
                  {[0,1,2,3,4,5].map(v=>{
                    const h=((augSeed+v)*47)%40,br=85+((augSeed+v)*13)%30,co=88+((augSeed+v)*17)%24,sa=80+((augSeed+v)*11)%40,rot=(((augSeed+v)*7)%12)-6,flip=(augSeed+v)%2===0?-1:1;
                    return(
                      <div key={`${augSeed}-${v}`} style={{flexShrink:0,textAlign:'center'}}>
                        <div style={{fontSize:'9px',fontWeight:700,color:C.teal,marginBottom:'4px',textTransform:'uppercase'}}>Aug #{v+1}</div>
                        <img src={augImg.src} alt="" style={{width:'160px',height:'160px',objectFit:'cover',borderRadius:'8px',border:`2px solid ${C.tealBorder}`,display:'block',
                          filter:`hue-rotate(${h}deg) brightness(${br}%) contrast(${co}%) saturate(${sa}%)`,transform:`rotate(${rot}deg) scaleX(${flip})`}} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:'32px',color:C.muted,fontSize:'12px',background:C.surface,borderRadius:'8px'}}>👆 Select an image above to preview augmentations</div>
            )}
          </Card>
        )}

        {/* ── SPLIT ───────────────────────────────────────────────────── */}
        {stats && view==='split' && (
          <Card>
            <SectionTitle>Train / Validation / Test Split</SectionTitle>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'14px',marginBottom:'14px'}}>
              {[['Train',0,'#00CBA8'],['Validation',1,'#3B82F6'],['Test',2,'#F59E0B']].map(([label,idx,color])=>(
                <div key={label}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                    <span style={{fontSize:'12px',color,fontWeight:700}}>{label}</span>
                    <span style={{fontSize:'12px',fontWeight:700}}>{split[idx]}%</span>
                  </div>
                  <input type="range" min={5} max={90} value={split[idx]} onChange={e=>{
                    const v=Number(e.target.value),ns=[...split];ns[idx]=v;
                    const oth=[0,1,2].filter(i=>i!==idx);const s=ns[oth[0]]+ns[oth[1]];
                    if(s>0){ns[oth[0]]=Math.round((100-v)*ns[oth[0]]/s);ns[oth[1]]=100-v-ns[oth[0]];}
                    setSplit(ns);
                  }} style={{width:'100%',accentColor:color}} />
                  <div style={{fontSize:'11px',color:C.muted,marginTop:'3px'}}>{Math.round(stats.total*split[idx]/100)} images</div>
                </div>
              ))}
            </div>
            <div style={{height:'10px',borderRadius:'6px',overflow:'hidden',display:'flex',marginBottom:'14px'}}>
              {[['#00CBA8',0],['#3B82F6',1],['#F59E0B',2]].map(([c,i])=><div key={i} style={{width:`${split[i]}%`,background:c,transition:'width .3s'}} />)}
            </div>
            {stats.classes.map((cls,i)=>(
              <div key={cls.name} style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr 1fr',gap:'10px',padding:'5px 0',borderBottom:`1px solid #F1F5F9`,alignItems:'center'}}>
                <span style={{fontFamily:'monospace',fontWeight:700,fontSize:'11px',color:COLORS[i%COLORS.length],overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cls.name}</span>
                <span style={{color:'#00CBA8',fontSize:'11px'}}>Train: {Math.round(cls.count*split[0]/100)}</span>
                <span style={{color:'#3B82F6',fontSize:'11px'}}>Val: {Math.round(cls.count*split[1]/100)}</span>
                <span style={{color:'#F59E0B',fontSize:'11px'}}>Test: {Math.round(cls.count*split[2]/100)}</span>
              </div>
            ))}
          </Card>
        )}

        {/* ── ML CODE ──────────────────────────────────────────────────── */}
        {stats && view==='models' && (
          <Card>
            <SectionTitle>🤖 ML Code Generator</SectionTitle>
            <div style={{background:'#1E1E2E',borderRadius:'10px',padding:'16px',overflowX:'auto',marginBottom:'12px'}}>
              <pre style={{color:'#A6E22E',fontSize:'10px',lineHeight:1.85,margin:0,fontFamily:'monospace',whiteSpace:'pre'}}>{`# EfficientNet B0 — ${stats.classes.length}-class classification
import torch
from torchvision import datasets, transforms, models

CLASSES = [${stats.classes.map(c=>"'"+c.name+"'").join(', ')}]
IMG_SIZE = ${Math.max(stats.avgW||224,32)}

transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225]),
])

dataset = datasets.ImageFolder('dataset/', transform=transform)
train_n = int(${split[0]/100} * len(dataset))
train, val = torch.utils.data.random_split(dataset, [train_n, len(dataset)-train_n])
loader  = torch.utils.data.DataLoader(train, batch_size=32, shuffle=True)

model = models.efficientnet_b0(pretrained=True)
model.classifier[1] = torch.nn.Linear(1280, ${stats.classes.length})
optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
device    = 'cuda' if torch.cuda.is_available() else 'cpu'
model.to(device)

for epoch in range(15):
    for X, y in loader:
        X, y = X.to(device), y.to(device)
        loss = criterion(model(X), y)
        optimizer.zero_grad(); loss.backward(); optimizer.step()
torch.save(model.state_dict(), 'model.pth')`}</pre>
            </div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              <PrimaryBtn onClick={()=>navigator.clipboard?.writeText(`CLASSES=${JSON.stringify(stats.classes.map(c=>c.name))}`).then(()=>alert('Copied!'))}>📋 Copy Config</PrimaryBtn>
              <PrimaryBtn color={C.blue} onClick={()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([`CLASSES=${JSON.stringify(stats.classes.map(c=>c.name))}
IMG_SIZE=${Math.max(stats.avgW||224,32)}`],{type:'text/plain'}));a.download='config.py';a.click();}}>⬇ config.py</PrimaryBtn>
            </div>
          </Card>
        )}

        {/* ── ADVANCED ─────────────────────────────────────────────────── */}
        {stats && view==='advanced' && (
          <div>
            <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'12px'}}>
              {[['👤 Faces','faces'],['📊 PCA','pca'],['🎨 Colour','icc'],['🔊 Noise','noise'],['📐 Aspect','aspect'],['🏷 Annotate','annotate']].map(([l,id])=>(
                <button key={id} onClick={()=>setAdvTab(id)} style={{padding:'7px 14px',borderRadius:'7px',fontSize:'11px',border:'none',cursor:'pointer',fontWeight:advTab===id?700:400,background:advTab===id?C.tealDim:'#F1F5F9',color:advTab===id?'#00956B':C.muted,outline:advTab===id?`1.5px solid ${C.tealBorder}`:`1px solid ${C.border}`}}>{l}</button>
              ))}
            </div>

            {/* Face Detection */}
            {advTab==='faces' && (
              <Card>
                <SectionTitle>👤 Face Detection</SectionTitle>
                <p style={{fontSize:'12px',color:C.muted,marginBottom:'12px',lineHeight:1.6}}>Skin-tone proxy detection using canvas pixel analysis. Adjust sensitivity below.</p>
                <Slider label="Detection sensitivity" value={faceThresh} min={2} max={30} onChange={setFaceThresh} unit="%" presets={[{v:5,label:'High'},{v:10,label:'Med'},{v:20,label:'Low'}]} />
                {!faceRes ? <PrimaryBtn onClick={runFaces} disabled={!!busy}>{busy?'⏳ Scanning…':'🔍 Scan All Images'}</PrimaryBtn> : (
                  <div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'12px'}}>
                      {[['👥','Faces found',faceRes.filter(i=>i.faceCount>0).length,C.teal],['🚫','No faces',faceRes.filter(i=>i.faceCount===0).length,C.muted],['📊','Detection %',Math.round(faceRes.filter(i=>i.faceCount>0).length/faceRes.length*100)+'%',C.blue]].map(([icon,l,v,c])=>(
                        <div key={l} style={{textAlign:'center',padding:'10px',background:C.surface,borderRadius:'8px',border:`1px solid ${C.border}`}}>
                          <div style={{fontSize:'18px'}}>{icon}</div><div style={{fontSize:'15px',fontWeight:800,color:c}}>{v}</div><div style={{fontSize:'9px',color:C.muted}}>{l}</div>
                        </div>
                      ))}
                    </div>
                    {faceRes.filter(i=>i.faceCount>0).length>0&&(
                      <div style={{marginBottom:'10px'}}>
                        <div style={{fontSize:'11px',fontWeight:600,marginBottom:'6px'}}>Detected:</div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(58px,1fr))',gap:'5px'}}>
                          {faceRes.filter(i=>i.faceCount>0).slice(0,12).map((img,i)=>(
                            <div key={i} onClick={()=>setLightbox({img,index:images.indexOf(img)})} style={{border:`2px solid ${C.teal}`,borderRadius:'6px',overflow:'hidden',cursor:'pointer'}}>
                              <img src={img.src} alt="" style={{width:'100%',aspectRatio:'1',objectFit:'cover'}} />
                              <div style={{fontSize:'8px',textAlign:'center',padding:'2px',background:'#fff',color:C.teal}}>{img.skinRatio}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                      <PrimaryBtn onClick={()=>{setFaceRes(null);runFaces();}}>🔄 Re-scan</PrimaryBtn>
                      <PrimaryBtn color={C.red} onClick={()=>{const u=images.filter((_,idx)=>faceRes[idx]&&faceRes[idx].faceCount>0);setImages(u);setStats(calcStats(u));setFaceRes(null);}}>Keep Faces Only</PrimaryBtn>
                      <PrimaryBtn color={C.amber} onClick={()=>{const u=images.filter((_,idx)=>faceRes[idx]&&faceRes[idx].faceCount===0);setImages(u);setStats(calcStats(u));setFaceRes(null);}}>Remove Faces</PrimaryBtn>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* PCA */}
            {advTab==='pca' && (
              <Card>
                <SectionTitle>📊 PCA Scatter Plot</SectionTitle>
                <p style={{fontSize:'12px',color:C.muted,marginBottom:'12px',lineHeight:1.6}}>Principal Component Analysis of image colour/brightness features. Points close together are visually similar.</p>
                {!pcaPts ? <PrimaryBtn onClick={runPCA}>🔬 Run PCA</PrimaryBtn> : pcaPts.length===0 ? (
                  <div style={{color:'#DC2626',fontSize:'12px'}}>Need ≥ 4 images with computed features.</div>
                ) : (
                  <div>
                    {(()=>{
                      const xs=pcaPts.map(p=>p.x),ys=pcaPts.map(p=>p.y);
                      const xMin=Math.min(...xs),xMax=Math.max(...xs,xMin+0.001);
                      const yMin=Math.min(...ys),yMax=Math.max(...ys,yMin+0.001);
                      const labels=[...new Set(pcaPts.map(p=>p.cls))];
                      const sx=x=>((x-xMin)/(xMax-xMin))*380+10;
                      const sy=y=>((y-yMin)/(yMax-yMin))*250+10;
                      return React.createElement('div',{style:{background:C.surface,borderRadius:'8px',border:`1px solid ${C.border}`,padding:'6px',marginBottom:'10px',maxWidth:'500px'}},
                        React.createElement('svg',{width:'100%',viewBox:'0 0 400 270',style:{display:'block',maxHeight:'270px'}},
                          pcaPts.map((p,i)=>React.createElement('circle',{key:i,cx:sx(p.x),cy:sy(p.y),r:6,fill:COLORS[labels.indexOf(p.cls)%COLORS.length],opacity:.8,stroke:'#fff',strokeWidth:1},React.createElement('title',null,p.name+' ('+p.cls+')')))
                        )
                      );
                    })()}
                    <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginBottom:'10px'}}>
                      {[...new Set(pcaPts.map(p=>p.cls))].map((cls,i)=>(
                        <div key={cls} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',color:C.muted}}>
                          <div style={{width:'10px',height:'10px',borderRadius:'50%',background:COLORS[i%COLORS.length]}} />{cls}
                        </div>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                      <PrimaryBtn onClick={runPCA}>🔄 Refresh</PrimaryBtn>
                      <PrimaryBtn onClick={()=>{const csv='name,class,pc1,pc2\n'+pcaPts.map(p=>`${p.name},${p.cls},${p.x.toFixed(4)},${p.y.toFixed(4)}`).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='pca.csv';a.click();}} color={C.blue}>⬇ CSV</PrimaryBtn>
                      <GhostBtn onClick={()=>setPcaPts(null)}>✕ Clear</GhostBtn>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* ICC */}
            {advTab==='icc' && (
              <Card>
                <SectionTitle>🎨 Colour Mode Analysis</SectionTitle>
                {!iccRes ? <PrimaryBtn onClick={runICC} disabled={!!busy}>{busy?'⏳':'Analyse'}</PrimaryBtn> : (
                  <div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:'8px',marginBottom:'12px'}}>
                      {Object.entries(iccRes.modes).map(([mode,count])=>(
                        <div key={mode} style={{textAlign:'center',padding:'12px',background:C.surface,borderRadius:'8px',border:`1px solid ${C.border}`}}>
                          <div style={{fontSize:'16px',fontWeight:800,color:C.teal}}>{count}</div>
                          <div style={{fontSize:'10px',color:C.muted,marginTop:'3px'}}>{mode}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                      <PrimaryBtn onClick={runICC}>🔄 Re-analyse</PrimaryBtn>
                      {iccRes.modes['Grayscale']>0&&<PrimaryBtn color={C.red} onClick={()=>{const gray=new Set(iccRes.perImg.filter(p=>p.mode==='Grayscale').map(p=>p.name));const u=images.filter(i=>!gray.has(i.name));setImages(u);setStats(calcStats(u));setIccRes(null);}}>Remove Grayscale ({iccRes.modes['Grayscale']})</PrimaryBtn>}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Noise */}
            {advTab==='noise' && (
              <Card>
                <SectionTitle>🔊 Noise Analysis</SectionTitle>
                {!noiseRes ? <PrimaryBtn onClick={runNoise} disabled={!!busy}>{busy?'⏳':'Analyse'}</PrimaryBtn> : (
                  <div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'12px'}}>
                      {[['🔊','Noisy',noiseRes.noisy,C.red],['✅','Clean',noiseRes.images.length-noiseRes.noisy,C.teal],['📊','Avg Noise',noiseRes.avg,C.blue]].map(([icon,l,v,c])=>(
                        <div key={l} style={{textAlign:'center',padding:'10px',background:C.surface,borderRadius:'8px',border:`1px solid ${C.border}`}}><div style={{fontSize:'18px'}}>{icon}</div><div style={{fontSize:'15px',fontWeight:800,color:c}}>{v}</div><div style={{fontSize:'9px',color:C.muted}}>{l}</div></div>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                      <PrimaryBtn onClick={runNoise}>🔄 Re-analyse</PrimaryBtn>
                      {noiseRes.noisy>0&&<PrimaryBtn color={C.red} onClick={()=>{const noisy=new Set(noiseRes.images.filter(i=>i.isNoisy).map(i=>i.src));const u=images.filter(i=>!noisy.has(i.src));setImages(u);setStats(calcStats(u));setNoiseRes(null);}}>Remove Noisy ({noiseRes.noisy})</PrimaryBtn>}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Aspect Ratios */}
            {advTab==='aspect' && (
              <Card>
                <SectionTitle>📐 Aspect Ratio Analysis</SectionTitle>
                {!aspectRes ? <PrimaryBtn onClick={runAspect}>Analyse</PrimaryBtn> : (
                  <div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
                      <div style={{textAlign:'center',padding:'12px',background:C.surface,borderRadius:'8px',border:`1px solid ${C.border}`}}><div style={{fontSize:'20px',fontWeight:800,color:aspectRes.unique>3?C.amber:C.teal}}>{aspectRes.unique}</div><div style={{fontSize:'10px',color:C.muted}}>unique ratios</div></div>
                      <div style={{textAlign:'center',padding:'12px',background:C.surface,borderRadius:'8px',border:`1px solid ${C.border}`}}><div style={{fontSize:'16px',fontWeight:800}}>{aspectRes.ratios[0]?.[0]||'—'}</div><div style={{fontSize:'10px',color:C.muted}}>most common</div></div>
                    </div>
                    {aspectRes.ratios.slice(0,10).map(([ratio,count],i)=>{const pct=Math.round(count/images.length*100);return(
                      <div key={ratio} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
                        <div style={{width:'60px',fontSize:'10px',color:C.muted,textAlign:'right',fontFamily:'monospace',flexShrink:0}}>{ratio}</div>
                        <div style={{flex:1,height:'14px',background:'#F1F5F9',borderRadius:'3px',overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:COLORS[i%COLORS.length],borderRadius:'3px',minWidth:'2px'}} /></div>
                        <div style={{width:'60px',fontSize:'10px',color:C.muted,flexShrink:0}}>{count} ({pct}%)</div>
                      </div>
                    );})}
                    <PrimaryBtn onClick={runAspect} style={{marginTop:'10px'}}>🔄 Refresh</PrimaryBtn>
                  </div>
                )}
              </Card>
            )}

            {/* BBox Annotation — canvas-based */}
            {advTab==='annotate' && (
              <Card>
                <SectionTitle>🏷 Bounding Box Annotation</SectionTitle>
                {/* Class selector */}
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'12px',alignItems:'center'}}>
                  <span style={{fontSize:'11px',color:C.muted,fontWeight:600,flexShrink:0}}>Active class:</span>
                  {annotClsList.map((cls,i)=>(
                    <button key={cls} onClick={()=>setAnnotCls(cls)} style={{padding:'5px 12px',borderRadius:'5px',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:annotCls===cls?700:400,
                      background:annotCls===cls?COLORS[i%COLORS.length]+'20':'#F8FAFC',color:annotCls===cls?COLORS[i%COLORS.length]:C.muted,
                      outline:annotCls===cls?`1.5px solid ${COLORS[i%COLORS.length]}`:`1px solid ${C.border}`}}>{cls}</button>
                  ))}
                  {!annotCls && annotClsList[0] && <button onClick={()=>setAnnotCls(annotClsList[0])} style={{fontSize:'10px',color:C.teal,background:'none',border:'none',cursor:'pointer'}}>← Select a class to start</button>}
                </div>
                <div style={{padding:'8px 12px',background:'rgba(0,203,168,.06)',border:`1px solid ${C.tealBorder}`,borderRadius:'7px',fontSize:'11px',color:'#00956B',marginBottom:'12px'}}>
                  ✏ <strong>Draw:</strong> Click and drag on the image &nbsp;·&nbsp; <strong>Delete box:</strong> Click the ✕ on any box &nbsp;·&nbsp; <strong>Switch class:</strong> Click class button above
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 70px',gap:'12px',alignItems:'start'}}>
                  <div>
                    {annotCls ? (
                      <CanvasAnnotator
                        img={images[annotSel]}
                        boxes={annotBoxes[annotSel]||[]}
                        onAddBox={addAnnotBox}
                        onDelBox={delAnnotBox}
                        annotCls={annotCls}
                        clsColors={clsColors} />
                    ) : (
                      <div style={{padding:'32px',textAlign:'center',background:C.surface,borderRadius:'8px',border:`1px dashed ${C.border}`,color:C.muted,fontSize:'12px'}}>Select a class above to start annotating</div>
                    )}
                    {/* Box count */}
                    <div style={{marginTop:'8px',fontSize:'11px',color:C.muted}}>
                      Boxes on this image: <strong>{(annotBoxes[annotSel]||[]).length}</strong> · Total: <strong>{Object.values(annotBoxes).flat().length}</strong>
                    </div>
                  </div>
                  {/* Image strip */}
                  <div style={{display:'flex',flexDirection:'column',gap:'4px',maxHeight:'400px',overflowY:'auto'}}>
                    {images.slice(0,30).map((img,i)=>(
                      <div key={i} onClick={()=>setAnnotSel(i)} style={{position:'relative',flexShrink:0,cursor:'pointer',border:`2px solid ${i===annotSel?C.teal:C.border}`,borderRadius:'5px',overflow:'hidden'}}>
                        <img src={img.src} alt="" style={{width:'60px',height:'60px',objectFit:'cover',display:'block'}} />
                        {(annotBoxes[i]||[]).length>0&&<div style={{position:'absolute',bottom:'2px',right:'2px',background:C.teal,color:'#fff',borderRadius:'2px',fontSize:'8px',padding:'0 3px',fontWeight:700}}>{(annotBoxes[i]||[]).length}</div>}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{marginTop:'12px',display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  <PrimaryBtn onClick={()=>exportAnnot('yolo')}>⬇ YOLO .txt</PrimaryBtn>
                  <PrimaryBtn onClick={()=>exportAnnot('coco')} color={C.blue}>⬇ COCO JSON</PrimaryBtn>
                  {(annotBoxes[annotSel]||[]).length>0&&<PrimaryBtn onClick={()=>setAnnotBoxes(prev=>({...prev,[annotSel]:[]}))} color={C.red}>🗑 Clear This Image</PrimaryBtn>}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── PIPELINE ─────────────────────────────────────────────────── */}
        {stats && view==='pipeline' && (
          <div style={{display:'grid',gap:'12px'}}>
            <Card>
              <SectionTitle>⚡ Pipeline Presets</SectionTitle>
              <p style={{fontSize:'12px',color:C.muted,marginBottom:'14px',lineHeight:1.7}}>One-click ML workflows — pick a preset, hit Run, then all steps apply in sequence with a live log.</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(195px,1fr))',gap:'10px',marginBottom:'16px'}}>
                {PIPELINE_PRESETS.map(p=>(
                  <button key={p.name} onClick={()=>setPipPreset(p)} style={{padding:'14px',borderRadius:'10px',textAlign:'left',cursor:'pointer',border:`2px solid ${pipPreset?.name===p.name?C.teal:C.border}`,background:pipPreset?.name===p.name?C.tealDim:'#fff',transition:'all .15s'}}
                    onMouseOver={e=>e.currentTarget.style.borderColor=C.teal}
                    onMouseOut={e=>{if(pipPreset?.name!==p.name)e.currentTarget.style.borderColor=C.border;}}>
                    <div style={{fontSize:'22px',marginBottom:'5px'}}>{p.icon}</div>
                    <div style={{fontWeight:700,fontSize:'12px',color:C.text,marginBottom:'3px'}}>{p.name}</div>
                    <div style={{fontSize:'10px',color:C.muted,lineHeight:1.5}}>{p.steps.map(s=>s.label).join(' → ')}</div>
                  </button>
                ))}
              </div>
              {pipPreset && (
                <div style={{padding:'14px',background:C.tealDim,border:`1px solid ${C.tealBorder}`,borderRadius:'9px',marginBottom:'14px'}}>
                  <div style={{fontWeight:700,fontSize:'12px',color:'#00956B',marginBottom:'8px'}}>{pipPreset.icon} {pipPreset.name}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:'4px',marginBottom:'12px'}}>
                    {pipPreset.steps.map((s,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'11px',color:C.muted}}>
                        <span style={{width:'18px',height:'18px',borderRadius:'50%',background:C.teal,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:700,flexShrink:0}}>{i+1}</span>
                        {s.label}
                      </div>
                    ))}
                  </div>
                  <PrimaryBtn disabled={pipRunning} style={{width:'100%'}} onClick={()=>runPipelineSteps(pipPreset.steps)}>
                    {pipRunning?'⏳ Running Pipeline…':`⚡ Run ${pipPreset.name} on ${images.length} Images`}
                  </PrimaryBtn>
                </div>
              )}
            </Card>

            <Card>
              <SectionTitle>🔧 Custom Pipeline</SectionTitle>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'14px'}}>
                {[{id:'resize',label:'📐 Resize 224',W:224,H:224},{id:'resize',label:'📐 Resize 512',W:512,H:512},{id:'gray',label:'⬛ Grayscale'},{id:'filter',label:'✨ Sharpen',filter:'contrast(130%) saturate(110%)'},{id:'filter',label:'🎨 Vivid',filter:'saturate(150%) contrast(110%)'},{id:'strip',label:'🔒 Strip EXIF'},{id:'watermark',label:'💧 Watermark'},{id:'dedup',label:'🗑 Remove Dupes'},{id:'blur',label:'🗑 Remove Blurry'},{id:'dark',label:'🗑 Remove Dark'}].map((s,i)=>(
                  <button key={i} onClick={()=>setPipeline(p=>[...p,{...s,uid:Date.now()+i}])} style={{padding:'5px 11px',borderRadius:'6px',fontSize:'11px',border:`1px solid ${C.border}`,background:C.surface,cursor:'pointer',color:C.text,transition:'all .12s'}}
                    onMouseOver={e=>{e.currentTarget.style.background=C.tealDim;e.currentTarget.style.borderColor=C.teal;}}
                    onMouseOut={e=>{e.currentTarget.style.background=C.surface;e.currentTarget.style.borderColor=C.border;}}>
                    + {s.label}
                  </button>
                ))}
              </div>
              {pipeline.length>0 ? (
                <div>
                  <div style={{display:'flex',flexDirection:'column',gap:'5px',marginBottom:'12px'}}>
                    {pipeline.map((step,i)=>(
                      <div key={step.uid} style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 12px',background:C.surface,borderRadius:'7px',border:`1px solid ${C.border}`}}>
                        <span style={{width:'18px',height:'18px',borderRadius:'50%',background:C.teal,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:700,flexShrink:0}}>{i+1}</span>
                        <span style={{fontSize:'12px',flex:1}}>{step.label}</span>
                        <button onClick={()=>setPipeline(p=>p.filter(s=>s.uid!==step.uid))} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'14px'}}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <PrimaryBtn disabled={pipRunning} style={{flex:1}} onClick={()=>runPipelineSteps(pipeline)}>
                      {pipRunning?'⏳ Running…':`⚡ Run ${pipeline.length}-Step Pipeline`}
                    </PrimaryBtn>
                    <GhostBtn onClick={()=>{setPipeline([]);setPipLog([]);}}>Clear</GhostBtn>
                  </div>
                </div>
              ) : (
                <div style={{padding:'24px',textAlign:'center',color:C.muted,fontSize:'12px',background:C.surface,borderRadius:'8px',border:`1px dashed ${C.border}`}}>Click steps above to build your pipeline →</div>
              )}
              {pipLog.length>0 && (
                <div style={{marginTop:'12px',padding:'12px',background:'#1E1E2E',borderRadius:'8px',maxHeight:'160px',overflowY:'auto'}}>
                  {pipLog.map((l,i)=><div key={i} style={{fontFamily:'monospace',fontSize:'10px',color:l.startsWith('✅')||l.startsWith('🎉')?'#A6E22E':l.startsWith('▶')?'#66D9E8':'#F8F8F2',lineHeight:1.8}}>{l}</div>)}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── EXPORT ───────────────────────────────────────────────────── */}
        {stats && view==='export' && (
          <div style={{display:'grid',gap:'12px'}}>
            <Card>
              <SectionTitle>📦 Export Dataset</SectionTitle>
              {pipLog.length>0 && (
                <div style={{padding:'10px 14px',background:C.tealDim,border:`1px solid ${C.tealBorder}`,borderRadius:'8px',marginBottom:'14px',fontSize:'12px',color:'#00956B'}}>
                  ✅ Pipeline applied — {pipLog.filter(l=>l.startsWith('✅')).length} steps complete · {images.length} images ready
                </div>
              )}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:'10px',marginBottom:'16px'}}>
                {[{icon:'📦',title:'Download ZIP',desc:'Images in class subfolders',fn:exportZip},
                  {icon:'📋',title:'Labels CSV',desc:'filename, class, metadata',fn:exportCSV},
                  {icon:'🔵',title:'YOLO classes.txt',desc:'Class list for YOLO training',fn:()=>exportFormat('yolo')},
                  {icon:'🎯',title:'COCO JSON',desc:'Dataset info in COCO format',fn:()=>exportFormat('coco')},
                  {icon:'📊',title:'Health Report',desc:'Full HTML stats report',fn:()=>exportFormat('report')},
                ].map(item=>(
                  <button key={item.title} onClick={item.fn} style={{padding:'14px',borderRadius:'9px',border:`1px solid ${C.border}`,background:'#fff',cursor:'pointer',textAlign:'left',transition:'all .15s'}}
                    onMouseOver={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.background=C.tealDim;}}
                    onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background='#fff';}}>
                    <div style={{fontSize:'22px',marginBottom:'5px'}}>{item.icon}</div>
                    <div style={{fontWeight:700,color:C.text,fontSize:'12px',marginBottom:'2px'}}>{item.title}</div>
                    <div style={{fontSize:'10px',color:C.muted,lineHeight:1.4}}>{item.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{padding:'12px 14px',background:C.surface,borderRadius:'8px',border:`1px solid ${C.border}`,fontSize:'12px',lineHeight:1.9,marginBottom:'16px'}}>
                <strong>Summary:</strong> {stats.total} images · {stats.classes.length} classes · {stats.avgW}×{stats.avgH}px · Health <span style={{color:hc,fontWeight:700}}>{stats.health}/100</span><br/>
                {stats.classes.map(c=>`${c.name} (${c.count})`).join(' · ')}
                {history.length>0&&<><br/><span style={{color:'#00956B'}}>✅ {history.length} transformation(s) applied via Pipeline</span></>}
              </div>
              <ShareButton modality="images" fileName={images[0]?.name||'dataset'} rows={stats.total} cols={stats.classes.length} health={stats.health} extra={`${stats.avgW}×${stats.avgH}px · ${stats.classes.map(c=>c.name).join(', ')}`} />
            </Card>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
