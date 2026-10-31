import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { openAppSettings } from '@/lib/permissions';
import { useT } from '@/lib/i18n';
import { notificationDiagnostics, sendTestNotification } from '@/lib/dailyReminder';

// Sotto il promemoria in Profilo: dice se le notifiche sono concesse, quante ne sono in
// coda e permette di mandarne una di prova (esci dall'app e aspetta pochi secondi).
export default function NotificationTest() {
  const t = useT();
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState('');

  const refresh = () => notificationDiagnostics().then(setInfo);
  useEffect(() => { refresh(); }, []);

  const test = async (seconds) => {
    setMsg('');
    const r = await sendTestNotification(t('notif_title'), t('notif_test_body'), seconds);
    let text;
    if (r.ok) text = t('notif_test_sent');
    else if (r.reason === 'denied') text = t('notif_test_denied');
    else if (r.reason === 'web') text = t('notif_test_web');
    else text = `${t('notif_test_err')}: ${r.reason}`;
    setMsg(r.trace?.length ? `${text} (${r.trace.join(' · ')})` : text);
    refresh();
  };

  const state = !info ? '' : info.permission === 'granted' ? t('notif_state_granted') : info.permission === 'denied' ? t('notif_state_denied') : info.permission === 'error' ? t('notif_test_err') : t('notif_state_prompt');

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Bell size={16} className="text-muted-foreground" />
        <span className="text-sm font-semibold">{t('notif_test_title')}</span>
      </div>
      {info && (
        <p className="mb-3 text-xs text-muted-foreground">
          {state}{info.native ? ` · ${info.pending} ${t('notif_pending')}` : ''} · {info.engine}
        </p>
      )}
      {info?.permission === 'denied' && (
        <>
          <p className="mb-3 text-xs text-muted-foreground">{t('notif_test_denied')}</p>
          {info.native && (
            <button onClick={openAppSettings} className="mb-3 w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background">{t('notif_open_settings')}</button>
          )}
        </>
      )}
      <button onClick={() => test(6)} className="w-full rounded-xl border border-border py-2.5 text-sm font-semibold">{t('notif_test_btn')}</button>
      <button onClick={() => test(0)} className="mt-2 w-full rounded-xl border border-border py-2.5 text-sm font-semibold">{t('notif_test_now')}</button>
      {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
      {info?.lastError && <p className="mt-2 break-words text-[10px] text-muted-foreground/70">{info.lastError}</p>}
    </div>
  );
}
