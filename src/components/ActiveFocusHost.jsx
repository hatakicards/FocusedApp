import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusSessions, useOptimisticFocusTimeUpdate } from '@/lib/useAppData';
import { loadActiveFocus, saveActiveFocus, clearActiveFocus } from '@/lib/activeFocus';
import { dismissScheduleToday } from '@/lib/useFocusScheduler';
import { getBlockState, isNativeV2, onNativeBlockEvent } from '@/lib/nativeScreenTime';
import FocusTimer from '@/components/FocusTimer';

// La sessione Focus Time in corso vive qui, nel layout dell'app, e non nella pagina Focus:
// cosi' puoi ridurla a una barretta e usare il resto di Focused mentre il blocco delle app
// e il timer continuano. Chi avvia una sessione la salva (saveActiveFocus) e manda
// l'evento 'focus-active-changed'.
//
// 1.5: con la build nativa nuova il blocco vero lo conosce iOS (getBlockState). All'apertura e a
// ogni ritorno nell'app la sessione mostrata si allinea a quello: un blocco partito da un programma
// compare qui (prima non risultava e restava acceso), uno finito o tolto altrove sparisce.
export default function ActiveFocusHost() {
  const [active, setActive] = useState(() => loadActiveFocus());
  const [minimized, setMinimized] = useState(() => !!loadActiveFocus()?.minimized);
  const optimisticUpdate = useOptimisticFocusTimeUpdate();
  const { data: sessions } = useFocusSessions();
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const reload = useCallback(() => {
    const a = loadActiveFocus();
    setActive(a);
    setMinimized(!!a?.minimized);
  }, []);

  const syncWithNative = useCallback(async () => {
    if (!(await isNativeV2())) return;
    const state = await getBlockState();
    const local = loadActiveFocus();
    const now = Date.now();

    if (state?.active) {
      const endAt = new Date(state.endAt).getTime();
      if (!Number.isFinite(endAt) || endAt <= now) return;
      const pausedUntil = state.paused && state.pausedUntil ? new Date(state.pausedUntil).getTime() : null;
      const sameBlock = local && local.endAt > now && (
        (state.source === 'schedule' && local.session?.is_recurring && local.session?.id === state.scheduleId)
        || (state.source === 'session' && !local.session?.is_recurring)
      );
      if (sameBlock) {
        if (local.pausedUntil !== pausedUntil || Math.abs(local.endAt - endAt) > 2000) {
          saveActiveFocus({ ...local, endAt, pausedUntil, nativeOwned: true });
          reload();
        }
        return;
      }
      // Blocco attivo che l'app non mostrava (programma partito da solo, o pagina ricaricata).
      const schedule = state.source === 'schedule'
        ? (sessionsRef.current || []).find((s) => s.id === state.scheduleId) || { id: state.scheduleId, is_recurring: true, title: '' }
        : (sessionsRef.current || []).find((s) => s.id === state.sessionId) || null;
      saveActiveFocus({
        blockMode: state.mode || 'all_except',
        durationMin: Math.max(1, Math.round((endAt - now) / 60000)),
        endAt,
        spotifyUrl: null,
        session: schedule,
        minimized: true,
        nativeOwned: true,
        pausedUntil,
      });
      reload();
      return;
    }

    // iOS dice che non c'e' nessun blocco: una sessione con blocco gestita dal nativo e' finita
    // (o e' stata tolta da un'altra parte) e non va piu' mostrata.
    if (local && local.nativeOwned && local.blockMode && local.blockMode !== 'off') {
      clearActiveFocus();
      reload();
    }
  }, [reload]);

  useEffect(() => {
    window.addEventListener('focus-active-changed', reload);
    return () => window.removeEventListener('focus-active-changed', reload);
  }, [reload]);

  useEffect(() => {
    syncWithNative();
    const onVisible = () => { if (document.visibilityState === 'visible') syncWithNative(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus-native-sync', syncWithNative);
    const id = setInterval(syncWithNative, 30000);
    const offEnded = onNativeBlockEvent('blockEnded', () => syncWithNative());
    const offResumed = onNativeBlockEvent('blockResumed', () => syncWithNative());
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus-native-sync', syncWithNative);
      clearInterval(id);
      offEnded();
      offResumed();
    };
  }, [syncWithNative]);

  // Quando arrivano le sessioni, il programma in corso prende il suo titolo.
  useEffect(() => {
    if (!active?.session?.is_recurring || active.session.title) return;
    const s = (sessions || []).find((x) => x.id === active.session.id);
    if (s) {
      saveActiveFocus({ ...active, session: s });
      reload();
    }
  }, [sessions, active, reload]);

  if (!active) return null;

  const setMin = (value) => {
    setMinimized(value);
    saveActiveFocus({ ...active, minimized: value });
  };

  const setPausedUntil = (pausedUntil) => {
    saveActiveFocus({ ...loadActiveFocus(), pausedUntil });
    reload();
  };

  const handleComplete = async (result) => {
    const session = active.session;
    if (!session?.id || session.is_recurring || !result?.actualMinutes) return;
    await optimisticUpdate(session.id, {
      status: 'done',
      completed_at: new Date().toISOString().split('T')[0],
      actual_minutes: result.actualMinutes,
    });
  };

  const handleClose = () => {
    // Programma chiuso prima della fine: per oggi non riparte da solo.
    if (active.session?.is_recurring) dismissScheduleToday(active.session.id);
    clearActiveFocus();
    setActive(null);
  };

  return (
    <FocusTimer
      key={`${active.endAt}-${active.session?.id || ''}`}
      durationMin={active.durationMin}
      endAt={active.endAt}
      spotifyUrl={active.spotifyUrl}
      session={active.session}
      blockMode={active.blockMode}
      nativeOwned={!!active.nativeOwned}
      pausedUntil={active.pausedUntil || null}
      onPausedChange={setPausedUntil}
      minimized={minimized}
      onMinimize={() => setMin(true)}
      onExpand={() => setMin(false)}
      onComplete={handleComplete}
      onClose={handleClose}
    />
  );
}
