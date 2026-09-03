import { Capacitor, registerPlugin } from '@capacitor/core';

// Plugin nativo locale (iOS: ios/App/App/FocusedScreenTimePlugin.swift — Family
// Controls/ManagedSettings/DeviceActivity; Android: android/.../FocusedScreenTimePlugin.kt
// — UsageStatsManager/AccessibilityService). Selezione app e blocco vivono
// interamente sul device: su iOS Apple non permette a nessuna app di sapere
// QUALI app l'utente ha scelto (token opaco), quindi non c'e' nulla da
// sincronizzare con Supabase per questa funzione.
const FocusedScreenTime = registerPlugin('FocusedScreenTime');

const isNative = () => Capacitor.isNativePlatform();
const NOT_NATIVE = { available: false, reason: 'not_native' };

export async function isScreenTimeAvailable() {
  if (!isNative()) return false;
  try {
    const res = await FocusedScreenTime.getAuthorizationStatus();
    return res?.status !== 'unsupported';
  } catch {
    return false;
  }
}

export async function getAuthorizationStatus() {
  if (!isNative()) return NOT_NATIVE;
  try {
    return await FocusedScreenTime.getAuthorizationStatus();
  } catch (e) {
    return { available: false, reason: e.message };
  }
}

export async function requestAuthorization() {
  if (!isNative()) return NOT_NATIVE;
  try {
    return await FocusedScreenTime.requestAuthorization();
  } catch (e) {
    return { available: false, reason: e.message };
  }
}

// iOS: apre in un colpo solo lo sheet nativo Apple (FamilyActivityPicker) e
// torna solo { count } — mai i nomi, per design di Apple nessuna app puo'
// sapere quali altre app l'utente ha scelto.
export async function pickAppsToBlock() {
  if (!isNative()) return NOT_NATIVE;
  try {
    return await FocusedScreenTime.pickApps();
  } catch (e) {
    return { available: false, reason: e.message };
  }
}

// Android: qui non c'e' la restrizione privacy di Apple, quindi la selezione
// si fa in due passi in modo che l'interfaccia (lista con nomi/icone) possa
// vivere nella UI web invece che in una schermata nativa dedicata.
export async function listInstalledApps() {
  if (!isNative()) return { apps: [] };
  try {
    return await FocusedScreenTime.listInstalledApps();
  } catch (e) {
    return { apps: [], reason: e.message };
  }
}

export async function saveSelectedApps(packageIds) {
  if (!isNative()) return NOT_NATIVE;
  try {
    return await FocusedScreenTime.saveSelectedApps({ packageIds });
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

export async function getSelectionSummary() {
  if (!isNative()) return { count: 0 };
  try {
    return await FocusedScreenTime.getSelectionSummary();
  } catch {
    return { count: 0 };
  }
}

// Soglia giornaliera (in minuti) oltre la quale le app selezionate vengono
// bloccate automaticamente — pensata per essere chiamata con
// user_settings.phone_reduction_goal * 60.
export async function setDailyUsageLimit(minutes) {
  if (!isNative()) return NOT_NATIVE;
  try {
    return await FocusedScreenTime.setDailyLimit({ minutes });
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

export async function clearDailyUsageLimit() {
  if (!isNative()) return;
  try {
    await FocusedScreenTime.clearDailyLimit();
  } catch (e) {
    console.error('clearDailyUsageLimit error', e);
  }
}

// Blocca le app selezionate per la durata esatta di una sessione Focus Time.
export async function scheduleFocusBlock(sessionId, startAt, endAt) {
  if (!isNative()) return NOT_NATIVE;
  try {
    return await FocusedScreenTime.scheduleFocusBlock({
      sessionId,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
    });
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

export async function cancelFocusBlock(sessionId) {
  if (!isNative()) return;
  try {
    await FocusedScreenTime.cancelFocusBlock({ sessionId });
  } catch (e) {
    console.error('cancelFocusBlock error', e);
  }
}
