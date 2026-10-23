import { Capacitor, registerPlugin } from '@capacitor/core';

// Plugin iOS locale (ios/App/App/FocusedScreenTimePlugin.swift): Family Controls +
// ManagedSettings. La selezione delle app vive solo sul device — Apple non
// permette di sapere QUALI app l'utente ha scelto, solo quante.
const FocusedScreenTime = registerPlugin('FocusedScreenTime');

const MODE_KEY = 'focus_block_mode';
const LEGACY_KEY = 'focus_block_enabled';
const SESSION_MODES_KEY = 'focus_block_session_modes';

// off = non blocca; selected = blocca solo le app scelte; all_except = blocca tutto
// tranne le app scelte da lasciare attive (Focused resta sempre apribile).
export const BLOCK_MODES = ['off', 'selected', 'all_except'];

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

// kind: 'block' (app da bloccare) | 'keep' (app da lasciare attive)
export const pickApps = ({ kind = 'block', title, done }) =>
  call(async () => (await FocusedScreenTime.pickApps({ kind, title, done })).count, null);

export const getSelectionCount = (kind = 'block') =>
  call(async () => (await FocusedScreenTime.getSelectionSummary({ kind })).count, 0);

// Testo della schermata di blocco (estensione iOS FocusedShield): sogno tra virgolette,
// sottotitolo e bottone. Va scritto prima di far partire il blocco.
export const setShieldContent = ({ dream, subtitle, button }) =>
  call(() => FocusedScreenTime.setShieldContent({ dream: dream || '', subtitle, button }), null);

// Tempo di utilizzo reale: iOS non lo passa alle app come numero, lo si puo' solo mostrare con
// una vista di sistema (DeviceActivityReport, estensione FocusedReport). L'app la incolla
// sopra la pagina, nel rettangolo della scheda (coordinate del documento).
export const hasUsageEmbed = () => call(async () => !!(await FocusedScreenTime.hasUsageReport()).embed, false);
export const showUsageEmbed = (rect) => call(() => FocusedScreenTime.showUsageEmbed(rect), null);
export const hideUsageEmbed = () => call(() => FocusedScreenTime.hideUsageEmbed(), null);
export const setUsageStrings = (strings) => call(() => FocusedScreenTime.setUsageStrings(strings), null);

// Tiene lo schermo acceso durante una sessione (UIApplication.isIdleTimerDisabled).
export const setKeepAwake = (enabled) =>
  call(() => FocusedScreenTime.setKeepAwake({ enabled: !!enabled }), null);

// Programmi ricorrenti: l'estensione iOS li fa partire da soli anche ad app chiusa.
// schedules: [{ id, days: [1..7, 1 = domenica], startHour, startMinute, endHour, endMinute, mode }]
export const syncSchedules = (schedules) =>
  call(() => FocusedScreenTime.syncSchedules({ schedules }), null);

export async function startBlock(endAt, mode = 'selected') {
  if (!isScreenTimeSupported()) return { active: false };
  const attempt = async () => {
    const r = await FocusedScreenTime.startBlock({ endAt: endAt.toISOString(), mode });
    return { active: !!r.active };
  };
  try {
    return await attempt();
  } catch (e) {
    let code = e?.code || e?.message || 'error';
    // L'autorizzazione puo' essere scaduta o mai confermata: la richiediamo e riproviamo una volta.
    if (code === 'not_authorized') {
      try {
        if ((await FocusedScreenTime.requestAuthorization()).status === 'authorized') return await attempt();
      } catch (e2) {
        code = e2?.code || e2?.message || code;
      }
    }
    return { active: false, error: String(code) };
  }
}

export const stopBlock = () => call(async () => (await FocusedScreenTime.stopBlock()).active, false);

export const getBlockState = () => call(() => FocusedScreenTime.getBlockState(), { active: false });

const readJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};

export function getDefaultMode() {
  try {
    const m = localStorage.getItem(MODE_KEY);
    if (BLOCK_MODES.includes(m)) return m;
    if (localStorage.getItem(LEGACY_KEY) === '1') return 'selected';
  } catch { /* ignore */ }
  // Una sessione di Focus Time blocca da sola le app (tutto tranne quelle che scegli di lasciare
  // attive): chi non vuole il blocco lo spegne esplicitamente.
  return isScreenTimeSupported() ? 'all_except' : 'off';
}

export function setDefaultMode(mode) {
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ }
}

// Ogni sessione puo' avere la sua modalita'; se non ne ha, vale il default.
export function getSessionMode(sessionId) {
  const m = sessionId ? readJSON(SESSION_MODES_KEY, {})[sessionId] : null;
  return BLOCK_MODES.includes(m) ? m : getDefaultMode();
}

export function setSessionMode(sessionId, mode) {
  if (!sessionId) return;
  const map = readJSON(SESSION_MODES_KEY, {});
  map[sessionId] = mode;
  try { localStorage.setItem(SESSION_MODES_KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

// La modalita' effettiva per una sessione: 'off' se manca la lista necessaria.
export async function resolveBlockMode(mode) {
  if (!isScreenTimeSupported() || mode === 'off') return 'off';
  if (mode === 'selected') return (await getSelectionCount('block')) > 0 ? 'selected' : 'off';
  return mode;
}
