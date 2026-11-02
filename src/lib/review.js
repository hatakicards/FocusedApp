import { registerPlugin } from '@capacitor/core';

// Finestra di valutazione di sistema (iOS: StoreKit, ios/App/App/FocusedWidgetSyncPlugin.swift;
// Android: Play In-App Review, FocusedReviewPlugin.kt). Il sistema decide se mostrarla
// (ha un limite di volte l'anno): da qui non si sa se l'utente ha votato.
const FocusedReview = registerPlugin('FocusedReview');

// false nelle build senza il plugin (<= 1.3): li' il popup di valutazione non deve comparire.
export async function isReviewAvailable() {
  try {
    return !!(await FocusedReview.available()).available;
  } catch {
    return false;
  }
}

export async function requestReview() {
  try {
    await FocusedReview.request();
  } catch { /* ignore */ }
}
