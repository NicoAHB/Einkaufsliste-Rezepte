// Lokale, gemeinsam gespeicherte Symbole für Reiter. Kennungen bleiben stabil.
// `label` (Symbol 1–7) ist die alte Nummer; die Oberfläche zeigt seit 2.152 nur noch `name`.
export const LIST_SYMBOLS = Object.freeze([
  { id:'gift', label:'Symbol 1', name:'Geschenke/Wünsche' },   // seit 2.156 (vorher „Geschenke“)
  { id:'pharmacy', label:'Symbol 2', name:'Apotheke' },
  { id:'travel', label:'Symbol 3', name:'Reisen' },
  { id:'home', label:'Symbol 4', name:'Haushalt' },
  { id:'checklist', label:'Symbol 5', name:'Notizen' },   // seit 2.150 ein Notizzettel: nur Textzeilen, ohne Menge und Geschäft
  { id:'pets', label:'Symbol 6', name:'Tierbedarf' },
  { id:'secret', label:'Symbol 7', name:'Geheim' }
].map(Object.freeze));
export const LIST_SYMBOL_IDS = Object.freeze(LIST_SYMBOLS.map(symbol=>symbol.id));
// Das Klemmbrett macht eine eigene Liste zur Notizliste (2.150). Es wird nur über „Notizliste anlegen“ vergeben, nie als gewöhnliches Motiv.
export const NOTES_SYMBOL = 'checklist';
export const REGULAR_SYMBOLS = Object.freeze(LIST_SYMBOLS.filter(symbol=>symbol.id!==NOTES_SYMBOL));
export const symbolName = id => LIST_SYMBOLS.find(symbol=>symbol.id===id)?.name || '';
// Vorgeschlagener Listenname beim Anlegen (2.156): der Name des Symbols, beim Schloss „Geheime Liste“
export const suggestedListName = id => id === 'secret' ? 'Geheime Liste' : symbolName(id);
// Ein Name, den es noch nicht gibt: „Apotheke“, sonst „Apotheke 2“, „Apotheke 3“ …
export function uniqueName(base, taken) {
  const used = new Set([...taken].map(name => String(name).trim().toLocaleLowerCase('de')));
  if (!base || !used.has(base.toLocaleLowerCase('de'))) return base;
  for (let number = 2; ; number++) { const name = `${base} ${number}`; if (!used.has(name.toLocaleLowerCase('de'))) return name; }
}

const normalise = name => String(name || '').trim().toLowerCase().replace(/ß/g, 'ss').replace(/\s+/g, ' ');
// Ohne ausdrückliche Wahl (`symbol` fehlt) ist „Wünsche“ (auch Wunschliste, Wunschzettel) ein Geschenk.
export const defaultSymbol = name => /^w(?:ü|ue|u)nsch(?:e|liste|zettel)?\b/.test(normalise(name)) ? 'gift' : '';

/* Festes Symbol (2.152): Ein einmal vergebenes Motiv ist die Identität der Liste und wird nicht mehr ausgetauscht – weder beim
   Bearbeiten noch durch Umbenennen, „Nur Name“, eine Typumstellung oder einen Abgleich. Alte eigene Listen ohne gespeichertes
   Symbol behalten das bisher sichtbare Motiv aus dem Namen („Wünsche“ → Geschenk). „none“ heißt: noch kein Motiv. */
export const fixedSymbol = store => {
  if (!store) return '';
  if (LIST_SYMBOL_IDS.includes(store.symbol)) return store.symbol;
  return store.symbol == null && store.separate === true ? defaultSymbol(store.name) : '';
};

// Anzeige im Reiter (2.152), getrennt vom Symbol gespeichert. Ohne Angabe bleibt die bisherige Ansicht: mit Motiv nur das Symbol.
export const DISPLAY_MODES = Object.freeze(['symbol', 'name', 'both']);
export const DISPLAY_LABELS = Object.freeze({ symbol:'Nur Symbol', name:'Nur Name', both:'Symbol und Name' });
export const displayModeOf = (mode, symbol) => !symbol ? 'name' : DISPLAY_MODES.includes(mode) ? mode : 'symbol';
