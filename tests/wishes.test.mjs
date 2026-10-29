import assert from 'node:assert/strict';
import { test } from 'node:test';
import { active, duplicateFolds, emptyData, foldIntoList, merge, operation, validate } from '../data.js';
import { hasWishDetails, productLink } from '../wishes.js';

const at = '2026-10-29T12:00:00.000Z';
const later = '2026-10-29T12:00:01.000Z';
const base = () => merge(emptyData(), [operation('stores', 'wishes', { name: 'Wünsche', separate: true }, 'Nico', at),
  operation('items', 'rope', { storeId: 'wishes', name: 'Springseil', quantity: 1, unit: 'Stück', checked: false, createdBy: 'Nico' }, 'Nico', at)]);

test('Produktlink: HTTPS, Leerraum und Umlaute; leeres Feld ist erlaubt', () => {
  assert.equal(productLink(' https://www.amazon.de/dp/B000TEST?variant=black '), 'https://www.amazon.de/dp/B000TEST?variant=black');
  assert.equal(productLink(''), '');
  assert.equal(productLink(null), '');
  assert.equal(productLink('https://example.org/Größe'), 'https://example.org/Gr%C3%B6%C3%9Fe');
  for (const bad of ['javascript:alert(1)', 'data:text/html,Hallo', 'http://example.org', '//example.org', 'https://name:pass@example.org/', 'kein Link', 'https://example.org/' + 'a'.repeat(2000)]) {
    assert.throws(() => productLink(bad));
  }
});

test('Wunschfelder sind optional; ungültige Links und zu lange oder falsche Notizen verhindern Schreiben', () => {
  assert.doesNotThrow(() => validate(base()));
  for (const patch of [{ wishUrl: 1 }, { wishUrl: 'javascript:alert(1)' }, { wishNote: [] }, { wishNote: 'a'.repeat(1001) }]) {
    assert.throws(() => merge(base(), [operation('items', 'rope', patch, 'Nico', later)]));
  }
  for (const patch of [{ wishUrl: '', wishNote: '' }, { wishUrl: null, wishNote: null }, { wishNote: 'a'.repeat(1000) }]) {
    assert.doesNotThrow(() => merge(base(), [operation('items', 'rope', patch, 'Nico', later)]));
  }
});

test('Zwei Personen ändern Link und Notiz unabhängig; Abhaken und Mengen bleiben erhalten', () => {
  const shared = base();
  const nico = operation('items', 'rope', { wishUrl: 'https://example.org/rope' }, 'Nico', later);
  const anna = operation('items', 'rope', { wishNote: 'Schwarz, ohne Gewichte', checked: true }, 'Anna', later);
  const one = merge(merge(shared, [nico]), [anna]);
  const other = merge(merge(shared, [anna]), [nico]);
  for (const data of [one, other]) {
    const row = data.items[0];
    assert.equal(row.wishUrl, 'https://example.org/rope');
    assert.equal(row.wishNote, 'Schwarz, ohne Gewichte');
    assert.equal(row.checked, true);
    assert.equal(row.quantity, 1);
    assert.equal(data.sync.minRev, 4, 'ältere Apps dürfen solche Wünsche nicht versehentlich zusammenlegen');
  }
  assert.deepEqual(one.items, other.items);
});

test('Wunschdetails bleiben bei Verschieben, Export und erneutem Senden erhalten; normale Bearbeitung belebt nichts wieder', () => {
  const note = operation('items', 'rope', { wishNote: '3 m lang', wishUrl: 'https://example.org/rope' }, 'Nico', later);
  let data = merge(base(), [note]);
  data = merge(data, [operation('items', 'rope', { storeId: '' }, 'Anna', '2026-10-29T12:00:02.000Z')]);
  assert.deepEqual(merge(data, [note]), data);
  const exported = JSON.parse(JSON.stringify(data));
  assert.equal(exported.items[0].wishNote, '3 m lang');
  assert.equal(exported.items[0].wishUrl, 'https://example.org/rope');
  data = merge(data, [operation('items', 'rope', { deletedAt: later }, 'Anna', '2026-10-29T12:00:03.000Z')]);
  data = merge(data, [operation('items', 'rope', { wishNote: 'Neue Notiz' }, 'Nico', '2026-10-29T12:00:04.000Z')]);
  assert.equal(active(data.items).length, 0);
});

test('Konkrete Wünsche werden beim Hinzufügen und Abgleich nicht mit gleichnamigen Produkten verschmolzen', () => {
  const data = merge(base(), [operation('items', 'rope', { wishUrl: 'https://example.org/model-a' }, 'Nico', later)]);
  const original = data.items[0];
  const second = { ...original, id: 'second', wishUrl: 'https://example.org/model-b' };
  const plain = { ...original, id: 'third', wishUrl: '', wishNote: '' };
  assert.equal(hasWishDetails(original), true);
  assert.equal(hasWishDetails({ wishNote: 'Farbe schwarz' }), true);
  assert.equal(hasWishDetails(plain), false);
  assert.equal(duplicateFolds([original, second, plain]).length, 0);
  const result = foldIntoList([{ name: 'Springseil', quantity: 1, unit: 'Stück' }], 'wishes', [original]);
  assert.equal(result.fresh.length, 1);
  assert.equal(result.counted.length, 0);
});
