import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useT } from '@/lib/i18n';
import PremiumModal from '@/components/PremiumModal';

export default function SubscriptionGate({ title, description, icon: Icon }) {
  const t = useT();
  const [showPremium, setShowPremium] = useState(false);

  return (
    <>
      <div className="px-5 safe-top pb-4 min-h-screen flex flex-col items-center justify-center text-center">
        {Icon && (
          <div className="w-14 h-14 rounded-2xl border border-border flex items-center justify-center mb-4 text-muted-foreground">
            <Icon size={26} />
          </div>
        )}
        <h1 className="text-xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-xs">{description}</p>
        <div className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center mb-4 text-muted-foreground">
          <Lock size={26} />
        </div>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">{t('gate_locked')}</p>
        <button
          onClick={() => setShowPremium(true)}
          className="rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background"
        >
          {t('gate_unlock')}
        </button>
      </div>
      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />
    </>
  );
}