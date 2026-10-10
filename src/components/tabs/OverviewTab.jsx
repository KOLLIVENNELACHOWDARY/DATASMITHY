// src/components/tabs/OverviewTab.jsx
import React from 'react';

const fn = (v, d = 2) => (v == null || isNaN(v)) ? '—' : Number(v).toFixed(d);

export default function OverviewTab({ analysis }) {
  if (!analysis) return null;
  const { rows, cols, memory, duplicates, health, health_details, columns, num_cols, correlation } = analysis;

  return (
    <div className="fade-in" style={{ display: 'grid', gap: '14px' }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: '10px' }}>
        {[
          ['Rows', rows?.toLocaleString(), 'var(--text)'],
          ['Columns', cols, 'var(--text)'],
          ['Numeric', columns?.filter(c=>c.type==='numeric').length, 'var(--teal)'],
          ['Categorical', columns?.filter(c=>c.type==='categorical').length, 'var(--amber)'],
          ['W/ Missing', columns?.filter(c=>c.missing_pct>0).length, 'var(--red)'],
          ['Duplicates', duplicates, 'var(--amber)'],
          ['Memory', memory+'KB', 'var(--blue)'],
        ].map(([label, val, color]) => (
          <div key={label} className="card" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '3px', letterSpacing: '.3px' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '14px' }}>
        {/* Column Analysis Table */}
        <div className="card" style={{ padding: '16px', overflow: 'hidden' }}>
          <div style={{ color: 'var(--teal)', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>Column Analysis</div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Column</th><th>Type</th><th>Missing</th><th>Mean/Uniq</th><th>Std/Top</th><th>Outliers</th><th>Skew</th>
                </tr>
              </thead>
              <tbody>
                {columns?.map(col => (
                  <tr key={col.name}>
                    <td style={{ fontWeight: 600, color: 'var(--text)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={col.name}>{col.name}</td>
                    <td><TypeBadge type={col.type} /></td>
                    <td style={{ color: col.missing_pct > 10 ? 'var(--red)' : col.missing_pct > 0 ? 'var(--amber)' : 'var(--muted)' }}>
                      {col.missing_pct > 0 ? `${col.missing_pct}%` : '—'}
                    </td>
                    <td style={{ color: 'var(--text)', fontSize: '11px' }}>
                      {col.type === 'numeric' ? fn(col.mean) : (col.unique_count || '—') + ' vals'}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '10px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {col.type === 'numeric' ? fn(col.std) : (col.top_values || []).slice(0,2).join(', ')}
                    </td>
                    <td style={{ color: (col.outliers || 0) > 0 ? 'var(--amber)' : 'var(--muted)' }}>
                      {col.type === 'numeric' ? col.outliers ?? '—' : '—'}
                    </td>
                    <td style={{ color: Math.abs(col.skew || 0) > 1 ? 'var(--amber)' : 'var(--muted)' }}>
                      {col.type === 'numeric' ? fn(col.skew) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'grid', gap: '14px', gridTemplateRows: 'auto auto auto' }}>
          {/* Health Score */}
          <div className="card" style={{ padding: '16px' }}>
            <SectionTitle>Dataset Health Score</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <HealthRing score={health} />
              <div style={{ flex: 1 }}>
                {Object.entries(health_details || {}).map(([key, val]) => (
                  <ProgressRow key={key} label={key.replace(/_/g,' ')} value={val} />
                ))}
              </div>
            </div>
            {analysis.sampled && (
              <div style={{ padding:'10px 14px', background:'rgba(59,130,246,.08)', border:'1px solid rgba(59,130,246,.2)', borderRadius:'6px', fontSize:'12px', color:'#3B82F6', marginBottom:'14px' }}>
                ℹ EDA ran on a {analysis.sample_size?.toLocaleString()} row sample for speed.
                All <strong>{analysis.rows?.toLocaleString()}</strong> rows will be used when you run the pipeline.
              </div>
            )}
          </div>

          {/* Missing Values */}
          <div className="card" style={{ padding: '16px' }}>
            <SectionTitle>Missing Values</SectionTitle>
            {columns?.filter(c => c.missing_pct > 0).length === 0
              ? <div style={{ color: 'var(--teal)', fontSize: '12px' }}>✅ No missing values</div>
              : columns?.filter(c => c.missing_pct > 0).sort((a,b) => b.missing_pct - a.missing_pct).map(col => (
                  <div key={col.name} style={{ marginBottom: '7px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                      <span style={{ color: 'var(--text)' }}>{col.name}</span>
                      <span style={{ color: col.missing_pct > 10 ? 'var(--red)' : 'var(--amber)' }}>{col.missing_pct}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: col.missing_pct + '%', background: col.missing_pct > 10 ? 'var(--red)' : 'var(--amber)' }} />
                    </div>
                  </div>
                ))
            }
          </div>

          {/* Quick stats */}
          <div className="card" style={{ padding: '16px' }}>
            <SectionTitle>Data Quality Flags</SectionTitle>
            <div style={{ display: 'grid', gap: '6px' }}>
              <Flag ok={duplicates === 0} label={`${duplicates} duplicate rows`} />
              <Flag ok={columns?.every(c => c.missing_pct === 0)} label={`${columns?.filter(c=>c.missing_pct>0).length || 0} columns with missing values`} />
              <Flag ok={columns?.filter(c=>c.type==='numeric').every(c=>(c.outliers||0)===0)} label={`${columns?.filter(c=>(c.outliers||0)>0).length || 0} columns with outliers`} />
              <Flag ok={columns?.every(c=>Math.abs(c.skew||0)<=1)} label={`${columns?.filter(c=>Math.abs(c.skew||0)>1).length||0} highly skewed numeric columns`} />
            </div>
          </div>
        </div>
      </div>

      {/* Correlation mini-heatmap */}
      {num_cols?.length >= 2 && correlation && (
        <div className="card" style={{ padding: '16px' }}>
          <SectionTitle>Correlation Overview (Top numeric pairs)</SectionTitle>
          <CorrelationTable correlation={correlation} numCols={num_cols.slice(0, 10)} />
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ color: 'var(--teal)', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>{children}</div>;
}

function TypeBadge({ type }) {
  const map = { numeric: 'tag-teal', categorical: 'tag-amber', datetime: 'tag-blue', text: 'tag-red', unknown: '' };
  return <span className={`tag ${map[type] || ''}`} style={{ fontSize: '10px' }}>{type}</span>;
}

function HealthRing({ score }) {
  const color = score >= 80 ? '#00CBA8' : score >= 60 ? '#FFB300' : '#FF4655';
  const r = 32, cx = 40, cy = 40;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="7"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 40 40)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '17px', fontWeight: 700, color }}>{score}</span>
        <span style={{ fontSize: '9px', color: 'var(--muted)' }}>/100</span>
      </div>
    </div>
  );
}

function ProgressRow({ label, value }) {
  const color = value >= 80 ? 'var(--teal)' : value >= 60 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ marginBottom: '7px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '2px' }}>
        <span style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: value + '%', background: color }} /></div>
    </div>
  );
}

function Flag({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px' }}>
      <span style={{ color: ok ? 'var(--teal)' : 'var(--amber)' }}>{ok ? '✅' : '⚠'}</span>
      <span style={{ color: ok ? 'var(--muted)' : 'var(--text)' }}>{label}</span>
    </div>
  );
}

function CorrelationTable({ correlation, numCols }) {
  const getColor = (v) => {
    if (v == null) return 'transparent';
    const abs = Math.abs(v);
    if (v > 0) return `rgba(0,203,168,${(abs * 0.8).toFixed(2)})`;
    return `rgba(255,70,85,${(abs * 0.8).toFixed(2)})`;
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ fontSize: '10px' }}>
        <thead>
          <tr>
            <th></th>
            {numCols.map(c => <th key={c} style={{ maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '4px' }} title={c}>{c.slice(0,8)}</th>)}
          </tr>
        </thead>
        <tbody>
          {numCols.map(r => (
            <tr key={r}>
              <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap', padding: '3px 6px', fontSize: '9px' }} title={r}>{r.slice(0,10)}</td>
              {numCols.map(c => {
                const v = correlation[r]?.[c];
                return (
                  <td key={c} title={`${r} vs ${c}: ${v?.toFixed ? v.toFixed(3) : '—'}`}
                    style={{ background: getColor(v), textAlign: 'center', border: '1px solid var(--bg)', padding: '3px', minWidth: '38px', color: 'var(--text)', fontSize: '9px' }}>
                    {v != null ? Number(v).toFixed(2) : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '10px', color: 'var(--muted)' }}>
        <span style={{ display: 'inline-block', width: '60px', height: '6px', background: 'linear-gradient(to right,rgba(255,70,85,.8),rgba(26,39,64,.4),rgba(0,203,168,.8))', borderRadius: '2px' }}></span>
        -1 (negative) → 0 → +1 (positive)
      </div>
    </div>
  );
}
