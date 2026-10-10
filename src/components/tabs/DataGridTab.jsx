// src/components/tabs/DataGridTab.jsx
// THE 4 CRITICAL MISSING PIECES:
// 1. Data Grid View     — see + edit your actual rows
// 2. Row Operations     — filter, sort, delete, sample
// 3. Multi-file Concat  — stack multiple CSVs into one
// 4. Column Profiling   — deep per-column analysis

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';

const s = {
  card:   { background:'#fff', border:'1px solid var(--border)', borderRadius:'10px', padding:'16px', marginBottom:'14px' },
  inp:    { padding:'7px 12px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'12px', width:'100%', boxSizing:'border-box' },
  btn:    (bg='#00CBA8',c='#fff') => ({ background:bg, color:c, border:'none', borderRadius:'6px', padding:'7px 18px', fontSize:'12px', fontWeight:700, cursor:'pointer', transition:'opacity .15s' }),
  lbl:    { fontSize:'11px', color:'var(--muted)', fontWeight:600, display:'block', marginBottom:'4px' },
  tag:    (c='#00CBA8') => ({ display:'inline-block', padding:'2px 8px', borderRadius:'4px', fontSize:'10px', fontWeight:700, color:c, background:`${c}18`, border:`1px solid ${c}33` }),
};

// ══════════════════════════════════════════════════════════════════════════════
// 1. DATA GRID — virtual-scrolled, sortable, editable, searchable
// ══════════════════════════════════════════════════════════════════════════════
const PAGE = 100; // rows per page

export function DataGrid({ rows, columns, onEdit, onDeleteRows, onApply }) {
  const [page,      setPage]      = useState(0);
  const [search,    setSearch]    = useState('');
  const [sortCol,   setSortCol]   = useState('');
  const [sortDir,   setSortDir]   = useState('asc');
  const [selected,  setSelected]  = useState(new Set());
  const [editCell,  setEditCell]  = useState(null); // {rowIdx, col}
  const [editVal,   setEditVal]   = useState('');
  const [colWidths, setColWidths] = useState({});
  const [hiddenCols,setHiddenCols]= useState(new Set());
  const [pinned,    setPinned]    = useState(new Set());
  const resizingCol = useRef(null);
  const startX      = useRef(0);
  const startW      = useRef(0);

  // Filtered + sorted rows
  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(row => columns.some(c => String(row[c]??'').toLowerCase().includes(q)));
    }
    if (sortCol) {
      r = [...r].sort((a,b) => {
        const va = a[sortCol]??'', vb = b[sortCol]??'';
        const na = parseFloat(va), nb = parseFloat(vb);
        if (!isNaN(na) && !isNaN(nb)) return sortDir==='asc' ? na-nb : nb-na;
        return sortDir==='asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return r;
  }, [rows, search, sortCol, sortDir, columns]);

  const totalPages = Math.ceil(filtered.length / PAGE);
  const pageRows   = filtered.slice(page*PAGE, (page+1)*PAGE);
  const visibleCols = columns.filter(c => !hiddenCols.has(c));
  const pinnedCols  = visibleCols.filter(c => pinned.has(c));
  const normalCols  = visibleCols.filter(c => !pinned.has(c));
  const orderedCols = [...pinnedCols, ...normalCols];

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d==='asc'?'desc':'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(0);
  };

  const startEdit = (rowIdx, col, val) => {
    setEditCell({ rowIdx, col });
    setEditVal(String(val??''));
  };

  const commitEdit = () => {
    if (!editCell) return;
    const globalIdx = page*PAGE + editCell.rowIdx;
    const newRows = rows.map((r,i) => i === globalIdx ? { ...r, [editCell.col]: editVal } : r);
    onEdit?.(newRows);
    setEditCell(null);
  };

  const toggleSelect = (idx) => setSelected(prev => { const s=new Set(prev); s.has(idx)?s.delete(idx):s.add(idx); return s; });
  const selectAll    = () => setSelected(new Set(pageRows.map((_,i)=>page*PAGE+i)));
  const clearSelect  = () => setSelected(new Set());

  const deleteSelected = () => {
    if (!selected.size) return;
    if (!window.confirm(`Delete ${selected.size} selected rows?`)) return;
    onDeleteRows?.(rows.filter((_,i) => !selected.has(i)));
    setSelected(new Set());
  };

  // Column resize
  const startResize = (e, col) => {
    resizingCol.current = col;
    startX.current      = e.clientX;
    startW.current      = colWidths[col] || 140;
    const onMove = (e) => setColWidths(w => ({ ...w, [resizingCol.current]: Math.max(60, startW.current + e.clientX - startX.current) }));
    const onUp   = () => { window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); };
    window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);
  };

  return (
    <div style={s.card}>
      {/* Toolbar */}
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'12px', alignItems:'center' }}>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}
          placeholder="🔍 Search across all columns..."
          style={{ ...s.inp, width:'220px' }}/>
        <span style={{ fontSize:'11px', color:'var(--muted)' }}>
          {filtered.length.toLocaleString()} / {rows.length.toLocaleString()} rows
        </span>
        {selected.size > 0 && <>
          <button onClick={deleteSelected} style={{ ...s.btn('#DC2626'), padding:'6px 14px' }}>🗑 Delete {selected.size} rows</button>
          <button onClick={clearSelect}    style={{ ...s.btn('#F1F5F9','var(--muted)'), padding:'6px 14px' }}>✕ Clear</button>
        </>}
        {/* Column visibility */}
        <div style={{ position:'relative', marginLeft:'auto' }}>
          <details style={{ position:'relative' }}>
            <summary style={{ ...s.btn('#F1F5F9','var(--muted)'), padding:'6px 14px', cursor:'pointer', listStyle:'none' }}>⚙ Columns ({visibleCols.length}/{columns.length})</summary>
            <div style={{ position:'absolute', right:0, top:'100%', zIndex:100, background:'#fff', border:'1px solid var(--border)', borderRadius:'8px', padding:'10px', minWidth:'180px', boxShadow:'0 4px 20px rgba(0,0,0,.1)' }}>
              {columns.map(c=>(
                <label key={c} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', padding:'3px 0', cursor:'pointer' }}>
                  <input type="checkbox" checked={!hiddenCols.has(c)} onChange={e=>setHiddenCols(prev=>{const s=new Set(prev);e.target.checked?s.delete(c):s.add(c);return s;})}/>
                  <span>{c}</span>
                  <button onClick={()=>setPinned(prev=>{const s=new Set(prev);s.has(c)?s.delete(c):s.add(c);return s;})}
                    style={{ marginLeft:'auto', background:'none', cursor:'pointer', fontSize:'10px', color:pinned.has(c)?'#00CBA8':'#CBD5E1' }}>📌</button>
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* Grid */}
      <div style={{ overflowX:'auto', border:'1px solid var(--border)', borderRadius:'8px' }}>
        <table style={{ borderCollapse:'collapse', fontSize:'11px', minWidth:'100%', tableLayout:'fixed' }}>
          <thead>
            <tr style={{ background:'#F8FAFC', position:'sticky', top:0, zIndex:10 }}>
              {/* Select all */}
              <th style={{ width:'36px', padding:'8px', borderBottom:'2px solid var(--border)', textAlign:'center' }}>
                <input type="checkbox" onChange={e=>e.target.checked?selectAll():clearSelect()} checked={selected.size===pageRows.length&&pageRows.length>0}/>
              </th>
              <th style={{ width:'48px', padding:'8px', borderBottom:'2px solid var(--border)', color:'var(--muted)', fontSize:'10px', textAlign:'center' }}>#</th>
              {orderedCols.map(col=>(
                <th key={col} style={{ padding:'8px 10px', borderBottom:'2px solid var(--border)', textAlign:'left', width:colWidths[col]||140, minWidth:'60px', position:'relative', background:pinned.has(col)?'rgba(0,203,168,.04)':'#F8FAFC', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  <div style={{ cursor:'pointer', userSelect:'none', display:'flex', alignItems:'center', gap:'4px' }} onClick={()=>toggleSort(col)}>
                    <span style={{ fontWeight:700, color:'var(--text)', fontSize:'11px', overflow:'hidden', textOverflow:'ellipsis' }}>{col}</span>
                    <span style={{ color:'#CBD5E1', fontSize:'10px' }}>{sortCol===col?(sortDir==='asc'?'▲':'▼'):'⇅'}</span>
                    {pinned.has(col) && <span style={{ color:'#00CBA8', fontSize:'9px' }}>📌</span>}
                  </div>
                  {/* Resize handle */}
                  <div onMouseDown={e=>startResize(e,col)} style={{ position:'absolute', right:0, top:0, bottom:0, width:'4px', cursor:'col-resize', background:'transparent' }}/>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => {
              const globalIdx = page*PAGE + ri;
              const isSel = selected.has(globalIdx);
              return (
                <tr key={ri} style={{ background:isSel?'rgba(0,203,168,.05)':ri%2===0?'#fff':'#FAFAFA', transition:'background .1s' }}>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #F1F5F9', textAlign:'center' }}>
                    <input type="checkbox" checked={isSel} onChange={()=>toggleSelect(globalIdx)}/>
                  </td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #F1F5F9', color:'#CBD5E1', fontFamily:'monospace', fontSize:'10px', textAlign:'center' }}>{globalIdx+1}</td>
                  {orderedCols.map(col=>{
                    const isEditing = editCell?.rowIdx===ri && editCell?.col===col;
                    const val = row[col];
                    const isEmpty = val==null||val==='';
                    return (
                      <td key={col} onDoubleClick={()=>startEdit(ri,col,val)}
                        style={{ padding:'0', borderBottom:'1px solid #F1F5F9', maxWidth:colWidths[col]||140, overflow:'hidden' }}>
                        {isEditing ? (
                          <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)}
                            onBlur={commitEdit} onKeyDown={e=>{if(e.key==='Enter')commitEdit();if(e.key==='Escape')setEditCell(null);}}
                            style={{ width:'100%', border:'2px solid #00CBA8', padding:'5px 8px', outline:'none', fontSize:'11px', fontFamily:'monospace', background:'rgba(0,203,168,.06)' }}/>
                        ) : (
                          <div style={{ padding:'6px 10px', color:isEmpty?'#CBD5E1':'var(--text)', fontStyle:isEmpty?'italic':'normal', fontFamily:'monospace', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', cursor:'text' }}
                            title={String(val??'')}>
                            {isEmpty ? 'null' : String(val)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'12px', justifyContent:'center' }}>
          <button onClick={()=>setPage(0)}         disabled={page===0}           style={{ ...s.btn('#F1F5F9','var(--muted)'), padding:'5px 12px' }}>«</button>
          <button onClick={()=>setPage(p=>p-1)}    disabled={page===0}           style={{ ...s.btn('#F1F5F9','var(--muted)'), padding:'5px 12px' }}>‹</button>
          <span style={{ fontSize:'11px', color:'var(--muted)' }}>Page {page+1} of {totalPages} · {filtered.length.toLocaleString()} rows</span>
          <button onClick={()=>setPage(p=>p+1)}    disabled={page===totalPages-1} style={{ ...s.btn('#F1F5F9','var(--muted)'), padding:'5px 12px' }}>›</button>
          <button onClick={()=>setPage(totalPages-1)} disabled={page===totalPages-1} style={{ ...s.btn('#F1F5F9','var(--muted)'), padding:'5px 12px' }}>»</button>
          <span style={{ fontSize:'11px', color:'var(--muted)' }}>Jump: <input type="number" min={1} max={totalPages} style={{ width:'54px', padding:'4px 6px', border:'1px solid var(--border)', borderRadius:'4px', fontSize:'11px' }} onKeyDown={e=>{if(e.key==='Enter'){const n=parseInt(e.target.value)-1;if(n>=0&&n<totalPages)setPage(n);}}} placeholder={page+1}/></span>
        </div>
      )}
      <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'8px' }}>💡 Double-click any cell to edit · Click column header to sort · 📌 to pin columns · ⚙ to show/hide columns</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. ROW OPERATIONS — filter, sort, delete, sample
// ══════════════════════════════════════════════════════════════════════════════
export function RowOperationsPanel({ rows, columns, onApply, onAudit }) {
  const [op,      setOp]      = useState('filter');
  const [col,     setCol]     = useState(columns[0]||'');
  const [cond,    setCond]    = useState('equals');
  const [val,     setVal]     = useState('');
  const [val2,    setVal2]    = useState('');
  const [sortCol, setSortCol] = useState(columns[0]||'');
  const [sortDir, setSortDir] = useState('asc');
  const [sampleN, setSampleN] = useState(1000);
  const [samplePct,setSamplePct]=useState(false);
  const [preview, setPreview] = useState(null);

  const CONDITIONS = [
    { key:'equals',       label:'= equals' },
    { key:'not_equals',   label:'≠ not equals' },
    { key:'contains',     label:'contains' },
    { key:'not_contains', label:'does not contain' },
    { key:'starts_with',  label:'starts with' },
    { key:'ends_with',    label:'ends with' },
    { key:'greater_than', label:'> greater than' },
    { key:'less_than',    label:'< less than' },
    { key:'between',      label:'between (inclusive)' },
    { key:'is_empty',     label:'is empty / null' },
    { key:'not_empty',    label:'is not empty' },
    { key:'is_duplicate', label:'is duplicate row' },
    { key:'regex',        label:'matches regex' },
  ];

  const [filters, setFilters] = useState([{ col:columns[0]||'', cond:'not_empty', val:'', val2:'', keep:true }]);

  const testRow = (row, f) => {
    const v = String(row[f.col]??'').trim();
    const n = parseFloat(v);
    switch(f.cond) {
      case 'equals':       return v === f.val;
      case 'not_equals':   return v !== f.val;
      case 'contains':     return v.toLowerCase().includes(f.val.toLowerCase());
      case 'not_contains': return !v.toLowerCase().includes(f.val.toLowerCase());
      case 'starts_with':  return v.toLowerCase().startsWith(f.val.toLowerCase());
      case 'ends_with':    return v.toLowerCase().endsWith(f.val.toLowerCase());
      case 'greater_than': return n > parseFloat(f.val);
      case 'less_than':    return n < parseFloat(f.val);
      case 'between':      return n >= parseFloat(f.val) && n <= parseFloat(f.val2);
      case 'is_empty':     return v === '';
      case 'not_empty':    return v !== '';
      case 'is_duplicate': return false; // handled separately
      case 'regex':        try { return new RegExp(f.val).test(v); } catch { return false; }
      default: return true;
    }
  };

  const applyFilters = (keep=true) => {
    // Handle duplicate filter separately
    const hasDupFilter = filters.some(f=>f.cond==='is_duplicate');
    let seen = new Set(), dupRows = new Set();
    if (hasDupFilter) {
      rows.forEach((r,i) => { const k=JSON.stringify(r); seen.has(k)?dupRows.add(i):seen.add(k); });
    }
    const result = rows.filter((row,i) => {
      const passes = filters.every(f => f.cond==='is_duplicate' ? dupRows.has(i) : testRow(row,f));
      return keep ? passes : !passes;
    });
    const desc = `${keep?'Keep':'Remove'} rows where ${filters.map(f=>`${f.col} ${CONDITIONS.find(c=>c.key===f.cond)?.label} ${f.val||''}`).join(' AND ')}`;
    onApply(result, desc); onAudit?.(desc);
    setPreview(null);
  };

  const applySort = () => {
    const sorted = [...rows].sort((a,b) => {
      const va=a[sortCol]??'', vb=b[sortCol]??'';
      const na=parseFloat(String(va)), nb=parseFloat(String(vb));
      if (!isNaN(na)&&!isNaN(nb)) return sortDir==='asc'?na-nb:nb-na;
      return sortDir==='asc'?String(va).localeCompare(String(vb)):String(vb).localeCompare(String(va));
    });
    onApply(sorted, `Sort by "${sortCol}" ${sortDir==='asc'?'ascending':'descending'}`);
    onAudit?.(`Sorted by "${sortCol}" ${sortDir}`);
  };

  const applySample = () => {
    const n = samplePct ? Math.floor(rows.length*sampleN/100) : Math.min(sampleN, rows.length);
    const shuffled = [...rows].sort(()=>Math.random()-.5).slice(0,n);
    onApply(shuffled, `Random sample: ${n} rows (${samplePct?sampleN+'%':sampleN+' rows'})`);
    onAudit?.(`Sampled ${n} rows randomly`);
  };

  const previewFilter = () => {
    const result = rows.filter((row,i) => filters.every(f=>testRow(row,f)));
    setPreview({ count:result.count, rows:result.slice(0,3) });
  };

  const TABS = [['filter','🔽 Filter Rows'],['sort','⬆ Sort'],['sample','🎲 Sample']];

  return (
    <div style={s.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>⚙ Row Operations</div>
      <div style={{ display:'flex', gap:'4px', marginBottom:'14px' }}>
        {TABS.map(([id,lbl])=>(
          <button key={id} onClick={()=>setOp(id)} style={{ padding:'6px 16px', borderRadius:'6px', fontSize:'11px', fontWeight:700, cursor:'pointer', background:op===id?'rgba(0,203,168,.1)':'#F1F5F9', color:op===id?'#00956B':'var(--muted)', border:op===id?'1.5px solid #00CBA8':'1px solid var(--border)' }}>{lbl}</button>
        ))}
      </div>

      {op==='filter' && (
        <>
          <div style={{ display:'grid', gap:'8px', marginBottom:'12px' }}>
            {filters.map((f,i)=>(
              <div key={i} style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap', padding:'8px 10px', background:'#F8FAFC', borderRadius:'7px', border:'1px solid var(--border)' }}>
                {i>0 && <span style={{ fontSize:'10px', color:'var(--muted)', fontWeight:700, width:'28px' }}>AND</span>}
                <select value={f.col} onChange={e=>setFilters(fs=>fs.map((x,j)=>j===i?{...x,col:e.target.value}:x))} style={{...s.inp,width:'130px'}}>
                  {columns.map(c=><option key={c}>{c}</option>)}
                </select>
                <select value={f.cond} onChange={e=>setFilters(fs=>fs.map((x,j)=>j===i?{...x,cond:e.target.value}:x))} style={{...s.inp,width:'160px'}}>
                  {CONDITIONS.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                {!['is_empty','not_empty','is_duplicate'].includes(f.cond) && (
                  <input value={f.val} onChange={e=>setFilters(fs=>fs.map((x,j)=>j===i?{...x,val:e.target.value}:x))} placeholder="value..." style={{...s.inp,width:'120px'}}/>
                )}
                {f.cond==='between' && (
                  <input value={f.val2} onChange={e=>setFilters(fs=>fs.map((x,j)=>j===i?{...x,val2:e.target.value}:x))} placeholder="and..." style={{...s.inp,width:'90px'}}/>
                )}
                <button onClick={()=>setFilters(fs=>fs.filter((_,j)=>j!==i))} style={{ background:'none', color:'#DC2626', cursor:'pointer', fontSize:'16px' }}>×</button>
              </div>
            ))}
            <button onClick={()=>setFilters(fs=>[...fs,{col:columns[0]||'',cond:'not_empty',val:'',val2:''}])} style={{ ...s.btn('#F1F5F9','var(--muted)'), alignSelf:'flex-start', padding:'5px 12px', fontSize:'11px' }}>+ Add Condition</button>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={()=>applyFilters(true)}  style={s.btn()}>✅ Keep matching rows</button>
            <button onClick={()=>applyFilters(false)} style={s.btn('#EF4444')}>🗑 Remove matching rows</button>
          </div>
        </>
      )}

      {op==='sort' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:'10px', alignItems:'flex-end' }}>
          <div><span style={s.lbl}>Sort Column</span><select value={sortCol} onChange={e=>setSortCol(e.target.value)} style={s.inp}>{columns.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><span style={s.lbl}>Direction</span><select value={sortDir} onChange={e=>setSortDir(e.target.value)} style={s.inp}><option value="asc">↑ Ascending (A→Z, 0→9)</option><option value="desc">↓ Descending (Z→A, 9→0)</option></select></div>
          <button onClick={applySort} style={s.btn()}>✅ Sort</button>
        </div>
      )}

      {op==='sample' && (
        <div style={{ display:'grid', gap:'10px' }}>
          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
            <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px' }}>
              <input type="radio" checked={!samplePct} onChange={()=>setSamplePct(false)}/> Fixed number of rows
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px' }}>
              <input type="radio" checked={samplePct} onChange={()=>setSamplePct(true)}/> Percentage
            </label>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'10px', alignItems:'flex-end' }}>
            <div>
              <span style={s.lbl}>{samplePct?'Percentage (1–100)':'Number of rows'}</span>
              <input type="number" min={1} max={samplePct?100:rows.length} value={sampleN} onChange={e=>setSampleN(+e.target.value)} style={s.inp}/>
              <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'3px' }}>
                = {samplePct ? Math.floor(rows.length*sampleN/100) : Math.min(sampleN,rows.length)} rows from {rows.length} total
              </div>
            </div>
            <button onClick={applySample} style={s.btn()}>🎲 Sample</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. MULTI-FILE CONCATENATION — stack multiple CSVs/Excels into one
// ══════════════════════════════════════════════════════════════════════════════
export function MultiFileConcatPanel({ onApply, onAudit }) {
  const [files,    setFiles]    = useState([]); // [{name, rows, columns}]
  const [strategy, setStrategy] = useState('common'); // common | all | first
  const [preview,  setPreview]  = useState(null);
  const [loading,  setLoading]  = useState(false);

  const loadCSV = (text, name) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;
    const headers = lines[0].split(',').map(h=>h.replace(/"/g,'').trim());
    const rows = lines.slice(1).map(line => {
      const vals = []; let cur='', inQ=false;
      for (const ch of line) { if(ch==='"'){inQ=!inQ;}else if(ch===','&&!inQ){vals.push(cur.trim());cur='';}else{cur+=ch;} }
      vals.push(cur.trim());
      return Object.fromEntries(headers.map((h,i)=>[h,(vals[i]||'').replace(/"/g,'').trim()]));
    });
    return { name, rows, columns:headers };
  };

  const handleFiles = async (e) => {
    setLoading(true);
    const loaded = [];
    for (const file of e.target.files) {
      const text = await file.text();
      const parsed = loadCSV(text, file.name);
      if (parsed) loaded.push(parsed);
    }
    setFiles(prev=>[...prev,...loaded]);
    setLoading(false);
  };

  const getColumns = () => {
    if (!files.length) return [];
    if (strategy==='first') return files[0].columns;
    if (strategy==='all') {
      const seen = new Set(); const cols = [];
      files.forEach(f=>f.columns.forEach(c=>{if(!seen.has(c)){seen.add(c);cols.push(c);}}));
      return cols;
    }
    // common
    let common = new Set(files[0].columns);
    files.slice(1).forEach(f=>{ common = new Set([...common].filter(c=>f.columns.includes(c))); });
    return [...common];
  };

  const concat = () => {
    const cols = getColumns();
    let all = [];
    files.forEach(f => {
      const withSource = f.rows.map(r => {
        const newRow = { __source_file__: f.name };
        cols.forEach(c => newRow[c] = r[c] ?? '');
        return newRow;
      });
      all = [...all, ...withSource];
    });
    onApply(all, `Concatenated ${files.length} files — ${all.length} total rows, ${cols.length} columns`);
    onAudit?.(`Multi-file concat: ${files.map(f=>f.name).join(', ')} → ${all.length} rows`);
  };

  const cols = getColumns();

  return (
    <div style={s.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'6px' }}>📚 Multi-File Concatenation (Stack CSVs)</div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'14px' }}>Stack multiple CSV files vertically into one dataset. Useful for monthly reports, multi-source data, split datasets.</div>

      <div style={{ marginBottom:'14px' }}>
        <input type="file" multiple accept=".csv,.tsv" onChange={handleFiles} style={{ display:'none' }} id="multi-file-input"/>
        <label htmlFor="multi-file-input" style={{ ...s.btn('#3B82F6'), display:'inline-block', cursor:'pointer' }}>
          {loading ? '⏳ Loading...' : '📂 Add CSV Files'}
        </label>
      </div>

      {files.length > 0 && (
        <>
          {/* File list */}
          <div style={{ display:'grid', gap:'6px', marginBottom:'14px' }}>
            {files.map((f,i)=>(
              <div key={i} style={{ display:'flex', gap:'10px', alignItems:'center', padding:'8px 12px', background:'#F8FAFC', borderRadius:'7px', border:'1px solid var(--border)' }}>
                <span style={{ fontSize:'16px' }}>📄</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:'11px', color:'var(--text)' }}>{f.name}</div>
                  <div style={{ fontSize:'10px', color:'var(--muted)' }}>{f.rows.length.toLocaleString()} rows · {f.columns.length} columns</div>
                </div>
                <span style={{ ...s.tag('#3B82F6'), fontSize:'9px' }}>{f.columns.slice(0,3).join(', ')}{f.columns.length>3?'...':''}</span>
                <button onClick={()=>setFiles(fs=>fs.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', color:'#DC2626', cursor:'pointer', fontSize:'16px' }}>×</button>
              </div>
            ))}
          </div>

          {/* Column strategy */}
          <div style={{ marginBottom:'14px' }}>
            <span style={s.lbl}>Column Strategy</span>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {[['common','Common columns only (safest)'],['all','All columns (fill missing with blank)'],['first','First file\'s columns only']].map(([k,l])=>(
                <label key={k} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', padding:'6px 12px', background:strategy===k?'rgba(0,203,168,.08)':'#F8FAFC', border:`1px solid ${strategy===k?'#00CBA8':'var(--border)'}`, borderRadius:'6px', cursor:'pointer' }}>
                  <input type="radio" checked={strategy===k} onChange={()=>setStrategy(k)}/>{l}
                </label>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'14px' }}>
            {[['📄 Files', files.length],['📝 Total Rows', files.reduce((s,f)=>s+f.rows.length,0).toLocaleString()],['📊 Output Columns', cols.length]].map(([l,v])=>(
              <div key={l} style={{ textAlign:'center', padding:'10px', background:'#F8FAFC', borderRadius:'7px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:'18px', fontWeight:800, color:'var(--text)' }}>{v}</div>
                <div style={{ fontSize:'9px', color:'var(--muted)', marginTop:'2px' }}>{l}</div>
              </div>
            ))}
          </div>

          {cols.length > 0 && (
            <div style={{ marginBottom:'12px', fontSize:'10px', color:'var(--muted)' }}>
              Output columns: <strong style={{color:'var(--text)'}}>{cols.join(', ')}</strong>
              {cols.includes('__source_file__') ? '' : ' + __source_file__ (auto-added)'}
            </div>
          )}

          <button onClick={concat} style={s.btn()}>✅ Concatenate {files.length} Files</button>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. COLUMN PROFILING — deep per-column stats
// ══════════════════════════════════════════════════════════════════════════════
export function ColumnProfiler({ rows, columns }) {
  const [selCol, setSelCol] = useState(columns[0]||'');
  const [search, setSearch] = useState('');

  const profile = useMemo(() => {
    if (!selCol || !rows.length) return null;
    const vals   = rows.map(r => r[selCol]);
    const strs   = vals.map(v => String(v??'').trim());
    const filled = strs.filter(v => v !== '');
    const empty  = strs.length - filled.length;
    const nums   = filled.map(v => parseFloat(v)).filter(v => !isNaN(v));
    const isNum  = nums.length > filled.length * 0.8;

    // Top values
    const freq = {};
    strs.forEach(v => { if(v) freq[v]=(freq[v]||0)+1; });
    const topValues = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,10);

    // Patterns
    const patterns = {
      emails:  strs.filter(v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)).length,
      phones:  strs.filter(v=>/^[\d\s\+\-\(\)]{10,}$/.test(v)).length,
      dates:   strs.filter(v=>!isNaN(new Date(v))&&v.length>4).length,
      urls:    strs.filter(v=>/^https?:\/\//.test(v)).length,
      numbers: nums.length,
    };

    // Numeric stats
    let numStats = null;
    if (isNum && nums.length) {
      const sorted = [...nums].sort((a,b)=>a-b);
      const sum    = nums.reduce((s,v)=>s+v,0);
      const mean   = sum/nums.length;
      const q1     = sorted[Math.floor(sorted.length*0.25)];
      const median = sorted[Math.floor(sorted.length*0.5)];
      const q3     = sorted[Math.floor(sorted.length*0.75)];
      const std    = Math.sqrt(nums.reduce((s,v)=>s+(v-mean)**2,0)/nums.length);
      const outliers = nums.filter(v=>v<q1-1.5*(q3-q1)||v>q3+1.5*(q3-q1)).length;
      numStats = { min:sorted[0], max:sorted[sorted.length-1], mean:+mean.toFixed(3), median, q1, q3, std:+std.toFixed(3), sum:+sum.toFixed(2), outliers };
    }

    // Histogram for numeric
    let histogram = null;
    if (isNum && nums.length > 1) {
      const min = Math.min(...nums), max = Math.max(...nums), range = max-min || 1;
      const bins = 10;
      const counts = new Array(bins).fill(0);
      nums.forEach(v => counts[Math.min(bins-1,Math.floor((v-min)/range*bins))]++);
      histogram = { counts, min, max, binSize:range/bins };
    }

    // String stats
    const lengths = filled.map(v=>v.length);
    const avgLen  = lengths.length ? +(lengths.reduce((s,v)=>s+v,0)/lengths.length).toFixed(1) : 0;

    return {
      total: vals.length, filled: filled.length, empty, emptyPct: +(empty/vals.length*100).toFixed(1),
      unique: new Set(filled).size, uniquePct: filled.length ? +(new Set(filled).size/filled.length*100).toFixed(1) : 0,
      isNum, topValues, patterns, numStats, histogram,
      avgLen, maxLen:lengths.length?Math.max(...lengths):0, minLen:lengths.length?Math.min(...lengths):0,
    };
  }, [rows, selCol]);

  const maxBar = profile?.topValues ? Math.max(...profile.topValues.map(([,n])=>n)) : 1;
  const histMax = profile?.histogram ? Math.max(...profile.histogram.counts) : 1;

  const filteredCols = columns.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={s.card}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>🔬 Column Profiler</div>
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:'16px' }}>
        {/* Column list sidebar */}
        <div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search columns..." style={{...s.inp, fontSize:'11px', marginBottom:'8px'}}/>
          <div style={{ maxHeight:'500px', overflowY:'auto', border:'1px solid var(--border)', borderRadius:'7px' }}>
            {filteredCols.map(c=>(
              <div key={c} onClick={()=>setSelCol(c)} style={{ padding:'7px 10px', cursor:'pointer', fontSize:'11px', fontWeight:selCol===c?700:400, background:selCol===c?'rgba(0,203,168,.08)':'transparent', color:selCol===c?'#00956B':'var(--text)', borderBottom:'1px solid #F8FAFC', borderLeft:selCol===c?'3px solid #00CBA8':'3px solid transparent' }}>
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* Profile panel */}
        {profile && (
          <div style={{ display:'grid', gap:'12px' }}>
            {/* Overview cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(90px,1fr))', gap:'8px' }}>
              {[
                ['Total', profile.total, '#64748B'],
                ['Filled', profile.filled, '#00CBA8'],
                ['Empty', profile.empty, profile.empty>0?'#EF4444':'#00CBA8'],
                ['Unique', profile.unique, '#3B82F6'],
                ['Empty %', profile.emptyPct+'%', profile.emptyPct>10?'#F59E0B':'#00CBA8'],
                ['Unique %', profile.uniquePct+'%', '#8B5CF6'],
              ].map(([l,v,c])=>(
                <div key={l} style={{ textAlign:'center', padding:'8px 4px', background:'#F8FAFC', borderRadius:'7px', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:'16px', fontWeight:800, color:c }}>{v}</div>
                  <div style={{ fontSize:'9px', color:'var(--muted)', marginTop:'2px' }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Pattern detection */}
            <div>
              <div style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, marginBottom:'6px' }}>Pattern Detection</div>
              <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                {Object.entries(profile.patterns).map(([pat,cnt])=> cnt > 0 && (
                  <span key={pat} style={s.tag(cnt>profile.filled*.8?'#00956B':'#F59E0B')}>
                    {pat}: {cnt} ({(cnt/profile.total*100).toFixed(0)}%)
                  </span>
                ))}
                {Object.values(profile.patterns).every(v=>v===0) && <span style={{ fontSize:'10px', color:'var(--muted)' }}>No standard patterns detected (general text)</span>}
              </div>
            </div>

            {/* String stats */}
            <div>
              <div style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, marginBottom:'6px' }}>String Stats</div>
              <div style={{ display:'flex', gap:'10px', fontSize:'11px', color:'var(--text)' }}>
                <span>Avg length: <strong>{profile.avgLen}</strong></span>
                <span>Min: <strong>{profile.minLen}</strong></span>
                <span>Max: <strong>{profile.maxLen}</strong></span>
              </div>
            </div>

            {/* Numeric stats */}
            {profile.numStats && (
              <div>
                <div style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, marginBottom:'8px' }}>Numeric Statistics</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px' }}>
                  {[['Min',profile.numStats.min],['Max',profile.numStats.max],['Mean',profile.numStats.mean],['Median',profile.numStats.median],['Q1',profile.numStats.q1],['Q3',profile.numStats.q3],['Std Dev',profile.numStats.std],['Outliers',profile.numStats.outliers]].map(([l,v])=>(
                    <div key={l} style={{ padding:'6px 8px', background:'#F8FAFC', borderRadius:'5px', border:'1px solid var(--border)' }}>
                      <div style={{ fontSize:'12px', fontWeight:700, color:'var(--text)' }}>{typeof v==='number'&&!Number.isInteger(v)?v.toLocaleString():v}</div>
                      <div style={{ fontSize:'9px', color:'var(--muted)' }}>{l}</div>
                    </div>
                  ))}
                </div>
                {/* Histogram */}
                {profile.histogram && (
                  <div style={{ marginTop:'12px' }}>
                    <div style={{ fontSize:'10px', color:'var(--muted)', marginBottom:'4px' }}>Distribution</div>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:'2px', height:'60px' }}>
                      {profile.histogram.counts.map((c,i)=>(
                        <div key={i} title={`${(profile.histogram.min+i*profile.histogram.binSize).toFixed(1)}–${(profile.histogram.min+(i+1)*profile.histogram.binSize).toFixed(1)}: ${c} rows`}
                          style={{ flex:1, background:'rgba(0,203,168,.6)', height:`${(c/histMax)*100}%`, borderRadius:'2px 2px 0 0', minHeight:c>0?'2px':0 }}/>
                      ))}
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px', color:'var(--muted)', marginTop:'2px' }}>
                      <span>{profile.numStats.min}</span><span>{profile.numStats.max}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Top values */}
            <div>
              <div style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600, marginBottom:'8px' }}>Top {profile.topValues.length} Values</div>
              <div style={{ display:'grid', gap:'4px' }}>
                {profile.topValues.map(([val,count],i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'11px' }}>
                    <div style={{ flex:1, background:'#F1F5F9', borderRadius:'3px', overflow:'hidden' }}>
                      <div style={{ width:`${(count/maxBar)*100}%`, background:i===0?'#00CBA8':'rgba(0,203,168,.3)', height:'20px', display:'flex', alignItems:'center', paddingLeft:'6px', minWidth:'40px', transition:'width .3s' }}>
                        <span style={{ fontFamily:'monospace', color:i===0?'#fff':'var(--text)', fontSize:'10px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{val||'(empty)'}</span>
                      </div>
                    </div>
                    <span style={{ color:'var(--muted)', fontSize:'10px', flexShrink:0, width:'60px', textAlign:'right' }}>{count} ({(count/profile.total*100).toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DATA GRID TAB — combines all 4 features
// ══════════════════════════════════════════════════════════════════════════════
export default function DataGridTab({ rows, columns, onApply, fileName }) {
  const [subTab, setSubTab] = useState('grid');

  const SUBTABS = [
    { id:'grid',    label:'📊 Data Grid' },
    { id:'rows',    label:'⚙ Row Ops' },
    { id:'concat',  label:'📚 Concat Files' },
    { id:'profile', label:'🔬 Column Profile' },
  ];

  return (
    <div style={{ display:'grid', gap:'14px' }}>
      <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
        {SUBTABS.map(t=>(
          <button key={t.id} onClick={()=>setSubTab(t.id)} style={{ padding:'6px 14px', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontWeight:subTab===t.id?700:400, background:subTab===t.id?'rgba(0,203,168,.1)':'#fff', color:subTab===t.id?'#00956B':'var(--muted)', border:subTab===t.id?'1.5px solid #00CBA8':'1px solid var(--border)', transition:'all .15s' }}>
            {t.label}
          </button>
        ))}
        <span style={{ marginLeft:'auto', fontSize:'11px', color:'var(--muted)', alignSelf:'center' }}>
          {rows.length.toLocaleString()} rows · {columns.length} columns
        </span>
      </div>
      {subTab==='grid'    && <DataGrid rows={rows} columns={columns} onEdit={newRows=>onApply(newRows,'Cell edit')} onDeleteRows={newRows=>onApply(newRows,'Delete selected rows')} onApply={onApply}/>}
      {subTab==='rows'    && <RowOperationsPanel rows={rows} columns={columns} onApply={onApply} onAudit={()=>{}}/>}
      {subTab==='concat'  && <MultiFileConcatPanel onApply={onApply} onAudit={()=>{}}/>}
      {subTab==='profile' && <ColumnProfiler rows={rows} columns={columns}/>}
    </div>
  );
}

/*
═══════════════════════════════════════════════════════════════
INTEGRATION GUIDE — add to MainApp.jsx
═══════════════════════════════════════════════════════════════

IMPORT:
  import DataGridTab from '../components/tabs/DataGridTab.jsx';

ADD TAB (right after Import — this should be the FIRST thing users see):
  { id:'grid', label:'📊 Data' },

TAB PANEL:
  {activeTab === 'grid' && (
    <DataGridTab
      rows={rows}
      columns={columns}
      fileName={fileName}
      onApply={(newRows, desc) => {
        setRows(newRows);
        process('eda', { rows: newRows }).then(setAnalysis);
      }}
    />
  )}

RECOMMENDATION — make 'grid' the DEFAULT tab:
  const [activeTab, setActiveTab] = useState('grid');
  Right now users land on Import. After upload, auto-switch to grid:
  After processFile() completes: setActiveTab('grid');
*/