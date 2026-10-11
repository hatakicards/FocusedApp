import { useCallback, useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

// Riconoscimento delle attivita' da segnali reali (Salute + movimento iOS), cosi'
// l'utente non deve dire "ho fatto questo": e' l'app a chiedergli "ho visto che ti
// sei allenato, com'e' andata?". Plugin: ios/App/App/FocusedHealthPlugin.swift.
// Gli eventi rilevati restano in localStorage su questo telefono; al server arriva
// solo il voto che l'utente conferma. Focusy ne riceve un breve riassunto.
const FocusedHealth = registerPlugin('FocusedHealth');

const ENABLED_KEY = 'sense_enabled';
const ASKED_KEY = 'sense_asked';
const EVENTS_KEY = 'sense_events';
const KEEP_DAYS = 30;
const PROMPT_WINDOW_MS = 36 * 60 * 60 * 1000;
const SETTLE_MS = 10 * 60 * 1000; // aspetta che l'attivita' sia davvero finita

const isIOS = () => Capacitor.getPlatform() === 'ios';

const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
};

const localDate = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export async function isSenseAvailable() {
  if (!isIOS()) return false;
  try {
    const r = await FocusedHealth.isAvailable();
    return !!(r.health || r.motion);
  } catch {
    return false; // build senza il plugin (1.0.x)
  }
}

export const wasSenseAsked = () => read(ASKED_KEY, false);
export const isSenseEnabled = () => read(ENABLED_KEY, false);

export async function enableSense() {
  write(ASKED_KEY, true);
  try { await FocusedHealth.requestAuthorization(); } catch { /* ignore */ }
  write(ENABLED_KEY, true);
}

export function declineSense() {
  write(ASKED_KEY, true);
  write(ENABLED_KEY, false);
}

const overlap = (a, b) => {
  const s = Math.max(new Date(a.start), new Date(b.start));
  const e = Math.min(new Date(a.end), new Date(b.end));
  return Math.max(0, e - s);
};

async function detect() {
  const [wk, mo] = await Promise.all([
    FocusedHealth.getWorkouts({ sinceDays: 3 }).catch(() => ({ workouts: [] })),
    FocusedHealth.getMotionSegments({ sinceHours: 48 }).catch(() => ({ segments: [] })),
  ]);
  const events = (wk.workouts || [])
    .filter((w) => w.minutes >= 10)
    .map((w) => ({
      id: `hk-${w.id}`,
      kind: w.type === 'strength' ? 'gym' : w.type === 'hiit' ? 'workout' : w.type,
      start: w.start,
      end: w.end,
      minutes: w.minutes,
    }));
  // Senza Watch la corsa arriva dal movimento: la camminata la ignoro (e' sempre presente).
  (mo.segments || [])
    .filter((s) => (s.type === 'running' && s.minutes >= 10) || (s.type === 'cycling' && s.minutes >= 15))
    .forEach((s) => {
      const dup = events.some((e) => overlap(e, s) > 0.5 * (new Date(s.end) - new Date(s.start)));
      if (!dup) events.push({ id: `mo-${s.start}`, kind: s.type, start: s.start, end: s.end, minutes: s.minutes });
    });
  return events;
}

// Aggiorna lo storico locale e restituisce gli eventi su cui chiedere "com'e' andata?".
export async function syncEvents() {
  if (!isSenseEnabled() || !isIOS()) return [];
  const store = read(EVENTS_KEY, {});
  try {
    for (const ev of await detect()) {
      if (!store[ev.id]) store[ev.id] = { ...ev, date: localDate(ev.end), status: 'pending' };
    }
  } catch { /* segnali non disponibili: uso lo storico */ }
  const cutoff = Date.now() - KEEP_DAYS * 86400000;
  Object.keys(store).forEach((id) => { if (new Date(store[id].end).getTime() < cutoff) delete store[id]; });
  write(EVENTS_KEY, store);

  const now = Date.now();
  return Object.values(store)
    .filter((e) => e.status === 'pending')
    .filter((e) => now - new Date(e.end).getTime() >= SETTLE_MS && now - new Date(e.end).getTime() <= PROMPT_WINDOW_MS)
    .sort((a, b) => new Date(a.end) - new Date(b.end));
}

export function markEvent(id, status, rating) {
  const store = read(EVENTS_KEY, {});
  if (store[id]) {
    store[id] = { ...store[id], status, ...(rating ? { rating } : {}) };
    write(EVENTS_KEY, store);
  }
}

export const getRecentEvents = (days = 14) => {
  const cutoff = Date.now() - days * 86400000;
  return Object.values(read(EVENTS_KEY, {})).filter((e) => new Date(e.end).getTime() >= cutoff);
};

// Ora in cui l'utente si allena di solito (mediana degli ultimi allenamenti rilevati).
export function typicalHour(kind, fallback = 18) {
  const hours = getRecentEvents(KEEP_DAYS)
    .filter((e) => e.kind === kind)
    .map((e) => new Date(e.start).getHours())
    .sort((a, b) => a - b);
  return hours.length >= 3 ? hours[Math.floor(hours.length / 2)] : fallback;
}

// Riassunto testuale per Focusy.
export function buildSensedSummary(days = 14) {
  const events = getRecentEvents(days).sort((a, b) => new Date(a.start) - new Date(b.start));
  if (!events.length) return null;
  return events
    .map((e) => `  - ${e.date} ${new Date(e.start).toTimeString().slice(0, 5)} ${e.kind} ${e.minutes} min${e.rating ? ` (voto ${e.rating}/5)` : ''}`)
    .join('\n');
}

// Eventi da chiedere in questo momento + azioni per rispondere.
export function useSensedEvents(enabled) {
  const [pending, setPending] = useState([]);

  const refresh = useCallback(async () => {
    if (!enabled) { setPending([]); return; }
    setPending(await syncEvents());
  }, [enabled]);

  useEffect(() => {
    refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  return { pending, refresh };
}
