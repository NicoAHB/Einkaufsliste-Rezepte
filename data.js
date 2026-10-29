/* Datenmodell v1. Dieses Modul benötigt weder DOM noch externe Bibliotheken. */
import { offerUrl, productKey, unitSpec, validQuote } from './prices.js';
import { NO_AMOUNT } from './recipe-import.js';
import { learnCategories, suggestCategory, validAisles } from './categories.js';
// `prices`, `meals`, `pantry`, `aliases`, `templates` (Einkaufsvorlagen) und `purchases` (Ausgaben) und `budgets` (Monatsbudget) sind optionale Erweiterungen von v1: ältere Dateien besitzen sie noch nicht.
export const collections = ['stores', 'items', 'recipes', 'ingredients', 'prices', 'meals', 'pantry', 'aliases', 'templates', 'purchases', 'budgets'];
const optionalCollections = ['prices', 'meals', 'pantry', 'aliases', 'templates', 'purchases', 'budgets'];
export const clone = value => JSON.parse(JSON.stringify(value));
export const uid = () => crypto.randomUUID();
export const active = rows => rows.filter(row => !row.deletedAt);

export function emptyData() {
  return { version: 1, updatedAt: new Date().toISOString(), stores: [], items: [],
    recipes: [], ingredients: [], prices: [], meals: [], pantry: [], aliases: [], templates: [], purchases: [], budgets: [], sync: { applied: [] } };
}

// Fotos liegen als Dateien im Daten-Repository; die Kennung wird Teil eines Dateipfads und darf nur harmlose Zeichen enthalten.
export const validPhotoId = id => typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id);
export const validDay = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

// Prüft einen einzelnen Datensatz; auch merge() nutzt das, um verwaiste Änderungen zu erkennen.
export function validateRow(key, row) {
  if (!row || typeof row.id !== 'string' || !row.id ||
      !Number.isFinite(Date.parse(row.createdAt)) || !Number.isFinite(Date.parse(row.updatedAt)) ||
      (row.deletedAt !== null && !Number.isFinite(Date.parse(row.deletedAt))) ||
      (row._clock !== undefined && (!row._clock || typeof row._clock !== 'object' || Array.isArray(row._clock)))) {
    throw new Error(`Ungültiger Eintrag in ${key}. Die Datei wird nicht verändert.`);
  }
  if (key === 'stores' && typeof row.name !== 'string') throw new Error('Geschäft ohne Namen.');
  // `anywhere` (Version 2.6): ob „Im Laden“ Artikel ohne Geschäft angezeigt werden; fehlt oder null = Voreinstellung nach dem Namen (siehe shop.js).
  if (key === 'stores' && row.anywhere !== undefined && row.anywhere !== null && typeof row.anywhere !== 'boolean') throw new Error('Ungültige Einstellung für Artikel ohne Geschäft.');
  // `separate` (Version 2.30): eigene Liste, nur sichtbar, wenn das Geschäft gewählt ist; fehlt oder null = normales Geschäft.
  if (key === 'stores' && row.separate !== undefined && row.separate !== null && typeof row.separate !== 'boolean') throw new Error('Ungültige Einstellung für eine eigene Liste.');
  // `symbol` (Version 2.31): Geschäft als Bild statt Name anzeigen ('gift') oder ausdrücklich nicht ('none'); fehlt oder null = Voreinstellung nach dem Namen (siehe brand.js).
  if (key === 'stores' && row.symbol !== undefined && row.symbol !== null && !['gift', 'none'].includes(row.symbol)) throw new Error('Ungültiges Symbol für ein Geschäft.');
  // `aisles` (Version 2.37): eigene Reihenfolge der Gänge in diesem Geschäft (Kategorie-Kennungen); fehlt oder null = Standardweg.
  if (key === 'stores' && !validAisles(row.aisles)) throw new Error('Ungültige Reihenfolge der Gänge.');
  if (key === 'stores' && row.offersUrl !== undefined) {
    if (typeof row.offersUrl !== 'string') throw new Error('Ungültiger Angebotslink.');
    offerUrl(row.offersUrl);
  }
  if (key === 'items' || key === 'ingredients') {
    if (typeof row.name !== 'string' || typeof row.unit !== 'string' ||
        !Number.isFinite(row.quantity) || row.quantity <= 0 ||
        typeof row[key === 'items' ? 'storeId' : 'recipeId'] !== 'string') throw new Error('Ungültige Zutat oder ungültiger Artikel.');
  }
  if (key === 'items' && (typeof row.checked !== 'boolean' || typeof row.createdBy !== 'string')) {
    throw new Error('Artikel ohne gültigen Status oder Namen der Person.');
  }
  if (key === 'items' && row.price !== undefined && row.price !== null && !validQuote(row.price)) throw new Error('Ungültiger Artikelpreis.');
  if (key === 'items' && row.salePrice !== undefined && row.salePrice !== null && !validQuote(row.salePrice)) throw new Error('Ungültiger Angebotspreis.');
  if (key === 'items' && row.onSale !== undefined && typeof row.onSale !== 'boolean') throw new Error('Ungültige Angebotsmarkierung.');
  if ((key === 'items' || key === 'prices') && row.saleUntil !== undefined && row.saleUntil !== null && row.saleUntil !== '' && !validDay(row.saleUntil)) throw new Error('Ungültiges Ende des Angebots.');
  if (key === 'items' && row.category !== undefined && row.category !== null && typeof row.category !== 'string') throw new Error('Ungültige Kategorie.');
  // Mengenzuwächse (Version 1.8): interne Liste, siehe merge().
  if (key === 'items' && row._adds !== undefined && (!Array.isArray(row._adds) || !row._base || row._adds.some(entry => !entry || typeof entry.id !== 'string' ||
      !Number.isFinite(Date.parse(entry.at)) || !(entry.quantity > 0) || typeof entry.unit !== 'string'))) throw new Error('Ungültige Mengenänderungen.');
  if (key === 'prices' && (typeof row.name !== 'string' || typeof row.storeId !== 'string' || !validQuote(row.quote))) throw new Error('Ungültiger gemerkter Preis.');
  if (key === 'prices' && row.regularQuote !== undefined && row.regularQuote !== null && !validQuote(row.regularQuote)) throw new Error('Ungültiger gemerkter Normalpreis.');
  // Optional (Version 1.8): Preisentwicklung { was, at }. Seit 2.40 nicht mehr berechnet; ältere Notizen behalten das Feld.
  if (key === 'prices' && row.trend !== undefined && row.trend !== null && (!validQuote(row.trend.was) || !Number.isFinite(Date.parse(row.trend.at)))) throw new Error('Ungültige Preisentwicklung.');
  // Optional (Version 2.40): `src` 'bon' = vom Nutzer geprüfte Kassenbonposition (bezahlter Preis; ohne das Feld ist die Herkunft ungeklärt und die Notiz wird zur Prüfung angeboten),
  // `variant` = Sorte oder genaue Bezeichnung (z. B. „Gala“), `receipt` = Originaltext der Bonzeile, `receiptKey` = Schlüssel gegen doppeltes Übernehmen derselben Bonposition.
  if (key === 'prices' && row.src !== undefined && row.src !== 'bon') throw new Error('Ungültige Herkunft des Preises.');
  if (key === 'prices' && ((row.variant !== undefined && (typeof row.variant !== 'string' || row.variant.length > 80)) || (row.receipt !== undefined && (typeof row.receipt !== 'string' || row.receipt.length > 200)) ||
      (row.receiptKey !== undefined && (typeof row.receiptKey !== 'string' || row.receiptKey.length > 300)))) throw new Error('Ungültige Angaben zum bezahlten Preis.');
  if (key === 'recipes' && (typeof row.name !== 'string' || !Number.isFinite(row.servings) ||
      row.servings <= 0 || typeof row.instructions !== 'string' || !Array.isArray(row.tags) ||
      row.tags.some(tag => typeof tag !== 'string'))) throw new Error('Ungültiges Rezept.');
  // Optionale Erweiterung von v1: Quelle eines importierten Rezepts.
  if (key === 'recipes' && row.sourceUrl !== undefined && typeof row.sourceUrl !== 'string') throw new Error('Ungültige Rezeptquelle.');
  if (key === 'recipes' && row.favorite !== undefined && typeof row.favorite !== 'boolean') throw new Error('Ungültige Favoritenmarkierung.');
  if (key === 'recipes' && row.lastCookedAt !== undefined && row.lastCookedAt !== null && !Number.isFinite(Date.parse(row.lastCookedAt))) throw new Error('Ungültiges Kochdatum.');
  if (key === 'recipes' && row.photoId !== undefined && row.photoId !== null && !validPhotoId(row.photoId)) throw new Error('Ungültige Foto-Kennung.');
  if (key === 'meals' && (!validDay(row.date) || !Number.isFinite(row.servings) || row.servings <= 0 ||
      (row.recipeId !== undefined && typeof row.recipeId !== 'string') || (row.title !== undefined && typeof row.title !== 'string') ||
      !(row.recipeId || row.title) || (row.done !== undefined && typeof row.done !== 'boolean'))) throw new Error('Ungültiger Eintrag im Wochenplan.');
  // `listedServings` und `listedAt` (Version 2.47): für wie viele Portionen die Zutaten dieses Gerichts schon auf die Einkaufsliste gesetzt wurden und wann; fehlt oder null = noch nicht.
  if (key === 'meals' && ((row.listedServings !== undefined && row.listedServings !== null && (!Number.isFinite(row.listedServings) || row.listedServings <= 0)) ||
      (row.listedAt !== undefined && row.listedAt !== null && !Number.isFinite(Date.parse(row.listedAt))))) throw new Error('Ungültige Angabe zur Übernahme auf die Einkaufsliste.');
  // `listedRows` (Version 2.50): die Zutaten des Rezepts („Name|Menge|Einheit“) zum Zeitpunkt der Übernahme, um spätere Änderungen am Rezept zu erkennen.
  if (key === 'meals' && row.listedRows !== undefined && row.listedRows !== null && (!Array.isArray(row.listedRows) || row.listedRows.length > 80 || row.listedRows.some(entry => typeof entry !== 'string' || entry.length > 200))) throw new Error('Ungültige Angabe zur Übernahme auf die Einkaufsliste.');
  if (key === 'pantry' && (typeof row.name !== 'string' || !row.name.trim())) throw new Error('Vorrat ohne Namen.');
  // Einkaufsvorlage (Version 2.5): Name und bis zu 80 Artikel { name, quantity, unit, storeId? }.
  if (key === 'templates' && (typeof row.name !== 'string' || !row.name.trim() || row.name.length > 60 || !Array.isArray(row.items) || row.items.length > 80 ||
      row.items.some(entry => !entry || typeof entry.name !== 'string' || !entry.name.trim() || !Number.isFinite(entry.quantity) || entry.quantity <= 0 ||
        typeof entry.unit !== 'string' || (entry.storeId !== undefined && typeof entry.storeId !== 'string')))) throw new Error('Ungültige Einkaufsvorlage.');
  // Ausgabe (Version 2.15): Tag, Betrag in Cent, optional Geschäft (Kennung und gemerkter Name), Notiz und Herkunft („bon“ = aus Kassenbon-Foto/-Screenshot, „hand“).
  if (key === 'purchases' && (!validDay(row.date) || !Number.isSafeInteger(row.cents) || row.cents < 1 || row.cents > 99999999 ||
      (row.storeId !== undefined && typeof row.storeId !== 'string') || (row.storeName !== undefined && (typeof row.storeName !== 'string' || row.storeName.length > 80)) ||
      (row.note !== undefined && (typeof row.note !== 'string' || row.note.length > 200)) || (row.source !== undefined && !['bon', 'hand'].includes(row.source)) ||
      (row.estimate !== undefined && (!Number.isSafeInteger(row.estimate) || row.estimate < 1 || row.estimate > 99999999)))) throw new Error('Ungültiger Einkaufsbetrag.');
  // Monatsbudget (Version 2.21): eine Zeile `monthly` mit `cents` (0 = kein Budget).
  if (key === 'budgets' && (!Number.isSafeInteger(row.cents) || row.cents < 0 || row.cents > 99999999)) throw new Error('Ungültiges Budget.');
  if (key === 'aliases' && (typeof row.from !== 'string' || !row.from.trim() || typeof row.name !== 'string' || !row.name.trim())) throw new Error('Ungültige Namenszuordnung.');
  // `variant` (Version 2.40): Sorte, die zur Zuordnung gehört („gala äpfel“ → Äpfel, Gala).
  if (key === 'aliases' && row.variant !== undefined && (typeof row.variant !== 'string' || row.variant.length > 80)) throw new Error('Ungültige Namenszuordnung.');
  // `confirmed` (Version 2.47): Wer eine fragwürdige alte Zuordnung (z. B. vom Kassenbon) ausdrücklich behält, setzt sie auf true; sie wirkt dann weiter.
  if (key === 'aliases' && row.confirmed !== undefined && typeof row.confirmed !== 'boolean') throw new Error('Ungültige Namenszuordnung.');
}

// Stand dieser App für die Datei. Wer die Datei später so ändert, dass ältere Apps sie falsch lesen oder beschädigen würden, trägt in `sync.minRev` die
// nötige Mindestzahl ein; eine App mit kleinerer Zahl liest die Datei dann nicht mehr und schreibt nichts (sie verweist auf das Aktualisieren).
// Apps bis Version 2.36 kennen das Feld noch nicht. Revision 2: Marken für die Liste der angewendeten Änderungen (`sync.marks`, siehe compact.js).
// Revision 3 (Version 2.40): bezahlte Preise mit Sorte (`prices.variant`, `prices.src`); eine ältere App würde sie beim Aufräumen zusammenwerfen.
export const SCHEMA_REV = 3;
export function validate(data) {
  if (!data || data.version !== 1) throw new Error('Unbekannte Datenversion. Bitte die App aktualisieren. Die Datei wird nicht verändert.');
  if (data.sync?.minRev !== undefined && (!Number.isInteger(data.sync.minRev) || data.sync.minRev < 1)) throw new Error('Die Synchronisierungsdaten sind beschädigt. Bitte ein Backup prüfen.');
  if (data.sync?.minRev > SCHEMA_REV) throw new Error('Diese App-Version ist für die Daten zu alt. Bitte die App ganz schließen und neu öffnen (Aktualisierung), notfalls zweimal. Die Datei wird nicht verändert.');
  if (!data.sync || !Array.isArray(data.sync.applied) || data.sync.applied.some(id => typeof id !== 'string')) {
    throw new Error('Die Synchronisierungsdaten fehlen oder sind beschädigt. Bitte ein Backup prüfen.');
  }
  // Optional: aus dem Aufräumen gemerkte Namen (siehe compact.js).
  if (data.names !== undefined && (!Array.isArray(data.names) || data.names.some(entry => !entry || typeof entry.name !== 'string' || !Number.isFinite(entry.count) || typeof entry.at !== 'string'))) {
    throw new Error('Ungültige Namensliste. Die Datei wird nicht verändert.');
  }
  for (const key of collections) {
    if (optionalCollections.includes(key) && data[key] === undefined) continue;
    if (!Array.isArray(data[key])) throw new Error(`Ungültige Datendatei: ${key} fehlt.`);
    const ids = new Set();
    for (const row of data[key]) {
      if (row && ids.has(row.id)) throw new Error(`Ungültiger Eintrag in ${key}. Die Datei wird nicht verändert.`);
      validateRow(key, row);
      ids.add(row.id);
    }
  }
  return data;
}

// Feldweise Konfliktauflösung: Zeitstempel + eindeutige Operations-ID entscheiden.
// Löschmarkierungen werden wie Felder behandelt. Nur eine ausdrückliche
// Wiederherstellung ändert deletedAt; gewöhnliches Bearbeiten belebt nichts wieder.
export function operation(collection, entityId, patch, actor, at = new Date().toISOString()) {
  return { id: uid(), collection, entityId, patch, actor, at };
}

// Ältere Änderungen zuerst: Sonst könnte eine spätere Änderung den Datensatz anlegen und die Anlage-Änderung
// (mit den Pflichtfeldern) wegen ihres früheren Zeitstempels verworfen werden. Wer gewinnt, ändert sich dadurch nicht.
const byTime = (a, b) => a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/* Mengen sind kein gewöhnliches Feld. Legen zwei Personen unabhängig voneinander „+1 Milch“ auf einen vorhandenen Artikel, müssen beide
   Zuwächse bleiben (1 + 1 + 1 = 3), egal in welcher Reihenfolge und wie spät die Geräte abgleichen. Ein Zuwachs ist deshalb eine eigene
   Änderung { add: { quantity, unit } }, die der Datensatz in `_adds` sammelt. Die Menge ergibt sich aus dem zuletzt ausdrücklich
   gesetzten Wert (`_base`, wie bisher das jüngste Setzen gewinnt) plus allen Zuwächsen, die jünger als dieses Setzen sind. Das Ergebnis
   hängt nur von den Änderungen ab, nicht von der Reihenfolge, in der sie eintreffen. */
const keyOf = entry => `${entry.at}|${entry.id}`;
function floorKey(row) {
  const keys = [`${row.createdAt}|`];
  for (const field of ['quantity', 'unit', '*']) if (row._clock?.[field]) keys.push(keyOf(row._clock[field]));
  return keys.sort().at(-1);
}
export function foldAdds(base, adds, floor) {
  let current = { quantity: base.quantity, unit: base.unit };
  for (const add of [...adds].sort((a, b) => keyOf(a) < keyOf(b) ? -1 : 1)) {
    if (keyOf(add) <= floor) continue;
    const sum = combineQuantity(current, add);
    if (sum) current = sum;
  }
  return current;
}
// Zuwächse, die zur aktuellen Menge beitragen (jünger als das letzte ausdrückliche Setzen).
export const liveAdds = row => (row._adds || []).filter(entry => keyOf(entry) > floorKey(row));
// Aufräumen: ältere Zuwächse in den Ausgangswert übernehmen. Gibt die Zahl der übernommenen Zuwächse zurück.
export function foldOldAdds(row, cutoff) {
  if (!row._adds) return 0;
  const old = row._adds.filter(entry => entry.at < cutoff);
  if (!old.length) return 0;
  row._base = foldAdds(row._base, old, floorKey(row));
  row._adds = row._adds.filter(entry => entry.at >= cutoff);
  if (!row._adds.length) { delete row._adds; delete row._base; }
  return old.length;
}

export function merge(data, operations) {
  const next = clone(validate(data));
  next.prices ||= []; next.meals ||= []; next.pantry ||= []; next.aliases ||= []; next.templates ||= []; next.purchases ||= []; next.budgets ||= [];
  const applied = new Set(next.sync.applied), created = [], touched = new Set();
  for (const op of [...operations].sort(byTime)) {
    if (applied.has(op.id)) continue;
    if (!collections.includes(op.collection)) throw new Error('Unbekannte Änderungsart.');
    let row = next[op.collection].find(entry => entry.id === op.entityId);
    if (!row) {
      row = { id: op.entityId, createdAt: op.at, updatedAt: op.at, deletedAt: null, _clock: {} };
      next[op.collection].push(row); created.push([op.collection, row]);
    }
    row._clock ||= {};
    for (const [field, value] of Object.entries(op.patch)) {
      if (['id', 'createdAt', 'updatedAt', '_clock', '_base', '_adds', '__proto__', 'constructor', 'prototype'].includes(field)) continue;
      if (field === 'add') {
        if (op.collection === 'items' && value && Number.isFinite(value.quantity) && value.quantity > 0 && typeof value.unit === 'string') {
          row._base ||= { quantity: row.quantity, unit: row.unit };
          row._adds ||= [];
          if (!row._adds.some(entry => entry.id === op.id)) row._adds.push({ id: op.id, at: op.at, quantity: value.quantity, unit: value.unit, by: op.actor });
          touched.add(row);
        }
        continue;
      }
      // „*“ ist die Sammelmarke des Aufräumens: Alle Felder gelten als so alt wie der Datensatz zuletzt geändert wurde.
      const settled = row._clock['*'], clock = row._clock[field];
      let previous = settled ? `${settled.at}|${settled.id}` : `${row.createdAt}|`;
      if (clock && `${clock.at}|${clock.id}` > previous) previous = `${clock.at}|${clock.id}`;
      if (`${op.at}|${op.id}` > previous) {
        if (op.collection === 'items' && row._base && (field === 'quantity' || field === 'unit')) { row._base[field] = clone(value); touched.add(row); }
        row[field] = clone(value);
        row._clock[field] = { at: op.at, id: op.id };
      }
    }
    if ((op.collection === 'prices' && ['src', 'variant', 'receipt', 'receiptKey'].some(field => field in op.patch)) || (op.collection === 'aliases' && 'variant' in op.patch)) {
      next.sync.minRev = Math.max(Number(next.sync.minRev) || 1, 3);   // ab jetzt darf nur noch eine App schreiben, die Sorten kennt
    }
    row.updatedAt = [row.updatedAt, op.at].sort().at(-1);
    applied.add(op.id);
    next.updatedAt = [next.updatedAt, op.at].sort().at(-1);
  }
  for (const row of touched) {
    if (row._adds?.length && row._base) { const current = foldAdds(row._base, row._adds, floorKey(row)); row.quantity = current.quantity; row.unit = current.unit; }
  }
  // Eine Änderung an einem Datensatz, den es nicht mehr gibt (z. B. nach dem Aufräumen auf einem anderen Gerät),
  // legt höchstens einen unvollständigen Datensatz an. Der wird verworfen, statt die ganze Datei ungültig zu machen.
  for (const [collection, row] of created) {
    try { validateRow(collection, row); } catch { next[collection].splice(next[collection].indexOf(row), 1); }
  }
  next.sync.applied = [...applied];
  return validate(next);
}

export function positive(value) {
  const number = Number(String(value).trim().replace(',', '.'));
  if (!Number.isFinite(number) || number <= 0) throw new Error('Bitte eine Menge größer als 0 eingeben, zum Beispiel 1 oder 0,5.');
  return number;
}

// Auch erledigte und gelöschte Artikel bleiben im gemeinsamen Datenbestand.
// Daraus lernen die Vorschläge ohne zusätzliche Datenbank oder Onlinedienst.
/* Vorschläge beim Eintippen: Ein Eintrag passt, wenn sein Name mit dem Getippten beginnt („ap“ → „Apfel“), danach wenn ein späteres Wort so beginnt
   („ba“ → „Bio Bananen“), zuletzt wenn es irgendwo im Namen steht. Umlaute zählen wie ihr Grundbuchstabe („ap“ findet auch „Äpfel“). Innerhalb davon
   kommt vor, was häufiger oder zuletzt vorkam; `weight` eines Eintrags (Standard 1) macht ihn mehr oder weniger wichtig, so stehen eigene Artikel vor
   Zutaten und fest eingebauten Namen. Schreibweisen desselben Wortes („Apfel“/„Äpfel“, „Banane“/„Bananen“) erscheinen nur einmal. */
const fold = text => productKey(text).replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
export function suggestItemNames(items, query, limit = 6) {
  const search = fold(query);
  if (!search) return [];
  const names = new Map();
  for (const item of items) {
    if (typeof item.name !== 'string') continue;
    const name = item.name.trim().replace(/\s+/g, ' '), key = productKey(name), folded = fold(name);
    if (!key || !folded.includes(search)) continue;
    const rank = folded.startsWith(search) ? 0 : folded.split(/[^\p{L}\p{N}]+/u).some(word => word.startsWith(search)) ? 1 : 2;
    const previous = names.get(key), at = item.updatedAt || item.createdAt || '', weight = Number.isFinite(item.weight) ? item.weight : 1;
    names.set(key, { key, rank, name: !previous || at > previous.at ? name : previous.name,
      count: (previous?.count || 0) + weight, at: !previous || at > previous.at ? at : previous.at });
  }
  const seen = new Set(), result = [];
  for (const row of [...names.values()].sort((a, b) => a.rank - b.rank || b.count - a.count || b.at.localeCompare(a.at) || a.name.localeCompare(b.name, 'de'))) {
    const stem = spellingStem(row.name);
    if (seen.has(stem)) continue;
    seen.add(stem); result.push(row.name);
  }
  return result.slice(0, limit);
}

/* Schreibweisen: „Zwiebel“ und „Zwiebeln“, „Tomate“ und „Tomaten“, „Apfel“ und „Äpfel“ meinen denselben Artikel. Die App rät nie still: Sie
   schlägt die bekannte Schreibweise nur vor. Erst wenn die Person sie bestätigt, wird die Zuordnung gemerkt (Sammlung `aliases`) und danach
   automatisch angewendet. */
const PLURAL = ['en', 'er', 'n', 'e'];
export function spellingStem(name) {
  return productKey(name).replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss').split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(word => {
    for (const ending of PLURAL) if (word.length - ending.length >= 2 && word.endsWith(ending)) return word.slice(0, -ending.length);
    return word;
  }).join(' ');
}
// Bekannte Namen, die wie `typed` geschrieben werden könnten, aber anders lauten (nie der genau gleiche Name).
export function spellingVariants(typed, known) {
  const stem = spellingStem(typed);
  if (stem.length < 2) return [];
  const seen = new Set([productKey(typed)]), found = [];
  for (const name of known) {
    const key = productKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    if (spellingStem(name) === stem) found.push(name);
  }
  return found;
}
/* Dasselbe Produkt? (Version 2.48) „Zwiebel“ und „Zwiebeln“, „Tomate“ und „Tomaten“, „Äpfel“ und „Apfel“ führen Rezepte, Wochen-Einkauf und Liste zusammen. Verglichen wird die
   **Grundform** jedes Wortes (`spellingStem`: Groß-/Kleinschreibung, Umlaute und Mehrzahlendungen egal). Roh unterscheiden sich „Zwiebel“ und „Zwiebeln“ nur um 1 von 8 Buchstaben
   (87,5 %); die Grundform ist dieselbe (100 %). Zwei Namen sind dasselbe Produkt, wenn sie gleich viele Wörter haben und jedes Wort dieselbe Grundform hat oder – bei langen Wörtern
   (ab 20 Buchstaben) – zu mindestens 95 % übereinstimmt (das verzeiht dort einen Tippfehler; bei kurzen Wörtern kann ein Buchstabe das Produkt ändern: „Ei“ und „Eis“).
   Nie zusammengeführt wird, wenn eine Zahl darin vorkommt („Cola 1 l“, „Cola 2 l“); andere Wörter bleiben getrennt („rote Zwiebel“, „Zwiebelmett“, „Hafermilch“).
   Ein Name ohne Buchstaben (weniger als 2 Zeichen Grundform) ist nur mit sich selbst gleich. */
export const SAME_PRODUCT = 0.95, LONG_WORD = 20;
function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    previous = row;
  }
  return previous[b.length];
}
// Übereinstimmung zweier Wörter in Prozent (1 = gleich), nach dem Abstand der Buchstaben.
export const wordSimilarity = (a, b) => { const longest = Math.max(a.length, b.length); return longest ? 1 - editDistance(a, b) / longest : 0; };
export function sameProduct(a, b) {
  if (productKey(a) === productKey(b)) return true;
  const left = spellingStem(a), right = spellingStem(b);
  if (left.length < 2 || right.length < 2) return false;
  if (left === right) return true;
  if (/\d/.test(left) || /\d/.test(right)) return false;
  const one = left.split(' '), two = right.split(' ');
  return one.length === two.length && one.every((word, index) => word === two[index] || (Math.max(word.length, two[index].length) >= LONG_WORD && wordSimilarity(word, two[index]) >= SAME_PRODUCT));
}

/* Gemerkte Namen (Sammlung `aliases`) sind von zwei Herkünften. Eine bestätigte **Schreibweise** („Zwiebel“ → „Zwiebeln“) entsteht durch einen Tipp auf den Vorschlag
   „Meinst du dasselbe wie …?“; beide Seiten lassen sich gleich schreiben. Frühere Versionen (2.40 bis 2.43) legten auch Zuordnungen von **Kassenbontext** an
   („apfeltasche“ → „Apfel“, „gala äpfel“ → „Äpfel“ mit Sorte). Ob zwei so verschiedene Namen dasselbe Produkt meinen, kann keine Regel sicher entscheiden: Solche Zuordnungen
   sind **fragwürdig**, wirken nicht mehr und bleiben in der Datei, bis jemand sie prüft („Behalten“ setzt `confirmed`, oder entfernen). */
export const aliasKind = alias => alias.confirmed === true ? 'kept' : (!alias.variant && spellingStem(alias.from) === spellingStem(alias.name)) ? 'spelling' : 'doubtful';
export const aliasApplies = alias => aliasKind(alias) !== 'doubtful';
// Häufig gekaufte Artikel für die Schnellwahl: mindestens `minCount`-mal vorgekommen und gerade nicht offen auf der Liste.
export function frequentItems(history, items, limit = 6, minCount = 2) {
  const open = new Set(active(items).filter(row => !row.checked).map(row => productKey(row.name)));
  const map = new Map();
  for (const row of history) {
    if (typeof row.name !== 'string') continue;
    const key = productKey(row.name);
    if (!key) continue;
    const at = row.updatedAt || row.createdAt || '', entry = map.get(key) || { name: row.name.trim(), unit: '', count: 0, at: '' };
    entry.count += (Number(row.weight) || 1) + (row._adds?.length || 0);
    if (at >= entry.at) { entry.at = at; entry.name = row.name.trim(); if (typeof row.unit === 'string' && row.unit) entry.unit = row.unit; }
    map.set(key, entry);
  }
  return [...map.entries()].filter(([key, entry]) => entry.count >= minCount && !open.has(key)).map(([, entry]) => entry)
    .sort((a, b) => b.count - a.count || b.at.localeCompare(a.at) || a.name.localeCompare(b.name, 'de')).slice(0, limit);
}

// Neue Listenartikel aus fertig umgerechneten Zeilen {name, quantity, unit}. Die Kategorie (zuletzt verwendete für denselben Namen,
// sonst geschätzt) wird vorgeschlagen, aber nie erfunden. Einen Preis bekommt ein neuer Artikel nie von selbst (auch nicht aus früheren Käufen).
export function newItems(rows, storeId, actor, at, items = []) {
  const learned = learnCategories(items);
  return rows.map(row => {
    const category = suggestCategory(row.name, learned);
    return operation('items', uid(), { storeId, name: row.name, quantity: row.quantity, unit: row.unit, checked: false, createdBy: actor,
      price: null, onSale: false, ...(category ? { category } : {}) }, actor, at);
  });
}

// Zutaten „nach Bedarf“ (Salz, Pfeffer) haben keine Menge, die sich umrechnen ließe: Sie landen als 1 Stück auf der Liste.
// Umgerechnete Mengen werden auf drei Stellen gerundet („66,667 g“, nicht 66,66666666666667), nie auf 0.
export const listRow = (row, factor = 1) => {
  if (row.unit === NO_AMOUNT) return { name: row.name, quantity: 1, unit: 'Stück', noAmount: true };
  const quantity = row.quantity * factor, rounded = Math.round(quantity * 1000) / 1000;
  return { name: row.name, quantity: rounded > 0 ? rounded : quantity, unit: row.unit };
};
export function ingredientItems(ingredients, recipeId, storeId, factor, actor, at, items = []) {
  return newItems(active(ingredients).filter(row => row.recipeId === recipeId).map(row => listRow(row, factor)), storeId, actor, at, items);
}

/* Vorrat: Zutaten, die man immer zu Hause hat. Ein Name wie „Salz, Pfeffer“ oder „Salz und Pfeffer“ besteht aus mehreren Teilen
   und zählt nur dann als Vorrat, wenn jeder Teil im Vorrat steht. Klammerzusätze („Zwiebel (rot)“) bleiben unberücksichtigt. */
const nameParts = name => String(name).replace(/\([^)]*\)/g, ' ').split(/\s*(?:,|;|\bund\b)\s*/i).map(part => part.trim().replace(/\s+/g, ' ')).filter(Boolean);
// Der Vorrat vergleicht die Grundform (siehe sameProduct): Steht „Zwiebeln“ im Vorrat, ist das Rezept „Zwiebel“ abgedeckt.
export const pantryKey = name => spellingStem(name) || productKey(name);
export const pantryKeys = rows => new Set(active(rows || []).map(row => pantryKey(row.name)));
export const inPantry = (keys, name) => { const parts = nameParts(name); return parts.length > 0 && parts.every(part => keys.has(pantryKey(part))); };
// Teile der Namen, die noch nicht im Vorrat stehen (ohne Doppelte), zum Merken.
export function pantryAdditions(names, keys) {
  const found = new Map();
  for (const name of names) for (const part of nameParts(name)) { const key = pantryKey(part); if (!keys.has(key) && !found.has(key)) found.set(key, part); }
  return [...found.values()];
}

/* Gleiche Artikel zusammenzählen. Eine Menge wird zu einem offenen Artikel mit demselben Namen im selben Geschäft addiert
   (oder zu „ohne Geschäft“), wenn die Einheiten zusammenpassen; „Zwiebel“ und „Zwiebeln“ sind derselbe Name (siehe sameProduct). Nichts wird geraten: 500 g und 2 Stück bleiben getrennt, ebenso
   „1 Bund“ und „2 EL“. Eine Zutat „nach Bedarf“ wird nicht noch einmal aufgeschrieben, wenn der Artikel schon auf der Liste steht. */
const round3 = number => Math.round(number * 1000) / 1000;
export function combineQuantity(left, right) {
  const a = unitSpec(left.unit), b = unitSpec(right.unit);
  if (a.group !== b.group) return null;
  let result;
  if (a.group === 'weight' || a.group === 'volume') {
    const total = left.quantity * a.factor + right.quantity * b.factor, big = total >= 1000;
    result = { quantity: round3(big ? total / 1000 : total), unit: a.group === 'weight' ? (big ? 'kg' : 'g') : (big ? 'l' : 'ml') };
  } else result = { quantity: round3(left.quantity + right.quantity), unit: left.unit };
  return Number.isFinite(result.quantity) && result.quantity > 0 && result.quantity <= 1e6 ? result : null;
}
// rows: [{name, quantity, unit, noAmount?}]. Ergebnis: neue Zeilen (`fresh`), geänderte vorhandene Artikel (`counted`: id, Name,
// `add`: was dazukommt, `after`: neue Gesamtmenge) und die Zahl der übersprungenen „nach Bedarf“-Zutaten (`skipped`).
export function foldIntoList(rows, storeId, items = []) {
  const pool = active(items).filter(item => item.id && !item.checked && (item.storeId || '') === (storeId || ''))   // nur echte Artikel (mit Kennung), nie gelernte Namen
    .map(item => ({ id: item.id, name: item.name, quantity: item.quantity, unit: item.unit, added: null }));
  const fresh = [], counted = new Map();
  let skipped = 0;
  for (const row of rows) {
    const match = [...pool, ...fresh.map(entry => entry.pool)].find(entry => sameProduct(entry.name, row.name) && (row.noAmount || entry.placeholder || combineQuantity(entry, row)));
    if (!match) {
      const entry = { ...row }; entry.pool = { name: row.name, quantity: row.quantity, unit: row.unit, placeholder: Boolean(row.noAmount), row: entry };
      fresh.push(entry); continue;
    }
    if (row.noAmount) { if (match.id) skipped++; continue; }
    if (match.placeholder) { match.quantity = row.quantity; match.unit = row.unit; match.placeholder = false; if (match.row) { match.row.quantity = row.quantity; match.row.unit = row.unit; delete match.row.noAmount; } continue; }
    const sum = combineQuantity(match, row);
    match.quantity = sum.quantity; match.unit = sum.unit;
    if (match.row) { match.row.quantity = sum.quantity; match.row.unit = sum.unit; }
    else { match.added = match.added ? combineQuantity(match.added, row) : { quantity: row.quantity, unit: row.unit }; counted.set(match.id, match); }
  }
  return { fresh: fresh.map(({ pool: _pool, noAmount: _noAmount, ...row }) => row), skipped,
    counted: [...counted.values()].map(entry => ({ id: entry.id, name: entry.name, add: entry.added, after: { quantity: entry.quantity, unit: entry.unit } })) };
}
/* Gleichzeitig angelegte Doppel („Milch“ auf zwei Geräten) werden deterministisch zusammengeführt: Der zuerst angelegte Artikel bleibt, der
   andere wird gelöscht und seine Menge dem ersten zugerechnet. Beide Geräte erzeugen dieselben Operations-IDs, deshalb wird jede
   Zusammenführung nur einmal angewendet. Artikel mit eigenem Preis bleiben getrennt (die Person wollte einen eigenen Eintrag). */
export function duplicateFolds(items, now = new Date().toISOString()) {
  const groups = new Map();
  for (const item of active(items).filter(row => !row.checked && (row.price === undefined || row.price === null))) {
    const key = `${item.storeId || ''}|${productKey(item.name)}`;
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  const ops = [];
  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    rows.sort((a, b) => `${a.createdAt}|${a.id}`.localeCompare(`${b.createdAt}|${b.id}`));
    const [keep, ...rest] = rows;
    let total = { quantity: keep.quantity, unit: keep.unit };
    for (const dup of rest) {
      const sum = combineQuantity(total, dup);
      if (!sum) continue;
      total = sum;
      ops.push({ id: `fold-add-${dup.id}`, collection: 'items', entityId: keep.id, patch: { add: { quantity: dup.quantity, unit: dup.unit } }, actor: dup.createdBy || 'Unbekannt', at: now },
        { id: `fold-del-${dup.id}`, collection: 'items', entityId: dup.id, patch: { deletedAt: now }, actor: dup.createdBy || 'Unbekannt', at: now });
    }
  }
  return ops;
}

// Fertige Änderungen für eine Liste von Zeilen: neue Artikel und erhöhte Mengen vorhandener Artikel.
// `items` sind die Artikel der Einkaufsliste und nur sie entscheiden, was „schon vorhanden“ ist. `history` (Standard: die Liste selbst) sind
// Artikel und gelernte Namen früherer Einkäufe; sie dienen nur dazu, die Kategorie neuer Artikel vorzuschlagen.
export function addToList(rows, storeId, actor, at, items = [], history = items) {
  const { fresh, counted, skipped } = foldIntoList(rows, storeId, items);
  const created = newItems(fresh, storeId, actor, at, history);
  // Der Zuwachs wird als „add“ gespeichert, nicht als neue Gesamtmenge: So gehen gleichzeitige Zuwächse zweier Geräte nicht verloren (siehe merge).
  const ops = [...created, ...counted.map(entry => operation('items', entry.id, { add: entry.add }, actor, at))];
  return { ops, added: created.length, counted, skipped };
}
