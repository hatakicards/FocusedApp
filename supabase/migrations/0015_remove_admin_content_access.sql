-- Nessun account admin puo' piu' leggere o modificare i contenuti privati degli utenti dal client.
-- Le statistiche aggregate del pannello admin passano da functions/api/admin-data.js (service role),
-- quindi non dipendono da queste regole. Restano con is_admin():
--   dream_functionality (catalogo condiviso), forum_post (moderazione),
--   promo_code_usage update/delete (gestione codici).
do $$
declare
  pol record;
  new_qual text;
  new_check text;
  stmt text;
begin
  for pol in
    select schemaname, tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') like '%is_admin()%' or coalesce(with_check, '') like '%is_admin()%')
      and tablename not in ('dream_functionality', 'forum_post')
      and not (tablename = 'promo_code_usage' and cmd in ('UPDATE', 'DELETE'))
  loop
    new_qual := regexp_replace(pol.qual, '\s+OR\s+is_admin\(\)', '', 'g');
    new_check := regexp_replace(pol.with_check, '\s+OR\s+is_admin\(\)', '', 'g');
    if coalesce(new_qual, '') like '%is_admin()%' or coalesce(new_check, '') like '%is_admin()%' then
      raise exception 'policy % su % non riducibile in automatico', pol.policyname, pol.tablename;
    end if;

    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    stmt := format('create policy %I on %I.%I for %s', pol.policyname, pol.schemaname, pol.tablename, lower(pol.cmd));
    if new_qual is not null then stmt := stmt || ' using ' || new_qual; end if;
    if new_check is not null then stmt := stmt || ' with check ' || new_check; end if;
    execute stmt;
  end loop;
end $$;
