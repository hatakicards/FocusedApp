import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import {
  isScreenTimeSupported,
  getAuthorizationStatus,
  requestAuthorization,
  pickApps,
  getSelectionCount,
  BLOCK_MODES,
} from '@/lib/nativeScreenTime';

const MODE_LABEL = { off: 'fb_mode_off', selected: 'fb_mode_selected', all_except: 'fb_mode_all' };

// Scelta di cosa bloccare in una sessione: niente / solo certe app / tutto tranne
// certe app. Si usa nella card di Focus Time (valore predefinito), quando avvii una
// sessione e quando ne programmi una. Solo iOS con il plugin nativo presente.
export default function FocusBlockPicker({ mode, onChange }) {
  const t = useT();
  const [status, setStatus] = useState(null);
  const [counts, setCounts] = useState({ block: 0, keep: 0 });
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!isScreenTimeSupported()) return;
    getAuthorizationStatus().then(setStatus);
    Promise.all([getSelectionCount('block'), getSelectionCount('keep')]).then(([block, keep]) => setCounts({ block, keep }));
  }, []);

  if (!isScreenTimeSupported() || !status || status === 'unsupported') return null;

  if (status !== 'authorized') {
    const handleEnable = async () => {
      const next = await requestAuthorization();
      setStatus(next);
      setDenied(next !== 'authorized');
    };
    return (
      <div>
        <p className="text-xs text-muted-foreground mb-2">{t('fb_sub')}</p>
        <button onClick={handleEnable} className="rounded-xl bg-foreground px-3 py-1.5 text-xs font-semibold text-background">
          {t('fb_attiva')}
        </button>
        {denied && <p className="mt-2 text-xs text-muted-foreground">{t('fb_negata')}</p>}
      </div>
    );
  }

  const kind = mode === 'all_except' ? 'keep' : 'block';
  const count = counts[kind];

  const handlePick = async () => {
    const n = await pickApps({
      kind,
      title: t(kind === 'keep' ? 'fb_picker_keep' : 'fb_picker'),
      done: t('fb_fatto'),
    });
    if (typeof n === 'number') setCounts((c) => ({ ...c, [kind]: n }));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {BLOCK_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold leading-tight transition-colors ${
              mode === m ? 'bg-foreground text-background' : 'text-muted-foreground'
            }`}
          >
            {t(MODE_LABEL[m])}
          </button>
        ))}
      </div>

      {mode !== 'off' && (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-sm">{t(kind === 'keep' ? 'fb_keep' : 'fb_block')}</span>
            <span className="block text-xs text-muted-foreground">
              {count > 0 ? `${count} ${t('fb_selezionate')}` : t('fb_nessuna')}
            </span>
          </div>
          <button
            type="button"
            onClick={handlePick}
            className="shrink-0 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold active:scale-[0.97] transition-transform"
          >
            {t('fb_scegli')}
          </button>
        </div>
      )}

      {mode === 'all_except' && <p className="text-[11px] leading-snug text-muted-foreground">{t('fb_all_note')}</p>}
      {mode === 'selected' && count === 0 && <p className="text-[11px] leading-snug text-muted-foreground">{t('fb_need_apps')}</p>}
    </div>
  );
}
