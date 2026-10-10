// src/pages/MainApp.jsx — FINAL with connectors for all modalities
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import FeedbackModal from '../components/FeedbackModal.jsx';
import AILayer from '../components/AILayer.jsx';
import TourGuide, { TourButton } from '../components/OnboardingTour.jsx';
import useFeedbackTrigger from '../hooks/useFeedbackTrigger.js';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useAuth }     from '../context/AuthContext.jsx';
import { saveSession } from '../firebase/db.jsx';
import { runEDA, runPipeline, generatePythonCode } from '../utils/jsPipeline.js';
import DataPreview    from '../components/DataPreview.jsx';
import ProgressSteps  from '../components/ProgressSteps.jsx';
import ImportTab      from '../components/tabs/ImportTab.jsx';
import ColumnsTab     from '../components/tabs/ColumnsTab.jsx';
import PresetsTab     from '../components/tabs/PresetsTab.jsx';
import OverviewTab    from '../components/tabs/OverviewTab.jsx';
import CleanTab       from '../components/tabs/CleanTab.jsx';
import EncodeTab      from '../components/tabs/EncodeTab.jsx';
import ScaleTab       from '../components/tabs/ScaleTab.jsx';
import FeatureEngTab  from '../components/tabs/FeatureEngTab.jsx';
import VisualizeTab   from '../components/tabs/VisualizeTab.jsx';
import MLReadyTab     from '../components/tabs/MLReadyTab.jsx';
import ExportTab      from '../components/tabs/ExportTab.jsx';
import DataGridTab       from '../components/tabs/DataGridTab.jsx';
import UniversalCleanTab from '../components/tabs/UniversalCleanTab.jsx';
import ConnectorsTab     from '../components/tabs/ConnectorsTab.jsx';
import PipelineTemplates from '../components/tabs/PipelineTemplates.jsx';
import { ModeToggle }    from '../components/tabs/UniversalExtras.jsx';
import ImageTab          from '../components/tabs/ImageTab.jsx';
import ShareButton       from '../components/ShareButton.jsx';
import TextNLPTab        from '../components/tabs/TextNLPTab.jsx';

const IMAGE_EXTS   = new Set(['jpg','jpeg','png','gif','webp','bmp','svg','tiff','tif','heic']);
const TEXT_EXTS    = new Set(['txt','md','rst','log']);

function detectModality(files) {
  if (!files?.length) return 'tabular';
  const ext = files[0].name?.split('.').pop().toLowerCase() || '';
  if (ext === 'zip' || IMAGE_EXTS.has(ext)) return 'images';
  if (TEXT_EXTS.has(ext))                   return 'text';
  return 'tabular';
}

// ─── TABULAR TABS ────────────────────────────────────────────────────────────
const GENERAL_TABS = [
  { id:'import',    label:'📥 Import'    },  // Upload + HuggingFace + GitHub + URL + Paste all here
  { id:'overview',  label:'📈 Overview'  },
  { id:'grid',      label:'📊 Data Grid' },
  { id:'columns',   label:'🏷 Columns'   },
  { id:'universal', label:'✨ Clean'     },
  { id:'visualize', label:'📉 Visualize' },
  { id:'templates', label:'🧩 Templates' },
  { id:'export',    label:'📦 Export'    },
];
const ML_ALL_TABS = [
  { id:'import',    label:'📥 Import'    },
  { id:'overview',  label:'📈 Overview'  },
  { id:'grid',      label:'📊 Data Grid' },
  { id:'columns',   label:'🏷 Columns'   },
  { id:'universal', label:'✨ Clean'     },
  { id:'clean',     label:'🔬 ML Clean'  },
  { id:'encode',    label:'🔤 Encode'    },
  { id:'scale',     label:'⚖ Scale'     },
  { id:'features',  label:'⚙ Features'  },
  { id:'ml_ready',  label:'🤖 ML Ready'  },
  { id:'presets',   label:'💾 Presets'   },
  { id:'visualize', label:'📉 Visualize' },
  { id:'connectors',label:'🔌 Connect'   },
  { id:'templates', label:'🧩 Templates' },
  { id:'export',    label:'📦 Export'    },
];

// ─── IMAGE SUB-TABS (shown as sub-bar inside Images modality) ─────────────────
const IMAGE_TABS = [
  { id:'import',    label:'📥 Import'   },
  { id:'overview',  label:'📊 Overview' },
  { id:'classes',   label:'🏷 Classes'  },
  { id:'grid',      label:'🖼 Browse'   },
  { id:'quality',   label:'✅ Quality'  },
  { id:'charts',    label:'📈 Charts'   },
  { id:'universal', label:'🌐 Tools'    },
  { id:'augment',   label:'🔀 Augment'  },
  { id:'split',     label:'✂️ Split'    },
  { id:'models',    label:'🤖 ML Code'  },
  { id:'advanced',  label:'🧪 Advanced' },
  { id:'pipeline',  label:'⚡ Pipeline' },
  { id:'export',    label:'📦 Export'   },
];

// ─── TEXT SUB-TABS ────────────────────────────────────────────────────────────
const TEXT_TABS = [
  { id:'import',    label:'📥 Import'      },
  { id:'overview',  label:'📊 Overview'    },
  { id:'words',     label:'📝 Documents'   },
  { id:'universal', label:'✅ Quality'     },
  { id:'clean',     label:'📈 Charts'      },
  { id:'visualize', label:'🔍 Analyse'     },
  { id:'export',    label:'🌐 Tools'       },
  { id:'translate', label:'✂️ Split'       },
  { id:'mlcode',    label:'🤖 ML Code'     },
  { id:'download',  label:'📦 Export'      },
];

const REDO_KEY = 'datasmithy_redo_session';

// ─── Modality bar ─────────────────────────────────────────────────────────────
function ModalityBar({ modality, setModality }) {
  return (
    <div data-tour="modality-bar" style={{ display:'flex', background:'#fff', borderBottom:'2px solid var(--border)', padding:'0 16px' }}>
      {[
        { id:'tabular', icon:'📊', label:'Tabular Data',  sub:'CSV · Excel · JSON · Parquet', tour:'modality-tabular' },
        { id:'images',  icon:'🖼', label:'Images',         sub:'JPG · PNG · WebP · ZIP',       tour:'modality-images' },
        { id:'text',    icon:'📝', label:'Text / NLP',     sub:'TXT · MD · paste · URL',       tour:'modality-text' },
      ].map(o => (
        <button key={o.id} data-tour={`modality-${o.id}`} onClick={() => setModality(o.id)} style={{
          display:'flex', flexDirection:'column', alignItems:'center',
          padding:'10px 32px', border:'none', cursor:'pointer', background:'transparent',
          borderBottom: modality===o.id ? '3px solid #00CBA8' : '3px solid transparent',
          marginBottom:'-2px', transition:'all .15s',
        }}>
          <span style={{ fontSize:'22px', marginBottom:'2px' }}>{o.icon}</span>
          <span style={{ fontSize:'12px', fontWeight:700, color:modality===o.id?'#00CBA8':'#64748B' }}>{o.label}</span>
          <span style={{ fontSize:'9px', color:'#94A3B8', marginTop:'1px' }}>{o.sub}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Sub-tab bar (reused for all 3 modalities) ────────────────────────────────
function SubTabBar({ tabs, activeTab, setActiveTab, mode, setMode, showModeToggle }) {
  return (
    <div data-tour="subtab-bar" style={{ background:'#fff', borderBottom:'1px solid var(--border)', boxShadow:'0 1px 3px rgba(0,0,0,.04)', display:'flex', alignItems:'center', padding:'0 8px', overflowX:'auto', gap:'6px' }}>
      {showModeToggle && <ModeToggle mode={mode} onModeChange={setMode}/>}
      <div style={{ display:'flex', gap:'2px', padding:'6px 0', flexShrink:0 }}>
        {tabs.map(t => (
          <button key={t.id} data-tour={`tab-${t.id}`} onClick={() => setActiveTab(t.id)} style={{
            background:   activeTab===t.id ? 'rgba(0,203,168,.1)'            : 'transparent',
            color:        activeTab===t.id ? '#00CBA8'                        : '#64748B',
            border:       activeTab===t.id ? '1px solid rgba(0,203,168,.25)' : '1px solid transparent',
            borderRadius:'6px', padding:'5px 10px', fontSize:'11px',
            cursor:'pointer', fontWeight:activeTab===t.id?600:400, whiteSpace:'nowrap', transition:'all .15s',
          }}>{t.label}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Drag overlay ─────────────────────────────────────────────────────────────
function DragOverlay({ visible, targetModality }) {
  if (!visible) return null;
  const info = {
    tabular:{ icon:'📊', label:'Drop for Tabular Data', color:'#00CBA8' },
    images: { icon:'🖼', label:'Drop for Images',        color:'#3B82F6' },
    text:   { icon:'📝', label:'Drop for Text / NLP',   color:'#8B5CF6' },
  }[targetModality];
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, pointerEvents:'none', background:`${info.color}18`, border:`4px dashed ${info.color}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', background:'#fff', borderRadius:'16px', padding:'32px 48px', boxShadow:'0 8px 32px rgba(0,0,0,.12)' }}>
        <div style={{ fontSize:'52px', marginBottom:'12px' }}>{info.icon}</div>
        <div style={{ fontSize:'18px', fontWeight:800, color:info.color }}>{info.label}</div>
        <div style={{ fontSize:'12px', color:'#94A3B8', marginTop:'6px' }}>Release to upload</div>
      </div>
    </div>
  );
}

// ─── HuggingFace quick-load for Images/Text ───────────────────────────────────
function HFQuickConnect({ onLoad, type }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const PRESETS = type === 'images'
    ? [
        { id:'cifar10',      name:'CIFAR-10',        desc:'60k images, 10 classes' },
        { id:'mnist',        name:'MNIST',            desc:'70k handwritten digits' },
        { id:'cats_vs_dogs', name:'Cats vs Dogs',     desc:'25k images, 2 classes'  },
        { id:'food101',      name:'Food-101',         desc:'101k food images'        },
      ]
    : [
        { id:'imdb',         name:'IMDB Reviews',     desc:'50k sentiment reviews'  },
        { id:'ag_news',      name:'AG News',           desc:'120k news articles'     },
        { id:'emotion',      name:'Emotion Dataset',  desc:'6 emotion labels'       },
        { id:'tweet_eval',   name:'TweetEval',        desc:'Twitter NLP benchmark'  },
      ];

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res  = await fetch(`https://huggingface.co/api/datasets?search=${encodeURIComponent(query)}&limit=6`);
      const data = await res.json();
      setResults(data.map(d => ({ id:d.id, name:d.id, desc:d.description?.slice(0,80)||'No description' })));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div style={{ padding:'16px', background:'#F8FAFC', borderRadius:'10px', border:'1px solid var(--border)', marginTop:'16px' }}>
      <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'10px' }}>🤗 Load from HuggingFace</div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
        <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Search datasets..." style={{ flex:1, padding:'7px 12px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'12px' }}/>
        <button onClick={search} disabled={loading} style={{ background:'#FFB347', border:'none', borderRadius:'6px', padding:'7px 14px', fontSize:'12px', fontWeight:700, cursor:'pointer', color:'#000' }}>{loading?'⏳':'🔍'}</button>
      </div>
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
        {(results.length ? results : PRESETS).slice(0,6).map(ds => (
          <button key={ds.id} onClick={()=>onLoad(ds)} style={{ padding:'6px 12px', borderRadius:'6px', fontSize:'11px', border:'1px solid var(--border)', background:'#fff', cursor:'pointer', color:'var(--text)', fontWeight:500, textAlign:'left' }}>
            <div style={{ fontWeight:700, color:'#FFB347' }}>{ds.name}</div>
            <div style={{ fontSize:'9px', color:'var(--muted)' }}>{ds.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function MainApp() {
  const { user } = useAuth();
  const { showFeedback, recordDatasetProcessed, markFeedbackDone, handleSubmit } = useFeedbackTrigger();
  const [showTour, setShowTour] = React.useState(false);
  const [modality,    setModality]    = useState('tabular');
  const [mode,        setMode]        = useState('general');
  const [activeTab,   setActiveTab]   = useState('import');
  const [imgTab,      setImgTab]      = useState('import');
  const [textTab,     setTextTab]     = useState('import');
  const [dragOver,    setDragOver]    = useState(false);
  const [dragTarget,  setDragTarget]  = useState('tabular');
  const dragCounter = useRef(0);

  const handleModalityChange = (m) => {
    setModality(m);
    if (m === 'tabular') setActiveTab(rawData.length ? 'overview' : 'import');
  };

  // Global drag-drop
  useEffect(() => {
    const onEnter=(e)=>{e.preventDefault();dragCounter.current++;const f=e.dataTransfer.items?[...e.dataTransfer.items].map(i=>({name:i.getAsFile()?.name||''})):[];setDragTarget(detectModality(f));setDragOver(true);};
    const onOver=(e)=>e.preventDefault();
    const onLeave=()=>{dragCounter.current--;if(dragCounter.current===0)setDragOver(false);};
    const onDrop=(e)=>{e.preventDefault();dragCounter.current=0;setDragOver(false);const f=[...(e.dataTransfer.files||[])];if(!f.length)return;const m=detectModality(f);if(m==='images'){setModality('images');window.dispatchEvent(new CustomEvent('datasmithy:imagefiles',{detail:f}));}else if(m==='text'){setModality('text');window.dispatchEvent(new CustomEvent('datasmithy:textfile',{detail:f[0]}));}else{setModality('tabular');handleFile(f[0]);}};
    window.addEventListener('dragenter',onEnter);window.addEventListener('dragover',onOver);window.addEventListener('dragleave',onLeave);window.addEventListener('drop',onDrop);
    return()=>{window.removeEventListener('dragenter',onEnter);window.removeEventListener('dragover',onOver);window.removeEventListener('dragleave',onLeave);window.removeEventListener('drop',onDrop);};
  },[]);

  // Tabular state
  const [redoBanner,     setRedoBanner]     = useState(()=>{try{const d=JSON.parse(localStorage.getItem(REDO_KEY)||'null');return(d&&Date.now()-d.timestamp<300000)?d:null;}catch{return null;}});
  const [fileName,       setFileName]       = useState('');
  const [rawData,        setRawData]        = useState([]);
  const [csvString,      setCsvString]      = useState('');
  const [analysis,       setAnalysis]       = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [loadMsg,        setLoadMsg]        = useState('');
  const [error,          setError]          = useState('');
  const columns=useMemo(()=>rawData.length?Object.keys(rawData[0]):[],[rawData]);
  const [columnOverrides,setColumnOverrides]=useState({});
  const [cleanCfg,setCleanCfg]=useState({});const [encodeCfg,setEncodeCfg]=useState({});const [scaleCfg,setScaleCfg]=useState({});const [outlierCfg,setOutlierCfg]=useState({});
  const [featCfg,setFeatCfg]=useState({datetime_extract:true,log_transform:false,binning:false});
  const [selectCfg,setSelectCfg]=useState({drop_correlated:true,corr_threshold:0.97,drop_low_variance:false,var_threshold:0.01});
  const [targetCol,setTargetCol]=useState('');const [undoSnapshot,setUndoSnapshot]=useState(null);
  const [pipelineResult,setPipelineResult]=useState(null);const [pipelineLog,setPipelineLog]=useState([]);const [processedCsv,setProcessedCsv]=useState('');const [pythonCode,setPythonCode]=useState('');const [processing,setProcessing]=useState(false);const [pipelineError,setPipelineError]=useState('');

  const autoConfig=(result)=>{try{const nc={},ec={},sc={},oc={};(result.columns||[]).forEach(col=>{if(col.type==='numeric'){nc[col.name]=col.missing_pct>0?(Math.abs(col.skew||0)>1?'median':'mean'):'none';sc[col.name]=(col.outliers>0||Math.abs(col.skew||0)>1)?'robust':'standard';oc[col.name]=(col.outliers||0)>0?'cap':'keep';ec[col.name]='none';}else{nc[col.name]=col.missing_pct>0?'mode':'none';ec[col.name]=(col.unique_count||99)<=5?'onehot':'label';sc[col.name]='none';oc[col.name]='keep';}});setCleanCfg(nc);setEncodeCfg(ec);setScaleCfg(sc);setOutlierCfg(oc);}catch(e){console.error(e);}};

  const saveImportHistory=useCallback((name,rows,result)=>{if(!user)return;saveSession(user.uid,{type:'import',fileName:name,originalRows:rows.length,originalCols:Object.keys(rows[0]||{}).length,processedRows:rows.length,processedCols:Object.keys(rows[0]||{}).length,healthScore:result.health||0,rowsProcessed:rows.length,featuresEngineered:0,steps:0}).catch(e=>console.warn(e));},[user]);

  const handleNewTabApply=useCallback((newRows)=>{if(!newRows?.length)return;try{const r=runEDA(newRows);setRawData(newRows);setCsvString(Papa.unparse(newRows));setAnalysis(r);autoConfig(r);setPipelineResult(null);setPipelineLog([]);setProcessedCsv('');setPythonCode('');}catch(e){setError('Could not analyse: '+e.message);}},[]);

  const processData=useCallback(async(rows,csv,name)=>{if(!rows?.length){setError('No data found.');return;}setLoading(true);setLoadMsg(`Analysing ${rows.length.toLocaleString()} rows...`);setError('');setAnalysis(null);setPipelineResult(null);setPipelineError('');setColumnOverrides({});setUndoSnapshot(null);
    try{await new Promise(r=>setTimeout(r,50));const result=runEDA(rows);if(!result)throw new Error('EDA returned no result');setAnalysis(result);autoConfig(result);setRawData(rows);setCsvString(csv);setFileName(name);localStorage.removeItem(REDO_KEY);setRedoBanner(null);saveImportHistory(name,rows,result);setActiveTab('overview');}
    catch(e){setError('Analysis error: '+(e.message||'Unknown'));}finally{setLoading(false);setLoadMsg('');}
  },[saveImportHistory]);

  const handleFile=useCallback(async(file)=>{setError('');if(!file)return;const ext=file.name.split('.').pop().toLowerCase();if(IMAGE_EXTS.has(ext)||ext==='zip'){setModality('images');window.dispatchEvent(new CustomEvent('datasmithy:imagefiles',{detail:[file]}));return;}if(TEXT_EXTS.has(ext)){setModality('text');window.dispatchEvent(new CustomEvent('datasmithy:textfile',{detail:file}));return;}setLoading(true);setLoadMsg('Parsing '+file.name+'...');
    try{let rows,csv;if(['xlsx','xls'].includes(ext)){const buf=await file.arrayBuffer(),wb=XLSX.read(buf),ws=wb.Sheets[wb.SheetNames[0]];rows=XLSX.utils.sheet_to_json(ws,{defval:''});csv=Papa.unparse(rows);}else if(ext==='json'){const text=await file.text(),parsed=JSON.parse(text);rows=Array.isArray(parsed)?parsed:[parsed];csv=Papa.unparse(rows);}else if(ext==='parquet'){setLoadMsg('Reading Parquet...');const{parquetRead}=await import('hyparquet'),buf=await file.arrayBuffer(),result=[];await parquetRead({file:buf,onComplete:(d)=>result.push(...d)});rows=result;csv=Papa.unparse(rows);}else{const text=await file.text(),result=Papa.parse(text,{header:true,skipEmptyLines:true,dynamicTyping:false});rows=result.data||[];csv=text;}if(!rows?.length){setError('File appears empty.');setLoading(false);return;}await processData(rows,csv,file.name);}
    catch(e){setError('File error: '+(e.message||'Could not read'));setLoading(false);}
  },[processData]);

  const handleCsvReady=useCallback(async(csv,name)=>{setError('');if(!csv)return;try{const r=Papa.parse(csv,{header:true,skipEmptyLines:true,dynamicTyping:false});if(!r.data?.length){setError('No data.');return;}await processData(r.data,csv,name||'imported.csv');}catch(e){setError('Parse error: '+e.message);};},[processData]);

  const handleApplyColumnChanges=useCallback(async()=>{if(!rawData.length)return;setLoading(true);setLoadMsg('Applying...');
    try{await new Promise(r=>setTimeout(r,50));const dropSet=new Set(Object.entries(columnOverrides).filter(([,o])=>o.drop).map(([k])=>k));const renameMap={};Object.entries(columnOverrides).forEach(([k,o])=>{if(!o.drop&&o.rename?.trim())renameMap[k]=o.rename.trim();});const newRows=rawData.map(row=>{const nr={};Object.entries(row).forEach(([k,v])=>{if(!dropSet.has(k))nr[renameMap[k]||k]=v;});return nr;});const result=runEDA(newRows);setAnalysis(result);autoConfig(result);setRawData(newRows);setCsvString(Papa.unparse(newRows));setColumnOverrides({});setPipelineResult(null);setPipelineLog([]);setProcessedCsv('');setPythonCode('');setActiveTab('universal');}
    catch(e){setError('Could not apply: '+e.message);}finally{setLoading(false);setLoadMsg('');}
  },[rawData,columnOverrides]);

  const handleRunPipeline=useCallback(async()=>{if(!rawData?.length||!analysis){setPipelineError('No dataset loaded.');return;}setProcessing(true);setPipelineLog([]);setPipelineResult(null);setPipelineError('');
    try{await new Promise(r=>setTimeout(r,50));const config={clean:{...cleanCfg},encode:{...encodeCfg},scale:{...scaleCfg},outliers:{...outlierCfg},features:{...featCfg},selection:{...selectCfg},target_col:targetCol||''};const result=runPipeline(rawData,config,analysis);if(!result)throw new Error('Pipeline returned no result');setPipelineResult(result);setPipelineLog(result.log||[]);setProcessedCsv(result.csv_out||'');try{setPythonCode(generatePythonCode(fileName,config,analysis)||'');}catch{setPythonCode('# Code gen failed');}if(user)saveSession(user.uid,{type:'pipeline',fileName,originalRows:result.original_rows||rawData.length,originalCols:result.original_cols||columns.length,processedRows:result.processed_rows||0,processedCols:result.processed_cols||0,healthScore:analysis.health||0,rowsProcessed:result.processed_rows||0,featuresEngineered:result.processed_cols||0,steps:result.log?.length||0}).catch(e=>console.warn(e));setActiveTab('export');}
    catch(e){setPipelineError('Pipeline error: '+(e.message||'Unknown'));setPipelineLog(prev=>[...prev,{msg:'❌ '+e.message,type:'error',time:new Date().toLocaleTimeString()}]);}finally{setProcessing(false);}
  },[rawData,analysis,cleanCfg,encodeCfg,scaleCfg,outlierCfg,featCfg,selectCfg,targetCol,fileName,user,columns]);

  const applyPreset=(cfg)=>{try{setUndoSnapshot({cleanCfg,encodeCfg,scaleCfg,outlierCfg,featCfg,selectCfg});if(cfg.clean)setCleanCfg(c=>({...c,...cfg.clean}));if(cfg.encode)setEncodeCfg(c=>({...c,...cfg.encode}));if(cfg.scale)setScaleCfg(c=>({...c,...cfg.scale}));if(cfg.outliers)setOutlierCfg(c=>({...c,...cfg.outliers}));if(cfg.features)setFeatCfg(cfg.features);if(cfg.selection)setSelectCfg(cfg.selection);}catch(e){console.error(e);}};
  const handleUndo=()=>{if(!undoSnapshot)return;setCleanCfg(undoSnapshot.cleanCfg);setEncodeCfg(undoSnapshot.encodeCfg);setScaleCfg(undoSnapshot.scaleCfg);setOutlierCfg(undoSnapshot.outlierCfg);setFeatCfg(undoSnapshot.featCfg);setSelectCfg(undoSnapshot.selectCfg);setUndoSnapshot(null);};
  const clearData=()=>{setAnalysis(null);setRawData([]);setCsvString('');setFileName('');setPipelineResult(null);setPipelineLog([]);setPipelineError('');setError('');setActiveTab('import');setColumnOverrides({});setUndoSnapshot(null);};
  const currentConfig={clean:cleanCfg,encode:encodeCfg,scale:scaleCfg,outliers:outlierCfg,features:featCfg,selection:selectCfg};
  const visibleTabs = mode==='ml' ? ML_ALL_TABS : GENERAL_TABS;

  return (
    <div style={{ minHeight:'calc(100vh - 54px)', background:'var(--bg)' }}>
      <DragOverlay visible={dragOver} targetModality={dragTarget}/>
      <ModalityBar modality={modality} setModality={handleModalityChange}/>
      <div style={{position:'absolute',top:'8px',right:'12px',zIndex:100}}>
        <TourButton onClick={()=>setShowTour(true)}/>
      </div>

      {/* Sub-tab bar — shows for ALL modalities */}
      {modality==='tabular' && <SubTabBar tabs={visibleTabs}  activeTab={activeTab}  setActiveTab={setActiveTab}  mode={mode} setMode={setMode} showModeToggle={true}/>}
      {modality==='images'  && <SubTabBar tabs={IMAGE_TABS}   activeTab={imgTab}     setActiveTab={setImgTab}    showModeToggle={false}/>}
      {modality==='text'    && <SubTabBar tabs={TEXT_TABS}    activeTab={textTab}    setActiveTab={setTextTab}   showModeToggle={false}/>}

      {/* Tabular progress + status */}
      {modality==='tabular'&&(analysis||activeTab==='import')&&<div style={{background:'#fff',borderBottom:'1px solid var(--border)'}}><ProgressSteps hasData={!!analysis} hasResult={!!pipelineResult} activeTab={activeTab}/></div>}
      {modality==='tabular'&&analysis&&(
        <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 12px',background:'#fff',borderBottom:'1px solid #E2E8F0',flexWrap:'wrap'}}>
          <span style={{fontSize:'11px',color:'#64748B',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={fileName}>📄 {fileName}</span>
          <span className="tag tag-teal" style={{fontSize:'10px'}}>{analysis.rows?.toLocaleString()} × {analysis.cols}</span>
          <span className={`tag ${analysis.health>=80?'tag-teal':analysis.health>=60?'tag-amber':'tag-red'}`} style={{fontSize:'10px'}}>♥ {analysis.health}/100</span>
          {pipelineResult&&<span className="tag tag-teal" style={{fontSize:'10px'}}>✅ Processed</span>}
          <div style={{marginLeft:'auto',display:'flex',gap:'6px',flexShrink:0}}>
            {undoSnapshot&&<button onClick={handleUndo} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'6px',padding:'6px 12px',fontSize:'11px',color:'var(--muted)',cursor:'pointer'}}>↩ Undo</button>}
            <button data-tour="run-pipeline" onClick={handleRunPipeline} disabled={processing} style={{background:processing?'#CBD5E1':'#00CBA8',color:'#fff',border:'none',borderRadius:'6px',padding:'6px 16px',fontSize:'12px',fontWeight:700,cursor:processing?'not-allowed':'pointer',whiteSpace:'nowrap',boxShadow:processing?'none':'0 2px 8px rgba(0,203,168,.3)'}}>
              {processing?'⏳ Running...':'⚡ Run Pipeline'}
            </button>
            <button onClick={clearData} style={{background:'transparent',border:'1px solid #E2E8F0',borderRadius:'6px',padding:'6px 10px',fontSize:'11px',color:'#64748B',cursor:'pointer'}}>✕</button>
          </div>
        </div>
      )}

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div style={{padding:modality==='tabular'?'16px':'0',maxWidth:modality==='tabular'?'1200px':'100%',margin:'0 auto'}}>

        {/* ── TABULAR ── */}
        {modality==='tabular'&&(
          <>
            {redoBanner&&!analysis&&<div style={{padding:'12px 16px',background:'rgba(59,130,246,.08)',border:'1px solid rgba(59,130,246,.25)',borderRadius:'8px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'20px'}}>🔁</span><div style={{flex:1}}><div style={{fontWeight:600,color:'#0F172A',fontSize:'13px'}}>Re-run previous session</div><div style={{color:'#64748B',fontSize:'11px'}}>Upload <strong>{redoBanner.fileName}</strong> again.</div></div><button onClick={()=>{localStorage.removeItem(REDO_KEY);setRedoBanner(null);}} style={{background:'transparent',border:'1px solid #E2E8F0',borderRadius:'5px',padding:'5px 12px',fontSize:'11px',color:'#64748B',cursor:'pointer'}}>Dismiss</button></div>}
            {pipelineError&&<div style={{padding:'12px 16px',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:'8px',color:'#DC2626',fontSize:'12px',marginBottom:'14px',display:'flex',justifyContent:'space-between'}}><span>❌ {pipelineError}</span><button onClick={()=>setPipelineError('')} style={{background:'none',border:'none',color:'#DC2626',cursor:'pointer'}}>×</button></div>}
            {loading&&<div className="card fade-in" style={{padding:'40px',textAlign:'center',marginBottom:'16px'}}><div style={{width:'40px',height:'40px',border:'3px solid #E2E8F0',borderTopColor:'#00CBA8',borderRadius:'50%',margin:'0 auto 16px'}} className="spin"/><div style={{color:'#0F172A',fontSize:'14px',fontWeight:600,marginBottom:'6px'}}>{loadMsg||'Processing...'}</div><div style={{color:'#64748B',fontSize:'12px'}}>Running in your browser</div></div>}
            {error&&!loading&&<div style={{padding:'10px 16px',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:'8px',color:'#DC2626',fontSize:'12px',marginBottom:'14px',display:'flex',justifyContent:'space-between'}}><span>❌ {error}</span><button onClick={()=>setError('')} style={{background:'none',border:'none',color:'#DC2626',cursor:'pointer'}}>×</button></div>}
            {!loading&&analysis&&activeTab==='overview'&&<DataPreview rawData={rawData} fileName={fileName} analysis={analysis}/>}
            {!loading&&<>
              {activeTab==='import'    &&<ImportTab onFileReady={handleFile} onCsvReady={handleCsvReady}/>}
              {activeTab==='overview'  &&(analysis?<OverviewTab analysis={analysis}/>:<Empty onGo={()=>setActiveTab('import')}/>)}
              {activeTab==='grid'      &&<DataGridTab rows={rawData} columns={columns} fileName={fileName} onApply={handleNewTabApply}/>}
              {activeTab==='columns'   &&(analysis?<ColumnsTab analysis={analysis} columnOverrides={columnOverrides} setColumnOverrides={setColumnOverrides} onApplyChanges={handleApplyColumnChanges}/>:<Empty onGo={()=>setActiveTab('import')}/>)}
              {activeTab==='universal' &&<UniversalCleanTab rows={rawData} columns={columns} onApply={handleNewTabApply}/>}
              {activeTab==='clean'     &&(analysis?<CleanTab analysis={analysis} config={cleanCfg} setConfig={setCleanCfg} outlierConfig={outlierCfg} setOutlierConfig={setOutlierCfg}/>:<Empty onGo={()=>setActiveTab('import')}/>)}
              {activeTab==='encode'    &&(analysis?<EncodeTab analysis={analysis} config={encodeCfg} setConfig={setEncodeCfg}/>:<Empty onGo={()=>setActiveTab('import')}/>)}
              {activeTab==='scale'     &&(analysis?<ScaleTab analysis={analysis} config={scaleCfg} setConfig={setScaleCfg}/>:<Empty onGo={()=>setActiveTab('import')}/>)}
              {activeTab==='features'  &&(analysis?<FeatureEngTab analysis={analysis} config={featCfg} setConfig={setFeatCfg} selectConfig={selectCfg} setSelectConfig={setSelectCfg} targetCol={targetCol} setTargetCol={setTargetCol}/>:<Empty onGo={()=>setActiveTab('import')}/>)}
              {activeTab==='ml_ready'  &&(analysis?<MLReadyTab analysis={analysis} pipelineResult={pipelineResult} targetCol={targetCol} setTargetCol={setTargetCol}/>:<Empty onGo={()=>setActiveTab('import')}/>)}
              {activeTab==='presets'   &&<PresetsTab currentConfig={currentConfig} onApplyPreset={applyPreset} analysisColumns={analysis?.columns}/>}
              {activeTab==='visualize' &&(analysis?<VisualizeTab analysis={analysis} pipelineResult={pipelineResult} rawData={rawData}/>:<Empty onGo={()=>setActiveTab('import')}/>)}
              {activeTab==='connectors'&&<ConnectorsTab rows={rawData} columns={columns} onLoad={(r)=>{handleNewTabApply(r);setActiveTab('overview');}}/>}
              {activeTab==='templates' &&<PipelineTemplates rows={rawData} columns={columns} onApply={handleNewTabApply}/>}
              {activeTab==='export'    &&(
              <>
                <ExportTab analysis={analysis} fileName={fileName} pipelineResult={pipelineResult} pipelineLog={pipelineLog} processedCsv={processedCsv} pythonCode={pythonCode} onRunPipeline={handleRunPipeline} processing={processing}/>
                <div style={{padding:'0 4px',marginTop:'16px'}}>
                  <ShareButton
                    modality="tabular"
                    fileName={fileName}
                    rows={pipelineResult?.processed_rows||analysis?.rows||0}
                    cols={pipelineResult?.processed_cols||analysis?.cols||0}
                    health={analysis?.health||0}
                    extra={pipelineResult?`${pipelineResult.log?.length||0} pipeline steps applied`:''}
                  />
                </div>
              </>
            )}
            </>}
          </>
        )}

        {/* ── IMAGES — guided flow with sub-tabs at top ── */}
        {modality==='images'&&(
          <div>
            {/* ImageTab renders its own content based on imgTab */}
            <ImageTab activeView={imgTab} setActiveView={setImgTab} onProcessed={recordDatasetProcessed}/>
            {/* Connect tab — HuggingFace datasets for images */}
            {imgTab==='connect'&&(
              <div style={{padding:'16px',maxWidth:'900px',margin:'0 auto'}}>
                <ConnectorsTab
                  modality="images"
                  rows={[]}
                  columns={[]}
                  onLoad={(rows,cols)=>{
                    if(rows?.length){
                      window.dispatchEvent(new CustomEvent('datasmithy:hfimagedata',{detail:{rows,cols}}));
                      setImgTab('overview');
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── TEXT/NLP — guided flow with sub-tabs at top ── */}
        {modality==='text'&&(
          <div>
            <TextNLPTab activeSubTab={textTab} setActiveSubTab={setTextTab}/>
            {/* Connect tab — HuggingFace + GitHub for text datasets */}
            {textTab==='connect'&&(
              <div style={{padding:'16px',maxWidth:'900px',margin:'0 auto'}}>
                <ConnectorsTab
                  modality="text"
                  rows={[]}
                  columns={[]}
                  onLoad={(rows,cols)=>{
                    if(rows?.length){
                      window.dispatchEvent(new CustomEvent('datasmithy:hftextdata',{detail:{rows,cols}}));
                      setTextTab('overview');
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
      {showTour && (
        <TourGuide
          onClose={()=>setShowTour(false)}
          setModality={handleModalityChange}
          setActiveTab={setActiveTab}
          setImgTab={setImgTab}
          setTextTab={setTextTab}
        />
      )}
      <AILayer
        modality={modality}
        activeTab={modality==='images' ? imgTab : modality==='text' ? textTab : activeTab}
        stats={null}
        analysis={analysis}
        docs={[]}
      />
      {showFeedback && (
        <FeedbackModal onClose={markFeedbackDone} onSubmit={handleSubmit} />
      )}
    </div>
  );
}

function Empty({ onGo }) {
  return (
    <div className="card fade-in" style={{padding:'48px',textAlign:'center'}}>
      <div style={{fontSize:'40px',marginBottom:'14px'}}>📂</div>
      <div style={{fontWeight:600,color:'#0F172A',fontSize:'15px',marginBottom:'6px'}}>No dataset loaded</div>
      <div style={{color:'#64748B',fontSize:'12px',marginBottom:'20px'}}>Upload a file to use this feature.</div>
      <button className="btn-primary" onClick={onGo} style={{fontSize:'12px'}}>📥 Go to Import →</button>
    </div>
  );
}