-- Memoria di Focusy: fatti stabili sull'utente emersi in Organize ("studio meglio la mattina",
-- "il martedi' ho allenamento"). Una frase per riga; Focusy li rilegge a ogni richiesta.
alter table public.user_settings add column if not exists focusy_memory text;
