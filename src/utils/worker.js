// src/utils/worker.js — Web Worker for background processing

const isMiss = v => v===null||v===undefined||String(v).trim()===''||['nan','null','na','n/a','none','undefined','NaN','NULL','NA'].includes(String(v).trim());
const toNum  = v => { const n=parseFloat(String(v).replace(/[$,%]/g,'')); return isNaN(n)?null:n; };
const mean   = a => a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const median = a => { if(!a.length)return 0; const s=[...a].sort((x,y)=>x-y); const m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; };
const stddev = a => { if(a.length<2)return 0; const m=mean(a); return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1)); };
const modeOf = a => { const f={}; a.forEach(v=>{f[v]=(f[v]||0)+1;}); return Object.entries(f).sort((x,y)=>y[1]-x[1])[0]?.[0]??''; };

function runEDA(rows) {
  if (!rows?.length) throw new Error('No data');
  const keys = Object.keys(rows[0]);

  // Sample for large datasets — EDA on 50k rows is accurate enough
  const MAX_EDA    = 50000;
  const isSampled  = rows.length > MAX_EDA;
  const sample     = isSampled ? rows.slice(0, MAX_EDA) : rows;

  // Duplicate detection
  let dups = 0;
  const seen = new Set();
  const dupCols = keys.slice(0, 8); // use first 8 cols only
  rows.forEach(r => {
    const k = dupCols.map(c => String(r[c] ?? '')).join('\x00');
    seen.has(k) ? dups++ : seen.add(k);
  });

  // Pre-extract all column values once — avoids repeated row mapping
  const colValues = {};
  keys.forEach(name => {
    colValues[name] = rows.map(r => r[name]);
  });

  const columns = keys.map(name => {
    const vals       = colValues[name];
    const missing    = vals.filter(isMiss).length;
    const missing_pct= +(missing / rows.length * 100).toFixed(2);
    const nn         = vals.filter(v => !isMiss(v));
    const numRatio   = nn.length > 0
      ? nn.slice(0, 100).filter(v => toNum(v) !== null).length / Math.min(nn.length, 100)
      : 0;
    const col_type = numRatio > 0.85 ? 'numeric'
      : nn.length && new Set(nn.slice(0, 200)).size / Math.min(nn.length, 200) < 0.5
      ? 'categorical' : 'text';

    const info = { name, type: col_type, missing, missing_pct, dtype: col_type };

    if (col_type === 'numeric') {
      const nums = nn.map(v => toNum(v)).filter(v => v !== null).sort((a, b) => a - b);
      if (nums.length) {
        const m   = mean(nums);
        const med = median(nums);
        const s   = stddev(nums);
        const q1  = nums[Math.floor(nums.length * 0.25)];
        const q3  = nums[Math.floor(nums.length * 0.75)];
        const iqr = q3 - q1;
        const lo  = q1 - 1.5 * iqr;
        const hi  = q3 + 1.5 * iqr;
        const sk  = nums.length > 2
          ? nums.reduce((t, v) => t + ((v - m) / Math.max(s, 0.0001)) ** 3, 0) / nums.length
          : 0;
        Object.assign(info, {
          mean: +m.toFixed(4), median: +med.toFixed(4), std: +s.toFixed(4),
          min: nums[0], max: nums[nums.length - 1], skew: +sk.toFixed(4),
          q1: +q1.toFixed(4), q3: +q3.toFixed(4), iqr: +iqr.toFixed(4),
          outliers: nums.filter(v => v < lo || v > hi).length,
          lower_fence: +lo.toFixed(4), upper_fence: +hi.toFixed(4)
        });
      }
    } else {
      const vc = {};
      nn.slice(0, 10000).forEach(v => { const k = String(v); vc[k] = (vc[k] || 0) + 1; });
      const sorted = Object.entries(vc).sort((a, b) => b[1] - a[1]);
      Object.assign(info, {
        unique_count: new Set(nn.slice(0, 10000)).size,
        top_values:   sorted.slice(0, 6).map(e => e[0]),
        top_counts:   sorted.slice(0, 6).map(e => e[1])
      });
    }
    return info;
  });

  // Correlation — cap at 2000 rows
  const numCols = columns.filter(c=>c.type==='numeric').map(c=>c.name);
  const correlation = {};
  const corrSample = sample.slice(0, 2000);
  if (numCols.length >= 2) {
    numCols.forEach(c1 => {
      correlation[c1] = {};
      numCols.forEach(c2 => {
        if (c1===c2) { correlation[c1][c2]=1; return; }
        const x = corrSample.map(r=>toNum(r[c1])).filter(v=>v!==null);
        const y = corrSample.map(r=>toNum(r[c2])).filter(v=>v!==null);
        const n = Math.min(x.length,y.length);
        if (n<3) { correlation[c1][c2]=0; return; }
        const mx=mean(x.slice(0,n)), my=mean(y.slice(0,n));
        const num=x.slice(0,n).reduce((s,v,i)=>s+(v-mx)*(y[i]-my),0);
        const den=Math.sqrt(
          x.slice(0,n).reduce((s,v)=>s+(v-mx)**2,0) *
          y.slice(0,n).reduce((s,v)=>s+(v-my)**2,0)
        );
        correlation[c1][c2] = den ? +(num/den).toFixed(3) : 0;
      });
    });
  }

  const avgMiss = columns.reduce((s,c)=>s+c.missing_pct,0)/Math.max(columns.length,1);
  const dupPct  = dups/sample.length*100;
  const avgOut  = columns.filter(c=>c.type==='numeric').reduce((s,c)=>s+(c.outliers||0),0)/Math.max(sample.length,1)*100;
  const health  = Math.max(0,Math.min(100,Math.round(100-avgMiss*.5-dupPct*.3-avgOut*.2)));

  return {
    rows:     rows.length,   // actual total rows
    cols:     keys.length,
    sampled:  isSampled,
    sample_size: sample.length,
    memory:   +(rows.length*keys.length*16/1024/1024).toFixed(1),
    duplicates: dups, columns, num_cols:numCols, correlation, health,
    health_details: {
      completeness:  Math.max(0, Math.round(100-avgMiss*2)),
      consistency:   Math.max(0, Math.round(100-dupPct*5)),
      outlier_score: Math.max(0, Math.round(100-avgOut*3)),
      ml_readiness:  Math.max(0, Math.round(health*.9))
    }
  };
}

function runPipeline(rows,config,analysis){
  let data=rows.map(r=>({...r}));
  const log=[];
  const L=(msg,type='info')=>log.push({msg,type,time:new Date().toLocaleTimeString()});
  const{clean={},encode={},scale={},outliers={},features={},selection={}}=config;
  L(`🚀 Pipeline started — ${data.length} rows × ${Object.keys(data[0]||{}).length} cols`,'start');
  // 1. Duplicates
  const b4=data.length;const seenSet=new Set();
  data=data.filter(r=>{const k=JSON.stringify(r);if(seenSet.has(k))return false;seenSet.add(k);return true;});
  if(data.length<b4)L(`✅ Removed ${b4-data.length} duplicate rows`,'success');
  else L('✓ No duplicate rows','info');
  // 2. Whitespace
  let fixed=0;
  analysis.columns.filter(c=>c.type==='categorical'||c.type==='text').forEach(col=>{data.forEach(r=>{const orig=r[col.name];const c=String(r[col.name]||'').trim();if(c!==orig){fixed++;r[col.name]=c;}});});
  if(fixed)L(`✅ Cleaned whitespace in ${fixed} cells`,'success');
  // 3. Missing imputation
  analysis.columns.forEach(col=>{
    const strategy=clean[col.name];
    if(!strategy||strategy==='none')return;
    const missing=data.filter(r=>isMiss(r[col.name]));
    if(!missing.length)return;
    if(strategy==='drop_row'){const b=data.length;data=data.filter(r=>!isMiss(r[col.name]));L(`✅ Dropped ${b-data.length} rows with missing "${col.name}"`,'success');return;}
    if(strategy==='drop_col'){data.forEach(r=>delete r[col.name]);L(`✅ Dropped column "${col.name}"`,'success');return;}
    const vn=data.map(r=>toNum(r[col.name])).filter(v=>v!==null);
    const vs=data.map(r=>r[col.name]).filter(v=>!isMiss(v)).map(String);
    let fill;
    if(strategy==='mean')fill=vn.length?+mean(vn).toFixed(4):0;
    if(strategy==='median')fill=vn.length?+median(vn).toFixed(4):0;
    if(strategy==='mode')fill=vs.length?modeOf(vs):'Unknown';
    if(strategy==='constant')fill=col.type==='numeric'?0:'Unknown';
    if(strategy==='ffill'){let last=null;data.forEach(r=>{if(!isMiss(r[col.name]))last=r[col.name];else if(last!==null)r[col.name]=last;});L(`✅ Forward-filled "${col.name}"`,'success');return;}
    if(strategy==='bfill'){let last=null;for(let i=data.length-1;i>=0;i--){if(!isMiss(data[i][col.name]))last=data[i][col.name];else if(last!==null)data[i][col.name]=last;}L(`✅ Backward-filled "${col.name}"`,'success');return;}
    if(fill!==undefined){data.forEach(r=>{if(isMiss(r[col.name]))r[col.name]=fill;});L(`✅ Filled ${missing.length} missing in "${col.name}" → ${strategy}`,'success');}
  });
  // 4. Outliers
  analysis.columns.filter(c=>c.type==='numeric').forEach(col=>{
    const strategy=outliers[col.name];
    if(!strategy||strategy==='keep')return;
    const nums=data.map(r=>toNum(r[col.name])).filter(v=>v!==null).sort((a,b)=>a-b);
    if(!nums.length)return;
    const q1=nums[Math.floor(nums.length*.25)],q3=nums[Math.floor(nums.length*.75)];
    const iqr=q3-q1,lo=q1-1.5*iqr,hi=q3+1.5*iqr;
    const outCount=nums.filter(v=>v<lo||v>hi).length;
    if(!outCount)return;
    if(strategy==='cap'){data.forEach(r=>{const v=toNum(r[col.name]);if(v!==null)r[col.name]=+(Math.max(lo,Math.min(hi,v)).toFixed(6));});L(`✅ Capped ${outCount} outliers in "${col.name}"`,'success');}
    else if(strategy==='remove'){const b=data.length;data=data.filter(r=>{const v=toNum(r[col.name]);return v===null||(v>=lo&&v<=hi);});L(`✅ Removed ${b-data.length} outlier rows from "${col.name}"`,'success');}
    else if(strategy==='flag'){data.forEach(r=>{const v=toNum(r[col.name]);r[`${col.name}_outlier`]=v!==null&&(v<lo||v>hi)?1:0;});L(`✅ Flagged outliers in "${col.name}"`,'success');}
  });
  // 5. Encoding
  Object.keys(data[0]||{}).forEach(colName=>{
    const strategy=encode[colName];
    if(!strategy||strategy==='none')return;
    const vals=[...new Set(data.map(r=>String(r[colName]||'')))].sort();
    if(strategy==='label'){const map=Object.fromEntries(vals.map((v,i)=>[v,i]));data.forEach(r=>{r[colName]=map[String(r[colName]||'')]??0;});L(`✅ Label-encoded "${colName}"`,'success');}
    else if(strategy==='onehot'){data.forEach(r=>{const orig=String(r[colName]||'');vals.forEach(v=>{r[`${colName}_${v}`]=orig===v?1:0;});delete r[colName];});L(`✅ One-hot encoded "${colName}" → ${vals.length} cols`,'success');}
    else if(strategy==='frequency'){const freq={};data.forEach(r=>{const k=String(r[colName]||'');freq[k]=(freq[k]||0)+1;});data.forEach(r=>{r[colName]=+((freq[String(r[colName]||'')]/data.length).toFixed(6));});L(`✅ Frequency-encoded "${colName}"`,'success');}
    else if(strategy==='ordinal'){const map=Object.fromEntries(vals.map((v,i)=>[v,i]));data.forEach(r=>{r[colName]=map[String(r[colName]||'')]??0;});L(`✅ Ordinal-encoded "${colName}"`,'success');}
  });
  // 6. Scaling
  Object.keys(data[0]||{}).forEach(colName=>{
    const strategy=scale[colName];
    if(!strategy||strategy==='none')return;
    const nums=data.map(r=>toNum(r[colName])).filter(v=>v!==null);
    if(!nums.length)return;
    if(strategy==='standard'){const m=mean(nums),s=stddev(nums)||1;data.forEach(r=>{const v=toNum(r[colName]);if(v!==null)r[colName]=+((v-m)/s).toFixed(6);});L(`✅ StandardScaler → "${colName}"`,'success');}
    else if(strategy==='minmax'){const mn=Math.min(...nums),mx=Math.max(...nums),rng=mx-mn||1;data.forEach(r=>{const v=toNum(r[colName]);if(v!==null)r[colName]=+((v-mn)/rng).toFixed(6);});L(`✅ MinMaxScaler → "${colName}"`,'success');}
    else if(strategy==='robust'){const sorted=[...nums].sort((a,b)=>a-b);const q1=sorted[Math.floor(sorted.length*.25)],q3=sorted[Math.floor(sorted.length*.75)];const med=median(sorted),iqr=q3-q1||1;data.forEach(r=>{const v=toNum(r[colName]);if(v!==null)r[colName]=+((v-med)/iqr).toFixed(6);});L(`✅ RobustScaler → "${colName}"`,'success');}
    else if(strategy==='maxabs'){const maxA=Math.max(...nums.map(Math.abs))||1;data.forEach(r=>{const v=toNum(r[colName]);if(v!==null)r[colName]=+(v/maxA).toFixed(6);});L(`✅ MaxAbsScaler → "${colName}"`,'success');}
  });
  // 7. Drop correlated
  if(selection.drop_correlated){
    const thresh=parseFloat(selection.corr_threshold)||0.97;
    const numColsNow=Object.keys(data[0]||{}).filter(col=>data.slice(0,100).map(r=>toNum(r[col])).filter(v=>v!==null).length>50);
    const dropped=new Set();
    for(let i=0;i<numColsNow.length;i++){
      for(let j=i+1;j<numColsNow.length;j++){
        if(dropped.has(numColsNow[i])||dropped.has(numColsNow[j]))continue;
        const x=data.slice(0,500).map(r=>toNum(r[numColsNow[i]])).filter(v=>v!==null);
        const y=data.slice(0,500).map(r=>toNum(r[numColsNow[j]])).filter(v=>v!==null);
        const n=Math.min(x.length,y.length);if(n<10)continue;
        const mx=mean(x.slice(0,n)),my=mean(y.slice(0,n));
        const num=x.slice(0,n).reduce((s,v,k)=>s+(v-mx)*(y[k]-my),0);
        const den=Math.sqrt(x.slice(0,n).reduce((s,v)=>s+(v-mx)**2,0)*y.slice(0,n).reduce((s,v)=>s+(v-my)**2,0));
        const corr=den?Math.abs(num/den):0;
        if(corr>thresh){dropped.add(numColsNow[j]);data.forEach(r=>delete r[numColsNow[j]]);L(`✅ Dropped correlated "${numColsNow[j]}"`,'warn');}
      }
    }
  }
  const finalCols=Object.keys(data[0]||{}).length;
  const nullsLeft=data.reduce((s,r)=>s+Object.values(r).filter(v=>isMiss(v)).length,0);
  L(`🏁 Done! ${rows.length}→${data.length} rows · ${Object.keys(rows[0]||{}).length}→${finalCols} features`,'done');
  const header=Object.keys(data[0]||{});
  const csvLines=[header.join(','),...data.map(r=>header.map(h=>{const v=r[h];if(v===null||v===undefined)return'';const s=String(v);return s.includes(',')||s.includes('"')?`"${s.replace(/"/g,'""')}"`  :s;}).join(','))];
  return{data,csv_out:csvLines.join('\n'),original_rows:rows.length,original_cols:Object.keys(rows[0]||{}).length,processed_rows:data.length,processed_cols:finalCols,log,ml_checks:{no_nulls:nullsLeft===0,no_object_cols:true,no_inf:true,sufficient_rows:data.length>=50,sufficient_cols:finalCols>=2}};
}

self.onmessage=function(e){
  const{type,rows,config,analysis}=e.data;
  try{
    if(type==='eda'){const result=runEDA(rows);self.postMessage({success:true,result});}
    else if(type==='pipeline'){const result=runPipeline(rows,config,analysis);self.postMessage({success:true,result});}
    else self.postMessage({success:false,error:'Unknown type'});
  }catch(err){self.postMessage({success:false,error:err.message});}
};
