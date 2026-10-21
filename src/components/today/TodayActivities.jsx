import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useActivities, useRatings, useSubscription, useOptimisticRating } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';
import { computeStreak, todayISO } from '@/lib/productivity';
import { useAutoActivities } from '@/lib/autoActivities';
import ActivityIcon from '@/components/ActivityIcon';
import ActivityCardBg from '@/components/ActivityCardBg';
import RatingPicker from '@/components/RatingPicker';
import ActivityForm from '@/components/ActivityForm';
import FireStreak from '@/components/FireStreak';
import { RATING_COLORS } from '@/lib/constants';

// Le attivita' dell'utente dentro Today: stesso funzionamento della vecchia schermata
// Abitudini (voto di oggi 1-5, tocco sul nome per il dettaglio) ma compatte, con la serie
// attuale in arancione. Con Premium si aggiungono "Eating well" e "Sleeping well", che
// leggono il voto da BodyFuel/Athlete e non si votano a mano.
export default function TodayActivities() {
  const navigate = useNavigate();
  const t = useT();
  const { data: activities } = useActivities();
  const { data: ratings } = useRatings();
  const sub = useSubscription();
  const optimisticRate = useOptimisticRating();
  const [formOpen, setFormOpen] = useState(false);
  const today = todayISO();
  const auto = useAutoActivities(sub.canUseProfiles, today);

  const list = (activities || [])
    .filter((a) => !a.archived && !a.is_gym && !a.preset_type)
    .sort((a, b) => (a.category || '').localeCompare(b.category || ''));

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('today_attivita')}</h2>
        <button
          onClick={() => setFormOpen(true)}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background"
        >
          <Plus size={13} /> {t('nuova')}
        </button>
      </div>

      <div className="space-y-2">
        {auto.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => navigate('/body-fuel')} className="flex min-w-0 items-center gap-2 text-left">
                <ActivityIcon name={a.icon} size={14} />
                <span className="truncate text-sm font-medium">{t(a.nameKey)}</span>
              </button>
              <FireStreak streak={a.streak} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {a.todayRating == null ? t('today_no_data') : `${t('today_auto_hint')} Athlete`}
              </span>
              {a.todayRating != null && (
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: RATING_COLORS[a.todayRating] }}
                >
                  {a.todayRating}
                </span>
              )}
            </div>
          </div>
        ))}

        {list.map((activity) => {
          const aRatings = (ratings || []).filter((r) => r.activity_id === activity.id);
          const streak = computeStreak(aRatings);
          const todayRating = aRatings.find((r) => r.date === today)?.rating;
          return (
            <ActivityCardBg key={activity.id} activity={activity}>
              <div className="w-full p-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => navigate(`/attivita/${activity.id}`)}
                    className="flex min-w-0 items-center gap-2 text-left"
                  >
                    {activity.emoji ? <ActivityIcon name={activity.emoji} size={14} /> : null}
                    <span className="truncate text-sm font-medium">{activity.name}</span>
                  </button>
                  <FireStreak streak={streak} />
                </div>
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                  <RatingPicker value={todayRating} onChange={(v) => optimisticRate(activity.id, today, v)} size="xs" fill />
                </div>
              </div>
            </ActivityCardBg>
          );
        })}

        {list.length === 0 && auto.length === 0 && (
          <button
            onClick={() => setFormOpen(true)}
            className="w-full rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
          >
            {t('at_nessuna')}
          </button>
        )}
      </div>

      <ActivityForm open={formOpen} onClose={() => setFormOpen(false)} activity={null} />
    </section>
  );
}
