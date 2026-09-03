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

export default function Terms() {
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

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: {LAST_UPDATED}</p>

        <Section title="Agreement">
          <p>
            By creating an account or using Focused, you agree to these Terms. If you don't agree, please
            don't use the app. See our <Link to="/privacy" className="underline">Privacy Policy</Link> for how
            we handle your data.
          </p>
        </Section>

        <Section title="The service">
          <p>
            Focused is a personal habit and discipline tracker. A free plan is always available. Paid plans
            (Pro and Premium) unlock additional features such as profile modes, rankings, and ad removal, as
            described in the app.
          </p>
          <p>
            Focused includes optional modules — nutrition tracking, a gym planner, a Quit Smoking log, and an
            AI assistant ("Focusy") — that provide general, automated suggestions based on the data you enter.
            They are tools for self-tracking and motivation, not medical, nutritional, or health advice. Always
            consult a qualified professional before making decisions about your health, diet, exercise, or
            substance use.
          </p>
        </Section>

        <Section title="Your account">
          <p>You must provide accurate information and are responsible for keeping your login credentials secure. You must meet the minimum age required in your country to create an account.</p>
          <p>You can delete your account at any time from Profile → Delete account. This permanently removes your data as described in our Privacy Policy.</p>
        </Section>

        <Section title="Subscriptions and billing">
          <p>
            Paid plans renew automatically at the end of each billing period (monthly, quarterly, or annual)
            until cancelled. Depending on how you subscribed, billing is handled by Stripe, the Apple App
            Store, or Google Play — each with its own payment and refund process.
          </p>
          <p>You can cancel anytime from your Profile (or through the App Store/Play Store subscription settings if you subscribed there). Cancelling stops future renewals; you keep access until the end of the period you already paid for. We don't provide partial refunds for unused time, except where required by law or by the store you subscribed through.</p>
          <p>Free trials and promotional discounts, when offered, are limited to one per account and convert to a paid subscription unless cancelled before the trial ends, as described at the time of the offer.</p>
        </Section>

        <Section title="Acceptable use">
          <p>Don't use Focused to break the law, infringe someone else's rights, interfere with the app's operation, or attempt to access accounts or data that aren't yours.</p>
        </Section>

        <Section title="Content you create">
          <p>You own the content you enter into Focused. You grant us the limited right to store and process it solely to provide the service to you (including sending it to Focusy for AI-generated suggestions, as described in our Privacy Policy).</p>
        </Section>

        <Section title="Disclaimer and limitation of liability">
          <p>
            Focused is provided "as is". We work hard to keep it accurate and available, but we don't
            guarantee it will be error-free or uninterrupted. To the extent permitted by law, we are not liable
            for indirect or consequential damages arising from your use of the app, including decisions made
            based on Focusy's suggestions or any tracked data.
          </p>
        </Section>

        <Section title="Changes">
          <p>We may update these Terms as the app evolves. We'll update the date above and, for material changes, notify you in the app.</p>
        </Section>

        <Section title="Contact">
          <p>Questions about these Terms? Email us at <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a> or use our <Link to="/contact" className="underline">Contact page</Link>.</p>
        </Section>
      </div>
    </div>
  );
}
