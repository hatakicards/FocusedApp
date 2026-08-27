import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { referral_code, invitee_id, invitee_email } = await req.json();

    if (!referral_code || !invitee_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find referrer by referral_code
    const referrerSettings = await base44.asServiceRole.entities.UserSettings.filter(
      { referral_code },
      '-created_date',
      1
    );

    if (referrerSettings.length === 0) {
      return Response.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    const referrer = referrerSettings[0];

    // Don't allow self-referral
    if (referrer.created_by_id === invitee_id) {
      return Response.json({ error: 'Cannot refer yourself' }, { status: 400 });
    }

    // Check if referral already exists for this invitee
    const existing = await base44.asServiceRole.entities.Referral.filter(
      { invitee_id },
      '-created_date',
      1
    );

    if (existing.length > 0) {
      return Response.json({ error: 'Already referred', status: 'exists' }, { status: 200 });
    }

    // Create referral record
    await base44.asServiceRole.entities.Referral.create({
      referrer_id: referrer.created_by_id,
      invitee_id,
      invitee_email: invitee_email || '',
      credits_earned: 10,
      spent_euros: 0,
    });

    // Award 10 credits to referrer and convert to premium months if applicable
    let credits = (referrer.credits || 0) + 10;
    let promoUntil = referrer.promo_until;
    let premiumMonths = referrer.referral_premium_months || 0;

    while (credits >= 50) {
      credits -= 50;
      premiumMonths += 1;
      const base = promoUntil && new Date(promoUntil).getTime() > Date.now()
        ? new Date(promoUntil)
        : new Date();
      base.setMonth(base.getMonth() + 1);
      promoUntil = base.toISOString();
    }

    const updateData = { credits, referral_premium_months: premiumMonths };
    if (promoUntil !== referrer.promo_until) {
      updateData.promo_until = promoUntil;
      updateData.subscription_tier = 'premium';
    }

    await base44.asServiceRole.entities.UserSettings.update(referrer.id, updateData);

    return Response.json({ success: true, credits, premium_months: premiumMonths });
  } catch (error) {
    console.error('process-referral error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});