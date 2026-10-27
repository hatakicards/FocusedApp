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

// Chiede il permesso di posizione (prima "mentre usi l'app") senza salvare nulla.
// Restituisce true se non e' stato negato.
export async function askLocationPermission() {
  if (!isGymLocationSupported()) return false;
  try {
    const status = await getLocationStatus();
    if (status === 'not_determined') return (await FocusedLocation.requestAuthorization()).status !== 'denied';
    return status !== 'denied';
  } catch {
    return false;
  }
}

// Registra il monitoraggio dell'area e ricorda il posto. strings: testi delle notifiche (arrivo/uscita).
async function storePlace(lat, lon, strings) {
  await FocusedLocation.setGymRegion({ lat, lon, radius: RADIUS, ...strings });
  localStorage.setItem(PLACE_KEY, JSON.stringify({ lat, lon, radius: RADIUS, savedAt: Date.now() }));
  markSenseEnabled();
}

// Per riconoscere la palestra ad app chiusa serve "Sempre": iOS lo chiede in un secondo momento.
async function ensurePlacePermission() {
  let status = await getLocationStatus();
  if (status === 'not_determined' || status === 'when_in_use') {
    status = (await FocusedLocation.requestAuthorization()).status;
  }
  return status;
}

// Salva la posizione attuale come palestra.
// Restituisce { ok, reason? } con reason = 'denied' | 'unsupported' | 'no_location'.
export async function saveGymPlaceHere(strings) {
  if (!isGymLocationSupported()) return { ok: false, reason: 'unsupported' };
  try {
    const status = await ensurePlacePermission();
    if (status === 'denied') return { ok: false, reason: 'denied' };
    const here = await FocusedLocation.getCurrentLocation();
    await storePlace(here.lat, here.lon, strings);
    return { ok: true, always: status === 'always' };
  } catch (e) {
    return { ok: false, reason: String(e?.message || e) };
  }
}

// Apre la mappa (Apple Maps sull'iPhone) per scegliere la palestra, poi avvia il monitoraggio.
// pickerStrings: { title, hint, search, confirm }. Con una build senza la mappa ripiega sulla
// posizione attuale. reason = 'cancelled' | 'denied' | 'unsupported' | ...
export async function pickGymPlace(strings, pickerStrings) {
  if (!isGymLocationSupported()) return { ok: false, reason: 'unsupported' };
  try {
    const status = await ensurePlacePermission();
    if (status === 'denied') return { ok: false, reason: 'denied' };
    const current = getGymPlace();
    let picked;
    try {
      picked = await FocusedLocation.pickPlace({ ...pickerStrings, ...(current ? { lat: current.lat, lon: current.lon } : {}) });
    } catch {
      return await saveGymPlaceHere(strings); // build precedente: niente mappa
    }
    if (picked.cancelled) return { ok: false, reason: 'cancelled' };
    await storePlace(picked.lat, picked.lon, strings);
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
