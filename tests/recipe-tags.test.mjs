import assert from 'node:assert/strict';
import {test} from 'node:test';
import {checkedRecipeGroups,chooseRecipeGroup,normalizeRecipeGroups,recipeGroupConflicts} from '../recipe-tags.js';

test('Rezeptgruppen: Mehrfachauswahl erhält eigene Namen und fasst Schreibweisen und bekannte Synonyme zusammen',()=>{
  const input=['vegan',' Vegan ',' Low  Carb ','LOW\u00a0CARB','mit Fleisch','Fleisch','Omas Küche'],before=[...input];
  assert.deepEqual(normalizeRecipeGroups(input),['vegan','Low Carb','mit Fleisch','Omas Küche']);assert.deepEqual(input,before);
  assert.deepEqual(chooseRecipeGroup(['Vegetarisch','Schnell'],'Suppe').tags,['Vegetarisch','Schnell','Suppe']);
  assert.deepEqual(chooseRecipeGroup(['Vegetarisch','Schnell'],' vegetarisch ').tags,['Schnell']);
});
test('Rezeptgruppen: widersprüchliche Ernährung wird in beiden Auswahlrichtungen ersetzt; andere Gruppen bleiben',()=>{
  for(const [first,second] of [['Vegetarisch','Fleisch'],['Vegetarisch','Fisch'],['Vegan','Fleisch'],['Vegan','Fisch'],['Vegan','mit Milch'],['Vegan','mit Ei'],['Glutenfrei','mit Gluten'],['Laktosefrei','mit Laktose']])for(const [a,b]of [[first,second],[second,first]]){
    const result=chooseRecipeGroup([a,'Schnell','Omas Küche'],b);
    assert.deepEqual(result.tags,['Schnell','Omas Küche',b]);assert.deepEqual(result.removed,[a]);assert.deepEqual(recipeGroupConflicts(result.tags),[]);
  }
});
test('Rezeptgruppen: gültige Kombinationen werden nicht als Widerspruch geraten',()=>{
  for(const tags of [['Vegan','Vegetarisch'],['Fleisch','Fisch'],['Süß','Herzhaft'],['Vegetarisch','Fleischersatz'],['Vegan','vegane Milchprodukte'],['Laktosefrei','mit Milch'],['Schnell','Hauptgericht','Low Carb']])assert.deepEqual(checkedRecipeGroups(tags),tags);
});
test('Rezeptgruppen: Speichern prüft auch widersprüchliche alte/importierte Gruppen ohne stille Datenkorrektur',()=>{
  for(const tags of [['VEGETARISCH','mit Fleisch'],['vegan','Meeresfrüchte'],['Vegetarisch','Geflügel'],['Vegan','Milchprodukte'],['ohne Gluten','glutenhaltig']]){
    const before=[...tags];assert.throws(()=>checkedRecipeGroups(tags),/passen nicht zusammen/);assert.deepEqual(tags,before);
  }
  assert.deepEqual(checkedRecipeGroups(undefined),[]);
});
