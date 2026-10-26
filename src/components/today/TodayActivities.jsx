import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useActivities, useRatings, useSubscription, useOptimisticRating } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';
import { computeStreak, todayISO } from '@/lib/productivity';
import { useAutoActivities } from '@/lib/autoActivities';
import ActivityIcon from '@/components/ActivityIcon';
import ActivityForm from '@/components/ActivityForm';
import FireStreak from '@/components/FireStreak';
import { RATING_COLORS } from '@/lib/constants';

// Le attivita' dell'utente dentro Today: caselle quadrate, due per riga, con il simbolo
// grande al centro, il nome sotto e il voto di oggi (1-5) in basso con un solo tocco.
// Tocco sul simbolo o sul nome per il dettaglio; la serie attuale e' in alto a destra.
// Con Premium si aggiungono "Eating well" e "Sleeping well", che leggono il voto da
// BodyFuel/Athlete e non si votano a mano.
function Tile({ icon, name, streak, onOpen, children }) {
  return (
    <div className="titanium-tile relative flex aspect-square flex-col rounded-3xl border border-border/70 p-3">
      {streak > 0 && <FireStreak streak={streak} className="absolute right-2 top-2 !px-2 !py-0.5 text-[11px]" />}
      <button onClick={onOpen} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/[0.08] text-foreground">
          <ActivityIcon name={icon} size={30} />
        </span>
        <span className="w-full truncate text-sm font-semibold">{name}</span>
      </button>
      <div className="mt-1.5 h-6">{children}</div>
    </div>
  );
}

function MiniRating({ value, onChange }) {
  return (
    <div className="flex h-6 w-full items-center justify-between">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-transform active:scale-90 ${value === n ? 'text-white' : 'bg-foreground/10 text-muted-foreground'}`}
          style={value === n ? { backgroundColor: RATING_COLORS[n] } : undefined}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

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
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t('today_attivita')}</h2>

      <div className="grid grid-cols-2 gap-2.5">
        {auto.map((a) => (
          <Tile key={a.id} icon={a.icon} name={t(a.nameKey)} streak={a.streak} onOpen={() => navigate('/body-fuel')}>
            {a.todayRating == null ? (
              <p className="truncate text-center text-[11px] leading-6 text-muted-foreground">{t('today_no_data')}</p>
            ) : (
              <div className="flex h-6 items-center justify-center">
                <span
                  className="flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-bold text-white"
                  style={{ backgroundColor: RATING_COLORS[a.todayRating] }}
                >
                  {a.todayRating}
                </span>
              </div>
            )}
          </Tile>
        ))}

        {list.map((activity) => {
          const aRatings = (ratings || []).filter((r) => r.activity_id === activity.id);
          const streak = computeStreak(aRatings);
          const todayRating = aRatings.find((r) => r.date === today)?.rating;
          return (
            <Tile
              key={activity.id}
              icon={activity.emoji}
              name={activity.name}
              streak={streak}
              onOpen={() => navigate(`/attivita/${activity.id}`)}
            >
              <MiniRating value={todayRating} onChange={(v) => optimisticRate(activity.id, today, v)} />
            </Tile>
          );
        })}

        <button
          onClick={() => setFormOpen(true)}
          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border text-muted-foreground active:scale-[0.98]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border"><Plus size={22} /></span>
          <span className="text-xs font-semibold">{t('nuova')}</span>
        </button>
      </div>

      {list.length === 0 && auto.length === 0 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">{t('at_nessuna')}</p>
      )}

      <ActivityForm open={formOpen} onClose={() => setFormOpen(false)} activity={null} />
    </section>
  );
}
