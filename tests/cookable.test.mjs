import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { availability, indexNames, namesFrom, rankRecipes, required } from '../cookable.js';
import { NO_AMOUNT } from '../recipe-import.js';

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

test('Nur Vorrat ist Standard; Einkauf und Kaufdatum machen Zutaten niemals automatisch verfügbar',()=>{
 const pantry=[{name:'Karotten',available:true},{name:'Milch',available:false}],items=[{name:'Nudeln',checked:false},{name:'Milch',checked:true,shopBoughtAt:new Date().toISOString()}];
 assert.deepEqual(namesFrom({pantry,items}),{have:['Karotten'],soon:[]});
 assert.deepEqual(namesFrom({pantry,items,mode:'shopping'}),{have:['Karotten'],soon:['Nudeln']});
 assert.equal(availability('KAROTTE',indexNames(namesFrom({pantry,items}))),'have');
 for(const name of ['Salz','Pfeffer','Wasser'])assert.equal(required(row('x',name,'g')),false);
});
