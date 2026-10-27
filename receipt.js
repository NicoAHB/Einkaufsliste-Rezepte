/* Digitale Kassenbons: Text → Positionen. Reine Logik ohne DOM.
   Der Text eines Bons (aus der App oder dem PDF des Marktes kopiert) wird in Artikelzeilen zerlegt. Erkannt werden Preis, Stückzahl
   („2 x 0,79“), Gewicht („0,432 kg x 3,99 EUR/kg“), Packungsgröße im Namen („250g“, „1L“, „10 St“), Rabattzeilen und Pfand. Die
   Summe laut Bon wird mit der Summe der erkannten Zeilen verglichen, so fällt eine nicht gelesene Zeile auf. Nichts wird gespeichert, bevor
   die Person die Zeilen geprüft hat: Das hier liefert nur Vorschläge. */
import { productKey } from './prices.js';

const AMOUNT = String.raw`(-?)(\d{1,5}),(\d{2})(-?)`;
const TAX = String.raw`(?:\s*[A-Z1-9*]{1,2})?`;                                  // Steuerkennzeichen am Zeilenende (A, B, 1, 2, *)
const LINE_PRICE = new RegExp(String.raw`^(.*?)\s+${AMOUNT}\s*(?:€|EUR)?${TAX}\s*$`, 'u');
const PRICE_ONLY = new RegExp(String.raw`^${AMOUNT}\s*(?:€|EUR)?${TAX}\s*$`, 'u');
const COUNT = /^(\d{1,3})\s*(?:stk\.?|st\.?|stück)?\s*[x×*]\s*(\d{1,5}),(\d{2})\s*(?:€|eur)?\s*(.*)$/iu;
const WEIGHT = /^(\d{1,3}(?:,\d{1,3})?)\s*(kg|g|l)\s*[x×*]\s*(\d{1,5}),(\d{2})\s*(?:€|eur)?\s*\/\s*(kg|g|l)\b\s*(.*)$/iu;
const COUNT_END = /\s+(\d{1,3})\s*(?:stk\.?|st\.?|stück)?\s*[x×*]\s*(\d{1,5}),(\d{2})\s*(?:€|eur)?$/iu;
const WEIGHT_END = /\s+(\d{1,3}(?:,\d{1,3})?)\s*(kg|g|l)\s*[x×*]\s*(\d{1,5}),(\d{2})\s*(?:€|eur)?\s*\/\s*(kg|g|l)$/iu;
const STOP = /^(summe|gesamtsumme|gesamt|total|zu zahlen|zahlbetrag|endbetrag|betrag)\b/iu;
const SKIP = /zwischensumme|übertrag|subtotal|netto|brutto|mwst|mehrwertsteuer|ust-?id|steuer/iu;
const DEPOSIT = /pfand|leergut/iu;
const SIZE_MULTI = /(\d{1,2})\s*[x×]\s*(\d+(?:,\d+)?)\s*(kg|g|ml|cl|l)\b\.?/iu;
const SIZE_ONE = /(\d+(?:,\d+)?)\s*(kg|g|ml|cl|ltr|liter|l|stk|st)\b\.?/iu;
const CHAINS = /\b(rewe|lidl|edeka|aldi|kaufland|penny|netto|dm|rossmann|marktkauf|famila|globus|real)\b/iu;

const cents = (sign, whole, fraction, tail = '') => (sign || tail ? -1 : 1) * (Number(whole) * 100 + Number(fraction));
const num = text => Number(String(text).replace(',', '.'));
const clean = line => line.replace(/[ \t]+/g, ' ').replace(/\s+/g, ' ').trim();

// GROSSBUCHSTABEN → Normale Schreibweise („BIO VOLLMILCH“ → „Bio Vollmilch“).
export function tidyName(text) {
  let name = clean(text).replace(/[*#]+$/, '').trim();
  if (name === name.toUpperCase() && /[A-ZÄÖÜ]{3}/u.test(name)) {
    name = name.toLowerCase().replace(/(^|[\s\-/])(\p{L})/gu, (_, before, letter) => before + letter.toUpperCase());
  }
  return name;
}

// Packungsgröße aus dem Namen: { quantity, unit, rest } oder null. 6 x 1,5 l werden zu 9 l, 10 St zu 10 Stück, cl zu ml.
export function parseSize(name) {
  const multi = name.match(SIZE_MULTI), one = multi ? null : name.match(SIZE_ONE);
  const found = multi || one;
  if (!found) return null;
  const count = multi ? Number(multi[1]) : 1, amount = num(multi ? multi[2] : one[1]);
  let unit = (multi ? multi[3] : one[2]).toLowerCase();
  let quantity = count * amount;
  if (unit === 'cl') { unit = 'ml'; quantity *= 10; }
  if (unit === 'ltr' || unit === 'liter') unit = 'l';
  if (unit === 'st' || unit === 'stk') unit = 'Stück';
  if (!(quantity > 0) || !Number.isFinite(quantity)) return null;
  return { quantity: Math.round(quantity * 1000) / 1000, unit, rest: clean(name.replace(found[0], ' ')) };
}

// Schlüssel für das Zuordnungsgedächtnis: ohne Größen, Prozentangaben und Satzzeichen („TOM CHERRY 250G“ → „tom cherry“).
export function aliasKey(text) {
  return productKey(text).replace(/\d+(?:[.,]\d+)?\s*%/g, ' ').replace(/\d+(?:[.,]\d+)?\s*(?:kg|g|ml|cl|ltr|liter|l|stk|st)\b\.?/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter(word => word && !/^\d+$/.test(word)).join(' ').slice(0, 80);
}

function validDate(day, month, year) {
  const full = year.length === 2 ? `20${year}` : year;
  const text = `${full}-${month}-${day}`, date = new Date(`${text}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text) && date.getTime() < Date.now() + 2 * 86400000 ? text : null;
}

function detailOf(line) {
  let match = line.match(WEIGHT);
  if (match) return { rate: { cents: Number(match[3]) * 100 + Number(match[4]), unit: match[5].toLowerCase() }, weight: { amount: num(match[1]), unit: match[2].toLowerCase() }, rest: match[6] };
  match = line.match(COUNT);
  if (match) return { count: Number(match[1]), unitCents: Number(match[2]) * 100 + Number(match[3]), rest: match[4] };
  return null;
}

/* Ergebnis: { items, skipped, total, sum, date, chain }
   items: [{ text, name, quote, regularQuote, onSale, count, weight, discountCents, totalCents }]
   total: Summe laut Bon (Cent) oder null; sum: Summe aller erkannten Zeilen einschließlich Pfand und Rabatten. */
export function parseReceipt(input) {
  const lines = String(input || '').split(/\r?\n/).map(clean).filter(Boolean);
  const items = [], skipped = [];
  let pending = null, last = null, finished = false, total = null, sum = 0, date = null, chain = null;
  const dateRe = /\b(\d{2})\.(\d{2})\.(\d{4}|\d{2})\b/u;
  lines.slice(0, 14).forEach(line => { chain ||= line.match(CHAINS)?.[1].toLowerCase() || null; });

  const add = (text, name, totalCents, extra = {}) => {
    const item = { text, name, totalCents, count: 1, unitCents: null, rate: null, weight: null, discountCents: 0, ...extra };
    items.push(item); sum += totalCents; last = item; pending = null;
  };
  for (const line of lines) {
    date ||= (() => { const m = line.match(dateRe); return m ? validDate(m[1], m[2], m[3]) : null; })();
    if (STOP.test(line)) {
      if (!finished) { const amounts = [...line.matchAll(/(\d{1,5}),(\d{2})/g)]; if (amounts.length) total = Number(amounts.at(-1)[1]) * 100 + Number(amounts.at(-1)[2]); }
      finished = true; continue;
    }
    if (finished) continue;
    // Zeile nur mit Stückzahl oder Gewicht (eventuell mit der Zeilensumme am Ende)
    const detail = detailOf(line);
    if (detail) {
      const rest = detail.rest.match(PRICE_ONLY), target = pending ? null : last;
      if (pending && rest) { add(`${pending.text} ${line}`, pending.name, cents(rest[1], rest[2], rest[3], rest[4]), detail); continue; }
      if (pending) { pending.detail = detail; pending.text += ` ${line}`; continue; }   // der Betrag folgt in der nächsten Zeile
      if (target && !target.rate && target.count === 1 && !target.weight) {
        if (detail.rate) { target.rate = detail.rate; target.weight = detail.weight; }
        else { target.count = detail.count; target.unitCents = detail.unitCents; }
        target.text += ` ${line}`; continue;
      }
      skipped.push({ text: line, why: 'Mengenzeile ohne Artikel' }); continue;
    }
    const only = line.match(PRICE_ONLY);
    if (only) {
      if (pending) add(`${pending.text} ${line}`, pending.name, cents(only[1], only[2], only[3], only[4]), pending.detail || {});
      else skipped.push({ text: line, why: 'Betrag ohne Artikel' });
      continue;
    }
    const priced = line.match(LINE_PRICE);
    if (priced) {
      const name = priced[1], value = cents(priced[2], priced[3], priced[4], priced[5]);
      if (SKIP.test(name)) { skipped.push({ text: line, why: 'keine Artikelzeile' }); pending = null; continue; }
      if (DEPOSIT.test(name)) { sum += value; skipped.push({ text: line, why: 'Pfand' }); last = null; pending = null; continue; }
      if (value < 0) {   // Rabatt, Coupon oder Gutschein
        sum += value;
        if (last && Math.abs(value) <= last.totalCents) { last.discountCents += Math.abs(value); last.text += ` ${line}`; }
        else skipped.push({ text: line, why: 'Rabatt auf den ganzen Einkauf' });
        pending = null; continue;
      }
      if ((name.match(/\p{L}/gu) || []).length < 2) { skipped.push({ text: line, why: 'keine Artikelzeile' }); continue; }
      // „Bananen 2 Stk x 0,29 0,58“: Stückzahl oder Gewicht steht in derselben Zeile
      let label = name, extra = {};
      const weighed = label.match(WEIGHT_END), counted = weighed ? null : label.match(COUNT_END);
      if (weighed) { extra = { rate: { cents: Number(weighed[3]) * 100 + Number(weighed[4]), unit: weighed[5].toLowerCase() }, weight: { amount: num(weighed[1]), unit: weighed[2].toLowerCase() } }; label = label.replace(WEIGHT_END, ''); }
      else if (counted) { extra = { count: Number(counted[1]), unitCents: Number(counted[2]) * 100 + Number(counted[3]) }; label = label.replace(COUNT_END, ''); }
      add(line, label, value, extra);
      continue;
    }
    // Zeile ohne Betrag: Name einer Position, deren Preis in der nächsten Zeile steht
    if ((line.match(/\p{L}/gu) || []).length >= 3 && !SKIP.test(line)) { pending = { text: line, name: line }; last = null; }
    else skipped.push({ text: line, why: 'nicht erkannt' });
  }

  const result = items.map(item => {
    const size = parseSize(tidyName(item.name));
    const name = tidyName(size ? size.rest : item.name) || tidyName(item.name);
    let quote, count = item.count;
    if (item.rate) quote = { cents: item.rate.cents, quantity: 1, unit: item.rate.unit === 'g' ? 'g' : item.rate.unit };
    else {
      const each = item.unitCents !== null && Math.abs(item.unitCents * count - item.totalCents) <= count ? item.unitCents : Math.round(item.totalCents / count);
      quote = size ? { cents: each, quantity: size.quantity, unit: size.unit } : { cents: each, quantity: 1, unit: 'Stück' };
    }
    const onSale = item.discountCents > 0 && item.discountCents < item.totalCents;
    // Mit Rabatt: bezahlt wurde weniger. Der Normalpreis bleibt als Normalpreis erhalten (ein Aktionspreis wird nie zum neuen Normalpreis).
    const paid = onSale ? { ...quote, cents: Math.max(0, Math.round(quote.cents * (item.totalCents - item.discountCents) / item.totalCents)) } : quote;
    return { text: item.text, name, quote: paid, regularQuote: onSale ? quote : null, onSale, count, weight: item.weight, discountCents: item.discountCents, totalCents: item.totalCents };
  }).filter(item => item.quote.cents > 0);
  return { items: result, skipped, total, sum, date, chain };
}

const wordsOf = text => productKey(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const better = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i]; return false; };
// Passt ein Wort der Bonzeile zu einem Wort des bekannten Namens? Nur gleiches Wort oder abgekürztes Wort („tom“ → „tomaten“).
// Zusammengesetzte Wörter zählen nie: „Apfeltasche“ ist nicht „Apfel“, „Hafermilch“ nicht „Milch“, „Kirschtomaten“ nicht „Tomaten“ (anderes Produkt, anderer Preis).
const closeWord = (word, token) => word === token || (word.length >= 3 && word.length < token.length && token.startsWith(word));
// Beigaben, die das Produkt nicht ändern („Bio Äpfel“ ist „Äpfel“). Jedes andere zusätzliche Wort macht den Vorschlag unsicher.
const FILLER = new Set(['bio', 'frisch', 'frische', 'lose']);

/* Name in der App für eine Bonzeile. 1. Was ihr schon einmal zugeordnet habt („gemerkt“), 2. ein bekannter Name, wenn die Bonzeile sicher dasselbe Produkt ist
   („Vorschlag“): alle Wörter des Namens kommen vor (gleich oder abgekürzt) und die Bonzeile enthält nichts anderes außer Beigaben wie „Bio“, 3. der aufgeräumte Bontext.
   Im Zweifel gibt es keinen Vorschlag: Der Preis gehört zum Namen, ein falscher Treffer würde einem anderen Produkt den Preis geben.
   `aliases`: [{ from, name }], `known`: Namen, die die App schon kennt. */
export function suggestName(item, aliases = [], known = []) {
  const key = aliasKey(item.name);
  const hit = aliases.find(row => !row.deletedAt && row.from === key);
  if (hit) return { name: hit.name, how: 'gemerkt', key };
  const words = key.split(' ').filter(Boolean);
  let best = null;
  for (const name of known) {
    const tokens = wordsOf(name);
    if (!tokens.length || !tokens.every(token => words.some(word => closeWord(word, token)))) continue;
    if (!words.every(word => FILLER.has(word) || tokens.some(token => closeWord(word, token)))) continue;   // ein weiteres Wort („Saft“, „Tasche“, „cherry“): unsicher
    const rank = [tokens.filter(token => words.includes(token)).length, tokens.length, -name.length];
    if (!best || better(rank, best.rank)) best = { name, rank };
  }
  // Derselbe Name (nur anders geschrieben, z. B. GROSSBUCHSTABEN) ist kein Vorschlag, den man prüfen müsste.
  return best ? { name: best.name, how: productKey(best.name) === productKey(item.name) ? '' : 'Vorschlag', key } : { name: item.name, how: '', key };
}

// Welches Geschäft der App passt zum Namen auf dem Bon („rewe“ → „Rewe“)? Gibt die Kennung oder '' zurück.
export function storeForChain(chain, stores) {
  if (!chain) return '';
  return stores.find(store => !store.deletedAt && productKey(store.name).includes(chain))?.id || '';
}
