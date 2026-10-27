import { Capacitor } from '@capacitor/core';

// Il link "Conferma email" apre il sito nel browser del telefono con i token dopo il "#".
// Se sei su un telefono, lo rimandiamo all'app (focusedapp://, registrato in Info.plist) e
// mostriamo un pulsante "Apri Focused" nel caso il sistema chieda conferma o l'apertura fallisca.
// Questo modulo va importato per primo in main.jsx: legge l'indirizzo prima che il client di
// autenticazione lo consumi.
const SCHEME = 'focusedapp://auth-callback';

function isConfirmLink(hash) {
  return /access_token=/.test(hash) && /refresh_token=/.test(hash) && /type=(signup|email_change|invite|magiclink)/.test(hash);
}

export function handleConfirmLinkInBrowser() {
  try {
    if (Capacitor.isNativePlatform()) return;
    if (!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) return;
    const hash = window.location.hash;
    if (!isConfirmLink(hash)) return;

    const it = /^it/i.test(navigator.language || '');
    const target = SCHEME + hash;

    const render = () => {
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:32px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif';
      box.innerHTML = `<div style="font-size:26px;font-weight:700">${it ? 'Email confermata' : 'Email confirmed'}</div>`
        + `<div style="font-size:15px;color:#a3a3a3">${it ? 'Torna su Focused per iniziare.' : 'Go back to Focused to get started.'}</div>`
        + `<a href="${target}" style="margin-top:12px;background:linear-gradient(135deg,#f2f3f4,#bcbfc3 40%,#80848a 65%,#d9dbdd);color:#0a0a0a;font-weight:700;font-size:16px;padding:16px 36px;border-radius:16px;text-decoration:none">${it ? 'Apri Focused' : 'Open Focused'}</a>`;
      document.body.appendChild(box);
    };
    if (document.body) render(); else window.addEventListener('DOMContentLoaded', render);
    window.location.href = target;
  } catch { /* ignore */ }
}

// Dentro l'app: legge i token dall'indirizzo ricevuto e apre la sessione.
export function parseConfirmUrl(url) {
  if (!url || !url.startsWith('focusedapp://')) return null;
  const raw = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] || '');
  const params = new URLSearchParams(raw);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  return access_token && refresh_token ? { access_token, refresh_token } : null;
}

handleConfirmLinkInBrowser();
