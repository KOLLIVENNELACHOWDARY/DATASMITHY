// src/components/tabs/TextNLPTab.jsx
import React, { useState, useCallback } from 'react';
import ShareButton from '../ShareButton.jsx';

/* ── NLP utilities (browser-only) ────────────────────────────── */
const STOPWORDS = new Set(['i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those','am','is','are','was','were','be','been','being','have','has','had','having','do','does','did','doing','a','an','the','and','but','if','or','because','as','until','while','of','at','by','for','with','about','against','between','into','through','during','before','after','above','below','to','from','up','down','in','out','on','off','over','under','again','further','then','once','here','there','when','where','why','how','all','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now','d','ll','m','o','re','ve','y','ain','aren','couldn','didn','doesn','hadn','hasn','haven','isn','ma','mightn','mustn','needn','shan','shouldn','wasn','weren','won','wouldn']);
const tokenize = t => (t||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>1);
const wordFreq  = docs => { const m={}; docs.forEach(d=>tokenize(d.text).forEach(w=>{m[w]=(m[w]||0)+1;})); return Object.entries(m).sort((a,b)=>b[1]-a[1]); };
const bigramFreq= docs => { const m={}; docs.forEach(d=>{const t=tokenize(d.text);for(let i=0;i<t.length-1;i++){const k=t[i]+' '+t[i+1];m[k]=(m[k]||0)+1;}}); return Object.entries(m).sort((a,b)=>b[1]-a[1]); };
const readability=text=>{const sents=(text.match(/[.!?]+/g)||[]).length||1;const words=tokenize(text);const sylls=words.reduce((s,w)=>s+Math.max(1,(w.match(/[aeiou]/gi)||[]).length),0);const score=206.835-1.015*(words.length/sents)-84.6*(sylls/Math.max(words.length,1));return Math.max(0,Math.min(100,Math.round(score)));};
const detectLang=text=>{const t=(text||'').toLowerCase();const m={'en':['the','and','is','in','it','of'],'es':['el','la','de','que','en','un'],'fr':['le','la','de','et','en','un'],'de':['der','die','das','und','in','von'],'pt':['de','que','do','da','em','um'],'it':['il','la','di','e','in','un'],'nl':['de','en','van','het','in','een'],'pl':['w','z','do','na','nie','się'],'ru':['в','и','на','с','по','для']};let best='unknown',bestS=0;Object.entries(m).forEach(([lang,ws])=>{const s=ws.filter(w=>t.includes(' '+w+' ')||t.startsWith(w+' ')).length;if(s>bestS){bestS=s;best=lang;}});return best;};
const simpleSentiment=text=>{const pos=['great','good','excellent','amazing','wonderful','love','best','happy','perfect','fantastic','awesome','brilliant','outstanding','beautiful','nice','positive','enjoy','recommend','impressed','superb'];const neg=['bad','terrible','awful','horrible','poor','hate','worst','ugly','disappointing','broken','useless','annoying','painful','frustrated','waste','slow','boring','difficult','confusing','fail'];const words=tokenize(text||'');let s=0;words.forEach(w=>{if(pos.includes(w))s++;if(neg.includes(w))s--;});return s>0?'Positive':s<0?'Negative':'Neutral';};
const extractEntities=text=>{const ents=[];const t=text||'';[...t.matchAll(/\b([A-Z][a-z]+ (?:[A-Z][a-z]+ )?[A-Z][a-z]+)\b/g)].forEach(m=>ents.push({text:m[1],type:'PERSON'}));[...t.matchAll(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g)].forEach(m=>ents.push({text:m[0],type:'DATE'}));[...t.matchAll(/\$[\d,]+|\b\d+(?:\.\d+)?\s*(?:million|billion|thousand|percent|%)/gi)].forEach(m=>ents.push({text:m[0],type:'NUM'}));[...t.matchAll(/\bhttps?:\/\/[^\s]+/g)].forEach(m=>ents.push({text:m[0],type:'URL'}));return ents.slice(0,20);};

/* ── Stats ──────────────────────────────────────────────────── */
function computeTextStats(docs) {
  if (!docs.length) return null;
  const clsMap={};let totalW=0,totalC=0,vocab=new Set();
  const wordLens=[];const seen=new Set(),dupIds=new Set();
  docs.forEach((d,i)=>{
    const cls=d.label||d.cls||'unknown';clsMap[cls]=(clsMap[cls]||0)+1;
    const words=tokenize(d.text||'');totalW+=words.length;totalC+=(d.text||'').length;
    words.forEach(w=>vocab.add(w));wordLens.push(words.length);
    const key=(d.text||'').trim().toLowerCase();
    if(seen.has(key))dupIds.add(i);else seen.add(key);
  });
  const n=Math.max(docs.length,1);
  const classes=Object.entries(clsMap).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);
  const mx=Math.max(...classes.map(c=>c.count),1),mn=Math.min(...classes.map(c=>c.count),1);
  const imbalance=classes.length>1?Math.round((1-mn/mx)*100):0;
  const emptyIds=docs.map((d,i)=>!(d.text||'').trim()?i:-1).filter(i=>i>=0);
  const shortIds=docs.map((d,i)=>tokenize(d.text||'').length<5&&(d.text||'').trim()?i:-1).filter(i=>i>=0);
  const longIds =docs.map((d,i)=>tokenize(d.text||'').length>500?i:-1).filter(i=>i>=0);
  let health=100;
  health-=Math.min(20,dupIds.size*5);health-=imbalance>40?15:0;
  health-=Math.min(15,emptyIds.length*10);health-=Math.min(10,shortIds.length*2);
  return {total:docs.length,classes,imbalance,avgWords:Math.round(totalW/n),
    avgChars:Math.round(totalC/n),vocabSize:vocab.size,dupIds,emptyIds,shortIds,longIds,
    wordLens,health:Math.max(0,Math.min(100,Math.round(health)))};
}

/* ── UI atoms ─────────────────────────────────────────────────── */
const C={teal:'#00CBA8',tealDim:'rgba(0,203,168,.09)',tealBorder:'rgba(0,203,168,.35)',
         blue:'#3B82F6',amber:'#F59E0B',red:'#EF4444',purple:'#8B5CF6',
         text:'var(--text,#0F172A)',muted:'var(--muted,#64748B)',border:'var(--border,#E2E8F0)',
         bg:'var(--bg,#fff)',surface:'#F8FAFC'};
const COLORS=['#00CBA8','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#EC4899','#14B8A6','#F97316'];

const Card=({children,style={}})=><div className="card" style={{padding:'18px 20px',...style}}>{children}</div>;
const ST=({children})=><div style={{color:C.teal,fontSize:'10px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:'12px',paddingBottom:'6px',borderBottom:`1px solid ${C.border}`}}>{children}</div>;
const PBtn=({onClick,children,disabled,color=C.teal,style={}})=><button onClick={onClick} disabled={disabled} style={{padding:'8px 18px',borderRadius:'8px',border:'none',cursor:disabled?'not-allowed':'pointer',background:color,color:'#fff',fontWeight:700,fontSize:'12px',opacity:disabled?.55:1,transition:'all .15s',...style}}>{children}</button>;
const GBtn=({onClick,children,color=C.muted})=><button onClick={onClick} style={{padding:'6px 12px',borderRadius:'7px',border:`1px solid ${C.border}`,background:C.surface,cursor:'pointer',fontSize:'11px',color,fontWeight:600}}>{children}</button>;
const Btn=PBtn;

/* Step progress */
function StepBar({steps,current}) {
  return(
    <div style={{display:'flex',alignItems:'center',padding:'10px 16px',background:C.surface,borderBottom:`1px solid ${C.border}`,overflowX:'auto',flexShrink:0}}>
      {steps.map((s,i)=>{const done=i<current,active=i===current;return(
        <React.Fragment key={s.id}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',flexShrink:0,minWidth:'58px'}}>
            <div style={{fontSize:'15px'}}>{done?'✅':s.icon}</div>
            <span style={{fontSize:'9px',fontWeight:active?700:500,color:done?C.teal:active?C.text:C.muted,textAlign:'center',lineHeight:1.2}}>{s.label}</span>
          </div>
          {i<steps.length-1&&<div style={{flex:1,height:'2px',background:done?C.teal:C.border,minWidth:'12px',margin:'0 2px',marginBottom:'12px'}}/>}
        </React.Fragment>
      );})}
    </div>
  );
}

/* Mini bar chart */
function MiniBar({value,max,color='#00CBA8',height=14}){
  return(
    <div style={{height,background:'#F1F5F9',borderRadius:'3px',overflow:'hidden',flex:1}}>
      <div style={{width:`${Math.max(Math.round(value/Math.max(max,1)*100),value>0?2:0)}%`,height:'100%',background:color,borderRadius:'3px',transition:'width .3s'}}/>
    </div>
  );
}

/* Text length histogram */
function TextLenHist({wordLens}){
  if(!wordLens?.length)return null;
  const buckets=10,maxLen=Math.max(...wordLens,1);
  const bSz=Math.ceil(maxLen/buckets);
  const counts=Array(buckets).fill(0);
  wordLens.forEach(w=>{counts[Math.min(Math.floor(w/bSz),buckets-1)]++;});
  const mx=Math.max(...counts,1);
  return(
    <div>
      <div style={{display:'flex',gap:'2px',alignItems:'flex-end',height:'60px',marginBottom:'4px'}}>
        {counts.map((c,i)=><div key={i} style={{flex:1,background:C.teal,borderRadius:'2px 2px 0 0',height:`${Math.round(c/mx*56)}px`,minHeight:c>0?'3px':'0',transition:'height .3s'}}/>)}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:'9px',color:C.muted}}>
        <span>0</span><span>{Math.round(maxLen/2)}w</span><span>{maxLen}w</span>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */
export default function TextNLPTab({activeSubTab:propView,setActiveSubTab:setPropView,activeView:_av,setActiveView:_sav,onProcessed}){
  const [_v,_sv]=useState('import');
  const view    = propView??_v;
  const setView = setPropView??_sv;

  const [docs,    setDocs]    = useState([]);
  const [stats,   setStats]   = useState(null);
  const [busy,    setBusy]    = useState('');
  const [error,   setError]   = useState('');

  // Import
  const [importMode,setImportMode]=useState('paste');
  const [pasteText, setPasteText] =useState('');
  const [pasteLabel,setPasteLabel]=useState('');
  const [hfId,     setHfId]   =useState('');
  const [hfBusy,   setHfBusy] =useState(false);
  const [hfMsg,    setHfMsg]  =useState('');
  const [urlInput, setUrlInput]=useState('');
  const [urlBusy,  setUrlBusy]=useState(false);
  const [urlMsg,   setUrlMsg] =useState('');
  const [textKey,  setTextKey] =useState('');
  const [labelKey, setLabelKey]=useState('');
  const [availKeys,setAvailKeys]=useState([]);

  // Documents
  const [search,   setSearch]  =useState('');
  const [filterCls,setFilterCls]=useState('all');
  const [filterIss,setFilterIss]=useState('all');
  const [selected, setSelected]=useState(new Set());
  const [editingDoc,setEditingDoc]=useState(null);
  const [editText, setEditText] =useState('');
  const [editLabel,setEditLabel]=useState('');

  // Analysis tabs
  const [analysisTab,setAnalysisTab]=useState('sentiment');
  const [sentResults,setSentResults]=useState(null);
  const [nerResults, setNerResults] =useState(null);
  const [readResults,setReadResults]=useState(null);
  const [langResults,setLangResults]=useState(null);
  const [autoLabelRules,setAutoLabelRules]=useState([{kw:'',label:''}]);
  const [autoApplied,setAutoApplied]=useState(0);

  // Tools
  const [toolsTab, setToolsTab]=useState('tools');
  const [regexPat, setRegexPat]=useState('');
  const [regexRep, setRegexRep]=useState('');
  const [toolResults,setToolResults]=useState(null);
  const [commitMsg,  setCommitMsg] =useState('');

  // Split
  const [splitRatio,setSplitRatio]=useState([70,15,15]);

  // ML Code
  const [codeTab,  setCodeTab] =useState('bert');

  // Pipeline
  const [nlpPreset,  setNlpPreset]  =useState(null);
  const [nlpPipeline,setNlpPipeline]=useState([]);
  const [nlpPipRunning,setNlpPipRunning]=useState(false);
  const [nlpPipLog,  setNlpPipLog]  =useState([]);

  // Step progress
  const stepIdx = !stats?0:view==='overview'||view==='words'||view==='clean'?1:view==='universal'||view==='export'||view==='visualize'?2:view==='pipeline'?3:view==='download'?4:1;
  const STEPS=[{id:'import',icon:'📥',label:'Import'},{id:'analyze',icon:'🔍',label:'Analyse'},{id:'configure',icon:'⚙',label:'Configure'},{id:'pipeline',icon:'⚡',label:'Pipeline'},{id:'export',icon:'📦',label:'Export'}];

  /* ── Load docs ──────────────────────────────────────────────── */
  const loadDocs = useCallback((newDocs) => {
    const tagged = newDocs.map((d,i) => ({
      id: d.id??i,
      text: (d.text||d.content||d.sentence||d.review||d.comment||d.body||Object.values(d).find(v=>typeof v==='string'&&v.length>10)||'').trim(),
      label: String(d.label??d.class??d.category??d.cls??d.tag??d.sentiment??'unknown'),
      cls: String(d.label??d.class??d.category??d.cls??d.tag??d.sentiment??'unknown'),
    })).filter(d=>d.text);
    setDocs(tagged); setStats(computeTextStats(tagged));
    setView('overview'); if(onProcessed) onProcessed();
  }, [onProcessed]);

  const parsePaste = () => {
    if (!pasteText.trim()) { setError('Paste some text first'); return; }
    const lines = pasteText.trim().split('\n').filter(Boolean);
    // Try CSV first
    if (lines[0].includes(',')) {
      const headers = lines[0].split(',').map(h=>h.trim().replace(/"/g,''));
      const tKey = headers.find(h=>['text','content','sentence','review','comment'].includes(h.toLowerCase()))||headers[0];
      const lKey = headers.find(h=>['label','class','category','sentiment'].includes(h.toLowerCase()))||headers[1];
      const rows = lines.slice(1).map(line=>{
        const vals = line.match(/(".*?"|[^,]+)/g)||[];
        const obj={};headers.forEach((h,i)=>obj[h]=(vals[i]||'').trim().replace(/^"|"$/g,''));
        return {text:obj[tKey]||'',label:obj[lKey]||pasteLabel||'unknown'};
      }).filter(r=>r.text);
      if (rows.length>0){loadDocs(rows);return;}
    }
    // Plain text — each line is a doc
    const rows = lines.map(l=>({text:l,label:pasteLabel||'text'}));
    loadDocs(rows);
  };

  const parseFile = async (file) => {
    setBusy('Reading file…');
    const text = await file.text();
    try {
      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        loadDocs(Array.isArray(data)?data:[data]);
      } else if (file.name.endsWith('.jsonl')) {
        loadDocs(text.trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)));
      } else {
        const lines = text.trim().split('\n').filter(Boolean);
        if (lines[0].includes(',')) {
          const headers = lines[0].split(',').map(h=>h.trim().replace(/"/g,''));
          const ks = Object.fromEntries(headers.map((h,i)=>[h,i]));
          const tKey=headers.find(h=>['text','content','sentence','review','comment'].includes(h.toLowerCase()))||headers[0];
          const lKey=headers.find(h=>['label','class','category','sentiment'].includes(h.toLowerCase()));
          setAvailKeys(headers);setTextKey(tKey);setLabelKey(lKey||'');
          const rows=lines.slice(1).map(l=>{const v=l.match(/(".*?"|[^,]+)/g)||[];const o={};headers.forEach((h,i)=>o[h]=(v[i]||'').trim().replace(/^"|"$/g,''));return{text:o[tKey]||'',label:o[lKey]||'unknown'};}).filter(r=>r.text);
          loadDocs(rows);
        } else {
          loadDocs(lines.map(l=>({text:l,label:'text'})));
        }
      }
    } catch(e) { setError('Parse error: '+e.message); }
    setBusy('');
  };

  const loadHF = async () => {
    if (!hfId.trim()){setHfMsg('Enter dataset ID');return;}
    setHfBusy(true);setHfMsg('⏳ Loading…');
    try {
      const r=await fetch(`https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(hfId.trim())}&config=default&split=train&offset=0&limit=500`);
      if(!r.ok)throw new Error('Dataset not found');
      const data=await r.json();
      const rows=(data.rows||[]).map(r=>r.row||r);
      if(!rows.length)throw new Error('No rows');
      loadDocs(rows);setHfMsg(`✅ Loaded ${rows.length} rows`);
    }catch(e){setHfMsg('❌ '+e.message);}
    setHfBusy(false);
  };

  const loadURL = async () => {
    if(!urlInput.trim()){setUrlMsg('Enter URL');return;}
    setUrlBusy(true);setUrlMsg('⏳ Fetching…');
    try {
      let res;
      try{res=await fetch(urlInput.trim(),{signal:AbortSignal.timeout(8000)});}
      catch{res=await fetch(`https://corsproxy.io/?${encodeURIComponent(urlInput.trim())}`,{signal:AbortSignal.timeout(10000)});}
      if(!res?.ok)throw new Error('Cannot fetch URL');
      const text=await res.text();
      const isJSON=text.trim().startsWith('[');
      let rows;
      if(isJSON){rows=JSON.parse(text);}
      else{const lines=text.trim().split('\n').filter(Boolean);const headers=lines[0].split(',').map(h=>h.trim().replace(/"/g,''));rows=lines.slice(1).map(l=>{const v=l.split(',');return Object.fromEntries(headers.map((h,i)=>[h,(v[i]||'').trim().replace(/"/g,'')]));});}
      loadDocs(rows);setUrlMsg(`✅ Loaded ${rows.length} rows`);
    }catch(e){setUrlMsg('❌ '+e.message);}
    setUrlBusy(false);
  };

  /* ── Doc operations ────────────────────────────────────────── */
  const updateDoc=(id,changes)=>{const u=docs.map(d=>d.id===id?{...d,...changes}:d);setDocs(u);setStats(computeTextStats(u));};
  const deleteDoc=id=>{const u=docs.filter(d=>d.id!==id);setDocs(u);setStats(computeTextStats(u));};
  const deleteSelected=()=>{const u=docs.filter((_,i)=>!selected.has(i));setDocs(u);setStats(computeTextStats(u));setSelected(new Set());};
  const bulkRelabel=(label)=>{const u=docs.map((d,i)=>selected.has(i)?{...d,label,cls:label}:d);setDocs(u);setStats(computeTextStats(u));setSelected(new Set());};
  const removeDuplicates=()=>{const seen=new Set();const u=docs.filter(d=>{const k=(d.text||'').trim().toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});setDocs(u);setStats(computeTextStats(u));};
  const removeIssue=(type)=>{
    const u=docs.filter((_,i)=>type==='empty'?!stats?.emptyIds.includes(i):type==='short'?!stats?.shortIds.includes(i):type==='long'?!stats?.longIds.includes(i):true);
    setDocs(u);setStats(computeTextStats(u));
  };

  /* ── Cleaning tools ────────────────────────────────────────── */
  const CLEAN_TOOLS = [
    {id:'lower',   label:'🔡 Lowercase',          fn:t=>t.toLowerCase()},
    {id:'html',    label:'🏷 Remove HTML tags',    fn:t=>t.replace(/<[^>]+>/g,' ').trim()},
    {id:'urls',    label:'🔗 Remove URLs',         fn:t=>t.replace(/https?:\/\/\S+/gi,'').trim()},
    {id:'mentions',label:'@ Remove @mentions',     fn:t=>t.replace(/@\w+/g,'').trim()},
    {id:'hashtags',label:'# Remove hashtags',      fn:t=>t.replace(/#\w+/g,'').trim()},
    {id:'numbers', label:'🔢 Remove numbers',      fn:t=>t.replace(/\b\d+\b/g,'').trim()},
    {id:'punct',   label:'! Remove punctuation',   fn:t=>t.replace(/[^\w\s]/g,' ').trim()},
    {id:'special', label:'✱ Remove special chars', fn:t=>t.replace(/[^\w\s.,!?'-]/g,' ').replace(/\s+/g,' ').trim()},
    {id:'stopwords',label:'🛑 Remove stopwords',   fn:t=>t.split(/\s+/).filter(w=>!STOPWORDS.has(w.toLowerCase())).join(' ')},
    {id:'trim',    label:'⬜ Normalise whitespace', fn:t=>t.trim().replace(/\s+/g,' ')},
    {id:'accents', label:'á Remove accents',       fn:t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'')},
    {id:'emoji',   label:'😀 Remove emoji',        fn:t=>t.replace(/[\u{1F300}-\u{1FFFF}]/gu,'').replace(/[\u2600-\u27BF]/g,'').trim()},
    {id:'contracts',label:"' Expand contractions", fn:t=>t.replace(/won't/gi,"will not").replace(/can't/gi,"cannot").replace(/n't/gi," not").replace(/'re/gi," are").replace(/'ve/gi," have").replace(/'ll/gi," will")},
    {id:'linebreaks',label:'↵ Remove line breaks', fn:t=>t.replace(/[\r\n]+/g,' ').trim()},
  ];

  const applyTool=(toolFn,label)=>{
    const sample=docs.slice(0,5).map(d=>({...d,text:toolFn(d.text||'')}));
    setToolResults({label,sample,fn:toolFn,applied:false});setCommitMsg('');
  };

  const commitTool=()=>{
    if(!toolResults?.fn)return;
    const u=docs.map(d=>({...d,text:toolResults.fn(d.text||'')}));
    setDocs(u);setStats(computeTextStats(u));
    setCommitMsg(`✅ "${toolResults.label}" applied to all ${u.length} docs`);
    setToolResults({...toolResults,applied:true});
  };

  const applyRegex=()=>{
    if(!regexPat){setError('Enter a regex pattern');return;}
    try{const rx=new RegExp(regexPat,'g');const sample=docs.slice(0,5).map(d=>({...d,text:(d.text||'').replace(rx,regexRep)}));setToolResults({label:`Regex /${regexPat}/→"${regexRep}"`,sample,fn:t=>t.replace(new RegExp(regexPat,'g'),regexRep),applied:false});}
    catch(e){setError('Invalid regex: '+e.message);}
  };

  /* ── Analysis ─────────────────────────────────────────────── */
  const runSentiment=()=>{const r=docs.map(d=>({...d,sentiment:simpleSentiment(d.text)}));setSentResults({docs:r,counts:{Positive:r.filter(x=>x.sentiment==='Positive').length,Negative:r.filter(x=>x.sentiment==='Negative').length,Neutral:r.filter(x=>x.sentiment==='Neutral').length}});};
  const runNER=()=>{const r=docs.map(d=>({...d,entities:extractEntities(d.text)}));setNerResults({docs:r});};
  const runReadability=()=>{const r=docs.map(d=>({...d,score:readability(d.text||''),words:tokenize(d.text||'').length}));setReadResults({docs:r,avg:Math.round(r.reduce((s,x)=>s+x.score,0)/Math.max(r.length,1))});};
  const runLang=()=>{const r=docs.map(d=>({...d,lang:detectLang(d.text||'')}));const lm={};r.forEach(d=>{lm[d.lang]=(lm[d.lang]||0)+1;});setLangResults({docs:r,langs:lm});};
  const applyAutoLabel=()=>{
    const rules=autoLabelRules.filter(r=>r.kw&&r.label);
    if(!rules.length){setError('Add at least one keyword rule');return;}
    let changed=0;
    const u=docs.map(d=>{const t=(d.text||'').toLowerCase();const match=rules.find(r=>t.includes(r.kw.toLowerCase()));if(match){changed++;return{...d,label:match.label,cls:match.label};}return d;});
    setDocs(u);setStats(computeTextStats(u));setAutoApplied(changed);
  };

  /* ── Export ───────────────────────────────────────────────── */
  const exportFmt=(fmt)=>{
    if(!docs.length){setError('No documents to export');return;}
    let content='',filename='dataset.csv',mime='text/csv';
    if(fmt==='csv'){content='text,label\n'+docs.map(d=>`"${(d.text||'').replace(/"/g,'""')}","${d.label||''}"`).join('\n');}
    else if(fmt==='hf'){content=docs.map(d=>JSON.stringify({text:d.text||'',label:d.label||''})).join('\n');filename='dataset.jsonl';mime='application/json';}
    else if(fmt==='json'){content=JSON.stringify(docs.map(d=>({text:d.text||'',label:d.label||''})),null,2);filename='dataset.json';mime='application/json';}
    else if(fmt==='txt'){content=docs.map(d=>`[${d.label||''}] ${d.text||''}`).join('\n');filename='dataset.txt';mime='text/plain';}
    else if(fmt==='split'){
      const rows=docs.map((d,i)=>{const sp=i<Math.round(stats.total*splitRatio[0]/100)?'train':i<Math.round(stats.total*(splitRatio[0]+splitRatio[1])/100)?'validation':'test';return `${sp},"${(d.text||'').replace(/"/g,'""')}","${d.label||''}"`;});
      content='split,text,label\n'+rows.join('\n');filename='dataset_split.csv';
    }
    else if(fmt==='report'){
      const hc=stats?.health>=80?'#00956B':stats?.health>=60?'#D97706':'#DC2626';
      content=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>NLP Report</title><style>body{font-family:system-ui;max-width:860px;margin:40px auto;padding:24px;color:#0F172A;}h1{color:#00CBA8;}table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #E2E8F0;padding:8px 12px;text-align:left;font-size:13px;}th{background:#F8FAFC;font-weight:700;}.h{font-size:52px;font-weight:900;color:${hc};}</style></head><body><h1>📝 NLP Dataset Health Report</h1><p>Generated by <strong>DataSmithy</strong> · ${new Date().toLocaleDateString()}</p><div class="h">${stats?.health||0}</div><p><em>Health Score / 100</em></p><h2>Summary</h2><table><tr><th>Metric</th><th>Value</th></tr><tr><td>Total Documents</td><td>${stats?.total||0}</td></tr><tr><td>Classes</td><td>${stats?.classes?.map(c=>c.name).join(', ')||'—'}</td></tr><tr><td>Avg Words</td><td>${stats?.avgWords||0}</td></tr><tr><td>Vocabulary Size</td><td>${stats?.vocabSize||0}</td></tr><tr><td>Duplicates</td><td>${stats?.dupIds?.size||0}</td></tr><tr><td>Imbalance</td><td>${stats?.imbalance||0}%</td></tr></table><h2>Class Distribution</h2><table><tr><th>Class</th><th>Count</th><th>%</th></tr>${stats?.classes?.map(c=>`<tr><td>${c.name}</td><td>${c.count}</td><td>${Math.round(c.count/(stats?.total||1)*100)}%</td></tr>`).join('')||''}</table><p style="font-size:11px;color:#94A3B8">DataSmithy · datasmithy.vercel.app</p></body></html>`;
      filename='health_report.html';mime='text/html';
    }
    if(content){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:mime}));a.download=filename;a.click();}
  };

  /* ── Pipeline step functions ─────────────────────────────── */
  const STEP_FNS = {
    lower:     ds=>ds.map(d=>({...d,text:(d.text||'').toLowerCase()})),
    html:      ds=>ds.map(d=>({...d,text:(d.text||'').replace(/<[^>]+>/g,' ').trim()})),
    urls:      ds=>ds.map(d=>({...d,text:(d.text||'').replace(/https?:\/\/\S+/gi,'').trim()})),
    mentions:  ds=>ds.map(d=>({...d,text:(d.text||'').replace(/@\w+/g,'').trim()})),
    hashtags:  ds=>ds.map(d=>({...d,text:(d.text||'').replace(/#\w+/g,'').trim()})),
    numbers:   ds=>ds.map(d=>({...d,text:(d.text||'').replace(/\b\d+\b/g,'').trim()})),
    punct:     ds=>ds.map(d=>({...d,text:(d.text||'').replace(/[^\w\s]/g,' ').trim()})),
    special:   ds=>ds.map(d=>({...d,text:(d.text||'').replace(/[^\w\s.,!?'-]/g,' ').replace(/\s+/g,' ').trim()})),
    stopwords: ds=>ds.map(d=>({...d,text:(d.text||'').split(/\s+/).filter(w=>!STOPWORDS.has(w.toLowerCase())).join(' ')})),
    trim:      ds=>ds.map(d=>({...d,text:(d.text||'').trim().replace(/\s+/g,' ')})),
    emoji:     ds=>ds.map(d=>({...d,text:(d.text||'').replace(/[\u{1F300}-\u{1FFFF}]/gu,'').trim()})),
    accents:   ds=>ds.map(d=>({...d,text:(d.text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')})),
    dedup:     ds=>{const seen=new Set();return ds.filter(d=>{const k=(d.text||'').trim().toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});},
    empty:     ds=>ds.filter(d=>(d.text||'').trim().length>0),
    short:     ds=>ds.filter(d=>tokenize(d.text||'').length>=5),
  };

  const runPipelineSteps=async(steps)=>{
    setNlpPipRunning(true);setNlpPipLog([]);
    const log=[];let current=[...docs];
    for(const step of steps){
      log.push(`▶ ${step.label||step.id}…`);setNlpPipLog([...log]);
      const before=current.length;
      if(STEP_FNS[step.id])current=STEP_FNS[step.id](current);
      log.push(`✅ Done (${before}→${current.length} docs)`);
      await new Promise(r=>setTimeout(r,60));
    }
    setDocs(current);setStats(computeTextStats(current));
    log.push(`🎉 Pipeline complete! ${current.length} documents ready.`);
    setNlpPipLog([...log]);setNlpPipRunning(false);
  };

  const NLP_PRESETS=[
    {icon:'🤗',name:'BERT Ready',desc:'Lowercase → Remove HTML → Remove special chars → Remove duplicates',steps:[{id:'lower',label:'Lowercase'},{id:'html',label:'Remove HTML'},{id:'special',label:'Remove special chars'},{id:'dedup',label:'Remove duplicates'}]},
    {icon:'😊',name:'Sentiment Clean',desc:'Lowercase → Remove URLs → Remove @mentions → Remove hashtags → Remove duplicates',steps:[{id:'lower',label:'Lowercase'},{id:'urls',label:'Remove URLs'},{id:'mentions',label:'Remove @mentions'},{id:'hashtags',label:'Remove hashtags'},{id:'dedup',label:'Remove duplicates'}]},
    {icon:'📊',name:'Classification Prep',desc:'HTML → Lowercase → Stopwords → Duplicates → Empty → Short',steps:[{id:'html',label:'Remove HTML'},{id:'lower',label:'Lowercase'},{id:'stopwords',label:'Remove stopwords'},{id:'dedup',label:'Remove duplicates'},{id:'empty',label:'Remove empty'},{id:'short',label:'Remove short docs'}]},
    {icon:'🔍',name:'NER Prep',desc:'Remove HTML → Remove URLs → Trim → Remove duplicates',steps:[{id:'html',label:'Remove HTML'},{id:'urls',label:'Remove URLs'},{id:'trim',label:'Normalise whitespace'},{id:'dedup',label:'Remove duplicates'}]},
    {icon:'🧹',name:'Deep Clean',desc:'Full cleaning pipeline — all steps combined',steps:[{id:'html',label:'Remove HTML'},{id:'urls',label:'Remove URLs'},{id:'mentions',label:'Remove @mentions'},{id:'emoji',label:'Remove emoji'},{id:'lower',label:'Lowercase'},{id:'stopwords',label:'Remove stopwords'},{id:'dedup',label:'Remove duplicates'},{id:'empty',label:'Remove empty'},{id:'short',label:'Remove short docs'},{id:'trim',label:'Normalise whitespace'}]},
    {icon:'🌍',name:'Multilingual',desc:'HTML → URLs → Normalise whitespace → Remove duplicates',steps:[{id:'html',label:'Remove HTML'},{id:'urls',label:'Remove URLs'},{id:'trim',label:'Normalise whitespace'},{id:'dedup',label:'Remove duplicates'}]},
  ];

  const hc=stats?.health>=80?'#00956B':stats?.health>=60?'#D97706':'#DC2626';
  const filteredDocs=docs.filter((_,i)=>{
    const d=docs[i];
    if(filterCls!=='all'&&d.label!==filterCls)return false;
    if(filterIss==='dupes'&&!stats?.dupIds.has && !([...(stats?.dupIds||[])].includes(i)))return false;
    if(search&&!(d.text||'').toLowerCase().includes(search.toLowerCase())&&!(d.label||'').toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  const SAMPLES=[
    {name:'Movie Reviews',emoji:'🎬',desc:'40 docs · Binary sentiment',docs:[...[...Array(20)].map((_,i)=>({id:i,text:`This movie was ${['absolutely fantastic','a real masterpiece','surprisingly good','an enjoyable watch','quite entertaining','brilliantly acted'][i%6]}, ${['with great performances','highly recommended','worth every minute','a must-see'][i%4]}.`,label:'positive',cls:'positive'})),...[...Array(20)].map((_,i)=>({id:20+i,text:`Disappointing film with ${['poor writing','bad acting','boring plot','too many clichés','slow pacing','weak characters'][i%6]} and ${['predictable ending','waste of time','forgettable story','no real depth'][i%4]}.`,label:'negative',cls:'negative'}))]},
    {name:'Support Tickets',emoji:'🎫',desc:'30 docs · 3 classes',docs:[...[...Array(10)].map((_,i)=>({id:i,text:`My account login is not working and I cannot access my dashboard. Error code ${1000+i}. Please help urgently.`,label:'technical',cls:'technical'})),...[...Array(10)].map((_,i)=>({id:10+i,text:`I was charged twice for my subscription this month. Amount: $${49+i*10}. Please refund immediately.`,label:'billing',cls:'billing'})),...[...Array(10)].map((_,i)=>({id:20+i,text:`Your product is amazing! I love the new features in version ${i+2}.0. Keep up the great work team.`,label:'feedback',cls:'feedback'}))]},
    {name:'News Articles',emoji:'📰',desc:'24 docs · 3 categories',docs:[...[...Array(8)].map((_,i)=>({id:i,text:`Tech giant announces new AI model with unprecedented capabilities in natural language processing and image recognition.`,label:'technology',cls:'technology'})),...[...Array(8)].map((_,i)=>({id:8+i,text:`Stock markets surge as investors react positively to the latest economic data showing stronger than expected growth.`,label:'business',cls:'business'})),...[...Array(8)].map((_,i)=>({id:16+i,text:`Scientists discover new species in the Amazon rainforest, highlighting the importance of conservation efforts.`,label:'science',cls:'science'}))]},
  ];

  return(
    <div style={{display:'grid',gap:0}}>
      {/* Step bar */}
      <StepBar steps={STEPS} current={stepIdx}/>

      <div style={{display:'grid',gap:'14px',padding:'14px 16px'}}>
        {/* Status */}
        {busy&&<div style={{padding:'10px 14px',background:C.tealDim,border:`1px solid ${C.tealBorder}`,borderRadius:'8px',display:'flex',gap:'10px',alignItems:'center'}}><div style={{width:'14px',height:'14px',border:`2px solid ${C.border}`,borderTopColor:C.teal,borderRadius:'50%',animation:'spin 1s linear infinite',flexShrink:0}}/><span style={{fontSize:'12px',color:'#00956B',fontWeight:600}}>{busy}</span></div>}
        {error&&<div style={{padding:'10px 14px',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:'8px',fontSize:'12px',color:'#DC2626',display:'flex',justifyContent:'space-between',alignItems:'center'}}>❌ {error}<button onClick={()=>setError('')} style={{background:'none',border:'none',color:'#DC2626',cursor:'pointer'}}>✕</button></div>}

        {/* Quick bar */}
        {stats&&view!=='import'&&(
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap',alignItems:'center'}}>
            <GBtn onClick={()=>{setView('import');setImportMode('paste');}}>➕ Add More</GBtn>
            <GBtn onClick={()=>{if(window.confirm('Clear all?')){setDocs([]);setStats(null);setView('import');}}} color={C.red}>🗑 Clear</GBtn>
            <div style={{marginLeft:'auto',fontSize:'10px',color:C.muted,display:'flex',gap:'8px',alignItems:'center'}}>
              <span style={{fontWeight:700,color:hc}}>♥ {stats.health}/100</span>
              <span>{stats.total} docs · {stats.classes.length} classes</span>
            </div>
          </div>
        )}

        {/* ── IMPORT ──────────────────────────────────────────── */}
        {(view==='import')&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:'8px',marginBottom:'14px'}}>
              {[{icon:'📝',label:'Paste / Upload',id:'paste',color:C.teal},{icon:'🤗',label:'HuggingFace',id:'hf',color:C.amber},{icon:'🔗',label:'From URL',id:'url',color:C.blue},{icon:'🎯',label:'Samples',id:'samples',color:'#EC4899'},{icon:'➕',label:'Merge More',id:'merge',color:C.purple}].map(opt=>{
                const active=importMode===opt.id;
                return(
                  <button key={opt.id} onClick={()=>setImportMode(opt.id)} style={{padding:'14px 8px',borderRadius:'10px',border:'none',cursor:'pointer',textAlign:'center',background:active?opt.color+'18':'#F8FAFC',outline:active?`2px solid ${opt.color}`:`1px solid ${C.border}`,transition:'all .15s'}}>
                    <div style={{fontSize:'22px',marginBottom:'5px'}}>{opt.icon}</div>
                    <div style={{fontWeight:700,color:active?opt.color:C.text,fontSize:'11px'}}>{opt.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Paste panel */}
            {(importMode==='paste'||!docs.length)&&(
              <Card>
                <ST>📝 Paste Text or Upload File</ST>
                <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} rows={6}
                  placeholder={"Paste text (one per line), or CSV with text,label columns...\n\nExample CSV:\ntext,label\nI love this product,positive\nThis is terrible,negative"}
                  style={{width:'100%',padding:'10px 12px',borderRadius:'8px',border:`1px solid ${C.border}`,fontSize:'11px',resize:'vertical',boxSizing:'border-box',fontFamily:'monospace',lineHeight:1.6,marginBottom:'10px'}}/>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'10px',alignItems:'center'}}>
                  <PBtn onClick={parsePaste}>📥 Import Pasted Text</PBtn>
                  <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                    <label style={{fontSize:'11px',color:C.muted}}>Default label:</label>
                    <input value={pasteLabel} onChange={e=>setPasteLabel(e.target.value)} placeholder="e.g. text" style={{padding:'5px 8px',borderRadius:'5px',border:`1px solid ${C.border}`,fontSize:'11px',width:'100px'}}/>
                  </div>
                </div>
                <div style={{borderTop:`1px solid ${C.border}`,paddingTop:'12px',marginTop:'4px'}}>
                  <div style={{fontSize:'11px',color:C.muted,marginBottom:'8px',fontWeight:600}}>Or upload a file:</div>
                  <label style={{display:'inline-block',padding:'8px 18px',borderRadius:'8px',background:C.teal,color:'#fff',fontWeight:700,fontSize:'12px',cursor:'pointer'}}>
                    📁 Browse File
                    <input type="file" accept=".csv,.json,.jsonl,.txt" style={{display:'none'}} onChange={e=>{if(e.target.files[0])parseFile(e.target.files[0]);}}/>
                  </label>
                  <span style={{fontSize:'11px',color:C.muted,marginLeft:'10px'}}>CSV · JSON · JSONL · TXT</span>
                </div>
              </Card>
            )}

            {importMode==='hf'&&(
              <Card>
                <ST>🤗 HuggingFace Dataset</ST>
                <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>
                  <input value={hfId} onChange={e=>setHfId(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadHF()} placeholder="e.g. imdb, emotion, ag_news, tweet_eval" style={{padding:'9px 12px',borderRadius:'7px',border:`1px solid ${C.border}`,fontSize:'12px',flex:1}}/>
                  <PBtn onClick={loadHF} disabled={hfBusy}>{hfBusy?'⏳':'Load'}</PBtn>
                </div>
                <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'10px'}}>
                  {['imdb','emotion','ag_news','tweet_eval','sst2','yelp_review_full'].map(id=>(
                    <button key={id} onClick={()=>setHfId(id)} style={{fontSize:'10px',padding:'3px 10px',borderRadius:'4px',border:`1px solid ${C.border}`,background:C.surface,cursor:'pointer',color:C.muted}}>{id}</button>
                  ))}
                </div>
                {hfMsg&&<div style={{fontSize:'12px',padding:'8px 12px',borderRadius:'7px',color:hfMsg.startsWith('✅')?'#00956B':'#DC2626',background:hfMsg.startsWith('✅')?C.tealDim:'rgba(239,68,68,.08)'}}>{hfMsg}</div>}
              </Card>
            )}

            {importMode==='url'&&(
              <Card>
                <ST>🔗 Import from URL</ST>
                <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>
                  <input value={urlInput} onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadURL()} placeholder="Public CSV or JSON URL" style={{padding:'9px 12px',borderRadius:'7px',border:`1px solid ${C.border}`,fontSize:'12px',flex:1}}/>
                  <PBtn onClick={loadURL} disabled={urlBusy}>{urlBusy?'⏳':'Load'}</PBtn>
                </div>
                {urlMsg&&<div style={{fontSize:'12px',padding:'8px 12px',borderRadius:'7px',color:urlMsg.startsWith('✅')?'#00956B':'#DC2626',background:urlMsg.startsWith('✅')?C.tealDim:'rgba(239,68,68,.08)'}}>{urlMsg}</div>}
              </Card>
            )}

            {importMode==='samples'&&(
              <Card>
                <ST>🎯 Sample Datasets</ST>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'10px'}}>
                  {SAMPLES.map(ds=>(
                    <button key={ds.name} onClick={()=>{setDocs(ds.docs);setStats(computeTextStats(ds.docs));setView('overview');}} style={{padding:'16px',borderRadius:'10px',border:`1px solid ${C.border}`,background:'#fff',cursor:'pointer',textAlign:'left',transition:'all .15s'}}
                      onMouseOver={e=>{e.currentTarget.style.borderColor=C.teal;}}
                      onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;}}>
                      <div style={{fontSize:'24px',marginBottom:'6px'}}>{ds.emoji}</div>
                      <div style={{fontWeight:700,color:C.text,fontSize:'12px',marginBottom:'3px'}}>{ds.name}</div>
                      <div style={{fontSize:'10px',color:C.muted}}>{ds.desc}</div>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {importMode==='merge'&&docs.length>0&&(
              <Card>
                <ST>➕ Merge More Documents</ST>
                <p style={{fontSize:'12px',color:C.muted,marginBottom:'12px'}}>Current: <strong>{docs.length}</strong> documents. Paste or upload to add.</p>
                <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} rows={4} placeholder="Paste more text or CSV…" style={{width:'100%',padding:'10px 12px',borderRadius:'8px',border:`1px solid ${C.border}`,fontSize:'11px',resize:'vertical',boxSizing:'border-box',marginBottom:'10px'}}/>
                <PBtn onClick={()=>{if(!pasteText.trim())return;const lines=pasteText.trim().split('\n').filter(Boolean);const newDocs=[...docs,...lines.map((l,i)=>({id:docs.length+i,text:l,label:pasteLabel||'unknown',cls:pasteLabel||'unknown'}))];setDocs(newDocs);setStats(computeTextStats(newDocs));setPasteText('');setView('overview');}}>➕ Merge</PBtn>
              </Card>
            )}
          </div>
        )}

        {/* ── OVERVIEW ──────────────────────────────────────────── */}
        {!stats&&view!=='import'&&(
          <div style={{textAlign:'center',padding:'60px 24px',color:'#64748B'}}>
            <div style={{fontSize:'48px',marginBottom:'12px'}}>📝</div>
            <div style={{fontSize:'16px',fontWeight:700,color:'#0F172A',marginBottom:'8px'}}>No documents yet</div>
            <div style={{fontSize:'13px',marginBottom:'20px'}}>Import text to unlock this tab</div>
            <button onClick={()=>setView('import')} style={{padding:'10px 24px',borderRadius:'8px',background:'#00CBA8',color:'#fff',border:'none',fontSize:'13px',fontWeight:700,cursor:'pointer'}}>📥 Go to Import</button>
          </div>
        )}
        {stats&&view==='overview'&&(
          <Card>
            <ST>Dataset Overview</ST>
            <div style={{display:'flex',gap:'20px',marginBottom:'20px',flexWrap:'wrap'}}>
              <div style={{textAlign:'center',flexShrink:0}}>
                <div style={{fontSize:'52px',fontWeight:900,color:hc,lineHeight:1}}>{stats.health}</div>
                <div style={{fontSize:'10px',color:C.muted,fontWeight:700,textTransform:'uppercase'}}>Health Score</div>
                <div style={{marginTop:'8px',height:'4px',width:'80px',background:'#E2E8F0',borderRadius:'2px',overflow:'hidden'}}>
                  <div style={{width:`${stats.health}%`,height:'100%',background:hc,borderRadius:'2px'}}/>
                </div>
              </div>
              <div style={{flex:1,minWidth:'180px',display:'flex',flexDirection:'column',gap:'4px'}}>
                {[[stats.dupIds?.size===0,'✅ No duplicates',`⚠ ${stats.dupIds?.size} duplicates`],[stats.imbalance<25,`✅ Balanced (${stats.imbalance}% imbalance)`,`⚠ ${stats.imbalance}% class imbalance`],[stats.emptyIds?.length===0,'✅ No empty docs',`⚠ ${stats.emptyIds?.length} empty docs`],[stats.shortIds?.length===0,'✅ No very short docs',`⚠ ${stats.shortIds?.length} short docs (<5 words)`]].map(([ok,g,b],i)=>(
                  <div key={i} style={{fontSize:'12px',color:ok?'#00956B':'#B45309'}}>{ok?g:b}</div>
                ))}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(70px,1fr))',gap:'7px'}}>
              {[['📄','Docs',stats.total,''],['🏷','Classes',stats.classes.length,''],['⚠','Dupes',stats.dupIds?.size||0,stats.dupIds?.size>0?C.red:''],['💬','Avg Words',stats.avgWords,''],['📚','Vocab',stats.vocabSize,''],['❌','Empty',stats.emptyIds?.length||0,stats.emptyIds?.length>0?C.amber:''],['📏','Short',stats.shortIds?.length||0,stats.shortIds?.length>0?C.amber:''],['📊','Imbalance',stats.imbalance+'%',stats.imbalance>30?C.amber:''],['♥','Health',stats.health,hc]].map(([icon,label,value,color])=>(
                <div key={label} style={{textAlign:'center',padding:'10px 6px',background:C.surface,borderRadius:'8px',border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:'16px',marginBottom:'3px'}}>{icon}</div>
                  <div style={{fontSize:'14px',fontWeight:800,color:color||C.text}}>{value}</div>
                  <div style={{fontSize:'8px',color:C.muted,marginTop:'1px'}}>{label}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── DOCUMENTS ─────────────────────────────────────────── */}
        {stats&&view==='words'&&(
          <div>
            <Card style={{marginBottom:'10px'}}>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search…" style={{padding:'6px 10px',borderRadius:'6px',border:`1px solid ${C.border}`,fontSize:'11px',width:'160px'}}/>
                <select value={filterCls} onChange={e=>setFilterCls(e.target.value)} style={{padding:'6px',borderRadius:'6px',border:`1px solid ${C.border}`,fontSize:'11px'}}>
                  <option value="all">All classes</option>
                  {stats.classes.map(c=><option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
                </select>
                {selected.size>0&&(
                  <div style={{display:'flex',gap:'5px'}}>
                    <PBtn onClick={deleteSelected} color={C.red} style={{fontSize:'11px',padding:'5px 12px'}}>🗑 Delete {selected.size}</PBtn>
                    <select onChange={e=>e.target.value&&bulkRelabel(e.target.value)} defaultValue="" style={{padding:'5px',borderRadius:'6px',border:`1px solid ${C.border}`,fontSize:'11px',cursor:'pointer'}}>
                      <option value="">Re-label {selected.size} as…</option>
                      {stats.classes.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <span style={{fontSize:'11px',color:C.muted,marginLeft:'auto'}}>{filteredDocs.length} docs</span>
              </div>
            </Card>
            <div style={{display:'grid',gap:'6px'}}>
              {filteredDocs.slice(0,50).map((doc,i)=>{
                const idx=docs.indexOf(doc);const isSel=selected.has(idx);const isEd=editingDoc===doc.id;
                return(
                  <div key={doc.id} style={{padding:'10px 12px',borderRadius:'8px',background:'#fff',border:`1px solid ${isSel?C.blue:C.border}`,transition:'border-color .15s'}}>
                    {isEd?(
                      <div>
                        <textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={3} style={{width:'100%',padding:'8px',borderRadius:'6px',border:`1px solid ${C.teal}`,fontSize:'11px',resize:'vertical',boxSizing:'border-box',marginBottom:'6px'}}/>
                        <div style={{display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap'}}>
                          <select value={editLabel} onChange={e=>setEditLabel(e.target.value)} style={{padding:'4px 8px',borderRadius:'5px',border:`1px solid ${C.border}`,fontSize:'11px'}}>
                            {stats.classes.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
                            <option value="_new_">+ New label…</option>
                          </select>
                          {editLabel==='_new_'&&<input placeholder="New label name" onBlur={e=>setEditLabel(e.target.value||editLabel)} style={{padding:'4px 8px',borderRadius:'5px',border:`1px solid ${C.border}`,fontSize:'11px'}}/>}
                          <PBtn onClick={()=>{updateDoc(doc.id,{text:editText,label:editLabel,cls:editLabel});setEditingDoc(null);}} style={{fontSize:'11px',padding:'5px 12px'}}>✓ Save</PBtn>
                          <GBtn onClick={()=>setEditingDoc(null)}>Cancel</GBtn>
                        </div>
                      </div>
                    ):(
                      <div style={{display:'flex',gap:'10px',alignItems:'flex-start'}}>
                        <input type="checkbox" checked={isSel} onChange={()=>setSelected(prev=>{const n=new Set(prev);n.has(idx)?n.delete(idx):n.add(idx);return n;})} style={{marginTop:'2px',accentColor:C.blue,flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:0,fontSize:'12px',color:C.text,lineHeight:1.6,wordBreak:'break-word'}}>{(doc.text||'').slice(0,220)}{(doc.text||'').length>220&&'…'}</p>
                          <div style={{display:'flex',gap:'6px',marginTop:'5px',alignItems:'center',flexWrap:'wrap'}}>
                            <span style={{fontSize:'10px',fontWeight:700,color:COLORS[stats.classes.findIndex(c=>c.name===doc.label)%COLORS.length]||C.teal,background:`${COLORS[stats.classes.findIndex(c=>c.name===doc.label)%COLORS.length]||C.teal}18`,padding:'2px 8px',borderRadius:'4px'}}>{doc.label||'unknown'}</span>
                            <span style={{fontSize:'9px',color:C.muted}}>{tokenize(doc.text||'').length}w</span>
                            {stats.dupIds?.has&&stats.dupIds.has(idx)&&<span style={{fontSize:'9px',background:'#EF444418',color:'#DC2626',padding:'1px 5px',borderRadius:'3px',fontWeight:700}}>DUP</span>}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:'4px',flexShrink:0}}>
                          <button onClick={()=>{setEditingDoc(doc.id);setEditText(doc.text||'');setEditLabel(doc.label||'unknown');}} style={{padding:'3px 8px',borderRadius:'4px',background:'rgba(59,130,246,.1)',color:C.blue,border:'none',fontSize:'10px',cursor:'pointer',fontWeight:600}}>✏</button>
                          <button onClick={()=>deleteDoc(doc.id)} style={{padding:'3px 8px',borderRadius:'4px',background:'rgba(239,68,68,.08)',color:'#DC2626',border:'none',fontSize:'10px',cursor:'pointer',fontWeight:600}}>🗑</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredDocs.length>50&&<div style={{textAlign:'center',padding:'10px',color:C.muted,fontSize:'12px'}}>Showing 50/{filteredDocs.length} — use search/filter to narrow</div>}
            </div>
          </div>
        )}

        {/* ── QUALITY ───────────────────────────────────────────── */}
        {stats&&view==='universal'&&(
          <div style={{display:'grid',gap:'12px'}}>
            {[
              {label:'🔄 Duplicates',ids:[...(stats.dupIds||[])],color:'#EF4444',onRemove:removeDuplicates},
              {label:'❌ Empty Docs',ids:stats.emptyIds||[],color:'#94A3B8',onRemove:()=>removeIssue('empty')},
              {label:'📏 Too Short (<5 words)',ids:stats.shortIds||[],color:'#F59E0B',onRemove:()=>removeIssue('short')},
              {label:'📄 Too Long (>500 words)',ids:stats.longIds||[],color:'#8B5CF6',onRemove:()=>removeIssue('long')},
            ].map(({label,ids,color,onRemove})=>(
              <Card key={label}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                  <div style={{fontWeight:700,color:C.text,fontSize:'13px'}}>{label} ({ids.length})</div>
                  {ids.length>0&&<PBtn onClick={onRemove} color={color} style={{fontSize:'11px',padding:'5px 14px'}}>🗑 Remove All</PBtn>}
                </div>
                {ids.length===0?<div style={{color:'#00956B',fontSize:'12px'}}>✅ None found</div>:(
                  <div style={{display:'grid',gap:'4px'}}>
                    {ids.slice(0,3).map(idx=>(
                      <div key={idx} style={{fontSize:'11px',color:C.muted,padding:'5px 10px',background:C.surface,borderRadius:'5px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        <span style={{color,fontWeight:700,marginRight:'6px'}}>#{idx}</span>{(docs[idx]?.text||'(empty)').slice(0,100)}
                      </div>
                    ))}
                    {ids.length>3&&<div style={{fontSize:'11px',color:C.muted}}>…and {ids.length-3} more</div>}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* ── CHARTS ────────────────────────────────────────────── */}
        {stats&&view==='clean'&&(
          <div style={{display:'grid',gap:'12px'}}>
            <Card>
              <ST>Class Distribution</ST>
              {stats.classes.map((cls,i)=>{const color=COLORS[i%COLORS.length];const pct=Math.round(cls.count/stats.total*100);return(
                <div key={cls.name} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
                  <div style={{width:'90px',fontSize:'10px',color:C.muted,textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flexShrink:0}}>{cls.name}</div>
                  <MiniBar value={cls.count} max={stats.classes[0]?.count||1} color={color} height={18}/>
                  <div style={{width:'60px',fontSize:'10px',color:C.muted,flexShrink:0}}>{cls.count} ({pct}%)</div>
                </div>
              );})}
            </Card>
            <Card>
              <ST>Text Length Distribution</ST>
              <TextLenHist wordLens={stats.wordLens||[]}/>
              <div style={{marginTop:'10px',fontSize:'11px',color:C.muted,lineHeight:1.8}}>
                Min: <strong>{Math.min(...(stats.wordLens||[1]))||0}</strong> words · Max: <strong>{Math.max(...(stats.wordLens||[0]))||0}</strong> words · Avg: <strong>{stats.avgWords}</strong> words
              </div>
            </Card>
            <Card>
              <ST>Word Frequency</ST>
              {wordFreq(docs).slice(0,12).map(([w,c])=>(
                <div key={w} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'5px'}}>
                  <div style={{width:'80px',fontFamily:'monospace',fontSize:'11px',color:C.text,flexShrink:0}}>{w}</div>
                  <MiniBar value={c} max={wordFreq(docs)[0]?.[1]||1} color={C.teal}/>
                  <div style={{width:'35px',fontSize:'10px',color:C.muted,textAlign:'right',flexShrink:0}}>{c}</div>
                </div>
              ))}
            </Card>
            <Card>
              <ST>Per-Class Quality</ST>
              {stats.classes.map((cls,i)=>{
                const clsDocs=docs.filter(d=>d.label===cls.name);
                const dupes=clsDocs.filter((_,i)=>stats.dupIds&&([...stats.dupIds]).includes(docs.indexOf(clsDocs[i]))).length;
                const empty=clsDocs.filter(d=>!(d.text||'').trim()).length;
                const avgW=Math.round(clsDocs.reduce((s,d)=>s+tokenize(d.text||'').length,0)/Math.max(clsDocs.length,1));
                return(
                  <div key={cls.name} style={{display:'grid',gridTemplateColumns:'110px repeat(4,1fr)',gap:'8px',padding:'5px 0',borderBottom:`1px solid #F1F5F9`,alignItems:'center'}}>
                    <span style={{fontFamily:'monospace',fontWeight:700,fontSize:'11px',color:COLORS[i%COLORS.length],overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cls.name}</span>
                    <span style={{fontSize:'11px',color:C.muted}}>Total: {cls.count}</span>
                    <span style={{fontSize:'11px',color:dupes>0?C.red:C.muted}}>Dupes: {dupes}</span>
                    <span style={{fontSize:'11px',color:empty>0?C.amber:C.muted}}>Empty: {empty}</span>
                    <span style={{fontSize:'11px',color:C.muted}}>Avg: {avgW}w</span>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* ── ANALYSE ───────────────────────────────────────────── */}
        {stats&&view==='visualize'&&(
          <div>
            <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'12px'}}>
              {[['😊 Sentiment','sentiment'],['🏷 NER','ner'],['📖 Readability','readability'],['🌍 Language','language'],['🤖 Auto-Label','autolabel']].map(([l,id])=>(
                <button key={id} onClick={()=>setAnalysisTab(id)} style={{padding:'7px 14px',borderRadius:'7px',fontSize:'11px',border:'none',cursor:'pointer',fontWeight:analysisTab===id?700:400,background:analysisTab===id?C.tealDim:'#F1F5F9',color:analysisTab===id?'#00956B':C.muted,outline:analysisTab===id?`1.5px solid ${C.tealBorder}`:`1px solid ${C.border}`}}>{l}</button>
              ))}
            </div>

            {analysisTab==='sentiment'&&(
              <Card>
                <ST>😊 Sentiment Analysis</ST>
                <p style={{fontSize:'12px',color:C.muted,lineHeight:1.7,marginBottom:'12px'}}>Lexicon-based scoring — runs entirely in the browser, no API needed.</p>
                {!sentResults?<PBtn onClick={runSentiment}>▶ Run Sentiment Analysis</PBtn>:(
                  <div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'12px'}}>
                      {[['😊','Positive',sentResults.counts.Positive,'#00CBA8'],['😐','Neutral',sentResults.counts.Neutral,'#94A3B8'],['😢','Negative',sentResults.counts.Negative,'#EF4444']].map(([icon,l,v,c])=>(
                        <div key={l} style={{textAlign:'center',padding:'12px',background:C.surface,borderRadius:'8px',border:`1px solid ${C.border}`}}>
                          <div style={{fontSize:'20px'}}>{icon}</div><div style={{fontSize:'18px',fontWeight:800,color:c}}>{v}</div><div style={{fontSize:'10px',color:C.muted}}>{l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{maxHeight:'240px',overflowY:'auto',border:`1px solid ${C.border}`,borderRadius:'8px',marginBottom:'10px'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                        <thead style={{background:C.surface,position:'sticky',top:0}}>
                          <tr>{['Text','Label','Sentiment'].map(h=><th key={h} style={{padding:'6px 10px',textAlign:'left',color:C.muted,fontWeight:700,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {sentResults.docs.slice(0,30).map((d,i)=>(
                            <tr key={i} style={{borderBottom:`1px solid #F8FAFC`}}>
                              <td style={{padding:'5px 10px',maxWidth:'300px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(d.text||'').slice(0,80)}</td>
                              <td style={{padding:'5px 10px'}}>{d.label}</td>
                              <td style={{padding:'5px 10px',color:d.sentiment==='Positive'?'#00CBA8':d.sentiment==='Negative'?'#EF4444':'#94A3B8',fontWeight:700}}>{d.sentiment}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{display:'flex',gap:'8px'}}>
                      <PBtn onClick={runSentiment}>🔄 Re-run</PBtn>
                      <PBtn color={C.blue} onClick={()=>{const csv='text,label,sentiment\n'+sentResults.docs.map(d=>`"${(d.text||'').replace(/"/g,'""')}","${d.label||''}","${d.sentiment}"`).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='sentiment.csv';a.click();}}>⬇ Export CSV</PBtn>
                      <GBtn onClick={()=>setSentResults(null)}>✕ Clear</GBtn>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {analysisTab==='ner'&&(
              <Card>
                <ST>🏷 Named Entity Recognition</ST>
                <p style={{fontSize:'12px',color:C.muted,lineHeight:1.7,marginBottom:'12px'}}>Regex-based entity extraction — PERSON · DATE · NUM · URL. No API needed.</p>
                {!nerResults?<PBtn onClick={runNER}>▶ Run NER</PBtn>:(
                  <div>
                    <div style={{maxHeight:'280px',overflowY:'auto',border:`1px solid ${C.border}`,borderRadius:'8px',marginBottom:'10px'}}>
                      {nerResults.docs.filter(d=>d.entities?.length>0).slice(0,20).map((d,i)=>(
                        <div key={i} style={{padding:'8px 12px',borderBottom:`1px solid #F8FAFC`}}>
                          <div style={{fontSize:'11px',color:C.muted,marginBottom:'5px'}}>{(d.text||'').slice(0,100)}…</div>
                          <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                            {d.entities.map((e,j)=>(
                              <span key={j} style={{fontSize:'10px',padding:'2px 7px',borderRadius:'4px',fontWeight:700,background:e.type==='PERSON'?'rgba(59,130,246,.15)':e.type==='DATE'?'rgba(245,158,11,.15)':e.type==='NUM'?'rgba(139,92,246,.15)':'rgba(0,203,168,.15)',color:e.type==='PERSON'?C.blue:e.type==='DATE'?C.amber:e.type==='NUM'?C.purple:C.teal}}>
                                {e.type}: {e.text}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:'8px'}}>
                      <PBtn onClick={runNER}>🔄 Re-run</PBtn>
                      <GBtn onClick={()=>setNerResults(null)}>✕ Clear</GBtn>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {analysisTab==='readability'&&(
              <Card>
                <ST>📖 Readability Score</ST>
                <p style={{fontSize:'12px',color:C.muted,marginBottom:'12px',lineHeight:1.6}}>Flesch Reading Ease score: 100=very easy, 0=very hard. Grade level labels follow US education standards.</p>
                {!readResults?<PBtn onClick={runReadability}>▶ Analyse Readability</PBtn>:(
                  <div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
                      <div style={{textAlign:'center',padding:'14px',background:C.surface,borderRadius:'8px',border:`1px solid ${C.border}`}}>
                        <div style={{fontSize:'28px',fontWeight:900,color:readResults.avg>60?'#00956B':readResults.avg>40?C.amber:'#DC2626'}}>{readResults.avg}</div>
                        <div style={{fontSize:'10px',color:C.muted}}>Avg Flesch Score</div>
                      </div>
                      <div style={{textAlign:'center',padding:'14px',background:C.surface,borderRadius:'8px',border:`1px solid ${C.border}`}}>
                        <div style={{fontSize:'16px',fontWeight:700,color:C.text}}>{readResults.avg>70?'Easy':readResults.avg>50?'Medium':readResults.avg>30?'Difficult':'Very Difficult'}</div>
                        <div style={{fontSize:'10px',color:C.muted}}>Reading Level</div>
                      </div>
                    </div>
                    <div style={{maxHeight:'200px',overflowY:'auto',border:`1px solid ${C.border}`,borderRadius:'8px',marginBottom:'10px'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                        <thead style={{background:C.surface,position:'sticky',top:0}}>
                          <tr>{['Text','Words','Flesch Score'].map(h=><th key={h} style={{padding:'6px 10px',textAlign:'left',color:C.muted,fontWeight:700,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {readResults.docs.slice(0,20).map((d,i)=>(
                            <tr key={i} style={{borderBottom:`1px solid #F8FAFC`}}>
                              <td style={{padding:'5px 10px',maxWidth:'300px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(d.text||'').slice(0,70)}</td>
                              <td style={{padding:'5px 10px'}}>{d.words}</td>
                              <td style={{padding:'5px 10px',fontWeight:700,color:d.score>60?'#00956B':d.score>40?C.amber:'#DC2626'}}>{d.score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{display:'flex',gap:'8px'}}>
                      <PBtn onClick={runReadability}>🔄 Re-run</PBtn>
                      <GBtn onClick={()=>setReadResults(null)}>✕ Clear</GBtn>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {analysisTab==='language'&&(
              <Card>
                <ST>🌍 Language Detection</ST>
                <p style={{fontSize:'12px',color:C.muted,marginBottom:'12px',lineHeight:1.6}}>Detects 9 languages (EN/ES/FR/DE/PT/IT/NL/PL/RU) using keyword frequency analysis.</p>
                {!langResults?<PBtn onClick={runLang}>▶ Detect Languages</PBtn>:(
                  <div>
                    <div style={{marginBottom:'12px'}}>
                      {Object.entries(langResults.langs).sort((a,b)=>b[1]-a[1]).map(([lang,count])=>(
                        <div key={lang} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
                          <div style={{width:'40px',fontWeight:700,fontSize:'12px',color:C.text}}>{lang.toUpperCase()}</div>
                          <MiniBar value={count} max={langResults.docs.length} color={C.teal}/>
                          <div style={{width:'50px',fontSize:'10px',color:C.muted}}>{count} docs</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                      <PBtn onClick={runLang}>🔄 Re-run</PBtn>
                      {langResults.langs['en']&&langResults.langs['en']<langResults.docs.length&&<PBtn color={C.red} onClick={()=>{const u=docs.filter((_,i)=>langResults.docs[i]?.lang==='en');setDocs(u);setStats(computeTextStats(u));setLangResults(null);}}>🇬🇧 Keep English Only</PBtn>}
                      <GBtn onClick={()=>setLangResults(null)}>✕ Clear</GBtn>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {analysisTab==='autolabel'&&(
              <Card>
                <ST>🤖 Auto-Label by Keywords</ST>
                <p style={{fontSize:'12px',color:C.muted,marginBottom:'12px',lineHeight:1.6}}>Define keyword → class rules. First matching rule wins.</p>
                <div style={{display:'grid',gap:'6px',marginBottom:'12px'}}>
                  {autoLabelRules.map((rule,i)=>(
                    <div key={i} style={{display:'flex',gap:'6px',alignItems:'center'}}>
                      <input value={rule.kw} onChange={e=>{const u=[...autoLabelRules];u[i]={...u[i],kw:e.target.value};setAutoLabelRules(u);}} placeholder="keyword or phrase" style={{flex:2,padding:'6px 10px',borderRadius:'6px',border:`1px solid ${C.border}`,fontSize:'11px'}}/>
                      <span style={{color:C.muted,flexShrink:0}}>→</span>
                      <input value={rule.label} onChange={e=>{const u=[...autoLabelRules];u[i]={...u[i],label:e.target.value};setAutoLabelRules(u);}} placeholder="class label" style={{flex:1,padding:'6px 10px',borderRadius:'6px',border:`1px solid ${C.border}`,fontSize:'11px'}}/>
                      {autoLabelRules.length>1&&<button onClick={()=>setAutoLabelRules(r=>r.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'14px'}}>✕</button>}
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  <GBtn onClick={()=>setAutoLabelRules(r=>[...r,{kw:'',label:''}])}>+ Add Rule</GBtn>
                  <PBtn onClick={applyAutoLabel}>🏷 Apply Labels</PBtn>
                </div>
                {autoApplied>0&&<div style={{marginTop:'10px',fontSize:'12px',color:'#00956B'}}>✅ Labelled {autoApplied} documents</div>}
              </Card>
            )}
          </div>
        )}

        {/* ── CLEANING TOOLS ────────────────────────────────────── */}
        {stats&&view==='export'&&(
          <div style={{display:'grid',gap:'12px'}}>
            <Card>
              <ST>🌐 Text Cleaning Tools</ST>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'8px',marginBottom:'14px'}}>
                {CLEAN_TOOLS.map(tool=>(
                  <button key={tool.id} onClick={()=>applyTool(tool.fn,tool.label)} style={{padding:'10px 12px',borderRadius:'8px',border:`1px solid ${C.border}`,background:'#fff',cursor:'pointer',textAlign:'left',fontSize:'12px',fontWeight:600,color:C.text,transition:'all .15s'}}
                    onMouseOver={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.background=C.tealDim;}}
                    onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background='#fff';}}>
                    {tool.label}
                  </button>
                ))}
              </div>
              {/* Regex replace */}
              <div style={{padding:'14px',background:C.surface,borderRadius:'9px',border:`1px solid ${C.border}`}}>
                <div style={{fontWeight:700,fontSize:'11px',color:C.text,marginBottom:'10px'}}>🔍 Regex Find & Replace</div>
                <div style={{display:'flex',gap:'6px',marginBottom:'8px',flexWrap:'wrap'}}>
                  <input value={regexPat} onChange={e=>setRegexPat(e.target.value)} placeholder="Pattern (regex)" style={{flex:1,padding:'6px 10px',borderRadius:'6px',border:`1px solid ${C.border}`,fontSize:'11px',minWidth:'120px',fontFamily:'monospace'}}/>
                  <span style={{display:'flex',alignItems:'center',color:C.muted}}>→</span>
                  <input value={regexRep} onChange={e=>setRegexRep(e.target.value)} placeholder="Replacement" style={{flex:1,padding:'6px 10px',borderRadius:'6px',border:`1px solid ${C.border}`,fontSize:'11px',minWidth:'120px',fontFamily:'monospace'}}/>
                  <PBtn onClick={applyRegex} style={{fontSize:'11px',padding:'6px 14px'}}>Preview</PBtn>
                </div>
                <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                  {[['Remove double spaces','\\\\s+',' '],['Remove digits','\\\\d+',''],['Remove punct','[^\\\\w\\\\s]',''],['Remove all caps','[A-Z]{2,}','']].map(([l,p,r])=>(
                    <button key={l} onClick={()=>{setRegexPat(p);setRegexRep(r);}} style={{fontSize:'10px',padding:'3px 8px',borderRadius:'4px',border:`1px solid ${C.border}`,background:C.surface,cursor:'pointer',color:C.muted}}>{l}</button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Tool result preview */}
            {toolResults&&(
              <Card style={{border:toolResults.applied?`2px solid ${C.teal}`:`1px solid ${C.border}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:'13px',color:C.text}}>{toolResults.applied?'✅ Applied:':'👁 Preview:'} {toolResults.label}</div>
                    <div style={{fontSize:'11px',color:C.muted,marginTop:'2px'}}>
                      {toolResults.applied?`Applied to all ${docs.length} documents`:`Preview on first 5 documents — click Apply to process all ${docs.length}`}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    {!toolResults.applied&&<PBtn onClick={commitTool}>✅ Apply to All {docs.length}</PBtn>}
                    <GBtn onClick={()=>setToolResults(null)}>✕</GBtn>
                  </div>
                </div>
                {commitMsg&&<div style={{padding:'8px 12px',background:C.tealDim,border:`1px solid ${C.tealBorder}`,borderRadius:'7px',fontSize:'12px',color:'#00956B',marginBottom:'10px'}}>{commitMsg}</div>}
                <div style={{display:'grid',gap:'6px'}}>
                  {toolResults.sample.map((d,i)=>{
                    const orig=docs[i];
                    return(
                      <div key={i} style={{padding:'8px 12px',background:C.surface,borderRadius:'6px',border:`1px solid ${C.border}`}}>
                        <div style={{fontSize:'10px',color:C.red,marginBottom:'3px',fontFamily:'monospace'}}>— {(orig?.text||'').slice(0,120)}</div>
                        <div style={{fontSize:'10px',color:'#00956B',fontFamily:'monospace'}}>+ {(d.text||'').slice(0,120)}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── SPLIT ─────────────────────────────────────────────── */}
        {stats&&view==='translate'&&(
          <Card>
            <ST>✂️ Train / Validation / Test Split</ST>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'14px',marginBottom:'14px'}}>
              {[['Train',0,'#00CBA8'],['Validation',1,'#3B82F6'],['Test',2,'#F59E0B']].map(([label,idx,color])=>(
                <div key={label}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                    <span style={{fontSize:'12px',color,fontWeight:700}}>{label}</span>
                    <span style={{fontSize:'12px',fontWeight:700}}>{splitRatio[idx]}%</span>
                  </div>
                  <input type="range" min={5} max={90} value={splitRatio[idx]} onChange={e=>{
                    const v=Number(e.target.value),ns=[...splitRatio];ns[idx]=v;
                    const oth=[0,1,2].filter(i=>i!==idx);const s=ns[oth[0]]+ns[oth[1]];
                    if(s>0){ns[oth[0]]=Math.round((100-v)*ns[oth[0]]/s);ns[oth[1]]=100-v-ns[oth[0]];}
                    setSplitRatio(ns);
                  }} style={{width:'100%',accentColor:color}}/>
                  <div style={{fontSize:'11px',color:C.muted,marginTop:'3px'}}>{Math.round(stats.total*splitRatio[idx]/100)} docs</div>
                </div>
              ))}
            </div>
            <div style={{height:'10px',borderRadius:'6px',overflow:'hidden',display:'flex',marginBottom:'14px'}}>
              {[['#00CBA8',0],['#3B82F6',1],['#F59E0B',2]].map(([c,i])=><div key={i} style={{width:`${splitRatio[i]}%`,background:c,transition:'width .3s'}}/>)}
            </div>
            {stats.classes.map((cls,i)=>(
              <div key={cls.name} style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr 1fr',gap:'10px',padding:'5px 0',borderBottom:`1px solid #F1F5F9`,alignItems:'center'}}>
                <span style={{fontFamily:'monospace',fontWeight:700,fontSize:'11px',color:COLORS[i%COLORS.length],overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cls.name}</span>
                <span style={{color:'#00CBA8',fontSize:'11px'}}>Train: {Math.round(cls.count*splitRatio[0]/100)}</span>
                <span style={{color:'#3B82F6',fontSize:'11px'}}>Val: {Math.round(cls.count*splitRatio[1]/100)}</span>
                <span style={{color:'#F59E0B',fontSize:'11px'}}>Test: {Math.round(cls.count*splitRatio[2]/100)}</span>
              </div>
            ))}
          </Card>
        )}

        {/* ── ML CODE ───────────────────────────────────────────── */}
        {stats&&view==='mlcode'&&(
          <Card>
            <ST>🤖 ML Code Generator</ST>
            <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'14px'}}>
              {[['🤗 BERT','bert'],['📊 sklearn','sklearn'],['🔥 PyTorch','pytorch'],['🌿 spaCy','spacy']].map(([l,id])=>(
                <button key={id} onClick={()=>setCodeTab(id)} style={{padding:'7px 14px',borderRadius:'7px',fontSize:'11px',border:'none',cursor:'pointer',fontWeight:codeTab===id?700:400,background:codeTab===id?C.tealDim:'#F1F5F9',color:codeTab===id?'#00956B':C.muted,outline:codeTab===id?`1.5px solid ${C.tealBorder}`:`1px solid ${C.border}`}}>{l}</button>
              ))}
            </div>
            {codeTab==='bert'&&(
              <div>
                <div style={{background:'#1E1E2E',borderRadius:'10px',padding:'16px',overflowX:'auto',marginBottom:'12px'}}>
                  <pre style={{color:'#A6E22E',fontSize:'10px',lineHeight:1.85,margin:0,fontFamily:'monospace',whiteSpace:'pre'}}>{`# HuggingFace BERT Fine-tuning — ${stats.classes.length} classes
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from transformers import TrainingArguments, Trainer
from datasets import Dataset
import pandas as pd

LABELS  = [${stats.classes.map(c=>"'"+c.name+"'").join(', ')}]
id2label = {i: l for i,l in enumerate(LABELS)}
label2id = {l: i for i,l in enumerate(LABELS)}

tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased')
model     = AutoModelForSequenceClassification.from_pretrained(
    'bert-base-uncased', num_labels=${stats.classes.length},
    id2label=id2label, label2id=label2id)

df = pd.read_csv('dataset.csv')
df['labels'] = df['label'].map(label2id)
dataset = Dataset.from_pandas(df[['text','labels']])
dataset = dataset.train_test_split(test_size=${splitRatio[2]/100})

tokenize_fn = lambda b: tokenizer(b['text'], truncation=True, padding='max_length', max_length=128)
dataset = dataset.map(tokenize_fn, batched=True)

args = TrainingArguments(output_dir='./results', num_train_epochs=3,
    per_device_train_batch_size=16, evaluation_strategy='epoch')
Trainer(model=model, args=args, train_dataset=dataset['train'],
        eval_dataset=dataset['test']).train()
model.save_pretrained('./fine_tuned_model')`}</pre>
                </div>
              </div>
            )}
            {codeTab==='sklearn'&&(
              <div style={{background:'#1E1E2E',borderRadius:'10px',padding:'16px',overflowX:'auto'}}>
                <pre style={{color:'#A6E22E',fontSize:'10px',lineHeight:1.85,margin:0,fontFamily:'monospace',whiteSpace:'pre'}}>{`# scikit-learn TF-IDF + Logistic Regression
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

df = pd.read_csv('dataset.csv')
X, y = df['text'], df['label']
X_train,X_test,y_train,y_test = train_test_split(X,y,test_size=${splitRatio[2]/100},stratify=y,random_state=42)
pipeline = Pipeline([('tfidf',TfidfVectorizer(max_features=10000,ngram_range=(1,2))),
                     ('clf',LogisticRegression(C=1.0,max_iter=500,class_weight='balanced'))])
pipeline.fit(X_train,y_train)
print(classification_report(y_test,pipeline.predict(X_test)))`}</pre>
              </div>
            )}
            {codeTab==='pytorch'&&(
              <div style={{background:'#1E1E2E',borderRadius:'10px',padding:'16px',overflowX:'auto'}}>
                <pre style={{color:'#A6E22E',fontSize:'10px',lineHeight:1.85,margin:0,fontFamily:'monospace',whiteSpace:'pre'}}>{`# PyTorch LSTM Text Classifier — ${stats.classes.length} classes
import torch, torch.nn as nn
NUM_CLASSES = ${stats.classes.length}
class TextLSTM(nn.Module):
    def __init__(self,vocab_size,embed=128,hidden=256):
        super().__init__()
        self.embed = nn.EmbeddingBag(vocab_size,embed,sparse=True)
        self.lstm  = nn.LSTM(embed,hidden,2,batch_first=True,dropout=0.3)
        self.fc    = nn.Linear(hidden,NUM_CLASSES)
    def forward(self,x,lengths):
        out,( h,_)=self.lstm(self.embed(x).unsqueeze(1))
        return self.fc(h[-1])
model=TextLSTM(20000); print(f'{sum(p.numel() for p in model.parameters()):,} params')`}</pre>
              </div>
            )}
            {codeTab==='spacy'&&(
              <div style={{background:'#1E1E2E',borderRadius:'10px',padding:'16px',overflowX:'auto'}}>
                <pre style={{color:'#A6E22E',fontSize:'10px',lineHeight:1.85,margin:0,fontFamily:'monospace',whiteSpace:'pre'}}>{`# spaCy Text Classification — ${stats.classes.length} classes
import spacy,json
from spacy.util import minibatch,compounding
nlp=spacy.blank('en')
textcat=nlp.add_pipe('textcat_multilabel')
LABELS=[${stats.classes.map(c=>"'"+c.name+"'").join(', ')}]
for l in LABELS: textcat.add_label(l)
from pathlib import Path
train_data=[(d['text'],{d['label']:True}) for d in json.loads(Path('dataset.json').read_text())]
opt=nlp.begin_training()
for ep in range(10):
    for batch in minibatch(train_data,size=compounding(4.,32.,1.001)):
        texts,anns=zip(*batch); nlp.update(texts,anns,sgd=opt,drop=0.2)
nlp.to_disk('./spacy_model')`}</pre>
              </div>
            )}
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'12px'}}>
              <PBtn onClick={()=>navigator.clipboard?.writeText("LABELS=["+(stats.classes.map(c=>"'"+c.name+"'").join(","))+"]").then(()=>alert('Config copied!'))}>📋 Copy Config</PBtn>
              <PBtn color={C.blue} onClick={()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(["LABELS=["+(stats.classes.map(c=>"'"+c.name+"'").join(","))+"]\nNUM_CLASSES="+stats.classes.length],{type:'text/plain'}));a.download='config.py';a.click();}}>⬇ config.py</PBtn>
            </div>
          </Card>
        )}

        {/* ── PIPELINE ──────────────────────────────────────────── */}
        {stats&&view==='pipeline'&&(
          <div style={{display:'grid',gap:'12px'}}>
            <Card>
              <ST>⚡ Pipeline Presets</ST>
              <p style={{fontSize:'12px',color:C.muted,marginBottom:'14px',lineHeight:1.7}}>One-click NLP workflows — pick a preset and hit Run.</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(195px,1fr))',gap:'10px',marginBottom:'16px'}}>
                {NLP_PRESETS.map(p=>(
                  <button key={p.name} onClick={()=>setNlpPreset(p)} style={{padding:'14px',borderRadius:'10px',textAlign:'left',cursor:'pointer',border:`2px solid ${nlpPreset?.name===p.name?C.teal:C.border}`,background:nlpPreset?.name===p.name?C.tealDim:'#fff',transition:'all .15s'}}
                    onMouseOver={e=>e.currentTarget.style.borderColor=C.teal}
                    onMouseOut={e=>{if(nlpPreset?.name!==p.name)e.currentTarget.style.borderColor=C.border;}}>
                    <div style={{fontSize:'22px',marginBottom:'5px'}}>{p.icon}</div>
                    <div style={{fontWeight:700,fontSize:'12px',color:C.text,marginBottom:'3px'}}>{p.name}</div>
                    <div style={{fontSize:'10px',color:C.muted,lineHeight:1.5}}>{p.desc}</div>
                  </button>
                ))}
              </div>
              {nlpPreset&&(
                <div style={{padding:'14px',background:C.tealDim,border:`1px solid ${C.tealBorder}`,borderRadius:'9px',marginBottom:'14px'}}>
                  <div style={{fontWeight:700,fontSize:'12px',color:'#00956B',marginBottom:'8px'}}>{nlpPreset.icon} {nlpPreset.name}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:'4px',marginBottom:'12px'}}>
                    {nlpPreset.steps.map((s,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'11px',color:C.muted}}>
                        <span style={{width:'18px',height:'18px',borderRadius:'50%',background:C.teal,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:700,flexShrink:0}}>{i+1}</span>{s.label}
                      </div>
                    ))}
                  </div>
                  <PBtn disabled={nlpPipRunning} style={{width:'100%'}} onClick={()=>runPipelineSteps(nlpPreset.steps)}>
                    {nlpPipRunning?'⏳ Running Pipeline…':`⚡ Run ${nlpPreset.name} on ${docs.length} Documents`}
                  </PBtn>
                </div>
              )}
            </Card>

            <Card>
              <ST>🔧 Custom Pipeline</ST>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'14px'}}>
                {[{id:'lower',label:'Lowercase'},{id:'html',label:'Remove HTML'},{id:'urls',label:'Remove URLs'},{id:'mentions',label:'Remove @mentions'},{id:'hashtags',label:'Remove hashtags'},{id:'numbers',label:'Remove numbers'},{id:'punct',label:'Remove punct'},{id:'special',label:'Remove special'},{id:'stopwords',label:'Remove stopwords'},{id:'trim',label:'Normalise spaces'},{id:'emoji',label:'Remove emoji'},{id:'accents',label:'Remove accents'},{id:'dedup',label:'Remove duplicates'},{id:'empty',label:'Remove empty'},{id:'short',label:'Remove short'}].map((s,i)=>(
                  <button key={i} onClick={()=>setNlpPipeline(p=>[...p,{...s,uid:Date.now()+i}])} style={{padding:'5px 11px',borderRadius:'6px',fontSize:'11px',border:`1px solid ${C.border}`,background:C.surface,cursor:'pointer',color:C.text,transition:'all .12s'}}
                    onMouseOver={e=>{e.currentTarget.style.background=C.tealDim;e.currentTarget.style.borderColor=C.teal;}}
                    onMouseOut={e=>{e.currentTarget.style.background=C.surface;e.currentTarget.style.borderColor=C.border;}}>
                    + {s.label}
                  </button>
                ))}
              </div>
              {nlpPipeline.length>0?(
                <div>
                  <div style={{display:'flex',flexDirection:'column',gap:'5px',marginBottom:'12px'}}>
                    {nlpPipeline.map((step,i)=>(
                      <div key={step.uid} style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 12px',background:C.surface,borderRadius:'7px',border:`1px solid ${C.border}`}}>
                        <span style={{width:'18px',height:'18px',borderRadius:'50%',background:C.teal,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:700,flexShrink:0}}>{i+1}</span>
                        <span style={{fontSize:'12px',flex:1}}>{step.label}</span>
                        <button onClick={()=>setNlpPipeline(p=>p.filter(s=>s.uid!==step.uid))} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'14px'}}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <PBtn disabled={nlpPipRunning} style={{flex:1}} onClick={()=>runPipelineSteps(nlpPipeline)}>
                      {nlpPipRunning?'⏳ Running…':`⚡ Run ${nlpPipeline.length}-Step Pipeline`}
                    </PBtn>
                    <GBtn onClick={()=>{setNlpPipeline([]);setNlpPipLog([]);}}>Clear</GBtn>
                  </div>
                </div>
              ):(
                <div style={{padding:'24px',textAlign:'center',color:C.muted,fontSize:'12px',background:C.surface,borderRadius:'8px',border:`1px dashed ${C.border}`}}>Click steps above to build your pipeline →</div>
              )}
              {nlpPipLog.length>0&&(
                <div style={{marginTop:'12px',padding:'12px',background:'#1E1E2E',borderRadius:'8px',maxHeight:'160px',overflowY:'auto'}}>
                  {nlpPipLog.map((l,i)=><div key={i} style={{fontFamily:'monospace',fontSize:'10px',color:l.startsWith('✅')||l.startsWith('🎉')?'#A6E22E':l.startsWith('▶')?'#66D9E8':'#F8F8F2',lineHeight:1.8}}>{l}</div>)}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── EXPORT ────────────────────────────────────────────── */}
        {stats&&view==='download'&&(
          <div style={{display:'grid',gap:'12px'}}>
            <Card>
              <ST>📦 Export Dataset</ST>
              {nlpPipLog.length>0&&<div style={{padding:'10px 14px',background:C.tealDim,border:`1px solid ${C.tealBorder}`,borderRadius:'8px',marginBottom:'14px',fontSize:'12px',color:'#00956B'}}>✅ Pipeline applied — {nlpPipLog.filter(l=>l.startsWith('✅')).length} steps complete</div>}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))',gap:'10px',marginBottom:'16px'}}>
                {[{icon:'📋',title:'Labels CSV',desc:'text, label — standard ML format',fmt:'csv'},
                  {icon:'📄',title:'JSONL / HuggingFace',desc:'One JSON per line — push_to_hub ready',fmt:'hf'},
                  {icon:'📝',title:'JSON Array',desc:'Full dataset as JSON array',fmt:'json'},
                  {icon:'📃',title:'Plain TXT',desc:'[label] text — one per line',fmt:'txt'},
                  {icon:'✂️',title:'Split CSV',desc:'train/val/test column included',fmt:'split'},
                  {icon:'📊',title:'Health Report',desc:'Full HTML stats report',fmt:'report'},
                ].map(item=>(
                  <button key={item.title} onClick={()=>exportFmt(item.fmt)} style={{padding:'14px',borderRadius:'9px',border:`1px solid ${C.border}`,background:'#fff',cursor:'pointer',textAlign:'left',transition:'all .15s'}}
                    onMouseOver={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.background=C.tealDim;}}
                    onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background='#fff';}}>
                    <div style={{fontSize:'22px',marginBottom:'5px'}}>{item.icon}</div>
                    <div style={{fontWeight:700,color:C.text,fontSize:'12px',marginBottom:'2px'}}>{item.title}</div>
                    <div style={{fontSize:'10px',color:C.muted,lineHeight:1.4}}>{item.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{padding:'12px 14px',background:C.surface,borderRadius:'8px',border:`1px solid ${C.border}`,fontSize:'12px',lineHeight:1.9,marginBottom:'16px'}}>
                <strong>Summary:</strong> {stats.total} documents · {stats.classes.length} classes · {stats.avgWords} avg words · Health <span style={{color:hc,fontWeight:700}}>{stats.health}/100</span><br/>
                {stats.classes.map(c=>`${c.name} (${c.count})`).join(' · ')}<br/>
                {nlpPipLog.length>0&&<span style={{color:'#00956B'}}>✅ Pipeline applied</span>}
              </div>
              <ShareButton modality="text" fileName="nlp_dataset" rows={stats.total} cols={stats.classes.length} health={stats.health} extra={`${stats.avgWords} avg words · ${stats.classes.map(c=>c.name).join(', ')}`}/>
            </Card>
          </div>
        )}

        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    </div>
  );
}