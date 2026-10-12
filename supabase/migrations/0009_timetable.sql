-- ---- Orario settimanale (lezioni) ----
-- Una riga per lezione: materia + giorno della settimana + fascia oraria.
-- Serve a Focusy (sa che lezioni hai) e ai compiti (scadenza = prossima lezione).
create table if not exists public.timetable_slot (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  subject text not null,
  weekday smallint not null check (weekday between 1 and 7), -- 1 = lunedi' ... 7 = domenica
  start_time time not null,
  end_time time,
  room text
);
alter table public.timetable_slot enable row level security;
create trigger timetable_slot_set_updated_date before update on public.timetable_slot for each row execute function public.set_updated_date();
create index if not exists timetable_slot_created_by_id_idx on public.timetable_slot(created_by_id);
create policy timetable_slot_select on public.timetable_slot for select using (created_by_id = auth.uid() or public.is_admin());
create policy timetable_slot_insert on public.timetable_slot for insert with check (created_by_id = auth.uid() or public.is_admin());
create policy timetable_slot_update on public.timetable_slot for update using (created_by_id = auth.uid() or public.is_admin());
create policy timetable_slot_delete on public.timetable_slot for delete using (created_by_id = auth.uid() or public.is_admin());
