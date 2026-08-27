import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useT } from '@/lib/i18n';
import MilestoneIcon from '@/components/MilestoneIcon';

export default function MilestoneUnlockAnimation({ milestone, onClose }) {
  const t = useT();

  useEffect(() => {
    if (!milestone) return;
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#D4AF37', '#FFD700', '#B8860B', '#CD853F'],
    });
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [milestone, onClose]);

  return (
    <AnimatePresence>
      {milestone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center px-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-32 h-32 rounded-xl overflow-hidden mb-6 flex items-center justify-center"
          >
            <MilestoneIcon icon={milestone.icon} unlocked={true} size={128} />
          </motion.div>
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-center"
          >
            {t('ms_unlocked')}
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-lg font-semibold text-center mt-2"
          >
            {t(milestone.titleKey)}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}