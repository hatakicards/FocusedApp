import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { format } from 'date-fns';
import { useT } from '@/lib/i18n';

// Promemoria serale: una notifica locale all'orario scelto dall'utente. iOS non
// permette di condizionare una notifica ripetuta, quindi se ne programmano le
// prossime DAYS_AHEAD come singole e si riprogrammano a ogni apertura dell'app o
// quando cambia qualcosa. Cosi', se oggi hai gia' valutato la giornata, quella di
// stasera salta e la streak non ti viene "ricordata" a sproposito.
const BASE_ID = 7000;
const DAYS_AHEAD = 14;

async function loadPlugin() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import('@capacitor/local-notifications');
    return mod.LocalNotifications;
  } catch {
    return null;
  }
}

async function ensurePermission(LN) {
  let { display } = await LN.checkPermissions();
  if (display === 'prompt' || display === 'prompt-with-rationale') {
    ({ display } = await LN.requestPermissions());
  }
  return display === 'granted';
}

async function cancelAll(LN) {
  await LN.cancel({
    notifications: Array.from({ length: DAYS_AHEAD }, (_, i) => ({ id: BASE_ID + i })),
  });
}

export async function syncDailyReminder({ enabled, time, ratedToday, title, body }) {
  const LN = await loadPlugin();
  if (!LN) return;
  try {
    await cancelAll(LN);
    if (!enabled) return;
    if (!(await ensurePermission(LN))) return;

    const [hh, mm] = String(time || '21:00').split(':').map((n) => parseInt(n, 10));
    const hour = Number.isFinite(hh) ? hh : 21;
    const minute = Number.isFinite(mm) ? mm : 0;
    const now = Date.now();
    const notifications = [];
    for (let i = 0; i < DAYS_AHEAD; i += 1) {
      const at = new Date();
      at.setDate(at.getDate() + i);
      at.setHours(hour, minute, 0, 0);
      if (at.getTime() <= now + 5000) continue;
      if (i === 0 && ratedToday) continue;
      notifications.push({
        id: BASE_ID + i,
        title,
        body,
        schedule: { at, allowWhileIdle: true },
      });
    }
    if (notifications.length) await LN.schedule({ notifications });
  } catch (e) {
    console.warn('Daily reminder sync failed', e);
  }
}

export function useDailyReminder(settings, ratings) {
  const t = useT();
  const title = t('notif_title');
  const body = t('notif_body');
  const enabled = settings?.reminder_enabled ?? true;
  const time = settings?.reminder_time;
  const ready = !!settings && ratings !== undefined;
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const ratedToday = (ratings || []).some((r) => r.date === todayKey);

  useEffect(() => {
    if (!ready) return;
    syncDailyReminder({ enabled, time, ratedToday, title, body });
  }, [ready, enabled, time, ratedToday, title, body]);
}

// Notifica di fine sessione Focus Time: serve quando l'utente esce da Focused per
// la durata della sessione (blocco app attivo) e deve sapere che e' finita.
const SESSION_END_ID = 7100;

export async function scheduleSessionEnd(endAt, title, body) {
  const LN = await loadPlugin();
  if (!LN) return;
  try {
    if (!(await ensurePermission(LN))) return;
    await LN.cancel({ notifications: [{ id: SESSION_END_ID }] });
    await LN.schedule({
      notifications: [{ id: SESSION_END_ID, title, body, schedule: { at: endAt, allowWhileIdle: true } }],
    });
  } catch (e) {
    console.warn('Session end notification failed', e);
  }
}

export async function cancelSessionEnd() {
  const LN = await loadPlugin();
  if (!LN) return;
  try {
    await LN.cancel({ notifications: [{ id: SESSION_END_ID }] });
  } catch { /* ignore */ }
}
