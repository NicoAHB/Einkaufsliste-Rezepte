/* Vorschläge für den Vorrat (Einstellungen → Vorrat): häufige Zutaten, die man meist zu Hause hat. Reine Logik ohne DOM.
   Die Namen sind so geschrieben, wie sie in Rezepten meistens stehen („Salz“, „Olivenöl“, „Zwiebel“), denn der Vorrat vergleicht Namen genau
   (Groß- und Kleinschreibung egal). Ein Name enthält kein Komma und kein „und“, sonst würde der Vorrat ihn in mehrere Teile zerlegen. */
import { productKey } from './prices.js';

export const PANTRY_SUGGESTIONS = [
  { title: 'Würzen', names: ['Salz', 'Pfeffer', 'Paprikapulver', 'Zimt', 'Muskat', 'Oregano', 'Thymian', 'Currypulver'] },
  { title: 'Backen', names: ['Mehl', 'Zucker', 'Vanillezucker', 'Puderzucker', 'Backpulver'] },
  { title: 'Öl, Essig & Soßen', names: ['Öl', 'Olivenöl', 'Essig', 'Senf', 'Sojasauce', 'Tomatenmark', 'Gemüsebrühe'] },
  { title: 'Haltbares', names: ['Nudeln', 'Reis', 'Haferflocken'] },
  { title: 'Gemüse, meist da', names: ['Zwiebel', 'Knoblauchzehen'] }
];

// Die Vorschläge, die noch nicht im Vorrat stehen, je Gruppe (leere Gruppen fallen weg). `keys`: Schlüssel der Einträge im Vorrat (pantryKeys in data.js).
export function pantrySuggestions(keys, groups = PANTRY_SUGGESTIONS) {
  return groups.map(group => ({ title: group.title, names: group.names.filter(name => !keys.has(productKey(name))) })).filter(group => group.names.length);
}
