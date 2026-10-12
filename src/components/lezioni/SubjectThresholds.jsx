import { useState, useMemo } from 'react';
import { Shield, AlertTriangle, Plus, X } from 'lucide-react';
import { getDB } from '@/lib/guestDB';
import { GRADE_SYSTEMS, normalizeGrade } from '@/lib/grades';
import { useT } from '@/lib/i18n';
import GradeSystemPicker from '@/components/lezioni/GradeSystemPicker';
import SubjectPicker from '@/components/lezioni/SubjectPicker';
import { parseGradeNumber } from '@/lib/grades';

export default function SubjectThresholds({ grades, settings, onSaved, onManageSubjects }) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newThreshold, setNewThreshold] = useState('');
  const [system, setSystem] = useState('scale10');
  const [saving, setSaving] = useState(false);

  const thresholds = settings?.grade_thresholds || {};

  const subjectsWithGrades = useMemo(
    () => [...new Set(grades.map((g) => g.subject).filter(Boolean))].sort(),
    [grades]
  );

  const subjectAverages = useMemo(() => {
    const map = {};
    grades.forEach((g) => {
      if (!g.subject) return;
      if (!map[g.subject]) map[g.subject] = [];
      map[g.subject].push(normalizeGrade(g.grade, g.grade_system));
    });
    Object.keys(map).forEach((s) => {
      map[s] = map[s].reduce((a, b) => a + b, 0) / map[s].length;
    });
    return map;
  }, [grades]);

  const warnings = Object.entries(thresholds).filter(([subj, thresh]) => {
    const avg = subjectAverages[subj];
    return avg != null && avg < thresh;
  });

  const handleAdd = async () => {
    if (!newSubject.trim() || !newThreshold) return;
    const sys = GRADE_SYSTEMS[system] || GRADE_SYSTEMS.scale10;
    const norm = normalizeGrade(parseGradeNumber(newThreshold) ?? NaN, system);
    setSaving(true);
    try {
      const updated = { ...thresholds, [newSubject.trim()]: norm };
      await getDB().UserSettings.update(settings.id, { grade_thresholds: updated });
      setNewSubject('');
      setNewThreshold('');
      setAdding(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (subj) => {
    const updated = { ...thresholds };
    delete updated[subj];
    await getDB().UserSettings.update(settings.id, { grade_thresholds: updated });
    onSaved?.();
  };

  return (
    <div className="mb-6">
      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 mb-4">
          {warnings.map(([subj, thresh]) => (
            <div key={subj} className="flex items-center gap-2 mb-1.5 last:mb-0">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <p className="text-xs text-amber-500">
                <span className="font-semibold">{subj}</span>: {t('threshold_warning_desc')}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-blue-500" />
            <h3 className="text-sm font-semibold">{t('threshold_title')}</h3>
          </div>
          {!adding && (
            <button onClick={() => setAdding(true)} className="text-muted-foreground hover:text-foreground">
              <Plus size={18} />
            </button>
          )}
        </div>

        {adding && (
          <div className="space-y-2 mb-3">
            <SubjectPicker subjects={subjectsWithGrades} value={newSubject} onChange={setNewSubject} onManage={onManageSubjects} />
            <GradeSystemPicker value={system} onChange={(v) => { setSystem(v); setNewThreshold(''); }} />
            <input
              type="text"
              inputMode="decimal"
              value={newThreshold}
              onChange={(e) => setNewThreshold(e.target.value)}
              placeholder={t('threshold_min_ph')}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !newSubject.trim() || !newThreshold}
                className="flex-1 rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-40"
              >
                {saving ? t('salvataggio') : t('salva')}
              </button>
              <button onClick={() => setAdding(false)} className="rounded-xl px-4 py-2.5 text-sm text-muted-foreground">
                {t('annulla')}
              </button>
            </div>
          </div>
        )}

        {Object.keys(thresholds).length === 0 && !adding ? (
          <p className="text-xs text-muted-foreground text-center py-3">{t('threshold_empty')}</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(thresholds).map(([subj, thresh]) => {
              const avg = subjectAverages[subj];
              const below = avg != null && avg < thresh;
              return (
                <div
                  key={subj}
                  className={`flex items-center justify-between rounded-xl border p-2.5 ${
                    below ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-background'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{subj}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('threshold_min')}: {Math.round(thresh)}/100
                      {avg != null && ` · ${t('sim_current_avg')}: ${Math.round(avg)}/100`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {below && <AlertTriangle size={16} className="text-amber-500" />}
                    <button onClick={() => handleRemove(subj)} className="text-muted-foreground hover:text-destructive">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}