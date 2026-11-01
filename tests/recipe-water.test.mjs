import assert from 'node:assert/strict';
import { test } from 'node:test';
import { active, addToList, emptyData, ingredientItems, inPantry, isCookingWater, merge, pantryAdditions, pantryKeys } from '../data.js';
import { availability, indexNames, required } from '../cookable.js';
import { aggregateIngredients, shoppingDeficits } from '../plan.js';
import { productGroupMigration } from '../product-groups.js';

test('Rezeptwasser: Leitungswasser und Temperaturangaben gelten ohne Vorratseintrag als vorhanden', () => {
  for (const name of ['Wasser', ' LEITUNGSWASSER ', 'Trinkwasser', 'lauwarmes Wasser', 'heißes Wasser', 'Wasser (warm)', 'Wasser, lauwarm', 'Wasser zum Kochen']) {
    assert.equal(isCookingWater(name), true, name);
    assert.equal(inPantry(pantryKeys([]), name), true, name);
    assert.equal(availability(name, indexNames({})), 'have', name);
    assert.equal(required({ name, unit: 'ml' }), false, name);
    assert.deepEqual(pantryAdditions([name], new Set()), [], name);
  }
  for (const name of ['Mineralwasser', 'Kokoswasser', 'Rosenwasser', 'Orangenblütenwasser', 'Wasser mit Kohlensäure', 'Wasser und Milch']) {
    assert.equal(isCookingWater(name), false, name);
    assert.equal(inPantry(pantryKeys([]), name), false, name);
    assert.equal(required({ name, unit: 'ml' }), true, name);
  }
});

test('Rezeptwasser: Getränke behalten ihren Rezeptnamen, frühere automatische Zusammenfassung wird sicher korrigiert', () => {
  const at = '2026-11-01T12:00:00.000Z', data = emptyData();
  const row = { id: 'mineral', name: 'Mineralwasser', recipeId: 'r', quantity: 300, unit: 'ml', createdAt: at, updatedAt: at, deletedAt: null };
  data.ingredients = [row];
  assert.deepEqual(productGroupMigration(data), []);
  const oldId = `product-groups-v1:ingredients:mineral:${at}`;
  const old = merge(data, [{ id: oldId, collection: 'ingredients', entityId: row.id, patch: { name: 'Wasser', productOriginalName: 'Mineralwasser', productGroupVersion: 1 }, at, actor: 'Produktgruppen' }]);
  const restored = merge(old, productGroupMigration(old));
  assert.equal(restored.ingredients[0].name, 'Mineralwasser');
  assert.deepEqual(productGroupMigration(restored), []);
});

test('Rezeptwasser: direkte und Wochenübernahme lassen Wasser aus, Getränke bleiben einkaufbar', () => {
  const at = '2026-11-01T12:00:00.000Z';
  const ingredients = ['Wasser', 'lauwarmes Leitungswasser', 'Mineralwasser', 'Mehl'].map((name, i) => ({
    id: `i${i}`, name, recipeId: 'r', quantity: 300, unit: 'ml', createdAt: at, updatedAt: at, deletedAt: null
  }));
  const direct = ingredientItems(ingredients, 'r', '', 2, 'Nico', at);
  assert.deepEqual(direct.map(op => op.patch.name), ['Mineralwasser', 'Mehl']);
  const rows = aggregateIngredients([{ recipeId: 'r', servings: 4 }], [{ id: 'r', name: 'Teig', servings: 2 }], ingredients);
  assert.deepEqual(shoppingDeficits(rows).map(row => row.name), ['Mehl', 'Mineralwasser']);
  // Manuelles Hinzufügen darf weiterhin ausdrücklich Wasser einkaufen.
  const data = merge(emptyData(), addToList([{ name: 'Wasser', quantity: 6, unit: 'Flasche' }], '', 'Nico', at).ops);
  assert.equal(active(data.items)[0].name, 'Wasser');
  assert.equal(active(data.items)[0].quantity, 6);
});
