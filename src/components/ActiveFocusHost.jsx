import { useEffect, useState } from 'react';
import { useOptimisticFocusTimeUpdate } from '@/lib/useAppData';
import { loadActiveFocus, saveActiveFocus, clearActiveFocus } from '@/lib/activeFocus';
import { dismissScheduleToday } from '@/lib/useFocusScheduler';
import FocusTimer from '@/components/FocusTimer';

// La sessione Focus Time in corso vive qui, nel layout dell'app, e non nella pagina Focus:
// cosi' puoi ridurla a una barretta e usare il resto di Focused mentre il blocco delle app
// e il timer continuano. Chi avvia una sessione la salva (saveActiveFocus) e manda
// l'evento 'focus-active-changed'.
export default function ActiveFocusHost() {
  const [active, setActive] = useState(() => loadActiveFocus());
  const [minimized, setMinimized] = useState(() => !!loadActiveFocus()?.minimized);
  const optimisticUpdate = useOptimisticFocusTimeUpdate();

  useEffect(() => {
    const sync = () => {
      const a = loadActiveFocus();
      setActive(a);
      setMinimized(!!a?.minimized);
    };
    window.addEventListener('focus-active-changed', sync);
    return () => window.removeEventListener('focus-active-changed', sync);
  }, []);

  if (!active) return null;

  const setMin = (value) => {
    setMinimized(value);
    saveActiveFocus({ ...active, minimized: value });
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
      key={active.endAt}
      durationMin={active.durationMin}
      endAt={active.endAt}
      spotifyUrl={active.spotifyUrl}
      session={active.session}
      blockMode={active.blockMode}
      minimized={minimized}
      onMinimize={() => setMin(true)}
      onExpand={() => setMin(false)}
      onComplete={handleComplete}
      onClose={handleClose}
    />
  );
}
