import { useMemo } from 'react';
import { useBodyFuelEntries } from '@/lib/useAppData';
import { computeStreak } from '@/lib/productivity';

// "Eating well" e "Sleeping well": con Premium compaiono da sole in Today e prendono il
// voto dai dati che l'utente gia' inserisce in BodyFuel/Athlete (cibo e sonno), senza
// che debba valutarle a mano.

export function eatingRating(entry) {
  const consumed = Number(entry?.calories_consumed);
  const goal = Number(entry?.calories_goal);
  if (!consumed || !goal) return null;
  const dev = Math.abs(1 - consumed / goal);
  if (dev <= 0.1) return 5;
  if (dev <= 0.2) return 4;
  if (dev <= 0.3) return 3;
  if (dev <= 0.45) return 2;
  return 1;
}

export function sleepRating(entry) {
  const minutes = (Number(entry?.sleep_hours) || 0) * 60 + (Number(entry?.sleep_minutes) || 0);
  if (!minutes) return null;
  const h = minutes / 60;
  if (h >= 7 && h <= 9) return 5;
  if ((h >= 6.5 && h < 7) || (h > 9 && h <= 9.5)) return 4;
  if ((h >= 6 && h < 6.5) || (h > 9.5 && h <= 10)) return 3;
  if ((h >= 5 && h < 6) || h > 10) return 2;
  return 1;
}

export const AUTO_ACTIVITIES = [
  { id: 'auto-eating', nameKey: 'eating_well', icon: 'apple', rate: eatingRating },
  { id: 'auto-sleeping', nameKey: 'sleeping_well', icon: 'moon', rate: sleepRating },
];

// Elenco delle attivita' automatiche con voto di oggi e serie. Vuoto se non e' abilitato.
export function useAutoActivities(enabled, today) {
  const { data: entries } = useBodyFuelEntries();
  return useMemo(() => {
    if (!enabled) return [];
    return AUTO_ACTIVITIES.map((a) => {
      const ratings = (entries || [])
        .map((e) => ({ date: e.date, rating: a.rate(e) }))
        .filter((r) => r.rating != null);
      return {
        ...a,
        ratings,
        todayRating: ratings.find((r) => r.date === today)?.rating ?? null,
        streak: computeStreak(ratings),
      };
    });
  }, [enabled, entries, today]);
}
