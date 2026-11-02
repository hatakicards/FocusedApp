import { useState, useEffect, useCallback } from 'react';
import { X, Crown, Sparkles, Ban, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';
import PremiumModal from '@/components/PremiumModal';

const AD_INTERVAL = 120000;

// A tutto schermo solo inviti a sbloccare Focused: gli annunci di terzi stanno nel banner.
const ADS = [
  { titleKey: 'ad_unlock_title', subKey: 'ad_unlock_sub', ctaKey: 'ad_unlock_cta', Icon: Crown },
  { titleKey: 'ad_bestself_title', subKey: 'ad_bestself_sub', ctaKey: 'ad_bestself_cta', Icon: Sparkles },
  { titleKey: 'ad_next_title', subKey: 'ad_next_sub', ctaKey: 'ad_next_cta', Icon: Target },
  { titleKey: 'ad_noads_title', subKey: 'ad_noads_sub', ctaKey: 'ad_noads_cta', Icon: Ban },
];

export default function FullScreenAd({ enabled }) {
  const t = useT();
  const [show, setShow] = useState(false);
  const [adIndex, setAdIndex] = useState(0);
  const [premiumOpen, setPremiumOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      setShow(true);
      setAdIndex((i) => (i + 1) % ADS.length);
    }, AD_INTERVAL);
    return () => clearInterval(timer);
  }, [enabled]);

  const close = useCallback(() => setShow(false), []);

  const ad = ADS[adIndex];
  const { Icon } = ad;

  const handleCTA = () => {
    close();
    setPremiumOpen(true);
  };

  return (
    <>
      <Dialog open={enabled && show} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-sm [&>button]:hidden">
          <DialogTitle className="sr-only">{t(ad.titleKey)}</DialogTitle>
          {/* In un div: la classe [&>button]:hidden qui sopra nasconde i button figli diretti */}
          <div className="absolute top-3 right-3">
            <button
              onClick={close}
              aria-label={t('ad_salta')}
              className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="text-center py-2">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border">
              <Icon size={22} />
            </div>
            <h2 className="text-xl font-bold mb-2">{t(ad.titleKey)}</h2>
            <p className="text-sm text-muted-foreground mb-6 whitespace-pre-line">{t(ad.subKey)}</p>
            <button
              onClick={handleCTA}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium"
            >
              {t(ad.ctaKey)}
            </button>
            <p className="mt-5 text-[10px] text-muted-foreground">{t('ad_label')}</p>
          </div>
        </DialogContent>
      </Dialog>
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />
    </>
  );
}
