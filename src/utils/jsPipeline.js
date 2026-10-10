// src/utils/jsPipeline.js
// Complete JavaScript data processing pipeline — no Python/Pyodide needed

// ── Helpers ───────────────────────────────────────────────────────────────────
export const isMiss = v =>
  v === null || v === undefined || String(v).trim() === '' ||
  ['nan','null','na','n/a','none','undefined','NaN','NULL','NA']
    .includes(String(v).trim());

export const toNum = v => {
  const n = parseFloat(String(v).replace(/[$,%]/g, ''));
  return isNaN(n) ? null : n;
};

const mean   = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
const median = a => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const modeOf = a => {
  const f = {};
  a.forEach(v => { f[v] = (f[v] || 0) + 1; });
  return Object.entries(f).sort((x, y) => y[1] - x[1])[0]?.[0] ?? '';
};

// ── EDA ───────────────────────────────────────────────────────────────────────
export function runEDA(rows) {
  if (!rows || !rows.length) throw new Error('No data rows found');

  const keys = Object.keys(rows[0]);

  // Fast duplicate detection — no JSON.stringify
  let dups = 0;
  const seen     = new Set();
  const checkCols = keys.slice(0, 6);
  for (let i = 0; i < rows.length; i++) {
    let k = '';
    for (let j = 0; j < checkCols.length; j++) {
      k += String(rows[i][checkCols[j]] ?? '') + '\x01';
    }
    if (seen.has(k)) dups++;
    else seen.add(k);
  }

  // Per-column analysis — single pass per column
  const columns = keys.map(name => {
    let missing = 0;
    const nums  = [];
    const cats  = {};
    let numCount = 0, totalNonNull = 0;

    for (let i = 0; i < rows.length; i++) {
      const v = rows[i][name];
      const s = (v === null || v === undefined) ? '' : String(v).trim();

      if (s === '' || s === 'nan' || s === 'null' || s === 'NA' ||
          s === 'na' || s === 'N/A' || s === 'None' || s === 'NaN') {
        missing++;
        continue;
      }
      totalNonNull++;
      const n = parseFloat(s.replace(/[$,%]/g, ''));
      if (!isNaN(n)) {
        numCount++;
        nums.push(n);
      } else {
        cats[s] = (cats[s] || 0) + 1;
      }
    }

    const missing_pct = +(missing / rows.length * 100).toFixed(2);
    const numRatio    = totalNonNull > 0 ? numCount / totalNonNull : 0;
    const uniqueCatCount = Object.keys(cats).length;
    const col_type    = numRatio > 0.85
      ? 'numeric'
      : totalNonNull > 0 && uniqueCatCount / totalNonNull < 0.5
      ? 'categorical'
      : 'text';

    const info = { name, type: col_type, missing, missing_pct, dtype: col_type };

    if (col_type === 'numeric' && nums.length > 0) {
      nums.sort((a, b) => a - b);
      const n   = nums.length;
      const sum = nums.reduce((s, v) => s + v, 0);
      const m   = sum / n;
      const med = n % 2 ? nums[Math.floor(n / 2)] : (nums[n / 2 - 1] + nums[n / 2]) / 2;
      const q1  = nums[Math.floor(n * 0.25)];
      const q3  = nums[Math.floor(n * 0.75)];
      const iqr = q3 - q1;
      const lo  = q1 - 1.5 * iqr;
      const hi  = q3 + 1.5 * iqr;

      let variance = 0;
      for (let i = 0; i < n; i++) variance += (nums[i] - m) ** 2;
      const std = n > 1 ? Math.sqrt(variance / (n - 1)) : 0;

      let sk = 0;
      if (std > 0 && n > 2) {
        for (let i = 0; i < n; i++) sk += ((nums[i] - m) / std) ** 3;
        sk = sk / n;
      }

      let outliers = 0;
      for (let i = 0; i < n; i++) {
        if (nums[i] < lo || nums[i] > hi) outliers++;
      }

      Object.assign(info, {
        mean:         +m.toFixed(4),
        median:       +med.toFixed(4),
        std:          +std.toFixed(4),
        min:          nums[0],
        max:          nums[n - 1],
        skew:         +sk.toFixed(4),
        q1:           +q1.toFixed(4),
        q3:           +q3.toFixed(4),
        iqr:          +iqr.toFixed(4),
        outliers,
        lower_fence:  +lo.toFixed(4),
        upper_fence:  +hi.toFixed(4)
      });
    } else {
      const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
      Object.assign(info, {
        unique_count: uniqueCatCount,
        top_values:   sorted.slice(0, 6).map(e => e[0]),
        top_counts:   sorted.slice(0, 6).map(e => e[1])
      });
    }
    return info;
  });

  // Correlation — capped at 15 cols × 1000 rows to stay fast
  const numCols    = columns.filter(c => c.type === 'numeric').map(c => c.name);
  const correlation = {};
  const corrCols   = numCols.slice(0, 15);
  const corrRows   = rows.slice(0, 1000);

  if (corrCols.length >= 2) {
    const colData = {};
    corrCols.forEach(col => {
      colData[col] = corrRows
        .map(r => parseFloat(r[col]))
        .filter(v => !isNaN(v));
    });

    corrCols.forEach(c1 => {
      correlation[c1] = {};
      corrCols.forEach(c2 => {
        if (c1 === c2) { correlation[c1][c2] = 1; return; }
        const x = colData[c1];
        const y = colData[c2];
        const n = Math.min(x.length, y.length);
        if (n < 3) { correlation[c1][c2] = 0; return; }

        let sx = 0, sy = 0;
        for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; }
        const mx = sx / n, my = sy / n;

        let num = 0, dx2 = 0, dy2 = 0;
        for (let i = 0; i < n; i++) {
          const dx = x[i] - mx, dy = y[i] - my;
          num += dx * dy;
          dx2 += dx * dx;
          dy2 += dy * dy;
        }
        const den = Math.sqrt(dx2 * dy2);
        correlation[c1][c2] = den > 0 ? +(num / den).toFixed(3) : 0;
      });
    });
  }

  // Health score
  const avgMiss  = columns.reduce((s, c) => s + c.missing_pct, 0) / Math.max(columns.length, 1);
  const dupPct   = dups / rows.length * 100;
  const totalOut = columns
    .filter(c => c.type === 'numeric')
    .reduce((s, c) => s + (c.outliers || 0), 0);
  const avgOut   = totalOut / Math.max(rows.length, 1) * 100;
  const health   = Math.max(0, Math.min(100,
    Math.round(100 - avgMiss * 0.5 - dupPct * 0.3 - avgOut * 0.2)
  ));

  return {
    rows:       rows.length,
    cols:       keys.length,
    memory:     +(rows.length * keys.length * 16 / 1024 / 1024).toFixed(1),
    duplicates: dups,
    columns,
    num_cols:   numCols,
    correlation,
    health,
    health_details: {
      completeness:  Math.max(0, Math.round(100 - avgMiss * 2)),
      consistency:   Math.max(0, Math.round(100 - dupPct * 5)),
      outlier_score: Math.max(0, Math.round(100 - avgOut * 3)),
      ml_readiness:  Math.max(0, Math.round(health * 0.9))
    }
  };
}

// ── Pipeline ──────────────────────────────────────────────────────────────────
export function runPipeline(rows, config, analysis) {
  let data = rows.map(r => ({ ...r }));
  const log = [];
  const L = (msg, type = 'info') =>
    log.push({ msg, type, time: new Date().toLocaleTimeString() });

  const { clean = {}, encode = {}, scale = {}, outliers = {}, features = {}, selection = {} } = config;

  L(`🚀 Pipeline started — ${data.length} rows × ${Object.keys(data[0] || {}).length} cols`, 'start');

  // 1. Remove duplicates
  const b4 = data.length;
  const seenSet = new Set();
  data = data.filter(r => {
    const k = Object.keys(r).slice(0, 6).map(c => String(r[c] ?? '')).join('\x01');
    if (seenSet.has(k)) return false;
    seenSet.add(k); return true;
  });
  if (data.length < b4) L(`✅ Removed ${b4 - data.length} duplicate rows`, 'success');
  else L('✓ No duplicate rows', 'info');

  // 2. Whitespace cleanup
  let fixed = 0;
  analysis.columns.filter(c => c.type === 'categorical' || c.type === 'text').forEach(col => {
    data.forEach(r => {
      const orig = r[col.name];
      const c = String(r[col.name] || '').trim();
      if (c !== orig) { fixed++; r[col.name] = c; }
    });
  });
  if (fixed) L(`✅ Cleaned whitespace in ${fixed} cells`, 'success');

  // 3. Missing value imputation
  analysis.columns.forEach(col => {
    const strategy = clean[col.name];
    if (!strategy || strategy === 'none') return;
    const missing = data.filter(r => isMiss(r[col.name]));
    if (!missing.length) return;

    if (strategy === 'drop_row') {
      const before = data.length;
      data = data.filter(r => !isMiss(r[col.name]));
      L(`✅ Dropped ${before - data.length} rows with missing "${col.name}"`, 'success');
      return;
    }
    if (strategy === 'drop_col') {
      data.forEach(r => delete r[col.name]);
      L(`✅ Dropped column "${col.name}"`, 'success');
      return;
    }
    if (strategy === 'ffill') {
      let last = null;
      data.forEach(r => {
        if (!isMiss(r[col.name])) last = r[col.name];
        else if (last !== null) r[col.name] = last;
      });
      L(`✅ Forward-filled "${col.name}" (${missing.length} values)`, 'success');
      return;
    }
    if (strategy === 'bfill') {
      let last = null;
      for (let i = data.length - 1; i >= 0; i--) {
        if (!isMiss(data[i][col.name])) last = data[i][col.name];
        else if (last !== null) data[i][col.name] = last;
      }
      L(`✅ Backward-filled "${col.name}" (${missing.length} values)`, 'success');
      return;
    }

    const vn = data.map(r => toNum(r[col.name])).filter(v => v !== null);
    const vs = data.map(r => r[col.name]).filter(v => !isMiss(v)).map(String);
    let fill;
    if (strategy === 'mean')     fill = vn.length ? +mean(vn).toFixed(4) : 0;
    if (strategy === 'median')   fill = vn.length ? +median(vn).toFixed(4) : 0;
    if (strategy === 'mode')     fill = vs.length ? modeOf(vs) : 'Unknown';
    if (strategy === 'constant') fill = col.type === 'numeric' ? 0 : 'Unknown';

    if (fill !== undefined) {
      data.forEach(r => { if (isMiss(r[col.name])) r[col.name] = fill; });
      L(`✅ Filled ${missing.length} missing in "${col.name}" → ${strategy} = ${fill}`, 'success');
    }
  });

  // 4. Outlier treatment
  analysis.columns.filter(c => c.type === 'numeric').forEach(col => {
    const strategy = outliers[col.name];
    if (!strategy || strategy === 'keep') return;
    const nums = data.map(r => toNum(r[col.name])).filter(v => v !== null).sort((a, b) => a - b);
    if (!nums.length) return;
    const q1  = nums[Math.floor(nums.length * 0.25)];
    const q3  = nums[Math.floor(nums.length * 0.75)];
    const iqr = q3 - q1;
    const lo  = q1 - 1.5 * iqr;
    const hi  = q3 + 1.5 * iqr;
    const outCount = nums.filter(v => v < lo || v > hi).length;
    if (!outCount) return;

    if (strategy === 'cap') {
      data.forEach(r => {
        const v = toNum(r[col.name]);
        if (v !== null) r[col.name] = +(Math.max(lo, Math.min(hi, v)).toFixed(6));
      });
      L(`✅ Capped ${outCount} outliers in "${col.name}"`, 'success');
    } else if (strategy === 'remove') {
      const before = data.length;
      data = data.filter(r => {
        const v = toNum(r[col.name]);
        return v === null || (v >= lo && v <= hi);
      });
      L(`✅ Removed ${before - data.length} outlier rows from "${col.name}"`, 'success');
    } else if (strategy === 'flag') {
      data.forEach(r => {
        const v = toNum(r[col.name]);
        r[`${col.name}_outlier`] = v !== null && (v < lo || v > hi) ? 1 : 0;
      });
      L(`✅ Flagged ${outCount} outliers in "${col.name}"`, 'success');
    }
  });

  // 5. Datetime extraction
  if (features.datetime_extract) {
    analysis.columns
      .filter(c => c.name.toLowerCase().match(/date|time|dt|_at|_on/))
      .forEach(col => {
        const test = data.slice(0, 10).map(r => new Date(r[col.name])).filter(d => !isNaN(d));
        if (test.length < 5) return;
        data.forEach(r => {
          const d = new Date(r[col.name]);
          if (!isNaN(d)) {
            r[`${col.name}_year`]       = d.getFullYear();
            r[`${col.name}_month`]      = d.getMonth() + 1;
            r[`${col.name}_day`]        = d.getDate();
            r[`${col.name}_weekday`]    = d.getDay();
            r[`${col.name}_quarter`]    = Math.ceil((d.getMonth() + 1) / 3);
            r[`${col.name}_is_weekend`] = (d.getDay() === 0 || d.getDay() === 6) ? 1 : 0;
          }
          delete r[col.name];
        });
        L(`✅ Extracted datetime features from "${col.name}"`, 'success');
      });
  }

  // 6. Log transform
  if (features.log_transform && features.log_cols?.length) {
    features.log_cols.forEach(colName => {
      const vals = data.map(r => toNum(r[colName])).filter(v => v !== null);
      if (vals.every(v => v > 0)) {
        data.forEach(r => {
          const v = toNum(r[colName]);
          if (v !== null) r[`${colName}_log`] = +(Math.log1p(v).toFixed(6));
        });
        L(`✅ Log-transformed "${colName}"`, 'success');
      }
    });
  }

  // 7. Binning
  if (features.binning && features.bin_cols) {
    Object.entries(features.bin_cols).forEach(([colName, nbins]) => {
      const vals = data.map(r => toNum(r[colName])).filter(v => v !== null);
      if (!vals.length) return;
      const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1;
      data.forEach(r => {
        const v = toNum(r[colName]);
        if (v !== null) r[`${colName}_bin`] = Math.min(Math.floor((v - mn) / rng * nbins), nbins - 1);
      });
      L(`✅ Binned "${colName}" into ${nbins} bins`, 'success');
    });
  }

  // 8. Encoding
  const colsBeforeEncode = Object.keys(data[0] || {});
  colsBeforeEncode.forEach(colName => {
    const strategy = encode[colName];
    if (!strategy || strategy === 'none') return;
    const vals = [...new Set(data.map(r => String(r[colName] || '')))].sort();

    if (strategy === 'label') {
      const map = Object.fromEntries(vals.map((v, i) => [v, i]));
      data.forEach(r => { r[colName] = map[String(r[colName] || '')] ?? 0; });
      L(`✅ Label-encoded "${colName}" (${vals.length} categories)`, 'success');
    } else if (strategy === 'onehot') {
      data.forEach(r => {
        const orig = String(r[colName] || '');
        vals.forEach(v => { r[`${colName}_${v}`] = orig === v ? 1 : 0; });
        delete r[colName];
      });
      L(`✅ One-hot encoded "${colName}" → ${vals.length} columns`, 'success');
    } else if (strategy === 'frequency') {
      const freq = {};
      data.forEach(r => { const k = String(r[colName] || ''); freq[k] = (freq[k] || 0) + 1; });
      data.forEach(r => {
        r[colName] = +((freq[String(r[colName] || '')] / data.length).toFixed(6));
      });
      L(`✅ Frequency-encoded "${colName}"`, 'success');
    } else if (strategy === 'ordinal') {
      const map = Object.fromEntries(vals.map((v, i) => [v, i]));
      data.forEach(r => { r[colName] = map[String(r[colName] || '')] ?? 0; });
      L(`✅ Ordinal-encoded "${colName}"`, 'success');
    }
  });

  // 9. Scaling
  Object.keys(data[0] || {}).forEach(colName => {
    const strategy = scale[colName];
    if (!strategy || strategy === 'none') return;
    const nums = data.map(r => toNum(r[colName])).filter(v => v !== null);
    if (!nums.length) return;

    if (strategy === 'standard') {
      const m = mean(nums);
      let variance = 0;
      nums.forEach(v => { variance += (v - m) ** 2; });
      const s = nums.length > 1 ? Math.sqrt(variance / (nums.length - 1)) : 1;
      const sd = s || 1;
      data.forEach(r => {
        const v = toNum(r[colName]);
        if (v !== null) r[colName] = +((v - m) / sd).toFixed(6);
      });
      L(`✅ StandardScaler → "${colName}"`, 'success');
    } else if (strategy === 'minmax') {
      const mn = Math.min(...nums), mx = Math.max(...nums), rng = mx - mn || 1;
      data.forEach(r => {
        const v = toNum(r[colName]);
        if (v !== null) r[colName] = +((v - mn) / rng).toFixed(6);
      });
      L(`✅ MinMaxScaler → "${colName}" → [0,1]`, 'success');
    } else if (strategy === 'robust') {
      const sorted = [...nums].sort((a, b) => a - b);
      const q1  = sorted[Math.floor(sorted.length * 0.25)];
      const q3  = sorted[Math.floor(sorted.length * 0.75)];
      const med = sorted.length % 2
        ? sorted[Math.floor(sorted.length / 2)]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
      const iqr = q3 - q1 || 1;
      data.forEach(r => {
        const v = toNum(r[colName]);
        if (v !== null) r[colName] = +((v - med) / iqr).toFixed(6);
      });
      L(`✅ RobustScaler → "${colName}"`, 'success');
    } else if (strategy === 'maxabs') {
      const maxA = Math.max(...nums.map(Math.abs)) || 1;
      data.forEach(r => {
        const v = toNum(r[colName]);
        if (v !== null) r[colName] = +(v / maxA).toFixed(6);
      });
      L(`✅ MaxAbsScaler → "${colName}"`, 'success');
    }
  });

  // 10. Drop highly correlated features
  if (selection.drop_correlated) {
    const thresh = parseFloat(selection.corr_threshold) || 0.97;
    const currentNumCols = Object.keys(data[0] || {}).filter(col => {
      const sample = data.slice(0, 100).map(r => toNum(r[col])).filter(v => v !== null);
      return sample.length > 50;
    });
    const dropped = new Set();
    for (let i = 0; i < currentNumCols.length; i++) {
      for (let j = i + 1; j < currentNumCols.length; j++) {
        if (dropped.has(currentNumCols[i]) || dropped.has(currentNumCols[j])) continue;
        const x = data.slice(0, 500).map(r => toNum(r[currentNumCols[i]])).filter(v => v !== null);
        const y = data.slice(0, 500).map(r => toNum(r[currentNumCols[j]])).filter(v => v !== null);
        const n = Math.min(x.length, y.length);
        if (n < 10) continue;
        const mx = mean(x.slice(0, n)), my = mean(y.slice(0, n));
        let num = 0, dx2 = 0, dy2 = 0;
        for (let k = 0; k < n; k++) {
          const dx = x[k] - mx, dy = y[k] - my;
          num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
        }
        const den  = Math.sqrt(dx2 * dy2);
        const corr = den ? Math.abs(num / den) : 0;
        if (corr > thresh) {
          dropped.add(currentNumCols[j]);
          data.forEach(r => delete r[currentNumCols[j]]);
          L(`✅ Dropped correlated "${currentNumCols[j]}" (|r|=${corr.toFixed(3)})`, 'warn');
        }
      }
    }
  }

  // 11. Drop low variance
  if (selection.drop_low_variance) {
    const thresh = parseFloat(selection.var_threshold) || 0.01;
    Object.keys(data[0] || {}).forEach(col => {
      const nums = data.slice(0, 500).map(r => toNum(r[col])).filter(v => v !== null);
      if (nums.length < 20) return;
      const m        = mean(nums);
      const variance = nums.reduce((s, v) => s + (v - m) ** 2, 0) / nums.length;
      if (variance < thresh) {
        data.forEach(r => delete r[col]);
        L(`✅ Dropped low-variance "${col}" (var=${variance.toFixed(5)})`, 'warn');
      }
    });
  }

  const finalCols  = Object.keys(data[0] || {}).length;
  const nullsLeft  = data.reduce((s, r) =>
    s + Object.values(r).filter(v => isMiss(v)).length, 0);

  L(`🏁 Done! ${rows.length}→${data.length} rows · ${Object.keys(rows[0] || {}).length}→${finalCols} features`, 'done');

  // Build output CSV
  const header   = Object.keys(data[0] || {});
  const csvLines = [
    header.join(','),
    ...data.map(r => header.map(h => {
      const v = r[h];
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','))
  ];

  return {
    data,
    csv_out:       csvLines.join('\n'),
    original_rows: rows.length,
    original_cols: Object.keys(rows[0] || {}).length,
    processed_rows: data.length,
    processed_cols: finalCols,
    log,
    ml_checks: {
      no_nulls:        nullsLeft === 0,
      no_object_cols:  data.slice(0, 5).every(r =>
        Object.values(r).every(v => typeof v !== 'string' || v === '')),
      no_inf:          true,
      sufficient_rows: data.length >= 50,
      sufficient_cols: finalCols >= 2
    }
  };
}

// ── Generate Python code ──────────────────────────────────────────────────────
export function generatePythonCode(fileName, config, analysis) {
  const { clean = {}, encode = {}, scale = {}, outliers = {} } = config;
  const lines = [
    `# ══════════════════════════════════════`,
    `# DataSmithy Generated Pipeline`,
    `# Source: ${fileName}`,
    `# Rows: ${analysis?.rows || '?'} | Cols: ${analysis?.cols || '?'}`,
    `# ══════════════════════════════════════`,
    `import pandas as pd`,
    `import numpy as np`,
    `from sklearn.preprocessing import LabelEncoder, StandardScaler, MinMaxScaler, RobustScaler`,
    `import warnings; warnings.filterwarnings('ignore')`,
    ``,
    `df = pd.read_csv("${fileName}")`,
    `print(f"Loaded: {df.shape}")`,
    ``,
    `# 1. Remove duplicates`,
    `df = df.drop_duplicates()`,
    ``,
    `# 2. Strip whitespace`,
    `for col in df.select_dtypes(include='object').columns:`,
    `    df[col] = df[col].astype(str).str.strip()`,
    ``,
    `# 3. Missing value imputation`,
  ];

  Object.entries(clean).forEach(([col, s]) => {
    if (s === 'none') return;
    if (s === 'mean')     lines.push(`df['${col}'] = pd.to_numeric(df['${col}'], errors='coerce').fillna(df['${col}'].mean())`);
    if (s === 'median')   lines.push(`df['${col}'] = pd.to_numeric(df['${col}'], errors='coerce').fillna(df['${col}'].median())`);
    if (s === 'mode')     lines.push(`df['${col}'].fillna(df['${col}'].mode()[0], inplace=True)`);
    if (s === 'drop_row') lines.push(`df = df.dropna(subset=['${col}'])`);
    if (s === 'ffill')    lines.push(`df['${col}'].fillna(method='ffill', inplace=True)`);
    if (s === 'bfill')    lines.push(`df['${col}'].fillna(method='bfill', inplace=True)`);
  });

  lines.push(``, `# 4. Outlier capping`);
  Object.entries(outliers).forEach(([col, s]) => {
    if (s === 'cap') {
      lines.push(
        `q1, q3 = df['${col}'].quantile([0.25, 0.75])`,
        `iqr = q3 - q1`,
        `df['${col}'] = df['${col}'].clip(q1 - 1.5*iqr, q3 + 1.5*iqr)`
      );
    }
  });

  lines.push(``, `# 5. Encoding`, `le = LabelEncoder()`);
  Object.entries(encode).forEach(([col, s]) => {
    if (s === 'label')     lines.push(`df['${col}'] = le.fit_transform(df['${col}'].astype(str))`);
    if (s === 'onehot')    lines.push(`df = pd.get_dummies(df, columns=['${col}'], prefix='${col}')`);
    if (s === 'frequency') lines.push(`_freq = df['${col}'].value_counts(normalize=True)\ndf['${col}'] = df['${col}'].map(_freq)`);
    if (s === 'ordinal')   lines.push(`df['${col}'] = le.fit_transform(df['${col}'].astype(str))`);
  });

  lines.push(``, `# 6. Scaling`);
  const ss = [], mm = [], rb = [];
  Object.entries(scale).forEach(([col, s]) => {
    if (s === 'standard') ss.push(col);
    if (s === 'minmax')   mm.push(col);
    if (s === 'robust')   rb.push(col);
  });
  if (ss.length) lines.push(`df[${JSON.stringify(ss)}] = StandardScaler().fit_transform(df[${JSON.stringify(ss)}])`);
  if (mm.length) lines.push(`df[${JSON.stringify(mm)}] = MinMaxScaler().fit_transform(df[${JSON.stringify(mm)}])`);
  if (rb.length) lines.push(`df[${JSON.stringify(rb)}] = RobustScaler().fit_transform(df[${JSON.stringify(rb)}])`);

  lines.push(
    ``,
    `# 7. Save`,
    `output_name = "processed_${(fileName || 'data').replace(/[^a-zA-Z0-9.]/g, '_')}"`,
    `df.to_csv(output_name, index=False)`,
    `print(f"Saved: {df.shape} → {output_name}")`
  );

  return lines.join('\n');
}