-- 1.5: Small Habits. Ogni attivita' ha le sue piccole abitudini (es. Allenamento: "Allenamento
-- leggero al mattino", "Cardio a fine allenamento"). Ogni abitudine si segna fatta / non fatta,
-- ha una ricorrenza (giorni della settimana) e uno o piu' orari proposti da Focusy e confermati
-- dall'utente (es. skincare: 07:30 e 22:00). Gratis e senza limiti.
--
-- Streak (src/lib/smallHabits.js): un giorno previsto e non fatto la azzera. 2 recuperi al mese
-- per abitudine, che valgono solo se l'abitudine viene fatta il giorno previsto successivo:
-- il recupero e' una riga di small_habit_log con status 'restored' sul giorno saltato.

create table if not exists public.small_habit (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  -- Eliminare l'attivita' elimina le sue abitudini (e, a cascata, il loro storico).
  activity_id uuid not null references public.activity(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  -- Giorni previsti, 0 = domenica ... 6 = sabato (come Date.getDay()). Vuoto o null = ogni giorno.
  repeat_days smallint[],
  -- Orari "HH:MM" del giorno, uno per ogni volta che va fatta. Vuoto = in qualsiasi momento.
  times text[] not null default '{}',
  archived boolean not null default false,
  sort_order integer not null default 0
);
alter table public.small_habit enable row level security;
create trigger small_habit_set_updated_date before update on public.small_habit for each row execute function public.set_updated_date();
create index if not exists small_habit_created_by_id_idx on public.small_habit(created_by_id);
create index if not exists small_habit_activity_id_idx on public.small_habit(activity_id);
create policy small_habit_select on public.small_habit for select using (created_by_id = auth.uid());
create policy small_habit_insert on public.small_habit for insert with check (
  created_by_id = auth.uid()
  and exists (select 1 from public.activity a where a.id = activity_id and a.created_by_id = auth.uid())
);
create policy small_habit_update on public.small_habit for update using (created_by_id = auth.uid());
create policy small_habit_delete on public.small_habit for delete using (created_by_id = auth.uid());

create table if not exists public.small_habit_log (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  description text,
  habit_id uuid not null references public.small_habit(id) on delete cascade,
  date date not null,
  -- Indice dell'orario in small_habit.times (0 se l'abitudine ha un solo orario o nessuno).
  -- Il recupero della streak usa sempre lo slot 23 (gli orari sono al massimo 6), cosi' non
  -- si scontra con un orario gia' segnato quel giorno.
  slot smallint not null default 0 check (slot between 0 and 23),
  status text not null default 'done' check (status in ('done', 'restored')),
  unique (habit_id, date, slot)
);
alter table public.small_habit_log enable row level security;
create trigger small_habit_log_set_updated_date before update on public.small_habit_log for each row execute function public.set_updated_date();
create index if not exists small_habit_log_created_by_id_idx on public.small_habit_log(created_by_id);
create index if not exists small_habit_log_habit_id_idx on public.small_habit_log(habit_id);
create policy small_habit_log_select on public.small_habit_log for select using (created_by_id = auth.uid());
create policy small_habit_log_insert on public.small_habit_log for insert with check (
  created_by_id = auth.uid()
  and exists (select 1 from public.small_habit h where h.id = habit_id and h.created_by_id = auth.uid())
);
create policy small_habit_log_update on public.small_habit_log for update using (created_by_id = auth.uid());
create policy small_habit_log_delete on public.small_habit_log for delete using (created_by_id = auth.uid());
