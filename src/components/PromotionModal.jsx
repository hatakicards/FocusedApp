import { motion, AnimatePresence } from 'framer-motion';
import { Image } from '@/components/ui/image';
import { useT } from '@/lib/i18n';

export default function PromotionModal({ promotion, onDismiss }) {
  const t = useT();
  return (
    <AnimatePresence>
      {promotion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md cursor-pointer px-6"
        >
          <motion.div
            initial={{ scale: 0, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.1 }}
            className="w-48 h-48 sm:w-56 sm:h-56 mb-10"
          >
            <Image
              src={promotion.rank.image}
              alt={promotion.rank.name}
              fittingType="fit"
              className="w-full h-full object-contain"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="text-sm font-medium text-muted-foreground mb-1"
          >
            {promotion.categoryName}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5, type: 'spring', stiffness: 200 }}
            className="text-4xl sm:text-5xl font-black tracking-tight text-center"
          >
            {t('pm_promozione')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.4 }}
            className="text-xl font-bold mt-3"
          >
            {t('pm_rank')} {t('rank_' + promotion.rank.id)}
          </motion.p>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.3 }}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="mt-10 rounded-xl bg-foreground px-8 py-3 text-sm font-semibold text-background"
          >
            {t('continua')}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}