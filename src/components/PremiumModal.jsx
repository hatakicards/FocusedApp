import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Star, Ban } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useUserSettings, useInvalidateAll, useSubscription } from '@/lib/useAppData';

const FEATURES = [
  { key: 'pm_no_ads', label: 'NO Ads', tier: 'pro' },
  { key: 'pm_gym_scheda', label: 'Gym Schedule', tier: 'pro' },
  { key: 'pm_athlete', label: 'Athlete Mode', tier: 'premium' },
  { key: 'pm_student', label: 'Student Mode', tier: 'premium' },
  { key: 'pm_professional', label: 'Professional Mode', tier: 'premium' },
  { key: 'pm_life_stats', label: 'Life Stats Page', tier: 'pro' },
  { key: 'pm_rankings', label: 'Real-time Rankings', tier: 'pro' },
];

const PERIODS = [
  { id: 'monthly', labelKey: 'pm_monthly' },
  { id: 'quarterly', labelKey: 'pm_quarterly' },
  { id: 'annual', labelKey: 'pm_annual' },
];

const PRICING = {
  premium: {
    monthly: { intro: '2,99', regular: '4,99' },
    quarterly: { intro: '8,99', regular: '12,99' },
    annual: { price: '44,99', monthlyEquiv: '3,75', save: '15' },
  },
  pro: {
    monthly: { intro: '1,99', regular: '3,49' },
    quarterly: { intro: '6,99', regular: '9,99' },
    annual: { price: '29,99', monthlyEquiv: '2,50', save: '12' },
  },
};

export default function PremiumModal({ open, onClose }) {
  const t = useT();
  const { user } = useAuth();
  const { data: settings } = useUserSettings();
  const invalidate = useInvalidateAll();
  const sub = useSubscription();
  const [buying, setBuying] = useState(null);
  const [period, setPeriod] = useState('monthly');
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState(null);

  const handleCancel = async () => {
    setCancelling(true);
    setCancelResult(null);
    try {
      const res = await base44.functions.invoke('cancel-subscription', {});
      setCancelResult({ success: true, cancel_at: res?.data?.cancel_at || res?.cancel_at });
      invalidate();
    } catch (e) {
      console.error('Cancel error', e);
      setCancelResult({ success: false, error: e.message || 'Error' });
    } finally {
      setCancelling(false);
    }
  };

  const handleCheckout = async (tier) => {
    if (window.self !== window.top) {
      alert(t('pm_iframe_error'));
      return;
    }
    setBuying(tier);
    try {
      const res = await base44.functions.invoke('create-remove-ads-checkout', {
        origin: window.location.origin,
        tier,
        period,
        user_id: user?.id,
      });
      const checkoutUrl = res?.data?.url || res?.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (e) {
      console.error('premium checkout error', e);
      alert(e.message || 'Errore durante il checkout');
    } finally {
      setBuying(null);
    }
  };

  const renderPrice = (tier) => {
    const p = PRICING[tier][period];
    if (period === 'annual') {
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black">{p.price}</span>
            <span className="text-sm text-muted-foreground">€/{t('pm_per_year')}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            ≈ {p.monthlyEquiv} €/{t('pm_month')}
          </div>
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[11px] font-bold tracking-wide">
            {t('pm_save')} {p.save} €
          </div>
        </div>
      );
    }
    const periodUnit = period === 'monthly' ? t('pm_month') : t('pm_per_quarter');
    const introLabel = period === 'monthly' ? t('pm_first_month') : t('pm_first_period');
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black">{p.intro}</span>
          <span className="text-sm text-muted-foreground">€/{periodUnit}</span>
        </div>
        <div className="text-xs text-muted-foreground text-center">
          {introLabel}, {t('pm_then')} {p.regular} €/{periodUnit}
        </div>
      </div>
    );
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/90 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-border bg-card max-h-[85vh] overflow-y-auto scrollbar-hide"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between mb-4 p-6 pb-3 bg-card border-b border-border">
              <div className="flex items-center gap-2">
                <Crown size={20} className="text-foreground" />
                <span className="text-sm font-bold tracking-wider">FOCUSED</span>
              </div>
              <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
                <X size={18} />
              </button>
            </div>

            <div className="text-center mb-4">
              <h2 className="text-2xl font-black tracking-tight mb-1">FOCUSED PRO</h2>
              <p className="text-sm text-muted-foreground">{t('pm_subtitle')}</p>
            </div>

            {user?.isGuest ? (
              <div className="text-center py-8">
                <Crown size={32} className="mx-auto mb-3 text-foreground" />
                <h3 className="text-lg font-bold mb-2">{t('guest_upgrade_title')}</h3>
                <p className="text-sm text-muted-foreground mb-4 px-4">{t('guest_upgrade_desc')}</p>
                <button
                  onClick={() => { onClose(); window.location.href = '/login'; }}
                  className="w-full rounded-xl bg-foreground py-3 text-sm font-bold text-background"
                >
                  {t('guest_upgrade_btn')}
                </button>
              </div>
            ) : (
              <>
            <div className="space-y-2.5 mb-4">
              {FEATURES.map((f) => {
                const Icon = f.tier === 'premium' ? Crown : Star;
                return (
                  <div key={f.key} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10">
                      <Icon size={12} className="text-foreground" />
                    </div>
                    <span className="text-sm font-medium">{f.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-1 p-1 rounded-xl bg-muted mb-4">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    period === p.id
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground'
                  }`}
                >
                  {t(p.labelKey)}
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-foreground text-background p-4 mb-3">
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <Crown size={16} />
                <span className="text-sm font-bold tracking-wide">PREMIUM · Full Access</span>
              </div>
              {renderPrice('premium')}
              <button
                onClick={() => handleCheckout('premium')}
                disabled={buying !== null}
                className="w-full mt-3 rounded-xl bg-background py-3 text-sm font-bold text-foreground disabled:opacity-50"
              >
                {buying === 'premium' ? t('pm_redirecting') : t('pm_premium_btn')}
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4 mb-3">
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <Star size={16} />
                <span className="text-sm font-bold tracking-wide">PRO · Base only</span>
              </div>
              {renderPrice('pro')}
              <button
                onClick={() => handleCheckout('pro')}
                disabled={buying !== null}
                className="w-full mt-3 rounded-xl border border-border bg-background py-3 text-sm font-bold text-foreground disabled:opacity-50"
              >
                {buying === 'pro' ? t('pm_redirecting') : t('pm_pro_btn')}
              </button>
            </div>

            <p className="text-center text-[11px] text-muted-foreground">{t('pm_trial')}</p>
            <p className="text-center text-[11px] text-muted-foreground mt-2">{t('pm_pro_note')}</p>

            {sub.isPro && settings?.stripe_subscription_id && !cancelResult?.success && (
              <div className="mt-4 border-t border-border pt-4">
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <Ban size={16} /> {cancelling ? '...' : t('pm_cancel_btn')}
                </button>
                <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                  {t('pm_cancel_note')}
                </p>
              </div>
            )}
            {cancelResult?.success && (
              <div className="mt-4 rounded-xl border border-foreground/30 bg-foreground/5 p-3 text-center text-sm">
                <p className="font-medium text-foreground">{t('pm_cancel_done')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('pm_cancel_until')} {new Date(cancelResult.cancel_at).toLocaleDateString('it-IT')}
                </p>
              </div>
            )}
            {cancelResult && !cancelResult.success && (
              <p className="mt-4 text-center text-xs text-destructive">{cancelResult.error}</p>
            )}
            </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}