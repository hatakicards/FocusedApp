-- Le colonne di abbonamento/monetizzazione su user_settings erano
-- aggiornabili dal client (RLS controllava solo "e' la tua riga?", non
-- "quali colonne stai cambiando"): bastava una PATCH diretta alla REST API
-- di Supabase con la propria anon key + JWT per auto-assegnarsi premium
-- gratis, bypassando IAP, Stripe e tutti i controlli lato UI. Stesso
-- pattern di guard_profile_role() in 0001_init.sql, ma per queste colonne.
create or replace function public.guard_user_settings_monetization()
returns trigger
language plpgsql
as $$
begin
  if auth.role() <> 'service_role' then
    if new.subscription_tier is distinct from old.subscription_tier then
      new.subscription_tier = old.subscription_tier;
    end if;
    if new.stripe_subscription_id is distinct from old.stripe_subscription_id then
      new.stripe_subscription_id = old.stripe_subscription_id;
    end if;
    if new.trial_start is distinct from old.trial_start then
      new.trial_start = old.trial_start;
    end if;
    if new.promo_until is distinct from old.promo_until then
      new.promo_until = old.promo_until;
    end if;
    if new.credits is distinct from old.credits then
      new.credits = old.credits;
    end if;
    if new.referral_premium_months is distinct from old.referral_premium_months then
      new.referral_premium_months = old.referral_premium_months;
    end if;
    if new.ads_removed is distinct from old.ads_removed then
      new.ads_removed = old.ads_removed;
    end if;
  end if;
  return new;
end;
$$;

create trigger user_settings_guard_monetization
  before update on public.user_settings
  for each row execute function public.guard_user_settings_monetization();
