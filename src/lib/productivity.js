import { RANKS, RANK_REQUIREMENTS } from './constants';
import { normalizeGrade } from './grades';

export function formatDateISO(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO() {
  return formatDateISO(new Date());
}

// Period key for recurring goals. Daily = date, weekly = Monday date,
// monthly = YYYY-MM, annual = YYYY. Lifetime returns null (single completion).
export function periodKey(date, timeframe) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  if (timeframe === 'daily') return `${y}-${m}-${String(d.getDate()).padStart(2, '0')}`;
  if (timeframe === 'weekly') {
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    return formatDateISO(monday);
  }
  if (timeframe === 'monthly') return `${y}-${m}`;
  if (timeframe === 'annual') return `${y}`;
  return null;
}

export function currentPeriodKey(timeframe) {
  return periodKey(new Date(), timeframe);
}

// Whether a goal is completed in its current period (recurring) or ever (lifetime).
export function isGoalCompletedNow(goal) {
  if (!goal) return false;
  if (goal.timeframe === 'lifetime') return !!goal.completed;
  const periods = goal.completed_periods || [];
  return periods.includes(currentPeriodKey(goal.timeframe));
}

export function dayDiff(date1, date2) {
  const d1 = new Date(date1 + 'T00:00:00');
  const d2 = new Date(date2 + 'T00:00:00');
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function isWithinEditWindow(dateStr) {
  const diff = dayDiff(dateStr, todayISO());
  return diff >= 0 && diff <= 7;
}

export function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatMonthYear(year, month) {
  const d = new Date(year, month, 1);
  return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

export function computeStreak(ratings) {
  if (!ratings || ratings.length === 0) return 0;

  const ratingMap = {};
  ratings.forEach((r) => {
    ratingMap[r.date] = r.rating;
  });

  let streak = 0;
  let prevWasThree = false;
  let foundStart = false;
  const currentDate = new Date();

  for (let i = 0; i < 730; i++) {
    const dateStr = formatDateISO(currentDate);
    const rating = ratingMap[dateStr];

    if (rating === undefined) {
      if (foundStart) break;
      currentDate.setDate(currentDate.getDate() - 1);
      continue;
    }

    foundStart = true;

    if (rating >= 4) {
      streak++;
      prevWasThree = false;
    } else if (rating === 3) {
      if (prevWasThree) break;
      prevWasThree = true;
    } else {
      break;
    }

    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

export function computeLongestStreak(ratings) {
  if (!ratings || ratings.length === 0) return 0;

  const sorted = [...ratings].sort((a, b) => a.date.localeCompare(b.date));

  let longest = 0;
  let current = 0;
  let prevWasThree = false;
  let prevDate = null;

  for (const r of sorted) {
    if (prevDate) {
      const diff = dayDiff(prevDate, r.date);
      if (diff > 1) {
        current = 0;
        prevWasThree = false;
      }
    }

    if (r.rating >= 4) {
      current++;
      prevWasThree = false;
    } else if (r.rating === 3) {
      if (prevWasThree) {
        current = 0;
        prevWasThree = false;
        prevDate = r.date;
        continue;
      }
      prevWasThree = true;
    } else {
      current = 0;
      prevWasThree = false;
    }

    if (current > longest) longest = current;
    prevDate = r.date;
  }

  return longest;
}

export function computeAllFiveStreak(activities, ratings) {
  if (activities.length === 0) return 0;

  const ratingByDate = {};
  ratings.forEach((r) => {
    if (!ratingByDate[r.date]) ratingByDate[r.date] = {};
    ratingByDate[r.date][r.activity_id] = r.rating;
  });

  const sortedDates = Object.keys(ratingByDate).sort();
  let longest = 0;
  let current = 0;
  let prevDate = null;

  for (const date of sortedDates) {
    if (prevDate) {
      if (dayDiff(prevDate, date) !== 1) {
        current = 0;
      }
    }

    const dayRatings = ratingByDate[date];
    const allFive = activities.every((a) => dayRatings[a.id] === 5);

    if (allFive) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }

    prevDate = date;
  }

  return longest;
}

export function computeFocusScore(ratings, dayEntries, goals) {
  const today = todayISO();

  // Average ratings portion (max 80): avg rating × 16
  const allRatings = ratings || [];
  let avgScore = 0;
  if (allRatings.length > 0) {
    const sum = allRatings.reduce((s, r) => s + (r.rating || 0), 0);
    avgScore = (sum / allRatings.length) * 16;
  }
  avgScore = Math.min(80, avgScore);

  // Today day rating portion: day rating × 2 (max 10)
  const todayEntry = (dayEntries || []).find((e) => e.date === today);
  const todayDayRating = todayEntry?.day_rating || 0;
  const dayScore = todayDayRating * 2;

  // Goal portion: points per goal completed in current period
  const GOAL_POINTS = {
    daily: { easy: 2, medium: 5, hard: 8 },
    weekly: { easy: 3, medium: 6, hard: 10 },
    monthly: { easy: 7, medium: 10, hard: 13 },
    annual: { easy: 8, medium: 12, hard: 17 },
    lifetime: { easy: 8, medium: 12, hard: 17 },
  };
  let goalScore = 0;
  (goals || []).forEach((g) => {
    if (isGoalCompletedNow(g)) {
      goalScore += GOAL_POINTS[g.timeframe]?.[g.difficulty] || 0;
    }
  });

  return Math.min(100, Math.floor(avgScore + dayScore + goalScore));
}

export function computeFocusScoreForDate(ratings, dayEntries, goals, dateStr) {
  // Ratings up to and including dateStr
  const ratingsUpToDate = (ratings || []).filter((r) => r.date <= dateStr);

  // Average ratings portion (max 80): avg rating × 16
  let avgScore = 0;
  if (ratingsUpToDate.length > 0) {
    const sum = ratingsUpToDate.reduce((s, r) => s + (r.rating || 0), 0);
    avgScore = (sum / ratingsUpToDate.length) * 16;
  }
  avgScore = Math.min(80, avgScore);

  // Day rating for this date (max 10): day rating × 2
  const dayEntry = (dayEntries || []).find((e) => e.date === dateStr);
  const dayRating = dayEntry?.day_rating || 0;
  const dayScore = dayRating * 2;

  // Goal portion: points per goal completed as of this date
  const GOAL_POINTS = {
    daily: { easy: 2, medium: 5, hard: 8 },
    weekly: { easy: 3, medium: 6, hard: 10 },
    monthly: { easy: 7, medium: 10, hard: 13 },
    annual: { easy: 8, medium: 12, hard: 17 },
    lifetime: { easy: 8, medium: 12, hard: 17 },
  };
  let goalScore = 0;
  (goals || []).forEach((g) => {
    let completed = false;
    if (g.timeframe === 'lifetime') {
      completed = !!g.completed && (!g.completed_date || g.completed_date <= dateStr);
    } else {
      const periods = g.completed_periods || [];
      completed = periods.includes(periodKey(dateStr, g.timeframe));
    }
    if (completed) {
      goalScore += GOAL_POINTS[g.timeframe]?.[g.difficulty] || 0;
    }
  });

  return Math.min(100, Math.floor(avgScore + dayScore + goalScore));
}

export function computeCategoryMetrics(categoryId, activities, allRatings, goals) {
  const catActivities = activities.filter((a) => a.category === categoryId);
  const catActivityIds = new Set(catActivities.map((a) => a.id));
  const catRatings = allRatings.filter((r) => catActivityIds.has(r.activity_id));
  const catGoals = goals.filter((g) => catActivityIds.has(g.activity_id));

  const maxStreak = catActivities.reduce((max, a) => {
    const aRatings = catRatings.filter((r) => r.activity_id === a.id);
    return Math.max(max, computeStreak(aRatings));
  }, 0);

  const completedGoals = catGoals.filter((g) => isGoalCompletedNow(g));
  const easyGoals = completedGoals.filter((g) => g.difficulty === 'easy').length;
  const mediumGoals = completedGoals.filter((g) => g.difficulty === 'medium').length;
  const hardGoals = completedGoals.filter((g) => g.difficulty === 'hard').length;
  const fiveDays = catRatings.filter((r) => r.rating === 5).length;
  const allFiveStreak = computeAllFiveStreak(catActivities, catRatings);

  return { maxStreak, easyGoals, mediumGoals, hardGoals, fiveDays, allFiveStreak };
}

export function checkRankRequirement(reqId, metrics) {
  switch (reqId) {
    case 'streak_week':
      return metrics.maxStreak >= 7;
    case 'streak_month':
      return metrics.maxStreak >= 30;
    case 'streak_2weeks':
      return metrics.maxStreak >= 14;
    case 'goal_easy':
      return metrics.easyGoals > 0;
    case 'goal_medium':
      return metrics.mediumGoals + metrics.hardGoals > 0;
    case 'goal_hard':
      return metrics.hardGoals > 0;
    case 'five_days_20':
      return metrics.fiveDays >= 20;
    case 'all_five_5':
      return metrics.allFiveStreak >= 5;
    case 'grade_above_90':
      return metrics.gradesAbove90 > 0;
    case 'avg_above_80':
      return metrics.avgNormalized >= 80;
    case 'grade_above_85_3':
      return metrics.gradesAbove85 >= 3;
    case 'grade_above_85_5':
      return metrics.gradesAbove85 >= 5;
    case 'grade_above_85_10':
      return metrics.gradesAbove85 >= 10;
    default:
      return false;
  }
}

export function computeStudiesMetrics(allGrades) {
  const grades = allGrades || [];
  const normalized = grades.map((g) => normalizeGrade(g.grade, g.grade_system));
  const gradesAbove90 = normalized.filter((n) => n >= 90).length;
  const gradesAbove85 = normalized.filter((n) => n >= 85).length;
  const avgNormalized = grades.length ? normalized.reduce((s, n) => s + n, 0) / grades.length : 0;
  return { gradesAbove90, gradesAbove85, avgNormalized };
}

export function computeCategoryRank(categoryId, activities, allRatings, goals, allGrades) {
  const metrics = categoryId === 'studies'
    ? computeStudiesMetrics(allGrades)
    : computeCategoryMetrics(categoryId, activities, allRatings, goals);
  const reqDefs = RANK_REQUIREMENTS[categoryId] || [];
  const requirements = reqDefs.map((r) => ({
    ...r,
    completed: checkRankRequirement(r.id, metrics),
  }));
  const completedCount = requirements.filter((r) => r.completed).length;

  let rank = null;
  let rankIndex = -1;
  if (completedCount > 0) {
    rankIndex = Math.min(completedCount - 1, RANKS.length - 1);
    rank = RANKS[rankIndex];
  }

  return {
    rank,
    rankIndex,
    requirements,
    completedCount,
    metrics,
  };
}