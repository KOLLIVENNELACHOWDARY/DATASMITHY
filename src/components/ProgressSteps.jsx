// src/components/ProgressSteps.jsx
import React from 'react';

const STEPS = [
  { id:'import',    label:'Import',    icon:'⬆' },
  { id:'analyze',   label:'Analyze',   icon:'📊' },
  { id:'configure', label:'Configure', icon:'⚙' },
  { id:'pipeline',  label:'Pipeline',  icon:'⚡' },
  { id:'export',    label:'Export',    icon:'📦' },
];

const CONFIG_TABS = ['columns','clean','encode','scale','features'];

export default function ProgressSteps({ hasData, hasResult, activeTab }) {
  const status = (id) => {
    if (id === 'import')    return hasData ? 'done' : (activeTab==='import' ? 'active' : 'pending');
    if (id === 'analyze')   return hasData ? 'done' : 'pending';
    if (id === 'configure') return !hasData ? 'pending' : (CONFIG_TABS.includes(activeTab) ? 'active' : 'done');
    if (id === 'pipeline')  return hasResult ? 'done' : (hasData ? 'active' : 'pending');
    if (id === 'export')    return !hasResult ? 'pending' : (activeTab==='export' ? 'active' : 'done');
    return 'pending';
  };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:'4px', padding:'8px 12px', overflowX:'auto' }}>
      {STEPS.map((s, i) => {
        const st = status(s.id);
        return (
          <React.Fragment key={s.id}>
            <div style={{
              display:'flex', alignItems:'center', gap:'5px',
              padding:'4px 10px', borderRadius:'14px', fontSize:'11px', fontWeight:600,
              whiteSpace:'nowrap', transition:'all .2s',
              background: st==='done' ? 'rgba(0,203,168,.12)' : st==='active' ? 'rgba(59,130,246,.1)' : '#F1F5F9',
              color:      st==='done' ? '#00956B' : st==='active' ? '#1D4ED8' : '#94A3B8',
              border:     st==='active' ? '1px solid rgba(59,130,246,.3)' : '1px solid transparent',
            }}>
              <span>{st==='done' ? '✅' : s.icon}</span>
              {s.label}
            </div>
            {i < STEPS.length-1 && (
              <div style={{ width:'14px', height:'1px', background:'#E2E8F0', flexShrink:0 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}