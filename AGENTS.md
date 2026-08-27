# AGENTS.md

## Contesto del progetto

App React/Vite (PWA) chiamata "Focused". Backend su Supabase (Postgres +
Auth + Storage) e Netlify Functions. In precedenza girava su base44: la
migrazione è completa, non ci sono più dipendenze da quella piattaforma.

Tratta questo come codice applicativo di proprietà dell'utente: mantieni
le modifiche mirate a quanto richiesto e rispetta le convenzioni esistenti
nel progetto.

Parti da `README.md` per il setup locale e da `GUIDA_MIGRAZIONE.md` per il
contesto completo su come sono configurati Supabase/Netlify/Stripe/Google/
Groq/Resend in produzione.

## File chiave

- `src/`: sorgente dell'applicazione frontend.
- `src/api/base44Client.js`: **unico** punto di contatto con il backend.
  Ogni pagina/componente importa da qui (`import { base44 } from
  '@/api/base44Client'`) e chiama `base44.auth.*`, `base44.entities.*`,
  `base44.functions.invoke(...)`, ecc. — mai Supabase direttamente.
  Se aggiungi una entity o una funzione lato server, aggiorna questo file
  per esporla con la stessa interfaccia, non importare `supabaseClient`
  altrove.
- `src/lib/supabaseClient.js`: istanza `supabase-js` grezza, usata solo da
  `base44Client.js`.
- `src/lib/guestDB.js`: implementazione "modalità ospite" (dati solo
  locali in localStorage) — completamente indipendente dal backend,
  interfaccia identica a `base44Client.js`.
- `supabase/migrations/0001_init.sql`: schema completo (tabelle, RLS,
  trigger, storage bucket). Ogni nuova entity o colonna va aggiunta qui
  **e** rispecchiata nella entity Proxy generica di `base44Client.js`
  (di solito non serve toccare quest'ultimo: le nuove entity sono
  riconosciute automaticamente via `toSnakeCase(nomeEntity)`).
- `netlify/functions/`: tutto ciò che richiede una chiave segreta (Stripe,
  Groq, Resend, Google OAuth, service role key di Supabase). Non
  esporre mai queste chiavi al frontend.
- `vite.config.js`: contiene l'alias `@` → `./src` (necessario per tutti
  gli import `@/...`).
- `.env.local`: valori locali, mai da committare. `.env.example` documenta
  ogni variabile.

## Note di lavoro

- Comando di sviluppo: `npm run dev`. Non esiste più un comando `base44
  dev` o un backend locale separato: Supabase è sempre remoto (anche in
  sviluppo), non c'è nulla da avviare localmente oltre a Vite.
- Prima di aggiungere una nuova entity: crea la tabella in
  `supabase/migrations/` (nuovo file `NNNN_descrizione.sql`, segui il
  pattern delle tabelle esistenti: `id`, `created_by_id`, `created_date`,
  `updated_date`, RLS "proprio record o admin"), poi usala dal frontend
  come `base44.entities.NomeEntity.list()/.create()/...` — non serve
  altro codice, la entity Proxy la gestisce automaticamente.
- Prima di aggiungere una nuova Netlify Function: guarda i file esistenti
  in `netlify/functions/` come modello (formato "Functions v2": `export
  default async (req) => new Response(...)`, non il vecchio formato
  `exports.handler`). Usa `_shared/supabaseAdmin.js` per l'accesso al
  database e la verifica dell'utente dal token Bearer.
- Esegui `npm run lint` prima di considerare concluse le modifiche.
- Non esiste più `base44/config.jsonc`, `base44/entities/*.jsonc`, né gli
  altri file della cartella `base44/`: erano configurazione della
  piattaforma precedente. Se sono ancora presenti nel repository sono
  storia, non vengono più letti da nulla.
