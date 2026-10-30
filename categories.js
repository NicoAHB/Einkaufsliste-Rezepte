/* Kategorien (Gänge im Laden) für die Einkaufsliste. Reine Logik ohne DOM.
   Die Zuordnung erfolgt in drei Stufen: ausdrücklich gesetzte Kategorie des Artikels, dann die zuletzt
   für denselben Namen verwendete Kategorie (die App lernt aus euren Artikeln), dann eine Schätzung
   nach Stichwörtern. Ohne Treffer bleibt der Artikel unter „Sonstiges“, es wird nichts erfunden. */
import { productKey } from './prices.js';
import { PRODUCT_ROWS } from './product-catalog-data.js';
const catalogCategories = new Map(PRODUCT_ROWS.map(([, name, , , category]) => [productKey(name), category]));

// Reihenfolge = typischer Weg durch den Laden.
export const CATEGORIES = [
  { id: 'obst', label: 'Obst & Gemüse' },
  { id: 'brot', label: 'Brot & Backwaren' },
  { id: 'fleisch', label: 'Fleisch & Fisch' },
  { id: 'kuehl', label: 'Milch, Käse & Eier' },
  { id: 'tiefkuehl', label: 'Tiefkühl' },
  { id: 'vorrat', label: 'Vorrat & Konserven' },
  { id: 'gewuerze', label: 'Gewürze, Öl & Soßen' },
  { id: 'snacks', label: 'Süßes & Snacks' },
  { id: 'getraenke', label: 'Getränke' },
  { id: 'haushalt', label: 'Haushalt & Drogerie' },
  { id: 'sonstiges', label: 'Sonstiges' }
];
const IDS = new Set(CATEGORIES.map(category => category.id));
export const isCategory = id => typeof id === 'string' && IDS.has(id);
export const categoryLabel = id => CATEGORIES.find(category => category.id === id)?.label ?? 'Sonstiges';

/* Die Regeln werden der Reihe nach geprüft, der erste Treffer gewinnt. Jede Regel prüft ihren
   Ausdruck gegen jedes einzelne Wort des Namens (`word`, kann null sein) oder gegen den ganzen Namen (`phrase`).
   Ausdrücke sind bewusst verankert (^ und $): „Preiselbeeren“ darf kein Reis, „Schwein“ kein Wein
   und „Kokosmilch“ keine Milch sein. Ausnahmen stehen deshalb vor den allgemeinen Regeln. */
const RULES = [
  ['haushalt', /spülmittel|spülmaschinen|geschirrspül|müllbeutel|müllsack|toilettenpapier|klopapier|küchenrolle|küchenpapier|taschentüch|waschmittel|weichspüler|shampoo|duschgel|zahnpasta|zahnbürste|zahnseide|mundspülung|^seife|^deo|windel|alufolie|frischhaltefolie|backpapier|gefrierbeutel|schwamm|reiniger|putzmittel|batterie|glühbirne|^kerze|serviette|filtertüte|kaffeefilter|tampon|rasier|handcreme|sonnencreme|tierfutter|katzenfutter|hundefutter|katzenstreu|geschirrtuch|wattepad|pflaster/],
  ['tiefkuehl', /tiefkühl|^tk$|gefrier|eiscreme|speiseeis|^eis$|pommes|fischstäbchen|gefroren|rahmspinat|^pizza$|^pizzen$/],
  // Ausnahmen, die sonst von allgemeineren Regeln falsch eingeordnet würden.
  ['gewuerze', /brühe|bouillon|^fond$|zitronensaft|limettensaft|essig|balsamico/],
  ['kuehl', /kaffeesahne|kaffeemilch|kochsahne/],
  ['snacks', /butterkeks|buttergebäck/],
  ['brot', /kuchen$|torte$|^kuchen/],
  ['brot', /^(?:apfel|quark|nuss|marzipan|blaetterteig)taschen?$/],
  ['vorrat', /tomatenmark|passierte|passata|dosentomaten|kokosmilch|kokosnussmilch|erdnussbutter|nussnugat|nutella|thunfisch|sardine|sardellen|kichererbse|kidneybohne|linse|konserve|sauerkraut|tomatensauce|tomatensoße|nudelsauce|pesto|^oliven$|kapern|essiggurke|cornichon|apfelmus|backpulver|^mais$|kerne$|nudel|spaghetti|penne|fusilli|tagliatelle|makkaroni|lasagne|^pasta$|pasta$|tortellini|ravioli|gnocchi|spätzle|reis$|^hefe$|trockenhefe|gelatine/],
  ['vorrat', null, /gehackte tomaten|geschälte tomaten|stückige tomaten|tomaten aus der dose|tomaten in dosen/],
  ['getraenke', /^wasser$|wasser$|^saft|saft$|^säfte|^limo|limonade|^cola$|bier$|^(rot|weiß|weiss|rosé)?wein$|^sekt$|prosecco|schorle|tee$|^kaffee|getränk|sprudel|energydrink|whisky|^gin$|wodka|^rum$|likör|smoothie|haferdrink|sojadrink|mandeldrink|milchshake/],
  ['fleisch', /fleisch|hack$|hackfleisch|^gehacktes$|^mett$|hähnchen|hühnchen|^huhn$|^pute|truthahn|^rind(?!e)|schwein|^lamm|^kalb|speck$|^speck|schinken|salami|wurst|würstchen|steak|schnitzel|filet|keule|brust|lachs|forelle|garnele|shrimp|fisch|kabeljau|seelachs|hering|matjes|aufschnitt|bacon|gyros|döner|leberkäse|frikadelle|bulette|chorizo|pancetta|guanciale|rippchen|^ente|^gans|^wild$|wildfleisch|hirsch/],
  ['kuehl', /^milch$|milch$|sahne$|schmand|quark|joghurt|jogurt|skyr|käse|mozzarella|parmesan|gouda|feta|emmentaler|cheddar|camembert|brie$|mascarpone|ricotta|halloumi|margarine|kefir|sauerrahm|pudding$|^dessert|tofu|tempeh|hummus|butter$|^butter$|butterschmalz|^ei$|^eier$|eier$|^eigelb|^eiweiß|^eiweiss|crème|cremefraiche|fraiche/, /cr[eè]me\s+fra[iî]che|saure sahne/],
  ['brot', /brot$|^brot|brötchen|semmel|toast|baguette|ciabatta|croissant|brezel|laugen|tortilla|wrap|fladen|pita|zwieback|knäcke|brioche|focaccia|hörnchen|muffin|donut|berliner|stollen|bagel/],
  ['snacks', /chips$|schokolade|keks|gummibär|bonbon|riegel|popcorn|lakritz|süßigkeit|waffel|cracker|salzstange|marshmallow|praline|fruchtgummi|nougat|snack|salzgebäck|lebkuchen|spekulatius|plätzchen/],
  ['gewuerze', /salz$|^salz|^pfeffer|pfeffer$|^curry(pulver|paste|gewürz)?$|^zimt|muskat|oregano|kümmel|kurkuma|^vanille|lorbeer|nelken|piment|senf|ketchup|mayonnaise|^mayo$|^öl$|öl$|sojasauce|sojasoße|worcester|tabasco|sambal|gewürz|pulver$|sriracha|harissa|tahin|dressing|marinade|soße$|sauce$|^soße|^sauce|streuwürze|sirup|safran|^sesam$|backaroma|^paprikapulver/],
  ['obst', /apfel|äpfel|birne|banane|orange|zitrone|limette|mandarine|clementine|traube|beere|erdbeer|himbeer|kirsche|pflaume|pfirsich|nektarine|melone|ananas|mango|kiwi|avocado|tomate|gurke|paprika|zwiebel|knoblauch|lauch|porree|kartoffel|karotte|möhre|mohrrübe|sellerie|brokkoli|blumenkohl|kohl|salat|rucola|spinat|zucchini|aubergine|kürbis|pilz|champignon|radieschen|rettich|fenchel|spargel|ingwer|petersilie|basilikum|schnittlauch|^dill$|koriander|minze|rosmarin|thymian|kräuter|salbei|süßkartoffel|rote bete|kohlrabi|zuckerschote|bohnen|gemüse|obst|mangold|chicorée|endivie|sprossen|rhabarber|feige|granatapfel|papaya|grapefruit|quitte|zwetschge|aprikose|schalotte|pastinake|artischocke|peperoni|chilischote|jalapeño|^chili$|maiskolben|ofenkartoffel|pak choi/],
  ['vorrat', /mehl$|zucker|speisestärke|stärke|paniermehl|semmelbrösel|grieß|haferflocken|müsli|cornflakes|couscous|bulgur|quinoa|hirse|polenta|trockenfrüchte|rosinen|nuss|nüsse|mandel|cashew|walnuss|haselnuss|pistazie|leinsamen|chiasamen|marmelade|konfitüre|honig|aufstrich|^kakao|natron|dose$|^dose$|dosen/]
];

const tokensOf = name => productKey(name).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

// Schätzung nach Stichwörtern; null, wenn nichts passt.
export function guessCategory(name) {
  const full = productKey(name);
  if (!full) return null;
  // Der feste Katalog kennt diese vollständigen Namen genau; Teilwörter bleiben davon unberührt.
  if (catalogCategories.has(full)) return catalogCategories.get(full);
  const words = tokensOf(name);
  for (const [id, word, phrase] of RULES) {
    if (phrase && phrase.test(full)) return id;
    if (word && words.some(token => word.test(token))) return id;
  }
  return null;
}

// Was die App aus den Artikeln gelernt hat: je Name die zuletzt verwendete Kategorie (auch aus erledigten und gelöschten
// Artikeln). Einmal pro Anzeige aufgebaut, damit lange Artikelverläufe die Liste nicht langsamer machen.
export function learnCategories(items) {
  const learned = new Map();
  for (const item of items) {
    if (!isCategory(item.category) || typeof item.name !== 'string') continue;
    const key = productKey(item.name), at = item.updatedAt || item.createdAt || '', previous = learned.get(key);
    if (!previous || at >= previous.at) learned.set(key, { at, id: item.category });
  }
  return learned;
}
const asLearned = items => items instanceof Map ? items : learnCategories(items);

export const rememberedCategory = (items, name) => asLearned(items).get(productKey(name))?.id ?? null;

// Kategorie für einen neuen Artikel (null = unbekannt, dann wird nichts gespeichert).
export const suggestCategory = (name, items = []) => rememberedCategory(items, name) ?? guessCategory(name);

// Kategorie, unter der ein vorhandener Artikel angezeigt wird.
export function itemCategory(item, items = []) {
  return (isCategory(item.category) ? item.category : null) ?? suggestCategory(item.name, items) ?? 'sonstiges';
}

/* Eigene Reihenfolge der Gänge (pro Geschäft: `aisles`, Liste von Kategorie-Kennungen). Genannte Gänge kommen zuerst in dieser Reihenfolge, alle anderen danach
   wie im Standard. Unbekannte und doppelte Einträge zählen nicht; ohne Liste gilt der Standardweg durch den Laden. */
export function orderCategories(order) {
  const first = [...new Set(Array.isArray(order) ? order.filter(isCategory) : [])];
  return [...first.map(id => CATEGORIES.find(category => category.id === id)), ...CATEGORIES.filter(category => !first.includes(category.id))];
}
// Liste gültig? (fehlt oder null = Standard)
export const validAisles = order => order === undefined || order === null || (Array.isArray(order) && order.length <= CATEGORIES.length && order.every(isCategory) && new Set(order).size === order.length);

// Artikel nach Kategorie ordnen: nur Kategorien mit Artikeln, Reihenfolge wie im Laden (oder nach `order`), Namen alphabetisch.
export function groupByCategory(rows, allItems = rows, order = null) {
  const groups = new Map(CATEGORIES.map(category => [category.id, []])), learned = asLearned(allItems);
  for (const item of rows) groups.get(itemCategory(item, learned)).push(item);
  return orderCategories(order).map(category => ({ ...category, items: groups.get(category.id).sort((a, b) => a.name.localeCompare(b.name, 'de')) }))
    .filter(group => group.items.length);
}
