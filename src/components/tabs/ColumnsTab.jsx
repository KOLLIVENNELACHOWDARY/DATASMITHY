// src/components/tabs/ColumnsTab.jsx
import React, { useState } from 'react';

export default function ColumnsTab({ analysis, columnOverrides, setColumnOverrides, onApplyChanges }) {
  const [search, setSearch] = useState('');
  const [applying, setApplying] = useState(false);

  if (!analysis) return null;

  const cols = analysis.columns.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const getOv = (name) => columnOverrides[name] || { rename:'', drop:false };

  const setRename = (name, value) => {
    setColumnOverrides(prev => ({ ...prev, [name]: { ...getOv(name), rename: value } }));
  };

  const toggleDrop = (name) => {
    setColumnOverrides(prev => ({ ...prev, [name]: { ...getOv(name), drop: !getOv(name).drop } }));
  };

  const droppedCount = Object.values(columnOverrides).filter(o => o.drop).length;
  const renamedCount = Object.values(columnOverrides).filter(o => o.rename?.trim()).length;
  const hasChanges = droppedCount > 0 || renamedCount > 0;

  const resetAll = () => setColumnOverrides({});

  const handleApply = async () => {
    setApplying(true);
    try { await onApplyChanges(); }
    finally { setApplying(false); }
  };

  const colColor = (type) => type==='numeric' ? '#00CBA8' : type==='categorical' ? '#F59E0B' : '#3B82F6';

  // Validate new names
  const newNames = new Set();
  const duplicates = new Set();
  cols.forEach(col => {
    const ov = getOv(col.name);
    if (ov.drop) return;
    const finalName = ov.rename?.trim() || col.name;
    if (newNames.has(finalName)) duplicates.add(finalName);
    newNames.add(finalName);
  });

  return (
    <div className="fade-in" style={{ display:'grid', gap:'14px' }}>
      <div className="card" style={{ padding:'18px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px', flexWrap:'wrap', gap:'10px' }}>
          <div>
            <div style={{ fontWeight:700, color:'var(--text)', fontSize:'14px' }}>Manage Columns</div>
            <div style={{ color:'var(--muted)', fontSize:'12px', marginTop:'2px' }}>
              Rename or drop columns before configuring Clean/Encode/Scale
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
            {renamedCount>0 && <span className="tag tag-blue" style={{fontSize:'10px'}}>{renamedCount} renamed</span>}
            {droppedCount>0 && <span className="tag tag-red"  style={{fontSize:'10px'}}>{droppedCount} dropped</span>}
            {hasChanges && (
              <button onClick={resetAll} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'5px', padding:'5px 10px', fontSize:'11px', color:'var(--muted)', cursor:'pointer' }}>
                Reset all
              </button>
            )}
          </div>
        </div>

        <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search columns..." style={{ width:'100%', maxWidth:'320px', marginBottom:'14px' }} />

        {duplicates.size > 0 && (
          <div style={{ marginBottom:'12px', padding:'10px 14px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:'6px', fontSize:'11px', color:'#DC2626' }}>
            ⚠ Duplicate column names: {[...duplicates].join(', ')}. Please use unique names.
          </div>
        )}

        <div style={{ overflowX:'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{width:'30px'}}></th>
                <th>Original Name</th>
                <th>Type</th>
                <th>New Name (optional)</th>
                <th style={{width:'70px', textAlign:'center'}}>Drop</th>
              </tr>
            </thead>
            <tbody>
              {cols.map(col => {
                const ov = getOv(col.name);
                return (
                  <tr key={col.name} style={{ opacity: ov.drop ? 0.4 : 1, transition:'opacity .2s' }}>
                    <td>
                      <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:colColor(col.type) }} />
                    </td>
                    <td style={{ fontFamily:'monospace', fontWeight:600, fontSize:'12px' }}>
                      {ov.drop ? <s>{col.name}</s> : col.name}
                    </td>
                    <td><span className="tag" style={{fontSize:'10px', background:'#F1F5F9', color:'var(--muted)'}}>{col.type}</span></td>
                    <td>
                      <input
                        type="text"
                        value={ov.rename}
                        disabled={ov.drop}
                        onChange={e=>setRename(col.name, e.target.value)}
                        placeholder={col.name}
                        style={{ width:'180px', fontSize:'12px', padding:'5px 10px' }}
                      />
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <input type="checkbox" checked={ov.drop} onChange={()=>toggleDrop(col.name)}
                        style={{ width:'17px', height:'17px', accentColor:'#EF4444', cursor:'pointer' }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {hasChanges ? (
          <div style={{ marginTop:'16px', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
            <button onClick={handleApply} disabled={applying || duplicates.size>0} className="btn-primary" style={{ fontSize:'12px', padding:'9px 22px' }}>
              {applying ? '⏳ Applying...' : '✅ Apply Column Changes'}
            </button>
            <div style={{ fontSize:'11px', color:'var(--muted)' }}>
              This re-analyzes your dataset with the new column structure. Clean/Encode/Scale settings will reset.
            </div>
          </div>
        ) : (
          <div style={{ marginTop:'14px', padding:'10px 14px', background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.2)', borderRadius:'6px', fontSize:'11px', color:'#1D4ED8' }}>
            💡 Check boxes to drop columns, or type new names to rename them — then click Apply.
          </div>
        )}
      </div>
    </div>
  );
}