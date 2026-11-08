import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useUserSettings } from '@/lib/useAppData';
import { getNotificationPermission, requestNotificationPermission } from '@/lib/dailyReminder';
import { isNativeApp, openAppSettings } from '@/lib/permissions';

// Chi ha saltato o negato le notifiche nel benvenuto non riceve il promemoria della sera, che e' il
// motivo principale per tornare il giorno dopo. Qui lo si richiede con un tocco; se iOS l'ha gia'
// negato si aprono le Impostazioni. Chiusa con la X ricompare dopo 3 giorni.
const DISMISS_KEY = 'reminder_nudge_dismissed_at';
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000;

function dismissedRecently() {
  try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < DISMISS_MS; } catch { return false; }
}

export default function ReminderNudge() {
  const t = useT();
  const { data: settings } = useUserSettings();
  const [perm, setPerm] = useState(null);
  const [hidden, setHidden] = useState(dismissedRecently);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return undefined;
    const read = () => { if (document.visibilityState === 'visible') getNotificationPermission().then(setPerm).catch(() => {}); };
    read();
    // Al ritorno dalle Impostazioni la scheda sparisce da sola se le notifiche ora sono accese.
    document.addEventListener('visibilitychange', read);
    return () => document.removeEventListener('visibilitychange', read);
  }, []);

  // Chi ha spento il promemoria dal Profilo l'ha scelto: niente insistenza.
  if (!isNativeApp() || hidden || !perm || perm === 'granted' || settings?.reminder_enabled === false) return null;

  const activate = async () => {
    if (busy) return;
    if (perm === 'denied') { openAppSettings(); return; }
    setBusy(true);
    const ok = await requestNotificationPermission();
    setBusy(false);
    setPerm(ok ? 'granted' : await getNotificationPermission());
    // Riprogramma subito il promemoria di stasera (useDailyReminder ascolta questo evento).
    if (ok) { try { window.dispatchEvent(new Event('focused-reminder-saved')); } catch { /* ignore */ } }
  };

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setHidden(true);
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground/10">
        <Bell size={18} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{t('rn_t')}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{t('rn_d')}</p>
      </div>
      <button
        onClick={activate}
        disabled={busy}
        className="shrink-0 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background disabled:opacity-40"
      >
        {t(perm === 'denied' ? 'wl_perm_settings' : 'rn_btn')}
      </button>
      <button onClick={dismiss} aria-label={t('rn_close')} className="shrink-0 text-muted-foreground">
        <X size={16} />
      </button>
    </div>
  );
}
