-- Focus Time: programmi ricorrenti ("ogni giovedi' 15:00-18:00", "tutti i giorni 9:00-12:00").
-- Un programma e' una riga focus_time con is_recurring = true: i giorni sono in repeat_days
-- (0 = domenica ... 6 = sabato, come Date.getDay()), l'orario in start_time/end_time ("HH:MM").
alter table public.focus_time
  add column if not exists is_recurring boolean not null default false,
  add column if not exists repeat_days smallint[],
  add column if not exists start_time text,
  add column if not exists end_time text,
  add column if not exists block_mode text check (block_mode in ('off','selected','all_except')),
  add column if not exists schedule_active boolean not null default true;

-- Un programma puo' durare piu' di 4 ore (es. 9:00-21:00).
alter table public.focus_time drop constraint if exists focus_time_duration_minutes_check;
alter table public.focus_time
  add constraint focus_time_duration_minutes_check check (duration_minutes between 1 and 1440);
