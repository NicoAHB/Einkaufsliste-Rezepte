import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { contentsRequest, contentsUrl, decodeFile, encodeFile } from '../github.js';
import { LIMIT_BYTES } from '../compact.js';
import { emptyData } from '../data.js';

const config = { owner: 'eure küche', repo: 'daten', branch: 'main', path: 'familie/daten.json', token: 'geheim' };
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('GitHub: Adresse, Kodierung mit Umlauten und Größenprüfung', () => {
  assert.equal(contentsUrl(config), 'https://api.github.com/repos/eure%20k%C3%BCche/daten/contents/familie/daten.json');
  const data = { ...emptyData(), stores: [{ id: 's', name: 'Bäckerei Müßig', createdAt: '2026-11-03T10:00:00.000Z', updatedAt: '2026-11-03T10:00:00.000Z', deletedAt: null }] };
  const file = { encoding: 'base64', content: encodeFile(data).replace(/(.{60})/g, '$1\n') };
  assert.deepEqual(decodeFile(file), data);
  assert.throws(() => decodeFile({ encoding: 'none', content: '' }), /kleine JSON-Datei/);
  assert.throws(() => decodeFile({ encoding: 'base64', content: btoa('{"version":2}') }), /nicht lesbar/);
  assert.throws(() => encodeFile({ ...emptyData(), names: [{ name: 'x'.repeat(LIMIT_BYTES), count: 1, at: '2026-11-03' }] }), /größer als 900 KB/);
});

test('GitHub: Anfragen, unverändert (304) und verständliche Fehler', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push([url, options]); return new Response(JSON.stringify({ sha: 'abc', content: '' }), { status: 200, headers: { ETag: '"e1"' } }); };
  const file = await contentsRequest(config, 'GET', undefined, '"e0"');
  assert.equal(file.etag, '"e1"');
  assert.equal(calls[0][0], `${contentsUrl(config)}?ref=main`);
  assert.equal(calls[0][1].headers.Authorization, 'Bearer geheim');
  assert.equal(calls[0][1].headers['If-None-Match'], '"e0"');
  await contentsRequest(config, 'PUT', { message: 'm', content: 'x', sha: 'abc', branch: 'main' });
  assert.equal(calls[1][0], contentsUrl(config));
  assert.equal(JSON.parse(calls[1][1].body).sha, 'abc');
  globalThis.fetch = async () => new Response(null, { status: 304 });
  assert.equal(await contentsRequest(config, 'GET', undefined, '"e1"'), null);
  for (const [status, pattern] of [[401, /Token ist ungültig/], [404, /findet Repository/], [429, /Zu viele Anfragen/], [500, /Fehler 500/]]) {
    globalThis.fetch = async () => new Response('{}', { status });
    await assert.rejects(contentsRequest(config, 'GET'), error => pattern.test(error.message) && error.status === status);
  }
  globalThis.fetch = async () => new Response('{}', { status: 403, headers: { 'Retry-After': '120' } });
  await assert.rejects(contentsRequest(config, 'GET'), error => error.status === 403 && error.retryAt >= Date.now() + 110000);
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(contentsRequest(config, 'GET'), /Keine Verbindung zu GitHub/);
});
