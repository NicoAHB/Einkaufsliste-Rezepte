/* Reine Preislogik: Euro werden als ganze Cent gespeichert. Es werden keine
   Händlerdaten abgerufen; alle Preise stammen aus euren eigenen Eingaben. */
export const productKey = name => String(name).normalize('NFC').trim().toLocaleLowerCase('de').replace(/\s+/g, ' ');

export function unitSpec(unit) {
  const key = productKey(unit);
  if (['g', 'gramm'].includes(key)) return { group: 'weight', factor: 1, comparable: true, label: 'kg' };
  if (['kg', 'kilogramm'].includes(key)) return { group: 'weight', factor: 1000, comparable: true, label: 'kg' };
  if (['ml', 'milliliter'].includes(key)) return { group: 'volume', factor: 1, comparable: true, label: 'l' };
  if (['l', 'liter'].includes(key)) return { group: 'volume', factor: 1000, comparable: true, label: 'l' };
  if (['stück', 'stk', 'stk.', 'st.'].includes(key)) return { group: 'count', factor: 1, comparable: true, label: 'Stück' };
  // Packungsgrößen, Dichte und Esslöffelgrößen werden niemals geraten.
  return { group: `unit:${key}`, factor: 1, comparable: false, label: String(unit).trim() };
}

export function validQuote(quote) {
  return Boolean(quote && Number.isSafeInteger(quote.cents) && quote.cents >= 0 &&
    Number.isFinite(quote.quantity) && quote.quantity > 0 &&
    typeof quote.unit === 'string' && quote.unit.trim());
}

export function parseCents(value) {
  const text = String(value).trim();
  if (!/^\d{1,7}(?:[,.]\d{1,2})?$/.test(text)) throw new Error('Bitte einen Preis in Euro mit höchstens zwei Nachkommastellen eingeben, zum Beispiel 1,99.');
  const [euros, cents = ''] = text.replace(',', '.').split('.');
  return Number(euros) * 100 + Number(cents.padEnd(2, '0'));
}

// Preis in Cent je einer Zieleinheit, z. B. 199 Cent / 500 g = 398 Cent / kg.
export function unitRate(quote, targetUnit) {
  if (!validQuote(quote)) return null;
  const source = unitSpec(quote.unit), target = unitSpec(targetUnit);
  if (source.group !== target.group) return null;
  const rate = quote.cents * target.factor / (quote.quantity * source.factor);
  return Number.isFinite(rate) ? rate : null;
}

export function latestPrices(history = [], name, unit) {
  const byStore = new Map(), key = productKey(name);
  for (const row of history) {
    if (row.deletedAt || productKey(row.name) !== key || unitRate(row.quote, unit) === null) continue;
    const previous = byStore.get(row.storeId);
    if (!previous || `${row.createdAt}|${row.id}` > `${previous.createdAt}|${previous.id}`) byStore.set(row.storeId, row);
  }
  return [...byStore.values()];
}

export function rememberedPrice(history = [], storeId, name, unit) {
  // Ein früherer Aktionspreis wird nicht zum neuen Normalpreis. Ältere
  // Datensätze ohne getrennten Normalpreis behalten ihre bisherige Bedeutung.
  const rows = history.filter(row => !row.deletedAt && row.storeId === storeId && productKey(row.name) === productKey(name))
    .sort((a, b) => `${b.createdAt}|${b.id}`.localeCompare(`${a.createdAt}|${a.id}`));
  for (const row of rows) {
    const quote = row.regularQuote === undefined ? row.quote : row.regularQuote;
    if (unitRate(quote, unit) !== null) return quote;
  }
  return null;
}

/* Preisentwicklung (Version 1.8). Eine Preisänderung gilt nur als sicher, wenn beide Preise Normalpreise sind (ein Aktionspreis ist keine
   Änderung), im selben Geschäft für dasselbe Produkt notiert wurden, in dieselbe Einheitengruppe fallen und sich deutlich unterscheiden.
   Die Entwicklung wird beim Notieren eines Preises berechnet und als Feld `trend` ({ was, at }) an der Preisnotiz gespeichert; so bleibt sie
   auch nach weiteren Einkäufen zum selben Preis eine Zeit lang sichtbar, ohne dass alte Notizen aufgehoben werden müssen. */
export const TREND = { minPercent: 3, minCents: 2, days: 60 };
const DAY_MS = 86400000;
export const regularOf = row => validQuote(row.regularQuote) ? row.regularQuote : (row.onSale ? null : row.quote);
const newestFirst = (a, b) => `${b.createdAt}|${b.id}`.localeCompare(`${a.createdAt}|${a.id}`);

// Unterschied des neuen zum alten Preis, auf die Menge des neuen Preises umgerechnet: { diff (Cent), percent } oder null.
export function priceChange(was, now) {
  const rate = unitRate(was, now.unit);
  if (rate === null || !(rate > 0)) return null;
  const before = rate * now.quantity, diff = now.cents - before;
  return { before: Math.round(before), diff: Math.round(diff), percent: diff / before * 100 };
}
export function definiteChange(was, now) {
  const change = priceChange(was, now);
  return change && Math.abs(change.diff) >= TREND.minCents && Math.abs(change.percent) >= TREND.minPercent ? change : null;
}

// Entwicklung für eine neue Preisnotiz `fresh` ({ storeId, name, quote, regularQuote, onSale }), die zum Zeitpunkt `at` entsteht.
// Gibt { was, at } zurück, wenn der Normalpreis sich deutlich geändert hat, setzt eine noch junge Entwicklung fort oder gibt null zurück.
export function trendFor(history, fresh, at = new Date().toISOString()) {
  const now = regularOf(fresh);
  const rows = history.filter(row => !row.deletedAt && row.storeId === fresh.storeId && productKey(row.name) === productKey(fresh.name) && row.createdAt < at).sort(newestFirst);
  const young = trend => trend && validQuote(trend.was) && Date.parse(at) - Date.parse(trend.at) <= TREND.days * DAY_MS ? { was: trend.was, at: trend.at } : null;
  if (!now) return young(rows[0]?.trend);
  const previous = rows.find(row => { const quote = regularOf(row); return quote && unitRate(quote, now.unit) !== null; });
  if (!previous) return null;
  return definiteChange(regularOf(previous), now) ? { was: regularOf(previous), at } : young(previous.trend);
}

// Aktive Entwicklung für einen Artikel: { direction: 'up' | 'down', before, now, percent, since } oder null.
export function activeTrend(item, history = [], now = new Date()) {
  if (!item.storeId) return null;
  const row = history.filter(entry => !entry.deletedAt && entry.storeId === item.storeId && productKey(entry.name) === productKey(item.name) &&
    regularOf(entry) && unitRate(regularOf(entry), item.unit) !== null).sort(newestFirst)[0];
  if (!row?.trend || !validQuote(row.trend.was) || now.getTime() - Date.parse(row.trend.at) > TREND.days * DAY_MS) return null;
  const current = regularOf(row), change = definiteChange(row.trend.was, current);
  return change ? { direction: change.diff > 0 ? 'up' : 'down', before: change.before, now: current, percent: change.percent, since: row.trend.at } : null;
}

export function itemQuote(item, history = []) {
  // Fehlendes Feld bedeutet Altbestand; ausdrücklich null bedeutet Preis entfernt.
  return item.price === undefined ? rememberedPrice(history, item.storeId, item.name, item.unit) : item.price;
}

/* Gültigkeit von Angeboten (Version 1.8): `saleUntil` ist ein optionaler letzter Gültigkeitstag (JJJJ-MM-TT). Ein abgelaufenes Angebot
   zählt nicht mehr als aktueller Angebotspreis; Summe und Vergleich rechnen mit dem normalen Preis. Ohne Datum gilt ein Angebot, bis es
   ausgeschaltet wird (wie bisher). */
export const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const saleExpired = (row, today = localDay()) => Boolean(row.onSale && typeof row.saleUntil === 'string' && row.saleUntil && row.saleUntil < today);
export function effectiveQuote(item, history = [], today = localDay()) {
  return item.onSale && validQuote(item.salePrice) && !saleExpired(item, today) ? item.salePrice : itemQuote(item, history);
}

export function itemCost(item, history = [], today = localDay()) {
  const rate = unitRate(effectiveQuote(item, history, today), item.unit);
  if (rate === null) return null;
  const cents = Math.round(item.quantity * rate);
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

export function shoppingTotal(items, history = []) {
  const open = items.filter(row => !row.deletedAt && !row.checked);
  let cents = 0, missing = 0;
  for (const item of open) {
    const cost = itemCost(item, history);
    if (cost === null) missing++;
    else cents += cost;
  }
  return { cents, missing, count: open.length, priced: open.length - missing };
}

// Vergleich je Geschäft mit dem zuletzt notierten Preis. Eine notierte Aktion, die inzwischen abgelaufen ist, zählt mit ihrem Normalpreis
// (`expired: true`), sonst gar nicht. `at` ist der Tag der Notiz; `old` markiert Notizen, die älter als 60 Tage sind.
export function comparePrices(item, stores, history = [], today = localDay()) {
  const unit = unitSpec(item.unit);
  if (!unit.comparable) return [];
  return latestPrices(history, item.name, item.unit).flatMap(row => {
    const store = stores.find(store => store.id === row.storeId && !store.deletedAt);
    if (!store) return [];
    const expired = saleExpired(row, today), quote = expired ? (validQuote(row.regularQuote) ? row.regularQuote : null) : row.quote;
    if (!quote || unitRate(quote, unit.label) === null) return [];
    const age = Math.floor((Date.parse(`${today}T12:00:00`) - Date.parse(row.createdAt)) / 86400000);
    return [{ ...row, quote, storeName: store.name, rate: unitRate(quote, unit.label), unit: unit.label, expired, at: row.createdAt, old: age > TREND.days }];
  }).sort((a, b) => a.rate - b.rate || a.storeName.localeCompare(b.storeName, 'de'));
}

export function offerUrl(value) {
  if (!String(value || '').trim()) return '';
  let url;
  try { url = new URL(String(value).trim()); }
  catch { throw new Error('Bitte einen vollständigen Angebotslink eingeben, beginnend mit https://.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Angebotslinks müssen https:// verwenden und dürfen keine Zugangsdaten enthalten.');
  return url.href;
}

export function storeOfferUrl(store) {
  if (!store) return '';
  // Ein leeres Feld heißt „Standardlink der Kette“ (falls bekannt), sonst keiner. So bekommt auch ein früher ohne Link angelegtes Geschäft den Standard.
  if (store.offersUrl) return offerUrl(store.offersUrl);
  const defaults = {
    edeka: 'https://www.edeka.de/angebote/',
    lidl: 'https://www.lidl.de/c/online-prospekte/s10005610',
    rewe: 'https://www.rewe.de/angebote/nationale-angebote/',
    rossmann: 'https://www.rossmann.de/de/angebote',
    'roßmann': 'https://www.rossmann.de/de/angebote'
  };
  return defaults[productKey(store.name)] || '';
}
