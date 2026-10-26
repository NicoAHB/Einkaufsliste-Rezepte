import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import worker from '../worker/recipe-proxy.js';
import { fetchRecipePage, importRoutes, workerHost } from '../page-source.js';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const page = `<html><head><title>Rezept</title></head><body>${'Zutaten '.repeat(40)}</body></html>`;
const htmlResponse = (body = page, type = 'text/html; charset=utf-8') => new Response(body, { headers: { 'Content-Type': type } });

test('Hilfsdienst-Adresse muss ein eigener workers.dev-Link sein', () => {
  assert.equal(workerHost('https://rezepte.meinname.workers.dev/'), 'https://rezepte.meinname.workers.dev');
  assert.equal(workerHost('http://rezepte.meinname.workers.dev'), '');
  assert.equal(workerHost('https://evil.example.com'), '');
  assert.equal(workerHost('https://user:pw@a.workers.dev'), '');
  assert.equal(workerHost(''), '');
});

test('Routen: ohne Erlaubnis und ohne eigenen Dienst gibt es keine', () => {
  assert.deepEqual(importRoutes('https://a.de/x', {}), []);
  const routes = importRoutes('https://a.de/x y', { workerUrl: 'https://r.n.workers.dev', allowPublic: true });
  assert.equal(routes[0].address, 'https://r.n.workers.dev/?url=https%3A%2F%2Fa.de%2Fx%20y');
  assert.ok(routes.length >= 2 && routes.slice(1).every(route => route.address.startsWith('https://api.')));
});

test('Ohne Hilfsdienst: verständlicher Fehler, kein Netzwerkzugriff', async () => {
  let calls = 0; globalThis.fetch = async () => { calls++; return htmlResponse(); };
  await assert.rejects(fetchRecipePage('https://a.de/x', {}), error => error.code === 'no-route' && /Hilfsdienst/.test(error.message));
  assert.equal(calls, 0);
  await assert.rejects(fetchRecipePage('kein link'), /vollständigen Link/);
  await assert.rejects(fetchRecipePage('javascript:alert(1)'), /vollständigen Link/);
});

test('Fallback: erst eigener Dienst, dann öffentlicher; http wird zu https', async () => {
  const urls = [];
  globalThis.fetch = async address => { urls.push(address); return urls.length === 1 ? new Response('nein', { status: 502 }) : htmlResponse(); };
  const result = await fetchRecipePage('http://a.de/rezept', { workerUrl: 'https://r.n.workers.dev', allowPublic: true });
  assert.equal(result.via, 'allorigins.win');
  assert.match(urls[0], /^https:\/\/r\.n\.workers\.dev\/\?url=https%3A%2F%2Fa\.de%2Frezept$/);
  globalThis.fetch = async () => htmlResponse('zu kurz');
  await assert.rejects(fetchRecipePage('https://a.de/', { allowPublic: true }), error => error.code === 'failed' && /Text/.test(error.message));
});

const call = (query, headers = { Origin: 'https://nicoahb.github.io' }, method = 'GET') => worker.fetch(new Request(`https://rezepte.n.workers.dev/${query}`, { method, headers }));

test('Worker: nur eigene App, nur öffentliche https-Adressen', async () => {
  globalThis.fetch = async () => htmlResponse();
  assert.equal((await call('?url=https://a.de/x', {})).status, 403);
  assert.equal((await call('?url=https://a.de/x', { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await call('?url=http://a.de/x')).status, 400);
  assert.equal((await call('?url=https://127.0.0.1/x')).status, 400);
  assert.equal((await call('?url=https://localhost/x')).status, 400);
  assert.equal((await call('?url=https://[::1]/x')).status, 400);
  assert.equal((await call('?url=https://intranet/x')).status, 400);
  assert.equal((await call('?url=https://a.de:8443/x')).status, 400);
  assert.equal((await call('?url=https://user:pw@a.de/x')).status, 400);
  assert.equal((await call('')).status, 400);
  assert.equal((await call('?url=https://a.de/x', undefined, 'POST')).status, 405);
  const preflight = await call('?url=https://a.de/x', undefined, 'OPTIONS');
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'https://nicoahb.github.io');
});

test('Worker: liefert die Seite mit CORS-Header, erkennt Zeichensatz und begrenzt die Größe', async () => {
  let seen;
  globalThis.fetch = async (address, init) => { seen = { address, init }; return htmlResponse(); };
  const ok = await call('?url=https://www.chefkoch.de/rezepte/1');
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), 'https://nicoahb.github.io');
  assert.match(await ok.text(), /Zutaten/);
  assert.equal(seen.address, 'https://www.chefkoch.de/rezepte/1');
  assert.match(seen.init.headers['User-Agent'], /Mozilla/);

  const latin = Uint8Array.from([...'<html><meta charset="iso-8859-1"><body>'].map(c => c.charCodeAt(0)).concat([0xe4, 0xf6, 0xfc]));
  globalThis.fetch = async () => htmlResponse(latin, 'text/html');
  assert.match(await (await call('?url=https://a.de/x')).text(), /äöü/);

  globalThis.fetch = async () => htmlResponse('x'.repeat(5_000_000));
  assert.equal((await (await call('?url=https://a.de/x')).text()).length, 2_500_000);

  globalThis.fetch = async () => htmlResponse('{}', 'application/json');
  assert.equal((await call('?url=https://a.de/x')).status, 415);
  globalThis.fetch = async () => new Response('Fehler', { status: 404 });
  assert.equal((await call('?url=https://a.de/x')).status, 502);
  globalThis.fetch = async () => { throw new Error('Zeitüberschreitung'); };
  assert.equal((await call('?url=https://a.de/x')).status, 504);
});
