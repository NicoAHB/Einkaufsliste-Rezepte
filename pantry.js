/* Leichter Haushaltsvorrat: vorhanden/aufgebraucht, keine automatische Mengenbuchhaltung.
   Die App speichert jeden Eintrag und jedes Feld mit ihrer vorhandenen Offline-/Merge-Logik. */
import { pantryKey, pantryRows } from './data.js';
import { isCategory, itemCategory, suggestCategory } from './categories.js';
import { searchProductText } from './product-catalog.js';

export function filterPantry(rows, { query = '', status = 'all', category = '' } = {}) {
  const words = searchProductText(query).split(/\s+/).filter(Boolean);
  return pantryRows(rows).filter(row => (status === 'all' || (status === 'out' ? row.available === false : row.available !== false)) &&
    (!category || itemCategory(row) === category) && words.every(word => searchProductText(row.name).includes(word)))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

// Gleiche erstmalige Anlage auf zwei Geräten ergibt dieselbe ID. Bestehende/alte IDs bleiben erhalten.
// Umbenannte Datensätze dürfen die Kennung für den alten Namen nicht versehentlich belegen.
function newPantryId(name, rows) {
  let id = `pantry-${encodeURIComponent(pantryKey(name))}`;
  while (rows.some(row => row.id === id && pantryKey(row.name) !== pantryKey(name))) id += '-new';
  return id;
}
export function pantryChanges(products, rows = []) {
  const changes = [], seen = new Set();
  for (const product of products) {
    const name = String(typeof product === 'string' ? product : product?.name || '').trim().replace(/\s+/g, ' ');
    if (!name || name.length > 120) throw new Error('Bitte einen Produktnamen mit 1 bis 120 Zeichen eingeben.');
    const key = pantryKey(name); if (seen.has(key)) continue; seen.add(key);
    const matches = rows.filter(row => pantryKey(row.name) === key), live = matches.filter(row => !row.deletedAt);
    if (live.length) {
      for (const row of live) if (row.available === false) changes.push({ id: row.id, patch: { available: true } });
      continue;
    }
    const existing = [...matches].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))[0];
    if (existing) { changes.push({ id: existing.id, patch: { available: true, deletedAt: null } }); continue; }
    const category = isCategory(product?.category) ? product.category : suggestCategory(name) || 'sonstiges';
    const imageKey = typeof product?.imageKey === 'string' ? product.imageKey : null;
    changes.push({ id: newPantryId(name, rows), patch: { name, category, imageKey, available: true, deletedAt: null } });
  }
  return changes;
}

// Nachkaufen ist eine ausdrückliche Aktion; offene vorhandene Artikel werden niemals blind aufgestockt.
export function pantryOnList(row, items, storeId) {
  return items.some(item => !item.deletedAt && !item.checked && item.storeId === storeId && pantryKey(item.name) === pantryKey(row.name));
}
