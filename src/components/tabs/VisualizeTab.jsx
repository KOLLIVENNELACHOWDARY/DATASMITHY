// src/components/tabs/VisualizeTab.jsx
import React, { useState, useMemo } from 'react';

const toNum = v => { const n = parseFloat(String(v).replace(/[$,%]/g,'')); return isNaN(n) ? null : n; };
const isMiss = v => v===null||v===undefined||String(v).trim()===''||['nan','null','na','n/a','none','undefined','NaN'].includes(String(v).trim());

export default function VisualizeTab({ analysis, pipelineResult, rawData }) {
  const numCols = analysis.columns.filter(c => c.type === 'numeric');
  const catCols = analysis.columns.filter(c => c.type === 'categorical');

  const [histCol, setHistCol] = useState(numCols[0]?.name || '');
  const [boxCol,  setBoxCol]  = useState(numCols[0]?.name || '');
  const [catCol,  setCatCol]  = useState(catCols[0]?.name || '');

  return (
    <div className="fade-in" style={{ display:'grid', gap:'14px' }}>

      <BeforeAfter analysis={analysis} pipelineResult={pipelineResult} />

      <MissingValuesChart analysis={analysis} />

      {numCols.length > 0 && (
        <div className="card" style={{ padding:'20px' }}>
          <ST>Distribution Histogram</ST>
          <ColumnSelect cols={numCols} value={histCol} onChange={setHistCol} />
          {histCol && <Histogram rawData={rawData} colName={histCol} />}
        </div>
      )}

      {numCols.length > 0 && (
        <div className="card" style={{ padding:'20px' }}>
          <ST>Box Plot — Outlier Detection</ST>
          <ColumnSelect cols={numCols} value={boxCol} onChange={setBoxCol} />
          {boxCol && <BoxPlot column={numCols.find(c=>c.name===boxCol)} />}
        </div>
      )}

      {numCols.length >= 2 && (
        <div className="card" style={{ padding:'20px' }}>
          <ST>Correlation Heatmap</ST>
          <CorrelationHeatmap analysis={analysis} />
        </div>
      )}

      {catCols.length > 0 && (
        <div className="card" style={{ padding:'20px' }}>
          <ST>Category Distribution</ST>
          <ColumnSelect cols={catCols} value={catCol} onChange={setCatCol} />
          {catCol && <CategoryBars column={catCols.find(c=>c.name===catCol)} />}
        </div>
      )}

    </div>
  );
}

// ── Shared UI ───────────────────────────────────────────────────────────────
function ST({ children }) {
  return (
    <div style={{ color:'var(--teal)', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'14px', paddingBottom:'6px', borderBottom:'1px solid var(--border)' }}>
      {children}
    </div>
  );
}

function ColumnSelect({ cols, value, onChange }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={{ marginBottom:'16px', maxWidth:'260px' }}>
      {cols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
    </select>
  );
}

// ── Before / After ──────────────────────────────────────────────────────────
function BeforeAfter({ analysis, pipelineResult }) {
  if (!pipelineResult) return null;

  const before = {
    rows: analysis.rows,
    cols: analysis.cols,
    missing: analysis.columns.reduce((s,c)=>s+c.missing, 0),
    duplicates: analysis.duplicates,
    health: analysis.health,
  };

  const nullsAfter = (pipelineResult.data || []).reduce((s,r) =>
    s + Object.values(r).filter(isMiss).length, 0);

  const after = {
    rows: pipelineResult.processed_rows,
    cols: pipelineResult.processed_cols,
    missing: nullsAfter,
    duplicates: 0,
    health: Math.min(100, before.health + Math.round((before.missing - nullsAfter) / Math.max(before.rows,1) * 30)),
  };

  const ROWS = [
    { label:'Rows',           before:before.rows,       after:after.rows,       fmt:v=>v.toLocaleString() },
    { label:'Columns',        before:before.cols,       after:after.cols,       fmt:v=>v.toString() },
    { label:'Missing Values', before:before.missing,    after:after.missing,    fmt:v=>v.toLocaleString(), goodDown:true },
    { label:'Duplicate Rows', before:before.duplicates, after:after.duplicates, fmt:v=>v.toLocaleString(), goodDown:true },
  ];

  return (
    <div className="card fade-in" style={{ padding:'20px' }}>
      <ST>Before → After</ST>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'16px', marginBottom:'18px' }}>
        {ROWS.map(r => {
          const diff = r.after - r.before;
          const improved = r.goodDown ? diff < 0 : diff > 0;
          return (
            <div key={r.label}>
              <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'6px' }}>{r.label}</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:'6px', flexWrap:'wrap' }}>
                <span style={{ fontSize:'16px', fontWeight:700, color:'var(--muted)', textDecoration:'line-through' }}>
                  {r.fmt(r.before)}
                </span>
                <span style={{ color:'var(--muted)', fontSize:'12px' }}>→</span>
                <span style={{ fontSize:'18px', fontWeight:800, color:'var(--teal)' }}>
                  {r.fmt(r.after)}
                </span>
              </div>
              {diff !== 0 && (
                <div style={{ fontSize:'10px', marginTop:'2px', color: improved ? '#00956B' : '#DC2626' }}>
                  {diff > 0 ? '+' : ''}{r.fmt(diff)} {improved ? '✅' : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'8px' }}>Health Score</div>
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', color:'var(--muted)', marginBottom:'3px' }}>
            <span>Before</span><span>{before.health}/100</span>
          </div>
          <div style={{ height:'6px', background:'#F1F5F9', borderRadius:'3px' }}>
            <div style={{ width:`${before.health}%`, height:'100%', background:'#94A3B8', borderRadius:'3px' }} />
          </div>
        </div>
        <span style={{ color:'var(--muted)' }}>→</span>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', color:'var(--muted)', marginBottom:'3px' }}>
            <span>After</span><span style={{ color:'var(--teal)', fontWeight:700 }}>{Math.min(100,after.health)}/100</span>
          </div>
          <div style={{ height:'6px', background:'#F1F5F9', borderRadius:'3px' }}>
            <div style={{ width:`${Math.min(100,after.health)}%`, height:'100%', background:'#00CBA8', borderRadius:'3px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Missing Values Chart ───────────────────────────────────────────────────
function MissingValuesChart({ analysis }) {
  const cols = analysis.columns.filter(c => c.missing_pct > 0).sort((a,b)=>b.missing_pct-a.missing_pct);
  if (!cols.length) {
    return (
      <div className="card" style={{ padding:'20px' }}>
        <ST>Missing Values</ST>
        <div style={{ padding:'20px', textAlign:'center', color:'var(--teal)', fontSize:'13px' }}>
          ✅ No missing values found in any column!
        </div>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding:'20px' }}>
      <ST>Missing Values by Column</ST>
      <div style={{ display:'grid', gap:'8px' }}>
        {cols.map(c => (
          <div key={c.name} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'120px', fontSize:'11px', color:'var(--text)', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}>
              {c.name}
            </div>
            <div style={{ flex:1, height:'14px', background:'#F1F5F9', borderRadius:'4px', overflow:'hidden' }}>
              <div style={{
                width:`${c.missing_pct}%`, height:'100%',
                background: c.missing_pct>30?'#EF4444':c.missing_pct>10?'#F59E0B':'#00CBA8',
                borderRadius:'4px', transition:'width .5s'
              }} />
            </div>
            <div style={{ width:'60px', fontSize:'11px', color:'var(--muted)', textAlign:'right', flexShrink:0 }}>
              {c.missing_pct}% ({c.missing})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Histogram (SVG) ─────────────────────────────────────────────────────────
function Histogram({ rawData, colName }) {
  const data = useMemo(() => {
    const vals = rawData.map(r => toNum(r[colName])).filter(v => v !== null);
    if (!vals.length) return null;
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const BINS = 16;
    const binWidth = range / BINS;
    const bins = new Array(BINS).fill(0);
    vals.forEach(v => {
      let idx = Math.floor((v - min) / binWidth);
      if (idx >= BINS) idx = BINS - 1;
      if (idx < 0) idx = 0;
      bins[idx]++;
    });
    const maxCount = Math.max(...bins);
    return { bins, min, max, binWidth, maxCount, total: vals.length };
  }, [rawData, colName]);

  if (!data) return <div style={{ color:'var(--muted)', fontSize:'12px' }}>No numeric data available.</div>;

  const W = 600, H = 200, PAD = 30;
  const barW = (W - PAD*2) / data.bins.length;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H+30}`} style={{ width:'100%', maxWidth:'700px', height:'auto' }}>
        {data.bins.map((count, i) => {
          const barH = (count / data.maxCount) * (H - PAD);
          const x = PAD + i * barW;
          const y = H - barH;
          return (
            <g key={i}>
              <rect x={x+1} y={y} width={barW-2} height={barH} fill="#00CBA8" opacity={0.85} rx={2} />
              <title>{count} values</title>
            </g>
          );
        })}
        {/* axis */}
        <line x1={PAD} y1={H} x2={W-PAD} y2={H} stroke="#E2E8F0" strokeWidth={1} />
        <text x={PAD} y={H+20} fontSize="11" fill="#64748B">{data.min.toFixed(1)}</text>
        <text x={W-PAD} y={H+20} fontSize="11" fill="#64748B" textAnchor="end">{data.max.toFixed(1)}</text>
        <text x={W/2} y={H+20} fontSize="11" fill="#64748B" textAnchor="middle">{colName}</text>
      </svg>
      <div style={{ fontSize:'11px', color:'var(--muted)', marginTop:'6px' }}>
        {data.total.toLocaleString()} values · {data.bins.length} bins
      </div>
    </div>
  );
}

// ── Box Plot (SVG) ──────────────────────────────────────────────────────────
function BoxPlot({ column }) {
  if (column.q1 === undefined) return <div style={{ color:'var(--muted)', fontSize:'12px' }}>No statistics available.</div>;

  const { min, max, q1, q3, median, lower_fence, upper_fence, outliers } = column;
  const W = 600, H = 120, PAD = 40;
  const range = max - min || 1;
  const scale = v => PAD + ((v - min) / range) * (W - PAD*2);

  const boxX1 = scale(q1), boxX2 = scale(q3), medX = scale(median);
  const whiskerLo = scale(Math.max(min, lower_fence));
  const whiskerHi = scale(Math.min(max, upper_fence));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', maxWidth:'700px', height:'auto' }}>
        {/* whisker line */}
        <line x1={whiskerLo} y1={H/2} x2={whiskerHi} y2={H/2} stroke="#94A3B8" strokeWidth={2} />
        <line x1={whiskerLo} y1={H/2-12} x2={whiskerLo} y2={H/2+12} stroke="#94A3B8" strokeWidth={2} />
        <line x1={whiskerHi} y1={H/2-12} x2={whiskerHi} y2={H/2+12} stroke="#94A3B8" strokeWidth={2} />

        {/* box */}
        <rect x={boxX1} y={H/2-22} width={boxX2-boxX1} height={44} fill="rgba(0,203,168,.15)" stroke="#00CBA8" strokeWidth={1.5} rx={3} />

        {/* median */}
        <line x1={medX} y1={H/2-22} x2={medX} y2={H/2+22} stroke="#00CBA8" strokeWidth={2.5} />

        {/* axis labels */}
        <text x={whiskerLo} y={H-10} fontSize="10" fill="#64748B" textAnchor="middle">{lower_fence?.toFixed(1)}</text>
        <text x={boxX1} y={H-10} fontSize="10" fill="#64748B" textAnchor="middle">Q1: {q1?.toFixed(1)}</text>
        <text x={medX} y={H-25} fontSize="10" fill="#00956B" fontWeight="700" textAnchor="middle">Median: {median?.toFixed(1)}</text>
        <text x={boxX2} y={H-10} fontSize="10" fill="#64748B" textAnchor="middle">Q3: {q3?.toFixed(1)}</text>
        <text x={whiskerHi} y={H-10} fontSize="10" fill="#64748B" textAnchor="middle">{upper_fence?.toFixed(1)}</text>
      </svg>
      <div style={{ display:'flex', gap:'16px', marginTop:'10px', flexWrap:'wrap', fontSize:'11px', color:'var(--muted)' }}>
        <span>Min: <strong style={{color:'var(--text)'}}>{min?.toFixed(2)}</strong></span>
        <span>Max: <strong style={{color:'var(--text)'}}>{max?.toFixed(2)}</strong></span>
        <span>Mean: <strong style={{color:'var(--text)'}}>{column.mean?.toFixed(2)}</strong></span>
        <span>Std Dev: <strong style={{color:'var(--text)'}}>{column.std?.toFixed(2)}</strong></span>
        {outliers > 0 && (
          <span style={{ color:'#DC2626' }}>⚠ {outliers} outliers detected</span>
        )}
      </div>
    </div>
  );
}

// ── Correlation Heatmap ──────────────────────────────────────────────────────
function CorrelationHeatmap({ analysis }) {
  const cols = Object.keys(analysis.correlation || {});
  if (!cols.length) return <div style={{ color:'var(--muted)', fontSize:'12px' }}>Not enough numeric columns for correlation.</div>;

  const cellColor = (val) => {
    const v = Math.max(-1, Math.min(1, val));
    if (v >= 0) {
      const intensity = Math.round(v * 180);
      return `rgba(0,203,168,${Math.abs(v)})`;
    } else {
      return `rgba(239,68,68,${Math.abs(v)})`;
    }
  };

  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ borderCollapse:'collapse', fontSize:'11px' }}>
        <thead>
          <tr>
            <th style={{ padding:'4px 8px' }}></th>
            {cols.map(c => (
              <th key={c} style={{ padding:'4px 8px', fontSize:'10px', color:'var(--muted)', fontWeight:600, writingMode:'vertical-rl', textOrientation:'mixed', maxHeight:'80px' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map(r => (
            <tr key={r}>
              <td style={{ padding:'4px 8px', fontSize:'10px', color:'var(--muted)', fontWeight:600, whiteSpace:'nowrap' }}>{r}</td>
              {cols.map(c => {
                const val = analysis.correlation[r]?.[c] ?? 0;
                return (
                  <td key={c} title={`${r} vs ${c}: ${val}`} style={{
                    width:'46px', height:'32px', textAlign:'center',
                    background: cellColor(val), color: Math.abs(val)>0.6 ? '#fff' : 'var(--text)',
                    fontSize:'10px', fontWeight: r===c ? 700 : 400,
                    border:'1px solid #fff'
                  }}>
                    {val.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display:'flex', gap:'12px', marginTop:'10px', fontSize:'10px', color:'var(--muted)', alignItems:'center' }}>
        <span style={{ display:'flex', alignItems:'center', gap:'4px' }}>
          <div style={{ width:'12px', height:'12px', background:'rgba(239,68,68,.8)', borderRadius:'2px' }} /> Negative
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:'4px' }}>
          <div style={{ width:'12px', height:'12px', background:'rgba(0,203,168,.8)', borderRadius:'2px' }} /> Positive
        </span>
      </div>
    </div>
  );
}

// ── Category Bars ────────────────────────────────────────────────────────────
function CategoryBars({ column }) {
  if (!column.top_values?.length) return <div style={{ color:'var(--muted)', fontSize:'12px' }}>No category data available.</div>;

  const max = Math.max(...column.top_counts);

  return (
    <div style={{ display:'grid', gap:'8px' }}>
      {column.top_values.map((val, i) => {
        const count = column.top_counts[i];
        const pct = (count / max) * 100;
        return (
          <div key={val} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'120px', fontSize:'11px', color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}>
              {val || '(empty)'}
            </div>
            <div style={{ flex:1, height:'18px', background:'#F1F5F9', borderRadius:'4px', overflow:'hidden' }}>
              <div style={{
                width:`${pct}%`, height:'100%',
                background:'linear-gradient(90deg,#00CBA8,#4B9EFF)',
                borderRadius:'4px', transition:'width .5s',
                display:'flex', alignItems:'center', paddingLeft:'6px'
              }}>
                {pct > 25 && <span style={{ fontSize:'9px', color:'#fff', fontWeight:600 }}>{count.toLocaleString()}</span>}
              </div>
            </div>
            {pct <= 25 && (
              <div style={{ width:'50px', fontSize:'10px', color:'var(--muted)', textAlign:'right', flexShrink:0 }}>
                {count.toLocaleString()}
              </div>
            )}
          </div>
        );
      })}
      {column.unique_count > 6 && (
        <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'4px' }}>
          Showing top 6 of {column.unique_count} unique values
        </div>
      )}
    </div>
  );
}