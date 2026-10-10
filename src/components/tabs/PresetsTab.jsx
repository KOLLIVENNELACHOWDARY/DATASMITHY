// src/components/tabs/PresetsTab.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

const LOCAL_KEY = 'datasmithy_presets_v2';

const savePresetToStorage = (preset) => {
  const existing = getStoredPresets();
  const updated = [{ ...preset, id: Date.now().toString(), createdAt: new Date().toISOString() }, ...existing];
  localStorage.setItem(LOCAL_KEY, JSON.stringify(updated.slice(0, 30)));
  return updated;
};

const getStoredPresets = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); }
  catch { return []; }
};

const deleteStoredPreset = (id) => {
  const updated = getStoredPresets().filter(p => p.id !== id);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
  return updated;
};

const BUILTIN_PRESETS = [
  {
    id: 'builtin_1',
    name: 'Classification Ready',
    description: 'Best settings for classification tasks. Fills nulls, caps outliers, label encodes categories, standard scales numbers.',
    tags: ['classification','ml','sklearn'],
    icon: '🎯',
    color: '#00CBA8',
    strategies: {
      numeric_missing:    'median',
      categorical_missing:'mode',
      outliers:           'cap',
      numeric_scale:      'standard',
      categorical_encode: 'label',
      drop_correlated:    true,
      corr_threshold:     0.95,
    }
  },
  {
    id: 'builtin_2',
    name: 'Regression Ready',
    description: 'Optimized for regression. Uses mean imputation for numeric, robust scaling for outlier-prone columns.',
    tags: ['regression','ml','prediction'],
    icon: '📈',
    color: '#4B9EFF',
    strategies: {
      numeric_missing:    'mean',
      categorical_missing:'mode',
      outliers:           'cap',
      numeric_scale:      'robust',
      categorical_encode: 'label',
      drop_correlated:    true,
      corr_threshold:     0.97,
    }
  },
  {
    id: 'builtin_3',
    name: 'Neural Network Ready',
    description: 'Scales everything to [0,1] with MinMax. One-hot encodes categories. Removes all nulls.',
    tags: ['deep learning','neural network','keras','tensorflow'],
    icon: '🧠',
    color: '#9B59B6',
    strategies: {
      numeric_missing:    'mean',
      categorical_missing:'mode',
      outliers:           'cap',
      numeric_scale:      'minmax',
      categorical_encode: 'onehot',
      drop_correlated:    false,
      corr_threshold:     0.99,
    }
  },
  {
    id: 'builtin_4',
    name: 'Tree Model Ready',
    description: 'For Random Forest, XGBoost, LightGBM. No scaling needed — just encode and clean.',
    tags: ['xgboost','random forest','lightgbm','catboost'],
    icon: '🌳',
    color: '#2ECC71',
    strategies: {
      numeric_missing:    'median',
      categorical_missing:'mode',
      outliers:           'keep',
      numeric_scale:      'none',
      categorical_encode: 'label',
      drop_correlated:    false,
      corr_threshold:     0.99,
    }
  },
  {
    id: 'builtin_5',
    name: 'Minimal Clean',
    description: 'Only removes duplicates and fills obvious nulls. Keeps data as close to original as possible.',
    tags: ['minimal','basic','exploration'],
    icon: '🧹',
    color: '#FFB300',
    strategies: {
      numeric_missing:    'median',
      categorical_missing:'mode',
      outliers:           'keep',
      numeric_scale:      'none',
      categorical_encode: 'none',
      drop_correlated:    false,
      corr_threshold:     0.99,
    }
  },
  {
    id: 'builtin_6',
    name: 'Aggressive Clean',
    description: 'Removes all nulls, all outliers, all correlated features. Maximum data quality.',
    tags: ['aggressive','strict','quality'],
    icon: '⚡',
    color: '#FF4655',
    strategies: {
      numeric_missing:    'drop_row',
      categorical_missing:'drop_row',
      outliers:           'remove',
      numeric_scale:      'standard',
      categorical_encode: 'label',
      drop_correlated:    true,
      corr_threshold:     0.90,
    }
  },
  {
    id: 'builtin_7',
    name: 'Customer / CRM Data',
    description: 'For customer datasets with mixed types. Frequency encodes high-cardinality columns.',
    tags: ['customer','crm','churn','marketing'],
    icon: '👥',
    color: '#E67E22',
    strategies: {
      numeric_missing:    'median',
      categorical_missing:'mode',
      outliers:           'cap',
      numeric_scale:      'standard',
      categorical_encode: 'frequency',
      drop_correlated:    true,
      corr_threshold:     0.95,
    }
  },
  {
    id: 'builtin_8',
    name: 'Financial Data',
    description: 'For financial datasets with skewed distributions. Robust scaling handles outliers well.',
    tags: ['finance','banking','fraud','stock'],
    icon: '💰',
    color: '#1ABC9C',
    strategies: {
      numeric_missing:    'median',
      categorical_missing:'mode',
      outliers:           'cap',
      numeric_scale:      'robust',
      categorical_encode: 'label',
      drop_correlated:    true,
      corr_threshold:     0.95,
    }
  },
  {
    id: 'builtin_9',
    name: 'Medical / Healthcare',
    description: 'Conservative cleaning — flags outliers instead of removing. Preserves all records.',
    tags: ['medical','healthcare','clinical','diagnosis'],
    icon: '🏥',
    color: '#3498DB',
    strategies: {
      numeric_missing:    'median',
      categorical_missing:'mode',
      outliers:           'flag',
      numeric_scale:      'standard',
      categorical_encode: 'label',
      drop_correlated:    false,
      corr_threshold:     0.99,
    }
  },
  {
    id: 'builtin_10',
    name: 'Time Series Prep',
    description: 'Forward fills missing values to preserve time continuity. MinMax scaling.',
    tags: ['time series','temporal','forecasting'],
    icon: '⏱',
    color: '#8E44AD',
    strategies: {
      numeric_missing:    'ffill',
      categorical_missing:'ffill',
      outliers:           'cap',
      numeric_scale:      'minmax',
      categorical_encode: 'label',
      drop_correlated:    false,
      corr_threshold:     0.99,
    }
  },
  {
    id: 'builtin_11',
    name: 'Survey / Ordinal Data',
    description: 'For Likert scale or ordinal surveys. Ordinal encodes categories, no scaling applied.',
    tags: ['survey','ordinal','likert','questionnaire'],
    icon: '📋',
    color: '#16A085',
    strategies: {
      numeric_missing:    'mode',
      categorical_missing:'mode',
      outliers:           'keep',
      numeric_scale:      'none',
      categorical_encode: 'ordinal',
      drop_correlated:    false,
      corr_threshold:     0.99,
    }
  },
  {
    id: 'builtin_12',
    name: 'Export Ready (No Scaling)',
    description: 'Cleans and encodes but applies no scaling. Best when you want to scale in your own pipeline.',
    tags: ['export','raw','no scaling'],
    icon: '📦',
    color: '#95A5A6',
    strategies: {
      numeric_missing:    'median',
      categorical_missing:'mode',
      outliers:           'cap',
      numeric_scale:      'none',
      categorical_encode: 'label',
      drop_correlated:    false,
      corr_threshold:     0.99,
    }
  },
];

const applyStrategyToColumns = (strategies, analysisColumns) => {
  if (!analysisColumns?.length) return { clean:{}, encode:{}, scale:{}, outliers:{}, features:{}, selection:{} };
  const clean = {}, encode = {}, scale = {}, outliersCfg = {};
  analysisColumns.forEach(col => {
    if (col.type === 'numeric') {
      clean[col.name]       = strategies.numeric_missing    || 'median';
      scale[col.name]       = strategies.numeric_scale      || 'standard';
      outliersCfg[col.name] = strategies.outliers           || 'cap';
      encode[col.name]      = 'none';
    } else {
      clean[col.name]       = strategies.categorical_missing || 'mode';
      encode[col.name]      = strategies.categorical_encode  || 'label';
      scale[col.name]       = 'none';
      outliersCfg[col.name] = 'keep';
    }
  });
  return {
    clean,
    encode,
    scale,
    outliers: outliersCfg,
    features: { datetime_extract:true, log_transform:false, binning:false },
    selection: {
      drop_correlated:   strategies.drop_correlated ?? true,
      corr_threshold:    strategies.corr_threshold  ?? 0.97,
      drop_low_variance: false,
      var_threshold:     0.01,
    }
  };
};

export default function PresetsTab({ currentConfig, onApplyPreset, analysisColumns }) {
  const { user }  = useAuth();
  const [myPresets,  setMyPresets]  = useState([]);
  const [showSave,   setShowSave]   = useState(false);
  const [showGuide,  setShowGuide]  = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDesc, setPresetDesc] = useState('');
  const [appliedId,  setAppliedId]  = useState(null);
  const [activeTab,  setActiveTab]  = useState('builtin');
  const [search,     setSearch]     = useState('');

  useEffect(() => { setMyPresets(getStoredPresets()); }, []);

  const handleApplyBuiltin = (preset) => {
    if (!analysisColumns?.length) {
      alert('Please upload a dataset first before applying a preset.');
      return;
    }
    const config = applyStrategyToColumns(preset.strategies, analysisColumns);
    onApplyPreset(config);
    setAppliedId(preset.id);
    setTimeout(() => setAppliedId(null), 2000);
  };

  const handleApplyMy = (preset) => {
    if (!preset.config) return;
    onApplyPreset(preset.config);
    setAppliedId(preset.id);
    setTimeout(() => setAppliedId(null), 2000);
  };

  const handleSave = () => {
    if (!presetName.trim()) return;
    const preset = {
      name:        presetName.trim(),
      description: presetDesc.trim() || 'Custom preset',
      config:      currentConfig,
      columns:     analysisColumns?.map(c => ({ name:c.name, type:c.type })) || [],
      savedBy:     user?.email || 'anonymous',
      icon:        '⚙️',
      color:       'var(--teal)',
    };
    const updated = savePresetToStorage(preset);
    setMyPresets(updated);
    setPresetName(''); setPresetDesc('');
    setShowSave(false);
    setActiveTab('mine');
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this preset?')) return;
    setMyPresets(deleteStoredPreset(id));
  };

  const filteredBuiltin = BUILTIN_PRESETS.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fade-in" style={{ display:'grid', gap:'14px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, color:'var(--text)', fontSize:'15px' }}>Pipeline Presets</div>
          <div style={{ color:'var(--muted)', fontSize:'12px', marginTop:'2px' }}>
            One-click preprocessing configurations for any use case
          </div>
        </div>
        <button onClick={() => setShowGuide(s=>!s)} style={{
          background:'rgba(75,158,255,.1)', border:'1px solid rgba(75,158,255,.3)',
          borderRadius:'6px', padding:'7px 14px', fontSize:'12px', color:'var(--blue)',
          cursor:'pointer', display:'flex', alignItems:'center', gap:'6px'
        }}>
          {showGuide ? '✕ Close Guide' : '❓ How to use Presets'}
        </button>
        <button onClick={() => setShowSave(s=>!s)} className="btn-primary"
          style={{ fontSize:'12px', padding:'7px 14px' }}>
          💾 Save Current Config
        </button>
      </div>

      {/* Guide Panel */}
      {showGuide && (
        <div className="card fade-in" style={{ padding:'20px', border:'1px solid rgba(75,158,255,.25)', background:'rgba(75,158,255,.04)' }}>
          <div style={{ color:'var(--blue)', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'14px' }}>
            📖 How Presets Work — Step by Step
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'14px', marginBottom:'16px' }}>
            {[
              { icon:'1️⃣', title:'Upload your dataset',    desc:'Go to the Import tab and upload your CSV, Excel, or JSON file. DataSmithy will analyze it automatically.' },
              { icon:'2️⃣', title:'Pick a Preset',          desc:'Choose a built-in preset that matches your task (e.g. "Classification Ready") and click Apply.' },
              { icon:'3️⃣', title:'Check the settings',     desc:'The preset auto-fills Clean, Encode, and Scale tabs for every column. You can still adjust individual columns.' },
              { icon:'4️⃣', title:'Run the Pipeline',       desc:'Click ⚡ Run Pipeline in the top navbar. Your data is processed using the preset settings instantly.' },
              { icon:'💾', title:'Save your own Presets',  desc:'After tweaking settings manually, click "Save Current Config" to save for reuse on future datasets.' },
              { icon:'🔄', title:'Reuse on any dataset',   desc:'Your saved preset applies the same strategies to all matching column types on any new dataset.' },
            ].map(s => (
              <div key={s.title} style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                <div style={{ fontSize:'20px', flexShrink:0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontWeight:600, color:'var(--text)', fontSize:'12px', marginBottom:'3px' }}>{s.title}</div>
                  <div style={{ color:'var(--muted)', fontSize:'11px', lineHeight:1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ paddingTop:'14px', borderTop:'1px solid var(--border)' }}>
            <div style={{ color:'var(--text)', fontSize:'11px', fontWeight:600, marginBottom:'10px' }}>
              Quick Reference — What each strategy means:
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'6px' }}>
              {[
                ['Missing: Mean',      'Fill empty numbers with the average value'],
                ['Missing: Median',    'Fill with middle value — best for skewed data'],
                ['Missing: Mode',      'Fill with most common value — best for categories'],
                ['Missing: Drop Row',  'Delete entire rows that have any empty values'],
                ['Missing: FFill',     'Copy the previous row\'s value downward'],
                ['Outliers: Cap',      'Clip extreme values to safe boundaries (IQR method)'],
                ['Outliers: Remove',   'Delete entire rows containing extreme values'],
                ['Outliers: Flag',     'Keep outliers but mark them with a new 0/1 column'],
                ['Outliers: Keep',     'Do nothing — leave outliers as they are'],
                ['Scale: Standard',    'Center at 0 with unit variance — most ML models'],
                ['Scale: MinMax',      'Scale all values to [0,1] — neural networks'],
                ['Scale: Robust',      'Scale using median/IQR — ignores outliers'],
                ['Scale: None',        'No scaling — best for tree-based models'],
                ['Encode: Label',      'Convert categories to integers: cat→0, dog→1'],
                ['Encode: One-Hot',    'Create a new binary column for each category'],
                ['Encode: Frequency',  'Replace each category with how often it appears'],
                ['Encode: Ordinal',    'Like label but implies a natural order'],
              ].map(([term, def]) => (
                <div key={term} style={{ padding:'6px 10px', background:'var(--bg)', borderRadius:'5px', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:'10px', fontWeight:700, color:'var(--teal)', marginBottom:'2px' }}>{term}</div>
                  <div style={{ fontSize:'10px', color:'var(--muted)', lineHeight:1.4 }}>{def}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save Panel */}
      {showSave && (
        <div className="card fade-in" style={{ padding:'20px', border:'1px solid rgba(0,203,168,.25)' }}>
          <div style={{ color:'var(--teal)', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'14px' }}>
            💾 Save Current Configuration as Preset
          </div>
          <div style={{ color:'var(--muted)', fontSize:'11px', marginBottom:'14px', lineHeight:1.6 }}>
            This saves your current Clean, Encode, Scale, and Outlier settings so you can apply them to any future dataset with one click.
          </div>
          <div style={{ display:'grid', gap:'10px' }}>
            <div>
              <label style={{ fontSize:'11px', color:'var(--muted)', display:'block', marginBottom:'4px', fontWeight:500 }}>
                Preset Name *
              </label>
              <input type="text" value={presetName} onChange={e=>setPresetName(e.target.value)}
                placeholder="e.g. My Customer Churn Config" style={{ width:'100%' }} autoFocus
                onKeyDown={e=>e.key==='Enter'&&handleSave()} />
            </div>
            <div>
              <label style={{ fontSize:'11px', color:'var(--muted)', display:'block', marginBottom:'4px', fontWeight:500 }}>
                Description (optional)
              </label>
              <input type="text" value={presetDesc} onChange={e=>setPresetDesc(e.target.value)}
                placeholder="e.g. Works well for telco churn datasets"
                style={{ width:'100%' }} />
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="btn-primary" onClick={handleSave} disabled={!presetName.trim()}
                style={{ fontSize:'12px', padding:'8px 16px' }}>
                💾 Save Preset
              </button>
              <button onClick={() => { setShowSave(false); setPresetName(''); setPresetDesc(''); }}
                style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:'5px', padding:'8px 16px', fontSize:'12px', color:'var(--muted)', cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:'4px', background:'var(--bg)', padding:'4px', borderRadius:'8px', width:'fit-content' }}>
        {[
          ['builtin', `🎯 Built-in (${BUILTIN_PRESETS.length})`],
          ['mine',    `⚙️ My Presets (${myPresets.length})`],
        ].map(([t,l]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding:'7px 16px', fontSize:'12px',
            fontWeight: activeTab===t ? 700 : 400,
            background: activeTab===t ? 'var(--card)' : 'transparent',
            color:      activeTab===t ? 'var(--teal)' : 'var(--muted)',
            border:     activeTab===t ? '1px solid var(--border)' : '1px solid transparent',
            borderRadius:'6px', cursor:'pointer'
          }}>{l}</button>
        ))}
      </div>

      {/* Search */}
      {activeTab === 'builtin' && (
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search presets by name, use case, or tag..."
          style={{ width:'100%', maxWidth:'400px' }} />
      )}

      {/* No dataset warning */}
      {!analysisColumns?.length && (
        <div style={{ padding:'10px 14px', background:'rgba(255,179,0,.08)', border:'1px solid rgba(255,179,0,.25)', borderRadius:'6px', fontSize:'11px', color:'var(--amber)' }}>
          ⚠ Upload a dataset first (Import tab) — presets will then apply to all your columns automatically.
        </div>
      )}

      {/* Built-in Presets Grid */}
      {activeTab === 'builtin' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'12px' }}>
          {filteredBuiltin.map(preset => (
            <div key={preset.id} className="card" style={{
              padding:'16px', position:'relative', overflow:'hidden',
              border:`1px solid ${appliedId===preset.id ? 'var(--teal)' : 'var(--border)'}`,
              transition:'all .2s'
            }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=preset.color}
              onMouseLeave={e=>e.currentTarget.style.borderColor=appliedId===preset.id?'var(--teal)':'var(--border)'}
            >
              {/* Left color bar */}
              <div style={{ position:'absolute', top:0, left:0, width:'3px', height:'100%', background:preset.color }} />

              <div style={{ paddingLeft:'8px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                  <span style={{ fontSize:'22px' }}>{preset.icon}</span>
                  <span style={{ fontWeight:700, color:'var(--text)', fontSize:'13px' }}>{preset.name}</span>
                </div>

                <div style={{ color:'var(--muted)', fontSize:'11px', lineHeight:1.5, marginBottom:'10px' }}>
                  {preset.description}
                </div>

                {/* Strategy pills */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:'4px', marginBottom:'8px' }}>
                  {[
                    `nulls → ${preset.strategies.numeric_missing}`,
                    `outliers → ${preset.strategies.outliers}`,
                    `scale → ${preset.strategies.numeric_scale}`,
                    `encode → ${preset.strategies.categorical_encode}`,
                  ].map(s => (
                    <span key={s} style={{
                      fontSize:'9px', padding:'2px 7px',
                      background:'var(--bg)', border:'1px solid var(--border)',
                      borderRadius:'10px', color:'var(--muted)', fontFamily:'monospace'
                    }}>{s}</span>
                  ))}
                </div>

                {/* Tags */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:'4px', marginBottom:'12px' }}>
                  {preset.tags.map(t => (
                    <span key={t} style={{
                      fontSize:'9px', padding:'2px 8px',
                      background:`${preset.color}18`, color:preset.color,
                      borderRadius:'10px', fontWeight:600
                    }}>{t}</span>
                  ))}
                </div>

                <button onClick={() => handleApplyBuiltin(preset)} style={{
                  background:  appliedId===preset.id ? 'var(--teal)' : `${preset.color}18`,
                  color:       appliedId===preset.id ? '#000' : preset.color,
                  border:      `1px solid ${preset.color}55`,
                  borderRadius:'5px', padding:'6px 16px',
                  fontSize:'11px', fontWeight:600, cursor:'pointer', transition:'all .15s'
                }}>
                  {appliedId===preset.id ? '✅ Applied!' : 'Apply to Dataset →'}
                </button>
              </div>
            </div>
          ))}
          {filteredBuiltin.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'32px', color:'var(--muted)' }}>
              No presets match "{search}"
            </div>
          )}
        </div>
      )}

      {/* My Presets */}
      {activeTab === 'mine' && (
        <div>
          {myPresets.length === 0 ? (
            <div className="card" style={{ padding:'48px', textAlign:'center' }}>
              <div style={{ fontSize:'36px', marginBottom:'12px' }}>📭</div>
              <div style={{ fontWeight:600, color:'var(--text)', fontSize:'14px', marginBottom:'6px' }}>No saved presets yet</div>
              <div style={{ color:'var(--muted)', fontSize:'12px', marginBottom:'20px', lineHeight:1.7 }}>
                Configure your settings in the Clean, Encode, and Scale tabs,<br/>
                then click "💾 Save Current Config" to save them here.
              </div>
              <button onClick={() => setShowSave(true)} className="btn-primary" style={{ fontSize:'12px' }}>
                💾 Save Current Config
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'12px' }}>
              {myPresets.map(preset => (
                <div key={preset.id} className="card" style={{
                  padding:'16px',
                  border:`1px solid ${appliedId===preset.id ? 'var(--teal)' : 'var(--border)'}`,
                  transition:'border-color .2s'
                }}>
                  <div style={{ display:'flex', gap:'10px' }}>
                    <div style={{ fontSize:'22px' }}>⚙️</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'2px' }}>
                        {preset.name}
                      </div>
                      <div style={{ color:'var(--muted)', fontSize:'11px', marginBottom:'6px' }}>
                        {preset.description}
                      </div>
                      <div style={{ color:'var(--muted)', fontSize:'10px', marginBottom:'10px' }}>
                        📅 {new Date(preset.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                        {preset.columns?.length > 0 && ` · ${preset.columns.length} columns`}
                      </div>
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button onClick={() => handleApplyMy(preset)} style={{
                          background: appliedId===preset.id ? 'var(--teal)' : 'rgba(0,203,168,.1)',
                          color:      appliedId===preset.id ? '#000' : 'var(--teal)',
                          border:'1px solid rgba(0,203,168,.3)', borderRadius:'5px',
                          padding:'5px 14px', fontSize:'11px', fontWeight:600, cursor:'pointer'
                        }}>
                          {appliedId===preset.id ? '✅ Applied!' : 'Apply →'}
                        </button>
                        <button onClick={() => handleDelete(preset.id)} style={{
                          background:'rgba(255,70,85,.08)', border:'1px solid rgba(255,70,85,.2)',
                          borderRadius:'5px', padding:'5px 10px', fontSize:'11px',
                          color:'var(--red)', cursor:'pointer'
                        }}>🗑</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
