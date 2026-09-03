import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const CONTACT_EMAIL = 'focusedappp@gmail.com';
const LAST_UPDATED = '31 August 2026';

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
      <div className="space-y-3 text-white/70 leading-relaxed text-sm md:text-base">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: {LAST_UPDATED}</p>

        <Section title="Who we are">
          <p>
            Focused ("we", "us") is a personal discipline and habit-tracking app. This policy explains what
            data we collect when you use the app, why we collect it, and how you can control it. If you have
            questions, write to us at <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="Data you give us directly">
          <p>Account: your email address, and optionally your name and profile picture if you sign in with Google.</p>
          <p>
            Content you create: habits and activities, daily ratings, goals, journal entries, nutrition and gym
            logs, study data (subjects, grades, homework, tests), work logs, focus sessions, phone-usage
            self-reports, and — if you use the Quit Smoking module — substance-use logs, which we treat as
            sensitive health data and store with extra care.
          </p>
          <p>Anything you type to Focusy, our AI assistant, plus the app data needed to answer you (see "AI processing" below).</p>
          <p>Your date of birth, collected once to confirm you meet the minimum age to use the app.</p>
          <p>Messages you send us through the Contact form.</p>
        </Section>

        <Section title="Data collected automatically">
          <p>Basic sign-in activity (when you log in) and standard technical logs needed to keep the service secure and working.</p>
          <p>
            Aggregate, privacy-preserving usage analytics via Google Analytics, so we understand which parts of
            the app are useful. This does not include the personal content you track inside the app.
          </p>
          <p>
            If you enable app-blocking / screen-time features on iOS or Android, the list of apps you choose to
            block and your usage thresholds are processed and enforced entirely on your device by the
            operating system. We do not receive, see, or store which apps you have selected — Apple and Google's
            platforms are built so that this information never leaves your device.
          </p>
        </Section>

        <Section title="How we use your data">
          <p>To run the app: sync your data across your devices, save your progress, and show you your own statistics and rank.</p>
          <p>To process payments for Premium/Pro subscriptions through Stripe — we never see or store your full card details.</p>
          <p>To send you transactional emails (sign-up confirmation, password reset, replies to your messages) and, if enabled, an evening reminder.</p>
          <p>To personalize Focusy's answers using the activity data described above.</p>
          <p>To improve the app based on aggregate usage patterns.</p>
        </Section>

        <Section title="Who we share data with">
          <p>We do not sell your personal data. We share it only with the service providers that make the app work, each acting under their own privacy commitments:</p>
          <p>
            Supabase (database and authentication), Cloudflare (hosting), Stripe (payments), Groq (processes
            the text of your conversations with Focusy to generate a reply), Resend (transactional email), and
            Google (Sign in with Google, and Analytics).
          </p>
        </Section>

        <Section title="Your choices and rights">
          <p>You can edit or delete any piece of content (activities, ratings, goals, logs) directly in the app at any time.</p>
          <p>You can permanently delete your account and all associated data from Profile → Delete account. This is immediate and cannot be undone.</p>
          <p>
            If you are in the EU/UK, you have the right to access, correct, export, or erase your personal data,
            and to object to certain processing, under GDPR. Contact us at {CONTACT_EMAIL} to exercise these rights.
          </p>
        </Section>

        <Section title="Data retention">
          <p>We keep your data for as long as your account is active. If you delete your account, your personal data is deleted from our systems, except where we are legally required to retain limited records (e.g. payment records for tax purposes).</p>
        </Section>

        <Section title="Children's privacy">
          <p>
            Focused verifies your date of birth during sign-up and is not directed at children below the minimum
            age required by applicable law in your country. We do not knowingly collect personal data from
            children under that age. If you believe a child has provided us with personal data, contact us and
            we will delete it.
          </p>
        </Section>

        <Section title="Security">
          <p>We use industry-standard measures (encrypted connections, access controls, and, for the Quit Smoking module, additional encryption at rest) to protect your data. No method of transmission or storage is 100% secure, but we work to protect your information to a high standard.</p>
        </Section>

        <Section title="Changes to this policy">
          <p>We may update this policy as the app evolves. We will update the "Last updated" date above and, for material changes, notify you in the app.</p>
        </Section>

        <Section title="Contact">
          <p>Questions about this policy or your data? Email us at <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a> or use our <Link to="/contact" className="underline">Contact page</Link>.</p>
        </Section>
      </div>
    </div>
  );
}
