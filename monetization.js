/* Gratis und Pro (2.190): Werbung und Abo, vorbereitet für die spätere App im App Store und bei Google Play.
   - Zwei Status: 'free' (Gratis) und 'pro' (Abo, monatlich oder jährlich).
   - Der Status kommt nur aus dem geprüften Kauf: Apple StoreKit bzw. Google Play Billing über RevenueCat (Capacitor-Plugin
     `@revenuecat/purchases-capacitor`, siehe revenueCatProvider). Nie aus einer Einstellung und nie aus den Daten in GitHub.
     Lokal wird das letzte geprüfte Ergebnis nur zwischengespeichert, damit die App ohne Netz weiß, ob Werbung erscheint; beim Start,
     beim Zurückkehren in die App und regelmäßig wird neu geprüft. Der Zwischenspeicher gilt nur, wenn der Anbieter gerade nicht
     erreichbar ist, nur vom selben Anbieter und nur begrenzt lange.
   - Zwei Funktionsschalter (FEATURES), beide vorerst aus. Solange sie aus sind, sieht niemand Werbung, alle sind Gratis und die
     Einstellungszeilen sind ausgeblendet. Zum Start: Schalter umlegen, Werbenetzwerk in adProvider einhängen, Produkte in RevenueCat
     anlegen und die Schlüssel in REVENUECAT_KEYS eintragen. Ausführlich: docs/APP-STORE.md. */

// Funktionsschalter. Bewusst hier im Code und nicht in den Einstellungen: Niemand kann sie in der App umstellen.
export const FEATURES = Object.freeze({ ads: false, subscription: false });

/* Die eine Adresse im QR-Hinweis des Rezeptblatts („In SattPlan öffnen“). Die Seite dahinter erkennt iPhone oder Android und leitet
   zum passenden Store weiter. [LINK EINTRAGEN] Solange sie leer ist, enthält kein PDF einen QR-Hinweis (kein Code mit falscher Adresse). */
export const APP_LINK = '';

// Abo-Produkte (Kennungen wie in App Store Connect, Google Play Console und RevenueCat) und die Berechtigung, die Pro freischaltet
export const PRODUCTS = Object.freeze({ monthly: 'sattplan_pro_monthly', yearly: 'sattplan_pro_yearly' });
export const ENTITLEMENT = 'pro';
// Öffentliche RevenueCat-Schlüssel je Plattform (keine Geheimnisse; stehen in jeder App). Leer: kein Kaufanbieter, alle sind Gratis.
export const REVENUECAT_KEYS = Object.freeze({ ios: '', android: '' });

export const CACHE_KEY = 'sattplan-entitlement-v1';
export const RECHECK_MS = 6 * 60 * 60 * 1000;            // regelmäßig neu prüfen, solange die App offen ist
export const RESUME_RECHECK_MS = 30 * 60 * 1000;         // beim Zurückkehren in die App, wenn die letzte Prüfung so lange her ist
export const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000; // so lange gilt ein gemerktes Pro ohne Netz höchstens

const ISO = value => { const time = Date.parse(value ?? ''); return Number.isFinite(time) ? new Date(time).toISOString() : null; };

/* Ergebnis eines Anbieters prüfen und vereinheitlichen: { pro, expiresAt, productId }. Abgelaufene Abos sind kein Pro.
   Ein Anbieter liefert { pro: true|false, expiresAt?: ISO-Datum|null (null = lebenslang), productId? }. */
export function normaliseStatus(result, now = Date.now()) {
  const expiresAt = ISO(result?.expiresAt);
  const pro = result?.pro === true && (expiresAt === null || Date.parse(expiresAt) > now);
  return { pro, expiresAt: pro ? expiresAt : null, productId: pro && typeof result?.productId === 'string' ? result.productId : '' };
}

// Gemerktes Ergebnis lesen, nur wenn es vom selben Anbieter stammt, nicht abgelaufen und nicht zu alt ist
export function cachedStatus(storage, providerName, now = Date.now()) {
  let entry = null;
  try { entry = JSON.parse(storage?.getItem(CACHE_KEY) ?? 'null'); } catch { return null; }
  if (!entry || entry.provider !== providerName || entry.v !== 1) return null;
  const verifiedAt = Date.parse(entry.verifiedAt ?? '');
  if (!Number.isFinite(verifiedAt) || verifiedAt > now + 60_000 || now - verifiedAt > OFFLINE_GRACE_MS) return null;
  return normaliseStatus(entry, now);
}
function writeCache(storage, providerName, status, now) {
  try { storage?.setItem(CACHE_KEY, JSON.stringify({ v: 1, provider: providerName, pro: status.pro, expiresAt: status.expiresAt, productId: status.productId, verifiedAt: new Date(now).toISOString() })); }
  catch { /* ohne Speicher: beim nächsten Start ohne Netz eben Gratis */ }
}

/* Den Status verwalten. `provider`: Kaufanbieter oder null (Browser, oder Abo aus). `storage`: localStorage o. Ä., nur als Zwischenspeicher.
   Ergebnis: { get(), refresh(reason), purchase(plan), restore(), products() }. `onChange(state)` meldet jede Änderung.
   state: { status: 'free'|'pro', source: 'none'|'store'|'cache', checkedAt, expiresAt, productId } */
export function createEntitlements({ features = FEATURES, provider = null, storage = null, now = () => Date.now(), onChange = () => {} } = {}) {
  let state = { status: 'free', source: 'none', checkedAt: 0, expiresAt: null, productId: '' };
  const active = () => Boolean(features.subscription && provider);
  const set = next => {
    const changed = ['status', 'source', 'expiresAt', 'productId'].some(key => state[key] !== next[key]);
    state = next; if (changed) onChange(state);
    return state;
  };
  const verified = result => {
    const time = now(), status = normaliseStatus(result, time);
    writeCache(storage, provider.name, status, time);
    return set({ status: status.pro ? 'pro' : 'free', source: 'store', checkedAt: time, expiresAt: status.expiresAt, productId: status.productId });
  };
  let running = null;
  async function refresh() {
    if (!active()) return set({ status: 'free', source: 'none', checkedAt: now(), expiresAt: null, productId: '' });
    if (running) return running;
    running = (async () => {
      try { return verified(await provider.status()); }
      catch {
        // Anbieter nicht erreichbar (ohne Netz): das zuletzt geprüfte Ergebnis, sonst Gratis
        const time = now(), cached = cachedStatus(storage, provider.name, time);
        return set({ status: cached?.pro ? 'pro' : 'free', source: cached ? 'cache' : 'none', checkedAt: state.checkedAt, expiresAt: cached?.expiresAt ?? null, productId: cached?.productId ?? '' });
      } finally { running = null; }
    })();
    return running;
  }
  return {
    get: () => state,
    refresh,
    // Ist eine neue Prüfung fällig? (beim Zurückkehren in die App; regelmäßig)
    due: (gap = RECHECK_MS) => active() && now() - state.checkedAt >= gap,
    async purchase(plan) {
      if (!active()) throw new Error('Das Abo ist noch nicht verfügbar.');
      const productId = PRODUCTS[plan];
      if (!productId) throw new Error('Unbekanntes Abo.');
      return verified(await provider.purchase(productId));
    },
    async restore() {
      if (!active()) throw new Error('Käufe lassen sich hier nicht wiederherstellen.');
      return verified(await provider.restore());
    },
    products: async () => active() && provider.products ? provider.products() : [],
  };
}

// Werbung sichtbar? Nur wenn Werbung aktiv ist und der Status nicht Pro.
export const adsVisible = (status, features = FEATURES) => Boolean(features.ads) && status !== 'pro';

/* Was die Einstellungen zeigen. Solange beide Schalter aus sind: nichts.
   - Gratis mit Werbung und Abo: „Werbung entfernen“ (führt zur Pro-Seite). Kein Schalter zum Ausschalten der Werbung.
   - Pro: „Werbung: aus (Pro)“ (wenn es Werbung gibt) und „SattPlan weiterempfehlen (QR-Hinweis im PDF)“.
   - Mit Abo immer „Käufe wiederherstellen“ (bei Apple Pflicht). */
export function settingsRows(status, features = FEATURES) {
  const pro = status === 'pro';
  return {
    section: Boolean(features.ads || features.subscription),
    removeAds: Boolean(features.ads && features.subscription && !pro),
    adsOff: Boolean(features.ads && pro),
    recommend: pro,
    restore: Boolean(features.subscription),
  };
}

/* QR-Hinweis im Rezeptblatt: Gratis immer (sofern eine Adresse eingetragen ist), Pro nur mit dem Schalter „SattPlan weiterempfehlen“.
   `recommend`: der Schalter (nur für Pro sichtbar, Standard aus). */
export const pdfPromo = ({ status, recommend = false, link = APP_LINK }) => (link && (status !== 'pro' || recommend === true) ? link : '');

/* RevenueCat in der nativen Hülle (Capacitor). Ohne Hülle, ohne Plugin oder ohne Schlüssel: null (kein Kaufanbieter, alle Gratis).
   RevenueCat prüft die Belege von Apple und Google auf seinem Server; die App liest nur die aktive Berechtigung ENTITLEMENT. */
export function revenueCatProvider(global = globalThis, keys = REVENUECAT_KEYS) {
  const shell = global.Capacitor, plugin = shell?.Plugins?.Purchases;
  if (!shell?.isNativePlatform?.() || !plugin) return null;
  const apiKey = keys[shell.getPlatform?.()] || '';
  if (!apiKey) return null;
  let ready = null;
  const configured = () => (ready ||= Promise.resolve(plugin.configure({ apiKey })).catch(error => { ready = null; throw error; }));
  const fromInfo = info => {
    const entitlement = info?.customerInfo?.entitlements?.active?.[ENTITLEMENT] ?? info?.entitlements?.active?.[ENTITLEMENT];
    return entitlement ? { pro: entitlement.isActive !== false, expiresAt: entitlement.expirationDate ?? null, productId: entitlement.productIdentifier || '' } : { pro: false };
  };
  const packages = async () => { await configured(); return (await plugin.getOfferings())?.current?.availablePackages || []; };
  return {
    name: 'revenuecat',
    status: async () => { await configured(); return fromInfo(await plugin.getCustomerInfo()); },
    restore: async () => { await configured(); return fromInfo(await plugin.restorePurchases()); },
    async purchase(productId) {
      const aPackage = (await packages()).find(entry => entry.product?.identifier === productId);
      if (!aPackage) throw new Error('Dieses Abo ist im Store gerade nicht verfügbar.');
      return fromInfo(await plugin.purchasePackage({ aPackage }));
    },
    products: async () => (await packages()).map(entry => ({ id: entry.product?.identifier || '', price: entry.product?.priceString || '' })).filter(entry => entry.id),
  };
}

/* Werbenetzwerk (später, z. B. Google AdMob über ein Capacitor-Plugin): ein Objekt mit show(platz) und hide(platz).
   Bis dahin gibt es keins; der Werbeplatz in der Seite bleibt leer und versteckt. */
export const adProvider = (global = globalThis) => {
  const ads = global.SattPlanAds;
  return ads && typeof ads.show === 'function' && typeof ads.hide === 'function' ? ads : null;
};
