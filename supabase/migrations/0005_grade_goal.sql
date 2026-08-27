-- ---- GradeGoal ----
create table if not exists public.grade_goal (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  subject text not null,
  grade numeric not null,
  grade_system text not null default 'scale10' check (grade_system in ('letter','scale6','scale10','scale30'))
);
alter table public.grade_goal enable row level security;
create trigger grade_goal_set_updated_date before update on public.grade_goal for each row execute function public.set_updated_date();
create index if not exists grade_goal_created_by_id_idx on public.grade_goal(created_by_id);
create unique index if not exists grade_goal_subject_unique_idx on public.grade_goal(created_by_id, subject);
create policy grade_goal_select on public.grade_goal for select using (created_by_id = auth.uid() or public.is_admin());
create policy grade_goal_insert on public.grade_goal for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy grade_goal_update on public.grade_goal for update using (created_by_id = auth.uid() or public.is_admin());
create policy grade_goal_delete on public.grade_goal for delete using (created_by_id = auth.uid() or public.is_admin());
