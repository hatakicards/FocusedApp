import { useMemo } from 'react';
import { useT } from '@/lib/i18n';

const FEEDBACK = {
  base: {
    1: 'fb_base_1', 2: 'fb_base_2', 3: 'fb_base_3', 4: 'fb_base_4', 5: 'fb_base_5',
  },
  atleta: {
    1: 'fb_atleta_1', 2: 'fb_atleta_2', 3: 'fb_atleta_3', 4: 'fb_atleta_4', 5: 'fb_atleta_5',
  },
  studente: {
    1: 'fb_studente_1', 2: 'fb_studente_2', 3: 'fb_studente_3', 4: 'fb_studente_4', 5: 'fb_studente_5',
  },
  professionista: {
    1: 'fb_prof_1', 2: 'fb_prof_2', 3: 'fb_prof_3', 4: 'fb_prof_4', 5: 'fb_prof_5',
  },
};

const EMOJI = { 1: '💪', 2: '🔄', 3: '📈', 4: '🔥', 5: '🏆' };

export default function DynamicFeedback({ rating, profileType }) {
  const t = useT();
  const key = useMemo(() => {
    if (!rating || rating < 1 || rating > 5) return null;
    const profile = FEEDBACK[profileType] ? profileType : 'base';
    return FEEDBACK[profile][rating];
  }, [rating, profileType]);

  if (!key) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6 text-center">
      <p className="text-2xl mb-2">{EMOJI[rating]}</p>
      <p className="text-sm font-medium leading-relaxed">{t(key)}</p>
    </div>
  );
}