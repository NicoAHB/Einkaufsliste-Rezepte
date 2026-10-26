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

export function rememberedPrice(history, storeId, name, unit) {
  return latestPrices(history, name, unit).find(row => row.storeId === storeId)?.quote || null;
}

export function itemQuote(item, history = []) {
  // Fehlendes Feld bedeutet Altbestand; ausdrücklich null bedeutet Preis entfernt.
  return item.price === undefined ? rememberedPrice(history, item.storeId, item.name, item.unit) : item.price;
}

export function itemCost(item, history = []) {
  const rate = unitRate(itemQuote(item, history), item.unit);
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

export function comparePrices(item, stores, history = []) {
  const unit = unitSpec(item.unit);
  if (!unit.comparable) return [];
  return latestPrices(history, item.name, item.unit).flatMap(row => {
    const store = stores.find(store => store.id === row.storeId && !store.deletedAt);
    return store ? [{ ...row, storeName: store.name, rate: unitRate(row.quote, unit.label), unit: unit.label }] : [];
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
  if (store.offersUrl !== undefined) return offerUrl(store.offersUrl);
  const defaults = {
    edeka: 'https://www.edeka.de/angebote/',
    lidl: 'https://www.lidl.de/c/online-prospekte/s10005610',
    rewe: 'https://www.rewe.de/angebote/nationale-angebote/'
  };
  return defaults[productKey(store.name)] || '';
}
