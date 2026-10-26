/* Neue Rezepte, wenn die eingebaute Sammlung durch ist. Aus geprüften Bausteinen (Gemüse, Beilagen, Obst, Toppings) und Rezeptarten (Pfanne, Ofen, Suppe …)
   entsteht jedes Rezept mit Zutaten, Mengen für vier Portionen und Schritten. Es wird nichts gespeichert: Die Reihenfolge ist fest gemischt und hängt nur von der
   laufenden Nummer ab (Tag × 3 + Platz), alle Geräte sehen am selben Tag dieselben Rezepte, und es wiederholt sich keines, bis alle durch sind. */
import { BUILTIN_PER_DAY, builtinKey, dayNumber, fixedOrder } from './daily.js';

// Gemüse. l = Name im Titel („mit …“), w = Wortstamm für „…-Cremesuppe“, c = Vorbereitung, z = Zutat, m = Minuten je Zubereitung, soup/flat = passt in Suppe / auf Flammkuchen.
const VEG = [
  { l: 'Zucchini', c: 'in Scheiben schneiden', z: '2 Zucchini', m: { pan: 6, oven: 25, pot: 10 }, soup: 1, flat: 1 },
  { l: 'Paprika', c: 'entkernen und in Streifen schneiden', z: '3 Paprika', m: { pan: 8, oven: 25, pot: 12 }, soup: 1, flat: 1 },
  { l: 'Brokkoli', c: 'in kleine Röschen teilen', z: '500 g Brokkoli', m: { pan: 8, oven: 20, pot: 10 }, soup: 1 },
  { l: 'Blumenkohl', c: 'in kleine Röschen teilen', z: '1 kleiner Blumenkohl', m: { pan: 12, oven: 30, pot: 12 }, soup: 1 },
  { l: 'Champignons', w: 'Champignon', c: 'putzen und in Scheiben schneiden', z: '300 g Champignons', m: { pan: 6, oven: 20, pot: 8 }, soup: 1, flat: 1 },
  { l: 'Karotten', c: 'schälen und in Scheiben schneiden', z: '4 Karotten', m: { pan: 10, oven: 30, pot: 15 }, soup: 1 },
  { l: 'Süßkartoffeln', w: 'Süßkartoffel', c: 'schälen und würfeln', z: '2 Süßkartoffeln', m: { pan: 14, oven: 30, pot: 15 }, soup: 1 },
  { l: 'Tomaten', c: 'halbieren', z: '400 g Kirschtomaten', m: { pan: 5, oven: 15, pot: 8 }, soup: 1, flat: 1 },
  { l: 'Lauch', c: 'putzen und in Ringe schneiden', z: '2 Stangen Lauch', m: { pan: 7, oven: 20, pot: 10 }, soup: 1, flat: 1 },
  { l: 'Aubergine', c: 'in Würfel schneiden', z: '1 große Aubergine', m: { pan: 10, oven: 25, pot: 12 } },
  { l: 'Spinat', c: 'waschen und grob hacken', z: '300 g frischer Blattspinat', m: { pan: 3, pot: 3 }, soup: 1, flat: 1 },
  { l: 'Kürbis', c: 'entkernen und mit Schale würfeln', z: '500 g Hokkaido-Kürbis', m: { pan: 12, oven: 30, pot: 15 }, soup: 1 },
  { l: 'Kohlrabi', c: 'schälen und in Stifte schneiden', z: '2 Kohlrabi', m: { pan: 10, oven: 25, pot: 12 }, soup: 1 },
  { l: 'Rosenkohl', c: 'putzen und halbieren', z: '400 g Rosenkohl', m: { pan: 12, oven: 25, pot: 15 } }
];
// Fleisch, Wurst, Käse, Fisch und pflanzliches Eiweiß. t = Art, p = Name im Satz, m = Minuten ('late' = erst zum Schluss dazu), top = darf roh auf Flammkuchen/Pizza.
const PROT = [
  { l: 'Hähnchen', p: 'Hähnchenbrust', t: 'fleisch', c: 'in Stücke schneiden und salzen', z: '500 g Hähnchenbrustfilet', m: { pan: 8, oven: 30, pot: 15 } },
  { l: 'Pute', p: 'Putenbrust', t: 'fleisch', c: 'in Streifen schneiden und salzen', z: '500 g Putenbrust', m: { pan: 8, oven: 30, pot: 12 } },
  { l: 'Rindfleisch', p: 'Rindergeschnetzeltes', t: 'fleisch', c: 'salzen und pfeffern', z: '400 g Rindergeschnetzeltes', m: { pan: 6 } },
  { l: 'Hackfleisch', p: 'Hackfleisch', t: 'fleisch', c: 'mit Salz und Pfeffer würzen', z: '400 g Hackfleisch gemischt', m: { pan: 8, pot: 15 } },
  { l: 'Bratwurst', p: 'Bratwürste', t: 'wurst', c: 'in Scheiben schneiden', z: '4 Bratwürste', m: { pan: 8, oven: 25, pot: 10 } },
  { l: 'Würstchen', p: 'Wiener Würstchen', t: 'wurst', c: 'in Scheiben schneiden', z: '6 Wiener Würstchen', m: { pan: 4, oven: 'late', pot: 8 }, top: 1 },
  { l: 'Speck', p: 'Speckwürfel', t: 'wurst', z: '150 g Speckwürfel', m: { pan: 5, oven: 20, pot: 5 }, top: 1 },
  { l: 'Schinken', p: 'Schinken', t: 'wurst', c: 'würfeln', z: '150 g gekochter Schinken', m: { pan: 'late', oven: 'late', pot: 'late' }, top: 1 },
  { l: 'Feta', p: 'Feta', t: 'kaese', c: 'würfeln', z: '200 g Feta', m: { pan: 'late', oven: 'late', pot: 'late' }, top: 1 },
  { l: 'Mozzarella', p: 'Mozzarella', t: 'kaese', c: 'in Scheiben schneiden', z: '2 Kugeln Mozzarella', m: { pan: 'late', oven: 'late', pot: 'late' }, top: 1 },
  { l: 'Halloumi', p: 'Halloumi', t: 'kaese', c: 'in Scheiben schneiden', z: '250 g Halloumi', m: { pan: 4, oven: 15 } },
  { l: 'Gorgonzola', p: 'Gorgonzola', t: 'kaese', c: 'zerbröckeln', z: '150 g Gorgonzola', m: { pan: 'late', oven: 'late', pot: 'late' }, top: 1 },
  { l: 'Ziegenkäse', p: 'Ziegenkäse', t: 'kaese', c: 'in Scheiben schneiden', z: '150 g Ziegenkäse', m: { pan: 'late', oven: 'late', pot: 'late' }, top: 1 },
  { l: 'Gouda', p: 'Gouda', t: 'kaese', c: 'reiben', z: '150 g Gouda', m: { pan: 'late', oven: 'late', pot: 'late' }, top: 1 },
  { l: 'Lachs', p: 'Lachsfilet', t: 'fisch', c: 'in Würfel schneiden und salzen', z: '400 g Lachsfilet', m: { pan: 5, oven: 'late' } },
  { l: 'Thunfisch', p: 'Thunfisch', t: 'fisch', c: 'abtropfen lassen', z: '2 Dosen Thunfisch (je 150 g)', m: { pan: 'late', oven: 'late' } },
  { l: 'Garnelen', p: 'Garnelen', t: 'fisch', c: 'abtupfen und salzen', z: '300 g Garnelen (geschält)', m: { pan: 4, oven: 'late' } },
  { l: 'Kichererbsen', p: 'Kichererbsen', t: 'veg', c: 'abspülen und abtropfen lassen', z: '1 Dose Kichererbsen (400 g)', m: { pan: 5, oven: 20, pot: 10 } },
  { l: 'weißen Bohnen', p: 'Weiße Bohnen', t: 'veg', c: 'abspülen und abtropfen lassen', z: '1 Dose weiße Bohnen (400 g)', m: { pan: 5, oven: 15, pot: 10 } },
  { l: 'roten Linsen', p: 'Rote Linsen', t: 'veg', c: 'waschen', z: '200 g rote Linsen', m: { pot: 15 } },
  { l: 'Tofu', p: 'Tofu', t: 'veg', c: 'abtupfen und würfeln', z: '300 g Tofu natur', m: { pan: 8, oven: 25, pot: 10 } },
  { l: 'Räuchertofu', p: 'Räuchertofu', t: 'veg', c: 'würfeln', z: '250 g Räuchertofu', m: { pan: 8, oven: 25, pot: 8 } }
];
// Beläge für Suppen (s = Schritt).
const SOUPTOP = [
  { l: 'Speck', z: '100 g Speckwürfel', s: 'Speckwürfel in einer Pfanne ohne Fett knusprig braten und über die Suppe streuen.' },
  { l: 'Croûtons', z: '3 Scheiben Toastbrot', s: 'Toastbrot würfeln, in einer Pfanne mit etwas Butter rösten und auf die Suppe geben.' },
  { l: 'Feta', z: '100 g Feta', s: 'Feta zerbröckeln und über die Suppe streuen.' },
  { l: 'Kürbiskernen', z: '4 EL Kürbiskerne', s: 'Kürbiskerne in einer trockenen Pfanne rösten und über die Suppe streuen.' },
  { l: 'Crème fraîche', z: '4 EL Crème fraîche', s: 'Je einen Klecks Crème fraîche in die Suppe geben.' },
  { l: 'Würstchen', z: '4 Wiener Würstchen', s: 'Würstchen in Scheiben schneiden und in der Suppe 5 Minuten erwärmen.' },
  { l: 'Schinken', z: '100 g gekochter Schinken', s: 'Schinken in Streifen schneiden und in die Suppe geben.' },
  { l: 'Ziegenkäse', z: '100 g Ziegenkäse', s: 'Ziegenkäse in Scheiben schneiden und auf die Suppe legen.' },
  { l: 'Parmesan', z: '40 g Parmesan', s: 'Parmesan darüberhobeln.' }
];
// Obst (l = „mit …“, w = „…-Crumble“, m = Minuten, cold = passt roh zu Quark und Haferflocken).
const FRUIT = [
  { l: 'Äpfeln', w: 'Apfel', p: 'Äpfel', c: 'schälen, entkernen und in Stücke schneiden', z: '4 Äpfel', m: { pan: 8, oven: 25 }, cold: 1 },
  { l: 'Birnen', w: 'Birnen', p: 'Birnen', c: 'schälen, entkernen und in Stücke schneiden', z: '3 Birnen', m: { pan: 8, oven: 25 }, cold: 1 },
  { l: 'Bananen', w: 'Bananen', p: 'Bananen', c: 'in Scheiben schneiden', z: '3 reife Bananen', m: { pan: 3 }, cold: 1 },
  { l: 'Beeren', w: 'Beeren', p: 'Beerenmischung', c: 'antauen lassen', z: '400 g Beerenmischung (TK)', m: { pan: 5, oven: 25 }, cold: 1 },
  { l: 'Erdbeeren', w: 'Erdbeer', p: 'Erdbeeren', c: 'waschen, putzen und halbieren', z: '400 g Erdbeeren', m: { pan: 4, oven: 25 }, cold: 1 },
  { l: 'Pflaumen', w: 'Pflaumen', p: 'Pflaumen', c: 'entsteinen und vierteln', z: '500 g Pflaumen', m: { pan: 8, oven: 25 } },
  { l: 'Sauerkirschen', w: 'Sauerkirsch', p: 'Sauerkirschen', c: 'abtropfen lassen', z: '1 Glas Sauerkirschen (350 g Abtropfgewicht)', m: { pan: 5, oven: 25 }, cold: 1 },
  { l: 'Pfirsichen', w: 'Pfirsich', p: 'Pfirsiche', c: 'entsteinen und in Spalten schneiden', z: '4 Pfirsiche', m: { pan: 5, oven: 25 }, cold: 1 },
  { l: 'Mango', w: 'Mango', p: 'Mango', c: 'schälen und in Würfel schneiden', z: '1 reife Mango', m: { pan: 4 }, cold: 1 },
  { l: 'Orangen', w: 'Orangen', p: 'Orangen', c: 'schälen und in Stücke schneiden', z: '3 Orangen', m: {}, cold: 1 },
  { l: 'Rhabarber', w: 'Rhabarber', p: 'Rhabarber', c: 'putzen und in Stücke schneiden', z: '500 g Rhabarber', m: { pan: 8, oven: 25 } }
];
// Beläge für Süßes (s = letzter Schritt, cold = passt auch zu Quark und Haferflocken).
const TOPPING = [
  { l: 'Mandeln', z: '40 g gehobelte Mandeln', s: 'Mit gehobelten Mandeln bestreuen.', cold: 1 },
  { l: 'Haselnüssen', z: '40 g gehackte Haselnüsse', s: 'Mit gehackten Haselnüssen bestreuen.', cold: 1 },
  { l: 'Kokosraspeln', z: '30 g Kokosraspeln', s: 'Mit Kokosraspeln bestreuen.', cold: 1 },
  { l: 'Zimt', z: '1 TL Zimt', s: 'Mit Zimt bestäuben.', cold: 1 },
  { l: 'Honig', z: '3 EL Honig', s: 'Mit Honig beträufeln.', cold: 1 },
  { l: 'Schokotropfen', z: '50 g Schokotropfen', s: 'Mit Schokotropfen bestreuen.', cold: 1 },
  { l: 'Vanillesauce', z: '400 ml Vanillesauce', s: 'Mit Vanillesauce servieren.' },
  { l: 'Vanilleeis', z: '4 Kugeln Vanilleeis', s: 'Mit je einer Kugel Vanilleeis servieren.' },
  { l: 'Schlagsahne', z: '200 ml Schlagsahne', s: 'Sahne steif schlagen und dazu servieren.' }
];

/* Rezeptarten. method: pan (Pfanne), oven (Ofen), pot (Topf), top (roh belegen), cold (ohne Kochen). name(a, b) = Titel, z = Grundzutaten, t = Grundzeit, bake = Backzeit.
   Schritte: Text oder Marke: $a / $b = Schritt für Gemüse bzw. Beilage, $late = Beilage, die erst zum Schluss dazukommt, $bake = Backschritt mit Zeit. */
const NOT_STRONG = ['Gouda', 'Gorgonzola'];
const FAMILIES = [
  { id: 'nudeln', c: 'Pasta', method: 'pan', t: 15, name: (a, b) => `Nudelpfanne mit ${a.l} und ${b.l}`, a: 'veg', b: ['fleisch', 'wurst', 'kaese', 'fisch', 'veg'],
    z: ['400 g Nudeln (Penne oder Fusilli)', '2 Knoblauchzehen', '2 EL Olivenöl', '200 ml Sahne', 'Salz', 'Pfeffer'],
    s: ['Nudeln in reichlich Salzwasser nach Packungsanleitung bissfest kochen, eine Tasse Nudelwasser aufheben.', 'Olivenöl in einer großen Pfanne erhitzen.', '$b', '$a', 'Knoblauch fein hacken, kurz mitbraten, mit der Sahne ablöschen und 3 Minuten köcheln lassen.', '$late', 'Nudeln abgießen und unter die Sauce mischen, mit Salz und Pfeffer abschmecken, bei Bedarf mit etwas Nudelwasser verdünnen.'] },
  { id: 'reis', method: 'pan', t: 15, name: (a, b) => `Reispfanne mit ${a.l} und ${b.l}`, a: 'veg', b: ['fleisch', 'wurst', 'fisch', 'veg'],
    z: ['300 g Langkornreis', '3 Eier', '3 EL Sojasauce', '3 Frühlingszwiebeln', '2 Knoblauchzehen', '3 EL Öl', 'Pfeffer'],
    s: ['Reis nach Packungsanleitung kochen und ausdampfen lassen (Reis vom Vortag gelingt besonders gut).', 'In einer großen Pfanne 1 EL Öl erhitzen.', '$b', '$a', 'Knoblauch und Frühlingszwiebeln in Ringe schneiden und 2 Minuten mitbraten.', '$late', 'Die Eier verquirlen, in die Mitte der Pfanne gießen und unter Rühren stocken lassen.', 'Den Reis zugeben, 4 Minuten kräftig braten und mit Sojasauce und Pfeffer würzen.'] },
  { id: 'curry', method: 'pan', t: 15, name: (a, b) => `Kokos-Curry mit ${a.l} und ${b.l}`, a: 'veg', b: ['fleisch', 'fisch', 'veg'], not: ['Thunfisch'],
    z: ['250 g Basmatireis', '1 Zwiebel', '2 Knoblauchzehen', '1 Stück Ingwer (daumengroß)', '2 EL Currypaste', '400 ml Kokosmilch', '200 ml Gemüsebrühe', '2 EL Öl', 'Salz', '1 Limette'],
    s: ['Reis nach Packungsanleitung kochen.', 'Öl in einem großen Topf oder einer tiefen Pfanne erhitzen.', '$b', '$a', 'Zwiebel, Knoblauch und Ingwer fein hacken, zugeben und 2 Minuten mitbraten, die Currypaste kurz mitrösten.', 'Mit Kokosmilch und Brühe ablöschen und 10 Minuten köcheln lassen.', 'Mit Salz und Limettensaft abschmecken und mit dem Reis servieren.'] },
  { id: 'gnocchi', c: 'Pasta', method: 'pan', t: 15, name: (a, b) => `Gnocchi-Pfanne mit ${a.l} und ${b.l}`, a: 'veg', b: ['fleisch', 'wurst', 'kaese', 'fisch', 'veg'],
    z: ['500 g Gnocchi (Kühlregal)', '2 EL Olivenöl', '1 Zwiebel', '2 Knoblauchzehen', '150 ml Sahne', 'Salz', 'Pfeffer'],
    s: ['Olivenöl in einer großen Pfanne erhitzen, die Gnocchi darin 6 bis 8 Minuten goldbraun braten und herausnehmen.', '$b', '$a', 'Zwiebel und Knoblauch fein würfeln, kurz mitbraten und mit der Sahne ablöschen.', 'Die Gnocchi zurück in die Pfanne geben und 2 Minuten ziehen lassen.', '$late', 'Mit Salz und Pfeffer abschmecken.'] },
  { id: 'wraps', method: 'pan', t: 15, name: (a, b) => `Wraps mit ${a.l} und ${b.l}`, a: 'veg', b: ['fleisch', 'kaese', 'fisch', 'veg'], not: [...NOT_STRONG, 'Mozzarella'],
    z: ['8 Weizentortillas (Wraps)', '200 g Joghurt', '1 EL Zitronensaft', '1 Romanasalat', '2 EL Öl', 'Salz', 'Pfeffer'],
    s: ['Joghurt mit Zitronensaft, Salz und Pfeffer zu einem Dip verrühren, den Salat waschen und in Streifen schneiden.', 'Öl in einer großen Pfanne erhitzen.', '$b', '$a', '$late', 'Die Tortillas kurz in einer trockenen Pfanne erwärmen, mit Dip, Salat und der Füllung belegen und einrollen.'] },
  { id: 'couscous', method: 'pan', t: 15, name: (a, b) => `Couscous-Bowl mit ${a.l} und ${b.l}`, a: 'veg', b: ['fleisch', 'kaese', 'fisch', 'veg'], not: NOT_STRONG,
    z: ['250 g Couscous', '350 ml Gemüsebrühe', '3 EL Olivenöl', '1 Zitrone', '1 Bund Petersilie', 'Salz', 'Pfeffer'],
    s: ['Couscous in eine Schüssel geben, mit der heißen Brühe übergießen, zugedeckt 5 Minuten quellen lassen und mit einer Gabel lockern.', 'In einer Pfanne 1 EL Olivenöl erhitzen.', '$b', '$a', 'Couscous mit Zitronensaft, dem restlichen Olivenöl, Salz und Pfeffer anmachen und die Petersilie hacken.', '$late', 'Couscous in Schalen verteilen, Gemüse und Beilage darauf anrichten und mit Petersilie bestreuen.'] },
  { id: 'ofen', method: 'oven', t: 15, bake: 35, put: 'auf dem Blech verteilen', name: (a, b) => `Ofenblech mit ${a.l} und ${b.l}`, a: 'veg', b: ['fleisch', 'wurst', 'kaese', 'fisch', 'veg'], not: NOT_STRONG,
    z: ['600 g festkochende Kartoffeln', '4 EL Olivenöl', '1 TL getrockneter Oregano', 'Salz', 'Pfeffer'],
    s: ['Backofen auf 200 °C Ober-/Unterhitze vorheizen.', 'Kartoffeln waschen, in kleine Würfel schneiden und auf einem Backblech verteilen.', '$a', '$b', 'Alles mit Olivenöl, Oregano, Salz und Pfeffer vermengen, das Blech in den Ofen schieben und $bake, dabei einmal wenden.', '$late', 'Aus dem Ofen nehmen und servieren.'] },
  { id: 'gratin', c: 'Auflauf', method: 'oven', t: 20, bake: 45, put: 'in die Form schichten', latePut: 'darauf verteilen', name: (a, b) => `Kartoffelauflauf mit ${a.l} und ${b.l}`, a: 'veg', b: ['fleisch', 'wurst', 'kaese', 'veg'], not: ['Gouda', 'Halloumi', 'Hackfleisch'],
    z: ['800 g festkochende Kartoffeln', '250 ml Sahne', '150 ml Milch', '1 Knoblauchzehe', '1 EL Butter', '100 g geriebener Käse', 'Salz', 'Pfeffer', '1 Prise Muskat'],
    s: ['Backofen auf 180 °C Ober-/Unterhitze vorheizen und eine Auflaufform mit Butter einfetten.', 'Kartoffeln schälen, in dünne Scheiben schneiden und in die Form schichten.', '$a', '$b', 'Sahne und Milch mit dem gepressten Knoblauch, Salz, Pfeffer und Muskat verrühren und darübergießen.', 'Mit dem Käse bestreuen und $bake, bis die Kartoffeln weich und die Oberfläche goldbraun ist.', '$late'] },
  { id: 'frittata', method: 'pan', t: 10, name: (a, b) => `Frittata mit ${a.l} und ${b.l}`, a: 'veg', b: ['wurst', 'kaese', 'fisch'],
    z: ['8 Eier', '100 ml Milch', '2 EL Olivenöl', '1 Zwiebel', 'Salz', 'Pfeffer', '1 Prise Muskat'],
    s: ['Eier mit Milch, Salz, Pfeffer und Muskat verquirlen.', 'Die Zwiebel würfeln und im Olivenöl in einer großen Pfanne glasig dünsten.', '$b', '$a', '$late', 'Die Eiermasse darübergießen und zugedeckt bei kleiner Hitze etwa 12 Minuten stocken lassen, bis die Oberfläche fest ist.'] },
  { id: 'flammkuchen', method: 'top', t: 25, put: 'gleichmäßig auf den Teigen verteilen', name: (a, b) => `Flammkuchen mit ${a.l} und ${b.l}`, a: 'flat', b: 'top',
    z: ['2 Flammkuchenteige (Kühlregal)', '200 g Crème fraîche', '1 rote Zwiebel', 'Salz', 'Pfeffer', '1 Prise Muskat'],
    s: ['Backofen auf 230 °C Ober-/Unterhitze vorheizen.', 'Crème fraîche mit Salz, Pfeffer und Muskat verrühren und auf den ausgerollten Teigen verstreichen.', 'Die Zwiebel in feine Ringe schneiden und auf die Teige legen.', '$a', '$b', 'Flammkuchen auf mittlerer Schiene 10 bis 12 Minuten knusprig backen.'] },
  { id: 'pizza', method: 'top', t: 25, put: 'gleichmäßig auf den Tortillas verteilen', name: (a, b) => `Tortilla-Pizza mit ${a.l} und ${b.l}`, a: 'flat', b: 'top', not: ['Mozzarella', 'Gouda'],
    z: ['4 große Weizentortillas', '200 g passierte Tomaten', '150 g geriebener Käse', '1 TL getrockneter Oregano', 'Salz', 'Pfeffer'],
    s: ['Backofen auf 220 °C Ober-/Unterhitze vorheizen und die Tortillas auf Backbleche legen.', 'Passierte Tomaten mit Oregano, Salz und Pfeffer verrühren und auf den Tortillas verstreichen.', '$a', '$b', 'Mit dem Käse bestreuen und 10 bis 12 Minuten knusprig backen.'] },
  { id: 'suppe', c: 'Suppe', method: 'pot', t: 15, name: (a, b) => `${a.w || a.l}-Cremesuppe mit ${b.l}`, a: 'soup', b: 'souptop',
    z: ['1 Zwiebel', '1 EL Butter', '700 ml Gemüsebrühe', '150 ml Sahne', 'Salz', 'Pfeffer', '1 Prise Muskat'],
    s: ['Die Zwiebel würfeln und in der Butter in einem großen Topf glasig dünsten.', 'Mit der Brühe aufgießen und aufkochen.', '$a', 'Sahne zugeben, alles mit dem Stabmixer fein pürieren und mit Salz, Pfeffer und Muskat abschmecken.', '$b'] },
  { id: 'eintopf', c: 'Eintopf', method: 'pot', t: 20, bake: 20, name: (a, b) => `Eintopf mit ${a.l} und ${b.l}`, a: 'veg', b: ['fleisch', 'wurst', 'veg'],
    z: ['600 g Kartoffeln', '1 Zwiebel', '1 l Gemüsebrühe', '2 EL Öl', '1 TL getrockneter Majoran', 'Salz', 'Pfeffer'],
    s: ['Zwiebel und Kartoffeln würfeln, im Öl in einem großen Topf 3 Minuten anbraten, mit der Brühe aufgießen und aufkochen.', '$b', '$a', 'Alles zusammen köcheln lassen, bis die Kartoffeln weich sind (etwa 20 Minuten).', '$late', 'Mit Majoran, Salz und Pfeffer abschmecken.'] },
  { id: 'risotto', method: 'pan', t: 35, after: ' und beiseitestellen', name: (a, b) => `Risotto mit ${a.l} und ${b.l}`, a: 'veg', b: ['fleisch', 'wurst', 'kaese', 'fisch'], not: ['Hackfleisch', 'Rindfleisch', 'Bratwurst', 'Würstchen', 'Halloumi', 'Gouda', 'Thunfisch'],
    z: ['300 g Risottoreis', '1 Zwiebel', '800 ml Gemüsebrühe', '100 ml Weißwein (oder Brühe)', '2 EL Butter', '2 EL Olivenöl', '50 g Parmesan', 'Salz', 'Pfeffer'],
    s: ['Olivenöl in einer Pfanne erhitzen.', '$b', '$a', 'Die Brühe in einem Topf erhitzen. Zwiebel fein würfeln und in der Butter in einem zweiten Topf glasig dünsten.', 'Den Reis zugeben, 2 Minuten glasig anschwitzen und mit dem Wein ablöschen.', 'Nach und nach die heiße Brühe zugießen und unter Rühren etwa 20 Minuten köcheln, bis der Reis cremig, aber noch bissfest ist.', 'Gemüse und Beilage unterheben.', '$late', 'Den Parmesan unterrühren und mit Salz und Pfeffer abschmecken.'] },
  // Süßes: a = Obst, b = Belag
  { id: 'crumble', c: 'Süß', method: 'oven', t: 20, bake: 35, put: 'in die Form geben und mit 2 EL Zucker mischen', name: (a, b) => `${a.w}-Crumble mit ${b.l}`, a: 'fruit-oven', b: 'topping',
    z: ['200 g Mehl', '120 g Zucker', '1 Päckchen Vanillezucker', '120 g kalte Butter'],
    s: ['Backofen auf 180 °C Ober-/Unterhitze vorheizen und eine Auflaufform einfetten.', '$a', 'Mehl, Zucker, Vanillezucker und die kalte Butter in Stücken mit den Fingern zu groben Streuseln verkneten.', 'Die Streusel auf dem Obst verteilen und $bake, bis die Oberfläche goldbraun ist.', '$b'] },
  { id: 'pfannkuchen', c: 'Süß', method: 'pan', t: 20, phrase: { pan: m => `mit 1 EL Zucker in einer Pfanne ${m} Minuten erhitzen` }, name: (a, b) => `Pfannkuchen mit ${a.l} und ${b.l}`, a: 'fruit-pan', b: 'topping',
    z: ['250 g Mehl', '3 Eier', '500 ml Milch', '1 Prise Salz', '2 EL Butter', '3 EL Zucker'],
    s: ['Mehl, Eier, Milch und Salz zu einem glatten Teig verrühren und 10 Minuten quellen lassen.', 'Etwas Butter in einer Pfanne erhitzen und aus dem Teig nacheinander dünne Pfannkuchen ausbacken (je Seite etwa 2 Minuten), dabei warm halten.', '$a', 'Die Pfannkuchen mit dem warmen Obst belegen und aufrollen.', '$b'] },
  { id: 'milchreis', c: 'Süß', method: 'pan', t: 40, phrase: { pan: m => `mit 1 EL Zucker in einem Topf ${m} Minuten köcheln lassen` }, name: (a, b) => `Milchreis mit ${a.l} und ${b.l}`, a: 'fruit-pan', b: 'topping',
    z: ['250 g Milchreis', '1 l Milch', '3 EL Zucker', '1 Päckchen Vanillezucker', '1 Prise Salz'],
    s: ['Milch mit Zucker, Vanillezucker und Salz aufkochen und den Milchreis einrühren.', 'Bei kleinster Hitze etwa 30 Minuten quellen lassen und dabei oft umrühren, damit nichts anbrennt.', '$a', 'Den Milchreis in Schüsseln verteilen und das Obst darauf geben.', '$b'] },
  { id: 'quark', c: 'Süß', method: 'cold', t: 15, name: (a, b) => `Quarkspeise mit ${a.l} und ${b.l}`, a: 'fruit-cold', b: 'topping-cold',
    z: ['500 g Magerquark', '150 g Joghurt', '3 EL Zucker', '1 Päckchen Vanillezucker', '1 Spritzer Zitronensaft'],
    s: ['Quark mit Joghurt, Zucker, Vanillezucker und Zitronensaft glatt und cremig rühren.', '$a', 'Quark und Obst abwechselnd in Gläser schichten und kurz kalt stellen.', '$b'] },
  { id: 'oats', c: 'Süß', method: 'cold', t: 10, name: (a, b) => `Overnight Oats mit ${a.l} und ${b.l}`, a: 'fruit-cold', b: 'topping-cold',
    z: ['200 g Haferflocken', '300 ml Milch', '300 g Joghurt', '3 EL Ahornsirup'],
    s: ['Haferflocken, Milch, Joghurt und Ahornsirup verrühren, in vier Gläser füllen und über Nacht (mindestens 4 Stunden) in den Kühlschrank stellen.', '$a', 'Am nächsten Morgen das Obst auf den Haferflocken verteilen.', '$b'] }
];

const first = text => text.charAt(0).toUpperCase() + text.slice(1);

// Die Bausteine, die zu einer Rezeptart passen: Gemüse/Obst nach Zubereitung, Beilagen nach Art und ohne die Ausnahmen der Rezeptart.
function slotItems(family, slot) {
  const method = family.method, drop = family.not || [];
  if (Array.isArray(slot)) return PROT.filter(item => slot.includes(item.t) && !drop.includes(item.l) && item.m[method] !== undefined);
  switch (slot) {
    case 'veg': return VEG.filter(item => item.m[method] !== undefined);
    case 'soup': return VEG.filter(item => item.soup && item.m.pot !== undefined);
    case 'flat': return VEG.filter(item => item.flat);
    case 'top': return PROT.filter(item => item.top && !drop.includes(item.l));
    case 'fruit-cold': return FRUIT.filter(item => item.cold);
    case 'fruit-oven': return FRUIT.filter(item => item.m.oven !== undefined);
    case 'fruit-pan': return FRUIT.filter(item => item.m.pan !== undefined);
    case 'souptop': return SOUPTOP;
    case 'topping': return TOPPING;
    default: return TOPPING.filter(item => item.cold);   // 'topping-cold'
  }
}

// Alle Rezeptarten × Gemüse/Obst × Beilage/Belag, die zueinander passen, in fester Mischung.
let table = null, order = null;
function combos() {
  if (!table) {
    table = [];
    FAMILIES.forEach((family, index) => {
      const firsts = slotItems(family, family.a), seconds = slotItems(family, family.b);
      for (const a of firsts) for (const b of seconds) table.push([index, a, b]);
    });
    order = fixedOrder(table.length, 20260315);
  }
  return table;
}
export const recipeCount = () => combos().length;

// Ein Schritt für eine Zutat: Vorbereitung, dann je nach Zubereitung braten, kochen, auf das Blech legen oder zum Schluss dazugeben.
function sentence(item, family) {
  const method = family.method, minutes = item.m[method], lead = first(item.p || item.l), prep = item.c ? `${lead} ${item.c}` : lead;
  const join = text => (item.c ? `${prep}, dann ${text}.` : `${prep} ${text}.`);
  if (method === 'cold') return `${prep}.`;
  if (method === 'top') return join(family.put);
  if (minutes === 'late') return join(method === 'oven' ? `in den letzten 15 Minuten ${family.latePut || family.put}` : 'zum Schluss unterrühren');
  if (method === 'oven') return join(family.put);
  const phrase = { pan: m => `in der Pfanne ${m} Minuten braten`, pot: m => `${m} Minuten im Topf mitkochen`, ...family.phrase }[method](minutes);
  return join(`${phrase}${family.after || ''}`);
}
function build(family, a, b) {
  const method = family.method, minutes = item => (typeof item.m?.[method] === 'number' ? item.m[method] : 0), [ma, mb] = [minutes(a), minutes(b)];
  const late = b.m?.[method] === 'late', bake = `etwa ${Math.max(family.bake || 0, ma, mb)} Minuten backen`, steps = [];
  for (const step of family.s) {
    if (step === '$a') steps.push(sentence(a, family));
    else if (step === '$b') { if (!b.m) steps.push(b.s); else if (!late) steps.push(sentence(b, family)); }   // Belag: fertiger Satz, Beilage: je nach Zubereitung
    else if (step === '$late') { if (late) steps.push(sentence(b, family)); }
    else steps.push(step.replace('$bake', bake));
  }
  const extra = method === 'pan' ? ma + mb : method === 'cold' || method === 'top' ? 0 : Math.max(ma, mb, family.bake || 0);
  const category = family.c || (b.t === 'fleisch' || b.t === 'wurst' ? 'Fleisch' : b.t === 'fisch' ? 'Fisch' : 'Vegetarisch');
  return { n: family.name(a, b), p: 4, t: Math.ceil((family.t + extra) / 5) * 5, c: category, z: [b.z, a.z, ...family.z], s: steps };
}

// Das Rezept mit der laufenden Nummer n. Gleiche Nummer = gleiches Rezept; erst nach allen Rezepten beginnt die Reihenfolge von vorn.
export function makeRecipe(n) {
  const all = combos(), [family, a, b] = all[order[((Math.trunc(n) % all.length) + all.length) % all.length]];
  return build(FAMILIES[family], a, b);
}
/* Die neuen Vorschläge für einen Tag: Platz `from` bis `count - 1`, nicht schon unter den eigenen Rezepten (`known`, Menge von builtinKey).
   Einträge wie bei der Sammlung: { key, title, gen: Nummer }. */
export function planGenerated(day, known = new Set(), from = 0, count = BUILTIN_PER_DAY) {
  const picks = [], taken = new Set();
  for (let slot = from; slot < count; slot++) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const number = dayNumber(day) * count + slot + attempt * 7919, recipe = makeRecipe(number), key = builtinKey(recipe.n);
      if (!known.has(key) && !taken.has(key)) { taken.add(key); picks.push({ key, title: recipe.n, gen: number }); break; }
    }
  }
  return picks;
}
