# Team Focused

Chi fa cosa, come si parlano, cosa possono fare da soli. Gli agenti sono definiti in `.claude/agents/`. Ogni agente scrive solo nella propria cartella `team/<nome>/`.

## Il team

| Nome | Ruolo | Agente | Cartella | Quando lavora |
|---|---|---|---|---|
| Claude | Sviluppatore e coordinatore: programma, manda il lavoro ai colleghi, raccoglie i loro verdetti | `focused-dev` (+ la sessione principale) | repo | quando gli chiedi qualcosa |
| Marcus | Marketing: un video al giorno, analitiche, miglioramento continuo, ASO, creator | `marcus` | `team/marcus/` | ogni giorno 10:00 |
| John | Legale e amministrazione: controllo legale delle modifiche, tasse, dati, bozze di risposta ai clienti | `john` | `team/john/` | a ogni modifica rilevante + riepilogo lunedi' 09:00 |
| Andrew | Tester: prova funzioni nuove e vecchie, segnala bug | `andrew` | `team/andrew/` | ogni giorno 07:00 |
| Designer | Estetica app, widget, grafiche | `focused-designer` | repo | su richiesta |

## Flusso di una modifica

1. Tu chiedi a Claude una funzione.
2. Claude la programma (nessun push/deploy/build senza il tuo OK).
3. John controlla la diff: OK / OK con modifiche / BLOCCATO (scritto in `team/john/registro.md`).
4. Andrew la prova e riporta in `team/andrew/bug-aperti.md`.
5. Claude corregge i bug segnalati, Andrew li riverifica.
6. Solo a quel punto ti chiedo il via libera per deploy/build.
7. Marcus ne fa un video quando la funzione e' pubblica.

## Livelli di autonomia (si promuovono con il tempo)

- **Livello 0 - bozza**: l'agente prepara tutto e aspetta il tuo OK per ogni azione verso l'esterno. **Livello attuale per tutti.**
- **Livello 1 - pubblica da solo il contenuto standard**: dopo 2 settimane senza errori, Marcus puo' pubblicare i video giornalieri sulla piattaforma che scegli tu (richiede account collegato e accesso a pubblicare). John puo' rispondere da solo solo a domande gia' presenti in `team/john/faq.md`.
- **Livello 2**: tu decidi, per singola azione.

Non si promuovono mai da soli: li promuovi tu, per iscritto, nominando agente e azione.

## Regole comuni

- Nessuna azione irreversibile o verso l'esterno senza il livello richiesto: pubblicare, inviare email/DM, spendere, push/deploy/build, scritture sul database di produzione, invii ad Apple/Google.
- Mai segreti (chiavi, token, password) nei file, nei report o nelle risposte.
- UI: icone `lucide-react` a linea, mai emoji, nero/bianco minimale.
- Distinguere sempre dato misurato da stima, e "provato" da "non provato".
- I report sono brevi e dicono in cima cosa richiede la tua decisione.

## Controllo dal telefono

Vedi la sezione finale della conversazione con Claude: Remote Control collega la sessione all'app Claude sul telefono; le routine giornaliere ti mandano una notifica quando c'e' qualcosa che richiede te.
