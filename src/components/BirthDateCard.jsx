import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { getDB } from '@/lib/guestDB';
import { useInvalidateAll, useUserSettings } from '@/lib/useAppData';
import { useI18n, useT } from '@/lib/i18n';
import { birthDateBounds, isPlausibleBirthDate } from '@/lib/ageCheck';

// Data di nascita in Profilo, modificabile: da qui dipendono le ore di sonno consigliate, le calorie e
// le regole per i minorenni. Una data sbagliata (per esempio quella di oggi, che la rotella dell'iPhone
// propone da sola) falsava tutto, e prima non c'era modo di correggerla.
export default function BirthDateCard() {
  const t = useT();
  const { locale } = useI18n();
  const { data: settings } = useUserSettings();
  const invalidate = useInvalidateAll();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const stored = settings?.birth_date || '';
  const valid = isPlausibleBirthDate(stored);
  const bounds = birthDateBounds();

  const start = () => { setValue(valid ? stored : ''); setError(''); setEditing(true); };
  const save = async () => {
    if (!settings?.id) return;
    if (!isPlausibleBirthDate(value)) {
      setError(t('age_invalid'));
      return;
    }
    setSaving(true);
    try {
      await getDB().UserSettings.update(settings.id, { birth_date: value });
      invalidate();
      setEditing(false);
    } catch (e) {
      console.error('Birth date save failed', e);
      setError(t('age_invalid'));
    } finally {
      setSaving(false);
    }
  };

  const label = valid
    ? new Date(`${stored}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('profilo_birth_t')}</p>
        {!editing && (
          <button onClick={start} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Pencil size={12} /> {t('profilo_dream_edit')}
          </button>
        )}
      </div>
      {editing ? (
        <>
          <input
            type="date"
            value={value}
            min={bounds.min}
            max={bounds.max}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
          />
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold">{t('annulla')}</button>
            <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-40">{t('salva')}</button>
          </div>
        </>
      ) : (
        <p className={`text-sm ${valid ? 'font-medium' : 'text-muted-foreground'}`}>{label || t('profilo_birth_empty')}</p>
      )}
    </div>
  );
}
