import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Star, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActivities, useRatings, useSubscription, useOptimisticRating } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';
import { computeStreak, todayISO } from '@/lib/productivity';
import { useAutoActivities, AUTO_ACTIVITIES } from '@/lib/autoActivities';
import { useActivityLimit } from '@/lib/activityLimit';
import PremiumModal from '@/components/PremiumModal';
import FreeLimitNotice from '@/components/today/FreeLimitNotice';
import ActivityIcon from '@/components/ActivityIcon';
import ActivityForm from '@/components/ActivityForm';
import FireStreak from '@/components/FireStreak';
import { RATING_COLORS } from '@/lib/constants';

// Le attivita' dell'utente dentro Today: caselle quadrate, due per riga, con il simbolo
// grande al centro, il nome sotto e il voto di oggi (1-5) in basso con un solo tocco.
// Tocco sul simbolo o sul nome per il dettaglio; la serie attuale e' in alto a destra.
// Con Premium si aggiungono "Eating well" e "Sleeping well", che leggono il voto da
// BodyFuel/Athlete e non si votano a mano.
function VoteButton({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex h-8 min-w-8 items-center justify-center rounded-full text-xs font-bold transition-transform active:scale-90 ${value ? 'text-white' : 'border border-border text-muted-foreground'}`}
        style={value ? { backgroundColor: RATING_COLORS[value] } : undefined}
      >
        {value || <Star size={14} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-x-2 bottom-2 z-10 flex h-12 items-center justify-between rounded-2xl border border-border bg-card px-2 shadow-lg"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => { onChange(n); setOpen(false); }}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold active:scale-90 ${value === n ? 'text-white' : 'bg-foreground/10 text-muted-foreground'}`}
                style={value === n ? { backgroundColor: RATING_COLORS[n] } : undefined}
              >
                {n}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Casella quadrata: solo il simbolo grande e il nome; sotto, a sinistra il voto di oggi
// (tocco per sceglierlo) e a destra la serie.
function Tile({ icon, name, streak, onOpen, left }) {
  return (
    <div className="titanium-tile relative flex aspect-square flex-col rounded-3xl border border-border/70 p-3">
      <button onClick={onOpen} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
        <ActivityIcon name={icon} size={42} className="text-foreground" />
        <span className="w-full truncate text-sm font-semibold">{name}</span>
      </button>
      <div className="mt-1 flex h-8 items-center justify-between">
        {left}
        {streak > 0 ? <FireStreak streak={streak} /> : <span />}
      </div>
    </div>
  );
}

// Casella con il lucchetto (piano gratuito): sfumata, con "Sblocca con Premium" al posto del voto.
// Un tocco apre i piani.
function LockedTile({ icon, name, label, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="titanium-tile relative flex aspect-square flex-col rounded-3xl border border-border/70 p-3 text-left active:scale-[0.98]"
      aria-label={`${name}. ${label}`}
    >
      <span className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center opacity-35">
        <ActivityIcon name={icon} size={42} className="text-foreground" />
        <span className="w-full truncate text-sm font-semibold">{name}</span>
      </span>
      <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-foreground/10">
        <Lock size={13} />
      </span>
      <span className="mt-1 flex h-8 items-center justify-center rounded-full bg-foreground/10 px-2 text-[11px] font-semibold">
        {label}
      </span>
    </button>
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
  const [premiumOpen, setPremiumOpen] = useState(false);
  const today = todayISO();
  const auto = useAutoActivities(sub.canUseProfiles, today);
  const limit = useActivityLimit();
  const unlockLabel = t('fl_unlock_premium');

  const list = (activities || [])
    .filter((a) => !a.archived && !a.is_gym && !a.preset_type)
    .sort((a, b) => (a.category || '').localeCompare(b.category || ''));

  return (
    <section>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t('today_attivita')}</h2>

      <div className="grid grid-cols-2 gap-2.5">
        {!sub.canUseProfiles && AUTO_ACTIVITIES.map((a) => (
          <LockedTile key={a.id} icon={a.icon} name={t(a.nameKey)} label={unlockLabel} onOpen={() => setPremiumOpen(true)} />
        ))}

        {auto.map((a) => (
          <Tile
            key={a.id}
            icon={a.icon}
            name={t(a.nameKey)}
            streak={a.streak}
            onOpen={() => navigate(`/abitudine/${a.id.replace('auto-', '')}`)}
            left={a.todayRating == null ? (
              <span className="flex h-8 min-w-8 items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">-</span>
            ) : (
              <span className="flex h-8 min-w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: RATING_COLORS[a.todayRating] }}>{a.todayRating}</span>
            )}
          />
        ))}

        {list.map((activity) => {
          const aRatings = (ratings || []).filter((r) => r.activity_id === activity.id);
          const streak = computeStreak(aRatings);
          const todayRating = aRatings.find((r) => r.date === today)?.rating;
          if (limit.isLocked(activity.id)) {
            return (
              <LockedTile key={activity.id} icon={activity.emoji} name={activity.name} label={t('fl_unlock_pro')} onOpen={() => setPremiumOpen(true)} />
            );
          }
          return (
            <Tile
              key={activity.id}
              icon={activity.emoji}
              name={activity.name}
              streak={streak}
              onOpen={() => navigate(`/attivita/${activity.id}`)}
              left={<VoteButton value={todayRating} onChange={(v) => optimisticRate(activity.id, today, v)} />}
            />
          );
        })}

        <button
          onClick={() => (limit.canAdd ? setFormOpen(true) : setPremiumOpen(true))}
          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border text-muted-foreground active:scale-[0.98]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border">
            {limit.canAdd ? <Plus size={22} /> : <Lock size={20} />}
          </span>
          <span className="text-xs font-semibold">{limit.canAdd ? t('nuova') : t('fl_limit_tile')}</span>
          {!limit.canAdd && <span className="px-3 text-center text-[10px] leading-tight">{t('fl_limit_hint')}</span>}
        </button>
      </div>

      {list.length === 0 && auto.length === 0 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">{t('at_nessuna')}</p>
      )}

      <ActivityForm open={formOpen} onClose={() => setFormOpen(false)} activity={null} />
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />
      <FreeLimitNotice />
    </section>
  );
}
