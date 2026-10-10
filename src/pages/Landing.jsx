// src/pages/Landing.jsx — Updated with all DataSmithy modalities
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const FEATURES = [
  { icon:'⬆',  title:'Import Anything',     desc:'CSV, Excel, JSON, Parquet, Google Sheets, Kaggle, HuggingFace, GitHub, REST API, or any public URL.' },
  { icon:'📊', title:'Instant EDA',          desc:'Column types, missing values, outliers, correlations and health score — all in one click.' },
  { icon:'🧹', title:'Universal Clean',      desc:'15 string ops, 14 format standardizers, formula columns, fuzzy dedup, finance tools (P&L, reconciliation).' },
  { icon:'🖼', title:'Image Dataset EDA',    desc:'Class balance, duplicates, brightness, sharpness, augmentation preview — COCO/YOLO/TFRecord export.' },
  { icon:'📝', title:'Text / NLP',           desc:'Sentiment, readability, NER, word cloud, concordance, translation in 50+ languages — free.' },
  { icon:'🌍', title:'Translate Datasets',   desc:'Translate any text dataset into 50+ languages. Completely free, no API key needed.' },
  { icon:'👤', title:'AI Face Detection',    desc:'TinyFaceDetector runs in your browser — flag portrait images, check privacy compliance.' },
  { icon:'🔌', title:'Connect Anywhere',     desc:'HuggingFace, Kaggle, GitHub, REST API, Google Sheets — available for all 3 modalities.' },
  { icon:'🔤', title:'Encoding',             desc:'Label, One-Hot, Frequency, Ordinal — auto-recommended per column type.' },
  { icon:'⚖', title:'Scaling',              desc:'StandardScaler, MinMax, Robust — chosen based on your data distribution.' },
  { icon:'⚙', title:'Feature Engineering',  desc:'Datetime extraction, log transforms, binning, PCA, drop correlated features.' },
  { icon:'📦', title:'Export Everything',    desc:'Processed CSV, BERT/OpenAI/Alpaca format, COCO/YOLO, Python sklearn code, JSON report.' },
];

const STEPS = [
  { n:'01', icon:'⬆',  title:'Upload',    desc:'Drop any CSV, Excel, image ZIP, or text file. Or connect to HuggingFace, Kaggle, GitHub, REST API.' },
  { n:'02', icon:'📊', title:'Analyze',   desc:'DataSmithy runs full EDA — health score, missing values, class balance, sentiment, and more.' },
  { n:'03', icon:'⚙', title:'Configure', desc:'Review auto-recommendations. Clean, encode, scale, or apply ML pipeline with one click.' },
  { n:'04', icon:'📦', title:'Export',    desc:'Download processed data + ML-ready code in PyTorch, TensorFlow, HuggingFace, or sklearn format.' },
];

const STATS = [
  { val:'3',      label:'Data Modalities',   sub:'Tabular · Images · Text' },
  { val:'50+',    label:'Languages',          sub:'Free translation' },
  { val:'100k+',  label:'HuggingFace Datasets', sub:'One-click import' },
  { val:'Free',   label:'Forever',            sub:'No credit card needed' },
];

const USECASES = [
  { icon:'🤖', title:'ML Engineers',     desc:'Preprocess, encode, scale and export ML-ready datasets with auto-generated PyTorch/TF code.' },
  { icon:'📊', title:'Analysts',         desc:'Clean messy spreadsheets, fix nulls, standardize formats, build P&L reports.' },
  { icon:'📸', title:'Photographers',    desc:'Batch resize, watermark, strip EXIF/GPS, check WCAG accessibility for image sets.' },
  { icon:'📰', title:'Journalists',      desc:'Translate articles, extract entities, analyze sentiment across document collections.' },
  { icon:'🎓', title:'Students',         desc:'Learn data preprocessing visually with real feedback on real datasets.' },
  { icon:'💼', title:'Business Teams',   desc:'Finance tools: P&L summary, reconciliation, cash flow — no code needed.' },
  { icon:'🛒', title:'E-commerce',       desc:'Check image consistency, white backgrounds, watermarks, EXIF data at scale.' },
  { icon:'🔬', title:'Researchers',      desc:'Readability analysis, concordance, text similarity, vocabulary difficulty scoring.' },
];

export default function Landing() {
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh' }}>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section style={{ padding:'70px 20px 60px', maxWidth:'1000px', margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'48px', alignItems:'center' }}>
          <div>
            <div style={{ marginBottom:'16px', fontSize:'15px', color:'var(--text)', fontWeight:500 }}>
              {user
                ? `👋 Welcome back, ${user.displayName?.split(' ')[0] || user.email?.split('@')[0]}!`
                : '👋 Hey there!'}
            </div>
            <div style={{ display:'inline-flex', gap:'8px', marginBottom:'18px', flexWrap:'wrap' }}>
              <div style={{ background:'rgba(0,203,168,.12)', border:'1px solid rgba(0,203,168,.3)', borderRadius:'20px', padding:'4px 14px', fontSize:'11px', color:'var(--teal)', fontWeight:700 }}>✅ Free</div>
              <div style={{ background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.3)', borderRadius:'20px', padding:'4px 14px', fontSize:'11px', color:'#3B82F6', fontWeight:700 }}>🌐 3 Modalities</div>
              <div style={{ background:'rgba(139,92,246,.1)', border:'1px solid rgba(139,92,246,.3)', borderRadius:'20px', padding:'4px 14px', fontSize:'11px', color:'#8B5CF6', fontWeight:700 }}>🔒 Browser-only</div>
            </div>
            <h1 style={{ fontSize:'clamp(26px,4vw,44px)', fontWeight:800, lineHeight:1.15, marginBottom:'16px', color:'var(--text)' }}>
              Clean & Prepare<br/>
              <span style={{ color:'var(--teal)' }}>Any Dataset</span> — Free
            </h1>
            <p style={{ fontSize:'14px', color:'var(--muted)', lineHeight:1.8, marginBottom:'18px' }}>
              Tabular data, image datasets, or text collections — DataSmithy handles all three.
              Analyze, clean, transform and export in ML-ready formats entirely in your browser.
            </p>
            {/* Modality pills */}
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'24px' }}>
              {[['📊','Tabular','CSV·Excel·JSON','#00CBA8'],['🖼','Images','JPG·PNG·ZIP','#3B82F6'],['📝','Text/NLP','TXT·MD·paste','#8B5CF6']].map(([icon,label,sub,color])=>(
                <div key={label} style={{ padding:'8px 14px', background:`${color}10`, border:`1px solid ${color}40`, borderRadius:'8px', fontSize:'12px' }}>
                  <span style={{ fontWeight:700, color }}>{icon} {label}</span>
                  <span style={{ color:'var(--muted)', marginLeft:'6px', fontSize:'10px' }}>{sub}</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'20px' }}>
              <button className="btn-primary" onClick={() => navigate('/app')} style={{ fontSize:'14px', padding:'12px 28px', borderRadius:'7px' }}>
                ⚡ Launch Free →
              </button>
              {!user
                ? <button onClick={() => navigate('/login')} style={{ background:'#fff', color:'var(--text)', border:'1px solid var(--border)', borderRadius:'7px', padding:'12px 22px', fontSize:'13px', cursor:'pointer' }}>Sign In</button>
                : <button onClick={() => navigate('/dashboard')} style={{ background:'#fff', color:'var(--teal)', border:'1px solid rgba(0,203,168,.3)', borderRadius:'7px', padding:'12px 22px', fontSize:'13px', cursor:'pointer', fontWeight:600 }}>My Dashboard →</button>
              }
            </div>
            {!user && (
              <div style={{ padding:'10px 14px', background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.2)', borderRadius:'8px', fontSize:'11px', color:'var(--muted)', lineHeight:1.8 }}>
                <strong style={{ color:'var(--text)' }}>✨ Sign in to unlock:</strong>{' '}
                📋 Processing history · 📊 Personal dashboard · 🔄 Re-run past sessions
              </div>
            )}
          </div>

          {/* Product mockup — updated to show 3 modalities */}
          <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'14px', overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,.08)' }}>
            <div style={{ background:'#F8FAFC', padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ display:'flex', gap:'5px' }}>
                {['#FF5F57','#FEBC2E','#28C840'].map(c=><div key={c} style={{ width:'10px', height:'10px', borderRadius:'50%', background:c }}/>)}
              </div>
              <div style={{ flex:1, background:'var(--border)', borderRadius:'5px', height:'18px', display:'flex', alignItems:'center', padding:'0 10px' }}>
                <span style={{ fontSize:'9px', color:'var(--muted)' }}>datasmithy.vercel.app</span>
              </div>
            </div>
            {/* Modality bar */}
            <div style={{ background:'#fff', borderBottom:'2px solid var(--border)', padding:'0 12px', display:'flex', gap:'0' }}>
              {[['📊','Tabular Data',true],['🖼','Images',false],['📝','Text / NLP',false]].map(([icon,label,active])=>(
                <div key={label} style={{ padding:'10px 14px', fontSize:'10px', fontWeight:active?700:400, color:active?'var(--teal)':'var(--muted)', borderBottom:active?'2px solid var(--teal)':'2px solid transparent', marginBottom:'-2px', whiteSpace:'nowrap' }}>
                  {icon} {label}
                </div>
              ))}
            </div>
            {/* Sub-tabs */}
            <div style={{ background:'#F8FAFC', borderBottom:'1px solid var(--border)', padding:'6px 12px', display:'flex', gap:'4px', overflowX:'auto' }}>
              {['📥 Import','📈 Overview','📊 Data Grid','✨ Clean','📉 Visualize','📦 Export'].map((t,i)=>(
                <div key={t} style={{ padding:'4px 10px', borderRadius:'4px', fontSize:'9px', fontWeight:i===1?700:400, background:i===1?'rgba(0,203,168,.15)':'transparent', color:i===1?'var(--teal)':'var(--muted)', whiteSpace:'nowrap', border:i===1?'1px solid rgba(0,203,168,.3)':'none' }}>{t}</div>
              ))}
            </div>
            <div style={{ padding:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px', alignItems:'center' }}>
                <span style={{ fontSize:'11px', color:'var(--muted)' }}>Dataset Health</span>
                <span style={{ fontSize:'11px', fontWeight:700, color:'var(--teal)' }}>97/100</span>
              </div>
              <div style={{ height:'6px', background:'#E2E8F0', borderRadius:'3px', marginBottom:'14px' }}>
                <div style={{ width:'97%', height:'100%', background:'var(--teal)', borderRadius:'3px' }}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'12px' }}>
                {[['366','Rows'],['5','Features'],['100%','Clean']].map(([v,l])=>(
                  <div key={l} style={{ background:'#F8FAFC', borderRadius:'6px', padding:'8px', textAlign:'center', border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:'14px', fontWeight:700, color:'var(--text)' }}>{v}</div>
                    <div style={{ fontSize:'9px', color:'var(--muted)' }}>{l}</div>
                  </div>
                ))}
              </div>
              {[['age','numeric'],['salary','numeric'],['gender','categorical'],['dept','categorical']].map(([name,type])=>(
                <div key={name} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'5px 0', borderBottom:'1px solid #F1F5F9' }}>
                  <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:type==='numeric'?'var(--teal)':'#F59E0B', flexShrink:0 }}/>
                  <span style={{ flex:1, fontSize:'11px', color:'var(--text)', fontFamily:'monospace' }}>{name}</span>
                  <span style={{ fontSize:'9px', color:'var(--muted)', background:'#F1F5F9', padding:'2px 6px', borderRadius:'3px' }}>{type}</span>
                </div>
              ))}
              <div style={{ marginTop:'12px', display:'flex', justifyContent:'flex-end' }}>
                <div style={{ background:'var(--teal)', color:'#fff', borderRadius:'5px', padding:'6px 16px', fontSize:'11px', fontWeight:700 }}>⚡ Run Pipeline</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section style={{ background:'#fff', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'32px 20px' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'16px' }}>
          {STATS.map(s=>(
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:'28px', fontWeight:800, color:'var(--teal)', marginBottom:'4px' }}>{s.val}</div>
              <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text)', marginBottom:'2px' }}>{s.label}</div>
              <div style={{ fontSize:'11px', color:'var(--muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section style={{ padding:'64px 20px', maxWidth:'960px', margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:'44px' }}>
          <div style={{ color:'var(--teal)', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:'10px' }}>How it works</div>
          <h2 style={{ fontSize:'clamp(20px,3vw,32px)', fontWeight:700, color:'var(--text)' }}>From raw data to ML-ready in 4 steps</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'2px', background:'var(--border)', borderRadius:'12px', overflow:'hidden' }}>
          {STEPS.map((s,i)=>(
            <div key={s.n} style={{ background:'#fff', padding:'24px 20px', borderRight:i<STEPS.length-1?'1px solid var(--border)':'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                <div style={{ fontSize:'10px', fontWeight:700, color:'var(--teal)', background:'rgba(0,203,168,.12)', padding:'2px 8px', borderRadius:'4px' }}>{s.n}</div>
                <span style={{ fontSize:'20px' }}>{s.icon}</span>
              </div>
              <div style={{ fontWeight:700, color:'var(--text)', fontSize:'14px', marginBottom:'6px' }}>{s.title}</div>
              <div style={{ color:'var(--muted)', fontSize:'11px', lineHeight:1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section style={{ padding:'0 20px 64px', maxWidth:'960px', margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:'36px' }}>
          <div style={{ color:'var(--teal)', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:'10px' }}>Features</div>
          <h2 style={{ fontSize:'clamp(20px,3vw,32px)', fontWeight:700, color:'var(--text)' }}>Everything you need, nothing you don't</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:'12px' }}>
          {FEATURES.map((f,i)=>(
            <div key={f.title} className="card"
              style={{ padding:'18px', cursor:'default', transition:'all .2s', background:hovered===i?'rgba(0,203,168,.04)':'#fff', borderColor:hovered===i?'rgba(0,203,168,.4)':'var(--border)' }}
              onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}>
              <div style={{ fontSize:'26px', marginBottom:'10px' }}>{f.icon}</div>
              <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'5px' }}>{f.title}</div>
              <div style={{ color:'var(--muted)', fontSize:'11px', lineHeight:1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who uses DataSmithy ───────────────────────────────────────────── */}
      <section style={{ padding:'64px 20px', background:'#fff', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:'960px', margin:'0 auto', textAlign:'center' }}>
          <div style={{ color:'var(--teal)', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:'10px' }}>Who uses DataSmithy</div>
          <h2 style={{ fontSize:'clamp(20px,3vw,28px)', fontWeight:700, color:'var(--text)', marginBottom:'36px' }}>Built for everyone working with data</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'16px' }}>
            {USECASES.map(u=>(
              <div key={u.title} className="card" style={{ padding:'22px', textAlign:'center' }}>
                <div style={{ fontSize:'32px', marginBottom:'10px' }}>{u.icon}</div>
                <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'6px' }}>{u.title}</div>
                <div style={{ color:'var(--muted)', fontSize:'11px', lineHeight:1.6 }}>{u.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sign in benefits ──────────────────────────────────────────────── */}
      {!user && (
        <section style={{ padding:'64px 20px', maxWidth:'800px', margin:'0 auto', textAlign:'center' }}>
          <div style={{ color:'var(--teal)', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:'10px' }}>Accounts</div>
          <h2 style={{ fontSize:'clamp(18px,3vw,28px)', fontWeight:700, color:'var(--text)', marginBottom:'12px' }}>Use it free. Sign in for more.</h2>
          <p style={{ color:'var(--muted)', fontSize:'13px', marginBottom:'32px' }}>All core features work without an account. Sign in to unlock your dashboard and history.</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', maxWidth:'580px', margin:'0 auto 28px' }}>
            <div style={{ padding:'20px', background:'#fff', border:'1px solid var(--border)', borderRadius:'10px', textAlign:'left' }}>
              <div style={{ fontWeight:700, color:'var(--text)', fontSize:'13px', marginBottom:'12px' }}>Without account</div>
              {['Upload & analyze datasets','Clean, encode, scale data','Analyse images & text','Export processed data','Generate ML code'].map(f=>(
                <div key={f} style={{ display:'flex', gap:'8px', marginBottom:'7px', fontSize:'12px', color:'var(--muted)', alignItems:'center' }}>
                  <span style={{ color:'var(--teal)', flexShrink:0 }}>✓</span>{f}
                </div>
              ))}
            </div>
            <div style={{ padding:'20px', background:'rgba(0,203,168,.04)', border:'1px solid rgba(0,203,168,.3)', borderRadius:'10px', textAlign:'left' }}>
              <div style={{ fontWeight:700, color:'var(--teal)', fontSize:'13px', marginBottom:'12px' }}>With free account</div>
              {['Everything above, plus:','📋 Full processing history','📊 Personal dashboard','🔄 Re-run past sessions','🖼 Image & text history'].map((f,i)=>(
                <div key={f} style={{ display:'flex', gap:'8px', marginBottom:'7px', fontSize:'12px', color:i===0?'var(--muted)':'var(--text)', alignItems:'center', fontWeight:i===0?400:500 }}>
                  {i>0&&<span style={{ color:'var(--teal)', flexShrink:0 }}>✓</span>}{f}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn-primary" onClick={()=>navigate('/login')} style={{ fontSize:'13px', padding:'11px 28px' }}>Create Free Account →</button>
            <button onClick={()=>navigate('/app')} style={{ background:'#fff', color:'var(--muted)', border:'1px solid var(--border)', borderRadius:'6px', padding:'11px 24px', fontSize:'13px', cursor:'pointer' }}>Use without account</button>
          </div>
        </section>
      )}

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <section style={{ padding:'72px 20px', textAlign:'center', background:user?'var(--bg)':'#fff', borderTop:'1px solid var(--border)' }}>
        <div style={{ maxWidth:'560px', margin:'0 auto' }}>
          <h2 style={{ fontSize:'clamp(22px,3vw,34px)', fontWeight:800, color:'var(--text)', marginBottom:'12px' }}>Ready to work with your data?</h2>
          <p style={{ color:'var(--muted)', fontSize:'14px', lineHeight:1.7, marginBottom:'28px' }}>No installation. No server. Works right in your browser — right now.</p>
          <div style={{ display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn-primary" onClick={()=>navigate('/app')} style={{ fontSize:'15px', padding:'14px 40px', borderRadius:'8px' }}>⚡ Start for Free</button>
            {user && <button onClick={()=>navigate('/dashboard')} style={{ background:'#fff', color:'var(--teal)', border:'1px solid rgba(0,203,168,.3)', borderRadius:'8px', padding:'14px 28px', fontSize:'14px', cursor:'pointer', fontWeight:600 }}>📋 My Dashboard</button>}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid var(--border)', padding:'22px 20px', textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'6px' }}>
          <span style={{ fontSize:'18px' }}>🔨</span>
          <span style={{ fontWeight:700, color:'var(--text)', fontSize:'14px' }}>Data<span style={{ color:'var(--teal)' }}>Smithy</span></span>
          <span style={{ fontSize:'9px', padding:'2px 7px', background:'rgba(0,203,168,.1)', color:'var(--teal)', borderRadius:'4px', fontWeight:700 }}>FREE</span>
        </div>
        <div style={{ color:'var(--muted)', fontSize:'11px' }}>
          Built by Vennela Chowdary K · GRIET Hyderabad · Data never leaves your browser
        </div>
      </footer>
    </div>
  );
}