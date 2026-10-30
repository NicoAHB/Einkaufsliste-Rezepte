/* Ein Bildbestand für Schnellauswahl, Planen, Im Laden und Vorrat (2.65).
   Alle Bilder sind selbst erzeugte, lokale Beispielmotive. Keine Händler-/Suchdienste.
   Produktnamen werden hier nur für das Bild geprüft, niemals umbenannt oder in den Daten zusammengelegt. */
import { GROCERY_PRODUCTS, PRODUCT_PHOTOS } from './product-catalog.js';

export const GROUP_PHOTO = 'assets/products/groups.webp';
const groupNames = [
  ['fruit', 'Obst'], ['vegetables', 'Gemüse'], ['bakery', 'Brot & Backwaren'], ['meat', 'Fleisch'],
  ['fish', 'Fisch & Meeresfrüchte'], ['dairy', 'Milchprodukte'], ['eggs', 'Eier'], ['frozen', 'Tiefkühlprodukte'],
  ['pantry', 'Vorräte'], ['spices', 'Gewürze'], ['sauces', 'Öle & Soßen'], ['snacks', 'Süßes & Snacks'],
  ['drinks', 'Getränke'], ['cleaning', 'Reinigung & Haushalt'], ['care', 'Körperpflege'], ['miscellaneous', 'Sonstiges'],
  ['garden', 'Garten & Pflanzen'], ['baby', 'Babybedarf'], ['pets', 'Tierbedarf'], ['electronics', 'Technik'],
  ['kitchenware', 'Küchenbedarf'], ['sports', 'Sport'], ['clothing', 'Kleidung'], ['tools', 'Werkzeug'],
  ['desserts', 'Gebäck & Desserts'], ['plant-based', 'Pflanzliche Produkte'], ['coffee-tea', 'Kaffee & Tee'], ['herbs', 'Frische Kräuter'],
  ['baking', 'Backzutaten'], ['breakfast', 'Frühstück'], ['paper', 'Papier & Hygiene'], ['stationery', 'Schreibwaren']
];
export const PRODUCT_GROUP_IMAGES = Object.freeze(groupNames.map(([id, label], cell) => Object.freeze({
  kind: 'group', key: `group-${id}`, group: id, label, url: GROUP_PHOTO, cell
})));
const groups = new Map(PRODUCT_GROUP_IMAGES.map(group => [group.group, group]));
export const groupImage = id => groups.get(id) || groups.get('miscellaneous');
const normalise = value => String(value || '').normalize('NFKC').toLocaleLowerCase('de')
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const products = new Map(), productNames = new Map();
for (const product of GROCERY_PRODUCTS) {
  const photo = Object.freeze({ kind: 'product', key: product.id, label: product.name, url: PRODUCT_PHOTOS[product.sheet], cell: product.cell });
  products.set(product.id, photo); productNames.set(normalise(product.name), photo);
}
export const productImageById = id => products.get(id) || null;
// Gespeichert werden nur lokale Kennungen, niemals frei eingebbare Bild-URLs.
export const imageByKey = key => products.get(key) || PRODUCT_GROUP_IMAGES.find(group => group.key === key) || null;
export const imageForProduct = row => imageByKey(row?.imageKey) || resolveProductImage(row?.name, row?.category);
// Ausschließlich geprüfte, ganze Schreibweisen; kein beliebiges Abschneiden von Mehrzahlendungen oder Teilwortsuche.
const aliases = [
  ['apfel', 'aepfel'], ['aepfel', 'aepfel'], ['birne', 'birnen'], ['banane', 'bananen'], ['orange', 'orangen'],
  ['mandarine', 'mandarinen'], ['zitrone', 'zitronen'], ['limette', 'limetten'], ['pfirsich', 'pfirsiche'],
  ['erdbeere', 'erdbeeren'], ['himbeere', 'himbeeren'], ['heidelbeere', 'heidelbeeren'], ['blaubeeren', 'heidelbeeren'],
  ['kartoffel', 'kartoffeln'], ['suesskartoffel', 'suesskartoffeln'], ['zwiebel', 'zwiebeln'], ['fruehlingszwiebel', 'fruehlingszwiebeln'],
  ['moehre', 'karotten'], ['moehren', 'karotten'], ['mohrrueben', 'karotten'], ['karotte', 'karotten'],
  ['tomate', 'tomaten'], ['paprikaschoten', 'paprika'], ['paprikaschote', 'paprika'], ['salatgurke', 'gurke'], ['salatgurken', 'gurke'],
  ['ei', 'eier'], ['h milch', 'milch'], ['hmilch', 'milch'], ['vollmilch', 'milch'], ['hafermilch', 'haferdrink'],
  ['kokos milch', 'kokosmilch'], ['natur joghurt', 'naturjoghurt'], ['jogurt', 'joghurt'], ['naturjogurt', 'naturjoghurt'],
  ['nudel', 'nudeln'], ['eiernudeln', 'nudeln'], ['weizenmehl', 'mehl'], ['haushaltszucker', 'zucker'],
  ['butterkeks', 'kekse'], ['butterkekse', 'kekse'], ['nutella', 'nuss-nougat-creme'], ['nuss nougat creme', 'nuss-nougat-creme'],
  ['tk pizza', 'tk-pizza'], ['tk beeren', 'tk-beeren'], ['tk erbsen', 'tk-erbsen'], ['toilettenpapierrollen', 'toilettenpapier'],
  ['klopapier', 'toilettenpapier'], ['kuechenpapier', 'kuechenrolle'], ['muellbeutel', 'muellbeutel'],
  ['spuelmaschinen tabs', 'spuelmaschinentabs'], ['spuelmaschinentab', 'spuelmaschinentabs'],
  ['porree', 'lauch'], ['auberginen', 'aubergine'], ['kirsche', 'kirschen'], ['aprikose', 'aprikosen'], ['kaffeebohnen', 'kaffee'],
  ['tk fischstaebchen', 'fischstaebchen'], ['feinwaschmittel wolle und seide', 'feinwaschmittel'], ['feinwaschmittel wolle seide', 'feinwaschmittel'],
  ['apfeltasche', 'apfeltaschen'], ['quarktasche', 'quarktaschen'], ['butterkeks', 'butterkekse'], ['butterkekse', 'butterkekse'],
  ['gala apfel', 'gala-aepfel'], ['gala aepfel', 'gala-aepfel'], ['apfel gala', 'gala-aepfel'], ['aepfel gala', 'gala-aepfel'],
  ['pink lady', 'pink-lady-aepfel'], ['pink lady apfel', 'pink-lady-aepfel'], ['pink lady aepfel', 'pink-lady-aepfel'],
  ['granny smith', 'granny-smith-aepfel'], ['granny smith apfel', 'granny-smith-aepfel'], ['elstar', 'elstar-aepfel'],
  ['elstar apfel', 'elstar-aepfel'], ['braeburn', 'braeburn-aepfel'], ['boskoop', 'boskoop-aepfel'], ['jonagold', 'jonagold-aepfel'],
  ['nektarine', 'nektarinen'], ['pflaume', 'pflaumen'], ['zwetschge', 'zwetschgen'], ['feige', 'feigen'], ['dattel', 'datteln'],
  ['brombeere', 'brombeeren'], ['johannisbeere', 'johannisbeeren'], ['grapefruits', 'grapefruit'], ['blutorange', 'blutorangen'],
  ['cherrytomate', 'cherrytomaten'], ['cocktailtomaten', 'cherrytomaten'], ['mozzarellakugeln', 'mozzarella'],
  ['roter paprika', 'paprika'], ['rote paprika', 'paprika'], ['rote zwiebel', 'rote-zwiebeln'], ['schalotte', 'schalotten'],
  ['gruenkohl', 'gruenkohl'], ['eisberg', 'eisbergsalat'], ['champignons weiss', 'weisse-champignons'], ['champignons braun', 'braune-champignons'],
  ['spargel gruen', 'gruener-spargel'], ['spargel weiss', 'weisser-spargel'], ['porree stange', 'lauch'], ['muskat', 'muskatnuss'],
  ['knoblauchzehen', 'knoblauch'], ['knoblauchzehe', 'knoblauch'], ['oel', 'bratoel'], ['currypulver', 'curry'], ['sojasauce', 'sojasosse'],
  ['milchreis fertig', 'milchreis-verzehrfertig'], ['oregano', 'oregano-getrocknet'], ['reis waffeln', 'reiswaffeln'], ['sesam', 'sesamsamen'], ['mager quark', 'magerquark'],
  ['creme fraiche', 'creme-fraiche'], ['huettenkaese', 'huettenkaese'], ['cottage cheese', 'huettenkaese'], ['tk spinat', 'tiefkuehlspinat'],
  ['tk brokkoli', 'tiefkuehlbrokkoli'], ['tk blumenkohl', 'tiefkuehlblumenkohl'], ['tk himbeeren', 'tiefkuehlhimbeeren'],
  ['tk erdbeeren', 'tiefkuehlerdbeeren'], ['tk mango', 'tiefkuehlmango'], ['tk gemuese', 'tiefkuehlgemuese'],
  ['vollmilch schokolade', 'vollmilchschokolade'], ['zartbitter schokolade', 'zartbitterschokolade'], ['spuelmaschinen salz', 'geschirrspuelsalz'],
  ['wc reiniger', 'wc-reiniger'], ['batterien aa', 'aa-batterien'], ['batterien aaa', 'aaa-batterien'], ['led lampe', 'led-lampe']
];
for (const [alias, id] of aliases) if (products.has(id)) productNames.set(normalise(alias), products.get(id));
// Eine Marke allein rechtfertigt keine Produktzuordnung. Nur wenn nach dem Entfernen bekannter Zusätze ein vollständiger bekannter Produktname bleibt.
const brands = ['gut und guenstig', 'gut guenstig', 'beste wahl', 'dr oetker', 'domol', 'denkmit', 'balea', 'nivea', 'garnier', 'alpro', 'oatly',
  'milbona', 'cien', 'w5', 'combino', 'alesto', 'weihenstephan', 'landliebe', 'knorr', 'maggi', 'barilla', 'compo', 'edeka', 'rewe', 'lidl', 'aldi', 'ja'];
const qualifiers = new Set(['bio', 'frisch', 'frische', 'frischer', 'frisches', 'frischen', 'original', 'sensitiv', 'sensitive', 'laktosefrei', 'glutenfrei', 'fettarm', 'ungesuesst']);
const delicateVariants = new Set(['feinwaschmittel', 'extra', 'konzentrat', 'nachfuellpack', 'nachfuellpackung', 'nachfueller', 'wolle', 'seide', 'und', 'fuer']);
function withoutAnnotations(value) {
  let text = normalise(String(value || '')
    .replace(/(^|[\s(])\d+(?:[.,]\d+)?\s*(?:kg|mg|g|ml|cl|dl|l|liter|gramm|kilogramm|milliliter|stueck|stück|stk|st)\b/gi, ' ')
    .replace(/\d+(?:[.,]\d+)?\s*%/g, ' ').replace(/\b\d+er\b/g, ' '));
  for (const brand of brands) text = text.replace(new RegExp(`(^| )${brand}(?= |$)`, 'g'), ' ').trim().replace(/\s+/g, ' ');
  return text.split(' ').filter(word => !qualifiers.has(word)).join(' ');
}
const categoryGroups = new Map(Object.entries({ obst: 'fruit', brot: 'bakery', fleisch: 'meat', kuehl: 'dairy', tiefkuehl: 'frozen',
  vorrat: 'pantry', gewuerze: 'spices', snacks: 'snacks', getraenke: 'drinks', haushalt: 'cleaning', sonstiges: 'miscellaneous' }));
// Eindeutige Produktgruppen haben Vorrang vor einer zu groben/alten Kategorie („Apfeltasche“ ist Gebäck, kein Apfel).
const GROUP_RULES = [
  ['frozen', /\b(?:tk|tiefkuehl\w*|gefroren\w*|rahmspinat)\b/],
  ['desserts', /\b(?:(?:apfel|quark|blaetterteig|kaese|nuss|marzipan)taschen?|\w*kuchen|\w*torte|\w*dessert|milchreis|pudding|muffins?|donuts?|eclair|croissants?)\b/],
  ['dairy', /\b(?:\w*joghurt|\w*jogurt|\w*quark|\w*kaese|skyr|(?:voll|mager|schoko|vanille)?milch|\w*sahne)\b/],
  ['sauces', /\b(?:\w*sauce|\w*sosse|\w*essig|\w*dressing|\w*oel|pesto|tahin|tahini)\b/],
  ['snacks', /\b(?:\w*kekse?|\w*waffeln?|\w*riegel|\w*chips|\w*bonbons?|\w*schokolade|\w*cracker|salzstangen)\b/],
  ['drinks', /\b(?:\w*saft|\w*saefte|\w*schorle|limonade|energy\w*|\w*getraenk|cola|sekt|likoer|eierlikoer)\b/],
  ['plant-based', /\b(?:(?:hafer|soja|mandel|reis)milch|(?:hafer|soja|mandel|reis|kokos|erbsen)drink|sojafleisch|sojagranulat|seitan|tempeh|\w*tofu|vegan\w*)\b/],
  ['coffee-tea', /\b(?:\w*kaffee|kaffeebohnen|espressobohnen|\w*tee|espresso|cappuccino|matcha)\b/],
  ['garden', /\b(?:blumenerde|\w*duenger|\w*pflanze|blumensamen|rasensamen|pflanzensamen|saatgut|\w*blumenzwiebeln|gartenerde|gartenschere|giesskanne|blumentopf)\b/],
  ['baby', /\b(?:windeln?|babycreme|babyflasche|babynahrung|wundschutz\w*|feuchttuecher|schnuller)\b/],
  ['pets', /\b(?:\w*tierfutter|\w*hundefutter|\w*katzenfutter|katzenstreu|hundeleine|\w*leckerli|\w*katzenspielzeug)\b/],
  ['electronics', /\b(?:\w*kabel|\w*ladegeraet|\w*kopfhoerer|powerbank|usb|hdmi|maus|tastatur|batterien?|akkus?)\b/],
  ['sports', /\b(?:springseil|\w*hantel\w*|yogamatte|ball|fussball|basketball|volleyball|tennisball|handball|gymnastikball|\w*sport\w*|fitness\w*)\b/],
  ['clothing', /\b(?:socken|t shirt|tshirt|\w*hemd|\w*hose|pullover|jacke|muetze|\w*schuhe|\w*unterwaesche|handtasche|rucksack)\b/],
  ['tools', /\b(?:hammer|\w*schraube\w*|\w*bohrer|\w*bohrmaschine|schraubendreher|massband|zange|\w*werkzeug)\b/],
  ['kitchenware', /\b(?:pfanne|kochtopf|teller|besteck|kuechenmesser|pfannenwender|schneidebrett|\w*loeffel)\b/],
  ['stationery', /\b(?:notizbuch|bleistift|kugelschreiber|schulheft|druckerpapier|\w*schreibwaren|buntstift\w*)\b/],
  ['paper', /\b(?:\w*papier|kuechenrolle|taschentuecher|servietten|papiertuecher)\b/],
  ['care', /\b(?:\w*creme|\w*shampoo|\w*duschgel|\w*zahnpasta|\w*zahnbuerste|\w*seife|\w*deo|\w*rasierer|tampons?|\w*hygiene)\b/],
  ['cleaning', /\b(?:\w*waschmittel|\w*reiniger|\w*putzmittel|\w*schwamm|\w*spuelmittel|\w*weichspueler|\w*spuelmaschinentabs|putztuch)\b/],
  ['fish', /\b(?:\w*fisch|\w*lachs|\w*forelle|\w*garnele\w*|shrimps?|kabeljau|seelachs|hering|matjes)\b/],
  ['meat', /\b(?:(?:rind|schweine|schwein|huehner|haehnchen|puten|lamm|kalb|hack|wild|supp|gulasch)?fleisch|\w*schinken|\w*wurst|zwiebelmett|\w*schnitzel|bacon|haehnchen|pute|\w*steak)\b/],
  ['eggs', /\b(?:\w*eier|ei)\b/],
  ['baking', /\b(?:\w*mehl|\w*hefe|backpulver|speisestaerke|backzutaten|backaroma)\b/],
  ['pantry', /\b(?:sesamsamen|leinsamen|chiasamen|quinoa|bulgur|hirse|polenta|\w*konserve)\b/],
  ['breakfast', /\b(?:\w*muesli|\w*flocken|\w*marmelade|\w*konfituere|apfelmus|\w*honig|fruehstueck\w*)\b/],
  ['herbs', /\b(?:\w*kraeuter|petersilie|basilikum|schnittlauch|dill|minze|rosmarin|thymian)\b/],
  ['vegetables', /\b(?:\w*gemuese|\w*karotten?|\w*moehren?|\w*kartoffeln?|\w*zwiebeln?|\w*tomaten?|\w*gurken?|paprika|\w*salat|brokkoli|blumenkohl|zucchini|\w*pilze|spinat|lauch|\w*bohnen)\b/],
  ['fruit', /\b(?:\w*obst|aepfel|apfel|birnen?|bananen?|orangen?|beeren|trauben|kiwi|mango|ananas|melone)\b/]
];
export function groupImageFor(name, category) {
  const text = normalise(name), matches = GROUP_RULES.filter(([, pattern]) => pattern.test(text));
  if (matches.length > 1 && categoryGroups.has(category)) {
    const preferred = { kuehl: ['dairy', 'eggs', 'plant-based', 'desserts'], getraenke: ['coffee-tea', 'plant-based', 'drinks'],
      haushalt: ['baby', 'pets', 'care', 'cleaning', 'paper'], obst: ['vegetables', 'fruit', 'herbs'], vorrat: ['pantry', 'baking', 'breakfast'] };
    const order = Object.hasOwn(preferred, category) ? preferred[category] : [categoryGroups.get(category)];
    return groupImage(order.find(group => matches.some(([id]) => id === group)) || categoryGroups.get(category));
  }
  return groupImage(matches[0]?.[0] || categoryGroups.get(category));
}
const resolved = new Map();
export function resolveProductImage(name, category) {
  const key = `${String(name)}\n${String(category || '')}`;
  if (resolved.has(key)) return resolved.get(key);
  const cleaned = withoutAnnotations(name), words = cleaned.split(' ');
  const variant = words.includes('feinwaschmittel') && words.every(word => delicateVariants.has(word)) ? products.get('feinwaschmittel') : null;
  const image = productNames.get(normalise(name)) || productNames.get(cleaned) || variant || groupImageFor(name, category);
  if (resolved.size >= 2048) resolved.delete(resolved.keys().next().value);
  resolved.set(key, image); return image;
}

// Pro Tafel nur eine Verfügbarkeitsprüfung. Beschädigte/fehlende Dateien wechseln auf das Gruppenbild.
const availability = new Map();
function imageAvailable(url) {
  if (!availability.has(url)) {
    const request = new Promise((resolve, reject) => { const image = new Image(); image.onload = resolve; image.onerror = reject; image.src = url; });
    availability.set(url, request); request.catch(() => availability.delete(url));
  }
  return availability.get(url);
}
export function paintProductImage(node, image, fallback) {
  node.classList.add('product-picture'); node.replaceChildren(); node.classList.remove('photo-unavailable');
  node.dataset.photoKey = image.key; node.dataset.photoKind = image.kind;
  node.style.backgroundImage = `url("${image.url}")`; node.style.backgroundPosition = `${image.cell % 8 / 7 * 100}% ${Math.floor(image.cell / 8) / 3 * 100}%`;
  node.style.backgroundSize = '800% 400%';
  const applied = image.key;
  void imageAvailable(image.url).catch(() => {
    if (!node.isConnected || node.dataset.photoKey !== applied) return;
    if (fallback && fallback.url !== image.url) { paintProductImage(node, fallback); return; }
    node.style.backgroundImage = 'none'; node.classList.add('photo-unavailable');
    const svg = node.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg'), use = node.ownerDocument.createElementNS(svg.namespaceURI, 'use');
    svg.setAttribute('aria-hidden', 'true'); svg.classList.add('icon'); use.setAttribute('href', '#i-cart'); svg.append(use); node.append(svg);
  });
  return node;
}
