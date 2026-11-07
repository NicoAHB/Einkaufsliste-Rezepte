// Gratis und Pro (2.190): Funktionsschalter, Status nur aus dem geprüften Kauf, Zwischenspeicher nur ohne Netz, Einstellungszeilen, QR-Hinweis im PDF.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { APP_LINK, CACHE_KEY, FEATURES, OFFLINE_GRACE_MS, PRODUCTS, RECHECK_MS, adsVisible, cachedStatus, createEntitlements, normaliseStatus, pdfPromo, revenueCatProvider, settingsRows } from '../monetization.js';

const ON = { ads: true, subscription: true };
const memory = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), map }; };
const day = 24 * 60 * 60 * 1000, start = Date.parse('2026-11-07T10:00:00Z');
// Ein Kaufanbieter wie RevenueCat: liefert das geprüfte Ergebnis oder wirft (ohne Netz)
const store = (result = { pro: false }) => {
  const provider = { name: 'revenuecat', result, offline: false, calls: [],
    async status() { provider.calls.push('status'); if (provider.offline) throw new Error('offline'); return provider.result; },
    async restore() { provider.calls.push('restore'); if (provider.offline) throw new Error('offline'); return provider.result; },
    async purchase(id) { provider.calls.push(`purchase:${id}`); provider.result = { pro: true, expiresAt: new Date(start + 30 * day).toISOString(), productId: id }; return provider.result; },
    async products() { return [{ id: PRODUCTS.monthly, price: '2,99 €' }, { id: PRODUCTS.yearly, price: '24,99 €' }]; } };
  return provider;
};

test('Vorerst sind Werbung und Abo aus: alle sind Gratis, niemand sieht Werbung, die Einstellungszeilen sind ausgeblendet', async () => {
  assert.deepEqual({ ...FEATURES }, { ads: false, subscription: false });
  assert.ok(Object.isFrozen(FEATURES), 'nicht zur Laufzeit umstellbar');
  // Selbst ein Anbieter, der Pro meldet, ändert bei ausgeschaltetem Abo nichts
  const provider = store({ pro: true }), entitlements = createEntitlements({ provider, storage: memory() });
  assert.equal((await entitlements.refresh()).status, 'free'); assert.deepEqual(provider.calls, [], 'kein Store-Aufruf');
  assert.equal(adsVisible('free'), false); assert.equal(adsVisible('pro'), false);
  assert.deepEqual(settingsRows('free'), { section: false, removeAds: false, adsOff: false, recommend: false, restore: false });
  await assert.rejects(entitlements.restore(), /nicht wiederherstellen/);
});

test('Der Status kommt nur vom Kaufanbieter: Pro nur mit gültiger, nicht abgelaufener Berechtigung', async () => {
  const provider = store({ pro: true, expiresAt: new Date(start + 10 * day).toISOString(), productId: PRODUCTS.yearly });
  let now = start;
  const changes = [], entitlements = createEntitlements({ features: ON, provider, storage: memory(), now: () => now, onChange: state => changes.push(state.status) });
  assert.equal(entitlements.get().status, 'free', 'vor der ersten Prüfung Gratis');
  const state = await entitlements.refresh();
  assert.deepEqual([state.status, state.source, state.productId], ['pro', 'store', PRODUCTS.yearly]); assert.deepEqual(changes, ['pro']);
  // Abgelaufen: Gratis, auch wenn der Anbieter versehentlich noch pro: true meldet
  provider.result = { pro: true, expiresAt: new Date(start - day).toISOString() };
  assert.equal((await entitlements.refresh()).status, 'free');
  assert.deepEqual(normaliseStatus({ pro: 'ja' }), { pro: false, expiresAt: null, productId: '' }, 'nur ein echtes true zählt');
  assert.deepEqual(normaliseStatus({ pro: true, expiresAt: null }), { pro: true, expiresAt: null, productId: '' }, 'ohne Ablauf (lebenslang) gültig');
  // Fällige Prüfung: nach RECHECK_MS
  now = start + RECHECK_MS - 1; assert.equal(entitlements.due(), false); now = start + RECHECK_MS; assert.equal(entitlements.due(), true);
});

test('Ohne Netz gilt nur das zuletzt geprüfte Ergebnis desselben Anbieters, begrenzt lange; sonst Gratis', async () => {
  let now = start;
  const storage = memory(), provider = store({ pro: true, expiresAt: new Date(start + 30 * day).toISOString() });
  const entitlements = createEntitlements({ features: ON, provider, storage, now: () => now });
  await entitlements.refresh();
  assert.equal(JSON.parse(storage.map.get(CACHE_KEY)).provider, 'revenuecat');
  provider.offline = true; now = start + 2 * day;
  assert.deepEqual([(await entitlements.refresh()).status, entitlements.get().source], ['pro', 'cache']);
  now = start + OFFLINE_GRACE_MS + 1;
  assert.equal((await entitlements.refresh()).status, 'free', 'zu lange ohne Prüfung: Gratis');
  // Wieder online: der Store entscheidet und überschreibt den Zwischenspeicher
  provider.offline = false; provider.result = { pro: false };
  assert.deepEqual([(await entitlements.refresh()).status, entitlements.get().source], ['free', 'store']);
  provider.offline = true; assert.equal((await entitlements.refresh()).status, 'free');
});

test('Ein selbst eingetragener Zwischenspeicher macht nicht Pro: falscher Anbieter, ohne Prüfzeit, aus der Zukunft, ohne Anbieter oder bei erreichbarem Store', async () => {
  const fake = entry => { const storage = memory(); storage.setItem(CACHE_KEY, JSON.stringify({ v: 1, pro: true, expiresAt: null, ...entry })); return storage; };
  const recent = new Date(start - 60_000).toISOString();
  assert.equal(cachedStatus(fake({ provider: 'andere', verifiedAt: recent }), 'revenuecat', start), null);
  assert.equal(cachedStatus(fake({ provider: 'revenuecat' }), 'revenuecat', start), null);
  assert.equal(cachedStatus(fake({ provider: 'revenuecat', verifiedAt: new Date(start + day).toISOString() }), 'revenuecat', start), null);
  assert.equal(cachedStatus({ getItem: () => '{kaputt' }, 'revenuecat', start), null);
  // Im Browser (kein Kaufanbieter) zählt der Zwischenspeicher gar nicht
  const browser = createEntitlements({ features: ON, provider: null, storage: fake({ provider: 'revenuecat', verifiedAt: recent }), now: () => start });
  assert.equal((await browser.refresh()).status, 'free');
  // Ist der Store erreichbar, gilt nur seine Antwort
  const provider = store({ pro: false }), online = createEntitlements({ features: ON, provider, storage: fake({ provider: 'revenuecat', verifiedAt: recent }), now: () => start });
  assert.equal((await online.refresh()).status, 'free');
});

test('Status nie aus Einstellungen oder GitHub-Daten: das Modul kennt weder `config` noch die Daten, die App gibt ihm nur den Kaufanbieter', async () => {
  const source = await readFile(new URL('../monetization.js', import.meta.url), 'utf8'), app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.ok(!/^import /m.test(source), 'monetization.js importiert nichts (keine Daten, kein GitHub)');
  const call = /createEntitlements\(\{([^;]*)\}\);/.exec(app)?.[1] || '';
  assert.match(call, /provider: FEATURES\.subscription \? revenueCatProvider\(\) : null/);
  assert.ok(!/config|state\./.test(call.replace(/onChange: \(\) => renderMonetization\(\)/, '')), 'keine Einstellung und keine Daten als Quelle');
  assert.ok(!/pro(Status)?\s*:/i.test(app.match(/function saveConfig[\s\S]{0,200}/)[0]), 'saveConfig speichert keinen Status');
});

test('Kaufen und „Käufe wiederherstellen“ gehen über den Anbieter; Preise kommen aus dem Store', async () => {
  const provider = store({ pro: false }), entitlements = createEntitlements({ features: ON, provider, storage: memory(), now: () => start });
  assert.deepEqual((await entitlements.products()).map(product => product.price), ['2,99 €', '24,99 €']);
  assert.equal((await entitlements.purchase('monthly')).status, 'pro');
  assert.deepEqual(provider.calls, [`purchase:${PRODUCTS.monthly}`]);
  await assert.rejects(entitlements.purchase('lebenslang'), /Unbekanntes Abo/);
  provider.result = { pro: false };
  assert.equal((await entitlements.restore()).status, 'free');
  assert.ok(provider.calls.includes('restore'));
});

test('Einstellungen: Gratis „Werbung entfernen“ (kein Schalter), Pro „Werbung: aus (Pro)“ und QR-Schalter, mit Abo immer „Käufe wiederherstellen“', () => {
  assert.equal(adsVisible('free', ON), true); assert.equal(adsVisible('pro', ON), false);
  assert.deepEqual(settingsRows('free', ON), { section: true, removeAds: true, adsOff: false, recommend: false, restore: true });
  assert.deepEqual(settingsRows('pro', ON), { section: true, removeAds: false, adsOff: true, recommend: true, restore: true });
  // Nur Werbung (noch kein Abo): Werbung ohne „Werbung entfernen“, weil es nichts zu kaufen gibt
  assert.deepEqual(settingsRows('free', { ads: true, subscription: false }), { section: true, removeAds: false, adsOff: false, recommend: false, restore: false });
});

test('QR-Hinweis im PDF: Gratis immer, Pro nur mit „SattPlan weiterempfehlen“, ohne eingetragene Adresse nie', () => {
  const link = 'https://sattplan.example/app';
  assert.equal(pdfPromo({ status: 'free', link }), link);
  assert.equal(pdfPromo({ status: 'free', recommend: false, link }), link, 'Gratis: der Schalter zählt nicht');
  assert.equal(pdfPromo({ status: 'pro', link }), '', 'Pro: Standard aus');
  assert.equal(pdfPromo({ status: 'pro', recommend: true, link }), link);
  assert.equal(pdfPromo({ status: 'free', link: '' }), '');
  assert.equal(pdfPromo({ status: 'free' }), APP_LINK, 'die eine Adresse aus monetization.js');
});

test('RevenueCat: nur in der nativen Hülle mit Plugin und Schlüssel; liest die aktive Berechtigung „pro“', async () => {
  const keys = { ios: 'appl_test', android: 'goog_test' };
  assert.equal(revenueCatProvider({}, keys), null, 'im Browser kein Anbieter');
  assert.equal(revenueCatProvider({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: {} } }, keys), null, 'ohne Plugin');
  const calls = [], plugin = {
    configure: async options => calls.push(['configure', options.apiKey]),
    getCustomerInfo: async () => ({ customerInfo: { entitlements: { active: { pro: { isActive: true, expirationDate: '2026-12-07T10:00:00Z', productIdentifier: PRODUCTS.monthly } } } } }),
    restorePurchases: async () => ({ customerInfo: { entitlements: { active: {} } } }),
    getOfferings: async () => ({ current: { availablePackages: [{ identifier: '$rc_monthly', product: { identifier: PRODUCTS.monthly, priceString: '2,99 €' } }] } }),
    purchasePackage: async ({ aPackage }) => { calls.push(['purchase', aPackage.identifier]); return { customerInfo: { entitlements: { active: { pro: { isActive: true, expirationDate: null } } } } }; },
  };
  const shell = platform => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => platform, Plugins: { Purchases: plugin } } });
  assert.equal(revenueCatProvider(shell('ios'), { ios: '', android: '' }), null, 'ohne Schlüssel');
  const provider = revenueCatProvider(shell('android'), keys);
  assert.deepEqual(await provider.status(), { pro: true, expiresAt: '2026-12-07T10:00:00Z', productId: PRODUCTS.monthly });
  assert.deepEqual(await provider.restore(), { pro: false });
  assert.deepEqual(await provider.products(), [{ id: PRODUCTS.monthly, price: '2,99 €' }]);
  assert.equal((await provider.purchase(PRODUCTS.monthly)).pro, true);
  await assert.rejects(provider.purchase(PRODUCTS.yearly), /nicht verfügbar/);
  assert.deepEqual(calls.filter(([kind]) => kind === 'configure'), [['configure', 'goog_test']], 'einmal eingerichtet, mit dem Android-Schlüssel');
});
