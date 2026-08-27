import { useDayEntries } from '@/lib/useAppData';
import { useI18n, useT } from '@/lib/i18n';

export default function TimeCapsule() {
  const { data: entries } = useDayEntries();
  const { locale } = useI18n();
  const t = useT();
  const sorted = [...(entries || [])].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">{t('tc_vuoto')}</p>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide -mr-1 pr-1">
      {sorted.map((e) => (
        <div key={e.id} className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold capitalize">
              {new Date(e.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <span className="text-xs font-bold">{e.day_rating}/5</span>
          </div>
          {e.thoughts && (
            <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{e.thoughts}</p>
          )}
        </div>
      ))}
    </div>
  );
}