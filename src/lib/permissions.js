import { Capacitor } from '@capacitor/core';
import { getNotificationPermission, requestNotificationPermission } from '@/lib/dailyReminder';
import { isSenseAvailable, enableSense, isSenseEnabled } from '@/lib/healthSense';
import { isScreenTimeSupported, getAuthorizationStatus, requestAuthorization } from '@/lib/nativeScreenTime';
import { isGymLocationSupported, getLocationStatus, askLocationPermission } from '@/lib/gymLocation';

// Permessi di sistema che Focused usa: ognuno si chiede con un tocco dell'utente (cosi' il popup di
// iOS compare sempre) e ha uno stato 'granted' | 'denied' | 'prompt'. Se iOS ha gia' registrato un
// rifiuto non mostra piu' il popup: l'unica strada e' aprire le Impostazioni dell'app.

export async function openAppSettings() {
  try {
    const { App } = await import('@capacitor/app');
    await App.openUrl({ url: 'app-settings:' });
  } catch { /* ignore */ }
}

// Quali permessi hanno senso su questo dispositivo.
export async function listPermissions() {
  const list = ['notifications'];
  try { if (await isSenseAvailable()) list.push('health'); } catch { /* ignore */ }
  if (isGymLocationSupported()) list.push('location');
  try { if (isScreenTimeSupported() && (await getAuthorizationStatus()) !== 'unsupported') list.push('screentime'); } catch { /* ignore */ }
  return list;
}

export async function permissionState(id) {
  try {
    if (id === 'notifications') return await withTimeout(getNotificationPermission(), 4000, 'prompt');
    // Salute non dice mai se la lettura e' stata concessa: vale quello che e' stato chiesto.
    if (id === 'health') return isSenseEnabled() ? 'granted' : 'prompt';
    if (id === 'location') {
      const s = await getLocationStatus();
      return s === 'always' || s === 'when_in_use' ? 'granted' : s === 'denied' ? 'denied' : 'prompt';
    }
    if (id === 'screentime') {
      const s = await getAuthorizationStatus();
      return s === 'authorized' ? 'granted' : s === 'denied' ? 'denied' : 'prompt';
    }
  } catch { /* ignore */ }
  return 'prompt';
}

// Una richiesta che non risponde non deve bloccare il benvenuto: dopo un minuto si va avanti e si
// rilegge lo stato.
const withTimeout = (promise, ms, fallback) => Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);

export async function askPermission(id) {
  try {
    if (id === 'notifications') await withTimeout(requestNotificationPermission(), 60000);
    else if (id === 'health') await enableSense();
    else if (id === 'location') await askLocationPermission();
    else if (id === 'screentime') await requestAuthorization();
  } catch { /* un rifiuto non blocca nulla */ }
  return permissionState(id);
}

export const isNativeApp = () => Capacitor.isNativePlatform();
