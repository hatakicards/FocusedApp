import { useState } from 'react';
import { Play, Lock, Pencil, Dumbbell } from 'lucide-react';
import { useUserSettings, useGymSessions, useSubscription } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';
import { describeExercise } from '@/lib/gymSession';
import PremiumModal from '@/components/PremiumModal';
import GymSessionRunner from '@/components/gym/GymSessionRunner';
import GymScheduleEditor from '@/components/GymScheduleEditor';
import GymLocationCard from '@/components/bodyfuel/GymLocationCard';

const WEEKDAY_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const namedExercises = (s) => (s?.exercises || []).filter((e) => e?.name?.trim());

// Athlete > Gym (1.5): l'elenco degli esercizi di oggi, sotto "Modifica scheda", sotto ancora
// "Avvia sessione" grande con accanto il quadratino della posizione della palestra.
export default function GymSection() {
  const t = useT();
  const { data: settings } = useUserSettings();
  const { data: sessions } = useGymSessions();
  const sub = useSubscription();
  const [running, setRunning] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [showPremium, setShowPremium] = useState(false);

  const todaySession = (sessions || []).find((s) => s.day_of_week === WEEKDAY_IDS[new Date().getDay()]);
  const exercises = namedExercises(todaySession);
  const hasAny = (sessions || []).some((s) => namedExercises(s).length > 0);
  const enabled = settings?.gym_enabled || hasAny;

  const gate = (fn) => () => (sub.isPro ? fn() : setShowPremium(true));
  const start = gate(() => (exercises.length ? setRunning(true) : setEditorOpen(true)));
  const edit = gate(() => setEditorOpen(true));

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"><Dumbbell size={13} style={{ color: '#10b981' }} /> {t('gt_scheda_oggi')}</h2>
        {todaySession?.title && <span className="truncate pl-3 text-xs font-semibold">{todaySession.title}</span>}
      </div>

      {exercises.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
          <Dumbbell size={22} strokeWidth={1.6} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{enabled ? t('gt_non_oggi') : t('gt_attiva')}</p>
        </div>
      ) : (
        <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {exercises.map((ex, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums" style={{ color: '#34d399', backgroundColor: '#10b98122' }}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{ex.name}</p>
                <p className="text-xs font-semibold tabular-nums text-foreground/70">{describeExercise(ex)}</p>
                {ex.info && <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{ex.info}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={edit}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-semibold active:scale-[0.98] transition-transform"
      >
        {sub.isPro ? <Pencil size={15} /> : <Lock size={14} />}
        {enabled ? t('gym_edit_routine') : t('gym_create_routine')}
      </button>

      <div data-tour="bf-top" className="mt-3 flex gap-2.5">
        <button
          onClick={start}
          className="titanium-bg flex flex-1 items-center justify-between rounded-2xl px-5 py-4 text-left active:scale-[0.98] transition-transform"
        >
          <span>
            <span className="block text-base font-bold">{t('gsr_avvia')}</span>
            <span className="block text-xs opacity-60">{exercises.length ? t('gsr_avvia_sub') : t('gsr_nessuna_scheda')}</span>
          </span>
          {sub.isPro ? <Play size={20} fill="currentColor" /> : <Lock size={18} />}
        </button>
        <GymLocationCard compact />
      </div>

      <GymScheduleEditor open={editorOpen} onClose={() => setEditorOpen(false)} />
      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />
      {running && todaySession && <GymSessionRunner session={todaySession} onClose={() => setRunning(false)} />}
    </section>
  );
}
