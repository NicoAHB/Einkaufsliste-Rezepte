/* Datenmodell v1. Dieses Modul benötigt weder DOM noch externe Bibliotheken. */
import { offerUrl, productKey, rememberedPrice, validQuote } from './prices.js';
import { NO_AMOUNT } from './recipe-import.js';
import { learnCategories, suggestCategory } from './categories.js';
// `prices`, `meals` und `pantry` sind optionale Erweiterungen von v1: ältere Dateien besitzen sie noch nicht.
export const collections = ['stores', 'items', 'recipes', 'ingredients', 'prices', 'meals', 'pantry'];
const optionalCollections = ['prices', 'meals', 'pantry'];
export const clone = value => JSON.parse(JSON.stringify(value));
export const uid = () => crypto.randomUUID();
export const active = rows => rows.filter(row => !row.deletedAt);

export function emptyData() {
  return { version: 1, updatedAt: new Date().toISOString(), stores: [], items: [],
    recipes: [], ingredients: [], prices: [], meals: [], pantry: [], sync: { applied: [] } };
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
  if (key === 'items' && row.category !== undefined && row.category !== null && typeof row.category !== 'string') throw new Error('Ungültige Kategorie.');
  if (key === 'prices' && (typeof row.name !== 'string' || typeof row.storeId !== 'string' || !validQuote(row.quote))) throw new Error('Ungültiger gemerkter Preis.');
  if (key === 'prices' && row.regularQuote !== undefined && row.regularQuote !== null && !validQuote(row.regularQuote)) throw new Error('Ungültiger gemerkter Normalpreis.');
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
  if (key === 'pantry' && (typeof row.name !== 'string' || !row.name.trim())) throw new Error('Vorrat ohne Namen.');
}

export function validate(data) {
  if (!data || data.version !== 1) throw new Error('Unbekannte Datenversion. Bitte die App aktualisieren. Die Datei wird nicht verändert.');
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

export function merge(data, operations) {
  const next = clone(validate(data));
  next.prices ||= []; next.meals ||= []; next.pantry ||= [];
  const applied = new Set(next.sync.applied), created = [];
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
      if (['id', 'createdAt', 'updatedAt', '_clock', '__proto__', 'constructor', 'prototype'].includes(field)) continue;
      // „*“ ist die Sammelmarke des Aufräumens: Alle Felder gelten als so alt wie der Datensatz zuletzt geändert wurde.
      const settled = row._clock['*'], clock = row._clock[field];
      let previous = settled ? `${settled.at}|${settled.id}` : `${row.createdAt}|`;
      if (clock && `${clock.at}|${clock.id}` > previous) previous = `${clock.at}|${clock.id}`;
      if (`${op.at}|${op.id}` > previous) {
        row[field] = clone(value);
        row._clock[field] = { at: op.at, id: op.id };
      }
    }
    row.updatedAt = [row.updatedAt, op.at].sort().at(-1);
    applied.add(op.id);
    next.updatedAt = [next.updatedAt, op.at].sort().at(-1);
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
export function suggestItemNames(items, query, limit = 6) {
  const search = productKey(query);
  if (!search) return [];
  const names = new Map();
  for (const item of items) {
    if (typeof item.name !== 'string') continue;
    const name = item.name.trim().replace(/\s+/g, ' '), key = productKey(name);
    if (!key || !key.includes(search)) continue;
    const previous = names.get(key), at = item.updatedAt || item.createdAt || '';
    names.set(key, { key, name: !previous || at > previous.at ? name : previous.name,
      count: (previous?.count || 0) + (Number(item.weight) || 1), at: !previous || at > previous.at ? at : previous.at });
  }
  return [...names.values()].sort((a, b) => Number(b.key.startsWith(search)) - Number(a.key.startsWith(search)) ||
    b.count - a.count || b.at.localeCompare(a.at) || a.name.localeCompare(b.name, 'de'))
    .slice(0, limit).map(row => row.name);
}

// Neue Listenartikel aus fertig umgerechneten Zeilen {name, quantity, unit}. Gemerkter Preis und Kategorie
// (zuletzt verwendete für denselben Namen, sonst geschätzt) werden vorgeschlagen, aber nie erfunden.
export function newItems(rows, storeId, actor, at, history = [], items = []) {
  const learned = learnCategories(items);
  return rows.map(row => {
    const category = suggestCategory(row.name, learned);
    return operation('items', uid(), { storeId, name: row.name, quantity: row.quantity, unit: row.unit, checked: false, createdBy: actor,
      price: rememberedPrice(history, storeId, row.name, row.unit), onSale: false, ...(category ? { category } : {}) }, actor, at);
  });
}

// Zutaten „nach Bedarf“ (Salz, Pfeffer) haben keine Menge, die sich umrechnen ließe: Sie landen als 1 Stück auf der Liste.
export function ingredientItems(ingredients, recipeId, storeId, factor, actor, at, history = [], items = []) {
  return newItems(active(ingredients).filter(row => row.recipeId === recipeId).map(row => row.unit === NO_AMOUNT ?
    { name: row.name, quantity: 1, unit: 'Stück' } : { name: row.name, quantity: row.quantity * factor, unit: row.unit }),
  storeId, actor, at, history, items);
}
