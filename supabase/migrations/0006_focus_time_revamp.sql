-- ---- FocusTime revamp: durata effettiva + collegamento a un compito ----
alter table public.focus_time
  add column if not exists actual_minutes integer check (actual_minutes >= 0),
  add column if not exists linked_homework_id uuid references public.homework(id) on delete set null;

create index if not exists focus_time_linked_homework_id_idx on public.focus_time(linked_homework_id);
