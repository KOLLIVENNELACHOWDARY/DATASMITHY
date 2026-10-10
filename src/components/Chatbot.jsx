// src/components/HelpChatbot.jsx
// Real AI support — uses /api/chat proxy (Vercel serverless) with FAQ fallback

import React, { useState, useRef, useEffect } from 'react';

// ── Instant FAQ for common questions (works offline/localhost) ────────────────
const FAQ = [
  { q:['upload','import','add file','open csv','load data'], a:'Go to **📊 Tabular Data** → **📥 Import** tab. Drag & drop your file or click Browse. Supports CSV, Excel, JSON, Parquet. After upload you automatically land on **Overview**.' },
  { q:['image','upload image','image tab','image dataset'], a:'Click **🖼 Images** at the top → **📥 Import** → drag images or a ZIP with class subfolders. You\'ll see health score, class balance, brightness, quality stats automatically.' },
  { q:['text','nlp','upload text','text dataset'], a:'Click **📝 Text/NLP** → **📥 Import** → paste text, upload CSV, load from URL, or pick a sample. Supports sentiment, readability, NER, word cloud, translation, and LLM export formats.' },
  { q:['translate','translation'], a:'Go to **Text/NLP** → **🌍 Translate** tab. 50+ languages. Completely free, no API key. Uses MyMemory API.' },
  { q:['connect','huggingface','github','url','external source'], a:'Every modality has **🔌 Connect** tab. Import from HuggingFace (100k+ datasets, no key needed), any public URL, GitHub files, or paste CSV text.' },
  { q:['clean','cleaning','fix data','format'], a:'Go to **✨ Clean** tab. 15 string ops, 14 format standardizers, formula columns, fuzzy dedup, validation, join datasets, Finance tools (P&L, reconciliation, cash flow), full audit trail.' },
  { q:['ml','machine learning','pipeline','encode','scale'], a:'Click **ML Preparation** toggle → unlocks 🔬 ML Clean → 🔤 Encode → ⚖ Scale → ⚙ Features → 🤖 ML Ready → 💾 Presets. Click **⚡ Run Pipeline** to process.' },
  { q:['export','download','save'], a:'Go to **📦 Export** tab after running the pipeline. Download processed CSV, Python code (PyTorch/TF/sklearn/HuggingFace), or share via social media.' },
  { q:['share','linkedin','twitter','whatsapp','social media'], a:'Go to **Export** tab → scroll to **🚀 Share Results**. Twitter and WhatsApp open pre-filled. LinkedIn and Instagram copy the post text — paste it manually.' },
  { q:['sign out','logout','signout'], a:'Click the red **Sign Out** button in the top-right navbar. You\'ll be taken back to the home page.' },
  { q:['sign in','login','account'], a:'Click **Sign In** top-right. All features work WITHOUT an account. Sign in to unlock: session history, dashboard, and one-click redo.' },
  { q:['dashboard','history','past'], a:'Click **📋 Dashboard** in the navbar (when signed in). Shows all past uploads across all modalities. Click **↩ Redo** to reload any session.' },
  { q:['face','face detection'], a:'**Images** → **🧪 Advanced** → Face Detection → click **Load Model** then **Scan**. Runs entirely in your browser using TinyFaceDetector (~2MB model).' },
  { q:['free','cost','price'], a:'DataSmithy is completely **FREE** — no credit card, no account needed to try. All data stays in your browser.' },
  { q:['safe','privacy','data'], a:'Your data **never leaves your browser**. All processing runs locally. Only session metadata (filename, row count, health score) is saved to Firebase when signed in.' },
  { q:['tour','guide','tutorial'], a:'Click **🗺 Tour** in the top navbar for a 12-step guided tour with spotlight highlights on every feature.' },
  { q:['health','health score','quality score'], a:'The health score (0–100) measures dataset quality: missing values, duplicates, class imbalance, format issues. 80+ is good. The overview shows exactly what was flagged.' },
];

function quickAnswer(q) {
  const lower = q.toLowerCase();
  return FAQ.find(f => f.q.some(kw => lower.includes(kw)))?.a || null;
}

function renderMd(text) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/\*\*([^*]+)\*\*/g);
    return (
      <div key={i} style={{ marginBottom:line.trim()?'4px':'2px' }}>
        {parts.map((part, j) =>
          j % 2 === 1
            ? <strong key={j} style={{ color:'#0F172A' }}>{part}</strong>
            : part
        )}
      </div>
    );
  });
}

const STARTERS = [
  'How do I upload a CSV?',
  'How does the Image tab work?',
  'How do I translate my text dataset?',
  'How does sign out work?',
  'What is ML Mode?',
  'Is my data safe?',
  'How do I share results?',
  'How do I use HuggingFace connector?',
];

export default function HelpChatbot() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { role:'bot', text:'👋 Hi! I\'m the DataSmithy AI support assistant.\n\nAsk me anything — I\'ll answer instantly for common questions, or use AI for anything else!', loading:false }
  ]);
  const [input,    setInput]    = useState('');
  const [thinking, setThinking] = useState(false);
  const [history,  setHistory]  = useState([]); // for AI context
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages, open]);

  const send = async (q) => {
    const question = (q || input).trim();
    if (!question || thinking) return;
    setInput('');

    // Add user message
    const newHistory = [...history, { role:'user', content:question }];
    setHistory(newHistory);
    setMessages(prev => [...prev, { role:'user', text:question }]);
    setThinking(true);

    // 1. Try instant FAQ answer first
    const instant = quickAnswer(question);
    if (instant) {
      setMessages(prev => [...prev, { role:'bot', text:instant }]);
      setHistory(h => [...h, { role:'assistant', content:instant }]);
      setThinking(false);
      return;
    }

    // 2. Try AI via /api/chat proxy
    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({ messages: newHistory }),
        signal:  AbortSignal.timeout(20000),
      });

      if (res.ok) {
        const data  = await res.json();
        const reply = data.reply || 'I\'m not sure about that. Try rephrasing your question!';
        setMessages(prev => [...prev, { role:'bot', text:reply }]);
        setHistory(h => [...h, { role:'assistant', content:reply }]);
      } else {
        throw new Error('API unavailable');
      }
    } catch {
      // 3. Fallback generic answer
      const fallback = `I don't have a specific answer for that, but here are some helpful tips:\n\n• Use the **🗺 Tour** button in the navbar for a guided walkthrough\n• Check the **📊 Overview** tab after uploading for dataset insights\n• The **✨ Clean** tab handles most data quality issues\n• The **🔌 Connect** tab imports from HuggingFace, GitHub, or any URL\n\nTry asking about a specific feature like "How do I clean my data?" or "How does the image tab work?"`;
      setMessages(prev => [...prev, { role:'bot', text:fallback }]);
    }
    setThinking(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position:'fixed', bottom:'20px', right:'20px', zIndex:1000,
          width:'52px', height:'52px', borderRadius:'50%',
          background:'linear-gradient(135deg,#00CBA8,#0D9488)',
          border:'none', cursor:'pointer', fontSize:'22px',
          boxShadow:'0 4px 16px rgba(0,203,168,.4)',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'transform .2s',
        }}
        onMouseOver={e => e.currentTarget.style.transform='scale(1.1)'}
        onMouseOut={e  => e.currentTarget.style.transform='scale(1)'}
        title="Help & Support"
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position:'fixed', bottom:'82px', right:'20px', zIndex:1000,
          width:'360px', maxWidth:'calc(100vw - 40px)',
          background:'#fff', borderRadius:'16px',
          boxShadow:'0 8px 40px rgba(0,0,0,.15)',
          display:'flex', flexDirection:'column', height:'480px',
          border:'1px solid var(--border)',
        }}>
          {/* Header */}
          <div style={{ padding:'14px 16px', background:'linear-gradient(135deg,#00CBA8,#0D9488)', color:'#fff', borderRadius:'16px 16px 0 0', flexShrink:0 }}>
            <div style={{ fontWeight:700, fontSize:'14px' }}>💬 DataSmithy Support</div>
            <div style={{ fontSize:'11px', opacity:.85 }}>AI-powered · Ask anything about the platform</div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:'10px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
                <div style={{
                  maxWidth:'88%', padding:'9px 13px',
                  borderRadius:m.role==='user'?'12px 12px 3px 12px':'12px 12px 12px 3px',
                  background:m.role==='user'?'#00CBA8':'#F8FAFC',
                  color:m.role==='user'?'#fff':'#0F172A',
                  fontSize:'12px', lineHeight:1.65,
                  border:m.role==='bot'?'1px solid #E2E8F0':'none',
                }}>
                  {m.role==='bot' ? renderMd(m.text) : m.text}
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {thinking && (
              <div style={{ display:'flex', gap:'4px', padding:'10px 14px', background:'#F8FAFC', borderRadius:'12px 12px 12px 3px', width:'fit-content', border:'1px solid #E2E8F0' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#00CBA8', animation:`bounce 1s ease-in-out ${i*0.15}s infinite` }}/>
                ))}
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Quick starters */}
          {messages.length <= 2 && (
            <div style={{ padding:'0 12px 8px', display:'flex', gap:'5px', flexWrap:'wrap', flexShrink:0 }}>
              {STARTERS.slice(0, 4).map(q => (
                <button key={q} onClick={() => send(q)} style={{ padding:'4px 10px', borderRadius:'5px', border:'1px solid var(--border)', background:'#F8FAFC', fontSize:'10px', cursor:'pointer', color:'#64748B' }}>{q}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', display:'flex', gap:'8px', flexShrink:0 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
              placeholder="Ask anything about DataSmithy…"
              disabled={thinking}
              style={{ flex:1, padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border)', fontSize:'12px', outline:'none' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || thinking}
              style={{ background:'#00CBA8', border:'none', borderRadius:'8px', padding:'8px 14px', fontSize:'16px', cursor:'pointer', color:'#fff', opacity:(!input.trim()||thinking)?0.5:1, transition:'opacity .15s' }}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
      `}</style>
    </>
  );
}