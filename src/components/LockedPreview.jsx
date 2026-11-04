import { createContext, useContext, useState } from 'react';
import { Star, Crown } from 'lucide-react';
import { useT } from '@/lib/i18n';
import PremiumModal from '@/components/PremiumModal';

// Dentro l'anteprima sfocata i tutorial a comparsa non devono aprirsi sopra al blocco.
const LockedPreviewContext = createContext(false);
export const useInLockedPreview = () => useContext(LockedPreviewContext);

// Pagina riservata a Pro o Premium: invece di una schermata vuota si vede la pagina vera, sfumata e non
// toccabile, e sopra la stellina (Pro) o la coroncina (Premium) con "Sblocca con ...". Un tocco apre i piani.
export default function LockedPreview({ locked, tier, descKey, children }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!locked) return children;

  // tier 'any': basta uno dei due piani (es. LifeGame), si mostra la stellina con "Sblocca con Pro o Premium".
  const premium = tier === 'premium';
  const Icon = premium ? Crown : Star;
  const unlockKey = tier === 'any' ? 'gate_unlock_any' : premium ? 'gate_unlock_premium' : 'gate_unlock_pro';

  return (
    <LockedPreviewContext.Provider value>
      <div
        aria-hidden="true"
        inert=""
        className="pointer-events-none max-h-screen select-none overflow-hidden opacity-60 blur-[6px] [mask-image:linear-gradient(to_bottom,black_30%,transparent_92%)]"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed inset-x-0 top-0 bottom-24 z-30 flex flex-col items-center justify-center gap-3 px-10 text-center md:left-64"
      >
        <span className="titanium-tile flex h-16 w-16 items-center justify-center rounded-full border border-border/70">
          <Icon size={28} strokeWidth={1.75} className="text-foreground" />
        </span>
        <span className="text-lg font-semibold tracking-tight">{t(unlockKey)}</span>
        {descKey && <span className="max-w-xs text-sm text-muted-foreground">{t(descKey)}</span>}
      </button>
      <PremiumModal open={open} onClose={() => setOpen(false)} />
    </LockedPreviewContext.Provider>
  );
}
