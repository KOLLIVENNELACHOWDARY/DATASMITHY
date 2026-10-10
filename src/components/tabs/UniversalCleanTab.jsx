// src/components/tabs/UniversalCleanTab.jsx
// UNIVERSAL DATA CLEANING — for everyone, not just ML engineers
// Covers: String ops, format standardization, formula columns,
//         fuzzy deduplication, dataset join, validation rules, audit trail

import React, { useState, useMemo, useCallback, useRef } from 'react';

// ─── shared style helpers ────────────────────────────────────────────────────
const card  = { background:'#fff', border:'1px solid var(--border)', borderRadius:'10px', padding:'16px', marginBottom:'14px' };
const label = { fontSize:'11px', color:'var(--muted)', fontWeight:600, display:'block', marginBottom:'4px' };
const inp   = { padding:'7px 12px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'12px', width:'100%', boxSizing:'border-box' };
const btn   = (bg='#00CBA8', color='#fff') => ({ background:bg, color, border:'none', borderRadius:'6px', padding:'7px 18px', fontSize:'12px', fontWeight:700, cursor:'pointer' });
const tag   = (c='#00CBA8', bg='rgba(0,203,168,.1)') => ({ display:'inline-block', padding:'2px 8px', borderRadius:'4px', fontSize:'10px', fontWeight:700, color:c, background:bg, border:`1px solid ${c}33` });

// ══════════════════════════════════════════════════════════════════════════════
// 1. STRING OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════
function StringOpsPanel({ rows, columns, onApply, onAudit }) {
  const [col,    setCol]    = useState(columns[0] || '');
  const [op,     setOp]     = useState('trim');
  const [arg,    setArg]    = useState('');
  const [arg2,   setArg2]   = useState('');
  const [preview, setPreview] = useState(null);

  const OPS = [
    { key:'trim',         label:'✂️ Trim whitespace',        needsArg:false },
    { key:'upper',        label:'🔠 UPPERCASE',               needsArg:false },
    { key:'lower',        label:'🔡 lowercase',               needsArg:false },
    { key:'title',        label:'📝 Title Case',              needsArg:false },
    { key:'remove_special',label:'🚿 Remove special chars',   needsArg:false },
    { key:'remove_numbers',label:'🔢 Remove numbers',         needsArg:false },
    { key:'keep_numbers', label:'#️⃣ Keep numbers only',       needsArg:false },
    { key:'replace',      label:'🔄 Find & Replace',          needsArg:true, placeholder:'Find...', placeholder2:'Replace with...' },
    { key:'regex_replace',label:'⚡ Regex Replace',           needsArg:true, placeholder:'Pattern (regex)...', placeholder2:'Replace with...' },
    { key:'prefix',       label:'⬅️ Add Prefix',              needsArg:true, placeholder:'Prefix text...' },
    { key:'suffix',       label:'➡️ Add Suffix',              needsArg:true, placeholder:'Suffix text...' },
    { key:'split_col',    label:'✂️ Split into 2 columns',    needsArg:true, placeholder:'Delimiter (e.g. space, comma)...' },
    { key:'extract',      label:'🔍 Extract substring',       needsArg:true, placeholder:'Start index...', placeholder2:'End index...' },
    { key:'pad_left',     label:'⬛ Pad left (zero-fill)',    needsArg:true, placeholder:'Total length (e.g. 6)...' },
    { key:'strip_html',   label:'🧹 Strip HTML tags',         needsArg:false },
  ];

  const applyOp = (value) => {
    const v = String(value ?? '');
    switch(op) {
      case 'trim':           return v.trim();
      case 'upper':          return v.toUpperCase();
      case 'lower':          return v.toLowerCase();
      case 'title':          return v.replace(/\b\w/g, c => c.toUpperCase());
      case 'remove_special': return v.replace(/[^a-zA-Z0-9\s]/g, '');
      case 'remove_numbers': return v.replace(/[0-9]/g, '');
      case 'keep_numbers':   return v.replace(/[^0-9.]/g, '');
      case 'replace':        return v.split(arg).join(arg2);
      case 'regex_replace':  try { return v.replace(new RegExp(arg, 'g'), arg2); } catch { return v; }
      case 'prefix':         return arg + v;
      case 'suffix':         return v + arg;
      case 'split_col':      return v; // handled separately in apply
      case 'extract':        return v.slice(parseInt(arg)||0, parseInt(arg2)||undefined);
      case 'pad_left':       return v.padStart(parseInt(arg)||0, '0');
      case 'strip_html':     return v.replace(/<[^>]*>/g, '');
      default:               return v;
    }
  };

  const runPreview = () => {
    const sample = rows.slice(0, 5).map(r => ({ before: String(r[col] ?? ''), after: applyOp(r[col]) }));
    setPreview(sample);
  };

  const runApply = () => {
    if (op === 'split_col') {
      const delim  = arg || ' ';
      const colA   = col + '_1', colB = col + '_2';
      const newRows = rows.map(r => {
        const parts = String(r[col]??'').split(delim);
        return { ...r, [colA]: parts[0]||'', [colB]: parts.slice(1).join(delim)||'' };
      });
      onApply(newRows, `Split "${col}" into "${colA}" and "${colB}" by "${delim}"`);
    } else {
      const newRows = rows.map(r => ({ ...r, [col]: applyOp(r[col]) }));
      const opLabel = OPS.find(o=>o.key===op)?.label || op;
      onApply(newRows, `${opLabel} on column "${col}"`);
    }
    onAudit?.(`String op: ${OPS.find(o=>o.key===op)?.label} on "${col}"`);
    setPreview(null);
  };

  const curOp = OPS.find(o=>o.key===op);

  return (
    <div style={card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>✏️ String Operations</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
        <div>
          <span style={label}>Column</span>
          <select value={col} onChange={e=>setCol(e.target.value)} style={inp}>
            {columns.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <span style={label}>Operation</span>
          <select value={op} onChange={e=>{setOp(e.target.value);setPreview(null);setArg('');setArg2('');}} style={inp}>
            {OPS.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
      </div>
      {curOp?.needsArg && (
        <div style={{ display:'grid', gridTemplateColumns: curOp.placeholder2 ? '1fr 1fr' : '1fr', gap:'8px', marginBottom:'10px' }}>
          <div><span style={label}>Argument 1</span><input style={inp} value={arg} onChange={e=>setArg(e.target.value)} placeholder={curOp.placeholder}/></div>
          {curOp.placeholder2 && <div><span style={label}>Argument 2</span><input style={inp} value={arg2} onChange={e=>setArg2(e.target.value)} placeholder={curOp.placeholder2}/></div>}
        </div>
      )}
      <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
        <button onClick={runPreview} style={btn('#F1F5F9','var(--text)')}>👁 Preview (5 rows)</button>
        <button onClick={runApply}   style={btn()}>✅ Apply to All Rows</button>
      </div>
      {preview && (
        <div>
          <span style={label}>Preview</span>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
            <thead><tr style={{ background:'#F8FAFC' }}>
              <th style={{ padding:'6px 10px', textAlign:'left', color:'var(--muted)', borderBottom:'1px solid var(--border)' }}>Before</th>
              <th style={{ padding:'6px 10px', textAlign:'left', color:'var(--muted)', borderBottom:'1px solid var(--border)' }}>After</th>
            </tr></thead>
            <tbody>
              {preview.map((p,i)=>(
                <tr key={i} style={{ borderBottom:'1px solid #F8FAFC' }}>
                  <td style={{ padding:'5px 10px', color:'#94A3B8', fontFamily:'monospace' }}>{p.before || <em>empty</em>}</td>
                  <td style={{ padding:'5px 10px', color:'#00956B', fontFamily:'monospace', fontWeight:600 }}>{p.after || <em>empty</em>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. FORMAT STANDARDIZATION
// ══════════════════════════════════════════════════════════════════════════════
function FormatPanel({ rows, columns, onApply, onAudit }) {
  const [col,    setCol]    = useState(columns[0] || '');
  const [fmt,    setFmt]    = useState('date_auto');
  const [outFmt, setOutFmt] = useState('YYYY-MM-DD');
  const [preview,setPreview]= useState(null);

  const FORMATS = [
    { key:'date_auto',   label:'📅 Date → standard format',    group:'Date' },
    { key:'phone_in',    label:'📱 Phone → Indian format',     group:'Phone' },
    { key:'phone_intl',  label:'📱 Phone → International +XX', group:'Phone' },
    { key:'email_norm',  label:'📧 Email → lowercase + trim',  group:'Email' },
    { key:'email_valid', label:'✅ Flag invalid emails',        group:'Email' },
    { key:'currency_in', label:'💰 Currency → ₹ number',       group:'Currency' },
    { key:'currency_usd',label:'💵 Currency → $ number',       group:'Currency' },
    { key:'pincode_in',  label:'📮 PIN code → 6-digit',        group:'India Specific' },
    { key:'pan_upper',   label:'🪪 PAN → UPPERCASE + validate', group:'India Specific' },
    { key:'aadhar_mask', label:'🔒 Aadhaar → mask first 8',    group:'India Specific' },
    { key:'number_norm', label:'🔢 Number → remove commas/spaces', group:'Number' },
    { key:'pct_to_dec',  label:'💯 Percentage → decimal (50% → 0.5)', group:'Number' },
    { key:'bool_norm',   label:'☑️ Boolean → true/false (Yes/No/1/0)', group:'Other' },
    { key:'whitespace',  label:'⬛ Multiple spaces → single space', group:'Other' },
  ];

  const parseDate = (v) => {
    const s = String(v).trim();
    const fmts = [
      /^(\d{2})\/(\d{2})\/(\d{4})$/,  // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/,   // DD-MM-YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/,   // YYYY-MM-DD (already fine)
      /^(\d{2})\.(\d{2})\.(\d{4})$/,  // DD.MM.YYYY
      /^(\w{3})\s(\d{1,2}),?\s(\d{4})$/, // Jan 10, 2024
    ];
    const d = new Date(s);
    if (!isNaN(d)) return d;
    for (const f of fmts) {
      const m = s.match(f);
      if (m) return new Date(`${m[3]}-${m[1]}-${m[2]}`);
    }
    return null;
  };

  const standardize = (value) => {
    const v = String(value ?? '').trim();
    switch(fmt) {
      case 'date_auto': {
        const d = parseDate(v);
        if (!d || isNaN(d)) return v;
        const y = d.getFullYear(), mo = String(d.getMonth()+1).padStart(2,'0'), dy = String(d.getDate()).padStart(2,'0');
        if (outFmt === 'YYYY-MM-DD') return `${y}-${mo}-${dy}`;
        if (outFmt === 'DD/MM/YYYY') return `${dy}/${mo}/${y}`;
        if (outFmt === 'MM/DD/YYYY') return `${mo}/${dy}/${y}`;
        if (outFmt === 'DD-MM-YYYY') return `${dy}-${mo}-${y}`;
        return `${y}-${mo}-${dy}`;
      }
      case 'phone_in': {
        const digits = v.replace(/\D/g,'');
        const core   = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
        return core.length === 10 ? `+91-${core.slice(0,5)}-${core.slice(5)}` : v;
      }
      case 'phone_intl': {
        const digits = v.replace(/\D/g,'');
        return digits.length >= 10 ? `+${digits}` : v;
      }
      case 'email_norm':  return v.toLowerCase().trim();
      case 'email_valid': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : `INVALID: ${v}`;
      case 'currency_in': return String(parseFloat(v.replace(/[₹,\s]/g,'')) || v);
      case 'currency_usd':return String(parseFloat(v.replace(/[$,\s]/g,'')) || v);
      case 'pincode_in':  { const d=v.replace(/\D/g,''); return d.padStart(6,'0').slice(-6); }
      case 'pan_upper':   { const p=v.toUpperCase().trim(); return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p) ? p : `INVALID: ${p}`; }
      case 'aadhar_mask': { const d=v.replace(/\D/g,''); return d.length===12 ? `XXXX-XXXX-${d.slice(8)}` : v; }
      case 'number_norm': return String(parseFloat(v.replace(/[,\s]/g,'')) || v);
      case 'pct_to_dec':  return String(parseFloat(v.replace('%','').trim())/100 || v);
      case 'bool_norm':   {
        const l=v.toLowerCase().trim();
        if (['yes','true','1','y','on'].includes(l)) return 'true';
        if (['no','false','0','n','off'].includes(l)) return 'false';
        return v;
      }
      case 'whitespace':  return v.replace(/\s+/g,' ').trim();
      default: return v;
    }
  };

  const runPreview = () => setPreview(rows.slice(0,5).map(r=>({ before:String(r[col]??''), after:standardize(r[col]) })));
  const runApply = () => {
    const newRows = rows.map(r => ({ ...r, [col]: standardize(r[col]) }));
    const fmtLabel = FORMATS.find(f=>f.key===fmt)?.label || fmt;
    onApply(newRows, `Format: ${fmtLabel} on "${col}"`);
    onAudit?.(`Format: ${fmtLabel} on "${col}"`);
    setPreview(null);
  };

  const groups = [...new Set(FORMATS.map(f=>f.group))];

  return (
    <div style={card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>📐 Format Standardization</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
        <div>
          <span style={label}>Column</span>
          <select value={col} onChange={e=>setCol(e.target.value)} style={inp}>
            {columns.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <span style={label}>Format</span>
          <select value={fmt} onChange={e=>{setFmt(e.target.value);setPreview(null);}} style={inp}>
            {groups.map(g=>(
              <optgroup key={g} label={g}>
                {FORMATS.filter(f=>f.group===g).map(f=><option key={f.key} value={f.key}>{f.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      {fmt === 'date_auto' && (
        <div style={{ marginBottom:'10px' }}>
          <span style={label}>Output Format</span>
          <select value={outFmt} onChange={e=>setOutFmt(e.target.value)} style={{...inp, width:'auto'}}>
            {['YYYY-MM-DD','DD/MM/YYYY','DD-MM-YYYY','MM/DD/YYYY'].map(f=><option key={f}>{f}</option>)}
          </select>
        </div>
      )}
      <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
        <button onClick={runPreview} style={btn('#F1F5F9','var(--text)')}>👁 Preview</button>
        <button onClick={runApply}   style={btn()}>✅ Apply</button>
      </div>
      {preview && (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
          <thead><tr style={{ background:'#F8FAFC' }}>
            <th style={{ padding:'6px 10px', textAlign:'left', color:'var(--muted)', borderBottom:'1px solid var(--border)' }}>Before</th>
            <th style={{ padding:'6px 10px', textAlign:'left', color:'var(--muted)', borderBottom:'1px solid var(--border)' }}>After</th>
          </tr></thead>
          <tbody>
            {preview.map((p,i)=>(
              <tr key={i} style={{ borderBottom:'1px solid #F8FAFC' }}>
                <td style={{ padding:'5px 10px', color:'#94A3B8', fontFamily:'monospace' }}>{p.before}</td>
                <td style={{ padding:'5px 10px', color: p.after.startsWith('INVALID') ? '#DC2626' : '#00956B', fontFamily:'monospace', fontWeight:600 }}>{p.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. FORMULA COLUMNS (expression evaluator — like Excel)
// ══════════════════════════════════════════════════════════════════════════════
function FormulaPanel({ rows, columns, onApply, onAudit }) {
  const [newCol,  setNewCol]  = useState('');
  const [formula, setFormula] = useState('');
  const [preview, setPreview] = useState(null);
  const [error,   setError]   = useState('');

  const evalFormula = (row) => {
    // Build a safe scope with column values + math functions
    const scope = { ...row };
    // Also allow column names without spaces via alias
    columns.forEach(c => { scope[c.replace(/\s+/g,'_')] = row[c]; });
    const mathFns = { abs:Math.abs, round:Math.round, floor:Math.floor, ceil:Math.ceil, sqrt:Math.sqrt, pow:Math.pow, min:Math.min, max:Math.max, log:Math.log, log10:Math.log10, IF:(cond,a,b)=>cond?a:b, CONCAT:(...a)=>a.join(''), TRIM:s=>String(s).trim(), UPPER:s=>String(s).toUpperCase(), LOWER:s=>String(s).toLowerCase(), LEN:s=>String(s).length, NOW:()=>new Date().toISOString().split('T')[0], CONTAINS:(s,q)=>String(s).includes(q) };
    const keys = [...Object.keys(scope), ...Object.keys(mathFns)];
    const vals = [...Object.values(scope), ...Object.values(mathFns)];
    // eslint-disable-next-line no-new-func
    return new Function(...keys, `"use strict"; return (${formula})`)(...vals);
  };

  const runPreview = () => {
    setError('');
    try {
      const sample = rows.slice(0,5).map(r => {
        try { return { row:r, result: evalFormula(r) }; }
        catch(e) { return { row:r, result:`Error: ${e.message}` }; }
      });
      setPreview(sample);
    } catch(e) { setError(e.message); }
  };

  const runApply = () => {
    if (!newCol.trim()) { setError('Enter a column name'); return; }
    try {
      const newRows = rows.map(r => { try { return { ...r, [newCol.trim()]: evalFormula(r) }; } catch { return { ...r, [newCol.trim()]: '' }; } });
      onApply(newRows, `Formula column "${newCol}" = ${formula}`);
      onAudit?.(`Added formula column "${newCol}" = ${formula}`);
      setPreview(null); setFormula(''); setNewCol('');
    } catch(e) { setError(e.message); }
  };

  const EXAMPLES = [
    ['Profit Margin', '(Revenue - Cost) / Revenue * 100'],
    ['Full Name', 'CONCAT(First_Name, " ", Last_Name)'],
    ['Is Senior', 'IF(Age >= 60, "Senior", "Non-Senior")'],
    ['Email Domain', 'Email.split("@")[1] || ""'],
    ['Name Length', 'LEN(Name)'],
    ['Price with Tax', 'Price * 1.18'],
    ['Grade', 'IF(Score>=90,"A",IF(Score>=80,"B",IF(Score>=70,"C","D")))'],
  ];

  return (
    <div style={card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>🧮 Formula Columns</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'10px', marginBottom:'10px' }}>
        <div><span style={label}>New Column Name</span><input style={inp} value={newCol} onChange={e=>setNewCol(e.target.value)} placeholder="e.g. profit_margin"/></div>
        <div><span style={label}>Formula (use column names directly)</span><input style={inp} value={formula} onChange={e=>{setFormula(e.target.value);setPreview(null);setError('');}} placeholder="e.g. (Revenue - Cost) / Revenue * 100"/></div>
      </div>
      {error && <div style={{ fontSize:'11px', color:'#DC2626', marginBottom:'8px', padding:'6px 10px', background:'rgba(239,68,68,.06)', borderRadius:'5px' }}>❌ {error}</div>}
      <div style={{ marginBottom:'10px' }}>
        <span style={label}>Quick Examples — click to use:</span>
        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
          {EXAMPLES.map(([name,f])=>(
            <button key={name} onClick={()=>{setNewCol(name.replace(/\s+/g,'_'));setFormula(f);setPreview(null);setError('');}}
              style={{ padding:'3px 10px', fontSize:'10px', borderRadius:'4px', border:'1px solid var(--border)', background:'#F8FAFC', cursor:'pointer', color:'var(--muted)', fontWeight:600 }}>
              {name}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom:'10px' }}>
        <span style={label}>Available columns: </span>
        <span style={{ fontSize:'10px', color:'var(--muted)' }}>{columns.join(' · ')}</span>
      </div>
      <div style={{ marginBottom:'10px' }}>
        <span style={label}>Built-in functions: </span>
        <span style={{ fontSize:'10px', color:'var(--muted)' }}>IF(cond,a,b) · CONCAT(...) · TRIM · UPPER · LOWER · LEN · ABS · ROUND · SQRT · MIN · MAX · CONTAINS(s,q) · NOW()</span>
      </div>
      <div style={{ display:'flex', gap:'8px' }}>
        <button onClick={runPreview} disabled={!formula} style={btn('#F1F5F9','var(--text)')}>👁 Preview</button>
        <button onClick={runApply}   disabled={!formula||!newCol} style={btn()}>➕ Add Column</button>
      </div>
      {preview && (
        <div style={{ marginTop:'12px', overflowX:'auto' }}>
          <table style={{ borderCollapse:'collapse', fontSize:'11px', minWidth:'400px' }}>
            <thead><tr style={{ background:'#F8FAFC' }}>
              {columns.slice(0,3).map(c=><th key={c} style={{ padding:'6px 10px', textAlign:'left', color:'var(--muted)', borderBottom:'1px solid var(--border)' }}>{c}</th>)}
              <th style={{ padding:'6px 10px', textAlign:'left', color:'#00CBA8', fontWeight:700, borderBottom:'1px solid var(--border)' }}>→ {newCol || 'result'}</th>
            </tr></thead>
            <tbody>
              {preview.map((p,i)=>(
                <tr key={i} style={{ borderBottom:'1px solid #F8FAFC' }}>
                  {columns.slice(0,3).map(c=><td key={c} style={{ padding:'5px 10px', color:'#94A3B8', fontFamily:'monospace' }}>{String(p.row[c]??'')}</td>)}
                  <td style={{ padding:'5px 10px', color: String(p.result).startsWith('Error') ? '#DC2626' : '#00956B', fontFamily:'monospace', fontWeight:700 }}>{String(p.result)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. FUZZY DEDUPLICATION (Levenshtein distance — no library)
// ══════════════════════════════════════════════════════════════════════════════
function FuzzyDedupPanel({ rows, columns, onApply, onAudit }) {
  const [col,       setCol]       = useState(columns[0] || '');
  const [threshold, setThreshold] = useState(85);
  const [groups,    setGroups]    = useState(null);
  const [loading,   setLoading]   = useState(false);

  const levenshtein = (a, b) => {
    a = a.toLowerCase().trim(); b = b.toLowerCase().trim();
    if (a === b) return 0;
    const m = a.length, n = b.length;
    const dp = Array.from({length:m+1}, (_,i) => Array.from({length:n+1}, (_,j) => i===0?j:j===0?i:0));
    for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
      dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
    return dp[m][n];
  };

  const similarity = (a, b) => {
    const maxLen = Math.max(a.length, b.length);
    if (!maxLen) return 100;
    return Math.round((1 - levenshtein(a,b)/maxLen) * 100);
  };

  const runFuzzy = async () => {
    setLoading(true);
    await new Promise(r=>setTimeout(r,30));
    const values = rows.map((r,i) => ({ idx:i, val:String(r[col]??'').trim() }));
    const groups = [];
    const matched = new Set();

    for (let i=0;i<values.length;i++) {
      if (matched.has(i) || !values[i].val) continue;
      const group = [i];
      for (let j=i+1;j<values.length;j++) {
        if (matched.has(j) || !values[j].val) continue;
        if (similarity(values[i].val, values[j].val) >= threshold) {
          group.push(j); matched.add(j);
        }
      }
      if (group.length > 1) { groups.push(group); matched.add(i); }
    }
    setGroups(groups.map(g => g.map(i => ({ idx:i, val:values[i].val }))));
    setLoading(false);
  };

  const removeDups = (keepFirst = true) => {
    if (!groups) return;
    const toRemove = new Set();
    groups.forEach(g => { (keepFirst ? g.slice(1) : g.slice(0,-1)).forEach(item => toRemove.add(item.idx)); });
    const newRows = rows.filter((_,i) => !toRemove.has(i));
    onApply(newRows, `Fuzzy dedup on "${col}" (${threshold}% threshold) — removed ${toRemove.size} duplicates`);
    onAudit?.(`Fuzzy dedup: removed ${toRemove.size} near-duplicate rows from "${col}"`);
    setGroups(null);
  };

  return (
    <div style={card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>🔍 Fuzzy Deduplication</div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'12px' }}>
        Finds rows that look similar but aren't identical — e.g. "Infosys", "INFOSYS Ltd.", "Infosys Limited" are all the same company. Uses Levenshtein distance.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
        <div><span style={label}>Column to check</span>
          <select value={col} onChange={e=>setCol(e.target.value)} style={inp}>
            {columns.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div><span style={label}>Similarity threshold: <strong style={{color:'var(--text)'}}>{threshold}%</strong></span>
          <input type="range" min={60} max={99} value={threshold} onChange={e=>setThreshold(+e.target.value)} style={{ width:'100%', accentColor:'#00CBA8', marginTop:'4px' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px', color:'var(--muted)' }}><span>60% (loose)</span><span>99% (strict)</span></div>
        </div>
      </div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
        <button onClick={runFuzzy} disabled={loading} style={btn('#8B5CF6')}>
          {loading ? '⏳ Scanning...' : '🔍 Find Similar Rows'}
        </button>
      </div>
      {groups && (
        <div>
          {groups.length === 0 ? (
            <div style={{ fontSize:'12px', color:'#00956B', padding:'10px 14px', background:'rgba(0,203,168,.07)', borderRadius:'7px' }}>✅ No near-duplicates found at {threshold}% threshold.</div>
          ) : (
            <>
              <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'8px' }}>Found <strong style={{color:'var(--text)'}}>{groups.length} groups</strong> of similar rows:</div>
              <div style={{ maxHeight:'200px', overflowY:'auto', marginBottom:'12px' }}>
                {groups.slice(0,10).map((g,i)=>(
                  <div key={i} style={{ padding:'8px 12px', background:'#F8FAFC', borderRadius:'7px', marginBottom:'6px', border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:'10px', color:'var(--muted)', marginBottom:'4px' }}>Group {i+1} — {g.length} similar values:</div>
                    <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                      {g.map((item,j)=><span key={j} style={{ ...tag(j===0?'#00956B':'#F59E0B', j===0?'rgba(0,203,168,.1)':'rgba(245,158,11,.1)'), fontSize:'11px' }}>{item.val}</span>)}
                    </div>
                  </div>
                ))}
                {groups.length > 10 && <div style={{ fontSize:'10px', color:'var(--muted)', padding:'4px 12px' }}>... and {groups.length-10} more groups</div>}
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={()=>removeDups(true)} style={btn('#00CBA8')}>✅ Keep First, Remove Rest</button>
                <button onClick={()=>removeDups(false)} style={btn('#F59E0B')}>✅ Keep Last, Remove Rest</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. DATA VALIDATION RULES
// ══════════════════════════════════════════════════════════════════════════════
function ValidationPanel({ rows, columns, onApply, onAudit }) {
  const [rules,   setRules]   = useState([{ col:columns[0]||'', type:'not_empty', arg:'', arg2:'' }]);
  const [results, setResults] = useState(null);

  const RULE_TYPES = [
    { key:'not_empty',    label:'Not empty' },
    { key:'is_number',    label:'Is a number' },
    { key:'is_email',     label:'Valid email format' },
    { key:'is_date',      label:'Valid date' },
    { key:'min_value',    label:'Min value ≥', needsArg:true, ph:'Min value' },
    { key:'max_value',    label:'Max value ≤', needsArg:true, ph:'Max value' },
    { key:'min_length',   label:'Min length ≥', needsArg:true, ph:'Min chars' },
    { key:'max_length',   label:'Max length ≤', needsArg:true, ph:'Max chars' },
    { key:'in_list',      label:'Value in list', needsArg:true, ph:'a,b,c (comma-separated)' },
    { key:'not_in_list',  label:'Value NOT in list', needsArg:true, ph:'a,b,c (comma-separated)' },
    { key:'regex',        label:'Matches regex', needsArg:true, ph:'Pattern (e.g. ^[A-Z]{2}$)' },
    { key:'unique',       label:'Must be unique in column' },
    { key:'gt_col',       label:'Greater than column', needsArg:true, ph:'Column name' },
    { key:'lt_col',       label:'Less than column', needsArg:true, ph:'Column name' },
    { key:'positive',     label:'Must be positive (> 0)' },
    { key:'between',      label:'Between two values', needsArg:true, ph:'Min', needsArg2:true, ph2:'Max' },
  ];

  const checkRow = (row, rule) => {
    const v = row[rule.col];
    const s = String(v ?? '').trim();
    switch(rule.type) {
      case 'not_empty':   return s !== '';
      case 'is_number':   return !isNaN(parseFloat(s)) && s !== '';
      case 'is_email':    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
      case 'is_date':     return !isNaN(new Date(s));
      case 'min_value':   return parseFloat(s) >= parseFloat(rule.arg);
      case 'max_value':   return parseFloat(s) <= parseFloat(rule.arg);
      case 'min_length':  return s.length >= parseInt(rule.arg);
      case 'max_length':  return s.length <= parseInt(rule.arg);
      case 'in_list':     return rule.arg.split(',').map(x=>x.trim()).includes(s);
      case 'not_in_list': return !rule.arg.split(',').map(x=>x.trim()).includes(s);
      case 'regex':       try { return new RegExp(rule.arg).test(s); } catch { return false; }
      case 'positive':    return parseFloat(s) > 0;
      case 'gt_col':      return parseFloat(v) > parseFloat(row[rule.arg]);
      case 'lt_col':      return parseFloat(v) < parseFloat(row[rule.arg]);
      case 'between':     { const n=parseFloat(s); return n>=parseFloat(rule.arg)&&n<=parseFloat(rule.arg2); }
      default: return true;
    }
  };

  const runValidation = () => {
    // For unique rule, precompute
    const uniqueSets = {};
    rules.filter(r=>r.type==='unique').forEach(r => {
      const seen = {}; const dups = new Set();
      rows.forEach(row => { const v=String(row[r.col]??''); if(seen[v]) dups.add(v); seen[v]=true; });
      uniqueSets[r.col] = dups;
    });

    const failedRows = [];
    rows.forEach((row, i) => {
      const violations = rules.filter(r => {
        if (r.type === 'unique') return uniqueSets[r.col]?.has(String(row[r.col]??''));
        return !checkRow(row, r);
      });
      if (violations.length) failedRows.push({ idx:i, row, violations });
    });

    const flagged = rows.map((row, i) => {
      const v = rules.filter(r => r.type==='unique' ? uniqueSets[r.col]?.has(String(row[r.col]??'')) : !checkRow(row,r));
      return { ...row, '__validation_errors__': v.map(r=>`${r.col}: ${RULE_TYPES.find(t=>t.key===r.type)?.label}`).join(' | ') };
    });

    setResults({ failedRows, total:rows.length, passCount:rows.length-failedRows.length, flagged });
  };

  const exportFlagged = () => {
    if (!results) return;
    const cols = [...columns, '__validation_errors__'];
    const csv = [cols.join(','), ...results.flagged.filter(r=>r.__validation_errors__).map(r=>cols.map(c=>JSON.stringify(r[c]??'')).join(','))].join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='validation_errors.csv'; a.click();
    onAudit?.(`Exported ${results.failedRows.length} invalid rows to CSV`);
  };

  const removeInvalid = () => {
    if (!results) return;
    const badIdxs = new Set(results.failedRows.map(f=>f.idx));
    onApply(rows.filter((_,i)=>!badIdxs.has(i)), `Removed ${badIdxs.size} invalid rows after validation`);
    onAudit?.(`Validation: removed ${badIdxs.size} invalid rows`);
    setResults(null);
  };

  return (
    <div style={card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>✅ Data Validation Rules</div>
      <div style={{ display:'grid', gap:'8px', marginBottom:'12px' }}>
        {rules.map((rule, i) => {
          const rt = RULE_TYPES.find(t=>t.key===rule.type);
          return (
            <div key={i} style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap', padding:'8px 10px', background:'#F8FAFC', borderRadius:'7px', border:'1px solid var(--border)' }}>
              <select value={rule.col} onChange={e=>setRules(rs=>rs.map((r,j)=>j===i?{...r,col:e.target.value}:r))} style={{...inp,width:'140px'}}>
                {columns.map(c=><option key={c}>{c}</option>)}
              </select>
              <select value={rule.type} onChange={e=>setRules(rs=>rs.map((r,j)=>j===i?{...r,type:e.target.value,arg:'',arg2:''}:r))} style={{...inp,flex:1,minWidth:'160px'}}>
                {RULE_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              {rt?.needsArg  && <input style={{...inp,width:'120px'}} value={rule.arg}  onChange={e=>setRules(rs=>rs.map((r,j)=>j===i?{...r,arg:e.target.value}:r))} placeholder={rt.ph}/>}
              {rt?.needsArg2 && <input style={{...inp,width:'120px'}} value={rule.arg2} onChange={e=>setRules(rs=>rs.map((r,j)=>j===i?{...r,arg2:e.target.value}:r))} placeholder={rt.ph2}/>}
              <button onClick={()=>setRules(rs=>rs.filter((_,j)=>j!==i))} style={{ background:'none', color:'#DC2626', cursor:'pointer', fontSize:'16px', padding:'0 4px' }}>×</button>
            </div>
          );
        })}
        <button onClick={()=>setRules(rs=>[...rs,{col:columns[0]||'',type:'not_empty',arg:'',arg2:''}])} style={{ ...btn('#F1F5F9','var(--muted)'), alignSelf:'flex-start' }}>+ Add Rule</button>
      </div>
      <div style={{ display:'flex', gap:'8px' }}>
        <button onClick={runValidation} style={btn('#3B82F6')}>▶ Run Validation</button>
        {results && <><button onClick={exportFlagged} style={btn('#F59E0B')}>↓ Export Errors CSV</button><button onClick={removeInvalid} style={btn('#DC2626')}>🗑 Remove Invalid Rows</button></>}
      </div>
      {results && (
        <div style={{ marginTop:'12px' }}>
          <div style={{ display:'flex', gap:'10px', marginBottom:'10px' }}>
            <span style={tag('#00956B','rgba(0,203,168,.1)')}>✅ {results.passCount} valid</span>
            <span style={tag('#DC2626','rgba(239,68,68,.1)')}>❌ {results.failedRows.length} invalid</span>
            <span style={tag('#64748B','#F1F5F9')}>{((results.passCount/results.total)*100).toFixed(1)}% pass rate</span>
          </div>
          {results.failedRows.slice(0,5).map((f,i)=>(
            <div key={i} style={{ padding:'7px 12px', background:'rgba(239,68,68,.04)', border:'1px solid rgba(239,68,68,.2)', borderRadius:'6px', marginBottom:'5px', fontSize:'10px' }}>
              <strong style={{ color:'#DC2626' }}>Row {f.idx+1}:</strong> <span style={{ color:'var(--muted)' }}>{f.violations.map(v=>`${v.col} (${RULE_TYPES.find(t=>t.key===v.type)?.label})`).join(' · ')}</span>
            </div>
          ))}
          {results.failedRows.length > 5 && <div style={{ fontSize:'10px', color:'var(--muted)', padding:'4px 12px' }}>... and {results.failedRows.length-5} more invalid rows</div>}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. DATASET JOIN / MERGE
// ══════════════════════════════════════════════════════════════════════════════
function JoinPanel({ rows, columns, onApply, onAudit }) {
  const [b2Rows,  setB2Rows]  = useState(null);
  const [b2Cols,  setB2Cols]  = useState([]);
  const [keyA,    setKeyA]    = useState(columns[0]||'');
  const [keyB,    setKeyB]    = useState('');
  const [joinType,setJoinType]= useState('left');
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();

  const loadFile2 = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h=>h.replace(/"/g,'').trim());
      const data = lines.slice(1).map(l => {
        const vals = l.split(','); return Object.fromEntries(headers.map((h,i)=>[h,(vals[i]||'').replace(/"/g,'').trim()]));
      });
      setB2Cols(headers); setB2Rows(data);
      setKeyB(headers[0]);
    };
    reader.readAsText(file);
  };

  const runJoin = (preview=false) => {
    if (!b2Rows || !keyA || !keyB) return;
    const mapB = {};
    b2Rows.forEach(r => { if (!mapB[r[keyB]]) mapB[r[keyB]] = []; mapB[r[keyB]].push(r); });

    const newCols = b2Cols.filter(c=>c!==keyB);
    let result = [];

    if (joinType === 'left' || joinType === 'inner') {
      rows.forEach(rowA => {
        const key = String(rowA[keyA]??'');
        const matches = mapB[key] || (joinType==='left' ? [null] : []);
        matches.forEach(rowB => {
          const merged = { ...rowA };
          newCols.forEach(c => merged[`${c}_B`] = rowB ? rowB[c] : '');
          result.push(merged);
        });
      });
    } else if (joinType === 'right') {
      const mapA = {};
      rows.forEach(r => { const k=String(r[keyA]??''); if(!mapA[k]) mapA[k]=[]; mapA[k].push(r); });
      b2Rows.forEach(rowB => {
        const matches = mapA[String(rowB[keyB]??'')] || [null];
        matches.forEach(rowA => {
          const merged = rowA ? { ...rowA } : Object.fromEntries(columns.map(c=>[c,'']));
          newCols.forEach(c => merged[`${c}_B`] = rowB[c] || '');
          result.push(merged);
        });
      });
    } else { // full outer
      const usedBKeys = new Set();
      rows.forEach(rowA => {
        const key = String(rowA[keyA]??'');
        const matches = mapB[key];
        if (matches) { matches.forEach(rowB => { usedBKeys.add(key); const m={...rowA}; newCols.forEach(c=>m[`${c}_B`]=rowB[c]||''); result.push(m); }); }
        else { const m={...rowA}; newCols.forEach(c=>m[`${c}_B`]=''); result.push(m); }
      });
      b2Rows.forEach(rowB => {
        if (!usedBKeys.has(String(rowB[keyB]??''))) {
          const m=Object.fromEntries(columns.map(c=>[c,'']));
          newCols.forEach(c=>m[`${c}_B`]=rowB[c]||'');
          m[keyA]=rowB[keyB]; result.push(m);
        }
      });
    }

    if (preview) { setPreview(result.slice(0,5)); }
    else { onApply(result, `${joinType.toUpperCase()} JOIN on "${keyA}" = "${keyB}" — ${result.length} rows`); onAudit?.(`JOIN: ${joinType} join on "${keyA}"="${keyB}" → ${result.length} rows`); setPreview(null); }
  };

  return (
    <div style={card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>🔗 Join / Merge Datasets (like VLOOKUP / SQL JOIN)</div>
      <div style={{ padding:'10px 14px', background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.2)', borderRadius:'7px', fontSize:'11px', color:'#1D4ED8', marginBottom:'12px', lineHeight:1.6 }}>
        <strong>Dataset A</strong> = your current dataset ({rows.length} rows)<br/>
        <strong>Dataset B</strong> = upload a second CSV file to join with
      </div>
      <div style={{ marginBottom:'12px' }}>
        <span style={label}>Upload Dataset B (CSV)</span>
        <input ref={fileRef} type="file" accept=".csv" onChange={loadFile2} style={{ fontSize:'11px', display:'none' }}/>
        <button onClick={()=>fileRef.current?.click()} style={btn('#3B82F6')}>{b2Rows ? `✅ Loaded (${b2Rows.length} rows)` : '📂 Choose CSV File'}</button>
      </div>
      {b2Rows && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'12px' }}>
            <div><span style={label}>Join key (Dataset A)</span>
              <select value={keyA} onChange={e=>setKeyA(e.target.value)} style={inp}>
                {columns.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><span style={label}>Join key (Dataset B)</span>
              <select value={keyB} onChange={e=>setKeyB(e.target.value)} style={inp}>
                {b2Cols.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><span style={label}>Join Type</span>
              <select value={joinType} onChange={e=>setJoinType(e.target.value)} style={inp}>
                <option value="left">LEFT JOIN (keep all of A)</option>
                <option value="inner">INNER JOIN (only matches)</option>
                <option value="right">RIGHT JOIN (keep all of B)</option>
                <option value="full">FULL OUTER (keep everything)</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
            <button onClick={()=>runJoin(true)} style={btn('#F1F5F9','var(--text)')}>👁 Preview</button>
            <button onClick={()=>runJoin(false)} style={btn()}>🔗 Merge Datasets</button>
          </div>
          {preview && (
            <div style={{ overflowX:'auto' }}>
              <table style={{ borderCollapse:'collapse', fontSize:'10px', minWidth:'500px' }}>
                <thead><tr style={{ background:'#F8FAFC' }}>
                  {Object.keys(preview[0]||{}).map(c=><th key={c} style={{ padding:'5px 8px', textAlign:'left', color: c.endsWith('_B')?'#3B82F6':'var(--muted)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{c}</th>)}
                </tr></thead>
                <tbody>
                  {preview.map((r,i)=><tr key={i} style={{ borderBottom:'1px solid #F8FAFC' }}>
                    {Object.values(r).map((v,j)=><td key={j} style={{ padding:'4px 8px', fontFamily:'monospace', color:'var(--text)' }}>{String(v??'')}</td>)}
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. AUDIT TRAIL
// ══════════════════════════════════════════════════════════════════════════════
export function AuditTrail({ log }) {
  if (!log.length) return null;
  const exportLog = () => {
    const text = log.map((l,i)=>`${i+1}. [${l.time}] ${l.action}`).join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'})); a.download='cleaning_audit_log.txt'; a.click();
  };
  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
        <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px' }}>📋 Audit Trail — {log.length} actions</div>
        <button onClick={exportLog} style={{ ...btn('#F1F5F9','var(--muted)'), padding:'5px 12px', fontSize:'11px' }}>↓ Export Log</button>
      </div>
      <div style={{ maxHeight:'200px', overflowY:'auto' }}>
        {[...log].reverse().map((l,i)=>(
          <div key={i} style={{ display:'flex', gap:'10px', padding:'5px 0', borderBottom:'1px solid #F8FAFC', fontSize:'11px' }}>
            <span style={{ color:'var(--muted)', fontFamily:'monospace', flexShrink:0, fontSize:'10px', paddingTop:'1px' }}>{l.time}</span>
            <span style={{ color:'var(--text)' }}>{l.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. MAIN UNIVERSAL CLEAN TAB
// ══════════════════════════════════════════════════════════════════════════════
export default function UniversalCleanTab({ rows = [], columns = [], onApply }) {
  const [auditLog, setAuditLog] = useState([]);
  const [subTab,   setSubTab]   = useState('strings');

  const addAudit = useCallback((action) => {
    const time = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    setAuditLog(prev => [...prev, { time, action }]);
  }, []);

  const SUBTABS = [
    { id:'strings',    label:'✏️ String Ops' },
    { id:'format',     label:'📐 Format' },
    { id:'formula',    label:'🧮 Formula Columns' },
    { id:'fuzzy',      label:'🔍 Fuzzy Dedupe' },
    { id:'validate',   label:'✅ Validation' },
    { id:'join',       label:'🔗 Join Datasets' },
    { id:'finance',    label:'💰 Finance'    },
    { id:'audit',      label:`📋 Audit (${auditLog.length})` },
  ];

  return (
    <div style={{ display:'grid', gap:'14px' }}>
      {/* sub-tab bar */}
      <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
        {SUBTABS.map(t=>(
          <button key={t.id} onClick={()=>setSubTab(t.id)} style={{ padding:'6px 14px', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontWeight:subTab===t.id?700:400, background:subTab===t.id?'rgba(0,203,168,.1)':'#fff', color:subTab===t.id?'#00956B':'var(--muted)', border:subTab===t.id?'1.5px solid #00CBA8':'1px solid var(--border)', transition:'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab==='strings'  && <StringOpsPanel  rows={rows} columns={columns} onApply={onApply} onAudit={addAudit}/>}
      {subTab==='format'   && <FormatPanel     rows={rows} columns={columns} onApply={onApply} onAudit={addAudit}/>}
      {subTab==='formula'  && <FormulaPanel    rows={rows} columns={columns} onApply={onApply} onAudit={addAudit}/>}
      {subTab==='fuzzy'    && <FuzzyDedupPanel rows={rows} columns={columns} onApply={onApply} onAudit={addAudit}/>}
      {subTab==='validate' && <ValidationPanel rows={rows} columns={columns} onApply={onApply} onAudit={addAudit}/>}
      {subTab==='join'     && <JoinPanel       rows={rows} columns={columns} onApply={onApply} onAudit={addAudit}/>}
      {subTab==='finance'  && <FinanceToolsPanel rows={rows} columns={columns} onApply={onApply} onAudit={addAudit}/>}
      {subTab==='audit'    && <AuditTrail log={auditLog}/>}
    </div>
  );
}



// ══════════════════════════════════════════════════════════════════════════════
// 8. FINANCE TOOLS — reconciliation, cash flow, P&L helpers
//    Add these panels to UniversalCleanTab's 'Finance' sub-tab
// ══════════════════════════════════════════════════════════════════════════════
export function FinanceToolsPanel({ rows = [], columns = [], onApply, onAudit }) {
  const [tool,    setTool]    = useState('reconcile');
  const [amtCol,  setAmtCol]  = useState(columns.find(c => /amount|price|cost|value|debit|credit/i.test(c)) || columns[0] || '');
  const [dateCol, setDateCol]  = useState(columns.find(c => /date|time|period/i.test(c)) || '');
  const [catCol,  setCatCol]   = useState(columns.find(c => /category|type|desc|narration/i.test(c)) || '');
  const [refCol,  setRefCol]   = useState(columns.find(c => /ref|id|txn|transaction/i.test(c)) || '');
  const [results, setResults]  = useState(null);

  const numericRows = rows.filter(r => !isNaN(parseFloat(String(r[amtCol] ?? '').replace(/[₹$,]/g,''))));
  const parseAmt = (v) => parseFloat(String(v ?? '').replace(/[₹$,\s]/g, '')) || 0;

  const runReconcile = () => {
    // Find duplicate transactions (same amount + same date)
    const seen = {}; const dups = [];
    rows.forEach((r, i) => {
      const key = `${r[dateCol]||''}_${parseAmt(r[amtCol]).toFixed(2)}`;
      if (seen[key] !== undefined) dups.push({ row1: seen[key], row2: i, key });
      else seen[key] = i;
    });
    // Find missing amounts
    const missing = rows.filter(r => !r[amtCol] || r[amtCol] === '' || isNaN(parseAmt(r[amtCol])));
    // Unmatched references
    const refs = refCol ? rows.map(r => r[refCol]).filter(Boolean) : [];
    const dupRefs = refs.filter((r, i) => refs.indexOf(r) !== i);
    setResults({ type:'reconcile', dups, missing, dupRefs: [...new Set(dupRefs)] });
  };

  const runPLSummary = () => {
    if (!catCol || !amtCol) return;
    const summary = {};
    rows.forEach(r => {
      const cat = String(r[catCol] || 'Uncategorized').trim();
      const amt = parseAmt(r[amtCol]);
      if (!summary[cat]) summary[cat] = { total: 0, count: 0, positive: 0, negative: 0 };
      summary[cat].total    += amt;
      summary[cat].count    += 1;
      summary[cat].positive += amt > 0 ? amt : 0;
      summary[cat].negative += amt < 0 ? amt : 0;
    });
    const totalIncome  = Object.values(summary).reduce((s,v) => s + Math.max(v.total,0), 0);
    const totalExpense = Object.values(summary).reduce((s,v) => s + Math.min(v.total,0), 0);
    setResults({ type:'pl', summary, totalIncome, totalExpense, net: totalIncome + totalExpense });
  };

  const runCashFlow = () => {
    if (!dateCol || !amtCol) return;
    const byDate = {};
    rows.forEach(r => {
      const d = String(r[dateCol] || '').split('T')[0].slice(0, 7); // YYYY-MM
      if (!d) return;
      byDate[d] = (byDate[d] || 0) + parseAmt(r[amtCol]);
    });
    const flow = Object.entries(byDate).sort((a,b) => a[0].localeCompare(b[0]));
    let running = 0;
    const withRunning = flow.map(([d,v]) => { running += v; return [d, v, running]; });
    setResults({ type:'cashflow', flow: withRunning });
  };

  const exportPL = () => {
    if (!results || results.type !== 'pl') return;
    const rows2 = [['Category','Total','Count','Income','Expense'], ...Object.entries(results.summary).map(([k,v]) => [k, v.total.toFixed(2), v.count, v.positive.toFixed(2), v.negative.toFixed(2)])];
    const csv = rows2.map(r => r.map(v => JSON.stringify(String(v))).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' })); a.download = 'pl_summary.csv'; a.click();
  };

  return (
    <div style={{ display:'grid', gap:'14px' }}>
      {/* Tool selector */}
      <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
        {[['reconcile','🔍 Reconcile'],['pl','📊 P&L Summary'],['cashflow','📈 Cash Flow']].map(([id,l]) => (
          <button key={id} onClick={() => { setTool(id); setResults(null); }} style={{ padding:'6px 14px', borderRadius:'6px', fontSize:'11px', fontWeight:tool===id?700:400, cursor:'pointer', background:tool===id?'rgba(0,203,168,.1)':'#F1F5F9', color:tool===id?'#00956B':'var(--muted)', border:tool===id?'1.5px solid #00CBA8':'1px solid var(--border)' }}>{l}</button>
        ))}
      </div>

      {/* Column selectors */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'8px' }}>
        {[['💰 Amount col', amtCol, setAmtCol], ['📅 Date col', dateCol, setDateCol], ['📁 Category col', catCol, setCatCol], ['🔖 Reference col', refCol, setRefCol]].map(([l,v,set]) => (
          <div key={l}>
            <span style={{ fontSize:'10px', color:'var(--muted)', fontWeight:600, display:'block', marginBottom:'3px' }}>{l}</span>
            <select value={v} onChange={e => set(e.target.value)} style={{ padding:'6px 8px', borderRadius:'5px', border:'1px solid var(--border)', fontSize:'11px', width:'100%' }}>
              <option value="">— none —</option>
              {columns.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        ))}
      </div>

      <button onClick={tool==='reconcile'?runReconcile:tool==='pl'?runPLSummary:runCashFlow}
        style={{ background:'#00CBA8', color:'#fff', border:'none', borderRadius:'6px', padding:'7px 20px', fontSize:'12px', fontWeight:700, cursor:'pointer', alignSelf:'flex-start' }}>
        ▶ Run {tool==='reconcile'?'Reconciliation':tool==='pl'?'P&L Summary':'Cash Flow Analysis'}
      </button>

      {/* Results */}
      {results?.type === 'reconcile' && (
        <div style={{ display:'grid', gap:'10px' }}>
          {[
            ['🔁 Duplicate Transactions', results.dups, `Same date + amount: ${results.dups.length} pairs found`, '#EF4444'],
            ['❓ Missing Amounts', results.missing, `${results.missing.length} rows have no amount`, '#F59E0B'],
            ['🔖 Duplicate References', results.dupRefs, `${results.dupRefs.length} duplicate ref IDs`, '#8B5CF6'],
          ].map(([title, data, desc, color]) => (
            <div key={title} style={{ padding:'10px 14px', background:`${color}0a`, border:`1px solid ${color}33`, borderRadius:'7px' }}>
              <div style={{ fontWeight:700, color, fontSize:'12px', marginBottom:'4px' }}>{title}</div>
              <div style={{ fontSize:'11px', color:'var(--muted)' }}>{desc}</div>
              {Array.isArray(data) && data.length > 0 && (
                <div style={{ marginTop:'6px', display:'flex', gap:'5px', flexWrap:'wrap' }}>
                  {data.slice(0,5).map((d,i) => (
                    <span key={i} style={{ padding:'2px 8px', background:'rgba(0,0,0,.05)', borderRadius:'4px', fontSize:'10px', fontFamily:'monospace' }}>
                      {typeof d === 'object' && d.key ? d.key : String(d)}
                    </span>
                  ))}
                  {data.length > 5 && <span style={{ fontSize:'10px', color:'var(--muted)' }}>+{data.length-5} more</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {results?.type === 'pl' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'12px' }}>
            {[['💚 Total Income', `₹${results.totalIncome.toLocaleString('en-IN', {maximumFractionDigits:2})}`, '#00CBA8'],
              ['❤ Total Expense', `₹${Math.abs(results.totalExpense).toLocaleString('en-IN', {maximumFractionDigits:2})}`, '#EF4444'],
              ['📊 Net P&L', `₹${results.net.toLocaleString('en-IN', {maximumFractionDigits:2})}`, results.net>=0?'#00CBA8':'#EF4444']
            ].map(([l,v,c]) => (
              <div key={l} style={{ textAlign:'center', padding:'12px', background:'#F8FAFC', borderRadius:'7px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:'15px', fontWeight:800, color:c }}>{v}</div>
                <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'2px' }}>{l}</div>
              </div>
            ))}
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
            <thead><tr style={{ background:'#F8FAFC' }}>
              {['Category','Total','Count','Income','Expense'].map(h => <th key={h} style={{ padding:'6px 10px', textAlign:'left', color:'var(--muted)', fontWeight:700, borderBottom:'1px solid var(--border)' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {Object.entries(results.summary).sort((a,b) => Math.abs(b[1].total)-Math.abs(a[1].total)).map(([cat, v]) => (
                <tr key={cat} style={{ borderBottom:'1px solid #F8FAFC' }}>
                  <td style={{ padding:'5px 10px', fontWeight:600, color:'var(--text)' }}>{cat}</td>
                  <td style={{ padding:'5px 10px', color:v.total>=0?'#00956B':'#DC2626', fontWeight:700 }}>₹{v.total.toFixed(2)}</td>
                  <td style={{ padding:'5px 10px', color:'var(--muted)' }}>{v.count}</td>
                  <td style={{ padding:'5px 10px', color:'#00956B' }}>₹{v.positive.toFixed(2)}</td>
                  <td style={{ padding:'5px 10px', color:'#DC2626' }}>₹{Math.abs(v.negative).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={exportPL} style={{ marginTop:'10px', background:'#3B82F6', color:'#fff', border:'none', borderRadius:'6px', padding:'6px 16px', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>↓ Export P&L CSV</button>
        </div>
      )}

      {results?.type === 'cashflow' && (
        <div>
          <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'8px' }}>Monthly cash flow with running balance:</div>
          {(() => {
            const maxAbs = Math.max(...results.flow.map(([,v]) => Math.abs(v)), 1);
            return (
              <div style={{ display:'grid', gap:'4px' }}>
                {results.flow.slice(-24).map(([month, val, running]) => (
                  <div key={month} style={{ display:'flex', alignItems:'center', gap:'10px', fontSize:'11px' }}>
                    <span style={{ width:'70px', color:'var(--muted)', fontFamily:'monospace' }}>{month}</span>
                    <div style={{ flex:1, background:'#F1F5F9', borderRadius:'3px', height:'18px', overflow:'hidden' }}>
                      <div style={{ width:`${Math.abs(val)/maxAbs*100}%`, height:'100%', background:val>=0?'#00CBA8':'#EF4444', display:'flex', alignItems:'center', paddingLeft:'6px', minWidth:'2px' }}>
                        {Math.abs(val)/maxAbs > 0.15 && <span style={{ fontSize:'9px', color:'#fff', fontWeight:700 }}>₹{val.toFixed(0)}</span>}
                      </div>
                    </div>
                    <span style={{ width:'90px', textAlign:'right', fontSize:'10px', color:running>=0?'#00956B':'#DC2626', fontWeight:600 }}>Balance: ₹{running.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/*
═══════════════════════════════════════════════════════════════════
INTEGRATION GUIDE — add to MainApp.jsx
═══════════════════════════════════════════════════════════════════

IMPORT:
  import UniversalCleanTab, { AuditTrail } from '../components/tabs/UniversalCleanTab.jsx';

ADD TAB (in TABS array, right after Import tab):
  { id:'universal', label:'🧹 Clean' },

TAB PANEL:
  {activeTab === 'universal' && (
    <UniversalCleanTab
      rows={rows}
      columns={columns}
      onApply={(newRows, description) => {
        setRows(newRows);
        // Optionally re-run EDA:
        process('eda', { rows: newRows }).then(setAnalysis);
      }}
    />
  )}

ALSO ADD MODE TOGGLE to top of MainApp.jsx (see ModeToggle.jsx):
  This tab works in both General and ML modes.
  In General mode: show this tab prominently.
  In ML mode: keep it but de-emphasize (users can still use it).
*/