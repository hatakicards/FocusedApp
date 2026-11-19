-- 1.5: nel piano gratuito restano attive al massimo 4 attivita'. Qui si salva quali 4 ha scelto
-- l'utente (elenco di id di activity). Vuoto = le 4 piu' vecchie. Le altre restano con il lucchetto
-- e i loro dati non vengono toccati: tornano attive passando a Pro o Premium.
alter table public.user_settings
  add column if not exists free_activity_ids jsonb;
