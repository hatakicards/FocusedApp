import { BookOpen } from 'lucide-react';
import { useT } from '@/lib/i18n';
import BottomSelect from '@/components/BottomSelect';

// Scelta della materia tra quelle gia' aggiunte (pulsante "Materie" in alto), a tendina (1.5:
// niente piu' elenco di pulsanti). Niente testo libero, cosi' i nomi restano uguali ovunque e
// Focusy sa di cosa si parla. Se non ce n'e' nessuna, rimanda ad aggiungerle.
export default function SubjectPicker({ subjects, value, onChange, onManage, placeholder }) {
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
    <BottomSelect
      value={value}
      onValueChange={onChange}
      label={t('ls_materie')}
      placeholder={placeholder || t('sp_scegli')}
      options={subjects.map((s) => ({ value: s, label: s }))}
    />
  );
}
