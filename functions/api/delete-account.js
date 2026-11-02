import { getSupabaseAdmin, getUserFromRequest, jsonResponse } from './_shared/supabaseAdmin.js';
import { getStripe } from './_shared/stripeClient.js';

// Cancellazione vera dell'account (GDPR art. 17, Apple 5.1.1(v), Google Play "Eliminazione dell'account").
// Ordine voluto: prima cio' che e' fuori dal database (abbonamento web, file, RevenueCat), poi le
// tracce che il cascade non raggiunge (voti, inviti), per ultimo l'utente auth: tutte le tabelle con
// dati personali hanno `references auth.users(id) on delete cascade` (vedi supabase/migrations), quindi
// auth.admin.deleteUser porta via il resto. Se un passo fallisce si risponde con l'errore e l'utente
// resta com'e': riprovare e' sicuro perche' ogni passo e' ripetibile.

const BUCKET = 'app-uploads';

// Annulla subito gli abbonamenti Stripe (sito web). Gli abbonamenti App Store / Google Play non si
// possono annullare da qui: lo fa l'utente dallo store (la UI lo avvisa).
async function cancelStripeSubscriptions(supabaseAdmin, env, userId) {
  const { data: rows, error } = await supabaseAdmin
    .from('user_settings')
    .select('stripe_subscription_id')
    .eq('created_by_id', userId);
  if (error) throw error;
  const ids = [...new Set((rows || []).map((r) => r.stripe_subscription_id).filter(Boolean))];
  if (!ids.length) return 0;

  const stripe = getStripe(env);
  for (const id of ids) {
    try {
      await stripe.subscriptions.cancel(id);
    } catch (e) {
      // Gia' annullato o inesistente: l'obiettivo (nessun addebito futuro) e' raggiunto.
      if (e?.code === 'resource_missing' || e?.statusCode === 404) continue;
      throw e;
    }
  }
  return ids.length;
}

// Svuota la cartella app-uploads/<uid>/ (copertine libri, immagini dei post). Il bucket e' in lettura
// pubblica, quindi i file non possono restare dopo la cancellazione.
async function deleteUserFiles(supabaseAdmin, userId) {
  const bucket = supabaseAdmin.storage.from(BUCKET);
  let removed = 0;
  // Si rilegge sempre dall'inizio: dopo ogni remove() la pagina successiva scorre in avanti.
  for (let guard = 0; guard < 50; guard++) {
    const { data: files, error } = await bucket.list(userId, { limit: 1000 });
    if (error) throw error;
    const names = (files || []).filter((f) => f.name && f.id).map((f) => `${userId}/${f.name}`);
    if (!names.length) break;
    const { error: rmError } = await bucket.remove(names);
    if (rmError) throw rmError;
    removed += names.length;
    if (names.length < 1000) break;
  }
  return removed;
}

// Toglie l'utente dai voti sulla bacheca idee (liked_by / disliked_by sono array di UUID, senza FK).
async function removeDreamVotes(supabaseAdmin, userId) {
  for (const column of ['liked_by', 'disliked_by']) {
    const { data: dreams, error } = await supabaseAdmin
      .from('dream_functionality')
      .select(`id, ${column}`)
      .contains(column, JSON.stringify([userId]));
    if (error) throw error;
    for (const dream of dreams || []) {
      const next = (Array.isArray(dream[column]) ? dream[column] : []).filter((v) => v !== userId);
      const { error: updErr } = await supabaseAdmin
        .from('dream_functionality')
        .update({ [column]: next })
        .eq('id', dream.id);
      if (updErr) throw updErr;
    }
  }
}

// referral.referrer_id / invitee_id non hanno FK: le righe create da altri utenti che citano questo
// (per esempio chi e' stato invitato da lui, con la sua email) vanno tolte a mano.
async function removeReferrals(supabaseAdmin, userId) {
  const { error } = await supabaseAdmin
    .from('referral')
    .delete()
    .or(`referrer_id.eq.${userId},invitee_id.eq.${userId},created_by_id.eq.${userId}`);
  if (error) throw error;
}

// Cancella lo "subscriber" su RevenueCat (ID = uid Supabase). Facoltativo: serve la chiave segreta
// REVENUECAT_SECRET_API_KEY nei secret di Cloudflare Pages; senza, si salta. Un errore qui non blocca
// la cancellazione (l'ID e' un UUID che non rimanda piu' a nessun account).
async function deleteRevenueCatSubscriber(env, userId) {
  if (!env.REVENUECAT_SECRET_API_KEY) return 'skipped';
  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${env.REVENUECAT_SECRET_API_KEY}` },
    });
    return res.ok || res.status === 404 ? 'deleted' : `error_${res.status}`;
  } catch (e) {
    console.error('delete-account: revenuecat error', e);
    return 'error';
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const supabaseAdmin = getSupabaseAdmin(env);
    const user = await getUserFromRequest(request, supabaseAdmin);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    let body = null;
    try { body = await request.json(); } catch { /* corpo vuoto */ }
    if (body?.confirm !== true) return jsonResponse({ error: 'Conferma mancante' }, 400);

    const userId = user.id;

    const stripeCancelled = await cancelStripeSubscriptions(supabaseAdmin, env, userId);
    const filesRemoved = await deleteUserFiles(supabaseAdmin, userId);
    await removeDreamVotes(supabaseAdmin, userId);
    await removeReferrals(supabaseAdmin, userId);
    const revenueCat = await deleteRevenueCatSubscriber(env, userId);

    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delError) throw delError;

    return jsonResponse({ success: true, stripe_cancelled: stripeCancelled, files_removed: filesRemoved, revenuecat: revenueCat });
  } catch (error) {
    console.error('delete-account error', error);
    return jsonResponse({ error: error?.message || 'Errore durante la cancellazione' }, 500);
  }
}
