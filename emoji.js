/* Standard-Bild für jeden Artikel: ein farbiges Emoji passend zum Artikelnamen („Birne“ → 🍐), sonst eines zur Kategorie, sonst ein Paket.
   Das braucht kein Internet und keine Bilddateien, trifft immer das richtige Thema und sieht auf iPhone und Android scharf und bunt aus.
   Reine Logik ohne DOM. Bewusst ohne Lookbehind-Ausdrücke (ältere iOS-Versionen können sie nicht). */

// Je Kategorie (Gang im Laden), wenn der Name nichts Genaueres hergibt.
export const CATEGORY_EMOJI = { obst: '🍎', brot: '🍞', fleisch: '🥩', kuehl: '🥛', tiefkuehl: '🧊', vorrat: '🥫', gewuerze: '🧂', snacks: '🍪', getraenke: '🥤', haushalt: '🧼' };
export const FALLBACK_EMOJI = '📦';

// Regeln: Name (klein geschrieben) und seine Wörter → trifft oder nicht.
const part = (...words) => text => words.some(word => text.includes(word));                  // irgendwo im Namen, auch in Zusammensetzungen („Cocktailtomaten“)
const whole = (...words) => (text, tokens) => words.some(word => tokens.includes(word));      // nur als ganzes Wort („Ei“ steckt nicht in „Reis“)
const ending = (...words) => (text, tokens) => words.some(word => tokens.some(token => token.endsWith(word)));   // am Wortende („Olivenöl“, aber nicht „Ölsardinen“)

/* Die Regeln werden der Reihe nach geprüft, der erste Treffer gewinnt. Ausnahmen stehen deshalb vor den allgemeinen Regeln:
   „Zahnpasta“ ist keine Pasta, Saft ist kein Obst, „Kokosmilch“ keine Milch, „Buttermilch“ keine Butter, „Reiswaffeln“ kein Reis, „Alkohol“ kein Kohl. Nur gängige Emoji. */
const RULES = [
  [part('reiswaffel', 'reiscracker', 'reiskeks'), '🍘'],
  [part('zahnpasta', 'zahnbürste', 'zahncreme', 'mundwasser'), '🪥'],
  [part('saft', 'schorle', 'nektar'), '🧃'],
  [part('kokosmilch', 'kokosnuss', 'kokos'), '🥥'],
  [part('schokolade', 'schoki', 'nutella', 'kakao', 'nougat', 'praline'), '🍫'],
  [part('buttermilch'), '🥛'],
  [part('erdnuss', 'erdnüss', 'walnuss', 'walnüss', 'haselnuss', 'haselnüss', 'mandel', 'cashew', 'pistazie', 'nüsse', 'nuss'), '🥜'],
  [part('zitrone', 'limette'), '🍋'],
  [part('orange', 'mandarine', 'clementine', 'grapefruit'), '🍊'],
  [part('apfel', 'äpfel'), '🍎'],
  [part('birne'), '🍐'],
  [part('banane'), '🍌'],
  [part('traube', 'rosine'), '🍇'],
  [part('erdbeer'), '🍓'],
  [part('himbeer', 'brombeer', 'heidelbeer', 'blaubeer', 'johannisbeer', 'preiselbeer', 'beeren'), '🫐'],
  [part('kirsche'), '🍒'],
  [part('pfirsich', 'nektarine', 'aprikose', 'pflaume', 'zwetschge'), '🍑'],
  [part('ananas'), '🍍'],
  [part('kiwi'), '🥝'],
  [part('melone'), '🍉'],
  [part('mango'), '🥭'],
  [part('avocado'), '🥑'],
  [part('tomate'), '🍅'],
  [part('gurke', 'zucchini'), '🥒'],
  [(text) => text.includes('paprika') && !text.includes('paprikapulver') && !text.includes('paprikagewürz'), '🫑'],
  [part('chili', 'peperoni', 'jalapeño'), '🌶️'],
  [part('karotte', 'möhre', 'mohrrübe'), '🥕'],
  [part('kartoffel'), '🥔'],
  [part('zwiebel', 'schalotte'), '🧅'],
  [part('knoblauch'), '🧄'],
  [part('brokkoli', 'broccoli', 'blumenkohl'), '🥦'],
  [(text, tokens) => tokens.some(token => token.includes('kohl') && !token.includes('alkohol')), '🥬'],
  [part('salat', 'spinat', 'rucola', 'lauch', 'mangold', 'petersilie', 'basilikum', 'schnittlauch', 'dill', 'koriander', 'kräuter'), '🥬'],
  [whole('mais'), '🌽'],
  [part('pilz', 'champignon'), '🍄'],
  [part('aubergine'), '🍆'],
  [part('kürbis'), '🎃'],
  [part('erbse', 'bohne', 'linse'), '🫘'],
  [(text) => text.includes('reis') && !text.includes('reiswaffel'), '🍚'],
  [part('nudel', 'spaghetti', 'pasta', 'penne', 'fusilli', 'tagliatelle', 'makkaroni', 'lasagne', 'tortellini', 'ravioli', 'gnocchi'), '🍝'],
  [part('baguette', 'ciabatta'), '🥖'],
  [part('croissant', 'hörnchen'), '🥐'],
  [part('brezel', 'laugenstange'), '🥨'],
  [part('kuchen', 'torte', 'muffin', 'donut', 'berliner'), '🍰'],
  [part('pizza'), '🍕'],
  [part('brot', 'toast', 'brötchen', 'semmel', 'knäcke', 'zwieback'), '🍞'],
  [part('mehl', 'haferflocken', 'müsli', 'cornflakes', 'kornflakes', 'getreide', 'grieß', 'couscous', 'bulgur', 'hirse', 'quinoa'), '🌾'],
  [whole('ei', 'eier', 'eigelb', 'eiweiß'), '🥚'],
  [part('hühnerei'), '🥚'],
  [part('milch', 'sahne', 'joghurt', 'jogurt', 'quark', 'skyr', 'kefir', 'schmand', 'crème fraîche', 'pudding'), '🥛'],
  [part('käse', 'mozzarella', 'parmesan', 'gouda', 'feta', 'emmentaler', 'camembert', 'brie', 'gorgonzola', 'cheddar', 'halloumi', 'mascarpone', 'ricotta'), '🧀'],
  [part('butter', 'margarine'), '🧈'],
  [part('hähnchen', 'hühnchen', 'huhn', 'pute', 'truthahn', 'geflügel', 'chicken', 'entenbrust', 'gans'), '🍗'],
  [part('speck', 'schinken', 'bacon'), '🥓'],
  [part('wurst', 'würstchen', 'salami'), '🌭'],
  [part('garnele', 'shrimp', 'scampi', 'krabbe'), '🍤'],
  [part('fisch', 'lachs', 'thunfisch', 'forelle', 'hering', 'makrele', 'kabeljau', 'seelachs', 'sardine'), '🐟'],
  [part('fleisch', 'hack', 'steak', 'schnitzel', 'rind', 'schwein', 'lamm', 'kalb', 'braten', 'gulasch', 'filet', 'nacken', 'rouladen'), '🥩'],
  [part('honig'), '🍯'],
  [part('marmelade', 'konfitüre', 'gelee'), '🍓'],
  [ending('öl'), '🫒'],
  [part('essig'), '🫒'],
  [part('zucker', 'süßstoff', 'bonbon', 'gummibär', 'lakritz', 'süßigkeit', 'fruchtgummi', 'karamell', 'marshmallow'), '🍬'],
  [part('salz', 'pfeffer', 'gewürz', 'curry', 'paprikapulver', 'zimt', 'muskat', 'oregano', 'thymian', 'rosmarin', 'kümmel', 'kurkuma', 'vanille'), '🧂'],
  [part('ketchup', 'senf', 'mayo', 'soße', 'sauce', 'dressing', 'passata', 'tomatenmark', 'konserve'), '🥫'],
  [part('keks', 'cookie', 'gebäck', 'waffel', 'plätzchen', 'lebkuchen', 'spekulatius'), '🍪'],
  [part('popcorn', 'chips', 'cracker', 'salzstange', 'snack', 'flips'), '🍿'],
  [whole('eis', 'eiscreme', 'speiseeis'), '🍦'],
  [part('wasser', 'sprudel'), '💧'],
  [part('cola', 'limo', 'fanta', 'sprite', 'getränk', 'energy', 'eistee'), '🥤'],
  [part('bier', 'radler', 'pils', 'kölsch'), '🍺'],
  [part('wein', 'sekt', 'prosecco', 'champagner'), '🍷'],
  [whole('whisky', 'gin', 'wodka', 'rum', 'likör', 'schnaps', 'korn'), '🥃'],
  [part('kaffee', 'espresso', 'cappuccino'), '☕'],
  [whole('tee'), '🍵'],
  [part('spülmittel', 'waschmittel', 'seife', 'reiniger', 'weichspüler', 'spülmaschinen', 'geschirrspül', 'entkalker', 'domol'), '🧼'],
  [part('shampoo', 'duschgel', 'creme', 'lotion', 'deo', 'haarspülung', 'rasier', 'sonnencreme'), '🧴'],
  [part('toilettenpapier', 'klopapier', 'küchenrolle', 'küchenpapier', 'taschentüch', 'servietten'), '🧻'],
  [part('schwamm', 'spülschwamm', 'putztuch', 'lappen'), '🧽'],
  [part('müllbeutel', 'müllsack', 'mülltüte'), '🗑️'],
  [part('batterie', 'akku'), '🔋'],
  [part('glühbirne', 'leuchtmittel'), '💡'],
  [part('kerze'), '🕯️'],
  [part('windel'), '👶'],
  [part('tierfutter', 'katzenfutter', 'hundefutter', 'katzenstreu'), '🐾']
];

// Emoji zum Artikelnamen; ohne Treffer das der Kategorie (`category` = Kennung wie „obst“), sonst ein Paket.
export function emojiFor(name, category) {
  const text = String(name ?? '').normalize('NFC').toLocaleLowerCase('de'), tokens = text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (const [matches, emoji] of RULES) if (matches(text, tokens)) return emoji;
  return CATEGORY_EMOJI[category] || FALLBACK_EMOJI;
}
export const allEmoji = () => [...new Set([...RULES.map(rule => rule[1]), ...Object.values(CATEGORY_EMOJI), FALLBACK_EMOJI])];
