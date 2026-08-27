import { useState } from 'react';
import { AlertCircle, Plus, CheckCircle2 } from 'lucide-react';
import { getDB } from '@/lib/guestDB';
import { useT } from '@/lib/i18n';
import { normalizeGrade } from '@/lib/grades';

export default function RecoveryTasks({ grades, tasks, onCreated }) {
  const t = useT();
  const [creating, setCreating] = useState(null);
  const [created, setCreated] = useState(false);

  // Find grades below 60 (normalized) that don't have a recovery task yet
  const lowGrades = grades
    .filter((g) => {
      const norm = normalizeGrade(g.grade, g.grade_system);
      return norm < 60;
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  // Check which already have recovery tasks
  const existingTaskTitles = new Set(
    (tasks || []).map((task) => task.title?.toLowerCase() || '')
  );

  const suggestions = lowGrades.filter((g) => {
    const suggestedTitle = `${t('recovery_prefix')} ${g.subject}`;
    return !existingTaskTitles.has(suggestedTitle.toLowerCase());
  });

  if (suggestions.length === 0) return null;

  const handleCreate = async (grade) => {
    setCreating(grade.id);
    try {
      const title = `${t('recovery_prefix')} ${grade.subject}`;
      await getDB().TaskItem.create({
        title,
        type: 'todo',
        notes: `${t('recovery_note')} ${grade.subject} — ${t('recovery_grade')}: ${grade.grade}`,
        status: 'active',
      });
      setCreated(true);
      onCreated?.();
      setTimeout(() => setCreated(false), 2000);
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle size={16} className="text-amber-500" />
        <p className="text-xs font-semibold text-amber-500">{t('recovery_title')}</p>
      </div>
      <div className="space-y-2">
        {suggestions.map((g) => (
          <div key={g.id} className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{g.subject}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(g.date + 'T00:00:00').toLocaleDateString()} · {t('recovery_grade')}: {g.grade}
              </p>
            </div>
            <button
              onClick={() => handleCreate(g)}
              disabled={creating === g.id}
              className="shrink-0 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-500 disabled:opacity-40 flex items-center gap-1"
            >
              {creating === g.id ? (
                <>{created ? <CheckCircle2 size={14} /> : <Plus size={14} className="animate-spin" />} {created ? t('recovery_created') : t('salvataggio')}</>
              ) : (
                <><Plus size={14} /> {t('recovery_create')}</>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}