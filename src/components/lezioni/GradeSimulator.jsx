import { useState, useMemo } from 'react';
import { Calculator, Target, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GRADE_SYSTEMS, normalizeGrade, formatGrade } from '@/lib/grades';
import { useT } from '@/lib/i18n';
import GradeSystemPicker from '@/components/lezioni/GradeSystemPicker';
import SubjectPicker from '@/components/lezioni/SubjectPicker';
import { parseGradeNumber } from '@/lib/grades';

export default function GradeSimulator({ grades, onManageSubjects }) {
  const t = useT();
  const [subject, setSubject] = useState('');
  const [targetAvg, setTargetAvg] = useState('');
  const [system, setSystem] = useState('scale10');

  const subjects = useMemo(
    () => [...new Set(grades.map((g) => g.subject).filter(Boolean))].sort(),
    [grades]
  );

  const subjectGrades = useMemo(
    () => grades.filter((g) => g.subject === subject).sort((a, b) => a.date.localeCompare(b.date)),
    [grades, subject]
  );

  const result = useMemo(() => {
    if (!subject || !targetAvg || subjectGrades.length === 0) return null;
    const target = parseGradeNumber(targetAvg);
    if (target == null || isNaN(target)) return null;

    const sys = GRADE_SYSTEMS[system] || GRADE_SYSTEMS.scale10;
    const targetNorm = normalizeGrade(target, system);
    const currentSum = subjectGrades.reduce((s, g) => s + normalizeGrade(g.grade, g.grade_system), 0);
    const currentCount = subjectGrades.length;
    const currentAvgNorm = currentSum / currentCount;

    // needed normalized grade on next test: (target * (n+1) - currentSum) / 1
    const neededNorm = (targetNorm * (currentCount + 1) - currentSum);

    if (targetNorm <= currentAvgNorm) {
      return { status: 'reached', currentAvgNorm, targetNorm };
    }
    if (neededNorm > 100) {
      return { status: 'impossible', neededNorm, targetNorm };
    }
    // Convert neededNorm back to the selected system's scale
    const neededGrade = (neededNorm / 100) * (sys.max - sys.min) + sys.min;
    return { status: 'ok', neededGrade, neededNorm, currentAvgNorm, targetNorm, sys };
  }, [subject, targetAvg, system, subjectGrades]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={18} className="text-blue-500" />
        <h3 className="text-sm font-semibold">{t('sim_title')}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{t('sim_desc')}</p>

      <div className="space-y-3">
        <SubjectPicker subjects={subjects} value={subject} onChange={setSubject} onManage={onManageSubjects} />
        <GradeSystemPicker value={system} onChange={(v) => { setSystem(v); setTargetAvg(''); }} />
        <input
          type="text"
          inputMode="decimal"
          value={targetAvg}
          onChange={(e) => setTargetAvg(e.target.value)}
          placeholder={t('sim_target_ph')}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
        />
      </div>

      {result && (
        <div className="mt-4 rounded-xl border border-border bg-background p-3">
          {result.status === 'reached' && (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 size={18} />
              <p className="text-sm font-medium">{t('sim_already_reached')}</p>
            </div>
          )}
          {result.status === 'impossible' && (
            <div className="flex items-start gap-2 text-amber-500">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t('sim_impossible')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('sim_impossible_desc')}</p>
              </div>
            </div>
          )}
          {result.status === 'ok' && (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                <Target size={22} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('sim_next_test')}</p>
                <p className="text-2xl font-bold tabular-nums text-blue-500">
                  {formatGrade(Math.round(result.neededGrade * 10) / 10, system)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('sim_current_avg')}: {Math.round(result.currentAvgNorm)}/100 → {t('sim_target')}: {Math.round(result.targetNorm)}/100
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {!result && subject && subjectGrades.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground text-center py-2">{t('sim_no_grades')}</p>
      )}
    </div>
  );
}