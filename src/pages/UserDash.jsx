// src/pages/UserDash.jsx — soft delete + all 4 session types displayed
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }   from '../context/AuthContext.jsx';
import { db }        from '../firebase/config.jsx';
import { collection, query, where, orderBy, limit, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

export default function UserDash() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      if (typeof logout === 'function') await logout();
    } catch(e) { console.error('Sign out error:', e); }
    finally {
      navigate('/');
      window.location.href = '/';
    }
  };
  const [sessions,  setSessions]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('history');

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      let snap;
      try { snap = await getDocs(query(collection(db,'sessions'),where('uid','==',user.uid),orderBy('createdAt','desc'),limit(50))); }
      catch { snap = await getDocs(query(collection(db,'sessions'),where('uid','==',user.uid),limit(50))); }
      const data = snap.docs.map(d=>({id:d.id,...d.data()}))
        .filter(s=>!s.deleted)
        .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      setSessions(data);
    } catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  // SOFT DELETE — admin can still see it
  const softDelete = async (id) => {
    try {
      await updateDoc(doc(db,'sessions',id),{deleted:true,deletedAt:serverTimestamp(),deletedBy:user.uid});
      setSessions(prev=>prev.filter(s=>s.id!==id));
    } catch(e){console.error('Soft delete failed:',e);}
  };

  const fmt = (ts) => {
    if (!ts) return '—';
    try { const d=ts.toDate?ts.toDate():new Date(ts.seconds*1000); return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
    catch { return '—'; }
  };

  const redo = (s) => { localStorage.setItem('datasmithy_redo_session',JSON.stringify({fileName:s.fileName,timestamp:Date.now()})); window.location.href='/app'; };

  const totalRows  = sessions.reduce((s,d)=>s+(d.rowsProcessed||d.originalRows||0),0);
  const avgHealth  = sessions.length ? Math.round(sessions.reduce((s,d)=>s+(d.healthScore||0),0)/sessions.length) : 0;

  const TYPE = {
    import:  {icon:'📥',color:'#3B82F6',label:'Import'},
    tabular: {icon:'📥',color:'#3B82F6',label:'Import'},
    pipeline:{icon:'⚡',color:'#00CBA8',label:'Pipeline'},
    images:  {icon:'🖼',color:'#8B5CF6',label:'Images'},
    text:    {icon:'📝',color:'#F59E0B',label:'Text/NLP'},
  };
  const getT = (s) => TYPE[s.type]||TYPE.import;

  const stats = [
    ['📁','Total',sessions.length,'#00CBA8'],
    ['🖼','Images',sessions.filter(s=>s.type==='images').length,'#8B5CF6'],
    ['📝','Text',sessions.filter(s=>s.type==='text').length,'#F59E0B'],
    ['⚡','Pipeline',sessions.filter(s=>s.type==='pipeline').length,'#3B82F6'],
    ['🔢','Rows',totalRows.toLocaleString(),'#64748B'],
    ['♥','Avg Health',avgHealth+'/100','#EF4444'],
  ];

  return (
    <div style={{padding:'24px',maxWidth:'900px',margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:'16px',marginBottom:'24px',padding:'20px',background:'#fff',border:'1px solid var(--border)',borderRadius:'12px'}}>
        <div style={{width:'52px',height:'52px',borderRadius:'50%',background:'linear-gradient(135deg,#00CBA8,#0D9488)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',color:'#fff',fontWeight:800,flexShrink:0}}>{user?.email?.charAt(0).toUpperCase()||'U'}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:'16px',color:'#0F172A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.email||'User'}</div>
          <div style={{color:'#64748B',fontSize:'12px',marginTop:'2px'}}>DataSmithy member · {sessions.length} sessions</div>
        </div>
        <button onClick={handleSignOut} style={{background:'transparent',border:'1px solid var(--border)',borderRadius:'8px',padding:'8px 16px',fontSize:'12px',color:'#64748B',cursor:'pointer',flexShrink:0}}>Sign out</button>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:'10px',marginBottom:'24px'}}>
        {stats.map(([icon,label,value,color])=>(
          <div key={label} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'10px',padding:'14px',textAlign:'center'}}>
            <div style={{fontSize:'20px',marginBottom:'5px'}}>{icon}</div>
            <div style={{fontSize:'18px',fontWeight:800,color}}>{value}</div>
            <div style={{fontSize:'10px',color:'#64748B',marginTop:'2px'}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{display:'flex',gap:'4px',marginBottom:'16px'}}>
        {[['history','📋 History'],['account','⚙ Account']].map(([id,label])=>(
          <button key={id} onClick={()=>setActiveTab(id)} style={{padding:'7px 18px',borderRadius:'7px',cursor:'pointer',fontSize:'12px',fontWeight:activeTab===id?700:400,background:activeTab===id?'rgba(0,203,168,.1)':'transparent',color:activeTab===id?'#00CBA8':'#64748B',border:activeTab===id?'1.5px solid rgba(0,203,168,.3)':'1px solid transparent'}}>{label}</button>
        ))}
      </div>

      {/* History */}
      {activeTab==='history'&&(
        loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'#64748B'}}>
            <div style={{width:'32px',height:'32px',border:'3px solid #E2E8F0',borderTopColor:'#00CBA8',borderRadius:'50%',margin:'0 auto 12px'}} className="spin"/>Loading…
          </div>
        ) : sessions.length===0 ? (
          <div style={{textAlign:'center',padding:'48px',background:'#fff',border:'1px solid var(--border)',borderRadius:'12px'}}>
            <div style={{fontSize:'40px',marginBottom:'14px'}}>📂</div>
            <div style={{fontWeight:600,color:'#0F172A',fontSize:'15px',marginBottom:'6px'}}>No history yet</div>
            <div style={{color:'#64748B',fontSize:'12px',marginBottom:'20px'}}>Upload any dataset — tabular, images, or text — to see your history here.</div>
            <a href="/app" style={{background:'#00CBA8',color:'#fff',border:'none',borderRadius:'8px',padding:'10px 24px',fontSize:'12px',fontWeight:700,textDecoration:'none'}}>📥 Upload Dataset</a>
          </div>
        ) : (
          <div style={{display:'grid',gap:'10px'}}>
            {sessions.map(s=>{
              const t=getT(s);
              return (
                <div key={s.id} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'10px',padding:'14px 16px',display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'}}>
                  <div style={{width:'38px',height:'38px',borderRadius:'9px',background:`${t.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>{t.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,color:'#0F172A',fontSize:'13px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.fileName||'Unnamed'}</div>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'4px',alignItems:'center'}}>
                      <span style={{fontSize:'10px',padding:'1px 7px',borderRadius:'4px',background:`${t.color}18`,color:t.color,fontWeight:700}}>{t.label}</span>
                      <span style={{fontSize:'10px',color:'#64748B'}}>{(s.originalRows||0).toLocaleString()} × {s.originalCols||0}</span>
                      {s.type==='pipeline'&&s.processedRows>0&&<span style={{fontSize:'10px',color:'#00956B',fontWeight:600}}>→ {s.processedRows.toLocaleString()} out</span>}
                      <span style={{fontSize:'10px',color:(s.healthScore||0)>=80?'#00956B':(s.healthScore||0)>=60?'#D97706':'#DC2626',fontWeight:600}}>♥ {s.healthScore||0}/100</span>
                      <span style={{fontSize:'10px',color:'#94A3B8'}}>{fmt(s.createdAt)}</span>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                    <button onClick={()=>redo(s)} style={{background:'rgba(0,203,168,.1)',color:'#00956B',border:'1px solid rgba(0,203,168,.3)',borderRadius:'6px',padding:'6px 12px',fontSize:'11px',fontWeight:700,cursor:'pointer'}}>↩ Redo</button>
                    <button onClick={()=>{ if(window.confirm('Remove from your history?')) softDelete(s.id); }} style={{background:'rgba(239,68,68,.06)',color:'#DC2626',border:'1px solid rgba(239,68,68,.2)',borderRadius:'6px',padding:'6px 10px',fontSize:'11px',cursor:'pointer'}} title="Soft delete — admin can still see it">🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Account */}
      {activeTab==='account'&&(
        <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px'}}>
          <div style={{fontWeight:700,fontSize:'14px',color:'#0F172A',marginBottom:'16px'}}>Account Details</div>
          <div style={{display:'grid',gap:'10px',fontSize:'12px',marginBottom:'20px'}}>
            {[['📧 Email',user?.email||'—'],['🆔 User ID',(user?.uid||'').slice(0,24)+'...'],['📅 Member since',user?.metadata?.creationTime?new Date(user.metadata.creationTime).toLocaleDateString('en-IN'):'—'],['📋 Sessions',sessions.length+' total']].map(([l,v])=>(
              <div key={l} style={{display:'flex',gap:'12px',padding:'10px 14px',background:'#F8FAFC',borderRadius:'8px',border:'1px solid var(--border)'}}>
                <span style={{color:'#64748B',fontWeight:600,minWidth:'140px'}}>{l}</span>
                <span style={{color:'#0F172A',fontFamily:'monospace',fontSize:'11px'}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{padding:'14px',background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.15)',borderRadius:'8px'}}>
            <div style={{fontWeight:600,color:'#DC2626',fontSize:'13px',marginBottom:'8px'}}>Sign Out</div>
            <button onClick={handleSignOut} style={{background:'#DC2626',color:'#fff',border:'none',borderRadius:'7px',padding:'8px 20px',fontSize:'12px',fontWeight:700,cursor:'pointer'}}>Sign Out</button>
          </div>
        </div>
      )}
    </div>
  );
}