import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { useT, useI18n } from '@/lib/i18n';
import { differenceInCalendarDays } from 'date-fns';

export default function TestTimeline({ verifiche, locale }) {
  const t = useT();

  const upcoming = useMemo(
    () => verifiche
      .filter((v) => v.status === 'scheduled')
      .sort((a, b) => a.date.localeCompare(b.date)),
    [verifiche]
  );

  if (upcoming.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <Calendar size={28} className="text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{t('timeline_empty')}</p>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

      <div className="space-y-4">
        {upcoming.map((v) => {
          const testDate = new Date(v.date + 'T00:00:00');
          const days = differenceInCalendarDays(testDate, today);
          const isPast = days < 0;
          const isSoon = days >= 0 && days <= 3;

          return (
            <div key={v.id} className="relative">
              {/* Dot */}
              <div
                className={`absolute -left-[18px] top-3 w-3.5 h-3.5 rounded-full border-2 border-background ${
                  isPast ? 'bg-amber-500' : isSoon ? 'bg-red-500' : 'bg-blue-500'
                }`}
              />
              <div className={`rounded-xl border bg-card p-3 ${isSoon && !isPast ? 'border-red-500/30' : 'border-border'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{v.subject}</p>
                    {v.topic && <p className="text-xs text-muted-foreground truncate">{v.topic}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium capitalize">
                      {testDate.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className={`text-[10px] ${isPast ? 'text-amber-500' : isSoon ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {isPast ? t('ag_scaduto') : days === 0 ? t('ag_oggi') : `${days} ${t('ag_giorni')}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}