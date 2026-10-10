// src/components/TourGuide.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';

/* ── Tour steps — each navigates to the exact tab ─────────────────────────────
   navigate: { modality, tab }
   target: CSS selector to spotlight (data-tour="…")
   pos: 'center'|'below'|'top'|'right'
────────────────────────────────────────────────────────────────────────────── */
const ALL_STEPS = [

  // ── TABULAR ──────────────────────────────────────────────────────────────
  {
    group: 'tabular',
    id: 't-import', navigate: { modality:'tabular', tab:'import' },
    emoji:'📥', title:'Tabular › Import', color:'#00CBA8',
    target:'[data-tour="modality-tabular"]', pos:'below',
    body:'Upload any tabular file — CSV, Excel, JSON or Parquet.\n\nOr connect a live source:\n• 🤗 HuggingFace (100 000+ datasets)\n• 📗 Google Sheets\n• 🔌 REST API\n• 🐙 GitHub raw CSV\n• 📊 Kaggle (script generator)\n\nDrag & drop anywhere on the page — DataSmithy detects the format automatically.',
    tip:'ZIP files of images are auto-extracted and labelled by subfolder name',
  },
  {
    group: 'tabular',
    id: 't-overview', navigate: { modality:'tabular', tab:'overview' },
    emoji:'📊', title:'Tabular › Overview', color:'#8B5CF6',
    target:'[data-tour="tab-overview"]', pos:'below',
    body:'Instant dataset health score (0–100) showing:\n• Column types & missing value %\n• Distribution histogram per column\n• Correlation heatmap\n• Duplicate row count\n• Outlier summary\n\nKnow your data inside-out before touching it.',
    tip:'Click any column name to open its full statistics panel',
  },
  {
    group: 'tabular',
    id: 't-grid', navigate: { modality:'tabular', tab:'grid' },
    emoji:'🗂', title:'Tabular › Data Grid', color:'#3B82F6',
    target:'[data-tour="tab-grid"]', pos:'below',
    body:'An editable spreadsheet view of your raw data.\n\nFeatures:\n• Click any cell to edit inline\n• Sort by any column\n• Filter rows with SQL-style conditions\n• Select & delete rows\n• Highlight cells by value or condition',
    tip:'Changes in the grid sync instantly across all other tabs',
  },
  {
    group: 'tabular',
    id: 't-columns', navigate: { modality:'tabular', tab:'columns' },
    emoji:'📐', title:'Tabular › Columns', color:'#F59E0B',
    target:'[data-tour="tab-columns"]', pos:'below',
    body:'Manage each column individually:\n• Rename columns\n• Change data type (string → int → float → date)\n• Mark as target / feature / ignore\n• Set encoding strategy for ML\n• Drop columns entirely\n\nChanges propagate to the pipeline automatically.',
    tip:'Set your target column here — the pipeline uses it for train/test split',
  },
  {
    group: 'tabular',
    id: 't-universal', navigate: { modality:'tabular', tab:'universal' },
    emoji:'✨', title:'Tabular › Universal Clean', color:'#EC4899',
    target:'[data-tour="tab-universal"]', pos:'below',
    body:'The most powerful tab — 40+ operations in one place:\n• Trim, case-normalise, regex replace\n• Date/phone/email standardisation\n• Fill or remove missing values\n• Fuzzy deduplication\n• Formula columns (like Excel)\n• Finance tools — P&L, reconciliation\n\nFull undo/redo history of every change.',
    tip:'Every operation is reversible — the Undo button restores the previous state',
  },
  {
    group: 'tabular',
    id: 't-pipeline', navigate: { modality:'tabular', tab:'export' },
    emoji:'⚡', title:'Tabular › Run Pipeline', color:'#00CBA8',
    target:'[data-tour="run-pipeline"]', pos:'top',
    body:'One click applies your entire ML prep workflow:\n1. Clean & validate\n2. Encode categoricals (one-hot, label, ordinal)\n3. Scale numerics (standard, min-max, robust)\n4. Engineer new features\n5. Split train / val / test\n\nOutputs: processed CSV + Python code for sklearn, PyTorch or HuggingFace.',
    tip:'The Python code includes your exact column names and chosen parameters',
  },
  {
    group: 'tabular',
    id: 't-export', navigate: { modality:'tabular', tab:'export' },
    emoji:'📦', title:'Tabular › Export', color:'#6366F1',
    target:'[data-tour="tab-export"]', pos:'below',
    body:'Export in any format:\n• Processed CSV / Excel\n• JSONL for HuggingFace push_to_hub\n• Alpaca / OpenAI fine-tune format\n• Train / Val / Test split CSV\n• HTML Health Report\n\nShare Results → one click posts dataset stats to LinkedIn, X, WhatsApp or Email with pre-filled content.',
    tip:'Share Results generates the full post for you — just click Publish',
  },

  // ── IMAGES ────────────────────────────────────────────────────────────────
  {
    group: 'images',
    id: 'i-import', navigate: { modality:'images', tab:'import' },
    emoji:'📥', title:'Images › Import', color:'#3B82F6',
    target:'[data-tour="modality-images"]', pos:'below',
    body:'Upload images directly or as a ZIP.\n\n📁 Upload Files — select multiple images\n📦 Upload ZIP — auto-labels by subfolder name:\n    cats/ → "cats"  dogs/ → "dogs"\n🤗 HuggingFace — connect any image dataset\n🎯 Samples — 3 built-in demo datasets\n\nAfter import, DataSmithy analyses every image for brightness, sharpness, duplicates and class distribution.',
    tip:'Create subfolders per class in your ZIP for automatic labelling',
  },
  {
    group: 'images',
    id: 'i-overview', navigate: { modality:'images', tab:'overview' },
    emoji:'📊', title:'Images › Overview', color:'#8B5CF6',
    target:'[data-tour="tab-overview"]', pos:'below',
    body:'Health score and 10 quality metrics:\n• Total images & class count\n• Duplicate images (hash-based detection)\n• Blurry images (sharpness score < 8)\n• Dark images (brightness < 60)\n• Class imbalance %\n• Average image size (W × H px)\n• Error count\n\nGreen = healthy. Amber/Red = action needed.',
    tip:'Click any metric card to jump to the relevant fix (e.g. duplicates → Quality tab)',
  },
  {
    group: 'images',
    id: 'i-classes', navigate: { modality:'images', tab:'classes' },
    emoji:'🏷', title:'Images › Classes', color:'#F59E0B',
    target:'[data-tour="tab-classes"]', pos:'below',
    body:'Visual class distribution with bar charts.\n\nFor each class you can:\n• ✏ Rename — updates all images in that class\n• 🗑 Delete — removes the entire class\n\nClass imbalance > 30% triggers a warning — use Augment to balance.',
    tip:'Rename is global — every image in the class is relabelled instantly',
  },
  {
    group: 'images',
    id: 'i-browse', navigate: { modality:'images', tab:'grid' },
    emoji:'🖼', title:'Images › Browse', color:'#00CBA8',
    target:'[data-tour="tab-grid"]', pos:'below',
    body:'Visual grid of all your images.\n\n• 🔍 Search by filename or class\n• Filter by class or by issue (blurry / dark / duplicate)\n• Select multiple → bulk delete or move to another class\n• Click any image → opens full editor with:\n  – View · Edit · Info · Rename tabs\n  – Colour editor (brightness/contrast/saturation/hue)\n  – Apply changes to just that one image\n\nDUP · BLR · DRK badges highlight problem images.',
    tip:'Click an image thumbnail to open the full editor — try the Edit tab inside',
  },
  {
    group: 'images',
    id: 'i-quality', navigate: { modality:'images', tab:'quality' },
    emoji:'✅', title:'Images › Quality', color:'#EF4444',
    target:'[data-tour="tab-quality"]', pos:'below',
    body:'Four quality categories with one-click removal:\n\n🔄 Duplicates — hash-based detection\n💧 Blurry — sharpness score < 8\n🌑 Dark — brightness < 60\n💡 Over-bright — brightness > 210\n\nEach section shows thumbnail previews of the affected images. Click ✕ on any thumbnail to remove just that one.',
    tip:'Fix quality issues before augmenting — otherwise duplicates get multiplied',
  },
  {
    group: 'images',
    id: 'i-charts', navigate: { modality:'images', tab:'charts' },
    emoji:'📈', title:'Images › Charts', color:'#8B5CF6',
    target:'[data-tour="tab-charts"]', pos:'below',
    body:'Three charts:\n\n• Class Distribution — horizontal bar chart\n• Quality Metrics — brightness & sharpness gauges\n• Per-Class Quality Table — duplicates, blurry, dark counts per class\n\nUse this to identify which class needs the most attention before augmenting.',
    tip:'A class with many blurry images often has a camera-shake or compression issue',
  },
  {
    group: 'images',
    id: 'i-tools', navigate: { modality:'images', tab:'universal' },
    emoji:'🔧', title:'Images › Tools', color:'#F59E0B',
    target:'[data-tour="tab-universal"]', pos:'below',
    body:'Six canvas-based tools — all process in your browser:\n\n📐 Resize — presets: 64/128/224/256/512px\n🎨 Colour — brightness/contrast/saturation/hue\n✨ Filter — sharpen/blur/grayscale/sepia/invert\n💧 Watermark — 9 positions, live preview\n🔒 Strip EXIF — removes GPS & camera metadata\n🔄 Convert — JPEG / PNG / WebP\n\nEvery tool shows Before / After side-by-side. Click Apply to process all images. Click ↩ Undo to revert.',
    tip:'Watermark: click the ↗ grid to choose position, then drag the opacity slider',
  },
  {
    group: 'images',
    id: 'i-augment', navigate: { modality:'images', tab:'augment' },
    emoji:'🔀', title:'Images › Augment', color:'#EC4899',
    target:'[data-tour="tab-augment"]', pos:'below',
    body:'Select any image to preview 6 augmented variations:\n• Random hue rotation\n• Brightness & contrast jitter\n• Horizontal flip\n• Random rotation (-6° to +6°)\n\nHit 🔄 New Seed for different transforms.\nDownload any individual variation with ⬇ Aug #N.\n\nThe ML Code tab generates matching PyTorch transforms.',
    tip:'Augmenting minority classes reduces imbalance without collecting more data',
  },
  {
    group: 'images',
    id: 'i-split', navigate: { modality:'images', tab:'split' },
    emoji:'✂️', title:'Images › Split', color:'#3B82F6',
    target:'[data-tour="tab-split"]', pos:'below',
    body:'Drag the Train / Validation / Test sliders to set your split ratios.\n\nThe table below shows how many images each class contributes to each split — ensuring proportional representation.\n\nDefault: 70% train · 15% val · 15% test.',
    tip:'Keep test set ≥ 10% to get reliable evaluation metrics',
  },
  {
    group: 'images',
    id: 'i-mlcode', navigate: { modality:'images', tab:'models' },
    emoji:'🤖', title:'Images › ML Code', color:'#6366F1',
    target:'[data-tour="tab-models"]', pos:'below',
    body:'Auto-generated PyTorch training code using:\n• EfficientNet B0 (pretrained ImageNet)\n• Your exact class names and image size\n• Your split ratios\n• Data augmentation transforms\n\nIncludes: DataLoader, optimizer, training loop, model save.\n\nCopy Config exports just the CLASSES and IMG_SIZE as a config.py file.',
    tip:'Switch from EfficientNet to ResNet by replacing models.efficientnet_b0 with models.resnet18',
  },
  {
    group: 'images',
    id: 'i-advanced', navigate: { modality:'images', tab:'advanced' },
    emoji:'🧪', title:'Images › Advanced', color:'#EF4444',
    target:'[data-tour="tab-advanced"]', pos:'below',
    body:'Six deep-analysis tools:\n\n👤 Face Detection — skin-tone proxy, keep/remove faces\n📊 PCA — 2D scatter plot of image features\n🎨 Colour Modes — RGB vs Grayscale per image\n🔊 Noise — detect & remove noisy images\n📐 Aspect Ratios — distribution chart\n🏷 Annotate — draw bounding boxes on canvas, export YOLO .txt or COCO JSON',
    tip:'Annotation tip: select a class label → drag on the image → box appears immediately',
  },
  {
    group: 'images',
    id: 'i-pipeline', navigate: { modality:'images', tab:'pipeline' },
    emoji:'⚡', title:'Images › Pipeline', color:'#00CBA8',
    target:'[data-tour="tab-pipeline"]', pos:'below',
    body:'6 preset one-click pipelines:\n🚀 ML Ready — Resize 224 + Strip EXIF + Remove Dupes\n🌐 Web Optimised — Resize 512 + Watermark\n🧹 Clean Dataset — Remove Dupes + Blurry + Dark\n🎨 Colour Boost — Vivid filter + Strip EXIF\n📊 Research Pack — Resize 256 + Strip EXIF\n🏥 Medical Prep — Grayscale + Strip EXIF\n\nOr build a custom pipeline from 10 step chips. A live terminal log shows each step.',
    tip:'Pipeline keeps a history — use ↩ Undo in the top bar to revert any step',
  },
  {
    group: 'images',
    id: 'i-export', navigate: { modality:'images', tab:'export' },
    emoji:'📦', title:'Images › Export', color:'#6366F1',
    target:'[data-tour="tab-export"]', pos:'below',
    body:'Five export formats:\n• 📦 ZIP — images in class subfolders\n• 📋 Labels CSV — filename, class, metadata\n• 🔵 YOLO classes.txt — for YOLOv5/v8 training\n• 🎯 COCO JSON — standard annotation format\n• 📊 Health Report — printable HTML\n\nShare Results opens the mobile share sheet with pre-filled LinkedIn/X/WhatsApp posts.',
    tip:'YOLO and COCO exports pair with your BBox annotations from the Annotate tab',
  },

  // ── TEXT / NLP ────────────────────────────────────────────────────────────
  {
    group: 'text',
    id: 'n-import', navigate: { modality:'text', tab:'import' },
    emoji:'📥', title:'Text › Import', color:'#EC4899',
    target:'[data-tour="modality-text"]', pos:'below',
    body:'Import text data five ways:\n\n📝 Paste / Upload — paste CSV or plain text, upload JSON/JSONL/TXT/CSV\n🤗 HuggingFace — imdb, emotion, ag_news, tweet_eval and more\n🔗 URL — any public CSV or JSON endpoint\n🎯 Samples — 3 built-in datasets (reviews, support tickets, news)\n➕ Merge — add more documents to existing data\n\nCSV: expects text and label columns (auto-detected).',
    tip:'JSONL format (one JSON per line) loads the fastest for large datasets',
  },
  {
    group: 'text',
    id: 'n-overview', navigate: { modality:'text', tab:'overview' },
    emoji:'📊', title:'Text › Overview', color:'#8B5CF6',
    target:'[data-tour="tab-overview"]', pos:'below',
    body:'Health score with 9 metrics:\n• Total documents & class count\n• Average word count\n• Vocabulary size\n• Duplicate documents\n• Empty documents\n• Too-short docs (< 5 words)\n• Class imbalance %\n\nEach metric shows a green ✅ or amber ⚠ with a plain-English explanation.',
    tip:'Vocabulary size ÷ total words = lexical diversity — aim for > 0.3 for varied text',
  },
  {
    group: 'text',
    id: 'n-docs', navigate: { modality:'text', tab:'words' },
    emoji:'📝', title:'Text › Documents', color:'#3B82F6',
    target:'[data-tour="tab-words"]', pos:'below',
    body:'Browse, search and edit every document.\n\n• 🔍 Search by text content or label\n• Filter by class\n• Select multiple → bulk re-label or bulk delete\n• Click ✏ to edit text or label inline\n• Click 🗑 to delete a single document\n• DUP badge highlights duplicate documents',
    tip:'Bulk-relabel is the fastest way to fix a mislabelled class',
  },
  {
    group: 'text',
    id: 'n-quality', navigate: { modality:'text', tab:'universal' },
    emoji:'✅', title:'Text › Quality', color:'#EF4444',
    target:'[data-tour="tab-universal"]', pos:'below',
    body:'Four quality categories — each with Remove All:\n\n🔄 Duplicates — exact-match detection\n❌ Empty Docs — blank or whitespace-only\n📏 Too Short — fewer than 5 words\n📄 Too Long — more than 500 words\n\nEach section previews the first 3 affected documents so you know what you\'re removing.',
    tip:'Remove duplicates before training — they inflate accuracy metrics artificially',
  },
  {
    group: 'text',
    id: 'n-charts', navigate: { modality:'text', tab:'clean' },
    emoji:'📈', title:'Text › Charts', color:'#F59E0B',
    target:'[data-tour="tab-clean"]', pos:'below',
    body:'Four charts:\n• Class distribution bar chart\n• Text length histogram (word count)\n• Word frequency table (top 12 unigrams)\n• Per-class quality breakdown (dupes/empty/avg words)\n\nUse the length histogram to decide your min/max word filters.',
    tip:'Highly skewed length distributions often indicate data quality issues',
  },
  {
    group: 'text',
    id: 'n-analyse', navigate: { modality:'text', tab:'visualize' },
    emoji:'🔍', title:'Text › Analyse', color:'#6366F1',
    target:'[data-tour="tab-visualize"]', pos:'below',
    body:'Five analysis tools — all in the browser, no API key:\n\n😊 Sentiment — lexicon positive/negative/neutral per doc\n🏷 NER — PERSON · DATE · NUM · URL entity extraction\n📖 Readability — Flesch score (100=easy, 0=hard)\n🌍 Language — detects 9 languages, keep-English-only button\n🤖 Auto-Label — keyword → class rules applied to all docs\n\nExport any result as CSV.',
    tip:'Auto-Label + Sentiment together can label thousands of reviews in seconds',
  },
  {
    group: 'text',
    id: 'n-tools', navigate: { modality:'text', tab:'export' },
    emoji:'🌐', title:'Text › Cleaning Tools', color:'#00CBA8',
    target:'[data-tour="tab-export"]', pos:'below',
    body:'14 one-click cleaning operations:\nLowercase · Remove HTML · Remove URLs · Remove @mentions · Remove hashtags · Remove numbers · Remove punctuation · Remove special chars · Remove stopwords · Normalise whitespace · Remove accents · Remove emoji · Expand contractions · Remove line breaks\n\nPlus custom Regex Find & Replace with common pattern shortcuts.\n\nEvery tool previews changes on 5 sample docs (Before → After diff) before you commit.',
    tip:'Preview before commit — the diff shows exact character-level changes',
  },
  {
    group: 'text',
    id: 'n-split', navigate: { modality:'text', tab:'translate' },
    emoji:'✂️', title:'Text › Split', color:'#3B82F6',
    target:'[data-tour="tab-split"]', pos:'below',
    body:'Set train / validation / test ratios with sliders.\n\nThe class breakdown table shows how many documents from each class go into each split — ensuring stratified proportions.\n\nDefault: 70% train · 15% val · 15% test.',
    tip:'Export Split CSV from the Export tab to get all three splits in one file',
  },
  {
    group: 'text',
    id: 'n-mlcode', navigate: { modality:'text', tab:'mlcode' },
    emoji:'🤖', title:'Text › ML Code', color:'#8B5CF6',
    target:'[data-tour="tab-mlcode"]', pos:'below',
    body:'Four ML frameworks — all auto-configured with your class names:\n\n🤗 BERT Fine-tuning — HuggingFace Trainer + AutoTokenizer\n📊 sklearn — TF-IDF vectoriser + Logistic Regression pipeline\n🔥 PyTorch — LSTM text classifier\n🌿 spaCy — textcat_multilabel pipeline\n\nCopy Config exports LABELS and NUM_CLASSES as config.py.',
    tip:'sklearn + TF-IDF is the best starting point — trains in seconds, often surprisingly accurate',
  },
  {
    group: 'text',
    id: 'n-pipeline', navigate: { modality:'text', tab:'pipeline' },
    emoji:'⚡', title:'Text › Pipeline', color:'#F59E0B',
    target:'[data-tour="tab-pipeline"]', pos:'below',
    body:'6 NLP pipeline presets:\n🤗 BERT Ready — Lowercase + HTML + Special chars + Dedup\n😊 Sentiment — URLs + Mentions + Hashtags + Dedup\n📊 Classification — Stopwords + Dedup + Empty + Short\n🔍 NER Prep — HTML + URLs + Trim + Dedup\n🧹 Deep Clean — all 10 steps combined\n🌍 Multilingual — HTML + URLs + Normalise\n\nOr build custom: 15 step chips, drag-to-order, live terminal log.',
    tip:'The log shows doc count before and after each step so nothing is a surprise',
  },
  {
    group: 'text',
    id: 'n-export', navigate: { modality:'text', tab:'download' },
    emoji:'📦', title:'Text › Export', color:'#EC4899',
    target:'[data-tour="tab-download"]', pos:'below',
    body:'Six export formats:\n• 📋 Labels CSV — text, label\n• 📄 JSONL — one JSON per line (HuggingFace ready)\n• 📝 JSON Array — full dataset\n• 📃 Plain TXT — [label] text per line\n• ✂️ Split CSV — train/val/test column included\n• 📊 Health Report — printable HTML\n\nShare Results → pre-filled post for LinkedIn, X, WhatsApp, Email.',
    tip:'JSONL is the fastest format to load into HuggingFace datasets.load_dataset()',
  },
];

// ── Tour groups config ─────────────────────────────────────────────────────────
const GROUPS = [
  { id:'tabular', label:'📊 Tabular Data', desc:'Import → Clean → Pipeline → Export', color:'#00CBA8' },
  { id:'images',  label:'🖼 Images',        desc:'Import → Tools → Augment → Export',  color:'#3B82F6' },
  { id:'text',    label:'📝 Text / NLP',    desc:'Import → Analyse → Pipeline → Export', color:'#EC4899' },
];

// ── Spotlight helper ───────────────────────────────────────────────────────────
function getRect(sel) {
  if (!sel) return null;
  try {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top:r.top, left:r.left, width:r.width, height:r.height };
  } catch { return null; }
}

// ── Card positioning ───────────────────────────────────────────────────────────
function positioned(rect, pos, W=400) {
  const GAP=14, vw=window.innerWidth, vh=window.innerHeight, H=380;
  if (!rect || pos==='center') {
    return { position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:`${W}px`, maxWidth:'92vw', zIndex:10001 };
  }
  let top, left;
  if (pos==='below') { top=Math.min(rect.top+rect.height+GAP,vh-H-10); left=Math.max(10,Math.min(rect.left,vw-W-10)); }
  else if (pos==='top')   { top=Math.max(10,rect.top-H-GAP); left=Math.max(10,Math.min(rect.left,vw-W-10)); }
  else if (pos==='right') { top=Math.max(10,Math.min(rect.top,vh-H-10)); left=Math.min(rect.left+rect.width+GAP,vw-W-10); }
  else { top=Math.max(10,Math.min(rect.top,vh-H-10)); left=Math.max(10,rect.left-W-GAP); }
  return { position:'fixed', top, left, width:`${W}px`, maxWidth:'92vw', zIndex:10001 };
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TourGuide({ onClose, setModality, setActiveTab, setImgTab, setTextTab }) {
  const [phase,    setPhase]    = useState('select'); // 'select' | 'tour'
  const [groups,   setGroups]   = useState([]);
  const [steps,    setSteps]    = useState([]);
  const [idx,      setIdx]      = useState(0);
  const [rect,     setRect]     = useState(null);
  const [fading,   setFading]   = useState(false);

  const cur    = steps[idx];
  const isLast = idx === steps.length - 1;
  const pct    = steps.length ? Math.round((idx+1)/steps.length*100) : 0;

  // Start tour with chosen groups
  const startTour = useCallback((chosen) => {
    const filtered = ALL_STEPS.filter(s => chosen.includes(s.group));
    setSteps(filtered);
    setIdx(0);
    setPhase('tour');
  }, []);

  // Navigate to the step's tab
  const navigateStep = useCallback((step) => {
    if (!step?.navigate) return;
    const { modality, tab } = step.navigate;
    if (setModality) setModality(modality);
    setTimeout(() => {
      if (modality === 'tabular' && setActiveTab) setActiveTab(tab);
      if (modality === 'images'  && setImgTab)    setImgTab(tab);
      if (modality === 'text'    && setTextTab)    setTextTab(tab);
    }, 220);
  }, [setModality, setActiveTab, setImgTab, setTextTab]);

  // Update spotlight when step changes
  useEffect(() => {
    if (phase !== 'tour' || !cur) return;
    setFading(true);
    navigateStep(cur);
    const t1 = setTimeout(() => { setFading(false); }, 280);
    const t2 = setTimeout(() => {
      const r = getRect(cur.target);
      setRect(r);
      if (r) {
        const el = document.querySelector(cur.target);
        el?.scrollIntoView({ behavior:'smooth', block:'center' });
      }
    }, 450);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [idx, phase, cur, navigateStep]);

  // Keyboard nav
  useEffect(() => {
    const h = e => {
      if (phase !== 'tour') return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); isLast ? onClose?.() : setIdx(i=>i+1); }
      if (e.key === 'ArrowLeft')                        { e.preventDefault(); setIdx(i=>Math.max(0,i-1)); }
      if (e.key === 'Escape')                           onClose?.();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [phase, isLast, onClose]);

  // ── Select screen ─────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <>
        <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:10000 }}/>
        <div style={{ position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
          background:'#fff',borderRadius:'20px',padding:'28px',width:'440px',maxWidth:'92vw',
          zIndex:10001,boxShadow:'0 24px 64px rgba(0,0,0,.22)' }}>
          <div style={{ textAlign:'center',marginBottom:'20px' }}>
            <div style={{ fontSize:'36px',marginBottom:'8px' }}>🗺</div>
            <div style={{ fontSize:'18px',fontWeight:800,color:'#0F172A' }}>Which tour would you like?</div>
            <div style={{ fontSize:'12px',color:'#64748B',marginTop:'4px' }}>Select one or more — we'll walk you through every tab</div>
          </div>
          {/* Individual tabs */}
          <div style={{ display:'grid',gap:'8px',marginBottom:'12px' }}>
            {GROUPS.map(g => (
              <button key={g.id} onClick={() => startTour([g.id])} style={{
                padding:'14px 16px',borderRadius:'12px',border:`1.5px solid ${g.color}33`,
                background:`${g.color}08`,cursor:'pointer',textAlign:'left',
                display:'flex',alignItems:'center',gap:'12px',transition:'all .15s',
              }}
                onMouseOver={e=>{e.currentTarget.style.background=`${g.color}15`;e.currentTarget.style.borderColor=g.color;}}
                onMouseOut={e=>{e.currentTarget.style.background=`${g.color}08`;e.currentTarget.style.borderColor=`${g.color}33`;}}
              >
                <div style={{ fontSize:'24px',flexShrink:0 }}>{g.label.split(' ')[0]}</div>
                <div>
                  <div style={{ fontWeight:700,color:'#0F172A',fontSize:'13px' }}>{g.label.slice(2)}</div>
                  <div style={{ fontSize:'11px',color:'#64748B',marginTop:'2px' }}>{g.desc}</div>
                </div>
                <div style={{ marginLeft:'auto',fontSize:'11px',color:g.color,fontWeight:700,flexShrink:0 }}>
                  {ALL_STEPS.filter(s=>s.group===g.id).length} steps →
                </div>
              </button>
            ))}
          </div>
          {/* All 3 */}
          <button onClick={() => startTour(['tabular','images','text'])} style={{
            width:'100%',padding:'12px',borderRadius:'12px',border:'1.5px solid #00CBA8',
            background:'linear-gradient(135deg,#00CBA808,#3B82F608,#EC4899 08)',
            cursor:'pointer',fontWeight:700,fontSize:'13px',color:'#00956B',
            display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',transition:'all .15s',
          }}
            onMouseOver={e=>{e.currentTarget.style.background='rgba(0,203,168,.12)';}}
            onMouseOut={e=>{e.currentTarget.style.background='linear-gradient(135deg,#00CBA808,#3B82F608,#EC489908)';}}
          >
            🌟 Complete Tour — all {ALL_STEPS.length} tabs
          </button>
          <button onClick={onClose} style={{ marginTop:'10px',width:'100%',padding:'8px',borderRadius:'9px',border:'1px solid #E2E8F0',background:'transparent',cursor:'pointer',fontSize:'12px',color:'#94A3B8' }}>
            Maybe later
          </button>
        </div>
      </>
    );
  }

  if (!cur) return null;

  // ── Tour card ─────────────────────────────────────────────────────────────
  const card = (
    <div onClick={e=>e.stopPropagation()} style={{
      background:'#fff',borderRadius:'18px',
      boxShadow:'0 24px 64px rgba(0,0,0,.22)',overflow:'hidden',
      opacity:fading?0:1,transform:fading?'scale(.97)':'scale(1)',
      transition:'opacity .22s,transform .22s',
    }}>
      {/* Colour bar */}
      <div style={{ height:'4px',background:`linear-gradient(90deg,${cur.color},${cur.color}55)`,transition:'background .3s' }}/>
      {/* Progress */}
      <div style={{ height:'3px',background:'#F1F5F9' }}>
        <div style={{ width:`${pct}%`,height:'100%',background:'#00CBA8',transition:'width .4s ease' }}/>
      </div>
      {/* Header */}
      <div style={{ padding:'14px 16px 0',display:'flex',alignItems:'flex-start',gap:'10px' }}>
        <div style={{ fontSize:'26px',flexShrink:0,lineHeight:1 }}>{cur.emoji}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'14px',fontWeight:800,color:'#0F172A',lineHeight:1.3 }}>{cur.title}</div>
          <div style={{ fontSize:'9px',color:'#94A3B8',marginTop:'2px',display:'flex',gap:'8px' }}>
            <span>Step {idx+1}/{steps.length}</span>
            <span>·</span>
            <span style={{ color:GROUPS.find(g=>g.id===cur.group)?.color||'#94A3B8',fontWeight:700 }}>
              {GROUPS.find(g=>g.id===cur.group)?.label}
            </span>
          </div>
        </div>
        <button onClick={()=>onClose?.()} style={{ background:'#F1F5F9',border:'none',borderRadius:'8px',width:'26px',height:'26px',fontSize:'15px',cursor:'pointer',color:'#64748B',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center' }}>×</button>
      </div>
      {/* Body */}
      <div style={{ padding:'10px 16px 6px',fontSize:'11.5px',color:'#475569',lineHeight:1.85,whiteSpace:'pre-line' }}>
        {cur.body}
      </div>
      {/* Tip */}
      <div style={{ margin:'0 16px 10px',padding:'7px 10px',background:`${cur.color}10`,borderRadius:'7px',borderLeft:`3px solid ${cur.color}`,fontSize:'10px',color:'#64748B',lineHeight:1.5 }}>
        💡 {cur.tip}
      </div>
      {/* Footer */}
      <div style={{ padding:'8px 16px 14px',borderTop:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:'8px' }}>
        {/* Mini dot progress */}
        <div style={{ display:'flex',gap:'2px',flex:1,overflow:'hidden' }}>
          {steps.map((_,i)=>(
            <div key={i} onClick={e=>{e.stopPropagation();setIdx(i);}} style={{
              height:'4px',
              width:i===idx?'14px':'4px',
              borderRadius:'2px',cursor:'pointer',flexShrink:0,transition:'all .25s',
              background:i===idx?cur.color:i<idx?'#0D9488':'#E2E8F0',
            }}/>
          ))}
        </div>
        <div style={{ display:'flex',gap:'5px',flexShrink:0 }}>
          {idx>0&&<button onClick={e=>{e.stopPropagation();setIdx(i=>i-1);}} style={{ background:'#F1F5F9',border:'none',borderRadius:'8px',padding:'6px 12px',fontSize:'11px',fontWeight:600,cursor:'pointer',color:'#64748B' }}>← Back</button>}
          <button onClick={e=>{e.stopPropagation();setPhase('select');setIdx(0);}} style={{ background:'transparent',border:'1px solid #E2E8F0',borderRadius:'8px',padding:'6px 10px',fontSize:'10px',color:'#94A3B8',cursor:'pointer' }}>Menu</button>
          <button onClick={e=>{e.stopPropagation();isLast?onClose?.():setIdx(i=>i+1);}} style={{
            background:`linear-gradient(135deg,${cur.color},${cur.color}cc)`,
            border:'none',borderRadius:'8px',padding:'6px 16px',
            fontSize:'12px',fontWeight:700,cursor:'pointer',color:'#fff',
            boxShadow:`0 2px 8px ${cur.color}44`,transition:'background .3s',
          }}>
            {isLast?'🚀 Done!':'Next →'}
          </button>
        </div>
      </div>
    </div>
  );

  // Spotlight position style
  const spotStyle = rect ? {
    position:'absolute',
    top:Math.max(0,rect.top-8), left:Math.max(0,rect.left-8),
    width:rect.width+16, height:rect.height+16,
    borderRadius:'10px',
    boxShadow:`0 0 0 9999px rgba(0,0,0,.62)`,
    border:`2px solid ${cur.color}`,
    pointerEvents:'none',
    animation:'pulseTour 1.8s ease-in-out infinite',
    transition:'all .35s ease',
  } : null;

  const cardStyle = positioned(rect, cur.pos);

  return (
    <>
      {/* Backdrop */}
      <div style={{ position:'fixed',inset:0,zIndex:10000,pointerEvents:'none',
        background:rect?'transparent':'rgba(0,0,0,.55)' }}>
        {rect && spotStyle && <div style={spotStyle}/>}
      </div>
      {/* Card */}
      <div style={{ ...cardStyle, pointerEvents:'all' }}>{card}</div>
      <style>{`
        @keyframes pulseTour {
          0%,100%{box-shadow:0 0 0 9999px rgba(0,0,0,.62),0 0 0 3px ${cur.color}44}
          50%     {box-shadow:0 0 0 9999px rgba(0,0,0,.62),0 0 0 8px ${cur.color}88}
        }
      `}</style>
    </>
  );
}

// ── Tour trigger button ────────────────────────────────────────────────────────
export function TourButton({ onClick }) {
  const [hover,setHover]=useState(false);
  return (
    <button onClick={onClick}
      onMouseOver={()=>setHover(true)} onMouseOut={()=>setHover(false)}
      style={{ display:'flex',alignItems:'center',gap:'6px',
        background:hover?'rgba(0,203,168,.18)':'rgba(0,203,168,.1)',
        border:'1px solid rgba(0,203,168,.35)',borderRadius:'8px',
        padding:'6px 13px',fontSize:'11px',fontWeight:700,color:'#00956B',
        cursor:'pointer',transition:'all .15s',
        transform:hover?'scale(1.04)':'scale(1)' }}>
      🗺 Tour
    </button>
  );
}