import Stripe from 'stripe';

// Lazy per-richiesta (non un singleton di modulo): su Cloudflare le env var
// arrivano solo tramite context.env dentro l'handler, non come process.env
// a livello di modulo.
export function getStripe(env) {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY non configurata su Cloudflare Pages');
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}
