import { Check, Clock, Flame, Pencil, RotateCcw } from 'lucide-react';
import { useT } from '@/lib/i18n';

// Una Small Habit: nome, orari (un cerchio da spuntare per ogni orario), streak e recupero.
// slots = [{ slot, time, done }]; restore = restoreInfo() o null.
// onEdit mostra la matita (pagina dell'attivita'); onOpen apre solo toccando il nome (Oggi).
export default function HabitRow({ habit, subtitle, slots, streak, restore, onToggle, onRestore, onEdit, onOpen }) {
  const t = useT();
  const allDone = slots.length > 0 && slots.every((s) => s.done);
  const single = slots.length === 1;

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 p-3">
        {single && (
          <CheckButton done={slots[0].done} onClick={() => onToggle(slots[0].slot)} label={habit.name} />
        )}
        <button type="button" onClick={onEdit || onOpen} disabled={!onEdit && !onOpen} className="min-w-0 flex-1 text-left">
          <span className={`block truncate text-sm font-medium ${allDone ? 'text-muted-foreground line-through decoration-muted-foreground/50' : ''}`}>
            {habit.name}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            {subtitle && <span className="truncate">{subtitle}</span>}
            {single && slots[0].time && (
              <span className="flex items-center gap-1 tabular-nums"><Clock size={11} />{slots[0].time}</span>
            )}
            {streak > 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-foreground tabular-nums">
                <Flame size={11} strokeWidth={2.5} />{streak}
              </span>
            )}
          </span>
        </button>
        {onEdit && (
          <button type="button" onClick={onEdit} className="rounded-lg p-2 text-muted-foreground" aria-label={t('modifica')}>
            <Pencil size={14} />
          </button>
        )}
      </div>

      {!single && slots.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pb-3">
          {slots.map((s) => (
            <button
              key={s.slot}
              type="button"
              onClick={() => onToggle(s.slot)}
              aria-pressed={s.done}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors active:scale-95 ${s.done ? 'border-foreground bg-foreground text-background' : 'border-border text-foreground'}`}
            >
              {s.done ? <Check size={12} strokeWidth={3} /> : <Clock size={12} />}
              {s.time || t('sh_todo')}
            </button>
          ))}
        </div>
      )}

      {restore && (
        <div className="border-t border-border px-3 py-2.5">
          {restore.ready ? (
            <button type="button" onClick={onRestore} className="flex w-full items-center gap-2 text-left">
              <RotateCcw size={14} className="shrink-0" />
              <span className="flex-1 text-xs font-semibold">{t('sh_restore_btn').replace('{n}', String(restore.savedStreak))}</span>
              <span className="text-[10px] text-muted-foreground">{t('sh_restore_left').replace('{left}', String(restore.left))}</span>
            </button>
          ) : (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <RotateCcw size={13} className="mt-0.5 shrink-0" />
              {t('sh_restore_hint').replace('{n}', String(restore.savedStreak))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CheckButton({ done, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={done}
      aria-label={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90 ${done ? 'border-foreground bg-foreground text-background' : 'border-muted-foreground/40'}`}
    >
      {done && <Check size={16} strokeWidth={3} />}
    </button>
  );
}
