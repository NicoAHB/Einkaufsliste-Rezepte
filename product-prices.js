/* Produktpreise (2.163): bezahlte Preise einzelner Produkte eines Einkaufs. Reine Logik ohne DOM.
   Ein Preis steht direkt am Produkt in `purchases.items` (siehe purchaseItems in spending.js): `cents` (ganze Cent, der bezahlte Preis für
   die dort genannte Menge) und optional `offer: true` (Angebotspreis). Geschäft und Kaufdatum kommen vom Einkauf selbst, deshalb muss man
   sie nicht erneut wählen; ändert jemand am Einkauf das Geschäft oder Datum, gilt das auch für seine Preise. Der Gesamtbetrag des Einkaufs
   (`cents` des Einkaufs) bleibt davon unabhängig: keine Summe, keine Neuberechnung, kein Abgleich. */
import { euroCents } from './numbers.js';
import { productKey } from './prices.js';

export const PRODUCT_PRICE_MAX = 9999999;   // 99.999,99 €
const PRICE_ERROR = 'Bitte den bezahlten Preis in Euro eingeben, zum Beispiel 1,99.';

// Eingabe „1,99“, „1.99“, „1,99 €“ → 199 Cent. Leer, 0, negativ oder mehr als zwei Nachkommastellen: Fehler (lieber nachfragen als raten).
export function productPriceCents(value) {
  const cents = euroCents(value);
  if (cents === null || cents < 1 || cents > PRODUCT_PRICE_MAX) throw new Error(PRICE_ERROR);
  return cents;
}
export const hasProductPrice = entry => Number.isSafeInteger(entry?.cents) && entry.cents >= 1 && entry.cents <= PRODUCT_PRICE_MAX;
// Für data.js: ohne Preis kein Angebot; `offer` ist entweder nicht vorhanden oder true.
export const validProductPrice = entry => (entry.cents === undefined || hasProductPrice(entry)) && (entry.offer === undefined || (entry.offer === true && entry.cents !== undefined));

/* Neue Produktliste, in der nur das Produkt an `index` einen anderen Preis bekommt (`price` = { cents, offer } oder null = Preis löschen).
   Der Name wird mitgeprüft: Hat sich die Liste inzwischen geändert, wird nichts überschrieben. Alle übrigen Angaben bleiben unverändert. */
export function withProductPrice(items, index, name, price) {
  if (!Array.isArray(items) || !Number.isInteger(index) || !items[index] || productKey(items[index].name) !== productKey(name)) throw new Error('Dieses Produkt wurde inzwischen geändert. Bitte den Einkauf erneut aufklappen.');
  if (price && !hasProductPrice(price)) throw new Error(PRICE_ERROR);
  return items.map((entry, at) => {
    if (at !== index) return entry;
    const { cents, offer, ...rest } = entry;
    return price ? { ...rest, cents: price.cents, ...(price.offer ? { offer: true } : {}) } : rest;
  });
}

const newer = (a, b) => a.date !== b.date ? a.date > b.date : a.at !== b.at ? a.at > b.at : a.order > b.order;

/* Alle gespeicherten Produktpreise, nach Produktname (productKey) gesammelt. Gelöschte Einkäufe und Rückerstattungen zählen nicht.
   `storeNameOf(purchase)` liefert den Namen des Geschäfts (auch eines inzwischen gelöschten, über den gemerkten Namen). */
export function productPriceIndex(purchases, storeNameOf = purchase => purchase.storeName || '') {
  const index = new Map(); let order = 0;
  for (const purchase of purchases || []) {
    if (!purchase || purchase.deletedAt || purchase.kind === 'refund' || !Array.isArray(purchase.items)) continue;
    purchase.items.forEach((entry, at) => {
      if (!entry || !hasProductPrice(entry) || typeof entry.name !== 'string') return;
      const key = productKey(entry.name), storeName = String(storeNameOf(purchase) || '').trim();
      // Je Geschäft eine Gruppe: über die Kennung, sonst über den gemerkten Namen; ohne beides „Ohne Geschäft“.
      const group = purchase.storeId ? `id:${purchase.storeId}` : storeName ? `name:${productKey(storeName)}` : 'none';
      const row = { group, storeId: purchase.storeId || '', storeName, cents: entry.cents, offer: entry.offer === true, date: purchase.date, amount: String(entry.amount || '').trim(),
        purchaseId: purchase.id, index: at, at: String(purchase.createdAt || ''), order: order++ };
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(row);
    });
  }
  return index;
}

/* Preisübersicht für ein Produkt „Im Laden“: je Geschäft der zuletzt gezahlte Preis, die jüngsten oben.
   Der günstigste normale Preis (kein Angebot) wird markiert, wenn es etwas zu vergleichen gibt (mindestens zwei Geschäfte) und die normalen Preise
   für dieselbe Menge gelten. Stehen unterschiedliche Mengen dabei („1 Stück“ und „2 Stück“), zeigt die Übersicht die Mengen an und markiert nichts,
   damit nie ein falscher Preis als günstigster erscheint. */
export function priceOverview(rows) {
  const latest = new Map();
  for (const row of rows || []) { const current = latest.get(row.group); if (!current || newer(row, current)) latest.set(row.group, row); }
  const list = [...latest.values()].sort((a, b) => newer(a, b) ? -1 : newer(b, a) ? 1 : 0);
  const normal = list.filter(row => !row.offer), amounts = new Set(list.map(row => productKey(row.amount)));
  const comparable = new Set(normal.map(row => productKey(row.amount))).size === 1;
  const lowest = list.length > 1 && normal.length && comparable ? Math.min(...normal.map(row => row.cents)) : null;
  return { rows: list.map(row => ({ ...row, cheapest: !row.offer && row.cents === lowest })), showAmounts: amounts.size > 1 };
}
