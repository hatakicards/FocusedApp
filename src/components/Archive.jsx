import { useState } from 'react';
import { Archive as ArchiveIcon, ChevronDown } from 'lucide-react';
import { useI18n, useT } from '@/lib/i18n';

const TYPE_KEYS = { todo: 'type_todo', project: 'type_project', weekly: 'type_weekly', one_time: 'type_one_time' };

export default function Archive({ tasks, ratings }) {
  const { locale } = useI18n();
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const archived = (tasks || []).filter((task) => task.status !== 'active');
  const sorted = [...archived].sort((a, b) =>
    (b.archived_date || b.completed_date || '').localeCompare(a.archived_date || a.completed_date || '')
  );
  const visible = expanded ? sorted : sorted.slice(0, 5);

  if (sorted.length === 0) return null;

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

  const ratingFor = (task) => {
    if (task.rating != null) return task.rating;
    if (!task.linked_activity_id || !ratings) return null;
    const rs = ratings.filter((r) => r.activity_id === task.linked_activity_id);
    if (rs.length === 0) return null;
    const avg = rs.reduce((s, r) => s + r.rating, 0) / rs.length;
    return Math.round(avg * 10) / 10;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <ArchiveIcon size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold">{t('arch_titolo')}</span>
          <span className="text-xs text-muted-foreground">({sorted.length})</span>
        </div>
        <ChevronDown size={18} className={`text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <div className="mt-3 space-y-2">
        {visible.map((task) => {
          const r = ratingFor(task);
          return (
            <div key={task.id} className="rounded-xl bg-foreground/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{task.title}</span>
                {r != null && (
                  <span className="shrink-0 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold">
                    {r}/5
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground">{t(TYPE_KEYS[task.type])}</span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">
                  {task.status === 'done' ? t('arch_completato') + ' ' : t('arch_archiviato') + ' '}
                  {fmtDate(task.completed_date || task.archived_date)}
                </span>
              </div>
            </div>
          );
        })}
        {sorted.length > 5 && !expanded && (
          <button onClick={() => setExpanded(true)} className="w-full text-center text-xs text-muted-foreground py-1">
            {t('arch_vedi_tutti')} ({sorted.length})
          </button>
        )}
      </div>
    </div>
  );
}