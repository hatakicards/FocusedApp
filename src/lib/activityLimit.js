import { useMemo } from 'react';
import { useActivities, useSubscription, useUserSettings } from '@/lib/useAppData';

// 1.5: nel piano gratuito al massimo 4 attivita' attive; con Pro o Premium illimitate.
// Le attivita' oltre il limite non si cancellano: restano con il lucchetto e tornano
// attive passando a un piano. Quali 4 restano attive lo sceglie l'utente (free_activity_ids
// in user_settings); se non ha scelto, valgono le 4 create per prime.
export const FREE_ACTIVITY_LIMIT = 4;

// Le attivita' che contano nel limite: quelle create dall'utente e visibili in Today.
// La palestra (is_gym) e le attivita' preimpostate hanno il loro percorso e non contano.
export function countableActivities(activities) {
  return (activities || []).filter((a) => !a.archived && !a.is_gym && !a.preset_type);
}

export function pickActiveIds(list, chosen) {
  const byAge = [...list].sort((a, b) => String(a.created_date || '').localeCompare(String(b.created_date || '')));
  const existing = new Set(list.map((a) => a.id));
  const picked = (Array.isArray(chosen) ? chosen : []).filter((id) => existing.has(id)).slice(0, FREE_ACTIVITY_LIMIT);
  for (const a of byAge) {
    if (picked.length >= FREE_ACTIVITY_LIMIT) break;
    if (!picked.includes(a.id)) picked.push(a.id);
  }
  return new Set(picked);
}

export function useActivityLimit() {
  const { data: activities } = useActivities();
  const { data: settings } = useUserSettings();
  const sub = useSubscription();
  return useMemo(() => {
    const list = countableActivities(activities);
    const limited = !sub.isPro;
    if (!limited) {
      return { limited, list, count: list.length, canAdd: true, isLocked: () => false, lockedCount: 0, chosen: true };
    }
    const active = pickActiveIds(list, settings?.free_activity_ids);
    const lockedCount = list.filter((a) => !active.has(a.id)).length;
    return {
      limited,
      list,
      count: list.length,
      canAdd: list.length < FREE_ACTIVITY_LIMIT,
      isLocked: (id) => !active.has(id),
      lockedCount,
      activeIds: active,
      chosen: Array.isArray(settings?.free_activity_ids),
    };
  }, [activities, settings?.free_activity_ids, sub.isPro]);
}
