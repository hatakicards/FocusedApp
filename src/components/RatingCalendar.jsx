import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RATING_COLORS } from '@/lib/constants';
import { useI18n, useT, weekdayNarrow } from '@/lib/i18n';
import { formatDateISO, todayISO, isWithinEditWindow, dayDiff } from '@/lib/productivity';
import RatingPicker from './RatingPicker';

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, inMonth: false });
  }
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= lastDay; i++) {
    days.push({ date: new Date(year, month, i), inMonth: true });
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    const d = new Date(last);
    d.setDate(d.getDate() + 1);
    days.push({ date: d, inMonth: false });
  }
  return days;
}

export default function RatingCalendar({ ratings, onSaveRating }) {
  const { locale } = useI18n();
  const t = useT();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [saving, setSaving] = useState(false);

  const weekdays = weekdayNarrow(locale);

  const ratingMap = useMemo(() => {
    const map = {};
    ratings?.forEach((r) => {
      map[r.date] = r.rating;
    });
    return map;
  }, [ratings]);

  const days = getMonthGrid(viewYear, viewMonth);

  const handlePrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
    setSelectedDate(null);
  };

  const handleNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
    setSelectedDate(null);
  };

  const handleDayClick = (dateStr) => {
    if (!isWithinEditWindow(dateStr)) return;
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
  };

  const handleSave = async (rating) => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      await onSaveRating(selectedDate, rating);
      setSelectedDate(null);
    } finally {
      setSaving(false);
    }
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <button onClick={handlePrev} className="rounded-lg p-1.5 hover:bg-accent transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold capitalize">{monthLabel}</span>
        <button onClick={handleNext} className="rounded-lg p-1.5 hover:bg-accent transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {weekdays.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium uppercase text-muted-foreground/60">{d}</div>
        ))}
        {days.map((day, i) => {
          const dateStr = formatDateISO(day.date);
          const rating = ratingMap[dateStr];
          const isToday = dateStr === todayISO();
          const isFuture = dayDiff(dateStr, todayISO()) < 0;
          const editable = isWithinEditWindow(dateStr);
          const color = rating ? RATING_COLORS[rating] : null;

          return (
            <div key={i} className="aspect-square">
              <button
                onClick={() => handleDayClick(dateStr)}
                disabled={!day.inMonth || isFuture || (!editable && !rating)}
                className={cn(
                  'relative flex h-full w-full items-center justify-center rounded-lg text-xs font-medium transition-all',
                  !day.inMonth && 'opacity-30',
                  isFuture && 'opacity-20 cursor-not-allowed',
                  !isFuture && !editable && !rating && 'cursor-default text-muted-foreground/40',
                  editable && 'cursor-pointer hover:ring-1 hover:ring-foreground/30',
                  selectedDate === dateStr && 'ring-2 ring-foreground'
                )}
                style={color ? { backgroundColor: color + '25', color } : undefined}
              >
                {day.date.getDate()}
                {isToday && (
                  <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-foreground" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs text-muted-foreground">{t('cal_valuta')}</p>
          <RatingPicker value={ratingMap[selectedDate]} onChange={handleSave} disabled={saving} />
        </div>
      )}
    </div>
  );
}