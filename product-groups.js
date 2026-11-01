/* Geprüfte Produktfamilien. Rohkatalog und Bildkoordinaten bleiben unverändert.
   Nur bekannte Varianten werden zugeordnet, keine freie Teilwort-Ersetzung. */
import { PRODUCT_ROWS } from './product-catalog-data.js';

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
for(const [name,id] of [['Grüne Oliven','oliven-gruen'],['Schwarze Oliven','oliven-gruen'],['Speiseöl','olivenoel'],['Pflanzenöl','olivenoel'],['Weizenmehl','mehl'],['Vollmilch','milch']]) byName.set(groupNameKey(name),byId.get(id));
export const productGroup = name => byName.get(groupNameKey(name)) || null;
export const productGroupById = id => byId.get(id) || null;
export const canonicalProductName = name => productGroup(name)?.name || name;

// Übernahmen aus Katalog/Rezept zählen zu einem schon genauer benannten Artikel.
// Die freie Eingabe selbst verwendet diese Funktion nicht und behält ihren Namen.
export function reuseProductNames(rows,items,storeId) {
  const open=items.filter(row=>!row.deletedAt&&!row.checked&&!row._planEmpty&&(row.storeId || '')===(storeId || ''));
  return rows.map(row=>{const group=productGroup(row.name),existing=group && open.find(item=>productGroup(item.name)?.id===group.id);return existing?{...row,name:existing.name}:row;});
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
