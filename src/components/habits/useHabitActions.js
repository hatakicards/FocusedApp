import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useOptimisticSmallHabitLogDelete, useOptimisticSmallHabitLogSave } from '@/lib/useAppData';
import { refreshWidgets } from '@/lib/nativeWidgetSync';

export const RESTORE_SLOT = 23;

// Segna / toglie un orario di una Small Habit in un giorno, e usa un recupero della streak.
export function useHabitActions() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const saveLog = useOptimisticSmallHabitLogSave();
  const removeLog = useOptimisticSmallHabitLogDelete();

  const toggle = useCallback((habit, slot, date) => {
    const logs = qc.getQueryData(['smallHabitLogs', user?.id]) || [];
    const existing = logs.find((l) => l.habit_id === habit.id && String(l.date).slice(0, 10) === date && Number(l.slot) === slot && l.status !== 'restored');
    if (existing) {
      removeLog(existing.id).catch(console.error);
    } else {
      try { window.dispatchEvent(new CustomEvent('focused-positive-moment')); } catch { /* ignore */ }
      saveLog(null, { habit_id: habit.id, date, slot, status: 'done' }).catch(console.error);
    }
    try { refreshWidgets(); } catch { /* ignore */ }
  }, [qc, user?.id, saveLog, removeLog]);

  const restore = useCallback((habit, missedDate) => {
    saveLog(null, { habit_id: habit.id, date: missedDate, slot: RESTORE_SLOT, status: 'restored' }).catch(console.error);
  }, [saveLog]);

  return { toggle, restore };
}
