import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Heart, MessageSquareText } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';
import { isReviewAvailable, requestReview } from '@/lib/review';

const STATE_KEY = 'rate_prompt_state';
const FIRST_SEEN_KEY = 'rate_first_seen';
const FIRST_ASK_AFTER_DAYS = 3;
const SHOW_DELAY_MS = 20000;
// Dopo "Non ora" si richiede presto, dopo "Non proprio" molto piu' tardi, dopo il voto mai piu'.
const RETRY_DAYS = { later: 7, no: 60 };

const SUPPORT_EMAIL = 'focusedappp@gmail.com';
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
  const state = read(STATE_KEY);
  if (!state) return true;
  const wait = RETRY_DAYS[state.answer];
  return !!wait && now - state.at >= wait * DAY_MS;
}

// "Ti sta piacendo Focused?": chi risponde di si' vede la finestra di valutazione di sistema (App Store /
// Google Play, plugin nativo FocusedReview), chi risponde "non proprio" ci scrive una mail con cosa non va.
// Compare solo se la build ha il plugin nativo: Apple vuole la finestra di sistema, non una nostra.
export default function RatePrompt({ enabled, onOpenChange }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('ask');
  const native = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!enabled || !native || !isDue()) return;
    let timer;
    let cancelled = false;
    isReviewAvailable().then((ok) => {
      if (ok && !cancelled) timer = setTimeout(() => { setStep('ask'); setOpen(true); }, SHOW_DELAY_MS);
    });
    return () => { cancelled = true; clearTimeout(timer); };
  }, [enabled, native]);

  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);

  const answer = (value) => {
    write(STATE_KEY, { answer: value, at: Date.now() });
    setOpen(false);
  };

  const rate = () => {
    answer('yes');
    requestReview();
  };

  const mail = () => {
    answer('no');
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('rate_mail_subject'))}`;
  };

  const primary = 'w-full rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground active:scale-[0.98]';
  const secondary = 'w-full rounded-full border border-border px-6 py-2.5 text-sm font-medium active:scale-[0.98]';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) answer('later'); }}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="sr-only">{t('rate_title')}</DialogTitle>
        <div className="py-2 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border">
            {step === 'no' ? <MessageSquareText size={22} /> : <Heart size={22} />}
          </div>

          {step === 'ask' && (
            <>
              <h2 className="mb-5 text-xl font-bold">{t('rate_title')}</h2>
              <div className="flex flex-col gap-2">
                <button onClick={rate} className={primary}>{t('rate_yes')}</button>
                <button onClick={() => setStep('no')} className={secondary}>{t('rate_no')}</button>
              </div>
              <button onClick={() => answer('later')} className="mt-3 text-xs text-muted-foreground">{t('rate_later')}</button>
            </>
          )}

          {step === 'no' && (
            <>
              <h2 className="mb-2 text-xl font-bold">{t('rate_no_title')}</h2>
              <p className="mb-6 text-sm text-muted-foreground">{t('rate_no_sub')}</p>
              <button onClick={mail} className={primary}>{t('rate_no_cta')}</button>
              <button onClick={() => answer('no')} className="mt-3 text-xs text-muted-foreground">{t('rate_later')}</button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
