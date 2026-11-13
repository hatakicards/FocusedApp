# Copertura test (Andrew)

funzione | ultimo test | esito
lint / build | 2026-11-13 | lint 16 errori invariati (A-001/A-002); build OK in 49 s, index-CB_Y54BY.js 2.46 MB = bundle online (A-003)
Sito pubblicato = HEAD | 2026-11-13 | NO: online index-CB_Y54BY.js = copia di lavoro NON committata (invariata dal 12/11); ultimo commit resta 914b8a5
Landing + "Start for Free" (375px), About, Contact | 2026-11-11 | landing OK, nessuno scroll orizzontale; About in inglese, cita ancora Quit Smoking (esiste, nascosto ai minori: OK); Contact: campi required ed email type=email, invio NON provato (email reale), endpoint senza limite di frequenza (A-029); GA parte gia' sulla landing (A-009)
Privacy (cancellazione account, eta' 14, guest data facoltativa) | 2026-11-09 | pagina 200, aggiornata al 3/11; non cita pubblicita'/sponsor Aurum (A-020, per John)
/delete-account (pagina esiste, 200) | 2026-11-09 | pagina in italiano, istruzioni dall'app; flusso non provato (serve account)
Benvenuto passo 1 (nome, data vuota, data <14 anni, Indietro) | 2026-11-11 | nome solo spazi -> Continua disattivato OK; nome ignorato per l'ospite (A-006); freccia Indietro coperta anche al passo lingua (A-016). Blocco <14 anni: 2026-11-10 OK
Benvenuto passo 2 (lingua) e 3 (sogno) + transizioni | 2026-11-11 | Italiano + sogno OK; doppio tocco su Continua al sogno: nessun passo saltato
Benvenuto permessi notifiche (web) | 2026-11-08 | Weiter funziona (in tedesco)
Benvenuto passi "organizzare il tempo", "eliminare distrazioni", 4 slide fino ad Accedi | 2026-11-11 | percorsi con tocchi ravvicinati: OK fino ad Accedi (le 4 slide sono nel codice; con tocchi ogni 1,4 s ne ho lette 2 per via delle animazioni, nessun blocco)
Passo account (Step4Auth) | 2026-11-11 | testi ancora in inglese (A-005). Creazione account NON provata (scrittura su produzione)
Paywall Step5Premium (mensile/trimestrale/annuale) | 2026-11-11 | Mensile 6,99/4,99 con prova Stripe all'ospite (A-010). Prezzi trimestrale/annuale: 2026-11-10 OK. Nessun acquisto
Oggi primo avvio ospite: tour "Come funziona" 6 slide, prima attivita', Salta | 2026-11-11 | tour 6 slide OK (doppio tocco su Avanti = 1 slide), LifeGame dice ancora "Si sblocca con Premium" (A-017); attivita' con nome di 105 caratteri senza spazi: salvata e troncata con "..." nella scheda di Oggi, nessuno scroll orizzontale; Salta al primo passo porta a Oggi
Popup Prova Premium gratuita | 2026-11-05 | non compare piu' per i nuovi ospiti (A-008 risolto)
LifeGame (/obiettivi): ranking, milestones | 2026-11-08 | bloccato per free con "Mit Pro oder Premium freischalten"; milestone in parte in inglese (A-014). Medaglione 3D non riprovato (bloccato)
Oggi: obiettivi in Oggi (TodayGoals) | 2026-11-13 | obiettivo creato dal dettaglio attivita' (titolo vuoto/spazi -> Salva disattivato OK), Oggi Objetivos 0/1 -> spunta 1/1 (completed_periods 2026-11-13) -> tolta 0/1 OK; casella senza etichetta (A-012)
Pisolini (NapsCard in Body Fuel) | 2026-11-06 | scheda visibile ma Body Fuel e' bloccato per i free ("Sblocca con Premium" sopra la pagina): aggiunta pisolino NON provata (serve abbonamento). Letta la logica: fine prima dell'inizio -> errore, niente controllo su pisolini duplicati o sovrapposti
Notifiche nella lingua giusta | mai | NON TESTATO (solo nativo)
Modalita' Atleta/Studente/Professionista da Oggi (ospite) | 2026-11-13 | Atleta da ospite: modale "Inicia sesion para suscribirte", profile_type non cambia (resta studente dalla domanda del benvenuto). OK
Personal (ospite) | 2026-11-11 | apre Body Fuel (titolo "Athlete" in inglese, A-014); passi e posizione palestra "Disponibile nell'app per iPhone"
Focusy da ospite | 2026-11-09 | "Accedi per usare Focusy" + Apri, OK; "Logged as guest" in inglese (A-014)
Gym (/gym) da ospite | 2026-11-09 | "Gym Tracker disattivato", runner NON provato (serve modalita' a pagamento)
Annuncio a tutto schermo (free) | 2026-11-11 | ogni 120 s confermato (15:03 e 15:05); "Salta annuncio" chiude; durante Focus Time si apre invisibile sotto il timer e ruba il primo tocco (A-027 medio); interrompe anche i dialoghi aperti
Invita amici, Dream, Work with Us | 2026-11-11 (Dream, Work with Us) | Dream da ospite: suggerimento solo in locale con "In revisione" (A-028); Work with Us: tariffe e contatti visibili, "Sponsoring and Advertising" in inglese (A-014). Invita: 2026-11-09
Termini (/terms) | 2026-11-11 | 200, aggiornati al 31/8, prova "one per account" (contrasto con A-010), niente su pubblicita'/sponsor; solo inglese
Elimina account, RatePrompt | mai | NON TESTATO (serve account)
Paywall benvenuto con prova opt-in (8affe79) | 2026-11-05 | "Prova gratis 7 giorni" + condizioni (6,99 EUR/mese, rinnovo, disdetta) visibili solo su Mensile; mostrato anche agli ospiti (A-010 ALTO), lingua mista (A-005). Nessun clic su pulsanti di pagamento
PremiumModal da ospite (da LifeGame bloccato) | 2026-11-13 | OK in spagnolo: "Inicia sesion para suscribirte" + Ir al inicio de sesion, nessun checkout ne' prova 7 giorni
LifeGame bloccato "Sblocca con Pro o Premium" (1b973da) | 2026-11-13 | OK ("Desbloquea con Pro o Premium"); Statistiche: testo 1-10 ma cursori 1-100 (A-036)
Benvenuto a Pro/Premium (PlanWelcomeFlow, lucchetto, giro guidato) e medaglione girabile col dito (3158015/1f364e8) | 2026-11-12 | provato tramite la prova in app da ospite: lucchetto 'Benvenuto in Premium', 'Ecco cosa hai sbloccato', LifeGame 1/2 con medaglione Bronzo 3D (GLB 200, trascinamento lo ruota, X chiude e passa a Statistiche 2/2), Modalita', Atleta 1/4-2/4; Salta -> A-030. Passi Studente/Professionista del giro NON visti
Primo avvio guidato (attivita', obiettivo, agenda, Focus Time) | 2026-11-10 | Studio + obiettivo "Ogni settimana" (titolo resta "ogni giorno", A-021); agenda con titolo di 140 caratteri e ora passata 07:00 accettati e salvati; Focus Time "Inizia ora" apre /focus col timer, ma lo stato resta e la sessione riparte da sola a ricarica/Indietro (A-024 ALTO)
Organize/Agenda | 2026-11-08 | nuovo to-do da ospite: titolo vuoto/spazi bloccato, fine prima dell'inizio e guadagno -50 accettati (A-019); task senza data visibile solo in Lista (non in Heute/Tag); elimina con conferma OK
Optimize (programmi di blocco, web) | 2026-11-11 | titolo vuoto -> salvato come "Nuovo programma" Lun-Ven 09-12 (OK); 22:00-07:00 -> "La fine deve essere almeno 15 minuti dopo l'inizio" (niente programmi notturni, da chiedere); cestino elimina subito senza conferma; interruttore e cestino senza etichetta (A-012). Blocco reale: solo nativo
Profilo ospite (motivazione, sogno, data, lingua, promemoria, rank, archivio) | 2026-11-09 | promemoria serale: orario dal benvenuto 21:00 (reminder_time salvato), cambiato a 20:15 + Salva -> "Prossimo promemoria: lun 20:15" e salvato in locale; sogno presente; nome assente (A-006)
Console / rete | 2026-11-13 | 2 warning DialogContent (A-012), 0 errori, 0 richieste fallite nel giro benvenuto+Oggi+LifeGame+Organize+Optimize+Profilo
Pulsanti coperti dal contenitore toast (18 pagine: agenda, focus, obiettivi, profilo, statistiche, riepilogo, attivita, dream, invita, work-with-us, login, register, forgot-password, delete-account, privacy, terms, gym, focusy) | 2026-11-07 | nessuno; solo la freccia Indietro del benvenuto (A-016)
Valutazione del giorno in Oggi (ospite) | 2026-11-13 | voto 3 -> "1 dia: la racha ha empezado"; doppio tocco a 120 ms = 1 voce OK, due clic nello stesso istante = 2 voci (A-034)
Primo avvio guidato: Ueberspringen e attivita' solo spazi | 2026-11-08 | solo spazi -> Weiter disattivato; Ueberspringen porta a Oggi senza errori
App in tedesco (benvenuto, tour, Oggi, Profilo, LifeGame, Organize) | 2026-11-08 | quasi tutto tradotto; restano A-005, A-014, A-018
Benvenuto nuovo: schermata promemoria solo nativa + ReminderNudge in Oggi (f1c4eb3, online da 1.4) | 2026-11-09 | WEB: dopo il sogno si passa ai permessi (la schermata promemoria e' saltata, come previsto), nessuna scheda ReminderNudge in Oggi (corretto: solo nativo). NATIVO: NON TESTATO, vedi checklist-nativa
Offline | mai | NON TESTATO (dal pannello non si puo' staccare la rete)
Banner sponsor Aurum (AdBanner, f1c4eb3) | 2026-11-09 | rotazione ~6 s, 4 frasi Aurum con logo ed etichetta PUBBLICITÀ, tocco apre solo https://aurum-axv.pages.dev in nuova scheda (noopener, nessun dato), frasi normali non cliccabili; testo entra a 375px in IT. Da valutare con John (A-020). Nativo (Browser.open): NON TESTATO
Focus Time (Optimize): avvio rapido, Riduci, Termina, ricarica | 2026-11-11 | avvio rapido 25 min OK (selettore mostra "2", A-023); Termina dopo 2 min -> Cronologia "2 min", statistiche 2 minuti/1 sessione/1 giorno OK; annuncio invisibile durante la sessione (A-027). A-022/A-024 non riprovati (codice invariato). Blocco app: solo nativo, NON TESTATO
Prova Premium in app 3 giorni + domande benvenuto (online, non committate) | 2026-11-12 | provate a 375px da ospite: domande OK, risposte salvate, doppio tocco OK; prova salvata e sblocca LifeGame/Personal; A-030 (Salta nel giro perde la modalita'), A-031 (Focusy promessa ma bloccata per l'ospite). 'Magari dopo' e 'Vedi i piani' NON provati
Benvenuto: passo permessi web dopo fix Apple 5.1.1(iv) (solo 'Continua', niente 'Non ora') | 2026-11-12 | web OK: un solo Continua, avanza anche con notifiche negate; 'Impostazioni' inutile sul web (A-032). Nativo (richiesta iOS dopo Continua) NON TESTATO

App in spagnolo (benvenuto, prova 3 giorni rifiutata, Oggi, Organize, Optimize, Profilo, LifeGame) | 2026-11-13 | quasi tutto tradotto; accenti mancanti e date con "De" maiuscolo (A-033); restano A-005, A-006, A-011, A-014
Prova in app 3 giorni RIFIUTATA (Quizas mas tarde -> Estas seguro? -> Si, continuar sin ella) | 2026-11-13 | OK: arriva in Oggi da free, nessuna prova salvata, LifeGame resta bloccato
Nuova attivita' da Oggi + dettaglio attivita' | 2026-11-13 | nome con accenti salvato, dettaglio con calendario/obiettivi OK; simbolo mostra la chiave "star" (A-035)
