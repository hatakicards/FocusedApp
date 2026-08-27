-- ---- Homework ----
create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  subject text not null,
  title text not null,
  description text,
  due_date date,
  difficulty text not null default 'medium' check (difficulty in ('quick','medium','heavy')),
  status text not null default 'pending' check (status in ('pending','done')),
  completed_date date
);
alter table public.homework enable row level security;
create trigger homework_set_updated_date before update on public.homework for each row execute function public.set_updated_date();
create index if not exists homework_created_by_id_idx on public.homework(created_by_id);
create policy homework_select on public.homework for select using (created_by_id = auth.uid() or public.is_admin());
create policy homework_insert on public.homework for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy homework_update on public.homework for update using (created_by_id = auth.uid() or public.is_admin());
create policy homework_delete on public.homework for delete using (created_by_id = auth.uid() or public.is_admin());
