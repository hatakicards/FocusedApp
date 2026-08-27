import { normalizeGrade } from './grades';

const DIFFICULTY_SCORE = { heavy: 90, medium: 55, quick: 25 };

function urgencyScore(dueDate) {
  if (!dueDate) return 10;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const daysLeft = Math.round((due - today) / 86400000);
  if (daysLeft < 0) return 100;
  if (daysLeft === 0) return 90;
  if (daysLeft <= 2) return 75;
  if (daysLeft <= 4) return 55;
  if (daysLeft <= 7) return 35;
  return 15;
}

export function averageNormalizedGradeForSubject(subject, grades, verifiche) {
  const entries = [
    ...(grades || []).filter((g) => g.subject === subject).map((g) => normalizeGrade(g.grade, g.grade_system)),
    ...(verifiche || [])
      .filter((v) => v.subject === subject && v.status === 'completed' && v.grade != null)
      .map((v) => normalizeGrade(v.grade, v.grade_system)),
  ];
  if (!entries.length) return null;
  return entries.reduce((sum, n) => sum + n, 0) / entries.length;
}

function subjectGapScore(subject, gradeGoals, grades, verifiche) {
  const goal = (gradeGoals || []).find((g) => g.subject === subject);
  if (!goal) return 0;
  const avg = averageNormalizedGradeForSubject(subject, grades, verifiche);
  if (avg == null) return 30;
  const gap = normalizeGrade(goal.grade, goal.grade_system) - avg;
  return Math.min(100, Math.max(0, gap));
}

// Punteggio 0-100: quanto un compito pending merita attenzione ora.
// 45% urgenza scadenza, 25% difficoltà, 30% quanto la materia è indietro rispetto al grade goal.
export function computeHomeworkPriority(homework, { gradeGoals, grades, verifiche } = {}) {
  const u = urgencyScore(homework.due_date);
  const d = DIFFICULTY_SCORE[homework.difficulty] ?? DIFFICULTY_SCORE.medium;
  const g = subjectGapScore(homework.subject, gradeGoals, grades, verifiche);
  return Math.round(0.45 * u + 0.25 * d + 0.3 * g);
}

export function priorityTier(score) {
  if (score >= 70) return 'urgent';
  if (score >= 40) return 'soon';
  return 'later';
}

export function sortHomeworkByPriority(homeworks, ctx) {
  return (homeworks || [])
    .filter((h) => h.status === 'pending')
    .map((h) => ({ ...h, priorityScore: computeHomeworkPriority(h, ctx) }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}
