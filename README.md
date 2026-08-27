# Focused

App di produttività personale (React + Vite, PWA). Backend su
**Supabase** (database Postgres, autenticazione, storage file) e
**Netlify Functions** (pagamenti Stripe, integrazione Google Calendar,
assistente AI, invio email).

## Setup rapido

```bash
npm install
cp .env.example .env.local   # poi compila .env.local con i tuoi valori
npm run dev
```

Se è la prima volta che configuri il progetto (nuovo Supabase, nuovo
Netlify, ecc.), segui **[GUIDA_MIGRAZIONE.md](./GUIDA_MIGRAZIONE.md)**
passo per passo: spiega dove creare ogni account e dove trovare ogni
valore da mettere in `.env.local`.

## Struttura del progetto

```
src/                        Frontend React (pagine, componenti, logica)
src/api/base44Client.js     Unico punto di contatto con il backend — vedi sotto
src/lib/supabaseClient.js   Istanza supabase-js condivisa
supabase/migrations/        Schema SQL del database (tabelle + sicurezza)
netlify/functions/          Tutto ciò che richiede una chiave segreta
```

### `src/api/base44Client.js`

Il nome del file è rimasto per non dover toccare gli oltre 30 file che lo
importano, ma il contenuto è stato riscritto da zero: espone la stessa
identica interfaccia (`base44.auth`, `base44.entities`, `base44.functions`,
`base44.integrations`, `base44.agents`, `base44.connectors`,
`base44.analytics`) collegata a Supabase invece che a base44. Qualunque
modifica alla UI puoi farla senza mai guardare dentro questo file; se un
giorno cambierai di nuovo backend, è l'unico file che dovrai riscrivere.

### `netlify/functions/`

Tutto ciò che deve girare lato server (chiavi Stripe/Groq/Resend, la
service role key di Supabase) vive qui. Il frontend le chiama tramite
`base44.functions.invoke(nome, payload)`, che aggiunge automaticamente il
token dell'utente loggato.

## Comandi disponibili

```bash
npm run dev        # sviluppo locale
npm run build       # build di produzione (cartella dist/)
npm run preview     # anteprima della build
npm run lint         # ESLint
```

## Deploy

Pensato per Netlify (vedi `netlify.toml`): build command `npm run build`,
publish directory `dist`, funzioni in `netlify/functions/`. Dettagli
completi nella guida di migrazione.
