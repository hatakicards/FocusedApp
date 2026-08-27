-- ---- Project ----
create table if not exists public.project (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  title text not null,
  objective text not null,
  status text not null default 'active' check (status in ('planning','active','paused','completed')),
  linked_activity_id uuid
);
alter table public.project enable row level security;
create trigger project_set_updated_date before update on public.project for each row execute function public.set_updated_date();
create index if not exists project_created_by_id_idx on public.project(created_by_id);
create policy project_select on public.project for select using (created_by_id = auth.uid() or public.is_admin());
create policy project_insert on public.project for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy project_update on public.project for update using (created_by_id = auth.uid() or public.is_admin());
create policy project_delete on public.project for delete using (created_by_id = auth.uid() or public.is_admin());
