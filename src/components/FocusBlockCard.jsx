import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useT } from '@/lib/i18n';
import FocusBlockPicker from '@/components/FocusBlockPicker';
import { isScreenTimeSupported, getDefaultMode, setDefaultMode } from '@/lib/nativeScreenTime';

// Blocco app di Focus Time: valore predefinito per le sessioni (ogni sessione puo'
// cambiarlo quando la avvii o la programmi). Visibile solo su iOS con il plugin.
export default function FocusBlockCard({ className = '' }) {
  const t = useT();
  const [mode, setMode] = useState(getDefaultMode);

  if (!isScreenTimeSupported()) return null;

  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
      <div className="mb-3 flex items-center gap-3">
        <ShieldCheck size={18} className="shrink-0" />
        <div className="min-w-0">
          <span className="block text-sm font-semibold">{t('fb_titolo')}</span>
          <span className="block text-xs text-muted-foreground">{t('fb_default_sub')}</span>
        </div>
      </div>
      <FocusBlockPicker
        mode={mode}
        onChange={(m) => { setMode(m); setDefaultMode(m); }}
      />
      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{t('fb_nota')}</p>
    </div>
  );
}
