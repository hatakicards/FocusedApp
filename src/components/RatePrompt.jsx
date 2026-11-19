import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { isReviewAvailable, requestReview } from '@/lib/review';

const ASKED_KEY = 'rate_prompt_asked_at';
const FIRST_SEEN_KEY = 'rate_first_seen';
const FIRST_ASK_AFTER_DAYS = 3;
const RETRY_DAYS = 60;
// Un attimo dopo il voto, cosi' la finestra non copre il tocco appena fatto.
const SHOW_DELAY_MS = 1500;
const DAY_MS = 86400000;

const read = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
};

function isDue() {
  const now = Date.now();
  let first = read(FIRST_SEEN_KEY);
  if (!first) { first = now; write(FIRST_SEEN_KEY, first); }
  if (now - first < FIRST_ASK_AFTER_DAYS * DAY_MS) return false;
  const asked = read(ASKED_KEY);
  return !asked || now - asked >= RETRY_DAYS * DAY_MS;
}

// Valutazione dell'app: solo la finestra di sistema (App Store / Google Play, plugin nativo FocusedReview),
// senza nessuna domanda prima. Le regole di Google vietano di chiedere "Ti piace l'app?" e mandare a votare
// solo chi dice si'. Si apre in un momento positivo (un voto 4-5 a un'attivita'), dopo almeno 3 giorni
// d'uso e al massimo ogni 60 giorni; il sistema poi decide da solo se mostrarla davvero.
export default function RatePrompt({ enabled, onOpenChange }) {
  const native = Capacitor.isNativePlatform();
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!native) return undefined;
    let timer;
    const onPositive = () => {
      if (!enabledRef.current || !isDue()) return;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (!enabledRef.current || !(await isReviewAvailable())) return;
        write(ASKED_KEY, Date.now());
        onOpenChange?.(true);
        await requestReview();
        onOpenChange?.(false);
      }, SHOW_DELAY_MS);
    };
    window.addEventListener('focused-positive-moment', onPositive);
    return () => { window.removeEventListener('focused-positive-moment', onPositive); clearTimeout(timer); };
  }, [native, onOpenChange]);

  return null;
}
