import { Minus, Plus } from 'lucide-react';
import { useT } from '@/lib/i18n';

export const MAX_FOCUS_MINUTES = 240;
const PRESETS = [15, 25, 50, 90];

export function formatDuration(mins, t) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h} ${t('dp_ore_abbr')} ${m} ${t('dp_min_abbr')}`;
  if (h) return `${h} ${t('dp_ore_abbr')}`;
  return `${m} ${t('dp_min_abbr')}`;
}

function Stepper({ label, value, max, step = 1, onChange }) {
  const set = (v) => onChange(Math.min(max, Math.max(0, v)));
  return (
    <div className="flex-1 rounded-2xl border border-border bg-card p-3">
      <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => set(value - step)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-muted-foreground active:scale-90"
        >
          <Minus size={16} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={String(value)}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
            set(Number.isNaN(n) ? 0 : n);
          }}
          onFocus={(e) => e.target.select()}
          className="w-full min-w-0 bg-transparent text-center text-3xl font-bold tabular-nums outline-none"
        />
        <button
          type="button"
          onClick={() => set(value + step)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-muted-foreground active:scale-90"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

// Durata libera in ore e minuti (1 min - 4 h). value/onChange sono in minuti totali.
export default function DurationPicker({ value, onChange }) {
  const t = useT();
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  const clamp = (total) => Math.min(MAX_FOCUS_MINUTES, Math.max(0, total));

  return (
    <div>
      <div className="flex gap-3">
        <Stepper label={t('dp_ore')} value={hours} max={4} onChange={(h) => onChange(clamp(h * 60 + minutes))} />
        <Stepper label={t('dp_minuti')} value={minutes} max={59} step={5} onChange={(m) => onChange(clamp(hours * 60 + m))} />
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              value === p ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'
            }`}
          >
            {formatDuration(p, t)}
          </button>
        ))}
      </div>
    </div>
  );
}
