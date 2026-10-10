// src/components/tabs/UniversalExtras.jsx
// MODE TOGGLE + BUSINESS REPORT + SQL EXPORT + LOOKUP REPLACE + PIVOT + RESHAPE

import React, { useState, useMemo } from 'react';

const card = { background:'#fff', border:'1px solid var(--border)', borderRadius:'10px', padding:'16px', marginBottom:'14px' };
const inp  = { padding:'7px 12px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'12px', width:'100%', boxSizing:'border-box' };
const btn  = (bg='#00CBA8', c='#fff') => ({ background:bg, color:c, border:'none', borderRadius:'6px', padding:'7px 18px', fontSize:'12px', fontWeight:700, cursor:'pointer' });
const lbl  = { fontSize:'11px', color:'var(--muted)', fontWeight:600, display:'block', marginBottom:'4px' };

// ══════════════════════════════════════════════════════════════════════════════
// 1. MODE TOGGLE — General vs ML
// ══════════════════════════════════════════════════════════════════════════════
export function ModeToggle({ mode, onModeChange }) {
  return (
    <div style={{ display:'inline-flex', background:'#F1F5F9', borderRadius:'8px', padding:'3px', gap:'2px' }}>
      {[
        { id:'general', label:'🧹 General Cleaning', desc:'For analysts, researchers, journalists' },
        { id:'ml',      label:'🤖 ML Preparation',   desc:'For data scientists & ML engineers' },
      ].map(m=>(
        <button key={m.id} onClick={()=>onModeChange(m.id)}
          title={m.desc}
          style={{ padding:'6px 18px', borderRadius:'6px', fontSize:'12px', fontWeight:700, cursor:'pointer', transition:'all .15s',
            background: mode===m.id ? '#fff' : 'transparent',
            color: mode===m.id ? 'var(--text)' : 'var(--muted)',
            boxShadow: mode===m.id ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
          }}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. LOOKUP / REPLACE (like VLOOKUP — map codes to names)
// ══════════════════════════════════════════════════════════════════════════════
export function LookupReplacePanel({ rows, columns, onApply, onAudit }) {
  const [col,     setCol]     = useState(columns[0]||'');
  const [newCol,  setNewCol]  = useState('');
  const [mode,    setMode]    = useState('replace'); // replace | add_new
  const [table,   setTable]   = useState(''); // "key,value\n..." format
  const [fallback,setFallback]= useState('keep'); // keep | blank | error

  // Built-in lookup tables
  const PRESETS = {
    'Indian States (code→name)': 'AP,Andhra Pradesh\nAR,Arunachal Pradesh\nAS,Assam\nBR,Bihar\nCT,Chhattisgarh\nGA,Goa\nGJ,Gujarat\nHR,Haryana\nHP,Himachal Pradesh\nJH,Jharkhand\nKA,Karnataka\nKL,Kerala\nMP,Madhya Pradesh\nMH,Maharashtra\nMN,Manipur\nML,Meghalaya\nMZ,Mizoram\nNL,Nagaland\nOR,Odisha\nPB,Punjab\nRJ,Rajasthan\nSK,Sikkim\nTN,Tamil Nadu\nTG,Telangana\nTR,Tripura\nUP,Uttar Pradesh\nUT,Uttarakhand\nWB,West Bengal\nDL,Delhi',
    'Month number→name': '1,January\n2,February\n3,March\n4,April\n5,May\n6,June\n7,July\n8,August\n9,September\n10,October\n11,November\n12,December',
    'Boolean (1/0 → Yes/No)': '1,Yes\n0,No\ntrue,Yes\nfalse,No',
    'Gender codes': 'M,Male\nF,Female\nO,Other\nU,Unknown',
  };

  const parseTable = () => Object.fromEntries(table.trim().split('\n').filter(l=>l.includes(',')).map(l=>{ const i=l.indexOf(','); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; }));

  const runApply = () => {
    const map = parseTable();
    const targetCol = mode==='replace' ? col : (newCol.trim()||col+'_mapped');
    const newRows = rows.map(r => {
      const v   = String(r[col]??'');
      const mapped = map[v] ?? map[v.toLowerCase()] ?? map[v.toUpperCase()];
      const result = mapped !== undefined ? mapped : (fallback==='keep' ? v : fallback==='blank' ? '' : `UNMAPPED: ${v}`);
      return { ...r, [targetCol]: result };
    });
    const desc = `Lookup replace on "${col}" → ${Object.keys(map).length} mappings`;
    onApply(newRows, desc); onAudit?.(desc);
  };

  return (
    <div style={card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>🗂 Lookup / Replace (VLOOKUP-style)</div>
      <div style={{ marginBottom:'10px' }}>
        <span style={lbl}>Load a preset mapping:</span>
        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
          {Object.keys(PRESETS).map(k=>(
            <button key={k} onClick={()=>setTable(PRESETS[k])} style={{ padding:'4px 10px', fontSize:'10px', borderRadius:'4px', border:'1px solid var(--border)', background:'#F8FAFC', cursor:'pointer', color:'var(--muted)', fontWeight:600 }}>{k}</button>
          ))}
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
        <div><span style={lbl}>Source Column</span><select value={col} onChange={e=>setCol(e.target.value)} style={inp}>{columns.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><span style={lbl}>Apply to</span>
          <select value={mode} onChange={e=>setMode(e.target.value)} style={inp}>
            <option value="replace">Replace values in same column</option>
            <option value="add_new">Add as new column</option>
          </select>
        </div>
      </div>
      {mode==='add_new' && <div style={{ marginBottom:'10px' }}><span style={lbl}>New Column Name</span><input style={inp} value={newCol} onChange={e=>setNewCol(e.target.value)} placeholder="mapped_column"/></div>}
      <div style={{ marginBottom:'10px' }}>
        <span style={lbl}>Mapping Table (one "key,value" per line):</span>
        <textarea value={table} onChange={e=>setTable(e.target.value)} style={{ ...inp, height:'120px', fontFamily:'monospace', resize:'vertical' }} placeholder={"MH,Maharashtra\nDL,Delhi\nKA,Karnataka"}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'10px', alignItems:'flex-end', marginBottom:'10px' }}>
        <div><span style={lbl}>If no match:</span>
          <select value={fallback} onChange={e=>setFallback(e.target.value)} style={inp}>
            <option value="keep">Keep original value</option>
            <option value="blank">Leave blank</option>
            <option value="error">Mark as UNMAPPED</option>
          </select>
        </div>
        <button onClick={runApply} disabled={!table.trim()} style={btn()}>✅ Apply Mapping</button>
      </div>
      <div style={{ fontSize:'10px', color:'var(--muted)' }}>
        {table.trim() ? `${Object.keys(parseTable()).length} mappings loaded` : 'No mappings yet — load a preset or type your own'}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. PIVOT + RESHAPE
// ══════════════════════════════════════════════════════════════════════════════
export function ReshapePanel({ rows, columns, onApply, onAudit }) {
  const [op,      setOp]      = useState('pivot');
  const [rowCol,  setRowCol]  = useState(columns[0]||'');
  const [colCol,  setColCol]  = useState(columns[1]||'');
  const [valCol,  setValCol]  = useState(columns[2]||'');
  const [aggFn,   setAggFn]   = useState('sum');
  const [meltCols,setMeltCols]= useState([]);
  const [idCols,  setIdCols]  = useState([]);
  const [preview, setPreview] = useState(null);

  const runPivot = (preview=false) => {
    const rowVals = [...new Set(rows.map(r=>String(r[rowCol]??'')))].sort();
    const colVals = [...new Set(rows.map(r=>String(r[colCol]??'')))].sort();
    const cells   = {};
    rows.forEach(r => {
      const rk = String(r[rowCol]??''), ck = String(r[colCol]??''), v = parseFloat(r[valCol]) || 0;
      if (!cells[rk]) cells[rk] = {};
      if (!cells[rk][ck]) cells[rk][ck] = [];
      cells[rk][ck].push(v);
    });
    const agg = (arr) => ({ sum:arr.reduce((s,v)=>s+v,0), mean:arr.reduce((s,v)=>s+v,0)/arr.length, count:arr.length, min:Math.min(...arr), max:Math.max(...arr) }[aggFn] ?? 0);
    const result = rowVals.map(rv => { const r={[rowCol]:rv}; colVals.forEach(cv=>r[cv]=cells[rv]?.[cv] ? +agg(cells[rv][cv]).toFixed(3) : 0); return r; });
    if (preview) setPreview(result.slice(0,5));
    else { onApply(result, `Pivot: rows="${rowCol}" cols="${colCol}" values="${valCol}" agg="${aggFn}"`); onAudit?.(`Pivot table created`); setPreview(null); }
  };

  const runMelt = () => {
    if (!idCols.length || !meltCols.length) return;
    const result = [];
    rows.forEach(r => {
      meltCols.forEach(mc => {
        const newRow = {};
        idCols.forEach(ic=>newRow[ic]=r[ic]);
        newRow['variable'] = mc;
        newRow['value']    = r[mc] ?? '';
        result.push(newRow);
      });
    });
    onApply(result, `Melt: ${meltCols.join(',')} → variable/value`);
    onAudit?.(`Melt/Unpivot: ${meltCols.length} columns → rows`);
    setPreview(null);
  };

  return (
    <div style={card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>🔄 Pivot & Reshape</div>
      <div style={{ display:'flex', gap:'6px', marginBottom:'14px' }}>
        {[['pivot','📊 Pivot Table (rows→cols)'],['melt','🔀 Melt/Unpivot (cols→rows)']].map(([o,l])=>(
          <button key={o} onClick={()=>{setOp(o);setPreview(null);}} style={{ padding:'6px 16px', borderRadius:'6px', fontSize:'11px', fontWeight:700, cursor:'pointer', background:op===o?'rgba(0,203,168,.1)':'#F1F5F9', color:op===o?'#00956B':'var(--muted)', border:op===o?'1.5px solid #00CBA8':'1px solid var(--border)' }}>{l}</button>
        ))}
      </div>

      {op==='pivot' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'8px', marginBottom:'12px' }}>
            {[['Row Column', rowCol, setRowCol], ['Column Column', colCol, setColCol], ['Value Column', valCol, setValCol]].map(([lbl2,val,set])=>(
              <div key={lbl2}><span style={lbl}>{lbl2}</span><select value={val} onChange={e=>set(e.target.value)} style={inp}>{columns.map(c=><option key={c}>{c}</option>)}</select></div>
            ))}
            <div><span style={lbl}>Aggregation</span><select value={aggFn} onChange={e=>setAggFn(e.target.value)} style={inp}><option value="sum">Sum</option><option value="mean">Mean</option><option value="count">Count</option><option value="min">Min</option><option value="max">Max</option></select></div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={()=>runPivot(true)} style={btn('#F1F5F9','var(--text)')}>👁 Preview</button>
            <button onClick={()=>runPivot(false)} style={btn()}>✅ Create Pivot</button>
          </div>
        </>
      )}

      {op==='melt' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
            <div>
              <span style={lbl}>ID Columns (keep as-is)</span>
              <div style={{ display:'flex', flexDirection:'column', gap:'4px', maxHeight:'120px', overflowY:'auto', padding:'4px', background:'#F8FAFC', borderRadius:'6px', border:'1px solid var(--border)' }}>
                {columns.map(c=>(
                  <label key={c} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', cursor:'pointer' }}>
                    <input type="checkbox" checked={idCols.includes(c)} onChange={e=>setIdCols(prev=>e.target.checked?[...prev,c]:prev.filter(x=>x!==c))}/>
                    {c}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span style={lbl}>Melt Columns (convert to rows)</span>
              <div style={{ display:'flex', flexDirection:'column', gap:'4px', maxHeight:'120px', overflowY:'auto', padding:'4px', background:'#F8FAFC', borderRadius:'6px', border:'1px solid var(--border)' }}>
                {columns.map(c=>(
                  <label key={c} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', cursor:'pointer' }}>
                    <input type="checkbox" checked={meltCols.includes(c)} onChange={e=>setMeltCols(prev=>e.target.checked?[...prev,c]:prev.filter(x=>x!==c))}/>
                    {c}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button onClick={runMelt} disabled={!idCols.length||!meltCols.length} style={btn()}>✅ Melt / Unpivot</button>
        </>
      )}

      {preview && (
        <div style={{ marginTop:'12px', overflowX:'auto' }}>
          <span style={lbl}>Preview (first 5 rows):</span>
          <table style={{ borderCollapse:'collapse', fontSize:'10px', minWidth:'400px' }}>
            <thead><tr style={{ background:'#F8FAFC' }}>
              {Object.keys(preview[0]||{}).slice(0,8).map(c=><th key={c} style={{ padding:'5px 8px', textAlign:'left', color:'var(--muted)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{c}</th>)}
            </tr></thead>
            <tbody>
              {preview.map((r,i)=><tr key={i} style={{ borderBottom:'1px solid #F8FAFC' }}>
                {Object.values(r).slice(0,8).map((v,j)=><td key={j} style={{ padding:'4px 8px', fontFamily:'monospace', color:'var(--text)' }}>{String(v??'')}</td>)}
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. SQL EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export function SQLExportPanel({ rows, columns, tableName='my_table' }) {
  const [tbl,    setTbl]    = useState(tableName.replace(/\s+/g,'_').toLowerCase());
  const [dialect,setDialect]= useState('mysql');

  const inferType = (col) => {
    const vals = rows.map(r=>r[col]).filter(v=>v!=null&&v!=='');
    if (!vals.length) return 'TEXT';
    const allNum  = vals.every(v=>!isNaN(parseFloat(String(v))) && isFinite(String(v)));
    if (allNum) {
      const allInt = vals.every(v=>Number.isInteger(parseFloat(String(v))));
      return allInt ? 'INTEGER' : 'FLOAT';
    }
    const allDate = vals.every(v=>!isNaN(new Date(String(v))));
    if (allDate && vals[0].length <= 10) return 'DATE';
    const maxLen = Math.max(...vals.map(v=>String(v).length));
    if (maxLen <= 255) return dialect==='postgres' ? 'VARCHAR(255)' : 'VARCHAR(255)';
    return 'TEXT';
  };

  const generateSQL = () => {
    const colDefs = columns.map(c => `  "${c}" ${inferType(c)}`).join(',\n');
    const create = `CREATE TABLE "${tbl}" (\n${colDefs}\n);\n\n`;
    const escape = v => {
      if (v == null || v === '') return 'NULL';
      const s = String(v).replace(/'/g,"''");
      return `'${s}'`;
    };
    const batchSize = 500;
    let inserts = '';
    for (let i=0;i<rows.length;i+=batchSize) {
      const batch = rows.slice(i,i+batchSize);
      inserts += `INSERT INTO "${tbl}" (${columns.map(c=>'"'+c+'"').join(', ')}) VALUES\n`;
      inserts += batch.map(r=>`  (${columns.map(c=>escape(r[c])).join(', ')})`).join(',\n');
      inserts += ';\n\n';
    }
    return create + inserts;
  };

  const download = () => {
    const sql = generateSQL();
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([sql],{type:'text/sql'})); a.download=`${tbl}.sql`; a.click();
  };

  const sqlPreview = useMemo(() => generateSQL().slice(0,800), [rows, columns, tbl, dialect]);

  return (
    <div style={card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>🗄 SQL Export</div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'10px', marginBottom:'12px' }}>
        <div><span style={lbl}>Table Name</span><input value={tbl} onChange={e=>setTbl(e.target.value.replace(/\s+/g,'_').toLowerCase())} style={inp}/></div>
        <div><span style={lbl}>SQL Dialect</span><select value={dialect} onChange={e=>setDialect(e.target.value)} style={inp}><option value="mysql">MySQL</option><option value="postgres">PostgreSQL</option><option value="sqlite">SQLite</option><option value="mssql">MS SQL Server</option></select></div>
      </div>
      <div style={{ marginBottom:'12px' }}>
        <span style={lbl}>Column type inference:</span>
        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
          {columns.map(c=><span key={c} style={{ padding:'2px 8px', background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:'4px', fontSize:'10px', fontFamily:'monospace', color:'var(--text)' }}>{c}: <strong style={{color:'#3B82F6'}}>{inferType(c)}</strong></span>)}
        </div>
      </div>
      <pre style={{ background:'#0F172A', color:'#E2E8F0', padding:'12px', borderRadius:'8px', fontSize:'10px', overflowX:'auto', maxHeight:'180px', marginBottom:'12px', fontFamily:'monospace', lineHeight:1.6 }}>
        {sqlPreview}{rows.length>500?'\n\n-- ... more INSERT statements...\n':'\n'}
      </pre>
      <button onClick={download} style={btn()}>↓ Download .sql ({rows.length} rows, {columns.length} columns)</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. BUSINESS REPORT EXPORT (clean PDF summary, no ML jargon)
// ══════════════════════════════════════════════════════════════════════════════
export function BusinessReportExport({ rows, columns, analysis, fileName='dataset' }) {
  const generate = () => {
    const now    = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
    const missCols = columns.filter(c => rows.some(r=>r[c]==null||r[c]===''));
    const numCols  = columns.filter(c => rows.some(r=>!isNaN(parseFloat(r[c]))));
    const txtCols  = columns.filter(c => !numCols.includes(c));
    const dupCount = rows.length - new Set(rows.map(r=>JSON.stringify(r))).size;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Data Quality Report — ${fileName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#1e293b; padding:40px; max-width:900px; margin:auto; }
  h1 { font-size:28px; color:#0f172a; margin-bottom:6px; }
  .subtitle { color:#64748b; font-size:14px; margin-bottom:32px; }
  h2 { font-size:16px; color:#0f172a; margin:28px 0 12px; padding-bottom:6px; border-bottom:2px solid #e2e8f0; }
  .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
  .stat { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; text-align:center; }
  .stat-val { font-size:26px; font-weight:800; color:#0f172a; }
  .stat-lbl { font-size:11px; color:#64748b; margin-top:4px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { background:#f8fafc; padding:8px 12px; text-align:left; color:#64748b; font-weight:600; border-bottom:2px solid #e2e8f0; }
  td { padding:7px 12px; border-bottom:1px solid #f1f5f9; color:#334155; }
  tr:hover td { background:#f8fafc; }
  .good  { color:#16a34a; font-weight:600; }
  .warn  { color:#d97706; font-weight:600; }
  .bad   { color:#dc2626; font-weight:600; }
  .badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:700; }
  .badge-green { background:#dcfce7; color:#16a34a; }
  .badge-yellow { background:#fef3c7; color:#d97706; }
  .badge-red { background:#fee2e2; color:#dc2626; }
  .footer { margin-top:40px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; text-align:center; }
  @media print { body { padding:20px; } }
</style>
</head>
<body>
<h1>📊 Data Quality Report</h1>
<div class="subtitle">File: ${fileName} &nbsp;·&nbsp; Generated: ${now} &nbsp;·&nbsp; Powered by DataSmithy</div>

<h2>Summary</h2>
<div class="grid">
  <div class="stat"><div class="stat-val">${rows.length.toLocaleString()}</div><div class="stat-lbl">Total Rows</div></div>
  <div class="stat"><div class="stat-val">${columns.length}</div><div class="stat-lbl">Columns</div></div>
  <div class="stat"><div class="stat-val ${dupCount>0?'bad':'good'}">${dupCount}</div><div class="stat-lbl">Duplicate Rows</div></div>
  <div class="stat"><div class="stat-val ${missCols.length>0?'warn':'good'}">${missCols.length}</div><div class="stat-lbl">Columns with Missing</div></div>
</div>

<h2>Column Overview</h2>
<table>
<thead><tr><th>Column</th><th>Type</th><th>Missing Values</th><th>Unique Values</th><th>Status</th></tr></thead>
<tbody>
${columns.map(c => {
  const vals    = rows.map(r=>r[c]);
  const missing = vals.filter(v=>v==null||v==='').length;
  const unique  = new Set(vals.filter(v=>v!=null&&v!=='')).size;
  const pct     = ((missing/rows.length)*100).toFixed(1);
  const isNum   = vals.some(v=>!isNaN(parseFloat(String(v))));
  const status  = missing===0 ? '<span class="badge badge-green">✓ Complete</span>' : parseFloat(pct)>50 ? '<span class="badge badge-red">⚠ High Missing</span>' : '<span class="badge badge-yellow">△ Some Missing</span>';
  return `<tr><td><strong>${c}</strong></td><td>${isNum?'Number':'Text'}</td><td class="${missing>0?'warn':'good'}">${missing} (${pct}%)</td><td>${unique.toLocaleString()}</td><td>${status}</td></tr>`;
}).join('\n')}
</tbody>
</table>

${numCols.length > 0 ? `
<h2>Numeric Column Statistics</h2>
<table>
<thead><tr><th>Column</th><th>Min</th><th>Max</th><th>Average</th><th>Median</th></tr></thead>
<tbody>
${numCols.slice(0,10).map(c => {
  const nums = rows.map(r=>parseFloat(r[c])).filter(v=>!isNaN(v));
  if (!nums.length) return '';
  const sorted = [...nums].sort((a,b)=>a-b);
  const med = sorted[Math.floor(sorted.length/2)];
  const avg = nums.reduce((s,v)=>s+v,0)/nums.length;
  const fmt = v => Math.abs(v)>=1000 ? v.toLocaleString('en-IN',{maximumFractionDigits:2}) : v.toFixed(2);
  return `<tr><td><strong>${c}</strong></td><td>${fmt(sorted[0])}</td><td>${fmt(sorted[sorted.length-1])}</td><td>${fmt(avg)}</td><td>${fmt(med)}</td></tr>`;
}).join('\n')}
</tbody>
</table>` : ''}

<h2>Recommendations</h2>
<table>
<thead><tr><th>Issue</th><th>Action</th><th>Priority</th></tr></thead>
<tbody>
${dupCount > 0 ? `<tr><td>${dupCount} duplicate rows found</td><td>Remove duplicates in DataSmithy → Clean tab</td><td><span class="badge badge-red">High</span></td></tr>` : ''}
${missCols.map(c => { const pct=((rows.filter(r=>r[c]==null||r[c]==='').length/rows.length)*100).toFixed(1); return `<tr><td>${pct}% missing in "${c}"</td><td>Fill with mean/median/mode or remove</td><td><span class="badge ${parseFloat(pct)>50?'badge-red':'badge-yellow'}">${parseFloat(pct)>50?'High':'Medium'}</span></td></tr>`; }).join('\n')}
${dupCount===0&&missCols.length===0?`<tr><td colspan="3" class="good" style="text-align:center">✅ No major issues found — data looks clean!</td></tr>`:''}
</tbody>
</table>

<div class="footer">Generated by <strong>DataSmithy</strong> — Free browser-based data cleaning platform</div>
</body>
</html>`;

    const w = window.open('','_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(()=>w.print(), 500);
  };

  return (
    <div style={{ padding:'14px', background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.2)', borderRadius:'10px' }}>
      <div style={{ fontWeight:700, color:'#1D4ED8', fontSize:'13px', marginBottom:'6px' }}>📄 Business Report (Print-ready)</div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px', lineHeight:1.6 }}>
        Generates a clean, professional data quality report with summary stats, column overview, and recommendations. No ML jargon — suitable for sharing with managers, clients, or stakeholders.
      </div>
      <button onClick={generate} style={btn('#3B82F6')}>🖨 Generate & Print Report</button>
    </div>
  );
}

/*
═══════════════════════════════════════════════════════════════════
INTEGRATION GUIDE
═══════════════════════════════════════════════════════════════════

IMPORT in MainApp.jsx:
  import { ModeToggle, LookupReplacePanel, ReshapePanel, SQLExportPanel, BusinessReportExport } from '../components/tabs/UniversalExtras.jsx';

STATE:
  const [mode, setMode] = useState('general'); // 'general' | 'ml'

ADD ModeToggle to header area (above tab bar):
  <ModeToggle mode={mode} onModeChange={setMode}/>

HIDE ML TABS when mode === 'general':
  Only show these when mode === 'ml':
    - Encode tab
    - Scale tab
    - ML Ready tab
    - Python Export tab

ADD to UniversalCleanTab or Export tab:
  <LookupReplacePanel rows={rows} columns={columns} onApply={...} onAudit={...}/>
  <ReshapePanel rows={rows} columns={columns} onApply={...} onAudit={...}/>
  <SQLExportPanel rows={rows} columns={columns} tableName={fileName}/>
  <BusinessReportExport rows={rows} columns={columns} fileName={fileName}/>
*/