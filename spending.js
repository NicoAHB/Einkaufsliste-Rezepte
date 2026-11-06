/* Ausgaben nach Zeitraum und Person. Reine Logik ohne DOM. Beträge sind positive
   ganze Cent, kind=refund zieht sie ab. Optionale buyerId/buyerName ordnen Personen
   fest zu. Tage: JJJJ-MM-TT, Monate: JJJJ-MM; alte Zeilen bleiben lesbar. */
import { validDay } from './data.js';
import { euroCents } from './numbers.js';
import { chainOf } from './brand.js';
import { buyerKey, buyerNameOf, validMemberId } from './family.js';
import { isSeparate } from './shop.js';

export const MAX_CENTS = 9999999;            // 99.999,99 € pro Eintrag: größere Zahlen sind fast sicher ein Tippfehler
export const SOURCES = ['bon', 'hand'];
/* Restaurant/Café/Bar (2.170): Auswärts essen und trinken. Ein Eintrag ist eine normale Ausgabe (Sammlung `purchases`) mit `dining`
   (Art), optional der Uhrzeit `time` (HH:MM) und dem Namen des Lokals in `storeName` (ohne Geschäftskennung). Ob diese Beträge
   vom Monatsbudget abgehen, entscheidet die gemeinsame Zeile `dining` der Sammlung `budgets` (`counts`, fehlt sie: ja).
   Seit 2.171 gibt es zwei Arten: Restaurant und Getränke (`drinks`). Einträge aus 2.170 mit `cafe` oder `bar` zählen als Getränke. */
export const DINING_LABEL = 'Restaurant/Café/Bar';
export const DINING_KINDS = [{ id: 'restaurant', label: 'Restaurant', emoji: '🍽️', hint: 'Essen gehen' }, { id: 'drinks', label: 'Getränke', emoji: '🥤', hint: 'Café, Bar …' }];
const LEGACY_KINDS = { cafe: 'drinks', bar: 'drinks' };
export const DINING_IDS = [...DINING_KINDS.map(kind => kind.id), ...Object.keys(LEGACY_KINDS)];
export const isDining = row => DINING_IDS.includes(row?.dining);
export const diningKind = row => DINING_KINDS.find(kind => kind.id === (LEGACY_KINDS[row?.dining] || row?.dining)) || DINING_KINDS[0];
export const validTime = time => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(time ?? ''));
// Zählen Restaurant/Café/Bar zum Monatsbudget? `budgets`: die Zeilen der Sammlung. Ohne Einstellung: ja (wie jede andere Ausgabe).
export const diningCounts = budgets => (budgets || []).find(row => row.id === 'dining' && !row.deletedAt)?.counts !== false;
/* Produkte eines Einkaufs (2.160): Was „Im Laden“ abgehakt und mit „Einkauf beenden“ samt Betrag gespeichert wurde, bleibt als kurze Liste
   (Name und Menge als Text) an der Ausgabe. Höchstens 300 Einträge, damit die gemeinsame Datei klein bleibt. Dazu die Kennung des Produktbilds
   und die Kategorie, wie die Einkaufsliste sie beim Abhaken zeigte: Der Artikel selbst verschwindet danach von der Liste. Nur lokale Kennungen, keine URLs. */
export const PURCHASE_ITEMS_MAX = 300;
export const PURCHASE_IMAGE_KEY = /^[a-z0-9-]{1,80}$/, PURCHASE_CATEGORY = /^[a-z0-9-]{1,40}$/;
export function purchaseItems(items, amountOf = () => '', imageOf = () => null) {
  return items.map(item => {
    const row = { name: String(item?.name || '').trim().replace(/\s+/g, ' ').slice(0, 120) }, amount = String(amountOf(item) || '').trim().slice(0, 80);
    if (!row.name) return null;
    if (amount) row.amount = amount;
    const image = imageOf(item) || {};
    if (PURCHASE_IMAGE_KEY.test(image.imageKey || '')) row.imageKey = image.imageKey;
    if (PURCHASE_CATEGORY.test(image.category || '')) row.category = image.category;
    return row;
  }).filter(Boolean).slice(0, PURCHASE_ITEMS_MAX);
}     // aus einem Kassenbon-Foto/-Screenshot erkannt oder von Hand eingegeben

const AMOUNT_ERROR = 'Bitte einen Betrag in Euro eingeben, zum Beispiel 23,45.';

/* Betrag aus Text: „23,45“, „23.45“, „1.234,56“, „1,234.56“, „€ 12“, „12 EUR“, „7,5“. Ein einzelner Punkt vor genau drei Ziffern („1.234“)
   gilt als Tausendertrenner. Ergebnis in Cent; alles andere (leer, null, negativ, mehr als zwei Nachkommastellen, „12,345“) ist ein Fehler:
   lieber nachfragen, als aus einem Tippfehler 12.345 € zu machen. */
export function parseAmount(input) {
  const value = euroCents(input);
  if (value === null) throw new Error(AMOUNT_ERROR);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error('Der Betrag muss größer als 0 sein.');
  if (value > MAX_CENTS) throw new Error('Der Betrag ist zu groß. Bitte prüfen (höchstens 99.999,99 €).');
  return value;
}

// Das Monatsbudget wird in vollen Euro eingegeben; Trennzeichen niemals entfernen oder als Tausenderpunkte deuten.
export function parseBudgetAmount(input) {
  const text = String(input ?? '').trim();
  if (!/^\d+$/.test(text)) throw new Error('Bitte einen vollen Eurobetrag ohne Nachkommastellen eingeben, zum Beispiel 400.');
  const value = Number(text);
  if (value < 1) throw new Error('Der Betrag muss größer als 0 sein.');
  if (!Number.isSafeInteger(value) || value > Math.floor(MAX_CENTS / 100)) throw new Error('Das Budget ist zu groß. Bitte prüfen (höchstens 99.999 €).');
  return value * 100;
}

// Cent als Text für ein Eingabefeld: 2345 → „23,45“ (ohne Tausenderpunkt, sonst würde „1.234“ später als 1,234 gelesen).
export const formatAmount = cents => (cents / 100).toFixed(2).replace('.', ',');

// Prüft die Eingaben für einen Eintrag und gibt die Felder zum Speichern zurück (`today` = JJJJ-MM-TT, Heute und morgen sind erlaubt).
export function purchaseFields({ amount, date, storeId = '', storeName = '', note = '', source = 'hand', buyerId, buyerName = '', kind, categoryId }, today) {
  const cents = parseAmount(amount);
  if (!validDay(date)) throw new Error('Bitte ein gültiges Datum angeben.');
  const limit = new Date(`${today}T12:00:00Z`); limit.setUTCDate(limit.getUTCDate() + 1);
  if (date > limit.toISOString().slice(0, 10)) throw new Error('Das Datum liegt in der Zukunft.');
  const fields = { date, cents, source: SOURCES.includes(source) ? source : 'hand' };
  if (storeId) fields.storeId = String(storeId);
  if (storeName.trim()) fields.storeName = storeName.trim().replace(/\s+/g, ' ').slice(0, 80);
  fields.note = String(note).trim().replace(/\s+/g, ' ').slice(0, categoryId === undefined ? 120 : 200);
  if (kind !== undefined) {
    if (!['purchase', 'refund'].includes(kind)) throw new Error('Bitte Einkauf oder Rückerstattung auswählen.');
    fields.kind = kind;
  }
  if (categoryId !== undefined) {
    if (categoryId !== null && (typeof categoryId !== 'string' || !categoryId || categoryId.length > 2048)) throw new Error('Bitte eine gültige Kategorie auswählen.');
    fields.categoryId = categoryId;
  }
  if (buyerId !== undefined) {
    if (buyerId && !validMemberId(buyerId)) throw new Error('Bitte eine gültige Person auswählen.');
    if (typeof buyerName !== 'string' || buyerName.length > 30) throw new Error('Bitte den Namen der Person prüfen.');
    fields.buyerId = buyerId || null; fields.buyerName = buyerId ? buyerName.trim() : '';
  }
  return fields;
}

/* Eingaben für Restaurant/Café/Bar prüfen: Betrag und Datum wie bei jeder Ausgabe, dazu die Art des Lokals, die Uhrzeit (leer = ohne) und
   der Name des Lokals (leer = ohne, höchstens 80 Zeichen). Ergebnis: die Felder zum Speichern; `storeName` und `time` stehen immer drin, damit
   beim Bearbeiten auch das Leeren eines Felds ankommt. */
export function diningFields({ amount, date, time = '', kind = 'restaurant', place = '', buyerId, buyerName = '', rating = '', ratingNote = '' }, today) {
  if (!DINING_KINDS.some(entry => entry.id === kind)) throw new Error('Bitte Restaurant oder Getränke auswählen.');
  const clock = String(time || '').trim();
  if (clock && !validTime(clock)) throw new Error('Bitte eine gültige Uhrzeit angeben, zum Beispiel 19:30.');
  const { storeName = '', ...fields } = purchaseFields({ amount, date, storeName: String(place || ''), note: '', source: 'hand', buyerId, buyerName }, today);
  // Bewertung (2.174 bei Restaurant, seit 2.177 auch bei Getränken)
  const stars = diningRating(rating);
  const remark = String(ratingNote ?? '').trim().replace(/\s+/g, ' ').slice(0, RATING_NOTE_MAX);
  return { ...fields, storeName, dining: kind, time: clock, rating: stars, ratingNote: remark };
}

/* Bewertung eines Besuchs (2.174 Restaurant, seit 2.177 auch Getränke): eine interne Notiz für die Familie, ob man nochmal hingehen will. `rating` 1–5 Sterne
   (1 = nie wieder, 3 = geht so, 5 = unbedingt), `ratingNote` ein kurzer Satz. Beides ist freiwillig und ändert keine Summe und kein Budget.
   Fehlen die Felder (ältere Einträge) oder sind sie leer (`null`, ''), gibt es keine Bewertung. */
export const RATING_NOTE_MAX = 120;
export function diningRating(value) {
  if (value === '' || value === null || value === undefined || Number(value) === 0) return null;
  const stars = Number(value);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new Error('Bitte 1 bis 5 Sterne wählen.');
  return stars;
}
export const hasRating = row => Number.isInteger(row?.rating) && row.rating >= 1 && row.rating <= 5;
export const ratingStars = stars => '★'.repeat(stars) + '☆'.repeat(5 - stars);
export const RATING_MEANING = { 1: 'nie wieder', 2: 'eher nicht', 3: 'geht so', 4: 'gerne wieder', 5: 'unbedingt' };
// Letzte Bewertung eines Lokals (Name ohne Groß-/Kleinschreibung und doppelte Leerzeichen): der jüngste Besuch mit Sternen, ohne den Eintrag `ignoreId`.
export function lastRating(rows, place, ignoreId = '') {
  const key = String(place || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('de');
  if (!key) return null;
  const when = row => `${row.date}|${row.time || ''}|${row.createdAt || ''}`;
  return rows.filter(row => !row.deletedAt && row.id !== ignoreId && isDining(row) && hasRating(row) && String(row.storeName || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('de') === key)
    .sort((a, b) => when(b).localeCompare(when(a)))[0] ?? null;
}

// Lokale zum schnellen Antippen: die bisher am häufigsten besuchten (bei Gleichstand das zuletzt besuchte zuerst), höchstens `limit`, ohne doppelte Schreibweisen.
export function diningPlaces(rows, limit = 6) {
  const places = new Map();
  for (const row of rows) {
    if (row.deletedAt || !isDining(row)) continue;
    const name = String(row.storeName || '').trim().replace(/\s+/g, ' '), key = name.toLocaleLowerCase('de');
    if (!name) continue;
    const entry = places.get(key) || { name, kind: diningKind(row).id, count: 0, last: '' }, when = `${row.date}|${row.time || ''}|${row.createdAt || ''}`;
    entry.count++; if (when > entry.last) { entry.last = when; entry.name = name; entry.kind = diningKind(row).id; }
    places.set(key, entry);
  }
  return [...places.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).slice(0, limit).map(({ name, kind }) => ({ name, kind }));
}

/* Doppelt erfasst? (Version 2.51) Gleicher Tag, gleiches Geschäft (oder beide ohne Geschäft) und gleicher Betrag sind ein Hinweis, kein Verbot: Zwei gleich teure Einkäufe am selben Tag
   sind möglich. `rows`: die vorhandenen Einträge, `fields`: der neue (date, cents, storeId), `ignoreId`: der Eintrag, der gerade geändert wird. Ergebnis: der erste gleiche Eintrag oder null. */
export function duplicatePurchase(rows, fields, ignoreId = '') {
  return rows.find(row => row.id !== ignoreId && !row.deletedAt && row.date === fields.date && row.cents === fields.cents && (row.storeId || '') === (fields.storeId || '') &&
    (row.kind || 'purchase') === (fields.kind || 'purchase') && diningKey(row) === diningKey(fields)) ?? null;
}
// Restaurant/Café/Bar zählt nur gegen gleiche Besuche im selben Lokal als doppelt, nie gegen einen Einkauf.
const diningKey = row => isDining(row) ? `dining:${String(row.storeName || '').trim().toLocaleLowerCase('de')}` : '';
// Alle Einträge, die einen Zwilling haben (für den Hinweis „Doppelt?“ in der Liste).
export function possibleDuplicates(rows) {
  const seen = new Map(), result = new Set();
  for (const row of rows.filter(entry => !entry.deletedAt)) {
    const key = `${row.date}|${row.cents}|${row.storeId || ''}|${row.kind || 'purchase'}|${diningKey(row)}`;
    if (seen.has(key)) { result.add(row.id); result.add(seen.get(key)); } else seen.set(key, row.id);
  }
  return result;
}

// Aus der Auswertung eines Kassenbons (receipt.js, parseReceipt) den Betrag: die Summe laut Bon, sonst die Summe der erkannten Zeilen, sonst nichts.
export function receiptAmount(parsed) {
  if (parsed?.total > 0) return { cents: parsed.total, how: 'bon' };
  if (parsed?.items?.length && parsed.sum > 0) return { cents: parsed.sum, how: 'zeilen' };
  return null;
}

/* ---------- Monate ---------- */
export const monthOf = day => String(day).slice(0, 7);
export const validMonth = month => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(month));
export function shiftMonth(month, delta) {
  const [year, number] = month.split('-').map(Number), index = year * 12 + (number - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}
export const monthLabel = month => new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(new Date(`${month}-15T12:00:00`));
export const monthName = month => new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(new Date(`${month}-15T12:00:00`));
export const dayLabel = day => new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' }).format(new Date(`${day}T12:00:00`));
// Letzter Tag eines Monats (JJJJ-MM-TT).
export function lastDay(month) { const [year, number] = month.split('-').map(Number); return new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10); }
const monthShort = month => new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(new Date(`${month}-15T12:00:00`)).replace('.', '');

/* ---------- Auswertung ---------- */
// Einträge eines Monats, die neuesten Tage zuerst (am selben Tag: der zuletzt erfasste zuerst).
export const purchaseValue = row => row.kind === 'refund' ? -row.cents : row.cents;
export function periodBounds(period) {
  if (typeof period === 'string' && validMonth(period)) return { from: `${period}-01`, to: lastDay(period) };
  if (!period || !validDay(period.from) || !validDay(period.to)) throw new Error('Bitte einen gültigen Zeitraum angeben.');
  if (period.from > period.to) throw new Error('Das Anfangsdatum muss vor dem Enddatum liegen.');
  return { from: period.from, to: period.to };
}
export function fullMonth(period) {
  const bounds = periodBounds(period), month = monthOf(bounds.from);
  return bounds.from === `${month}-01` && bounds.to === lastDay(month) ? month : null;
}
export function filterPurchases(rows, period, person = 'all') {
  const { from, to } = periodBounds(period);
  return rows.filter(row => !row.deletedAt && row.date >= from && row.date <= to && (person === 'all' || buyerKey(row) === person))
    .sort((a, b) => b.date.localeCompare(a.date) || (isDining(a) && isDining(b) ? (b.time || '').localeCompare(a.time || '') : 0) || `${b.createdAt || ''}|${b.id}`.localeCompare(`${a.createdAt || ''}|${a.id}`));
}
export const purchasesOf = (rows, month) => filterPurchases(rows, month);

// Anzeigename des Geschäfts eines Eintrags: der aktuelle Name, sonst der beim Erfassen gemerkte (Geschäft inzwischen gelöscht), sonst leer.
export const storeNameOf = (row, stores = []) => stores.find(store => store.id === row.storeId)?.name ?? row.storeName ?? '';

/* Summe, Anzahl, Durchschnitt und Aufteilung nach Geschäft. `stores`: vorhandene Geschäfte (Namen können sich ändern; für gelöschte Geschäfte gilt der beim Erfassen
   gemerkte Name `storeName`). Einträge ohne Geschäft stehen unter „Ohne Geschäft“. */
export function summarize(rows, month, stores = []) {
  const { total, count, average, byStore, list } = summarizePeriod(rows, month, stores);
  return { month, total, count, average, byStore, list };
}
export function summarizePeriod(rows, period, stores = [], members = [], person = 'all') {
  const list = filterPurchases(rows, period, person), names = new Map(stores.map(store => [store.id, store.name]));
  const total = list.reduce((sum, row) => sum + purchaseValue(row), 0), groups = new Map(), people = new Map(), notes = new Map();
  let gross = 0, refunds = 0, refundCount = 0;
  // Restaurant/Café/Bar (2.170): eigene Summe, eigene Liste und je Art; unter „Nach Geschäft“ und „Nach Kategorie“ eine gemeinsame Zeile
  const dining = { total: 0, count: 0, list: [], kinds: new Map() };
  for (const row of list) {
    const value = purchaseValue(row), out = isDining(row);
    const id = !out && row.storeId && (names.has(row.storeId) || row.storeName) ? row.storeId : '';
    const name = out ? DINING_LABEL : id ? names.get(id) ?? row.storeName : (row.storeName || 'Ohne Geschäft');
    const key = out ? 'dining' : id || `name:${name}`, group = groups.get(key) || { id, name, total: 0, count: 0, ...(out ? { dining: true } : {}) };
    const noteName = out ? DINING_LABEL : row.note?.trim() || 'Ohne Notiz', noteKey = out ? 'dining' : noteName.toLocaleLowerCase('de');
    const note=notes.get(noteKey) || {name:noteName,total:0,count:0}; note.total+=value; note.count++; notes.set(noteKey,note);
    group.total += value; group.count += 1; groups.set(key, group);
    if (out) {
      const kind = diningKind(row), entry = dining.kinds.get(kind.id) || { ...kind, total: 0, count: 0 };
      entry.total += value; entry.count++; dining.kinds.set(kind.id, entry);
      dining.total += value; dining.count++; dining.list.push(row);
    } else if (row.kind === 'refund') { refunds += row.cents; refundCount++; } else gross += row.cents;
    const personId = buyerKey(row), individual = people.get(personId) || { id: personId, name: buyerNameOf(row, members), total: 0, count: 0, refundCount: 0 };
    individual.total += value; individual.count++; if (row.kind === 'refund') individual.refundCount++;
    people.set(personId, individual);
  }
  const byStore = [...groups.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'de')).map(group => ({ ...group, share: total > 0 ? group.total / total : 0 }));
  const byPerson = [...people.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'de'));
  const byNote = [...notes.values()].sort((a,b)=>b.total-a.total || a.name.localeCompare(b.name,'de'));
  const purchaseCount = list.length - refundCount - dining.count;
  const diningSummary = { total: dining.total, count: dining.count, average: dining.count ? Math.round(dining.total / dining.count) : 0, share: total > 0 ? dining.total / total : 0,
    byKind: DINING_KINDS.map(kind => dining.kinds.get(kind.id)).filter(Boolean), list: dining.list };
  return { ...periodBounds(period), total, gross, refunds, refundCount, purchaseCount, count: list.length, average: purchaseCount ? Math.round(gross / purchaseCount) : 0, byStore, byPerson, byNote, dining: diningSummary, list };
}
// Was vom Monatsbudget abgeht (Cent): alle Ausgaben, ohne Restaurant/Café/Bar, wenn der Haken „Zählt zum Monatsbudget“ aus ist.
export const budgetSpent = (summary, countsDining = true) => summary.total - (countsDining ? 0 : summary.dining.total);

// Häufigkeit statt Geldbeträgen: jeder Einkauf zählt einmal, Retouren nicht.
// Vorhandene Geschäfte bleiben auch ohne Einkauf sichtbar. Eigene Listen sind
// keine Geschäfte; historische Einkäufe bleiben ihren früheren Geschäften zugeordnet.
export function purchaseFrequency(rows, period, stores = [], person = 'all') {
  const normalName = name => String(name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('de');
  const known = new Map(stores.map(store => [store.id, store]));
  const current = stores.filter(store => !store.deletedAt && !isSeparate(store)), groups = new Map();
  for (const store of current) groups.set(`id:${store.id}`, { id: store.id, name: store.name, count: 0 });
  for (const row of filterPurchases(rows, period, person)) {
    if (row.kind === 'refund' || isDining(row)) continue;   // Restaurant/Café/Bar ist kein Einkauf in einem Geschäft
    const original = known.get(row.storeId);
    if (original && isSeparate(original)) continue;
    const savedName = String(row.storeName || '').trim().replace(/\s+/g, ' ');
    const matches = !row.storeId && savedName ? current.filter(store => normalName(store.name) === normalName(savedName)) : [];
    const store = original || (matches.length === 1 ? matches[0] : null);
    const id = store?.id || (savedName ? row.storeId : '') || '';
    const name = store?.name || savedName || 'Ohne Geschäft', key = id ? `id:${id}` : `name:${normalName(name)}`;
    const group = groups.get(key) || { id, name, count: 0 };
    group.count++; groups.set(key, group);
  }
  const byStore = [...groups.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id));
  return { count: byStore.reduce((sum, store) => sum + store.count, 0), byStore };
}
// Unterschied zum Vergleichsmonat: { diff (Cent), percent (ganze Prozent, null ohne Vergleichswert) }.
export function compareTotals(current, previous) {
  const diff = current - previous;
  return { diff, percent: previous > 0 ? Math.round((diff / previous) * 100) : null };
}
// Die letzten `count` Monate bis einschließlich `month`: [{ month, label, total }] für ein kleines Säulendiagramm.
export function recentMonths(rows, month, count = 6) {
  return Array.from({ length: count }, (_, index) => shiftMonth(month, index - count + 1)).map(key => ({
    month: key, label: monthShort(key), total: rows.filter(row => !row.deletedAt && monthOf(row.date) === key).reduce((sum, row) => sum + purchaseValue(row), 0)
  }));
}
// Der früheste und der späteste Monat mit Einträgen (zum Begrenzen der Pfeile), sonst der angegebene.
export const firstMonth = (rows, fallback) => rows.reduce((first, row) => (monthOf(row.date) < first ? monthOf(row.date) : first), fallback);
export const latestMonth = (rows, fallback) => rows.reduce((last, row) => (monthOf(row.date) > last ? monthOf(row.date) : last), fallback);

/* ---------- Notiz ---------- */
export const DEFAULT_NOTE = 'Wocheneinkauf';
const NOTE_IDEAS = ['Wocheneinkauf', 'Großeinkauf', 'Zwischendurch', 'Getränke', 'Drogerie', 'Obst & Gemüse', 'Grillen', 'Besuch', 'Wochenmarkt', 'Frühstück', 'Haushalt', 'Geschenk'];
/* Vorschläge für die Notiz eines Einkaufs (die Liste in der App ist scrollbar), höchstens `limit`: zuerst „Wocheneinkauf“ (der Standard), danach „Drogerie“, wenn das Geschäft eine Drogerie ist,
   danach die bisher am häufigsten benutzten eigenen Notizen (bei gleicher Häufigkeit die zuletzt benutzte), zuletzt feste Ideen. Doppelte (auch in anderer
   Groß-/Kleinschreibung) erscheinen einmal; zu lange Notizen (über 30 Zeichen) sind keine Vorschläge. */
export function noteSuggestions(rows, storeName = '', limit = 12) {
  const used = new Map();
  for (const row of rows) {
    const text = String(row.note ?? '').trim().replace(/\s+/g, ' ');
    if (!text || text.length > 30) continue;
    const key = text.toLocaleLowerCase('de'), entry = used.get(key) || { text, count: 0, last: '' };
    entry.count += 1; if (`${row.date}|${row.createdAt ?? ''}` > entry.last) { entry.last = `${row.date}|${row.createdAt ?? ''}`; entry.text = text; }
    used.set(key, entry);
  }
  const own = [...used.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).map(entry => entry.text);
  const result = [], seen = new Set();
  for (const text of [DEFAULT_NOTE, ...(chainOf(storeName)?.drugstore ? ['Drogerie'] : []), ...own.slice(0, 4), ...NOTE_IDEAS]) {
    const key = text.toLocaleLowerCase('de');
    if (!seen.has(key)) { seen.add(key); result.push(text); }
  }
  return result.slice(0, limit);
}

/* ---------- Monatsbudget ---------- */
// Stand gegen das Budget (Cent): null ohne Budget; `percent` ganze Prozent, `left` (negativ = überschritten), `level`: 'ok', 'warn' ab 80 %, 'over' über 100 %.
export function budgetStatus(spent, budget) {
  if (!Number.isSafeInteger(budget) || budget <= 0) return null;
  return { percent: Math.max(0, Math.round(spent / budget * 100)), left: budget - spent, level: spent > budget ? 'over' : spent / budget >= 0.8 ? 'warn' : 'ok' };
}

// CSV für den ausgewählten Zeitraum und die ausgewählte Person; UTF-8 für deutsche Tabellenprogramme.
// Benutzereingaben sind Text, auch wenn ein Name mit einem Tabellen-Formelzeichen beginnt.
export function spendingCsv(rows, stores = [], members = []) {
  const text = value => { let field = String(value ?? ''); if (/^[\s]*[=+\-@\t\r]/.test(field)) field = `'${field}`; return `"${field.replace(/"/g, '""')}"`; };
  // Restaurant/Café/Bar (2.170): Art „Café“ usw., Geschäft = Name des Lokals, dazu Uhrzeit; seit 2.174 Bewertung und Notiz dazu
  const header = ['Datum', 'Art', 'Person', 'Geschäft', 'Betrag (EUR)', 'Kategorie', 'Uhrzeit', 'Bewertung (1–5)', 'Notiz zur Bewertung'].map(text).join(';');
  const art = row => isDining(row) ? `${DINING_LABEL}: ${diningKind(row).label}` : row.kind === 'refund' ? 'Rückerstattung' : 'Einkauf';
  const lines = rows.map(row => [text(row.date), text(art(row)), text(buyerNameOf(row, members)),
    text(storeNameOf(row, stores)), `"${formatAmount(purchaseValue(row))}"`, text(isDining(row) ? DINING_LABEL : row.note), text(isDining(row) ? row.time : ''),
    text(hasRating(row) ? row.rating : ''), text(hasRating(row) ? row.ratingNote : '')].join(';'));
  return '\ufeff' + [header, ...lines].join('\r\n') + '\r\n';
}
