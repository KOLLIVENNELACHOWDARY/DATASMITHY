// src/components/FeedbackModal.jsx
// No Firebase imports — data saved via onSubmit prop (handled by useFeedbackTrigger)
import React, { useState } from 'react';

const FEATURES = [
  'Image EDA', 'Text / NLP', 'Tabular Data', 'Data Cleaning',
  'Augmentation', 'ML Code Gen', 'Export Formats', 'Visualizations',
  'HuggingFace Connect', 'Quality Analysis',
];

const DISCOVER = [
  'Search engine', 'GitHub', 'LinkedIn', 'Twitter / X',
  'Friend / colleague', 'Reddit', 'YouTube', 'Other',
];

export default function FeedbackModal({ onClose, onSubmit }) {
  const [step,      setStep]     = useState(1);
  const [nps,       setNps]      = useState(null);
  const [features,  setFeatures] = useState([]);
  const [discover,  setDiscover] = useState('');
  const [free,      setFree]     = useState('');
  const [submitting,setSub]      = useState(false);

  const toggleFeat = f =>
    setFeatures(p => p.includes(f) ? p.filter(x=>x!==f) : [...p,f]);

  const submit = async () => {
    setSub(true);
    try {
      if (typeof onSubmit === 'function') {
        await onSubmit({ nps, features, discover, free, ts: Date.now() });
      }
      // Always save to localStorage as backup
      localStorage.setItem('ds_feedback', JSON.stringify({ nps, features, discover, free, ts: Date.now() }));
      localStorage.setItem('ds_fb_done', '1');
    } catch(e) {
      console.warn('Feedback save failed:', e);
    }
    setSub(false);
    setStep(5);
  };

  const npsColor = nps===null?'#94A3B8':nps>=9?'#00956B':nps>=7?'#D97706':'#DC2626';
  const npsLabel = nps===null?'':nps>=9?'Promoter 🎉':nps>=7?'Passive 🙂':'Detractor 😐';

  const overlay = {
    position:'fixed', inset:0, background:'rgba(0,0,0,.55)',
    zIndex:10000, display:'flex', alignItems:'center',
    justifyContent:'center', padding:'16px',
  };
  const box = {
    background:'var(--bg,#fff)', borderRadius:'16px', padding:'32px',
    maxWidth:'520px', width:'100%',
    boxShadow:'0 20px 60px rgba(0,0,0,.2)', position:'relative',
  };
  const btnPrimary = {
    width:'100%', padding:'12px', borderRadius:'9px', border:'none',
    cursor:'pointer', background:'#00CBA8', color:'#fff',
    fontWeight:700, fontSize:'14px',
  };
  const btnSecondary = {
    flex:1, padding:'11px', borderRadius:'9px',
    border:'1px solid #E2E8F0', background:'#F8FAFC',
    cursor:'pointer', color:'#64748B', fontWeight:600,
  };

  return (
    <div style={overlay}>
      <div style={box}>
        {/* Close */}
        <button onClick={onClose} style={{
          position:'absolute', top:'14px', right:'14px',
          background:'#F1F5F9', border:'none', borderRadius:'50%',
          width:'30px', height:'30px', cursor:'pointer',
          fontSize:'14px', color:'#64748B',
        }}>✕</button>

        {/* Progress dots */}
        {step < 5 && (
          <div style={{ display:'flex', gap:'6px', justifyContent:'center', marginBottom:'24px' }}>
            {[1,2,3,4].map(s=>(
              <div key={s} style={{
                width:'8px', height:'8px', borderRadius:'50%',
                background:s<=step?'#00CBA8':'#E2E8F0', transition:'background .2s',
              }} />
            ))}
          </div>
        )}

        {/* Step 1 — NPS */}
        {step===1 && (
          <div>
            <div style={{ textAlign:'center', fontSize:'28px', marginBottom:'8px' }}>⭐</div>
            <h2 style={{ textAlign:'center', marginBottom:'6px', fontSize:'18px', fontWeight:800, color:'var(--text,#0F172A)' }}>
              How likely are you to recommend DataSmithy?
            </h2>
            <p style={{ textAlign:'center', color:'#64748B', fontSize:'13px', marginBottom:'24px' }}>
              0 = Not at all &nbsp;·&nbsp; 10 = Definitely
            </p>
            <div style={{ display:'flex', gap:'5px', justifyContent:'center', marginBottom:'12px', flexWrap:'wrap' }}>
              {[0,1,2,3,4,5,6,7,8,9,10].map(n=>(
                <button key={n} onClick={()=>setNps(n)} style={{
                  width:'38px', height:'38px', borderRadius:'8px', border:'none',
                  cursor:'pointer', fontWeight:nps===n?800:500, fontSize:'13px',
                  transition:'all .15s',
                  background:nps===n?(n>=9?'#00CBA8':n>=7?'#F59E0B':'#EF4444'):'#F1F5F9',
                  color:nps===n?'#fff':'#64748B',
                  transform:nps===n?'scale(1.15)':'scale(1)',
                }}>{n}</button>
              ))}
            </div>
            {nps!==null && (
              <div style={{ textAlign:'center', fontSize:'13px', fontWeight:700, color:npsColor, marginBottom:'16px' }}>
                {npsLabel}
              </div>
            )}
            <button onClick={()=>nps!==null&&setStep(2)}
              style={{ ...btnPrimary, opacity:nps===null?.5:1, cursor:nps===null?'not-allowed':'pointer' }}>
              Next →
            </button>
          </div>
        )}

        {/* Step 2 — Features */}
        {step===2 && (
          <div>
            <div style={{ textAlign:'center', fontSize:'28px', marginBottom:'8px' }}>🛠</div>
            <h2 style={{ textAlign:'center', marginBottom:'6px', fontSize:'18px', fontWeight:800, color:'var(--text,#0F172A)' }}>
              Which features did you use?
            </h2>
            <p style={{ textAlign:'center', color:'#64748B', fontSize:'13px', marginBottom:'20px' }}>Select all that apply</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'20px' }}>
              {FEATURES.map(f=>{
                const on=features.includes(f);
                return (
                  <button key={f} onClick={()=>toggleFeat(f)} style={{
                    padding:'9px 12px', borderRadius:'8px', border:'none',
                    cursor:'pointer', textAlign:'left',
                    background:on?'rgba(0,203,168,.12)':'#F8FAFC',
                    fontWeight:on?700:400,
                    color:on?'#00956B':'#475569', fontSize:'12px',
                    outline:on?'1.5px solid #00CBA8':'1px solid #E2E8F0',
                    transition:'all .15s',
                  }}>
                    {on?'✓ ':''}{f}
                  </button>
                );
              })}
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={()=>setStep(1)} style={btnSecondary}>← Back</button>
              <button onClick={()=>setStep(3)} style={{ ...btnPrimary, flex:2 }}>Next →</button>
            </div>
          </div>
        )}

        {/* Step 3 — How did you find us */}
        {step===3 && (
          <div>
            <div style={{ textAlign:'center', fontSize:'28px', marginBottom:'8px' }}>🔍</div>
            <h2 style={{ textAlign:'center', marginBottom:'6px', fontSize:'18px', fontWeight:800, color:'var(--text,#0F172A)' }}>
              How did you find DataSmithy?
            </h2>
            <p style={{ textAlign:'center', color:'#64748B', fontSize:'13px', marginBottom:'20px' }}>Pick one</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'20px' }}>
              {DISCOVER.map(d=>{
                const on=discover===d;
                return (
                  <button key={d} onClick={()=>setDiscover(d)} style={{
                    padding:'9px 12px', borderRadius:'8px', border:'none',
                    cursor:'pointer',
                    background:on?'rgba(0,203,168,.12)':'#F8FAFC',
                    fontWeight:on?700:400,
                    color:on?'#00956B':'#475569', fontSize:'12px',
                    outline:on?'1.5px solid #00CBA8':'1px solid #E2E8F0',
                    transition:'all .15s',
                  }}>
                    {on?'✓ ':''}{d}
                  </button>
                );
              })}
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={()=>setStep(2)} style={btnSecondary}>← Back</button>
              <button onClick={()=>setStep(4)} style={{ ...btnPrimary, flex:2 }}>Next →</button>
            </div>
          </div>
        )}

        {/* Step 4 — Free text */}
        {step===4 && (
          <div>
            <div style={{ textAlign:'center', fontSize:'28px', marginBottom:'8px' }}>💬</div>
            <h2 style={{ textAlign:'center', marginBottom:'6px', fontSize:'18px', fontWeight:800, color:'var(--text,#0F172A)' }}>
              Anything else to tell us?
            </h2>
            <p style={{ textAlign:'center', color:'#64748B', fontSize:'13px', marginBottom:'20px' }}>
              Bugs, feature requests, what you love — all welcome
            </p>
            <textarea value={free} onChange={e=>setFree(e.target.value)} rows={4}
              placeholder="Type here… (optional)"
              style={{
                width:'100%', padding:'12px', borderRadius:'9px',
                border:'1px solid #E2E8F0', fontSize:'13px', resize:'vertical',
                boxSizing:'border-box', fontFamily:'inherit',
                background:'#F8FAFC', color:'var(--text,#0F172A)',
                marginBottom:'16px', lineHeight:1.6,
              }} />
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={()=>setStep(3)} style={btnSecondary}>← Back</button>
              <button onClick={submit} disabled={submitting}
                style={{ ...btnPrimary, flex:2, opacity:submitting?.7:1 }}>
                {submitting?'⏳ Submitting…':'🚀 Submit Feedback'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5 — Thank you */}
        {step===5 && (
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ fontSize:'52px', marginBottom:'16px' }}>🎉</div>
            <h2 style={{ fontSize:'20px', fontWeight:800, marginBottom:'10px', color:'var(--text,#0F172A)' }}>
              Thank you! Your feedback matters.
            </h2>
            <p style={{ color:'#64748B', fontSize:'14px', lineHeight:1.7, marginBottom:'24px' }}>
              Every response shapes what we build next. DataSmithy is built for ML practitioners — your input helps us prioritise the right features.
            </p>
            {nps>=9 && (
              <div style={{ padding:'14px 16px', background:'rgba(0,203,168,.08)', border:'1px solid rgba(0,203,168,.2)', borderRadius:'10px', marginBottom:'20px', fontSize:'13px', color:'#00956B', lineHeight:1.7 }}>
                You are a Promoter! 🎉 Consider sharing DataSmithy with your team or on LinkedIn — it really helps us grow.
              </div>
            )}
            <button onClick={onClose} style={btnPrimary}>Back to DataSmithy</button>
          </div>
        )}
      </div>
    </div>
  );
}