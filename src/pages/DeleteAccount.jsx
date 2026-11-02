import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';

// Pagina pubblica (nessun login) a cui rimanda il campo "Elimina account" della Sicurezza dei dati di
// Google Play e che spiega come chiedere la cancellazione anche senza avere l'app installata.
const CONTACT_EMAIL = 'focusedappp@gmail.com';

const COPY = {
  en: {
    back: 'Back to home',
    title: 'Delete your Focused account and data',
    updated: 'Last updated: 2 November 2026',
    intro: 'Focused (app id org.focusedapp.app) lets you delete your account and the data linked to it at any time.',
    sections: [
      {
        h: 'In the app',
        p: ['Open Profile, tap "Delete account", type the confirmation word and confirm. The deletion starts immediately: your account and the data linked to it are removed from our systems and you are signed out. If something goes wrong the app shows an error and nothing is signed out, so you can try again.'],
      },
      {
        h: 'If you cannot open the app',
        p: [
          'Email us from the address you used to sign up, with the subject "Delete my Focused account". To protect your account we may reply to that address to confirm the request. We answer within 30 days and tell you when the deletion is complete.',
        ],
        mail: 'Delete my Focused account',
      },
      {
        h: 'What we delete',
        p: ['Your account (email, name, sign-in data), profile and settings, habits and activities, goals, daily ratings, journal entries, nutrition and body data, sleep, gym sessions, study data (subjects, grades, homework, tests), work logs, focus sessions, projects and tasks, books and reading logs, your date of birth, the memory Focusy keeps about you, ideas you posted and your votes, invitation records, and the files you uploaded (such as book covers).'],
      },
      {
        h: 'What we may keep (limited)',
        p: ['Payment records that Google Play, Apple, Stripe or the payment provider keep and the minimum we are required to keep by tax law. These are held by those providers under their own policies and we cannot delete them from here.'],
      },
      {
        h: 'Subscriptions',
        p: [
          'A subscription bought on our website is cancelled automatically when the account is deleted.',
          'Deleting your account does not cancel a subscription bought through the App Store or Google Play. Cancel it before deleting: in the App Store (Settings > your name > Subscriptions) or in the Google Play Store (Menu > Subscriptions). Otherwise the store keeps charging you.',
        ],
      },
      {
        h: 'Guest mode',
        p: ['If you use Focused without an account, your data is stored only on your device. Use "Delete local data" in Profile, or uninstall the app or clear its data.'],
      },
    ],
    mailBtn: 'Email a deletion request',
    privacy: 'Read our Privacy Policy',
  },
  it: {
    back: 'Torna alla home',
    title: 'Elimina il tuo account Focused e i tuoi dati',
    updated: 'Ultimo aggiornamento: 2 novembre 2026',
    intro: 'Focused (id app org.focusedapp.app) ti permette di eliminare in qualsiasi momento il tuo account e i dati collegati.',
    sections: [
      {
        h: "Dall'app",
        p: ['Apri Profilo, tocca "Elimina account", scrivi la parola di conferma e conferma. La cancellazione parte subito: il tuo account e i dati collegati vengono rimossi dai nostri sistemi e vieni disconnesso. Se qualcosa non va l\'app mostra un errore e non ti disconnette, così puoi riprovare.'],
      },
      {
        h: "Se non riesci ad aprire l'app",
        p: [
          'Scrivici dall\'indirizzo che hai usato per registrarti, con oggetto "Elimina il mio account Focused". Per proteggere il tuo account potremmo risponderti a quell\'indirizzo per confermare la richiesta. Rispondiamo entro 30 giorni e ti diciamo quando la cancellazione è completata.',
        ],
        mail: 'Elimina il mio account Focused',
      },
      {
        h: 'Cosa cancelliamo',
        p: ['Il tuo account (email, nome, dati di accesso), profilo e impostazioni, abitudini e attività, obiettivi, valutazioni giornaliere, diario, dati su alimentazione e corpo, sonno, allenamenti, dati di studio (materie, voti, compiti, verifiche), registri di lavoro, sessioni di focus, progetti e attività, libri e letture, la tua data di nascita, la memoria che Focusy tiene su di te, le idee che hai pubblicato e i tuoi voti, i dati sugli inviti e i file che hai caricato (per esempio le copertine dei libri).'],
      },
      {
        h: 'Cosa possiamo conservare (in modo limitato)',
        p: ['I registri dei pagamenti conservati da Google Play, Apple, Stripe o dal fornitore di pagamento e il minimo che la legge fiscale ci obbliga a tenere. Sono custoditi da quei fornitori secondo le loro regole e da qui non possiamo cancellarli.'],
      },
      {
        h: 'Abbonamenti',
        p: [
          "Un abbonamento acquistato sul nostro sito viene annullato automaticamente quando elimini l'account.",
          "Eliminare l'account non annulla un abbonamento acquistato tramite App Store o Google Play. Annullalo prima di eliminare: nell'App Store (Impostazioni > il tuo nome > Abbonamenti) o nel Google Play Store (Menu > Abbonamenti). Altrimenti lo store continua ad addebitarti.",
        ],
      },
      {
        h: 'Modalità ospite',
        p: ['Se usi Focused senza account, i tuoi dati sono solo sul tuo dispositivo. Usa "Elimina dati locali" nel Profilo, oppure disinstalla l\'app o cancella i suoi dati.'],
      },
    ],
    mailBtn: 'Scrivi per chiedere la cancellazione',
    privacy: 'Leggi la Privacy Policy',
  },
};

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
      <div className="space-y-3 text-white/70 leading-relaxed text-sm md:text-base">{children}</div>
    </section>
  );
}

export default function DeleteAccount() {
  const [lang, setLang] = useState(() => {
    try { return (navigator.language || 'en').toLowerCase().startsWith('it') ? 'it' : 'en'; } catch { return 'en'; }
  });
  const c = COPY[lang];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            {c.back}
          </Link>
          <div className="flex gap-1 text-xs font-semibold" role="group" aria-label="Language">
            {['en', 'it'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={`rounded-full px-3 py-1 uppercase transition-colors ${lang === code ? 'bg-white text-black' : 'border border-white/20 text-white/60 hover:text-white'}`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{c.title}</h1>
        <p className="text-white/40 text-sm mb-6">{c.updated}</p>
        <p className="text-white/70 leading-relaxed text-sm md:text-base mb-10">{c.intro}</p>

        {c.sections.map((s) => (
          <Section key={s.h} title={s.h}>
            {s.p.map((text) => <p key={text}>{text}</p>)}
            {s.mail && (
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(s.mail)}`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                <Mail size={16} /> {c.mailBtn}
              </a>
            )}
            {s.mail && <p className="text-white/50 text-sm">{CONTACT_EMAIL}</p>}
          </Section>
        ))}

        <p className="text-sm text-white/50">
          <Link to="/privacy" className="underline">{c.privacy}</Link>
        </p>
      </div>
    </div>
  );
}
