// src/components/tabs/CleanTab.jsx
import React from 'react';

const MISS_STRATEGIES_NUMERIC = [
  { value: 'none', label: 'None — keep as is' },
  { value: 'mean', label: 'Mean imputation' },
  { value: 'median', label: 'Median imputation' },
  { value: 'mode', label: 'Mode (most frequent)' },
  { value: 'ffill', label: 'Forward Fill' },
  { value: 'bfill', label: 'Backward Fill' },
  { value: 'constant', label: 'Constant (0)' },
  { value: 'knn', label: 'KNN Imputation' },
  { value: 'drop_row', label: 'Drop rows' },
  { value: 'drop_col', label: 'Drop column' },
];
const MISS_STRATEGIES_CAT = [
  { value: 'none', label: 'None — keep as is' },
  { value: 'mode', label: 'Mode (most frequent)' },
  { value: 'constant', label: 'Constant ("Unknown")' },
  { value: 'drop_row', label: 'Drop rows' },
  { value: 'drop_col', label: 'Drop column' },
];
const OUTLIER_STRATEGIES = [
  { value: 'keep', label: 'Keep — no action' },
  { value: 'cap', label: 'Cap to IQR fences' },
  { value: 'remove', label: 'Remove rows' },
  { value: 'flag', label: 'Flag with new column' },
];

export default function CleanTab({ analysis, config, setConfig, outlierConfig, setOutlierConfig }) {
  if (!analysis) return null;
  const { columns, duplicates } = analysis;
  const missCols = columns.filter(c => c.missing_pct > 0);
  const numCols  = columns.filter(c => c.type === 'numeric');

  const update = (col, val) => setConfig(p => ({ ...p, [col]: val }));
  const updateOut = (col, val) => setOutlierConfig(p => ({ ...p, [col]: val }));

  return (
    <div className="fade-in" style={{ display: 'grid', gap: '14px' }}>
      {/* Duplicates */}
      <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontSize: '32px', fontWeight: 800, color: duplicates > 0 ? 'var(--amber)' : 'var(--teal)' }}>{duplicates}</div>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px' }}>Duplicate rows detected</div>
          <div style={{ color: 'var(--muted)', fontSize: '12px' }}>{duplicates > 0 ? 'Will be automatically removed during pipeline.' : 'No duplicates — dataset is clean on this dimension.'}</div>
        </div>
        {duplicates > 0 && <span className="tag tag-amber" style={{ marginLeft: 'auto' }}>Auto-remove ✓</span>}
      </div>

      {/* Missing value strategies */}
      <div className="card" style={{ padding: '16px' }}>
        <SectionTitle>Missing Value Strategy</SectionTitle>
        {missCols.length === 0
          ? <div style={{ color: 'var(--teal)', fontSize: '12px' }}>✅ No missing values found in this dataset</div>
          : (
            <table>
              <thead>
                <tr><th>Column</th><th>Type</th><th>Missing</th><th>AI Suggestion</th><th>Your Strategy</th></tr>
              </thead>
              <tbody>
                {missCols.map(col => {
                  const strategies = col.type === 'numeric' ? MISS_STRATEGIES_NUMERIC : MISS_STRATEGIES_CAT;
                  const suggestion = col.type === 'numeric'
                    ? (Math.abs(col.skew || 0) > 1 ? 'median' : 'mean')
                    : 'mode';
                  return (
                    <tr key={col.name}>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{col.name}</td>
                      <td><TypeBadge type={col.type} /></td>
                      <td>
                        <span style={{ color: col.missing_pct > 10 ? 'var(--red)' : 'var(--amber)', fontWeight: 600 }}>
                          {col.missing} ({col.missing_pct}%)
                        </span>
                      </td>
                      <td><span className="tag tag-teal" style={{ fontSize: '10px' }}>{suggestion}</span></td>
                      <td>
                        <select value={config[col.name] || 'none'} onChange={e => update(col.name, e.target.value)}>
                          {strategies.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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

      {/* Outlier treatment */}
      <div className="card" style={{ padding: '16px' }}>
        <SectionTitle>Outlier Detection & Treatment (IQR Method)</SectionTitle>
        {numCols.filter(c => (c.outliers || 0) > 0).length === 0
          ? <div style={{ color: 'var(--teal)', fontSize: '12px' }}>✅ No significant outliers detected using IQR method</div>
          : (
            <table>
              <thead>
                <tr><th>Column</th><th>Outliers</th><th>Lower Fence</th><th>Upper Fence</th><th>Skewness</th><th>Treatment</th></tr>
              </thead>
              <tbody>
                {numCols.map(col => (
                  <tr key={col.name}>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{col.name}</td>
                    <td style={{ color: (col.outliers || 0) > 0 ? 'var(--amber)' : 'var(--muted)' }}>{col.outliers || 0}</td>
                    <td style={{ color: 'var(--muted)', fontSize: '11px' }}>{col.lower_fence?.toFixed(3) ?? '—'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: '11px' }}>{col.upper_fence?.toFixed(3) ?? '—'}</td>
                    <td style={{ color: Math.abs(col.skew || 0) > 1 ? 'var(--amber)' : 'var(--muted)' }}>{col.skew?.toFixed(2) ?? '—'}</td>
                    <td>
                      <select value={outlierConfig[col.name] || 'keep'} onChange={e => updateOut(col.name, e.target.value)}>
                        {OUTLIER_STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
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
function TypeBadge({ type }) {
  const map = { numeric: 'tag-teal', categorical: 'tag-amber', datetime: 'tag-blue', text: 'tag-red' };
  return <span className={`tag ${map[type] || ''}`} style={{ fontSize: '10px' }}>{type}</span>;
}