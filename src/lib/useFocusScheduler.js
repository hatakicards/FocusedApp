import { useEffect, useRef } from 'react';
import { useFocusSessions, useUserSettings } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';
import { saveActiveFocus, loadActiveFocus } from '@/lib/activeFocus';
import { currentScheduleWindow, recurringSchedules, toNativeSchedule } from '@/lib/focusSchedule';
import { resolveBlockMode, syncSchedules, setShieldContent, isScreenTimeSupported, isNativeV2 } from '@/lib/nativeScreenTime';

const dismissKey = (id) => `focus_sched_dismissed_${id}_${new Date().toISOString().slice(0, 10)}`;

// L'utente ha chiuso il programma prima della fine: per oggi non riparte da solo.
export function dismissScheduleToday(scheduleId) {
  try { localStorage.setItem(dismissKey(scheduleId), '1'); } catch { /* ignore */ }
}

const isDismissed = (scheduleId) => {
  try { return localStorage.getItem(dismissKey(scheduleId)) === '1'; } catch { return false; }
};

// Fa partire da solo i programmi ricorrenti di Focus Time: quando l'ora di un programma
// arriva (e l'app e' aperta) parte la sessione con il blocco fino all'ora di fine. Quando
// l'app e' chiusa ci pensa l'estensione iOS (DeviceActivity), a cui i programmi vengono
// passati da qui ogni volta che cambiano.
export function useFocusScheduler() {
  const { data: sessions } = useFocusSessions();
  const { data: settings } = useUserSettings();
  const t = useT();
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  // Registra i programmi nell'estensione nativa (e il testo della schermata di blocco).
  useEffect(() => {
    if (!isScreenTimeSupported() || !sessions) return undefined;
    const list = recurringSchedules(sessions).filter((s) => s.schedule_active !== false && s.block_mode !== 'off');
    const sync = () => setShieldContent({ dream: settings?.dream, subtitle: t('shield_subtitle'), button: t('shield_button'), pause: t('shield_pause') })
      .then(() => syncSchedules(list.map(toNativeSchedule)))
      .then(() => window.dispatchEvent(new Event('focus-native-sync')));
    sync();
    // Anche al ritorno nell'app: se nel frattempo e' arrivata l'autorizzazione Screen Time, i programmi si registrano.
    const onVisible = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [sessions, settings?.dream]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (cancelled || loadActiveFocus()) return;
      const win = currentScheduleWindow(sessionsRef.current);
      if (!win || isDismissed(win.schedule.id)) return;
      // Build nativa nuova: i programmi con blocco li fa partire iOS (anche ad app chiusa) e
      // ActiveFocusHost li mostra leggendo lo stato del blocco. Qui restano solo quelli senza blocco.
      if (win.schedule.block_mode !== 'off' && await isNativeV2()) return;
      const blockMode = await resolveBlockMode(win.schedule.block_mode || 'selected');
      if (cancelled || loadActiveFocus()) return;
      const remainingMin = Math.max(1, Math.round((win.endAt.getTime() - Date.now()) / 60000));
      saveActiveFocus({
        blockMode,
        durationMin: remainingMin,
        endAt: win.endAt.getTime(),
        spotifyUrl: null,
        session: win.schedule,
        minimized: true, // parte da solo: non copre quello che stai facendo
      });
      window.dispatchEvent(new Event('focus-active-changed'));
    };
    check();
    const id = setInterval(check, 20000);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
