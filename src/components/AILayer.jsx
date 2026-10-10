// src/components/AILayer.jsx — DataSmithy AI Layer
// Uses groq-sdk directly (run: npm install groq-sdk)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Groq } from 'groq-sdk';

/* ── Per-tab context ─────────────────────────────────────────────────────── */
const TAB_CONTEXT = {
  tabular: {
    import:    { tip:'💡 Drag & drop any CSV, Excel, JSON or Parquet file.', qs:['What formats are supported?','How do I connect Google Sheets?','How do I import from HuggingFace?'] },
    overview:  { tip:'📊 The health score tells you exactly what to fix.', qs:['Why is my health score low?','What does class imbalance mean?','How do I fix missing values?'] },
    grid:      { tip:'✏ Click any cell to edit inline.', qs:['How do I filter rows?','How do I delete multiple rows?','Can I add a new column?'] },
    columns:   { tip:'🎯 Set your target column before running the pipeline.', qs:['What encoding for categoricals?','How do I change column type?','What does marking ignore do?'] },
    universal: { tip:'⚡ Every operation has full undo.', qs:['How do I remove duplicates?','What is fuzzy deduplication?','How do I use regex replace?'] },
    visualize: { tip:'📈 Correlation heatmap shows feature relationships.', qs:['How do I read the heatmap?','What do outliers mean for ML?','Which chart shows class balance?'] },
    export:    { tip:'🤗 JSONL loads fastest in HuggingFace datasets.', qs:['How do I export for HuggingFace?','What is Alpaca format?','How do I share results?'] },
    pipeline:  { tip:'⚡ Run Pipeline generates Python code for sklearn/PyTorch.', qs:['What does the pipeline do?','How do I customise steps?','Where is the generated code?'] },
  },
  images: {
    import:    { tip:'📁 ZIP with subfolders auto-labels by folder name.', qs:['How do I upload a ZIP?','What image formats work?','How do I use HuggingFace datasets?'] },
    overview:  { tip:'🔴 Red metric cards = action needed.', qs:['What is a good health score?','How do I fix class imbalance?','What causes blurry images?'] },
    classes:   { tip:'✏ Renaming a class updates all images instantly.', qs:['How do I rename a class?','How do I merge two classes?','What is class imbalance?'] },
    grid:      { tip:'🖼 Click any image to open the full editor.', qs:['How do I bulk delete?','How do I move images to another class?','What do DUP BLR DRK badges mean?'] },
    quality:   { tip:'⚠ Remove duplicates before augmenting.', qs:['How are duplicates detected?','What sharpness score means blurry?','How do I remove dark images?'] },
    charts:    { tip:'📊 Use the histogram to set your resize target.', qs:['What does class distribution show?','How do I read quality metrics?','Which class needs attention?'] },
    universal: { tip:'🎨 Apply tool → Before/After shows side by side.', qs:['How do I resize images?','How do I add a watermark?','How do I strip EXIF?'] },
    augment:   { tip:'🔀 Augment minority classes to balance your dataset.', qs:['How does augmentation work?','How many augmentations to create?','How do I download variations?'] },
    split:     { tip:'📊 70/15/15 is the standard train/val/test split.', qs:['What split ratio to use?','How does stratified splitting work?','Can I change ratios?'] },
    models:    { tip:'🤖 EfficientNet B0 is the best starting point.', qs:['How do I use the PyTorch code?','What is EfficientNet?','How do I add more classes?'] },
    advanced:  { tip:'🏷 Annotate: select class → drag on image.', qs:['How do I draw bounding boxes?','How do I export YOLO?','What is COCO JSON?'] },
    pipeline:  { tip:'⚡ ML Ready preset is best for most datasets.', qs:['What does ML Ready do?','Can I build a custom pipeline?','How do I undo a pipeline?'] },
    export:    { tip:'📦 YOLO export pairs with your BBox annotations.', qs:['How do I export YOLO?','YOLO vs COCO difference?','How do I share results?'] },
  },
  text: {
    import:    { tip:'📋 JSONL is fastest for large NLP datasets.', qs:['How do I import from HuggingFace?','What CSV columns does DataSmithy expect?','How do I paste text?'] },
    overview:  { tip:'📖 Lexical diversity > 0.3 means varied quality text.', qs:['Why is my health score low?','What is lexical diversity?','How do I fix imbalance?'] },
    words:     { tip:'✏ Click the ✏ icon to edit any document inline.', qs:['How do I bulk relabel?','How do I search by content?','How do I delete a document?'] },
    universal: { tip:'🔄 Remove duplicates before training.', qs:['How are text duplicates detected?','What counts as too short?','How do I remove empty docs?'] },
    clean:     { tip:'📊 Skewed length distributions signal quality issues.', qs:['How do I read the length histogram?','What is a good word frequency?','Which class has issues?'] },
    visualize: { tip:'🤖 Auto-Label + Sentiment labels thousands in seconds.', qs:['How does sentiment work?','How do I use auto-label?','What entities does NER detect?'] },
    export:    { tip:'🔧 Preview Before/After before committing any operation.', qs:['How do I remove stopwords?','What does expand contractions do?','How do I use regex?'] },
    translate: { tip:'✂ Stratified splitting keeps class proportions.', qs:['What split ratio to use?','How does stratified splitting work?','What is the default?'] },
    mlcode:    { tip:'🤗 sklearn + TF-IDF is fastest to train.', qs:['Which framework to start with?','How do I use the BERT code?','Where do I run it?'] },
    pipeline:  { tip:'🧹 Deep Clean applies all 10 steps.', qs:['What does BERT Ready do?','How do I build a custom pipeline?','What does each step remove?'] },
    download:  { tip:'📄 Split CSV has a train/val/test column.', qs:['How do I export for HuggingFace?','What is JSONL format?','How do I share results?'] },
  },
};

const SYSTEM_PROMPT = `You are DataSmithy AI — a concise, expert data science assistant embedded in the DataSmithy platform.

DataSmithy is a free browser-based ML data platform with three modalities:
• Tabular — CSV/Excel/JSON/Parquet. Tabs: Import, Overview, Data Grid, Columns, Universal Clean, Visualize, Export, Pipeline.
• Images — 13 tabs: Import, Overview, Classes, Browse, Quality, Charts, Tools, Augment, Split, ML Code, Advanced, Pipeline, Export.
• Text/NLP — 11 tabs: Import, Overview, Documents, Quality, Charts, Analyse, Tools (14 clean ops), Split, ML Code, Pipeline, Export.

Health Score: 0-100. Deductions: missing values, duplicates, class imbalance, empty docs, blurry/dark images.
Always name the exact tab and button to click. Keep answers under 100 words unless asked for more.`;

/* ── Typing dots ─────────────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div style={{ display:'flex', gap:'4px', padding:'2px 0' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:'6px', height:'6px', borderRadius:'50%', background:'#00CBA8',
          animation:`db 1.2s ${i*0.2}s ease-in-out infinite`,
        }}/>
      ))}
      <style>{`@keyframes db{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}

/* ── Message bubble ──────────────────────────────────────────────────────── */
function Bubble({ m }) {
  const u = m.role === 'user';
  return (
    <div style={{ display:'flex', justifyContent:u?'flex-end':'flex-start', marginBottom:'9px' }}>
      {!u && (
        <div style={{
          width:'24px', height:'24px', borderRadius:'50%', flexShrink:0,
          marginRight:'7px', marginTop:'2px', color:'#fff',
          background:'linear-gradient(135deg,#00CBA8,#6366F1)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px',
        }}>✨</div>
      )}
      <div style={{
        maxWidth:'82%', padding:'9px 12px', fontSize:'12px', lineHeight:1.72,
        borderRadius: u ? '13px 13px 4px 13px' : '13px 13px 13px 4px',
        background: u ? 'linear-gradient(135deg,#00CBA8,#0EA5E9)' : '#F8FAFC',
        color: u ? '#fff' : '#1E293B',
        border: u ? 'none' : '1px solid #E2E8F0',
        whiteSpace:'pre-wrap',
      }}>{m.content}</div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function AILayer({ modality, activeTab, analysis, stats }) {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');
  const [tab,     setTab]     = useState('chat');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const groqRef   = useRef(null);

  const currentTab = activeTab || 'import';
  const ctx = TAB_CONTEXT[modality]?.[currentTab] || { tip:'Ask me anything about DataSmithy!', qs:[] };

  // Init Groq client from env var (runs in browser with dangerouslyAllowBrowser)
  useEffect(() => {
    const key = import.meta.env?.VITE_GROQ_API_KEY;
    if (key) {
      groqRef.current = new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
    }
  }, []);

  // Reset chat when tab changes
  useEffect(() => {
    setMsgs([]);
    setErr('');
  }, [modality, currentTab]);

  // Welcome message on open
  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{
        role:'assistant',
        content:`✨ Hi! I'm DataSmithy AI — I know every tab and feature.\n\nYou're on ${modality} › ${currentTab}.\n${ctx.tip}\n\nTry a quick question below or ask anything!`,
      }]);
    }
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [msgs, loading]);

  // Focus input
  useEffect(() => {
    if (open && tab === 'chat') setTimeout(() => inputRef.current?.focus(), 250);
  }, [open, tab]);

  const send = useCallback(async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    if (!text) setInput('');
    setErr('');

    const dsCtx = analysis
      ? `[Tabular: ${analysis.rows||0} rows, ${analysis.cols||0} cols, health ${analysis.health||0}/100]`
      : stats
      ? `[Images: ${stats.total||0} images, ${stats.classes?.length||0} classes, health ${stats.health||0}/100]`
      : '';

    const history = [...msgs, { role:'user', content:q }];
    setMsgs(history);
    setLoading(true);

    // Check Groq client
    if (!groqRef.current) {
      setMsgs(prev => [...prev, {
        role:'assistant',
        content:'⚠ No API key found. Add VITE_GROQ_API_KEY=gsk_xxx to your .env.local file and restart npm start.',
      }]);
      setLoading(false);
      return;
    }

    try {
      const runtimeCtx = `\n[User Context: Modality=${modality}, Tab=${currentTab}${dsCtx ? ', ' + dsCtx : ''}]`;

      // Try models in order until one works
      const MODELS = [
        'llama-3.1-8b-instant',
        'llama3-groq-8b-8192-tool-use-preview',
        'gemma2-9b-it',
        'gemma-7b-it',
        'mixtral-8x7b-32768',
        'llama-3.3-70b-versatile',
        'llama3-8b-8192',
        'llama-3.3-70b-versatile-8k',
        'meta-llama/llama-4-scout-17b-16e-instruct',
        'meta-llama/llama-4-maverick-17b-128e-instruct',
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'qwen/qwen3-32b',
        'moonshotai/kimi-k2-instruct-0905'
      ];

      let reply = '';
      let lastErr = '';
      for (const model of MODELS) {
        try {
          const response = await groqRef.current.chat.completions.create({
            model,
            messages: [
              { role:'system', content: SYSTEM_PROMPT + runtimeCtx },
              ...history.map(m => ({ role:m.role, content:m.content })),
            ],
            max_tokens: 400,
            temperature: 0.55,
          });
          reply = response.choices?.[0]?.message?.content || '';
          if (reply) break; // success
        } catch (modelErr) {
          lastErr = modelErr.message || '';
          // 404 or decommissioned → try next model
          if (lastErr.includes('404') || lastErr.includes('not found') || 
              lastErr.includes('decommissioned') || lastErr.includes('does not exist') ||
              lastErr.includes('no access')) {
            continue;
          }
          throw modelErr; // 401/429/network → rethrow immediately
        }
      }
      if (!reply) throw new Error(lastErr || 'No available model found in your Groq account');
      setMsgs(prev => [...prev, { role:'assistant', content:reply }]);
    } catch (e) {
      const msg = e.message || '';
      let friendly = msg;
      if (msg.includes('401')) friendly = 'Invalid API key — check console.groq.com → API Keys';
      if (msg.includes('429')) friendly = 'Rate limit hit — wait a moment (30 req/min on free tier)';
      if (msg.includes('decommissioned')) friendly = 'Model unavailable — contact support';
      setMsgs(prev => [...prev, { role:'assistant', content:`⚠ ${friendly}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, msgs, loading, modality, currentTab, analysis, stats]);

  const onKey = e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  // Insights data
  const insights = [];
  if (analysis?.health !== undefined) {
    const h = analysis.health;
    insights.push({ icon:h>=80?'🟢':h>=60?'🟡':'🔴', label:'Health score', val:`${h}/100`, tip:h<70?'Run Universal Clean':'Dataset looks good' });
    if ((analysis.missing_pct||0) > 5) insights.push({ icon:'⚠', label:'Missing values', val:`${analysis.missing_pct?.toFixed(1)}%`, tip:'Fill with imputation in Universal Clean' });
    if ((analysis.duplicate_rows||0) > 0) insights.push({ icon:'🔄', label:'Duplicates', val:analysis.duplicate_rows, tip:'Remove in Universal Clean' });
  }
  if (stats?.health !== undefined) {
    const h = stats.health;
    insights.push({ icon:h>=80?'🟢':h>=60?'🟡':'🔴', label:'Image health', val:`${h}/100`, tip:h<70?'Check Quality tab':'Looking good' });
    if ((stats.dupeCount||0)>0)   insights.push({ icon:'🔄', label:'Duplicates', val:stats.dupeCount, tip:'Remove in Quality tab' });
    if ((stats.blurryCount||0)>0) insights.push({ icon:'💧', label:'Blurry', val:stats.blurryCount, tip:'Remove in Quality tab' });
    if ((stats.darkCount||0)>0)   insights.push({ icon:'🌑', label:'Dark images', val:stats.darkCount, tip:'Remove in Quality tab' });
  }
  if (!insights.length) insights.push({ icon:'💡', label:'Import data to see insights', val:'', tip:'Upload a file in the Import tab' });

  return (
    <>
      {/* ── Floating trigger button — bottom-left ── */}
      <div style={{ position:'fixed', bottom:'24px', left:'24px', zIndex:9100 }}>
        {!open && (
          <div style={{
            position:'absolute', inset:'-5px', borderRadius:'56px',
            border:'2px solid rgba(0,203,168,.45)',
            animation:'aiRing 2.2s ease-in-out infinite',
            pointerEvents:'none',
          }}/>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          data-tour="help-chat"
          style={{
            display:'flex', alignItems:'center', gap:'9px',
            padding:'11px 20px', borderRadius:'50px', cursor:'pointer',
            background:'linear-gradient(135deg,#0D9488,#4F46E5)',
            color:'#fff', border:'none',
            boxShadow: open
              ? '0 6px 28px rgba(0,203,168,.5)'
              : '0 4px 20px rgba(0,0,0,.45), 0 0 0 1px rgba(0,203,168,.4)',
            transition:'all .25s cubic-bezier(.34,1.56,.64,1)',
          }}
          onMouseOver={e => { e.currentTarget.style.transform='scale(1.06)'; }}
          onMouseOut={e  => { e.currentTarget.style.transform='scale(1)'; }}
        >
          <div style={{
            width:'28px', height:'28px', borderRadius:'50%',
            background:'rgba(255,255,255,.2)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px',
          }}>✨</div>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:'12px', fontWeight:800, color:'#fff', lineHeight:1.2 }}>
              {open ? 'Close AI' : 'DataSmithy AI'}
            </div>
            {!open && (
              <div style={{ fontSize:'9px', color:'rgba(255,255,255,.75)', fontWeight:600 }}>
                Ask about your data →
              </div>
            )}
          </div>
        </button>
      </div>

      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position:'fixed', bottom:'90px', left:'24px', zIndex:9100,
          width:'340px', maxWidth:'calc(100vw - 48px)',
          background:'#fff', borderRadius:'20px',
          boxShadow:'0 20px 64px rgba(0,0,0,.18)',
          border:'1px solid #E2E8F0',
          display:'flex', flexDirection:'column',
          animation:'aiIn .25s cubic-bezier(.34,1.56,.64,1)',
          overflow:'hidden', maxHeight:'calc(100vh - 120px)',
        }}>

          {/* Header */}
          <div style={{
            background:'linear-gradient(135deg,#0D9488,#4F46E5)',
            padding:'13px 16px', display:'flex', alignItems:'center', gap:'10px', flexShrink:0,
          }}>
            <div style={{
              width:'30px', height:'30px', borderRadius:'50%',
              background:'rgba(255,255,255,.2)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', flexShrink:0,
            }}>✨</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, color:'#fff', fontSize:'13px' }}>DataSmithy AI</div>
              <div style={{ fontSize:'9px', color:'rgba(255,255,255,.75)', display:'flex', alignItems:'center', gap:'4px' }}>
                <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#A7F3D0' }}/>
                {modality} › {currentTab} · Llama 3.3 · Free
              </div>
            </div>
            <button onClick={() => { setMsgs([]); setErr(''); }} style={{
              background:'rgba(255,255,255,.18)', border:'none', borderRadius:'7px',
              padding:'4px 10px', color:'#fff', fontSize:'10px', cursor:'pointer', fontWeight:700,
            }}>Clear</button>
          </div>

          {/* Sub-tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid #F1F5F9', flexShrink:0 }}>
            {['chat','insights'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex:1, padding:'9px', border:'none', cursor:'pointer',
                fontSize:'11px', fontWeight:700, background:'transparent',
                borderBottom: tab===t ? '2px solid #00CBA8' : '2px solid transparent',
                color: tab===t ? '#00CBA8' : '#94A3B8', transition:'all .15s',
              }}>
                {t==='chat' ? '💬 Chat' : '📊 Insights'}
              </button>
            ))}
          </div>

          {/* Chat tab */}
          {tab==='chat' && (
            <>
              <div style={{ flex:1, overflowY:'auto', padding:'12px', minHeight:'180px', maxHeight:'320px' }}>
                {msgs.length===0 && (
                  <div style={{ textAlign:'center', color:'#94A3B8', marginTop:'30px', fontSize:'12px' }}>
                    ✨ How can I help you transform your dataset today?
                  </div>
                )}
                {msgs.map((m,i) => <Bubble key={i} m={m}/>)}
                {loading && (
                  <div style={{ display:'flex', alignItems:'flex-start', marginBottom:'9px' }}>
                    <div style={{
                      width:'24px', height:'24px', borderRadius:'50%',
                      background:'linear-gradient(135deg,#00CBA8,#6366F1)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'12px', marginRight:'7px', marginTop:'2px', flexShrink:0, color:'#fff',
                    }}>✨</div>
                    <div style={{ padding:'9px 12px', borderRadius:'13px 13px 13px 4px', background:'#F8FAFC', border:'1px solid #E2E8F0' }}>
                      <TypingDots/>
                    </div>
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>

              {/* Quick questions */}
              {ctx.qs.length > 0 && msgs.length <= 1 && !loading && (
                <div style={{ padding:'0 12px 10px', display:'flex', flexWrap:'wrap', gap:'5px' }}>
                  {ctx.qs.map(q => (
                    <button key={q} onClick={() => send(q)} style={{
                      padding:'5px 10px', borderRadius:'20px', border:'1px solid #E2E8F0',
                      background:'#F8FAFC', color:'#475569', fontSize:'10px',
                      fontWeight:600, cursor:'pointer', textAlign:'left', transition:'all .15s',
                    }}
                      onMouseOver={e => { e.currentTarget.style.borderColor='#00CBA8'; e.currentTarget.style.color='#00956B'; }}
                      onMouseOut={e  => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.color='#475569'; }}
                    >{q}</button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div style={{ padding:'9px 12px 13px', borderTop:'1px solid #F1F5F9', flexShrink:0 }}>
                <div style={{ display:'flex', gap:'7px', alignItems:'flex-end' }}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onKey}
                    placeholder={`Ask about ${currentTab}…`}
                    rows={1}
                    style={{
                      flex:1, resize:'none', border:'1px solid #E2E8F0', borderRadius:'11px',
                      padding:'8px 11px', fontSize:'12px', color:'#0F172A', outline:'none',
                      fontFamily:'inherit', lineHeight:1.5, maxHeight:'72px', overflowY:'auto',
                    }}
                    onFocus={e  => e.target.style.borderColor='#00CBA8'}
                    onBlur={e   => e.target.style.borderColor='#E2E8F0'}
                  />
                  <button onClick={() => send()} disabled={!input.trim()||loading} style={{
                    width:'34px', height:'34px', borderRadius:'9px', border:'none', flexShrink:0,
                    background: input.trim()&&!loading ? 'linear-gradient(135deg,#00CBA8,#6366F1)' : '#E2E8F0',
                    color: input.trim()&&!loading ? '#fff' : '#94A3B8',
                    cursor: input.trim()&&!loading ? 'pointer' : 'default',
                    fontSize:'15px', display:'flex', alignItems:'center', justifyContent:'center',
                  }}>{loading ? '⏳' : '↑'}</button>
                </div>
                <div style={{ fontSize:'9px', color:'#CBD5E1', marginTop:'5px', textAlign:'center' }}>
                  Groq Llama 3.3 · 14,400 free req/day · data stays in browser
                </div>
              </div>
            </>
          )}

          {/* Insights tab */}
          {tab==='insights' && (
            <div style={{ flex:1, overflowY:'auto', padding:'12px', minHeight:'200px' }}>
              <div style={{ fontSize:'10px', color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px' }}>
                AI Insights — {modality} › {currentTab}
              </div>
              {insights.map((ins,i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'flex-start', gap:'10px',
                  background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:'10px',
                  padding:'11px 13px', marginBottom:'8px',
                }}>
                  <div style={{ fontSize:'18px', flexShrink:0 }}>{ins.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:'#0F172A', fontSize:'12px' }}>
                      {ins.label}{ins.val ? ` — ${ins.val}` : ''}
                    </div>
                    <div style={{ fontSize:'11px', color:'#64748B', marginTop:'2px' }}>{ins.tip}</div>
                  </div>
                  <button onClick={() => { setTab('chat'); send(`Tell me more about: ${ins.label}`); }} style={{
                    background:'rgba(0,203,168,.1)', border:'1px solid rgba(0,203,168,.25)',
                    borderRadius:'7px', padding:'4px 9px', fontSize:'10px',
                    color:'#00956B', cursor:'pointer', fontWeight:700, flexShrink:0,
                  }}>Ask AI</button>
                </div>
              ))}
              <div style={{
                padding:'10px 13px', background:'rgba(0,203,168,.04)',
                border:'1px dashed rgba(0,203,168,.25)', borderRadius:'10px',
              }}>
                <div style={{ fontSize:'11px', color:'#00956B', fontWeight:700, marginBottom:'4px' }}>💡 Tip</div>
                <div style={{ fontSize:'11px', color:'#64748B', lineHeight:1.6 }}>{ctx.tip}</div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes aiIn {
          from { opacity:0; transform:scale(.9) translateY(14px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes aiRing {
          0%,100% { transform:scale(1); opacity:.5; }
          50%      { transform:scale(1.07); opacity:.12; }
        }
      `}</style>
    </>
  );
}