import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useT } from '@/lib/i18n';
import IphoneToggle from '@/components/IphoneToggle';
import {
  isScreenTimeSupported,
  getAuthorizationStatus,
  requestAuthorization,
  pickApps,
  getSelectionCount,
  isBlockEnabled,
  setBlockEnabled,
} from '@/lib/nativeScreenTime';

// Impostazioni del blocco app per le sessioni Focus Time. Visibile solo su iOS
// con il plugin nativo presente (la 1.0.x non ce l'ha: lo status torna "unsupported").
export default function FocusBlockCard({ className = '' }) {
  const t = useT();
  const [status, setStatus] = useState(null);
  const [count, setCount] = useState(0);
  const [enabled, setEnabled] = useState(isBlockEnabled);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!isScreenTimeSupported()) return;
    getAuthorizationStatus().then(setStatus);
    getSelectionCount().then(setCount);
  }, []);

  if (!isScreenTimeSupported() || !status || status === 'unsupported') return null;

  const authorized = status === 'authorized';

  const handleEnable = async () => {
    const next = await requestAuthorization();
    setStatus(next);
    setDenied(next !== 'authorized');
  };

  const handlePick = async () => {
    const n = await pickApps({ title: t('fb_picker'), done: t('fb_fatto') });
    if (typeof n === 'number') {
      setCount(n);
      if (n === 0 && enabled) { setEnabled(false); setBlockEnabled(false); }
    }
  };

  const handleToggle = (on) => {
    setEnabled(on);
    setBlockEnabled(on);
  };

  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-left min-w-0">
          <ShieldCheck size={18} className="shrink-0" />
          <div className="min-w-0">
            <span className="block text-sm font-semibold">{t('fb_titolo')}</span>
            <span className="block text-xs text-muted-foreground">
              {authorized ? (count > 0 ? `${count} ${t('fb_selezionate')}` : t('fb_nessuna')) : t('fb_sub')}
            </span>
          </div>
        </div>
        {authorized ? (
          <button
            onClick={handlePick}
            className="shrink-0 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold active:scale-[0.97] transition-transform"
          >
            {t('fb_scegli')}
          </button>
        ) : (
          <button
            onClick={handleEnable}
            className="shrink-0 rounded-xl bg-foreground px-3 py-1.5 text-xs font-semibold text-background active:scale-[0.97] transition-transform"
          >
            {t('fb_attiva')}
          </button>
        )}
      </div>

      {denied && !authorized && <p className="mt-3 text-xs text-muted-foreground">{t('fb_negata')}</p>}

      {authorized && (
        <>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
            <span className="text-sm">{t('fb_durante')}</span>
            <IphoneToggle checked={enabled && count > 0} disabled={count === 0} onChange={handleToggle} />
          </div>
          <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{t('fb_nota')}</p>
        </>
      )}
    </div>
  );
}
