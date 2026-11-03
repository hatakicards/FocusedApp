-- Pisolini: lista dei pisolini del giorno, [{ "start": "14:00", "end": "14:20", "auto": true }].
-- Contano nel sonno delle 24 ore (debito e voto), vedi src/lib/sleepData.js.
alter table public.body_fuel_entry
  add column if not exists naps jsonb not null default '[]'::jsonb;
