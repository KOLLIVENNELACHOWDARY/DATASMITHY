// src/App.jsx — Fixed routing, sign out, logo redirect
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import MainApp   from './pages/MainApp.jsx';
import UserDash  from './pages/UserDash.jsx';
import Landing   from './pages/Landing.jsx';
import Login     from './pages/Login.jsx';
import TourGuide, { TourButton } from './components/OnboardingTour.jsx';
import HelpChatbot from './components/Chatbot.jsx';

const ADMIN_EMAIL = 'svgv.vennela.k9@gmail.com';
const AdminPage   = React.lazy(() =>
  import('./pages/AdminDash.jsx').catch()
);

function NavBar({ onStartTour }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      // Try all possible signout methods for compatibility
      if (typeof logout === 'function') await logout();
      else if (typeof signOut === 'function') await signOut();
      navigate('/');
      window.location.href = '/'; // Force redirect as fallback
    } catch(e) {
      console.error('Sign out error:', e);
      // Force navigate even if signout throws
      navigate('/');
      window.location.href = '/';
    }
  };

  return (
    <nav style={{
      height:'54px', background:'#fff',
      borderBottom:'1px solid var(--border)',
      display:'flex', alignItems:'center',
      padding:'0 16px', gap:'12px',
      position:'sticky', top:0, zIndex:500,
      boxShadow:'0 1px 4px rgba(0,0,0,.06)',
    }}>
      {/* Logo — always goes to landing page */}
      <Link to="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ fontSize:'22px' }}>🔨</span>
        <span style={{ fontWeight:900, fontSize:'16px', color:'#0F172A', letterSpacing:'-.3px' }}>
          Data<span style={{ color:'#00CBA8' }}>Smithy</span>
        </span>
        <span style={{ fontSize:'9px', padding:'2px 7px', background:'rgba(0,203,168,.1)', color:'#00956B', borderRadius:'4px', fontWeight:700 }}>FREE</span>
      </Link>

      <div style={{ flex:1 }}/>
      <TourButton onClick={onStartTour}/>

      {user ? (
        <>
          <Link to="/app" style={{ fontSize:'12px', color:'#64748B', textDecoration:'none', fontWeight:500, padding:'5px 10px', borderRadius:'6px' }}>🔬 App</Link>
          <Link to="/dashboard" style={{ fontSize:'12px', color:'#64748B', textDecoration:'none', fontWeight:500, padding:'5px 10px', borderRadius:'6px' }}>📋 Dashboard</Link>
          {user.email === ADMIN_EMAIL && (
            <Link to="/admin" style={{ fontSize:'12px', color:'#8B5CF6', textDecoration:'none', fontWeight:700, padding:'5px 10px', borderRadius:'6px', background:'rgba(139,92,246,.08)' }}>🔐 Admin</Link>
          )}
          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            style={{ fontSize:'12px', color:'#fff', background:'#EF4444', border:'none', borderRadius:'6px', padding:'6px 14px', cursor:'pointer', fontWeight:700, boxShadow:'0 1px 4px rgba(239,68,68,.3)' }}
          >
            Sign Out
          </button>
          {/* Avatar */}
          <div
            onClick={() => navigate('/dashboard')}
            title={user.email}
            style={{ width:'32px', height:'32px', borderRadius:'50%', background:'linear-gradient(135deg,#00CBA8,#0D9488)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', color:'#fff', fontWeight:800, cursor:'pointer', flexShrink:0 }}
          >
            {user.email?.charAt(0).toUpperCase()}
          </div>
        </>
      ) : (
        <>
          <Link to="/app" style={{ fontSize:'12px', color:'#64748B', textDecoration:'none', fontWeight:500, padding:'5px 10px', borderRadius:'6px' }}>Try Free</Link>
          <Link to="/login" style={{ background:'#00CBA8', color:'#fff', fontSize:'12px', fontWeight:700, padding:'7px 18px', borderRadius:'8px', textDecoration:'none', boxShadow:'0 2px 8px rgba(0,203,168,.3)' }}>
            Sign In
          </Link>
        </>
      )}
    </nav>
  );
}

function AppShell() {
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);
  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <>
      <NavBar onStartTour={() => setShowTour(true)}/>
      <React.Suspense fallback={
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'#64748B', fontSize:'14px' }}>
          Loading…
        </div>
      }>
        <Routes>
          {/* Home = Landing page for EVERYONE — logged in or not */}
          <Route path="/"          element={<Landing/>}/>
          <Route path="/home"      element={<Landing/>}/>
          <Route path="/app"       element={<MainApp/>}/>
          <Route path="/dashboard" element={user ? <UserDash/> : <Navigate to="/login" state={{ from:'/dashboard' }} replace/>}/>
          <Route path="/admin"     element={isAdmin ? <AdminPage/> : <Navigate to="/" replace/>}/>
          <Route path="/login"     element={<Login/>}/>
          <Route path="*"          element={<Navigate to="/" replace/>}/>
        </Routes>
      </React.Suspense>

      {showTour && <TourGuide onClose={() => setShowTour(false)}/>}
      <HelpChatbot/>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition:true, v7_relativeSplatPath:true }}>
        <AppShell/>
      </Router>
    </AuthProvider>
  );
}