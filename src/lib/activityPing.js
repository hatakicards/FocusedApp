import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabaseClient';

// Registra l'ultima apertura dell'app (user_activity.last_seen_at). Al massimo una
// scrittura ogni 15 minuti per dispositivo, e solo per utenti veri (non ospiti).
const KEY = 'activity_ping_at';
const EVERY_MS = 15 * 60 * 1000;

export async function pingActivity(userId) {
  if (!userId) return;
  try {
    const last = Number(localStorage.getItem(KEY) || 0);
    if (Date.now() - last < EVERY_MS) return;
    localStorage.setItem(KEY, String(Date.now()));
  } catch { /* ignore */ }
  try {
    await supabase
      .from('user_activity')
      .upsert({ user_id: userId, last_seen_at: new Date().toISOString(), platform: Capacitor.getPlatform() }, { onConflict: 'user_id' });
  } catch { /* ignore: non deve mai disturbare l'app */ }
}
