import assert from 'node:assert/strict';
import {test} from 'node:test';
import {checkedRecipeGroups,chooseRecipeGroup,normalizeRecipeGroups,recipeGroupConflicts,recipeGroupSuggestions} from '../recipe-tags.js';

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

const suggested=input=>recipeGroupSuggestions(input).map(row=>row.tag);
test('Gruppenvorschläge: Name und bekannte Zutaten schlagen passende Gruppen vor, ohne die Auswahl zu verändern',()=>{
  const recipe={name:'Tomatensuppe',ingredients:[{name:'Tomaten'},{name:'Zwiebeln'},{name:'Öl'},{name:'Gemüsebrühe'},{name:'Salz und Pfeffer'}],tags:[]},before=structuredClone(recipe);
  assert.deepEqual(suggested(recipe),['Vegan','Suppe']);assert.deepEqual(recipe,before);
  assert.deepEqual(suggested({name:'Bananenbrot',ingredients:['Reife Bananen','Mehl','Eier','Zucker']}),['Vegetarisch','Backen','Süß']);
  assert.deepEqual(suggested(),[]);
});
test('Gruppenvorschläge: tierische Zutaten und Brühen verhindern vegetarische oder vegane Empfehlungen',()=>{
  for(const ingredient of ['Hähnchenbrust','Hühnerbrühe','Rinderfond','Hackfleisch','Schinken','Lachsschinken'])assert.deepEqual(suggested({ingredients:['Tomaten',ingredient]}),['Fleisch']);
  for(const ingredient of ['Lachs','Thunfisch','Sardellen','Fischsauce','Garnelen'])assert.deepEqual(suggested({ingredients:['Tomaten',ingredient]}),['Fisch']);
  assert.deepEqual(suggested({ingredients:['Zucker','Gelatine']}),[]);
  assert.deepEqual(suggested({name:'Vegane Suppe',ingredients:['Tomaten','Hähnchen']}),['Fleisch','Suppe']);
});
test('Gruppenvorschläge: pflanzliche Wortbestandteile und ausdrückliche Ersatzprodukte werden nicht als tierisch erkannt',()=>{
  for(const ingredient of ['Fleischtomaten','Kokosmilch','Veganer Käse','Veganes Hackfleisch','Pflanzlicher Joghurt','Veganer Lachs','Veganes Hähnchen'])assert.deepEqual(suggested({ingredients:[ingredient,'Salz']}),['Vegan']);
  assert.deepEqual(suggested({ingredients:['Kokosmilch','Käse']}),['Vegetarisch']);
});
test('Gruppenvorschläge: Unbekanntes bleibt offen; Allergien, Tempo und Low Carb werden nicht aus unvollständigen Daten geraten',()=>{
  for(const ingredient of ['Brühe','Fertigsauce','Nudeln','Unbekanntes Produkt','Salz oder Speck'])assert.deepEqual(suggested({ingredients:['Tomaten',ingredient]}).filter(tag=>['Vegan','Vegetarisch'].includes(tag)),[]);
  assert.deepEqual(suggested({name:'Tomatensuppe',ingredients:['Fertigsauce']}),['Suppe']);
  assert.deepEqual(suggested({name:'Salat',ingredients:['Gurke','Salz']}),['Vegan','Salat']);
});
test('Gruppenvorschläge: vorhandene Gruppen und widersprüchliche Vorschläge erscheinen nicht erneut',()=>{
  assert.deepEqual(suggested({name:'Tomatensuppe',ingredients:['Tomaten'],tags:['vegan','SUPPE']}),[]);
  assert.deepEqual(suggested({name:'Tomatensuppe',ingredients:['Tomaten'],tags:['Fleisch']}),['Suppe']);
  assert.deepEqual(suggested({ingredients:['Lachs'],tags:['Vegetarisch']}),[]);
});
