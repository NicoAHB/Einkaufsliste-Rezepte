import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { AUTO_BYTES, LIMIT_BYTES, POLICY, cleanMarks, compact, due, sizeOf } from '../compact.js';
import { suggestCategory } from '../categories.js';
import { SCHEMA_REV, active, merge, operation, suggestItemNames, uid, validate } from '../data.js';

const demo = JSON.parse(await readFile(new URL('../beispieldaten.json', import.meta.url), 'utf8'));
const NOW = new Date('2027-03-01T12:00:00.000Z');
const ago = days => new Date(NOW.getTime() - days * 86400000).toISOString();
const op = (collection, id, patch, at, actor = 'Nico') => ({ ...operation(collection, id, patch, actor, at), id: `op-${collection}-${id}-${at}-${actor}` });
const item = (id, name, extra = {}, at = ago(1)) => op('items', id, { storeId: 'store-edeka', name, quantity: 1, unit: 'Stück', checked: false, createdBy: 'Nico', ...extra }, at);
const base = () => structuredClone(demo);

test('Nichts zum Aufräumen: Datei bleibt genau gleich, es gibt keine Änderung zu schreiben', () => {
  const result = compact(base(), NOW);
  assert.equal(result.changed, false);
  assert.equal(result.data.sync.compactedAt, undefined);
  assert.equal(compact(compact(merge(base(), [item('a', 'Milch')]), NOW).data, NOW).changed, false);
});

test('Gelöschtes wird nach 14 Tagen entfernt, jüngeres bleibt', () => {
  const data = merge(base(), [item('alt', 'Alt', {}, ago(80)), op('items', 'alt', { deletedAt: ago(POLICY.tombstoneDays + 1) }, ago(POLICY.tombstoneDays + 1)),
    item('neu', 'Neu', {}, ago(40)), op('items', 'neu', { deletedAt: ago(POLICY.tombstoneDays - 1) }, ago(POLICY.tombstoneDays - 1)), item('lebt', 'Lebt', {}, ago(90))]);
  const { data: out, changed, removed } = compact(data, NOW);
  assert.equal(changed, true);
  assert.deepEqual(out.items.map(row => row.id).filter(id => ['alt', 'neu', 'lebt'].includes(id)).sort(), ['lebt', 'neu']);
  assert.equal(removed.items, 1);
  assert.doesNotThrow(() => validate(out));
  assert.equal(out.sync.compactedAt, NOW.toISOString());
  assert.ok(data.items.some(row => row.id === 'alt'), 'die Eingabe bleibt unverändert');
});

test('Erledigte, nie entfernte Artikel werden nach 21 Tagen entfernt, frische bleiben', () => {
  const data = merge(base(), [item('alt', 'Alt', { checked: true }, ago(60)), op('items', 'alt', { checked: true }, ago(POLICY.doneDays + 1)),
    item('frisch', 'Frisch', { checked: true }, ago(5)), item('offen', 'Offen', {}, ago(100))]);
  const out = compact(data, NOW).data;
  const ids = out.items.map(row => row.id);
  assert.ok(!ids.includes('alt') && ids.includes('frisch') && ids.includes('offen'), 'Offene Artikel bleiben immer');
});

test('Rezepte und Geschäfte: Zutaten, Artikel und Preise des Entfernten gehen mit', () => {
  const stamp = ago(40);
  const data = merge(base(), [
    op('recipes', 'r-weg', { name: 'Weg', servings: 2, tags: [], instructions: 'x' }, stamp), op('recipes', 'r-weg', { deletedAt: ago(35) }, ago(35)),
    op('ingredients', 'i-weg', { recipeId: 'r-weg', name: 'Mehl', quantity: 1, unit: 'kg' }, stamp),
    op('stores', 's-weg', { name: 'Weg' }, stamp), op('stores', 's-weg', { deletedAt: ago(33) }, ago(33)),
    item('a-weg', 'Zucker', { storeId: 's-weg' }, stamp), op('prices', 'p-weg', { storeId: 's-weg', name: 'Zucker', quote: { cents: 100, quantity: 1, unit: 'kg' } }, stamp)]);
  const out = compact(data, NOW).data;
  assert.ok(!out.recipes.some(row => row.id === 'r-weg') && !out.ingredients.some(row => row.id === 'i-weg'));
  assert.ok(!out.stores.some(row => row.id === 's-weg') && !out.items.some(row => row.id === 'a-weg') && !out.prices.some(row => row.id === 'p-weg'));
  assert.ok(out.recipes.some(row => row.id === 'recipe-pasta') && out.ingredients.length > 0, 'Anderes bleibt');
  assert.doesNotThrow(() => validate(out));
});

test('Wochenplan: vergangene Gerichte nach 120 Tagen weg, aktuelle bleiben', () => {
  const data = merge(base(), [op('meals', 'alt', { date: ago(130).slice(0, 10), recipeId: 'recipe-pasta', servings: 2 }, ago(130)),
    op('meals', 'neu', { date: ago(5).slice(0, 10), title: 'Pizza', servings: 2 }, ago(5))]);
  assert.deepEqual(compact(data, NOW).data.meals.map(row => row.id), ['neu']);
});

test('Bezahlte Preise: nur die neuesten vier je Geschäft, Produkt, Sorte und Einheitengruppe', () => {
  const quote = cents => ({ cents, quantity: 1, unit: 'kg' });
  const prices = Array.from({ length: 6 }, (_, index) => op('prices', `p${index}`, { storeId: 'store-edeka', name: 'Mehl', quote: quote(100 + index), src: 'bon' }, ago(60 - index)));
  prices.push(op('prices', 'andere', { storeId: 'store-lidl', name: 'Mehl', quote: quote(90), src: 'bon' }, ago(60)));
  const out = compact(merge(base(), prices), NOW).data;
  const kept = out.prices.filter(row => row.name === 'Mehl').map(row => row.id).sort();
  assert.deepEqual(kept, ['andere', 'p2', 'p3', 'p4', 'p5']);
});

test('Aufräumen wirft Sorten nie zusammen (Gala und Pink Lady behalten je ihre Käufe) und ungeprüfte Notizen verdrängen keinen bezahlten Preis', () => {
  const quote = cents => ({ cents, quantity: 1, unit: 'Stück' });
  const prices = [
    ...['gala', 'lady'].flatMap(variant => Array.from({ length: 4 }, (_, index) => op('prices', `${variant}${index}`, { storeId: 'store-edeka', name: 'Äpfel', variant, quote: quote(50 + index), src: 'bon' }, ago(60 - index)))),
    ...Array.from({ length: 6 }, (_, index) => op('prices', `alt${index}`, { storeId: 'store-edeka', name: 'Äpfel', quote: quote(40 + index) }, ago(30 - index))),   // ungeprüft, neuer als alles andere
  ];
  const out = compact(merge(base(), prices), NOW).data;
  const kept = out.prices.filter(row => row.name === 'Äpfel' && row.storeId === 'store-edeka').map(row => row.id).sort();
  assert.deepEqual(kept, ['alt2', 'alt3', 'alt4', 'alt5', 'gala0', 'gala1', 'gala2', 'gala3', 'lady0', 'lady1', 'lady2', 'lady3']);
});

const ids = (count, from = 0) => Array.from({ length: count }, (_, index) => `op-${from + index}`);

test('Änderungsprotokoll ohne Marken: alles bleibt bis zur Obergrenze, darüber die neuesten in Reihenfolge', () => {
  const small = base(); small.sync.applied = ids(POLICY.keepApplied + 50);
  assert.equal(compact(small, NOW).changed, false, 'unter der Obergrenze fällt ohne Altersangabe nichts weg');
  const data = base(); data.sync.applied = ids(POLICY.maxApplied + 50);
  const out = compact(data, NOW);
  assert.equal(out.data.sync.applied.length, POLICY.maxApplied);
  assert.equal(out.data.sync.applied[0], 'op-50'); assert.equal(out.data.sync.applied.at(-1), `op-${POLICY.maxApplied + 49}`);
  assert.equal(out.removed.applied, 50);
});

test('Marken: Änderungen jünger als 45 Tage bleiben, ältere fallen weg, mindestens die letzten 600 bleiben', () => {
  const data = base(); data.sync.applied = ids(1000);
  data.sync.marks = [{ at: ago(120), n: 300 }, { at: ago(60), n: 700 }, { at: ago(20), n: 900 }];
  const out = compact(data, NOW).data;
  assert.equal(out.sync.applied.length, 1000 - 400, 'bis zur Marke von vor 60 Tagen (n = 700) wird gekürzt, aber nicht unter 600');
  assert.equal(out.sync.applied[0], 'op-400');
  // Marken wandern mit: die alten fallen weg, die jüngeren rücken auf
  assert.deepEqual(out.sync.marks.map(mark => mark.n).slice(0, 2), [300, 500]);
  assert.equal(out.sync.marks.at(-1).at, NOW.toISOString(), 'und das Aufräumen setzt eine neue Marke');
  assert.equal(out.sync.marks.at(-1).n, 600);
  const few = base(); few.sync.applied = ids(650); few.sync.marks = [{ at: ago(100), n: 640 }];
  assert.equal(compact(few, NOW).data.sync.applied.length, POLICY.keepApplied, 'nie unter die Untergrenze');
});

test('Marken: je Tag höchstens eine neue, unlesbare werden ignoriert, die Datei bleibt gültig', () => {
  const data = base(); data.sync.applied = ids(700);
  data.sync.marks = [{ at: NOW.toISOString(), n: 650 }];
  data.items.push({ id: 'x', name: 'Alt', quantity: 1, unit: 'Stück', checked: false, storeId: 'store-edeka', createdBy: 'Nico', createdAt: ago(90), updatedAt: ago(90), deletedAt: ago(40), _clock: { '*': { at: ago(90), id: '' } } });
  const out = compact(data, NOW).data;
  assert.equal(out.sync.marks.length, 1, 'heute ist schon eine Marke da');
  const broken = base(); broken.sync.applied = ids(700);
  broken.sync.marks = [null, { at: 'gestern', n: 5 }, { at: ago(80), n: 9999 }, { at: ago(80), n: 2.5 }, { at: ago(80), n: 100 }, { at: ago(90), n: 200 }];
  broken.items.push({ id: 'y', name: 'Alt', quantity: 1, unit: 'Stück', checked: false, storeId: 'store-edeka', createdBy: 'Nico', createdAt: ago(90), updatedAt: ago(90), deletedAt: ago(40), _clock: { '*': { at: ago(90), id: '' } } });
  const tidy = compact(broken, NOW).data;
  assert.doesNotThrow(() => validate(tidy));
  assert.equal(tidy.sync.applied.length, 700 - 100, 'nur die lesbare Marke (n = 100, älter als 45 Tage) zählt; Marken dürfen nicht rückwärts gehen');
  assert.deepEqual(cleanMarks([{ at: ago(10), n: 5 }, { at: ago(20), n: 8 }], 10), [{ at: ago(10), n: 5 }], 'eine Marke mit früherem Zeitpunkt nach einer späteren gilt nicht');
  assert.equal(compact(compact(broken, NOW).data, NOW).changed, false, 'ein zweiter Lauf ändert nichts');
});

test('Eine schon angewendete Änderung wirkt auch nach dem Aufräumen nicht ein zweites Mal (3 bleibt 3, ein entferntes Brot bleibt weg)', () => {
  // Gerät A hat geschrieben, aber die Antwort ging verloren und es hat noch beide Änderungen in der Warteschlange.
  const create = item('milch', 'Milch', { quantity: 2 }, ago(40)), add = op('items', 'milch', { add: { quantity: 1, unit: 'Stück' } }, ago(39));
  const make = item('brot', 'Brot', {}, ago(50)), del = op('items', 'brot', { deletedAt: ago(45) }, ago(45));
  let data = merge(base(), [create, add, make, del]);
  // Gerät B arbeitet danach weiter: viele Änderungen, dann wird aufgeräumt (Gelöschtes aus der Datei, Protokoll gekürzt)
  const later = Array.from({ length: 700 }, (_, index) => item(`x${index % 7}`, `Artikel ${index % 7}`, { checked: index % 2 === 0 }, ago(30 - (index % 25))));
  data = merge(data, later);
  const out = compact(data, NOW);
  assert.ok(out.removed.items >= 1 && !out.data.items.some(row => row.id === 'brot'), 'das gelöschte Brot ist endgültig weg');
  assert.ok(out.data.sync.applied.includes(add.id) && out.data.sync.applied.includes(make.id), 'aber die Änderungen sind weiter als angewendet vermerkt');
  const again = merge(out.data, [create, add, make, del]);
  assert.equal(again.items.find(row => row.id === 'milch').quantity, 3, 'die Menge bleibt 3');
  assert.ok(!again.items.some(row => row.id === 'brot'), 'das Brot kommt nicht wieder');
});

test('Aufgeräumte Dateien tragen minRev 2 (alte Apps ohne das Feld ignorieren es); eine zu alte App liest sie nicht', () => {
  const data = base(); data.sync.applied = ids(10);
  data.items.push({ id: 'z', name: 'Alt', quantity: 1, unit: 'Stück', checked: false, storeId: 'store-edeka', createdBy: 'Nico', createdAt: ago(90), updatedAt: ago(90), deletedAt: ago(40), _clock: { '*': { at: ago(90), id: '' } } });
  const out = compact(data, NOW).data;
  assert.equal(out.sync.minRev, 2);
  assert.doesNotThrow(() => validate(out));
  assert.throws(() => validate({ ...out, sync: { ...out.sync, minRev: SCHEMA_REV + 1 } }), /zu alt/);
  assert.throws(() => validate({ ...out, sync: { ...out.sync, minRev: 'x' } }), /beschädigt/);
  assert.doesNotThrow(() => validate({ ...out, sync: { ...out.sync, minRev: undefined } }));
});

test('Ein bezahlter Preis mit Sorte setzt minRev 3: eine ältere App würde Sorten beim Aufräumen zusammenwerfen und liest die Datei nicht mehr', () => {
  assert.equal(SCHEMA_REV, 3);
  const plain = merge(base(), [op('prices', 'p0', { storeId: 'store-edeka', name: 'Mehl', quote: { cents: 100, quantity: 1, unit: 'kg' } }, ago(5))]);
  assert.equal(plain.sync.minRev, undefined, 'eine gewöhnliche Preisnotiz ändert nichts');
  for (const patch of [{ src: 'bon' }, { variant: 'Gala' }, { receipt: 'GALA 1,29' }, { receiptKey: 'k' }]) {
    const out = merge(base(), [op('prices', 'p1', { storeId: 'store-edeka', name: 'Äpfel', quote: { cents: 100, quantity: 1, unit: 'kg' }, ...patch }, ago(5))]);
    assert.equal(out.sync.minRev, 3, JSON.stringify(patch));
    assert.doesNotThrow(() => validate(out));
  }
  assert.equal(merge(base(), [op('aliases', 'a1', { from: 'gala', name: 'Äpfel', variant: 'Gala' }, ago(5))]).sync.minRev, 3);
});

test('Zeitstempel je Feld werden durch eine Sammelmarke ersetzt; neuere Änderungen gewinnen weiter, ältere nicht', () => {
  const data = merge(base(), [item('x', 'Altbrot', {}, ago(100)), op('items', 'x', { quantity: 3 }, ago(90))]);
  const out = compact(data, NOW).data, row = out.items.find(entry => entry.id === 'x');
  assert.deepEqual(Object.keys(row._clock), ['*']);
  assert.equal(row.quantity, 3);
  const newer = merge(out, [op('items', 'x', { quantity: 5 }, ago(2))]);
  assert.equal(newer.items.find(entry => entry.id === 'x').quantity, 5);
  const older = merge(out, [op('items', 'x', { quantity: 9 }, ago(95))]);
  assert.equal(older.items.find(entry => entry.id === 'x').quantity, 3, 'Eine uralte Änderung darf nichts überschreiben');
  assert.ok(sizeOf(out.items.find(entry => entry.id === 'x')) < sizeOf(data.items.find(entry => entry.id === 'x')));
});

test('Verwaiste Änderungen eines Geräts, das lange offline war, machen die Datei nicht ungültig', () => {
  const data = merge(base(), [item('weg', 'Weg', {}, ago(80)), op('items', 'weg', { deletedAt: ago(60) }, ago(60))]);
  const compacted = compact(data, NOW).data;
  assert.ok(!compacted.items.some(row => row.id === 'weg'));
  // Gerät B war offline und kennt „weg“ noch: abhaken, umbenennen, löschen, Menge ändern.
  const stale = [op('items', 'weg', { checked: true }, ago(50), 'Anna'), op('items', 'weg', { name: 'Neu benannt' }, ago(49), 'Anna'),
    op('items', 'weg', { deletedAt: ago(48) }, ago(48), 'Anna'), op('items', 'weg', { quantity: 2 }, ago(47), 'Anna'), item('echt', 'Echt', {}, ago(46))];
  const result = merge(compacted, stale);
  assert.ok(!result.items.some(row => row.id === 'weg'), 'kein halber Datensatz');
  assert.ok(result.items.some(row => row.id === 'echt'), 'echte Änderungen kommen durch');
  assert.ok(stale.every(entry => result.sync.applied.includes(entry.id)), 'alles gilt als verarbeitet, nichts wird erneut gesendet');
});

test('Namensgedächtnis: Vorschläge und gelernte Kategorien überleben das Aufräumen', () => {
  const rows = [item('m1', 'Kefir', { category: 'getraenke' }, ago(90)), op('items', 'm1', { deletedAt: ago(80) }, ago(80)),
    item('m2', 'kefir ', { category: 'getraenke' }, ago(70)), op('items', 'm2', { deletedAt: ago(60) }, ago(60)), item('m3', 'Kichererbsen', {}, ago(75)), op('items', 'm3', { deletedAt: ago(60) }, ago(60))];
  const out = compact(merge(base(), rows), NOW).data;
  assert.ok(!out.items.some(row => /kefir|kicher/i.test(row.name)));
  assert.deepEqual(out.names.map(entry => [entry.name, entry.count]), [['Kefir', 2], ['Kichererbsen', 1]]);
  const history = [...out.items, ...out.names.map(entry => ({ name: entry.name, category: entry.category, updatedAt: entry.at, weight: entry.count }))];
  assert.deepEqual(suggestItemNames(history, 'ke'), ['Kefir']);
  assert.equal(suggestCategory('KEFIR', history), 'getraenke');
  // Nochmaliges Aufräumen verdoppelt nichts.
  assert.equal(compact(out, NOW).changed, false);
});

test('Ein Jahr Nutzung (20 Artikel pro Woche): ohne Aufräumen über der Grenze, mit Aufräumen weit darunter', () => {
  let plain = base(), tidy = base(), t = Date.parse('2026-11-01T10:00:00Z');
  const sizes = [];
  for (let week = 1; week <= 52; week++) {
    const ops = [];
    for (let i = 0; i < 20; i++) {
      const id = uid(), at = () => new Date(t += 3600000).toISOString();
      ops.push(op('items', id, { storeId: 'store-edeka', name: `Artikel ${week}-${i % 12}`, quantity: 1, unit: 'Stück', checked: false, createdBy: 'Nico', category: 'vorrat', price: null, onSale: false }, at()));
      ops.push(op('items', id, { checked: true }, at())); ops.push(op('items', id, { deletedAt: at() }, at()));
    }
    ops.forEach((entry, index) => { entry.id = uid(); });
    plain = merge(plain, ops); tidy = merge(tidy, ops);
    if (due(tidy)) tidy = compact(tidy, new Date(t)).data;
    sizes.push(sizeOf(tidy));
  }
  assert.ok(sizeOf(plain) > LIMIT_BYTES, `ohne Aufräumen nur ${sizeOf(plain)} Byte`);
  assert.ok(Math.max(...sizes) < AUTO_BYTES + 60000, `Höchststand ${Math.max(...sizes)} Byte`);
  assert.ok(sizeOf(tidy) < AUTO_BYTES, `im Dauerbetrieb nur ${sizeOf(tidy)} Byte`);   // aufgeräumt wird ab AUTO_BYTES; die Änderungen der letzten 45 Tage bleiben vermerkt (siehe trimApplied)
  assert.doesNotThrow(() => validate(tidy));
  assert.ok(tidy.names.length > 0 && tidy.names.length <= POLICY.maxNames);
  assert.equal(active(tidy.items).length, demo.items.length, 'Alle lebenden Artikel sind noch da');
});

test('Ergebnis ist eine gültige, aber kleinere Datei und enthält alles Lebende unverändert', () => {
  const data = merge(base(), [item('a', 'Milch', {}, ago(100)), op('items', 'a', { deletedAt: ago(99) }, ago(99)), item('b', 'Brot', {}, ago(100))]);
  const { data: out, before, after } = compact(data, NOW);
  assert.ok(after < before);
  const alive = rows => JSON.stringify(rows.filter(row => !row.deletedAt).map(row => [row.id, row.name]));
  assert.equal(alive(out.items), alive(data.items));
  assert.deepEqual(out.recipes.map(row => row.name), data.recipes.map(row => row.name));
});
