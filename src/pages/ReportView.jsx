// src/pages/ReportView.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReport } from '../firebase/db.jsx';

export default function ReportView() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getReport(id)
      .then(r => { if (!r) setError('Report not found or expired.'); else setReport(r); })
      .catch(() => setError('Could not load report.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'70vh' }}>
        <div style={{ width:'32px', height:'32px', border:'3px solid #E2E8F0', borderTopColor:'#00CBA8', borderRadius:'50%' }} className="spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{ minHeight:'70vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
        <div className="card" style={{ padding:'40px', textAlign:'center', maxWidth:'400px' }}>
          <div style={{ fontSize:'40px', marginBottom:'12px' }}>📭</div>
          <div style={{ fontWeight:700, color:'var(--text)', marginBottom:'8px' }}>{error}</div>
          <Link to="/app"><button className="btn-primary" style={{ fontSize:'12px', marginTop:'10px' }}>Go to DataSmithy →</button></Link>
        </div>
      </div>
    );
  }

  const health = report.health || 0;
  const healthColor = health>=80 ? '#00CBA8' : health>=60 ? '#F59E0B' : '#EF4444';

  return (
    <div style={{ minHeight:'calc(100vh - 54px)', background:'var(--bg)', padding:'24px' }}>
      <div style={{ maxWidth:'700px', margin:'0 auto' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'24px' }}>
          <div style={{ fontSize:'12px', color:'var(--teal)', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:'8px' }}>
            DataSmithy Report
          </div>
          <div style={{ fontSize:'22px', fontWeight:800, color:'var(--text)' }}>{report.fileName || 'Dataset Report'}</div>
          <div style={{ fontSize:'12px', color:'var(--muted)', marginTop:'4px' }}>
            Generated {new Date(report.createdAt?.seconds ? report.createdAt.seconds*1000 : report.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Health score */}
        <div className="card" style={{ padding:'24px', marginBottom:'16px', textAlign:'center' }}>
          <div style={{ fontSize:'48px', fontWeight:800, color:healthColor }}>{health}</div>
          <div style={{ fontSize:'12px', color:'var(--muted)', marginBottom:'12px' }}>Health Score out of 100</div>
          <div style={{ height:'8px', background:'#F1F5F9', borderRadius:'4px', maxWidth:'300px', margin:'0 auto' }}>
            <div style={{ width:`${health}%`, height:'100%', background:healthColor, borderRadius:'4px' }} />
          </div>
        </div>

        {/* Before/After */}
        <div className="card" style={{ padding:'20px', marginBottom:'16px' }}>
          <div style={{ color:'var(--teal)', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'14px', paddingBottom:'6px', borderBottom:'1px solid var(--border)' }}>
            Before → After
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <Stat label="Rows"    before={report.originalRows}  after={report.processedRows} />
            <Stat label="Columns" before={report.originalCols}  after={report.processedCols} />
          </div>
        </div>

        {/* Pipeline steps */}
        {report.steps?.length > 0 && (
          <div className="card" style={{ padding:'20px', marginBottom:'16px' }}>
            <div style={{ color:'var(--teal)', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'14px', paddingBottom:'6px', borderBottom:'1px solid var(--border)' }}>
              Pipeline Steps ({report.steps.length})
            </div>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'11px', lineHeight:1.8, color:'var(--muted)', maxHeight:'240px', overflowY:'auto' }}>
              {report.steps.map((s,i) => (
                <div key={i}>{typeof s === 'string' ? s : s.msg}</div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign:'center', padding:'24px 0' }}>
          <div style={{ color:'var(--muted)', fontSize:'13px', marginBottom:'14px' }}>
            Process your own dataset for free
          </div>
          <Link to="/app">
            <button className="btn-primary" style={{ fontSize:'14px', padding:'12px 32px' }}>
              ⚡ Try DataSmithy Free →
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, before, after }) {
  const diff = (after||0) - (before||0);
  return (
    <div>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'6px' }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:'8px' }}>
        <span style={{ fontSize:'18px', fontWeight:700, color:'var(--muted)', textDecoration:'line-through' }}>
          {(before||0).toLocaleString()}
        </span>
        <span style={{ color:'var(--muted)' }}>→</span>
        <span style={{ fontSize:'20px', fontWeight:800, color:'var(--teal)' }}>
          {(after||0).toLocaleString()}
        </span>
      </div>
      {diff !== 0 && (
        <div style={{ fontSize:'10px', color: diff<0 ? '#DC2626' : '#00956B', marginTop:'2px' }}>
          {diff > 0 ? '+' : ''}{diff.toLocaleString()}
        </div>
      )}
    </div>
  );
}