import { getSupabaseAdmin, getUserFromRequest, jsonResponse } from './_shared/supabaseAdmin.js';
import { getStripe } from './_shared/stripeClient.js';

// Unica email autorizzata a vedere questi dati. Controllo fatto qui,
// lato server con la service role key — non basarsi solo su un check
// nel componente React, che chiunque potrebbe aggirare chiamando
// direttamente questo endpoint.
const ADMIN_EMAIL = 'danimandurinz2010@gmail.com';

export async function onRequestPost({ request, env }) {
  try {
    const supabaseAdmin = getSupabaseAdmin(env);
    const user = await getUserFromRequest(request, supabaseAdmin);
    if (!user || user.email !== ADMIN_EMAIL) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const [promoRes, settingsRes, authUsersRes] = await Promise.all([
      supabaseAdmin.from('promo_code_usage').select('*').order('created_date', { ascending: false }).limit(500),
      supabaseAdmin.from('user_settings').select('created_by_id, created_date, subscription_tier, stripe_subscription_id, ads_removed, promo_until, trial_start'),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (promoRes.error) throw promoRes.error;
    if (settingsRes.error) throw settingsRes.error;
    if (authUsersRes.error) throw authUsersRes.error;

    const authUsers = authUsersRes.data.users || [];
    const emailById = new Map(authUsers.map((u) => [u.id, u.email]));

    // --- Analytics: login/registrazioni (dati reali di Supabase Auth) ---
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 86400000;
    const totalUsers = authUsers.length;
    const newLast7d = authUsers.filter((u) => new Date(u.created_at).getTime() >= sevenDaysAgo).length;
    const activeLast7d = authUsers.filter((u) => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() >= sevenDaysAgo).length;
    const recentSignups = [...authUsers]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20)
      .map((u) => ({ email: u.email, createdAt: u.created_at, lastSignInAt: u.last_sign_in_at || null }));

    // --- Acquisti: chi ha premium/pro adesso (settings piu' recente per utente) ---
    const latestSettingsByUser = new Map();
    for (const s of settingsRes.data || []) {
      const existing = latestSettingsByUser.get(s.created_by_id);
      if (!existing || new Date(s.created_date) > new Date(existing.created_date)) {
        latestSettingsByUser.set(s.created_by_id, s);
      }
    }
    const premiumUsers = [];
    for (const [uid, s] of latestSettingsByUser) {
      const hasPromo = s.promo_until && new Date(s.promo_until) > new Date();
      const hasTrial = s.trial_start && (Date.now() - new Date(s.trial_start).getTime()) < 7 * 86400000;
      if ((s.subscription_tier && s.subscription_tier !== 'free') || hasPromo || hasTrial) {
        premiumUsers.push({
          email: emailById.get(uid) || 'N/A',
          tier: s.subscription_tier || 'free',
          stripeSubscriptionId: s.stripe_subscription_id || null,
          promoUntil: s.promo_until || null,
          trialActive: hasTrial,
        });
      }
    }

    // --- Ricavi reali da Stripe ---
    let revenue = { totalNetCents: 0, currency: 'eur', transactionCount: 0 };
    let activeSubscriptions = [];
    try {
      const stripe = getStripe(env);
      const [txns, subs] = await Promise.all([
        stripe.balanceTransactions.list({ limit: 100 }),
        stripe.subscriptions.list({ status: 'active', limit: 100, expand: ['data.customer'] }),
      ]);
      revenue.totalNetCents = txns.data.reduce((sum, t) => sum + t.net, 0);
      revenue.currency = txns.data[0]?.currency || 'eur';
      revenue.transactionCount = txns.data.length;
      activeSubscriptions = subs.data.map((s) => ({
        customerEmail: (typeof s.customer === 'object' ? s.customer?.email : null) || null,
        amount: s.items.data[0]?.price?.unit_amount ?? null,
        currency: s.items.data[0]?.price?.currency ?? null,
        interval: s.items.data[0]?.price?.recurring?.interval ?? null,
        currentPeriodEnd: s.current_period_end,
      }));
    } catch (e) {
      revenue.error = e.message;
    }

    return jsonResponse({
      promoUsage: promoRes.data || [],
      analytics: { totalUsers, newLast7d, activeLast7d, recentSignups },
      purchases: { premiumUsers, revenue, activeSubscriptions },
    });
  } catch (error) {
    console.error('admin-data error', error);
    return jsonResponse({ error: error.message }, 500);
  }
}
