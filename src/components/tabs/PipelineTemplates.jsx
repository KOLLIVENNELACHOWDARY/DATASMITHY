// src/components/tabs/PipelineTemplates.jsx
// PIPELINE TEMPLATES — save your cleaning steps, replay on any new file
// Like macros in Excel but smarter

import React, { useState, useEffect } from 'react';

const S = {
  card:  { background:'#fff', border:'1px solid var(--border)', borderRadius:'10px', padding:'16px', marginBottom:'14px' },
  inp:   { padding:'7px 12px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'12px', width:'100%', boxSizing:'border-box' },
  btn:   (bg='#00CBA8',c='#fff') => ({ background:bg, color:c, border:'none', borderRadius:'6px', padding:'7px 18px', fontSize:'12px', fontWeight:700, cursor:'pointer' }),
  lbl:   { fontSize:'11px', color:'var(--muted)', fontWeight:600, display:'block', marginBottom:'4px' },
  tag:   (c='#00CBA8') => ({ display:'inline-block', padding:'2px 8px', borderRadius:'4px', fontSize:'10px', fontWeight:700, color:c, background:`${c}18`, border:`1px solid ${c}33` }),
};

const STORAGE_KEY = 'datasmithy_templates';

// ══════════════════════════════════════════════════════════════════════════════
// BUILT-IN TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════
const BUILT_IN_TEMPLATES = [
  {
    id:'basic_ml',
    name:'Basic ML Prep',
    description:'Standard pipeline for ML datasets — handles missing values, duplicates, outliers',
    icon:'🤖',
    category:'ML',
    steps:[
      { type:'remove_duplicates',    label:'Remove duplicate rows' },
      { type:'impute_mean',          label:'Fill numeric nulls with mean' },
      { type:'impute_mode',          label:'Fill text nulls with mode' },
      { type:'remove_iqr_outliers',  label:'Remove IQR outliers' },
      { type:'drop_high_null_cols',  label:'Drop columns with >50% nulls', arg:50 },
    ]
  },
  {
    id:'business_analyst',
    name:'Business Analyst',
    description:'Standard data cleaning for business reports — formats, trims, validates',
    icon:'📊',
    category:'Business',
    steps:[
      { type:'trim_all',             label:'Trim whitespace from all text columns' },
      { type:'normalize_dates',      label:'Standardize dates → YYYY-MM-DD' },
      { type:'remove_duplicates',    label:'Remove duplicate rows' },
      { type:'normalize_phone',      label:'Standardize phone numbers' },
      { type:'lowercase_email',      label:'Lowercase all email columns' },
    ]
  },
  {
    id:'ecommerce',
    name:'E-Commerce Catalog',
    description:'Clean product catalog data — SKUs, prices, categories',
    icon:'🛒',
    category:'Business',
    steps:[
      { type:'remove_duplicates',    label:'Remove duplicate rows' },
      { type:'trim_all',             label:'Trim whitespace' },
      { type:'uppercase_codes',      label:'UPPERCASE product codes' },
      { type:'normalize_currency',   label:'Clean price columns (remove ₹/$)' },
      { type:'fill_empty_string',    label:'Fill empty text with "Unknown"', arg:'Unknown' },
    ]
  },
  {
    id:'nlp_prep',
    name:'NLP Text Prep',
    description:'Clean text for NLP/ML — removes HTML, URLs, normalizes spacing',
    icon:'📝',
    category:'NLP',
    steps:[
      { type:'remove_html',          label:'Strip HTML tags from text columns' },
      { type:'remove_urls',          label:'Remove URLs' },
      { type:'lowercase_text',       label:'Lowercase text columns' },
      { type:'normalize_space',      label:'Normalize whitespace' },
      { type:'remove_duplicates',    label:'Remove duplicate rows' },
      { type:'drop_empty_text',      label:'Drop rows where text column is empty' },
    ]
  },
  {
    id:'survey_data',
    name:'Survey Data',
    description:'Clean survey/form responses — booleans, scales, free text',
    icon:'📋',
    category:'Research',
    steps:[
      { type:'normalize_boolean',    label:'Normalize Yes/No/1/0 → true/false' },
      { type:'trim_all',             label:'Trim whitespace' },
      { type:'remove_duplicates',    label:'Remove duplicate rows' },
      { type:'normalize_space',      label:'Normalize whitespace in text' },
      { type:'drop_high_null_rows',  label:'Drop rows with >70% missing', arg:70 },
    ]
  },
  {
    id:'financial',
    name:'Financial Data',
    description:'Clean financial/accounting data — currencies, dates, amounts',
    icon:'💰',
    category:'Finance',
    steps:[
      { type:'normalize_currency',   label:'Clean currency symbols (₹/$)' },
      { type:'normalize_dates',      label:'Standardize dates' },
      { type:'remove_commas_numbers',label:'Remove commas from numbers (1,234 → 1234)' },
      { type:'trim_all',             label:'Trim whitespace' },
      { type:'remove_duplicates',    label:'Remove duplicate rows' },
    ]
  },
  {
    id:'india_govt',
    name:'Indian Govt Data',
    description:'Clean government / public data with Indian-specific formats',
    icon:'🇮🇳',
    category:'India',
    steps:[
      { type:'normalize_pin',        label:'Standardize PIN codes (6 digits)' },
      { type:'normalize_phone',      label:'Standardize phone → +91 format' },
      { type:'pan_validate',         label:'Validate PAN card format' },
      { type:'state_expand',         label:'Expand state codes → full names (MH → Maharashtra)' },
      { type:'trim_all',             label:'Trim whitespace' },
      { type:'remove_duplicates',    label:'Remove duplicate rows' },
    ]
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// STEP EXECUTOR — applies a step to rows
// ══════════════════════════════════════════════════════════════════════════════
const INDIA_STATES = {'AP':'Andhra Pradesh','AR':'Arunachal Pradesh','AS':'Assam','BR':'Bihar','CT':'Chhattisgarh','GA':'Goa','GJ':'Gujarat','HR':'Haryana','HP':'Himachal Pradesh','JH':'Jharkhand','KA':'Karnataka','KL':'Kerala','MP':'Madhya Pradesh','MH':'Maharashtra','MN':'Manipur','ML':'Meghalaya','MZ':'Mizoram','NL':'Nagaland','OR':'Odisha','PB':'Punjab','RJ':'Rajasthan','SK':'Sikkim','TN':'Tamil Nadu','TG':'Telangana','TR':'Tripura','UP':'Uttar Pradesh','UT':'Uttarakhand','WB':'West Bengal','DL':'Delhi'};

const executeStep = (rows, columns, step) => {
  const textCols = columns.filter(c => {
    const sample = rows.slice(0,20).map(r=>String(r[c]??''));
    return sample.some(v=>isNaN(parseFloat(v)));
  });
  const numCols = columns.filter(c => {
    const sample = rows.slice(0,10).map(r=>parseFloat(r[c])).filter(v=>!isNaN(v));
    return sample.length > 5;
  });

  switch(step.type) {
    case 'trim_all':
      return rows.map(r=>{ const nr={...r}; textCols.forEach(c=>{ if(nr[c]!=null) nr[c]=String(nr[c]).trim(); }); return nr; });
    case 'remove_duplicates': {
      const seen=new Set(); return rows.filter(r=>{ const k=JSON.stringify(r); if(seen.has(k))return false; seen.add(k);return true; });
    }
    case 'impute_mean':
      return (() => {
        const means={};
        numCols.forEach(c=>{ const vals=rows.map(r=>parseFloat(r[c])).filter(v=>!isNaN(v)); means[c]=vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:0; });
        return rows.map(r=>{ const nr={...r}; numCols.forEach(c=>{ if(nr[c]==null||nr[c]==='') nr[c]=+means[c].toFixed(4); }); return nr; });
      })();
    case 'impute_mode':
      return (() => {
        const modes={};
        textCols.forEach(c=>{ const freq={}; rows.forEach(r=>{ const v=String(r[c]??'').trim(); if(v) freq[v]=(freq[v]||0)+1; }); modes[c]=Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0]||''; });
        return rows.map(r=>{ const nr={...r}; textCols.forEach(c=>{ if(nr[c]==null||String(nr[c]).trim()==='') nr[c]=modes[c]; }); return nr; });
      })();
    case 'remove_iqr_outliers':
      return (() => {
        let result = rows;
        numCols.forEach(c=>{
          const vals=[...result.map(r=>parseFloat(r[c])).filter(v=>!isNaN(v))].sort((a,b)=>a-b);
          if(vals.length<4) return;
          const q1=vals[Math.floor(vals.length*.25)], q3=vals[Math.floor(vals.length*.75)], iqr=q3-q1;
          result=result.filter(r=>{ const v=parseFloat(r[c]); return isNaN(v)||( v>=q1-1.5*iqr && v<=q3+1.5*iqr ); });
        });
        return result;
      })();
    case 'drop_high_null_cols': {
      const pct=(step.arg||50)/100;
      const keep=columns.filter(c=>rows.filter(r=>r[c]==null||r[c]==='').length/rows.length<=pct);
      return rows.map(r=>Object.fromEntries(keep.map(c=>[c,r[c]])));
    }
    case 'drop_high_null_rows': {
      const pct=(step.arg||70)/100;
      return rows.filter(r=>columns.filter(c=>r[c]==null||r[c]==='').length/columns.length<=pct);
    }
    case 'drop_empty_text':
      return rows.filter(r=>textCols.some(c=>String(r[c]??'').trim()!==''));
    case 'normalize_dates':
      return rows.map(r=>{ const nr={...r}; columns.forEach(c=>{ const v=String(nr[c]??''); const d=new Date(v); if(!isNaN(d)&&v.length>4){ const y=d.getFullYear(),mo=String(d.getMonth()+1).padStart(2,'0'),dy=String(d.getDate()).padStart(2,'0'); nr[c]=`${y}-${mo}-${dy}`; } }); return nr; });
    case 'normalize_phone':
      return rows.map(r=>{ const nr={...r}; columns.filter(c=>c.toLowerCase().includes('phone')||c.toLowerCase().includes('mobile')||c.toLowerCase().includes('contact')).forEach(c=>{ const digits=String(nr[c]??'').replace(/\D/g,''); const core=digits.startsWith('91')&&digits.length===12?digits.slice(2):digits; if(core.length===10) nr[c]=`+91-${core.slice(0,5)}-${core.slice(5)}`; }); return nr; });
    case 'lowercase_email':
      return rows.map(r=>{ const nr={...r}; columns.filter(c=>c.toLowerCase().includes('email')||c.toLowerCase().includes('mail')).forEach(c=>{ if(nr[c]) nr[c]=String(nr[c]).toLowerCase().trim(); }); return nr; });
    case 'normalize_currency':
      return rows.map(r=>{ const nr={...r}; columns.filter(c=>c.toLowerCase().includes('price')||c.toLowerCase().includes('cost')||c.toLowerCase().includes('amount')||c.toLowerCase().includes('salary')||c.toLowerCase().includes('revenue')).forEach(c=>{ const v=parseFloat(String(nr[c]??'').replace(/[₹$€£,\s]/g,'')); if(!isNaN(v)) nr[c]=v; }); return nr; });
    case 'normalize_space':
      return rows.map(r=>{ const nr={...r}; textCols.forEach(c=>{ if(nr[c]) nr[c]=String(nr[c]).replace(/\s+/g,' ').trim(); }); return nr; });
    case 'normalize_boolean':
      return rows.map(r=>{ const nr={...r}; columns.forEach(c=>{ const v=String(nr[c]??'').toLowerCase().trim(); if(['yes','true','1','y'].includes(v)) nr[c]='true'; else if(['no','false','0','n'].includes(v)) nr[c]='false'; }); return nr; });
    case 'remove_html':
      return rows.map(r=>{ const nr={...r}; textCols.forEach(c=>{ if(nr[c]) nr[c]=String(nr[c]).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }); return nr; });
    case 'remove_urls':
      return rows.map(r=>{ const nr={...r}; textCols.forEach(c=>{ if(nr[c]) nr[c]=String(nr[c]).replace(/https?:\/\/\S+/g,' ').trim(); }); return nr; });
    case 'lowercase_text':
      return rows.map(r=>{ const nr={...r}; textCols.forEach(c=>{ if(nr[c]) nr[c]=String(nr[c]).toLowerCase(); }); return nr; });
    case 'uppercase_codes':
      return rows.map(r=>{ const nr={...r}; columns.filter(c=>c.toLowerCase().includes('code')||c.toLowerCase().includes('sku')||c.toLowerCase().includes('id')).forEach(c=>{ if(nr[c]) nr[c]=String(nr[c]).toUpperCase().trim(); }); return nr; });
    case 'remove_commas_numbers':
      return rows.map(r=>{ const nr={...r}; numCols.forEach(c=>{ const v=parseFloat(String(nr[c]??'').replace(/,/g,'')); if(!isNaN(v)) nr[c]=v; }); return nr; });
    case 'fill_empty_string':
      return rows.map(r=>{ const nr={...r}; textCols.forEach(c=>{ if(nr[c]==null||String(nr[c]).trim()==='') nr[c]=step.arg||'Unknown'; }); return nr; });
    case 'normalize_pin':
      return rows.map(r=>{ const nr={...r}; columns.filter(c=>c.toLowerCase().includes('pin')||c.toLowerCase().includes('zip')||c.toLowerCase().includes('postal')).forEach(c=>{ const d=String(nr[c]??'').replace(/\D/g,''); if(d.length>=6) nr[c]=d.slice(-6); }); return nr; });
    case 'pan_validate':
      return rows.map(r=>{ const nr={...r}; columns.filter(c=>c.toLowerCase().includes('pan')).forEach(c=>{ const p=String(nr[c]??'').toUpperCase().trim(); nr[c]=/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p)?p:`INVALID: ${p}`; }); return nr; });
    case 'state_expand':
      return rows.map(r=>{ const nr={...r}; columns.filter(c=>c.toLowerCase().includes('state')).forEach(c=>{ const code=String(nr[c]??'').toUpperCase().trim(); if(INDIA_STATES[code]) nr[c]=INDIA_STATES[code]; }); return nr; });
    default:
      return rows;
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function PipelineTemplates({ rows, columns, onApply }) {
  const [userTemplates, setUserTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch { return []; }
  });
  const [running,  setRunning]  = useState(null);
  const [result,   setResult]   = useState(null);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [subTab,   setSubTab]   = useState('library');
  const [filter,   setFilter]   = useState('all');

  const saveToStorage = (templates) => {
    setUserTemplates(templates);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  };

  const runTemplate = async (template) => {
    setRunning(template.id); setResult(null);
    await new Promise(r=>setTimeout(r,50));
    let current = [...rows];
    const log   = [];
    const before = rows.length;
    for (const step of template.steps) {
      const before2 = current.length;
      current = executeStep(current, columns, step);
      log.push({ label:step.label, removed:before2-current.length, rows:current.length });
    }
    setResult({ rows:current, log, removedTotal:before-current.length });
    setRunning(null);
  };

  const applyResult = () => {
    if (!result) return;
    onApply(result.rows, `Applied template — ${result.removedTotal} rows removed`);
    setResult(null);
  };

  const saveCurrentPipeline = () => {
    if (!saveName.trim()) return;
    const template = {
      id: `user_${Date.now()}`,
      name: saveName.trim(),
      description: saveDesc.trim() || 'Custom pipeline',
      icon: '⚙',
      category: 'Custom',
      createdAt: new Date().toISOString(),
      steps: [
        { type:'trim_all',          label:'Trim whitespace' },
        { type:'remove_duplicates', label:'Remove duplicates' },
        { type:'impute_mean',       label:'Fill numeric nulls with mean' },
      ]
    };
    saveToStorage([...userTemplates, template]);
    setSaveName(''); setSaveDesc('');
    alert(`Template "${template.name}" saved! Edit steps directly in the JSON file or extend this in code.`);
  };

  const deleteTemplate = (id) => {
    if (!window.confirm('Delete this template?')) return;
    saveToStorage(userTemplates.filter(t=>t.id!==id));
  };

  const allTemplates = [...BUILT_IN_TEMPLATES, ...userTemplates];
  const categories   = ['all',...new Set(allTemplates.map(t=>t.category))];
  const filtered     = filter==='all' ? allTemplates : allTemplates.filter(t=>t.category===filter);

  return (
    <div style={{ display:'grid', gap:'14px' }}>
      <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
        {[['library','📚 Template Library'],['save','💾 Save Pipeline']].map(([id,l])=>(
          <button key={id} onClick={()=>setSubTab(id)} style={{ padding:'6px 14px', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontWeight:subTab===id?700:400, background:subTab===id?'rgba(0,203,168,.1)':'#fff', color:subTab===id?'#00956B':'var(--muted)', border:subTab===id?'1.5px solid #00CBA8':'1px solid var(--border)' }}>{l}</button>
        ))}
        {rows.length > 0 && <span style={{ marginLeft:'auto', fontSize:'11px', color:'var(--muted)', alignSelf:'center' }}>Current: {rows.length.toLocaleString()} rows · {columns.length} cols</span>}
      </div>

      {subTab==='library' && (
        <>
          {/* Category filter */}
          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
            {categories.map(c=>(
              <button key={c} onClick={()=>setFilter(c)} style={{ padding:'4px 12px', borderRadius:'5px', fontSize:'11px', fontWeight:filter===c?700:400, cursor:'pointer', background:filter===c?'rgba(0,203,168,.1)':'#F1F5F9', color:filter===c?'#00956B':'var(--muted)', border:filter===c?'1.5px solid #00CBA8':'1px solid var(--border)' }}>
                {c}
              </button>
            ))}
          </div>

          {/* Template cards */}
          <div style={{ display:'grid', gap:'10px' }}>
            {filtered.map(t=>(
              <div key={t.id} style={S.card}>
                <div style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>
                  <span style={{ fontSize:'28px', flexShrink:0 }}>{t.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px' }}>
                      <span style={{ fontWeight:700, fontSize:'13px', color:'var(--text)' }}>{t.name}</span>
                      <span style={S.tag('#3B82F6')}>{t.category}</span>
                      {t.createdAt && <span style={{ fontSize:'9px', color:'var(--muted)' }}>Custom</span>}
                    </div>
                    <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'8px' }}>{t.description}</div>
                    {/* Steps list */}
                    <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginBottom:'10px' }}>
                      {t.steps.map((step,i)=>(
                        <span key={i} style={{ padding:'2px 8px', background:'#F1F5F9', borderRadius:'3px', fontSize:'10px', color:'var(--muted)', border:'1px solid var(--border)' }}>
                          {i+1}. {step.label}
                        </span>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                      <button onClick={()=>runTemplate(t)} disabled={!rows.length||running===t.id}
                        style={{ ...S.btn(running===t.id?'#94A3B8':'#00CBA8'), padding:'6px 16px', fontSize:'11px', opacity:!rows.length?0.5:1 }}>
                        {running===t.id ? '⏳ Running...' : '▶ Apply to Current Dataset'}
                      </button>
                      {t.createdAt && <button onClick={()=>deleteTemplate(t.id)} style={{ ...S.btn('#FEE2E2','#DC2626'), padding:'5px 12px', fontSize:'11px' }}>🗑</button>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Result preview */}
          {result && (
            <div style={{ ...S.card, border:'2px solid #00CBA8' }}>
              <div style={{ fontWeight:700, color:'#00956B', fontSize:'13px', marginBottom:'10px' }}>✅ Pipeline Complete</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'12px' }}>
                {[['Before', rows.length, '#64748B'],['After', result.rows.length, '#00CBA8'],['Removed', result.removedTotal, result.removedTotal>0?'#EF4444':'#00CBA8']].map(([l,v,c])=>(
                  <div key={l} style={{ textAlign:'center', padding:'10px', background:'#F8FAFC', borderRadius:'7px' }}>
                    <div style={{ fontSize:'20px', fontWeight:800, color:c }}>{v.toLocaleString()}</div>
                    <div style={{ fontSize:'9px', color:'var(--muted)' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gap:'4px', marginBottom:'12px' }}>
                {result.log.map((l,i)=>(
                  <div key={i} style={{ display:'flex', gap:'10px', fontSize:'11px', padding:'4px 0', borderBottom:'1px solid #F8FAFC' }}>
                    <span style={{ color:'#00CBA8', fontWeight:700, flexShrink:0 }}>Step {i+1}</span>
                    <span style={{ color:'var(--text)', flex:1 }}>{l.label}</span>
                    <span style={{ color:l.removed>0?'#EF4444':'#94A3B8', fontWeight:600 }}>{l.removed>0?`-${l.removed} rows`:''}</span>
                    <span style={{ color:'var(--muted)' }}>{l.rows.toLocaleString()} rows</span>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={applyResult} style={S.btn()}>✅ Apply Changes</button>
                <button onClick={()=>setResult(null)} style={{ ...S.btn('#F1F5F9','var(--muted)') }}>✕ Discard</button>
              </div>
            </div>
          )}
        </>
      )}

      {subTab==='save' && (
        <div style={S.card}>
          <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'6px' }}>💾 Save Current Cleaning as Template</div>
          <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'14px', lineHeight:1.7 }}>
            Save your cleaning workflow so you can replay it on future files of the same type. Templates are saved locally in your browser.
          </div>
          <div style={{ display:'grid', gap:'10px', marginBottom:'14px' }}>
            <div><span style={S.lbl}>Template Name</span><input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="e.g. Monthly Sales Report Cleaner" style={S.inp}/></div>
            <div><span style={S.lbl}>Description</span><input value={saveDesc} onChange={e=>setSaveDesc(e.target.value)} placeholder="What does this template clean?" style={S.inp}/></div>
          </div>
          <div style={{ padding:'10px 14px', background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.2)', borderRadius:'7px', fontSize:'11px', color:'#1D4ED8', marginBottom:'14px', lineHeight:1.7 }}>
            💡 The template saves a standard set of steps based on your dataset type. After saving, you can edit the steps directly in the template library.
          </div>
          <button onClick={saveCurrentPipeline} disabled={!saveName.trim()} style={{ ...S.btn(), opacity:!saveName.trim()?0.5:1 }}>💾 Save Template</button>
          {userTemplates.length > 0 && (
            <div style={{ marginTop:'14px' }}>
              <div style={{ fontSize:'11px', fontWeight:600, color:'var(--muted)', marginBottom:'8px' }}>Your saved templates ({userTemplates.length}):</div>
              {userTemplates.map(t=>(
                <div key={t.id} style={{ display:'flex', gap:'8px', alignItems:'center', padding:'7px 10px', background:'#F8FAFC', borderRadius:'6px', marginBottom:'5px', border:'1px solid var(--border)', fontSize:'11px' }}>
                  <span>{t.icon}</span>
                  <span style={{ flex:1, fontWeight:600, color:'var(--text)' }}>{t.name}</span>
                  <span style={{ color:'var(--muted)', fontSize:'10px' }}>{t.steps.length} steps</span>
                  <button onClick={()=>deleteTemplate(t.id)} style={{ background:'none', border:'none', color:'#DC2626', cursor:'pointer', fontSize:'14px' }}>🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/*
═══════════════════════════════════════════════════════════════
INTEGRATION GUIDE — add to MainApp.jsx
═══════════════════════════════════════════════════════════════
IMPORT:
  import PipelineTemplates from '../components/tabs/PipelineTemplates.jsx';

ADD TAB:
  { id:'templates', label:'🧩 Templates' }

TAB PANEL:
  {activeTab === 'templates' && (
    <PipelineTemplates
      rows={rows}
      columns={columns}
      onApply={(newRows, desc) => {
        setRows(newRows);
        process('eda', { rows: newRows }).then(setAnalysis);
      }}
    />
  )}
*/