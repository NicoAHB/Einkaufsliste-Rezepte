import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { compact } from '../compact.js';
import { active, addToList, duplicateFolds, merge, operation, validate } from '../data.js';

const demo = JSON.parse(await readFile(new URL('../beispieldaten.json', import.meta.url), 'utf8'));
const t = n => `2026-10-20T10:00:${String(n).padStart(2, '0')}.000Z`;
const op = (id, entity, patch, at, actor = 'Nico') => ({ ...operation('items', entity, patch, actor, at), id });
const create = (entity, patch, at, actor = 'Nico') => op(`create-${entity}-${at}`, entity, { storeId: 'store-lidl', name: 'Quark', quantity: 1, unit: 'Stück', checked: false, createdBy: actor, ...patch }, at, actor);
const base = () => merge(structuredClone(demo), [create('milch', {}, t(0))]);
const qty = (data, id = 'milch') => data.items.find(row => row.id === id).quantity;

test('Zwei Personen legen unabhängig je +1 auf einen Artikel mit Menge 1: Ergebnis 3, nicht 2', () => {
  const shared = base();
  assert.equal(qty(shared), 1);
  const nico = addToList([{ name: 'Quark', quantity: 1, unit: 'Stück' }], 'store-lidl', 'Nico', t(10), shared.items).ops;
  const anna = addToList([{ name: 'Quark', quantity: 1, unit: 'Stück' }], 'store-lidl', 'Anna', t(11), shared.items).ops;
  assert.equal(nico[0].patch.add.quantity, 1, 'gespeichert wird der Zuwachs, nicht die neue Gesamtmenge');
  // Gerät 1 gleicht zuerst ab, Gerät 2 danach (später, offline gewesen)
  const afterNico = merge(shared, nico);
  assert.equal(qty(afterNico), 2);
  assert.equal(qty(merge(afterNico, anna)), 3);
  // andere Reihenfolge und alles auf einmal: dasselbe Ergebnis
  assert.equal(qty(merge(merge(shared, anna), nico)), 3);
  assert.equal(qty(merge(shared, [...nico, ...anna])), 3);
  assert.equal(qty(merge(shared, [...anna, ...nico])), 3);
  // lokale Anzeige des zweiten Geräts (eigene wartende Änderungen auf dem gemeinsamen Stand) stimmt ebenfalls
  assert.equal(qty(merge(afterNico, anna)), qty(merge(merge(shared, anna), nico)));
});

test('Wiederholtes Senden derselben Änderung zählt nur einmal', () => {
  const ops = addToList([{ name: 'Quark', quantity: 1, unit: 'Stück' }], 'store-lidl', 'Nico', t(10), base().items).ops;
  const once = merge(base(), ops);
  assert.equal(qty(merge(once, ops)), 2);
  assert.equal(qty(merge(base(), [...ops, ...ops])), 2);
});

test('Ausdrückliches Setzen und Zuwachs: Das jüngere Setzen gewinnt, spätere Zuwächse kommen dazu, egal wann sie eintreffen', () => {
  const add = patch => op(`add-${patch.at}`, 'milch', { add: { quantity: patch.n, unit: 'Stück' } }, patch.at, patch.who);
  const set = (value, at) => op(`set-${at}`, 'milch', { quantity: value }, at, 'Anna');
  const early = add({ at: t(2), n: 1, who: 'Nico' }), late = add({ at: t(5), n: 1, who: 'Nico' }), setter = set(10, t(3));
  // Setzen (t3) liegt zwischen den Zuwächsen: 10 + später (t5) 1 = 11; der frühere Zuwachs (t2) wird vom Setzen überschrieben
  for (const order of [[early, setter, late], [late, setter, early], [setter, late, early], [late, early, setter]]) {
    assert.equal(qty(merge(base(), order)), 11);
    // Stück für Stück auf mehreren Geräten abgeglichen
    let data = base();
    for (const single of order) data = merge(data, [single]);
    assert.equal(qty(data), 11);
  }
});

test('Verschiedene Einheiten werden beim Zuwachs umgerechnet (300 g + 500 g + 700 g = 1,5 kg)', () => {
  const start = merge(structuredClone(demo), [create('mehl', { name: 'Mehl', quantity: 300, unit: 'g' }, t(0))]);
  const add = (id, quantity, unit, at) => op(id, 'mehl', { add: { quantity, unit } }, at);
  for (const order of [[add('a', 500, 'g', t(1)), add('b', 0.7, 'kg', t(2))], [add('b', 0.7, 'kg', t(2)), add('a', 500, 'g', t(1))]]) {
    const row = merge(start, order).items.find(item => item.id === 'mehl');
    assert.equal(row.quantity, 1.5);
    assert.equal(row.unit, 'kg');
  }
});

test('Ältere Datensätze ohne Zuwachsliste funktionieren, Zusatzfelder bleiben gültig', () => {
  const legacy = structuredClone(base());
  assert.equal(legacy.items.find(row => row.id === 'milch')._adds, undefined);
  const out = merge(legacy, [op('x', 'milch', { add: { quantity: 2, unit: 'Stück' } }, t(5))]);
  assert.equal(qty(out), 3);
  assert.doesNotThrow(() => validate(out));
  assert.throws(() => validate({ ...out, items: out.items.map(row => row.id === 'milch' ? { ...row, _adds: [{ id: 'a', at: 'x' }] } : row) }), /Mengenänderungen/);
});

test('Zuwachs für einen aufgeräumten Artikel wird verworfen, die Datei bleibt gültig', () => {
  const out = merge(base(), [op('orphan', 'gibt-es-nicht', { add: { quantity: 1, unit: 'Stück' } }, t(5))]);
  assert.ok(!out.items.some(row => row.id === 'gibt-es-nicht'));
  assert.doesNotThrow(() => validate(out));
});

test('Gleichzeitig angelegte Doppel werden einmalig zusammengeführt, auf beiden Geräten mit denselben Änderungen', () => {
  const shared = merge(structuredClone(demo), []);
  const nico = [create('n1', {}, t(10), 'Nico')], anna = [create('a1', {}, t(11), 'Anna')];
  const both = merge(shared, [...nico, ...anna]);
  assert.equal(active(both.items).filter(row => row.name === 'Quark').length, 2, 'beide Einträge sind erst einmal da');
  const foldsA = duplicateFolds(both.items, t(20)), foldsB = duplicateFolds(both.items, t(21));
  assert.deepEqual(foldsA.map(entry => entry.id), foldsB.map(entry => entry.id), 'beide Geräte erzeugen dieselben Änderungen');
  const merged = merge(both, foldsA);
  const milk = active(merged.items).filter(row => row.name === 'Quark');
  assert.equal(milk.length, 1);
  assert.equal(milk[0].id, 'n1', 'der zuerst angelegte bleibt');
  assert.equal(milk[0].quantity, 2);
  // Das zweite Gerät wendet seine (gleichen) Änderungen danach an: nichts wird doppelt gezählt
  assert.equal(merge(merged, foldsB).items.find(row => row.id === 'n1').quantity, 2);
  assert.deepEqual(duplicateFolds(merged.items, t(30)), [], 'danach gibt es nichts mehr zusammenzuführen');
});

test('Zusammenführen: verschiedene Geschäfte, unpassende Einheiten, erledigte und Artikel mit eigenem Preis bleiben getrennt', () => {
  const data = merge(structuredClone(demo), [create('a', {}, t(1)), create('b', { storeId: 'store-edeka' }, t(2)), create('c', { unit: 'l' }, t(3)),
    create('d', { checked: true }, t(4)), create('e', { price: { cents: 99, quantity: 1, unit: 'Stück' } }, t(5))]);
  // a und b (anderes Geschäft), c (andere Einheit), d (erledigt) und e (eigener Preis) bleiben getrennt; zusammengeführt wird nichts
  assert.deepEqual(duplicateFolds(data.items, t(9)).map(entry => entry.id), []);
  // Zwei gleiche Einträge ohne Besonderheiten werden dagegen zusammengeführt
  const twin = merge(data, [create('f', {}, t(6))]);
  assert.deepEqual(duplicateFolds(twin.items, t(9)).map(entry => entry.id), ['fold-add-f', 'fold-del-f']);
});

test('Aufräumen übernimmt alte Zuwächse in die Menge und ändert danach nichts mehr', () => {
  const NOW = new Date('2026-12-31T12:00:00.000Z');
  const data = merge(base(), [op('a1', 'milch', { add: { quantity: 1, unit: 'Stück' } }, t(5)), op('a2', 'milch', { add: { quantity: 1, unit: 'Stück' } }, '2026-12-30T10:00:00.000Z')]);
  assert.equal(qty(data), 3);
  const first = compact(data, NOW);
  assert.ok(first.changed);
  const row = first.data.items.find(item => item.id === 'milch');
  assert.equal(row.quantity, 3);
  assert.equal(row._adds?.length, 1, 'der Zuwachs von gestern bleibt noch einzeln erhalten');
  assert.equal(qty(merge(first.data, [op('a3', 'milch', { add: { quantity: 1, unit: 'Stück' } }, '2026-12-31T11:00:00.000Z')])), 4);
  const second = compact(first.data, NOW);
  assert.equal(second.changed, false);
  // ein spät eintreffender Zuwachs eines lange offline gewesenen Geräts geht nicht verloren
  assert.equal(qty(merge(first.data, [op('late', 'milch', { add: { quantity: 5, unit: 'Stück' } }, t(7))])), 8);
});
