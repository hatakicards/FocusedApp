import { useState } from 'react';
import { ShieldCheck, ChevronDown } from 'lucide-react';
import { useT } from '@/lib/i18n';
import FocusBlockPicker from '@/components/FocusBlockPicker';
import { isScreenTimeSupported, getDefaultMode, setDefaultMode } from '@/lib/nativeScreenTime';

const MODE_LABEL = { off: 'fb_mode_off', selected: 'fb_mode_selected', all_except: 'fb_mode_all' };

// Blocco app di Focus Time: valore predefinito per le sessioni (ogni sessione puo'
// cambiarlo quando la avvii o la programmi). Visibile solo su iOS con il plugin nativo.
// Chiuso mostra solo la modalita' attiva; si apre per cambiarla o scegliere le app.
export default function FocusBlockCard({ className = '' }) {
  const t = useT();
  const [mode, setMode] = useState(getDefaultMode);
  const [open, setOpen] = useState(false);

  if (!isScreenTimeSupported()) return null;

  return (
    <div className={`overflow-hidden rounded-2xl border border-border/70 bg-card ${className}`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <ShieldCheck size={18} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t('fb_titolo')}</span>
          <span className="block truncate text-xs text-muted-foreground">{t(MODE_LABEL[mode] || MODE_LABEL.off)}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-border/70 px-4 pb-4 pt-3">
          <FocusBlockPicker
            mode={mode}
            onChange={(m) => { setMode(m); setDefaultMode(m); }}
          />
          <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{t('fb_nota')}</p>
        </div>
      )}
    </div>
  );
}
