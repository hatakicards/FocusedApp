import { useI18n, weekdayShortById } from '@/lib/i18n';

export const DAYS = [
  { id: 'monday', short: 'Lun', name: 'Lunedì' },
  { id: 'tuesday', short: 'Mar', name: 'Martedì' },
  { id: 'wednesday', short: 'Mer', name: 'Mercoledì' },
  { id: 'thursday', short: 'Gio', name: 'Giovedì' },
  { id: 'friday', short: 'Ven', name: 'Venerdì' },
  { id: 'saturday', short: 'Sab', name: 'Sabato' },
  { id: 'sunday', short: 'Dom', name: 'Domenica' },
];

export default function DaySelector({ selected, onToggle, pending }) {
  const { locale } = useI18n();
  return (
    <div className="grid grid-cols-7 gap-2">
      {DAYS.map((d) => {
        const on = selected.has(d.id);
        const busy = pending === d.id;
        return (
          <button
            key={d.id}
            onClick={() => onToggle(d.id)}
            disabled={busy}
            className={`flex flex-col items-center justify-center rounded-xl py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
              on ? 'bg-foreground text-background' : 'bg-background text-muted-foreground border border-border'
            }`}
          >
            {busy ? '…' : weekdayShortById(locale, d.id)}
          </button>
        );
      })}
    </div>
  );
}