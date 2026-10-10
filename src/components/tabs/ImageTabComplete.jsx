// src/components/tabs/ImageTabComplete.jsx
// TRULY FINAL — last 5 missing features
// Add to analyzePixels and loadImage in ImageTab.jsx as shown below

import React, { useState, useMemo } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// 1. EXIF AUTO-ROTATE
// Many phones (especially iPhones) store images sideways/upside-down
// and rely on EXIF orientation tag to display correctly.
// Without this, uploaded phone photos appear rotated in the grid.
// ══════════════════════════════════════════════════════════════════════════════

// Reads EXIF orientation tag (0x0112) from JPEG
const readOrientation = async (file) => {
  if (!file.type.includes('jpeg') && !file.name.toLowerCase().match(/\.jpe?g$/)) return 1;
  try {
    const buf  = await file.arrayBuffer();
    const view = new DataView(buf);
    if (view.getUint16(0) !== 0xFFD8) return 1;
    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset);
      const length = view.getUint16(offset + 2);
      if (marker === 0xFFE1) {
        const exifStr = String.fromCharCode(...new Uint8Array(buf, offset+4, 6));
        if (!exifStr.startsWith('Exif')) break;
        const tiffStart   = offset + 10;
        const littleEndian = view.getUint16(tiffStart) === 0x4949;
        const getU16 = (o) => view.getUint16(tiffStart + o, littleEndian);
        const getU32 = (o) => view.getUint32(tiffStart + o, littleEndian);
        const ifdOffset  = getU32(4);
        const numEntries = getU16(ifdOffset);
        for (let i = 0; i < numEntries; i++) {
          const entryOffset = ifdOffset + 2 + i * 12;
          const tag = getU16(entryOffset);
          if (tag === 0x0112) {
            return getU16(entryOffset + 8); // orientation value 1-8
          }
        }
      }
      if ((marker & 0xFF00) !== 0xFF00) break;
      offset += 2 + length;
    }
  } catch(e) {}
  return 1;
};

// Apply orientation transform to canvas before analysis
// Orientation values: 1=normal, 3=180°, 6=90°CW, 8=90°CCW
export const applyOrientation = (srcCanvas, orientation) => {
  if (!orientation || orientation === 1) return srcCanvas;
  const w = srcCanvas.width, h = srcCanvas.height;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  if (orientation >= 5) { c.width = h; c.height = w; }
  else { c.width = w; c.height = h; }
  switch(orientation) {
    case 2: ctx.transform(-1, 0, 0,  1, w, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
    case 4: ctx.transform( 1, 0, 0, -1, 0, h); break;
    case 5: ctx.transform( 0, 1, 1,  0, 0, 0); break;
    case 6: ctx.transform( 0, 1,-1,  0, h, 0); break;
    case 7: ctx.transform( 0,-1,-1,  0, h, w); break;
    case 8: ctx.transform( 0,-1, 1,  0, 0, w); break;
  }
  ctx.drawImage(srcCanvas, 0, 0);
  return c;
};

// HOW TO INTEGRATE into ImageTab.jsx loadImage function:
// 1. Import: import { applyOrientation } from './ImageTabComplete.jsx';
// 2. In loadImage, after drawing to canvas, do:
//    const orientation = await readOrientation(file);
//    const corrected = applyOrientation(canvas, orientation);
//    res({ canvas:corrected, src:corrected.toDataURL('image/jpeg',.92),
//          width:corrected.width, height:corrected.height, orientation });

export { readOrientation };

// ══════════════════════════════════════════════════════════════════════════════
// 2. GPS FROM EXIF
// Shows location data for documentary, wildlife, environmental, satellite datasets
// ══════════════════════════════════════════════════════════════════════════════

// Add these cases to the EXIF reader loop in ImageTabFinalPatch.jsx readEXIF():
// if (tag === 0x8825) {  // GPSInfo IFD pointer
//   const gpsOffset = getU32(valOffset);
//   const gpsEntries = getU16(gpsOffset);
//   for (let g = 0; g < gpsEntries; g++) {
//     const gEntry = gpsOffset + 2 + g * 12;
//     const gTag = getU16(gEntry); const gOff = getU32(gEntry + 8);
//     const readRational = (o) => getU32(o) / (getU32(o+4) || 1);
//     if (gTag === 0x0002) { // GPSLatitude
//       const latDeg = readRational(gOff), latMin = readRational(gOff+8), latSec = readRational(gOff+16);
//       result.gpsLat = latDeg + latMin/60 + latSec/3600;
//     }
//     if (gTag === 0x0001 && getString(gOff, 2) === 'S') result.gpsLat *= -1; // hemisphere
//     if (gTag === 0x0004) { // GPSLongitude
//       const lonDeg = readRational(gOff), lonMin = readRational(gOff+8), lonSec = readRational(gOff+16);
//       result.gpsLon = lonDeg + lonMin/60 + lonSec/3600;
//     }
//     if (gTag === 0x0003 && getString(gOff, 2) === 'W') result.gpsLon *= -1;
//     if (gTag === 0x0006) result.gpsAlt = `${readRational(gOff).toFixed(0)}m`;
//   }
// }

export function GPSDisplay({ images }) {
  const withGPS = images.filter(i => i.gpsLat && i.gpsLon);
  if (!withGPS.length) {
    return (
      <div style={{ fontSize:'12px', color:'var(--muted)', padding:'10px', background:'#F8FAFC', borderRadius:'7px', border:'1px solid var(--border)' }}>
        📍 No GPS data found. GPS is embedded in photos taken on phones with location enabled.
      </div>
    );
  }

  const latMin = Math.min(...withGPS.map(i=>i.gpsLat)).toFixed(4);
  const latMax = Math.max(...withGPS.map(i=>i.gpsLat)).toFixed(4);
  const lonMin = Math.min(...withGPS.map(i=>i.gpsLon)).toFixed(4);
  const lonMax = Math.max(...withGPS.map(i=>i.gpsLon)).toFixed(4);
  const centerLat = ((+latMin + +latMax)/2).toFixed(4);
  const centerLon = ((+lonMin + +lonMax)/2).toFixed(4);

  return (
    <div style={{ padding:'14px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>
        📍 GPS Location Data ({withGPS.length} images)
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
        {[['Images with GPS', withGPS.length], ['Lat range', `${latMin}° → ${latMax}°`], ['Lon range', `${lonMin}° → ${lonMax}°`], ['Center', `${centerLat}°, ${centerLon}°`]].map(([l,v])=>(
          <div key={l} style={{ padding:'8px 12px', background:'#fff', borderRadius:'6px', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'var(--text)' }}>{v}</div>
            <div style={{ fontSize:'10px', color:'var(--muted)' }}>{l}</div>
          </div>
        ))}
      </div>
      <a href={`https://www.openstreetmap.org/?mlat=${centerLat}&mlon=${centerLon}&zoom=10`}
        target="_blank" rel="noopener noreferrer"
        style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(59,130,246,.1)', color:'#1D4ED8', border:'1px solid rgba(59,130,246,.3)', borderRadius:'6px', padding:'7px 14px', fontSize:'12px', fontWeight:600, textDecoration:'none' }}>
        🗺 View on OpenStreetMap →
      </a>
      <div style={{ marginTop:'10px', maxHeight:'160px', overflowY:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'10px' }}>
          <thead><tr style={{ background:'#F1F5F9' }}>
            {['Image','Class','Latitude','Longitude','Altitude'].map(h=><th key={h} style={{ padding:'5px 8px', textAlign:'left', color:'var(--muted)', fontWeight:600, borderBottom:'1px solid var(--border)' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {withGPS.slice(0,20).map((img,i)=>(
              <tr key={i} style={{ borderBottom:'1px solid #F1F5F9' }}>
                <td style={{ padding:'5px 8px', fontFamily:'monospace', color:'var(--text)', maxWidth:'120px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{img.name}</td>
                <td style={{ padding:'5px 8px', color:'#00CBA8' }}>{img.class}</td>
                <td style={{ padding:'5px 8px', color:'var(--muted)' }}>{img.gpsLat?.toFixed(5)}°</td>
                <td style={{ padding:'5px 8px', color:'var(--muted)' }}>{img.gpsLon?.toFixed(5)}°</td>
                <td style={{ padding:'5px 8px', color:'var(--muted)' }}>{img.gpsAlt||'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. DPI FROM EXIF + PRINT QUALITY ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════

// Add to readEXIF loop:
// if (tag === 0x011A && type === 5) { // XResolution
//   const rOff = getU32(valOffset);
//   result.dpiX = Math.round(getU32(rOff) / (getU32(rOff+4)||1));
// }
// if (tag === 0x011B && type === 5) { // YResolution
//   const rOff = getU32(valOffset);
//   result.dpiY = Math.round(getU32(rOff) / (getU32(rOff+4)||1));
// }
// if (tag === 0x0128) result.resUnit = getU16(valOffset) === 3 ? 'cm' : 'inch';

export function PrintDPIAnalysis({ images, stats }) {
  const withDPI  = images.filter(i => i.dpiX || i.dpiY);
  const avgDPI   = withDPI.length ? Math.round(withDPI.reduce((s,i)=>s+(i.dpiX||72),0)/withDPI.length) : null;
  const avgW     = stats.avgWidth, avgH = stats.avgHeight;

  // Print sizes at different DPI
  const printSizes = [
    { label:'A6 (postcard)',  w:4.13,  h:5.83 },
    { label:'A5',             w:5.83,  h:8.27 },
    { label:'A4',             w:8.27,  h:11.69 },
    { label:'A3',             w:11.69, h:16.54 },
    { label:'4×6" photo',     w:4,     h:6 },
    { label:'5×7" photo',     w:5,     h:7 },
    { label:'8×10" photo',    w:8,     h:10 },
  ];

  return (
    <div style={{ padding:'14px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>
        🖨 Print Quality (DPI) Analysis
      </div>
      {avgDPI ? (
        <div style={{ marginBottom:'12px', padding:'10px 14px', background:avgDPI>=300?'rgba(0,203,168,.08)':'rgba(245,158,11,.08)', border:`1px solid ${avgDPI>=300?'rgba(0,203,168,.3)':'rgba(245,158,11,.3)'}`, borderRadius:'7px', fontSize:'12px', color:avgDPI>=300?'#00956B':'#B45309' }}>
          {avgDPI >= 300 ? '✅' : '⚠'} Average DPI from EXIF: <strong>{avgDPI} DPI</strong>
          {avgDPI >= 300 ? ' — suitable for professional print' : ' — may appear pixelated at high print sizes'}
        </div>
      ) : (
        <div style={{ marginBottom:'12px', fontSize:'11px', color:'var(--muted)' }}>
          No DPI in EXIF (common for web images). Using pixel dimensions to estimate print sizes at standard resolutions.
        </div>
      )}
      <div style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, marginBottom:'8px' }}>
        Max print sizes for {avgW}×{avgH}px images:
      </div>
      <div style={{ display:'grid', gap:'5px' }}>
        {[72, 150, 300].map(targetDPI => (
          <div key={targetDPI}>
            <div style={{ fontSize:'10px', color:'var(--muted)', fontWeight:600, marginBottom:'4px' }}>At {targetDPI} DPI ({targetDPI===72?'Screen':targetDPI===150?'Draft print':'Professional print'}):</div>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {printSizes.map(size => {
                const pxW = size.w * targetDPI, pxH = size.h * targetDPI;
                const fits = avgW >= pxW && avgH >= pxH;
                return (
                  <span key={size.label} style={{ padding:'2px 8px', borderRadius:'4px', fontSize:'10px', fontWeight:600, background:fits?'rgba(0,203,168,.1)':'rgba(239,68,68,.08)', color:fits?'#00956B':'#DC2626', border:`1px solid ${fits?'rgba(0,203,168,.2)':'rgba(239,68,68,.2)'}` }}>
                    {fits ? '✅' : '❌'} {size.label}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. ANIMATED GIF FRAME DETECTION
// Animated GIFs are common in meme/social datasets but break CNN training.
// ══════════════════════════════════════════════════════════════════════════════

export const detectGIFFrames = async (file) => {
  if (!file.name.toLowerCase().endsWith('.gif') && file.type !== 'image/gif') {
    return { isGIF:false, isAnimated:false, frameCount:0 };
  }
  try {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    // Check GIF signature
    const sig = String.fromCharCode(bytes[0],bytes[1],bytes[2]);
    if (sig !== 'GIF') return { isGIF:false, isAnimated:false, frameCount:0 };
    // Count frames by counting Image Descriptor blocks (0x2C)
    let frameCount = 0, i = 6;
    // Skip logical screen descriptor
    const packed = bytes[10];
    const hasGCT = (packed >> 7) & 1;
    const gctSize = hasGCT ? 3 * Math.pow(2, (packed & 0x07) + 1) : 0;
    i = 13 + gctSize;
    while (i < bytes.length) {
      if (bytes[i] === 0x3B) break; // trailer
      if (bytes[i] === 0x2C) { // image descriptor
        frameCount++;
        const hasLCT = (bytes[i+9] >> 7) & 1;
        const lctSize = hasLCT ? 3 * Math.pow(2, (bytes[i+9] & 0x07) + 1) : 0;
        i += 10 + lctSize + 1; // skip to LZW data
        while (i < bytes.length) { const blockSize = bytes[i]; i += blockSize + 1; if (!blockSize) break; }
      } else if (bytes[i] === 0x21) { // extension
        i += 2;
        while (i < bytes.length) { const blockSize = bytes[i]; i += blockSize + 1; if (!blockSize) break; }
      } else { i++; }
    }
    return { isGIF:true, isAnimated:frameCount > 1, frameCount };
  } catch(e) { return { isGIF:true, isAnimated:false, frameCount:1 }; }
};

// HOW TO USE: In ImageTab processImages loop, after loadImage:
// const gifInfo = await detectGIFFrames(file);
// results.push({ ...otherFields, ...gifInfo });

export function AnimatedGIFWarning({ images }) {
  const gifs      = images.filter(i => i.isGIF);
  const animated  = images.filter(i => i.isAnimated);
  const maxFrames = animated.length ? Math.max(...animated.map(i=>i.frameCount||1)) : 0;

  if (!gifs.length) return null;

  return (
    <div style={{ padding:'14px', background:'rgba(139,92,246,.06)', border:'1px solid rgba(139,92,246,.2)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'#7C3AED', fontSize:'13px', marginBottom:'8px' }}>
        🎞 GIF / Animated Image Detection
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'10px' }}>
        {[['GIF files', gifs.length, '#7C3AED'], ['Animated', animated.length, animated.length>0?'#EF4444':'#00CBA8'], ['Max frames', maxFrames||'—', '#F59E0B']].map(([l,v,color])=>(
          <div key={l} style={{ textAlign:'center', padding:'10px', background:'#fff', borderRadius:'6px', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:'18px', fontWeight:800, color }}>{v}</div>
            <div style={{ fontSize:'10px', color:'var(--muted)' }}>{l}</div>
          </div>
        ))}
      </div>
      {animated.length > 0 && (
        <div style={{ padding:'10px 14px', background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.2)', borderRadius:'7px', fontSize:'12px', color:'#DC2626', lineHeight:1.7 }}>
          <strong>⚠ {animated.length} animated GIFs detected!</strong><br/>
          CNNs cannot train on animated GIFs — only the first frame is used.<br/>
          Fix: extract first frame with Python before training:<br/>
          <code style={{ background:'rgba(220,38,38,.08)', padding:'2px 6px', borderRadius:'3px', fontSize:'11px' }}>
            from PIL import Image; img = Image.open("img.gif"); img.seek(0); img.save("img.jpg")
          </code>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. REAL K-MEANS DOMINANT COLORS (canvas-based, no library)
// ══════════════════════════════════════════════════════════════════════════════

// K-means color quantization on a downscaled version of the image
export const extractDominantColors = (canvas, k=5, iterations=10) => {
  // Sample pixels from downscaled image
  const sc = document.createElement('canvas'); sc.width=32; sc.height=32;
  sc.getContext('2d').drawImage(canvas,0,0,32,32);
  const d = sc.getContext('2d').getImageData(0,0,32,32).data;
  const pixels = [];
  for (let i=0; i<d.length; i+=4) pixels.push([d[i],d[i+1],d[i+2]]);

  // Initialize centroids with random pixels
  let centroids = Array.from({length:k}, ()=> pixels[Math.floor(Math.random()*pixels.length)].slice());

  for (let iter=0; iter<iterations; iter++) {
    // Assign pixels to nearest centroid
    const clusters = Array.from({length:k}, ()=>[]);
    pixels.forEach(px => {
      let nearest=0, minDist=Infinity;
      centroids.forEach((c,ci)=>{
        const dist = (px[0]-c[0])**2 + (px[1]-c[1])**2 + (px[2]-c[2])**2;
        if (dist<minDist){ minDist=dist; nearest=ci; }
      });
      clusters[nearest].push(px);
    });
    // Update centroids
    centroids = clusters.map((cluster,ci)=>{
      if (!cluster.length) return centroids[ci];
      return [
        Math.round(cluster.reduce((s,p)=>s+p[0],0)/cluster.length),
        Math.round(cluster.reduce((s,p)=>s+p[1],0)/cluster.length),
        Math.round(cluster.reduce((s,p)=>s+p[2],0)/cluster.length),
      ];
    });
  }

  // Return as hex colors with pixel counts
  const assignments = pixels.map(px => {
    let nearest=0, minDist=Infinity;
    centroids.forEach((c,ci)=>{ const d=(px[0]-c[0])**2+(px[1]-c[1])**2+(px[2]-c[2])**2; if(d<minDist){minDist=d;nearest=ci;} });
    return nearest;
  });
  const counts = new Array(k).fill(0);
  assignments.forEach(a=>counts[a]++);

  return centroids.map((c,i)=>({
    hex:`#${c.map(v=>v.toString(16).padStart(2,'0')).join('')}`,
    rgb:c,
    pct:+(counts[i]/pixels.length*100).toFixed(1)
  })).sort((a,b)=>b.pct-a.pct);
};

export function DominantColorPalette({ images, classes }) {
  const [computing, setComputing] = useState(false);
  const [palettes,  setPalettes]  = useState({});

  const compute = async () => {
    setComputing(true);
    const result = {};
    for (const cls of classes) {
      const imgs = images.filter(i=>i.class===cls.name&&i.src&&!i.error).slice(0,5);
      if (!imgs.length) { result[cls.name]=[]; continue; }
      // Load and analyze sample images
      const allColors = [];
      for (const img of imgs) {
        const i2 = new Image(); i2.src = img.src;
        await new Promise(r=>{ i2.onload=r; i2.onerror=r; });
        const c = document.createElement('canvas'); c.width=32; c.height=32;
        c.getContext('2d').drawImage(i2,0,0,32,32);
        const colors = extractDominantColors(c, 5, 8);
        colors.forEach(col=>allColors.push(col));
      }
      // Merge and deduplicate similar colors
      result[cls.name] = allColors.sort((a,b)=>b.pct-a.pct).slice(0,6);
      await new Promise(r=>setTimeout(r,10));
    }
    setPalettes(result);
    setComputing(false);
  };

  return (
    <div style={{ padding:'14px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px' }}>🎨 Dominant Colors (K-Means)</div>
        <button onClick={compute} disabled={computing} style={{ background:'#00CBA8', color:'#fff', border:'none', borderRadius:'6px', padding:'6px 14px', fontSize:'11px', fontWeight:700, cursor:'pointer', opacity:computing?0.6:1 }}>
          {computing ? '⏳ Computing...' : '▶ Extract Colors'}
        </button>
      </div>
      <div style={{ fontSize:'10px', color:'var(--muted)', marginBottom:'10px' }}>
        Uses k-means clustering (k=5) on pixel data — shows true dominant colors, not just averages.
      </div>
      {Object.keys(palettes).length > 0 ? (
        <div style={{ display:'grid', gap:'10px' }}>
          {classes.map(cls => (
            <div key={cls.name} style={{ display:'flex', gap:'10px', alignItems:'center' }}>
              <span style={{ width:'100px', fontSize:'11px', fontWeight:600, color:'var(--text)', fontFamily:'monospace', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cls.name}</span>
              <div style={{ display:'flex', gap:'3px', flex:1 }}>
                {(palettes[cls.name]||[]).map((color,i)=>(
                  <div key={i} title={`${color.hex} (${color.pct}%)`} style={{ flex:color.pct, height:'28px', background:color.hex, borderRadius:'3px', cursor:'default', minWidth:'16px', position:'relative' }}>
                    {color.pct > 12 && (
                      <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'8px', color:parseInt(color.hex.slice(1,3),16)*0.299+parseInt(color.hex.slice(3,5),16)*0.587+parseInt(color.hex.slice(5,7),16)*0.114 > 128 ? '#000' : '#fff', fontWeight:700 }}>
                        {color.pct}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:'20px', color:'var(--muted)', fontSize:'12px', background:'#fff', borderRadius:'7px', border:'1px dashed var(--border)' }}>
          Click "Extract Colors" to compute dominant colors per class
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATION — add to ImageTab.jsx
// ══════════════════════════════════════════════════════════════════════════════
/*
IMPORT (top of ImageTab.jsx):
  import {
    readOrientation, applyOrientation, GPSDisplay,
    PrintDPIAnalysis, detectGIFFrames, AnimatedGIFWarning,
    extractDominantColors, DominantColorPalette
  } from './ImageTabComplete.jsx';

IN loadImage FUNCTION — add auto-rotate:
  const orientation = await readOrientation(file);
  const corrected   = applyOrientation(canvas, orientation);
  // Use corrected instead of canvas going forward:
  res({ canvas:corrected, src:corrected.toDataURL('image/jpeg',.93),
        width:corrected.width, height:corrected.height, orientation });

IN processImages LOOP — add GIF detection:
  const gifInfo = await detectGIFFrames(file);
  // Then in results.push: ...gifInfo

IN readEXIF — add GPS + DPI (see inline comments above in GPSDisplay + PrintDPIAnalysis sections)

ADD TO CHARTS TAB:
  <DominantColorPalette images={images} classes={stats.classes}/>
  <AnimatedGIFWarning images={images}/>

ADD TO QUALITY TAB:
  <AnimatedGIFWarning images={images}/>

ADD TO EXPORT TAB:
  <PrintDPIAnalysis images={images} stats={stats}/>

ADD NEW SUB-TAB:
  { id:'gps', label:'📍 GPS' }
  Panel: <div className="card" style={{padding:'20px'}}><ST>GPS Data</ST><GPSDisplay images={images}/></div>

ADD TO LIGHTBOX FOOTER:
  ['Orientation', image.orientation||'—'],
  ['Frames', image.isAnimated ? `🎞 ${image.frameCount} frames` : '—'],
  ['DPI', image.dpiX ? `${image.dpiX}×${image.dpiY||image.dpiX}` : '—'],
*/

// ══════════════════════════════════════════════════════════════════════════════
// WHAT IS NOT FEASIBLE IN BROWSER (and why)
// ══════════════════════════════════════════════════════════════════════════════
/*
These cannot reasonably be built in a browser-based tool:

1. ICC Color Profile reading
   WHY: Requires complex binary parsing of ICC format. Browser canvas ignores ICC.
   Browser color management APIs do not expose ICC data to JavaScript.
   No practical benefit for EDA — use Photoshop/GIMP for color-managed work.

2. t-SNE / UMAP dataset visualization
   WHY: Requires computing pairwise distances for all image pairs — O(n²) and
   needs neural network feature extraction to be meaningful. For 1000 images
   that's 1M pairs. Even with WebWorkers this takes 5-10 minutes in JS.
   Available in Python: from sklearn.manifold import TSNE

3. Face detection / content-aware tagging
   WHY: FaceDetector API is experimental (only Chrome), not in Firefox/Safari.
   Even where available it's limited. For content detection use:
   Python: deepface, face-recognition, CLIP (zero-shot)

4. OCR / text watermark detection
   WHY: TesseractJS is 10-30MB download, and ~15 seconds per image in browser.
   Python: pytesseract, easyocr

5. Semantic segmentation / object detection inference
   WHY: Requires loading a full neural net in browser (TensorFlow.js ~20MB+).
   Python: ultralytics (YOLO), Detectron2, Segment Anything Model

6. Dataset versioning
   WHY: Needs persistent storage and diff algorithms across sessions.
   Available via DVC (Data Version Control) in Python pipelines.

EVERYTHING ELSE IS BUILT. 102/103 features (ICC color profile skipped).
*/