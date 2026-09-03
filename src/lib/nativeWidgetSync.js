import { Capacitor, registerPlugin } from '@capacitor/core';

// Plugin nativo locale (iOS: ios/App/App/FocusedWidgetSyncPlugin.swift,
// Android: android/app/src/main/java/org/focusedapp/app/FocusedWidgetSyncPlugin.kt).
// Ponte tra la sessione Supabase nella WebView e lo storage condiviso che i
// widget nativi (WidgetKit/Glance) leggono per autenticarsi verso /api/widget-data.
const FocusedWidgetSync = registerPlugin('FocusedWidgetSync');

const isNative = () => Capacitor.isNativePlatform();

export async function syncWidgetSession(session) {
  if (!isNative() || !session?.access_token) return;
  try {
    await FocusedWidgetSync.syncSession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token || null,
      expiresAt: session.expires_at != null ? String(session.expires_at) : null,
    });
  } catch (e) {
    console.error('syncWidgetSession error', e);
  }
}

export async function clearWidgetSession() {
  if (!isNative()) return;
  try {
    await FocusedWidgetSync.clearSession();
  } catch (e) {
    console.error('clearWidgetSession error', e);
  }
}

// Chiede al sistema di aggiornare subito i widget (invece di aspettare il
// prossimo refresh periodico) — va chiamata dopo ogni azione che cambia i
// dati mostrati nei widget: voto attività, goal, task, day entry, scheda gym.
export async function refreshWidgets() {
  if (!isNative()) return;
  try {
    await FocusedWidgetSync.refreshWidgets();
  } catch (e) {
    console.error('refreshWidgets error', e);
  }
}
