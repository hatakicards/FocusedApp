-- Due correzioni alla protezione delle colonne di abbonamento su user_settings (0008):
--
-- 1. La prova Premium di 3 giorni in app (benvenuto, src/components/welcome/StepTrial.jsx) scrive
--    trial_start dal client, ma il trigger lo rimetteva com'era: la prova non partiva per nessun account.
--    Ora il client puo' impostare trial_start UNA volta sola (se era vuoto) e solo con l'ora attuale
--    (+-5 minuti), quindi non si puo' allungare, ripetere o spostare in avanti la prova.
--
-- 2. Il trigger era solo BEFORE UPDATE: con un INSERT diretto alla REST API un client poteva creare la
--    propria riga con subscription_tier 'premium', promo_until lontano, crediti, ecc. Ora anche
--    sull'INSERT, da client, queste colonne tornano ai valori di partenza (trial_start solo se "adesso").
--    Webhook e funzioni server usano la service role e non sono toccati.
create or replace function public.guard_user_settings_monetization()
returns trigger
language plpgsql
as $$
declare
  trial_ok boolean;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  trial_ok := new.trial_start is not null
    and abs(extract(epoch from (new.trial_start - now()))) <= 300;

  if tg_op = 'INSERT' then
    new.subscription_tier := 'free';
    new.stripe_subscription_id := null;
    new.promo_until := null;
    new.credits := 0;
    new.referral_premium_months := 0;
    new.ads_removed := false;
    if not trial_ok then
      new.trial_start := null;
    end if;
    return new;
  end if;

  if new.subscription_tier is distinct from old.subscription_tier then
    new.subscription_tier = old.subscription_tier;
  end if;
  if new.stripe_subscription_id is distinct from old.stripe_subscription_id then
    new.stripe_subscription_id = old.stripe_subscription_id;
  end if;
  if new.trial_start is distinct from old.trial_start
     and not (old.trial_start is null and trial_ok) then
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
  return new;
end;
$$;

drop trigger if exists user_settings_guard_monetization on public.user_settings;
create trigger user_settings_guard_monetization
  before insert or update on public.user_settings
  for each row execute function public.guard_user_settings_monetization();
