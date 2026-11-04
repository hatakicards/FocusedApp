import { useEffect, useState } from 'react';
import { isRevenueCatAvailable, getStorePrices, getFreeTrials, PRODUCT_IDS } from '@/lib/revenueCat';

// Prezzi di ripiego (checkout web con Stripe, o se lo store non risponde). Sull'app iOS i prezzi
// mostrati sono sempre quelli veri letti dallo store (vedi useStorePrices), cosi' non possono
// piu' andare fuori sincrono con App Store Connect.
export const PRICING = {
  premium: {
    monthly: { regular: '6,99' },
    quarterly: { regular: '19,99' },
    annual: { price: '59,99', monthlyEquiv: '5,00', save: '24' },
  },
  pro: {
    monthly: { regular: '4,99' },
    quarterly: { regular: '12,99' },
    annual: { price: '39,99', monthlyEquiv: '3,33', save: '20' },
  },
};

// { [productId]: "3,99 €" } letti da Apple tramite RevenueCat; vuoto sul web o se non disponibili.
export function useStorePrices() {
  const [prices, setPrices] = useState({});
  useEffect(() => {
    if (!isRevenueCatAvailable()) return undefined;
    let alive = true;
    getStorePrices().then((p) => { if (alive) setPrices(p); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return prices;
}

// Prezzo vero dello store per un piano, oppure null se non disponibile.
export const storePriceFor = (prices, tier, period) => prices?.[PRODUCT_IDS[tier]?.[period]] || null;

// Prova gratuita (solo se l'utente la sceglie, poi rinnovo automatico). Sul web: Premium, 7 giorni, con
// Stripe (il server controlla che non sia gia' stata usata). Sull'app: quella configurata in App Store
// Connect per quel prodotto, se l'Apple ID ne ha ancora diritto.
export const WEB_TRIAL_DAYS = 7;

export function useFreeTrials() {
  const [trials, setTrials] = useState(null);
  useEffect(() => {
    if (!isRevenueCatAvailable()) return undefined;
    let alive = true;
    getFreeTrials().then((t) => { if (alive) setTrials(t); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return trials;
}

// Giorni di prova per piano e periodo, oppure null se non c'e'.
export function trialDaysFor(trials, tier, period) {
  if (isRevenueCatAvailable()) return trials?.[PRODUCT_IDS[tier]?.[period]] || null;
  return tier === 'premium' ? WEB_TRIAL_DAYS : null;
}

// Prezzo leggibile dopo la prova ("6,99 €", o quello vero dello store).
export function priceLabelFor(prices, tier, period) {
  const real = storePriceFor(prices, tier, period);
  if (real) return real;
  const p = PRICING[tier][period];
  return `${period === 'annual' ? p.price : p.regular} €`;
}
