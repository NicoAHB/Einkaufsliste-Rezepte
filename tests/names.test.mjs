import assert from 'node:assert/strict';
import { test } from 'node:test';
import { frequentItems, spellingStem, spellingVariants } from '../data.js';

test('Schreibweisen: Einzahl/Mehrzahl und Umlaute führen zum selben Stamm', () => {
  for (const [a, b] of [['Zwiebel', 'Zwiebeln'], ['Tomate', 'Tomaten'], ['Gurke', 'Gurken'], ['Apfel', 'Äpfel'], ['Ei', 'Eier'], ['Nuss', 'Nüsse'], ['rote Zwiebel', 'Rote Zwiebeln'], ['Kartoffel', 'Kartoffeln']]) {
    assert.equal(spellingStem(a), spellingStem(b), `${a} ~ ${b}`);
  }
  for (const [a, b] of [['Ei', 'Eis'], ['Milch', 'Mehl'], ['Reis', 'Rei'], ['Tomaten', 'Tomatenmark'], ['Butter', 'Buttermilch']]) {
    assert.notEqual(spellingStem(a), spellingStem(b), `${a} ≠ ${b}`);
  }
});

test('Vorschläge: nur andere Schreibweisen bekannter Namen, nie der gleiche Name, nichts bei sehr kurzen Eingaben', () => {
  const known = ['Zwiebeln', 'Tomaten', 'Milch', 'Eier', 'Eis'];
  assert.deepEqual(spellingVariants('Zwiebel', known), ['Zwiebeln']);
  assert.deepEqual(spellingVariants('zwiebeln', known), [], 'genau gleicher Name (Groß-/Kleinschreibung egal): nichts vorzuschlagen');
  assert.deepEqual(spellingVariants('Tomate', known), ['Tomaten']);
  assert.deepEqual(spellingVariants('Ei', known), ['Eier'], '„Ei“ meint Eier, nicht Eis');
  assert.deepEqual(spellingVariants('Brot', known), []);
  assert.deepEqual(spellingVariants('', known), []);
  assert.deepEqual(spellingVariants('a', ['an']), [], 'ein einzelner Buchstabe wird nicht geraten');
});

test('Schnellwahl: häufig gekaufte Artikel, ohne bereits offene, mit zuletzt verwendeter Einheit', () => {
  const row = (name, at, extra = {}) => ({ name, createdAt: at, updatedAt: at, deletedAt: null, checked: true, unit: 'Stück', ...extra });
  const history = [row('Milch', 'a1', { unit: 'l' }), row('milch', 'a2', { unit: 'l' }), row('Milch', 'a3', { unit: 'Packung' }), row('Eier', 'b1', { unit: 'Packung' }), row('Eier', 'b2', { unit: 'Packung' }),
    row('Kochschinken', 'c1', { checked: false, _adds: [{ id: 'x' }, { id: 'y' }] }), row('Brot', 'd1'), { name: 'Nudeln', weight: 5, updatedAt: 'e1', unit: 'g' }];
  const items = history.filter(entry => entry.checked === false);
  assert.deepEqual(frequentItems(history, items).map(entry => entry.name), ['Nudeln', 'Milch', 'Eier'], 'Kochschinken ist schon offen, Brot kam nur einmal vor');
  assert.equal(frequentItems(history, []).find(entry => entry.name === 'Kochschinken').count, 3, 'Zuwächse zählen mit');
  const milk = frequentItems(history, items).find(entry => entry.name === 'Milch');
  assert.deepEqual([milk.count, milk.unit], [3, 'Packung']);
  assert.equal(frequentItems(history, [], 1).length, 1);
  assert.deepEqual(frequentItems([], []), []);
});
