// src/components/tabs/MLReadyTab.jsx
import React from 'react';

const MODEL_COMPAT = [
  { name: 'Linear / Logistic Regression', needs: ['no_nulls','no_object_cols','no_inf'], icon: '📈' },
  { name: 'Support Vector Machine',       needs: ['no_nulls','no_object_cols','no_inf'], icon: '🔀' },
  { name: 'Random Forest',                needs: ['no_nulls','no_inf'],                  icon: '🌲' },
  { name: 'XGBoost / LightGBM',           needs: ['no_nulls'],                           icon: '⚡' },
  { name: 'Neural Network (MLP)',          needs: ['no_nulls','no_object_cols','no_inf'], icon: '🧠' },
  { name: 'K-Means Clustering',           needs: ['no_nulls','no_object_cols','no_inf'], icon: '⭕' },
  { name: 'KNN Classifier',               needs: ['no_nulls','no_object_cols','no_inf'], icon: '🔍' },
];

const CHECK_LABELS = {
  no_nulls:        'No null / NaN values remaining',
  no_object_cols:  'All columns are numeric (no string dtype)',
  no_inf:          'No infinite values',
  sufficient_rows: 'Sufficient rows (≥50)',
  sufficient_cols: 'Sufficient columns (≥2)',
};

export default function MLReadyTab({ analysis, pipelineResult, targetCol, setTargetCol }) {
  if (!analysis) return null;
  const checks   = pipelineResult?.ml_checks || {};
  const hasPipeline = !!pipelineResult;
  const allCols  = analysis.columns.map(c => c.name);

  const totalChecks  = Object.keys(CHECK_LABELS).length;
  const passedChecks = Object.entries(CHECK_LABELS).filter(([k]) => checks[k]).length;
  const readiness    = hasPipeline ? Math.round(passedChecks / totalChecks * 100) : null;

  return (
    <div className="fade-in" style={{ display: 'grid', gap: '14px' }}>
      {/* Header message */}
      {!hasPipeline && (
        <div style={{ padding: '14px 18px', background: 'rgba(255,179,0,.1)', border: '1px solid rgba(255,179,0,.3)', borderRadius: '6px', color: 'var(--amber)', fontSize: '12px' }}>
          ⚠ Run the pipeline first (Export tab → "Run Pipeline") to validate ML readiness of your processed dataset.
        </div>
      )}

      {/* Target column */}
      <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px', marginBottom: '4px' }}>Target Column</div>
          <div style={{ color: 'var(--muted)', fontSize: '12px' }}>Required for supervised learning validation and leakage detection.</div>
        </div>
        <select value={targetCol} onChange={e => setTargetCol(e.target.value)} style={{ minWidth: '180px' }}>
          <option value="">— None —</option>
          {allCols.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Readiness Score */}
      {hasPipeline && (
        <div className="card" style={{ padding: '16px' }}>
          <SectionTitle>ML Readiness Checklist</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '36px', fontWeight: 800, color: readiness >= 80 ? 'var(--teal)' : readiness >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                {readiness}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>ML Ready</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="progress-bar" style={{ height: '8px', marginBottom: '8px' }}>
                <div className="progress-fill" style={{ width: readiness + '%', height: '8px', background: readiness >= 80 ? 'var(--teal)' : readiness >= 60 ? 'var(--amber)' : 'var(--red)' }} />
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '11px' }}>
                {passedChecks}/{totalChecks} checks passed
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {Object.entries(CHECK_LABELS).map(([key, label]) => {
              const passed = checks[key];
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--bg)', borderRadius: '5px', border: `1px solid ${passed ? 'rgba(0,203,168,.2)' : 'rgba(255,70,85,.2)'}` }}>
                  <span style={{ fontSize: '16px' }}>{passed ? '✅' : '❌'}</span>
                  <span style={{ color: passed ? 'var(--text)' : 'var(--red)', fontSize: '12px' }}>{label}</span>
                </div>
              );
            })}
            {pipelineResult?.remaining_object_cols?.length > 0 && (
              <div style={{ padding: '8px 12px', background: 'rgba(255,70,85,.1)', borderRadius: '5px', border: '1px solid rgba(255,70,85,.25)', fontSize: '11px', color: 'var(--red)' }}>
                Still has object dtype columns: {pipelineResult.remaining_object_cols.join(', ')} — consider encoding these.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Before/After comparison */}
      {hasPipeline && (
        <div className="card" style={{ padding: '16px' }}>
          <SectionTitle>Before vs After Processing</SectionTitle>
          <table>
            <thead>
              <tr><th>Metric</th><th style={{ color: 'var(--amber)' }}>Before</th><th style={{ color: 'var(--teal)' }}>After</th><th>Change</th></tr>
            </thead>
            <tbody>
              {[
                ['Rows',            pipelineResult.original_rows, pipelineResult.processed_rows],
                ['Columns',         pipelineResult.original_cols, pipelineResult.processed_cols],
                ['Pipeline Steps',  '—',                          pipelineResult.log?.length || 0],
              ].map(([l, b, a]) => {
                const delta = typeof b === 'number' && typeof a === 'number' ? a - b : null;
                return (
                  <tr key={l}>
                    <td style={{ color: 'var(--text)', fontWeight: 500 }}>{l}</td>
                    <td style={{ color: 'var(--amber)', fontWeight: 600 }}>{b}</td>
                    <td style={{ color: 'var(--teal)', fontWeight: 600 }}>{a}</td>
                    <td style={{ color: delta === null ? 'var(--muted)' : delta < 0 ? 'var(--teal)' : delta > 0 ? 'var(--amber)' : 'var(--muted)' }}>
                      {delta !== null ? (delta > 0 ? '+' : '') + delta : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Model compatibility matrix */}
      <div className="card" style={{ padding: '16px' }}>
        <SectionTitle>Model Compatibility Matrix</SectionTitle>
        <table>
          <thead>
            <tr><th>Model</th><th>Compatible {hasPipeline ? '(after pipeline)' : '(estimated)'}</th><th>Requirements</th></tr>
          </thead>
          <tbody>
            {MODEL_COMPAT.map(model => {
              const ok = !hasPipeline ? null : model.needs.every(k => checks[k]);
              return (
                <tr key={model.name}>
                  <td style={{ color: 'var(--text)', fontWeight: 500 }}>{model.icon} {model.name}</td>
                  <td>
                    {ok === null
                      ? <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Run pipeline first</span>
                      : <span className={`tag ${ok ? 'tag-teal' : 'tag-red'}`}>{ok ? '✓ Compatible' : '✗ Not ready'}</span>
                    }
                  </td>
                  <td style={{ fontSize: '10px', color: 'var(--muted)' }}>{model.needs.join(', ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recommendations */}
      <div className="card" style={{ padding: '16px' }}>
        <SectionTitle>Recommendations Based on Your Data</SectionTitle>
        <div style={{ display: 'grid', gap: '8px' }}>
          {analysis.columns.filter(c => c.type === 'numeric').length > analysis.columns.length * 0.7 && (
            <Rec icon="⚡" label="Gradient Boosting" desc="Dataset is mostly numeric — XGBoost or LightGBM are excellent choices." color="var(--amber)" />
          )}
          {analysis.columns.filter(c => c.type === 'categorical').length > analysis.columns.length * 0.3 && (
            <Rec icon="🌲" label="Random Forest / CatBoost" desc="High proportion of categorical features — tree-based methods handle these well." color="var(--teal)" />
          )}
          {analysis.rows < 500 && (
            <Rec icon="📊" label="SVM / KNN" desc="Small dataset — SVM and KNN can perform well with limited data." color="var(--blue)" />
          )}
          {analysis.rows > 10000 && (
            <Rec icon="🧠" label="Neural Networks" desc="Large dataset — neural networks can leverage the scale effectively." color="var(--blue)" />
          )}
          {(analysis.health_details?.ml_readiness || 0) < 70 && (
            <Rec icon="⚠" label="Data quality warning" desc="Dataset health is below 70%. Process the data first to improve model performance." color="var(--red)" />
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ color: 'var(--teal)', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>{children}</div>;
}

function Rec({ icon, label, desc, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: 'var(--bg)', borderRadius: '6px', border: `1px solid ${color}33` }}>
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 600, color, fontSize: '12px', marginBottom: '2px' }}>{label}</div>
        <div style={{ color: 'var(--muted)', fontSize: '11px' }}>{desc}</div>
      </div>
    </div>
  );
}
