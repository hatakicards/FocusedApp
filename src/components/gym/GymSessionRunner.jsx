import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useQueryClient } from '@tanstack/react-query';
import { X, Flame } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { getDB } from '@/lib/guestDB';
import { todayISO } from '@/lib/productivity';
import { useActivities, useOptimisticRating } from '@/lib/useAppData';
import { buildSessionSteps, fmtClock } from '@/lib/gymSession';

const CONFETTI_COLORS = ['#ffffff', '#d4d4d8', '#a1a1aa', '#fafafa'];

// Secondi trascorsi dall'inizio del passo corrente: calcolati da un timestamp,
// cosi' restano esatti anche se l'app va in background.
function useElapsed(resetKey) {
  const [start, setStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const s = Date.now();
    setStart(s);
    setNow(s);
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [resetKey]);
  return Math.max(0, (now - start) / 1000);
}

function PrimaryButton({ onClick, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-white py-4 text-base font-semibold text-black active:scale-[0.98] transition-transform disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Pill({ children }) {
  return <span className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white/80">{children}</span>;
}

function Finished({ onDone }) {
  const t = useT();
  const [showRating, setShowRating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    const fire = () => confetti({ particleCount: 120, spread: 90, origin: { y: 0.55 }, colors: CONFETTI_COLORS });
    fire();
    const b2 = setTimeout(fire, 450);
    const reveal = setTimeout(() => setShowRating(true), 1800);
    return () => { clearTimeout(b2); clearTimeout(reveal); };
  }, []);

  const choose = async (rating) => {
    if (saving) return;
    setPicked(rating);
    setSaving(true);
    try { await onDone(rating); } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <motion.h1
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14 }}
        className="text-5xl font-extrabold tracking-tight"
      >
        {t('gsr_bravissimo')}
      </motion.h1>
      <motion.p
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-3 max-w-xs text-base text-white/70"
      >
        {t('gsr_bravissimo_sub')}
      </motion.p>

      <AnimatePresence>
        {showRating && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mt-12 w-full max-w-xs"
          >
            <p className="mb-4 text-sm text-white/60">{t('gsr_voto')}</p>
            <div className="flex justify-between">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => choose(n)}
                  disabled={saving}
                  className={`h-14 w-14 rounded-full border text-lg font-semibold transition-colors ${
                    picked === n ? 'border-white bg-white text-black' : 'border-white/25 text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button onClick={() => onDone(null)} className="mt-6 text-sm text-white/50">{t('gsr_salta')}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GymSessionRunner({ session, onClose }) {
  const t = useT();
  const qc = useQueryClient();
  const { data: activities } = useActivities();
  const optimisticRate = useOptimisticRating();
  const { exercises, steps } = useMemo(() => buildSessionSteps(session?.exercises), [session]);
  const [stepIdx, setStepIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const elapsed = useElapsed(stepIdx);

  useEffect(() => {
    let lock = null;
    const acquire = async () => {
      try { lock = await navigator.wakeLock?.request('screen'); } catch { /* non supportato */ }
    };
    acquire();
    return () => { lock?.release?.().catch(() => {}); };
  }, []);

  const step = steps[stepIdx];
  const advance = () => {
    if (stepIdx >= steps.length - 1) setFinished(true);
    else setStepIdx((i) => i + 1);
  };

  // Salva il voto sull'attivita' "gym": se l'utente non l'ha ancora aggiunta la crea.
  const saveRating = async (rating) => {
    if (rating) {
      let gym = (activities || []).find((a) => !a.archived && (a.preset_type === 'gym' || a.is_gym));
      if (!gym) {
        try {
          gym = await getDB().Activity.create({
            name: 'Gym', category: 'fitness', emoji: 'dumbbell', preset_type: 'gym', is_gym: true,
          });
          qc.invalidateQueries({ queryKey: ['activities'] });
        } catch (e) {
          console.error(e);
        }
      }
      if (gym) await optimisticRate(gym.id, todayISO(), rating);
    }
    onClose();
  };

  const ex = step && step.exIdx != null ? exercises[step.exIdx] : null;
  const progress = steps.length > 1 ? stepIdx / (steps.length - 1) : 0;
  const next = steps[stepIdx + 1];
  const nextEx = next && next.exIdx != null ? exercises[next.exIdx] : null;

  const body = (() => {
    if (!step) return null;

    if (step.type === 'warmup') {
      return (
        <>
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <Flame size={40} strokeWidth={1.5} className="mb-6 text-white/70" />
            <h1 className="text-5xl font-extrabold tracking-tight">{t('gsr_riscaldamento')}</h1>
            <p className="mt-4 max-w-xs text-base text-white/60">{t('gsr_riscaldamento_sub')}</p>
          </div>
          <div className="px-6 pb-8"><PrimaryButton onClick={advance}>{t('gsr_completato')}</PrimaryButton></div>
        </>
      );
    }

    if (step.type === 'work' && ex) {
      const remaining = ex.duration ? Math.max(0, ex.duration - elapsed) : 0;
      return (
        <>
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
              {t('gsr_serie')} {step.setNo} / {step.totalSets}
            </p>
            <h1 className="break-words text-4xl font-extrabold leading-tight tracking-tight">{ex.name}</h1>
            {ex.info && <p className="mt-4 max-w-sm whitespace-pre-wrap text-base text-white/60">{ex.info}</p>}

            <div className="mt-10 flex flex-col items-center gap-4">
              {ex.mode === 'time' ? (
                <>
                  <span className="text-7xl font-light tabular-nums">{fmtClock(Math.ceil(remaining))}</span>
                  {ex.duration && remaining <= 0 && (
                    <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-sm font-semibold uppercase tracking-widest">
                      {t('gsr_tempo_finito')}
                    </motion.span>
                  )}
                </>
              ) : (
                ex.reps && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-7xl font-light tabular-nums">{ex.reps}</span>
                    <span className="text-lg text-white/60">{t('gsr_reps')}</span>
                  </div>
                )
              )}
              {ex.weight && <Pill>{ex.weight} kg</Pill>}
            </div>
          </div>
          <div className="px-6 pb-8"><PrimaryButton onClick={advance}>{t('gsr_completato')}</PrimaryButton></div>
        </>
      );
    }

    if (step.type === 'rest') {
      return (
        <>
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.25em] text-white/50">{t('gsr_recupero')}</p>
            <span className="text-8xl font-light tabular-nums">{fmtClock(elapsed)}</span>
            {nextEx && next && (
              <p className="mt-10 text-sm text-white/50">
                {t('gsr_prossima')}: <span className="text-white/80">{nextEx.name}</span> · {t('gsr_serie')} {next.setNo}/{next.totalSets}
              </p>
            )}
          </div>
          <div className="px-6 pb-8"><PrimaryButton onClick={advance}>{t('gsr_riprendi')}</PrimaryButton></div>
        </>
      );
    }
    return null;
  })();

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white safe-top">
      {!finished && (
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              {ex ? `${t('gsr_esercizio')} ${step.exIdx + 1} / ${exercises.length}` : session?.title || ''}
            </span>
            <button onClick={() => setConfirmExit(true)} aria-label={t('gsr_interrompi')} className="rounded-full p-2 text-white/60">
              <X size={20} />
            </button>
          </div>
          <div className="mt-3 h-0.5 w-full bg-white/10">
            <div className="h-full bg-white transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}

      {finished ? <Finished onDone={saveRating} /> : body}

      {confirmExit && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 px-6">
          <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-zinc-950 p-6 text-center">
            <h3 className="text-lg font-semibold">{t('gsr_esci_titolo')}</h3>
            <p className="mt-2 text-sm text-white/60">{t('gsr_esci_sub')}</p>
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={() => setConfirmExit(false)}>{t('gsr_continua')}</PrimaryButton>
              <button onClick={onClose} className="w-full py-3 text-sm text-white/60">{t('gsr_interrompi')}</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
