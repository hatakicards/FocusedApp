import { GRADE_SYSTEMS, parseLetterGrade } from '@/lib/grades';

export function GradeInput({ system, value, onChange, placeholder }) {
  if (system === 'letter') {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="A, B+, C-..."
        className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none uppercase [color-scheme:dark]"
      />
    );
  }
  const s = GRADE_SYSTEMS[system];
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={s.min}
      max={s.max}
      step={s.step}
      className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
    />
  );
}

export function resolveGrade(value, system) {
  if (system === 'letter') return parseLetterGrade(value);
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}
