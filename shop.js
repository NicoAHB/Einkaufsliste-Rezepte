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

// Nimmt ein Geschäft Artikel ohne Geschäft mit auf? Ausdrücklich eingestellt (`anywhere`), sonst nein bei Drogerien: Dort kauft man kein Brot nebenbei.
const DRUGSTORE = /^(ro(ss|ß)mann|dm|dm-drogerie|müller|mueller|douglas|budni)(\b|$)/i;
export const takesAnywhere = store => typeof store?.anywhere === 'boolean' ? store.anywhere : !DRUGSTORE.test(String(store?.name || '').trim());
