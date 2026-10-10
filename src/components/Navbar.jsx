// src/components/Navbar.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { logoutUser } from '../firebase/auth.jsx';
import { ADMIN_EMAILS } from '../firebase/db.jsx';

export default function Navbar() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();
  const [menu, setMenu] = useState(false);
  const isAdmin     = user && ADMIN_EMAILS.includes(user.email);

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
    setMenu(false);
  };

  return (
    <nav style={{
      background:'#fff', borderBottom:'1px solid var(--border)',
      padding:'0 20px', height:'54px', display:'flex',
      alignItems:'center', gap:'12px',
      position:'sticky', top:0, zIndex:999,
      boxShadow:'0 1px 3px rgba(0,0,0,.06)'
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:'7px', flexShrink:0 }}>
        <span style={{ color:'var(--teal)', fontSize:'18px' }}>◆</span>
        <span style={{ fontWeight:800, fontSize:'15px', color:'var(--text)', letterSpacing:'-.3px' }}>
          Data<span style={{ color:'var(--teal)' }}>Smithy</span>
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display:'flex', gap:'2px', marginLeft:'12px' }} className="hide-mobile">
        <NavLink to="/app"       active={location.pathname==='/app'}>Tool</NavLink>
        {user && <NavLink to="/dashboard" active={location.pathname==='/dashboard'}>My Dashboard</NavLink>}
        {isAdmin && <NavLink to="/admin" active={location.pathname==='/admin'}>Admin</NavLink>}
      </div>

      {/* Right */}
      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px' }}>
        {user ? (
          <div style={{ position:'relative' }}>
            <button onClick={() => setMenu(o=>!o)} style={{
              background:'var(--teal)', border:'none', borderRadius:'50%',
              width:'34px', height:'34px', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontWeight:700, fontSize:'13px', overflow:'hidden'
            }}>
              {user.photoURL
                ? <img src={user.photoURL} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : (user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()
              }
            </button>
            {menu && (
              <div style={{
                position:'absolute', right:0, top:'42px',
                background:'#fff', border:'1px solid var(--border)',
                borderRadius:'10px', padding:'8px', minWidth:'190px',
                zIndex:1000, boxShadow:'0 8px 24px rgba(0,0,0,.1)'
              }}>
                <div style={{ padding:'6px 10px', color:'var(--muted)', fontSize:'11px', borderBottom:'1px solid var(--border)', marginBottom:'4px', fontWeight:600 }}>
                  {user.email}
                </div>
                <MI onClick={() => { navigate('/app');       setMenu(false); }}>⚡ Tool</MI>
                <MI onClick={() => { navigate('/dashboard'); setMenu(false); }}>📊 My Dashboard</MI>
                <MI onClick={() => { window.dispatchEvent(new Event('datasmithy_retake_tour')); setMenu(false); }}>🎯 Take Tour Again</MI>
                {isAdmin && <MI onClick={() => { navigate('/admin'); setMenu(false); }}>🔐 Admin Panel</MI>}
                <div style={{ borderTop:'1px solid var(--border)', marginTop:'4px', paddingTop:'4px' }}>
                  <MI onClick={handleLogout} color="#EF4444">🚪 Sign Out</MI>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login">
            <button className="btn-primary" style={{ padding:'7px 18px', fontSize:'12px' }}>
              Sign In
            </button>
          </Link>
        )}
      </div>
    </nav>
  );
}

const NavLink = ({ to, active, children }) => (
  <Link to={to} style={{ textDecoration:'none' }}>
    <button style={{
      background: active ? 'rgba(0,203,168,.1)' : 'transparent',
      color:      active ? 'var(--teal)' : 'var(--muted)',
      border:     active ? '1px solid rgba(0,203,168,.25)' : '1px solid transparent',
      borderRadius:'6px', padding:'5px 12px', fontSize:'12px',
      cursor:'pointer', fontWeight: active ? 600 : 400, transition:'all .15s'
    }}>{children}</button>
  </Link>
);

const MI = ({ onClick, children, color }) => (
  <button onClick={onClick} style={{
    width:'100%', background:'transparent', border:'none', textAlign:'left',
    padding:'8px 10px', borderRadius:'6px', cursor:'pointer',
    fontSize:'12px', color:color||'var(--text)', display:'block',
    transition:'background .1s'
  }}
    onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'}
    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
  >{children}</button>
);
