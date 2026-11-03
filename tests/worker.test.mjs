import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import worker, { publicTarget } from '../worker/recipe-proxy.js';

const APP = 'https://nicoahb.github.io', realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const ask = (url, env, origin = APP) => worker.fetch(new Request(`https://r.test.workers.dev/?${url}`, { headers: { Origin: origin } }), env);
const page = (body = '<html><body>Rezept</body></html>') => new Response(body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
const redirect = location => new Response(null, { status: 302, headers: { Location: location } });

test('Hilfsdienst: nur öffentliche https-Ziele', () => {
  for (const ok of ['https://www.chefkoch.de/rezepte/1', 'https://rezepte.lidl.de/x']) assert.equal(publicTarget(new URL(ok)), true, ok);
  for (const bad of ['http://www.chefkoch.de/', 'https://127.0.0.1/', 'https://localhost/', 'https://[::1]/', 'https://intranet/', 'https://a.local/', 'https://u:p@a.de/', 'https://a.de:8443/'])
    assert.equal(publicTarget(new URL(bad)), false, bad);
});

test('Hilfsdienst: Weiterleitungen werden einzeln geprüft', async () => {
  const seen = [];
  globalThis.fetch = async (href, options) => { seen.push([href, options.redirect]); return href.endsWith('/start') ? redirect('/ziel') : page(); };
  const ok = await ask(`url=${encodeURIComponent('https://www.chefkoch.de/start')}`);
  assert.equal(ok.status, 200); assert.match(await ok.text(), /Rezept/);
  assert.deepEqual(seen, [['https://www.chefkoch.de/start', 'manual'], ['https://www.chefkoch.de/ziel', 'manual']]);
  for (const target of ['http://www.chefkoch.de/', 'https://127.0.0.1/admin', 'https://localhost/']) {
    globalThis.fetch = async href => href === 'https://www.chefkoch.de/start' ? redirect(target) : assert.fail(`darf nicht abgerufen werden: ${href}`);
    const blocked = await ask(`url=${encodeURIComponent('https://www.chefkoch.de/start')}`);
    assert.equal(blocked.status, 400, target);
  }
  globalThis.fetch = async href => redirect(`${href}x`);
  assert.equal((await ask(`url=${encodeURIComponent('https://www.chefkoch.de/a')}`)).status, 508);
});

test('Hilfsdienst: optionaler Schlüssel und fremde Herkunft', async () => {
  globalThis.fetch = async () => page();
  const url = `url=${encodeURIComponent('https://www.chefkoch.de/1')}`;
  assert.equal((await ask(url, { ACCESS_KEY: 'geheim' })).status, 403);
  assert.equal((await ask(`key=falsch&${url}`, { ACCESS_KEY: 'geheim' })).status, 403);
  assert.equal((await ask(`key=geheim&${url}`, { ACCESS_KEY: 'geheim' })).status, 200);
  assert.equal((await ask(url, {})).status, 200, 'ohne eingerichteten Schlüssel wie bisher');
  assert.equal((await ask(url, {}, 'https://fremd.example')).status, 403);
});
