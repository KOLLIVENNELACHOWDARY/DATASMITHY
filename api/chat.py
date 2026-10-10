# api/chat.py — Vercel serverless proxy for Anthropic API
# Keeps API key secret on server. Add ANTHROPIC_API_KEY to Vercel env vars.

from http.server import BaseHTTPRequestHandler
import json, os, urllib.request, urllib.error

SYSTEM = """You are DataSmithy's friendly support assistant. DataSmithy is a FREE browser-based data platform.

PLATFORM OVERVIEW:
- 3 modalities: 📊 Tabular Data (CSV/Excel/JSON/Parquet), 🖼 Images (JPG/PNG/ZIP), 📝 Text/NLP
- Smart drag-and-drop: drop any file anywhere — auto-routes to correct modality
- All processing runs in the browser — data never leaves the user's computer

TABULAR TABS (in order):
📥 Import → 📈 Overview → 📊 Data Grid → 🏷 Columns → ✨ Clean → 📉 Visualize → 🔌 Connect → 🧩 Templates → 📦 Export
ML Mode adds: 🔬 ML Clean → 🔤 Encode → ⚖ Scale → ⚙ Features → 🤖 ML Ready → 💾 Presets

CLEAN TAB features:
- 15 string ops (trim, case, regex, split, replace)
- 14 format standardizers (dates, phones, emails, PAN, Aadhaar, currency, pincode)
- Formula columns (like Excel)
- Fuzzy deduplication
- Validation rules
- Join/Merge datasets
- Finance tools: P&L summary, transaction reconciliation, cash flow analysis
- Full audit trail

IMAGE TABS (in order):
📥 Import → 📊 Overview → 🏷 Classes → 🖼 Browse → ✅ Quality → 📈 Charts → 🌐 Tools → 🔀 Augment → ✂️ Split → 🤖 ML Code → 📦 Export → 🧪 Advanced → 🔌 Connect

IMAGE TOOLS (Universal tab):
- Batch resize + compress, watermark, EXIF/GPS strip, format convert, contact sheet, WCAG check

IMAGE ADVANCED (AI-powered):
- Face detection (TinyFaceDetector, runs in browser)
- OCR/watermark detection (Tesseract.js)
- t-SNE/PCA visualization
- Semantic segmentation (HuggingFace, needs VITE_HF_TOKEN)
- ICC color profile reader
- Dataset versioning

TEXT/NLP TABS:
📥 Import → 📊 Overview → 📈 Words → 🌐 Universal → 🧹 Clean → ⬇ Export → 🔌 Connect → 🌍 Translate

TEXT UNIVERSAL (10 sub-tabs):
Readability, Keyword density, Word cloud, NER, Concordance, Text similarity, Emoji analysis, Vocab difficulty, Doc stats, Export

TEXT EXPORT formats:
JSONL (HuggingFace), OpenAI fine-tuning, Alpaca, ShareGPT, BERT code, LangChain RAG, push to HF Hub

TRANSLATION:
50+ languages, free, no API key, uses MyMemory API

CONNECT TAB (all modalities):
- HuggingFace (100k+ datasets, no key needed)
- Any public URL (CSV/JSON)
- GitHub files (auto-converts to raw)
- Paste CSV directly
- Sample datasets

ACCOUNT/AUTH:
- All features work WITHOUT an account
- Sign in to unlock: session history, dashboard, redo sessions
- Sign out: red button top-right navbar
- Dashboard shows all sessions: tabular imports, pipeline runs, image datasets, text datasets

ADMIN:
- /admin only for admin email
- Shows ALL sessions including user-deleted ones (soft delete)
- Deleted sessions show 🗑 DELETED badge

SHARE RESULTS:
- Only on Export tab
- Twitter/X: pre-filled post
- WhatsApp: pre-filled message
- LinkedIn: copies text + opens LinkedIn (paste manually)
- Instagram: copies text + opens Instagram (paste manually)

COMMON ISSUES:
- Sign out not working: click red "Sign Out" button in navbar
- Face detection shows 0: correct if dataset has no human faces
- t-SNE 404: uses browser PCA fallback automatically
- ICC 404: reads JPEG headers directly in browser
- Segmentation fails: add VITE_HF_TOKEN to .env file (get at huggingface.co/settings/tokens)
- Chatbot not working locally: needs Vercel deployment with ANTHROPIC_API_KEY env var

Answer helpfully, concisely, and accurately. If unsure, say so clearly."""

class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        api_key = os.environ.get('ANTHROPIC_API_KEY', '')
        if not api_key:
            self._respond(500, {'error': 'ANTHROPIC_API_KEY not configured. Add it to Vercel environment variables.'})
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            body   = json.loads(self.rfile.read(length))
            messages = body.get('messages', [])
            if not messages:
                self._respond(400, {'error': 'No messages provided'})
                return

            payload = json.dumps({
                'model':      'claude-haiku-4-5-20251001',
                'max_tokens': 500,
                'system':     SYSTEM,
                'messages':   messages,
            }).encode()

            req = urllib.request.Request(
                'https://api.anthropic.com/v1/messages',
                data=payload,
                headers={
                    'Content-Type':      'application/json',
                    'x-api-key':         api_key,
                    'anthropic-version': '2023-06-01',
                },
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=25) as res:
                data = json.loads(res.read())
                reply = data['content'][0]['text'] if data.get('content') else 'Sorry, no response.'
                self._respond(200, {'reply': reply})

        except urllib.error.HTTPError as e:
            err = e.read().decode()
            self._respond(e.code, {'error': f'Anthropic API error: {err}'})
        except Exception as e:
            self._respond(500, {'error': str(e)})

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _respond(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type',   'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args): pass