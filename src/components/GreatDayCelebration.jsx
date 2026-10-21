import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Star } from 'lucide-react';
import { useT } from '@/lib/i18n';

const COLORS = ['#FFD700', '#F5E6A8', '#FB923C', '#FFFFFF', '#D4AF37'];

// Voto 4 o 5 alla giornata: schermo intero, "OTTIMA GIORNATA" e coriandoli.
export default function GreatDayCelebration({ rating, onClose }) {
  const t = useT();
  const open = rating >= 4;

  useEffect(() => {
    if (!open) return undefined;
    const burst = (x, angle) => confetti({ particleCount: 90, angle, spread: 70, startVelocity: 55, origin: { x, y: 0.75 }, colors: COLORS });
    const timers = [
      setTimeout(() => { burst(0.05, 60); burst(0.95, 120); }, 350),
      setTimeout(() => confetti({ particleCount: 140, spread: 120, startVelocity: 40, origin: { y: 0.4 }, colors: COLORS }), 800),
      setTimeout(() => { burst(0.2, 70); burst(0.8, 110); }, 1400),
      setTimeout(onClose, 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [open, onClose]);

  const Icon = rating === 5 ? Trophy : Star;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="great-day"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden bg-black/95 px-6 text-center"
        >
          <motion.div
            aria-hidden
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.8, 1.4], opacity: [0, 0.55, 0.3] }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="absolute h-96 w-96 rounded-full bg-[#FFD700]/40 blur-3xl"
          />
          <motion.div
            initial={{ scale: 0, rotate: -120 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 13 }}
            className="relative flex h-36 w-36 items-center justify-center rounded-full border-2 border-[#FFD700]/70 bg-[#FFD700]/10"
          >
            <Icon size={72} strokeWidth={1.8} className="text-[#FFD700]" />
          </motion.div>
          <motion.h1
            initial={{ scale: 3, opacity: 0, y: -12 }}
            animate={{ scale: 1, opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 15, x: { delay: 0.5, duration: 0.35 } }}
            className="relative mt-10 text-5xl font-black leading-[1.05] tracking-tight text-[#FFD700]"
          >
            {t('great_day')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 1 }}
            className="relative mt-4 text-sm text-white"
          >
            {t('great_day_sub')}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
