import { useEffect, useState } from 'react';
import { isRevenueCatAvailable, getStorePrices, PRODUCT_IDS } from '@/lib/revenueCat';

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
