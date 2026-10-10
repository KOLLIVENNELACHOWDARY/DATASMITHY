// src/components/tabs/ConnectorsTab.jsx — Robust multi-source connector
import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';

// ── CORS Proxy chain — tries each until one works ─────────────────────────────
const PROXIES = [
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

async function fetchWithFallback(url, opts = {}) {
  // Try direct first
  try {
    const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(8000) });
    if (r.ok) return r;
  } catch {}

  // Try each proxy
  for (const proxy of PROXIES) {
    try {
      const r = await fetch(proxy(url), { signal: AbortSignal.timeout(10000) });
      if (r.ok) return r;
    } catch {}
  }
  throw new Error(`Could not reach: ${url.slice(0, 60)}…\nThis URL may be private or blocked by CORS. Try downloading the file and uploading it directly.`);
}

async function parseResponse(res, url) {
  const text = await res.text();
  const ext  = url.split('?')[0].split('.').pop().toLowerCase();
  if (ext === 'json' || text.trim().startsWith('[') || text.trim().startsWith('{')) {
    try {
      const d = JSON.parse(text);
      return Array.isArray(d) ? d : d.data || d.rows || d.items || d.results || [d];
    } catch { throw new Error('Response is not valid JSON'); }
  }
  const result = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
  if (!result.data?.length) throw new Error('No rows found — is this a valid CSV?');
  return result.data;
}

// ── HuggingFace ───────────────────────────────────────────────────────────────
async function loadFromHuggingFace(datasetId, split, limit, hfToken) {
  const base = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(datasetId)}&split=${split}&offset=0&limit=${limit}`;
  const headers = hfToken ? { Authorization: `Bearer ${hfToken}` } : {};

  // Try config=default first, then without config
  const urls = [
    `${base}&config=default`,
    base,
    `${base}&config=plain_text`,
  ];

  let lastErr = '';
  for (const url of urls) {
    try {
      const res = await fetchWithFallback(url, { headers });
      const data = JSON.parse(await res.text());
      const rawRows = data.rows || [];
      if (!rawRows.length) continue;
      return rawRows.map(r => r.row ?? r);
    } catch (e) {
      lastErr = e.message;
    }
  }
  throw new Error(`HuggingFace dataset "${datasetId}" not accessible.\n${lastErr}\n\nTip: Try a simpler dataset like "imdb", "ag_news", or "emotion".`);
}

// ── GitHub URL converter ──────────────────────────────────────────────────────
function toRawGitHub(url) {
  return url
    .replace('https://github.com/', 'https://raw.githubusercontent.com/')
    .replace('/blob/', '/')
    .replace('/tree/', '/');
}

// ── Sample datasets ───────────────────────────────────────────────────────────
const SAMPLES = [
  { name: 'Titanic',        emoji: '🚢', desc: '891 rows · survival prediction',           url: 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv' },
  { name: 'Iris',           emoji: '🌸', desc: '150 rows · 3 flower species',               url: 'https://raw.githubusercontent.com/uiuc-cse/data-fa14/gh-pages/data/iris.csv' },
  { name: 'Wine Quality',   emoji: '🍷', desc: '1599 rows · quality 3–8',                   url: 'https://raw.githubusercontent.com/dsrscientist/dataset1/master/winequality-red.csv' },
  { name: 'IMDB (HF)',      emoji: '🎬', desc: '200 reviews · sentiment labels',            hf: 'imdb',     split: 'train', limit: 200 },
  { name: 'AG News (HF)',   emoji: '📰', desc: '200 news · 4 topic categories',             hf: 'ag_news',  split: 'train', limit: 200 },
  { name: 'Emotion (HF)',   emoji: '😊', desc: '200 texts · 6 emotion labels',              hf: 'emotion',  split: 'train', limit: 200 },
];

export default function ConnectorsTab({ rows, columns, onLoad }) {
  const [source,   setSource]   = useState('url');
  const [loading,  setLoading]  = useState(false);
  const [status,   setStatus]   = useState({ type: '', msg: '' }); // type: success|error|info
  const [preview,  setPreview]  = useState(null);

  // URL
  const [url,      setUrl]      = useState('');
  // HuggingFace
  const [hfId,     setHfId]     = useState('');
  const [hfSplit,  setHfSplit]  = useState('train');
  const [hfLimit,  setHfLimit]  = useState(200);
  const [hfToken,  setHfToken]  = useState(import.meta.env?.VITE_HF_TOKEN || '');
  // GitHub
  const [ghUrl,    setGhUrl]    = useState('');
  // Paste
  const [csvText,  setCsvText]  = useState('');

  const setMsg = (type, msg) => setStatus({ type, msg });
  const reset  = ()           => { setStatus({ type:'', msg:'' }); setPreview(null); };

  const showPreview = (rows, sourceName) => {
    if (!rows?.length) { setMsg('error', 'No rows returned — check the source.'); return; }
    setPreview({ rows, source: sourceName });
    setMsg('success', `✅ Loaded ${rows.length.toLocaleString()} rows × ${Object.keys(rows[0]||{}).length} columns from ${sourceName}`);
  };

  // ── Load from URL ──────────────────────────────────────────────────────────
  const loadURL = useCallback(async (targetUrl) => {
    const u = (targetUrl || url).trim();
    if (!u) { setMsg('error', 'Please enter a URL.'); return; }
    setLoading(true); reset();
    setMsg('info', '⏳ Fetching…');
    try {
      const res  = await fetchWithFallback(u);
      const rows = await parseResponse(res, u);
      showPreview(rows, u.split('/').pop() || 'URL');
    } catch (e) { setMsg('error', e.message); }
    setLoading(false);
  }, [url]);

  // ── Load from HuggingFace ──────────────────────────────────────────────────
  const loadHF = useCallback(async (overrideId, overrideSplit, overrideLimit) => {
    const id    = overrideId    || hfId.trim();
    const split = overrideSplit || hfSplit;
    const limit = overrideLimit || hfLimit;
    if (!id) { setMsg('error', 'Enter a HuggingFace dataset ID.'); return; }
    setLoading(true); reset();
    setMsg('info', `⏳ Loading "${id}" from HuggingFace…`);
    try {
      const rows = await loadFromHuggingFace(id, split, limit, hfToken);
      showPreview(rows, `HuggingFace: ${id}`);
    } catch (e) { setMsg('error', e.message); }
    setLoading(false);
  }, [hfId, hfSplit, hfLimit, hfToken]);

  // ── Load from GitHub ───────────────────────────────────────────────────────
  const loadGitHub = useCallback(async () => {
    if (!ghUrl.trim()) { setMsg('error', 'Enter a GitHub file URL.'); return; }
    setLoading(true); reset();
    setMsg('info', '⏳ Fetching from GitHub…');
    try {
      const rawUrl = toRawGitHub(ghUrl.trim());
      const res    = await fetchWithFallback(rawUrl);
      const rows   = await parseResponse(res, rawUrl);
      showPreview(rows, ghUrl.split('/').slice(-1)[0] || 'GitHub file');
    } catch (e) { setMsg('error', e.message); }
    setLoading(false);
  }, [ghUrl]);

  // ── Parse pasted CSV ───────────────────────────────────────────────────────
  const loadPasted = useCallback(() => {
    if (!csvText.trim()) { setMsg('error', 'Paste some CSV text first.'); return; }
    reset();
    try {
      const result = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true, dynamicTyping: false });
      if (!result.data?.length) throw new Error('Could not parse — make sure the first row has column headers.');
      showPreview(result.data, 'Pasted CSV');
    } catch (e) { setMsg('error', e.message); }
  }, [csvText]);

  // ── Confirm load ───────────────────────────────────────────────────────────
  const confirmLoad = () => {
    if (!preview?.rows?.length) return;
    onLoad(preview.rows, Object.keys(preview.rows[0] || {}));
    reset();
    setMsg('success', `✅ ${preview.rows.length.toLocaleString()} rows loaded into DataSmithy!`);
  };

  const TABS = [
    { id: 'url',    icon: '🔗', label: 'URL',          desc: 'Any public CSV / JSON link' },
    { id: 'hf',     icon: '🤗', label: 'HuggingFace',  desc: '100k+ public datasets' },
    { id: 'github', icon: '🐙', label: 'GitHub',       desc: 'Any public file in a repo' },
    { id: 'paste',  icon: '📋', label: 'Paste CSV',    desc: 'Copy-paste text directly' },
    { id: 'sample', icon: '🎯', label: 'Samples',      desc: 'Built-in demo datasets' },
  ];

  const S = {
    inp: { padding: '8px 12px', borderRadius: '7px', border: '1px solid var(--border)', fontSize: '12px', width: '100%', boxSizing: 'border-box', outline: 'none' },
    btn: (bg = '#00CBA8', c = '#fff') => ({ background: bg, color: c, border: 'none', borderRadius: '7px', padding: '9px 20px', fontSize: '12px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1 }),
    lbl: { fontSize: '10px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '.4px' },
  };

  return (
    <div className="card" style={{ padding: '20px', maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text)', marginBottom: '4px' }}>🔌 Connect — Import from External Sources</div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
          Load data from HuggingFace, any public URL, GitHub, or paste CSV directly into DataSmithy.
        </div>
      </div>

      {/* Source tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setSource(t.id); reset(); }} style={{
            padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: source === t.id ? 'rgba(0,203,168,.12)' : '#F8FAFC',
            color:      source === t.id ? '#00956B'             : 'var(--muted)',
            outline:     source === t.id ? '1.5px solid rgba(0,203,168,.4)' : '1px solid var(--border)',
            fontWeight: source === t.id ? 700 : 400,
            fontSize: '12px', transition: 'all .15s',
          }}>
            {t.icon} {t.label}
            <div style={{ fontSize: '9px', marginTop: '2px', opacity: .7, fontWeight: 400 }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* ── URL ── */}
      {source === 'url' && (
        <div style={{ display: 'grid', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.7 }}>
            Paste any <strong>public</strong> CSV or JSON URL. Automatically tries 3 CORS proxies if direct access fails.
          </div>
          <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadURL()} placeholder="https://example.com/data.csv" style={S.inp}/>
          <div>
            <button onClick={() => loadURL()} disabled={loading} style={S.btn()}>
              {loading ? '⏳ Loading…' : '⬇ Import from URL'}
            </button>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', background: '#F8FAFC', padding: '10px 12px', borderRadius: '7px', border: '1px solid var(--border)', lineHeight: 1.8 }}>
            <strong>Quick examples — click to try:</strong>
            {[
              ['Titanic CSV',    'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv'],
              ['Iris dataset',   'https://raw.githubusercontent.com/uiuc-cse/data-fa14/gh-pages/data/iris.csv'],
              ['Wine quality',   'https://raw.githubusercontent.com/dsrscientist/dataset1/master/winequality-red.csv'],
            ].map(([label, u]) => (
              <div key={label}>
                <span onClick={() => { setUrl(u); loadURL(u); }} style={{ color: '#00CBA8', cursor: 'pointer', fontWeight: 600 }}>→ {label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── HuggingFace ── */}
      {source === 'hf' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.7 }}>
            Load any public HuggingFace dataset. Uses the <strong>datasets-server API</strong> — no key needed for public datasets. Add your HF token to unlock private/gated datasets.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
            <div>
              <span style={S.lbl}>Dataset ID</span>
              <input value={hfId} onChange={e => setHfId(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadHF()} placeholder="imdb, ag_news, emotion, tweet_eval…" style={S.inp}/>
            </div>
            <div>
              <span style={S.lbl}>Split</span>
              <select value={hfSplit} onChange={e => setHfSplit(e.target.value)} style={{ ...S.inp, padding: '8px' }}>
                <option value="train">train</option>
                <option value="test">test</option>
                <option value="validation">validation</option>
              </select>
            </div>
            <div>
              <span style={S.lbl}>Rows</span>
              <select value={hfLimit} onChange={e => setHfLimit(Number(e.target.value))} style={{ ...S.inp, padding: '8px' }}>
                {[100,200,500,1000,2000,5000].map(n => <option key={n} value={n}>{n.toLocaleString()}</option>)}
              </select>
            </div>
          </div>
          <div>
            <span style={S.lbl}>HF Token (optional — for private/gated datasets)</span>
            <input value={hfToken} onChange={e => setHfToken(e.target.value)} placeholder="hf_… (get at huggingface.co/settings/tokens)" type="password" style={S.inp}/>
          </div>
          <div>
            <button onClick={() => loadHF()} disabled={loading} style={S.btn()}>
              {loading ? '⏳ Loading from HuggingFace…' : '🤗 Load Dataset'}
            </button>
          </div>
          <div>
            <span style={S.lbl}>Popular public datasets</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['imdb','ag_news','emotion','tweet_eval','yelp_review_full','banking77','sst2','trec'].map(id => (
                <button key={id} onClick={() => { setHfId(id); loadHF(id); }} disabled={loading} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '5px', border: '1px solid var(--border)', background: '#F8FAFC', cursor: 'pointer', color: 'var(--muted)', fontWeight: 500 }}>
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── GitHub ── */}
      {source === 'github' && (
        <div style={{ display: 'grid', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.7 }}>
            Paste any <strong>GitHub file URL</strong> (normal or raw). DataSmithy auto-converts to the raw format and fetches the file.
          </div>
          <input value={ghUrl} onChange={e => setGhUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadGitHub()} placeholder="https://github.com/user/repo/blob/main/data.csv" style={S.inp}/>
          <div>
            <button onClick={loadGitHub} disabled={loading} style={S.btn()}>
              {loading ? '⏳ Loading…' : '🐙 Import from GitHub'}
            </button>
          </div>
          <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: '7px', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--muted)', lineHeight: 1.8 }}>
            <strong>How to get the URL:</strong><br/>
            1. Open any public GitHub repo<br/>
            2. Click on a .csv, .json, or .tsv file<br/>
            3. Copy the URL from your browser — paste it above<br/>
            DataSmithy converts it to raw automatically ✅
          </div>
        </div>
      )}

      {/* ── Paste CSV ── */}
      {source === 'paste' && (
        <div style={{ display: 'grid', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Paste CSV text with a header row as the first line.
          </div>
          <textarea
            value={csvText} onChange={e => setCsvText(e.target.value)}
            placeholder={'name,age,city\nAlice,30,Hyderabad\nBob,25,Mumbai\nCarol,35,Chennai'}
            rows={8}
            style={{ ...S.inp, fontFamily: 'monospace', fontSize: '11px', resize: 'vertical' }}
          />
          <div>
            <button onClick={loadPasted} style={S.btn()}>📋 Load CSV Text</button>
          </div>
        </div>
      )}

      {/* ── Samples ── */}
      {source === 'sample' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '10px' }}>
          {SAMPLES.map(s => (
            <button
              key={s.name}
              onClick={() => s.url ? loadURL(s.url) : loadHF(s.hf, s.split, s.limit)}
              disabled={loading}
              style={{ padding: '16px', borderRadius: '10px', border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#00CBA8'; e.currentTarget.style.background = 'rgba(0,203,168,.04)'; }}
              onMouseOut={e  => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.emoji}</div>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '13px', marginBottom: '4px' }}>{s.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>{s.desc}</div>
              <div style={{ fontSize: '10px', color: s.hf ? '#FFB347' : '#3B82F6', fontWeight: 600 }}>
                {s.hf ? '🤗 HuggingFace' : '📥 Direct download'}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Status ── */}
      {status.msg && (
        <div style={{
          marginTop: '14px', padding: '10px 14px', borderRadius: '8px', fontSize: '12px',
          lineHeight: 1.7, whiteSpace: 'pre-line',
          background: status.type === 'error'   ? 'rgba(239,68,68,.07)'   : status.type === 'success' ? 'rgba(0,203,168,.07)' : 'rgba(59,130,246,.07)',
          border:     status.type === 'error'   ? '1px solid rgba(239,68,68,.25)'  : status.type === 'success' ? '1px solid rgba(0,203,168,.25)' : '1px solid rgba(59,130,246,.25)',
          color:      status.type === 'error'   ? '#DC2626'               : status.type === 'success' ? '#00956B' : '#3B82F6',
        }}>
          {status.msg}
        </div>
      )}

      {/* ── Preview ── */}
      {preview && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text)', marginBottom: '8px' }}>
            Preview — {preview.rows.length.toLocaleString()} rows × {Object.keys(preview.rows[0] || {}).length} columns
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {Object.keys(preview.rows[0] || {}).slice(0, 7).map(col => (
                    <th key={col} style={{ padding: '7px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: 700, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
                  {Object.keys(preview.rows[0] || {}).length > 7 && <th style={{ padding: '7px 12px', color: 'var(--muted)' }}>+{Object.keys(preview.rows[0]).length - 7} more</th>}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 5).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F8FAFC', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    {Object.values(row).slice(0, 7).map((val, j) => (
                      <td key={j} style={{ padding: '6px 12px', color: 'var(--text)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {String(val ?? '').slice(0, 80)}
                      </td>
                    ))}
                    {Object.keys(row).length > 7 && <td style={{ padding: '6px 12px', color: 'var(--muted)' }}>…</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={confirmLoad} style={S.btn()}>✅ Load into DataSmithy</button>
            <button onClick={reset} style={{ ...S.btn('#F1F5F9', 'var(--muted)'), border: '1px solid var(--border)' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}