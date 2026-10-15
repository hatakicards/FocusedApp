-- Ultima apertura reale dell'app per utente (auth.users.last_sign_in_at cambia solo
-- quando si fa un login vero, non quando l'app riusa la sessione salvata).
create table if not exists public.user_activity (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  platform text
);
alter table public.user_activity enable row level security;
create policy user_activity_select on public.user_activity for select using (user_id = auth.uid());
create policy user_activity_insert on public.user_activity for insert with check (user_id = auth.uid());
create policy user_activity_update on public.user_activity for update using (user_id = auth.uid());

-- Parte da quello che sappiamo gia' (ultimo login o ultima sessione), cosi' il dato
-- non e' vuoto per chi non ha ancora riaperto l'app dopo l'aggiornamento.
insert into public.user_activity (user_id, last_seen_at)
select u.id, greatest(coalesce(u.last_sign_in_at, u.created_at), coalesce(s.last_active, u.created_at))
from auth.users u
left join (
  select user_id, max(coalesce(refreshed_at, updated_at, created_at)) as last_active
  from auth.sessions group by user_id
) s on s.user_id = u.id
on conflict (user_id) do nothing;
