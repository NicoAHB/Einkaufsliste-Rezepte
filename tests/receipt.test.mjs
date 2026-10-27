import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aliasKey, parseReceipt, parseSize, storeForChain, suggestName, tidyName } from '../receipt.js';

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
  assert.deepEqual(byName('Bio Vollmilch 3,8%').quote, { cents: 129, quantity: 1, unit: 'Stück' });
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
  assert.equal(r.skipped.some(entry => /ganzen Einkauf/.test(entry.why)), true);
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

test('Namensvorschlag: gemerkte Zuordnung, bekannter Name nur bei sicherem Treffer, sonst Bontext', () => {
  const known = ['Tomaten', 'Tomatenmark', 'Milch', 'Kartoffeln', 'Gurke'];
  const aliases = [{ from: 'milbona h milch', name: 'Milch' }, { from: 'tom cherry', name: 'Cherrytomaten', deletedAt: null }];
  assert.deepEqual(suggestName({ name: 'Milbona H-Milch 1,5%', text: '' }, aliases, known), { name: 'Milch', how: 'gemerkt', key: 'milbona h milch' });
  assert.equal(suggestName({ name: 'Tom Cherry', text: '' }, aliases, known).name, 'Cherrytomaten', 'was ihr einmal zugeordnet habt, gilt');
  assert.deepEqual(suggestName({ name: 'Tom', text: '' }, [], known), { name: 'Tomaten', how: 'Vorschlag', key: 'tom' }, 'Abkürzung allein wird zum bekannten Namen');
  assert.equal(suggestName({ name: 'Tomatenmark', text: '' }, [], known).name, 'Tomatenmark', 'genauer Name vor Abkürzung');
  assert.deepEqual(suggestName({ name: 'MILCH', text: '' }, [], known), { name: 'Milch', how: '', key: 'milch' }, 'nur anders geschrieben: nichts zu prüfen');
  assert.deepEqual(suggestName({ name: 'Gouda jung', text: '' }, [], known), { name: 'Gouda jung', how: '', key: 'gouda jung' });
  assert.equal(suggestName({ name: 'Tom Cherry', text: '' }, [{ from: 'tom cherry', name: 'Weg', deletedAt: '2027-01-01T00:00:00.000Z' }], known).name, 'Tom Cherry', 'gelöschte Zuordnung zählt nicht');
});

test('Namensvorschlag im Zweifel nicht: ein anderes Produkt bekommt nie den Preis eines bekannten (Apfeltasche ist nicht Apfel)', () => {
  const known = ['Apfel', 'Äpfel', 'Tomaten', 'Milch', 'Kartoffeln', 'Saure Sahne', 'Sahne'];
  const name = text => suggestName({ name: text, text: '' }, [], known);
  // Zusammengesetzte Wörter und zusätzliche Wörter sind andere Produkte
  for (const text of ['Apfeltasche', 'Apfel Saft', 'Apfelmus', 'Apfelstrudel', 'Hafermilch', 'Milchreis', 'Buttermilch', 'Bio Vollmilch', 'Kirschtomaten', 'Tom Cherry', 'Speisekartoffeln fest', 'Sahne Torte']) {
    assert.deepEqual(name(text), { name: text, how: '', key: name(text).key }, `${text} bleibt, wie es auf dem Bon steht`);
  }
  // Sicher dasselbe Produkt: gleiches Wort, Beigaben wie „Bio“, Größen, andere Schreibweise
  assert.equal(name('Bio Apfel').name, 'Apfel');
  assert.equal(name('Bio Äpfel 1kg').name, 'Äpfel');
  assert.equal(name('Saure Sahne 200g').name, 'Saure Sahne');
  assert.equal(name('SAHNE').name, 'Sahne');
  // „Apfel“ und „Äpfel“ werden nicht verwechselt oder geraten
  assert.equal(name('Apfel').name, 'Apfel');
  assert.equal(name('Äpfel').name, 'Äpfel');
  // ohne bekannte Namen bleibt der Bontext
  assert.equal(suggestName({ name: 'Apfeltasche', text: '' }, [], []).name, 'Apfeltasche');
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
