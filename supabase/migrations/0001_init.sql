-- ============================================================================
-- FOCUSED — Schema Supabase (sostituisce base44)
-- ============================================================================
-- Come si usa:
--   1. Vai su supabase.com → il tuo progetto → SQL Editor → New query
--   2. Incolla TUTTO questo file
--   3. Run (una volta sola — è tutto idempotente, puoi rilanciarlo se serve)
--
-- Vedi GUIDA_MIGRAZIONE.md per il contesto completo (creazione progetto,
-- variabili d'ambiente, ecc).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. ESTENSIONI
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;


-- ----------------------------------------------------------------------------
-- 1. FUNZIONI DI SUPPORTO
-- ----------------------------------------------------------------------------

-- Aggiorna automaticamente updated_date ad ogni UPDATE su qualunque tabella.
create or replace function public.set_updated_date()
returns trigger
language plpgsql
as $$
begin
  new.updated_date = now();
  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- 2. PROFILES — equivalente della entity "User" di base44 (identita' + ruolo)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('admin','user')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Vero se l'utente (di default: quello corrente) ha ruolo admin.
-- security definer + search_path fisso: puo' essere chiamata dentro le
-- policy RLS di "profiles" senza causare ricorsione infinita.
-- Deve stare DOPO "create table public.profiles": essendo "language sql",
-- Postgres valida i riferimenti gia' alla creazione (non al primo utilizzo
-- come per plpgsql), quindi fallirebbe se la tabella non esiste ancora.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = uid),
    false
  );
$$;

create trigger profiles_set_updated_date
  before update on public.profiles
  for each row execute function public.set_updated_date();

-- Crea automaticamente la riga profiles alla registrazione, copiando il nome
-- da user_metadata se gia' presente (Google lo passa in automatico).
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tiene sincronizzata l'email in profiles se l'utente la cambia in futuro.
create or replace function public.handle_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update on auth.users
  for each row execute function public.handle_user_email_update();

-- Impedisce l'auto-promozione ad admin: "role" cambia solo se la richiesta
-- usa la service role key (cioe' dalle Netlify Functions), mai dal client.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    new.role = old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Ognuno vede/aggiorna la propria riga; gli admin vedono tutti (serve alla
-- pagina Admin Analytics per contare gli utenti registrati).
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Per rendersi admin la prima volta: dalla dashboard Supabase, tab
-- "Table Editor" -> profiles -> modifica manualmente la riga "role" a
-- 'admin' per il tuo utente (la modifica da dashboard usa la service role
-- e quindi bypassa il guard sopra).


-- ----------------------------------------------------------------------------
-- 3. TABELLE DATI — una per ogni entity di base44
-- ----------------------------------------------------------------------------
-- Pattern comune a tutte (tranne le eccezioni segnalate esplicitamente):
--   id, created_by_id, created_date, updated_date + RLS "solo il proprio
--   record, o admin" su create/read/update/delete — identico alle regole
--   rls di ogni file base44/entities/*.jsonc originale.

-- ---- Activity ----
create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  name text not null,
  category text not null default 'fitness' check (category in ('fitness','mente','apprendimento','sport','work','studies','lifestyle','custom')),
  custom_category_name text,
  emoji text,
  archived boolean not null default false,
  is_gym boolean not null default false,
  preset_type text check (preset_type in ('gym','phone_time','reading','quit_smoking')),
  source text not null default 'manual',
  google_event_id text,
  google_recurring_event_id text
);
alter table public.activity enable row level security;
create trigger activity_set_updated_date before update on public.activity for each row execute function public.set_updated_date();
create index if not exists activity_created_by_id_idx on public.activity(created_by_id);
create policy activity_select on public.activity for select using (created_by_id = auth.uid() or public.is_admin());
create policy activity_insert on public.activity for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy activity_update on public.activity for update using (created_by_id = auth.uid() or public.is_admin());
create policy activity_delete on public.activity for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- BodyFuelEntry ----
create table if not exists public.body_fuel_entry (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  date date not null,
  calories_consumed integer check (calories_consumed >= 0),
  calories_goal integer check (calories_goal >= 0),
  protein_consumed numeric check (protein_consumed >= 0),
  carbs_consumed numeric check (carbs_consumed >= 0),
  lipids_consumed numeric check (lipids_consumed >= 0),
  food_log jsonb not null default '[]'::jsonb,
  weight numeric check (weight >= 0),
  height numeric check (height >= 0),
  sleep_bedtime text,
  sleep_wake_time text,
  sleep_hours integer check (sleep_hours between 0 and 24),
  sleep_minutes integer check (sleep_minutes between 0 and 59),
  sleep_quality integer check (sleep_quality between 1 and 5),
  notes text
);
alter table public.body_fuel_entry enable row level security;
create trigger body_fuel_entry_set_updated_date before update on public.body_fuel_entry for each row execute function public.set_updated_date();
create index if not exists body_fuel_entry_created_by_id_idx on public.body_fuel_entry(created_by_id);
create index if not exists body_fuel_entry_date_idx on public.body_fuel_entry(date);
create policy body_fuel_entry_select on public.body_fuel_entry for select using (created_by_id = auth.uid() or public.is_admin());
create policy body_fuel_entry_insert on public.body_fuel_entry for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy body_fuel_entry_update on public.body_fuel_entry for update using (created_by_id = auth.uid() or public.is_admin());
create policy body_fuel_entry_delete on public.body_fuel_entry for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- Book ----
create table if not exists public.book (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  title text not null,
  cover_url text,
  total_pages integer not null check (total_pages >= 1),
  target_date date,
  current_page integer not null default 0 check (current_page >= 0),
  status text not null default 'reading' check (status in ('reading','completed','paused'))
);
alter table public.book enable row level security;
create trigger book_set_updated_date before update on public.book for each row execute function public.set_updated_date();
create index if not exists book_created_by_id_idx on public.book(created_by_id);
create policy book_select on public.book for select using (created_by_id = auth.uid() or public.is_admin());
create policy book_insert on public.book for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy book_update on public.book for update using (created_by_id = auth.uid() or public.is_admin());
create policy book_delete on public.book for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- CustomFood ----
create table if not exists public.custom_food (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  name text not null,
  kcal numeric not null check (kcal >= 0),
  protein numeric not null check (protein >= 0),
  carbs numeric not null check (carbs >= 0),
  lipids numeric not null check (lipids >= 0)
);
alter table public.custom_food enable row level security;
create trigger custom_food_set_updated_date before update on public.custom_food for each row execute function public.set_updated_date();
create index if not exists custom_food_created_by_id_idx on public.custom_food(created_by_id);
create policy custom_food_select on public.custom_food for select using (created_by_id = auth.uid() or public.is_admin());
create policy custom_food_insert on public.custom_food for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy custom_food_update on public.custom_food for update using (created_by_id = auth.uid() or public.is_admin());
create policy custom_food_delete on public.custom_food for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- DailyRating ----
create table if not exists public.daily_rating (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  activity_id uuid not null,
  date date not null,
  rating integer not null check (rating between 1 and 5)
);
alter table public.daily_rating enable row level security;
create trigger daily_rating_set_updated_date before update on public.daily_rating for each row execute function public.set_updated_date();
create index if not exists daily_rating_created_by_id_idx on public.daily_rating(created_by_id);
create index if not exists daily_rating_activity_id_idx on public.daily_rating(activity_id);
create policy daily_rating_select on public.daily_rating for select using (created_by_id = auth.uid() or public.is_admin());
create policy daily_rating_insert on public.daily_rating for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy daily_rating_update on public.daily_rating for update using (created_by_id = auth.uid() or public.is_admin());
create policy daily_rating_delete on public.daily_rating for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- DayEntry ----
create table if not exists public.day_entry (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  date date not null,
  day_rating integer not null check (day_rating between 1 and 5),
  thoughts text
);
alter table public.day_entry enable row level security;
create trigger day_entry_set_updated_date before update on public.day_entry for each row execute function public.set_updated_date();
create index if not exists day_entry_created_by_id_idx on public.day_entry(created_by_id);
create index if not exists day_entry_date_idx on public.day_entry(date);
create policy day_entry_select on public.day_entry for select using (created_by_id = auth.uid() or public.is_admin());
create policy day_entry_insert on public.day_entry for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy day_entry_update on public.day_entry for update using (created_by_id = auth.uid() or public.is_admin());
create policy day_entry_delete on public.day_entry for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- DreamFunctionality ---- (ECCEZIONE: lettura pubblica, update/delete solo admin)
create table if not exists public.dream_functionality (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  title text not null,
  description text not null,
  status text not null default 'pending' check (status in ('pending','approved','implemented','rejected')),
  credits_awarded boolean not null default false,
  liked_by jsonb not null default '[]'::jsonb,
  disliked_by jsonb not null default '[]'::jsonb
);
alter table public.dream_functionality enable row level security;
create trigger dream_functionality_set_updated_date before update on public.dream_functionality for each row execute function public.set_updated_date();
create index if not exists dream_functionality_created_by_id_idx on public.dream_functionality(created_by_id);
create policy dream_functionality_select on public.dream_functionality for select using (true);
create policy dream_functionality_insert on public.dream_functionality for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy dream_functionality_update on public.dream_functionality for update using (public.is_admin());
create policy dream_functionality_delete on public.dream_functionality for delete using (public.is_admin());

-- ---- FocusTime ----
create table if not exists public.focus_time (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  title text not null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 1 and 240),
  spotify_url text,
  reminder_enabled boolean not null default false,
  status text not null default 'scheduled' check (status in ('scheduled','done','missed')),
  completed_at date
);
alter table public.focus_time enable row level security;
create trigger focus_time_set_updated_date before update on public.focus_time for each row execute function public.set_updated_date();
create index if not exists focus_time_created_by_id_idx on public.focus_time(created_by_id);
create policy focus_time_select on public.focus_time for select using (created_by_id = auth.uid() or public.is_admin());
create policy focus_time_insert on public.focus_time for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy focus_time_update on public.focus_time for update using (created_by_id = auth.uid() or public.is_admin());
create policy focus_time_delete on public.focus_time for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- ForumPost ---- (ECCEZIONE: lettura pubblica)
create table if not exists public.forum_post (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  title text,
  content text not null,
  post_type text not null default 'notes' check (post_type in ('notes','explanation','question')),
  images jsonb not null default '[]'::jsonb,
  anonymous boolean not null default false,
  school_system text,
  school_year text,
  author_name text
);
alter table public.forum_post enable row level security;
create trigger forum_post_set_updated_date before update on public.forum_post for each row execute function public.set_updated_date();
create index if not exists forum_post_created_by_id_idx on public.forum_post(created_by_id);
create policy forum_post_select on public.forum_post for select using (true);
create policy forum_post_insert on public.forum_post for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy forum_post_update on public.forum_post for update using (created_by_id = auth.uid() or public.is_admin());
create policy forum_post_delete on public.forum_post for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- Goal ----
create table if not exists public.goal (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  activity_id uuid not null,
  title text not null,
  timeframe text not null default 'daily' check (timeframe in ('daily','weekly','monthly','annual','lifetime')),
  difficulty text not null default 'easy' check (difficulty in ('easy','medium','hard')),
  completed boolean not null default false,
  completed_date date,
  completed_periods jsonb not null default '[]'::jsonb
);
alter table public.goal enable row level security;
create trigger goal_set_updated_date before update on public.goal for each row execute function public.set_updated_date();
create index if not exists goal_created_by_id_idx on public.goal(created_by_id);
create index if not exists goal_activity_id_idx on public.goal(activity_id);
create policy goal_select on public.goal for select using (created_by_id = auth.uid() or public.is_admin());
create policy goal_insert on public.goal for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy goal_update on public.goal for update using (created_by_id = auth.uid() or public.is_admin());
create policy goal_delete on public.goal for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- GymSession ----
create table if not exists public.gym_session (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  day_of_week text not null check (day_of_week in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  title text not null,
  exercises jsonb not null default '[]'::jsonb
);
alter table public.gym_session enable row level security;
create trigger gym_session_set_updated_date before update on public.gym_session for each row execute function public.set_updated_date();
create index if not exists gym_session_created_by_id_idx on public.gym_session(created_by_id);
create policy gym_session_select on public.gym_session for select using (created_by_id = auth.uid() or public.is_admin());
create policy gym_session_insert on public.gym_session for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy gym_session_update on public.gym_session for update using (created_by_id = auth.uid() or public.is_admin());
create policy gym_session_delete on public.gym_session for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- LessonGrade ----
create table if not exists public.lesson_grade (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  date date not null,
  subject text not null,
  grade numeric not null,
  grade_system text not null default 'scale10' check (grade_system in ('letter','scale6','scale10','scale30')),
  notes text
);
alter table public.lesson_grade enable row level security;
create trigger lesson_grade_set_updated_date before update on public.lesson_grade for each row execute function public.set_updated_date();
create index if not exists lesson_grade_created_by_id_idx on public.lesson_grade(created_by_id);
create policy lesson_grade_select on public.lesson_grade for select using (created_by_id = auth.uid() or public.is_admin());
create policy lesson_grade_insert on public.lesson_grade for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy lesson_grade_update on public.lesson_grade for update using (created_by_id = auth.uid() or public.is_admin());
create policy lesson_grade_delete on public.lesson_grade for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- LifeStat ----
create table if not exists public.life_stat (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  date date not null,
  forza integer not null check (forza between 1 and 100),
  intelligenza integer not null check (intelligenza between 1 and 100),
  disciplina integer not null check (disciplina between 1 and 100),
  relazioni integer not null check (relazioni between 1 and 100),
  autostima integer not null check (autostima between 1 and 100),
  prestazione_atletica integer check (prestazione_atletica between 1 and 100),
  is_baseline boolean not null default false
);
alter table public.life_stat enable row level security;
create trigger life_stat_set_updated_date before update on public.life_stat for each row execute function public.set_updated_date();
create index if not exists life_stat_created_by_id_idx on public.life_stat(created_by_id);
create policy life_stat_select on public.life_stat for select using (created_by_id = auth.uid() or public.is_admin());
create policy life_stat_insert on public.life_stat for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy life_stat_update on public.life_stat for update using (created_by_id = auth.uid() or public.is_admin());
create policy life_stat_delete on public.life_stat for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- PhoneTimeEntry ----
create table if not exists public.phone_time_entry (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  date date not null,
  hours numeric not null check (hours between 0 and 24)
);
alter table public.phone_time_entry enable row level security;
create trigger phone_time_entry_set_updated_date before update on public.phone_time_entry for each row execute function public.set_updated_date();
create index if not exists phone_time_entry_created_by_id_idx on public.phone_time_entry(created_by_id);
create policy phone_time_entry_select on public.phone_time_entry for select using (created_by_id = auth.uid() or public.is_admin());
create policy phone_time_entry_insert on public.phone_time_entry for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy phone_time_entry_update on public.phone_time_entry for update using (created_by_id = auth.uid() or public.is_admin());
create policy phone_time_entry_delete on public.phone_time_entry for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- PromoCodeUsage ---- (ECCEZIONE: update/delete solo admin)
create table if not exists public.promo_code_usage (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  code text not null,
  user_email text,
  user_name text,
  reward_type text check (reward_type in ('promo_month','lifetime_premium'))
);
alter table public.promo_code_usage enable row level security;
create trigger promo_code_usage_set_updated_date before update on public.promo_code_usage for each row execute function public.set_updated_date();
create index if not exists promo_code_usage_created_by_id_idx on public.promo_code_usage(created_by_id);
create index if not exists promo_code_usage_code_idx on public.promo_code_usage(code);
create policy promo_code_usage_select on public.promo_code_usage for select using (created_by_id = auth.uid() or public.is_admin());
create policy promo_code_usage_insert on public.promo_code_usage for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy promo_code_usage_update on public.promo_code_usage for update using (public.is_admin());
create policy promo_code_usage_delete on public.promo_code_usage for delete using (public.is_admin());

-- ---- ReadingLog ----
create table if not exists public.reading_log (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  date date not null,
  book_id uuid not null,
  current_page integer not null check (current_page >= 0),
  pages_read integer check (pages_read >= 0)
);
alter table public.reading_log enable row level security;
create trigger reading_log_set_updated_date before update on public.reading_log for each row execute function public.set_updated_date();
create index if not exists reading_log_created_by_id_idx on public.reading_log(created_by_id);
create index if not exists reading_log_book_id_idx on public.reading_log(book_id);
create policy reading_log_select on public.reading_log for select using (created_by_id = auth.uid() or public.is_admin());
create policy reading_log_insert on public.reading_log for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy reading_log_update on public.reading_log for update using (created_by_id = auth.uid() or public.is_admin());
create policy reading_log_delete on public.reading_log for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- Referral ---- (ECCEZIONE: lettura anche come invitee, oltre che come referrer)
create table if not exists public.referral (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  referrer_id uuid not null,
  invitee_id uuid not null,
  invitee_email text,
  credits_earned integer not null default 0 check (credits_earned >= 0),
  spent_euros numeric not null default 0 check (spent_euros >= 0)
);
alter table public.referral enable row level security;
create trigger referral_set_updated_date before update on public.referral for each row execute function public.set_updated_date();
create index if not exists referral_created_by_id_idx on public.referral(created_by_id);
create index if not exists referral_referrer_id_idx on public.referral(referrer_id);
create index if not exists referral_invitee_id_idx on public.referral(invitee_id);
create policy referral_select on public.referral for select using (
  referrer_id = auth.uid() or invitee_id = auth.uid() or created_by_id = auth.uid() or public.is_admin()
);
create policy referral_insert on public.referral for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy referral_update on public.referral for update using (created_by_id = auth.uid() or public.is_admin());
create policy referral_delete on public.referral for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- SmokingLog ---- (encrypted_data e' cifrato end-to-end lato client: il
-- server vede solo testo cifrato, invariato rispetto a base44)
create table if not exists public.smoking_log (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  date date not null,
  encrypted_data text
);
alter table public.smoking_log enable row level security;
create trigger smoking_log_set_updated_date before update on public.smoking_log for each row execute function public.set_updated_date();
create index if not exists smoking_log_created_by_id_idx on public.smoking_log(created_by_id);
create policy smoking_log_select on public.smoking_log for select using (created_by_id = auth.uid() or public.is_admin());
create policy smoking_log_insert on public.smoking_log for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy smoking_log_update on public.smoking_log for update using (created_by_id = auth.uid() or public.is_admin());
create policy smoking_log_delete on public.smoking_log for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- SmokingProfile ----
create table if not exists public.smoking_profile (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  encrypted_data text,
  onboarded boolean not null default false
);
alter table public.smoking_profile enable row level security;
create trigger smoking_profile_set_updated_date before update on public.smoking_profile for each row execute function public.set_updated_date();
create index if not exists smoking_profile_created_by_id_idx on public.smoking_profile(created_by_id);
create policy smoking_profile_select on public.smoking_profile for select using (created_by_id = auth.uid() or public.is_admin());
create policy smoking_profile_insert on public.smoking_profile for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy smoking_profile_update on public.smoking_profile for update using (created_by_id = auth.uid() or public.is_admin());
create policy smoking_profile_delete on public.smoking_profile for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- Subject ----
create table if not exists public.subject (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  name text not null
);
alter table public.subject enable row level security;
create trigger subject_set_updated_date before update on public.subject for each row execute function public.set_updated_date();
create index if not exists subject_created_by_id_idx on public.subject(created_by_id);
create policy subject_select on public.subject for select using (created_by_id = auth.uid() or public.is_admin());
create policy subject_insert on public.subject for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy subject_update on public.subject for update using (created_by_id = auth.uid() or public.is_admin());
create policy subject_delete on public.subject for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- TaskItem ----
create table if not exists public.task_item (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  title text not null,
  type text not null default 'todo' check (type in ('todo','project','weekly','one_time','meeting','deadline')),
  notes text,
  due_date date,
  expiry_date date,
  recurrence_per_week integer check (recurrence_per_week between 1 and 7),
  weekdays jsonb not null default '[]'::jsonb,
  linked_activity_id uuid,
  status text not null default 'active' check (status in ('active','done','archived')),
  completed_date date,
  archived_date date,
  rating integer check (rating between 1 and 5),
  earnings numeric check (earnings >= 0),
  expected_earnings numeric check (expected_earnings >= 0),
  repeatable boolean not null default false
);
alter table public.task_item enable row level security;
create trigger task_item_set_updated_date before update on public.task_item for each row execute function public.set_updated_date();
create index if not exists task_item_created_by_id_idx on public.task_item(created_by_id);
create policy task_item_select on public.task_item for select using (created_by_id = auth.uid() or public.is_admin());
create policy task_item_insert on public.task_item for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy task_item_update on public.task_item for update using (created_by_id = auth.uid() or public.is_admin());
create policy task_item_delete on public.task_item for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- UserSettings ----
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  reminder_time text not null default '21:00',
  reminder_enabled boolean not null default true,
  onboarded boolean not null default false,
  ads_removed boolean not null default false,
  gym_enabled boolean not null default false,
  profile_type text not null default 'base' check (profile_type in ('base','atleta','studente','professionista')),
  daily_calories_goal integer not null default 0 check (daily_calories_goal >= 0),
  protein_goal numeric not null default 0 check (protein_goal >= 0),
  carbs_goal numeric not null default 0 check (carbs_goal >= 0),
  lipids_goal numeric not null default 0 check (lipids_goal >= 0),
  biological_sex text check (biological_sex in ('male','female')),
  lifestyle_level text check (lifestyle_level in ('sedentary','light','moderate','active','athlete')),
  fitness_goal text check (fitness_goal in ('lose','gain','maintain','personalized')),
  goal_intensity text check (goal_intensity in ('light','intense','drastic')),
  monthly_earnings_goal numeric not null default 0 check (monthly_earnings_goal >= 0),
  last_ranks jsonb not null default '{}'::jsonb,
  subscription_tier text not null default 'free' check (subscription_tier in ('free','pro','premium')),
  stripe_subscription_id text,
  trial_start timestamptz,
  promo_until timestamptz,
  grade_thresholds jsonb not null default '{}'::jsonb,
  referral_code text,
  credits integer not null default 0 check (credits >= 0),
  referral_premium_months integer not null default 0 check (referral_premium_months >= 0),
  phone_average_daily numeric not null default 0 check (phone_average_daily >= 0),
  phone_reduction_goal numeric not null default 0 check (phone_reduction_goal >= 0),
  reading_daily_goal integer not null default 0 check (reading_daily_goal >= 0),
  birth_date date,
  dream text
);
alter table public.user_settings enable row level security;
create trigger user_settings_set_updated_date before update on public.user_settings for each row execute function public.set_updated_date();
create index if not exists user_settings_created_by_id_idx on public.user_settings(created_by_id);
create unique index if not exists user_settings_referral_code_idx on public.user_settings(referral_code) where referral_code is not null;
create policy user_settings_select on public.user_settings for select using (created_by_id = auth.uid() or public.is_admin());
create policy user_settings_insert on public.user_settings for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy user_settings_update on public.user_settings for update using (created_by_id = auth.uid() or public.is_admin());
create policy user_settings_delete on public.user_settings for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- Verifica ----
create table if not exists public.verifica (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  subject text not null,
  date date not null,
  topic text,
  status text not null default 'scheduled' check (status in ('scheduled','completed','missed')),
  grade numeric,
  grade_system text not null default 'scale10' check (grade_system in ('letter','scale6','scale10','scale30'))
);
alter table public.verifica enable row level security;
create trigger verifica_set_updated_date before update on public.verifica for each row execute function public.set_updated_date();
create index if not exists verifica_created_by_id_idx on public.verifica(created_by_id);
create policy verifica_select on public.verifica for select using (created_by_id = auth.uid() or public.is_admin());
create policy verifica_insert on public.verifica for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy verifica_update on public.verifica for update using (created_by_id = auth.uid() or public.is_admin());
create policy verifica_delete on public.verifica for delete using (created_by_id = auth.uid() or public.is_admin());

-- ---- WorkDayLog ----
create table if not exists public.work_day_log (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  date date not null,
  work_hours numeric check (work_hours between 0 and 24),
  study_hours numeric check (study_hours between 0 and 24),
  meetings_count integer check (meetings_count >= 0),
  work_rating integer check (work_rating between 1 and 5),
  earnings numeric check (earnings >= 0),
  notes text
);
alter table public.work_day_log enable row level security;
create trigger work_day_log_set_updated_date before update on public.work_day_log for each row execute function public.set_updated_date();
create index if not exists work_day_log_created_by_id_idx on public.work_day_log(created_by_id);
create index if not exists work_day_log_date_idx on public.work_day_log(date);
create policy work_day_log_select on public.work_day_log for select using (created_by_id = auth.uid() or public.is_admin());
create policy work_day_log_insert on public.work_day_log for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy work_day_log_update on public.work_day_log for update using (created_by_id = auth.uid() or public.is_admin());
create policy work_day_log_delete on public.work_day_log for delete using (created_by_id = auth.uid() or public.is_admin());


-- ----------------------------------------------------------------------------
-- 4. GOOGLE CALENDAR — tabella di supporto NUOVA (non esisteva come entity
--    base44: li' il "connector" gestiva i token internamente). Contiene
--    access/refresh token OAuth: nessuna policy per anon/authenticated,
--    quindi il client non puo' MAI leggerla direttamente — ci accedono solo
--    le Netlify Functions con la service role key (che bypassa le RLS).
-- ----------------------------------------------------------------------------
create table if not exists public.google_calendar_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
alter table public.google_calendar_tokens enable row level security;
create trigger google_calendar_tokens_set_updated_date before update on public.google_calendar_tokens for each row execute function public.set_updated_date();
-- Nessuna "create policy" qui apposta: RLS attiva + zero policy = accesso
-- negato a chiunque tranne la service role.


-- ----------------------------------------------------------------------------
-- 5. STORAGE — bucket per upload (copertine libri, immagini forum)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('app-uploads', 'app-uploads', true)
on conflict (id) do nothing;

-- Lettura pubblica (le immagini devono essere visibili anche nel forum
-- pubblico e come copertine libro).
create policy app_uploads_public_read on storage.objects
  for select using (bucket_id = 'app-uploads');

-- Ogni utente autenticato puo' scrivere solo dentro una cartella con il
-- proprio user id come primo segmento del path (es. "<uid>/cover.jpg").
create policy app_uploads_own_write on storage.objects
  for insert with check (
    bucket_id = 'app-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy app_uploads_own_update on storage.objects
  for update using (
    bucket_id = 'app-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy app_uploads_own_delete on storage.objects
  for delete using (
    bucket_id = 'app-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- FINE — se sei arrivato fin qui senza errori, lo schema e' pronto.
-- Prossimo passo: GUIDA_MIGRAZIONE.md
-- ============================================================================
