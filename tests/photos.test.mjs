import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { validPhotoId } from '../data.js';
import { isJpeg, photoPath, queuePhoto, queued, toBase64, unqueuePhoto } from '../photos.js';

const memory = new Map();
beforeEach(() => {
  memory.clear();
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)) };
});
const id = '0f8fad5b-d9cb-469f-a165-70867728950e';

test('Foto-Kennungen sind harmlos und werden Teil eines Dateipfads', () => {
  assert.ok(validPhotoId(id));
  for (const bad of ['', 'kurz', '../x', 'a/b/c/d/e/f/g/h', `${id}.jpg`, 'a b c d e f g h', null, 5, 'x'.repeat(65)]) assert.equal(validPhotoId(bad), false, String(bad));
  assert.equal(photoPath('daten.json', id), `photos/${id}.jpg`);
  assert.equal(photoPath('familie/daten.json', id), `familie/photos/${id}.jpg`);
  assert.throws(() => photoPath('daten.json', '../../geheim'), /Foto-Kennung/);
});

test('Nur echte JPEG-Dateien werden akzeptiert', () => {
  assert.ok(isJpeg(Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, 0)));
  assert.equal(isJpeg(Uint8Array.of(0x89, 0x50, 0x4e, 0x47)), false);
  assert.equal(isJpeg(new TextEncoder().encode('{"message":"Not Found"}')), false);
  assert.equal(isJpeg(new Uint8Array(0)), false);
});

test('Base64 auch für große Dateien (ohne Stapelüberlauf)', () => {
  const bytes = new Uint8Array(300_000).map((_, index) => index % 251);
  assert.equal(Buffer.from(toBase64(bytes), 'base64').equals(Buffer.from(bytes)), true);
  assert.equal(toBase64(new TextEncoder().encode('Hallo')), 'SGFsbG8=');
});

test('Upload-Warteschlange: ohne Doppelte, ohne Müll, übersteht kaputten Speicher', () => {
  assert.deepEqual(queued('k'), []);
  queuePhoto('k', id); queuePhoto('k', id);
  assert.deepEqual(queued('k'), [id]);
  memory.set('k', JSON.stringify([id, '../x', 5]));
  assert.deepEqual(queued('k'), [id]);
  unqueuePhoto('k', id);
  assert.deepEqual(queued('k'), []);
  memory.set('k', '{kaputt');
  assert.deepEqual(queued('k'), []);
  memory.set('k', '{"a":1}');
  assert.deepEqual(queued('k'), []);
});
