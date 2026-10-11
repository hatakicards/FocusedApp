import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Megaphone, Handshake, Rocket, Crown, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';

const AD_INTERVAL = 120000;

const ADS = [
  { titleKey: 'wwu_ads_title', subKey: 'wwu_ads_sub', ctaKey: 'wwu_btn', action: 'work_with_us', Icon: Megaphone },
  { titleKey: 'ad2_title', subKey: 'ad2_sub', ctaKey: 'ad2_cta', action: 'work_with_us', Icon: Handshake },
  { titleKey: 'i5_title', subKey: 'i5_sub', ctaKey: 'i5_cta', action: 'work_with_us', Icon: Rocket },
  { titleKey: 'ad_unlock_title', subKey: 'ad_unlock_sub', ctaKey: 'ad_unlock_cta', action: 'profilo', Icon: Crown },
  { titleKey: 'ad_bestself_title', subKey: 'ad_bestself_sub', ctaKey: 'ad_bestself_cta', action: 'profilo', Icon: Sparkles },
];

export default function FullScreenAd({ enabled, onCTA }) {
  const t = useT();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [adIndex, setAdIndex] = useState(0);

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
    if (ad.action === 'profilo') navigate('/profilo');
    else onCTA?.();
  };

  return (
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
  );
}
