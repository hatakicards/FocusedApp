import { Capacitor, registerPlugin } from '@capacitor/core';
import { addSensedEvent, markSenseEnabled } from '@/lib/healthSense';

// Posizione della palestra per lo "smart tracking": l'utente la salva una volta, poi iOS (plugin
// FocusedLocation, ios/App/App/FocusedHealthPlugin.swift) sveglia l'app quando entra o esce
// dall'area, anche da chiusa. All'uscita la visita diventa un allenamento rilevato e l'app
// chiede "com'e' andato?". La posizione resta sul telefono (localStorage + App Group).
const FocusedLocation = registerPlugin('FocusedLocation');

const PLACE_KEY = 'gym_place';
const RADIUS = 150;

export const isGymLocationSupported = () => Capacitor.getPlatform() === 'ios';

export function getGymPlace() {
  try { return JSON.parse(localStorage.getItem(PLACE_KEY)); } catch { return null; }
}

export async function getLocationStatus() {
  if (!isGymLocationSupported()) return 'unsupported';
  try { return (await FocusedLocation.getAuthorizationStatus()).status; } catch { return 'unsupported'; }
}

// Salva la posizione attuale come palestra. strings: testi delle notifiche (arrivo/uscita).
// Restituisce { ok, reason? } con reason = 'denied' | 'unsupported' | 'no_location'.
export async function saveGymPlaceHere(strings) {
  if (!isGymLocationSupported()) return { ok: false, reason: 'unsupported' };
  try {
    let status = await getLocationStatus();
    if (status === 'not_determined' || status === 'when_in_use') {
      status = (await FocusedLocation.requestAuthorization()).status;
    }
    if (status === 'denied') return { ok: false, reason: 'denied' };
    const here = await FocusedLocation.getCurrentLocation();
    await FocusedLocation.setGymRegion({ lat: here.lat, lon: here.lon, radius: RADIUS, ...strings });
    localStorage.setItem(PLACE_KEY, JSON.stringify({ lat: here.lat, lon: here.lon, radius: RADIUS, savedAt: Date.now() }));
    markSenseEnabled();
    return { ok: true, always: status === 'always' };
  } catch (e) {
    return { ok: false, reason: String(e?.message || e) };
  }
}

export async function clearGymPlace() {
  try { localStorage.removeItem(PLACE_KEY); } catch { /* ignore */ }
  if (!isGymLocationSupported()) return;
  try { await FocusedLocation.clearGymRegion(); } catch { /* ignore */ }
}

// Visite in palestra registrate mentre l'app era chiusa: diventano allenamenti rilevati.
export async function syncGymVisits() {
  if (!isGymLocationSupported() || !getGymPlace()) return 0;
  try {
    const { visits } = await FocusedLocation.popGymVisits();
    (visits || []).forEach((v) => addSensedEvent({ id: `loc-${v.start}`, kind: 'gym', start: v.start, end: v.end, minutes: v.minutes }));
    return (visits || []).length;
  } catch {
    return 0;
  }
}
