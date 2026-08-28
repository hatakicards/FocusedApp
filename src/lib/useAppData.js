import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getDB, isGuestMode } from '@/lib/guestDB';
import { useAuth } from '@/lib/AuthContext';
import { todayISO, computeCategoryRank, isGoalCompletedNow, currentPeriodKey } from './productivity';
import { CATEGORIES, RANKS } from './constants';
import { useOptimisticSave, useOptimisticRemove, useOptimisticUpdate, useOptimisticSettingsPatch } from './optimisticHelpers';
import { mergePending, processQueue, addToQueue, clearQueue } from './syncQueue';

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

export function useActivities() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['activities', user?.id],
    queryFn: async () => mergePending('Activity', await getDB().Activity.filter({ created_by_id: user.id }, '-created_date', 500)),
    enabled: !!user,
  });
}

export function useRatings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ratings', user?.id],
    queryFn: async () => mergePending('DailyRating', await getDB().DailyRating.filter({ created_by_id: user.id }, '-date', 2000)),
    enabled: !!user,
  });
}

export function useGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => mergePending('Goal', await getDB().Goal.filter({ created_by_id: user.id }, '-created_date', 500)),
    enabled: !!user,
  });
}

export function useUserSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['userSettings', user?.id],
    queryFn: async () => {
      const all = await getDB().UserSettings.filter({ created_by_id: user.id }, '-created_date', 10);
      return all[0] || null;
    },
    enabled: !!user,
    retry: 3,
  });
}

export function useSubscription() {
  const { data: settings } = useUserSettings();
  const tier = settings?.subscription_tier || 'free';
  const trialStart = settings?.trial_start;
  const promoUntil = settings?.promo_until;
  const now = new Date();
  const trialActive = trialStart && (now.getTime() - new Date(trialStart).getTime()) < 7 * 24 * 60 * 60 * 1000;
  const trialExpired = trialStart && !trialActive;
  const promoActive = promoUntil && now.getTime() < new Date(promoUntil).getTime();
  const isPremium = tier === 'premium' || (tier === 'free' && trialActive) || promoActive;
  const isPro = tier === 'pro' || isPremium;
  return {
    tier,
    isPremium,
    isPro,
    adsRemoved: isPro || !!settings?.ads_removed,
    canUseProfiles: isPremium,
    canUseLifeStats: isPro,
    canUseRankings: isPro,
    trialActive,
    trialExpired: !!trialExpired,
    trialStart,
    promoActive: !!promoActive,
    promoUntil,
  };
}

export function useTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => mergePending('TaskItem', await getDB().TaskItem.filter({ created_by_id: user.id }, '-created_date', 500)),
    enabled: !!user,
  });
}

export function useFocusSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['focusSessions', user?.id],
    queryFn: async () => mergePending('FocusTime', await getDB().FocusTime.filter({ created_by_id: user.id }, 'scheduled_at', 500)),
    enabled: !!user,
  });
}

export function useLifeStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['lifeStats', user?.id],
    queryFn: async () => mergePending('LifeStat', await getDB().LifeStat.filter({ created_by_id: user.id }, 'date', 500)),
    enabled: !!user,
  });
}

export function useGymSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['gymSessions', user?.id],
    queryFn: async () => mergePending('GymSession', await getDB().GymSession.filter({ created_by_id: user.id }, 'day_of_week', 50)),
    enabled: !!user,
  });
}

export function useDayEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dayEntries', user?.id],
    queryFn: async () => mergePending('DayEntry', await getDB().DayEntry.filter({ created_by_id: user.id }, '-date', 1000)),
    enabled: !!user,
  });
}

export function useBodyFuelEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bodyFuelEntries', user?.id],
    queryFn: async () => mergePending('BodyFuelEntry', await getDB().BodyFuelEntry.filter({ created_by_id: user.id }, '-date', 500)),
    enabled: !!user,
  });
}

export function useLessonGrades() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['lessonGrades', user?.id],
    queryFn: async () => mergePending('LessonGrade', await getDB().LessonGrade.filter({ created_by_id: user.id }, '-date', 500)),
    enabled: !!user,
  });
}

export function useVerifiche() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['verifiche', user?.id],
    queryFn: async () => mergePending('Verifica', await getDB().Verifica.filter({ created_by_id: user.id }, 'date', 500)),
    enabled: !!user,
  });
}

export function useWorkDayLogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['workDayLogs', user?.id],
    queryFn: async () => mergePending('WorkDayLog', await getDB().WorkDayLog.filter({ created_by_id: user.id }, '-date', 500)),
    enabled: !!user,
  });
}

export function useCustomFoods() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['customFoods', user?.id],
    queryFn: async () => mergePending('CustomFood', await getDB().CustomFood.filter({ created_by_id: user.id }, '-created_date', 200)),
    enabled: !!user,
  });
}

export function useSubjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: async () => mergePending('Subject', await getDB().Subject.filter({ created_by_id: user.id }, 'name', 200)),
    enabled: !!user,
  });
}

export function useHomeworks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['homeworks', user?.id],
    queryFn: async () => mergePending('Homework', await getDB().Homework.filter({ created_by_id: user.id }, 'due_date', 500)),
    enabled: !!user,
  });
}

export function useProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => mergePending('Project', await getDB().Project.filter({ created_by_id: user.id }, '-created_date', 200)),
    enabled: !!user,
  });
}

export function useGradeGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['gradeGoals', user?.id],
    queryFn: async () => mergePending('GradeGoal', await getDB().GradeGoal.filter({ created_by_id: user.id }, 'subject', 200)),
    enabled: !!user,
  });
}

export function usePhoneTimeEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['phoneTimeEntries', user?.id],
    queryFn: async () => mergePending('PhoneTimeEntry', await getDB().PhoneTimeEntry.filter({ created_by_id: user.id }, '-date', 500)),
    enabled: !!user,
  });
}

export function useBooks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['books', user?.id],
    queryFn: async () => mergePending('Book', await getDB().Book.filter({ created_by_id: user.id }, '-created_date', 200)),
    enabled: !!user,
  });
}

export function useReadingLogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['readingLogs', user?.id],
    queryFn: async () => mergePending('ReadingLog', await getDB().ReadingLog.filter({ created_by_id: user.id }, '-date', 2000)),
    enabled: !!user,
  });
}

export function useSmokingProfiles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['smokingProfiles', user?.id],
    queryFn: async () => mergePending('SmokingProfile', await getDB().SmokingProfile.filter({ created_by_id: user.id }, '-created_date', 10)),
    enabled: !!user,
  });
}

export function useSmokingLogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['smokingLogs', user?.id],
    queryFn: async () => mergePending('SmokingLog', await getDB().SmokingLog.filter({ created_by_id: user.id }, '-date', 500)),
    enabled: !!user,
  });
}

// ---------------------------------------------------------------------------
// Invalidate helper — only invalidates the specific query key passed
// ---------------------------------------------------------------------------

export function useInvalidateAll() {
  const qc = useQueryClient();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: ['activities'] });
    qc.invalidateQueries({ queryKey: ['ratings'] });
    qc.invalidateQueries({ queryKey: ['goals'] });
    qc.invalidateQueries({ queryKey: ['userSettings'] });
    qc.invalidateQueries({ queryKey: ['dayEntries'] });
    qc.invalidateQueries({ queryKey: ['gymSessions'] });
    qc.invalidateQueries({ queryKey: ['lifeStats'] });
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['focusSessions'] });
    qc.invalidateQueries({ queryKey: ['bodyFuelEntries'] });
    qc.invalidateQueries({ queryKey: ['lessonGrades'] });
    qc.invalidateQueries({ queryKey: ['verifiche'] });
    qc.invalidateQueries({ queryKey: ['workDayLogs'] });
    qc.invalidateQueries({ queryKey: ['customFoods'] });
    qc.invalidateQueries({ queryKey: ['subjects'] });
    qc.invalidateQueries({ queryKey: ['homeworks'] });
    qc.invalidateQueries({ queryKey: ['gradeGoals'] });
    qc.invalidateQueries({ queryKey: ['projects'] });
    qc.invalidateQueries({ queryKey: ['phoneTimeEntries'] });
    qc.invalidateQueries({ queryKey: ['books'] });
    qc.invalidateQueries({ queryKey: ['readingLogs'] });
    qc.invalidateQueries({ queryKey: ['smokingProfiles'] });
    qc.invalidateQueries({ queryKey: ['smokingLogs'] });
  }, [qc]);
}

// ---------------------------------------------------------------------------
// Optimistic hooks — generic (delegated to optimisticHelpers)
// ---------------------------------------------------------------------------

export const useOptimisticActivitySave = () => useOptimisticSave('Activity', 'activities');
export const useOptimisticActivityDelete = () => useOptimisticRemove('Activity', 'activities');
export const useOptimisticGoalSave = () => useOptimisticSave('Goal', 'goals');
export const useOptimisticGoalDelete = () => useOptimisticRemove('Goal', 'goals');
export const useOptimisticWorkDayLog = () => useOptimisticSave('WorkDayLog', 'workDayLogs');
export const useOptimisticBodyFuelEntry = () => useOptimisticSave('BodyFuelEntry', 'bodyFuelEntries');
export const useOptimisticSettingsUpdate = () => useOptimisticSettingsPatch();
export const useOptimisticSubjectSave = () => useOptimisticSave('Subject', 'subjects');
export const useOptimisticSubjectDelete = () => useOptimisticRemove('Subject', 'subjects');
export const useOptimisticLessonGradeSave = () => useOptimisticSave('LessonGrade', 'lessonGrades');
export const useOptimisticLessonGradeDelete = () => useOptimisticRemove('LessonGrade', 'lessonGrades');
export const useOptimisticVerificaSave = () => useOptimisticSave('Verifica', 'verifiche');
export const useOptimisticVerificaUpdate = () => useOptimisticUpdate('Verifica', 'verifiche');
export const useOptimisticVerificaDelete = () => useOptimisticRemove('Verifica', 'verifiche');
export const useOptimisticHomeworkSave = () => useOptimisticSave('Homework', 'homeworks');
export const useOptimisticHomeworkUpdate = () => useOptimisticUpdate('Homework', 'homeworks');
export const useOptimisticHomeworkDelete = () => useOptimisticRemove('Homework', 'homeworks');
export const useOptimisticGradeGoalSave = () => useOptimisticSave('GradeGoal', 'gradeGoals');
export const useOptimisticGradeGoalDelete = () => useOptimisticRemove('GradeGoal', 'gradeGoals');
export const useOptimisticProjectSave = () => useOptimisticSave('Project', 'projects');
export const useOptimisticProjectUpdate = () => useOptimisticUpdate('Project', 'projects');
export const useOptimisticProjectDelete = () => useOptimisticRemove('Project', 'projects');
export const useOptimisticFocusTimeSave = () => useOptimisticSave('FocusTime', 'focusSessions');
export const useOptimisticFocusTimeUpdate = () => useOptimisticUpdate('FocusTime', 'focusSessions');
export const useOptimisticFocusTimeDelete = () => useOptimisticRemove('FocusTime', 'focusSessions');
export const useOptimisticPhoneTimeSave = () => useOptimisticSave('PhoneTimeEntry', 'phoneTimeEntries');
export const useOptimisticBookSave = () => useOptimisticSave('Book', 'books');
export const useOptimisticBookDelete = () => useOptimisticRemove('Book', 'books');
export const useOptimisticBookUpdate = () => useOptimisticUpdate('Book', 'books');
export const useOptimisticReadingLogSave = () => useOptimisticSave('ReadingLog', 'readingLogs');
export const useOptimisticSmokingProfileSave = () => useOptimisticSave('SmokingProfile', 'smokingProfiles');
export const useOptimisticSmokingLogSave = () => useOptimisticSave('SmokingLog', 'smokingLogs');

export function useOptimisticEntityDelete(entityName, queryKey) {
  return useOptimisticRemove(entityName, queryKey);
}

// ---------------------------------------------------------------------------
// Optimistic hooks — special logic (cancelQueries first, functional setQueryData)
// ---------------------------------------------------------------------------

export function useOptimisticRating() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useCallback(async (activityId, date, rating) => {
    const key = ['ratings', user?.id];
    const prev = qc.getQueryData(key) || [];
    const existing = prev.find((r) => r.activity_id === activityId && r.date === date);
    if (existing?.rating === rating) return;

    const isTemp = existing && typeof existing.id === 'string' && existing.id.startsWith('temp-');

    await qc.cancelQueries({ queryKey: key });
    let tempId;
    if (existing) {
      qc.setQueryData(key, (cur) => cur.map((r) => (r.id === existing.id ? { ...r, rating } : r)));
    } else {
      tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      qc.setQueryData(key, (cur) => [...cur, { id: tempId, activity_id: activityId, date, rating }]);
    }

    try {
      let result;
      if (existing && !isTemp) {
        result = await getDB().DailyRating.update(existing.id, { rating });
      } else {
        result = await getDB().DailyRating.create({ activity_id: activityId, date, rating });
      }
      qc.setQueryData(key, (cur) => {
        const filtered = cur.filter((r) => r.id !== result.id && r.id !== tempId);
        return [...filtered, result];
      });
    } catch (e) {
      if (existing && !isTemp) {
        addToQueue({ type: 'update', entity: 'DailyRating', serverId: existing.id, payload: { rating } });
      } else if (tempId) {
        addToQueue({ type: 'create', entity: 'DailyRating', tempId, payload: { activity_id: activityId, date, rating } });
      }
      console.error('Sync queued:', e);
    }
  }, [qc, user?.id]);
}

export function useOptimisticGoalToggle() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useCallback(async (goal) => {
    const key = ['goals', user?.id];
    const prev = qc.getQueryData(key) || [];
    const isLifetime = goal.timeframe === 'lifetime';
    const nowCompleted = isGoalCompletedNow(goal);
    const newCompleted = !nowCompleted;
    const today = new Date().toISOString().split('T')[0];

    let payload;
    let updated;
    if (isLifetime) {
      updated = { ...goal, completed: newCompleted, completed_date: newCompleted ? today : null };
      payload = { completed: newCompleted, completed_date: newCompleted ? today : null };
    } else {
      const pk = currentPeriodKey(goal.timeframe);
      const periods = goal.completed_periods || [];
      const newPeriods = newCompleted
        ? [...periods, pk]
        : periods.filter((p) => p !== pk);
      updated = {
        ...goal,
        completed_periods: newPeriods,
        completed: newCompleted,
        completed_date: newCompleted ? today : goal.completed_date || null,
      };
      payload = {
        completed_periods: newPeriods,
        completed: newCompleted,
        completed_date: newCompleted ? today : goal.completed_date || null,
      };
    }

    await qc.cancelQueries({ queryKey: key });
    qc.setQueryData(key, (cur) => cur.map((g) => (g.id === goal.id ? updated : g)));

    try {
      await getDB().Goal.update(goal.id, payload);
    } catch (e) {
      addToQueue({ type: 'update', entity: 'Goal', serverId: goal.id, payload });
      console.error('Sync queued:', e);
    }
  }, [qc, user?.id]);
}

export function useOptimisticGymSessionSave() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useCallback(async (session, payload) => {
    const key = ['gymSessions', user?.id];
    const prev = qc.getQueryData(key) || [];

    await qc.cancelQueries({ queryKey: key });
    qc.setQueryData(key, (cur) => cur.map((s) => (s.id === session.id ? { ...s, ...payload } : s)));

    try {
      await getDB().GymSession.update(session.id, payload);
    } catch (e) {
      addToQueue({ type: 'update', entity: 'GymSession', serverId: session.id, payload });
      console.error('Sync queued:', e);
    }
  }, [qc, user?.id]);
}

export function useOptimisticLifeStatSave() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useCallback(async (existing, values, isBaseline) => {
    const key = ['lifeStats', user?.id];
    const today = new Date().toISOString().split('T')[0];
    const isTemp = existing && typeof existing.id === 'string' && existing.id.startsWith('temp-');

    await qc.cancelQueries({ queryKey: key });
    let tempId;
    if (existing && !isTemp) {
      qc.setQueryData(key, (cur) => cur.map((s) => (s.id === existing.id ? { ...s, ...values } : s)));
    } else {
      tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newRec = { id: tempId, date: today, ...values, is_baseline: !!isBaseline };
      qc.setQueryData(key, (cur) => [...cur, newRec]);
    }

    try {
      let result;
      if (existing && !isTemp) {
        result = await getDB().LifeStat.update(existing.id, values);
      } else {
        result = await getDB().LifeStat.create({ date: today, ...values, is_baseline: !!isBaseline });
      }
      qc.setQueryData(key, (cur) => {
        const filtered = cur.filter((s) => s.id !== result.id && s.id !== tempId);
        return [...filtered, result];
      });
      return result;
    } catch (e) {
      if (existing && !isTemp) {
        addToQueue({ type: 'update', entity: 'LifeStat', serverId: existing.id, payload: values });
      } else if (tempId) {
        addToQueue({ type: 'create', entity: 'LifeStat', tempId, payload: { date: today, ...values, is_baseline: !!isBaseline } });
      }
      console.error('Sync queued:', e);
      throw e;
    }
  }, [qc, user?.id]);
}

export function useOptimisticDayEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useCallback(async (existingEntry, date, dayRating, thoughts) => {
    const key = ['dayEntries', user?.id];
    const prev = qc.getQueryData(key) || [];
    const isTemp = existingEntry && typeof existingEntry.id === 'string' && existingEntry.id.startsWith('temp-');

    await qc.cancelQueries({ queryKey: key });
    let tempId;
    if (existingEntry) {
      qc.setQueryData(key, (cur) => cur.map((e) => (e.id === existingEntry.id ? { ...e, day_rating: dayRating, thoughts } : e)));
    } else {
      tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      qc.setQueryData(key, (cur) => [{ id: tempId, date, day_rating: dayRating, thoughts }, ...cur]);
    }

    try {
      let result;
      if (existingEntry && !isTemp) {
        result = await getDB().DayEntry.update(existingEntry.id, { day_rating: dayRating, thoughts });
      } else {
        result = await getDB().DayEntry.create({ date, day_rating: dayRating, thoughts });
      }
      qc.setQueryData(key, (cur) => {
        const filtered = cur.filter((e) => e.id !== result.id && e.id !== tempId);
        return [...filtered, result];
      });
    } catch (e) {
      if (existingEntry && !isTemp) {
        addToQueue({ type: 'update', entity: 'DayEntry', serverId: existingEntry.id, payload: { day_rating: dayRating, thoughts } });
      } else if (tempId) {
        addToQueue({ type: 'create', entity: 'DayEntry', tempId, payload: { date, day_rating: dayRating, thoughts } });
      }
      console.error('Sync queued:', e);
    }
  }, [qc, user?.id]);
}

export function useOptimisticTaskSave() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useCallback(async (payload) => {
    const key = ['tasks', user?.id];
    const prev = qc.getQueryData(key) || [];
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await qc.cancelQueries({ queryKey: key });
    qc.setQueryData(key, (cur) => [{ id: tempId, ...payload, status: 'active' }, ...cur]);

    try {
      const result = await getDB().TaskItem.create({ ...payload, status: 'active' });
      qc.setQueryData(key, (cur) => {
        const filtered = cur.filter((t) => t.id !== result.id && t.id !== tempId);
        return [...filtered, result];
      });
    } catch (e) {
      addToQueue({ type: 'create', entity: 'TaskItem', tempId, payload: { ...payload, status: 'active' } });
      console.error('Sync queued:', e);
    }
  }, [qc, user?.id]);
}

export function useOptimisticTaskToggle() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useCallback(async (task) => {
    const key = ['tasks', user?.id];
    const prev = qc.getQueryData(key) || [];
    const done = task.status === 'done';
    const today = new Date().toISOString().split('T')[0];
    const updated = done
      ? { ...task, status: 'active', completed_date: null, rating: null }
      : { ...task, status: 'done', completed_date: today };

    await qc.cancelQueries({ queryKey: key });
    qc.setQueryData(key, (cur) => cur.map((t) => (t.id === task.id ? updated : t)));

    try {
      await getDB().TaskItem.update(task.id, done
        ? { status: 'active', completed_date: null, rating: null }
        : { status: 'done', completed_date: today });
    } catch (e) {
      addToQueue({ type: 'update', entity: 'TaskItem', serverId: task.id, payload: done
        ? { status: 'active', completed_date: null, rating: null }
        : { status: 'done', completed_date: today } });
      console.error('Sync queued:', e);
    }
    return updated;
  }, [qc, user?.id]);
}

export function useOptimisticTaskRate() {
  return useOptimisticUpdate('TaskItem', 'tasks');
}

export function useOptimisticTaskArchive() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useCallback(async (task) => {
    const key = ['tasks', user?.id];
    const prev = qc.getQueryData(key) || [];
    const today = new Date().toISOString().split('T')[0];

    await qc.cancelQueries({ queryKey: key });
    qc.setQueryData(key, (cur) => cur.map((t) => (t.id === task.id ? { ...t, status: 'archived', archived_date: today } : t)));

    try {
      await getDB().TaskItem.update(task.id, { status: 'archived', archived_date: today });
    } catch (e) {
      addToQueue({ type: 'update', entity: 'TaskItem', serverId: task.id, payload: { status: 'archived', archived_date: today } });
      console.error('Sync queued:', e);
    }
  }, [qc, user?.id]);
}

export function useOptimisticCustomFoodSave() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useCallback(async (foodData) => {
    const key = ['customFoods', user?.id];
    const prev = qc.getQueryData(key) || [];
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await qc.cancelQueries({ queryKey: key });
    qc.setQueryData(key, (cur) => [{ id: tempId, ...foodData }, ...cur]);

    try {
      const result = await getDB().CustomFood.create(foodData);
      qc.setQueryData(key, (cur) => {
        const filtered = cur.filter((f) => f.id !== result.id && f.id !== tempId);
        return [...filtered, result];
      });
    } catch (e) {
      addToQueue({ type: 'create', entity: 'CustomFood', tempId, payload: foodData });
      console.error('Sync queued:', e);
    }
  }, [qc, user?.id]);
}

// ---------------------------------------------------------------------------
// Promotion check — no longer calls invalidate() (was causing mass refetch)
// ---------------------------------------------------------------------------

export function usePromotionCheck() {
  const { data: activities } = useActivities();
  const { data: ratings } = useRatings();
  const { data: goals } = useGoals();
  const { data: settings } = useUserSettings();
  const { data: lessonGrades } = useLessonGrades();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [promotion, setPromotion] = useState(null);
  const processedRef = useRef('');

  useEffect(() => {
    if (!activities || !ratings || !goals || !settings || !lessonGrades) return;

    const currentRanks = {};
    CATEGORIES.forEach((cat) => {
      const result = computeCategoryRank(cat.id, activities, ratings, goals, lessonGrades);
      currentRanks[cat.id] = result.rankIndex;
    });

    const stateKey = settings.id + '|' + JSON.stringify(currentRanks);
    if (processedRef.current === stateKey) return;

    const lastRanks = settings.last_ranks || {};
    const currentStr = JSON.stringify(currentRanks);
    const lastStr = JSON.stringify(lastRanks);

    if (currentStr === lastStr) {
      processedRef.current = stateKey;
      return;
    }

    processedRef.current = stateKey;

    let promoted = null;
    CATEGORIES.forEach((cat) => {
      const lastIndex = lastRanks[cat.id] ?? -1;
      const currentIndex = currentRanks[cat.id];
      if (currentIndex > lastIndex) {
        promoted = {
          categoryId: cat.id,
          categoryName: cat.name,
          rankIndex: currentIndex,
          rank: RANKS[currentIndex],
        };
      }
    });

    if (promoted) {
      setPromotion(promoted);
    }

    // Update settings cache directly instead of invalidating all queries
    const key = ['userSettings', user?.id];
    qc.setQueryData(key, (cur) => (cur ? { ...cur, last_ranks: currentRanks } : cur));
    getDB().UserSettings
      .update(settings.id, { last_ranks: currentRanks })
      .catch(console.error);
  }, [activities, ratings, goals, settings, lessonGrades, qc, user?.id]);

  return { promotion, dismissPromotion: () => setPromotion(null) };
}

// ---------------------------------------------------------------------------
// Sync init — processes the local sync queue on app load and periodically.
// Call this once at the app root (e.g. in AppLayout).
// ---------------------------------------------------------------------------

export function useSyncInit() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (user.isGuest) return;

    // Process queue immediately on mount
    const runSync = () => {
      processQueue((syncedEntities) => {
        // Invalidate only the entity queries that were synced
        const entityToKey = {
          Activity: 'activities',
          DailyRating: 'ratings',
          Goal: 'goals',
          DayEntry: 'dayEntries',
          GymSession: 'gymSessions',
          LifeStat: 'lifeStats',
          TaskItem: 'tasks',
          FocusTime: 'focusSessions',
          BodyFuelEntry: 'bodyFuelEntries',
          LessonGrade: 'lessonGrades',
          Verifica: 'verifiche',
          WorkDayLog: 'workDayLogs',
          CustomFood: 'customFoods',
          Subject: 'subjects',
          Homework: 'homeworks',
          GradeGoal: 'gradeGoals',
          Project: 'projects',
          UserSettings: 'userSettings',
        };
        syncedEntities.forEach((entity) => {
          const qk = entityToKey[entity];
          if (qk) qc.invalidateQueries({ queryKey: [qk] });
        });
      });
    };

    runSync();
    const interval = setInterval(runSync, 30000);
    window.addEventListener('online', runSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', runSync);
    };
  }, [user, qc]);
}

// Re-export clearQueue for logout
export { clearQueue };

// ---------------------------------------------------------------------------
// Standalone persistence functions (non-optimistic)
// ---------------------------------------------------------------------------

export async function saveRating(activityId, date, rating) {
  const existing = await getDB().DailyRating.filter({ activity_id: activityId, date }, '-date', 5);
  if (existing.length > 0) {
    return getDB().DailyRating.update(existing[0].id, { rating });
  }
  return getDB().DailyRating.create({ activity_id: activityId, date, rating });
}

export async function saveDayEntry(date, dayRating, thoughts) {
  const existing = await getDB().DayEntry.filter({ date }, '-date', 5);
  if (existing.length > 0) {
    return getDB().DayEntry.update(existing[0].id, { day_rating: dayRating, thoughts });
  }
  return getDB().DayEntry.create({ date, day_rating: dayRating, thoughts });
}