/* Alltagssortiment (2.65): feste Kennungen, sinnvolle Startmengen und lokale Beispielbilder.
   Jede Bildtafel enthält 8 × 4 Motive, zeilenweise von links nach rechts.
   Favoriten sind gemeinsame Daten; Auswahl und Suchfilter bleiben ein lokaler Entwurf. */
import { CATEGORIES, isCategory, suggestCategory } from './categories.js';
import { matchProductName } from './product-names.js';
import { productKey } from './prices.js';

import { PRODUCT_ROWS, PRODUCT_SHEETS } from './product-catalog-data.js';

export const PRODUCT_PHOTOS = PRODUCT_SHEETS.map(name => `assets/products/${name}.webp`);
export const GROCERY_PRODUCTS = Object.freeze(PRODUCT_ROWS.map(([id, name, quantity, unit, category], index) => Object.freeze({
  id, name, quantity, unit, category, sheet: Math.floor(index / 32), cell: index % 32, own: false
})));
const byId = new Map(GROCERY_PRODUCTS.map(product => [product.id, product]));
export const productById = id => byId.get(id) || null;
export const favoriteId = product => `favorite-${encodeURIComponent(product.id)}`;
export const searchProductText = value => String(value || '').trim().toLocaleLowerCase('de')
  .replace(/ä|ae/g, 'a').replace(/ö|oe/g, 'o').replace(/ü|ue/g, 'u').replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ');
const validAmount = value => Number.isFinite(value) && value > 0;
export function ownProduct(name, extra = {}) {
  name = String(name || '').trim().slice(0, 120);
  return { id: `own-${productKey(name)}`, name, quantity: validAmount(extra.quantity) ? extra.quantity : 1,
    unit: typeof extra.unit === 'string' && extra.unit.trim() ? extra.unit.trim().slice(0, 30) : 'Stück',
    category: isCategory(extra.category) ? extra.category : suggestCategory(name) || 'sonstiges',
    ...(typeof extra.imageKey === 'string' ? { imageKey: extra.imageKey } : {}), own: true };
}
// Nur genaue Namen teilen sich ein Katalogbild. „Apfeltasche“ bekommt niemals das Foto von „Äpfel“.
export function productLibrary(history = [], favorites = [], pantry = []) {
  const products = new Map(GROCERY_PRODUCTS.map(product => [productKey(product.name), { ...product, count: 0 }]));
  const latest = new Map(), latestImage = new Map();
  for (const row of history) {
    if (!row?.name?.trim()) continue;
    const key = productKey(row.name), previous = products.get(key) || { ...ownProduct(row.name, row), count: 0 };
    previous.count += (Number(row.weight) || 1) + (row._adds?.length || 0);
    const stamp = row.updatedAt || row.createdAt || '';
    if (previous.own && stamp >= (latest.get(key) || '')) { Object.assign(previous, ownProduct(row.name, row)); latest.set(key, stamp); }
    if (row.imageKey && stamp >= (latestImage.get(key) || '')) { previous.imageKey = row.imageKey; latestImage.set(key, stamp); }
    products.set(key, previous);
  }
  // Eigene Vorräte sind auswählbar, zählen dadurch aber nicht als häufiger gekauft.
  for (const row of pantry.filter(row => !row.deletedAt)) {
    if (!row?.name?.trim()) continue;
    const key = productKey(row.name), product = products.get(key) || { ...ownProduct(row.name, row), count: 0 };
    if (row.imageKey) product.imageKey = row.imageKey;
    products.set(key, product);
  }
  for (const row of favorites.filter(row => !row.deletedAt)) {
    const catalog = productById(row.productId), key = productKey(catalog?.name || row.name);
    const product = products.get(key) || { ...ownProduct(row.name, row), count: 0 };
    product.favorite = row;
    if (validAmount(row.quantity)) product.quantity = row.quantity;
    if (row.unit?.trim()) product.unit = row.unit;
    if (row.imageKey) product.imageKey = row.imageKey;
    products.set(key, product);
  }
  return [...products.values()];
}
export function filterProducts(products, { mode = 'all', query = '', category = '' } = {}) {
  const words = searchProductText(query).split(/\s+/).filter(Boolean);
  const eligible = products.filter(product => (!category || product.category === category) &&
    (mode === 'favorites' ? product.favorite : mode === 'frequent' ? product.count >= 2 : mode === 'own' ? product.own : words.length || !product.own));
  let found = eligible.filter(product => words.every(word => searchProductText(product.name).includes(word)));
  // Erst die normale Suche; bei Tippfehlern passende ganze Namen anbieten.
  if (!found.length && words.length) {
    const near = new Set(matchProductName(query, eligible).suggestions);
    found = eligible.filter(product => near.has(product.name));
  }
  return found.sort((a, b) => (mode === 'frequent' ? b.count - a.count : 0) ||
    CATEGORIES.findIndex(group => group.id === a.category) - CATEGORIES.findIndex(group => group.id === b.category) || a.name.localeCompare(b.name, 'de'));
}
export function selectedProducts(selection) {
  return [...selection.values()].map(product => {
    const quantity = Number(String(product.quantity).trim().replace(',', '.')), unit = String(product.unit || '').trim();
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000) throw new Error(`„${product.name}“: Bitte eine Menge zwischen 0 und 1.000.000 eingeben (größer als 0).`);
    if (!unit || unit.length > 30) throw new Error(`„${product.name}“: Bitte eine Einheit eingeben (höchstens 30 Zeichen).`);
    return { name: product.name, quantity, unit, category: product.category, ...(product.purchaseUnit!==undefined?{purchaseUnit:product.purchaseUnit,purchaseMeasure:product.purchaseMeasure,purchaseAt:product.purchaseAt}:{}), ...(product.imageKey ? { imageKey: product.imageKey } : {}) };
  });
}

// Vorratsauswahl ist kein Wunschzettel: nur Lebensmittel und Drogerie-/Haushaltsbedarf.
export const PANTRY_BASIC_IDS = Object.freeze(['salz','pfeffer','paprikapulver','curry','oregano-getrocknet','zimt','mehl','zucker','backpulver','nudeln','reis','haferflocken','linsen','kichererbsen','kidneybohnen','tomatenstuecke','passierte-tomaten','tomatenmark','olivenoel','rapsoel','essig','bruehe','zwiebeln','knoblauch','kartoffeln','eier','milch','butter']);
const basicIds = new Set(PANTRY_BASIC_IDS);
const noPantryIds = new Set(['katzenfutter','hundefutter','waescheklammern','waeschenetz','frischhaltedosen','trinkflasche','schnuller','babyflasche', ...GROCERY_PRODUCTS.filter(p => p.sheet === 30 && p.cell >= 20).map(p => p.id), ...GROCERY_PRODUCTS.filter(p => p.sheet === 31 && !['schuhcreme','impraegnierspray','insektenschutz'].includes(p.id)).map(p => p.id)]);
const catalogNames = new Map(GROCERY_PRODUCTS.map(p => [productKey(p.name), p]));
export function pantryProductAllowed(product) {
  const known = byId.get(product.id) || catalogNames.get(productKey(product.name));
  if (known) return known.category !== 'sonstiges' && !noPantryIds.has(known.id);
  // Eindeutige Nicht-Vorräte auch bei selbst eingegebenen Namen ausschließen.
  return !/(?:^| )(?:tv|fernseher|smart ?tv|television|laptop|notebook|computer|monitor|smartphone|handy|tablet|konsole|playstation|xbox|kopfhorer|ladekabel|drucker|blumenerde|rasenmaher|gartenmobel|sofa|sessel|regal|springseil)(?: |$)/.test(searchProductText(product.name));
}
export function pantryProductLibrary(history = [], favorites = [], pantry = []) {
  const ownPantry = new Set(pantry.filter(p => !p.deletedAt).map(p => productKey(p.name)));
  const allowed = p => pantryProductAllowed(p) && (catalogNames.has(productKey(p.name)) || (p.category && p.category !== 'sonstiges') || ownPantry.has(productKey(p.name)));
  return productLibrary(history.filter(allowed), favorites.filter(allowed), pantry.filter(allowed)).filter(allowed);
}
export const isPantryBasic = product => basicIds.has(product.id);
