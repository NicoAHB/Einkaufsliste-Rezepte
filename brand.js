import { STORE_CATALOG } from './store-catalog.js';
// Name-Erkennung für bestehende/eigene Geschäfte; ausdrücklich gewählte Händler bleiben auch nach dem Umbenennen zugeordnet.
// Mehrdeutige alte Namen bekommen bewusst keinen geratenen Angebotslink.
const LEGACY_CHAINS = [
  { key: 'aldi', pattern: /^aldi\b/, logo: true },
  { key: 'netto', pattern: /^netto$/, logo: false },
  { key: 'famila', pattern: /^famila$/, logo: false },
  { key: 'douglas', pattern: /^douglas\b/, drugstore: true }
];
const normalise = name => String(name || '').trim().toLowerCase().replace(/ß/g, 'ss').replace(/\s+/g, ' ');
// Symbol statt Name (Version 2.31): Ein Geschäft kann als kleines Bild statt als Name erscheinen. Ausdrücklich eingestellt (`symbol`: 'gift' oder 'none'), sonst nach dem Namen:
// „Wünsche“ (auch Wunschliste, Wunschzettel) ist ein Geschenk. `gift` muss zu `<symbol id="i-gift">` in index.html passen.
export const SYMBOLS = ['gift'];
export const defaultSymbol = name => /^w(?:ü|ue|u)nsch(?:e|liste|zettel)?\b/.test(normalise(name)) ? 'gift' : '';
export const symbolOf = store => store?.symbol === 'none' ? '' : SYMBOLS.includes(store?.symbol) ? store.symbol : defaultSymbol(store?.name);
// Die Kette zu einem Geschäftsnamen oder null.
export const chainOf = name => [...STORE_CATALOG, ...LEGACY_CHAINS].find(chain => chain.pattern.test(normalise(name))) || null;
export const chainForStore = store => STORE_CATALOG.find(chain => chain.key === store?.chainKey) || chainOf(store?.name);
// Schlüssel für die Anzeige als Logo („rewe“) oder '' bei Geschäften ohne Logo.
export const brandOf = name => { const chain = chainOf(name); return chain?.logo ? chain.key : ''; };
