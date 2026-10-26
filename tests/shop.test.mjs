import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shopCount, shopView } from '../shop.js';

const item = (id, storeId, checked = false) => ({ id, storeId, checked, name: id });
const items = [item('milch', 'edeka'), item('brot', ''), item('kaese', 'lidl'), item('nudeln', 'edeka', true), item('eier', '', true)];
const ids = rows => rows.map(row => row.id);

test('Geschäft wählen: eigene offene Artikel, „überall möglich“, Erledigtes und Zahl für andere Geschäfte', () => {
  const edeka = shopView(items, 'edeka');
  assert.deepEqual(ids(edeka.open), ['milch']);
  assert.deepEqual(ids(edeka.anywhere), ['brot']);
  assert.deepEqual(ids(edeka.done), ['nudeln'], 'ein abgehakter Artikel ohne Geschäft aus einer früheren Sitzung steht nirgends');
  assert.equal(edeka.elsewhere, 1);
  assert.deepEqual(ids(shopView(items, 'lidl').open), ['kaese']);
});

test('Bei Edeka abgehakt, bei Lidl nicht mehr aufgelistet; unter Erledigt nur dort, wo es abgehakt wurde', () => {
  const session = new Map([['brot', 'edeka']]);
  const bought = items.map(row => row.id === 'brot' ? { ...row, checked: true } : row);
  assert.deepEqual(ids(shopView(bought, 'edeka', session).done).sort(), ['brot', 'nudeln']);
  const lidl = shopView(bought, 'lidl', session);
  assert.deepEqual(ids(lidl.anywhere), [], 'nicht mehr offen');
  assert.deepEqual(ids(lidl.done), [], 'und auch nicht unter Erledigt');
  assert.equal(shopCount(bought, 'lidl'), 1, 'nur noch der Käse');
  assert.equal(shopCount(items, 'lidl'), 2, 'vorher Käse und Brot');
  // wieder geöffnet (z. B. versehentlich abgehakt): überall wieder da
  assert.deepEqual(ids(shopView(items, 'lidl', session).anywhere), ['brot']);
});

test('Zahlen für die Geschäftsleiste und leere Fälle', () => {
  assert.equal(shopCount(items, 'edeka'), 2);
  assert.equal(shopCount(items, 'rewe'), 1, 'nur „überall möglich“');
  assert.deepEqual(shopView([], 'edeka'), { open: [], anywhere: [], done: [], elsewhere: 0 });
});
