// src/components/tabs/ScaleTab.jsx
import React from 'react';

const SCALERS = [
  { value: 'standard',   label: 'StandardScaler',        formula: '(x − μ) / σ',       when: 'Normal distributions, most ML algorithms', color: 'var(--teal)' },
  { value: 'minmax',     label: 'MinMaxScaler',           formula: '(x − min)/(max − min)', when: 'Neural networks, bounded [0,1] output', color: 'var(--amber)' },
  { value: 'robust',     label: 'RobustScaler',           formula: '(x − Q2) / IQR',    when: 'Outlier-heavy or skewed data', color: 'var(--blue)' },
  { value: 'maxabs',     label: 'MaxAbsScaler',           formula: 'x / max(|x|)',       when: 'Sparse data, already centered', color: '#9B59B6' },
  { value: 'quantile',   label: 'QuantileTransformer',    formula: 'Rank → Normal/Uniform', when: 'Non-linear distributions', color: '#2ECC71' },
  { value: 'power',      label: 'PowerTransformer (Yeo-Johnson)', formula: 'Yeo-Johnson transform', when: 'Highly skewed features', color: '#E74C3C' },
  { value: 'none',       label: 'No Scaling',             formula: '—',                 when: 'Tree-based models (RF, XGBoost)', color: 'var(--muted)' },
];

export default function ScaleTab({ analysis, config, setConfig }) {
  if (!analysis) return null;
  const numCols = analysis.columns.filter(c => c.type === 'numeric');
  const update = (col, val) => setConfig(p => ({ ...p, [col]: val }));

  const getRecommended = (col) => {
    if (Math.abs(col.skew || 0) > 2) return 'power';
    if ((col.outliers || 0) > 0 || Math.abs(col.skew || 0) > 1) return 'robust';
    return 'standard';
  };

  return (
    <div className="fade-in" style={{ display: 'grid', gap: '14px' }}>
      {/* Scaler cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '10px' }}>
        {SCALERS.filter(s => s.value !== 'none').map(s => (
          <div key={s.value} className="card" style={{ padding: '12px' }}>
            <div style={{ fontWeight: 700, fontSize: '12px', color: s.color, marginBottom: '3px' }}>{s.label}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--muted)', marginBottom: '5px', background: 'var(--bg)', padding: '3px 6px', borderRadius: '3px', display: 'inline-block' }}>{s.formula}</div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', lineHeight: 1.5 }}>{s.when}</div>
          </div>
        ))}
      </div>

      {/* Model-scaler guide */}
      <div className="card" style={{ padding: '14px' }}>
        <SectionTitle>Model ↔ Scaler Compatibility Guide</SectionTitle>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: '11px' }}>
            <thead>
              <tr>
                <th>Model</th>
                <th>Needs Scaling?</th>
                <th>Recommended</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Linear / Logistic Regression', true, 'StandardScaler', 'Sensitive to feature scale'],
                ['SVM', true, 'StandardScaler / MinMax', 'Distance-based kernel'],
                ['Neural Networks', true, 'MinMaxScaler', 'Gradient descent stability'],
                ['KNN', true, 'StandardScaler', 'Distance-based'],
                ['Random Forest', false, 'None', 'Tree splits are scale-invariant'],
                ['XGBoost / LightGBM', false, 'None (optional)', 'Tree-based, scale-invariant'],
                ['K-Means Clustering', true, 'StandardScaler', 'Distance-based'],
              ].map(([m, needs, rec, reason]) => (
                <tr key={m}>
                  <td style={{ fontWeight: 500, color: 'var(--text)' }}>{m}</td>
                  <td><span className={`tag ${needs ? 'tag-amber' : 'tag-teal'}`} style={{ fontSize: '10px' }}>{needs ? 'Yes' : 'No'}</span></td>
                  <td style={{ color: 'var(--teal)', fontSize: '10px' }}>{rec}</td>
                  <td style={{ color: 'var(--muted)', fontSize: '10px' }}>{reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-column config */}
      <div className="card" style={{ padding: '16px' }}>
        <SectionTitle>Per-Column Scaling Strategy</SectionTitle>
        {numCols.length === 0
          ? <div style={{ color: 'var(--muted)', fontSize: '12px' }}>No numeric columns found.</div>
          : (
            <table>
              <thead>
                <tr><th>Column</th><th>Range</th><th>Skewness</th><th>Outliers</th><th>AI Recommends</th><th>Strategy</th></tr>
              </thead>
              <tbody>
                {numCols.map(col => {
                  const rec = getRecommended(col);
                  const current = config[col.name] || rec;
                  const recScaler = SCALERS.find(s => s.value === rec);
                  return (
                    <tr key={col.name}>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{col.name}</td>
                      <td style={{ fontSize: '10px', color: 'var(--muted)' }}>[{col.min?.toFixed(1)}, {col.max?.toFixed(1)}]</td>
                      <td style={{ color: Math.abs(col.skew || 0) > 1 ? 'var(--amber)' : 'var(--muted)' }}>
                        {col.skew?.toFixed(2) ?? '—'}
                      </td>
                      <td style={{ color: (col.outliers || 0) > 0 ? 'var(--amber)' : 'var(--muted)' }}>
                        {col.outliers || 0}
                      </td>
                      <td>
                        <span className="tag" style={{ fontSize: '10px', background: recScaler?.color + '22', color: recScaler?.color, border: `1px solid ${recScaler?.color}44` }}>
                          {rec}
                        </span>
                      </td>
                      <td>
                        <select value={current} onChange={e => update(col.name, e.target.value)}>
                          {SCALERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ color: 'var(--teal)', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>{children}</div>;
}

