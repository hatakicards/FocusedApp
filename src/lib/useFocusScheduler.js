import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFocusSessions, useUserSettings } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';
import { saveActiveFocus, loadActiveFocus } from '@/lib/activeFocus';
import { currentScheduleWindow, recurringSchedules, toNativeSchedule } from '@/lib/focusSchedule';
import { resolveBlockMode, syncSchedules, setShieldContent, isScreenTimeSupported } from '@/lib/nativeScreenTime';

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
  const navigate = useNavigate();
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  // Registra i programmi nell'estensione nativa (e il testo della schermata di blocco).
  useEffect(() => {
    if (!isScreenTimeSupported() || !sessions) return;
    const list = recurringSchedules(sessions).filter((s) => s.schedule_active !== false && s.block_mode !== 'off');
    setShieldContent({ dream: settings?.dream, subtitle: t('shield_subtitle'), button: t('shield_button') })
      .then(() => syncSchedules(list.map(toNativeSchedule)));
  }, [sessions, settings?.dream]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (cancelled || loadActiveFocus()) return;
      const win = currentScheduleWindow(sessionsRef.current);
      if (!win || isDismissed(win.schedule.id)) return;
      const blockMode = await resolveBlockMode(win.schedule.block_mode || 'selected');
      if (cancelled || loadActiveFocus()) return;
      const remainingMin = Math.max(1, Math.round((win.endAt.getTime() - Date.now()) / 60000));
      saveActiveFocus({
        blockMode,
        durationMin: remainingMin,
        endAt: win.endAt.getTime(),
        spotifyUrl: null,
        session: win.schedule,
      });
      window.dispatchEvent(new Event('focus-active-changed'));
      navigate('/focus');
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
