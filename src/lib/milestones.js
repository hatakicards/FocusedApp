import { computeLongestStreak, computeCategoryRank } from './productivity';
import { CATEGORIES } from './constants';

export const MILESTONES = [
  { id: 'disciplinato', titleKey: 'ms_disciplinato', reqKey: 'ms_disciplinato_req', icon: 'Shield' },
  { id: 'getting_better', titleKey: 'ms_getting_better', reqKey: 'ms_getting_better_req', icon: 'TrendingUp' },
  { id: 'super_strength', titleKey: 'ms_super_strength', reqKey: 'ms_super_strength_req', icon: 'Dumbbell' },
  { id: 'intelligence', titleKey: 'ms_intelligence', reqKey: 'ms_intelligence_req', icon: 'Brain' },
  { id: 'target_reacher', titleKey: 'ms_target_reacher', reqKey: 'ms_target_reacher_req', icon: 'Target' },
  { id: 'obsessed', titleKey: 'ms_obsessed', reqKey: 'ms_obsessed_req', icon: 'Activity' },
  { id: 'health_eater', titleKey: 'ms_health_eater', reqKey: 'ms_health_eater_req', icon: 'Heart' },
  { id: 'well_sleeper', titleKey: 'ms_well_sleeper', reqKey: 'ms_well_sleeper_req', icon: 'Moon' },
  { id: 'businessman', titleKey: 'ms_businessman', reqKey: 'ms_businessman_req', icon: 'Briefcase' },
  { id: 'unstoppable', titleKey: 'ms_unstoppable', reqKey: 'ms_unstoppable_req', icon: 'Trophy' },
  { id: 'pro_focused', titleKey: 'ms_pro_focused', reqKey: 'ms_pro_focused_req', icon: 'Award' },
  { id: 'elite_discipline', titleKey: 'ms_elite_discipline', reqKey: 'ms_elite_discipline_req', icon: 'Crown' },
];

const STAT_KEYS = ['forza', 'intelligenza', 'disciplina', 'relazioni', 'autostima', 'prestazione_atletica'];

export function checkMilestone(milestoneId, { activities, ratings, goals, lifeStats, bodyFuelEntries, workDayLogs, settings, lessonGrades }) {
  switch (milestoneId) {
    case 'disciplinato': {
      let maxStreak = 0;
      (activities || []).forEach((a) => {
        const aRatings = (ratings || []).filter((r) => r.activity_id === a.id);
        maxStreak = Math.max(maxStreak, computeLongestStreak(aRatings));
      });
      return maxStreak >= 30;
    }
    case 'getting_better': {
      const list = lifeStats || [];
      if (list.length < 2) return false;
      const baseline = list.find((s) => s.is_baseline) ||
        [...list].sort((a, b) => (a.created_date || '').localeCompare(b.created_date || ''))[0];
      const current = [...list].sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))[0];
      if (!baseline || !current) return false;
      const baselineTotal = STAT_KEYS.reduce((s, k) => s + (baseline[k] || 0), 0);
      const currentTotal = STAT_KEYS.reduce((s, k) => s + (current[k] || 0), 0);
      return (currentTotal - baselineTotal) >= 50;
    }
    case 'super_strength': {
      const list = lifeStats || [];
      if (list.length === 0) return false;
      const current = [...list].sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))[0];
      return (current.forza || 0) >= 80;
    }
    case 'intelligence': {
      const list = lifeStats || [];
      if (list.length === 0) return false;
      const current = [...list].sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))[0];
      return (current.intelligenza || 0) >= 80;
    }
    case 'target_reacher': {
      return (goals || []).filter((g) =>
        g.completed && g.completed_date &&
        (g.difficulty === 'medium' || g.difficulty === 'hard')
      ).length >= 10;
    }
    case 'obsessed': {
      let maxStreak = 0;
      (activities || []).forEach((a) => {
        const aRatings = (ratings || []).filter((r) => r.activity_id === a.id);
        maxStreak = Math.max(maxStreak, computeLongestStreak(aRatings));
      });
      return maxStreak >= 90;
    }
    case 'health_eater': {
      const entries = bodyFuelEntries || [];
      return entries.filter((e) =>
        e.calories_goal > 0 && Math.abs((e.calories_consumed || 0) - e.calories_goal) <= 200
      ).length >= 10;
    }
    case 'well_sleeper': {
      const entries = bodyFuelEntries || [];
      return entries.filter((e) => e.sleep_quality === 5).length >= 10;
    }
    case 'businessman': {
      const logs = workDayLogs || [];
      const goal = settings?.monthly_earnings_goal || 0;
      if (!goal) return false;
      const monthlyTotals = {};
      logs.forEach((l) => {
        const monthKey = (l.date || '').slice(0, 7);
        monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + (l.earnings || 0);
      });
      return Object.values(monthlyTotals).filter((total) => total >= goal).length >= 2;
    }
    case 'unstoppable': {
      let count = 0;
      CATEGORIES.forEach((cat) => {
        const rank = computeCategoryRank(cat.id, activities || [], ratings || [], goals || [], lessonGrades || []);
        if (rank.rankIndex >= 2) count++;
      });
      return count >= 2;
    }
    case 'pro_focused': {
      let count = 0;
      CATEGORIES.forEach((cat) => {
        const rank = computeCategoryRank(cat.id, activities || [], ratings || [], goals || [], lessonGrades || []);
        if (rank.rankIndex >= 3) count++;
      });
      return count >= 2;
    }
    case 'elite_discipline': {
      let count = 0;
      CATEGORIES.forEach((cat) => {
        const rank = computeCategoryRank(cat.id, activities || [], ratings || [], goals || [], lessonGrades || []);
        if (rank.rankIndex >= 4) count++;
      });
      return count >= 2;
    }
    default:
      return false;
  }
}