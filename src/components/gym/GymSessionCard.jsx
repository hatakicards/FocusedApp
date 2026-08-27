import { useState, useEffect } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { useOptimisticGymSessionSave } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';

export default function GymSessionCard({ session }) {
  const t = useT();
  const optimisticSave = useOptimisticGymSessionSave();
  const [title, setTitle] = useState(session.title || '');
  const [exercises, setExercises] = useState(session.exercises || []);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTitle(session.title || '');
    setExercises(session.exercises || []);
  }, [session.id]);

  const addExercise = () => setExercises([...exercises, { name: '', info: '' }]);

  const updateExercise = (idx, field, val) =>
    setExercises(exercises.map((ex, i) => (i === idx ? { ...ex, [field]: val } : ex)));

  const removeExercise = (idx) => setExercises(exercises.filter((_, i) => i !== idx));

  const handleSave = () => {
    const payload = {
      title: title.trim() || t('gsc_allenamento'),
      exercises: exercises.filter((e) => e.name.trim()),
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
        {exercises.map((ex, idx) => (
          <div key={idx} className="rounded-xl border border-border bg-background p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={ex.name}
                onChange={(e) => updateExercise(idx, 'name', e.target.value)}
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
              onChange={(e) => updateExercise(idx, 'info', e.target.value)}
              placeholder={t('gsc_info_ph')}
              rows={2}
              className="w-full bg-transparent text-xs text-muted-foreground outline-none resize-none"
            />
          </div>
        ))}
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