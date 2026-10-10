# api/icc.py
# Vercel Python Serverless Function — ICC color profile reader
# Reads ICC profile data from JPEG image bytes (pure Python, no Pillow needed)

from http.server import BaseHTTPRequestHandler
import json, base64, struct

def read_icc_from_jpeg_bytes(data: bytes) -> str | None:
    """
    Parse ICC color profile name from raw JPEG bytes.
    ICC profiles are stored in APP2 markers (0xFFE2) in JPEGs.
    Returns profile name string or None.
    """
    if len(data) < 4 or data[0] != 0xFF or data[1] != 0xD8:
        return None  # not a JPEG

    i = 2
    while i < len(data) - 4:
        marker = (data[i] << 8) | data[i+1]
        if marker == 0xFFD9:  # EOI
            break

        # Get segment length (includes the 2 length bytes but not the 2 marker bytes)
        seg_len = (data[i+2] << 8) | data[i+3]
        seg_end = i + 2 + seg_len

        if marker == 0xFFE2:  # APP2 — may contain ICC
            # ICC_PROFILE\x00 identifier
            sig = data[i+4:i+16]
            if sig == b'ICC_PROFILE\x00':
                # chunk_seq = data[i+16]  # chunk number (1-based)
                # chunk_cnt = data[i+17]  # total chunks
                icc_data = data[i+18:seg_end]
                return parse_icc_profile_name(icc_data)

        if seg_len < 2:
            break
        i = seg_end

    return None

def parse_icc_profile_name(icc: bytes) -> str:
    """
    Extract profile description from ICC profile data.
    ICC spec: 4-byte tag signature 'desc' at various offsets.
    """
    if len(icc) < 132:
        return 'Unknown ICC Profile'

    try:
        # Read tag count from ICC header
        tag_count = struct.unpack('>I', icc[128:132])[0]
        tag_count = min(tag_count, 100)  # sanity cap

        for t in range(tag_count):
            offset = 132 + t * 12
            if offset + 12 > len(icc):
                break
            tag_sig  = icc[offset:offset+4]
            tag_off  = struct.unpack('>I', icc[offset+4:offset+8])[0]
            tag_size = struct.unpack('>I', icc[offset+8:offset+12])[0]

            if tag_sig == b'desc' and tag_off + tag_size <= len(icc):
                tag_data = icc[tag_off:tag_off+tag_size]

                # 'desc' type (ICC v2): mluc = ICC v4
                if tag_data[:4] == b'desc' and len(tag_data) > 12:
                    str_len = struct.unpack('>I', tag_data[8:12])[0]
                    name    = tag_data[12:12+str_len].decode('latin-1', errors='replace').rstrip('\x00')
                    return name.strip() or 'Unnamed Profile'

                elif tag_data[:4] == b'mluc' and len(tag_data) > 28:
                    # ICC v4 multi-localised unicode
                    rec_count  = struct.unpack('>I', tag_data[8:12])[0]
                    for r in range(min(rec_count, 5)):
                        rec = tag_data[16 + r*12: 28 + r*12]
                        if len(rec) < 12: break
                        lang    = rec[0:2].decode('latin-1')
                        country = rec[2:4].decode('latin-1')
                        length  = struct.unpack('>I', rec[4:8])[0]
                        offset2 = struct.unpack('>I', rec[8:12])[0]
                        if lang == 'en':
                            raw  = tag_data[offset2:offset2+length]
                            name = raw.decode('utf-16-be', errors='replace').rstrip('\x00')
                            return name.strip() or 'Unnamed Profile'

    except Exception:
        pass

    return 'Unknown ICC Profile'

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body   = json.loads(self.rfile.read(length))
            images = body.get('images', [])  # [{name, data (base64 first 64KB)}]

            results   = []
            profiles  = {}
            with_icc  = 0
            without_icc = 0

            for img in images:
                try:
                    raw  = base64.b64decode(img['data'])
                    name = parse_icc_profile_name_from_jpeg(raw) if False else read_icc_from_jpeg_bytes(raw)
                    if name:
                        results.append({'name': img['name'], 'profile': name})
                        profiles[name] = profiles.get(name, 0) + 1
                        with_icc += 1
                    else:
                        results.append({'name': img['name'], 'profile': None})
                        without_icc += 1
                except Exception:
                    results.append({'name': img.get('name','?'), 'profile': None})
                    without_icc += 1

            # Build warning
            warning = None
            profile_names = list(profiles.keys())
            has_srgb    = any('sRGB' in p or 'srgb' in p.lower() for p in profile_names)
            has_adobeRGB = any('Adobe' in p or 'adobe' in p.lower() for p in profile_names)
            has_prophoto = any('ProPhoto' in p or 'prophoto' in p.lower() for p in profile_names)

            if has_adobeRGB and has_srgb:
                warning = 'Mixed color spaces detected (sRGB + Adobe RGB). Convert all images to sRGB before training — inconsistent color spaces degrade model accuracy.'
            elif has_prophoto:
                warning = 'ProPhoto RGB detected. This wide-gamut profile should be converted to sRGB for standard ML pipelines. Use: convert -colorspace sRGB input.jpg output.jpg'
            elif has_adobeRGB and not has_srgb:
                warning = 'Adobe RGB detected. Most neural networks assume sRGB input. Convert with: python -c "from PIL import Image, ImageCms; ..."'
            elif without_icc > with_icc:
                warning = 'Most images lack ICC profiles (common for web-sourced images). They are assumed to be sRGB — this is usually fine for ML.'

            self.send_response(200)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'total':      len(results),
                'withICC':    with_icc,
                'withoutICC': without_icc,
                'profiles':   profiles,
                'results':    results,
                'warning':    warning,
            }).encode())

        except Exception as e:
            self._error(500, str(e))

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _error(self, code, msg):
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': msg}).encode())

    def log_message(self, *args): pass