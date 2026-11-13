# Google Play Console - dichiarazioni "Contenuti dell'app" (preparate da John, 2026-11-02)

Stato: BOZZA da incollare. Non e' stato toccato Play Console ne' il codice. Io sono un assistente AI, non un avvocato: dove scrivo "serve un professionista" e' perche' il rischio e' medio/alto o riguarda contratti, minori, societa'. Le norme di Google cambiano spesso: prima di inviare, confrontare con il testo corrente della Play Console (Norme per gli sviluppatori).

Fonti lette nel repo: `src/pages/Privacy.jsx`, `Terms.jsx`, `Profilo.jsx` (handleDeleteAccount), `src/lib/ageCheck.js`, `AgeVerificationModal.jsx`, `Welcome`/`Step1Name`, `AdBanner.jsx`, `FullScreenAd.jsx`, `WorkWithUs.jsx`, `FocusyAssistant.jsx`, `functions/api/*`, `supabase/migrations/*`, `index.html`, `android/` (manifest e plugin), `package.json`.

---

## 0. PROBLEMI GRAVI (da risolvere PRIMA di inviare le dichiarazioni)

### G1. La "cancellazione account" non cancella l'account (BLOCCANTE per Play, e gia' un problema su iOS e per il GDPR) - rischio ALTO
Cosa fa oggi `handleDeleteAccount` (Profilo.jsx r.210-225), dal client:
- cancella righe solo da 7 tabelle: user_settings, daily_rating, activity, goal, day_entry, gym_session, life_stat;
- NON cancella l'utente in `auth.users` (nessuna server function con service role: in `functions/api/` non esiste `delete-account`; l'unica cancellazione e' quella client);
- NON cancella circa 25 altre tabelle con dati dell'utente, tra cui quelle piu' sensibili: `body_fuel_entry` (peso, altezza, cibo, sonno), `smoking_log` e `smoking_profile`, `work_day_log` (guadagni), `subject`/`lesson_grade`/`verifica`/`homework`/`grade_goal` (voti scolastici), `focus_time`, `task_item`, `project`, `timetable_slot`, `book`/`reading_log`, `phone_time_entry`, `referral`, `promo_code_usage`, `dream_functionality`, `user_activity`, `profiles`;
- NON cancella i file caricati nel bucket `app-uploads` (copertine libri; il bucket e' in lettura pubblica);
- ingoia gli errori (`catch` che fa solo `console.error`) e fa comunque `logout()`: l'utente crede che sia tutto cancellato anche quando non lo e';
- non c'e' nessun link web per chiedere la cancellazione.
Per di piu' la Privacy Policy dice "You can permanently delete your account and all associated data ... immediate", e i Termini la ripetono: oggi e' un'affermazione non vera (GDPR art. 5(1)(a) correttezza, art. 12-13 informazione, art. 17 cancellazione; per l'Italia anche rischio pratica commerciale scorretta, Codice del Consumo art. 20-21).
Requisito Google Play (norma "Eliminazione dell'account", verificare testo corrente): se l'app permette di creare un account, serve (1) una via in-app per avviare la cancellazione dell'account e dei dati associati, e (2) un link web (campo "Elimina account" in Sicurezza dei dati) dove l'utente puo' chiedere la cancellazione anche senza app installata. Entrambi mancano. Mancava gia' per Apple 5.1.1(v): l'app e' gia' live su iOS, quindi il problema esiste gia' li' (rischio di rimozione o rifiuto al prossimo aggiornamento).

Cosa va fatto (lo implementa Claude/focused-dev, io posso rivedere la diff):
1. Nuova Pages Function `functions/api/delete-account.js` (POST, utente verificato con `getUserFromRequest`): (a) se c'e' `stripe_subscription_id`, annulla l'abbonamento Stripe; (b) elimina i file `app-uploads/<uid>/...`; (c) opzionale ma consigliato: cancella il subscriber su RevenueCat (API REST, da verificare nella loro documentazione); (d) `supabaseAdmin.auth.admin.deleteUser(uid)`. Quasi tutte le tabelle hanno `references auth.users(id) on delete cascade` (verificato in 0001, 0004-0011), quindi (d) porta via il resto; (e) ripulire a mano gli array `liked_by`/`disliked_by` di `dream_functionality` e le righe `referral` in cui l'utente compare come invitato/invitante di altri.
2. Il client chiama la function, mostra l'errore se fallisce (non fa logout se non ha funzionato), poi `signOut`, cancella localStorage (compresa la chiave di cifratura smoking) e torna al login. Aggiungere conferma digitata ("ELIMINA") e avviso: "La cancellazione dell'account NON annulla l'abbonamento su Google Play/App Store: annullalo dalle impostazioni dello store" (i pagamenti fatti tramite store restano gestiti da Google/Apple).
3. Pagina web pubblica `/delete-account` (vedi bozza testo nell'Appendice A) + stessa cosa nella Privacy Policy. Meglio una pagina HTML statica (vedi punto 1.6 sotto). URL da inserire in Play: `https://focused-app.pages.dev/delete-account`.
4. Fino a che questo non e' fatto, NON dichiarare in Sicurezza dei dati "Gli utenti possono chiedere la cancellazione dei dati": sarebbe una dichiarazione falsa (Google controlla e puo' sospendere l'app).

### G2. Eta' minima: il controllo non protegge nessuno - rischio ALTO
- `ageCheck.js`: `MIN_AGE = 5`. Una data che da' 5-12 anni e' considerata valida: l'app accetta bambini di 5 anni. Il tuo target e' 13-30.
- `AgeVerificationModal.jsx` (la finestra bloccante con la data di nascita) esiste ma NON e' usata da nessuna parte (verificato: nessun import). Nel benvenuto la data e' "optional" (Step1Name). Senza data l'utente e' trattato da minorenne (scelta prudente) ma NON viene bloccato.
- Nessun consenso dei genitori e nessun blocco sotto i 13 (o sotto i 14, soglia italiana): GDPR art. 8 + D.Lgs. 196/2003 art. 2-quinquies (14 anni in Italia; altri Paesi UE 13-16, per esempio Germania/Paesi Bassi/Irlanda 16, Francia 15: da verificare).
- La stringa `age_privacy` dice "usata solo per verificare la maggiore eta'", ma il codice la usa anche per calorie, sonno e personalizzazione di Focusy: va corretta (trasparenza).
Cosa fare: vedi sezione 4.

### G3. Dati di salute di minori mandati all'IA (Groq) senza informativa specifica - rischio MEDIO-ALTO, serve un professionista
`FocusyAssistant.jsx` costruisce un prompt con sesso, peso, kcal e macro, scheda palestra con note libere, "PENSIERI OGGI" (diario), voti e materie scolastiche, "sogno" dell'utente, e lo manda a Groq (US) tramite `invoke-llm`. Sono dati di salute/benessere (art. 9 GDPR) di persone anche di 13-17 anni. La Privacy Policy dice solo "the text of your conversations ... to generate a reply" e non menziona che parte dei dati dell'app viene aggiunta al prompt ne' i trasferimenti extra-UE. Servono: informativa precisa, base giuridica (consenso esplicito art. 9(2)(a), per i minori dei genitori sotto i 14), contratto/DPA con Groq e meccanismo di trasferimento (art. 44-49), valutazione se serve una DPIA (art. 35: dati sanitari di minori + IA, da far valutare a un professionista). Verifica che Groq non usi i dati per addestrare modelli.
Collegato, sicurezza dei minori: il calcolatore calorie (`nutritionCalc.js`) offre intensita' "drastic" (deficit 800 kcal) a chiunque, minorenni compresi, con solo un avviso; Focusy non ha regole su disturbi alimentari/autolesionismo ne' pulsante "segnala risposta". Per un pubblico 13-17 e' un rischio reputazionale e di norme (Play: contenuti/servizi per la salute, contenuti generati dall'IA con meccanismo di segnalazione in-app, da verificare). Raccomandato: sotto i 18 niente intensita' "intense/drastic", niente obiettivo "lose" senza avviso di parlarne con un adulto/medico; nel prompt di Focusy una regola di sicurezza (non dare diete restrittive a minori, indirizzare a un adulto o a un professionista); pulsante "Segnala risposta" sotto ogni risposta IA.

### G4. Google Analytics caricato sempre, senza consenso, in un'app per minori - rischio MEDIO
`index.html` carica gtag (G-PTHP2SYXP7) per tutti, anche dentro l'app Android (la WebView carica il sito). Non c'e' banner/consenso (nessun codice di consenso nel repo). In UE/Italia (ePrivacy art. 122 Codice Privacy, Linee guida cookie del Garante 2021) l'analytics non anonimizzato richiede consenso; il Garante ha gia' sanzionato usi di GA. Opzioni: (a) togliere GA dalla build nativa e dai minori; (b) consenso preventivo con scelta equivalente "rifiuta"; (c) passare a un'analitica senza cookie/ID. Finche' resta, va dichiarata in Sicurezza dei dati e nella Privacy Policy (oggi e' scritta come "privacy-preserving", da non sostenere se non e' vero).

---

## 1. Norme sulla privacy (URL: https://focused-app.pages.dev/privacy)

Verifica: la pagina risponde 200, e' pubblica, non e' un PDF. Controlli e modifiche necessarie:

| # | Cosa manca o e' sbagliato | Modifica |
|---|---|---|
| 1.1 | Titolare del trattamento non identificato (nome/denominazione, indirizzo, contatto) | Aggiungere "Titolare: <nome e cognome o societa'>, <indirizzo>, <email>". Va deciso con il commercialista (vedi decisione D1). Google richiede che nel link ci sia il nome dello sviluppatore/app. |
| 1.2 | Cancellazione: promessa non vera (G1) | Riscrivere dopo aver implementato G1; indicare cosa si conserva (registri pagamenti presso Stripe/Google/Apple, obbligo fiscale) e per quanto. |
| 1.3 | Fornitori incompleti | Aggiungere: RevenueCat (acquisti in-app), Google Play Billing / Apple App Store (pagamenti), Apple (Sign in with Apple), Google LLC (Sign in, Analytics). Gia' presenti: Supabase, Cloudflare, Stripe, Groq, Resend. Indicare dove sono i dati (regione Supabase: da verificare nel progetto) e i trasferimenti extra-UE (Groq, Resend, RevenueCat, Google: DPF/clausole standard). |
| 1.4 | Dati di salute | Dichiarare in modo esplicito: peso, altezza, alimentazione, sonno, allenamenti, log "Quit Smoking" (cifrato sul dispositivo), e che parte di questi dati viene inviata a Focusy/Groq. Base giuridica: consenso esplicito (art. 9(2)(a)). Prevedere un consenso in-app prima della prima richiesta a Focusy. |
| 1.5 | Funzioni native iOS | Salute (HealthKit), posizione palestra, movimento, dettatura vocale: dire che oggi sono solo iOS e che l'elaborazione avviene sul dispositivo (se vero). Quando arriveranno su Android aggiornare prima del rilascio. |
| 1.6 | Base giuridica per finalita', tempi di conservazione, diritti | Aggiungere tabella finalita'-base giuridica (contratto art. 6(1)(b), consenso (a), legittimo interesse (f)), periodi di conservazione, diritti completi (accesso, rettifica, cancellazione, limitazione, portabilita', opposizione, revoca del consenso), diritto di reclamo al Garante (art. 77, www.garanteprivacy.it). Oggi non c'e' il reclamo al Garante. |
| 1.7 | Eta' minima | "Not directed at children below the minimum age required by applicable law" e' troppo vago. Scrivere l'eta' minima reale (vedi sezione 4) e la regola sul consenso dei genitori. |
| 1.8 | Data di nascita | Il testo dice "to confirm minimum age"; il codice la usa anche per calorie/sonno/personalizzazione IA. Allineare. |
| 1.9 | Analytics | Descrivere GA come e' (cookie/ID, IP, eventi) e il consenso quando sara' implementato (G4). |
| 1.10 | Contenuti di terzi / annunci | Dire che gli annunci mostrati sono promozioni di Focused e, in futuro, di inserzionisti; che non c'e' profilazione ne' vendita di dati. |
| 1.11 | Voci Stripe | Specificare che Stripe vale solo per il sito web; nell'app Android i pagamenti passano da Google Play. |
| 1.12 | Indicare le funzioni social/UGC | La bacheca idee ("Dream", visibile a tutti gli utenti) e' contenuto pubblico fra utenti: dirlo. |
| 1.13 | Tecnica | La pagina e' una SPA (React): senza JavaScript il contenuto e' vuoto. I controlli automatici di Google a volte segnalano "link privacy non raggiungibile". Consiglio: pubblicare privacy e pagina di cancellazione anche come HTML statico in `public/` (route che non passano da JS) e verificare con "Visualizza come Googlebot". |
| 1.14 | Data | "Last updated" 31 agosto 2026: aggiornare alla modifica. Metterla anche in italiano (il target e' italiano; il testo e' solo in inglese). |

Verdetto privacy policy per Play: **non adeguata oggi**. Serve la revisione 1.1-1.14. La parte 1.1 (titolare) e 1.4 (art. 9) richiedono un professionista.

---

## 2. Sicurezza dei dati (Data safety) - tabella da compilare

Domande generali Play:
- "La tua app raccoglie o condivide dati utente richiesti?" -> **Si**.
- "Tutti i dati utente raccolti dall'app sono criptati in transito?" -> **Si** (HTTPS verso Supabase, Cloudflare, Groq, Resend, RevenueCat; `cleartext:false` in capacitor.config.json).
- "Fornisci un modo per chiedere la cancellazione dei dati?" -> **Si, ma SOLO dopo aver implementato G1** (oggi falso). URL: `https://focused-app.pages.dev/delete-account` (da creare).
- "Segui la Families Policy?" -> No (pubblico 13+).
- Revisione di sicurezza indipendente: No.

Regola "condiviso": per Google il trasferimento a un fornitore che tratta i dati per tuo conto (service provider) NON conta come condivisione. Supabase, Cloudflare, Resend, RevenueCat e Groq sono service provider -> **Condiviso: No**. Eccezione: Google Analytics, se le impostazioni di condivisione dati di GA4 permettono a Google di usare i dati per scopi propri, in dubbio dichiarare **Si** (verificare nell'account GA4: Amministratore > Impostazioni di raccolta e modifica dei dati > Condivisione dei dati).

Scopi (valori Play): Funzionalita' dell'app / Analisi / Comunicazioni dello sviluppatore / Pubblicita' o marketing / Prevenzione di frodi, sicurezza e conformita' / Personalizzazione / Gestione dell'account. **Non spuntare "Pubblicita' o marketing"**: gli annunci sono promozioni proprie non personalizzate e non usano dati utente.

### 2.1 Dichiarare ORA (build Android 1.3, versionCode 2)

| Categoria Play | Tipo di dato | Raccolto | Condiviso | Scopi | Obbligatorio/Facoltativo | Elaborato in modo temporaneo | Note |
|---|---|---|---|---|---|---|---|
| Informazioni personali | Indirizzo email | Si | No | Funzionalita' dell'app; Gestione dell'account; Comunicazioni dello sviluppatore | Facoltativo (esiste la modalita' ospite) | No | Registrazione, recupero password, email di servizio (Resend), contatto |
| Informazioni personali | Nome | Si | No | Funzionalita' dell'app; Personalizzazione; Gestione dell'account | Facoltativo | No | Nome nel benvenuto o da Google/Apple |
| Informazioni personali | ID utente | Si | No | Funzionalita' dell'app; Gestione dell'account; Prevenzione frodi/sicurezza | Facoltativo (solo con account) | No | UUID Supabase; ID RevenueCat (= UUID, oppure anonimo per ospiti) |
| Informazioni personali | Altre info (data di nascita, sesso biologico) | Si | No | Funzionalita' dell'app; Personalizzazione; Prevenzione frodi/sicurezza e conformita' (controllo eta') | Facoltativo oggi; **diventera' obbligatoria per gli account** (sez. 4) | No | Sesso usato per il calcolo calorie e inviato a Focusy |
| Salute e fitness | Informazioni sulla salute | Si | No | Funzionalita' dell'app; Personalizzazione | Facoltativo | No | Peso, altezza, alimentazione/kcal, sonno, log Quit Smoking (cifrato sul dispositivo, chiave locale: il server non lo legge). Dichiararlo comunque come raccolto (e' trasmesso). Parte e' inviata a Groq (service provider) |
| Salute e fitness | Informazioni sul fitness | Si | No | Funzionalita' dell'app; Personalizzazione | Facoltativo | No | Sessioni palestra, schede, sessioni di focus/attivita' |
| Informazioni finanziarie | Cronologia degli acquisti | Si | No | Funzionalita' dell'app; Gestione dell'account | Facoltativo | No | Livello abbonamento, ID abbonamento Stripe (web), stato RevenueCat. Nessun dato carta: pagamenti Android gestiti da Google Play |
| Informazioni finanziarie | Altre informazioni finanziarie | Si | No | Funzionalita' dell'app | Facoltativo | No | Guadagni e obiettivo di guadagno inseriti dall'utente nel profilo Professionista (`work_day_log.earnings`, `monthly_earnings_goal`) |
| Messaggi | Altri messaggi in-app | Si | No | Funzionalita' dell'app; Personalizzazione | Facoltativo | **No** (finche' non e' verificato che Groq non conserva i testi) | Richieste a Focusy; le risposte non vengono salvate dal server (`invoke-llm` non scrive nulla), ma il testo transita da Groq. La "memoria di Focusy" (`focusy_memory`) e' salvata in user_settings |
| Messaggi | Email | Si | No | Assistenza clienti (Comunicazioni dello sviluppatore) | Facoltativo | No | Modulo Contatti (nome, email, messaggio) inviato a focusedappp@gmail.com |
| Foto e video | Foto | Si | No | Funzionalita' dell'app | Facoltativo | No | Copertine libri caricate in `app-uploads` (bucket in lettura pubblica via URL). Se non si vuole dichiararlo, togliere la funzione |
| Attivita' nell'app | Interazioni con l'app | Si | **Si/No: verificare GA4** | Analisi | Obbligatorio de facto (carica sempre) | No | Google Analytics (G-PTHP2SYXP7) nel sito caricato dalla WebView; da cambiare con G4 |
| Attivita' nell'app | Altri contenuti generati dagli utenti | Si | No | Funzionalita' dell'app; Personalizzazione | Facoltativo | No | Abitudini, obiettivi, valutazioni, diario ("pensieri"), voti, compiti, note, idee proposte nella bacheca "Dream" (visibili agli altri utenti) |
| Attivita' nell'app | Altre azioni | No | - | - | - | - | - |
| ID dispositivo o altri ID | ID dispositivo o altri ID | Si | Come GA4 | Analisi; Funzionalita' dell'app | Obbligatorio | No | ID client GA, ID anonimo RevenueCat per gli ospiti. NON l'ID pubblicitario Android |
| Posizione | Posizione approssimativa/precisa | **No** | - | - | - | - | Su Android la posizione non c'e' |
| Audio | Registrazioni vocali | **No** | - | - | - | - | La dettatura e' solo iOS |
| Info e prestazioni app | Log arresti anomali / Diagnostica / Prestazioni | No | - | - | - | - | Nessun SDK di crash (confermato in package.json). I log del server (IP) restano di Cloudflare/Supabase come fornitori |
| Contatti, Calendario, File, Cronologia web, App installate, SMS, Chiamate | - | No | - | - | - | - | L'agenda e' interna all'app, non legge il calendario del telefono. `FocusedScreenTimePlugin.kt` esiste ma i permessi non sono nel manifest e l'elenco app resta sul telefono |

Annotazioni:
- Il manifest Android dichiara solo `INTERNET` oggi. Il plugin notifiche locali aggiunge i suoi permessi (POST_NOTIFICATIONS) in fase di build: non sono dati raccolti.
- Questa tabella deve riflettere anche cio' che fa il sito caricato nella WebView: l'app carica sempre `https://focused-app.pages.dev` (`server.url`), quindi ogni modifica del sito cambia cio' che l'app fa DOPO l'approvazione di Google. Qualunque nuova raccolta va dichiarata prima di pubblicare il sito.

### 2.2 Da aggiungere quando arriveranno le funzioni native su Android

| Funzione | Cosa dichiarare in piu' | Altri obblighi Play (rischio) |
|---|---|---|
| Salute (Health Connect) | Fitness info (passi/attivita'), eventualmente Health info (sonno, FC): raccolti SOLO se escono dal telefono; se restano sul dispositivo non sono "raccolti" | Permessi Health Connect + modulo "Health Connect" in Play Console, privacy policy che citi l'uso, nessuna vendita/pubblicita'. Rischio medio |
| Posizione palestra | Posizione precisa (se inviata al server) | Posizione in background: dichiarazione speciale + divulgazione evidente + video di prova. Alto: evitare o usare solo primo piano |
| Dettatura vocale | Registrazioni vocali (se l'audio e' inviato a servizi Google/terzi); testo trascritto verso Focusy | Permesso RECORD_AUDIO + divulgazione. Medio |
| Blocco app / Screen Time | Elenco app installate (se inviato; oggi resta sul dispositivo) | Accessibility Service, Usage Access (`PACKAGE_USAGE_STATS`), eventuale `QUERY_ALL_PACKAGES`: richiedono dichiarazione e giustificazione a Google, divulgazione evidente, e il servizio di accessibilita' non puo' essere usato per scopi diversi dall'accessibilita' salvo eccezioni giustificate. **Rischio ALTO di rifiuto**: preparare una bozza di giustificazione prima di implementare |
| Notifiche | Nessun dato | Android 13+: permesso a runtime; per i minori toni neutri |

---

## 3. Classificazione dei contenuti (IARC)

Categoria da scegliere: "Utility, produttivita', comunicazione o altro" (non "Social", non "Gioco"). Email di contatto dello sviluppatore: `focusedappp@gmail.com`.

| Domanda IARC (formulazione sintetica) | Risposta | Motivazione |
|---|---|---|
| Violenza (reale, fantasy, sangue, armi) | No | Nessuna. Il tema "LifeGame" e' gamification di statistiche personali, non violenza |
| Contenuti sessuali / nudita' | No | Nessuno |
| Linguaggio volgare | No | Nessuno nei testi dell'app. Focusy e' una IA generativa: vedi nota IA sotto |
| Uso o riferimento a droghe, alcol, tabacco | **Si: riferimento al tabacco (modulo Quit Smoking), senza promozione ne' raffigurazione del consumo** | C'e' un registro per smettere di fumare con selezione prodotti (sigarette, ecc.). Tema di cessazione, non incentiva. Va dichiarato onestamente: puo' alzare il rating (es. verso 12+/Teen). Nell'app e' nascosto ai minorenni (ActivitiesList), ma il rating vale per l'app intera. Se il risultato supera la fascia di pubblico scelta (es. 18+), si decide: o si accetta il rating, o si toglie il modulo da Android |
| Gioco d'azzardo reale o simulato | No | Nessuna scommessa, nessuna loot box (verificato: nessun meccanismo di gioco a pagamento casuale) |
| Fumo / alimentazione / dieta / peso | Nessuna domanda IARC specifica, ma e' contenuto "salute" | Calorie, peso e obiettivi dieta sono presenti: includere nella dichiarazione "App per la salute" (sotto) e non presentare l'app come dispositivo medico |
| Funzioni di interazione tra utenti (chat, scambio contenuti) | **Si, limitata** | La bacheca "Dream" (`/dream`) mostra a tutti gli utenti, anche minorenni, le idee di funzione scritte da altri utenti (testo libero, anonime, con voti). Non e' chat, ma e' contenuto generato dagli utenti visibile ad altri. Il forum studenti (`forum_post`, `StudentsForum`) esiste nel codice ma NON e' collegato a nessuna rotta: rispondere come se non ci fosse; se verra' riattivato la risposta cambia e servono moderazione e blocco utenti |
| L'app condivide la posizione dell'utente con altri | No | Nessuna posizione condivisa |
| L'app permette di acquistare beni digitali | **Si** | Abbonamenti Pro/Premium tramite Google Play Billing (RevenueCat) |
| Accesso a internet illimitato / browser | No | Non c'e' un browser; si aprono solo link specifici (store, playlist) |
| Funzioni di IA generativa / chatbot | **Si (se il questionario lo chiede)** | Focusy e' un assistente IA basato su Groq |
| Notifiche pubblicitarie / annunci | Si (vedi sezione 5) | |

Dichiarazione "App per la salute" (sezione Contenuti dell'app): selezionare le funzioni presenti: monitoraggio attivita'/fitness, alimentazione e gestione del peso, sonno. Non e' un dispositivo medico e non fa diagnosi. Health Connect: NO oggi. Non dichiarare ricerca su soggetti umani.

---

## 4. Pubblico di destinazione e contenuti

### Cosa selezionare in Play Console
- Fasce d'eta': **13-15, 16-17, 18 e oltre**. Non selezionare 5 e meno, 6-8, 9-12.
- "L'app e' attraente per i bambini?": **No**. Attenzione: la mascotte/personaggio di Focusy (`CharacterVideo`), grafiche e screenshot non devono sembrare "da bambini" (colori da cartone, mascotte infantile): se Google ritiene che l'app attiri anche sotto i 13, scattano le norme Families (dati, annunci, SDK certificati). Marcus deve usare linguaggio e visual da adolescenti/giovani adulti.
- La Families Policy NON si applica se nessuna fascia sotto i 13 e l'app non attira i bambini. Restano comunque le regole sugli utenti minorenni (dati utente, annunci adatti, contenuti).

### Cosa comporta 13-15 / 16-17 / 18+
| Fascia | Conseguenze (Google + legge italiana/UE) |
|---|---|
| 13-15 | Un 13enne in Italia non puo' dare da solo il consenso al trattamento dati per servizi della societa' dell'informazione: soglia 14 anni (D.Lgs. 196/2003 art. 2-quinquies; GDPR art. 8). Sotto i 14 serve il consenso del genitore. Altri Paesi UE hanno soglie 13-16. Annunci: devono essere adatti a minori, niente profilazione. Contratti: un minorenne non ha capacita' di agire piena (c.c. art. 2, 1425): acquisti in-app fatti da minori possono portare a richieste di rimborso/annullamento al genitore (rischio basso-medio, gestito dalle regole rimborsi di Google) |
| 16-17 | Puo' consentire da solo in Italia (>=14), ma nei Paesi con soglia 16 (es. DE, NL, IE) il 16-17 va bene. Rimane minorenne: contenuti per adulti (tabacco/Quit Smoking) nascosti, annunci adatti, niente messaggi che facciano leva su senso di colpa |
| 18+ | Pieni diritti, Quit Smoking disponibile, annunci anche piu' ampi (con limiti: gioco d'azzardo vietato in Italia dal Decreto Dignita' D.L. 87/2018 art. 9, da verificare) |

### Cosa fa l'app oggi (verificato nel codice)
- `MIN_AGE = 5` e `MAX_AGE = 110` in `ageCheck.js`.
- Data di nascita facoltativa nel benvenuto; `AgeVerificationModal` non e' montata.
- `isMinor(undefined)` = true (prudente, buono). Modulo Quit Smoking nascosto ai minori (buono).
- Nessun consenso dei genitori, nessun blocco sotto 13/14.
- Niente blocchi per minorenni su: intensita' calorica "drastic", chat IA con dati sanitari, bacheca idee, promozioni.

### Raccomandazioni concrete
1. Portare `MIN_AGE` a **14** (opzione consigliata: elimina il problema del consenso genitoriale in Italia senza costruire un flusso di verifica) oppure restare a 13 e costruire un consenso del genitore (richiede un professionista: verifica dell'identita' del genitore, conservazione del consenso, art. 8 comma 2 "sforzi ragionevoli"). Se si sceglie 14, il pubblico Play resta 13-15? No: allineare. Un'app che dice "minimo 14" ma e' dichiarata 13+ crea incoerenza. Play offre solo la fascia "13-15": con minimo 14 si seleziona comunque quella (14-15 ci rientrano), basta che il testo dello store e i Termini dicano "da 14 anni" e che l'app blocchi i 13enni. Con minimo 13 restano i nodi del consenso (sopra). **Decisione D2 per il titolare.**
2. Data di nascita **obbligatoria** per ogni account (non per l'ospite), richiesta prima di tutto il resto, con selettore neutro (non suggerire "devi avere 14 anni"), blocco sotto l'eta' minima con messaggio neutro e memoria locale del blocco (per evitare di riprovare con un'altra data subito). Usare davvero `AgeVerificationModal` per gli utenti Apple/Google che entrano senza data.
3. Se il blocco scatta dopo la creazione dell'account: cancellare i dati.
4. Intensita' dieta: sotto i 18, vietare "intense" e "drastic"; per "lose" mostrare avviso e invito a parlarne con un adulto o un medico (vedi G3).
5. Distribuzione geografica in Play: per la prova chiusa limitare ai Paesi dove l'eta' e la lingua sono gestite (Italia, o IT + UE con soglia <= la scelta fatta). Rischio basso, effetto grande.
6. Bacheca "Dream": mostrare solo idee con `status = approved` (oggi la query non filtra e le idee non moderate sono visibili a tutti), aggiungere "Segnala", clausola nei Termini su contenuti vietati, e tempi di moderazione. Requisito UGC di Google Play (verificare testo corrente): termini che vietino contenuti offensivi + sistema di segnalazione + moderazione.
7. Termini: aggiungere "Eta' minima X anni; i minori di 18 anni usano l'app con l'autorizzazione dei genitori" (consigliato) e i diritti di recesso/rimborso per gli abbonamenti.

---

## 5. Dettagli di accesso, app governativa, funzionalita' finanziarie, annunci

### Accesso all'app (per i revisori)
Le funzioni principali richiedono login (rotta protetta), ma esiste la modalita' ospite ("Continua come ospite") senza account. Da compilare in Play Console ("Accesso alle app" > "Tutte o alcune funzionalita' sono limitate"):
- Istruzioni (inglese, da incollare): "Focused works without an account in Guest mode (tap 'Continue as guest' on the login screen) with data stored on the device. To test account features sign in with email and password using the credentials below. Sign in with Google/Apple is also available. Subscriptions (Pro/Premium) are available from Profile > Premium and are purchased through Google Play Billing. The 'Quit Smoking' module is hidden for accounts under 18; the demo account is 20 years old so you can see it."
- Credenziali: **creare un account dedicato ai revisori** (email gia' confermata, senza 2FA), tier **Free**, data di nascita adulta. Sono credenziali da mettere nel modulo di Play Console dal titolare, NON nei file del repo. Lezione dalla bocciatura Apple 2.1(b): se l'account demo e' gia' Premium, il revisore non trova l'acquisto; usare un account Free.
- Nota tecnica da verificare con Andrew prima dell'invio: nel codice di login nativo Google e' configurato solo con `iOSClientId` (manca il client web/Android) e Apple su Android non e' un flusso nativo. Verificare se "Continue with Google/Apple" funziona davvero su Android. Se non funziona, non indicarli ai revisori e segnalarlo a Claude (non e' un tema legale ma un rifiuto 2.1 di Google e' probabile).

### App governative: **No**.

### Funzionalita' finanziarie: **Nessuna delle opzioni elencate** (non e' prestito, banca, trading, crypto, pagamento). Il registro "guadagni" del profilo Professionista e' un diario personale, non un servizio finanziario. Nota: `smokingCrypto.js` riguarda la cifratura, non criptovalute.

### Altre dichiarazioni
- Notizie: No. COVID-19: non applicabile. Ricerca su soggetti umani: No.
- ID pubblicitario (Advertising ID): **No** (nessun SDK pubblicitario; verificato il repo: nessuna traccia di AdMob/AdSense/AppLovin/Unity/ironSource/Meta in `package.json` e `src`).
- Eta' target, vedi sezione 4. Modulo commerciante UE (DSA): in Play Console compilare lo stato di "commerciante": con abbonamenti a pagamento e inserzionisti paganti si e' un commerciante; nome, indirizzo e contatto saranno visibili in scheda. Serve decidere cosa mettere (D1).

### Annunci: risposta **Si**
Motivi: il banner (`AdBanner`) mostra a rotazione frasi motivazionali e, ogni terza posizione, "Annunci su Focused / Pubblica su Focused"; `FullScreenAd` mostra ogni 120 secondi un annuncio a schermo intero (etichetta "Annuncio") con inviti a sbloccare Premium/Pro; `WorkWithUs` vende spazi a inserzionisti a €0,005 (banner) e €0,02 (schermo intero) per impressione. Google chiede di rispondere Si anche per la promozione di prodotti propri mostrata come annuncio.

Verifica codice: nessuna rete pubblicitaria di terzi (nessun AdSense/AdMob/SDK ads in `package.json`, `src`, `android/`). Unico residuo: `public/ads.txt` contiene un ID editore Google AdSense (`pub-2116655816023168`) ma nel sito non c'e' codice AdSense. Raccomando di toglierlo (o motivarlo): incoerente con "nessuna rete di terzi" e potrebbe creare dubbi in revisione.

Rischi Annunci (Norme Google Play "Annunci", verificare testo corrente):
1. **Annunci invasivi**: l'interstitial a schermo intero compare ogni 120 secondi in qualsiasi momento (`FullScreenAd` e' abilitato per `!adsRemoved && !firstRun && !rateOpen`). Non e' sospeso durante una sessione Focus, un timer, un allenamento guidato o durante l'inserimento di un cibo. Google vieta annunci che compaiono in modo inatteso interrompendo l'uso. Raccomandato: non mostrare durante sessioni attive/scrittura, mai nei primi minuti, e frequenza piu' bassa. L'X di chiusura c'e' ed e' visibile (bene).
2. Annunci per un pubblico minorenne: quando vedranno la luce annunci di inserzionisti, devono essere adatti a 13+ (niente alcol, tabacco/svapo, gioco d'azzardo, app di incontri, diete/dimagranti, prestiti, cripto, contenuti per adulti, promesse di facile guadagno). Preparare un regolamento inserzionisti con approvazione manuale di ogni creativita'. Fonti: policy Google su annunci a minori, Codice di Autodisciplina IAP art. 11 (minori), D.L. 87/2018 art. 9 (azzardo): verificare con professionista.
3. Nessuna profilazione dei minori per la pubblicita' (principio GDPR/DSA art. 28): mantenere gli annunci non personalizzati e non dichiarare "Pubblicita' o marketing" come scopo dei dati.
4. Annunci e banner devono essere distinguibili dal contenuto: l'etichetta "Annuncio" c'e' nell'interstitial; nel banner la riga "Annunci su Focused - ..." non ha l'etichetta e sta in mezzo alle frasi motivazionali: aggiungere "Ad"/"Annuncio" anche li'.
5. `WorkWithUs` pubblica un numero di telefono personale (SMS) e tariffe in euro. Un numero personale di una persona fisica (forse minorenne) nell'app non e' consigliato: usare un'email aziendale. Inoltre incassare da inserzionisti richiede un soggetto fiscale (partita IVA, fatture): serve il commercialista (D1).

---

## 6. Cancellazione dell'account (requisiti Play) - stato e piano

Stato attuale (verificato):
| Requisito | Presente? | Dettaglio |
|---|---|---|
| Cancellazione avviabile in-app | **Parziale / non valida** | Profilo > Elimina account, ma cancella 7 tabelle su ~30, non l'utente auth, nessun errore mostrato |
| Server function di cancellazione | **No** | Non esiste `delete-account` in `functions/api/` (ne' in `netlify/functions/`). Conferma la nota di memoria "server function ancora aperta" |
| Cancellazione file caricati | No | Bucket `app-uploads` non toccato |
| Cancellazione abbonamenti | No | Stripe non annullato; Google Play/Apple: l'utente deve annullare dallo store, va detto |
| Link web per chiedere la cancellazione | **No** | Non esiste una pagina `/delete-account`; Privacy dice solo "contact us" |
| Dichiarazione veritiera nella Privacy/Termini | **No** | "immediate... all associated data" non corrisponde al codice |
| Utenti ospiti | OK | Dati solo locali: bastano disinstallazione o "Elimina dati locali" |

Piano (ordine): (1) function server `delete-account` + UI con conferma e gestione errori; (2) pagina web `/delete-account` statica con form/mailto (vedi Appendice A); (3) aggiornare Privacy e Termini; (4) test di Andrew: creare account di prova, inserire dati in ogni modulo, cancellare, verificare 0 righe in tutte le tabelle e login impossibile; (5) solo dopo, dichiarare Si in Data safety.
Tempi: Google non fissa un numero di giorni, ma la risposta alle richieste GDPR deve arrivare entro 1 mese (art. 12(3)). Mettere "entro 30 giorni".

---

## 7. Altri rischi legali Android/Play per un'app 13-17 con abbonamenti e promozioni

| # | Rischio | Livello | Cosa fare |
|---|---|---|---|
| 7.1 | Pagamenti: su Android i beni digitali devono passare da Google Play Billing. Nel codice, quando RevenueCat e' disponibile (app nativa) gli acquisti passano dallo store e Stripe/codici promo web sono nascosti (bene, in linea con Play Payments). Verificare che nessun testo dell'app Android rimandi al sito per pagare (es. "disponibile solo sul web", `profilo_codice_web_only`, prezzi con checkout web) | Medio | Test Andrew su Android; il campo codice e' nascosto in nativo, il messaggio non compare |
| 7.2 | Abbonamenti: Google richiede di mostrare chiaramente prezzo, durata, rinnovo automatico, prova gratuita (3 giorni: "pm_trial") e come annullare PRIMA dell'acquisto. Presenti Termini/Privacy nel modale. I prezzi arrivano dallo store (bene) | Basso | Aggiungere nel modale: "Si rinnova automaticamente. Annulla in qualsiasi momento da Play Store > Abbonamenti". Offerte di prova: devono comparire nello store configurate come tali (no prova fatta a mano) |
| 7.3 | Consumatori e minori: diritto di recesso su contenuti digitali (Codice del Consumo art. 59, eccezioni) e rimborsi Google; contratti dei minori annullabili | Medio-basso | Termini chiari su recesso e rimborsi; policy rimborsi. Serve un professionista per il testo definitivo |
| 7.4 | Contenuti generati dall'IA (Norma Google "Contenuti generati dall'IA"): serve un modo di segnalare risposte offensive/dannose dall'app, filtri di sicurezza. AI Act art. 50: informare che si interagisce con un'IA (obblighi dal 2 agosto 2026, verificare eventuali rinvii) | Medio | Pulsante "Segnala", testo "Risposte generate da IA, possono contenere errori", regole nel prompt (G3) |
| 7.5 | Salute: "Focusy" e il calcolatore danno consigli su dieta/allenamento a minori. Termini dicono "non e' consulenza medica" (bene) ma non nelle schermate | Medio | Avvisi nelle schermate Body Fuel/Focusy; blocco diete aggressive sotto i 18 (G3) |
| 7.6 | Notifiche e richiami ai minori: toni neutri, niente colpa/urgenza, permesso richiesto una volta (gia' nel registro). Nel richiamo serie 2-25 giorni | Basso | Riesame dei testi, nessuna novita' |
| 7.7 | Account sviluppatore Play: chi e' il titolare? (memoria: l'account Play e' dell'utente; l'account Apple e' della madre, venditore con nome e cognome di lei). Google richiede maggiore eta' per gli account sviluppatore (verificare), nome pubblico e, per i commercianti UE, indirizzo e telefono visibili in scheda. Se l'utente e' minorenne, i contratti con Google e i ricavi spettano a un adulto | Alto per chiarezza | Vedi D1: serve un professionista per societa'/titolarita'/partita IVA; il tema "Focused Developing" resta parcheggiato ma il nome pubblico su Play va deciso ora |
| 7.8 | Bucket `app-uploads` pubblico: URL delle copertine accessibile a chiunque conosca il link | Basso | Rendere privato o URL firmati; cancellare i file con l'account |
| 7.9 | Rete di tester e test chiuso: usare le email dei tester e' trattamento di dati di terzi; chiedere il loro OK a usarle. Nella prova chiusa gli utenti minorenni non sono ammessi senza consenso: i tester di 13-17 devono avere il consenso del genitore | Basso | Verificare l'eta' dei 12 tester (alcuni potrebbero essere minorenni) |
| 7.10 | Scrittura dei log: la function admin legge solo dati aggregati (commit 9a05ecf): coerente con la privacy | OK | Non toccare |
| 7.11 | Bacheca "Dream": `liked_by`/`disliked_by` contengono UUID degli utenti leggibili da tutti | Basso | Far passare i voti da una function che conta senza esporre gli ID |
| 7.12 | Piattaforma e DSA art. 28 (minori): oggi l'app non e' una "piattaforma online" nel senso stretto (UGC limitato), ma il principio - niente pubblicita' profilata a minori - va rispettato | Basso | Mantenere |

---

## DA DECIDERE DAL TITOLARE (max 5)

1. **D1 Chi e' il titolare/venditore su Google Play e sulla privacy** (nome pubblico, indirizzo, telefono, stato "commerciante"): persona fisica (e chi, se minorenne, un genitore?) oppure societa'. Condiziona privacy, Termini, fatture da inserzionisti, imposte. Serve commercialista.
2. **D2 Eta' minima reale**: 14 anni (semplice) oppure 13 con consenso dei genitori (costoso). In entrambi i casi: data di nascita obbligatoria e blocco sotto la soglia. Allineare Play (13-15, 16-17, 18+) e testi.
3. **D3 Cancellazione account vera**: dare OK a Claude per costruire `delete-account` (server) + pagina web `/delete-account` PRIMA di caricare la prova chiusa o prima della produzione. Dichiarare Si in Data safety solo dopo.
4. **D4 Dati sanitari e Focusy per minori**: consenso esplicito prima di inviare a Groq peso/kcal/diario; sotto i 18 niente diete "intense/drastic"; pulsante "Segnala risposta". Oppure togliere questi dati dal prompt dei minori.
5. **D5 Analytics e annunci**: togliere o mettere dietro consenso Google Analytics (soprattutto su Android), e limitare l'interstitial (non durante sessioni attive). Decidere anche se tenere `ads.txt` AdSense e il numero di telefono personale in "Lavora con noi".

---

## Appendice A - Bozze testi

### A1. Pagina web `/delete-account` (inglese, da pubblicare come HTML statico)
> **Delete your Focused account and data**
> Focused (app id org.focusedapp.app) lets you delete your account at any time.
> **In the app:** Profile > Delete account > confirm. Your account and the data linked to it are deleted from our systems.
> **If you can't open the app:** email focusedappp@gmail.com from the address you used to sign up, with the subject "Delete my Focused account". We reply within 30 days and confirm when the deletion is complete.
> **What we delete:** your account, profile, habits, goals, ratings, journal entries, nutrition/body, gym, study and work logs, focus sessions, settings, files you uploaded, and your messages to Focusy.
> **What we may keep (limited):** payment records kept by Google Play, Apple, Stripe or the payment provider and the minimum required by tax law; these are managed by those providers.
> **Subscriptions:** deleting your account does not cancel a subscription bought through Google Play or the App Store. Cancel it in Play Store > Subscriptions (or App Store) before deleting.
> **Guest mode:** data is stored only on your device; uninstall the app or clear its data.

### A2. Aggiunta alla Privacy Policy (Sezione "AI assistant (Focusy)")
> "When you use Focusy, your message and a summary of the data you chose to track in Focused (such as nutrition and weight, workouts, ratings, school data, and your notes) are sent to our AI provider Groq, in the United States, only to generate a reply. We do not use this data for advertising. Health-related data is processed only with your explicit consent, which you can withdraw at any time in Profile. If you are under the age required by your country to consent on your own, a parent or guardian must give consent."
(Da far verificare a un professionista, vedi G3 e punto 1.4.)

### A3. Avviso eta' (Termini)
> "You must be at least [14/13] years old to use Focused. If you are under 18, you confirm that a parent or guardian knows about and allows your use of the app and any purchase."

---

## Verdetto (registro John)
- Dichiarazioni Play: **OK con modifiche** (preparate), ma l'invio e' **BLOCCATO** per Sicurezza dei dati ("cancellazione disponibile") e per il link web di cancellazione finche' G1 non e' risolto.
- Prima di caricare in produzione: risolvere G1, G2, G3, G4 e le modifiche alla Privacy.
- Prima di cominciare la prova chiusa con 12 tester: bastano G1 (almeno l'URL pagina web) e la Privacy Policy aggiornata; il resto puo' procedere in parallelo, rischio ALTO se i tester sono minorenni (7.9).
