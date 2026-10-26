/* „Im Laden“-Modus: Was steht für das Geschäft, in dem man gerade ist, noch auf der Liste? Reine Logik ohne DOM.
   Artikel ohne Geschäft kann man in jedem Laden kaufen. Sie stehen deshalb überall, bis sie abgehakt sind: Wer sie bei Edeka abhakt,
   findet sie bei Lidl nicht mehr. Damit man einen versehentlichen Tipp zurücknehmen kann, bleibt ein solcher Artikel nur in dem Geschäft
   unter „Erledigt“, in dem er abgehakt wurde (`session`: Kennung → Geschäft, nur für diese Sitzung). `items` sind die sichtbaren
   Artikel (nicht gelöscht, Geschäft nicht gelöscht). */
export function shopView(items, storeId, session = new Map()) {
  const mine = items.filter(item => item.storeId === storeId), anywhere = items.filter(item => !item.storeId);
  return {
    open: mine.filter(item => !item.checked),
    anywhere: anywhere.filter(item => !item.checked),
    done: [...mine.filter(item => item.checked), ...anywhere.filter(item => item.checked && session.get(item.id) === storeId)],
    elsewhere: items.filter(item => item.storeId && item.storeId !== storeId && !item.checked).length
  };
}

// Zahl der offenen Artikel, die man in diesem Geschäft kaufen kann (eigene und „überall möglich“).
export const shopCount = (items, storeId) => items.filter(item => !item.checked && (!item.storeId || item.storeId === storeId)).length;
