-- ============================================================================
-- Migrazione dati utenti reali da base44 — supporto tecnico.
--
-- I 10 utenti gia' registrati su base44 verranno re-invitati a registrarsi
-- (stessa email) sul nuovo sito Supabase. I loro dati storici vengono
-- importati ORA, agganciati temporaneamente a un utente "segnaposto" interno
-- (mai usato per login vero) tramite la colonna legacy_email aggiunta a ogni
-- tabella. Quando una persona si registra con la stessa email che aveva su
-- base44, il trigger handle_new_user() (aggiornato qui sotto) riassegna
-- automaticamente tutte le sue righe al suo nuovo account, una tantum.
-- ============================================================================

-- Utente segnaposto: possiede temporaneamente i dati importati finche' non
-- vengono reclamati. Non ha password utilizzabile, non puo' autenticarsi.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'legacy-import@internal.focusedapp.local',
  '',
  now(),
  now(),
  now(),
  '{"provider":"internal","providers":["internal"]}'::jsonb,
  '{}'::jsonb,
  false,
  false
)
on conflict (id) do nothing;

-- Colonna di collegamento su ogni tabella dati: email base44 originale del
-- proprietario, finche' non viene reclamata dal trigger (poi torna a null).
alter table public.activity add column if not exists legacy_email text;
alter table public.body_fuel_entry add column if not exists legacy_email text;
alter table public.book add column if not exists legacy_email text;
alter table public.custom_food add column if not exists legacy_email text;
alter table public.daily_rating add column if not exists legacy_email text;
alter table public.day_entry add column if not exists legacy_email text;
alter table public.dream_functionality add column if not exists legacy_email text;
alter table public.focus_time add column if not exists legacy_email text;
alter table public.forum_post add column if not exists legacy_email text;
alter table public.goal add column if not exists legacy_email text;
alter table public.gym_session add column if not exists legacy_email text;
alter table public.lesson_grade add column if not exists legacy_email text;
alter table public.life_stat add column if not exists legacy_email text;
alter table public.phone_time_entry add column if not exists legacy_email text;
alter table public.promo_code_usage add column if not exists legacy_email text;
alter table public.reading_log add column if not exists legacy_email text;
alter table public.referral add column if not exists legacy_email text;
alter table public.smoking_log add column if not exists legacy_email text;
alter table public.smoking_profile add column if not exists legacy_email text;
alter table public.subject add column if not exists legacy_email text;
alter table public.task_item add column if not exists legacy_email text;
alter table public.user_settings add column if not exists legacy_email text;
alter table public.verifica add column if not exists legacy_email text;
alter table public.work_day_log add column if not exists legacy_email text;

create index if not exists activity_legacy_email_idx on public.activity(legacy_email) where legacy_email is not null;
create index if not exists body_fuel_entry_legacy_email_idx on public.body_fuel_entry(legacy_email) where legacy_email is not null;
create index if not exists book_legacy_email_idx on public.book(legacy_email) where legacy_email is not null;
create index if not exists custom_food_legacy_email_idx on public.custom_food(legacy_email) where legacy_email is not null;
create index if not exists daily_rating_legacy_email_idx on public.daily_rating(legacy_email) where legacy_email is not null;
create index if not exists day_entry_legacy_email_idx on public.day_entry(legacy_email) where legacy_email is not null;
create index if not exists dream_functionality_legacy_email_idx on public.dream_functionality(legacy_email) where legacy_email is not null;
create index if not exists focus_time_legacy_email_idx on public.focus_time(legacy_email) where legacy_email is not null;
create index if not exists forum_post_legacy_email_idx on public.forum_post(legacy_email) where legacy_email is not null;
create index if not exists goal_legacy_email_idx on public.goal(legacy_email) where legacy_email is not null;
create index if not exists gym_session_legacy_email_idx on public.gym_session(legacy_email) where legacy_email is not null;
create index if not exists lesson_grade_legacy_email_idx on public.lesson_grade(legacy_email) where legacy_email is not null;
create index if not exists life_stat_legacy_email_idx on public.life_stat(legacy_email) where legacy_email is not null;
create index if not exists phone_time_entry_legacy_email_idx on public.phone_time_entry(legacy_email) where legacy_email is not null;
create index if not exists promo_code_usage_legacy_email_idx on public.promo_code_usage(legacy_email) where legacy_email is not null;
create index if not exists reading_log_legacy_email_idx on public.reading_log(legacy_email) where legacy_email is not null;
create index if not exists referral_legacy_email_idx on public.referral(legacy_email) where legacy_email is not null;
create index if not exists smoking_log_legacy_email_idx on public.smoking_log(legacy_email) where legacy_email is not null;
create index if not exists smoking_profile_legacy_email_idx on public.smoking_profile(legacy_email) where legacy_email is not null;
create index if not exists subject_legacy_email_idx on public.subject(legacy_email) where legacy_email is not null;
create index if not exists task_item_legacy_email_idx on public.task_item(legacy_email) where legacy_email is not null;
create index if not exists user_settings_legacy_email_idx on public.user_settings(legacy_email) where legacy_email is not null;
create index if not exists verifica_legacy_email_idx on public.verifica(legacy_email) where legacy_email is not null;
create index if not exists work_day_log_legacy_email_idx on public.work_day_log(legacy_email) where legacy_email is not null;

-- Estende handle_new_user(): oltre a creare la riga profiles, reclama
-- automaticamente ogni riga di dati importata da base44 che aspetta
-- quell'indirizzo email, riassegnandola al nuovo account appena creato.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;

  update public.activity set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.body_fuel_entry set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.book set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.custom_food set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.daily_rating set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.day_entry set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.dream_functionality set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.focus_time set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.forum_post set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.goal set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.gym_session set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.lesson_grade set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.life_stat set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.phone_time_entry set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.promo_code_usage set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.reading_log set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.referral set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.smoking_log set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.smoking_profile set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.subject set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.task_item set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.user_settings set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.verifica set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);
  update public.work_day_log set created_by_id = new.id, legacy_email = null where lower(legacy_email) = lower(new.email);

  return new;
end;
$$;
