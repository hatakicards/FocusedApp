import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity as ActivityIcon, X } from 'lucide-react';
import { getDB } from '@/lib/guestDB';
import { useT } from '@/lib/i18n';
import { useActivities, useOptimisticRating } from '@/lib/useAppData';
import {
  isSenseAvailable,
  wasSenseAsked,
  isSenseEnabled,
  enableSense,
  useSensedEvents,
  markEvent,
} from '@/lib/healthSense';

// Come trovare (o creare) l'attivita' giusta per ogni tipo di allenamento rilevato.
const KIND_TO_ACTIVITY = {
  gym: { match: (a) => a.preset_type === 'gym' || a.is_gym, create: { name: 'Gym', emoji: 'dumbbell', preset_type: 'gym', is_gym: true } },
  running: { match: (a) => /corsa|corr|run/i.test(a.name), create: { name: 'Corsa', emoji: 'footprints' } },
  cycling: { match: (a) => /bici|cycl|bike|ciclis/i.test(a.name), create: { name: 'Bici', emoji: 'bike' } },
  swimming: { match: (a) => /nuot|swim|piscin/i.test(a.name), create: { name: 'Nuoto', emoji: 'waves' } },
  yoga: { match: (a) => /yoga|pilates/i.test(a.name), create: { name: 'Yoga', emoji: 'heart' } },
  hiking: { match: (a) => /escurs|hik|trek|cammin/i.test(a.name), create: { name: 'Escursione', emoji: 'footprints' } },
  walking: { match: (a) => /cammin|walk/i.test(a.name), create: { name: 'Camminata', emoji: 'footprints' } },
  workout: { match: (a) => a.preset_type === 'gym' || a.is_gym, create: { name: 'Gym', emoji: 'dumbbell', preset_type: 'gym', is_gym: true } },
  other: { match: (a) => a.preset_type === 'gym' || a.is_gym, create: { name: 'Gym', emoji: 'dumbbell', preset_type: 'gym', is_gym: true } },
};

// Domanda e opt-in per le attivita' riconosciute da Salute/movimento (solo iOS).
export default function SensedActivityPrompt() {
  const t = useT();
  const qc = useQueryClient();
  const { data: activities } = useActivities();
  const optimisticRate = useOptimisticRating();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(isSenseEnabled);
  const [asked, setAsked] = useState(wasSenseAsked);
  const { pending, refresh } = useSensedEvents(enabled);

  useEffect(() => { isSenseAvailable().then(setAvailable); }, []);

  if (!available) return null;

  if (!asked) {
    const handleEnable = async () => {
      await enableSense();
      setAsked(true);
      setEnabled(true);
    };
    return (
      <div className="fixed inset-x-4 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] z-[75] mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <ActivityIcon size={16} />
          <span className="text-sm font-semibold">{t('sense_optin_title')}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{t('sense_optin_desc')}</p>
        <button onClick={handleEnable} className="w-full rounded-xl bg-foreground py-2.5 text-xs font-semibold text-background">
          {t('sense_enable')}
        </button>
      </div>
    );
  }

  const ev = pending[0];
  if (!ev) return null;

  const spec = KIND_TO_ACTIVITY[ev.kind] || KIND_TO_ACTIVITY.other;
  const question = (t(`sense_q_${ev.kind}`) !== `sense_q_${ev.kind}` ? t(`sense_q_${ev.kind}`) : t('sense_q_workout'))
    .replace('{min}', String(ev.minutes));

  const handleRate = async (rating) => {
    let act = (activities || []).find((a) => !a.archived && spec.match(a));
    if (!act) {
      try {
        act = await getDB().Activity.create({ category: 'fitness', ...spec.create });
        qc.invalidateQueries({ queryKey: ['activities'] });
      } catch (e) {
        console.error(e);
      }
    }
    if (act) await optimisticRate(act.id, ev.date, rating);
    markEvent(ev.id, 'rated', rating);
    refresh();
  };

  const handleDismiss = () => {
    markEvent(ev.id, 'dismissed');
    refresh();
  };

  return (
    <AnimatePresence>
      <motion.div
        key={ev.id}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="fixed inset-x-4 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] z-[75] mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-sm font-medium">{question}</p>
          <button onClick={handleDismiss} aria-label={t('sense_dismiss')} className="shrink-0 text-muted-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => handleRate(n)}
              className="rounded-xl border border-border py-2.5 text-sm font-semibold active:scale-95 transition-transform"
            >
              {n}
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
