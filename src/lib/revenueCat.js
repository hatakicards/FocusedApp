import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';

const IOS_API_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY;
const ANDROID_API_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY;

// Stessi Product ID creati in App Store Connect / Play Console e collegati
// agli Entitlement "pro"/"premium" in RevenueCat — vedi anche
// functions/api/revenuecat-webhook.js, che li mappa lato server.
export const PRODUCT_IDS = {
  pro: { monthly: 'pro_monthly', quarterly: 'pro_trimestral', annual: 'pro_yearly' },
  premium: { monthly: 'premium_monthly', quarterly: 'premium_trimestral', annual: 'premium_yearly' },
};

let initialized = false;

export function isRevenueCatAvailable() {
  return Capacitor.isNativePlatform();
}

// Va chiamato una volta appena l'utente e' autenticato (stesso punto di
// syncWidgetSession in AuthContext.jsx) — appUserID = user.id di Supabase,
// cosi' il webhook RevenueCat sa a chi appartiene ogni evento senza bisogno
// di cercarlo per email.
export async function configureRevenueCat(userId) {
  if (!isRevenueCatAvailable() || initialized || !userId) return;
  const apiKey = Capacitor.getPlatform() === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
  if (!apiKey) {
    console.warn('RevenueCat: API key mancante per questa piattaforma');
    return;
  }
  try {
    await Purchases.configure({ apiKey, appUserID: userId });
    initialized = true;
  } catch (e) {
    console.error('RevenueCat configure error', e);
  }
}

export async function logOutRevenueCat() {
  if (!isRevenueCatAvailable() || !initialized) return;
  try {
    await Purchases.logOut();
  } catch (e) {
    console.error('RevenueCat logOut error', e);
  }
}

// tier: 'pro'|'premium', period: 'monthly'|'quarterly'|'annual' — stessa
// coppia gia' usata da PremiumModal.jsx per lo Stripe checkout web.
export async function purchaseSubscription(tier, period) {
  const productId = PRODUCT_IDS[tier]?.[period];
  if (!productId) throw new Error('Piano non disponibile');

  const offerings = await Purchases.getOfferings();
  const allPackages = Object.values(offerings.all || {}).flatMap((o) => o.availablePackages);
  const pkg = allPackages.find((p) => p.product.identifier === productId);
  if (!pkg) {
    throw new Error(`Prodotto "${productId}" non trovato in RevenueCat — controlla che sia nell'offering corrente`);
  }

  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return customerInfo;
}

export async function restorePurchases() {
  const { customerInfo } = await Purchases.restorePurchases();
  return customerInfo;
}
