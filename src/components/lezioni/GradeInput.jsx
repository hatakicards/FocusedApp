import { GRADE_SYSTEMS, formatLetterGrade, parseGradeNumber, parseLetterGrade } from '@/lib/grades';

const LETTER_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

// Voto in lettere (A–F): si sceglie toccando, non si scrive. Accetta anche un
// valore numerico (es. quando si modifica un voto gia' salvato) e lo converte.
function LetterGradePicker({ value, onChange }) {
  const asNumber = parseFloat(value);
  const current = Number.isFinite(asNumber) && String(value).trim() !== '' && !/[a-z]/i.test(String(value))
    ? formatLetterGrade(asNumber)
    : String(value || '').toUpperCase();
  return (
    <div className="flex flex-1 flex-wrap gap-1.5">
      {LETTER_GRADES.map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => onChange(g)}
          className={`min-w-[2.6rem] rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
            current === g ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'
          }`}
        >
          {g}
        </button>
      ))}
    </div>
  );
}

export function GradeInput({ system, value, onChange, placeholder }) {
  if (system === 'letter') {
    return <LetterGradePicker value={value} onChange={onChange} />;
  }
  const s = GRADE_SYSTEMS[system] || GRADE_SYSTEMS.scale10;
  const parsed = parseGradeNumber(value);
  const invalid = String(value || '').trim() !== '' && (parsed == null || parsed < s.min || parsed > s.max);

  // "½": trasforma il numero scritto in "N,5" (8 -> 8,5) con un tocco.
  const addHalf = () => {
    const base = parseGradeNumber(value);
    if (base == null) return;
    onChange(`${String(Math.floor(base)).replace('.', ',')},5`);
  };

  return (
    <div className="flex flex-1 items-center gap-2">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`min-w-0 flex-1 rounded-xl border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark] ${
          invalid ? 'border-destructive' : 'border-border'
        }`}
      />
      <button
        type="button"
        onClick={addHalf}
        aria-label="½"
        className="shrink-0 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-muted-foreground active:scale-95 transition-transform"
      >
        ½
      </button>
    </div>
  );
}

// Valore numerico del voto (o null se non valido / fuori scala).
export function resolveGrade(value, system) {
  if (system === 'letter') return parseLetterGrade(value) ?? (() => {
    const n = parseFloat(value);
    return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
  })();
  const s = GRADE_SYSTEMS[system] || GRADE_SYSTEMS.scale10;
  const n = parseGradeNumber(value);
  if (n == null || n < s.min || n > s.max) return null;
  return n;
}
