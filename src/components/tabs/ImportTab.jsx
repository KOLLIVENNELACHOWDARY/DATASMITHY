// src/components/tabs/ImportTab.jsx
import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { db } from '../../firebase/config';      // ← your actual path
import { useAuth } from '../../context/AuthContext';

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

const IMPORT_METHODS = [
  { id:'file',        icon:'📁', label:'File Upload',     desc:'CSV, Excel, JSON, TSV up to 500MB' },
  { id:'url',         icon:'🔗', label:'Direct URL',      desc:'Any public CSV/JSON/Excel URL' },
  { id:'sheets',      icon:'📊', label:'Google Sheets',   desc:'Public Google Sheet link' },
  { id:'kaggle',      icon:'🏆', label:'Kaggle Dataset',  desc:'Via Kaggle API key' },
  { id:'github',      icon:'🐙', label:'GitHub File',     desc:'Raw file from any public repo' },
  { id:'huggingface', icon:'🤗', label:'HuggingFace',     desc:'Public dataset (up to 5000 rows via API)' },
  { id:'paste',       icon:'📋', label:'Paste CSV',       desc:'Paste CSV text directly' },
  { id:'sample',      icon:'🎯', label:'Sample Datasets', desc:'Built-in demo datasets' },
];

const SAMPLE_DATASETS = [
  { 
    name:'Titanic',
    rows:891,
    cols:12,
    tag:'Classification',
    generate: () => {
      const names = ['Smith John','Johnson Mary','Brown James','Davis Sarah','Miller Robert','Wilson Linda','Moore Michael','Taylor Karen','Anderson David','Thomas Lisa'];
      const embarked = ['S','C','Q',''];
      const rows = [];
      for (let i=1; i<=891; i++) {
        const pclass = [1,2,3][Math.floor(Math.random()*3)];
        const sex = Math.random()<0.5 ? 'male' : 'female';
        const age = Math.random()<0.1 ? '' : Math.floor(1+Math.random()*70);
        const survived = (sex==='female' || pclass===1) ? (Math.random()<0.7?1:0) : (Math.random()<0.3?1:0);
        rows.push({
          PassengerId: i,
          Survived: survived,
          Pclass: pclass,
          Name: names[Math.floor(Math.random()*names.length)] + ' ' + (sex==='male'?'Mr':'Mrs'),
          Sex: sex,
          Age: age,
          SibSp: Math.floor(Math.random()*4),
          Parch: Math.floor(Math.random()*3),
          Fare: +(pclass===1 ? 50+Math.random()*250 : pclass===2 ? 15+Math.random()*40 : 5+Math.random()*20).toFixed(2),
          Cabin: pclass===1 && Math.random()<0.6 ? `C${Math.floor(Math.random()*100)}` : '',
          Embarked: embarked[Math.floor(Math.random()*embarked.length)],
        });
      }
      return Papa.unparse(rows);
    }
  },
  { 
    name:'House Prices',
    rows:1460,
    cols:81,
    tag:'Regression',
    generate: () => {
      const locations = ['Downtown','Suburb','Rural','Waterfront','Hillside',''];
      const types = ['Apartment','Villa','Townhouse','Bungalow'];
      const rows = [];
      for (let i=1; i<=1460; i++) {
        const sqft = Math.floor(500+Math.random()*4000);
        const bedrooms = Math.floor(1+Math.random()*5);
        const age = Math.floor(Math.random()*60);
        const basePrice = sqft*150 + bedrooms*8000 - age*500;
        rows.push({
          property_id:`H${30000+i}`,
          sqft,
          bedrooms,
          bathrooms:Math.floor(1+Math.random()*4),
          age_years:age,
          location:locations[Math.floor(Math.random()*locations.length)],
          property_type:types[Math.floor(Math.random()*types.length)],
          garage: Math.random()<0.6 ? 'Yes' : 'No',
          price: Math.random()<0.05 ? '' : Math.max(50000, Math.floor(basePrice + (Math.random()-0.5)*basePrice*0.4)),
        });
      }
      return Papa.unparse(rows);
    }
  },
  { 
    name:'Iris',
    rows:150,
    cols:5,
    tag:'Classification',
    generate: () => {
      const species = [
        { name:'setosa', sl:[4.3,5.8], sw:[2.3,4.4], pl:[1.0,1.9], pw:[0.1,0.6] },
        { name:'versicolor', sl:[4.9,7.0], sw:[2.0,3.4], pl:[3.0,5.1], pw:[1.0,1.8] },
        { name:'virginica', sl:[4.9,7.9], sw:[2.2,3.8], pl:[4.5,6.9], pw:[1.4,2.5] },
      ];
      const rnd = (a,b) => +(a+Math.random()*(b-a)).toFixed(1);
      const rows = [];
      for (let i=1; i<=150; i++) {
        const sp = species[Math.floor((i-1)/50)];
        rows.push({
          id:i,
          sepal_length:rnd(...sp.sl),
          sepal_width:rnd(...sp.sw),
          petal_length:rnd(...sp.pl),
          petal_width:rnd(...sp.pw),
          species:sp.name
        });
      }
      return Papa.unparse(rows);
    }
  },
  { 
    name:'Wine Quality',
    rows:6497,
    cols:12,
    tag:'Regression',
    generate: () => {
      const rows = [];
      for (let i=1; i<=6497; i++) {
        rows.push({
          fixed_acidity: +(4+Math.random()*12).toFixed(1),
          volatile_acidity: +(Math.random()*1.2).toFixed(2),
          citric_acid: +(Math.random()*0.8).toFixed(2),
          residual_sugar: +(Math.random()*15).toFixed(1),
          chlorides: +(Math.random()*0.4).toFixed(3),
          free_sulfur_dioxide: Math.floor(Math.random()*70),
          total_sulfur_dioxide: Math.floor(Math.random()*200),
          density: +(0.99+Math.random()*0.01).toFixed(4),
          pH: +(2.8+Math.random()*1.2).toFixed(2),
          sulphates: +(0.3+Math.random()*1.5).toFixed(2),
          alcohol: +(8+Math.random()*7).toFixed(1),
          quality: Math.floor(3+Math.random()*7),
        });
      }
      return Papa.unparse(rows);
    }
  },
  { 
    name:'Heart Disease',
    rows:303,
    cols:14,
    tag:'Classification',
    generate: () => {
      const rows = [];
      for (let i=1; i<=303; i++) {
        const age = Math.floor(29+Math.random()*50);
        rows.push({
          age,
          sex: Math.random()<0.7 ? 1 : 0,
          cp: Math.floor(Math.random()*4),
          trestbps: Math.floor(90+Math.random()*90),
          chol: Math.floor(120+Math.random()*450),
          fbs: Math.random()<0.15 ? 1 : 0,
          restecg: Math.floor(Math.random()*3),
          thalach: Math.floor(70+Math.random()*130),
          exang: Math.random()<0.3 ? 1 : 0,
          oldpeak: +(Math.random()*6).toFixed(1),
          slope: Math.floor(Math.random()*3),
          ca: Math.floor(Math.random()*4),
          thal: Math.floor(1+Math.random()*3),
          target: age>50 && Math.random()<0.6 ? 1 : Math.random()<0.4 ? 1 : 0,
        });
      }
      return Papa.unparse(rows);
    }
  },
  { 
    name:'Customer Churn',
    rows:7043,
    cols:21,
    tag:'Classification',
    generate: () => {
      const genders = ['Male','Female'];
      const services = ['DSL','Fiber optic','No'];
      const contracts = ['Month-to-month','One year','Two year'];
      const payments = ['Electronic check','Mailed check','Bank transfer','Credit card'];
      const rows = [];
      for (let i=1; i<=7043; i++) {
        const tenure = Math.floor(Math.random()*72);
        const monthlyCharges = +(20+Math.random()*100).toFixed(2);
        rows.push({
          customerID: `C${7590+i}`,
          gender: genders[Math.floor(Math.random()*2)],
          SeniorCitizen: Math.random()<0.16 ? 1 : 0,
          Partner: Math.random()<0.5 ? 'Yes' : 'No',
          Dependents: Math.random()<0.3 ? 'Yes' : 'No',
          tenure,
          PhoneService: Math.random()<0.9 ? 'Yes' : 'No',
          MultipleLines: Math.random()<0.4 ? 'Yes' : 'No',
          InternetService: services[Math.floor(Math.random()*3)],
          OnlineSecurity: Math.random()<0.3 ? 'Yes' : 'No',
          TechSupport: Math.random()<0.3 ? 'Yes' : 'No',
          Contract: contracts[Math.floor(Math.random()*3)],
          PaperlessBilling: Math.random()<0.6 ? 'Yes' : 'No',
          PaymentMethod: payments[Math.floor(Math.random()*4)],
          MonthlyCharges: monthlyCharges,
          TotalCharges: Math.random()<0.02 ? '' : +(monthlyCharges*tenure).toFixed(2),
          Churn: tenure<12 && Math.random()<0.4 ? 'Yes' : Math.random()<0.2 ? 'Yes' : 'No',
        });
      }
      return Papa.unparse(rows);
    }
  },
  {
    name: 'E-commerce Orders',
    rows: 500,
    cols: 10,
    tag: 'Regression',
    generate: () => {
      const products = ['Wireless Mouse','Laptop Stand','USB-C Cable','Mechanical Keyboard','Webcam HD','Desk Lamp','Phone Case','Bluetooth Speaker','Monitor Arm','Power Bank'];
      const statuses = ['Delivered','Shipped','Processing','Cancelled','Returned'];
      const cities = ['Mumbai','Delhi','Bangalore','Chennai','Hyderabad','Pune','Kolkata',''];
      const rows = [];
      for (let i=1; i<=500; i++) {
        rows.push({
          order_id:1000+i,
          customer_name:`Customer_${Math.floor(Math.random()*200)}`,
          product:products[Math.floor(Math.random()*products.length)],
          quantity:Math.floor(Math.random()*5)+1,
          price:+(Math.random()*4000+99).toFixed(2),
          discount_pct: Math.random()<0.3 ? Math.floor(Math.random()*30) : 0,
          city:cities[Math.floor(Math.random()*cities.length)],
          status:statuses[Math.floor(Math.random()*statuses.length)],
          order_date:`2024-${String(Math.floor(Math.random()*12)+1).padStart(2,'0')}-${String(Math.floor(Math.random()*28)+1).padStart(2,'0')}`,
          rating: Math.random()<0.15 ? '' : Math.floor(Math.random()*5)+1,
        });
      }
      return Papa.unparse(rows);
    }
  },
  {
    name: 'Hospital Patients',
    rows: 400,
    cols: 9,
    tag: 'Classification',
    generate: () => {
      const diagnoses = ['Hypertension','Diabetes Type 2','Asthma','Migraine','Fracture','Flu','Anxiety','Back Pain','Allergy','Checkup'];
      const depts = ['Cardiology','General','Orthopedics','Neurology','Pediatrics','ENT'];
      const genders = ['Male','Female','Other'];
      const rows = [];
      for (let i=1; i<=400; i++) {
        const age = Math.floor(Math.random()*80)+1;
        rows.push({
          patient_id:`P${10000+i}`,
          age,
          gender: Math.random()<0.05 ? '' : genders[Math.floor(Math.random()*genders.length)],
          department:depts[Math.floor(Math.random()*depts.length)],
          diagnosis:diagnoses[Math.floor(Math.random()*diagnoses.length)],
          blood_pressure: Math.random()<0.1 ? '' : Math.floor(90+Math.random()*60),
          heart_rate:Math.floor(60+Math.random()*50),
          treatment_cost:+(Math.random()*15000+500).toFixed(2),
          length_of_stay_days: age>60 ? Math.floor(Math.random()*10)+1 : Math.floor(Math.random()*5),
          readmitted: Math.random()<0.15 ? 'Yes' : 'No',
        });
      }
      return Papa.unparse(rows);
    }
  },
  {
    name: 'Social Media Posts',
    rows: 600,
    cols: 10,
    tag: 'Classification',
    generate: () => {
      const platforms = ['Instagram','Twitter','Facebook','LinkedIn','TikTok'];
      const categories = ['Tech','Fashion','Food','Travel','Fitness','Music','Gaming','News'];
      const sentiments = ['Positive','Negative','Neutral'];
      const rows = [];
      for (let i=1; i<=600; i++) {
        const followers = Math.floor(Math.random()*100000)+100;
        const likes = Math.floor(followers * (Math.random()*0.3));
        rows.push({
          post_id:`POST_${20000+i}`,
          platform:platforms[Math.floor(Math.random()*platforms.length)],
          category:categories[Math.floor(Math.random()*categories.length)],
          followers_count:followers,
          likes,
          shares:Math.floor(likes * Math.random() * 0.2),
          comments:Math.floor(likes * Math.random() * 0.1),
          sentiment: Math.random()<0.08 ? '' : sentiments[Math.floor(Math.random()*sentiments.length)],
          posted_hour:Math.floor(Math.random()*24),
          is_verified: Math.random()<0.2 ? 1 : 0,
          engagement_rate:+(Math.random()*10).toFixed(2),
        });
      }
      return Papa.unparse(rows);
    }
  },
  {
    name: 'Employee HR Data',
    rows: 350,
    cols: 9,
    tag: 'Classification',
    generate: () => {
      const depts = ['Engineering','Sales','Marketing','HR','Finance','Operations','Support'];
      const titles = ['Junior','Mid-Level','Senior','Lead','Manager'];
      const rows = [];
      for (let i=1; i<=350; i++) {
        const yearsExp = Math.floor(Math.random()*20);
        rows.push({
          employee_id:`EMP${5000+i}`,
          department:depts[Math.floor(Math.random()*depts.length)],
          job_title:titles[Math.floor(Math.random()*titles.length)],
          age:22+yearsExp+Math.floor(Math.random()*5),
          years_experience:yearsExp,
          salary:Math.floor(30000 + yearsExp*4000 + Math.random()*15000),
          performance_score: Math.random()<0.06 ? '' : +(Math.random()*5).toFixed(1),
          remote_work: Math.random()<0.4 ? 'Yes' : 'No',
          satisfaction_score:Math.floor(Math.random()*10)+1,
          attrition: Math.random()<0.16 ? 'Yes' : 'No',
        });
      }
      return Papa.unparse(rows);
    }
  },
  {
    name: 'Student Performance',
    rows: 450,
    cols: 10,
    tag: 'Regression',
    generate: () => {
      const subjects = ['Math','Science','English','History','Computer Science'];
      const genders = ['Male','Female'];
      const rows = [];
      for (let i=1; i<=450; i++) {
        const studyHours = +(Math.random()*10).toFixed(1);
        const attendance = Math.floor(50+Math.random()*50);
        const baseScore = studyHours*7 + attendance*0.3;
        rows.push({
          student_id:`STU${i+1000}`,
          gender:genders[Math.floor(Math.random()*genders.length)],
          age:Math.floor(15+Math.random()*5),
          subject:subjects[Math.floor(Math.random()*subjects.length)],
          study_hours_per_week:studyHours,
          attendance_pct: Math.random()<0.07 ? '' : attendance,
          previous_score:Math.floor(40+Math.random()*60),
          final_score: Math.min(100, Math.max(0, Math.round(baseScore + (Math.random()-0.5)*20))),
          extra_curricular: Math.random()<0.45 ? 'Yes' : 'No',
          parent_education: ['High School','Bachelors','Masters','PhD',''][Math.floor(Math.random()*5)],
        });
      }
      return Papa.unparse(rows);
    }
  },
  {
    name: 'Movie Ratings',
    rows: 500,
    cols: 9,
    tag: 'Regression',
    generate: () => {
      const genres = ['Action','Comedy','Drama','Horror','Sci-Fi','Romance','Thriller','Animation'];
      const rows = [];
      for (let i=1; i<=500; i++) {
        const budget = Math.floor(1+Math.random()*200) * 1000000;
        const successFactor = Math.random();
        const revenue = Math.floor(budget * (0.2 + successFactor*4));
        rows.push({
          movie_id:`MV${4000+i}`,
          title:`Movie_${i}`,
          genre:genres[Math.floor(Math.random()*genres.length)],
          release_year: 1990+Math.floor(Math.random()*35),
          runtime_minutes:Math.floor(80+Math.random()*80),
          budget_usd:budget,
          revenue_usd: Math.random()<0.06 ? '' : revenue,
          rating:+(Math.random()*4+5).toFixed(1),
          votes:Math.floor(Math.random()*500000),
          is_sequel: Math.random()<0.25 ? 1 : 0,
        });
      }
      return Papa.unparse(rows);
    }
  },
  {
    name: 'Weather Data',
    rows: 365,
    cols: 8,
    tag: 'Regression',
    generate: () => {
      const conditions = ['Sunny','Cloudy','Rainy','Stormy','Foggy','Clear'];
      const rows = [];
      for (let i=1; i<=365; i++) {
        const month = Math.floor((i-1)/30.4)+1;
        const seasonTemp = 15 + 15*Math.sin((month-3)/12*2*Math.PI);
        rows.push({
          date:`2024-${String(Math.min(12,month)).padStart(2,'0')}-${String(((i-1)%30)+1).padStart(2,'0')}`,
          temperature_c:+(seasonTemp + (Math.random()-0.5)*8).toFixed(1),
          humidity_pct: Math.random()<0.04 ? '' : Math.floor(30+Math.random()*60),
          wind_speed_kmh:+(Math.random()*40).toFixed(1),
          rainfall_mm: Math.random()<0.6 ? 0 : +(Math.random()*50).toFixed(1),
          condition:conditions[Math.floor(Math.random()*conditions.length)],
          pressure_hpa:Math.floor(990+Math.random()*40),
          uv_index:Math.floor(Math.random()*12),
        });
      }
      return Papa.unparse(rows);
    }
  },
];

export default function ImportTab({ onFileReady, onCsvReady }) {
  const { user } = useAuth();
  const [method,   setMethod]   = useState('file');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [progress, setProgress] = useState('');
  const fileInputRef = useRef();

  const [url,           setUrl]           = useState('');
  const [sheetUrl,      setSheetUrl]      = useState('');
  const [kaggleUser,    setKaggleUser]    = useState('');
  const [kaggleKey,     setKaggleKey]     = useState('');
  const [kaggleDataset, setKaggleDataset] = useState('');
  const [githubUrl,     setGithubUrl]     = useState('');
  const [hfDataset,     setHfDataset]     = useState('');
  const [hfSplit,       setHfSplit]       = useState('train');
  const [pasteText,     setPasteText]     = useState('');

  const err = (msg) => { setError(msg); setLoading(false); setProgress(''); };

  const fetchUrl = async (targetUrl) => {
    setProgress('Fetching ' + targetUrl.slice(0,60) + '...');
    const res = await fetch(CORS_PROXY + encodeURIComponent(targetUrl));
    if (!res.ok) throw new Error('HTTP ' + res.status + ': Could not fetch URL');
    return res;
  };

  const responseToCsv = async (res, fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['xlsx','xls'].includes(ext)) {
      const buf = await res.arrayBuffer();
      const wb  = XLSX.read(buf);
      const ws  = wb.Sheets[wb.SheetNames[0]];
      return Papa.unparse(XLSX.utils.sheet_to_json(ws, { defval:'' }));
    }
    if (ext === 'json') {
      const parsed = await res.json().catch(async () => JSON.parse(await res.text()));
      return Papa.unparse(Array.isArray(parsed) ? parsed : [parsed]);
    }
    return res.text();
  };

  // ── Direct URL ──────────────────────────────────────────────────────────────
  const importUrl = async () => {
    if (!url.trim()) return err('Please enter a URL');
    setLoading(true); setError('');
    try {
      const res      = await fetchUrl(url.trim());
      const fileName = url.split('/').pop().split('?')[0] || 'imported.csv';
      const csv      = await responseToCsv(res, fileName);
      if (!csv.trim()) return err('No data found at URL');
      onCsvReady(csv, fileName);
    } catch(e) { err('Import failed: ' + e.message); }
    setLoading(false); setProgress('');
  };

  // ── Google Sheets ───────────────────────────────────────────────────────────
  const importSheets = async () => {
    if (!sheetUrl.trim()) return err('Paste your Google Sheets URL');
    setLoading(true); setError('');
    try {
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) return err('Could not extract Sheet ID from URL');
      const sheetId   = match[1];
      const gidMatch  = sheetUrl.match(/gid=(\d+)/);
      const gid       = gidMatch ? gidMatch[1] : '0';
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      const res       = await fetchUrl(exportUrl);
      const csv       = await res.text();
      if (!csv.trim()) return err('Sheet appears empty or not publicly shared');
      onCsvReady(csv, `google_sheet_${sheetId.slice(0,8)}.csv`);
    } catch(e) { err('Google Sheets import failed: ' + e.message); }
    setLoading(false); setProgress('');
  };

  // ── Kaggle ──────────────────────────────────────────────────────────────────
  const importKaggle = async () => {
    if (!kaggleUser || !kaggleKey || !kaggleDataset) return err('Fill in all Kaggle fields');
    setLoading(true); setError('');
    try {
      const [owner, dsName] = kaggleDataset.includes('/')
        ? kaggleDataset.split('/')
        : [kaggleUser, kaggleDataset];

      setProgress('Connecting to Kaggle...');

      const proxies = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://cors-anywhere.herokuapp.com/',
      ];

      const headers = { 'Authorization': 'Basic ' + btoa(`${kaggleUser}:${kaggleKey}`) };
      const filesUrl = `https://www.kaggle.com/api/v1/datasets/${owner}/${dsName}/versions/1/files`;

      let res = null;
      let lastErr = '';

      for (const proxy of proxies) {
        try {
          setProgress('Trying proxy: ' + proxy.split('/')[2] + '...');
          res = await fetch(proxy + encodeURIComponent(filesUrl), { headers });
          if (res.ok) break;
          lastErr = 'HTTP ' + res.status;
        } catch(e) {
          lastErr = e.message;
          res = null;
        }
      }

      if (!res || !res.ok) {
        return err(`Kaggle API is blocked by browser security (CORS). 
      
Please download manually:
1. Go to kaggle.com/datasets/${owner}/${dsName}
2. Click Download → Download All
3. Extract the ZIP
4. Use File Upload tab to upload the CSV`);
      }

      const data = await res.json();
      const files = data.datasetFiles || data.files || [];
      const csvFile = files.find(f => (f.name||'').endsWith('.csv'));

      if (!csvFile) {
        return err(`No CSV file found in this dataset. 
Please download manually from kaggle.com/datasets/${owner}/${dsName} and use File Upload.`);
      }

      setProgress(`Downloading ${csvFile.name}...`);
      const dlUrl = `https://www.kaggle.com/api/v1/datasets/${owner}/${dsName}/versions/1/download/${csvFile.name}`;

      for (const proxy of proxies) {
        try {
          const dlRes = await fetch(proxy + encodeURIComponent(dlUrl), { headers });
          if (dlRes.ok) {
            const csv = await dlRes.text();
            if (csv.length > 100) {
              onCsvReady(csv, csvFile.name);
              setLoading(false); setProgress('');
              return;
            }
          }
        } catch(e) { continue; }
      }

      err(`Download failed due to browser security restrictions. 
Please download from kaggle.com/datasets/${owner}/${dsName} and use File Upload.`);

    } catch(e) {
      err('Kaggle import failed: ' + e.message);
    }
    setLoading(false); setProgress('');
  };

  // ── GitHub ──────────────────────────────────────────────────────────────────
  const importGitHub = async () => {
    if (!githubUrl.trim()) return err('Paste a GitHub file URL');
    setLoading(true); setError('');
    try {
      const rawUrl   = githubUrl.trim()
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');
      const res      = await fetchUrl(rawUrl);
      const fileName = rawUrl.split('/').pop() || 'github_data.csv';
      const csv      = await responseToCsv(res, fileName);
      onCsvReady(csv, fileName);
    } catch(e) { err('GitHub import failed: ' + e.message); }
    setLoading(false); setProgress('');
  };

  // ── HuggingFace ─────────────────────────────────────────────────────────────
  const importHuggingFace = async () => {
    if (!hfDataset.trim()) return err('Enter dataset name (e.g. open-thoughts/AgentTrove)');
    setLoading(true); setError('');
    try {
      const encoded = encodeURIComponent(hfDataset.trim());

      setProgress('Connecting to HuggingFace...');
      const infoRes = await fetch(
        `https://datasets-server.huggingface.co/info?dataset=${encoded}`
      ).catch(() => null);

      setProgress('Looking for direct download files...');
      const parquetRes = await fetch(
        `https://datasets-server.huggingface.co/parquet?dataset=${encoded}`
      ).catch(() => null);

      if (parquetRes?.ok) {
        const parquetData = await parquetRes.json().catch(() => ({}));
        const allFiles = parquetData.parquet_files || [];
        const splitFiles = allFiles.filter(f =>
          f.split === hfSplit || (!hfSplit && f.split === 'train')
        );

        if (splitFiles.length > 0) {
          setProgress(`Found ${splitFiles.length} data file(s). Downloading...`);

          const proxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
          ];

          let combinedRows = [];
          let fetchedAny = false;

          for (let fi = 0; fi < Math.min(splitFiles.length, 5); fi++) {
            const fileUrl = splitFiles[fi].url;
            setProgress(`Downloading file ${fi+1} of ${Math.min(splitFiles.length,5)}...`);

            for (const proxy of proxies) {
              try {
                const res = await fetch(proxy + encodeURIComponent(fileUrl));
                if (res.ok) {
                  const text = await res.text();
                  if (text && text.length > 200 && text.includes('\n')) {
                    if (combinedRows.length === 0) {
                      const parsed = Papa.parse(text, { header:true, skipEmptyLines:true });
                      combinedRows = parsed.data;
                    } else {
                      const parsed = Papa.parse(text, { header:true, skipEmptyLines:true });
                      combinedRows = combinedRows.concat(parsed.data);
                    }
                    fetchedAny = true;
                    break;
                  }
                }
              } catch(e) { continue; }
            }
          }

          if (fetchedAny && combinedRows.length > 0) {
            setProgress(`✅ Loaded ${combinedRows.length.toLocaleString()} rows from parquet files!`);
            const csv = Papa.unparse(combinedRows);
            onCsvReady(csv, `${hfDataset.replace('/', '_')}_${hfSplit}.csv`);
            setLoading(false); setProgress('');
            return;
          }
        }
      }

      setProgress('Using Rows API...');
      const base = `https://datasets-server.huggingface.co/rows?dataset=${encoded}&config=default&split=${hfSplit}`;

      const firstRes = await fetch(`${base}&offset=0&length=100`);
      if (!firstRes.ok) {
        const errData = await firstRes.json().catch(() => ({}));
        const msg = errData.error || `HTTP ${firstRes.status}`;

        return err(
          `HuggingFace API error: ${msg}\n\n` +
          `For large datasets, download directly:\n` +
          `1. Go to huggingface.co/datasets/${hfDataset}\n` +
          `2. Click "Files and versions" tab\n` +
          `3. Download any .parquet or .csv file\n` +
          `4. Use File Upload tab to upload it`
        );
      }

      const firstData = await firstRes.json();
      if (!firstData.rows?.length) {
        return err(
          `No rows returned for split "${hfSplit}". ` +
          `Try a different split (train/test/validation) or download from huggingface.co/datasets/${hfDataset}`
        );
      }

      const totalAvailable = firstData.num_rows_total || 100;
      const maxFetch = Math.min(totalAvailable, 5000);
      let allRows = firstData.rows.map(r => r.row);

      setProgress(`Found ${totalAvailable.toLocaleString()} total rows. Fetching up to ${maxFetch.toLocaleString()} via API...`);

      const fetchPromises = [];
      for (let offset = 100; offset < maxFetch; offset += 100) {
        fetchPromises.push(
          fetch(`${base}&offset=${offset}&length=100`)
            .then(r => r.ok ? r.json() : null)
            .then(d => d?.rows?.map(r => r.row) || [])
            .catch(() => [])
        );
      }

      const batchSize = 10;
      for (let i = 0; i < fetchPromises.length; i += batchSize) {
        const batch = await Promise.all(fetchPromises.slice(i, i + batchSize));
        batch.forEach(rows => { allRows = allRows.concat(rows); });
        setProgress(`Fetched ${allRows.length.toLocaleString()} of ${maxFetch.toLocaleString()} rows...`);
      }

      if (allRows.length === 0) {
        return err('No data could be fetched. Please download manually from HuggingFace.');
      }

      setProgress(`✅ Loaded ${allRows.length.toLocaleString()} rows successfully!`);
      const csv = Papa.unparse(allRows);
      onCsvReady(csv, `${hfDataset.replace('/', '_')}_${hfSplit}.csv`);

    } catch(e) {
      err('HuggingFace import failed: ' + e.message);
    }
    setLoading(false); setProgress('');
  };

  // ── Paste CSV ───────────────────────────────────────────────────────────────
  const importPaste = () => {
    if (!pasteText.trim()) return err('Paste some CSV text first');
    const lines = pasteText.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return err('Need at least a header row and one data row');
    onCsvReady(pasteText.trim(), 'pasted_data.csv');
  };

  // ── Sample Datasets ─────────────────────────────────────────────────────────
  const loadSample = (ds) => {
    const csv = ds.generate();
    if (csv) onCsvReady(csv, ds.name.toLowerCase().replace(/\s+/g,'_') + '_sample.csv');
  };

  return (
    <div className="fade-in" style={{ display:'grid', gap:'14px' }}>
      {/* Method selector */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:'8px' }}>
        {IMPORT_METHODS.map(m => (
          <button key={m.id} onClick={() => { setMethod(m.id); setError(''); }}
            style={{
              background: method===m.id ? 'rgba(0,203,168,.12)' : 'var(--card)',
              border: `1px solid ${method===m.id ? 'var(--teal)' : 'var(--border)'}`,
              borderRadius:'8px', padding:'12px', textAlign:'left', cursor:'pointer', transition:'all .15s'
            }}>
            <div style={{ fontSize:'20px', marginBottom:'4px' }}>{m.icon}</div>
            <div style={{ fontWeight:600, color:method===m.id?'var(--teal)':'var(--text)', fontSize:'12px', marginBottom:'2px' }}>{m.label}</div>
            <div style={{ color:'var(--muted)', fontSize:'10px', lineHeight:1.4 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="card" style={{ padding:'20px' }}>

        {/* File Upload */}
        {method==='file' && (
          <div>
            <ST>Upload from Device</ST>
            <p style={{ color:'var(--muted)', fontSize:'12px', marginBottom:'14px' }}>
              Supports CSV, TSV, Excel (.xlsx/.xls), JSON. All rows loaded — no limits.
            </p>
            <div onClick={() => fileInputRef.current?.click()}
              style={{ border:'2px dashed var(--border)', borderRadius:'8px', padding:'40px', textAlign:'center', cursor:'pointer', transition:'all .2s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--teal)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
              onDrop={e=>{ e.preventDefault(); const f=e.dataTransfer.files[0]; if(f)onFileReady(f); }}
              onDragOver={e=>e.preventDefault()}>
              <div style={{ fontSize:'36px', marginBottom:'10px', opacity:.7 }}>⬆</div>
              <div style={{ color:'var(--text)', fontSize:'14px', fontWeight:600, marginBottom:'4px' }}>Click to browse or drag & drop</div>
              <div style={{ color:'var(--muted)', fontSize:'11px' }}>CSV · Excel · JSON · TSV</div>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.json,.tsv"
                style={{ display:'none' }} onChange={e=>e.target.files[0]&&onFileReady(e.target.files[0])} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginTop:'14px' }}>
              {[['CSV','Comma-separated'],['Excel','.xlsx / .xls'],['JSON','Array or object'],['TSV','Tab-separated']].map(([f,d])=>(
                <div key={f} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'5px', padding:'8px', textAlign:'center' }}>
                  <div style={{ fontWeight:700, color:'var(--teal)', fontSize:'12px' }}>{f}</div>
                  <div style={{ color:'var(--muted)', fontSize:'10px', marginTop:'2px' }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Direct URL */}
        {method==='url' && (
          <div>
            <ST>Import from Any URL</ST>
            <p style={{ color:'var(--muted)', fontSize:'12px', marginBottom:'14px' }}>
              Paste a direct link to any publicly accessible CSV, Excel, or JSON file.
            </p>
            <div style={{ display:'grid', gap:'8px' }}>
              <input type="text" value={url} onChange={e=>setUrl(e.target.value)}
                placeholder="https://example.com/data.csv"
                style={{ width:'100%' }}
                onKeyDown={e=>e.key==='Enter'&&importUrl()} />
              <div style={{ color:'var(--muted)', fontSize:'10px' }}>
                Examples: GitHub raw links, data.gov, World Bank, Statista exports
              </div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {[
                  { label:'UCI Wine', url:'https://archive.ics.uci.edu/ml/machine-learning-databases/wine-quality/winequality-red.csv' },
                  { label:'World Bank GDP', url:'https://raw.githubusercontent.com/datasets/gdp/main/data/gdp.csv' },
                  { label:'COVID Data', url:'https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/latest/owid-covid-latest.csv' },
                ].map(e=>(
                  <button key={e.label} onClick={()=>setUrl(e.url)}
                    style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'4px', padding:'3px 10px', fontSize:'10px', color:'var(--muted)', cursor:'pointer' }}>
                    {e.label}
                  </button>
                ))}
              </div>
              <button className="btn-primary" onClick={importUrl} disabled={loading} style={{ width:'fit-content' }}>
                {loading ? '⏳ Fetching...' : '↓ Import from URL'}
              </button>
            </div>
          </div>
        )}

        {/* Google Sheets */}
        {method==='sheets' && (
          <div>
            <ST>Import from Google Sheets</ST>
            <div style={{ padding:'10px 14px', background:'rgba(75,158,255,.1)', border:'1px solid rgba(75,158,255,.3)', borderRadius:'6px', fontSize:'11px', color:'var(--blue)', marginBottom:'14px' }}>
              ℹ Sheet must be shared with "Anyone with the link can view"
            </div>
            <div style={{ display:'grid', gap:'8px' }}>
              <label style={{ fontSize:'11px', color:'var(--muted)' }}>Google Sheets URL</label>
              <input type="text" value={sheetUrl} onChange={e=>setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/YOUR_ID/edit"
                style={{ width:'100%' }} />
              <HowTo steps={['Open Google Sheet','Click Share → Change to Anyone with link','Copy URL and paste above']} />
              <button className="btn-primary" onClick={importSheets} disabled={loading} style={{ width:'fit-content' }}>
                {loading ? '⏳ Importing...' : '📊 Import Sheet'}
              </button>
            </div>
          </div>
        )}

        {method === 'kaggle' && (
          <div>
            <ST>Import from Kaggle</ST>

            <div style={{ marginBottom:'20px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text)', marginBottom:'12px', letterSpacing:'.5px' }}>
                FOLLOW THESE STEPS:
              </div>

              {[
                {
                  num: '1',
                  title: 'Find your dataset on Kaggle',
                  desc: 'Enter the dataset path below to open it directly',
                  action: true
                },
                {
                  num: '2',
                  title: 'Click Download on Kaggle',
                  desc: 'Click the Download button → Download All (or pick a specific CSV file)',
                  action: false
                },
                {
                  num: '3',
                  title: 'Extract the ZIP file',
                  desc: 'Open the downloaded ZIP and find the .csv file inside',
                  action: false
                },
                {
                  num: '4',
                  title: 'Upload here',
                  desc: 'Drag and drop or click to upload the CSV below',
                  action: false
                },
              ].map((step, i) => (
                <div key={i} style={{ display:'flex', gap:'12px', marginBottom:'12px', alignItems:'flex-start' }}>
                  <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'var(--teal)', color:'#000', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'13px', flexShrink:0, marginTop:'2px' }}>
                    {step.num}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, color:'var(--text)', fontSize:'13px', marginBottom:'2px' }}>{step.title}</div>
                    <div style={{ color:'var(--muted)', fontSize:'11px', lineHeight:1.5 }}>{step.desc}</div>
                    {step.action && (
                      <div style={{ marginTop:'8px', display:'flex', gap:'8px' }}>
                        <input
                          type="text"
                          value={kaggleDataset}
                          onChange={e => setKaggleDataset(e.target.value)}
                          placeholder="owner/dataset-name (e.g. hassangasem/corporate-ai-adoption)"
                          style={{ flex:1, fontSize:'12px' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!kaggleDataset.trim()) { err('Enter a dataset path first'); return; }
                            const path = kaggleDataset.includes('/') ? kaggleDataset : kaggleUser + '/' + kaggleDataset;
                            window.open(`https://www.kaggle.com/datasets/${path}`, '_blank');
                          }}
                          style={{ background:'var(--teal)', color:'#000', border:'none', borderRadius:'5px', padding:'7px 14px', fontSize:'12px', fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
                          Open on Kaggle →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop:'1px solid var(--border)', paddingTop:'16px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text)', marginBottom:'10px', letterSpacing:'.5px' }}>
                STEP 4 — UPLOAD YOUR DOWNLOADED CSV:
              </div>
              <div
                onClick={() => {
                  const inp = document.createElement('input');
                  inp.type = 'file';
                  inp.accept = '.csv,.xlsx,.xls,.json,.tsv';
                  inp.onchange = e => {
                    const f = e.target.files[0];
                    if (f) onFileReady(f);
                  };
                  inp.click();
                }}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) onFileReady(f); }}
                onDragOver={e => e.preventDefault()}
                onDragEnter={e => e.currentTarget.style.borderColor='var(--teal)'}
                onDragLeave={e => e.currentTarget.style.borderColor='var(--border)'}
                style={{
                  border:'2px dashed var(--border)', borderRadius:'8px', padding:'28px',
                  textAlign:'center', cursor:'pointer', transition:'border-color .2s',
                  background:'var(--bg)'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor='var(--teal)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
              >
                <div style={{ fontSize:'28px', marginBottom:'8px' }}>📂</div>
                <div style={{ fontWeight:600, color:'var(--text)', fontSize:'13px', marginBottom:'4px' }}>
                  Click to browse or drag & drop
                </div>
                <div style={{ color:'var(--muted)', fontSize:'11px' }}>
                  CSV · Excel · JSON — Any size, all rows loaded
                </div>
              </div>

              <div style={{ marginTop:'14px' }}>
                <div style={{ fontSize:'10px', color:'var(--muted)', marginBottom:'8px', fontWeight:600, letterSpacing:'.5px' }}>
                  POPULAR KAGGLE DATASETS (click to open):
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                  {[
                    ['Titanic',               'competitions/titanic'],
                    ['House Prices',          'c/house-prices-advanced-regression-techniques'],
                    ['Iris Species',          'uciml/iris'],
                    ['Customer Churn',        'blastchar/telco-customer-churn'],
                    ['COVID-19 Data',         'imdevskp/corona-virus-report'],
                    ['Credit Card Fraud',     'mlg-ulb/creditcardfraud'],
                    ['Netflix Movies',        'shivamb/netflix-shows'],
                    ['Amazon Reviews',        'snap/amazon-fine-food-reviews'],
                  ].map(([name, path]) => (
                    <button key={name} onClick={() => window.open(`https://www.kaggle.com/${path}`, '_blank')}
                      style={{
                        background:'var(--surf)', border:'1px solid var(--border)', borderRadius:'5px',
                        padding:'7px 10px', fontSize:'11px', color:'var(--muted)', cursor:'pointer',
                        textAlign:'left', transition:'all .15s', display:'flex', alignItems:'center', gap:'6px'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='var(--teal)'; e.currentTarget.style.color='var(--text)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--muted)'; }}>
                      🏆 {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div style={{ marginTop:'12px', padding:'10px 14px', background:'rgba(255,70,85,.1)', border:'1px solid rgba(255,70,85,.3)', borderRadius:'6px', color:'var(--red)', fontSize:'12px' }}>
                ❌ {error}
              </div>
            )}
          </div>
        )}

        {/* GitHub */}
        {method==='github' && (
          <div>
            <ST>Import from GitHub</ST>
            <p style={{ color:'var(--muted)', fontSize:'12px', marginBottom:'14px' }}>
              Paste a GitHub file URL. Works with any public repository.
            </p>
            <div style={{ display:'grid', gap:'8px' }}>
              <input type="text" value={githubUrl} onChange={e=>setGithubUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/blob/main/data.csv"
                style={{ width:'100%' }} />
              <div style={{ fontSize:'10px', color:'var(--muted)' }}>Also works with raw.githubusercontent.com links.</div>
              <button className="btn-primary" onClick={importGitHub} disabled={loading} style={{ width:'fit-content' }}>
                {loading ? '⏳ Fetching...' : '🐙 Import from GitHub'}
              </button>
            </div>
          </div>
        )}

        {/* HuggingFace */}
        {method === 'huggingface' && (
          <div>
            <ST>Import from HuggingFace Hub</ST>

            <div style={{ padding:'12px 14px', background:'rgba(75,158,255,.08)', border:'1px solid rgba(75,158,255,.2)', borderRadius:'8px', fontSize:'11px', color:'var(--blue)', marginBottom:'16px', lineHeight:1.8 }}>
              <strong>For datasets with millions of rows:</strong><br/>
              1. Go to <strong>huggingface.co/datasets/[name]</strong><br/>
              2. Click <strong>"Files and versions"</strong> tab<br/>
              3. Download any <strong>.parquet</strong> or <strong>.csv</strong> file<br/>
              4. Use <strong>File Upload</strong> tab to upload it — handles 500MB+<br/>
              <br/>
              DataSmithy will try to auto-fetch up to 5,000 rows via API first.
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'3fr 1fr', gap:'10px', marginBottom:'10px' }}>
              <div>
                <label style={{ fontSize:'11px', color:'var(--muted)', display:'block', marginBottom:'4px' }}>Dataset Name</label>
                <input type="text" value={hfDataset} onChange={e=>setHfDataset(e.target.value)}
                  placeholder="username/dataset-name" style={{ width:'100%' }} />
              </div>
              <div>
                <label style={{ fontSize:'11px', color:'var(--muted)', display:'block', marginBottom:'4px' }}>Split</label>
                <select value={hfSplit} onChange={e=>setHfSplit(e.target.value)} style={{ width:'100%' }}>
                  <option value="train">train</option>
                  <option value="test">test</option>
                  <option value="validation">validation</option>
                </select>
              </div>
            </div>
            <button className="btn-primary" onClick={importHuggingFace} disabled={loading} style={{ width:'fit-content' }}>
              {loading ? '⏳ Fetching...' : '🤗 Import from HuggingFace'}
            </button>
          </div>
        )}

        {/* Paste CSV */}
        {method==='paste' && (
          <div>
            <ST>Paste CSV Text</ST>
            <p style={{ color:'var(--muted)', fontSize:'12px', marginBottom:'14px' }}>
              Copy data from any spreadsheet or table and paste below.
            </p>
            <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)}
              placeholder={'col1,col2,col3\nvalue1,value2,value3'}
              rows={10}
              style={{ width:'100%', background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:'5px', padding:'10px', fontFamily:'JetBrains Mono,monospace', fontSize:'11px', resize:'vertical', outline:'none' }} />
            <div style={{ display:'flex', gap:'10px', marginTop:'10px', alignItems:'center' }}>
              <button className="btn-primary" onClick={importPaste} style={{ width:'fit-content' }}>
                📋 Import Pasted Data
              </button>
              <span style={{ color:'var(--muted)', fontSize:'11px' }}>
                {pasteText ? pasteText.split('\n').filter(Boolean).length + ' lines detected' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Sample Datasets */}
        {method==='sample' && (
          <div>
            <ST>Built-in Sample Datasets</ST>
            <p style={{ color:'var(--muted)', fontSize:'12px', marginBottom:'14px' }}>
              Load a dataset instantly to explore DataSmithy features. Now with 13 diverse datasets!
            </p>
            <div style={{ display:'grid', gap:'8px' }}>
              {SAMPLE_DATASETS.map(ds => (
                <div key={ds.name} onClick={() => loadSample(ds)}
                  style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 14px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'6px', cursor:'pointer', transition:'border-color .15s' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='var(--teal)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, color:'var(--text)', fontSize:'13px' }}>{ds.name}</div>
                    <div style={{ color:'var(--muted)', fontSize:'11px', marginTop:'2px' }}>{ds.rows.toLocaleString()} rows · {ds.cols} columns</div>
                  </div>
                  <span className={`tag ${ds.tag==='Classification'?'tag-teal':'tag-amber'}`} style={{ fontSize:'10px' }}>{ds.tag}</span>
                  <span style={{ color:'var(--teal)', fontSize:'12px' }}>→</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status */}
        {progress && <div style={{ marginTop:'12px', color:'var(--teal)', fontSize:'12px' }}>⏳ {progress}</div>}
        {error    && (
          <div style={{ marginTop:'12px', padding:'10px 14px', background:'rgba(255,70,85,.1)', border:'1px solid rgba(255,70,85,.3)', borderRadius:'6px', color:'var(--red)', fontSize:'12px' }}>
            ❌ {error}
          </div>
        )}
      </div>
    </div>
  );
}

function ST({ children }) {
  return (
    <div style={{ color:'var(--teal)', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'12px', paddingBottom:'6px', borderBottom:'1px solid var(--border)' }}>
      {children}
    </div>
  );
}

function HowTo({ steps }) {
  return (
    <div style={{ padding:'10px 14px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'6px' }}>
      <div style={{ fontSize:'10px', color:'var(--muted)', fontWeight:600, marginBottom:'6px', letterSpacing:'.5px' }}>HOW TO</div>
      {steps.map((s,i) => (
        <div key={i} style={{ display:'flex', gap:'8px', fontSize:'11px', color:'var(--muted)', marginBottom:'4px' }}>
          <span style={{ color:'var(--teal)', flexShrink:0 }}>{i+1}.</span>
          <span>{s}</span>
        </div>
      ))}
    </div>
  );
}