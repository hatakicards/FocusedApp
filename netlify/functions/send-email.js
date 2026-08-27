import { jsonResponse } from './_shared/supabaseAdmin.js';

// Sostituisce base44.integrations.Core.SendEmail usando Resend
// (resend.com — API semplice, piano gratuito sufficiente per un form
// contatti). Puoi cambiare provider modificando solo questo file.
export default async (req) => {
  try {
    const { subject, body } = await req.json();
    if (!subject) return jsonResponse({ error: 'missing subject' }, 400);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return jsonResponse({ error: 'RESEND_API_KEY non configurata su Netlify' }, 500);

    const from = process.env.CONTACT_EMAIL_FROM || 'Focused <onboarding@resend.dev>';
    // Destinatario fisso lato server, non quello passato dal chiamante:
    // /contact e' una pagina pubblica (nessun login richiesto), quindi
    // questa funzione non deve poter essere usata come relay email verso
    // indirizzi arbitrari. Il form contatti manda sempre a questo indirizzo.
    const to = process.env.CONTACT_EMAIL_TO || 'focusedappp@gmail.com';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: body || '',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('send-email: Resend error', res.status, errText);
      return jsonResponse({ error: 'Invio email non riuscito' }, 502);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('send-email error', error);
    return jsonResponse({ error: error.message }, 500);
  }
};
