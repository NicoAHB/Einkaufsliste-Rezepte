/* Reine Preislogik: Euro werden als ganze Cent gespeichert. Es werden keine
   Händlerdaten abgerufen; alle Preise stammen aus euren eigenen Eingaben. Der Verlauf bezahlter Preise steht in history.js. */
import { chainForStore } from './brand.js';
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

/* Der Preis eines Artikels ist nur der, den die Person selbst am Artikel eingetragen hat (Version 2.40). Ein früher notierter oder bezahlter Preis
   (Sammlung `prices`, siehe history.js) wird nie von selbst übernommen und fließt nicht in die geschätzte Summe ein. Ein fehlendes Feld (Altbestand)
   und ausdrücklich null bedeuten beide „kein Preis“. */
export const itemQuote = item => validQuote(item.price) ? item.price : null;

/* Gültigkeit von Angeboten (Version 1.8): `saleUntil` ist ein optionaler letzter Gültigkeitstag (JJJJ-MM-TT). Ein abgelaufenes Angebot
   zählt nicht mehr als aktueller Angebotspreis; die Summe rechnet mit dem normalen Preis. Ohne Datum gilt ein Angebot, bis es
   ausgeschaltet wird (wie bisher). */
export const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const saleExpired = (row, today = localDay()) => Boolean(row.onSale && typeof row.saleUntil === 'string' && row.saleUntil && row.saleUntil < today);
export function effectiveQuote(item, today = localDay()) {
  return item.onSale && validQuote(item.salePrice) && !saleExpired(item, today) ? item.salePrice : itemQuote(item);
}

export function itemCost(item, today = localDay()) {
  const rate = unitRate(effectiveQuote(item, today), item.unit);
  if (rate === null) return null;
  const cents = Math.round(item.quantity * rate);
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

export function shoppingTotal(items) {
  const open = items.filter(row => !row.deletedAt && !row.checked);
  let cents = 0, missing = 0;
  for (const item of open) {
    const cost = itemCost(item);
    if (cost === null) missing++;
    else cents += cost;
  }
  return { cents, missing, count: open.length, priced: open.length - missing };
}

export function offerUrl(value) {
  if (!String(value || '').trim()) return '';
  let url;
  try { url = new URL(String(value).trim()); }
  catch { throw new Error('Bitte einen vollständigen Angebotslink eingeben, beginnend mit https://.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Angebotslinks müssen https:// verwenden und dürfen keine Zugangsdaten enthalten.');
  return url.href;
}

// Standardlink einer bekannten Kette oder ''.
export const defaultOfferUrl = store => chainForStore(store)?.offers || '';
export function storeOfferUrl(store) {
  if (!store) return '';
  // Ein leeres Feld heißt „Standardlink der Kette“ (falls bekannt), sonst keiner. So bekommt auch ein früher ohne Link angelegtes Geschäft den Standard.
  if (store.offersUrl) return offerUrl(store.offersUrl);
  return defaultOfferUrl(store);
}
