import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Crown } from 'lucide-react';
import { useT } from '@/lib/i18n';

const CONFETTI_COLORS = ['#D4AF37', '#FFD700', '#B8860B', '#CD853F'];

export default function WelcomeToProAnimation({ tier, onClose }) {
  const t = useT();

  useEffect(() => {
    if (!tier) return;
    const fire = () => confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors: CONFETTI_COLORS });
    fire();
    const burst2 = setTimeout(fire, 400);
    const timer = setTimeout(onClose, 4500);
    return () => {
      clearTimeout(burst2);
      clearTimeout(timer);
    };
  }, [tier, onClose]);

  return createPortal(
    <AnimatePresence>
      {tier && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/90 flex flex-col items-center justify-center px-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 mb-6 flex items-center justify-center"
          >
            <Crown size={64} className="text-amber-400" fill="currentColor" />
          </motion.div>
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-center"
          >
            {t(tier === 'premium' ? 'welcome_pro_title_premium' : 'welcome_pro_title_pro')}
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-muted-foreground text-center mt-2 max-w-xs"
          >
            {t('welcome_pro_sub')}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
