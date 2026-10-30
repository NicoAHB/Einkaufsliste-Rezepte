import assert from 'node:assert/strict';
import { test } from 'node:test';
import { active, addToList, emptyData, inPantry, merge, operation, pantryKey, pantryKeys, pantryRows, validate } from '../data.js';
import { compact } from '../compact.js';
import { namesFrom } from '../cookable.js';
import { filterPantry, pantryChanges, pantryOnList } from '../pantry.js';
import { imageForProduct } from '../product-images.js';
import { ownProduct, productLibrary, selectedProducts } from '../product-catalog.js';

const at = '2026-10-29T20:00:00.000Z', later = '2026-10-30T20:00:00.000Z';
const ops = (changes, time = at, actor = 'Nico') => changes.map(({ id, patch }) => operation('pantry', id, patch, actor, time));
const seed = products => merge(emptyData(), ops(pantryChanges(products)));

test('Vorrat: alte Namenslisten bleiben lesbar, Bilder und Vorhanden funktionieren ohne Migration', () => {
  const data = merge(emptyData(), [operation('pantry', 'legacy', { name: 'Zwiebeln' }, 'Nico', at)]);
  assert.ok(inPantry(pantryKeys(data.pantry), 'Zwiebel'));
  assert.equal(imageForProduct(data.pantry[0]).key, 'zwiebeln');
  assert.doesNotThrow(() => validate(data));
  assert.ok(!data.sync.minRev, 'alte Daten brauchen noch keine neue Revision');
});

test('Vorrat: zwei offline angelegte gleiche Produkte haben dieselbe ID; Einzahl/Mehrzahl wird nicht doppelt angelegt', () => {
  const a = ops(pantryChanges(['Zwiebeln', 'Salz'])), b = ops(pantryChanges(['zwiebel']), at, 'Anna');
  const left = merge(merge(emptyData(), a), b), right = merge(merge(emptyData(), b), a);
  assert.equal(active(left.pantry).length, 2);
  assert.deepEqual([...left.pantry].sort((a, b) => a.id.localeCompare(b.id)), [...right.pantry].sort((a, b) => a.id.localeCompare(b.id)));
  assert.deepEqual(pantryChanges(['ZWIEBELN'], left.pantry), []);
});

test('Vorrat: Aufgebraucht zählt weder bei Rezeptübernahme noch als kürzlich eingekauft; alte Apps werden geschützt', () => {
  let data = seed(['Milch', 'Nudeln']); const milk = data.pantry.find(row => row.name === 'Milch');
  data = merge(data, [operation('pantry', milk.id, { available: false }, 'Nico', later)]);
  assert.ok(!inPantry(pantryKeys(data.pantry), 'Milch')); assert.ok(inPantry(pantryKeys(data.pantry), 'Nudeln'));
  const names = namesFrom({ pantry: data.pantry, items: [{ name: 'Milch', checked: true, updatedAt: later }], now: Date.parse(later) + 1000 });
  assert.ok(!names.have.includes('Milch'), 'ausdrücklich leer überstimmt die Einkaufserinnerung');
  assert.equal(data.sync.minRev, 5);
});

test('Vorrat: gleichzeitige Status- und Bildänderungen bleiben beide erhalten, auch nach Export', () => {
  const base = seed(['Meine Frühstücksmischung']), row = base.pantry[0];
  const status = operation('pantry', row.id, { available: false }, 'Nico', later);
  const image = operation('pantry', row.id, { imageKey: 'muesli' }, 'Anna', later);
  const a = merge(merge(base, [status]), [image]), b = merge(merge(base, [image]), [status]);
  assert.deepEqual(a.pantry, b.pantry); assert.equal(a.pantry[0].available, false);
  assert.equal(imageForProduct(a.pantry[0]).key, 'muesli');
  assert.equal(imageForProduct(validate(JSON.parse(JSON.stringify(a))).pantry[0]).key, 'muesli');
});

test('Vorrat: Wiederauffüllen und Entfernen erhalten eigene Bilder und nutzen bestehende IDs', () => {
  let data = seed([{ name: 'Meine Mischung', imageKey: 'group-breakfast' }]); const row = data.pantry[0];
  data = merge(data, [operation('pantry', row.id, { available: false }, 'Nico', later)]);
  data = merge(data, ops(pantryChanges(['Meine Mischung'], data.pantry), '2026-10-31T20:00:00Z'));
  assert.equal(data.pantry.length, 1); assert.equal(data.pantry[0].available, true); assert.equal(data.pantry[0].imageKey, 'group-breakfast');
  data = merge(data, [operation('pantry', row.id, { deletedAt: '2026-11-01T20:00:00Z' }, 'Nico', '2026-11-01T20:00:00Z')]);
  const restore = pantryChanges(['Meine Mischung'], data.pantry);
  assert.equal(restore[0].id, row.id);
  const result = merge(data, ops(restore, '2026-11-02T20:00:00Z'));
  assert.equal(result.pantry[0].imageKey, 'group-breakfast'); assert.equal(result.pantry[0].deletedAt, null);
});

test('Vorrat: Löschmarken bleiben beim Aufräumen gegen späte Offline-Anlagen geschützt', () => {
  const create = ops(pantryChanges(['Haferflocken'])), base = merge(emptyData(), create), row = base.pantry[0];
  const data = merge(base, [operation('pantry', row.id, { deletedAt: later }, 'Anna', later)]);
  const cleaned = compact(data, new Date('2027-11-01T00:00:00Z')).data;
  assert.ok(cleaned.pantry.some(row => row.deletedAt));
  assert.equal(active(merge(cleaned, create).pantry).length, 0, 'alte Anlage belebt den Eintrag nicht wieder');
});

test('Vorrat: manuelle zusammengesetzte Produktnamen bleiben ein Eintrag, ohne andere Zutaten vorzutäuschen', () => {
  const data = seed(['Erbsen und Möhren']); const keys = pantryKeys(data.pantry);
  assert.equal(data.pantry.length, 1); assert.ok(inPantry(keys, 'Erbsen und Möhren'));
  assert.ok(!inPantry(keys, 'Erbsen')); assert.ok(!inPantry(keys, 'Möhren'));
});

test('Vorrat: Suche, Kategorien und Status helfen auch bei großen Listen', () => {
  const data = seed([{ name: 'Äpfel', category: 'obst' }, { name: 'Mehl', category: 'vorrat' }, { name: 'Mein Shampoo', category: 'haushalt' }]);
  const flour = data.pantry.find(row => row.name === 'Mehl'); const next = merge(data, [operation('pantry', flour.id, { available: false }, 'Nico', later)]);
  assert.deepEqual(filterPantry(next.pantry, { query: 'aepfel' }).map(row => row.name), ['Äpfel']);
  assert.deepEqual(filterPantry(next.pantry, { status: 'out' }).map(row => row.name), ['Mehl']);
  assert.equal(filterPantry(next.pantry, { status: 'available' }).length, 2);
  assert.deepEqual(filterPantry(next.pantry, { category: 'haushalt' }).map(row => row.name), ['Mein Shampoo']);
});

test('Vorrat: bestehende alte Dubletten werden gemeinsam angezeigt; jüngster Status entscheidet', () => {
  const data = merge(emptyData(), [operation('pantry', 'old-a', { name: 'Zwiebel' }, 'Nico', at), operation('pantry', 'old-b', { name: 'Zwiebeln', available: false }, 'Anna', later)]);
  assert.equal(pantryRows(data.pantry).length, 1); assert.deepEqual(pantryRows(data.pantry)[0].ids.sort(), ['old-a', 'old-b']);
  assert.equal(pantryKeys(data.pantry).size, 0);
});

test('Vorrat: nach Umbenennen bleibt das ursprüngliche Produkt neu anlegbar, ohne den anderen Eintrag zu überschreiben', () => {
  const base = seed(['Salz']), rename = merge(base, [operation('pantry', base.pantry[0].id, { name: 'Kräutersalz' }, 'Nico', later)]);
  const result = merge(rename, ops(pantryChanges(['Salz'], rename.pantry), '2026-10-31T20:00:00Z'));
  assert.deepEqual(result.pantry.map(row => row.name).sort(), ['Kräutersalz', 'Salz']);
});

test('Vorrat: eigene Produktbilder bleiben bei Favorit, Auswahl und Nachkaufen erhalten; Vorrat ist kein Kaufzähler', () => {
  const own = ownProduct('Mein Müslimix', { imageKey: 'muesli', quantity: 1, unit: 'Packung' });
  const lib = productLibrary([], [], [{ name: own.name, imageKey: 'muesli' }]);
  const product = lib.find(row => row.name === own.name); assert.equal(product.count, 0); assert.equal(imageForProduct(product).key, 'muesli');
  const picked = selectedProducts(new Map([[own.id, own]]));
  const added = merge(emptyData(), addToList(picked, '', 'Nico', at).ops);
  assert.equal(added.items[0].imageKey, 'muesli'); assert.equal(imageForProduct(added.items[0]).key, 'muesli');
});

test('Vorrat: Nachkaufen erkennt offene gleiche Produkte im Zielgeschäft und erhöht keine Mengen versehentlich', () => {
  const row = { name: 'Zwiebel' }, item = { name: 'Zwiebeln', storeId: 'edeka', checked: false, deletedAt: null };
  assert.ok(pantryOnList(row, [item], 'edeka')); assert.ok(!pantryOnList(row, [item], 'lidl'));
  assert.ok(!pantryOnList(row, [{ ...item, checked: true }], 'edeka'));
  assert.ok(!pantryOnList(row, [{ ...item, deletedAt: at }], 'edeka'));
});

test('Vorrat: eigene Kategorie wird beim Nachkaufen vor der Schätzung übernommen; zuletzt gelernte Einkaufskategorie bleibt vorrangig', () => {
  const product = { name: 'Milch', quantity: 1, unit: 'l', category: 'vorrat' };
  assert.equal(addToList([product], '', 'Nico', at).ops[0].patch.category, 'vorrat');
  const history = [{ name: 'Milch', category: 'sonstiges', updatedAt: later }];
  assert.equal(addToList([product], '', 'Nico', at, [], history).ops[0].patch.category, 'sonstiges');
});

test('Vorrat: unsichere Bildwerte und falsche Statuswerte werden abgelehnt, unbekannte lokale Kennungen bleiben erweiterbar', () => {
  const base = seed(['Mehl']), row = base.pantry[0];
  for (const patch of [{ available: 'false' }, { category: 'bogus' }, { imageKey: 'https://example.org/x.png' }, { imageKey: 'url(javascript:alert(1))' }])
    assert.throws(() => merge(base, [operation('pantry', row.id, patch, 'Nico', later)]));
  const next = merge(base, [operation('pantry', row.id, { imageKey: 'future-picture' }, 'Nico', later)]);
  assert.equal(imageForProduct(next.pantry[0]).key, 'mehl', 'unbekannte Kennung fällt auf automatische lokale Auswahl zurück');
  assert.throws(() => pantryChanges(['a'.repeat(121)]), /120/); assert.throws(() => pantryChanges([' ']), /Produktnamen/);
});
