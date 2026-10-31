import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { getDB } from '@/lib/guestDB';
import { useInvalidateAll, useUserSettings } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';

// Il sogno dell'utente in Profilo, sempre modificabile: al benvenuto c'e' chi lo salta o scrive
// qualcosa a caso. Lo stesso testo finisce nella schermata di blocco di Focus Time e nei consigli di Focusy.
export default function DreamCard() {
  const t = useT();
  const { data: settings } = useUserSettings();
  const invalidate = useInvalidateAll();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const dream = (settings?.dream || '').trim();

  const start = () => { setValue(dream); setEditing(true); };
  const save = async () => {
    if (!settings?.id) return;
    setSaving(true);
    try {
      await getDB().UserSettings.update(settings.id, { dream: value.trim() });
      invalidate();
      setEditing(false);
    } catch (e) {
      console.error('Dream save failed', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('profilo_dream_t')}</p>
        {!editing && (
          <button onClick={start} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Pencil size={12} /> {t('profilo_dream_edit')}
          </button>
        )}
      </div>
      {editing ? (
        <>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            maxLength={200}
            placeholder={t('wl_dream_ph')}
            className="mt-1 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold">{t('annulla')}</button>
            <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-40">{t('salva')}</button>
          </div>
        </>
      ) : (
        <p className={`text-sm ${dream ? 'font-medium' : 'text-muted-foreground'}`}>{dream || t('profilo_dream_empty')}</p>
      )}
    </div>
  );
}
