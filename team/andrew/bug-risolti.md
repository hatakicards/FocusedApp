# Bug risolti (Andrew)

ID | gravita | dove | risolto con | verificato il
A-008 | minore | popup "Prova Premium gratuita" senza modo di rifiutare (TrialWelcomeModal) | commit 8affe79: niente piu' trial_start alla creazione dell'ospite, il popup non parte | 2026-11-05 su focused-app.pages.dev a 375px: nuovo ospite, guest_data_UserSettings senza trial_start, nessun popup fino a Oggi/LifeGame/Optimize/Profilo
A-004 | minore | /welcome, schermo nero tra i passi | nessuna modifica: era un falso positivo (pannello del browser nascosto) | 2026-11-07 a 375px con pannello visibile: dal tocco su Continua al passo successivo 0,40 s (misurato con MutationObserver), coerente con la transizione di 0,25 s del codice. Sul telefono non provato, ma non c'e' motivo di tenerlo aperto
A-007 | medio | primo ingresso da ospite: tour sopra 'Valuta i tuoi parametri' + popup prova | commit 8affe79 (fine della prova automatica) | 2026-11-05 e 2026-11-07, due primi avvii puliti (localStorage vuoto) a 375px: saluto, tour 6 slide con la voce giusta evidenziata, primo avvio guidato attivita'/obiettivo/agenda/Focus Time, poi Oggi; una schermata alla volta, nessun popup
