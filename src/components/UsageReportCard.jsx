import { useEffect, useState } from 'react';
import { Smartphone, ChevronRight } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { isScreenTimeSupported, getAuthorizationStatus, requestAuthorization, hasUsageReport, showUsageReport } from '@/lib/nativeScreenTime';

// Tempo di utilizzo collegato a Screen Time (solo iOS, solo build con l'estensione di
// report): un tocco apre la vista di sistema con il tempo di oggi. Non appare altrove.
export default function UsageReportCard({ className = '' }) {
  const t = useT();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!isScreenTimeSupported()) return;
    hasUsageReport().then(setAvailable);
  }, []);

  if (!available) return null;

  const open = async () => {
    if ((await getAuthorizationStatus()) !== 'authorized') {
      if ((await requestAuthorization()) !== 'authorized') return;
    }
    showUsageReport();
  };

  return (
    <button
      onClick={open}
      className={`flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left active:scale-[0.98] transition-transform ${className}`}
    >
      <span className="flex items-center gap-3">
        <Smartphone size={18} className="text-blue-400" />
        <span>
          <span className="block text-sm font-semibold">{t('opt_usage_title')}</span>
          <span className="block text-xs text-muted-foreground">{t('opt_usage_sub')}</span>
        </span>
      </span>
      <ChevronRight size={18} className="text-muted-foreground" />
    </button>
  );
}
