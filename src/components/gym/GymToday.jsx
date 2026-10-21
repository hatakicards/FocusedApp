import { useState } from 'react';
import { Dumbbell, Lock, ChevronDown, Moon } from 'lucide-react';
import { useUserSettings, useGymSessions, useSubscription } from '@/lib/useAppData';
import { useI18n, useT, weekdayLongById } from '@/lib/i18n';
import { describeExercise } from '@/lib/gymSession';
import PremiumModal from '@/components/PremiumModal';
import GymStartCard from '@/components/gym/GymStartCard';
import GymScheduleEditor from '@/components/GymScheduleEditor';

const WEEKDAY_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// La palestra dentro Athlete: la scheda di oggi con gli esercizi e il pulsante per
// iniziare la sessione (il runner con serie, recuperi e percentuale completata).
export default function GymToday({ className = '' }) {
  const t = useT();
  const { locale } = useI18n();
  const { data: settings } = useUserSettings();
  const { data: sessions } = useGymSessions();
  const sub = useSubscription();
  const [open, setOpen] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const todayId = WEEKDAY_IDS[new Date().getDay()];
  const session = (sessions || []).find((s) => s.day_of_week === todayId);
  const exercises = (session?.exercises || []).filter((e) => e?.name?.trim());
  const hasAnySession = (sessions || []).some((s) => (s?.exercises || []).some((e) => e?.name?.trim()));
  const enabled = settings?.gym_enabled || hasAnySession;

  return (
    <section className={className}>
      <div className="mb-2 flex items-center gap-1.5">
        <Dumbbell size={13} className="text-muted-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gym</h2>
      </div>

      {!enabled ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <Moon size={22} strokeWidth={1.5} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">{t('gt_disattivato')}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('gt_attiva')}</p>
          <button onClick={() => (sub.isPro ? setEditorOpen(true) : setShowPremium(true))} className="mt-3 rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background">{t('gym_create_routine')}</button>
        </div>
      ) : !sub.isPro ? (
        <button onClick={() => setShowPremium(true)} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left">
          <span className="text-sm text-muted-foreground">{t('gt_scheda_locked')}</span>
          <Lock size={18} className="ml-3 shrink-0 text-muted-foreground" />
        </button>
      ) : !session ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">{t('gt_non_oggi')}</p>
          <p className="mt-1 text-xs text-muted-foreground/60">{t('gt_modifica_scheda')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <GymStartCard />
          {exercises.length > 0 && (
            <div className="rounded-2xl border border-border bg-card">
              <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between p-4 text-left">
                <span>
                  <span className="block text-sm font-semibold">{session.title || t('gt_scheda_oggi')}</span>
                  <span className="block text-xs capitalize text-muted-foreground">{weekdayLongById(locale, todayId)} · {exercises.length} ex</span>
                </span>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="space-y-2 border-t border-border p-4 pt-3">
                  {exercises.map((ex, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium">{ex.name}</p>
                      <p className="text-xs font-semibold tabular-nums text-foreground/70">{describeExercise(ex)}</p>
                      {ex.info && <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{ex.info}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {enabled && sub.isPro && (
        <button onClick={() => setEditorOpen(true)} className="mt-2 text-xs font-semibold text-muted-foreground underline underline-offset-2">{t('gym_edit_routine')}</button>
      )}
      <GymScheduleEditor open={editorOpen} onClose={() => setEditorOpen(false)} />
      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />
    </section>
  );
}
