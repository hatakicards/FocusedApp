import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { formatDateISO, isGoalCompletedNow } from '@/lib/productivity';
import { useT } from '@/lib/i18n';

function goalStartDate(goal) {
  if (!goal.created_date) return null;
  const d = new Date(goal.created_date);
  return isNaN(d.getTime()) ? null : d;
}

function DailyCalendar({ periods, viewMonth, setViewMonth, goalStart }) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = formatDateISO(new Date());
  const goalStartStr = goalStart ? formatDateISO(goalStart) : null;

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium capitalize">
          {viewMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} className="text-muted-foreground hover:text-foreground">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-1">
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dateStr = formatDateISO(new Date(year, month, d));
          const completed = periods.includes(dateStr);
          const isToday = dateStr === today;
          const isFuture = dateStr > today;
          const beforeGoal = goalStartStr && dateStr < goalStartStr;
          let cls = 'h-8 rounded-lg flex items-center justify-center text-[11px] font-medium';
          if (completed) cls += ' bg-emerald-500 text-white';
          else if (isFuture || beforeGoal) cls += ' text-muted-foreground/25';
          else cls += ' bg-red-500/80 text-white';
          if (isToday && !completed) cls += ' ring-2 ring-foreground/60';
          return <div key={i} className={cls}>{d}</div>;
        })}
      </div>
    </div>
  );
}

function RowList({ rows }) {
  return (
    <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
          <span className="text-xs font-medium">{r.label}</span>
          <span
            className={`h-3 w-3 rounded-full ${
              r.completed ? 'bg-emerald-500' : r.neutral ? 'bg-muted-foreground/20' : 'bg-red-500/80'
            }`}
          />
        </div>
      ))}
    </div>
  );
}

function buildRows(goal, periods) {
  const tf = goal.timeframe;
  const now = new Date();
  const start = goalStartDate(goal);
  const rows = [];

  if (tf === 'weekly') {
    const cur = new Date(now);
    const dow = cur.getDay();
    cur.setDate(cur.getDate() - (dow === 0 ? 6 : dow - 1));
    for (let i = 0; i < 16; i++) {
      const wk = new Date(cur);
      wk.setDate(cur.getDate() - i * 7);
      const end = new Date(wk);
      end.setDate(wk.getDate() + 6);
      const key = formatDateISO(wk);
      const beforeGoal = start && formatDateISO(wk) < formatDateISO(start);
      const label = `${wk.getDate()} ${wk.toLocaleDateString('it-IT', { month: 'short' })} – ${end.getDate()} ${end.toLocaleDateString('it-IT', { month: 'short' })}`;
      rows.push({ key, label, completed: periods.includes(key), neutral: beforeGoal });
    }
    return rows;
  }

  if (tf === 'monthly') {
    const startY = start ? start.getFullYear() : now.getFullYear() - 1;
    const startM = start ? start.getMonth() : 0;
    for (let y = now.getFullYear(); y >= startY; y--) {
      const mMax = y === now.getFullYear() ? now.getMonth() : 11;
      const mMin = y === startY ? startM : 0;
      for (let m = mMax; m >= mMin; m--) {
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        rows.push({
          key,
          label: new Date(y, m, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
          completed: periods.includes(key),
        });
      }
    }
    return rows;
  }

  if (tf === 'annual') {
    const startY = start ? start.getFullYear() : now.getFullYear();
    for (let y = now.getFullYear(); y >= startY; y--) {
      rows.push({ key: String(y), label: String(y), completed: periods.includes(String(y)) });
    }
    return rows;
  }

  return rows;
}

export default function GoalHistoryModal({ goal, onClose, onToggle }) {
  const [viewMonth, setViewMonth] = useState(new Date());
  const t = useT();
  if (!goal) return null;

  const periods = goal.completed_periods || [];
  const completedNow = isGoalCompletedNow(goal);
  const tf = goal.timeframe;
  const tfLabel = t('tf_' + tf);
  const rows = tf !== 'daily' && tf !== 'lifetime' ? buildRows(goal, periods) : [];

  return (
    <Dialog open={!!goal} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="pr-6">{goal.title}</DialogTitle>
        </DialogHeader>
        <p className="-mt-3 mb-3 text-xs text-muted-foreground">{tfLabel}</p>

        <button
          onClick={onToggle}
          className={`mb-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors ${
            completedNow ? 'bg-emerald-500 text-white' : 'bg-foreground text-background'
          }`}
        >
          <Check size={16} strokeWidth={3} />
          {completedNow ? t('gh_completato') : t('gh_segna')}
        </button>

        {tf === 'lifetime' ? (
          <p className="rounded-xl bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground">
            {goal.completed && goal.completed_date
              ? `${t('gh_completato_il')} ${new Date(goal.completed_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`
              : t('gh_non_ancora')}
          </p>
        ) : tf === 'daily' ? (
          <DailyCalendar periods={periods} viewMonth={viewMonth} setViewMonth={setViewMonth} goalStart={goalStartDate(goal)} />
        ) : (
          <RowList rows={rows} />
        )}

        {tf !== 'lifetime' && (
          <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {t('gh_legend_completato')}</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500/80" /> {t('gh_legend_non')}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}