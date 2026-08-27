// Client Supabase lato server, con la SERVICE ROLE KEY: bypassa le policy
// RLS (Row Level Security), quindi va usato SOLO dentro le Cloudflare Pages
// Functions, mai spedito al browser. Ogni funzione che deve leggere o
// scrivere dati per conto di un utente verifica prima la sua identita' con
// getUserFromRequest(), poi interroga le tabelle filtrando esplicitamente
// per quell'utente (la RLS qui non aiuta piu', quindi il filtro va scritto
// a mano in ogni query, esattamente come faceva base44.asServiceRole).
//
// A differenza di Netlify, su Cloudflare le variabili d'ambiente non sono
// disponibili come process.env a livello di modulo: arrivano solo dentro
// l'handler tramite context.env. Per questo il client viene creato con una
// funzione (getSupabaseAdmin(env)) invece che come singleton al top-level,
// e viene cachato per-richiesta dal chiamante se serve riusarlo.
import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Estrae e verifica l'utente dal header "Authorization: Bearer <token>"
// che src/api/base44Client.js aggiunge automaticamente ad ogni invoke().
// Ritorna null se il token manca o non e' valido (chiamante non autenticato).
export async function getUserFromRequest(request, supabaseAdmin) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
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
