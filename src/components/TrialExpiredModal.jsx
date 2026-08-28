import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function TrialExpiredModal({ open, onClose }) {
  const t = useT();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (window.self !== window.top) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('create-trial-discount-checkout', {
        origin: window.location.origin,
        user_id: user?.id,
      });
      const checkoutUrl = res?.data?.url || res?.url;
      if (checkoutUrl) window.location.href = checkoutUrl;
    } catch (e) {
      console.error('trial discount checkout error', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[105] bg-background/90 backdrop-blur-sm flex items-center justify-center px-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-amber-400/15 flex items-center justify-center mx-auto mb-4">
              <Crown size={28} className="text-amber-400" />
            </div>
            <h2 className="text-lg font-bold mb-2">{t('trial_expired_title')}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t('trial_expired_desc')}</p>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background mb-2 disabled:opacity-50"
            >
              {loading ? '...' : t('trial_expired_cta')}
            </button>
            <button onClick={onClose} className="text-xs text-muted-foreground font-medium">
              {t('trial_expired_later')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
