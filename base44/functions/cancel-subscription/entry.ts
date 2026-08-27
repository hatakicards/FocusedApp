import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@14.21.0';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const settings = await base44.asServiceRole.entities.UserSettings.filter(
      { created_by_id: user.id },
      '-created_date',
      1
    );
    if (!settings.length || !settings[0].stripe_subscription_id) {
      return Response.json({ error: 'Nessun abbonamento attivo' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const subscription = await stripe.subscriptions.update(
      settings[0].stripe_subscription_id,
      { cancel_at_period_end: true }
    );

    return Response.json({
      success: true,
      cancel_at: new Date(subscription.current_period_end * 1000).toISOString(),
    });
  } catch (error) {
    console.error('cancel-subscription error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}