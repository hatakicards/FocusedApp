import Stripe from 'stripe';

let cached = null;

// Inizializzazione lazy: se STRIPE_SECRET_KEY manca o non e' valida, l'errore
// va sollevato dentro l'handler (dove c'e' un try/catch) e non al
// module-load, altrimenti l'intera funzione crasha con un 502 illeggibile
// invece di restituire un JSON di errore chiaro (visto in produzione: "Neither
// apiKey nor config.authenticator provided").
export function getStripe() {
  if (!cached) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY non configurata su Netlify');
    }
    cached = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return cached;
}
