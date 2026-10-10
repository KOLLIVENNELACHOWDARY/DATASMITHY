// src/pages/AdminPage.jsx — FIXED (was showing zeros due to wrong Firestore query)
import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config.jsx';
import {
  collection, getDocs, query, orderBy, limit, where
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext.jsx';

const ADMIN_EMAIL = 'svgv.vennela.k9@gmail.com'; // your admin email

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab]   = useState('overview');
  const [stats,    setStats]        = useState(null);
  const [users,    setUsers]        = useState([]);
  const [sessions, setSessions]     = useState([]);
  const [loading,  setLoading]      = useState(true);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const [dbError, setDbError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setDbError('');
    try {
      console.log('Admin: loading sessions from Firestore...');

      // Try without orderBy first (avoids index error)
      let sessSnap;
      try {
        sessSnap = await getDocs(
          query(collection(db, 'sessions'), orderBy('createdAt', 'desc'), limit(100))
        );
      } catch (indexErr) {
        console.warn('Index missing, trying without orderBy:', indexErr);
        // Fallback: no orderBy (works without composite index)
        sessSnap = await getDocs(
          query(collection(db, 'sessions'), limit(100))
        );
      }

      console.log('Admin: got', sessSnap.size, 'sessions');
      const sessData = sessSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(sessData);

      // Unique users
      const uniqueUids = [...new Set(sessData.map(s => s.uid).filter(Boolean))];
      const totalRows  = sessData.reduce((s, d) => s + (d.rowsProcessed || d.processedRows || 0), 0);

      const deletedCount = sessData.filter(s => s.deleted).length;
      setStats({
        totalUsers:    uniqueUids.length,
        totalDatasets: sessData.length,
        deletedCount,
        totalRows,
        sessions50:    sessData.length,
      });

      // Build user list
      const userMap = {};
      sessData.forEach(s => {
        if (!s.uid) return;
        if (!userMap[s.uid]) userMap[s.uid] = { uid:s.uid, email:s.userEmail||s.email||'Unknown', sessions:0, totalRows:0, lastSeen:s.createdAt };
        userMap[s.uid].sessions++;
        userMap[s.uid].totalRows += (s.rowsProcessed || s.processedRows || 0);
        if (s.createdAt > userMap[s.uid].lastSeen) userMap[s.uid].lastSeen = s.createdAt;
      });
      setUsers(Object.values(userMap));

    } catch (e) {
      console.error('Admin load error:', e);
      setDbError(`Firestore error: ${e.message}. Check: 1) Firestore rules allow admin to read all sessions 2) You are logged in as admin`);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (ts) => {
    if (!ts) return '—';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
      return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch { return '—'; }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding:'48px', textAlign:'center' }}>
        <div style={{ fontSize:'40px', marginBottom:'16px' }}>🔒</div>
        <div style={{ fontWeight:700, fontSize:'18px', color:'#0F172A', marginBottom:'8px' }}>Admin Only</div>
        <div style={{ color:'#64748B', fontSize:'13px' }}>Only the admin account can access this page.</div>
      </div>
    );
  }

  return (
    <div style={{ padding:'24px', maxWidth:'1100px', margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px' }}>
        <span style={{ fontSize:'28px' }}>🔐</span>
        <div>
          <div style={{ fontWeight:800, fontSize:'20px', color:'#0F172A' }}>Admin Dashboard</div>
          <div style={{ color:'#64748B', fontSize:'12px' }}>DataSmithy platform overview</div>
        </div>
        <button onClick={loadData} style={{ marginLeft:'auto', background:'#F1F5F9', border:'1px solid var(--border)', borderRadius:'6px', padding:'6px 14px', fontSize:'12px', cursor:'pointer', color:'#64748B' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'20px' }}>
        {[['overview','📊 Overview'], ['users','👥 Users'], ['activity','📋 Activity']].map(([id,label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            padding:'7px 18px', borderRadius:'7px', outline:'none', cursor:'pointer',
            fontSize:'12px', fontWeight:activeTab===id?700:400,
            background:activeTab===id?'rgba(0,203,168,.1)':'transparent',
            color:activeTab===id?'#00CBA8':'#64748B',
            outline:activeTab===id?'1.5px solid rgba(0,203,168,.3)':'1px solid transparent',
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'48px', color:'#64748B' }}>
          <div style={{ width:'36px', height:'36px', border:'3px solid #E2E8F0', borderTopColor:'#00CBA8', borderRadius:'50%', margin:'0 auto 12px', animation:'spin 1s linear infinite' }}/>
          Loading data from Firestore...
        </div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <>
              {/* Stats cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'14px', marginBottom:'24px' }}>
                {[
                  ['👥', 'Total Users',          stats?.totalUsers || 0,    '#8B5CF6'],
                  ['📊', 'Datasets Processed',   stats?.totalDatasets || 0,  '#F59E0B'],
                  ['🔢', 'Total Rows Processed', (stats?.totalRows || 0).toLocaleString(), '#3B82F6'],
                  ['📋', 'Sessions (last 100)',  stats?.sessions50 || 0,     '#00CBA8'],
                  ['🗑', 'User-deleted',          stats?.deletedCount || 0,   '#EF4444'],
                ].map(([icon, label, value, color]) => (
                  <div key={label} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'10px', padding:'20px', textAlign:'center' }}>
                    <div style={{ fontSize:'32px', marginBottom:'8px' }}>{icon}</div>
                    <div style={{ fontSize:'26px', fontWeight:900, color }}>{value}</div>
                    <div style={{ fontSize:'11px', color:'#64748B', marginTop:'4px' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Recent sessions */}
              <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'10px', overflow:'hidden' }}>
                <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, color:'#0F172A', fontSize:'13px' }}>
                  📋 Recent Processing Sessions
                </div>
                {sessions.length === 0 ? (
                  <div style={{ padding:'32px', textAlign:'center', color:'#64748B', fontSize:'12px' }}>
                    No sessions yet. Sessions appear here when users run the pipeline.
                  </div>
                ) : (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
                      <thead>
                        <tr style={{ background:'#F8FAFC' }}>
                          {['File','Rows In','Rows Out','Cols','Health','Time'].map(h => (
                            <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#64748B', fontWeight:700, borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.slice(0, 20).map((s, i) => (
                          <tr key={s.id} style={{ borderBottom:'1px solid #F1F5F9', background: s.deleted?'rgba(239,68,68,.04)': i%2===0?'#fff':'#FAFAFA', opacity:s.deleted?0.75:1 }}>
                            <td style={{ padding:'7px 12px', maxWidth:'160px' }}>
                              <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#0F172A',fontWeight:500}}>{s.fileName || '—'}</div>
                              {s.deleted && <span style={{fontSize:'9px',padding:'1px 6px',borderRadius:'3px',background:'rgba(239,68,68,.1)',color:'#DC2626',fontWeight:700}}>🗑 DELETED</span>}
                            </td>
                            <td style={{ padding:'7px 12px', color:'#64748B' }}>{(s.originalRows || 0).toLocaleString()}</td>
                            <td style={{ padding:'7px 12px', color:'#00956B', fontWeight:600 }}>{(s.processedRows || s.rowsProcessed || 0).toLocaleString()}</td>
                            <td style={{ padding:'7px 12px', color:'#64748B' }}>{s.processedCols || s.originalCols || 0}</td>
                            <td style={{ padding:'7px 12px' }}>
                              <span style={{ padding:'2px 8px', borderRadius:'4px', fontSize:'10px', fontWeight:700, background:(s.healthScore||0)>=80?'rgba(0,203,168,.1)':'rgba(245,158,11,.1)', color:(s.healthScore||0)>=80?'#00956B':'#B45309' }}>
                                {s.healthScore || 0}/100
                              </span>
                            </td>
                            <td style={{ padding:'7px 12px', color:'#94A3B8', whiteSpace:'nowrap' }}>{fmt(s.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── USERS ── */}
          {activeTab === 'users' && (
            <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'10px', overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'13px', color:'#0F172A' }}>
                👥 Users ({users.length})
              </div>
              {users.length === 0 ? (
                <div style={{ padding:'32px', textAlign:'center', color:'#64748B', fontSize:'12px' }}>
                  No users yet. Users appear here after they run the pipeline at least once.
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
                  <thead>
                    <tr style={{ background:'#F8FAFC' }}>
                      {['User ID','Sessions','Total Rows','Last Active'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#64748B', fontWeight:700, borderBottom:'1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.sort((a,b) => b.sessions - a.sessions).map((u, i) => (
                      <tr key={u.uid} style={{ borderBottom:'1px solid #F1F5F9', background:i%2===0?'#fff':'#FAFAFA' }}>
                        <td style={{ padding:'7px 12px', fontFamily:'monospace', color:'#64748B', fontSize:'10px' }}>{u.uid.slice(0,16)}...</td>
                        <td style={{ padding:'7px 12px', fontWeight:700, color:'#00CBA8' }}>{u.sessions}</td>
                        <td style={{ padding:'7px 12px', color:'#64748B' }}>{u.totalRows.toLocaleString()}</td>
                        <td style={{ padding:'7px 12px', color:'#94A3B8' }}>{fmt(u.lastSeen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── ACTIVITY ── */}
          {activeTab === 'activity' && (
            <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'10px', overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'13px', color:'#0F172A' }}>
                📋 All Activity (last 100 sessions)
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
                  <thead>
                    <tr style={{ background:'#F8FAFC' }}>
                      {['File','Original','Processed','Features Engineered','Steps','Health','Date'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#64748B', fontWeight:700, borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom:'1px solid #F1F5F9', background:i%2===0?'#fff':'#FAFAFA' }}>
                        <td style={{ padding:'7px 12px', fontWeight:500, color:'#0F172A', maxWidth:'150px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.fileName || '—'}</td>
                        <td style={{ padding:'7px 12px', color:'#64748B' }}>{(s.originalRows||0).toLocaleString()} × {s.originalCols||0}</td>
                        <td style={{ padding:'7px 12px', color:'#00956B', fontWeight:600 }}>{(s.processedRows||s.rowsProcessed||0).toLocaleString()} × {s.processedCols||0}</td>
                        <td style={{ padding:'7px 12px', color:'#8B5CF6' }}>{s.featuresEngineered || 0}</td>
                        <td style={{ padding:'7px 12px', color:'#64748B' }}>{s.steps || 0}</td>
                        <td style={{ padding:'7px 12px' }}>
                          <span style={{ padding:'2px 7px', borderRadius:'4px', fontSize:'10px', fontWeight:700, background:(s.healthScore||0)>=80?'rgba(0,203,168,.1)':'rgba(245,158,11,.1)', color:(s.healthScore||0)>=80?'#00956B':'#B45309' }}>{s.healthScore||0}/100</span>
                        </td>
                        <td style={{ padding:'7px 12px', color:'#94A3B8', whiteSpace:'nowrap' }}>{fmt(s.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}