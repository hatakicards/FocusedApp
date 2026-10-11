import { Capacitor, registerPlugin } from '@capacitor/core';

// Plugin iOS locale (ios/App/App/FocusedScreenTimePlugin.swift): Family Controls +
// ManagedSettings. La selezione delle app vive solo sul device — Apple non
// permette di sapere QUALI app l'utente ha scelto, solo quante.
const FocusedScreenTime = registerPlugin('FocusedScreenTime');

const BLOCK_PREF_KEY = 'focus_block_enabled';

export const isScreenTimeSupported = () => Capacitor.getPlatform() === 'ios';

async function call(fn, fallback) {
  if (!isScreenTimeSupported()) return fallback;
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export const getAuthorizationStatus = () =>
  call(async () => (await FocusedScreenTime.getAuthorizationStatus()).status, 'unsupported');

export const requestAuthorization = () =>
  call(async () => (await FocusedScreenTime.requestAuthorization()).status, 'denied');

export const pickApps = ({ title, done }) =>
  call(async () => (await FocusedScreenTime.pickApps({ title, done })).count, null);

export const getSelectionCount = () =>
  call(async () => (await FocusedScreenTime.getSelectionSummary()).count, 0);

export const startBlock = (endAt) =>
  call(async () => (await FocusedScreenTime.startBlock({ endAt: endAt.toISOString() })).active, false);

export const stopBlock = () => call(async () => (await FocusedScreenTime.stopBlock()).active, false);

export const getBlockState = () => call(() => FocusedScreenTime.getBlockState(), { active: false });

export function isBlockEnabled() {
  try { return localStorage.getItem(BLOCK_PREF_KEY) === '1'; } catch { return false; }
}

export function setBlockEnabled(on) {
  try { localStorage.setItem(BLOCK_PREF_KEY, on ? '1' : '0'); } catch { /* ignore */ }
}
