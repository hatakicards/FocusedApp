import { useState } from 'react';
import { Play, Lock, ListChecks, Pencil } from 'lucide-react';
import { useUserSettings, useGymSessions, useSubscription } from '@/lib/useAppData';
import { useI18n, useT, weekdayLongById } from '@/lib/i18n';
import { describeExercise } from '@/lib/gymSession';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PremiumModal from '@/components/PremiumModal';
import GymSessionRunner from '@/components/gym/GymSessionRunner';
import GymScheduleEditor from '@/components/GymScheduleEditor';

const WEEKDAY_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const namedExercises = (s) => (s?.exercises || []).filter((e) => e?.name?.trim());

// La palestra in Athlete: un grande "Avvia sessione" e, accanto, "Scheda". La scheda apre
// gli esercizi del giorno (con i giorni per sfogliare le altre sedute) e "Modifica scheda".
export default function GymActions({ className = '' }) {
  const t = useT();
  const { locale } = useI18n();
  const { data: settings } = useUserSettings();
  const { data: sessions } = useGymSessions();
  const sub = useSubscription();
  const [running, setRunning] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [showPremium, setShowPremium] = useState(false);

  const todayId = WEEKDAY_IDS[new Date().getDay()];
  const [dayId, setDayId] = useState(todayId);
  const sessionOf = (id) => (sessions || []).find((s) => s.day_of_week === id);
  const todaySession = sessionOf(todayId);
  const shown = sessionOf(dayId);
  const hasToday = namedExercises(todaySession).length > 0;
  const hasAny = (sessions || []).some((s) => namedExercises(s).length > 0);
  const enabled = settings?.gym_enabled || hasAny;

  const gate = (fn) => () => (sub.isPro ? fn() : setShowPremium(true));
  const start = gate(() => { if (hasToday) setRunning(true); else setListOpen(true); });
  const openSchedule = gate(() => { setDayId(todayId); setListOpen(true); });
  const edit = () => { setListOpen(false); setEditorOpen(true); };

  const days = ORDER.filter((id) => namedExercises(sessionOf(id)).length > 0);

  return (
    <section className={className}>
      <div className="flex gap-2.5">
        <button
          onClick={enabled ? start : gate(() => setEditorOpen(true))}
          className="titanium-bg flex flex-1 items-center justify-between rounded-2xl px-5 py-4 text-left active:scale-[0.98] transition-transform"
        >
          <span>
            <span className="block text-base font-bold">{enabled ? t('gsr_avvia') : t('gym_create_routine')}</span>
            <span className="block text-xs opacity-60">
              {!enabled ? t('gt_attiva') : hasToday ? t('gsr_avvia_sub') : t('gsr_nessuna_scheda')}
            </span>
          </span>
          {sub.isPro ? <Play size={20} fill="currentColor" /> : <Lock size={18} />}
        </button>
        {enabled && (
          <button
            onClick={openSchedule}
            className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card text-xs font-semibold active:scale-[0.98] transition-transform"
          >
            <ListChecks size={20} strokeWidth={1.7} />
            {t('gym_sched_btn')}
          </button>
        )}
      </div>

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{shown?.title || t('gt_scheda_oggi')}</DialogTitle>
          </DialogHeader>
          {days.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {days.map((id) => (
                <button
                  key={id}
                  onClick={() => setDayId(id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${dayId === id ? 'titanium-bg' : 'border border-border text-muted-foreground'}`}
                >
                  {weekdayLongById(locale, id).slice(0, 3)}
                </button>
              ))}
            </div>
          )}
          {namedExercises(shown).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{dayId === todayId ? t('gt_non_oggi') : t('gt_nessun_es')}</p>
          ) : (
            <div className="space-y-3">
              {namedExercises(shown).map((ex, i) => (
                <div key={i} className="rounded-xl border border-border/70 p-3">
                  <p className="text-sm font-semibold">{ex.name}</p>
                  <p className="text-xs font-semibold tabular-nums text-foreground/70">{describeExercise(ex)}</p>
                  {ex.info && <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{ex.info}</p>}
                </div>
              ))}
            </div>
          )}
          <button onClick={edit} className="titanium-bg mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold">
            <Pencil size={14} /> {t('gym_edit_routine')}
          </button>
        </DialogContent>
      </Dialog>

      <GymScheduleEditor open={editorOpen} onClose={() => setEditorOpen(false)} />
      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />
      {running && todaySession && <GymSessionRunner session={todaySession} onClose={() => setRunning(false)} />}
    </section>
  );
}
