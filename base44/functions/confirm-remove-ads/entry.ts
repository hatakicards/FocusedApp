import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const sessionId = body.session_id;
    if (!sessionId || typeof sessionId !== 'string') {
      return Response.json({ error: 'missing session_id' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return Response.json({ error: 'payment not completed' }, { status: 400 });
    }
    if (session.metadata?.base44_app_id !== Deno.env.get('BASE44_APP_ID')) {
      return Response.json({ error: 'session ownership mismatch' }, { status: 403 });
    }

    const userId = session.metadata?.user_id;
    if (!userId) {
      return Response.json({ error: 'missing user_id in session' }, { status: 400 });
    }

    const tier = session.metadata?.tier === 'premium' ? 'premium' : 'pro';

    const settings = await base44.asServiceRole.entities.UserSettings.filter({ created_by_id: userId }, '-created_date', 10);
    if (settings.length > 0) {
      await base44.asServiceRole.entities.UserSettings.update(settings[0].id, {
        ads_removed: true,
        subscription_tier: tier,
      });
    } else {
      await base44.asServiceRole.entities.UserSettings.create({
        ads_removed: true,
        subscription_tier: tier,
        created_by_id: userId,
      });
    }

    return Response.json({ ok: true, tier });
  } catch (error) {
    console.error('confirm-premium error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});