// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase/config.jsx';
import { createUserDoc } from '../firebase/db.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e).toLowerCase());

export default function Login() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [tab,       setTab]      = useState('login');
  const [name,      setName]     = useState('');
  const [email,     setEmail]    = useState('');
  const [password,  setPassword] = useState('');
  const [resetEmail,setResetEmail]= useState('');
  const [showPass,  setShowPass] = useState(false);
  const [loading,   setLoading]  = useState(false);
  const [resetSent, setResetSent]= useState(false);
  const [errors,    setErrors]   = useState({});
  const [success,   setSuccess]  = useState('');
  const [genErr,    setGenErr]   = useState('');

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  const clear = () => { setErrors({}); setGenErr(''); setSuccess(''); };

  const switchTab = (t) => { setTab(t); clear(); setResetSent(false); setResetEmail(''); setPassword(''); };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault(); clear();
    const errs = {};
    if (!email)                    errs.email    = 'Email is required';
    else if (!isValidEmail(email)) errs.email    = 'Enter a valid email (e.g. name@gmail.com)';
    if (!password)                 errs.password = 'Password is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/dashboard');
    } catch(e) { setGenErr(friendly(e.code)); }
    finally { setLoading(false); }
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault(); clear();
    const errs = {};
    if (!name.trim())               errs.name     = 'Full name is required';
    else if (name.trim().length < 2) errs.name    = 'Name must be at least 2 characters';
    if (!email)                     errs.email    = 'Email is required';
    else if (!isValidEmail(email))  errs.email    = 'Enter a valid email (e.g. name@gmail.com)';
    if (!password)                  errs.password = 'Password is required';
    else if (password.length < 6)   errs.password = 'Minimum 6 characters required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      await sendEmailVerification(cred.user);
      await createUserDoc(cred.user);
      setSuccess('Account created! A verification email has been sent. Please verify then sign in.');
      switchTab('login');
    } catch(e) { setGenErr(friendly(e.code)); }
    finally { setLoading(false); }
  };

  // ── Forgot Password ────────────────────────────────────────────────────────
  const handleForgot = async (e) => {
    e.preventDefault(); clear();
    if (!resetEmail)                 { setErrors({ resetEmail:'Email is required' }); return; }
    if (!isValidEmail(resetEmail))   { setErrors({ resetEmail:'Enter a valid email address' }); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSent(true);
    } catch(e) { setGenErr(friendly(e.code)); }
    finally { setLoading(false); }
  };

  const ps = password ? [
    password.length>=6, password.length>=10,
    /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length : 0;
  const psColor = ['','var(--red)','var(--amber)','var(--blue)','var(--teal)','var(--teal)'][ps];
  const psLabel = ['','Weak','Fair','Good','Strong','Very Strong'][ps];

  return (
    <div style={{ minHeight:'calc(100vh - 52px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', background:'var(--bg)' }}>
      <div className="card fade-in" style={{ width:'100%', maxWidth:'420px', padding:'32px' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'24px' }}>
          <div style={{ fontSize:'30px', color:'var(--teal)' }}>◆</div>
          <div style={{ fontSize:'20px', fontWeight:700, color:'var(--text)', marginTop:'4px' }}>
            Data<span style={{ color:'var(--teal)' }}>Smith</span>
          </div>
          <div style={{ fontSize:'12px', color:'var(--muted)', marginTop:'3px' }}>
            {tab==='register' ? 'Create your free account' : tab==='forgot' ? 'Reset your password' : 'Sign in to your account'}
          </div>
        </div>

        {/* Tabs */}
        {tab !== 'forgot' && (
          <div style={{ display:'flex', gap:'4px', marginBottom:'20px', background:'var(--bg)', padding:'4px', borderRadius:'8px' }}>
            {[['login','Sign In'],['register','Register']].map(([t,l]) => (
              <button key={t} onClick={() => switchTab(t)} style={{
                flex:1, padding:'8px', fontSize:'12px',
                fontWeight: tab===t ? 700 : 400,
                background: tab===t ? 'var(--card)' : 'transparent',
                color:      tab===t ? 'var(--teal)' : 'var(--muted)',
                border:     tab===t ? '1px solid var(--border)' : '1px solid transparent',
                borderRadius:'6px', cursor:'pointer'
              }}>{l}</button>
            ))}
          </div>
        )}

        {/* Alerts */}
        {success && <Alert type="success">{success}</Alert>}
        {genErr   && <Alert type="error">{genErr}</Alert>}

        {/* ── LOGIN ── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} noValidate>
            <Field label="Email Address" error={errors.email}>
              <input type="email" value={email} placeholder="you@example.com" autoComplete="email"
                onChange={e=>{setEmail(e.target.value);if(errors.email)setErrors(p=>({...p,email:undefined}));}}
                style={{ width:'100%', borderColor:errors.email?'var(--red)':undefined }} />
            </Field>
            <Field label="Password" error={errors.password}>
              <div style={{ position:'relative' }}>
                <input type={showPass?'text':'password'} value={password} placeholder="Your password"
                  autoComplete="current-password"
                  onChange={e=>{setPassword(e.target.value);if(errors.password)setErrors(p=>({...p,password:undefined}));}}
                  style={{ width:'100%', paddingRight:'42px', borderColor:errors.password?'var(--red)':undefined }} />
                <Eye show={showPass} toggle={()=>setShowPass(s=>!s)} />
              </div>
            </Field>
            <div style={{ textAlign:'right', marginTop:'-8px', marginBottom:'16px' }}>
              <button type="button" onClick={()=>switchTab('forgot')}
                style={{ background:'none', border:'none', color:'var(--teal)', fontSize:'11px', cursor:'pointer', padding:0 }}>
                Forgot password?
              </button>
            </div>
            <Btn loading={loading} label="→ Sign In" />
            <div style={{ textAlign:'center', marginTop:'14px', fontSize:'12px', color:'var(--muted)' }}>
              Don't have an account?{' '}
              <button type="button" onClick={()=>switchTab('register')}
                style={{ background:'none', border:'none', color:'var(--teal)', fontSize:'12px', cursor:'pointer', padding:0, fontWeight:600 }}>
                Create one free →
              </button>
            </div>
          </form>
        )}

        {/* ── REGISTER ── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} noValidate>
            <Field label="Full Name" error={errors.name}>
              <input type="text" value={name} placeholder="Your full name" autoComplete="name"
                onChange={e=>{setName(e.target.value);if(errors.name)setErrors(p=>({...p,name:undefined}));}}
                style={{ width:'100%', borderColor:errors.name?'var(--red)':undefined }} />
            </Field>
            <Field label="Email Address" error={errors.email}>
              <input type="email" value={email} placeholder="you@example.com" autoComplete="email"
                onChange={e=>{setEmail(e.target.value);if(errors.email)setErrors(p=>({...p,email:undefined}));}}
                style={{ width:'100%', borderColor:errors.email?'var(--red)':undefined }} />
            </Field>
            <Field label="Password (min. 6 characters)" error={errors.password}>
              <div style={{ position:'relative' }}>
                <input type={showPass?'text':'password'} value={password} placeholder="Create a strong password"
                  autoComplete="new-password"
                  onChange={e=>setPassword(e.target.value)}
                  style={{ width:'100%', paddingRight:'42px', borderColor:errors.password?'var(--red)':undefined }} />
                <Eye show={showPass} toggle={()=>setShowPass(s=>!s)} />
              </div>
              {password && (
                <div style={{ marginTop:'8px' }}>
                  <div style={{ display:'flex', gap:'3px', marginBottom:'4px' }}>
                    {[1,2,3,4,5].map(i=>(
                      <div key={i} style={{ flex:1, height:'3px', borderRadius:'2px', transition:'background .2s',
                        background:i<=ps?psColor:'var(--border)' }} />
                    ))}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px' }}>
                    <span style={{ color:'var(--muted)' }}>
                      {[password.length>=6&&'✓ 6+',/[A-Z]/.test(password)&&'✓ A-Z',/[0-9]/.test(password)&&'✓ 0-9',/[^A-Za-z0-9]/.test(password)&&'✓ !@#'].filter(Boolean).join('  ')}
                    </span>
                    <span style={{ color:psColor, fontWeight:600 }}>{psLabel}</span>
                  </div>
                </div>
              )}
            </Field>
            <Btn loading={loading} label="→ Create Free Account" />
            <p style={{ fontSize:'10px', color:'var(--muted)', textAlign:'center', marginTop:'8px', lineHeight:1.6 }}>
              A verification email will be sent to confirm your address.
            </p>
            <div style={{ textAlign:'center', marginTop:'10px', fontSize:'12px', color:'var(--muted)' }}>
              Already have an account?{' '}
              <button type="button" onClick={()=>switchTab('login')}
                style={{ background:'none', border:'none', color:'var(--teal)', fontSize:'12px', cursor:'pointer', padding:0, fontWeight:600 }}>
                Sign in →
              </button>
            </div>
          </form>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {tab === 'forgot' && (
          <div>
            {!resetSent ? (
              <form onSubmit={handleForgot} noValidate>
                <div style={{ padding:'12px 14px', marginBottom:'18px', background:'rgba(75,158,255,.1)', border:'1px solid rgba(75,158,255,.3)', borderRadius:'8px', fontSize:'12px', color:'var(--blue)', lineHeight:1.7 }}>
                  🔑 Enter your registered email — we'll send a password reset link instantly.
                </div>
                <Field label="Registered Email Address" error={errors.resetEmail}>
                  <input type="email" value={resetEmail} placeholder="you@example.com" autoFocus
                    onChange={e=>{setResetEmail(e.target.value);if(errors.resetEmail)setErrors(p=>({...p,resetEmail:undefined}));}}
                    style={{ width:'100%', borderColor:errors.resetEmail?'var(--red)':undefined }} />
                </Field>
                <Btn loading={loading} label="→ Send Reset Link" />
                <button type="button" onClick={()=>switchTab('login')}
                  style={{ width:'100%', background:'transparent', border:'none', color:'var(--muted)', fontSize:'12px', cursor:'pointer', marginTop:'8px', padding:'6px' }}>
                  ← Back to Sign In
                </button>
              </form>
            ) : (
              <div style={{ textAlign:'center', padding:'10px 0' }}>
                <div style={{ fontSize:'52px', marginBottom:'14px' }}>📧</div>
                <div style={{ fontWeight:700, color:'var(--text)', fontSize:'16px', marginBottom:'10px' }}>Check your inbox!</div>
                <div style={{ color:'var(--muted)', fontSize:'12px', lineHeight:1.8, marginBottom:'24px' }}>
                  Password reset link sent to<br/>
                  <strong style={{ color:'var(--teal)', fontSize:'13px' }}>{resetEmail}</strong><br/><br/>
                  Click the link to set a new password.<br/>
                  <span style={{ fontSize:'11px' }}>Check spam if you don't see it.</span>
                </div>
                <button onClick={()=>switchTab('login')} className="btn-primary" style={{ width:'100%', fontSize:'13px', marginBottom:'10px' }}>
                  → Back to Sign In
                </button>
                <button onClick={()=>{setResetSent(false);setGenErr('');}}
                  style={{ background:'none', border:'none', color:'var(--muted)', fontSize:'11px', cursor:'pointer' }}>
                  Didn't receive it? Send again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop:'20px', paddingTop:'14px', borderTop:'1px solid var(--border)', textAlign:'center' }}>
          <a href="/app" style={{ color:'var(--teal)', fontSize:'11px', textDecoration:'none' }}>
            Use without account →
          </a>
        </div>
      </div>
    </div>
  );
}

const Alert = ({ type, children }) => (
  <div style={{
    padding:'10px 14px', borderRadius:'6px', fontSize:'12px', marginBottom:'14px', lineHeight:1.6,
    background: type==='success'?'rgba(0,203,168,.1)':'rgba(255,70,85,.1)',
    border:     type==='success'?'1px solid rgba(0,203,168,.3)':'1px solid rgba(255,70,85,.3)',
    color:      type==='success'?'var(--teal)':'var(--red)',
  }}>
    {type==='success'?'✅':'❌'} {children}
  </div>
);

const Field = ({ label, error, children }) => (
  <div style={{ marginBottom:'14px' }}>
    <label style={{ fontSize:'11px', color:'var(--muted)', display:'block', marginBottom:'5px', fontWeight:500 }}>{label}</label>
    {children}
    {error && <div style={{ color:'var(--red)', fontSize:'11px', marginTop:'4px' }}>⚠ {error}</div>}
  </div>
);

const Eye = ({ show, toggle }) => (
  <button type="button" onClick={toggle} style={{
    position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)',
    background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:'16px', padding:0
  }}>{show?'🙈':'👁'}</button>
);

const Btn = ({ loading, label }) => (
  <button type="submit" className="btn-primary" disabled={loading}
    style={{ width:'100%', fontSize:'13px', padding:'11px', marginTop:'4px' }}>
    {loading ? (
      <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
        <div style={{ width:'14px', height:'14px', border:'2px solid rgba(0,0,0,.3)', borderTopColor:'#000', borderRadius:'50%' }} className="spin" />
        Please wait...
      </span>
    ) : label}
  </button>
);

const friendly = (code) => {
  const map = {
    'auth/user-not-found':         '❌ No account found with this email. Please register first.',
    'auth/wrong-password':         '❌ Incorrect password. Please try again or reset your password.',
    'auth/invalid-credential':     '❌ Email or password is incorrect. Please check and try again.',
    'auth/email-already-in-use':   '❌ An account with this email already exists. Try signing in.',
    'auth/weak-password':          '❌ Password is too weak. Use at least 6 characters.',
    'auth/too-many-requests':      '⚠ Too many failed attempts. Please wait a few minutes and try again.',
    'auth/network-request-failed': '⚠ Network error. Please check your internet connection.',
    'auth/invalid-email':          '❌ Invalid email format. Please enter a valid email address.',
    'auth/user-disabled':          '❌ This account has been disabled. Please contact support.',
    'auth/missing-password':       '❌ Please enter your password.',
    'auth/missing-email':          '❌ Please enter your email address.',
  };

  if (!code) return '❌ Something went wrong. Please try again.';

  // Match partial code strings
  for (const key of Object.keys(map)) {
    if (code.includes(key.replace('auth/',''))) return map[key];
  }

  // Special case — invalid-credential usually means user not found OR wrong password
  if (code.includes('invalid-credential') || code.includes('INVALID_LOGIN_CREDENTIALS')) {
    return '❌ Email not found or password is incorrect. Please check your details or register first.';
  }

  return map[code] || `❌ Sign in failed. Please check your email and password and try again. (${code})`;
};
