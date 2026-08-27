import { Sparkles, Focus, Calendar } from 'lucide-react';
import { useHomeworks, useGradeGoals } from '@/lib/useAppData';
import { useT, useI18n } from '@/lib/i18n';
import { sortHomeworkByPriority, priorityTier } from '@/lib/studyPriority';

const TIER_STYLES = {
  urgent: 'bg-destructive/15 text-destructive',
  soon: 'bg-amber-500/15 text-amber-500',
  later: 'bg-muted text-muted-foreground',
};

export default function StudyOrganizer({ grades, verifiche, onOpenFocus, onAskFocusy }) {
  const t = useT();
  const { locale } = useI18n();
  const { data: homeworks } = useHomeworks();
  const { data: gradeGoals } = useGradeGoals();

  const ordered = sortHomeworkByPriority(homeworks, { gradeGoals, grades, verifiche });

  const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  return (
    <div>
      <button
        onClick={onAskFocusy}
        className="w-full rounded-2xl border border-border bg-gradient-to-br from-foreground/[0.06] to-foreground/[0.02] p-4 flex items-center gap-3 mb-6 hover:from-foreground/[0.1] hover:to-foreground/[0.04] transition-colors"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
          <Sparkles size={20} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold">{t('so_chiedi_focusy')}</p>
          <p className="text-xs text-muted-foreground">{t('so_chiedi_focusy_sub')}</p>
        </div>
      </button>

      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t('so_nessuno')}</p>
      ) : (
        <div className="space-y-2">
          {ordered.map((h) => {
            const tier = priorityTier(h.priorityScore);
            return (
              <div key={h.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TIER_STYLES[tier]}`}>
                        {t('so_tier_' + tier)}
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize">{t('hw_diff_' + h.difficulty)}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{h.subject} — {h.title}</p>
                    {h.due_date && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Calendar size={11} /> {fmtDate(h.due_date)}
                      </p>
                    )}
                  </div>
                  <button onClick={() => onOpenFocus?.(h)} className="rounded-lg p-2 bg-foreground text-background shrink-0" title={t('hw_avvia_focus')}>
                    <Focus size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
