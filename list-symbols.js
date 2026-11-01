// Lokale, gemeinsam gespeicherte Symbole für Reiter. Kennungen bleiben stabil.
export const LIST_SYMBOLS = Object.freeze([
  { id:'gift', label:'Symbol 1', name:'Geschenke' },
  { id:'pharmacy', label:'Symbol 2', name:'Apotheke' },
  { id:'travel', label:'Symbol 3', name:'Reisen' },
  { id:'home', label:'Symbol 4', name:'Haushalt' },
  { id:'checklist', label:'Symbol 5', name:'Aufgaben' },
  { id:'pets', label:'Symbol 6', name:'Tierbedarf' },
  { id:'secret', label:'Symbol 7', name:'Geheim' }
].map(Object.freeze));
export const LIST_SYMBOL_IDS = Object.freeze(LIST_SYMBOLS.map(symbol=>symbol.id));
