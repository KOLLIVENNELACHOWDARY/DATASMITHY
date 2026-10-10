// src/components/DataPreview.jsx
import React, { useState } from 'react';

export default function DataPreview({ rawData, fileName, analysis }) {
  const [show, setShow] = useState(true);
  if (!rawData?.length || !show) return null;

  const cols   = Object.keys(rawData[0] || {});
  const preview= rawData.slice(0, 8);
  const total  = rawData.length;

  const colColor = (col) => {
    const info = analysis?.columns?.find(c => c.name === col);
    if (!info) return 'var(--muted)';
    if (info.type === 'numeric')     return 'var(--teal)';
    if (info.type === 'categorical') return 'var(--amber)';
    return 'var(--blue)';
  };

  const colType = (col) => {
    const info = analysis?.columns?.find(c => c.name === col);
    return info?.type || 'text';
  };

  return (
    <div className="card fade-in" style={{ marginBottom:'14px', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:'10px', background:'#FAFAFA' }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600, color:'var(--text)', fontSize:'13px', display:'flex', alignItems:'center', gap:'8px' }}>
            📄 {fileName}
            <span className="tag tag-teal" style={{ fontSize:'10px' }}>{total.toLocaleString()} rows × {cols.length} cols</span>
            {analysis && <span className={`tag ${analysis.health>=80?'tag-teal':analysis.health>=60?'tag-amber':'tag-red'}`} style={{ fontSize:'10px' }}>♥ {analysis.health}/100</span>}
          </div>
          <div style={{ fontSize:'11px', color:'var(--muted)', marginTop:'2px' }}>
            Showing first 8 rows
          </div>
        </div>
        <button onClick={() => setShow(false)} style={{ background:'transparent', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:'18px', padding:'2px 6px', lineHeight:1 }}>×</button>
      </div>

      {/* Table */}
      <div style={{ overflowX:'auto', maxHeight:'260px', overflowY:'auto' }}>
        <table style={{ minWidth:'100%' }}>
          <thead style={{ position:'sticky', top:0, zIndex:1 }}>
            <tr>
              <th style={{ padding:'8px 10px', background:'#F1F5F9', color:'var(--muted)', fontSize:'10px', textAlign:'center', borderBottom:'1px solid var(--border)', width:'36px' }}>#</th>
              {cols.map(col => (
                <th key={col} style={{ padding:'8px 10px', background:'#F1F5F9', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap', minWidth:'100px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                    <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:colColor(col), flexShrink:0 }} />
                    <span style={{ color:'var(--text)', fontWeight:600, fontSize:'11px' }}>{col}</span>
                  </div>
                  <div style={{ fontSize:'9px', color:'var(--muted)', fontWeight:400, textTransform:'lowercase', letterSpacing:0 }}>{colType(col)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i}>
                <td style={{ padding:'7px 10px', textAlign:'center', color:'var(--muted)', fontSize:'10px', background:'#FAFAFA', borderRight:'1px solid var(--border)' }}>{i+1}</td>
                {cols.map(col => {
                  const val = row[col];
                  const isEmpty = val === null || val === '' || val === undefined;
                  return (
                    <td key={col} style={{ padding:'7px 10px', whiteSpace:'nowrap', maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', background:isEmpty?'rgba(245,158,11,.06)':'transparent', color:isEmpty?'var(--amber)':'var(--text)', fontSize:'12px' }}>
                      {isEmpty ? <span style={{ fontSize:'10px', fontStyle:'italic' }}>empty</span> : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 8 && (
        <div style={{ padding:'8px 16px', borderTop:'1px solid var(--border)', background:'#FAFAFA', fontSize:'11px', color:'var(--muted)', textAlign:'center' }}>
          + {(total-8).toLocaleString()} more rows not shown · All {total.toLocaleString()} rows are loaded for processing
        </div>
      )}
    </div>
  );
}
