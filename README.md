# ◆ DataSmithy — AI-Powered Data Engineering Platform

> From raw data to ML-ready datasets — entirely in your browser.

**Live demo:** `https://datasmithy.vercel.app` (after you deploy)

---

## What It Does

Upload any dataset (CSV, Excel, JSON, TSV) and DataSmithy will:

1. Run full EDA using **pandas + numpy** in your browser (via Pyodide/WebAssembly)
2. Detect missing values, duplicates, outliers, skewness, cardinality
3. Give per-column AI recommendations for cleaning, encoding, scaling
4. Execute a full preprocessing pipeline with live log
5. Generate **matplotlib + seaborn** charts in-browser
6. Export processed CSV + train/test split + Python pipeline code + JSON report

---

## Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| Data processing | Pyodide (Python 3.11 in WebAssembly) | Free |
| Libraries | pandas, numpy, scikit-learn, matplotlib, seaborn, scipy | Free |
| Frontend | React + Tailwind CSS | Free |
| Auth | Firebase Authentication | Free |
| Database | Firebase Firestore | Free |
| Deployment | Vercel | Free |

**Total cost: ₹0 / $0 per month**

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/datasmithy.git
cd datasmithy
npm install
```

### 2. Firebase Setup

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project named **datasmithy**
3. Enable **Authentication** → Sign-in methods → enable:
   - Google
   - Email/Password
4. Create **Firestore Database** → Start in test mode
5. Go to **Project Settings** → Your apps → Add web app
6. Copy the config values

### 3. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and paste your Firebase config values.

### 4. Set Admin Email

Open `src/firebase/db.js` and replace:
```js
export const ADMIN_EMAILS = ['your@email.com'];
```
with your actual email.

Also update `firestore.rules` with your email.

### 5. Run Locally

```bash
npm start
```

Visit `http://localhost:3000`

**Note:** First load takes ~10–15 seconds while Pyodide downloads Python runtime. After that it's cached.

---

## Deploy to Vercel (Free)

```bash
npm install -g vercel
vercel login
vercel --prod
```

Then add your `.env` variables in Vercel dashboard → Settings → Environment Variables.

**OR** push to GitHub and connect repo to Vercel for auto-deploy.

---

## Deploy to GitHub Pages (Alternative)

```bash
npm install gh-pages --save-dev
```

Add to `package.json`:
```json
"homepage": "https://YOUR_USERNAME.github.io/datasmithy",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d build"
}
```

Then:
```bash
npm run deploy
```

---

## Firestore Rules

Paste `firestore.rules` content into Firebase Console → Firestore → Rules tab.

---

## Project Structure

```
datasmithy/
├── public/index.html          ← Pyodide CDN + Tailwind
├── src/
│   ├── App.jsx                ← Router + Auth + Theme
│   ├── context/
│   │   ├── AuthContext.jsx    ← Firebase auth state
│   │   └── ThemeContext.jsx   ← Dark/Light theme
│   ├── firebase/
│   │   ├── config.js          ← Firebase init
│   │   ├── auth.js            ← Auth helpers
│   │   └── db.js              ← Firestore helpers
│   ├── hooks/
│   │   └── usePyodide.js      ← Python runtime loader
│   ├── python/
│   │   ├── eda.js             ← EDA + visualization Python scripts
│   │   └── pipeline.js        ← Full processing pipeline Python
│   ├── components/
│   │   ├── Navbar.jsx
│   │   └── tabs/
│   │       ├── OverviewTab.jsx
│   │       ├── CleanTab.jsx
│   │       ├── EncodeTab.jsx
│   │       ├── ScaleTab.jsx
│   │       ├── FeatureEngTab.jsx
│   │       ├── VisualizeTab.jsx
│   │       ├── MLReadyTab.jsx
│   │       └── ExportTab.jsx
│   └── pages/
│       ├── Landing.jsx
│       ├── Login.jsx
│       ├── MainApp.jsx        ← Core tool
│       ├── UserDash.jsx
│       └── AdminDash.jsx
├── vercel.json                ← Required COOP/COEP headers for Pyodide
├── firestore.rules
└── .env.example
```

---

## Features

- **Universal ingestion** — CSV, Excel (.xlsx/.xls), JSON, TSV
- **Full EDA** — shape, dtypes, memory, missing %, duplicates, outliers, skewness, kurtosis, correlation
- **Dataset health score** — 0–100 composite score
- **Smart cleaning** — 8 imputation strategies, IQR/Z-score outlier treatment, whitespace/casing fix
- **6 encoding methods** — Label, One-Hot, Frequency, Ordinal + auto-recommendation
- **7 scaling methods** — Standard, MinMax, Robust, MaxAbs, Quantile, PowerTransformer, Normalizer
- **Feature engineering** — datetime extraction, log transform, binning, correlation-based selection, PCA
- **Rich visualizations** — seaborn heatmaps, matplotlib histograms, box plots, bar charts
- **ML readiness validation** — 5-point checklist, model compatibility matrix
- **Export bundle** — processed CSV, train/test split, Python pipeline code, JSON report
- **Dark/Light theme** — persisted per user
- **User dashboard** — processing history, stats (requires login)
- **Admin dashboard** — platform metrics, user list, activity log

---

## Privacy

All dataset processing happens 100% in your browser. No data is sent to any server.

----

## Author

KOLLI VENNELA CHOWDARY

---

## License

MIT — free to use, modify, and deploy.
