import { recipeTagKey, uniqueRecipeTags } from './recipe-import.js';

export const RECIPE_GROUPS = [
  { title:'Ernährung', tags:['Vegan','Vegetarisch','Fleisch','Fisch','Glutenfrei','Laktosefrei'] },
  { title:'Gerichtart', tags:['Frühstück','Hauptgericht','Beilage','Suppe','Salat','Dessert','Snack'] },
  { title:'Weitere Merkmale', tags:['Schnell','Einfach','Süß','Herzhaft','Backen','Low Carb'] }
];
const aliases = new Map();
const register=(kind,names)=>names.forEach(name=>aliases.set(recipeTagKey(name),kind));
register('vegan',['vegan']);register('vegetarian',['vegetarisch']);
register('meat',['Fleisch','mit Fleisch','Fleischgericht','Fleischgerichte','Geflügel','Hähnchen','Rind','Schwein','Hackfleisch']);
register('fish',['Fisch','mit Fisch','Fischgericht','Fischgerichte','Meeresfrüchte','Pescetarisch']);
register('dairy',['Milchprodukte','mit Milch','mit Käse']);register('egg',['Eier','mit Ei','mit Eiern']);
register('gluten-free',['glutenfrei','ohne Gluten']);register('gluten',['glutenhaltig','mit Gluten']);
register('lactose-free',['laktosefrei','ohne Laktose']);register('lactose',['laktosehaltig','mit Laktose']);
const forbidden=[['vegan','meat'],['vegan','fish'],['vegan','dairy'],['vegan','egg'],['vegetarian','meat'],['vegetarian','fish'],['gluten-free','gluten'],['lactose-free','lactose']];
const kind=tag=>aliases.get(recipeTagKey(tag));
// Nur tatsächliche Synonyme zusammenfassen: Geflügel und Fleisch sind eigene
// Gruppen, werden aber beide bei Ernährungswidersprüchen berücksichtigt.
const synonyms=new Map([['mit fleisch','fleisch'],['fleischgericht','fleisch'],['fleischgerichte','fleisch'],['mit fisch','fisch'],['fischgericht','fisch'],['fischgerichte','fisch'],['ohne gluten','glutenfrei'],['ohne laktose','laktosefrei']]);
export const recipeGroupKey=tag=>synonyms.get(recipeTagKey(tag))||recipeTagKey(tag);
export function normalizeRecipeGroups(values) {
  const seen=new Set();return uniqueRecipeTags(values).filter(tag=>{const key=recipeGroupKey(tag);if(seen.has(key))return false;seen.add(key);return true;});
}
const incompatible=(a,b)=>forbidden.some(([one,two])=>kind(a)===one&&kind(b)===two||kind(a)===two&&kind(b)===one);
export function recipeGroupConflicts(values) {
  const tags=normalizeRecipeGroups(values),pairs=[];
  for(let i=0;i<tags.length;i++)for(let j=i+1;j<tags.length;j++)if(incompatible(tags[i],tags[j]))pairs.push([tags[i],tags[j]]);
  return pairs;
}
export function checkedRecipeGroups(values) {
  const tags=normalizeRecipeGroups(values),conflict=recipeGroupConflicts(tags)[0];
  if(conflict)throw new Error(`„${conflict[0]}“ und „${conflict[1]}“ passen nicht zusammen. Bitte die Rezeptgruppen anpassen.`);
  return tags;
}
export function chooseRecipeGroup(values,tag) {
  const current=normalizeRecipeGroups(values),key=recipeGroupKey(tag);
  if(current.some(value=>recipeGroupKey(value)===key))return {tags:current.filter(value=>recipeGroupKey(value)!==key),removed:[]};
  const removed=current.filter(value=>incompatible(value,tag));
  return {tags:[...current.filter(value=>!removed.includes(value)),...normalizeRecipeGroups([tag])],removed};
}
