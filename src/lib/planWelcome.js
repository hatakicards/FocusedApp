import { useEffect } from 'react';

// Benvenuto al piano Pro/Premium: parte subito dopo l'acquisto (o un codice) e, se l'app si chiude o
// cambia pagina a meta' (es. il ritorno da Stripe), riparte al prossimo avvio finche' non si finisce.
// Per provarlo: ?plan_welcome=pro oppure ?plan_welcome=premium.
export const PLAN_WELCOME_KEY = 'plan_welcome_pending';
const TIERS = ['pro', 'premium'];

export function startPlanWelcome(tier) {
  if (!TIERS.includes(tier)) return;
  try { localStorage.setItem(PLAN_WELCOME_KEY, tier); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('plan-welcome', { detail: tier }));
}

export function readPlanWelcome() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('plan_welcome');
    if (TIERS.includes(fromUrl)) return fromUrl;
    const saved = localStorage.getItem(PLAN_WELCOME_KEY);
    return TIERS.includes(saved) ? saved : null;
  } catch { return null; }
}

export function clearPlanWelcome() {
  try { localStorage.removeItem(PLAN_WELCOME_KEY); } catch { /* ignore */ }
}

// Le pagine con schede (LifeGame, Studente, Professionista) ascoltano questo evento per mostrare la
// scheda di cui il benvenuto sta parlando. Si ripete un paio di volte: la pagina puo' non essere
// ancora montata al primo invio.
export function showTourTab(page, tab) {
  [60, 400, 1000].forEach((ms) => setTimeout(() => window.dispatchEvent(new CustomEvent('tour-tab', { detail: { page, tab } })), ms));
}

export function useTourTab(page, setTab) {
  useEffect(() => {
    const on = (e) => { if (e.detail?.page === page) setTab(e.detail.tab); };
    window.addEventListener('tour-tab', on);
    return () => window.removeEventListener('tour-tab', on);
  }, [page, setTab]);
}
