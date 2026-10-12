import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Check, Star, Trophy, Flame } from 'lucide-react';
import { useT } from '@/lib/i18n';

const GOLD = ['#D4AF37', '#FFD700', '#F5E6A8', '#B8860B'];

// Animazione a schermo intero quando completi un'attivita': icona, "BAM" e sotto
// la streak. Con voto 4 o 5 diventa dorata, con stella/coppa e coriandoli.
export default function CompletionCelebration({ data, onClose }) {
  const t = useT();
  const rating = data?.rating || 0;
  const great = rating >= 4;

  useEffect(() => {
    if (!data) return undefined;
    if (great) {
      const fire = (x, angle) => confetti({ particleCount: 70, angle, spread: 65, origin: { x, y: 0.7 }, colors: GOLD });
      const a = setTimeout(() => { fire(0.1, 60); fire(0.9, 120); }, 450);
      const b = setTimeout(() => confetti({ particleCount: 90, spread: 100, origin: { y: 0.45 }, colors: GOLD }), 800);
      const close = setTimeout(onClose, 3600);
      return () => { clearTimeout(a); clearTimeout(b); clearTimeout(close); };
    }
    const close = setTimeout(onClose, 2800);
    return () => clearTimeout(close);
  }, [data, great, onClose]);

  const Icon = rating === 5 ? Trophy : rating === 4 ? Star : Check;
  const accent = great ? 'text-[#FFD700]' : 'text-white';
  const ring = great ? 'border-[#FFD700]/70' : 'border-white/50';
  const streak = data?.streak || 0;

  return createPortal(
    <AnimatePresence>
      {data && (
        <motion.div
          key="celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden bg-black/95 px-6"
        >
          <motion.div
            aria-hidden
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.6, 1.3], opacity: [0, 0.5, 0.25] }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className={`absolute h-80 w-80 rounded-full blur-3xl ${great ? 'bg-[#FFD700]/40' : 'bg-white/20'}`}
          />

          <div className="relative flex h-40 w-40 items-center justify-center">
            {[0, 1].map((i) => (
              <motion.span
                key={i}
                aria-hidden
                initial={{ scale: 0.6, opacity: 0.9 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 1.3, delay: 0.25 + i * 0.35, ease: 'easeOut' }}
                className={`absolute inset-0 rounded-full border-2 ${ring}`}
              />
            ))}
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              className={`flex h-32 w-32 items-center justify-center rounded-full border-2 ${ring} ${great ? 'bg-[#FFD700]/10' : 'bg-white/5'}`}
            >
              <Icon size={64} strokeWidth={2} className={accent} />
            </motion.div>
          </div>

          <motion.h1
            initial={{ scale: 3.2, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 320, damping: 16, x: { delay: 0.55, duration: 0.35 } }}
            className={`mt-8 text-7xl font-black tracking-tight ${accent}`}
          >
            {t('cel_bam')}
          </motion.h1>

          {data?.title && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.7 }}
              className="mt-2 max-w-xs truncate text-sm text-white"
            >
              {data.title}
            </motion.p>
          )}

          {streak > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.95, type: 'spring', stiffness: 220, damping: 18 }}
              className="mt-8 flex flex-col items-center"
            >
              <div className="flex items-center gap-2">
                <Flame size={30} strokeWidth={2.5} className="fill-white/10 text-white" />
                <motion.span
                  initial={{ scale: 1.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.15, type: 'spring', stiffness: 300, damping: 12 }}
                  className="text-5xl font-bold tabular-nums text-white"
                >
                  {streak}
                </motion.span>
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/60">
                {streak === 1 ? t('cel_giorno') : t('cel_giorni')}
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function useTaskCelebration() {
  const [data, setData] = useState(null);
  const celebrate = useCallback((d) => setData(d), []);
  const close = useCallback(() => setData(null), []);
  const celebrationElement = <CompletionCelebration data={data} onClose={close} />;
  return { celebrate, celebrationElement };
}
