import { useState } from 'react';
import { Plus, Trash2, Target } from 'lucide-react';
import { useGradeGoals, useOptimisticGradeGoalSave, useOptimisticGradeGoalDelete } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';
import { GRADE_SYSTEMS, formatGrade, normalizeGrade } from '@/lib/grades';
import { averageNormalizedGradeForSubject } from '@/lib/studyPriority';
import BottomSelect from '@/components/BottomSelect';
import { GradeInput, resolveGrade } from '@/components/lezioni/GradeInput';

export default function GradeGoals({ subjects, grades, verifiche }) {
  const t = useT();
  const { data: gradeGoals } = useGradeGoals();
  const optimisticSave = useOptimisticGradeGoalSave();
  const optimisticDelete = useOptimisticGradeGoalDelete();

  const [subject, setSubject] = useState('');
  const [system, setSystem] = useState('scale10');
  const [gradeVal, setGradeVal] = useState('');

  const goals = gradeGoals || [];

  const handleSave = async () => {
    if (!subject.trim() || !gradeVal) return;
    const numericGrade = resolveGrade(gradeVal, system);
    if (numericGrade == null) return;
    const subj = subject.trim();
    const existing = goals.find((g) => g.subject === subj) || null;
    setSubject('');
    setGradeVal('');
    await optimisticSave(existing, { subject: subj, grade: numericGrade, grade_system: system });
  };

  const handleDelete = async (id) => {
    await optimisticDelete(id);
  };

  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('gg_nuovo')}</p>
        <div className="space-y-2">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('ls_materia_ph')}
            list="subjects-list"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
          />
          <div className="flex gap-2">
            <div className="shrink-0 w-32">
              <BottomSelect
                value={system}
                onValueChange={(v) => { setSystem(v); setGradeVal(''); }}
                options={Object.entries(GRADE_SYSTEMS).map(([k, v]) => ({ value: k, label: v.label }))}
              />
            </div>
            <GradeInput system={system} value={gradeVal} onChange={setGradeVal} placeholder={t('ls_voto_ph')} />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!subject.trim() || !gradeVal}
          className="mt-3 w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Plus size={16} /> {t('gg_salva_obiettivo')}
        </button>
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t('gg_nessuno')}</p>
      ) : (
        <div className="space-y-2">
          {goals.map((g) => {
            const avg = averageNormalizedGradeForSubject(g.subject, grades, verifiche);
            const goalNormalized = normalizeGrade(g.grade, g.grade_system);
            const reached = avg != null && avg >= goalNormalized;
            return (
              <div key={g.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <Target size={16} className={reached ? 'text-emerald-500' : 'text-amber-500'} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{g.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('gg_obiettivo')}: {formatGrade(g.grade, g.grade_system)} · {t('gg_attuale')}: {avg != null ? `${Math.round(avg)}/100` : t('gg_nessun_voto')}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(g.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
