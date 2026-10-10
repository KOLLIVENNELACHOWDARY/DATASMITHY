// src/components/tabs/EncodeTab.jsx
import React from 'react';

const ENCODE_STRATEGIES = [
  { value: 'label',     label: 'Label Encoding',     desc: 'Maps categories → integers 0,1,2... Best for ordinal/high-cardinality.' },
  { value: 'onehot',    label: 'One-Hot Encoding',    desc: 'Creates binary columns per category. Best for nominal, low-cardinality (≤5 values).' },
  { value: 'frequency', label: 'Frequency Encoding',  desc: 'Replaces category with its frequency ratio. Good for high-cardinality.' },
  { value: 'ordinal',   label: 'Ordinal Encoding',    desc: 'Similar to label but implies an order. Use when order matters.' },
  { value: 'none',      label: 'Skip',                desc: 'Leave column as-is. Use for target column or columns you want to keep raw.' },
];

export default function EncodeTab({ analysis, config, setConfig }) {
  if (!analysis) return null;
  const catCols = analysis.columns.filter(c => c.type === 'categorical' || c.type === 'text');
  const update = (col, val) => setConfig(p => ({ ...p, [col]: val }));

  return (
    <div className="fade-in" style={{ display: 'grid', gap: '14px' }}>
      {/* Strategy legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '10px' }}>
        {ENCODE_STRATEGIES.filter(s => s.value !== 'none').map(s => (
          <div key={s.value} className="card" style={{ padding: '12px' }}>
            <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--teal)', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Column config table */}
      <div className="card" style={{ padding: '16px' }}>
        <SectionTitle>Per-Column Encoding Strategy</SectionTitle>
        {catCols.length === 0
          ? <div style={{ color: 'var(--teal)', fontSize: '12px' }}>✅ No categorical or text columns found</div>
          : (
            <table>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Type</th>
                  <th>Unique Values</th>
                  <th>Top Categories</th>
                  <th>AI Recommends</th>
                  <th>Strategy</th>
                  <th>New Columns</th>
                </tr>
              </thead>
              <tbody>
                {catCols.map(col => {
                  const uCount = col.unique_count || 0;
                  const recommend = uCount <= 5 ? 'onehot' : uCount > 50 ? 'frequency' : 'label';
                  const current = config[col.name] || recommend;
                  const newCols = current === 'onehot' ? uCount : 1;
                  return (
                    <tr key={col.name}>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{col.name}</td>
                      <td><span className={`tag ${col.type === 'categorical' ? 'tag-amber' : 'tag-red'}`} style={{ fontSize: '10px' }}>{col.type}</span></td>
                      <td>
                        <span style={{ color: uCount > 50 ? 'var(--red)' : uCount > 10 ? 'var(--amber)' : 'var(--teal)', fontWeight: 600 }}>
                          {uCount}
                        </span>
                      </td>
                      <td style={{ fontSize: '10px', color: 'var(--muted)', maxWidth: '140px' }}>
                        {(col.top_values || []).slice(0, 3).join(', ')}
                      </td>
                      <td>
                        <span className={`tag ${recommend === 'onehot' ? 'tag-amber' : recommend === 'frequency' ? 'tag-red' : 'tag-teal'}`} style={{ fontSize: '10px' }}>
                          {recommend}
                        </span>
                      </td>
                      <td>
                        <select value={current} onChange={e => update(col.name, e.target.value)}>
                          {ENCODE_STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '11px' }}>
                        {current === 'none' ? '—' : current === 'onehot' ? `+${newCols} cols` : '1 col (replaced)'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        }
      </div>

      {/* Warning for high-cardinality one-hot */}
      {catCols.some(c => (c.unique_count || 0) > 20 && (config[c.name] === 'onehot')) && (
        <div style={{ padding: '10px 14px', background: 'rgba(255,179,0,.1)', border: '1px solid rgba(255,179,0,.3)', borderRadius: '6px', fontSize: '12px', color: 'var(--amber)' }}>
          ⚠ Some columns with one-hot encoding have &gt;20 unique values. This may create many columns. Consider Label or Frequency encoding instead.
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ color: 'var(--teal)', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>{children}</div>;
}