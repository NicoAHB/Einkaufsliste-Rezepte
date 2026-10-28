import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aliasKey, parseReceipt, parseSize, storeForChain, tidyName } from '../receipt.js';

// Beispielbons im Stil der digitalen Kassenbons (erfundene Daten).
const rewe = `REWE Markt GmbH
Musterstraße 12
12345 Musterstadt
UID Nr.: DE812706034
BIO VOLLMILCH 3,8%            1,29 B
KIRSCHTOMATEN 250G            1,99 B
BANANEN
   0,642 kg x 1,79 EUR/kg     1,15 B
GURKE                         1,58 B
   2 Stk x 0,79
EIER 10 ST                    2,19 B
PFAND 0,25 EUR                0,25 A
-----------------------------------
SUMME                    EUR  8,45
Geg. Mastercard               8,45
Datum: 12.03.2026  Uhrzeit: 17:45
Vielen Dank für Ihren Einkauf!`;

const lidl = `Lidl Vertriebs GmbH
Beispielweg 3
Milbona H-Milch 1,5% 1L     1,15 A
Gurke                       0,79 A
Joghurt Natur 500g          0,99 B
  Lidl Plus Rabatt         -0,20
Kartoffeln festkochend 2,5kg   3,49 B
Leergutbon                 -0,25
zu zahlen                   5,92
Datum 05.03.26`;

test('REWE-Bon: Zeilen, Gewicht, Stückzahl, Größe im Namen; Pfand wird nicht als Artikel gelesen', () => {
  const r = parseReceipt(rewe);
  assert.deepEqual(r.items.map(item => item.name), ['Bio Vollmilch 3,8%', 'Kirschtomaten', 'Bananen', 'Gurke', 'Eier']);
  const byName = name => r.items.find(item => item.name === name);
  assert.deepEqual(byName('Bio Vollmilch 3,8%').quote, { cents: 129, quantity: 1, unit: 'Position' }, 'keine Menge auf dem Bon: unbekannt, nicht „1 Stück“');
  assert.deepEqual(byName('Kirschtomaten').quote, { cents: 199, quantity: 250, unit: 'g' });
  assert.deepEqual(byName('Bananen').quote, { cents: 179, quantity: 1, unit: 'kg' }, 'Gewichtsware: Preis je kg');
  assert.deepEqual(byName('Gurke').quote, { cents: 79, quantity: 1, unit: 'Stück' });
  assert.equal(byName('Gurke').count, 2);
  assert.deepEqual(byName('Eier').quote, { cents: 219, quantity: 10, unit: 'Stück' });
  assert.equal(r.total, 845);
  assert.equal(r.sum, 845, 'Summe der Zeilen (mit Pfand) stimmt mit dem Bon überein');
  assert.equal(r.date, '2026-03-12');
  assert.equal(r.chain, 'rewe');
  assert.ok(r.skipped.some(entry => entry.why === 'Pfand'));
});

test('Lidl-Bon: Rabatt macht eine Aktion, der Normalpreis bleibt erhalten; Leergutbon und Summe', () => {
  const r = parseReceipt(lidl);
  const joghurt = r.items.find(item => item.name === 'Joghurt Natur');
  assert.equal(joghurt.onSale, true);
  assert.deepEqual(joghurt.regularQuote, { cents: 99, quantity: 500, unit: 'g' });
  assert.deepEqual(joghurt.quote, { cents: 79, quantity: 500, unit: 'g' });
  assert.deepEqual(r.items.find(item => item.name === 'Milbona H-Milch 1,5%').quote, { cents: 115, quantity: 1, unit: 'l' });
  assert.deepEqual(r.items.find(item => item.name === 'Kartoffeln Festkochend' || item.name === 'Kartoffeln festkochend').quote, { cents: 349, quantity: 2.5, unit: 'kg' });
  assert.equal(r.total, 592);
  assert.equal(r.sum, 115 + 79 + 99 - 20 + 349 - 25);
  assert.equal(r.chain, 'lidl');
  assert.equal(r.date, '2026-03-05');
});

test('Gewicht und Betrag in derselben Zeile, Betrag in der Folgezeile, Zahlungszeilen nach der Summe werden ignoriert', () => {
  const r = parseReceipt(`EDEKA Beispiel
Hähnchenbrust
 0,512 kg x 9,99 EUR/kg  5,12 A
Bio Butter 250g
2,29 B
Möhren 1kg   1,49 B
Summe 8,90
Bar 10,00
Rückgeld 1,10`);
  assert.deepEqual(r.items.map(item => [item.name, item.quote.cents, item.quote.unit]), [['Hähnchenbrust', 999, 'kg'], ['Bio Butter', 229, 'g'], ['Möhren', 149, 'kg']]);
  assert.equal(r.sum, 890);
  assert.equal(r.total, 890);
});

test('Weicht die Summe ab, fällt das auf (nicht erkannte Zeile)', () => {
  const r = parseReceipt('Milch 1,00 A\nBrot 2,00 A\nSUMME 3,50');
  assert.notEqual(r.sum, r.total);
});

test('Ein Rabatt auf den ganzen Einkauf wird keinem Artikel zugeschlagen', () => {
  const r = parseReceipt('Käse 2,00 A\nGutschein -5,00\nSUMME -3,00');
  assert.equal(r.items[0].onSale, false);
  assert.equal(r.skipped.some(entry => /keiner Position eindeutig zugeordnet/.test(entry.why)), true);
});

test('Positive Zeilen mit Wörtern wie „Plus“ oder „Aktion“ im Namen sind normale Artikel', () => {
  const r = parseReceipt('Vitamin Plus Saft 1L 1,99 A\nAktion Pizza 2,49 B\nSUMME 4,48');
  assert.deepEqual(r.items.map(item => item.name), ['Vitamin Plus Saft', 'Aktion Pizza']);
  assert.ok(r.items.every(item => !item.onSale));
});

test('Packungsgrößen, Mehrfachpackungen und Schreibweise', () => {
  assert.deepEqual(parseSize('Cola 6x1,5L'), { quantity: 9, unit: 'L'.toLowerCase(), rest: 'Cola' });
  assert.deepEqual(parseSize('Sahne 200ml'), { quantity: 200, unit: 'ml', rest: 'Sahne' });
  assert.deepEqual(parseSize('Bier 33cl'), { quantity: 330, unit: 'ml', rest: 'Bier' });
  assert.deepEqual(parseSize('Eier 10 St.'), { quantity: 10, unit: 'Stück', rest: 'Eier' });
  assert.equal(parseSize('Gurke'), null);
  assert.equal(tidyName('BIO VOLLMILCH 3,8%'), 'Bio Vollmilch 3,8%');
  assert.equal(tidyName('Bio Vollmilch'), 'Bio Vollmilch');
});

test('Zuordnungsschlüssel ignoriert Größen und Prozent, nicht den Namen', () => {
  assert.equal(aliasKey('TOM CHERRY 250G'), 'tom cherry');
  assert.equal(aliasKey('TOM CHERRY 500 g'), 'tom cherry');
  assert.equal(aliasKey('Bio Vollmilch 3,8% 1L'), 'bio vollmilch');
  assert.notEqual(aliasKey('Hafermilch'), aliasKey('Vollmilch'));
});

test('Geschäft zum Namen auf dem Bon', () => {
  const stores = [{ id: 's1', name: 'Edeka', deletedAt: null }, { id: 's2', name: 'REWE Center', deletedAt: null }, { id: 's3', name: 'Lidl', deletedAt: '2027-01-01T00:00:00.000Z' }];
  assert.equal(storeForChain('rewe', stores), 's2');
  assert.equal(storeForChain('lidl', stores), '', 'gelöschtes Geschäft wird nicht vorgeschlagen');
  assert.equal(storeForChain(null, stores), '');
});

test('Aus einem PDF kopierter Text: Tabulatoren, „EUR“ hinter dem Preis, Steuerkennzeichen mit Stern', () => {
  const r = parseReceipt('ALDI SÜD\nBROT 500G\t1,19 EUR A\nMILCH 1L\t0,95 EUR B*\nBUTTER\t1,89\u00a0€ B\nSUMME\t4,03 EUR');
  assert.deepEqual(r.items.map(item => [item.name, item.quote.cents]), [['Brot', 119], ['Milch', 95], ['Butter', 189]]);
  assert.equal(r.sum, r.total);
  assert.equal(r.chain, 'aldi');
});

test('Ein Datum in der Zukunft wird nicht übernommen', () => {
  assert.equal(parseReceipt('Milch 1,00 A\nDatum 01.01.2099').date, null);
});

test('Leerer oder fremder Text liefert keine Positionen und keinen Absturz', () => {
  for (const text of ['', '   \n\n', 'Hallo Welt, das ist kein Kassenbon.', null, undefined]) {
    const r = parseReceipt(text);
    assert.deepEqual(r.items, []);
  }
});

test('Menge: ohne Stückzahl, Gewicht oder Packungsgröße bleibt sie unbekannt; ein Preis je kg bleibt ein Preis je kg', () => {
  const r = parseReceipt('EDEKA\nÄPFEL                    1,29 A\nBANANEN 3 Stk x 0,29    0,87 A\nTOMATEN 0,500 kg x 2,98 EUR/kg  1,49 A\nMEHL 1KG                1,09 A\nSUMME 4,74');
  const by = name => r.items.find(item => item.name === name);
  assert.deepEqual(by('Äpfel').quote, { cents: 129, quantity: 1, unit: 'Position' });
  assert.match(by('Äpfel').checks.join(' '), /Menge und Einheit stehen nicht auf dem Bon/);
  assert.deepEqual(by('Bananen').quote, { cents: 29, quantity: 1, unit: 'Stück' }, 'Stückzahl steht auf dem Bon');
  assert.deepEqual(by('Tomaten').quote, { cents: 298, quantity: 1, unit: 'kg' }, 'Gewichtsware bleibt „je kg“, nie ein Stückpreis');
  assert.deepEqual(by('Mehl').quote, { cents: 109, quantity: 1, unit: 'kg' });
  assert.deepEqual(by('Mehl').checks, []);
});

test('Rabatt: nur direkt unter einer Zeile und ohne Hinweis auf Coupon, Gutschein oder Punkte wird eingerechnet und zur Kontrolle gemeldet', () => {
  const r = parseReceipt('REWE\nJOGHURT 500G          0,99 B\nRabatt          -0,20\nKÄSE 200G            2,49 B\nCOUPON Wochenend   -0,50\nPAYBACK Punkte   -0,30\nSUMME 2,48');
  const joghurt = r.items.find(item => item.name === 'Joghurt'), kaese = r.items.find(item => item.name === 'Käse');
  assert.equal(joghurt.onSale, true);
  assert.equal(joghurt.discountCents, 20);
  assert.match(joghurt.checks.join(' '), /Rabatt von 0,20 € direkt unter der Zeile eingerechnet/);
  assert.equal(kaese.onSale, false, 'ein Coupon gehört nicht eindeutig zu dieser Zeile');
  assert.equal(kaese.discountCents, 0);
  assert.equal(r.skipped.filter(entry => /keiner Position eindeutig zugeordnet/.test(entry.why)).length, 2, 'Coupon und Punkte stehen zur Prüfung in der Liste');
});

test('Pfand und Leergut sind keine Artikel und beeinflussen keinen Artikelpreis', () => {
  const r = parseReceipt('LIDL\nCOLA 1,5L             1,19 A\nPFAND 0,25 EUR          0,25 A\nSUMME 1,44');
  assert.deepEqual(r.items.map(item => [item.name, item.quote.cents]), [['Cola', 119]]);
  assert.ok(r.skipped.some(entry => entry.why === 'Pfand'));
  assert.equal(r.sum, 144);
});

