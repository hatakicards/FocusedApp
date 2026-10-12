import { GRADE_SYSTEMS } from '@/lib/grades';

// Scelta del sistema di valutazione (1–10, 1–30, 1–6, A–F) a pulsanti sempre
// visibili: niente menu a tendina, che su iPhone dentro finestre e drawer non
// si apriva in modo affidabile.
const ORDER = ['scale10', 'scale30', 'scale6', 'letter'];

export default function GradeSystemPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
      {ORDER.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`rounded-lg px-1 py-2 text-xs font-semibold transition-colors ${
            value === k ? 'bg-foreground text-background' : 'text-muted-foreground'
          }`}
        >
          {GRADE_SYSTEMS[k].label}
        </button>
      ))}
    </div>
  );
}
