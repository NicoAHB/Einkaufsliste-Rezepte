import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL_STORES, HOLD_FINISH_MS, HOLD_UNLOCK_MS, LOCK_CHOICES, LOCK_DEFAULT, isSeparate, lockSeconds, shopAllView, shopCount, shopView, takesAnywhere, withoutSeparate } from '../shop.js';

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

test('Auswahl „Alle“: erst Artikel ohne Geschäft, dann ein Abschnitt je Geschäft; Erledigtes aus allen Geschäften; leere Abschnitte fehlen', () => {
  const stores = [{ id: 'edeka', name: 'Edeka' }, { id: 'lidl', name: 'Lidl' }, { id: 'rewe', name: 'Rewe' }];
  const all = shopAllView(items, stores);
  assert.deepEqual(all.sections.map(section => [section.store?.id ?? null, ids(section.open)]), [[null, ['brot']], ['edeka', ['milch']], ['lidl', ['kaese']]], 'Rewe hat nichts offen und fehlt');
  assert.deepEqual(ids(all.done), ['nudeln', 'eier'], 'abgehakt, egal für welches Geschäft');
  assert.equal(all.count, 3);
  assert.deepEqual(shopAllView([], stores), { sections: [], done: [], count: 0 });
  assert.deepEqual(shopAllView(items, []).sections.map(section => section.store), [null], 'ohne Geschäfte bleiben nur die Artikel ohne Geschäft');
  assert.notEqual(ALL_STORES, '', 'die Kennung unterscheidet sich von „kein Geschäft“');
  assert.ok(!stores.some(store => store.id === ALL_STORES));
});

test('Sperre im Laden: gültige Wartezeit, Standard bei Unsinn, Haltezeiten spürbar aber nicht lästig', () => {
  assert.equal(lockSeconds(undefined), LOCK_DEFAULT);
  assert.equal(lockSeconds('abc'), LOCK_DEFAULT);
  assert.equal(lockSeconds(-5), LOCK_DEFAULT);
  assert.equal(lockSeconds(99999), LOCK_DEFAULT);
  assert.equal(lockSeconds(NaN), LOCK_DEFAULT);
  assert.equal(lockSeconds(0), 0, 'null heißt nie sperren');
  assert.equal(lockSeconds(45.4), 45);
  for (const seconds of LOCK_CHOICES) assert.equal(lockSeconds(seconds), seconds);
  assert.ok(LOCK_CHOICES.includes(LOCK_DEFAULT));
  assert.equal(LOCK_DEFAULT, 10, 'Standard seit Version 2.33: 10 Sekunden');
  assert.ok(HOLD_FINISH_MS >= 500 && HOLD_FINISH_MS <= 1200);
  assert.ok(HOLD_UNLOCK_MS >= 400 && HOLD_UNLOCK_MS <= 1000);
});

test('Eigene Liste („Wünsche“): ihre Artikel stehen nur, wenn genau dieses Geschäft gewählt ist; sie nimmt nie Artikel ohne Geschäft auf', () => {
  const stores = [{ id: 'edeka', name: 'Edeka' }, { id: 'wuensche', name: 'Wünsche', separate: true }, { id: 'lidl', name: 'Lidl', separate: false }];
  assert.equal(isSeparate(stores[1]), true);
  assert.equal(isSeparate(stores[0]), false);
  assert.equal(isSeparate(stores[2]), false);
  assert.equal(isSeparate(undefined), false);
  const rows = [item('milch', 'edeka'), item('fahrrad', 'wuensche'), item('brot', ''), item('kaese', 'lidl'), item('buch', 'wuensche', true)];
  assert.deepEqual(ids(withoutSeparate(rows, stores)), ['milch', 'brot', 'kaese'], 'ohne Auswahl: keine eigene Liste');
  assert.deepEqual(ids(withoutSeparate(rows, stores, 'edeka')), ['milch', 'brot', 'kaese'], 'ein anderes Geschäft gewählt: auch nicht');
  assert.deepEqual(ids(withoutSeparate(rows, stores, 'wuensche')), ['milch', 'fahrrad', 'brot', 'kaese', 'buch'], 'die eigene Liste ist gewählt: sie ist dabei');
  const plain = [item('milch', 'edeka')];
  assert.equal(withoutSeparate(plain, [stores[0]]), plain, 'ohne eigene Liste unverändert');
  // Eine eigene Liste nimmt keine Artikel ohne Geschäft auf, auch wenn es ausdrücklich eingestellt ist
  assert.equal(takesAnywhere({ name: 'Wünsche', separate: true }), false);
  assert.equal(takesAnywhere({ name: 'Wünsche', separate: true, anywhere: true }), false);
  assert.equal(takesAnywhere({ name: 'Edeka', separate: false }), true);
  const wishes = shopView(withoutSeparate(rows, stores, 'wuensche'), 'wuensche', new Map(), takesAnywhere(stores[1]));
  assert.deepEqual(ids(wishes.open), ['fahrrad']);
  assert.deepEqual(ids(wishes.anywhere), [], 'Brot steht bei den Wünschen nicht');
  assert.deepEqual(ids(wishes.done), ['buch']);
  assert.equal(shopCount(rows, 'wuensche', takesAnywhere(stores[1])), 1, 'der Zähler am Reiter: nur die eigenen offenen Artikel');
  // Edeka und „Alle“ sehen sie nicht und zählen sie nicht als „für andere Geschäfte“
  assert.equal(shopView(withoutSeparate(rows, stores, 'edeka'), 'edeka').elsewhere, 1, 'nur Lidl-Käse');
  const all = shopAllView(withoutSeparate(rows, stores), stores);
  assert.deepEqual(all.sections.map(section => section.store?.id ?? null), [null, 'edeka', 'lidl']);
  assert.equal(all.count, 3);
  assert.deepEqual(ids(all.done), []);
});
