import assert from 'node:assert/strict';
import { test } from 'node:test';
import zlib from 'node:zlib';
import { crc32, dosStamp, makeZip, readZip } from '../zip.js';

const bytes = text => new TextEncoder().encode(text);

test('CRC-32 stimmt mit der Prüfsumme von Node überein (auch leer und groß)', () => {
  for (const data of [new Uint8Array(0), bytes('a'), bytes('123456789'), bytes('Käse & Äpfel'), Uint8Array.from({ length: 100000 }, (_, index) => (index * 31) & 255)]) assert.equal(crc32(data), zlib.crc32(data));
  assert.equal(crc32(bytes('123456789')), 0xcbf43926, 'der bekannte Prüfwert');
});

test('ZIP: Dateien, Ordner und Umlaute im Namen kommen unverändert wieder heraus', () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0, 1, 2, 3, 250, 251]);
  const zip = makeZip([{ name: 'daten.json', data: bytes('{"a":1}') }, { name: 'fotos/abc-123.jpg', data: jpeg }, { name: 'Küche/Äpfel.txt', data: bytes('') }], new Date(2027, 2, 1, 12, 30, 40));
  const back = readZip(zip);
  assert.deepEqual(back.map(file => file.name), ['daten.json', 'fotos/abc-123.jpg', 'Küche/Äpfel.txt']);
  assert.equal(new TextDecoder().decode(back[0].data), '{"a":1}');
  assert.deepEqual([...back[1].data], [...jpeg]);
  assert.equal(back[2].data.length, 0);
});

test('ZIP: Aufbau nach Vorgabe (Kopf, UTF-8-Kennzeichen, unkomprimiert, Verzeichnis am Ende, Zeitstempel)', () => {
  const zip = makeZip([{ name: 'a.txt', data: bytes('hallo') }], new Date(2027, 2, 1, 12, 30, 40)), view = new DataView(zip.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50, 'lokaler Kopf');
  assert.equal(view.getUint16(6, true) & 0x0800, 0x0800, 'UTF-8-Namen');
  assert.equal(view.getUint16(8, true), 0, 'nicht komprimiert');
  assert.equal(view.getUint32(18, true), 5); assert.equal(view.getUint32(22, true), 5);
  const stamp = dosStamp(new Date(2027, 2, 1, 12, 30, 40));
  assert.deepEqual([view.getUint16(10, true), view.getUint16(12, true)], [stamp.time, stamp.date]);
  assert.equal(stamp.date, ((2027 - 1980) << 9) | (3 << 5) | 1); assert.equal(stamp.time, (12 << 11) | (30 << 5) | 20);
  const end = zip.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50); assert.equal(view.getUint16(end + 10, true), 1);
  assert.equal(view.getUint32(end + 16, true) + view.getUint32(end + 12, true), end, 'Verzeichnis liegt direkt vor dem Ende');
  assert.equal(dosStamp(new Date(1970, 0, 1)).date >> 9, 0, 'vor 1980 gibt es nichts: es wird 1980');
});

test('ZIP: leeres Archiv, beschädigte Prüfsumme wird erkannt, ungültige und doppelte Namen werden abgelehnt', () => {
  assert.deepEqual(readZip(makeZip([])), []);
  const zip = makeZip([{ name: 'x.txt', data: bytes('inhalt') }]);
  zip[30 + 'x.txt'.length] ^= 1;   // ein Byte des Inhalts kippen
  assert.throws(() => readZip(zip), /Prüfsumme/);
  assert.throws(() => readZip(bytes('kein zip')), /Keine ZIP/);
  for (const name of ['', '/abs.txt', '../raus.txt', 'a/../b.txt', 'a\\b.txt']) assert.throws(() => makeZip([{ name, data: bytes('x') }]), /Ungültiger Dateiname/, name);
  assert.throws(() => makeZip([{ name: 'a', data: bytes('1') }, { name: 'a', data: bytes('2') }]), /Doppelter/);
});

test('ZIP: 1000 Dateien mit zufälligem Inhalt kommen vollständig und in Reihenfolge zurück', () => {
  const files = Array.from({ length: 1000 }, (_, index) => ({ name: `fotos/${index}.jpg`, data: Uint8Array.from({ length: index % 97 }, (_, at) => (index * 7 + at) & 255) }));
  const back = readZip(makeZip(files));
  assert.equal(back.length, 1000);
  back.forEach((file, index) => { assert.equal(file.name, files[index].name); assert.deepEqual([...file.data], [...files[index].data]); });
});
