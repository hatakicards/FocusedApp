-- ============================================================================
-- Rimuove la sincronizzazione Google Calendar (funzionalita' eliminata
-- dall'app: nessuna pagina o componente la usa piu').
-- ============================================================================

drop table if exists public.google_calendar_tokens;
