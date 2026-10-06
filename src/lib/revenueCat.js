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

// Specchio di tierFromProductId in functions/api/revenuecat-webhook.js — gli
// entitlement RevenueCat sono condivisi tra pro/premium, il tier si deduce
// solo dal product id (serve ad es. per il restore in modalita' ospite).
export function tierFromProductId(productId) {
  if (!productId) return null;
  if (productId.startsWith('premium_')) return 'premium';
  if (productId.startsWith('pro_')) return 'pro';
  return null;
}

let configured = false; // Purchases.configure() e' gia' stato chiamato (anonimo o identificato)
let identifiedUserId = null; // user.id Supabase corrente, se presente
let configurePromise = null; // in-flight configure(), per evitare race su acquisti avviati subito dopo guestLogin()

function currentApiKey() {
  const apiKey = Capacitor.getPlatform() === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
  if (!apiKey) console.warn('RevenueCat: API key mancante per questa piattaforma');
  return apiKey;
}

export function isRevenueCatAvailable() {
  return Capacitor.isNativePlatform();
}

// Va chiamato una volta appena l'utente e' autenticato (stesso punto di
// syncWidgetSession in AuthContext.jsx) — appUserID = user.id di Supabase,
// cosi' il webhook RevenueCat sa a chi appartiene ogni evento senza bisogno
// di cercarlo per email. Se l'SDK era gia' configurato in modalita' anonima
// (utente ospite che ha comprato prima di registrarsi, vedi
// configureRevenueCatAnonymous), usa logIn per agganciare lo storico
// acquisti al nuovo id reale invece di perderlo.
export async function configureRevenueCat(userId) {
  if (!isRevenueCatAvailable() || !userId || identifiedUserId === userId) return;
  const apiKey = currentApiKey();
  if (!apiKey) return;
  configurePromise = (async () => {
    try {
      if (!configured) {
        await Purchases.configure({ apiKey, appUserID: userId });
        configured = true;
      } else {
        await Purchases.logIn({ appUserID: userId });
      }
      identifiedUserId = userId;
    } catch (e) {
      console.error('RevenueCat configure error', e);
    }
  })();
  await configurePromise;
}

// Per utenti in modalita' ospite (nessun account Supabase): configura l'SDK
// senza appUserID, cosi' RevenueCat ne genera e salva uno proprio, univoco
// per questo device/installazione — mai l'id condiviso 'guest-local' di
// guestDB.js, che altrimenti farebbe vedere lo stesso abbonamento a tutti
// gli ospiti. Necessario per permettere l'acquisto IAP senza registrazione
// (Apple Guideline 5.1.1(v)).
export async function configureRevenueCatAnonymous() {
  if (!isRevenueCatAvailable() || configured) return;
  const apiKey = currentApiKey();
  if (!apiKey) return;
  configurePromise = (async () => {
    try {
      await Purchases.configure({ apiKey });
      configured = true;
    } catch (e) {
      console.error('RevenueCat anonymous configure error', e);
    }
  })();
  await configurePromise;
}

// Difesa contro la race tra guestLogin() (configura l'SDK senza await) e un
// acquisto avviato subito dopo nello step 5 dell'onboarding, dove non c'e'
// nessun redirect che dia tempo al configure() di completarsi da solo.
async function ensureConfigured() {
  if (configurePromise) await configurePromise;
}

export async function logOutRevenueCat() {
  if (!isRevenueCatAvailable() || !configured) return;
  try {
    await Purchases.logOut();
    identifiedUserId = null;
  } catch (e) {
    console.error('RevenueCat logOut error', e);
  }
}

// tier: 'pro'|'premium', period: 'monthly'|'quarterly'|'annual' — stessa
// coppia gia' usata da PremiumModal.jsx per lo Stripe checkout web.
export async function purchaseSubscription(tier, period) {
  const productId = PRODUCT_IDS[tier]?.[period];
  if (!productId) throw new Error('Piano non disponibile');

  await ensureConfigured();
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
  await ensureConfigured();
  const { customerInfo } = await Purchases.restorePurchases();
  return customerInfo;
}
