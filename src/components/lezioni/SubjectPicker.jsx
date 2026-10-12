import { BookOpen } from 'lucide-react';
import { useT } from '@/lib/i18n';

// Scelta della materia tra quelle gia' aggiunte (pulsante "Materie" in alto):
// niente testo libero, cosi' i nomi restano uguali ovunque e Focusy sa di cosa
// si parla. Se non ce n'e' nessuna, rimanda ad aggiungerle.
export default function SubjectPicker({ subjects, value, onChange, onManage }) {
  const t = useT();
  if (!subjects || subjects.length === 0) {
    return (
      <button
        type="button"
        onClick={onManage}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-3 text-xs font-semibold text-muted-foreground"
      >
        <BookOpen size={14} /> {t('sp_aggiungi_materie')}
      </button>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {subjects.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            value === s ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
