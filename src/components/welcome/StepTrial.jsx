import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, LayoutGrid, Sparkles, Ban, Loader2, Crown } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { APP_TRIAL_DAYS } from '@/lib/appTrial';

const titaniumBtn = 'titanium-bg flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold active:scale-[0.98] transition-transform disabled:opacity-40';

const FEATURES = [
  [Trophy, 'wtr_f1'],
  [LayoutGrid, 'wtr_f2'],
  [Sparkles, 'wtr_f3'],
  [Ban, 'wtr_f4'],
];

// Fine del benvenuto: prova Premium gratis per 3 giorni, senza carta e senza rinnovo automatico.
// Il pulsante avvia la prova e il tutorial delle funzioni Premium; "Magari dopo" chiede conferma.
// onTrial(): avvia la prova; onSkip(): continua col piano gratuito; onPlans(): mostra i piani a pagamento.
export default function StepTrial({ onTrial, onSkip, onPlans }) {
  const t = useT();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const days = String(APP_TRIAL_DAYS);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setConfirm(false);
    await onTrial();
  };

  const skip = async () => {
    if (busy) return;
    setBusy(true);
    setConfirm(false);
    await onSkip();
  };

  return (
    <div className="fixed inset-0 z-[95] flex flex-col overflow-y-auto bg-black text-white">
      <div className="titanium-glow pointer-events-none absolute inset-x-0 top-0 h-1/2" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-[calc(env(safe-area-inset-top)+2rem)]"
      >
        <div className="flex flex-1 flex-col justify-center">
          <span className="titanium-tile mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10">
            <Crown size={30} strokeWidth={1.6} />
          </span>
          <h1 className="text-3xl font-bold leading-tight tracking-tight">{t('wtr_t').replace('{n}', days)}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">{t('wtr_d')}</p>
          <div className="mt-7 space-y-3">
            {FEATURES.map(([Icon, key], i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10"><Icon size={17} strokeWidth={1.7} /></span>
                <span className="text-[15px] font-medium text-white/90">{t(key)}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <button onClick={start} disabled={busy} className={`${titaniumBtn} mt-8`}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : t('wtr_btn')}
        </button>
        <p className="mt-3 text-center text-xs leading-snug text-white/55">{t('wtr_note').replace('{n}', days)}</p>
        <button onClick={() => setConfirm(true)} disabled={busy} className="mt-4 py-2 text-sm font-medium text-white/50">
          {t('wtr_later')}
        </button>
        <button onClick={onPlans} disabled={busy} className="py-1 text-xs font-medium text-white/35 underline underline-offset-4">
          {t('wtr_plans')}
        </button>
      </motion.div>

      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
            onClick={() => setConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#111] p-6 text-center"
            >
              <h2 className="text-xl font-bold">{t('wtr_sure_t')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{t('wtr_sure_d')}</p>
              <button onClick={start} className={`${titaniumBtn} mt-6 py-3.5 text-sm`}>
                {t('wtr_sure_try').replace('{n}', days)}
              </button>
              <button onClick={skip} className="mt-3 w-full py-2 text-sm font-medium text-white/50">
                {t('wtr_sure_skip')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
