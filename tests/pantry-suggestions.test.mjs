import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pantryAdditions, pantryKeys } from '../data.js';
import { productKey } from '../prices.js';
import { PANTRY_SUGGESTIONS, pantrySuggestions } from '../pantry-suggestions.js';

const names = PANTRY_SUGGESTIONS.flatMap(group => group.names);

test('Vorschläge für den Vorrat: Gruppen mit Titel, keine doppelten Namen, jeder Name ist ein einzelner gültiger Vorratsname', () => {
  assert.ok(PANTRY_SUGGESTIONS.length >= 4);
  for (const group of PANTRY_SUGGESTIONS) { assert.ok(group.title.trim()); assert.ok(group.names.length > 0, group.title); }
  assert.equal(new Set(names.map(productKey)).size, names.length, 'kein Name steht doppelt');
  for (const name of names) {
    assert.ok(name.trim() && name.length <= 80, name);
    assert.deepEqual(pantryAdditions([name], new Set()), [name], `${name} wird vom Vorrat unverändert und als ein Eintrag übernommen`);
  }
  for (const basic of ['Salz', 'Pfeffer', 'Mehl', 'Zucker', 'Öl', 'Olivenöl']) assert.ok(names.includes(basic), `${basic} gehört zu den Vorschlägen`);
});

test('Was schon im Vorrat steht, wird nicht mehr vorgeschlagen (Schreibweise egal); leere Gruppen fallen weg', () => {
  const all = pantrySuggestions(new Set());
  assert.deepEqual(all.flatMap(group => group.names), names, 'ohne Vorrat alles, in derselben Reihenfolge');
  const some = pantrySuggestions(pantryKeys([{ name: 'SALZ', deletedAt: null }, { name: ' pfeffer ', deletedAt: null }, { name: 'Gouda', deletedAt: null }]));
  assert.ok(!some.flatMap(group => group.names).some(name => ['Salz', 'Pfeffer'].includes(name)));
  assert.equal(some.find(group => group.title === 'Würzen').names.length, PANTRY_SUGGESTIONS[0].names.length - 2);
  assert.ok(some.flatMap(group => group.names).includes('Mehl'));
  // Gelöschte Einträge zählen nicht
  const deleted = pantrySuggestions(pantryKeys([{ name: 'Salz', deletedAt: '2026-01-01T00:00:00.000Z' }]));
  assert.ok(deleted.flatMap(group => group.names).includes('Salz'));
  // Alles vorhanden: keine Gruppe mehr
  assert.deepEqual(pantrySuggestions(pantryKeys(names.map(name => ({ name, deletedAt: null })))), []);
  // Eine ganze Gruppe vorhanden: nur diese Gruppe fällt weg
  const baking = PANTRY_SUGGESTIONS.find(group => group.title === 'Backen');
  const without = pantrySuggestions(pantryKeys(baking.names.map(name => ({ name, deletedAt: null }))));
  assert.ok(!without.some(group => group.title === 'Backen'));
  assert.equal(without.length, PANTRY_SUGGESTIONS.length - 1);
});
