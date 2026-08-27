// Client Supabase lato server, con la SERVICE ROLE KEY: bypassa le policy
// RLS (Row Level Security), quindi va usato SOLO dentro le Netlify
// Functions, mai spedito al browser. Ogni funzione che deve leggere o
// scrivere dati per conto di un utente verifica prima la sua identita' con
// getUserFromRequest(), poi interroga le tabelle filtrando esplicitamente
// per quell'utente (la RLS qui non aiuta piu', quindi il filtro va scritto
// a mano in ogni query, esattamente come faceva base44.asServiceRole).
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Estrae e verifica l'utente dal header "Authorization: Bearer <token>"
// che src/api/base44Client.js aggiunge automaticamente ad ogni invoke().
// Ritorna null se il token manca o non e' valido (chiamante non autenticato).
export async function getUserFromRequest(req) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
