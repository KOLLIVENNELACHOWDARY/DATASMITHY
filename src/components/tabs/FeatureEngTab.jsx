// src/components/tabs/FeatureEngTab.jsx
import React from 'react';

export default function FeatureEngTab({ analysis, config, setConfig, selectConfig, setSelectConfig, targetCol, setTargetCol }) {
  if (!analysis) return null;
  const { columns } = analysis;
  const numCols = columns.filter(c => c.type === 'numeric').map(c => c.name);
  const allCols = columns.map(c => c.name);

  const toggle = (key) => setConfig(p => ({ ...p, [key]: !p[key] }));
  const toggleSel = (key) => setSelectConfig(p => ({ ...p, [key]: !p[key] }));
  const updateSel = (key, val) => setSelectConfig(p => ({ ...p, [key]: val }));

  return (
    <div className="fade-in" style={{ display: 'grid', gap: '14px' }}>
      {/* Target Column */}
      <div className="card" style={{ padding: '16px' }}>
        <SectionTitle>Target Column (Optional)</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--muted)', fontSize: '12px', flex: 1 }}>
            Specify your target/label column. DataSmithy will protect it from being dropped or transformed during feature selection.
          </div>
          <select value={targetCol} onChange={e => setTargetCol(e.target.value)} style={{ minWidth: '180px' }}>
            <option value="">— None selected —</option>
            {allCols.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Date/Time Feature Extraction */}
      <div className="card" style={{ padding: '16px' }}>
        <SectionTitle>Date & Time Feature Extraction</SectionTitle>
        <ToggleRow
          enabled={config.datetime_extract}
          onToggle={() => toggle('datetime_extract')}
          label="Auto-extract datetime features"
          desc="Automatically detects date/time columns and extracts: year, month, day, weekday, quarter, is_weekend. Original column is replaced."
        />
        {config.datetime_extract && (
          <div style={{ marginTop: '10px', padding: '10px', background: 'var(--bg)', borderRadius: '5px', fontSize: '11px', color: 'var(--muted)' }}>
            Will create columns: <span style={{ color: 'var(--teal)' }}>_year, _month, _day, _weekday, _quarter, _is_weekend</span> for each detected datetime column.
          </div>
        )}
      </div>

      {/* Log Transform */}
      <div className="card" style={{ padding: '16px' }}>
        <SectionTitle>Log Transformation</SectionTitle>
        <ToggleRow
          enabled={config.log_transform}
          onToggle={() => toggle('log_transform')}
          label="Apply log1p transform to skewed columns"
          desc="Applies numpy.log1p to reduce right skewness. Best for columns with skewness > 1 and all positive values."
        />
        {config.log_transform && numCols.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>Select columns to log-transform:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {columns.filter(c => c.type === 'numeric').map(col => {
                const selected = (config.log_cols || []).includes(col.name);
                const skewed = Math.abs(col.skew || 0) > 1;
                return (
                  <button key={col.name} onClick={() => {
                    const cur = config.log_cols || [];
                    setConfig(p => ({ ...p, log_cols: selected ? cur.filter(c => c !== col.name) : [...cur, col.name] }));
                  }} style={{
                    background: selected ? 'var(--teal-dim)' : 'var(--surf)',
                    color: selected ? 'var(--teal)' : 'var(--muted)',
                    border: `1px solid ${selected ? 'var(--teal)' : 'var(--border)'}`,
                    borderRadius: '4px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer'
                  }}>
                    {col.name} {skewed ? '⚠' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Binning */}
      <div className="card" style={{ padding: '16px' }}>
        <SectionTitle>Binning / Discretization</SectionTitle>
        <ToggleRow
          enabled={config.binning}
          onToggle={() => toggle('binning')}
          label="Convert continuous columns into discrete bins"
          desc="Creates a new '_bin' column with integer bin labels. Useful for decision trees and converting continuous to ordinal."
        />
        {config.binning && numCols.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>Configure bins per column:</div>
            <table>
              <thead><tr><th>Column</th><th>Enable</th><th>Number of Bins</th><th>New Column</th></tr></thead>
              <tbody>
                {columns.filter(c => c.type === 'numeric').map(col => {
                  const binCols = config.bin_cols || {};
                  const enabled = col.name in binCols;
                  return (
                    <tr key={col.name}>
                      <td style={{ color: 'var(--text)', fontWeight: 500 }}>{col.name}</td>
                      <td>
                        <input type="checkbox" checked={enabled} onChange={e => {
                          const bc = { ...(config.bin_cols || {}) };
                          if (e.target.checked) bc[col.name] = 5; else delete bc[col.name];
                          setConfig(p => ({ ...p, bin_cols: bc }));
                        }} />
                      </td>
                      <td>
                        {enabled && (
                          <input type="number" min={2} max={20} value={binCols[col.name] || 5}
                            onChange={e => setConfig(p => ({ ...p, bin_cols: { ...p.bin_cols, [col.name]: e.target.value } }))}
                            style={{ width: '70px' }} />
                        )}
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '11px' }}>{enabled ? `${col.name}_bin` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feature Selection */}
      <div className="card" style={{ padding: '16px' }}>
        <SectionTitle>Feature Selection</SectionTitle>
        <div style={{ display: 'grid', gap: '12px' }}>
          {/* Drop correlated */}
          <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '6px' }}>
            <ToggleRow
              enabled={selectConfig.drop_correlated}
              onToggle={() => toggleSel('drop_correlated')}
              label="Drop highly correlated features"
              desc="Removes one of a pair of columns whose Pearson |r| exceeds the threshold. Reduces multicollinearity."
            />
            {selectConfig.drop_correlated && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Correlation threshold:</span>
                <input type="number" min={0.5} max={1} step={0.01} value={selectConfig.corr_threshold}
                  onChange={e => updateSel('corr_threshold', parseFloat(e.target.value))}
                  style={{ width: '80px' }} />
                <span style={{ fontSize: '11px', color: 'var(--teal)' }}>Current: {selectConfig.corr_threshold}</span>
              </div>
            )}
          </div>

          {/* Low variance */}
          <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '6px' }}>
            <ToggleRow
              enabled={selectConfig.drop_low_variance}
              onToggle={() => toggleSel('drop_low_variance')}
              label="Drop low-variance features"
              desc="Removes features with near-zero variance. These carry little information for ML models."
            />
            {selectConfig.drop_low_variance && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Variance threshold:</span>
                <input type="number" min={0} max={1} step={0.001} value={selectConfig.var_threshold}
                  onChange={e => updateSel('var_threshold', parseFloat(e.target.value))}
                  style={{ width: '80px' }} />
              </div>
            )}
          </div>

          {/* PCA */}
          <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '6px' }}>
            <ToggleRow
              enabled={selectConfig.pca}
              onToggle={() => toggleSel('pca')}
              label="Dimensionality Reduction (PCA)"
              desc="Reduces numeric features to N principal components. Keeps maximum variance in fewer dimensions."
            />
            {selectConfig.pca && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Target components (N):</span>
                <input type="number" min={1} max={50} value={selectConfig.pca_n}
                  onChange={e => updateSel('pca_n', parseInt(e.target.value))}
                  style={{ width: '80px' }} />
                <span style={{ fontSize: '11px', color: 'var(--amber)' }}>⚠ Replaces numeric features with PCA_{'{1..N}'} columns</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ color: 'var(--teal)', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>{children}</div>;
}

function ToggleRow({ enabled, onToggle, label, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <button onClick={onToggle} style={{
        width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', flexShrink: 0, marginTop: '1px',
        background: enabled ? 'var(--teal)' : 'var(--border)', transition: 'background .2s', position: 'relative'
      }}>
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
          position: 'absolute', top: '3px', transition: 'left .2s',
          left: enabled ? '21px' : '3px'
        }} />
      </button>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px', marginBottom: '2px' }}>{label}</div>
        <div style={{ color: 'var(--muted)', fontSize: '11px', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

