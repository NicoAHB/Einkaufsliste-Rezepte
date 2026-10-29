import { chainOf } from './brand.js';
/* „Im Laden“-Modus: Was steht für das Geschäft, in dem man gerade ist, noch auf der Liste? Reine Logik ohne DOM.
   Artikel ohne Geschäft kann man in jedem Laden kaufen. Sie stehen deshalb überall, bis sie abgehakt sind: Wer sie bei Edeka abhakt,
   findet sie bei Lidl nicht mehr. Damit man einen versehentlichen Tipp zurücknehmen kann, bleibt ein solcher Artikel nur in dem Geschäft
   unter „Erledigt“, in dem er abgehakt wurde (`session`: Kennung → Geschäft, nur für diese Sitzung). `items` sind die sichtbaren
   Artikel (nicht gelöscht, Geschäft nicht gelöscht). */
export function shopView(items, storeId, session = new Map(), takesAnywhere = true) {
  const mine = items.filter(item => item.storeId === storeId), all = items.filter(item => !item.storeId), anywhere = takesAnywhere ? all : [];
  return {
    open: mine.filter(item => !item.checked),
    anywhere: anywhere.filter(item => !item.checked),
    done: [...mine.filter(item => item.checked), ...anywhere.filter(item => item.checked && session.get(item.id) === storeId)],
    elsewhere: items.filter(item => item.storeId && item.storeId !== storeId && !item.checked).length,
    // Offene Artikel ohne Geschäft, die dieses Geschäft nicht anzeigt (z. B. Rossmann): nur für einen Hinweis.
    hidden: takesAnywhere ? 0 : all.filter(item => !item.checked).length
  };
}

// Zahl der offenen Artikel, die man in diesem Geschäft kaufen kann (eigene und „überall möglich“).
export const shopCount = (items, storeId, takesAnywhere = true) => items.filter(item => !item.checked && (item.storeId ? item.storeId === storeId : takesAnywhere)).length;

// Eigene Liste (Version 2.30): Ein Geschäft mit `separate` (z. B. „Wünsche“) hat Artikel, die nur erscheinen, wenn genau dieses Geschäft gewählt ist: nicht unter „Alle“, nicht in Summen,
// Zählern und Hinweisen anderer Ansichten. `including`: das gerade gewählte Geschäft, dessen eigene Liste sichtbar bleibt.
export const isSeparate = store => store?.separate === true;
export function withoutSeparate(items, stores, including = '') {
  const apart = new Set(stores.filter(store => isSeparate(store) && store.id !== including).map(store => store.id));
  return apart.size ? items.filter(item => !apart.has(item.storeId)) : items;
}

// Nimmt ein Geschäft Artikel ohne Geschäft mit auf? Eine eigene Liste nie; sonst ausdrücklich eingestellt (`anywhere`), sonst nein bei Drogerien (Tabelle in brand.js): Dort kauft man kein Brot nebenbei.
export const takesAnywhere = store => isSeparate(store) ? false : typeof store?.anywhere === 'boolean' ? store.anywhere : !chainOf(store?.name)?.drugstore;

/* Auswahl „Alle“ im Laden: alles, was noch offen ist, egal für welches Geschäft, dazu die Artikel ohne Geschäft. Zuerst die Artikel ohne Geschäft, dann ein
   Abschnitt je Geschäft (in der Reihenfolge von `stores`, genau wie die Gesamtliste unter „Planen“); leere Abschnitte fehlen. `done`: alles Abgehakte
   (der Einkauf wird als Ganzes beendet). `items` sind die sichtbaren Artikel, `stores` die vorhandenen Geschäfte. */
export const ALL_STORES = '*';   // Kennung der Auswahl „Alle“ (kein echtes Geschäft)
export function shopAllView(items, stores) {
  const open = items.filter(item => !item.checked);
  const sections = [{ store: null, open: open.filter(item => !item.storeId) }, ...stores.map(store => ({ store, open: open.filter(item => item.storeId === store.id) }))]
    .filter(section => section.open.length);
  return { sections, done: items.filter(item => item.checked), count: open.length };
}

/* „Einkauf beenden“ (Version 2.47): Was verschwindet von der Liste? Bei „Alle“ alles Abgehakte. Bei einem Geschäft nur dessen Einkauf: seine eigenen Artikel und Artikel ohne
   Geschäft, die hier abgehakt wurden (`session`: Kennung → Geschäft, siehe `shopView`) oder deren Ort unbekannt ist (die Ansicht wurde zwischendurch neu geladen). Was in einem anderen
   Geschäft abgehakt wurde, bleibt bis zu dessen Abschluss. Nimmt das Geschäft keine Artikel ohne Geschäft mit auf (`takesAnywhere`), betrifft der Abschluss nur seine eigenen.
   `items`: die sichtbaren Artikel (wie bei `shopView`). */
export function finishable(items, storeId, session = new Map(), takesAnywhere = true) {
  const checked = items.filter(item => item.checked);
  if (!storeId || storeId === ALL_STORES) return checked;
  return checked.filter(item => item.storeId ? item.storeId === storeId : takesAnywhere && (session.get(item.id) ?? storeId) === storeId);
}

/* Schutz vor versehentlichen Berührungen im Laden (Handy in der Hosentasche): „Einkauf beenden“ und „Entsperren“ muss man gedrückt halten,
   und nach einiger Zeit ohne Berührung sperrt sich die Ansicht (Tippen bewirkt dann nichts, Scrollen geht weiter). */
export const LOCK_CHOICES = [0, 10, 20, 30, 60, 120];   // Sekunden ohne Berührung bis zur Sperre; 0 = nie
export const LOCK_DEFAULT = 10;   // Standard seit Version 2.33 (vorher 30 s); einstellbar unter „Einstellungen → Im Laden“
export const HOLD_FINISH_MS = 700;   // „Einkauf beenden“ so lange gedrückt halten
export const HOLD_UNLOCK_MS = 600;   // „Entsperren“ so lange gedrückt halten
export const HOLD_ITEM_MS = 500;     // gesperrt: Kreis (abhaken) oder Geschäft (wechseln) so lange gedrückt halten
// Gemerkte Wartezeit (Sekunden) als gültige Zahl; ohne Angabe oder bei Unsinn gilt der Standard.
export function lockSeconds(value) {
  return Number.isFinite(value) && value >= 0 && value <= 3600 ? Math.round(value) : LOCK_DEFAULT;
}
