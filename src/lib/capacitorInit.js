import { Capacitor } from '@capacitor/core';

// Attivo solo dentro l'app nativa (Capacitor) — sul sito normale (browser
// desktop o mobile) Capacitor.isNativePlatform() e' sempre false e questo
// modulo non fa nulla, quindi e' sicuro importarlo incondizionatamente.
export async function initCapacitor(navigate) {
  if (!Capacitor.isNativePlatform()) return;

  const [{ SplashScreen }, { StatusBar, Style }, { App }] = await Promise.all([
    import('@capacitor/splash-screen'),
    import('@capacitor/status-bar'),
    import('@capacitor/app'),
  ]);

  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  if (Capacitor.getPlatform() === 'android') {
    StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => {});
  }

  // Tasto indietro hardware Android: naviga indietro nella cronologia SPA;
  // solo se non c'e' piu' cronologia, chiude l'app (comportamento atteso).
  App.addListener('backButton', () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      App.exitApp();
    }
  });

  await SplashScreen.hide();
}
