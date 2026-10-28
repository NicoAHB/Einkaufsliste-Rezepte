import assert from 'node:assert/strict';
import { test } from 'node:test';
import { displayText, jpegInfo, makePdf, textWidth, winAnsi } from '../pdf.js';

// Ein winziges JPEG (16 x 12, RGB) für die Fotoprüfung
const TINY = Uint8Array.from(Buffer.from('/9j/4AAQSkZJRgABAQAAAAAAAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAMABADASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAMF/8QAGRAAAQUAAAAAAAAAAAAAAAAAAAISFFFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAP/xAAYEQACAwAAAAAAAAAAAAAAAAAAAQITFP/aAAwDAQACEQMRAD8AnJ0SdM16rD1WMsSl7P/Z', 'base64'));
const text = bytes => Buffer.from(bytes).toString('latin1');
const A4 = { width: 595.28, height: 841.89 };
const page = items => ({ ...A4, items });
// Das Kreuzverzeichnis der Datei lesen: jeder Eintrag muss auf „N 0 obj“ zeigen
function objects(pdf) {
  const body = text(pdf), start = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(body)[1]);
  assert.ok(body.startsWith('xref', start), 'startxref zeigt auf die Tabelle');
  const [, count] = /^xref\n0 (\d+)\n/.exec(body.slice(start));
  const lines = body.slice(start).split('\n').slice(2, 2 + Number(count));
  assert.equal(lines[0], '0000000000 65535 f ');
  lines.slice(1).forEach((line, index) => {
    assert.match(line, /^\d{10} 00000 n $/);
    assert.ok(body.startsWith(`${index + 1} 0 obj`, Number(line.slice(0, 10))), `Eintrag ${index + 1} zeigt auf sein Objekt`);
  });
  return { body, count: Number(count) };
}

test('WinAnsi: Umlaute, ß, € und typografische Zeichen bleiben erhalten; Emoji fallen weg; Unbekanntes wird ersetzt', () => {
  assert.deepEqual(winAnsi('ÄÖÜäöüß'), [0xc4, 0xd6, 0xdc, 0xe4, 0xf6, 0xfc, 0xdf]);
  assert.deepEqual(winAnsi('€ „“ – • … ½ °'), [0x80, 0x20, 0x84, 0x93, 0x20, 0x96, 0x20, 0x95, 0x20, 0x85, 0x20, 0xbd, 0x20, 0xb0]);
  assert.equal(displayText('1½ EL „Öl“ – frisch… €'), '1½ EL „Öl“ – frisch… €');
  assert.equal(displayText('Pizza 🍕 fertig'), 'Pizza  fertig', 'Emoji fallen weg');
  assert.equal(displayText('Brot ✓'), 'Brot ?', 'Unbekanntes wird zu ?');
  assert.equal(displayText('Łódź'), '?ódz', 'Akzente fallen weg, was keinen Grundbuchstaben hat, wird ?');
  assert.equal(displayText('1⅓ Tassen'), '11/3 Tassen', 'Brüche ohne eigenes Zeichen werden ausgeschrieben');
  assert.equal(displayText('a−b → c\tx\ny'), 'a-b -> c x y');
  assert.equal(displayText('so­ft​'), 'soft', 'weiche Trennstriche und Nullbreiten-Zeichen fallen weg');
  assert.deepEqual(winAnsi(''), []);
  assert.deepEqual(winAnsi(null), []);
});

test('Textbreite: Werte der Standardschriften (Tausendstel der Größe), Zeichenabstand, Umsetzung vor dem Messen', () => {
  assert.equal(Math.round(textWidth('Spiegeleierkuchen', 'serifBold', 30) * 100) / 100, 233.34);
  assert.equal(textWidth('a', 'sans', 10), 5.56);
  assert.equal(textWidth('W', 'serifBold', 10), 10);
  assert.equal(textWidth('ab', 'sans', 10, 2), 5.56 + 5.56 + 2, 'der Abstand steht zwischen den Zeichen');
  assert.equal(textWidth('', 'sans', 10, 3), 0);
  assert.equal(textWidth('😀a', 'sans', 10), textWidth('a', 'sans', 10), 'Weggelassenes zählt nicht');
  assert.ok(textWidth('Hello', 'sansBold', 12) > textWidth('Hello', 'sans', 12), 'fett ist breiter');
});

test('JPEG: Breite, Höhe und Kanäle aus dem Kopf; kein JPEG oder abgeschnitten ergibt null', () => {
  assert.deepEqual(jpegInfo(TINY), { width: 16, height: 12, components: 3 });
  assert.equal(jpegInfo(Uint8Array.of(0x89, 0x50, 0x4e, 0x47)), null);
  assert.equal(jpegInfo(TINY.slice(0, 30)), null);
  assert.equal(jpegInfo(null), null);
  assert.equal(jpegInfo(new Uint8Array(0)), null);
});

test('PDF: gültiger Aufbau mit Kreuzverzeichnis, Seitenzahl, Schriften, Infofeld; Text als Hex in WinAnsi', () => {
  const pdf = makePdf([page([{ type: 'text', x: 50, y: 100, text: 'Äpfel & Öl', font: 'sans', size: 12, color: '#112233' }]), page([])], { title: 'Äpfel (Rezept)', created: new Date(Date.UTC(2026, 9, 28, 12, 30, 5)) });
  const { body, count } = objects(pdf);
  assert.ok(body.startsWith('%PDF-1.4\n'));
  assert.ok(body.endsWith('%%EOF\n'));
  assert.match(body, /\/Type \/Pages \/Count 2 /);
  assert.equal((body.match(/\/Type \/Page /g) || []).length, 2);
  for (const name of ['Helvetica', 'Helvetica-Bold', 'Times-Roman', 'Times-Bold']) assert.ok(body.includes(`/BaseFont /${name} /Encoding /WinAnsiEncoding`), name);
  assert.ok(body.includes('/MediaBox [0 0 595.28 841.89]'));
  assert.ok(body.includes('<c47066656c202620d66c>'), 'der Text steht als WinAnsi-Hex im Inhalt');
  assert.match(body, /\/Title <FEFF00c4/i, 'Titel mit Umlaut als UTF-16');
  assert.ok(body.includes('/CreationDate (D:20261028123005Z)'));
  assert.ok(count >= 10);
  assert.ok(body.includes('0.067 0.133 0.2 rg'), 'Farbe #112233');
});

test('PDF: Koordinaten werden in die PDF-Richtung (y nach oben) umgerechnet; Drehung, Transparenz und Rundung kommen vor', () => {
  const pdf = makePdf([page([
    { type: 'rect', x: 10, y: 20, w: 100, h: 50, r: 8, fill: '#000000', alpha: 0.25, rotate: { deg: 3, cx: 60, cy: 45 } },
    { type: 'line', x1: 0, y1: 100, x2: 200, y2: 100, color: '#cccccc', width: 0.6 },
    { type: 'rect', x: 1, y: 2, w: 3, h: 4, fill: '#ffffff', stroke: '#000000' }
  ])]);
  const body = text(pdf);
  assert.match(body, /0 741\.89 m 200 741\.89 l S/, 'y = Höhe - y');
  assert.match(body, /\/GS1 gs/);
  assert.match(body, /\/ExtGState << \/GS1 \d+ 0 R >>/);
  assert.match(body, /\/ca 0\.25 \/CA 0\.25/);
  assert.match(body, / c\n/, 'abgerundete Ecken als Kurven');
  assert.match(body, /1 0 0 1 60 796\.89 cm/, 'Drehpunkt in PDF-Richtung');
  objects(pdf);
});

test('PDF: ein Foto kommt unverändert als JPEG hinein, zugeschnitten auf das Feld; das Foto zählt nur einmal', () => {
  const photo = { bytes: TINY, ...jpegInfo(TINY) };
  const pdf = makePdf([page([{ type: 'image', x: 50, y: 50, w: 100, h: 100, photo }, { type: 'image', x: 200, y: 50, w: 40, h: 30, photo }]), page([{ type: 'image', x: 50, y: 50, w: 100, h: 100, photo }])]);
  const body = text(pdf);
  assert.equal((body.match(/\/Subtype \/Image/g) || []).length, 1, 'ein Bildobjekt');
  assert.match(body, /\/Width 16 \/Height 12 \/ColorSpace \/DeviceRGB \/BitsPerComponent 8 \/Filter \/DCTDecode \/Length 306/);
  assert.ok(Buffer.from(pdf).includes(Buffer.from(TINY)), 'die JPEG-Bytes stehen unverändert in der Datei');
  assert.match(body, /W n\n/, 'Zuschnitt auf das Feld');
  // 16 x 12 in ein quadratisches Feld von 100: Höhe füllt (100), Breite wird 133.333 und seitlich abgeschnitten
  assert.match(body, /133\.333 0 0 100 33\.333 /);
  objects(pdf);
});

test('PDF: Ausrichtung zentriert und rechtsbündig, Zeichenabstand; leerer Text erzeugt nichts', () => {
  const pdf = makePdf([page([
    { type: 'text', x: 300, y: 50, text: 'Mitte', font: 'sansBold', size: 10, color: '#000000', align: 'center' },
    { type: 'text', x: 500, y: 60, text: 'Rechts', font: 'sans', size: 10, color: '#000000', align: 'right', charSpace: 2 },
    { type: 'text', x: 10, y: 70, text: '😀', font: 'sans', size: 10, color: '#000000' }
  ])]);
  const body = text(pdf);
  const middle = (300 - textWidth('Mitte', 'sansBold', 10) / 2), right = 500 - textWidth('Rechts', 'sans', 10, 2);
  assert.ok(body.includes(`${Math.round(middle * 1000) / 1000} 791.89 Td`), 'zentriert');
  assert.ok(body.includes(`${Math.round(right * 1000) / 1000} 781.89 Td`), 'rechtsbündig');
  assert.ok(body.includes('2 Tc'));
  assert.equal((body.match(/ Tj\n/g) || []).length, 2, 'ein reines Emoji ergibt keinen Text');
});
