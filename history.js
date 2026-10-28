/* Verlauf tatsächlich bezahlter Preise (Version 2.40). Reine Logik ohne DOM.
   Quelle sind ausschließlich Kassenbonpositionen, die die Person geprüft hat (`src: 'bon'`). Eine Notiz ohne dieses Feld stammt aus früheren
   Versionen: Ihre Herkunft und Zuordnung sind nicht bestätigt, sie erscheint nie als bezahlter Preis, sondern nur in der Prüfliste (Einstellungen).
   Ein Artikel der Liste (z. B. „Äpfel“) ist eine Produktgruppe; was gekauft wurde, ist eine Sorte oder genaue Bezeichnung dieser Gruppe
   (`variant`: Gala, Pink Lady). Zugeordnet wird nur über den gleichen Namen; „Apfeltasche“ oder „Apfelsaft“ sind eigene Produkte und kommen nie bei „Äpfel“ vor. */
import { productKey, unitSpec, validQuote } from './prices.js';

// Steht auf dem Bon weder Menge noch Gewicht noch Packungsgröße, ist die Menge unbekannt: Der Preis gilt dann für die Position als Ganzes.
export const UNKNOWN_UNIT = 'Position';
export const isUnknownUnit = unit => productKey(unit) === productKey(UNKNOWN_UNIT);

const clean = text => String(text ?? '').replace(/\s+/g, ' ').trim();
export const variantOf = row => clean(row.variant);
// Vom Nutzer geprüfter, tatsächlich bezahlter Preis.
export const isPaid = row => Boolean(row && !row.deletedAt && row.src === 'bon' && validQuote(row.quote));
// Notiz aus früheren Versionen, die erst geprüft werden muss.
export const needsReview = row => Boolean(row && !row.deletedAt && row.src === undefined && validQuote(row.quote));

const newestFirst = (a, b) => `${b.createdAt}|${b.id}`.localeCompare(`${a.createdAt}|${a.id}`);
const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const amount = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 });
const fullDate = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const euroText = cents => eur.format(cents / 100);
export const dateText = at => fullDate.format(new Date(at));

/* „0,59 € pro Stück“, „3,98 € pro kg“, „1,29 € für 500 g“. Ein Preis je kg bleibt ein Preis je kg (nie ein Stückpreis); eine unbekannte Menge wird als solche gezeigt. */
export function priceText(quote) {
  const money = euroText(quote.cents);
  if (isUnknownUnit(quote.unit)) return `${money} laut Bon (Menge unbekannt)`;
  return quote.quantity === 1 ? `${money} pro ${quote.unit}` : `${money} für ${amount.format(quote.quantity)} ${quote.unit}`;
}

// Was als „dieselbe Packung“ gilt: gleiche Einheitengruppe und gleiche Menge (500 g und 1 kg Beutel sind verschiedene Angebote, ebenso 1 und 6 Stück).
const packOf = quote => {
  const spec = unitSpec(quote.unit);
  return `${spec.group}:${Math.round(quote.quantity * spec.factor * 1000) / 1000}`;
};
// Ein Eintrag im Verlauf: dasselbe Geschäft, dieselbe Sorte, dieselbe Packung.
export const entryKey = row => `${row.storeId}|${productKey(variantOf(row))}|${packOf(row.quote)}`;
export const titleOf = row => variantOf(row) || `${clean(row.name)} – Sorte unbekannt`;

/* Der Verlauf für einen Listenartikel: je Geschäft, Sorte und Packung der neueste bestätigte Kauf (`latest`), die früheren darunter (`older`).
   Einträge des gerade gewählten Geschäfts (`here`) stehen zuerst, danach die übrigen, jeweils der neueste zuerst. Nichts wird umgerechnet oder verglichen. */
export function paidEntries(prices, name, stores, currentStoreId = '') {
  const key = productKey(name), groups = new Map();
  for (const row of prices || []) {
    if (!isPaid(row) || productKey(row.name) !== key) continue;
    if (!stores.some(store => store.id === row.storeId && !store.deletedAt)) continue;
    const id = entryKey(row);
    groups.set(id, [...(groups.get(id) || []), row]);
  }
  return [...groups.values()].map(rows => {
    rows.sort(newestFirst);
    const [latest, ...older] = rows;
    return { latest, older, title: titleOf(latest), storeName: stores.find(store => store.id === latest.storeId).name, here: latest.storeId === currentStoreId };
  }).sort((a, b) => Number(b.here) - Number(a.here) || newestFirst(a.latest, b.latest) || a.title.localeCompare(b.title, 'de'));
}

// Die Prüfliste (Einstellungen): zuerst, was noch bestätigt werden muss, dann die bestätigten Preise; jeweils der neueste zuerst.
export const reviewRows = prices => (prices || []).filter(needsReview).sort(newestFirst);
export const paidRows = prices => (prices || []).filter(isPaid).sort(newestFirst);

// Der letzte bestätigte Kauf derselben Sorte und Packung im selben Geschäft bis `at` (für die Kontrolle beim Übernehmen eines Bons) oder null.
export function lastPaid(prices, candidate, at = '9999') {
  const key = entryKey(candidate), key2 = productKey(candidate.name);
  return (prices || []).filter(row => isPaid(row) && productKey(row.name) === key2 && entryKey(row) === key && row.createdAt <= at && row.id !== candidate.id).sort(newestFirst)[0] || null;
}

/* Dieselbe Bonposition nicht doppelt übernehmen: Geschäft, Tag, Bontext (ohne Größenangabe und Schreibweise) und Betrag der Zeile bilden den Schlüssel. */
const textKey = text => productKey(text).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 120);
export const receiptKeyOf = (storeId, day, text, totalCents) => `${storeId}|${day}|${textKey(text)}|${totalCents}`;
export const hasReceiptKey = (prices, key) => (prices || []).some(row => !row.deletedAt && row.receiptKey === key);
