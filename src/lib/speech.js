import { Capacitor, registerPlugin } from '@capacitor/core';

// Dettatura per Focusy. Su iOS usa il plugin nativo FocusedSpeech
// (ios/App/App/FocusedSpeechPlugin.swift, SFSpeechRecognizer) perche' WKWebView non
// ha l'API Web Speech; sul web usa quella del browser se c'e'. Parte solo quando
// l'utente preme il microfono e si ferma da sola: mai un ascolto continuo.
const FocusedSpeech = registerPlugin('FocusedSpeech');

const WebRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

const isNative = () => Capacitor.getPlatform() === 'ios';

export async function isDictationAvailable() {
  if (isNative()) {
    try {
      return !!(await FocusedSpeech.available()).available;
    } catch {
      return false; // build senza il plugin (1.0.x)
    }
  }
  return !!WebRecognition;
}

// onText riceve la trascrizione completa dell'ascolto in corso (non un delta);
// onEnd viene chiamato quando l'ascolto finisce, per qualsiasi motivo.
export function createDictation({ language, onText, onEnd }) {
  let handles = [];
  let web = null;
  let active = false;

  const finish = () => {
    if (!active) return;
    active = false;
    handles.forEach((h) => { try { h.remove(); } catch { /* ignore */ } });
    handles = [];
    web = null;
    onEnd?.();
  };

  const start = async () => {
    if (active) return false;
    active = true;
    try {
      if (isNative()) {
        const { granted } = await FocusedSpeech.requestPermissions();
        if (!granted) { active = false; return false; }
        handles.push(await FocusedSpeech.addListener('partialResults', (e) => onText?.(e.text || '')));
        handles.push(await FocusedSpeech.addListener('ended', finish));
        await FocusedSpeech.start({ language });
      } else if (WebRecognition) {
        web = new WebRecognition();
        web.lang = language;
        web.interimResults = true;
        web.continuous = false;
        web.onresult = (e) => onText?.(Array.from(e.results).map((r) => r[0].transcript).join(' '));
        web.onend = finish;
        web.onerror = finish;
        web.start();
      } else {
        active = false;
        return false;
      }
      return true;
    } catch {
      finish();
      return false;
    }
  };

  const stop = async () => {
    if (!active) return;
    try {
      if (isNative()) await FocusedSpeech.stop();
      else web?.stop();
    } catch {
      finish();
    }
  };

  return { start, stop };
}
