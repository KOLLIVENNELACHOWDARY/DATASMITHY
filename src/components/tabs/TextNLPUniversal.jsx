// src/components/tabs/TextNLPUniversal.jsx
// THE 19 MISSING UNIVERSAL NLP FEATURES
// For: content writers, journalists, teachers, support teams, social media managers

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';

const S = {
  card: { background:'#fff', border:'1px solid var(--border)', borderRadius:'10px', padding:'16px', marginBottom:'14px' },
  btn:  (bg='#00CBA8',c='#fff') => ({ background:bg, color:c, border:'none', borderRadius:'6px', padding:'7px 18px', fontSize:'12px', fontWeight:700, cursor:'pointer' }),
  lbl:  { fontSize:'11px', color:'var(--muted)', fontWeight:600, display:'block', marginBottom:'4px' },
  inp:  { padding:'7px 12px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'12px', width:'100%', boxSizing:'border-box' },
  tag:  (c='#00CBA8') => ({ display:'inline-block', padding:'2px 8px', borderRadius:'4px', fontSize:'10px', fontWeight:700, color:c, background:`${c}18`, border:`1px solid ${c}33` }),
};

// ── stopwords ───────────────────────────────────────────────────────────────
const EN_STOP = new Set(['i','me','my','myself','we','our','ours','you','your','he','him','his','she','her','it','its','they','them','their','what','which','who','this','that','these','those','am','is','are','was','were','be','been','being','have','has','had','do','does','did','a','an','the','and','but','if','or','as','of','at','by','for','with','in','out','on','off','to','from','up','not','so','than','very','can','will','just','now','also','more','some','any','all','both','each','few','other','such','no','nor','only','same','too','then','here','there','when','where','how','s','t','d','m','re','ll','ve','ain']);
const HI_STOP = new Set(['और','है','के','में','को','से','पर','यह','एक','हम','वह','इस','उस','ने','भी','तो','अब','यहाँ','वहाँ','कि','जो','था','थी','थे','हो','हैं','नहीं','कर','किया','लिए','हुए','अपने','इन','उन','जब','तब','इसलिए','लेकिन','फिर','सब','ही','क्या','कोई','कुछ','मैं','तुम','आप','हम','वो','इनका','उनका']);

const tokenize = (text, lang='en') => {
  const stop = lang==='hi' ? HI_STOP : EN_STOP;
  return text.toLowerCase().replace(/[^a-z0-9\sàáâãäåæçèéêëìíîïðñòóôõöùúûüýþÿ\u0900-\u097F]/g,' ')
    .split(/\s+/).filter(w => w.length > 1 && !stop.has(w));
};

const countSyllables = (word) => {
  word = word.toLowerCase().trim();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
};

// ══════════════════════════════════════════════════════════════════════════════
// 1. READING TIME + GRADE LEVEL + READABILITY SUITE
// ══════════════════════════════════════════════════════════════════════════════
export function ReadabilityPanel({ analyzed }) {
  if (!analyzed.length) return null;

  const valid = analyzed.filter(d => d.wordCount > 0);
  const avgWords  = valid.reduce((s,d)=>s+d.wordCount,0)/valid.length;
  const avgSents  = valid.reduce((s,d)=>s+(d.sentenceCount||1),0)/valid.length;
  const totalWords= valid.reduce((s,d)=>s+d.wordCount,0);

  // Flesch-Kincaid Grade Level
  const avgSyllables = valid.reduce((s,d)=>{
    const words = d.text?.split(/\s+/).filter(w=>w.length>0)||[];
    return s + words.reduce((ss,w)=>ss+countSyllables(w),0)/(words.length||1);
  },0) / valid.length;
  const fkGrade = Math.max(0, 0.39*(avgWords/avgSents) + 11.8*avgSyllables - 15.59);
  const gunningFog = 0.4*((avgWords/avgSents) + 100*(valid.reduce((s,d)=>{
    const words=d.text?.split(/\s+/)||[];
    return s+words.filter(w=>countSyllables(w)>=3).length;
  },0)/totalWords));

  const gradeLabel = (g) => {
    if (g<=6) return ['6th grade','Elementary school','#00CBA8'];
    if (g<=8) return ['8th grade','Middle school','#3B82F6'];
    if (g<=10)return ['10th grade','High school','#F59E0B'];
    if (g<=12)return ['12th grade','Senior high','#F97316'];
    return ['College+','University level','#EF4444'];
  };
  const [grade,gradeLabel2,gradeColor] = gradeLabel(fkGrade);
  const readingTimeMins = Math.ceil(totalWords / 200);
  const readingTimeFast = Math.ceil(totalWords / 300);

  const metrics = [
    ['📖 Reading Time (avg 200 wpm)', readingTimeMins===1?'1 min':`${readingTimeMins} mins`, '#00CBA8'],
    ['⚡ Speed Read (300 wpm)',        readingTimeFast===1?'1 min':`${readingTimeFast} mins`, '#3B82F6'],
    ['🎓 FK Grade Level',              `${fkGrade.toFixed(1)} (${grade})`, gradeColor],
    ['🌫 Gunning Fog Index',           gunningFog.toFixed(1), gunningFog>12?'#EF4444':gunningFog>8?'#F59E0B':'#00CBA8'],
    ['📝 Total Words',                 totalWords.toLocaleString(), '#64748B'],
    ['📏 Avg Sentence Length',         `${avgWords.toFixed(0)} words`, '#8B5CF6'],
  ];

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'14px' }}>⏱ Readability & Grade Level</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'8px', marginBottom:'14px' }}>
        {metrics.map(([l,v,c])=>(
          <div key={l} style={{ padding:'10px 12px', background:'#F8FAFC', borderRadius:'7px', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:'17px', fontWeight:800, color:c, marginBottom:'2px' }}>{v}</div>
            <div style={{ fontSize:'10px', color:'var(--muted)', lineHeight:1.4 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:'10px 14px', background:`${gradeColor}12`, border:`1px solid ${gradeColor}33`, borderRadius:'7px', fontSize:'11px', color:gradeColor, lineHeight:1.7 }}>
        <strong>Reading level: {gradeLabel2}</strong> — {gradeLabel2==='Elementary school'?'Clear and accessible to most readers':gradeLabel2==='Middle school'?'Good for general audience':gradeLabel2==='High school'?'Suitable for educated readers':'May need simplification for general audience'}
        {fkGrade > 12 && <div style={{ marginTop:'4px' }}>💡 Tip: Break long sentences, replace complex words with simpler ones to improve readability.</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. KEYWORD DENSITY + PLATFORM CHAR LIMIT CHECKER
// ══════════════════════════════════════════════════════════════════════════════
export function KeywordDensityPanel({ docs }) {
  const [keyword, setKeyword] = useState('');

  const PLATFORMS = [
    { name:'Twitter/X',      limit:280,   icon:'𝕏' },
    { name:'SMS',            limit:160,   icon:'💬' },
    { name:'LinkedIn Post',  limit:3000,  icon:'💼' },
    { name:'Instagram Caption',limit:2200,icon:'📸' },
    { name:'Facebook Post',  limit:63206, icon:'👥' },
    { name:'YouTube Title',  limit:100,   icon:'▶' },
    { name:'YouTube Desc',   limit:5000,  icon:'▶' },
    { name:'WhatsApp',       limit:65536, icon:'💚' },
    { name:'Email Subject',  limit:78,    icon:'📧' },
    { name:'Google Ad Headline',limit:30, icon:'🔍' },
  ];

  const allText  = docs.map(d=>d.text||'').join(' ');
  const allWords = allText.toLowerCase().split(/\s+/).filter(w=>w.length>1);
  const density  = keyword.trim()
    ? `${((allWords.filter(w=>w.includes(keyword.toLowerCase())).length / allWords.length)*100).toFixed(2)}%`
    : null;

  const avgCharCount = docs.length ? Math.round(docs.reduce((s,d)=>s+(d.text||'').length,0)/docs.length) : 0;
  const maxCharCount = docs.length ? Math.max(...docs.map(d=>(d.text||'').length)) : 0;

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>📊 Keyword Density + Platform Limits</div>
      {/* Keyword density */}
      <div style={{ marginBottom:'14px' }}>
        <span style={S.lbl}>Keyword Density Calculator</span>
        <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
          <input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="Enter keyword to check density..." style={{...S.inp,flex:1}}/>
          {density && <span style={{ ...S.tag('#3B82F6'), alignSelf:'center', fontSize:'13px', padding:'4px 12px' }}>{density}</span>}
        </div>
        {keyword && <div style={{ fontSize:'11px', color:'var(--muted)' }}>
          "{keyword}" appears in {allWords.filter(w=>w.includes(keyword.toLowerCase())).length} of {allWords.length} words across all documents
        </div>}
      </div>
      {/* Platform limits */}
      <div>
        <span style={S.lbl}>Platform Character Limit Checker (your avg: {avgCharCount} chars · max: {maxCharCount} chars)</span>
        <div style={{ display:'grid', gap:'5px' }}>
          {PLATFORMS.map(p=>{
            const fits = avgCharCount <= p.limit;
            const maxFits = maxCharCount <= p.limit;
            const color = fits && maxFits ? '#00956B' : fits ? '#F59E0B' : '#DC2626';
            const pct   = Math.min(100, Math.round(avgCharCount/p.limit*100));
            return (
              <div key={p.name} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 10px', background:'#F8FAFC', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'11px' }}>
                <span style={{ width:'16px', textAlign:'center' }}>{p.icon}</span>
                <span style={{ width:'130px', fontWeight:600, color:'var(--text)' }}>{p.name}</span>
                <div style={{ flex:1, height:'8px', background:'#E2E8F0', borderRadius:'4px', overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:'4px' }}/>
                </div>
                <span style={{ width:'80px', textAlign:'right', fontSize:'10px', color:'var(--muted)' }}>{avgCharCount}/{p.limit}</span>
                <span style={{ ...S.tag(color), fontSize:'9px' }}>{fits&&maxFits?'✅ All fit':fits?'⚠ Some over':'❌ Too long'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. WORD CLOUD (canvas-based, no library)
// ══════════════════════════════════════════════════════════════════════════════
export function WordCloudPanel({ analyzed }) {
  const canvasRef = useRef(null);
  const [generated, setGenerated] = useState(false);
  const [colorScheme, setColorScheme] = useState('teal');

  const SCHEMES = {
    teal:   ['#00CBA8','#00956B','#0D9488','#14B8A6','#5EEAD4','#99F6E4'],
    ocean:  ['#3B82F6','#1D4ED8','#06B6D4','#0891B2','#38BDF8','#7DD3FC'],
    sunset: ['#F97316','#EF4444','#F59E0B','#EC4899','#8B5CF6','#E11D48'],
    mono:   ['#1E293B','#334155','#475569','#64748B','#94A3B8','#CBD5E1'],
  };

  const generate = useCallback(() => {
    if (!canvasRef.current || !analyzed.length) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // Build word frequency
    const freq = {};
    analyzed.forEach(d => {
      tokenize(d.text||'').forEach(w => { freq[w]=(freq[w]||0)+1; });
    });
    const words = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,60);
    if (!words.length) return;

    const maxFreq = words[0][1];
    const colors  = SCHEMES[colorScheme];
    const placed  = [];
    const W=canvas.width, H=canvas.height;

    const overlaps = (x,y,w,h) => placed.some(p => !(x>p.x+p.w||x+w<p.x||y>p.y+p.h||y+h<p.y));

    for (const [word, count] of words) {
      const fontSize = Math.max(11, Math.min(52, Math.round(11 + (count/maxFreq)*40)));
      ctx.font = `${Math.random()>.3?'bold ':''} ${fontSize}px system-ui, sans-serif`;
      const tw = ctx.measureText(word).width;
      const color = colors[Math.floor(Math.random()*colors.length)];
      // Try to place with spiral
      let placed_ok = false;
      for (let r=0; r<300; r++) {
        const angle = r * 0.5;
        const x = W/2 + (r*1.2)*Math.cos(angle) - tw/2;
        const y = H/2 + (r*0.7)*Math.sin(angle) + fontSize/2;
        if (x<4||x+tw>W-4||y-fontSize<4||y>H-4) continue;
        if (!overlaps(x-2,y-fontSize-2,tw+4,fontSize+4)) {
          ctx.fillStyle = color;
          ctx.fillText(word, x, y);
          placed.push({x:x-2, y:y-fontSize-2, w:tw+4, h:fontSize+4});
          placed_ok = true;
          break;
        }
      }
    }
    setGenerated(true);
  }, [analyzed, colorScheme]);

  const download = () => {
    if (!canvasRef.current) return;
    const a=document.createElement('a'); a.href=canvasRef.current.toDataURL('image/png'); a.download='word_cloud.png'; a.click();
  };

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>☁️ Word Cloud</div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap', alignItems:'center' }}>
        {Object.keys(SCHEMES).map(s=>(
          <button key={s} onClick={()=>setColorScheme(s)} style={{ padding:'4px 12px', borderRadius:'5px', fontSize:'11px', fontWeight:colorScheme===s?700:400, cursor:'pointer', background:colorScheme===s?'rgba(0,203,168,.1)':'#F1F5F9', color:colorScheme===s?'#00956B':'var(--muted)', border:colorScheme===s?'1.5px solid #00CBA8':'1px solid var(--border)' }}>{s}</button>
        ))}
        <button onClick={generate} disabled={!analyzed.length} style={{ ...S.btn(), marginLeft:'auto' }}>▶ Generate</button>
        {generated && <button onClick={download} style={S.btn('#3B82F6')}>↓ PNG</button>}
      </div>
      <canvas ref={canvasRef} width={700} height={360} style={{ width:'100%', maxWidth:'700px', borderRadius:'8px', border:'1px solid var(--border)', background:'#F8FAFC', display:'block' }}/>
      {!generated && <div style={{ textAlign:'center', fontSize:'11px', color:'var(--muted)', marginTop:'8px' }}>Click Generate to build your word cloud from {analyzed.length} documents</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. BASIC NER — Named Entity Recognition (regex-based, no ML)
// ══════════════════════════════════════════════════════════════════════════════
const NER_PATTERNS = {
  emails:      { re: /\b[\w.-]+@[\w.-]+\.\w{2,}\b/g,                       color:'#3B82F6', icon:'📧' },
  phones:      { re: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, color:'#00CBA8', icon:'📱' },
  urls:        { re: /https?:\/\/[\S]+/g,                                   color:'#8B5CF6', icon:'🔗' },
  dates:       { re: /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/gi, color:'#F59E0B', icon:'📅' },
  currency:    { re: /(?:₹|Rs\.?|INR|USD|\$|€|£)\s*[\d,]+(?:\.\d+)?/g,    color:'#00956B', icon:'💰' },
  hashtags:    { re: /#\w+/g,                                               color:'#EC4899', icon:'#️⃣' },
  mentions:    { re: /@\w+/g,                                               color:'#F97316', icon:'@' },
  percentages: { re: /\b\d+(?:\.\d+)?%/g,                                  color:'#EF4444', icon:'%' },
  numbers:     { re: /\b\d{4,}\b/g,                                         color:'#94A3B8', icon:'🔢' },
};

export function NERPanel({ docs }) {
  const [results, setResults] = useState(null);

  const run = () => {
    const allText = docs.map(d=>d.text||'').join('\n');
    const found   = {};
    Object.entries(NER_PATTERNS).forEach(([type, {re, color, icon}]) => {
      const matches = [...new Set((allText.match(re)||[]))];
      if (matches.length) found[type] = { matches, color, icon };
    });
    setResults(found);
  };

  const exportCSV = () => {
    if (!results) return;
    const rows = [['Type','Value','Count']];
    const allText = docs.map(d=>d.text||'').join('\n');
    Object.entries(results).forEach(([type,{matches,re}]) => {
      matches.forEach(m => {
        const count = (allText.match(new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
        rows.push([type,m,count]);
      });
    });
    const csv = rows.map(r=>r.map(v=>JSON.stringify(v)).join(',')).join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='entities.csv'; a.click();
  };

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'6px' }}>🔍 Entity Extraction (NER)</div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px' }}>Finds emails, phones, URLs, dates, currencies, hashtags, mentions, percentages across all documents — no ML needed.</div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
        <button onClick={run} style={S.btn()}>🔍 Extract Entities</button>
        {results && <button onClick={exportCSV} style={S.btn('#3B82F6')}>↓ Export CSV</button>}
      </div>
      {results && (
        <div style={{ display:'grid', gap:'10px' }}>
          {Object.keys(results).length === 0
            ? <div style={{ fontSize:'11px', color:'var(--muted)' }}>No entities found in this dataset.</div>
            : Object.entries(results).map(([type,{matches,color,icon}])=>(
              <div key={type}>
                <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text)', marginBottom:'5px' }}>
                  {icon} {type.charAt(0).toUpperCase()+type.slice(1)} ({matches.length} unique)
                </div>
                <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                  {matches.slice(0,12).map((m,i)=>(
                    <span key={i} style={{ ...S.tag(color), fontSize:'10px', fontFamily:'monospace' }}>{m.length>30?m.slice(0,30)+'…':m}</span>
                  ))}
                  {matches.length>12 && <span style={{ fontSize:'10px', color:'var(--muted)', alignSelf:'center' }}>+{matches.length-12} more</span>}
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. CONCORDANCE — keyword in context (KWIC)
// ══════════════════════════════════════════════════════════════════════════════
export function ConcordancePanel({ docs }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [window,  setWindow]  = useState(6); // words of context each side

  const search = () => {
    if (!query.trim()) return;
    const q   = query.trim().toLowerCase();
    const res = [];
    docs.forEach((doc, di) => {
      const words = (doc.text||'').split(/\s+/);
      words.forEach((word, wi) => {
        if (word.toLowerCase().includes(q)) {
          const left  = words.slice(Math.max(0,wi-window), wi).join(' ');
          const right = words.slice(wi+1, wi+window+1).join(' ');
          res.push({ left, match:word, right, docId:di+1, label:doc.label||'—' });
        }
      });
    });
    setResults(res.slice(0,100));
  };

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>📖 Concordance (Keyword in Context)</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:'8px', marginBottom:'12px', alignItems:'flex-end' }}>
        <div><span style={S.lbl}>Search word or phrase</span>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="e.g. problem, delivery, excellent..." style={S.inp}/>
        </div>
        <div><span style={S.lbl}>Context (words)</span>
          <input type="number" min={2} max={15} value={window} onChange={e=>setWindow(+e.target.value)} style={{...S.inp,width:'70px'}}/>
        </div>
        <button onClick={search} style={S.btn()}>🔍 Search</button>
      </div>
      {results.length > 0 && (
        <div>
          <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'8px' }}>{results.length} occurrences{results.length===100?' (showing first 100)':''}</div>
          <div style={{ maxHeight:'300px', overflowY:'auto', fontFamily:'monospace', fontSize:'11px' }}>
            {results.map((r,i)=>(
              <div key={i} style={{ display:'flex', gap:'4px', padding:'5px 0', borderBottom:'1px solid #F8FAFC', alignItems:'baseline' }}>
                <span style={{ color:'var(--muted)', width:'50px', flexShrink:0, fontSize:'9px' }}>Doc {r.docId}</span>
                <span style={{ color:'var(--muted)', textAlign:'right', flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', direction:'rtl' }}>{r.left}</span>
                <span style={{ fontWeight:800, color:'#00CBA8', whiteSpace:'nowrap', margin:'0 4px', textDecoration:'underline' }}>{r.match}</span>
                <span style={{ color:'var(--muted)', flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.right}</span>
                {r.label!=='—'&&<span style={{ ...S.tag('#8B5CF6'), flexShrink:0, fontSize:'9px' }}>{r.label}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {results.length===0&&query&&<div style={{ fontSize:'11px', color:'var(--muted)' }}>No matches found for "{query}"</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. TEXT SIMILARITY / NEAR-DUPLICATES
// ══════════════════════════════════════════════════════════════════════════════
export function TextSimilarityPanel({ docs }) {
  const [threshold, setThreshold] = useState(80);
  const [groups,    setGroups]    = useState(null);
  const [loading,   setLoading]   = useState(false);

  const jaccardSim = (a, b) => {
    const setA = new Set(tokenize(a||'')), setB = new Set(tokenize(b||''));
    const inter = new Set([...setA].filter(x=>setB.has(x)));
    const union  = new Set([...setA,...setB]);
    return union.size ? inter.size/union.size*100 : 0;
  };

  const run = async () => {
    setLoading(true);
    await new Promise(r=>setTimeout(r,30));
    const cap = Math.min(docs.length, 300);
    const matched = new Set();
    const result  = [];
    for (let i=0; i<cap; i++) {
      if (matched.has(i)) continue;
      const group = [i];
      for (let j=i+1; j<cap; j++) {
        if (matched.has(j)) continue;
        if (jaccardSim(docs[i].text, docs[j].text) >= threshold) {
          group.push(j); matched.add(j);
        }
      }
      if (group.length>1) { result.push(group); matched.add(i); }
    }
    setGroups(result);
    setLoading(false);
  };

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'6px' }}>🔁 Text Similarity / Near-Duplicates</div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px' }}>Uses Jaccard similarity on token sets — finds texts that say the same thing in slightly different words. Cap: 300 documents.</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'10px', alignItems:'flex-end', marginBottom:'12px' }}>
        <div>
          <span style={S.lbl}>Similarity threshold: <strong style={{color:'var(--text)'}}>{threshold}%</strong></span>
          <input type="range" min={40} max={98} value={threshold} onChange={e=>setThreshold(+e.target.value)} style={{ width:'100%', accentColor:'#00CBA8' }}/>
        </div>
        <button onClick={run} disabled={loading} style={{ ...S.btn(), opacity:loading?0.6:1 }}>
          {loading?'⏳ Scanning...':'🔍 Find Similar'}
        </button>
      </div>
      {groups && (
        groups.length===0
          ? <div style={{ fontSize:'11px', color:'#00956B', padding:'8px 12px', background:'rgba(0,203,168,.07)', borderRadius:'6px' }}>✅ No near-duplicates found at {threshold}% similarity.</div>
          : <div>
              <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'8px' }}>{groups.length} groups of similar texts found:</div>
              <div style={{ maxHeight:'240px', overflowY:'auto', display:'grid', gap:'8px' }}>
                {groups.slice(0,10).map((g,i)=>(
                  <div key={i} style={{ padding:'10px 12px', background:'rgba(239,68,68,.04)', border:'1px solid rgba(239,68,68,.2)', borderRadius:'7px' }}>
                    <div style={{ fontSize:'10px', color:'var(--muted)', marginBottom:'5px' }}>Group {i+1} — {g.length} similar texts (Jaccard ≥{threshold}%)</div>
                    {g.slice(0,3).map(idx=>(
                      <div key={idx} style={{ fontSize:'11px', color:'var(--text)', marginBottom:'3px', padding:'3px 0', borderBottom:'1px solid #F8FAFC' }}>
                        Doc {idx+1}{docs[idx]?.label?` [${docs[idx].label}]`:''}: {(docs[idx]?.text||'').slice(0,100)}...
                      </div>
                    ))}
                  </div>
                ))}
                {groups.length>10&&<div style={{ fontSize:'10px', color:'var(--muted)', padding:'4px 12px' }}>...and {groups.length-10} more groups</div>}
              </div>
            </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. PER-LABEL TEXT STATISTICS + EMOJI ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════
export function PerLabelStats({ analyzed }) {
  const labels = [...new Set(analyzed.map(d=>d.label).filter(Boolean))];
  if (!labels.length) return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'8px' }}>📊 Per-Label Statistics</div>
      <div style={{ fontSize:'11px', color:'var(--muted)' }}>No labels found. Load a labeled dataset to see per-class breakdowns.</div>
    </div>
  );

  // Emoji frequency across all
  const allText = analyzed.map(d=>d.text||'').join('');
  const emojiFreq = {};
  const emojiRe = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojis  = allText.match(emojiRe)||[];
  emojis.forEach(e=>emojiFreq[e]=(emojiFreq[e]||0)+1);
  const topEmojis = Object.entries(emojiFreq).sort((a,b)=>b[1]-a[1]).slice(0,10);

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'14px' }}>📊 Per-Label Statistics</div>
      <div style={{ overflowX:'auto', marginBottom:'16px' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px', minWidth:'500px' }}>
          <thead><tr style={{ background:'#F8FAFC' }}>
            {['Label','Count','Avg Words','Avg Chars','Positive%','Negative%','Avg Reading Level'].map(h=>(
              <th key={h} style={{ padding:'7px 10px', textAlign:'left', color:'var(--muted)', fontWeight:700, borderBottom:'2px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {labels.map(lbl=>{
              const group = analyzed.filter(d=>d.label===lbl);
              const n     = group.length;
              const avgW  = +(group.reduce((s,d)=>s+d.wordCount,0)/n).toFixed(0);
              const avgC  = +(group.reduce((s,d)=>s+d.charCount,0)/n).toFixed(0);
              const posP  = +(group.filter(d=>d.sentiment==='positive').length/n*100).toFixed(0);
              const negP  = +(group.filter(d=>d.sentiment==='negative').length/n*100).toFixed(0);
              const avgFL = group.reduce((s,d)=>s+(d.fleschScore||70),0)/n;
              const rl    = avgFL>=70?'Easy':avgFL>=50?'Medium':'Hard';
              return (
                <tr key={lbl} style={{ borderBottom:'1px solid #F1F5F9' }}>
                  <td style={{ padding:'7px 10px', fontWeight:700, color:'var(--text)' }}>{lbl}</td>
                  <td style={{ padding:'7px 10px', color:'var(--muted)' }}>{n}</td>
                  <td style={{ padding:'7px 10px', color:'var(--muted)' }}>{avgW}</td>
                  <td style={{ padding:'7px 10px', color:'var(--muted)' }}>{avgC}</td>
                  <td style={{ padding:'7px 10px', color:'#00956B', fontWeight:600 }}>{posP}%</td>
                  <td style={{ padding:'7px 10px', color:'#DC2626', fontWeight:600 }}>{negP}%</td>
                  <td style={{ padding:'7px 10px' }}><span style={S.tag(rl==='Easy'?'#00CBA8':rl==='Medium'?'#F59E0B':'#EF4444')}>{rl}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {topEmojis.length>0 && (
        <div>
          <span style={S.lbl}>😀 Top Emoji Usage</span>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {topEmojis.map(([emoji,count])=>(
              <div key={emoji} style={{ padding:'5px 10px', background:'#F8FAFC', borderRadius:'6px', border:'1px solid var(--border)', textAlign:'center', minWidth:'48px' }}>
                <div style={{ fontSize:'20px' }}>{emoji}</div>
                <div style={{ fontSize:'10px', color:'var(--muted)', fontWeight:600 }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. VOCAB DIFFICULTY + NON-ENGLISH STOPWORDS
// ══════════════════════════════════════════════════════════════════════════════
export function VocabDifficultyPanel({ analyzed }) {
  const [lang, setLang] = useState('en');

  const EASY_WORDS  = new Set(['good','bad','big','small','old','new','first','last','long','little','own','right','high','next','early','young','important','few','public','private','real','best','free','tell','say','look','come','want','give','use','find','back','know','go','get','make','see','take','think','come','feel','try','leave','call','keep','let','begin','show','hear','play','run','move','live','hold','bring','write','ask','stand','lose','pay','meet','include','continue','set','learn','change','lead','understand','watch','follow','stop','create','speak','read','spend','grow','open','walk','win','offer','remember','love','consider','appear','buy','wait','serve','die','send','expect','build','stay','fall','cut','reach','kill','remain','suggest','raise','pass','sell','require','report','decide','pull']);

  const stats = useMemo(() => {
    if (!analyzed.length) return null;
    const stopWords = lang==='hi' ? HI_STOP : EN_STOP;
    const freq = {};
    analyzed.forEach(d => {
      (d.text||'').toLowerCase().split(/\s+/).filter(w=>w.length>1&&!stopWords.has(w)).forEach(w=>{ freq[w]=(freq[w]||0)+1; });
    });
    const words = Object.entries(freq).sort((a,b)=>b[1]-a[1]);
    const easy   = words.filter(([w])=>EASY_WORDS.has(w)||w.length<=4);
    const medium = words.filter(([w])=>!EASY_WORDS.has(w)&&w.length>4&&w.length<=7);
    const hard   = words.filter(([w])=>!EASY_WORDS.has(w)&&w.length>7);
    return { easy, medium, hard, total:words.length };
  }, [analyzed, lang]);

  if (!stats) return null;

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>📚 Vocabulary Difficulty</div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
        {[['en','English'],['hi','Hindi']].map(([l,name])=>(
          <button key={l} onClick={()=>setLang(l)} style={{ padding:'5px 14px', borderRadius:'5px', fontSize:'11px', fontWeight:lang===l?700:400, cursor:'pointer', background:lang===l?'rgba(0,203,168,.1)':'#F1F5F9', color:lang===l?'#00956B':'var(--muted)', border:lang===l?'1.5px solid #00CBA8':'1px solid var(--border)' }}>{name}</button>
        ))}
      </div>
      {/* Distribution bar */}
      <div style={{ marginBottom:'14px' }}>
        <span style={S.lbl}>Vocabulary Distribution ({stats.total} unique words)</span>
        <div style={{ display:'flex', height:'16px', borderRadius:'8px', overflow:'hidden', marginBottom:'6px' }}>
          {[['Easy',stats.easy.length,'#00CBA8'],['Medium',stats.medium.length,'#F59E0B'],['Hard',stats.hard.length,'#EF4444']].map(([l,n,c])=>(
            <div key={l} title={`${l}: ${n}`} style={{ flex:n, background:c, minWidth:n?'2px':0 }}/>
          ))}
        </div>
        <div style={{ display:'flex', gap:'12px', fontSize:'10px' }}>
          {[['✅ Easy',stats.easy.length,'#00956B'],['⚠ Medium',stats.medium.length,'#B45309'],['❌ Hard/Complex',stats.hard.length,'#DC2626']].map(([l,n,c])=>(
            <span key={l} style={{ color:c, fontWeight:600 }}>{l}: {n} ({stats.total>0?Math.round(n/stats.total*100):0}%)</span>
          ))}
        </div>
      </div>
      {/* Top hard words */}
      {stats.hard.length>0 && (
        <div>
          <span style={S.lbl}>Most frequent complex words (consider simplifying):</span>
          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
            {stats.hard.slice(0,20).map(([w,n])=>(
              <span key={w} style={{ ...S.tag('#EF4444'), fontFamily:'monospace' }}>{w} ({n})</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 9. DOCUMENT STATS TABLE
// ══════════════════════════════════════════════════════════════════════════════
export function DocStatsTable({ docs, analyzed }) {
  const [sortCol, setSortCol] = useState('wordCount');
  const [sortDir, setSortDir] = useState('desc');
  const [page,    setPage]    = useState(0);
  const PAGE = 20;

  const sorted = useMemo(() => {
    const merged = docs.map((d,i)=>({...d,...analyzed[i]}));
    return [...merged].sort((a,b)=>{
      const va=a[sortCol]??0, vb=b[sortCol]??0;
      return sortDir==='asc'?va-vb:vb-va;
    });
  }, [docs, analyzed, sortCol, sortDir]);

  const page_rows = sorted.slice(page*PAGE,(page+1)*PAGE);
  const totalPages= Math.ceil(sorted.length/PAGE);
  const cols = [
    { key:'text',         label:'Text (preview)',    w:'200px' },
    { key:'label',        label:'Label',             w:'80px'  },
    { key:'wordCount',    label:'Words',             w:'60px'  },
    { key:'charCount',    label:'Chars',             w:'60px'  },
    { key:'sentenceCount',label:'Sents',             w:'55px'  },
    { key:'sentiment',    label:'Sentiment',         w:'80px'  },
    { key:'language',     label:'Language',          w:'75px'  },
    { key:'readingLevel', label:'Reading Level',     w:'90px'  },
    { key:'fleschScore',  label:'Flesch',            w:'55px'  },
  ];

  const toggleSort = (k) => { if(sortCol===k){setSortDir(d=>d==='asc'?'desc':'asc');}else{setSortCol(k);setSortDir('desc');} setPage(0); };

  const exportCSV = () => {
    const rows = [cols.map(c=>c.label), ...sorted.map(r=>cols.map(c=>JSON.stringify(String(r[c.key]??'').slice(0,100))))];
    const csv  = rows.map(r=>r.join(',')).join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='text_stats.csv'; a.click();
  };

  if (!analyzed.length) return null;

  return (
    <div style={S.card}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
        <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px' }}>📋 Per-Document Stats Table</div>
        <button onClick={exportCSV} style={{ ...S.btn('#3B82F6'), padding:'5px 14px', fontSize:'11px' }}>↓ Export CSV</button>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ borderCollapse:'collapse', fontSize:'10px', minWidth:'700px', width:'100%' }}>
          <thead>
            <tr style={{ background:'#F8FAFC' }}>
              {cols.map(c=>(
                <th key={c.key} onClick={()=>toggleSort(c.key)} style={{ padding:'6px 8px', textAlign:'left', color:sortCol===c.key?'#00CBA8':'var(--muted)', fontWeight:700, borderBottom:'2px solid var(--border)', cursor:'pointer', whiteSpace:'nowrap', width:c.w }}>
                  {c.label} {sortCol===c.key?(sortDir==='asc'?'▲':'▼'):''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {page_rows.map((row,i)=>(
              <tr key={i} style={{ borderBottom:'1px solid #F8FAFC', background:i%2===0?'#fff':'#FAFAFA' }}>
                <td style={{ padding:'5px 8px', color:'var(--muted)', maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'monospace' }}>{(row.text||'').slice(0,60)}</td>
                <td style={{ padding:'5px 8px', color:'#8B5CF6', fontWeight:600 }}>{row.label||'—'}</td>
                <td style={{ padding:'5px 8px', color:'var(--text)', fontWeight:600 }}>{row.wordCount}</td>
                <td style={{ padding:'5px 8px', color:'var(--muted)' }}>{row.charCount}</td>
                <td style={{ padding:'5px 8px', color:'var(--muted)' }}>{row.sentenceCount}</td>
                <td style={{ padding:'5px 8px' }}>
                  <span style={S.tag(row.sentiment==='positive'?'#00CBA8':row.sentiment==='negative'?'#EF4444':'#94A3B8')}>{row.sentiment}</span>
                </td>
                <td style={{ padding:'5px 8px', color:'var(--muted)' }}>{row.language}</td>
                <td style={{ padding:'5px 8px', color:'var(--muted)' }}>{row.readingLevel}</td>
                <td style={{ padding:'5px 8px', color:'var(--muted)' }}>{row.fleschScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages>1&&(
        <div style={{ display:'flex', gap:'6px', alignItems:'center', marginTop:'10px', justifyContent:'center' }}>
          <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{ ...S.btn('#F1F5F9','var(--muted)'), padding:'4px 10px' }}>‹</button>
          <span style={{ fontSize:'11px', color:'var(--muted)' }}>Page {page+1}/{totalPages}</span>
          <button onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1} style={{ ...S.btn('#F1F5F9','var(--muted)'), padding:'4px 10px' }}>›</button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 10. BUSINESS TEXT REPORT (print-ready)
// ══════════════════════════════════════════════════════════════════════════════
export function TextBusinessReport({ docs, analyzed }) {
  const generate = () => {
    if (!analyzed.length) return;
    const now      = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
    const total    = analyzed.length;
    const avgWords = Math.round(analyzed.reduce((s,d)=>s+d.wordCount,0)/total);
    const langs    = [...new Set(analyzed.map(d=>d.language))];
    const sentDist = { positive:analyzed.filter(d=>d.sentiment==='positive').length, negative:analyzed.filter(d=>d.sentiment==='negative').length, neutral:analyzed.filter(d=>d.sentiment==='neutral').length };
    const labels   = [...new Set(analyzed.map(d=>d.label).filter(Boolean))];
    const labelDist= Object.fromEntries(labels.map(l=>[l,analyzed.filter(d=>d.label===l).length]));
    const readingTm= Math.ceil(analyzed.reduce((s,d)=>s+d.wordCount,0)/200);
    const avgFlesch= analyzed.reduce((s,d)=>s+(d.fleschScore||70),0)/total;
    const readLvl  = avgFlesch>=70?'Easy (general audience)':avgFlesch>=50?'Standard (educated readers)':'Complex (specialist audience)';
    const issues   = analyzed.filter(d=>d.isEmpty||d.isTooShort).length;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Text Dataset Report</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:40px;max-width:900px;margin:auto;}h1{font-size:28px;color:#0f172a;margin-bottom:6px;}.subtitle{color:#64748b;font-size:14px;margin-bottom:32px;}h2{font-size:16px;color:#0f172a;margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid #e2e8f0;}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;}.stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center;}.stat-val{font-size:24px;font-weight:800;color:#0f172a;}.stat-lbl{font-size:11px;color:#64748b;margin-top:4px;}table{width:100%;border-collapse:collapse;font-size:12px;}th{background:#f8fafc;padding:8px 12px;text-align:left;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;}td{padding:7px 12px;border-bottom:1px solid #f1f5f9;}.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;}.good{background:#dcfce7;color:#16a34a;}.warn{background:#fef3c7;color:#d97706;}.bad{background:#fee2e2;color:#dc2626;}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;}@media print{body{padding:20px;}}</style>
</head><body>
<h1>📝 Text Dataset Report</h1>
<div class="subtitle">Generated: ${now} · DataSmithy</div>
<h2>Summary</h2>
<div class="grid">
  <div class="stat"><div class="stat-val">${total.toLocaleString()}</div><div class="stat-lbl">Documents</div></div>
  <div class="stat"><div class="stat-val">${avgWords}</div><div class="stat-lbl">Avg Words</div></div>
  <div class="stat"><div class="stat-val">${readingTm}m</div><div class="stat-lbl">Total Reading Time</div></div>
  <div class="stat"><div class="stat-val ${issues>0?'bad':''}">${issues}</div><div class="stat-lbl">Issue Documents</div></div>
</div>
<h2>Quality</h2>
<table><thead><tr><th>Metric</th><th>Value</th><th>Assessment</th></tr></thead><tbody>
  <tr><td>Reading Level</td><td>${readLvl}</td><td><span class="badge ${avgFlesch>=70?'good':avgFlesch>=50?'warn':'bad'}">${avgFlesch>=70?'Good':'Needs work'}</span></td></tr>
  <tr><td>Languages</td><td>${langs.join(', ')}</td><td><span class="badge ${langs.length===1?'good':'warn'}">${langs.length===1?'Consistent':'Mixed'}</span></td></tr>
  <tr><td>Issue Rate</td><td>${((issues/total)*100).toFixed(1)}%</td><td><span class="badge ${issues===0?'good':issues/total<0.05?'warn':'bad'}">${issues===0?'No issues':issues/total<0.05?'Minor':'Significant'}</span></td></tr>
</tbody></table>
<h2>Sentiment Distribution</h2>
<table><thead><tr><th>Sentiment</th><th>Count</th><th>%</th></tr></thead><tbody>
  ${Object.entries(sentDist).map(([s,n])=>`<tr><td>${s}</td><td>${n}</td><td>${(n/total*100).toFixed(1)}%</td></tr>`).join('')}
</tbody></table>
${labels.length?`<h2>Label Distribution</h2><table><thead><tr><th>Label</th><th>Count</th><th>%</th></tr></thead><tbody>${Object.entries(labelDist).map(([l,n])=>`<tr><td>${l}</td><td>${n}</td><td>${(n/total*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table>`:''}
<div class="footer">Generated by <strong>DataSmithy</strong> — Free browser-based data platform</div>
</body></html>`;
    const w=window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),400);
  };

  return (
    <div style={{ padding:'12px 16px', background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.2)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'#1D4ED8', fontSize:'13px', marginBottom:'4px' }}>📄 Business Report (Print-Ready)</div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'10px' }}>Clean professional summary with document counts, reading level, sentiment breakdown, label distribution. No ML jargon.</div>
      <button onClick={generate} disabled={!analyzed.length} style={{ ...S.btn('#3B82F6'), opacity:!analyzed.length?0.5:1 }}>🖨 Generate & Print Report</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 11. PLAIN TEXT EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export function PlainTextExport({ docs }) {
  const exportTxt = () => {
    const content = docs.map((d,i)=>`Document ${i+1}${d.label?` [${d.label}]`:''}\n${'─'.repeat(40)}\n${d.text}\n`).join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type:'text/plain'})); a.download='dataset.txt'; a.click();
  };
  const exportMarkdown = () => {
    const lines = docs.map((d,i) => `## Document ${i+1}${d.label ? ' — ' + d.label : ''}\n\n${d.text}`);
    const content = '# Text Dataset\n\n' + lines.join('\n\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type:'text/markdown'})); a.download='dataset.md'; a.click();
  };
  const exportXML = () => {
    const content = `<?xml version="1.0" encoding="UTF-8"?>\n<dataset>\n${docs.map((d,i)=>`  <document id="${i+1}" label="${d.label||''}">\n    <text><![CDATA[${d.text}]]></text>\n  </document>`).join('\n')}\n</dataset>`;
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type:'application/xml'})); a.download='dataset.xml'; a.click();
  };

  return (
    <div style={S.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>📤 Additional Export Formats</div>
      <div style={{ display:'grid', gap:'7px' }}>
        {[['📄 Plain Text (.txt)', 'One document per section — readable by anyone', exportTxt, '#64748B'],['📝 Markdown (.md)', 'Formatted with headers — for docs/GitHub/Notion', exportMarkdown, '#1D4ED8'],['🔖 XML (.xml)', 'Structured with CDATA — for enterprise integrations', exportXML, '#7C3AED']].map(([l,d,fn,c])=>(
          <div key={l} style={{ display:'flex', gap:'10px', alignItems:'center', padding:'10px 14px', background:'#F8FAFC', borderRadius:'7px', border:'1px solid var(--border)' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:'12px', color:'var(--text)' }}>{l}</div>
              <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'2px' }}>{d}</div>
            </div>
            <button onClick={fn} disabled={!docs.length} style={{ ...S.btn(c), padding:'5px 14px', fontSize:'11px', opacity:!docs.length?0.5:1 }}>↓</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — add these as a new sub-tab in TextNLPTab
// ══════════════════════════════════════════════════════════════════════════════
export default function TextNLPUniversalTab({ docs, analyzed }) {
  const [subTab, setSubTab] = useState('readability');

  const SUBTABS = [
    { id:'readability', label:'⏱ Readability' },
    { id:'keywords',    label:'🔑 Keywords' },
    { id:'wordcloud',   label:'☁️ Word Cloud' },
    { id:'ner',         label:'🔍 Entities' },
    { id:'concordance', label:'📖 Concordance' },
    { id:'similarity',  label:'🔁 Similarity' },
    { id:'perlabel',    label:'📊 Per Label' },
    { id:'vocab',       label:'📚 Vocab Level' },
    { id:'table',       label:'📋 Doc Table' },
    { id:'export2',     label:'📤 More Export' },
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
      {!analyzed.length && <div style={{ padding:'20px', textAlign:'center', fontSize:'12px', color:'var(--muted)', background:'#F8FAFC', borderRadius:'10px', border:'1px dashed var(--border)' }}>Import text data first from the Import tab to use these features.</div>}
      {subTab==='readability' && <><ReadabilityPanel analyzed={analyzed}/><TextBusinessReport docs={docs} analyzed={analyzed}/></>}
      {subTab==='keywords'    && <KeywordDensityPanel docs={docs}/>}
      {subTab==='wordcloud'   && <WordCloudPanel analyzed={analyzed}/>}
      {subTab==='ner'         && <NERPanel docs={docs}/>}
      {subTab==='concordance' && <ConcordancePanel docs={docs}/>}
      {subTab==='similarity'  && <TextSimilarityPanel docs={docs}/>}
      {subTab==='perlabel'    && <PerLabelStats analyzed={analyzed}/>}
      {subTab==='vocab'       && <VocabDifficultyPanel analyzed={analyzed}/>}
      {subTab==='table'       && <DocStatsTable docs={docs} analyzed={analyzed}/>}
      {subTab==='export2'     && <PlainTextExport docs={docs}/>}
    </div>
  );
}

/*
═══════════════════════════════════════════════════════════════
INTEGRATION GUIDE — add to TextNLPTab.jsx
═══════════════════════════════════════════════════════════════
IMPORT (top of TextNLPTab.jsx):
  import TextNLPUniversalTab from './TextNLPUniversal.jsx';

ADD TO SUBTABS array in TextNLPTab:
  { id:'universal', label:'🌐 Universal' }

ADD TO TAB PANELS in TextNLPTab:
  {subTab==='universal' && (
    <TextNLPUniversalTab docs={docs} analyzed={analyzed}/>
  )}

THAT'S IT. docs and analyzed are already in TextNLPTab state.
No additional props or wiring needed.
*/