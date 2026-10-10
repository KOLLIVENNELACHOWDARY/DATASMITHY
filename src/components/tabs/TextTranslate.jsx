// src/components/tabs/TextTranslate.jsx
// Free translation using MyMemory API (no API key needed, 5000 chars/day free)

import React, { useState, useCallback } from 'react';

// 50+ supported languages
const LANGUAGES = [
  { code:'en', name:'English' },    { code:'hi', name:'Hindi' },
  { code:'te', name:'Telugu' },     { code:'ta', name:'Tamil' },
  { code:'kn', name:'Kannada' },    { code:'ml', name:'Malayalam' },
  { code:'bn', name:'Bengali' },    { code:'mr', name:'Marathi' },
  { code:'gu', name:'Gujarati' },   { code:'pa', name:'Punjabi' },
  { code:'ur', name:'Urdu' },       { code:'or', name:'Odia' },
  { code:'as', name:'Assamese' },
  { code:'zh', name:'Chinese (Simplified)' },
  { code:'zh-TW', name:'Chinese (Traditional)' },
  { code:'ja', name:'Japanese' },   { code:'ko', name:'Korean' },
  { code:'ar', name:'Arabic' },     { code:'fr', name:'French' },
  { code:'de', name:'German' },     { code:'es', name:'Spanish' },
  { code:'pt', name:'Portuguese' }, { code:'it', name:'Italian' },
  { code:'ru', name:'Russian' },    { code:'tr', name:'Turkish' },
  { code:'nl', name:'Dutch' },      { code:'pl', name:'Polish' },
  { code:'sv', name:'Swedish' },    { code:'da', name:'Danish' },
  { code:'fi', name:'Finnish' },    { code:'nb', name:'Norwegian' },
  { code:'el', name:'Greek' },      { code:'he', name:'Hebrew' },
  { code:'th', name:'Thai' },       { code:'vi', name:'Vietnamese' },
  { code:'id', name:'Indonesian' }, { code:'ms', name:'Malay' },
  { code:'fa', name:'Persian' },    { code:'ro', name:'Romanian' },
  { code:'hu', name:'Hungarian' },  { code:'cs', name:'Czech' },
  { code:'sk', name:'Slovak' },     { code:'uk', name:'Ukrainian' },
  { code:'bg', name:'Bulgarian' },  { code:'hr', name:'Croatian' },
  { code:'sr', name:'Serbian' },    { code:'ca', name:'Catalan' },
  { code:'af', name:'Afrikaans' },  { code:'sw', name:'Swahili' },
];

const BATCH_SIZE = 3; // translate N docs at a time (API rate limit)
const DELAY_MS   = 300; // ms between batches

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function translateText(text, fromLang, toLang) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=${fromLang}|${toLang}`;
  const res  = await fetch(url);
  const data = await res.json();
  if (data.responseStatus !== 200) throw new Error(data.responseDetails || 'Translation failed');
  return data.responseData.translatedText;
}

export default function TextTranslate({ docs, analyzed, onTranslated }) {
  const [fromLang,    setFromLang]    = useState('en');
  const [toLang,      setToLang]      = useState('hi');
  const [translating, setTranslating] = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [translated,  setTranslated]  = useState([]);
  const [error,       setError]       = useState('');
  const [preview,     setPreview]     = useState(null);
  const [exportFmt,   setExportFmt]   = useState('csv');
  const [cancel,      setCancel]      = useState(false);

  const docsToTranslate = (docs || []).filter(d => d.text?.trim());

  const runTranslation = useCallback(async () => {
    if (!docsToTranslate.length) { setError('No documents to translate.'); return; }
    setTranslating(true); setProgress(0); setError(''); setTranslated([]); setCancel(false);

    const results = [];
    const total   = docsToTranslate.length;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      if (cancel) break;
      const batch = docsToTranslate.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (doc, j) => {
        try {
          const translatedText = await translateText(doc.text, fromLang, toLang);
          results[i + j] = { ...doc, originalText: doc.text, text: translatedText, translated: true };
        } catch(e) {
          results[i + j] = { ...doc, translationError: e.message };
        }
      }));

      setProgress(Math.round(((i + BATCH_SIZE) / total) * 100));
      setTranslated([...results]);
      if (i + BATCH_SIZE < total) await sleep(DELAY_MS);
    }

    setTranslating(false);
    if (results.length > 0) setPreview(results.slice(0, 3));
  }, [docsToTranslate, fromLang, toLang, cancel]);

  const exportTranslated = () => {
    if (!translated.length) return;
    let content = '', filename = '';
    const toLangName = LANGUAGES.find(l => l.code === toLang)?.name || toLang;

    if (exportFmt === 'csv') {
      const headers = ['original_text','translated_text','label'];
      const rows    = translated.map(d => [
        JSON.stringify(d.originalText || d.text),
        JSON.stringify(d.text),
        JSON.stringify(d.label || ''),
      ]);
      content  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      filename = `translated_${toLangName.toLowerCase()}.csv`;
    } else if (exportFmt === 'jsonl') {
      content  = translated.map(d => JSON.stringify({ text: d.text, original: d.originalText, label: d.label })).join('\n');
      filename = `translated_${toLangName.toLowerCase()}.jsonl`;
    } else {
      content  = translated.map(d => d.text).join('\n\n---\n\n');
      filename = `translated_${toLangName.toLowerCase()}.txt`;
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type:'text/plain' }));
    a.download = filename; a.click();
  };

  const swapLangs = () => { setFromLang(toLang); setToLang(fromLang); setTranslated([]); setPreview(null); };

  const S = {
    card:  { background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px', padding:'16px', marginBottom:'14px' },
    label: { fontSize:'10px', fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.5px', display:'block', marginBottom:'5px' },
    select:{ padding:'7px 10px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'12px', background:'#fff', width:'100%' },
    btn:   (bg='#00CBA8', c='#fff') => ({ background:bg, color:c, border:'none', borderRadius:'6px', padding:'8px 18px', fontSize:'12px', fontWeight:700, cursor:'pointer' }),
    tag:   (c='#00CBA8') => ({ padding:'2px 8px', borderRadius:'4px', fontSize:'10px', fontWeight:700, background:`${c}18`, color:c }),
  };

  return (
    <div style={{ display:'grid', gap:'14px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
        <span style={{ fontSize:'24px' }}>🌍</span>
        <div>
          <div style={{ fontWeight:800, fontSize:'15px', color:'var(--text)' }}>Dataset Translation</div>
          <div style={{ fontSize:'11px', color:'var(--muted)' }}>
            Translate {docsToTranslate.length} documents • Free, no API key • MyMemory API
          </div>
        </div>
      </div>

      {/* Language selector */}
      <div style={S.card}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'10px', alignItems:'end' }}>
          <div>
            <span style={S.label}>From Language</span>
            <select value={fromLang} onChange={e => setFromLang(e.target.value)} style={S.select}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <button onClick={swapLangs} title="Swap languages" style={{ background:'#F1F5F9', border:'1px solid var(--border)', borderRadius:'8px', padding:'8px 12px', cursor:'pointer', fontSize:'16px', marginBottom:'1px' }}>⇄</button>
          <div>
            <span style={S.label}>To Language</span>
            <select value={toLang} onChange={e => setToLang(e.target.value)} style={S.select}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:'flex', gap:'8px', marginTop:'12px', flexWrap:'wrap' }}>
          {[
            [`📄 ${docsToTranslate.length} docs`, '#00CBA8'],
            [`⏱ ~${Math.ceil(docsToTranslate.length / BATCH_SIZE * DELAY_MS / 1000)}s estimated`, '#F59E0B'],
            ['🔒 Free · No key needed', '#8B5CF6'],
            ['✂️ 500 chars per doc', '#64748B'],
          ].map(([t, c]) => <span key={t} style={S.tag(c)}>{t}</span>)}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
        <button onClick={runTranslation} disabled={translating || !docsToTranslate.length} style={{ ...S.btn(), opacity:translating?0.6:1 }}>
          {translating ? `⏳ Translating ${progress}%...` : `🌍 Translate ${docsToTranslate.length} Documents`}
        </button>
        {translating && (
          <button onClick={() => setCancel(true)} style={S.btn('#EF4444')}>✕ Cancel</button>
        )}
        {translated.length > 0 && !translating && (
          <button onClick={() => onTranslated?.(translated)} style={S.btn('#3B82F6')}>
            ✅ Use Translated Docs
          </button>
        )}
      </div>

      {/* Progress bar */}
      {translating && (
        <div style={{ background:'#E2E8F0', borderRadius:'4px', height:'6px', overflow:'hidden' }}>
          <div style={{ width:`${progress}%`, height:'100%', background:'#00CBA8', transition:'width .3s' }}/>
        </div>
      )}

      {/* Error */}
      {error && <div style={{ padding:'10px 14px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:'7px', fontSize:'12px', color:'#DC2626' }}>❌ {error}</div>}

      {/* Preview */}
      {preview && (
        <div style={S.card}>
          <div style={{ fontWeight:700, fontSize:'12px', color:'var(--text)', marginBottom:'10px' }}>
            Preview (first 3 documents)
          </div>
          {preview.map((d, i) => (
            <div key={i} style={{ marginBottom:'12px', paddingBottom:'12px', borderBottom: i<preview.length-1?'1px solid #E2E8F0':'none' }}>
              <div style={{ fontSize:'10px', color:'var(--muted)', fontWeight:700, marginBottom:'4px' }}>Document {i+1} {d.label ? `· ${d.label}` : ''}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <div style={{ padding:'8px 10px', background:'#F8FAFC', borderRadius:'5px', fontSize:'11px', color:'#64748B', fontStyle:'italic' }}>
                  <div style={{ fontSize:'9px', fontWeight:700, color:'var(--muted)', marginBottom:'3px' }}>ORIGINAL</div>
                  {(d.originalText || '').slice(0, 120)}{(d.originalText||'').length > 120 ? '...' : ''}
                </div>
                <div style={{ padding:'8px 10px', background:'rgba(0,203,168,.06)', borderRadius:'5px', fontSize:'11px', color:'#0F172A', border:'1px solid rgba(0,203,168,.2)' }}>
                  <div style={{ fontSize:'9px', fontWeight:700, color:'#00956B', marginBottom:'3px' }}>TRANSLATED</div>
                  {(d.text || '').slice(0, 120)}{(d.text||'').length > 120 ? '...' : ''}
                </div>
              </div>
              {d.translationError && <div style={{ fontSize:'10px', color:'#DC2626', marginTop:'4px' }}>⚠ {d.translationError}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Export */}
      {translated.length > 0 && !translating && (
        <div style={S.card}>
          <div style={{ fontWeight:700, fontSize:'12px', color:'var(--text)', marginBottom:'10px' }}>
            Export {translated.length} translated documents
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
            {['csv','jsonl','txt'].map(fmt => (
              <button key={fmt} onClick={() => setExportFmt(fmt)} style={{
                padding:'5px 14px', borderRadius:'5px', fontSize:'11px', fontWeight:700, cursor:'pointer',
                background: exportFmt===fmt ? 'rgba(0,203,168,.1)' : '#F1F5F9',
                color:      exportFmt===fmt ? '#00956B' : 'var(--muted)',
                border:     exportFmt===fmt ? '1.5px solid #00CBA8' : '1px solid var(--border)',
              }}>.{fmt.toUpperCase()}</button>
            ))}
            <button onClick={exportTranslated} style={{ ...S.btn('#3B82F6'), marginLeft:'auto' }}>
              ↓ Download .{exportFmt}
            </button>
          </div>
        </div>
      )}

      {/* API note */}
      <div style={{ fontSize:'10px', color:'var(--muted)', padding:'8px 12px', background:'#F8FAFC', borderRadius:'6px', border:'1px solid var(--border)', lineHeight:1.6 }}>
        <strong>Note:</strong> Uses <a href="https://mymemory.translated.net" target="_blank" rel="noreferrer" style={{ color:'#00CBA8' }}>MyMemory API</a> — completely free, no account needed. Limit: 5,000 chars/day without email. For larger datasets, add your email to the API call (no signup required) for 50,000 chars/day. Text is truncated to 500 chars per document.
      </div>
    </div>
  );
}