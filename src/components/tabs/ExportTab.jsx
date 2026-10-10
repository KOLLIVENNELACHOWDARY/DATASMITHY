// src/components/tabs/ExportTab.jsx
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveReport } from '../../firebase/db.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const SITE_URL = 'https://datasmithy.vercel.app'; // ← update after deploy

const FORMATS = [
  { val:'csv',   label:'CSV',        ext:'.csv',   desc:'Works in Excel, Google Sheets, Python, R' },
  { val:'xlsx',  label:'Excel',      ext:'.xlsx',  desc:'Microsoft Excel workbook (.xlsx)' },
  { val:'tsv',   label:'TSV',        ext:'.tsv',   desc:'Tab-separated — good for databases' },
  { val:'json',  label:'JSON',       ext:'.json',  desc:'Array of objects — good for APIs' },
  { val:'jsonl', label:'JSON Lines', ext:'.jsonl', desc:'One row per line — ML / streaming' },
];

function trigger(content, name, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function csvToRows(csv) {
  const lines  = csv.split('\n').filter(Boolean);
  const header = lines[0].split(',');
  return {
    header,
    rows: lines.slice(1).map(line => {
      const vals = []; let cur = ''; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQ = !inQ; continue; }
        if (line[i] === ',' && !inQ) { vals.push(cur); cur = ''; continue; }
        cur += line[i];
      }
      vals.push(cur);
      return Object.fromEntries(header.map((h, i) => [h, vals[i] ?? '']));
    })
  };
}

function toFormat(csv, format, baseName) {
  const { header, rows } = csvToRows(csv);
  if (format === 'csv') {
    trigger(csv, baseName + '.csv', 'text/csv');
  } else if (format === 'tsv') {
    const tsv = [header.join('\t'), ...rows.map(r => header.map(h => r[h] ?? '').join('\t'))].join('\n');
    trigger(tsv, baseName + '.tsv', 'text/tab-separated-values');
  } else if (format === 'json') {
    trigger(JSON.stringify(rows, null, 2), baseName + '.json', 'application/json');
  } else if (format === 'jsonl') {
    trigger(rows.map(r => JSON.stringify(r)).join('\n'), baseName + '.jsonl', 'application/jsonl');
  } else if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, baseName + '.xlsx');
  }
}

function FormatPicker({ value, onChange, accentColor = '#00CBA8', accentHex = 'rgba(0,203,168,.12)' }) {
  return (
    <div>
      <div style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, marginBottom:'8px' }}>
        Choose download format:
      </div>
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'6px' }}>
        {FORMATS.map(f => (
          <button key={f.val} onClick={() => onChange(f.val)} style={{
            padding:'6px 14px', borderRadius:'6px', fontSize:'12px',
            cursor:'pointer', transition:'all .15s', fontWeight: value===f.val ? 700 : 400,
            background: value===f.val ? accentHex : '#fff',
            color:      value===f.val ? accentColor : 'var(--muted)',
            border:     value===f.val ? `1.5px solid ${accentColor}` : '1.5px solid var(--border)',
          }}>
            {f.label}
            <span style={{ fontSize:'10px', opacity:.65, marginLeft:'4px' }}>{f.ext}</span>
          </button>
        ))}
      </div>
      <div style={{ fontSize:'10px', color:'var(--muted)' }}>
        {FORMATS.find(f => f.val === value)?.desc}
      </div>
    </div>
  );
}

// ── Share Button (social) ────────────────────────────────────────────────────
function ShareButton({ analysis, pipelineResult, fileName }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!pipelineResult || !analysis) return null;

  const health  = analysis.health || 0;
  const rows    = (pipelineResult.processed_rows || 0).toLocaleString();
  const cols    = pipelineResult.processed_cols || 0;
  const removed = (pipelineResult.original_rows || 0) - (pipelineResult.processed_rows || 0);
  const file    = (fileName || 'dataset').replace(/\.[^.]+$/, '');
  const emoji   = health >= 80 ? '🟢' : health >= 60 ? '🟡' : '🔴';

  const text = `${emoji} Just cleaned my dataset with DataSmithy!

📊 ${file}
✅ ${rows} rows × ${cols} features
🗑 ${removed.toLocaleString()} duplicates/nulls removed
♥ Health score: ${health}/100

Free data engineering tool — runs 100% in your browser, no install needed.
👉 ${SITE_URL}`;

  const twitterUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE_URL)}&summary=${encodeURIComponent(text)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  const copyText = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: 'rgba(0,203,168,.1)', border:'1.5px solid rgba(0,203,168,.3)',
        borderRadius:'8px', padding:'9px 18px', fontSize:'12px',
        color:'#00956B', cursor:'pointer', fontWeight:700,
        display:'flex', alignItems:'center', gap:'6px', transition:'all .15s'
      }}>
        🔗 Share Results
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, zIndex:998 }} />
          <div style={{
            position:'absolute', top:'calc(100% + 8px)', right:0,
            background:'#fff', border:'1px solid var(--border)',
            borderRadius:'12px', boxShadow:'0 8px 32px rgba(0,0,0,.12)',
            padding:'16px', minWidth:'300px', zIndex:999
          }} className="fade-in">

            <div style={{ background:'linear-gradient(135deg,#00CBA8,#0094BA)', borderRadius:'10px', padding:'14px', marginBottom:'14px', color:'#fff' }}>
              <div style={{ fontSize:'11px', fontWeight:700, opacity:.8, marginBottom:'8px', letterSpacing:'1px' }}>DATASMITHY RESULTS</div>
              <div style={{ fontSize:'18px', fontWeight:800, marginBottom:'4px' }}>{emoji} {file}</div>
              <div style={{ display:'flex', gap:'16px', fontSize:'12px', opacity:.9, marginBottom:'8px' }}>
                <span>📊 {rows} rows</span>
                <span>⚙ {cols} features</span>
              </div>
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <div style={{ flex:1, height:'6px', background:'rgba(255,255,255,.3)', borderRadius:'3px' }}>
                  <div style={{ width:`${health}%`, height:'100%', background:'#fff', borderRadius:'3px', transition:'width .5s' }} />
                </div>
                <span style={{ fontSize:'12px', fontWeight:700 }}>♥ {health}/100</span>
              </div>
            </div>

            <div style={{ display:'grid', gap:'8px' }}>
              <div style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, marginBottom:'2px' }}>Share on:</div>

              <a href={twitterUrl} target="_blank" rel="noreferrer" style={{ textDecoration:'none' }}>
                <button style={{ width:'100%', background:'#000', color:'#fff', border:'none', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'16px' }}>𝕏</span> Share on X (Twitter)
                </button>
              </a>

              <a href={linkedinUrl} target="_blank" rel="noreferrer" style={{ textDecoration:'none' }}>
                <button style={{ width:'100%', background:'#0077B5', color:'#fff', border:'none', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'16px' }}>in</span> Share on LinkedIn
                </button>
              </a>

              <a href={whatsappUrl} target="_blank" rel="noreferrer" style={{ textDecoration:'none' }}>
                <button style={{ width:'100%', background:'#25D366', color:'#fff', border:'none', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'16px' }}>💬</span> Share on WhatsApp
                </button>
              </a>

              <button onClick={copyText} style={{
                width:'100%', background:copied?'rgba(0,203,168,.1)':'var(--bg)',
                color:copied?'#00956B':'var(--muted)',
                border:'1px solid var(--border)', borderRadius:'8px',
                padding:'10px 14px', fontSize:'13px', cursor:'pointer', fontWeight:600,
                display:'flex', alignItems:'center', gap:'10px', transition:'all .2s'
              }}>
                <span style={{ fontSize:'16px' }}>{copied?'✅':'📋'}</span>
                {copied ? 'Copied to clipboard!' : 'Copy text to share'}
              </button>
            </div>

            <div style={{ marginTop:'12px', fontSize:'10px', color:'var(--muted)', textAlign:'center' }}>
              Help us grow by sharing DataSmithy with your network 🙏
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main ExportTab ────────────────────────────────────────────────────────────
export default function ExportTab({
  analysis, fileName, pipelineResult, pipelineLog,
  processedCsv, pythonCode, onRunPipeline, processing
}) {
  const { user } = useAuth();
  const [fmt,        setFmt]        = useState('csv');
  const [splitFmt,   setSplitFmt]   = useState('csv');
  const [splitRatio, setSplitRatio] = useState(80);
  const [copied,     setCopied]     = useState(false);

  const [shareUrl,   setShareUrl]   = useState('');
  const [generating, setGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const BASE = (fileName || 'data').replace(/\.[^.]+$/, '');

  const downloadProcessed = () => {
    if (!processedCsv) return;
    toFormat(processedCsv, fmt, `datasmithy_processed_${BASE}`);
  };

  const downloadSplit = () => {
    if (!processedCsv) return;
    const lines   = processedCsv.split('\n').filter(Boolean);
    const header  = lines[0];
    const data    = [...lines.slice(1)].sort(() => Math.random() - 0.5);
    const at      = Math.floor(data.length * splitRatio / 100);
    toFormat([header, ...data.slice(0, at)].join('\n'), splitFmt, `train_${BASE}`);
    setTimeout(() => toFormat([header, ...data.slice(at)].join('\n'), splitFmt, `test_${BASE}`), 400);
  };

  const downloadReport = () => {
    trigger(JSON.stringify({
      generated_at:    new Date().toISOString(),
      source_file:     fileName,
      original_shape:  [pipelineResult?.original_rows, pipelineResult?.original_cols],
      processed_shape: [pipelineResult?.processed_rows, pipelineResult?.processed_cols],
      health_score:    analysis?.health,
      health_details:  analysis?.health_details,
      ml_checks:       pipelineResult?.ml_checks,
      column_analysis: analysis?.columns,
      pipeline_steps:  pipelineLog,
    }, null, 2), `datasmithy_report_${Date.now()}.json`, 'application/json');
  };

  const downloadPython = () => trigger(pythonCode || '', 'datasmithy_pipeline.py', 'text/plain');

  const copyCode = () => {
    navigator.clipboard.writeText(pythonCode || '').then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const generateShareLink = async () => {
    if (!user) { alert('Please sign in to generate a shareable link.'); return; }
    setGenerating(true);
    try {
      const id = await saveReport({
        fileName,
        originalRows:  pipelineResult.original_rows,
        originalCols:  pipelineResult.original_cols,
        processedRows: pipelineResult.processed_rows,
        processedCols: pipelineResult.processed_cols,
        health: analysis?.health || 0,
        steps: (pipelineLog || []).map(s => s.msg),
        uid: user.uid,
      });
      if (id) setShareUrl(`${window.location.origin}/report/${id}`);
      else alert('Could not generate link. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const logColor = (type) => ({
    success:'#00956B', done:'#B45309', warn:'#B45309',
    error:'#DC2626', start:'#1D4ED8', info:'var(--muted)'
  }[type] || 'var(--muted)');

  return (
    <div className="fade-in" style={{ display:'grid', gap:'14px' }}>

      {/* Run Pipeline */}
      <div className="card" style={{ padding:'20px' }}>
        <ST>Run DataSmithy Pipeline</ST>
        <p style={{ color:'var(--muted)', fontSize:'12px', marginBottom:'16px', lineHeight:1.6 }}>
          Configure settings in Columns, Clean, Encode, Scale and Features tabs — then run the full automated pipeline.
        </p>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center', marginBottom: pipelineLog.length ? '16px' : 0 }}>
          <button className="btn-primary" onClick={onRunPipeline} disabled={processing}
            style={{ fontSize:'13px', padding:'10px 24px' }}>
            {processing ? '⏳ Processing...' : '⚡ Run Pipeline'}
          </button>
          {pipelineResult && (
            <span className="tag tag-teal" style={{ fontSize:'12px' }}>
              ✅ {pipelineResult.processed_rows?.toLocaleString()} rows × {pipelineResult.processed_cols} features ready
            </span>
          )}
        </div>

        {(pipelineLog.length > 0 || processing) && (
          <div style={{ background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'6px', padding:'12px', maxHeight:'220px', overflowY:'auto', fontFamily:'JetBrains Mono,monospace', fontSize:'11px', marginTop:'16px' }}>
            {pipelineLog.map((e, i) => (
              <div key={i} style={{ padding:'2px 0', color:logColor(e.type), lineHeight:1.6 }}>
                <span style={{ color:'#94A3B8', marginRight:'8px' }}>[{e.time}]</span>{e.msg}
              </div>
            ))}
            {processing && <div style={{ color:'#00CBA8' }} className="pulse">⏳ Running...</div>}
          </div>
        )}
      </div>

      {/* Downloads */}
      {pipelineResult ? (
        <div className="card" style={{ padding:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px', paddingBottom:'8px', borderBottom:'1px solid var(--border)', flexWrap:'wrap', gap:'10px' }}>
            <div style={{ color:'#00CBA8', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase' }}>
              Download Results
            </div>
            <ShareButton analysis={analysis} pipelineResult={pipelineResult} fileName={fileName} />
          </div>

          {/* Shareable report link */}
          <div style={{ marginBottom:'16px' }}>
            {!shareUrl ? (
              <button onClick={generateShareLink} disabled={generating} style={{
                background:'rgba(139,92,246,.1)', color:'#7C3AED',
                border:'1.5px solid rgba(139,92,246,.3)', borderRadius:'8px',
                padding:'8px 16px', fontSize:'12px', cursor:'pointer', fontWeight:600
              }}>
                {generating ? '⏳ Generating...' : '🔗 Generate Shareable Report Link'}
              </button>
            ) : (
              <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', padding:'10px 14px', background:'rgba(139,92,246,.06)', border:'1px solid rgba(139,92,246,.2)', borderRadius:'8px' }}>
                <span style={{ fontSize:'12px', color:'#7C3AED', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:'150px' }}>
                  {shareUrl}
                </span>
                <button onClick={copyShareLink} style={{
                  background:'#7C3AED', color:'#fff', border:'none', borderRadius:'5px',
                  padding:'5px 12px', fontSize:'11px', cursor:'pointer', fontWeight:600
                }}>
                  {linkCopied ? '✅ Copied' : '📋 Copy Link'}
                </button>
              </div>
            )}
            {!user && (
              <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'4px' }}>
                Sign in to generate shareable report links
              </div>
            )}
          </div>

          {/* Processed dataset */}
          <div style={{ padding:'18px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px', marginBottom:'14px' }}>
            <div style={{ display:'flex', gap:'12px', alignItems:'center', marginBottom:'14px' }}>
              <div style={{ fontSize:'32px' }}>📥</div>
              <div>
                <div style={{ fontWeight:700, color:'var(--text)', fontSize:'14px' }}>Processed Dataset</div>
                <div style={{ color:'var(--muted)', fontSize:'12px', marginTop:'2px' }}>
                  {pipelineResult.processed_rows?.toLocaleString()} rows × {pipelineResult.processed_cols} features · cleaned, encoded, scaled
                </div>
              </div>
            </div>
            <FormatPicker value={fmt} onChange={setFmt} />
            <button onClick={downloadProcessed} className="btn-primary"
              style={{ fontSize:'12px', padding:'9px 22px', marginTop:'12px' }}>
              ↓ Download as {FORMATS.find(f=>f.val===fmt)?.label}
            </button>
          </div>

          {/* Train / Test split */}
          <div style={{ padding:'18px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px', marginBottom:'14px' }}>
            <div style={{ display:'flex', gap:'12px', alignItems:'center', marginBottom:'14px' }}>
              <div style={{ fontSize:'32px' }}>✂️</div>
              <div>
                <div style={{ fontWeight:700, color:'var(--text)', fontSize:'14px' }}>Train / Test Split</div>
                <div style={{ color:'var(--muted)', fontSize:'12px', marginTop:'2px' }}>Randomly shuffled and split into two separate files</div>
              </div>
            </div>

            <div style={{ marginBottom:'14px' }}>
              <div style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, marginBottom:'8px' }}>
                Split ratio:{' '}
                <strong style={{ color:'#00CBA8' }}>{splitRatio}% train</strong>{' '}
                ({Math.floor((pipelineResult.processed_rows||0)*splitRatio/100).toLocaleString()} rows)
                {' '}+{' '}
                <strong style={{ color:'#B45309' }}>{100-splitRatio}% test</strong>{' '}
                ({Math.ceil((pipelineResult.processed_rows||0)*(100-splitRatio)/100).toLocaleString()} rows)
              </div>
              <input type="range" min={50} max={90} step={5} value={splitRatio}
                onChange={e => setSplitRatio(Number(e.target.value))}
                style={{ width:'100%', maxWidth:'340px', accentColor:'#00CBA8', display:'block', marginBottom:'4px' }} />
              <div style={{ display:'flex', justifyContent:'space-between', maxWidth:'340px', fontSize:'9px', color:'var(--muted)' }}>
                {[50,60,70,80,90].map(v=><span key={v}>{v}%</span>)}
              </div>
            </div>

            <FormatPicker value={splitFmt} onChange={setSplitFmt}
              accentColor="#B45309" accentHex="rgba(245,158,11,.1)" />
            <button onClick={downloadSplit} style={{
              background:'rgba(245,158,11,.12)', color:'#B45309',
              border:'1.5px solid rgba(245,158,11,.5)', borderRadius:'6px',
              padding:'9px 22px', fontSize:'12px', cursor:'pointer',
              fontWeight:700, marginTop:'12px'
            }}>
              ↓ Download train + test as {FORMATS.find(f=>f.val===splitFmt)?.label}
            </button>
          </div>

          {/* Report + Python */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'20px' }}>
            <div style={{ padding:'16px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
              <div style={{ fontSize:'28px', marginBottom:'8px' }}>📋</div>
              <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'4px' }}>Analysis Report</div>
              <div style={{ color:'var(--muted)', fontSize:'11px', marginBottom:'12px' }}>Full pipeline log, stats, column analysis</div>
              <button onClick={downloadReport} style={{ background:'rgba(59,130,246,.1)', color:'#1D4ED8', border:'1px solid rgba(59,130,246,.3)', borderRadius:'6px', padding:'7px 16px', fontSize:'12px', cursor:'pointer', fontWeight:600 }}>
                ↓ report.json
              </button>
            </div>
            <div style={{ padding:'16px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'10px' }}>
              <div style={{ fontSize:'28px', marginBottom:'8px' }}>🐍</div>
              <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'4px' }}>Python Pipeline</div>
              <div style={{ color:'var(--muted)', fontSize:'11px', marginBottom:'12px' }}>Reproducible sklearn code for your notebook</div>
              <button onClick={downloadPython} style={{ background:'rgba(139,92,246,.1)', color:'#7C3AED', border:'1px solid rgba(139,92,246,.3)', borderRadius:'6px', padding:'7px 16px', fontSize:'12px', cursor:'pointer', fontWeight:600 }}>
                ↓ pipeline.py
              </button>
            </div>
          </div>

          {/* Python code preview */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
              <ST>Generated Python Code</ST>
              <div style={{ display:'flex', gap:'6px' }}>
                <button onClick={copyCode} style={{ background:copied?'rgba(0,203,168,.1)':'#fff', color:copied?'#00956B':'var(--muted)', border:'1px solid var(--border)', borderRadius:'5px', padding:'4px 12px', fontSize:'11px', cursor:'pointer' }}>
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
                <button onClick={downloadPython} style={{ background:'#fff', color:'var(--muted)', border:'1px solid var(--border)', borderRadius:'5px', padding:'4px 12px', fontSize:'11px', cursor:'pointer' }}>↓ .py</button>
              </div>
            </div>
            <div style={{ background:'#1E1E2E', borderRadius:'8px', padding:'16px', maxHeight:'360px', overflowY:'auto', fontFamily:'JetBrains Mono,monospace', fontSize:'11px', color:'#CDD6F4', lineHeight:1.7, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
              {pythonCode
                ? pythonCode.split('\n').map((line,i) => {
                    let color = '#CDD6F4';
                    if (line.startsWith('#')) color = '#6C7086';
                    else if (line.startsWith('import') || line.startsWith('from')) color = '#CBA6F7';
                    else if (line.includes('print(')) color = '#A6E3A1';
                    else if (line.includes('df[') || line.includes('df.')) color = '#89DCEB';
                    return <div key={i} style={{ color }}>{line || '\u00A0'}</div>;
                  })
                : <span style={{ color:'#6C7086' }}># Run the pipeline to generate code</span>
              }
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding:'20px' }}>
          <ST>What You'll Get</ST>
          <div style={{ display:'grid', gap:'10px' }}>
            {[
              ['📥','Processed Dataset','Choose CSV, Excel, TSV, JSON, or JSON Lines'],
              ['✂️','Train / Test Split','Adjustable ratio — download both files at once'],
              ['📋','Analysis Report','Full pipeline log + stats as JSON'],
              ['🐍','Python Pipeline','Paste-ready sklearn code for Jupyter notebooks'],
              ['🔗','Shareable Link','Public read-only summary you can share with your team'],
            ].map(([icon,title,desc]) => (
              <div key={title} style={{ display:'flex', gap:'12px', alignItems:'center', padding:'10px', background:'#F8FAFC', borderRadius:'8px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:'22px', flexShrink:0 }}>{icon}</div>
                <div>
                  <div style={{ fontWeight:600, color:'var(--text)', fontSize:'12px' }}>{title}</div>
                  <div style={{ color:'var(--muted)', fontSize:'11px' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:'16px', padding:'12px 16px', background:'rgba(0,203,168,.06)', border:'1px solid rgba(0,203,168,.2)', borderRadius:'8px', fontSize:'12px', color:'var(--muted)' }}>
            ⬆ Run the pipeline first using the <strong style={{ color:'#00CBA8' }}>⚡ Run Pipeline</strong> button in the top bar to unlock downloads.
          </div>
        </div>
      )}
    </div>
  );
}

function ST({ children }) {
  return (
    <div style={{ color:'#00CBA8', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'12px', paddingBottom:'6px', borderBottom:'1px solid var(--border)' }}>
      {children}
    </div>
  );
}