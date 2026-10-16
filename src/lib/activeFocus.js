// Sessione Focus Time in corso, salvata sul dispositivo. Il timer vive nella pagina:
// se iOS la ricarica mentre sei in un'altra app, senza questo la sessione sparirebbe.
// Si salva l'istante di fine (non i secondi rimasti), cosi' il timer riparte giusto.
const KEY = 'active_focus_session';

export function saveActiveFocus(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export function loadActiveFocus() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    // Sessioni abbandonate da piu' di 6 ore non si ripristinano.
    if (!d || typeof d.endAt !== 'number' || Date.now() - d.endAt > 6 * 3600 * 1000) return null;
    return d;
  } catch {
    return null;
  }
}

export function clearActiveFocus() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
