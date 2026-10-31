import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { GROCERY_PRODUCTS, PRODUCT_PHOTOS, favoriteId, filterProducts, ownProduct, productById, productLibrary, selectedProducts, pantryProductLibrary, pantryProductsForMode } from '../product-catalog.js';
import { addToList, merge, operation, validate, pantryKey } from '../data.js';
import { PANTRY_TAB_ORDER, pantryTabOrder } from '../product-tab-order.js';
import { compact } from '../compact.js';
import { isCategory, suggestCategory } from '../categories.js';

const demo = JSON.parse(await readFile(new URL('../beispieldaten.json', import.meta.url), 'utf8'));
const at = '2026-10-29T20:00:00.000Z';
const favorite = (id, extra = {}, date = at) => {
  const product = productById(id);
  return operation('productFavorites', favoriteId(product), { name: product.name, productId: product.id,
    quantity: product.quantity, unit: product.unit, category: product.category, deletedAt: null, ...extra }, 'Nico', date);
};

test('1024 Alltagsprodukte: eindeutige Kennungen, sichere Mengen, richtige Gänge und vollständig lokale Fotos', async () => {
  assert.equal(GROCERY_PRODUCTS.length, 1024);
  assert.equal(new Set(GROCERY_PRODUCTS.map(row => row.id)).size, 1024);
  assert.equal(new Set(GROCERY_PRODUCTS.map(row => row.name)).size, 1024);
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  let bytes = 0;
  for (const photo of PRODUCT_PHOTOS) {
    assert.match(photo, /^assets\/products\/[a-z-]+\.webp$/);
    const file = await readFile(new URL('../' + photo, import.meta.url)); bytes += file.length;
    assert.equal(file.subarray(0, 4).toString(), 'RIFF'); assert.equal(file.subarray(8, 12).toString(), 'WEBP');
    assert.ok(sw.includes(`'./${photo}'`), 'Foto muss offline mitkommen');
  }
  assert.ok(bytes < 8500000, 'alle 1024 Produktbilder zusammen höchstens 8,5 MB');
  for (const product of GROCERY_PRODUCTS) {
    assert.ok(product.quantity > 0 && product.unit && product.name);
    assert.ok(isCategory(product.category), product.name + ': gültiger Gang');
    if (suggestCategory(product.name)) assert.equal(product.category, suggestCategory(product.name), product.name + ': vorhandene Kategorie bleibt passend');
    assert.ok(product.sheet >= 0 && product.sheet < PRODUCT_PHOTOS.length && product.cell >= 0 && product.cell < 32);
  }
});

test('Suche und eigene Produkte: Umlaute möglich, ähnliche Namen bekommen keine falschen Fotos', () => {
  const library = productLibrary([{ name: 'Apfeltasche', quantity: 2, unit: 'Stück' }, { name: 'Äpfel', quantity: 2, unit: 'kg' }]);
  for (const query of ['Äpfel', 'aepfel', 'apfel']) assert.ok(filterProducts(library, { query }).some(row => row.id === 'aepfel'));
  const pastry = library.find(row => row.name === 'Apfeltasche');
  assert.equal(pastry.own, true); assert.equal(pastry.sheet, undefined);
  assert.ok(!filterProducts(library).some(row => row.name === 'Apfeltasche'), 'eigene Artikel haben eine eigene Ansicht');
  assert.ok(filterProducts(library, { mode: 'own' }).some(row => row.name === 'Apfeltasche'));
  assert.deepEqual(filterProducts(library, { query: 'Kochschinken', category: 'obst' }), []);
  assert.ok(filterProducts(library, { query: 'passierte tomaten' }).some(row => row.id === 'passierte-tomaten'));
});

test('Favoriten und häufig gekauft sind unabhängig; eigene Mengen und Einheiten bleiben erhalten', () => {
  const data = merge(demo, [favorite('milch', { quantity: 2, unit: 'l' })]);
  const own = ownProduct('Mein Tee', { quantity: 3, unit: 'Packung' });
  const custom = { id: favoriteId(own), ...own, productId: null, deletedAt: null };
  const library = productLibrary([{ name: 'Brot', quantity: 1, unit: 'Stück', weight: 4 }, { name: 'Mein Tee', quantity: 1, unit: 'Packung' }], [...data.productFavorites, custom]);
  const favorites = filterProducts(library, { mode: 'favorites' });
  assert.deepEqual(favorites.map(row => row.name).sort(), ['Mein Tee', 'Milch']);
  assert.equal(favorites.find(row => row.name === 'Milch').quantity, 2);
  assert.deepEqual(filterProducts(library, { mode: 'frequent' }).map(row => row.name), ['Brot']);
  const ranked = productLibrary([{ name: 'Milch', weight: 10 }, { name: 'Brot', weight: 2 }]);
  assert.deepEqual(filterProducts(ranked, { mode: 'frequent' }).map(row => row.name), ['Milch', 'Brot'], 'am häufigsten gekauft zuerst, auch über Gänge hinweg');
  assert.notEqual(favoriteId(ownProduct('Apfeltasche')), favoriteId(ownProduct('Äpfel')));
  assert.equal(favoriteId(ownProduct(' Mein Tee ')), favoriteId(ownProduct('mein tee')));
});

test('Auswahl: deutsches Komma, große Mengen und eindeutige Fehler statt unbemerkter Umrechnung', () => {
  const picked = new Map([['milch', { ...productById('milch'), quantity: '0,5' }], ['mehl', { ...productById('mehl'), quantity: '1000', unit: 'g' }]]);
  assert.deepEqual(selectedProducts(picked).map(row => [row.quantity, row.unit]), [[0.5, 'l'], [1000, 'g']]);
  for (const quantity of ['', '0', '-1', 'NaN', 'Infinity', '1e12']) {
    assert.throws(() => selectedProducts(new Map([['x', { ...productById('milch'), quantity }]])), /Milch/);
  }
  assert.throws(() => selectedProducts(new Map([['x', { ...productById('milch'), unit: ' ' }]])), /Einheit/);
});

test('Sterne werden unabhängig zwischen Geräten zusammengeführt; Entfernen und Wiederherstellen sind ausdrücklich', () => {
  const milk = favorite('milch'), butter = favorite('butter');
  const a = merge(merge(demo, [milk]), [butter]), b = merge(merge(demo, [butter]), [milk]);
  assert.deepEqual([...a.productFavorites].sort((a, b) => a.id.localeCompare(b.id)), [...b.productFavorites].sort((a, b) => a.id.localeCompare(b.id)));
  assert.deepEqual(a.items, demo.items, 'Stern legt keinen Artikel an');
  const removed = operation('productFavorites', milk.entityId, { deletedAt: '2026-10-29T21:00:00.000Z' }, 'Anna', '2026-10-29T21:00:00.000Z');
  const out = merge(a, [removed]);
  assert.equal(filterProducts(productLibrary([], out.productFavorites), { mode: 'favorites' }).length, 1);
  const compacted = compact(out, new Date('2027-05-01T00:00:00Z')).data;
  assert.ok(compacted.productFavorites.find(row => row.id === milk.entityId).deletedAt, 'Favoriten-Löschmarke bleibt auch nach Aufräumen erhalten');
  assert.ok(merge(compacted, [milk]).productFavorites.find(row => row.id === milk.entityId).deletedAt, 'späte Offline-Änderung belebt keinen Stern');
  const restored = merge(out, [favorite('milch', {}, '2026-10-30T00:00:00.000Z')]);
  assert.equal(restored.productFavorites.find(row => row.id === milk.entityId).deletedAt, null);
  assert.equal(restored.productFavorites.filter(row => row.id === milk.entityId).length, 1);
  assert.doesNotThrow(() => validate(JSON.parse(JSON.stringify(restored))), 'Backup vollständig gültig');
});

test('Favoriten: beschädigte Daten abgelehnt, alte Dateien ohne Sammlung weiter lesbar', () => {
  assert.doesNotThrow(() => validate(demo));
  const valid = merge(demo, [favorite('milch')]);
  for (const patch of [{ quantity: 0 }, { unit: '' }, { name: ' ' }, { productId: '../bad' }, { quantity: Infinity }]) {
    const invalid = structuredClone(valid); Object.assign(invalid.productFavorites[0], patch);
    assert.throws(() => validate(invalid), /Produktfavorit/);
  }
});

test('Gesammelte Übernahme zählt nur passende Artikel des Zielgeschäfts dazu, ohne Preise zu erfinden', () => {
  const milk = { ...demo.items[0], id: 'milk', storeId: 'store-edeka', name: 'Milch', quantity: 500, unit: 'ml', checked: false, price: null };
  const other = { ...milk, id: 'other', storeId: 'store-lidl', quantity: 4, unit: 'l' };
  const picks = selectedProducts(new Map([['milch', productById('milch')], ['butter', productById('butter')]]));
  const result = addToList(picks, 'store-edeka', 'Nico', at, [milk, other]);
  const out = merge({ ...structuredClone(demo), items: [milk, other] }, result.ops);
  const added = out.items.find(row => row.name === 'Butter');
  assert.deepEqual([out.items.find(row => row.id === 'milk').quantity, out.items.find(row => row.id === 'milk').unit], [1.5, 'l']);
  assert.equal(out.items.find(row => row.id === 'other').quantity, 4);
  assert.deepEqual([added.quantity, added.unit, added.storeId, added.price, added.createdBy], [250, 'g', 'store-edeka', null, 'Nico']);
});

test('Vorratsreiter: Kategoriezugehörigkeit folgt dem Bestand, Favoriten und häufigen Käufen, ohne Daten zu verändern', () => {
  const rows=[{id:'stock',name:'Meine Hausmischung',category:'sonstiges',available:true},{id:'out',name:'Mehl',category:'vorrat',available:false}];
  const before=structuredClone(rows),favorite={name:'Salz',productId:'salz',quantity:1,unit:'Packung',deletedAt:null};
  const library=pantryProductLibrary([{name:'Milch',weight:2}], [favorite], rows);
  const categories=mode=>new Set(pantryProductsForMode(library,mode,new Set([pantryKey('Meine Hausmischung')])).map(row=>row.category));
  assert.deepEqual(categories('current'),new Set(['sonstiges']));assert.deepEqual(categories('favorites'),new Set(['gewuerze']));
  assert.deepEqual(categories('frequent'),new Set(['kuehl']));assert.ok(categories('all').has('haushalt'));
  assert.equal(pantryProductsForMode(library,'basics').length,28);assert.ok(!categories('basics').has('haushalt'));assert.deepEqual(rows,before);
});
test('Vorratsreiter: leere Sammlungen bleiben leer, Grundvorrat ist von vorhanden und Favoriten unabhängig',()=>{
  const library=pantryProductLibrary();
  for(const mode of ['current','favorites','frequent'])assert.deepEqual(pantryProductsForMode(library,mode),[]);
  const basics=pantryProductsForMode(library,'basics');assert.ok(basics.some(row=>row.name==='Salz'));assert.ok(basics.some(row=>row.name==='Mehl'));assert.ok(!basics.some(row=>row.name==='Zahnpasta'));
});
test('Vorratsreiter: persönliche Reihenfolge bleibt vollständig, neue Reiter werden ergänzt und fehlerhafte Werte ignoriert',()=>{
  const saved=['favorites','favorites','gone','all'];const before=[...saved];
  assert.deepEqual(pantryTabOrder(saved),['favorites','all','current','frequent','basics','recent']);assert.deepEqual(saved,before);
  for(const value of [null,{},'favorites',42])assert.deepEqual(pantryTabOrder(value),PANTRY_TAB_ORDER);
});
