import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shopCount, shopView, takesAnywhere } from '../shop.js';

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
  assert.deepEqual(shopView([], 'edeka'), { open: [], anywhere: [], done: [], elsewhere: 0, hidden: 0 });
});

test('Geschäfte ohne „Überall möglich“ (Drogerien): Artikel ohne Geschäft stehen dort nicht, werden aber gezählt', () => {
  const items = [{ id: 'a', storeId: '', checked: false }, { id: 'b', storeId: 'ross', checked: false }, { id: 'c', storeId: 'edeka', checked: false },
    { id: 'd', storeId: '', checked: true }];
  const ids = rows => rows.map(row => row.id);
  const normal = shopView(items, 'ross');
  assert.deepEqual(ids(normal.anywhere), ['a']);
  const strict = shopView(items, 'ross', new Map([['d', 'ross']]), false);
  assert.deepEqual(ids(strict.open), ['b']);
  assert.deepEqual(ids(strict.anywhere), []);
  assert.deepEqual(ids(strict.done), [], 'auch Erledigtes ohne Geschäft wird dort nicht gezeigt');
  assert.equal(strict.hidden, 1, 'für den Hinweis');
  assert.equal(strict.elsewhere, 1);
  assert.equal(shopCount(items, 'ross'), 2);
  assert.equal(shopCount(items, 'ross', false), 1, 'der Zähler am Reiter stimmt mit der Liste überein');
});

test('Drogerien nehmen Artikel ohne Geschäft standardmäßig nicht, Supermärkte schon; eine ausdrückliche Einstellung gewinnt', () => {
  for (const name of ['Rossmann', 'Roßmann', 'ROSSMANN', 'dm', 'dm-drogerie markt', 'Müller', 'Douglas']) assert.equal(takesAnywhere({ name }), false, name);
  for (const name of ['Edeka', 'Lidl', 'Rewe', 'Aldi', 'Dmitri Markt', 'Rossmannshof Bäckerei']) assert.equal(takesAnywhere({ name }), true, name);
  assert.equal(takesAnywhere({ name: 'Rossmann', anywhere: true }), true);
  assert.equal(takesAnywhere({ name: 'Edeka', anywhere: false }), false);
  assert.equal(takesAnywhere(undefined), true);
});
