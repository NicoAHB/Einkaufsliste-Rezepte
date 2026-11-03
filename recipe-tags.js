import { recipeTagKey, uniqueRecipeTags } from './recipe-import.js';
import { ingredientProductName, spellingStem } from './product-groups.js';

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

// Vorschläge sind ausdrücklich keine automatische Einordnung. Für Ernährung
// müssen alle Zutaten bekannt sein; ein unbekanntes Fertigprodukt genügt nicht.
const foodKey=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('de').replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ß/g,'ss');
const plants=new Set(('Tomaten|Kartoffeln|Zwiebeln|Knoblauch|Knoblauchzehen|Karotten|Möhren|Zucchini|Aubergine|Paprika|Gurke|Spinat|Brokkoli|Blumenkohl|Kürbis|Lauch|Sellerie|Champignons|Pilze|Salat|Blattsalat|Rucola|Avocado|Bohnen|Bohnen (Konserve)|Linsen|Kichererbsen|Erbsen|Mais|Äpfel|Bananen|Birnen|Zitronen|Limetten|Orangen|Erdbeeren|Heidelbeeren|Himbeeren|Mango|Ananas|Rosinen|Mehl|Reis|Haferflocken|Couscous|Bulgur|Quinoa|Grieß|Speisestärke|Zucker|Salz|Pfeffer|Paprikapulver|Curry|Zimt|Muskat|Kurkuma|Oregano|Thymian|Basilikum|Petersilie|Schnittlauch|Dill|Rosmarin|Koriander|Ingwer|Chili|Öl|Olivenöl|Rapsöl|Essig|Wasser|Leitungswasser|Backpulver|Natron|Hefe|Vanillezucker|Kakao|Tomatenmark|Tomaten (Konserve)|Passierte Tomaten|Kokosmilch|Gemüsebrühe|Haferdrink|Sojadrink|Mandeldrink|Pflanzlicher Joghurt|Pflanzliche Kochcreme|Tofu|Tempeh|Veganer Käse|Nüsse|Erdnüsse|Sesam|Sesammus|Leinsamen|Chiasamen|Ahornsirup|Agavendicksaft|Sojasoße|Sojasauce').split('|').map(spellingStem));
const vegetarianFoods=new Set(('Milch|Sahne|Butter|Butterschmalz|Eier|Ei|Eigelb|Eiweiß|Honig|Joghurt|Quark|Schmand|Skyr|Käse|Feta|Mozzarella|Frischkäse|Reibekäse|Mascarpone|Ricotta|Grillkäse').split('|').map(spellingStem));
const meatWord=/^(?:fleisch|hackfleisch|rinderhack|schweinehack|lammhack|rindfleisch|schweinefleisch|lammfleisch|kalbfleisch|geflugel|hahnchen\w*|huhn\w*|puten\w*|schinken\w*|speck\w*|bacon|salami|wurst|wurstchen|bratwurst|chorizo|pancetta|guanciale|rinderfond|rinderbruhe|huhnerbruhe|gelatine)$/;
const fishWord=/^(?:fisch\w*|lachs\w*|thunfisch\w*|forelle\w*|kabeljau|seelachs|hering|sardellen?|sardinen?|garnelen?|shrimps?|muscheln?|meeresfruchte|fischsauce|fischsosse)$/;
function ingredientDiet(name){
  const raw=foodKey(name).trim(),words=raw.split(/[^a-z0-9]+/).filter(Boolean);
  // Bekannte pflanzliche Ersatzprodukte vor tierischen Wortbestandteilen prüfen.
  if(/^(?:vegan(?:e|er|es|en)?|pflanzlich(?:e|er|es|en)?) (?:kase|hack|hackfleisch|schnitzel|wurst|hahnchen|fisch|lachs|thunfisch|garnelen|fischsauce|sahne|joghurt|milch|butter|ei|eier)$/.test(raw))return 'plant';
  if(words.includes('lachsschinken'))return 'meat';
  if(words.some(word=>fishWord.test(word)))return 'fish';
  if(words.includes('gelatine'))return 'animal';
  if(words.some(word=>meatWord.test(word)))return 'meat';
  const key=spellingStem(ingredientProductName(name));
  if(plants.has(spellingStem(name))||plants.has(key))return 'plant';
  if(vegetarianFoods.has(key))return 'vegetarian';
  return 'unknown';
}
export function recipeGroupSuggestions({name='',ingredients=[],tags=[]}={}){
  const title=foodKey(name),suggestions=[];
  const add=(tag,reason)=>{if(!suggestions.some(row=>row.tag===tag))suggestions.push({tag,reason});};
  const names=ingredients.map(row=>typeof row==='string'?row:row?.name).filter(value=>typeof value==='string'&&value.trim());
  const diets=names.flatMap(value=>value.split(/\s+und\s+|[,;+]/i)).map(ingredientDiet);
  if(diets.includes('meat'))add('Fleisch','Fleisch in den Zutaten');
  if(diets.includes('fish'))add('Fisch','Fisch oder Meeresfrüchte in den Zutaten');
  if(diets.length&&diets.every(value=>value==='plant'))add('Vegan','Die bisher eingetragenen Zutaten sind pflanzlich');
  else if(diets.length&&diets.every(value=>value==='plant'||value==='vegetarian'))add('Vegetarisch','Die bisher eingetragenen Zutaten enthalten weder Fleisch noch Fisch');
  if(/(?:^|[\s-])\w*(?:suppe|suppen|eintopf)(?:$|[\s-])/.test(title))add('Suppe','Am Rezeptnamen erkannt');
  else if(/(?:^|[\s-])\w*salat(?:$|[\s-])/.test(title))add('Salat','Am Rezeptnamen erkannt');
  else if(/(?:^|[\s-])(?:porridge|musli|overnight oats|fruhstuck\w*)(?:$|[\s-])/.test(title))add('Frühstück','Am Rezeptnamen erkannt');
  else if(/(?:^|[\s-])\w*(?:pudding|dessert|tiramisu|mousse)(?:$|[\s-])/.test(title))add('Dessert','Am Rezeptnamen erkannt');
  else if(/(?:^|[\s-])\w*(?:curry|pasta|nudeln|spaghetti|lasagne|ratatouille|risotto|auflauf)(?:$|[\s-])/.test(title))add('Hauptgericht','Am Rezeptnamen erkannt');
  if(/(?:^|[\s-])\w*(?:kuchen|muffins?|platzchen|kekse|bananenbrot|torte)(?:$|[\s-])/.test(title)){add('Backen','Am Rezeptnamen erkannt');add('Süß','Am Rezeptnamen erkannt');}
  const chosen=normalizeRecipeGroups(tags);
  return suggestions.filter(row=>!chosen.some(tag=>recipeGroupKey(tag)===recipeGroupKey(row.tag))&&!recipeGroupConflicts([...chosen,row.tag]).length).slice(0,4);
}
