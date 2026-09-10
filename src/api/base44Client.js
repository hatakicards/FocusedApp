// ============================================================================
// Questo file sostituisce l'SDK @base44/sdk con un oggetto "compatibile":
// stessa forma (base44.auth.*, base44.entities.*, base44.functions.invoke,
// base44.integrations.Core.*, base44.agents.*, base44.analytics.*), ma
// dietro le quinte parla con Supabase (dati + auth + storage) e con le
// Netlify Functions in /netlify/functions (tutto cio' che richiede una
// chiave segreta: Stripe, invio email, LLM).
//
// NESSUN ALTRO FILE del progetto importa piu' nulla da qui dentro se non
// `import { base44 } from '@/api/base44Client'` — esattamente come prima.
// Tutta la UI, tutte le pagine, tutti i componenti restano invariati.
// ============================================================================

import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { supabase } from '@/lib/supabaseClient';

const FUNCTIONS_BASE = '/api';

// Un browser esterno per l'OAuth (aperto dentro l'app tramite un overlay di
// sistema, poi rimbalzato indietro con uno scheme personalizzato) si e'
// dimostrato fragile su iOS: Sign in with Apple manda in errore quel giro,
// e in generale iOS puo' bloccare senza nessun errore un redirect verso uno
// scheme personalizzato se non e' innescato da un tap reale dell'utente.
// Gli SDK nativi (SocialLogin) evitano il problema alla radice: l'utente si
// autentica con il sistema operativo direttamente (Face ID / account Google
// nativo), senza mai passare da un browser — il risultato e' un id_token che
// passiamo a Supabase con signInWithIdToken.
let socialLoginInitPromise = null;
function ensureSocialLoginInitialized() {
  if (!socialLoginInitPromise) {
    socialLoginInitPromise = SocialLogin.initialize({
      apple: {}, // iOS usa l'entitlement Sign In with Apple del bundle ID, nessun client id da configurare qui
      google: {
        // Client ID iOS (tipo "iOS", non quello Web usato da Supabase per il
        // web) da Google Cloud Console -> Credentials. Va sostituito con il
        // valore vero prima che il login Google nativo possa funzionare.
        iOSClientId: 'TODO_IOS_CLIENT_ID.apps.googleusercontent.com',
      },
    });
  }
  return socialLoginInitPromise;
}

async function loginWithNativeSdk(provider, returnTo) {
  await ensureSocialLoginInitialized();
  const { result } = await SocialLogin.login({ provider, options: {} });
  const idToken = result?.idToken;
  if (!idToken) throw shimError({ message: 'Nessun token restituito dal provider' }, 'Login failed');
  const { error } = await supabase.auth.signInWithIdToken({ provider, token: idToken });
  if (error) throw shimError(error, 'Login failed');
  window.location.href = returnTo || '/home';
}

// ---------------------------------------------------------------------------
// Utility condivise
// ---------------------------------------------------------------------------

// PascalCase (nome entity, es. "BodyFuelEntry") -> snake_case (nome tabella
// Postgres, "body_fuel_entry"). Deve restare in sync con i nomi tabella in
// supabase/migrations/0001_init.sql.
function toSnakeCase(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

// Trasforma qualunque errore (PostgrestError di supabase-js, errore fetch, o
// un semplice {message}) in un Error "a forma di axios" — cioe' con
// err.response.data.error — perche' alcuni punti dell'app originale (es.
// CalendarEvents.jsx) leggono l'errore in quella forma.
function shimError(original, fallbackMessage = 'Richiesta non riuscita') {
  const message = original?.message || fallbackMessage;
  const err = new Error(message);
  err.status = original?.status ?? original?.code;
  err.response = { data: { error: message } };
  return err;
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

// Chiama una Netlify Function passando il token dell'utente corrente (se
// presente). Risposta sempre incapsulata in { data: ... }, come faceva
// base44.functions.invoke — cosi' `res.data?.campo` nel resto dell'app
// continua a funzionare senza modifiche.
async function invoke(name, payload = {}) {
  const token = await getAccessToken();
  let res;
  try {
    res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    throw shimError(networkError, 'Rete non disponibile');
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    /* risposta vuota o non-JSON: body resta null */
  }

  if (!res.ok) {
    const message = body?.error || `Richiesta a "${name}" fallita (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.response = { status: res.status, data: body || { error: message } };
    throw err;
  }

  return { data: body };
}

// ---------------------------------------------------------------------------
// entities — CRUD generico su Supabase, con la stessa interfaccia usata da
// guestDB.js e da tutto il resto dell'app: list / filter / get / create /
// bulkCreate / update / updateMany / bulkUpdate / delete / deleteMany /
// schema. La sicurezza (chi puo' leggere/scrivere cosa) e' delegata alle
// policy RLS di Postgres, non a questo file.
// ---------------------------------------------------------------------------

function applySort(query, sort) {
  if (!sort) return query;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return query.order(field, { ascending: !desc });
}

// query di filtro in stile base44: { campo: valore, ... } con supporto per
// { $or: [ {campo: valore}, {campo2: valore2} ] }. Non usato oggi da nessuna
// pagina dell'app (verificato), ma fa parte dell'interfaccia originale e lo
// teniamo per compatibilita'.
function applyFilters(query, filter) {
  if (!filter) return query;
  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or') {
      const orExpr = value
        .map((cond) =>
          Object.entries(cond)
            .map(([k, v]) => `${k}.eq.${v}`)
            .join(',')
        )
        .join(',');
      if (orExpr) query = query.or(orExpr);
    } else if (value !== undefined) {
      query = query.eq(key, value);
    }
  }
  return query;
}

function createSupabaseEntity(entityName) {
  const table = toSnakeCase(entityName);

  return {
    async list(sort, limit) {
      let q = supabase.from(table).select('*');
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw shimError(error);
      return data;
    },

    async filter(filterQuery, sort, limit) {
      let q = supabase.from(table).select('*');
      q = applyFilters(q, filterQuery);
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw shimError(error);
      return data;
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw shimError(error);
      return data;
    },

    async create(payload) {
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw shimError(error);
      return data;
    },

    async bulkCreate(payloadArray) {
      const { data, error } = await supabase.from(table).insert(payloadArray).select();
      if (error) throw shimError(error);
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
      if (error) throw shimError(error);
      return data;
    },

    async updateMany(filterQuery, update) {
      const patch = update && typeof update === 'object' && '$set' in update ? update.$set : update;
      let q = supabase.from(table).update(patch || {});
      q = applyFilters(q, filterQuery);
      const { data, error } = await q.select();
      if (error) throw shimError(error);
      return { modifiedCount: data?.length ?? 0 };
    },

    async bulkUpdate(updates) {
      const results = await Promise.all(
        updates.map(({ id, ...fields }) => supabase.from(table).update(fields).eq('id', id).select())
      );
      const failed = results.find((r) => r.error);
      if (failed) throw shimError(failed.error);
      return { modifiedCount: results.length };
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw shimError(error);
      return { success: true };
    },

    async deleteMany(filterQuery) {
      let q = supabase.from(table).delete();
      q = applyFilters(q, filterQuery);
      const { data, error } = await q.select();
      if (error) throw shimError(error);
      return { deletedCount: data?.length ?? 0 };
    },

    async schema() {
      return {};
    },
  };
}

// La entity "User" di base44 non e' una tabella qualunque: e' l'identita'
// autenticata (auth.users) + il ruolo (profiles). Niente create/delete dal
// client, "role" e' protetto anche lato database (vedi guard_profile_role
// nella migration SQL) — qui lo escludiamo anche a monte per chiarezza.
function createUserEntity() {
  return {
    async list(sort, limit) {
      let q = supabase.from('profiles').select('*');
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw shimError(error);
      return data;
    },

    async filter(filterQuery, sort, limit) {
      let q = supabase.from('profiles').select('*');
      q = applyFilters(q, filterQuery);
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw shimError(error);
      return data;
    },

    async get(id) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (error) throw shimError(error);
      return data;
    },

    async create() {
      throw shimError({ message: 'Gli utenti si creano registrandosi (base44.auth.register), non con entities.User.create.' });
    },

    async update(id, payload) {
      const { role: _ignoredRole, ...safePayload } = payload || {};
      const { data, error } = await supabase.from('profiles').update(safePayload).eq('id', id).select().single();
      if (error) throw shimError(error);
      return data;
    },

    async delete() {
      throw shimError({ message: 'Eliminazione utenti non disponibile dal client.' });
    },

    async schema() {
      return {};
    },
  };
}

const entities = new Proxy(
  {},
  {
    get(target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (!(prop in target)) {
        target[prop] = prop === 'User' ? createUserEntity() : createSupabaseEntity(prop);
      }
      return target[prop];
    },
  }
);

// ---------------------------------------------------------------------------
// auth
// ---------------------------------------------------------------------------

function mapUser(supabaseUser, profile) {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    full_name:
      profile?.full_name ||
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      '',
    role: profile?.role || 'user',
    isGuest: false,
  };
}

async function fetchProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data;
}

async function me() {
  // getSession() legge la sessione da storage locale e la rinnova da sola se
  // scaduta (autoRefreshToken), senza richiedere una chiamata di rete riuscita
  // per confermare che l'utente e' autenticato. getUser() invece fa sempre una
  // richiesta a /auth/v1/user: se quella fallisce (rete instabile all'avvio,
  // PWA che si risveglia dopo essere stata in background su mobile, ecc.)
  // l'utente risultava disconnesso pur avendo una sessione locale valida,
  // costringendolo a rifare il login ogni volta sui dispositivi.
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.user) return null;
  const profile = await fetchProfile(data.session.user.id);
  return mapUser(data.session.user, profile);
}

async function isAuthenticated() {
  const { data } = await supabase.auth.getSession();
  return !!data?.session;
}

async function loginViaEmailPassword(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw shimError(error, 'Invalid email or password');
}

async function loginWithProvider(provider, returnTo) {
  if (Capacitor.isNativePlatform() && (provider === 'apple' || provider === 'google')) {
    await loginWithNativeSdk(provider, returnTo);
    return;
  }
  const redirectTo = new URL(returnTo || '/home', window.location.origin).toString();
  // Fire-and-forget: la pagina sta per navigare via verso il provider OAuth.
  supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
}

async function register({ email, password }) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw shimError(error, 'Registration failed');
}

async function verifyOtp({ email, otpCode }) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
  if (error) throw shimError(error, 'Invalid verification code');
  return { access_token: data?.session?.access_token || null };
}

function setToken() {
  // Con Supabase la sessione e' gia' attiva subito dopo verifyOtp/signIn:
  // non c'e' un token separato da "impostare" a mano. Il metodo resta per
  // compatibilita' con il codice chiamante esistente (no-op sicuro).
}

async function resendOtp(email) {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw shimError(error, 'Failed to resend code');
}

async function resetPasswordRequest(email) {
  const redirectTo = new URL('/reset-password', window.location.origin).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw shimError(error);
}

async function resetPassword({ resetToken, newPassword }) {
  const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: resetToken, type: 'recovery' });
  if (verifyError) throw shimError(verifyError, 'Invalid or expired reset link');
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw shimError(updateError, 'Failed to reset password');
}

async function updateMe(payload) {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) throw shimError({ message: 'Not authenticated' });

  if (payload?.full_name !== undefined) {
    await supabase.auth.updateUser({ data: { full_name: payload.full_name } });
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: payload.full_name })
      .eq('id', user.id);
    if (error) throw shimError(error);
  }
  return me();
}

function redirectToLogin() {
  const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?returnTo=${returnTo}`;
}

function logout() {
  supabase.auth.signOut().finally(() => {
    window.location.href = '/login';
  });
}

const auth = {
  me,
  isAuthenticated,
  loginViaEmailPassword,
  loginWithProvider,
  register,
  verifyOtp,
  setToken,
  resendOtp,
  resetPasswordRequest,
  resetPassword,
  updateMe,
  redirectToLogin,
  logout,
};

// ---------------------------------------------------------------------------
// integrations.Core — upload file, invio email, chiamata LLM
// ---------------------------------------------------------------------------

async function UploadFile({ file }) {
  const { data } = await supabase.auth.getUser();
  const uid = data?.user?.id || 'anonymous';
  const extMatch = /\.[a-zA-Z0-9]+$/.exec(file?.name || '');
  const ext = extMatch ? extMatch[0] : '';
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

  const { error } = await supabase.storage.from('app-uploads').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file?.type || undefined,
  });
  if (error) throw shimError(error, 'Upload failed');

  const { data: pub } = supabase.storage.from('app-uploads').getPublicUrl(path);
  return { file_url: pub.publicUrl };
}

async function SendEmail({ to, subject, body }) {
  const { data } = await invoke('send-email', { to, subject, body });
  return data;
}

async function InvokeLLM({ prompt, model, response_json_schema }) {
  const { data } = await invoke('invoke-llm', { prompt, model, response_json_schema });
  return data;
}

const Core = { UploadFile, SendEmail, InvokeLLM };

// ---------------------------------------------------------------------------
// agents — sostituisce le conversazioni realtime di base44 con Netlify
// Functions che rispondono in un colpo solo. Le conversazioni vivono solo in
// memoria nel browser (si perdono al reload, come una chat effimera).
// ---------------------------------------------------------------------------

const _conversations = new Map();

async function createConversation({ agent_name, metadata } = {}) {
  const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  _conversations.set(id, { id, agent_name, metadata, messages: [] });
  return { id, agent_name, metadata };
}

async function addMessage(conversation, { role, content }) {
  const convo = _conversations.get(conversation?.id);
  if (!convo) throw shimError({ message: 'Conversation not found' });
  convo.messages.push({ role, content });

  if (convo.agent_name === 'routine_optimizer') {
    const { data } = await invoke('routine-optimizer', { message: content });
    convo.messages.push({ role: 'assistant', content: data?.reply || '' });
  }
  return { success: true };
}

function subscribeToConversation(conversationId, callback) {
  const convo = _conversations.get(conversationId);
  if (!convo) return () => {};
  // Consegna asincrona sul prossimo tick, per rispettare la stessa forma
  // "sottoscrizione" del codice chiamante (che gia' gestisce l'attesa).
  const timer = setTimeout(() => callback({ messages: convo.messages }), 50);
  return () => clearTimeout(timer);
}

const agents = { createConversation, addMessage, subscribeToConversation };

// ---------------------------------------------------------------------------
// analytics — base44 offriva tracking eventi integrato. Qui e' uno stub
// sicuro (no-op): se in futuro vuoi eventi reali, collega un provider
// (Plausible, PostHog, GA4, ...) dentro questa funzione.
// ---------------------------------------------------------------------------

const analytics = {
  track() {},
};

// ---------------------------------------------------------------------------

export const base44 = {
  auth,
  entities,
  functions: { invoke },
  integrations: { Core },
  agents,
  analytics,
};
