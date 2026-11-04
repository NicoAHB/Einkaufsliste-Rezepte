/* Alltagssortiment (2.65): feste Kennungen, sinnvolle Startmengen und lokale Beispielbilder.
   Jede Bildtafel enthält 8 × 4 Motive, zeilenweise von links nach rechts.
   Favoriten sind gemeinsame Daten; Auswahl und Suchfilter bleiben ein lokaler Entwurf. */
import { CATEGORIES, isCategory, suggestCategory } from './categories.js';
import { matchProductName } from './product-names.js';
import { productKey } from './prices.js';
import { pantryKey, pantryRows, stockKey } from './data.js';
import { amountChoice } from './buying.js';

import { canonicalProductName, productGroup, productGroupById } from './product-groups.js';
import { PRODUCT_ROWS, PRODUCT_SHEETS } from './product-catalog-data.js';
import { INTERNATIONAL_CATEGORY, internationalSearchText, isInternationalProduct } from './international-products.js';

export const PRODUCT_PHOTOS = PRODUCT_SHEETS.map(name => `assets/products/${name}.webp`);
export const GROCERY_PRODUCTS = Object.freeze(PRODUCT_ROWS.map(([id, name, quantity, unit, category], index) => Object.freeze({
  id, name, quantity, unit, category, sheet: Math.floor(index / 32), cell: index % 32, own: false
})));
const byId = new Map(GROCERY_PRODUCTS.map(product => [product.id, product]));
export const productById = id => { const group=productGroupById(id), raw=byId.get(group?.id || id); return raw ? {...raw,...(group?{name:group.name,aliases:group.aliases}:{})} : null; };
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
export function productLibrary(history = [], favorites = [], pantry = [], removals = []) {
  const products = new Map(GROCERY_PRODUCTS.map(raw => { const product=productById(raw.id); return [productKey(product.name), { ...product, count:0 }]; }));
  const latest = new Map(), latestImage = new Map();
  for (const row of history) {
    if (!row?.name?.trim()) continue;
    const key = productKey(canonicalProductName(row.name)), previous = products.get(key) || { ...ownProduct(row.name, row), count: 0 };
    previous.count += (Number(row.weight) || 1) + (row._adds?.length || 0);
    const stamp = row.updatedAt || row.createdAt || '';
    if (previous.own && stamp >= (latest.get(key) || '')) { Object.assign(previous, ownProduct(row.name, row)); latest.set(key, stamp); }
    if (row.imageKey && stamp >= (latestImage.get(key) || '')) { previous.imageKey = row.imageKey; latestImage.set(key, stamp); }
    products.set(key, previous);
  }
  // Eigene Vorräte sind auswählbar, zählen dadurch aber nicht als häufiger gekauft.
  for (const row of pantry.filter(row => !row.deletedAt)) {
    if (!row?.name?.trim()) continue;
    const key = productKey(canonicalProductName(row.name)), product = products.get(key) || { ...ownProduct(row.name, row), count: 0 };
    if (row.imageKey) product.imageKey = row.imageKey;
    products.set(key, product);
  }
  for (const row of favorites.filter(row => !row.deletedAt).sort((a,b)=>String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')) || String(a.id || '').localeCompare(String(b.id || '')))) {
    const catalog = productById(row.productId), key = productKey(catalog?.name || canonicalProductName(row.name));
    const product = products.get(key) || { ...ownProduct(row.name, row), count: 0 };
    product.favorite = {...row,ids:[...(product.favorite?.ids || []),row.id]};
    if (validAmount(row.quantity)) product.quantity = row.quantity;
    if (row.unit?.trim()) product.unit = row.unit;
    if (row.imageKey) product.imageKey = row.imageKey;
    products.set(key, product);
  }
  const removed=new Set(removals.filter(row=>!row.deletedAt).map(row=>productKey(row.name)));
  return [...products.values()].filter(product=>!product.own||!removed.has(productKey(product.name)));
}
/** A caller cannot turn a built-in or known spelling into a deletable custom row. */
export function ownProductRemoval(product) {
  if(!product?.own||!product.name?.trim()||product.id!==ownProduct(product.name).id||productGroup(product.name)||GROCERY_PRODUCTS.some(p=>productKey(p.name)===productKey(product.name)))throw new Error('Nur selbst angelegte Produkte können gelöscht werden.');
  // purgedAt: null (2.149): Ein erneutes Löschen ist eine neue Löschung und steht wieder im Papierkorb, auch wenn eine frühere endgültig war.
  return {id:product.id,patch:{name:product.name.trim(),deletedAt:null,purgedAt:null}};
}
/** The international view deliberately shows concrete variants such as sushi rice,
 * while the regular catalog continues to use its established product groups. */
export function internationalProductLibrary(history=[],favorites=[]) {
  return GROCERY_PRODUCTS.filter(isInternationalProduct).map(raw=>{
    const entries=history.filter(row=>productKey(row.name)===productKey(raw.name));
    const fav=favorites.filter(row=>!row.deletedAt&&(row.productId===raw.id||productKey(row.name)===productKey(raw.name))).sort((a,b)=>String(a.updatedAt||'').localeCompare(String(b.updatedAt||''))).at(-1);
    // Genaue Sorten zeigen ihr eigenes Katalogfoto (Sushi-Reis statt des allgemeinen Reisbilds), bis ein Stern ein anderes Bild trägt.
    return {...raw,imageKey:raw.id,count:entries.reduce((n,row)=>n+(Number(row.weight)||1)+(row._adds?.length||0),0),...(fav?{favorite:{...fav,ids:[fav.id]},quantity:fav.quantity,unit:fav.unit,...fav.imageKey?{imageKey:fav.imageKey}:{}}:{})};
  });
}
export function filterProducts(products, { mode = 'all', query = '', category = '', includeOwn = false } = {}) {
  const words = searchProductText(query).split(/\s+/).filter(Boolean);
  const eligible = products.filter(product => (!category || (category===INTERNATIONAL_CATEGORY?isInternationalProduct(product):product.category===category)) &&
    (mode === 'favorites' ? product.favorite : mode === 'frequent' ? product.count >= 2 : mode === 'own' ? product.own : includeOwn || words.length || !product.own));
  let found = eligible.filter(product => words.every(word => searchProductText([product.name,...(product.aliases || productGroup(product.name)?.aliases || []),internationalSearchText(product)].join(' ')).includes(word)));
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
    return { name: product.name, quantity, unit, category: product.category, ...(product.purchaseUnit!==undefined?{purchaseUnit:product.purchaseUnit,purchaseMeasure:product.purchaseMeasure,purchaseAt:product.purchaseAt}:{}), ...amountChoice(product), ...(product.imageKey ? { imageKey: product.imageKey } : {}) };
  });
}

// Vorratsauswahl ist kein Wunschzettel: nur Lebensmittel und Drogerie-/Haushaltsbedarf.
export const PANTRY_BASIC_IDS = Object.freeze(['salz','pfeffer','paprikapulver','curry','oregano-getrocknet','zimt','mehl','zucker','backpulver','nudeln','reis','haferflocken','linsen','kichererbsen','kidneybohnen','tomatenstuecke','passierte-tomaten','tomatenmark','olivenoel','rapsoel','essig','bruehe','butter']);
export const OPTIONAL_PANTRY_BASIC_IDS=Object.freeze(['nudeln','tomatenmark','butter']);
const basicIds = new Set(PANTRY_BASIC_IDS);
const noPantryIds = new Set(['katzenfutter','hundefutter','waescheklammern','waeschenetz','frischhaltedosen','trinkflasche','schnuller','babyflasche', ...GROCERY_PRODUCTS.filter(p => p.sheet === 30 && p.cell >= 20).map(p => p.id), ...GROCERY_PRODUCTS.filter(p => p.sheet === 31 && !['schuhcreme','impraegnierspray','insektenschutz'].includes(p.id)).map(p => p.id)]);
const catalogNames = new Map(GROCERY_PRODUCTS.map(p => [productKey(p.name), p]));
export function pantryProductAllowed(product) {
  const known = byId.get(product.id) || catalogNames.get(productKey(product.name));
  if (known) return known.category !== 'sonstiges' && !noPantryIds.has(known.id);
  // Eindeutige Nicht-Vorräte auch bei selbst eingegebenen Namen ausschließen.
  return !/(?:^| )(?:tv|fernseher|smart ?tv|television|laptop|notebook|computer|monitor|smartphone|handy|tablet|konsole|playstation|xbox|kopfhorer|ladekabel|drucker|blumenerde|rasenmaher|gartenmobel|sofa|sessel|regal|springseil)(?: |$)/.test(searchProductText(product.name));
}
/* Vorratsauswahl. Seit 2.145 ist jede Sorte im Vorrat eine eigene Kachel (stockKey): Neben „Reis“ steht „Basmati-Reis“ mit seinem
   Katalogbild, statt dass die Sorte die Gruppenkachel umbenennt. Häufigkeit und Sterne zählen weiter je Gruppe bzw. Name. */
const catalogByStock = new Map();
for (const raw of GROCERY_PRODUCTS) if (!catalogByStock.has(stockKey(raw.name))) catalogByStock.set(stockKey(raw.name), raw);
export function pantryProductLibrary(history = [], favorites = [], pantry = [], removals = []) {
  const inventory=new Map(pantryRows(pantry).map(row=>[stockKey(row.name),row]));
  const allowed=product=>inventory.has(stockKey(product.name)) || (pantryProductAllowed(product)&&(catalogNames.has(productKey(product.name))||product.favorite||(product.category&&product.category!=='sonstiges')));
  const merged=new Map();
  for(const product of productLibrary(history.filter(allowed),favorites.filter(product=>inventory.has(stockKey(product.name))||pantryProductAllowed(product)),[],removals).filter(allowed)){
    const key=stockKey(product.name),previous=merged.get(key);
    if(previous){previous.count+=product.count;previous.favorite ||= product.favorite;if(product.imageKey)previous.imageKey=product.imageKey;}
    else merged.set(key,{...product});
  }
  for(const [key,row] of inventory){
    // Eine Sorte aus dem Katalog zeigt ihr eigenes Foto (imageKey = Katalogkennung), nicht das Bild ihrer Gruppe.
    const known=merged.get(key)||(catalogByStock.has(key)?{...catalogByStock.get(key),imageKey:catalogByStock.get(key).id,count:0}:{...ownProduct(row.name,row),count:0});
    merged.set(key,{...known,name:row.name,category:isCategory(row.category)?row.category:known.category,...(row.imageKey?{imageKey:row.imageKey}:{})});
  }
  /* Eindeutige Kennungen (2.149): Die Gruppe „Öl“ trägt die Kennung ihrer Katalogsorte „Olivenöl“ (olivenoel). Steht Olivenöl als eigene Sorte im
     Vorrat, hätten beide Kacheln dieselbe Kennung, und die Auswahl der einen hätte die andere mitgeschaltet. Die Sorte bekommt dann eine eigene
     Kennung; catalogId behält die Katalogkennung (Foto, Favorit). */
  const owners=new Map();
  for(const [key,card] of merged){
    const owner=owners.get(card.id);
    if(owner===undefined){owners.set(card.id,key);continue;}
    if(owner===key)continue;
    merged.set(key,{...card,catalogId:card.catalogId||card.id,id:`sorte-${encodeURIComponent(key)}`});
  }
  /* Sterne je Sorte (2.149): Ein Favorit gehört zu der Kachel mit derselben Sorte (stockKey seines Namens), etwa „Basmati-Reis“. Nur wenn es
     diese Kachel nicht gibt, bleibt er wie bisher bei der Gruppe („Reis“). Vorher stand ein Stern für Basmati-Reis bei Reis, und der Stern auf
     Basmati-Reis ließ sich nicht sichtbar setzen. */
  const activeFavorites=favorites.filter(row=>row&&!row.deletedAt&&row.name?.trim()).sort((a,b)=>String(a.updatedAt||'').localeCompare(String(b.updatedAt||''))||String(a.id||'').localeCompare(String(b.id||'')));
  const own=new Map(),claimed=new Set();
  for(const row of activeFavorites){const key=stockKey(row.name);if(!merged.has(key))continue;own.set(key,[...(own.get(key)||[]),row]);claimed.add(row.id);}
  for(const [key,card] of merged){
    const inherited=(card.favorite?.ids||[]).filter(id=>!claimed.has(id)).map(id=>activeFavorites.find(row=>row.id===id)).filter(Boolean);
    const rows=[...(own.get(key)||[]),...inherited];
    if(rows.length)card.favorite={...rows.at(-1),ids:rows.map(row=>row.id)};else delete card.favorite;
  }
  return [...merged.values()];
}
export const isPantryBasic = product => basicIds.has(product.id) || productGroupById(product.id)?.ids.some(id=>basicIds.has(id));

// Kategorien und Raster verwenden dieselbe Sammlung, noch ohne Such-/Kategorie-Filter.
export function pantryProductsForMode(products, mode, available = new Set()) {
  return products.filter(product => mode === 'current' ? available.has(stockKey(product.name)) :
    mode === 'favorites' ? Boolean(product.favorite) : mode === 'frequent' ? product.count >= 2 :
    mode === 'basics' ? isPantryBasic(product) : true);
}
