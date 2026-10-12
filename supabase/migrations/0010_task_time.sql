-- Orario opzionale (HH:MM) per le attivita' dell'agenda
alter table public.task_item
  add column if not exists due_time text check (due_time is null or due_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  add column if not exists end_time text check (end_time is null or end_time ~ '^[0-2][0-9]:[0-5][0-9]$');
