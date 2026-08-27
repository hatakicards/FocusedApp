# Guida alla migrazione — da base44 a Supabase + Netlify

Questa guida ti porta, passo dopo passo, dal codice che ti ho consegnato a
un'app funzionante e completamente scollegata da base44. **Funzionamento ed
estetica dell'app sono identici a prima**: quello che cambia è solo *dove*
vivono i dati e *chi* esegue le operazioni server-side.

Tempo stimato: 45-90 minuti la prima volta (soprattutto per creare i vari
account). Segui i passi in ordine, sono pensati per essere eseguiti così.

---

## 0. Cosa è cambiato, in breve

| Prima (base44) | Ora |
|---|---|
| Database + auth base44 | **Supabase** (Postgres + Auth + Storage) |
| Funzioni server base44 | **Netlify Functions** |
| Agente AI "routine_optimizer" | Netlify Function + **API Groq** |
| `InvokeLLM` (assistente Focusy) | Netlify Function + **API Groq** |
| `SendEmail` (form contatti) | Netlify Function + **Resend** |
| Connettore Google Calendar | 3 Netlify Functions + **Google Cloud OAuth** |
| Hosting/build | **Netlify** |

Nessun componente React, nessuna pagina, nessuno stile è stato toccato.
L'unico file che "parla" con l'esterno è `src/api/base44Client.js`, riscritto
mantenendo esattamente la stessa interfaccia — tutto il resto dell'app lo
usa senza sapere cosa c'è dietro.

---

## 1. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com) → **New project**.
2. Scegli nome, password del database (salvala da qualche parte sicura) e
   regione (consiglio `eu-central` o comunque una in Europa, per latenza).
3. Aspetta ~2 minuti che il progetto sia pronto.
4. Vai su **SQL Editor** → **New query**, apri il file
   `supabase/migrations/0001_init.sql` di questo progetto, copialo **per
   intero** e incollalo lì. Premi **Run**.
   - Crea tutte le 24 tabelle dati + `profiles` + `google_calendar_tokens`,
     le regole di sicurezza (RLS) e il bucket per gli upload.
   - È idempotente: se per qualche motivo lo rilanci, non rompe nulla.
5. Vai su **Project Settings → API**: qui trovi `Project URL` e la chiave
   `anon public` (ti serviranno al passo 7) e la chiave `service_role`
   (segreta, serve anche lei al passo 7 — **non condividerla mai**).

---

## 2. Configura l'autenticazione Supabase

Questo è il passo più delicato: senza queste modifiche ai template email,
login/registrazione **non funzionano** — Supabase di default non manda un
codice a 6 cifre come faceva base44, manda un link diverso.

### 2.1 Attiva la conferma email

**Authentication → Sign In / Providers → Email** → assicurati che
**"Confirm email"** sia attivo. Senza questo, un utente risulta già
verificato subito dopo la registrazione e la schermata di inserimento
codice (che l'app mostra comunque) risulterebbe fuorviante.

### 2.2 Template "Confirm signup" (codice OTP a 6 cifre)

**Authentication → Email Templates → Confirm signup** → sostituisci il
corpo con qualcosa che mostri `{{ .Token }}` (è la variabile che Supabase
sostituisce con il codice a 6 cifre), ad esempio:

```html
<h2>Conferma la registrazione a Focused</h2>
<p>Il tuo codice di verifica è:</p>
<h1 style="letter-spacing: 4px;">{{ .Token }}</h1>
<p>Il codice scade tra un'ora.</p>
```

### 2.3 Template "Reset Password"

**Authentication → Email Templates → Reset Password** → il link nel corpo
del template deve puntare alla pagina dell'app con il parametro giusto.
Sostituisci l'URL del pulsante/link con:

```
{{ .SiteURL }}/reset-password?token={{ .TokenHash }}&type=recovery
```

(`ResetPassword.jsx` legge esattamente il parametro `token` dalla query
string — è una pagina già esistente nell'app, non l'ho toccata.)

### 2.4 Site URL

**Authentication → URL Configuration → Site URL**: impostalo sul dominio
Netlify definitivo (es. `https://tuoapp.netlify.app`), altrimenti i link
nelle email sopra puntano al posto sbagliato.

### 2.5 Login con Google (opzionale, solo se lo usi)

Se vuoi mantenere il pulsante "Accedi con Google":

1. **Authentication → Providers → Google** → attivalo, inserisci un Client
   ID/Secret Google (puoi crearli su
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   — **OAuth consent screen** poi **Credentials → Create → OAuth client ID**,
   tipo "Web application"). Supabase ti mostra l'esatto redirect URI da
   incollare tra gli "Authorized redirect URIs" di Google.
2. **Authentication → URL Configuration → Redirect URLs**: aggiungi
   `https://tuoapp.netlify.app/*` (con l'asterisco finale) — l'app chiama
   il login Google da più pagine diverse con `returnTo` diversi, il
   carattere jolly copre tutti i casi.

> Nota: questo login Google è **diverso e separato** da quello che
> configuri al passo 3 per l'accesso a Google Calendar — sono due scopi
> diversi (identità vs. lettura calendario) e Google richiede due
> credenziali OAuth distinte.

---

## 3. Google Calendar (per la sezione Agenda/CalendarEvents)

Se non usi la sincronizzazione con Google Calendar puoi saltare questo
passo: il resto dell'app funziona lo stesso, semplicemente quel pulsante
non farà nulla di utile finché non lo configuri.

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   → crea un progetto (o riusa quello del passo 2.5) → **Create Credentials
   → OAuth client ID** → tipo "Web application".
2. In **Authorized redirect URIs** aggiungi:
   ```
   https://tuoapp.netlify.app/.netlify/functions/google-oauth-callback
   ```
3. Abilita la **Google Calendar API** per il progetto (menu **APIs &
   Services → Library**, cerca "Google Calendar API", **Enable**).
4. Se il tuo progetto Google è in modalità "Testing" (schermata di consenso
   OAuth non pubblicata), ricordati di aggiungere il tuo indirizzo email tra
   gli **utenti di test**, altrimenti Google rifiuta l'accesso.
5. Copia Client ID e Client Secret: ti servono al passo 7 come
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

---

## 4. Groq (per l'assistente Focusy e il routine optimizer)

1. Vai su [console.groq.com/keys](https://console.groq.com/keys) → accedi/
   registrati → **Create API Key**. Piano gratuito, nessuna carta di credito
   richiesta.
2. Copia la chiave (`gsk_...`): ti serve al passo 7.

---

## 5. Resend (per il form contatti)

1. Vai su [resend.com](https://resend.com) → registrati (piano gratuito:
   3.000 email/mese, più che sufficiente per un form contatti).
2. Per iniziare subito puoi usare il mittente di test già fornito
   (`onboarding@resend.dev`) senza configurare nulla — funziona, ma solo
   per test limitati). Per produzione: **Domains → Add Domain**, verifica il
   tuo dominio (record DNS), poi usa un mittente tipo
   `Focused <noreply@tuodominio.it>`.
3. **API Keys → Create API Key**: ti serve al passo 7.

---

## 6. Stripe — aggiorna solo l'endpoint webhook

Le tue chiavi Stripe e i tuoi prodotti/prezzi restano identici (li ho
riportati esattamente come nel codice originale). L'unica cosa da
aggiornare è **dove** Stripe manda le notifiche di pagamento, perché prima
puntavano a base44 e ora devono puntare a Netlify:

1. [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Se hai già un endpoint verso base44: apri, **Update details**, cambia
   l'URL in:
   ```
   https://tuoapp.netlify.app/.netlify/functions/stripe-webhook
   ```
   Se non ce l'hai: **Add endpoint**, stessa URL, ed eventi da ascoltare:
   `checkout.session.completed`, `customer.subscription.deleted`,
   `customer.subscription.updated`.
3. Copia il **Signing secret** (`whsec_...`): ti serve al passo 7 come
   `STRIPE_WEBHOOK_SECRET`.

---

## 7. Variabili d'ambiente

Copia `.env.example` in `.env.local` (per lo sviluppo sul tuo computer) e
compila tutti i valori raccolti finora — ogni riga del file spiega dove
trovarlo.

Per la **produzione su Netlify**, le stesse variabili vanno impostate in
**Site configuration → Environment variables** nella dashboard Netlify
(non basta averle solo in locale: Netlify non legge `.env.local`, che tra
l'altro non va mai messo in un repository pubblico).

---

## 8. Installa le dipendenze e prova in locale

```bash
npm install
npm run dev
```

Il `package.json` ora include `@supabase/supabase-js` e `stripe` al posto
di `@base44/sdk` e `@base44/vite-plugin`. Se `npm install` si lamenta del
`package-lock.json` (potrebbe risultare leggermente disallineato, generato
prima di rimuovere le dipendenze base44), è normale: si aggiorna da solo,
non serve cancellarlo a mano.

Prova: registrazione (arriva il codice a 6 cifre via email?), login,
creazione di qualche attività/task, upload di un'immagine, form contatti.

---

## 9. Deploy su Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an
   existing project**, collega il repository Git (o trascina la cartella
   del progetto se non usi Git — ma con le Functions ti conviene comunque
   usare Git, i deploy futuri saranno più semplici).
2. Build command: `npm run build` — Publish directory: `dist` — questi
   sono già scritti in `netlify.toml`, Netlify dovrebbe rilevarli da solo.
3. Aggiungi tutte le variabili d'ambiente del passo 7 in **Site
   configuration → Environment variables** prima del primo deploy.
4. Deploy. Le Netlify Functions sono già dentro `netlify/functions/` e
   vengono pubblicate automaticamente.
5. Torna al passo 2.4 e 6 e sostituisci `tuoapp.netlify.app` con il dominio
   vero assegnato da Netlify (o il tuo dominio personalizzato, se lo
   colleghi).

---

## 10. Diventa amministratore

Le pagine `AdminAnalytics` e `AdminPromoReport` richiedono un utente con
ruolo `admin`. Per assegnartelo:

1. Registrati normalmente nell'app con il tuo account.
2. Supabase Dashboard → **Table Editor → profiles** → trova la riga con la
   tua email → modifica la colonna `role` da `user` a `admin` → salva.

(Non è possibile farlo dall'app stessa, di proposito: è una misura di
sicurezza per evitare che un utente si auto-promuova admin.)

---

## Cosa NON è stato toccato

- Ogni pagina, componente, stile, animazione: identici.
- La modalità ospite (dati solo-locale in localStorage): completamente
  indipendente da base44 prima e da Supabase ora, zero modifiche.
- La cifratura end-to-end dei dati sul fumo (`smokingCrypto.js`): il
  server (prima base44, ora Supabase) vede comunque solo testo cifrato.
- Il service worker PWA (`public/sw.js`): indipendente, non tocca API.

## Immagini

Le immagini che mi hai fornito (badge rank, logo, sfondo landing,
immagine hero della pagina Oggi) sono ora servite localmente da
`public/images/` invece che da `media.base44.com` — le trovi elencate più
sotto. Le altre ~15 immagini/video che l'app usava (bandiere lingue,
illustrazioni atleta/studente/lavoratore + relativi video, immagini
gym/studio/telefono/smettere-di-fumare) **restano ancora puntate a
`media.base44.com`**, perché non erano tra quelle che mi hai passato: quel
dominio potrebbe smettere di funzionare quando disattivi base44
definitivamente. Se vuoi, mandami anche quelle e le sposto allo stesso
modo.

Una nota a parte su `mobile.png`: l'ho salvata in `public/images/` ma
**non l'ho collegata a nessuna pagina**, perché nel codice attuale non
risulta usata da nessuna parte (la sezione mobile della Landing page non
ha uno sfondo immagine, a differenza di quella desktop che usa
`compiter.png`). Sembra pensata come sua controparte per mobile, ma visto
il vincolo di non cambiare l'estetica non l'ho aggiunta di mia iniziativa.
Fammi sapere se vuoi che la colleghi lì.

---

## Se qualcosa non funziona

Non ho potuto eseguire build o test reali in questo ambiente (nessun
accesso di rete durante lo sviluppo): tutto il codice è stato scritto e
verificato manualmente riga per riga, e ogni file `.js` ha passato un
controllo di sintassi automatico, ma un primo giro di collaudo reale da
parte tua resta importante. I punti più probabili in caso di errori:

- **Registrazione/login non funzionano** → controlla i template email
  (passo 2.2/2.3) e che "Confirm email" sia attivo (passo 2.1).
- **"Failed to resolve module @/..."** in fase di build → verifica di
  avere l'ultima versione di `vite.config.js` di questo progetto (contiene
  l'alias `@` che prima veniva dal plugin base44 rimosso).
- **Le Netlify Functions rispondono 500** → controlla i log in Netlify
  (**Functions** tab) e che tutte le variabili d'ambiente del passo 7
  siano impostate correttamente in produzione, non solo in locale.
- **Stripe non aggiorna l'abbonamento dopo il pagamento** → verifica che
  il webhook (passo 6) punti al dominio Netlify corretto e che
  `STRIPE_WEBHOOK_SECRET` corrisponda a quell'endpoint specifico.
