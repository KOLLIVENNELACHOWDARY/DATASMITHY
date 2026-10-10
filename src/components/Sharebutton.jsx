// src/components/ShareButton.jsx
// Proper centered modal share sheet — all platforms work
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

/* ── Post content generator ──────────────────────────────────────────────── */
function makePost({ modality, fileName, rows, cols, health, extra }) {
  const url = 'https://datasmithy.vercel.app';
  const tags = '#DataSmithy #MachineLearning #AI #MLOps';

  if (modality === 'images') return {
    title: `Image Dataset — ${rows} images, ${cols} classes | DataSmithy`,
    short: `🖼 Just prepped my image dataset with DataSmithy!\n📊 ${rows} images · ${cols} classes · Health ${health}/100${extra ? `\n📌 ${extra}` : ''}\n\n${tags}\n🔗 ${url}`,
    email: `I just prepped an image dataset with DataSmithy (${url}).\n\nStats:\n• ${rows} images\n• ${cols} classes\n• Health score: ${health}/100${extra ? `\n• ${extra}` : ''}\n\nCheck it out!`,
    url,
  };
  if (modality === 'text') return {
    title: `NLP Dataset — ${rows} docs, ${cols} classes | DataSmithy`,
    short: `📝 Just cleaned my NLP dataset with DataSmithy!\n📊 ${rows} docs · ${cols} classes · Health ${health}/100${extra ? `\n📌 ${extra}` : ''}\n\nSentiment, NER, BERT code — all in the browser.\n${tags}\n🔗 ${url}`,
    email: `I just cleaned an NLP dataset with DataSmithy (${url}).\n\nStats:\n• ${rows} documents\n• ${cols} classes\n• Health score: ${health}/100${extra ? `\n• ${extra}` : ''}\n\nCheck it out!`,
    url,
  };
  return {
    title: `Dataset Ready — ${rows} rows, ${cols} cols | DataSmithy`,
    short: `📊 Just processed a dataset with DataSmithy!\n✅ ${rows} rows · ${cols} columns · Health ${health}/100${extra ? `\n📌 ${extra}` : ''}\n\nFree no-code EDA, cleaning & ML prep.\n${tags}\n🔗 ${url}`,
    email: `I just processed a dataset with DataSmithy (${url}).\n\nStats:\n• ${rows} rows\n• ${cols} columns\n• Health score: ${health}/100${extra ? `\n• ${extra}` : ''}\n\nCheck it out!`,
    url,
  };
}

/* ── Copy to clipboard (works on all browsers) ───────────────────────────── */
function copyText(text, onDone) {
  // Method 1: modern Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(onDone)
      .catch(() => copyFallback(text, onDone));
    return;
  }
  copyFallback(text, onDone);
}

function copyFallback(text, onDone) {
  // Method 2: textarea + execCommand (works on HTTP and older browsers)
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    onDone();
  } catch {
    // Method 3: prompt the user
    window.prompt('Copy this text:', text);
  }
}

/* ── Open URL (never blocked because it's in a direct click handler) ─────── */
function openURL(url) {
  // Create and click a real <a> tag — browsers never block this
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ── Platform definitions ────────────────────────────────────────────────── */
const PLATFORMS = [
  {
    id: 'linkedin', label: 'LinkedIn', bg: '#0A66C2',
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    getUrl: (p) => `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(p.url)}&title=${encodeURIComponent(p.title)}&summary=${encodeURIComponent(p.short)}&source=DataSmithy`,
  },
  {
    id: 'twitter', label: 'X / Twitter', bg: '#000',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    getUrl: (p) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(p.short.slice(0, 260))}&url=${encodeURIComponent(p.url)}`,
  },
  {
    id: 'whatsapp', label: 'WhatsApp', bg: '#25D366',
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
      </svg>
    ),
    getUrl: (p) => `https://wa.me/?text=${encodeURIComponent(p.short)}`,
  },
  {
    id: 'email', label: 'Email', bg: '#EA4335',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
      </svg>
    ),
    getUrl: (p) => `mailto:?subject=${encodeURIComponent(p.title)}&body=${encodeURIComponent(p.email + '\n\n' + p.url)}`,
  },
  {
    id: 'copy', label: 'Copy Text', bg: '#6366F1',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
      </svg>
    ),
    action: 'copy',
  },
  {
    id: 'more', label: 'More', bg: '#64748B',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
      </svg>
    ),
    action: 'native',
  },
];

/* ── Modal rendered via portal into document.body ────────────────────────── */
function ShareModal({ post, onClose }) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('');

  // Close on Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleClick = (p) => {
    if (p.action === 'copy') {
      copyText(post.short + '\n\n' + post.url, () => {
        setCopied(true);
        setStatus('✅ Copied to clipboard!');
        setTimeout(() => { setCopied(false); setStatus(''); }, 2500);
      });
      return;
    }
    if (p.action === 'native') {
      if (navigator.share) {
        navigator.share({ title: post.title, text: post.short, url: post.url }).catch(() => {});
      } else {
        copyText(post.url, () => setStatus('Link copied — paste anywhere!'));
        setTimeout(() => setStatus(''), 2500);
      }
      return;
    }
    openURL(p.getUrl(post));
    setStatus(`Opening ${p.label}…`);
    setTimeout(() => setStatus(''), 2500);
  };

  const modal = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,.55)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: '#fff',
          borderRadius: '20px',
          padding: '24px',
          width: '360px',
          maxWidth: '92vw',
          boxShadow: '0 24px 60px rgba(0,0,0,.25)',
          animation: 'shareIn .22s cubic-bezier(.34,1.56,.64,1)',
          zIndex: 1,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '14px', right: '14px',
            background: '#F1F5F9', border: 'none', borderRadius: '50%',
            width: '28px', height: '28px', fontSize: '16px',
            cursor: 'pointer', color: '#64748B', lineHeight: '28px',
          }}
        >×</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '28px', marginBottom: '4px' }}>📤</div>
          <div style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>Share Your Results</div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            Tap a platform — content is pre-filled
          </div>
        </div>

        {/* Post preview */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '10px 12px',
            fontSize: '10.5px',
            color: '#475569',
            lineHeight: 1.7,
            marginBottom: '18px',
            whiteSpace: 'pre-line',
            maxHeight: '90px',
            overflowY: 'auto',
          }}
        >
          {post.short}
        </div>

        {/* Platform grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '14px',
          }}
        >
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => handleClick(p)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 0',
              }}
            >
              <div
                style={{
                  width: '54px', height: '54px',
                  borderRadius: '16px',
                  background: p.id === 'copy' && copied ? '#00CBA8' : p.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 12px ${p.bg}44`,
                  transition: 'transform .15s, box-shadow .15s',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = `0 8px 20px ${p.bg}66`;
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${p.bg}44`;
                }}
              >
                {p.id === 'copy' && copied
                  ? <svg viewBox="0 0 24 24" width="26" height="26" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  : p.icon}
              </div>
              <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textAlign: 'center' }}>
                {p.id === 'copy' && copied ? 'Copied!' : p.label}
              </span>
            </button>
          ))}
        </div>

        {/* Status message */}
        {status && (
          <div style={{
            background: 'rgba(0,203,168,.08)',
            border: '1px solid rgba(0,203,168,.25)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            color: '#00956B',
            textAlign: 'center',
            fontWeight: 600,
          }}>
            {status}
          </div>
        )}

        {/* Note about LinkedIn preview */}
        <div style={{ fontSize: '9px', color: '#CBD5E1', textAlign: 'center', marginTop: '10px' }}>
          LinkedIn preview image requires OG meta tags on the destination page
        </div>
      </div>

      <style>{`
        @keyframes shareIn {
          from { opacity:0; transform:scale(.92) translateY(12px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );

  // Render into document.body so z-index always wins
  return ReactDOM.createPortal(modal, document.body);
}

/* ── Public component ────────────────────────────────────────────────────── */
export default function ShareButton({ modality, fileName, rows, cols, health, extra }) {
  const [open, setOpen] = useState(false);
  const post = makePost({ modality, fileName, rows, cols, health, extra });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          borderRadius: '9px',
          border: 'none',
          background: 'linear-gradient(135deg,#00CBA8,#0EA5E9)',
          color: '#fff',
          fontWeight: 700,
          fontSize: '13px',
          cursor: 'pointer',
          boxShadow: '0 3px 12px rgba(0,203,168,.35)',
          transition: 'transform .15s',
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.04)'}
        onMouseOut={e  => e.currentTarget.style.transform = 'scale(1)'}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="white">
          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
        </svg>
        Share Results
      </button>

      {open && <ShareModal post={post} onClose={() => setOpen(false)} />}
    </>
  );
}