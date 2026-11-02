import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { availability, canCookRecipe, indexNames, namesFrom, rankRecipes, required } from '../cookable.js';
import { NO_AMOUNT } from '../recipe-import.js';
import { active, addToList, emptyData, merge, operation } from '../data.js';

const check = (name, have = [], soon = []) => availability(name, indexNames({ have, soon }));
const row = (id, name, unit = 'g') => ({ id, name, unit });
const recipe = (id, name, extra = {}) => ({ id, name, ...extra });

describe('Zutaten finden', () => {
  test('Einzahl und Mehrzahl, Zusätze und Wortreihenfolge sind egal', () => {
    assert.equal(check('Zwiebel', ['Zwiebeln']), 'have');
    assert.equal(check('Zwiebeln', ['Zwiebel']), 'have');
    assert.equal(check('Tomaten', ['tomate']), 'have');
    assert.equal(check('Eier', ['Ei']), 'have');
    assert.equal(check('rote Zwiebel (klein)', ['Zwiebeln']), 'have');
    assert.equal(check('Zwiebeln', ['Zwiebeln, rot']), 'have');
    assert.equal(check('Äpfel', ['Apfel']), 'have');
    assert.equal(check('frische Petersilie', ['Petersilie']), 'have');
  });
  test('gleichbedeutende Namen: Öl, Sahne, Hack, Mehl, Milch', () => {
    assert.equal(check('Öl', ['Olivenöl']), 'have');
    assert.equal(check('Olivenöl', ['Rapsöl']), 'have');
    assert.equal(check('Schlagsahne', ['Sahne']), 'have');
    assert.equal(check('Hackfleisch (gemischt)', ['Hack']), 'have');
    assert.equal(check('Weizenmehl', ['Mehl']), 'have');
    assert.equal(check('Milch', ['Vollmilch']), 'have');
  });
  test('Verwechslungen werden nicht geraten: Tomatenmark ist keine Tomate, Reisnudeln kein Reis, Buttermilch keine Butter', () => {
    assert.equal(check('Tomatenmark', ['Tomaten']), 'missing');
    assert.equal(check('Tomaten', ['Tomatenmark']), 'missing');
    assert.equal(check('Reisnudeln', ['Reis']), 'missing');
    assert.equal(check('Butter', ['Buttermilch']), 'missing');
    assert.equal(check('Kokosmilch', ['Milch']), 'missing');
    assert.equal(check('Zwiebeln', ['Frühlingszwiebeln']), 'missing');
    assert.equal(check('Käse', []), 'missing');
  });
  test('da geht vor „kommt noch“, mehrere Teile: der schlechteste zählt', () => {
    assert.equal(check('Nudeln', ['Nudeln'], ['Nudeln']), 'have');
    assert.equal(check('Nudeln', [], ['Nudeln']), 'soon');
    assert.equal(check('Salz und Pfeffer', ['Salz']), 'have');
    assert.equal(check('Salz und Pfeffer', ['Salz', 'Pfeffer']), 'have');
    assert.equal(check('Salz, Pfeffer', ['Salz'], ['Pfeffer']), 'have');
    assert.equal(check('Wasser'), 'have', 'Wasser ist immer da');
    assert.equal(check(''), 'have');
  });
  test('Zutaten „nach Bedarf“ und Wasser sind nicht erforderlich', () => {
    assert.equal(required(row('1', 'Salz', NO_AMOUNT)), false);
    assert.equal(required(row('2', 'Wasser', 'ml')), false);
    assert.equal(required(row('3', 'Wasser und Salz', 'ml')), false);
    assert.equal(required(row('4', 'Mehl', 'g')), true);
  });
});

describe('Rezepte ordnen', () => {
  const recipes = [recipe('r1', 'Nudeln mit Tomatensoße'), recipe('r2', 'Pfannkuchen'), recipe('r3', 'Curry'), recipe('r4', 'Salat'), recipe('r5', 'Nichts da'), recipe('r6', 'Nur Gewürze')];
  const ingredients = {
    r1: [row('a1', 'Nudeln'), row('a2', 'Tomaten'), row('a3', 'Zwiebel', 'Stück'), row('a4', 'Salz', NO_AMOUNT)],
    r2: [row('b1', 'Mehl'), row('b2', 'Eier', 'Stück'), row('b3', 'Milch', 'ml')],
    r3: [row('c1', 'Reis'), row('c2', 'Kokosmilch', 'ml'), row('c3', 'Curry', 'EL'), row('c4', 'Zwiebel', 'Stück')],
    r4: [row('d1', 'Salat'), row('d2', 'Gurke'), row('d3', 'Essig'), row('d4', 'Öl')],
    r5: [row('e1', 'Hummer'), row('e2', 'Trüffel'), row('e3', 'Safran')],
    r6: [row('f1', 'Salz', NO_AMOUNT), row('f2', 'Wasser', 'ml')]
  };
  const of = recipe => ingredients[recipe.id];
  test('alles da, alles da sobald eingekauft, es fehlt etwas', () => {
    const result = rankRecipes(recipes, of, { have: ['Nudeln', 'Zwiebeln', 'Mehl', 'Eier', 'Milch', 'Reis', 'Öl'], soon: ['Tomaten', 'Gurke'] });
    assert.deepEqual(result.map(entry => [entry.recipe.id, entry.tier]), [['r2', 0], ['r1', 1], ['r3', 2], ['r4', 2]]);
    const curry = result.find(entry => entry.recipe.id === 'r3');
    assert.deepEqual(curry.have, ['Reis', 'Zwiebel']);
    assert.deepEqual(curry.missing, [{ id: 'c2', name: 'Kokosmilch' }, { id: 'c3', name: 'Curry' }]);
    const salad = result.find(entry => entry.recipe.id === 'r4');
    assert.deepEqual([salad.have, salad.soon, salad.missing.map(entry => entry.name)], [['Öl'], ['Gurke'], ['Salat', 'Essig']]);
    assert.ok(!result.some(entry => entry.recipe.id === 'r5'), 'ohne eine einzige Zutat kein Vorschlag');
    assert.ok(!result.some(entry => entry.recipe.id === 'r6'), 'Rezepte ohne erforderliche Zutaten werden übergangen');
  });
  test('weniger als die Hälfte der Zutaten: kein Vorschlag; genau die Hälfte: Vorschlag', () => {
    const one = rankRecipes(recipes, of, { have: ['Reis'], soon: [] }), two = rankRecipes(recipes, of, { have: ['Reis', 'Curry'], soon: [] });
    assert.ok(!one.some(entry => entry.recipe.id === 'r3'), '1 von 4 reicht nicht');
    assert.ok(two.some(entry => entry.recipe.id === 'r3'), '2 von 4 reicht');
  });
  test('bei Gleichstand: am längsten nicht gekocht zuerst (nie gekocht ganz vorn), dann Favoriten, dann Name', () => {
    const list = [recipe('x1', 'Zebra', { lastCookedAt: '2026-05-01' }), recipe('x2', 'Anton', { lastCookedAt: '2026-06-01' }), recipe('x3', 'Berta'),
      recipe('x4', 'Clara', { lastCookedAt: '2026-05-01', favorite: true }), recipe('x5', 'Dora', { lastCookedAt: '2026-05-01' })];
    const rows = { x1: [row('1', 'Mehl')], x2: [row('2', 'Mehl')], x3: [row('3', 'Mehl')], x4: [row('4', 'Mehl')], x5: [row('5', 'Mehl')] };
    const order = rankRecipes(list, item => rows[item.id], { have: ['Mehl'], soon: [] }).map(entry => entry.recipe.name);
    assert.deepEqual(order, ['Berta', 'Clara', 'Dora', 'Zebra', 'Anton']);
  });
  test('bei Stufe 2 zuerst die mit den wenigsten fehlenden Zutaten; Begrenzung der Zahl', () => {
    const list = [recipe('y1', 'Drei fehlen'), recipe('y2', 'Eins fehlt'), recipe('y3', 'Zwei fehlen')];
    const rows = { y1: ['A', 'B', 'C', 'Ha', 'Hb', 'Hc'], y2: ['A', 'Ha', 'Hb', 'Hc', 'Hd'], y3: ['A', 'B', 'Ha', 'Hb', 'Hc'] };
    const names = { have: ['Ha', 'Hb', 'Hc', 'Hd'], soon: [] };
    const result = rankRecipes(list, item => rows[item.id].map((name, index) => row(`${item.id}${index}`, name)), names);
    assert.deepEqual(result.map(entry => [entry.recipe.name, entry.missing.length]), [['Eins fehlt', 1], ['Zwei fehlen', 2], ['Drei fehlen', 3]]);
    assert.equal(rankRecipes(list, item => rows[item.id].map((name, index) => row(`${item.id}${index}`, name)), names, 2).length, 2);
    assert.equal(rankRecipes(list, item => rows[item.id].map((name, index) => row(`${item.id}${index}`, name)), names, 0).length, 3, 'ohne Grenze alle');
  });
  test('ohne Rezepte oder Vorräte kommt eine leere Liste', () => {
    assert.deepEqual(rankRecipes([], of, { have: [], soon: [] }), []);
    assert.deepEqual(rankRecipes(recipes, of, { have: [], soon: [] }).map(entry => entry.recipe.id), []);
  });
});

describe('Was ist da?', () => {
  const now = Date.parse('2026-05-20T12:00:00.000Z'), day = 86400000, at = days => new Date(now - days * day).toISOString();
  const item = (name, extra) => ({ name, checked: false, updatedAt: at(0), deletedAt: null, ...extra });
  test('Nur aktueller Vorrat ist da, offene Artikel kommen nur im Zettel-Modus noch', () => {
    const names = namesFrom({ now, mode:'shopping', pantry: [{ name: 'Salz' }, { name: 'Mehl', deletedAt: at(1) }, { name: 'Öl' }], items: [
      item('Nudeln', { checked: true }), item('Milch'), item('Tomaten', { checked: true, deletedAt: at(2), updatedAt: at(2) }),
      item('Butter', { checked: true, deletedAt: at(7 + 1), updatedAt: at(7 + 1) }),
      item('Käse', { checked: false, deletedAt: at(1), updatedAt: at(1) }), item('Brot', { checked: true, updatedAt: at(7 + 3) }), { name: 5 }] });
    assert.deepEqual(names.have, ['Salz', 'Öl']);
    assert.deepEqual(names.soon, ['Milch']);
  });
  test('ohne Angaben leere Listen', () => {
    assert.deepEqual(namesFrom({}), { have: [], soon: [] });
  });
});

test('Entfernte Wochenplan-Mengen zählen weder als offene Einkäufe noch als vier kochbare Rezepte', () => {
  const names = ['Milch', 'Nudeln', 'Eier', 'Tomaten'], at = '2026-11-02T10:00:00.000Z';
  const added = addToList(names.map((name, i) => ({ name, quantity: 100, unit: 'g', key: `ingredient-${i}` })), '', 'Nico', at, [], [], 'empty-cookable');
  let data = merge(emptyData(), added.ops);
  data = merge(data, added.ops.map(source => operation('items', source.entityId, { cutPlan: {
    sourceId: source.id, name: source.patch.name, storeId: '', at: source.at, quantity: 100, originalQuantity: 100, unit: 'g'
  } }, 'Nico', '2026-11-02T10:01:00.000Z')));
  assert.equal(data.items.length, 4, 'die Korrekturen bleiben für den Geräteabgleich gespeichert');
  assert.equal(active(data.items).length, 0, 'im echten Einkaufszettel steht kein Produkt mehr');
  const available = namesFrom({ pantry: [], items: data.items, mode: 'shopping' });
  const recipes = names.map((name, i) => recipe(`r${i}`, name));
  assert.deepEqual(rankRecipes(recipes, item => [row(`i${item.id}`, item.name)], available), [], 'leerer Zettel darf keine vier Rezepte als nach dem Einkauf kochbar zählen');
  assert.deepEqual(available.soon, []);
});

test('Kochbarkeit braucht prüfbare Zutaten und berücksichtigt nur lebende offene Einkäufe', () => {
  const names = namesFrom({ mode: 'shopping', items: [
    { name: 'Mehl', quantity: 0 }, { name: 'Milch', checked: true }, { name: 'Eier', deletedAt: '2026-11-02T10:00:00Z' },
    { name: 'Tomaten', quantity: 1, _planEmpty: true }, { name: 'Nudeln', quantity: 1, checked: false }
  ] });
  const index = indexNames(names);
  for (const ingredients of [[], [row('salt', 'Salz')], [row('water', 'Wasser')], [row('spice', 'Kräuter', NO_AMOUNT)],
    ...['Mehl', 'Milch', 'Eier', 'Tomaten'].map(name => [row(name, name)])]) assert.equal(canCookRecipe(ingredients, index), false, JSON.stringify(ingredients));
  assert.equal(canCookRecipe([row('pasta', 'Nudeln')], index), true, 'echte offene Einkäufe sind nach dem Einkauf nutzbar');
  assert.equal(canCookRecipe([row('pasta', 'Nudeln')], indexNames({ have: [] })), false, 'sie zählen nicht bereits als Vorrat');
});

test('Smart-Stock-Ablauf und Aufbrauchen werden zum selben Zeitpunkt für Rezeptfilter berücksichtigt', () => {
  const at = '2026-11-02T10:00:00.000Z', until = '2026-11-03T10:00:00.000Z';
  const pantry = [{ id: 'milk', name: 'Milch', available: true, updatedAt: at, autoStock: { purchaseId: 'p', boughtAt: at, expiresAt: until } }];
  const cookable = (now, rows = pantry) => canCookRecipe([row('i', 'Milch')], indexNames(namesFrom({ pantry: rows, now })));
  assert.equal(cookable(Date.parse(until) - 1), true);
  assert.equal(cookable(Date.parse(until)), false);
  assert.equal(cookable(Date.parse(at), [{ ...pantry[0], available: false }]), false);
});

test('Nur Vorrat ist Standard; Einkauf und Kaufdatum machen Zutaten niemals automatisch verfügbar',()=>{
 const pantry=[{name:'Karotten',available:true},{name:'Milch',available:false}],items=[{name:'Nudeln',checked:false},{name:'Milch',checked:true,shopBoughtAt:new Date().toISOString()}];
 assert.deepEqual(namesFrom({pantry,items}),{have:['Karotten'],soon:[]});
 assert.deepEqual(namesFrom({pantry,items,mode:'shopping'}),{have:['Karotten'],soon:['Nudeln']});
 assert.equal(availability('KAROTTE',indexNames(namesFrom({pantry,items}))),'have');
 for(const name of ['Salz','Pfeffer','Wasser'])assert.equal(required(row('x',name,'g')),false);
});
