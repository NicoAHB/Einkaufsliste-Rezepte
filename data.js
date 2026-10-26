/* Datenmodell v1. Dieses Modul benötigt weder DOM noch externe Bibliotheken. */
import { offerUrl, rememberedPrice, validQuote } from './prices.js';
export const collections = ['stores', 'items', 'recipes', 'ingredients', 'prices'];
export const clone = value => JSON.parse(JSON.stringify(value));
export const uid = () => crypto.randomUUID();
export const active = rows => rows.filter(row => !row.deletedAt);

export function emptyData() {
  return { version: 1, updatedAt: new Date().toISOString(), stores: [], items: [],
    recipes: [], ingredients: [], prices: [], sync: { applied: [] } };
}

export function validate(data) {
  if (!data || data.version !== 1) throw new Error('Unbekannte Datenversion. Bitte die App aktualisieren. Die Datei wird nicht verändert.');
  if (!data.sync || !Array.isArray(data.sync.applied) || data.sync.applied.some(id => typeof id !== 'string')) {
    throw new Error('Die Synchronisierungsdaten fehlen oder sind beschädigt. Bitte ein Backup prüfen.');
  }
  for (const key of collections) {
    // Optionale Erweiterung von v1: ältere Dateien besitzen noch keine Preisliste.
    if (key === 'prices' && data.prices === undefined) continue;
    if (!Array.isArray(data[key])) throw new Error(`Ungültige Datendatei: ${key} fehlt.`);
    const ids = new Set();
    for (const row of data[key]) {
      if (!row || typeof row.id !== 'string' || !row.id || ids.has(row.id) ||
          !Number.isFinite(Date.parse(row.createdAt)) || !Number.isFinite(Date.parse(row.updatedAt)) ||
          (row.deletedAt !== null && !Number.isFinite(Date.parse(row.deletedAt))) ||
          (row._clock !== undefined && (!row._clock || typeof row._clock !== 'object' || Array.isArray(row._clock)))) {
        throw new Error(`Ungültiger Eintrag in ${key}. Die Datei wird nicht verändert.`);
      }
      ids.add(row.id);
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
      if (key === 'items' && row.onSale !== undefined && typeof row.onSale !== 'boolean') throw new Error('Ungültige Angebotsmarkierung.');
      if (key === 'prices' && (typeof row.name !== 'string' || typeof row.storeId !== 'string' || !validQuote(row.quote))) throw new Error('Ungültiger gemerkter Preis.');
      if (key === 'recipes' && (typeof row.name !== 'string' || !Number.isFinite(row.servings) ||
          row.servings <= 0 || typeof row.instructions !== 'string' || !Array.isArray(row.tags) ||
          row.tags.some(tag => typeof tag !== 'string'))) throw new Error('Ungültiges Rezept.');
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

export function merge(data, operations) {
  const next = clone(validate(data));
  next.prices ||= [];
  const applied = new Set(next.sync.applied);
  for (const op of operations) {
    if (applied.has(op.id)) continue;
    if (!collections.includes(op.collection)) throw new Error('Unbekannte Änderungsart.');
    let row = next[op.collection].find(entry => entry.id === op.entityId);
    if (!row) {
      row = { id: op.entityId, createdAt: op.at, updatedAt: op.at, deletedAt: null, _clock: {} };
      next[op.collection].push(row);
    }
    row._clock ||= {};
    for (const [field, value] of Object.entries(op.patch)) {
      if (['id', 'createdAt', 'updatedAt', '_clock', '__proto__', 'constructor', 'prototype'].includes(field)) continue;
      const clock = row._clock[field];
      const previous = clock ? `${clock.at}|${clock.id}` : `${row.createdAt}|`;
      if (`${op.at}|${op.id}` > previous) {
        row[field] = clone(value);
        row._clock[field] = { at: op.at, id: op.id };
      }
    }
    row.updatedAt = [row.updatedAt, op.at].sort().at(-1);
    applied.add(op.id);
    next.updatedAt = [next.updatedAt, op.at].sort().at(-1);
  }
  next.sync.applied = [...applied];
  return validate(next);
}

export function positive(value) {
  const number = Number(String(value).trim().replace(',', '.'));
  if (!Number.isFinite(number) || number <= 0) throw new Error('Bitte eine Menge größer als 0 eingeben, zum Beispiel 1 oder 0,5.');
  return number;
}

export function ingredientItems(ingredients, recipeId, storeId, factor, actor, at, history = []) {
  return active(ingredients).filter(row => row.recipeId === recipeId).map(row =>
    operation('items', uid(), { storeId, name: row.name, quantity: row.quantity * factor,
      unit: row.unit, checked: false, createdBy: actor,
      price: rememberedPrice(history, storeId, row.name, row.unit), onSale: false }, actor, at));
}
