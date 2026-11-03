/* Geprüfte Produktfamilien. Rohkatalog und Bildkoordinaten bleiben unverändert.
   Nur bekannte Varianten werden zugeordnet, keine freie Teilwort-Ersetzung. */
import { PRODUCT_ROWS } from './product-catalog-data.js';
import { productKey } from './prices.js';

const PLURAL = ['en', 'er', 'n', 'e'];
/* Namensabgleiche laufen sehr oft (jede Rezeptkarte prüft ihre Zutaten gegen Vorrat und Einkaufsliste). Die reinen
   Text-Umformungen werden deshalb pro Name zwischengespeichert; das Ergebnis hängt nur vom Text ab. */
export function memoText(fn, limit = 20000) {
  const cache = new Map();
  return value => {
    if (typeof value !== 'string') return fn(value);
    let result = cache.get(value);
    if (result === undefined) { if (cache.size >= limit) cache.clear(); result = fn(value); cache.set(value, result); }
    return result;
  };
}
export const spellingStem = memoText(stemOf);
function stemOf(name) {
  return productKey(name).replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss').split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(word => {
    for (const ending of PLURAL) if (word.length - ending.length >= 2 && word.endsWith(ending)) return word.slice(0, -ending.length);
    return word;
  }).join(' ');
}

const families = [
  ['aepfel','Äpfel','elstar-aepfel gala-aepfel pink-lady-aepfel granny-smith-aepfel golden-delicious-aepfel braeburn-aepfel boskoop-aepfel jonagold-aepfel'],
  ['orangen','Orangen','blutorangen'], ['melone','Melone','wassermelone honigmelone galiamelone cantaloupe-melone'],
  ['pflaumen','Pflaumen','zwetschgen'], ['tomaten','Tomaten','cherrytomaten rispentomaten fleischtomaten roma-tomaten'],
  ['paprika','Paprika','spitzpaprika snackpaprika gruene-paprika gelbe-paprika'], ['gurke','Gurke','mini-gurken'],
  ['zwiebeln','Zwiebeln','rote-zwiebeln schalotten weisse-zwiebeln gemuesezwiebeln'],
  ['champignons','Champignons','weisse-champignons braune-champignons'], ['blattsalat','Blattsalat','salat eisbergsalat roemersalat feldsalat endiviensalat lollo-rosso'],
  ['gruener-spargel','Spargel','weisser-spargel'], ['bohnen','Bohnen','gruene-bohnen brechbohnen'], ['sprossen','Sprossen','alfalfa-sprossen'],
  ['brot','Brot','vollkornbrot roggenbrot mischbrot sauerteigbrot dinkelbrot eiweissbrot pumpernickel'],
  ['broetchen','Brötchen','koernerbroetchen dinkelbroetchen rosinenbroetchen milchbroetchen'],
  ['toast','Toast','sandwichtoast vollkorntoast'], ['wraps','Wraps','tortillas'],
  ['laugenbrezeln','Laugengebäck','laugenstangen'],
  ['milch','Milch','vollmilch-3-5 fettarme-milch-1-5'], ['eier','Eier','bio-eier'],
  ['joghurt','Joghurt','naturjoghurt griechischer-joghurt fruchtjoghurt vanillejoghurt erdbeerjoghurt'],
  ['quark','Quark','magerquark speisequark'], ['sahne','Sahne','schlagsahne kochsahne'],
  ['kaese','Käse','gouda emmentaler edamer tilsiter butterkaese bergkaese cheddar maasdam appenzeller gouda-jung gouda-mittelalt'],
  ['camembert','Weichkäse','brie'], ['gorgonzola','Blauschimmelkäse','roquefort'],
  ['parmesan','Parmesan','parmesan-gerieben'], ['frischkaese','Frischkäse','kraeuterfrischkaese'],
  ['reibekaese','Reibekäse','pizzakaese'], ['halloumi','Grillkäse','grillkaese'],
  ['pudding','Pudding','griesspudding schokoladenpudding vanillepudding'],
  ['sojajoghurt','Pflanzlicher Joghurt','haferjoghurt kokosjoghurt'], ['hafercuisine','Pflanzliche Kochcreme','sojacuisine'],
  ['tofu','Tofu','raeuchertofu seidentofu tofu-natur'], ['veganer-scheibenkaese','Veganer Käse','veganer-reibekaese'],
  ['haferdrink','Haferdrink','haferdrink-barista'],
  ['wasser','Wasser','sprudel mineralwasser stilles-wasser mineralwasser-medium mineralwasser-classic'],
  ['saft','Saft','orangensaft apfelsaft traubensaft multivitaminsaft ananassaft grapefruitsaft birnensaft tomatensaft karottensaft rote-bete-saft'],
  ['zitronenlimonade','Limonade','orangenlimonade'], ['eistee-pfirsich','Eistee','eistee-zitrone'],
  ['apfelschorle','Schorle','traubenschorle rhabarberschorle'], ['smoothie-gruen','Smoothie','smoothie-beere'],
  ['bier','Bier','weizenbier'], ['wein','Wein','rotwein weisswein'], ['kaffee','Kaffee','filterkaffee espressobohnen'],
  ['tee','Tee','schwarzer-tee gruener-tee weisser-tee earl-grey rooibostee pfefferminztee kamillentee fencheltee kraeutertee fruechtetee hagebuttentee ingwertee zitronentee brennnesseltee salbeitee lindenbluetentee melissentee hibiskustee oolong-tee chai-tee'],
  ['haehnchen','Hähnchen','haehnchenbrust haehnchenschenkel haehnchenfluegel haehnchengeschnetzeltes suppenhuhn'],
  ['putenbrust','Putenfleisch','putensteak'], ['hackfleisch','Hackfleisch','rinderhack hackfleisch-gemischt lammhack'],
  ['schinken','Schinken','kochschinken serranoschinken parmaschinken schwarzwaelder-schinken lachsschinken truthahnschinken'],
  ['bacon','Speck','schinkenspeck speckwuerfel'], ['wurst','Aufschnitt','putenaufschnitt haehnchenaufschnitt mortadella lyoner fleischwurst jagdwurst bierschinken gelbwurst'],
  ['wuerstchen','Würstchen','bratwurst nuernberger-wuerstchen wiener-wuerstchen bockwurst weisswurst'],
  ['rindfleisch','Rindfleisch','rindersteak rinderbraten rindergulasch rouladen'], ['schweinefilet','Schweinefleisch','schweinekotelett schweinegeschnetzeltes schweinebraten schweinebauch nackensteaks spareribs'],
  ['schnitzel','Schnitzel','kalbsschnitzel'], ['lachs','Lachs','lachsfilet'],
  ['nudeln','Nudeln','spaghetti penne fusilli farfalle tagliatelle rigatoni linguine makkaroni suppennudeln vollkornnudeln udon-nudeln mie-nudeln'],
  ['reis','Reis','basmati-reis jasmin-reis vollkornreis risotto-reis sushi-reis wildreis'],
  ['linsen','Linsen','braune-linsen rote-linsen belugalinsen berglinsen'], ['kidneybohnen','Bohnen (Konserve)','weisse-bohnen schwarze-bohnen chilibohnen'],
  ['gehackte-tomaten','Tomaten (Konserve)','geschaelte-tomaten tomatenstuecke'], ['ananasstuecke','Ananas (Konserve)','ananasringe'],
  ['gewuerzgurken','Gewürzgurken','cornichons'], ['oliven-gruen','Oliven','oliven-schwarz oliven-snack'],
  ['pesto-gruen','Pesto','pesto-rot'], ['mehl','Mehl','dinkelmehl roggenmehl vollkornmehl'],
  ['zucker','Zucker','brauner-zucker rohrzucker'], ['hefe','Hefe','trockenhefe'],
  ['kuvertuere-dunkel','Kuvertüre','kuvertuere-weiss'], ['kakao','Kakao','backkakao trinkkakao'],
  ['muesli','Müsli','knuspermuesli fruechtemuesli schokomuesli nussmuesli'], ['nuesse','Nüsse','mandeln haselnuesse walnuesse cashewkerne pistazien macadamianuesse paranuesse pekannuesse nussmix studentenfutter'],
  ['erdnuesse-geroestet','Erdnüsse','erdnuesse-in-der-schale'], ['marmelade','Marmelade','erdbeermarmelade aprikosenmarmelade himbeermarmelade kirschmarmelade orangenmarmelade'],
  ['honig','Honig','bluetenhonig waldhonig'], ['apfelmus','Apfelmus','apfelmark apfelkompott'],
  ['sesammus','Sesammus','tahin'],
  ['eis','Eis','vanilleeis schokoladeneis fruchteis eis-am-stiel'], ['pommes','Pommes','tiefkuehlpommes'],
  ['tk-beeren','Tiefkühlbeeren','tiefkuehlhimbeeren tiefkuehlerdbeeren'],
  ['olivenoel','Öl','rapsoel sonnenblumenoel kokosoel sesamoel leinoel walnussoel bratoel'],
  ['essig','Essig','apfelessig weissweinessig rotweinessig balsamico-dunkel balsamico-hell'],
  ['bruehe','Brühe','gemuesebruehe huehnerbruehe rinderfond'], ['paprikapulver','Paprikapulver','geraeuchertes-paprikapulver'],
  ['currypaste-rot','Currypaste','currypaste-gruen'],
  ['gummibaerchen','Süßigkeiten','fruchtgummi saure-fruchtgummis lakritz bonbons pfefferminzbonbons lollis brausepulver'],
  ['schokolade','Schokolade','vollmilchschokolade zartbitterschokolade weisse-schokolade nussschokolade schokoriegel'],
  ['pralinen','Pralinen','trueffelpralinen'], ['kekse','Kekse','butterkekse haferkekse schokokekse doppelkekse'],
  ['waffeln','Waffeln','waffelroellchen'], ['chips','Chips','tortilla-chips nachos linsenchips gemuesechips reischips brotchips'],
  ['cracker','Cracker','kaesecracker kuerbiskerncracker'], ['salzstangen','Salzgebäck','salzbrezeln'],
  ['waschmittel','Waschmittel','vollwaschmittel colorwaschmittel waschpulver waschmittel-pods sportwaschmittel'],
  ['feinwaschmittel','Feinwaschmittel','wollwaschmittel'], ['toilettenreiniger','WC-Reiniger','wc-reiniger'],
  ['entkalker','Entkalker','entkalkertabs'], ['spuelmaschinentabs','Spülmaschinenmittel','geschirrspuelpulver'],
  ['muellbeutel','Müllbeutel','muellsaecke biomuellbeutel'], ['gefrierbeutel','Gefrierbeutel','zipperbeutel'],
  ['deo','Deo','deoroller deospray'], ['bodylotion','Körperpflege','koerpercreme bodybutter'],
  ['gesichtscreme','Gesichtscreme','nachtcreme'], ['gesichtsreinigung','Gesichtsreinigung','gesichtswasser mizellenwasser'],
  ['rasierschaum','Rasierpflege','rasiergel'], ['pflaster','Pflaster','blasenpflaster fixierpflaster'],
  ['taschentuecher','Taschentücher','taschentuchbox'], ['kuechenrolle','Küchenrolle','kuechentuecher'],
  ['teelichter','Kerzen','stumpenkerze stabkerzen duftkerze'], ['windeln','Windeln','baby-windeln-groesse-1 baby-windeln-groesse-3 baby-windeln-groesse-5 windelhoeschen'],
  ['babybrei-gemuese','Babybrei','babybrei-obst baby-getreidebrei'], ['katzenfutter','Katzenfutter','katzen-nassfutter katzen-trockenfutter'],
  ['hundefutter','Hundefutter','hunde-nassfutter hunde-trockenfutter'], ['batterien','Batterien','aa-batterien aaa-batterien knopfzellen'],
  ['blumenerde','Pflanzenerde','anzuchterde'], ['blumenduenger','Pflanzendünger','pflanzenduenger'], ['blumensamen','Pflanzensamen','kraeutersamen'],
  ['blumentopf','Blumentopf','uebertopf'], ['geschenkpapier','Geschenkverpackung','geschenktuete'], ['klebeband','Klebeband','paketband']
];
export const groupNameKey = value => String(value ?? '').normalize('NFKD').toLocaleLowerCase('de').replace(/ä|ae/g,'a').replace(/ö|oe/g,'o').replace(/ü|ue/g,'u').replace(/ß/g,'ss').replace(/\p{M}/gu,'').replace(/[^a-z0-9]+/g,' ').trim();
const rows = new Map(PRODUCT_ROWS.map(row => [row[0], row]));
const byName = new Map(), byId = new Map();
export const PRODUCT_FAMILIES = Object.freeze(families.map(([id,name,variants]) => {
  const ids = [id,...variants.split(' ')], aliases = [...new Set(ids.map(key => rows.get(key)?.[1]).filter(Boolean))];
  for (const key of ids) if (!rows.has(key)) throw new Error(`Unbekannte Produktvariante: ${key}`);
  if(id==='oliven-gruen') aliases.push('Grüne Oliven','Schwarze Oliven');
  const group = Object.freeze({id,name,aliases:Object.freeze(aliases),ids:Object.freeze(ids)});
  for(const key of ids) byId.set(key,group);
  for(const alias of [name,...aliases]) byName.set(groupNameKey(alias),group);
  return group;
}));
// Übliche Schreibweisen, die in Rezepten vorkommen, ohne die freie Eingabe umzubenennen.
for(const [name,id] of [['Grüne Oliven','oliven-gruen'],['Schwarze Oliven','oliven-gruen'],['Speiseöl','olivenoel'],['Pflanzenöl','olivenoel'],['Weizenmehl','mehl'],['Vollmilch','milch'],['Stückige Tomaten','gehackte-tomaten'],['Dosentomaten','gehackte-tomaten'],['Pizzatomaten','gehackte-tomaten'],['Tomaten in Stücken','gehackte-tomaten']]) byName.set(groupNameKey(name),byId.get(id));
export const productGroup = name => byName.get(groupNameKey(name)) || null;
export const productGroupById = id => byId.get(id) || null;
export const canonicalProductName = name => productGroup(name)?.name || name;

// Rezeptzusätze ändern nicht das Einkaufsprodukt. Nur geprüfte Größenangaben
// und bei Obst/Gemüse Reife/Frische übergehen, wenn ein bekanntes Lebensmittel übrig bleibt.
const ingredientNames = new Map();
const ingredientStem = name => spellingStem(groupNameKey(name)).split(' ').sort().join(' ');
for (const row of PRODUCT_ROWS.filter(row=>!['haushalt','sonstiges'].includes(row[4]))) {
  const key=ingredientStem(row[1]),name=productGroup(row[1])?.id==='wasser'?row[1]:canonicalProductName(row[1]),previous=ingredientNames.get(key);
  ingredientNames.set(key,previous===null||previous&&previous.name!==name?null:{name,produce:row[4]==='obst'});
}
for(const name of ['Salz fein','Salz grob'])ingredientNames.set(ingredientStem(name),{name:'Salz',produce:false});
const sizeWord='(?:klein|gross|mittelgross)(?:e|en|er|es|em)?';
const produceWord='(?:reif|uberreif|unreif|frisch)(?:e|en|er|es|em)?';
const descriptor=new RegExp(`^(?:(?:(?:sehr|gut|voll) )?(?:${sizeWord}|${produceWord}))(?: (?:(?:sehr|gut|voll) )?(?:${sizeWord}|${produceWord}))*$`);
const sizesOnly=new RegExp(`^(?:(?:sehr|gut|voll) )?${sizeWord}(?: (?:(?:sehr|gut|voll) )?${sizeWord})*$`);
/* Schreibweisen von Rezeptseiten, die keine eigene Produktart bezeichnen: Pluralendungen von Chefkoch
   („Ei(er)“, „Zwiebel(n)“, „Zehe/n“ und das davon übrig gebliebene „/n Knoblauch“) sowie reine Mengen-
   und Packungsnotizen in Klammern („Tomaten (à 400 g)“, „Mehl (gehäuft)“). Beschreibende Zusätze wie
   „(laktosefrei)“ oder „(Magerquark)“ bleiben bedeutend. */
const LETTER='A-Za-zÄÖÜäöüß';
const PLURAL_MARK=new RegExp(`([${LETTER}])\\((n|en|e|er|s|nen)\\)(?![${LETTER}])`,'g');
const SLASH_PLURAL=new RegExp(`([${LETTER}])\\/(?:n|en|e|er|s|nen)(?![${LETTER}])`,'g');
const AMOUNT_NOTE=/\s*\((?:(?:à|a|je|ca\.?|circa|etwa|insgesamt|zusammen)\s*)?\d[\d.,/]*\s*(?:(?:-|–|bis)\s*\d[\d.,/]*\s*)?(?:[A-Za-zÄÖÜäöüß]{1,12}\.?)?\s*\)/g;
const MEASURE_NOTE=/\s*\((?:leicht |gut |knapp )?(?:gehäuft|gestrichen|kleine?[rs]?|große?[rs]?|mittelgroße?[rs]?)(?:\s+(?:Dose|Packung|Becher|Glas|Flasche|Tüte|Stück))?\)/gi;
/* Zubereitungsangaben hinter der Zutat („Knoblauch, gepresst“, „Zwiebel (fein gewürfelt)“, „Tomaten in Scheiben“) ändern nicht,
   was eingekauft wird. Nur bekannte Angaben am Ende werden übergangen; Zusätze, die ein anderes Produkt meinen („getrocknet“,
   „gemahlen“, „laktosefrei“), bleiben bedeutend. Davorstehende Wörter („gehackte Tomaten“ = Konserve) bleiben ebenfalls stehen. */
const PREP_WORD='(?:(?:sehr |ganz |grob |fein |frisch |klein |dünn |dick |leicht )?(?:gehackt|gepresst|gewürfelt|geschnitten|gerieben|geraspelt|geschält|gehobelt|zerdrückt|zerkleinert|zerlassen|geschmolzen|halbiert|geviertelt|geachtelt|entkernt|entsteint|gewaschen|geputzt|abgetropft|abgespült|abgezupft|gezupft|püriert|verquirlt|zimmerwarm|weich|kalt|lauwarm|gekocht|blanchiert|aufgetaut)(?:e[nrs]?)?'
  +'|in (?:feine |dünne |dicke |kleine |grobe |mundgerechte )?(?:Würfel|Würfeln|Scheiben|Ringe|Ringen|Streifen|Stücke|Stücken|Spalten)(?: geschnitten)?'
  +'|zum (?:Anbraten|Braten|Bestreuen|Bestäuben|Garnieren|Servieren|Einfetten|Kochen|Würzen|Abschmecken)|für die Form|nach Geschmack|nach Belieben|optional)';
const PREP_TAIL=new RegExp(`(?:\\s*,\\s*|\\s+)\\(?${PREP_WORD}(?:(?:\\s*,\\s*|\\s+und\\s+|\\s+)${PREP_WORD})*\\)?\\s*$`,'i');
// Zählwörter, die mit dem Produkt zusammengeschrieben werden: „2 Knoblauchzehen“ meint Knoblauch.
const COMPOUND_COUNT=/\bKnoblauch(?:zehen?|knollen?)\b/gi;
const withoutPrep = text => { let clean=text, before; do { before=clean; clean=clean.replace(PREP_TAIL,''); } while (clean!==before&&clean.trim()); return clean.trim()?clean:text; };
// Für neue Listenzeilen aus Rezepten: Pluralendungen und Zubereitungsangaben bereinigen, Packungsnotizen bleiben stehen.
export const withoutPluralMarks = name => { const text=String(name??''), clean=withoutPrep(text.replace(/^\s*\/(?:n|en|e|er|s|nen)\s+/i,'').replace(PLURAL_MARK,'$1$2').replace(SLASH_PLURAL,'$1').replace(COMPOUND_COUNT,'Knoblauch')).replace(/\s+/g,' ').trim(); return clean||text; };
export function recipeNameCore(name) {
  const text=String(name??'');
  const core=withoutPrep(text.replace(/^\s*\/(?:n|en|e|er|s|nen)\s+/i,'').replace(PLURAL_MARK,'$1$2').replace(SLASH_PLURAL,'$1').replace(COMPOUND_COUNT,'Knoblauch')
    .replace(AMOUNT_NOTE,'').replace(MEASURE_NOTE,'')).replace(/\s+/g,' ').trim();
  return core||text;
}
export const ingredientProductName = memoText(productNameOf);
/* Sorte statt Gruppe (2.145, Vorrat): „Basmati-Reis“ bleibt Basmati-Reis, „Reis“ bleibt Reis. Steht der Name (ohne Zubereitung,
   Plural egal) genau so im Katalog, gilt die Katalogsorte; sonst die übliche Zuordnung („Knoblauchzehen“ → Knoblauch). */
const catalogVarieties = new Map();
for (const row of PRODUCT_ROWS) { const key = spellingStem(row[1]), previous = catalogVarieties.get(key); catalogVarieties.set(key, previous === undefined || previous === row[1] ? row[1] : null); }
export const varietyName = memoText(original => catalogVarieties.get(spellingStem(recipeNameCore(original))) || ingredientProductName(original));
function productNameOf(original) {
  const name=recipeNameCore(original);
  // Leitungswasser im Rezept ist kein Mineralwasser/Getränk aus der Katalogfamilie „Wasser“.
  const exact=productGroup(name); if(exact)return exact.id==='wasser'?name:exact.name;
  const words=groupNameKey(name).split(' ');
  for(let start=0;start<Math.min(words.length,5);start++) {
    const prefix=words.slice(0,start).join(' ');if(prefix&&!descriptor.test(prefix))continue;
    for(let suffix=0;suffix<Math.min(words.length-start,5);suffix++) {
      const ending=words.slice(words.length-suffix).join(' ');if(ending&&!descriptor.test(ending))continue;
      const known=ingredientNames.get(ingredientStem(words.slice(start,words.length-suffix).join(' ')));
      if(known&&([prefix,ending].every(part=>!part||sizesOnly.test(part))||known.produce))return known.name;
    }
  }
  return name;
}

/* Konserven: „1 Dose Tomaten“ meint keine frischen Tomaten, sondern das Konservenprodukt des Katalogs („Tomaten (Konserve)“
   mit eigenem Bild). Die Zuordnung entsteht aus dem Katalog selbst: Familien „… (Konserve)“ und Produkte „… in der Dose“.
   Produkte, die es ohnehin nur als Dose gibt (Mais, Kichererbsen, Kokosmilch), bleiben unverändert. */
const CAN_UNIT=/^(?:dosen?|büchsen?|konserven?)$/i;
const CAN_PHRASE=/(?:\s*\(\s*(?:aus der |in der )?(?:dose|büchse|konserve)\s*\)|,?\s+(?:aus der|in der) (?:dose|büchse))\s*$/i;
const canned = new Map();
for (const group of PRODUCT_FAMILIES) { const base=/^(.+) \(Konserve\)$/.exec(group.name)?.[1]; if(base) canned.set(spellingStem(base), group.name); }
for (const row of PRODUCT_ROWS) { const base=row[3]==='Dose'&&/^(.+) in der Dose$/i.exec(row[1])?.[1]; if(base&&!canned.has(spellingStem(base))) canned.set(spellingStem(base), canonicalProductName(row[1])); }
const cannedNames = new Set(canned.values());
export function cannedProductName(name, unit='') {
  const text=String(name??'');
  if(!CAN_UNIT.test(String(unit??'').trim())&&!CAN_PHRASE.test(text)) return null;
  const product=ingredientProductName(text.replace(CAN_PHRASE,''));
  if(cannedNames.has(product)) return product;
  return canned.get(spellingStem(product)) || null;
}
// Der Name, unter dem eine Zutat oder ein Artikel mit Vorrat, Einkaufsliste und Kochbarkeit verglichen wird (berücksichtigt die Einheit).
export const ingredientMatchName = row => cannedProductName(row?.name, row?.unit) || row?.name || '';

// Übernahmen aus Katalog/Rezept zählen zu einem passenden bereits benannten Artikel.
// Die freie Eingabe selbst verwendet diese Funktion nicht und behält ihren Namen.
export function reuseProductNames(rows,items,storeId) {
  const open=items.filter(row=>!row.deletedAt&&!row.checked&&!row._planEmpty&&(row.storeId || '')===(storeId || ''));
  return rows.map(row=>{
    const can=cannedProductName(row.name,row.unit),wanted=can||row.name,key=spellingStem(ingredientProductName(wanted));
    const existing=key&&open.find(item=>spellingStem(ingredientProductName(ingredientMatchName(item)))===key);
    if(existing)return {...row,name:existing.name};
    const clean=can||withoutPluralMarks(row.name);return clean===row.name?row:{...row,name:clean};
  });
}

// Feldweise, idempotente Migration. Keine IDs, Mengen, Preise oder Löschmarkierungen ändern.
// Neue freie Eingaben werden bereits beim Anlegen mit Version 1 markiert.
const clockKey = clock => clock ? `${clock.at}|${clock.id}` : '';
const migratedName = row => row.productGroupVersion===1 && (!row._clock?.name || !row._clock?.productGroupVersion || clockKey(row._clock.productGroupVersion)>=clockKey(row._clock.name));
export function productGroupMigration(data) {
  const ops = [], wishStores = new Set((data.stores || []).filter(row=>row.separate || /^(?:wünsche|wunschliste)$/i.test(row.name)).map(row=>row.id));
  const stock = new Map();
  for(const row of (data.pantry || []).filter(row=>!row.deletedAt).sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt))) {
    const group=productGroup(row.name); if(!group) continue;
    const variants=stock.get(group.id) || new Map(); variants.set(groupNameKey(row.productOriginalName || row.name),row); stock.set(group.id,variants);
  }
  for(const collection of ['items','pantry','ingredients','productFavorites']) for(const row of data[collection] || []) {
    // Im Rezept ist Mineralwasser eine andere Zutat als Leitungswasser. Eine
    // frühere automatische Zusammenfassung lässt sich am Originalnamen erkennen.
    if(collection==='ingredients' && row.name==='Wasser' && row.productOriginalName &&
      row._clock?.name?.id?.startsWith('product-groups-v1:ingredients:') && productGroup(row.productOriginalName)?.id==='wasser') {
      ops.push({id:`recipe-water-v1:${row.id}:${row._clock.name.id}`,collection,entityId:row.id,
        patch:{name:row.productOriginalName,productGroupVersion:1},
        at:new Date(Date.parse(row.updatedAt)+1).toISOString(),actor:'Rezeptzutaten'});
      continue;
    }
    if(migratedName(row)) continue;
    const group = !(collection==='items' && wishStores.has(row.storeId)) && productGroup(row.name);
    if(collection==='ingredients' && group?.id==='wasser') continue;
    const patch = {productGroupVersion:1};
    if(group && group.name !== row.name) Object.assign(patch,{name:group.name,productOriginalName:row.productOriginalName || row.name});
    const variants=collection==='pantry' && group && stock.get(group.id);
    if(variants?.size>1 && ![...variants.values()].some(row=>row.productGroupVersion===1)) {
      const available=[...variants.values()].some(row=>row.available!==false);
      if(available !== (row.available!==false)) Object.assign(patch,{available,productOriginalAvailable:row.available!==false});
    }
    if(Object.keys(patch).length===1) continue;
    const at = new Date(Date.parse(row.updatedAt || row.createdAt) + 1).toISOString();
    ops.push({id:`product-groups-v1:${collection}:${row.id}:${row._clock?.name?.id || row.createdAt}`,collection,entityId:row.id,patch,at,actor:'Produktgruppen'});
  }
  for(const row of data.meals || []) {
    if(row.productGroupVersion===1) continue;
    const patch={productGroupVersion:1};
    if(row.listedRows) patch.listedRows=row.listedRows.map(value=>{const [name,...rest]=value.split('|');return [canonicalProductName(name),...rest].join('|');});
    if(row.listedParts) patch.listedParts=row.listedParts.map(part=>({...part,name:canonicalProductName(part.name)}));
    if(JSON.stringify(patch.listedRows)===JSON.stringify(row.listedRows) && JSON.stringify(patch.listedParts)===JSON.stringify(row.listedParts)) continue;
    ops.push({id:`product-groups-v1:meals:${row.id}:${row.updatedAt}`,collection:'meals',entityId:row.id,patch,at:new Date(Date.parse(row.updatedAt)+1).toISOString(),actor:'Produktgruppen'});
  }
  return ops;
}
