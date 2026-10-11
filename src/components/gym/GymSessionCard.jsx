import { useState, useEffect } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { useOptimisticGymSessionSave } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { normalizeExercise, toPositiveInt, toPositiveNumber } from '@/lib/gymSession';

const NUM_INPUT = 'w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm tabular-nums outline-none';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export default function GymSessionCard({ session }) {
  const t = useT();
  const optimisticSave = useOptimisticGymSessionSave();
  const [title, setTitle] = useState(session.title || '');
  const [exercises, setExercises] = useState((session.exercises || []).map(normalizeExercise));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTitle(session.title || '');
    setExercises((session.exercises || []).map(normalizeExercise));
  }, [session.id]);

  const addExercise = () => setExercises([...exercises, normalizeExercise({ sets: 3 })]);

  const updateExercise = (idx, patch) =>
    setExercises(exercises.map((ex, i) => (i === idx ? { ...ex, ...patch } : ex)));

  const removeExercise = (idx) => setExercises(exercises.filter((_, i) => i !== idx));

  const handleSave = () => {
    const payload = {
      title: title.trim() || t('gsc_allenamento'),
      exercises: exercises
        .filter((e) => e.name.trim())
        .map((e) => ({
          name: e.name.trim(),
          info: e.info.trim(),
          mode: e.mode,
          reps: e.mode === 'reps' ? toPositiveInt(e.reps) : '',
          duration: e.mode === 'time' ? toPositiveInt(e.duration) : '',
          weight: toPositiveNumber(e.weight),
          sets: toPositiveInt(e.sets) || 1,
        })),
    };
    // Show "saved" immediately — optimistic update already in cache
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    // Server call runs in background
    optimisticSave(session, payload).catch(console.error);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('gsc_titolo_ph')}
        className="w-full bg-transparent text-sm font-semibold outline-none border-b border-border pb-2"
      />

      <div className="space-y-2">
        {exercises.map((ex, idx) => {
          const isReps = ex.mode === 'reps';
          return (
            <div key={idx} className="rounded-xl border border-border bg-background p-3 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  value={ex.name}
                  onChange={(e) => updateExercise(idx, { name: e.target.value })}
                  placeholder={t('gsc_nome_es')}
                  className="flex-1 bg-transparent text-sm font-medium outline-none"
                />
                <button
                  onClick={() => removeExercise(idx)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <textarea
                value={ex.info}
                onChange={(e) => updateExercise(idx, { info: e.target.value })}
                placeholder={t('gsc_info_ph')}
                rows={2}
                className="w-full bg-transparent text-xs text-muted-foreground outline-none resize-none"
              />

              <div className="flex items-center justify-center gap-3 rounded-lg bg-muted/40 py-2">
                <span className={cn('text-xs', !isReps ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{t('gex_a_tempo')}</span>
                <Switch
                  checked={isReps}
                  onCheckedChange={(on) => updateExercise(idx, { mode: on ? 'reps' : 'time' })}
                  aria-label={`${t('gex_a_tempo')} / ${t('gex_ripetizioni')}`}
                />
                <span className={cn('text-xs', isReps ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{t('gex_ripetizioni')}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Field label={t('gex_serie')}>
                  <input
                    inputMode="numeric"
                    value={ex.sets}
                    onChange={(e) => updateExercise(idx, { sets: e.target.value.replace(/\D/g, '') })}
                    className={NUM_INPUT}
                  />
                </Field>
                {isReps ? (
                  <Field label={t('gex_n_reps')}>
                    <input
                      inputMode="numeric"
                      value={ex.reps}
                      onChange={(e) => updateExercise(idx, { reps: e.target.value.replace(/\D/g, '') })}
                      className={NUM_INPUT}
                    />
                  </Field>
                ) : (
                  <Field label={t('gex_durata')}>
                    <input
                      inputMode="numeric"
                      value={ex.duration}
                      onChange={(e) => updateExercise(idx, { duration: e.target.value.replace(/\D/g, '') })}
                      className={NUM_INPUT}
                    />
                  </Field>
                )}
                <Field label="kg">
                  <input
                    inputMode="decimal"
                    value={ex.weight}
                    onChange={(e) => updateExercise(idx, { weight: e.target.value.replace(/[^\d.,]/g, '') })}
                    className={NUM_INPUT}
                    aria-label={t('gex_peso')}
                  />
                </Field>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={addExercise}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus size={16} /> {t('gsc_aggiungi_es')}
      </button>

      <button
        onClick={handleSave}
        className="w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background flex items-center justify-center gap-2"
      >
        {saved ? (
          <>
            <Check size={16} /> {t('oggi_salvato')}
          </>
        ) : (
          t('gsc_salva_scheda')
        )}
      </button>
    </div>
  );
}
