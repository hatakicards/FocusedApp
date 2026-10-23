import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { format } from 'date-fns';
import { useT } from '@/lib/i18n';
import { useActivities, useGymSessions, useSubscription } from '@/lib/useAppData';
import { getRecentEvents, typicalHour } from '@/lib/healthSense';
import { useAppStreak } from '@/lib/appStreak';

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

// L'ultimo errore delle notifiche resta salvato: la scheda di prova in Profilo lo mostra, cosi'
// si vede cosa non va anche senza i log del telefono.
const ERR_KEY = 'notif_last_error';
function noteError(where, e) {
  try { localStorage.setItem(ERR_KEY, `${where}: ${e?.message || e}`); } catch { /* ignore */ }
}

// Stato delle notifiche su questo dispositivo + prova: serve a capire se il permesso c'e',
// quante notifiche sono in coda e se una di prova arriva davvero.
export async function notificationDiagnostics() {
  const LN = await loadPlugin();
  let lastError = null;
  try { lastError = localStorage.getItem(ERR_KEY); } catch { /* ignore */ }
  if (!LN) {
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
    return { native: false, permission, pending: 0, lastError };
  }
  try {
    const { display } = await LN.checkPermissions();
    const { notifications } = await LN.getPending();
    return { native: true, permission: display, pending: notifications.length, lastError };
  } catch (e) {
    noteError('diagnostica', e);
    return { native: true, permission: 'error', pending: 0, lastError: String(e?.message || e) };
  }
}

export async function sendTestNotification(title, body, seconds = 6) {
  const LN = await loadPlugin();
  if (!LN) return { ok: false, reason: 'web' };
  try {
    if (!(await ensurePermission(LN))) return { ok: false, reason: 'denied' };
    await LN.schedule({
      notifications: [{ id: 7999, title, body, schedule: { at: new Date(Date.now() + seconds * 1000) } }],
    });
    return { ok: true };
  } catch (e) {
    noteError('prova', e);
    return { ok: false, reason: String(e?.message || e) };
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

// Permesso notifiche: sul telefono tramite il plugin nativo, sul web con l'API del browser.
// Restituisce true se concesso. Si chiama dopo aver spiegato all'utente a cosa servono.
export async function requestNotificationPermission() {
  const LN = await loadPlugin();
  if (LN) {
    try { return await ensurePermission(LN); } catch { return false; }
  }
  if (typeof Notification === 'undefined') return false;
  try {
    if (Notification.permission === 'default') await Notification.requestPermission();
    return Notification.permission === 'granted';
  } catch {
    return false;
  }
}

// messages: elenco di { title, body } che ruotano un giorno dopo l'altro; se manca, si usa title/body.
export async function syncDailyReminder({ enabled, time, ratedToday, title, body, messages }) {
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
      const m = messages?.length ? messages[(at.getDate() + at.getMonth()) % messages.length] : { title, body };
      notifications.push({
        id: BASE_ID + i,
        title: m.title,
        body: m.body,
        schedule: { at, allowWhileIdle: true },
      });
    }
    if (notifications.length) await LN.schedule({ notifications });
  } catch (e) {
    console.warn('Daily reminder sync failed', e);
    noteError('promemoria', e);
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
  const { streak, doneToday } = useAppStreak();
  const dream = (settings?.dream || '').trim();

  // Messaggi che cambiano di giorno in giorno e parlano di te (serie, sogno, Focus Time):
  // una notifica sempre uguale smette di essere letta dopo tre giorni.
  const nudgeStreak = streak > 0 && !doneToday ? t('nudge_streak').replace('{n}', String(streak)) : '';
  const nudgeDream = dream ? t('nudge_dream').replace('{dream}', dream.length > 60 ? `${dream.slice(0, 57)}...` : dream) : '';
  const nudgeFocus = t('nudge_focus');
  const messagesKey = [title, body, nudgeStreak, nudgeDream, nudgeFocus].join('|');

  useEffect(() => {
    if (!ready) return;
    const messages = [body, nudgeStreak, nudgeDream, nudgeFocus].filter(Boolean).map((b) => ({ title, body: b }));
    syncDailyReminder({ enabled, time, ratedToday, title, body, messages });
  }, [ready, enabled, time, ratedToday, messagesKey]);
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
    noteError('fine sessione', e);
  }
}

export async function cancelSessionEnd() {
  const LN = await loadPlugin();
  if (!LN) return;
  try {
    await LN.cancel({ notifications: [{ id: SESSION_END_ID }] });
  } catch { /* ignore */ }
}

// Spinta sugli allenamenti in scheda: nei giorni in cui hai una sessione in programma
// ("Oggi hai Push day, che stai aspettando?"), all'ora in cui di solito ti alleni
// (dedotta dagli allenamenti rilevati, altrimenti le 18). Salta oggi se hai gia'
// fatto l'allenamento. Si riprogramma a ogni apertura, come il promemoria serale.
const GYM_NUDGE_BASE_ID = 7200;
const WEEKDAY_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export async function syncGymNudges({ enabled, sessions, doneToday, hour, titleFor, genericBody }) {
  const LN = await loadPlugin();
  if (!LN) return;
  try {
    await LN.cancel({
      notifications: Array.from({ length: DAYS_AHEAD }, (_, i) => ({ id: GYM_NUDGE_BASE_ID + i })),
    });
    if (!enabled || !sessions?.length) return;
    if (!(await ensurePermission(LN))) return;

    const now = Date.now();
    const notifications = [];
    for (let i = 0; i < DAYS_AHEAD; i += 1) {
      const at = new Date();
      at.setDate(at.getDate() + i);
      at.setHours(hour, 0, 0, 0);
      if (at.getTime() <= now + 5000) continue;
      if (i === 0 && doneToday) continue;
      const session = sessions.find((s) => s.day_of_week === WEEKDAY_IDS[at.getDay()]);
      if (!session) continue;
      notifications.push({
        id: GYM_NUDGE_BASE_ID + i,
        title: 'Focused',
        body: session.title ? titleFor(session.title) : genericBody,
        schedule: { at, allowWhileIdle: true },
      });
    }
    if (notifications.length) await LN.schedule({ notifications });
  } catch (e) {
    console.warn('Gym nudge sync failed', e);
    noteError('palestra', e);
  }
}

export function useGymNudges(ratings) {
  const t = useT();
  const { data: sessions } = useGymSessions();
  const { data: activities } = useActivities();
  const { isPro } = useSubscription();
  const ready = sessions !== undefined && ratings !== undefined;
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const gymIds = new Set((activities || []).filter((a) => a.is_gym || a.preset_type === 'gym').map((a) => a.id));
  const ratedGym = (ratings || []).some((r) => r.date === todayKey && gymIds.has(r.activity_id));
  const sensedGym = getRecentEvents(2).some((e) => e.kind === 'gym' && e.date === todayKey);
  const doneToday = ratedGym || sensedGym;
  const planned = (sessions || []).filter((s) => (s.exercises || []).some((e) => e?.name?.trim()));
  const plannedKey = planned.map((s) => `${s.day_of_week}:${s.title || ''}`).join('|');
  const hour = typicalHour('gym');
  const template = t('sense_nudge_gym');
  const genericBody = t('sense_nudge_gym_generic');

  useEffect(() => {
    if (!ready) return;
    syncGymNudges({
      enabled: isPro,
      sessions: planned,
      doneToday,
      hour,
      titleFor: (title) => template.replace('{title}', title),
      genericBody,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isPro, doneToday, plannedKey, hour, template, genericBody]);
}
