# Checklist test nativi per l utente (Andrew)

Notifiche, blocco app, widget, Screen Time: da provare su iPhone.

## Aggiunte 2026-11-04 (1.3, da provare su iPhone con la build TestFlight)
- Pisolini: dormi/registra un pisolino in Salute, apri Body Fuel: compare nella card Pisolini e non viene sommato due volte al sonno della notte?
- Notifiche nella lingua giusta: imposta l'app in inglese, poi in italiano; la notifica serale arriva nella lingua scelta nell'app (non in quella del telefono)?
- Medaglioni 3D in LifeGame: tocca ogni rank; il modello ruota fluido, non scalda il telefono, si chiude bene?
- Primo avvio da ospite: si vedono tour, "Valuta i tuoi parametri" e popup prova uno sopra l'altro (A-007)?
- Transizioni del benvenuto: c'e' schermo nero tra un passo e l'altro (A-004)? Se no, A-004 si chiude.

## Aggiunte 2026-11-05 (prova gratuita opt-in, 8affe79)
- [ ] iPhone, account senza abbonamenti: il paywall mostra "Prova gratis N giorni" solo se l'offerta introduttiva e' configurata in App Store Connect per premium_monthly; con Apple ID che l'ha gia' usata compare "PREMIUM · Full Access" normale.
- [ ] Il testo sotto il pulsante cita le impostazioni dell'Apple ID (non "dal tuo profilo") e il prezzo vero dello store.
- [ ] Dopo l'acquisto in prova (sandbox): parte l'animazione "Benvenuto a Premium" (lucchetto che si apre, giro guidato su rank, modalita', Atleta/Studente/Professionista, Focusy) e si chiude senza bloccare l'app.
- [ ] Medaglione rank (Pro/Elite): si gira col dito destra/sinistra e su/giu', si ferma a +-90 gradi, nessuna rotazione automatica.

## Aggiunte 2026-11-07 (A-016, freccia Indietro del benvenuto)
- [ ] iPhone (con notch e, se possibile, un modello senza notch tipo SE) e Android: benvenuto nuovo, arriva a "Qual e' il tuo sogno?" e tocca la freccia Indietro in alto a sinistra. Deve tornare a "Scegli la tua lingua" al primo tocco. Se serve toccare piu' in basso o non risponde, A-016 vale anche nell'app nativa.

## Aggiunte 2026-11-08 (modifiche locali NON ancora committate: schermata promemoria nel benvenuto + ReminderNudge)
- [ ] iPhone, benvenuto nuovo: dopo "Qual e' il tuo sogno?" compare una schermata solo per il promemoria della sera, con anteprima della notifica col tuo nome e l'orario (default 21:00) modificabile.
- [ ] "Attiva": parte la richiesta di iOS; se accetti si vede la spunta e si va avanti da soli; se rifiuti si resta li' con il tasto Impostazioni, e tornando dalle Impostazioni con le notifiche accese la schermata se ne accorge.
- [ ] (SUPERATO dal fix Apple 5.1.1(iv), copia di lavoro 11/11) "Non ora" non esiste piu'.
- [ ] Promemoria nel benvenuto: un solo pulsante "Continua" -> compare SUBITO la richiesta di iOS; sia "Consenti" sia "Non consentire" portano avanti (nessun blocco sul passo).
- [ ] Passo altri permessi: "Continua" apre le richieste di iOS una dopo l'altra (posizione, salute...) e poi va alle domande, qualunque sia la risposta; con un permesso negato compare "Impostazioni" e apre davvero le impostazioni dell'app.
- [ ] Freccia Indietro dalla schermata permessi successiva: torna al promemoria (o al sogno se le notifiche sono gia' accese).
- [ ] L'orario scelto qui e' quello mostrato poi nel Profilo ("Nächste Erinnerung"/"Prossimo promemoria") e la notifica arriva a quell'ora.
- [ ] Oggi, con notifiche rifiutate: compare la scheda per riattivarle; la X la nasconde per 3 giorni; spegnendo il promemoria dal Profilo la scheda non ricompare.

## Aggiunte 2026-11-09 (versione 1.4: le modifiche del 2026-11-08 ora sono committate e nella build 1.4)
- [ ] La sezione "Aggiunte 2026-11-08" qui sopra vale per la build 1.4 (iOS e Android versionCode 3): da provare li'.
- [ ] Banner Aurum (barra in basso, account free): toccando una frase Aurum si apre il browser di sistema (Safari / Chrome Custom Tab) su aurum-axv.pages.dev, non una schermata dentro Focused; tornando all'app si e' dove si era.
- [ ] Il banner non compare con Pro/Premium o dopo "rimuovi annunci".
