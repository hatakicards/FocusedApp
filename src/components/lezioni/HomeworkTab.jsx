import { useState } from 'react';
import { Plus, Trash2, Check, Calendar, Focus } from 'lucide-react';
import { useHomeworks, useOptimisticHomeworkSave, useOptimisticHomeworkUpdate, useOptimisticHomeworkDelete } from '@/lib/useAppData';
import { useT, useI18n } from '@/lib/i18n';
import { todayISO } from '@/lib/productivity';

const DIFFICULTIES = ['quick', 'medium', 'heavy'];

export default function HomeworkTab({ subjects, onOpenFocus }) {
  const t = useT();
  const { locale } = useI18n();
  const { data: homeworks } = useHomeworks();
  const optimisticSave = useOptimisticHomeworkSave();
  const optimisticUpdate = useOptimisticHomeworkUpdate();
  const optimisticDelete = useOptimisticHomeworkDelete();
  const today = todayISO();

  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [difficulty, setDifficulty] = useState('medium');

  const all = homeworks || [];
  const pending = [...all]
    .filter((h) => h.status !== 'done')
    .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
  const done = [...all]
    .filter((h) => h.status === 'done')
    .sort((a, b) => (b.completed_date || '').localeCompare(a.completed_date || ''))
    .slice(0, 10);

  const handleAdd = async () => {
    if (!subject.trim() || !title.trim()) return;
    const subj = subject.trim();
    const ttl = title.trim();
    const due = dueDate;
    setSubject('');
    setTitle('');
    setDueDate('');
    setDifficulty('medium');
    await optimisticSave(null, {
      subject: subj,
      title: ttl,
      due_date: due || null,
      difficulty,
      status: 'pending',
    });
  };

  const handleComplete = async (h) => {
    await optimisticUpdate(h.id, { status: 'done', completed_date: today });
  };

  const handleDelete = async (id) => {
    await optimisticDelete(id);
  };

  const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('hw_nuovo')}</p>
        <div className="space-y-2">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('ls_materia_ph')}
            list="subjects-list"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('hw_titolo_ph')}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
          />
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors border ${difficulty === d ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'}`}
              >
                {t('hw_diff_' + d)}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!subject.trim() || !title.trim()}
          className="mt-3 w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Plus size={16} /> {t('hw_aggiungi')}
        </button>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('hw_pendenti')}</p>
      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t('hw_nessuno')}</p>
      ) : (
        <div className="space-y-2 mb-6">
          {pending.map((h) => (
            <div key={h.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{h.subject} — {h.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <span className="capitalize">{t('hw_diff_' + h.difficulty)}</span>
                    {h.due_date && (
                      <span className="flex items-center gap-1"><Calendar size={11} /> {fmtDate(h.due_date)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onOpenFocus?.(h)} className="rounded-lg p-2 text-muted-foreground hover:text-foreground" title={t('hw_avvia_focus')}>
                    <Focus size={16} />
                  </button>
                  <button onClick={() => handleComplete(h)} className="rounded-lg p-2 bg-foreground text-background">
                    <Check size={16} />
                  </button>
                  <button onClick={() => handleDelete(h.id)} className="rounded-lg p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('hw_completati')}</p>
          <div className="space-y-2">
            {done.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 opacity-60">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate line-through">{h.subject} — {h.title}</p>
                </div>
                <button onClick={() => handleDelete(h.id)} className="text-muted-foreground hover:text-destructive shrink-0 ml-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
