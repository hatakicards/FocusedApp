import { useMemo } from 'react';
import { useRatings, useDayEntries, useFocusSessions } from '@/lib/useAppData';
import { formatDateISO, todayISO } from '@/lib/productivity';

// Serie di giorni consecutivi in cui hai fatto qualcosa di concreto: valutare la giornata,
// valutare un'attivita' o completare una sessione Focus Time. Aprire l'app non conta.
export function computeStreak(dates, today = todayISO()) {
  const set = new Set(dates.filter(Boolean));
  const doneToday = set.has(today);
  const cursor = new Date(`${today}T12:00:00`);
  if (!doneToday) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (set.has(formatDateISO(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { streak, doneToday };
}

export function useAppStreak() {
  const { data: ratings } = useRatings();
  const { data: dayEntries } = useDayEntries();
  const { data: sessions } = useFocusSessions();
  return useMemo(() => {
    const dates = [
      ...(ratings || []).map((r) => r.date),
      ...(dayEntries || []).map((e) => e.date),
      ...(sessions || []).filter((s) => !s.is_recurring && s.status === 'done').map((s) => s.completed_at),
    ];
    return computeStreak(dates);
  }, [ratings, dayEntries, sessions]);
}
