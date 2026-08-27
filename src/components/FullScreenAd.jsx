import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';
import { useUserSettings, useSubscription, useInvalidateAll } from '@/lib/useAppData';
import { useAuth } from '@/lib/AuthContext';
import { redeemFreeCode } from '@/lib/promoCodes';
import WelcomeToProAnimation from '@/components/WelcomeToProAnimation';

const AD_INTERVAL = 120000;
const PROMO_CODE = 'NEWICEPROMO!';

const ADS = [
  { titleKey: 'wwu_ads_title', subKey: 'wwu_ads_sub', ctaKey: 'wwu_btn', action: 'work_with_us' },
  { titleKey: 'ad2_title', subKey: 'ad2_sub', ctaKey: 'ad2_cta', action: 'work_with_us' },
  { titleKey: 'i5_title', subKey: 'i5_sub', ctaKey: 'i5_cta', action: 'work_with_us' },
  { titleKey: 'ad_unlock_title', subKey: 'ad_unlock_sub', ctaKey: 'ad_unlock_cta', action: 'profilo' },
  { titleKey: 'ad_bestself_title', subKey: 'ad_bestself_sub', ctaKey: 'ad_bestself_cta', action: 'profilo' },
  { titleKey: 'ad_promo_title', subKey: 'ad_promo_sub', ctaKey: 'ad_promo_cta', action: 'redeem_promo' },
];

export default function FullScreenAd({ enabled, onCTA }) {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: settings } = useUserSettings();
  const sub = useSubscription();
  const invalidate = useInvalidateAll();
  const [show, setShow] = useState(false);
  const [adIndex, setAdIndex] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [promoStatus, setPromoStatus] = useState(null);
  const [celebrateTier, setCelebrateTier] = useState(null);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      setShow(true);
      setCanSkip(false);
      setPromoStatus(null);
      setAdIndex((i) => (i + 1) % ADS.length);
    }, AD_INTERVAL);
    return () => clearInterval(timer);
  }, [enabled]);

  useEffect(() => {
    if (!show) return;
    const skipTimer = setTimeout(() => setCanSkip(true), 3000);
    return () => clearTimeout(skipTimer);
  }, [show]);

  const close = useCallback(() => setShow(false), []);

  const handleActivatePromo = async () => {
    setPromoStatus('checking');
    const result = await redeemFreeCode(PROMO_CODE, { settings, user, invalidate });
    setPromoStatus(result);
    if (result === 'success') {
      setCelebrateTier('premium');
    }
  };

  // Non uscire con `return null` sull'intero componente quando `enabled` diventa
  // false: attivare NEWICEPROMO! rimuove gli annunci nello stesso istante
  // (sub.adsRemoved passa a true), e smonterebbe anche l'animazione di
  // benvenuto che deve ancora comparire. Solo il Dialog dell'annuncio va
  // gated su `enabled`, l'animazione resta sempre montata.
  const ad = ADS[adIndex];

  const handleCTA = () => {
    if (ad.action === 'profilo') {
      close();
      navigate('/profilo');
    } else {
      close();
      onCTA?.();
    }
  };

  return (
    <>
      <Dialog open={enabled && show} onOpenChange={(v) => !v && canSkip && close()}>
        <DialogContent className="max-w-sm [&>button]:hidden">
          <DialogTitle className="sr-only">{t(ad.titleKey)}</DialogTitle>
          {canSkip && (
            <button
              onClick={close}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <span className="text-xs">{t('ad_salta')}</span>
            </button>
          )}
          <div className="text-center py-2">
            {ad.action === 'redeem_promo' && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">{t('ad_promo_badge')}</span>
              </div>
            )}
            <h2 className="text-xl font-bold mb-2">{t(ad.titleKey)}</h2>
            <p className="text-sm text-muted-foreground mb-6 whitespace-pre-line">{t(ad.subKey)}</p>

            {ad.action === 'redeem_promo' ? (
              <>
                {sub.promoActive || promoStatus === 'success' ? (
                  <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-500">
                    <Sparkles size={14} /> {t('ad_promo_active_now')}
                  </p>
                ) : promoStatus === 'already_used' ? (
                  <p className="text-sm text-destructive">{t('ad_promo_already_used')}</p>
                ) : promoStatus === 'error' ? (
                  <p className="text-sm text-destructive">{t('ad_promo_error')}</p>
                ) : (
                  <button
                    onClick={handleActivatePromo}
                    disabled={promoStatus === 'checking'}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {promoStatus === 'checking' && <Loader2 size={16} className="animate-spin" />}
                    {t(ad.ctaKey)}
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={handleCTA}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium"
              >
                {t(ad.ctaKey)}
              </button>
            )}
            <p className="mt-5 text-[10px] text-muted-foreground">{t('ad_label')}</p>
          </div>
        </DialogContent>
      </Dialog>

      <WelcomeToProAnimation tier={celebrateTier} onClose={() => { setCelebrateTier(null); close(); }} />
    </>
  );
}
