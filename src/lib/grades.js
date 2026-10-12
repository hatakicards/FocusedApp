export const GRADE_SYSTEMS = {
  letter: { label: 'A–F', min: 1, max: 5, step: 0.3 },
  scale6: { label: '1–6', min: 1, max: 6, step: 1 },
  scale10: { label: '1–10', min: 0, max: 10, step: 1 },
  scale30: { label: '1–30', min: 0, max: 30, step: 1 },
};

// Parse a letter grade (A, A-, B+, B, B-, etc.) to numeric value.
// A=5, B=4, C=3, D=2, F=1; +/- adjusts by 0.3.
export function parseLetterGrade(input) {
  if (!input) return null;
  const s = input.trim().toUpperCase();
  const m = s.match(/^([A-F])([+-]?)$/);
  if (!m) return null;
  const base = { A: 5, B: 4, C: 3, D: 2, E: 1.5, F: 1 }[m[1]];
  if (base == null) return null;
  const mod = m[2] === '+' ? 0.3 : m[2] === '-' ? -0.3 : 0;
  return Math.max(1, Math.min(5, Math.round((base + mod) * 10) / 10));
}

export function formatLetterGrade(value) {
  const v = Math.round(value * 10) / 10;
  if (v >= 4.85) return 'A';
  if (v >= 4.5) return 'A-';
  if (v >= 4.15) return 'B+';
  if (v >= 3.85) return 'B';
  if (v >= 3.5) return 'B-';
  if (v >= 3.15) return 'C+';
  if (v >= 2.85) return 'C';
  if (v >= 2.5) return 'C-';
  if (v >= 2.15) return 'D+';
  if (v >= 1.85) return 'D';
  if (v >= 1.5) return 'D-';
  return 'F';
}

// Normalize any grade to 0-100 based on its system's min/max.
export function normalizeGrade(grade, system) {
  const sys = GRADE_SYSTEMS[system] || GRADE_SYSTEMS.scale10;
  const range = sys.max - sys.min || 1;
  return ((grade - sys.min) / range) * 100;
}

export function formatGrade(grade, system) {
  if (system === 'letter') return formatLetterGrade(grade);
  return formatGradeNumber(grade);
}
// Legge un voto scritto come lo scrive una persona: "8", "8,5", "8.5", "8½",
// "8 e mezzo", "8+" (= 8,25), "8-" (= 7,75). Ritorna un numero o null.
export function parseGradeNumber(input) {
  if (input == null) return null;
  let s = String(input).trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/\s+e\s+mezzo$/, '.5').replace(/\s*½$/, '.5').replace(/\s*1\/2$/, '.5').replace(',', '.');
  const m = s.match(/^(\d+(?:\.\d+)?)\s*([+-]?)$/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (m[2] === '+') n += 0.25;
  if (m[2] === '-') n -= 0.25;
  return Number.isFinite(n) ? n : null;
}

// Mostra un voto con la virgola italiana (8,5) invece del punto.
export function formatGradeNumber(n) {
  if (n == null || Number.isNaN(Number(n))) return '';
  return String(Math.round(Number(n) * 100) / 100).replace('.', ',');
}
