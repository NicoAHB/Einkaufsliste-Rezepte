/* Ausgaben nach Zeitraum und Person. Reine Logik ohne DOM. Beträge sind positive
   ganze Cent, kind=refund zieht sie ab. Optionale buyerId/buyerName ordnen Personen
   fest zu. Tage: JJJJ-MM-TT, Monate: JJJJ-MM; alte Zeilen bleiben lesbar. */
import { validDay } from './data.js';
import { chainOf } from './brand.js';
import { buyerKey, buyerNameOf, validMemberId } from './family.js';

export const MAX_CENTS = 9999999;            // 99.999,99 € pro Eintrag: größere Zahlen sind fast sicher ein Tippfehler
export const SOURCES = ['bon', 'hand'];     // aus einem Kassenbon-Foto/-Screenshot erkannt oder von Hand eingegeben

const AMOUNT_ERROR = 'Bitte einen Betrag in Euro eingeben, zum Beispiel 23,45.';

/* Betrag aus Text: „23,45“, „23.45“, „1.234,56“, „1,234.56“, „€ 12“, „12 EUR“, „7,5“. Ein einzelner Punkt vor genau drei Ziffern („1.234“)
   gilt als Tausendertrenner. Ergebnis in Cent; alles andere (leer, null, negativ, mehr als zwei Nachkommastellen, „12,345“) ist ein Fehler:
   lieber nachfragen, als aus einem Tippfehler 12.345 € zu machen. */
export function parseAmount(input) {
  const text = String(input ?? '').replace(/[\s ]/g, '').replace(/€|euro|eur/gi, '');
  let normal;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(text)) normal = text.replace(/\./g, '').replace(',', '.');       // 1.234,56 oder 1.234
  else if (/^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(text)) normal = text.replace(/,/g, '');                           // 1,234.56 (ohne Nachkommastellen wäre „1,234“ nicht von 1,23 mit Tippfehler zu unterscheiden)
  else if (/^\d{1,7}(?:[.,]\d{1,2})?$/.test(text)) normal = text.replace(',', '.');                               // 23,45 oder 23.45
  else throw new Error(AMOUNT_ERROR);
  const [euros, cents = ''] = normal.split('.'), value = Number(euros) * 100 + Number(cents.padEnd(2, '0'));
  if (!Number.isSafeInteger(value) || value < 1) throw new Error('Der Betrag muss größer als 0 sein.');
  if (value > MAX_CENTS) throw new Error('Der Betrag ist zu groß. Bitte prüfen (höchstens 99.999,99 €).');
  return value;
}

// Cent als Text für ein Eingabefeld: 2345 → „23,45“ (ohne Tausenderpunkt, sonst würde „1.234“ später als 1,234 gelesen).
export const formatAmount = cents => (cents / 100).toFixed(2).replace('.', ',');

// Prüft die Eingaben für einen Eintrag und gibt die Felder zum Speichern zurück (`today` = JJJJ-MM-TT, Heute und morgen sind erlaubt).
export function purchaseFields({ amount, date, storeId = '', storeName = '', note = '', source = 'hand', buyerId, buyerName = '', kind }, today) {
  const cents = parseAmount(amount);
  if (!validDay(date)) throw new Error('Bitte ein gültiges Datum angeben.');
  const limit = new Date(`${today}T12:00:00Z`); limit.setUTCDate(limit.getUTCDate() + 1);
  if (date > limit.toISOString().slice(0, 10)) throw new Error('Das Datum liegt in der Zukunft.');
  const fields = { date, cents, source: SOURCES.includes(source) ? source : 'hand' };
  if (storeId) fields.storeId = String(storeId);
  if (storeName.trim()) fields.storeName = storeName.trim().replace(/\s+/g, ' ').slice(0, 80);
  fields.note = String(note).trim().replace(/\s+/g, ' ').slice(0, 120);
  if (kind !== undefined) {
    if (!['purchase', 'refund'].includes(kind)) throw new Error('Bitte Einkauf oder Rückerstattung auswählen.');
    fields.kind = kind;
  }
  if (buyerId !== undefined) {
    if (buyerId && !validMemberId(buyerId)) throw new Error('Bitte eine gültige Person auswählen.');
    if (typeof buyerName !== 'string' || buyerName.length > 30) throw new Error('Bitte den Namen der Person prüfen.');
    fields.buyerId = buyerId || null; fields.buyerName = buyerId ? buyerName.trim() : '';
  }
  return fields;
}

/* Doppelt erfasst? (Version 2.51) Gleicher Tag, gleiches Geschäft (oder beide ohne Geschäft) und gleicher Betrag sind ein Hinweis, kein Verbot: Zwei gleich teure Einkäufe am selben Tag
   sind möglich. `rows`: die vorhandenen Einträge, `fields`: der neue (date, cents, storeId), `ignoreId`: der Eintrag, der gerade geändert wird. Ergebnis: der erste gleiche Eintrag oder null. */
export function duplicatePurchase(rows, fields, ignoreId = '') {
  return rows.find(row => row.id !== ignoreId && !row.deletedAt && row.date === fields.date && row.cents === fields.cents && (row.storeId || '') === (fields.storeId || '') &&
    (row.kind || 'purchase') === (fields.kind || 'purchase')) ?? null;
}
// Alle Einträge, die einen Zwilling haben (für den Hinweis „Doppelt?“ in der Liste).
export function possibleDuplicates(rows) {
  const seen = new Map(), result = new Set();
  for (const row of rows.filter(entry => !entry.deletedAt)) {
    const key = `${row.date}|${row.cents}|${row.storeId || ''}|${row.kind || 'purchase'}`;
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
    .sort((a, b) => b.date.localeCompare(a.date) || `${b.createdAt || ''}|${b.id}`.localeCompare(`${a.createdAt || ''}|${a.id}`));
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
  const total = list.reduce((sum, row) => sum + purchaseValue(row), 0), groups = new Map(), people = new Map();
  let gross = 0, refunds = 0, refundCount = 0;
  for (const row of list) {
    const id = row.storeId && (names.has(row.storeId) || row.storeName) ? row.storeId : '';
    const name = id ? names.get(id) ?? row.storeName : (row.storeName || 'Ohne Geschäft');
    const key = id || `name:${name}`, group = groups.get(key) || { id, name, total: 0, count: 0 };
    const value = purchaseValue(row); group.total += value; group.count += 1; groups.set(key, group);
    if (row.kind === 'refund') { refunds += row.cents; refundCount++; } else gross += row.cents;
    const personId = buyerKey(row), individual = people.get(personId) || { id: personId, name: buyerNameOf(row, members), total: 0, count: 0, refundCount: 0 };
    individual.total += value; individual.count++; if (row.kind === 'refund') individual.refundCount++;
    people.set(personId, individual);
  }
  const byStore = [...groups.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'de')).map(group => ({ ...group, share: total > 0 ? group.total / total : 0 }));
  const byPerson = [...people.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'de'));
  const purchaseCount = list.length - refundCount;
  return { ...periodBounds(period), total, gross, refunds, refundCount, purchaseCount, count: list.length, average: purchaseCount ? Math.round(gross / purchaseCount) : 0, byStore, byPerson, list };
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
  const header = ['Datum', 'Art', 'Person', 'Geschäft', 'Betrag (EUR)', 'Notiz'].map(text).join(';');
  const lines = rows.map(row => [text(row.date), text(row.kind === 'refund' ? 'Rückerstattung' : 'Einkauf'), text(buyerNameOf(row, members)),
    text(storeNameOf(row, stores)), `"${formatAmount(purchaseValue(row))}"`, text(row.note)].join(';'));
  return '\ufeff' + [header, ...lines].join('\r\n') + '\r\n';
}
