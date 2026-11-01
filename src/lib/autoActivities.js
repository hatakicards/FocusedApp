import { useMemo } from 'react';
import { useBodyFuelEntries, useUserSettings } from '@/lib/useAppData';
import { computeStreak } from '@/lib/productivity';
import { computeCalorieRating, computeSleepRating } from '@/lib/foodDatabase';

// "Eating well" e "Sleeping well": con Premium compaiono da sole in Today e prendono il
// voto dai dati che l'utente gia' inserisce in BodyFuel/Athlete (cibo e sonno), senza
// che debba valutarle a mano.

// Stesse formule di BodyFuel, cosi' il voto che vedi li' (per esempio 4/5) e' quello che arriva in Today.
// Le giornate salvate prima che l'obiettivo calorie venisse registrato usano quello attuale dalle impostazioni.
export function eatingRating(entry, fallbackGoal) {
  const goal = Number(entry?.calories_goal) || Number(fallbackGoal) || 0;
  return computeCalorieRating(Number(entry?.calories_consumed) || 0, goal) || null;
}

export function sleepRating(entry) {
  return computeSleepRating(Number(entry?.sleep_hours) || 0, Number(entry?.sleep_minutes) || 0) || null;
}

export const AUTO_ACTIVITIES = [
  { id: 'auto-eating', nameKey: 'eating_well', icon: 'apple', rate: (entry, goal) => eatingRating(entry, goal) },
  { id: 'auto-sleeping', nameKey: 'sleeping_well', icon: 'moon', rate: (entry) => sleepRating(entry) },
];

// Elenco delle attivita' automatiche con voto di oggi e serie. Vuoto se non e' abilitato.
export function useAutoActivities(enabled, today) {
  const { data: entries } = useBodyFuelEntries();
  const { data: settings } = useUserSettings();
  const goal = settings?.daily_calories_goal || 0;
  return useMemo(() => {
    if (!enabled) return [];
    return AUTO_ACTIVITIES.map((a) => {
      const ratings = (entries || [])
        .map((e) => ({ date: e.date, rating: a.rate(e, goal) }))
        .filter((r) => r.rating != null);
      return {
        ...a,
        ratings,
        todayRating: ratings.find((r) => r.date === today)?.rating ?? null,
        streak: computeStreak(ratings),
      };
    });
  }, [enabled, entries, today, goal]);
}
