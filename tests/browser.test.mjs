/* Browserprüfung in mobilem Chromium. Benötigt Playwright (npm i -D playwright, einmalig `npx playwright install chromium`).
   Ohne Playwright werden die Tests übersprungen. Der GitHub-Server und Hilfsdienste werden simuliert; echte Konten sind nicht nötig. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

let playwright = null;
try { playwright = createRequire(import.meta.url)('playwright'); } catch { /* optional */ }
const root = path.resolve(import.meta.dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.gz': 'application/gzip', '.md': 'text/markdown' };
const demo = JSON.parse(await readFile(path.join(root, 'beispieldaten.json'), 'utf8'));

let server, base, browser;
before(async () => {
  if (!playwright) return;
  server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    let file = path.join(root, decodeURIComponent(url.pathname));
    if (url.pathname.endsWith('/')) file += 'index.html';
    if (!file.startsWith(root)) { response.writeHead(403).end(); return; }
    try { response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }).end(await readFile(file)); }
    catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await playwright.chromium.launch();
});
after(async () => { await browser?.close(); server?.close(); });

const recipeHtml = `<!doctype html><html><head><title>Spaghetti Carbonara | Chefkoch</title><script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Recipe', name: 'Spaghetti Carbonara', recipeYield: '4 Portionen', totalTime: 'PT30M',
  recipeIngredient: ['400 g Spaghetti', '150 g Schinkenspeck', '2 Ei(er)', 'Salz und Pfeffer'], recipeInstructions: 'Spaghetti kochen.\nSpeck ausbraten.\nAlles vermengen.' })}</script></head><body>${'x'.repeat(300)}</body></html>`;
const textRecipe = `Cremige Tomatensuppe

Zutaten für 4 Portionen:
800 g Tomaten
1 Zwiebel
2 EL Olivenöl
100 ml Sahne
Salz, Pfeffer

Zubereitung:
Zwiebel würfeln und in Öl glasig dünsten. Tomaten zugeben und 20 Minuten köcheln lassen.
Mit der Sahne verfeinern und pürieren.`;

async function context(options = {}) {
  const { devices } = playwright;
  const ctx = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', ...options.context });
  const settings = { actor: 'Nico', ...options.config };
  await ctx.addInitScript(([key, value, seed]) => { if (!localStorage.getItem(key) && seed) localStorage.setItem(key, JSON.stringify(value)); }, ['einkauf-settings-v1', settings, options.seed !== false]);
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', error => problems.push(error.message));
  page.on('console', message => { if (message.type() === 'error') problems.push(message.text()); });
  return { ctx, page, problems };
}
const open = async (page, query = '') => { await page.goto(`${base}/index.html${query}`); await page.waitForSelector('#status[data-state]'); await page.waitForFunction(() => document.querySelector('#items')); };
const horizontalOverflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const sheetOpen = page => page.waitForSelector('dialog[open]');

function github(initial) {
  let content = structuredClone(initial), sha = 'sha-1', etag = '"e-1"', version = 1;
  const photos = new Map(), stats = { gets: 0, puts: 0, notModified: 0, photoPuts: 0, photoGets: 0, photoLists: 0, photoDeletes: 0 }, behavior = { failPhotoPuts: false };
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,PUT,DELETE,OPTIONS', 'access-control-expose-headers': 'ETag' };
  return {
    stats, photos, behavior, get content() { return content; },
    async handler(route) {
      const request = route.request(), path = decodeURIComponent(new URL(request.url()).pathname.split('/contents/')[1] || '');
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (path === 'photos' && request.method() === 'GET') {
        stats.photoLists++;
        if (!photos.size) return route.fulfill({ status: 404, headers: cors, body: '{}' });
        return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' },
          body: JSON.stringify([...photos].map(([file, bytes]) => ({ type: 'file', name: file.split('/')[1], sha: `sha-${file}`, size: bytes.length }))) });
      }
      if (path.startsWith('photos/')) {
        if (request.method() === 'DELETE') {
          if (JSON.parse(request.postData()).sha !== `sha-${path}`) return route.fulfill({ status: 409, headers: cors, body: '{}' });
          stats.photoDeletes++; photos.delete(path);
          return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: '{}' });
        }
        if (request.method() === 'GET') {
          stats.photoGets++;
          return photos.has(path) ? route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/vnd.github.raw+json' }, body: photos.get(path) }) : route.fulfill({ status: 404, headers: cors, body: '{}' });
        }
        if (behavior.failPhotoPuts) return route.fulfill({ status: 500, headers: cors, body: '{}' });
        if (photos.has(path)) return route.fulfill({ status: 422, headers: cors, body: JSON.stringify({ message: 'Invalid request.\n\n"sha" wasn\'t supplied.' }) });
        stats.photoPuts++; photos.set(path, Buffer.from(JSON.parse(request.postData()).content, 'base64'));
        return route.fulfill({ status: 201, headers: { ...cors, 'content-type': 'application/json' }, body: '{}' });
      }
      if (request.method() === 'GET') {
        stats.gets++;
        if (request.headers()['if-none-match'] === etag) { stats.notModified++; return route.fulfill({ status: 304, headers: { ...cors, etag } }); }
        return route.fulfill({ status: 200, headers: { ...cors, etag, 'content-type': 'application/json' },
          body: JSON.stringify({ encoding: 'base64', sha, content: Buffer.from(JSON.stringify(content)).toString('base64') }) });
      }
      const body = JSON.parse(request.postData());
      if (body.sha !== sha) return route.fulfill({ status: 409, headers: cors, body: '{}' });
      stats.puts++; content = JSON.parse(Buffer.from(body.content, 'base64').toString()); version++; sha = `sha-${version}`; etag = `"e-${version}"`;
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ content: { sha } }) });
    },
    remoteChange(change) { change(content); content.updatedAt = new Date(Date.now() + 5000).toISOString(); version++; sha = `sha-${version}`; etag = `"e-${version}"`; }
  };
}
const connectedConfig = { owner: 'haushalt', repo: 'daten', branch: 'main', path: 'daten.json', token: 'test-token' };
const pollNow = page => page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

describe('Browser', { skip: !playwright && 'Playwright ist nicht installiert' }, () => {
  for (const [label, viewport] of [['iPhone 390 px', null], ['kleines Gerät 320 px', { width: 320, height: 568 }]]) {
    test(`Layout ohne seitlichen Überlauf, Eingaben mit mindestens 16 px, Leiste unten fixiert (${label})`, async () => {
      const { ctx, page, problems } = await context({ context: viewport ? { viewport } : {} });
      await open(page);
      const sizes = async () => page.evaluate(() => [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=file]),select,textarea')].map(node => parseFloat(getComputedStyle(node).fontSize)));
      for (const name of ['shopping', 'recipes', 'plan', 'settings']) {
        await page.click(`[data-tab=${name}]`);
        assert.equal(await horizontalOverflow(page), 0, `Überlauf im Bereich ${name}`);
        assert.ok((await sizes()).every(size => size >= 16), `Schrift unter 16 px im Bereich ${name}`);
        const bar = await page.locator('.tabs').boundingBox(), height = await page.evaluate(() => innerHeight);
        assert.ok(Math.abs(bar.y + bar.height - height) < 1, `Leiste sitzt nicht am unteren Rand (${bar.y + bar.height} statt ${height})`);
      }
      await page.click('[data-tab=shopping]');
      const fits = () => page.evaluate(() => { const dialog = document.querySelector('dialog[open]'); return document.documentElement.scrollWidth <= document.documentElement.clientWidth && dialog.scrollWidth <= dialog.clientWidth; });
      for (const [label, setup] of [['Geschäfte', () => page.click('#manage-stores')], ['Artikel', () => page.click('.item .icon-button')],
        ['Rezept', async () => { await page.click('[data-tab=recipes]'); await page.click('#add-recipe'); }],
        ['Import Link', async () => { await page.click('[data-tab=recipes]'); await page.click('#import-recipe'); }],
        ['Import Screenshot', async () => { await page.click('[data-tab=recipes]'); await page.click('#import-recipe'); await page.click('[data-source=image]'); }],
        ['Import Text', async () => { await page.click('[data-tab=recipes]'); await page.click('#import-recipe'); await page.click('[data-source=text]'); }],
        ['Gericht planen', async () => { await page.click('[data-tab=plan]'); await page.click('.day-head .icon-button'); }],
        ['Einkauf für die Woche', async () => { await page.click('[data-tab=plan]'); await page.click('.day-head .icon-button'); await page.selectOption('#meal-form select[name=recipeId]', { index: 1 }); await page.click('#meal-form button[type=submit]'); await page.click('#plan-shopping'); }]]) {
        await setup();
        await sheetOpen(page);
        assert.ok(await fits(), `Überlauf im Dialog ${label}`);
        await page.keyboard.press('Escape');
        await page.waitForSelector('dialog[open]', { state: 'detached' });
        await page.click('[data-tab=shopping]');
      }
      assert.deepEqual(problems, []);
      await ctx.close();
    });
  }

  test('Tastatur offen: Leiste weicht aus und kommt danach zurück', async () => {
    const { ctx, page } = await context();
    await ctx.addInitScript(() => {
      const fake = Object.assign(new EventTarget(), { height: innerHeight, scale: 1 });
      Object.defineProperty(window, 'visualViewport', { value: fake });
      window.__keyboard = open => { fake.height = open ? innerHeight - 320 : innerHeight; fake.dispatchEvent(new Event('resize')); };
    });
    await open(page);
    await page.focus('#item-form input[name=name]');
    await page.evaluate(() => window.__keyboard(true));
    await page.waitForFunction(() => document.body.classList.contains('typing'));
    await page.waitForTimeout(300);
    const hidden = await page.locator('.tabs').boundingBox(), height = await page.evaluate(() => innerHeight);
    assert.ok(hidden.y >= height - 1, 'Leiste muss unter dem sichtbaren Bereich liegen');
    await page.evaluate(() => window.__keyboard(false));
    await page.waitForFunction(() => !document.body.classList.contains('typing'));
    await page.waitForTimeout(250);
    const shown = await page.locator('.tabs').boundingBox();
    assert.ok(Math.abs(shown.y + shown.height - height) < 1);
    await ctx.close();
  });

  test('Rezept aus eingefügtem Text: Vorschlag prüfen, speichern, Zutaten auf die Liste', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('[data-tab=recipes]'); await page.click('#import-recipe');
    await page.click('[data-source=text]'); await page.fill('#import-form textarea[name=text]', textRecipe);
    await page.click('#import-run');
    await page.waitForSelector('#recipe-dialog[open]');
    assert.equal(await page.inputValue('#recipe-form input[name=name]'), 'Cremige Tomatensuppe');
    assert.equal(await page.inputValue('#recipe-form input[name=servings]'), '4');
    assert.equal(await page.locator('#ingredient-editor .ingredient-row').count(), 5);
    assert.match(await page.textContent('#recipe-import-note'), /geschätzt/);
    assert.ok(await page.isVisible('#recipe-raw'));
    await page.click('#recipe-form button[type=submit]');
    await page.waitForSelector('#recipe-dialog', { state: 'hidden' });
    const card = page.locator('.recipe-card', { hasText: 'Cremige Tomatensuppe' });
    await card.locator('summary').click();
    assert.match(await card.locator('.recipe-ingredients').textContent(), /800 g Tomaten[\s\S]*Salz, Pfeffer \(nach Bedarf\)/);
    await card.getByRole('button', { name: 'Auf die Liste' }).click();
    await sheetOpen(page);
    const checked = await page.locator('#transfer-ingredients input:checked').count();
    assert.equal(checked, 4, 'Salz und Pfeffer („nach Bedarf“) sollen nicht vorausgewählt sein');
    await page.fill('#transfer-form input[name=servings]', '8');
    assert.match(await page.textContent('#transfer-ingredients'), /1\.600 g Tomaten/);
    await page.click('#transfer-form button:not([data-close])');
    await page.waitForSelector('#transfer-dialog', { state: 'hidden' });
    assert.match(await page.textContent('#items'), /Tomaten[\s\S]*1\.600 g/);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Rezept aus Link über eigenen Hilfsdienst, mit Quelle', async () => {
    const { ctx, page, problems } = await context({ config: { importProxy: 'https://rezepte.test.workers.dev' } });
    const requests = [];
    await ctx.route('https://rezepte.test.workers.dev/**', route => { requests.push(route.request().url()); return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'text/html' }, body: recipeHtml }); });
    await open(page);
    await page.click('[data-tab=recipes]'); await page.click('#import-recipe');
    assert.match(await page.textContent('[data-link-hint]'), /eigenen Hilfsdienst/);
    await page.fill('#import-form input[name=url]', 'https://www.chefkoch.de/rezepte/1');
    await page.click('#import-run');
    await page.waitForSelector('#recipe-dialog[open]');
    assert.equal(await page.inputValue('#recipe-form input[name=name]'), 'Spaghetti Carbonara');
    assert.equal(await page.inputValue('#recipe-form input[name=sourceUrl]'), 'https://www.chefkoch.de/rezepte/1');
    assert.match(await page.inputValue('#recipe-form textarea[name=instructions]'), /^Gesamtzeit: 30 Min\.\n\n1\. Spaghetti kochen\./);
    assert.deepEqual(requests, ['https://rezepte.test.workers.dev/?url=https%3A%2F%2Fwww.chefkoch.de%2Frezepte%2F1']);
    await page.click('#recipe-form button[type=submit]');
    await page.waitForSelector('#recipe-dialog', { state: 'hidden' });
    const card = page.locator('.recipe-card', { hasText: 'Spaghetti Carbonara' });
    assert.match(await card.locator('.recipe-meta').textContent(), /4 Zutaten · 4 Portionen · chefkoch\.de/);
    await card.locator('summary').click();
    assert.equal(await card.locator('.source-link').getAttribute('href'), 'https://www.chefkoch.de/rezepte/1');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Link ohne Hilfsdienst: erst nach ausdrücklicher Erlaubnis geht etwas ins Netz', async () => {
    const { ctx, page } = await context();
    const external = [];
    await ctx.route(/allorigins|codetabs/, route => { external.push(route.request().url()); return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'text/html' }, body: recipeHtml }); });
    await open(page);
    await page.click('[data-tab=recipes]'); await page.click('#import-recipe');
    await page.fill('#import-form input[name=url]', 'https://www.chefkoch.de/rezepte/1');
    await page.click('#import-run');
    await page.waitForSelector('[data-dialog-error]:not([hidden])');
    assert.match(await page.textContent('[data-dialog-error]'), /Hilfsdienst/);
    assert.deepEqual(external, [], 'Ohne Erlaubnis darf kein öffentlicher Dienst kontaktiert werden');
    await page.check('#import-form input[name=publicProxy]');
    await page.click('#import-run');
    await page.waitForSelector('#recipe-dialog[open]');
    assert.equal(external.length, 1);
    assert.match(external[0], /^https:\/\/api\.allorigins\.win\/raw\?url=https%3A%2F%2Fwww\.chefkoch\.de/);
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1'))).publicProxy, true);
    await ctx.close();
  });

  test('Link, der sich nicht laden lässt: klarer Hinweis auf den Text-Weg', async () => {
    const { ctx, page } = await context({ config: { publicProxy: true } });
    await ctx.route(/allorigins|codetabs/, route => route.fulfill({ status: 403, headers: { 'access-control-allow-origin': '*' }, body: 'blockiert' }));
    await open(page);
    await page.click('[data-tab=recipes]'); await page.click('#import-recipe');
    await page.fill('#import-form input[name=url]', 'https://www.chefkoch.de/rezepte/1');
    await page.click('#import-run');
    await page.waitForSelector('[data-dialog-error]:not([hidden])');
    assert.match(await page.textContent('[data-dialog-error]'), /unter „Text“ ein/);
    assert.equal(await page.isDisabled('#import-run'), false, 'Nach einem Fehler muss man es erneut versuchen können');
    await ctx.close();
  });

  test('Deep-Link ?import=… lädt das Rezept sofort und räumt die Adresse auf', async () => {
    const { ctx, page, problems } = await context({ config: { importProxy: 'https://rezepte.test.workers.dev' } });
    await ctx.route('https://rezepte.test.workers.dev/**', route => route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'text/html' }, body: recipeHtml }));
    await page.goto(`${base}/index.html?import=${encodeURIComponent('https://www.chefkoch.de/rezepte/1')}`);
    await page.waitForSelector('#recipe-dialog[open]');
    assert.equal(await page.inputValue('#recipe-form input[name=name]'), 'Spaghetti Carbonara');
    assert.equal(new URL(page.url()).search, '');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Rezept aus Screenshot: Texterkennung auf dem Gerät, auch bei dunklem Bild', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const png = await page.evaluate(lines => {
      const canvas = document.createElement('canvas'); canvas.width = 1170; canvas.height = 1000;
      const context2d = canvas.getContext('2d'); context2d.fillStyle = '#16181c'; context2d.fillRect(0, 0, canvas.width, canvas.height);
      context2d.fillStyle = '#eeeeee'; context2d.font = '44px sans-serif';
      lines.forEach((line, index) => context2d.fillText(line, 60, 80 + index * 62));
      return canvas.toDataURL('image/png').split(',')[1];
    }, ['Pfannkuchen', '', 'Zutaten für 4 Portionen:', '250 g Mehl', '3 Eier', '500 ml Milch', '1 Prise Salz', '', 'Zubereitung:', 'Alles verrühren und in der Pfanne ausbacken.']);
    await page.click('[data-tab=recipes]'); await page.click('#import-recipe'); await page.click('[data-source=image]');
    await page.setInputFiles('#import-form input[type=file]', { name: 'screenshot.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    assert.equal(await page.locator('#import-previews img').count(), 1);
    await page.click('#import-run');
    await page.waitForSelector('#recipe-dialog[open]', { timeout: 90000 });
    assert.equal(await page.inputValue('#recipe-form input[name=name]'), 'Pfannkuchen');
    assert.equal(await page.inputValue('#recipe-form input[name=servings]'), '4');
    const names = await page.locator('#ingredient-editor [data-field=name]').evaluateAll(nodes => nodes.map(node => node.value));
    assert.deepEqual(names, ['Mehl', 'Eier', 'Milch', 'Salz']);
    assert.match(await page.inputValue('#recipe-form textarea[name=instructions]'), /ausbacken/);
    assert.match(await page.textContent('#recipe-raw-text'), /250 g Mehl/);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Dialog schließen bricht den Import ab', async () => {
    const { ctx, page } = await context({ config: { importProxy: 'https://rezepte.test.workers.dev' } });
    await ctx.route('https://rezepte.test.workers.dev/**', () => new Promise(() => {}));
    await open(page);
    await page.click('[data-tab=recipes]'); await page.click('#import-recipe');
    await page.fill('#import-form input[name=url]', 'https://www.chefkoch.de/rezepte/1');
    await page.click('#import-run');
    await page.waitForFunction(() => document.querySelector('#import-run').disabled);
    await page.click('#import-dialog [data-close]');
    await page.waitForFunction(() => !document.querySelector('#import-run').disabled);
    await ctx.close();
  });

  test('Texterkennung lässt sich mitten im Lauf abbrechen, ohne Fehler und ohne hängenden Knopf', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 1170; canvas.height = 5200;
      const c = canvas.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 1170, 5200); c.fillStyle = '#000'; c.font = '44px sans-serif';
      for (let i = 0; i < 80; i++) c.fillText(`Schritt ${i + 1}: Etwas rühren und warten.`, 60, 80 + i * 62);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    await page.click('[data-tab=recipes]'); await page.click('#import-recipe'); await page.click('[data-source=image]');
    await page.setInputFiles('#import-form input[type=file]', { name: 'lang.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    await page.click('#import-run');
    await page.waitForFunction(() => /erkannt|geladen/.test(document.querySelector('#import-status').textContent), null, { timeout: 30000 });
    await page.click('#import-dialog [data-close]');
    await page.waitForFunction(() => !document.querySelector('#import-run').disabled, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('#recipe-dialog[open]').count(), 0, 'Nach dem Abbruch darf kein Rezept-Editor aufgehen');
    assert.deepEqual(problems, []);
    // Danach funktioniert ein neuer Versuch.
    await page.click('#import-recipe'); await page.click('[data-source=text]');
    await page.fill('#import-form textarea[name=text]', 'Zutaten\n2 Eier\n1 Prise Salz\nZubereitung\nKochen.');
    await page.click('#import-run'); await page.waitForSelector('#recipe-dialog[open]');
    await ctx.close();
  });

  test('GitHub-Abgleich: unveränderte Abfragen (304), kein Neuzeichnen, Änderungen vom Partner, Schreiben', async () => {
    const remote = github(demo);
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page);
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    assert.equal(await page.textContent('#status'), 'Mit GitHub abgeglichen');
    // Rezept aufklappen; ein Abgleich ohne Änderung darf es nicht schließen.
    await page.click('[data-tab=recipes]');
    await page.locator('.recipe-card summary').first().click();
    const marker = await page.evaluate(() => { const node = document.querySelector('.recipe-card'); node.dataset.marker = 'alt'; return node.dataset.marker; });
    const before = remote.stats.notModified;
    await pollNow(page);
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    await page.waitForTimeout(300);
    await pollNow(page); await page.waitForTimeout(300);
    assert.ok(remote.stats.notModified > before, 'Zweite Abfrage muss als „nicht verändert“ beantwortet werden');
    assert.equal(await page.locator('.recipe-card').first().getAttribute('data-marker'), marker, 'Liste wurde ohne Änderung neu gezeichnet');
    assert.equal(await page.locator('.recipe-details').first().evaluate(node => node.open), true);
    // Partner fügt Artikel hinzu und ändert nichts an den Rezepten.
    remote.remoteChange(content => content.items.push({ id: 'item-partner', storeId: 'store-edeka', name: 'Butter', quantity: 1, unit: 'Stück', checked: false,
      createdBy: 'Partnerin', createdAt: content.updatedAt, updatedAt: content.updatedAt, deletedAt: null, _clock: {}, onSale: false }));
    await pollNow(page);
    await page.click('[data-tab=shopping]');
    await page.waitForFunction(() => document.querySelector('#items').textContent.includes('Butter'));
    assert.equal(await page.locator('.recipe-details').first().evaluate(node => node.open), true, 'Aufgeklapptes Rezept muss nach echter Änderung aufgeklappt bleiben');
    // Eigener Artikel wird geschrieben.
    await page.fill('#item-form input[name=name]', 'Joghurt');
    await page.click('#item-form button[type=submit]');
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok' && document.querySelector('#items').textContent.includes('Joghurt'));
    assert.equal(remote.stats.puts, 1);
    assert.ok(remote.content.items.some(item => item.name === 'Joghurt' && item.createdBy === 'Nico'));
    assert.ok(remote.content.items.some(item => item.name === 'Butter'), 'Änderung des Partners darf nicht überschrieben werden');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('GitHub-Fehler: verständliche Meldung, Änderung bleibt lokal gesichert', async () => {
    const remote = github(demo);
    const { ctx, page } = await context({ config: connectedConfig });
    let denied = false;
    await ctx.route('https://api.github.com/**', route => denied && route.request().method() !== 'OPTIONS' ? route.fulfill({ status: 401, headers: { 'access-control-allow-origin': '*' }, body: '{}' }) : remote.handler(route));
    await open(page);
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    denied = true;
    await page.fill('#item-form input[name=name]', 'Nudeln');
    await page.click('#item-form button[type=submit]');
    await page.waitForSelector('#message:not([hidden])');
    assert.match(await page.textContent('#message'), /Token ist ungültig/);
    assert.equal(await page.getAttribute('#status', 'data-state'), 'error');
    assert.match(await page.textContent('#items'), /Nudeln/);
    await ctx.close();
  });

  test('Dunkelmodus: Farben und Statusleistenfarbe folgen der Einstellung', async () => {
    const { ctx, page } = await context({ context: { colorScheme: 'light' } });
    await open(page);
    assert.equal(await page.getAttribute('#theme-color', 'content'), '#f4f6f2');
    await page.click('[data-tab=settings]');
    await page.selectOption('#theme', 'dark');
    assert.equal(await page.getAttribute('#theme-color', 'content'), '#0f1914');
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(15, 25, 20)');
    await ctx.close();
  });

  test('Offline: App und Texterkennung starten ohne Netz, Update-Hinweis erscheint', async () => {
    const { ctx, page, problems } = await context({ context: { serviceWorkers: 'allow' } });
    await open(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await page.waitForSelector('#status[data-state]');
    assert.ok(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), 'Service Worker muss die Seite übernommen haben');
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 400;
      const c = canvas.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 900, 400); c.fillStyle = '#000'; c.font = '48px sans-serif';
      c.fillText('Zutaten:', 40, 90); c.fillText('2 Eier', 40, 160); c.fillText('200 g Mehl', 40, 230);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    const file = { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') };
    await page.click('[data-tab=recipes]'); await page.click('#import-recipe'); await page.click('[data-source=image]');
    await page.setInputFiles('#import-form input[type=file]', file);
    await page.click('#import-run'); await page.waitForSelector('#recipe-dialog[open]', { timeout: 90000 });
    assert.ok((await page.locator('#ingredient-editor [data-field=name]').evaluateAll(nodes => nodes.map(node => node.value))).includes('Mehl'));
    const cached = await page.evaluate(async () => (await (await caches.open('einkauf-vendor-v1')).keys()).map(request => new URL(request.url).pathname));
    assert.ok(cached.some(file => file.endsWith('deu.traineddata.gz')) && cached.some(file => file.endsWith('worker.min.js')), `Texterkennung nicht im Offline-Speicher: ${cached}`);
    await page.click('#recipe-dialog [data-close]');
    // Ohne Netz neu laden und noch einmal erkennen.
    await ctx.setOffline(true);
    await page.reload(); await page.waitForSelector('#status[data-state]');
    assert.equal(await page.textContent('#status'), 'Nur auf diesem Gerät');
    await page.click('[data-tab=recipes]'); await page.click('#import-recipe'); await page.click('[data-source=image]');
    await page.setInputFiles('#import-form input[type=file]', file);
    await page.click('#import-run'); await page.waitForSelector('#recipe-dialog[open]', { timeout: 90000 });
    await page.click('#recipe-dialog [data-close]');
    await ctx.setOffline(false);
    assert.ok(await page.locator('#update-banner').isHidden());
    await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')));
    assert.ok(await page.locator('#update-banner').isVisible());
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  test('Kategorien: nach Gängen gruppiert, Schätzung sichtbar, ändern und lernen, abschaltbar', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.getByRole('tab', { name: /^Edeka/ }).click();   // Einzelansicht: neue Artikel landen bei Edeka
    const heads = () => page.locator('#items .group-head span:first-child').allTextContents();
    const add = async name => { await page.fill('#item-form input[name=name]', name); await page.click('#item-form button[type=submit]'); };
    await page.fill('#item-form input[name=name]', 'Butter');
    assert.equal(await page.locator('#item-form select[name=category] option').first().textContent(), 'Automatisch (Milch, Käse & Eier)');
    await add('Butter'); await add('Spülmittel'); await add('Xyzzy');
    assert.deepEqual(await heads(), ['Obst & Gemüse', 'Milch, Käse & Eier', 'Vorrat & Konserven', 'Haushalt & Drogerie', 'Sonstiges']);
    // Kategorie von Hand ändern ...
    await page.evaluate(() => document.activeElement.blur());
    await page.locator('.item', { hasText: 'Xyzzy' }).getByRole('button', { name: /bearbeiten/ }).click();
    await page.selectOption('#edit-item-form select[name=category]', 'getraenke');
    await page.click('#edit-item-form button[type=submit]');
    await page.waitForSelector('#item-dialog', { state: 'hidden' });
    assert.ok((await heads()).includes('Getränke'));
    // ... und die App lernt es für denselben Namen (andere Einheit, sonst würde die Menge des vorhandenen Artikels erhöht).
    await page.fill('#item-form input[name=unit]', 'Flasche');
    await add('Xyzzy');
    assert.equal(await page.locator('#items .group-head', { hasText: 'Getränke' }).locator('.count').textContent(), '2');
    assert.ok(!(await heads()).includes('Sonstiges'));
    // Erledigt steht unten.
    await page.locator('.item', { hasText: 'Butter' }).locator('.check').click();
    const all = await heads(); assert.equal(all.at(-1), 'Erledigt');
    // Abschalten.
    await page.click('[data-tab=settings]'); await page.uncheck('#group-items'); await page.click('[data-tab=shopping]');
    assert.equal(await page.locator('#items .group-head').count(), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Gleiche Artikel werden zusammengezählt; Rückgängig; Rezept-Zutaten zählen zur Liste dazu', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.getByRole('tab', { name: /^Edeka/ }).click();
    const add = async (name, quantity, unit) => {
      await page.fill('#item-form input[name=name]', name); await page.fill('#item-form input[name=quantity]', quantity); await page.fill('#item-form input[name=unit]', unit);
      await page.click('#item-form button[type=submit]');
    };
    const rows = name => page.locator('#items .item', { hasText: name });
    await add('Bananen', '2', 'Stück'); await add('bananen', '3', 'Stk.');
    assert.equal(await rows('Bananen').count(), 1);
    assert.match(await rows('Bananen').textContent(), /5 Stück/);
    assert.match(await page.textContent('#undo-label'), /„Bananen“: jetzt 5 Stück/);
    await page.click('#undo');
    assert.match(await rows('Bananen').textContent(), /2 Stück/);
    // Andere Einheit: eigener Eintrag.
    await add('Bananen', '1', 'kg');
    assert.equal(await rows('Bananen').count(), 2);
    // Gramm und Kilogramm werden verrechnet (Beispieldaten: Tomaten 500 g bei Edeka).
    await add('Tomaten', '0,7', 'kg');
    assert.match(await rows('Tomaten').first().textContent(), /1,2 kg/);
    // Rezept auf die Liste: Nudeln 500 g + 200 g, Tomaten 1,2 kg + 400 g
    await page.click('[data-tab=recipes]');
    const card = page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' });
    await card.locator('summary').click();
    await card.getByRole('button', { name: 'Auf die Liste' }).click();
    await sheetOpen(page);
    await page.selectOption('#transfer-form select[name=storeId]', 'store-edeka');
    await page.click('#transfer-form button:not([data-close])');
    await page.waitForSelector('#transfer-dialog', { state: 'hidden' });
    assert.match(await page.textContent('#undo-label'), /dazugezählt/);
    await page.getByRole('tab', { name: /^Edeka/ }).click();
    assert.equal(await rows('Nudeln').count(), 1);
    assert.match(await rows('Nudeln').textContent(), /700 g/);
    assert.match(await rows('Tomaten').first().textContent(), /1,6 kg/);
    await page.click('#undo');
    assert.match(await rows('Nudeln').textContent(), /500 g/);
    assert.match(await rows('Tomaten').first().textContent(), /1,2 kg/);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Favoriten, „Heute gekocht“ und „Lange nicht gekocht“', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('[data-tab=recipes]');
    const titles = () => page.locator('.recipe-card h3').allTextContents();
    assert.deepEqual(await titles(), ['Apfel-Pfannkuchen', 'Kichererbsen-Curry', 'Tomaten-Pasta']);
    await page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' }).locator('.fav').click();
    assert.deepEqual(await titles(), ['Tomaten-Pasta', 'Apfel-Pfannkuchen', 'Kichererbsen-Curry'], 'Favoriten stehen zuerst');
    assert.equal(await page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' }).locator('.fav').getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: '★ Favoriten' }).click();
    assert.deepEqual(await titles(), ['Tomaten-Pasta']);
    await page.getByRole('button', { name: '★ Favoriten' }).click();
    const curry = page.locator('.recipe-card', { hasText: 'Kichererbsen-Curry' });
    await curry.locator('summary').click(); await curry.getByRole('button', { name: 'Heute gekocht' }).click();
    assert.match(await page.locator('.recipe-card', { hasText: 'Kichererbsen-Curry' }).locator('.recipe-meta').textContent(), /gekocht heute/);
    assert.equal(await page.locator('.recipe-card', { hasText: 'Kichererbsen-Curry' }).locator('.recipe-details').evaluate(node => node.open), true, 'Rezept bleibt nach dem Eintragen aufgeklappt');
    await page.getByRole('button', { name: 'Lange nicht gekocht' }).click();
    assert.deepEqual(await titles(), ['Apfel-Pfannkuchen', 'Tomaten-Pasta', 'Kichererbsen-Curry'], 'Nie Gekochtes zuerst, gerade Gekochtes zuletzt');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Wochenplan: planen, abhaken, Wochen-Einkaufsliste, eigenes Gericht, Rückgängig', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('[data-tab=recipes]');
    await page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' }).getByRole('button', { name: /im Wochenplan einplanen/ }).click();
    await sheetOpen(page);
    assert.equal(await page.inputValue('#meal-form select[name=recipeId]') !== '', true, 'Rezept ist vorausgewählt');
    assert.equal(await page.inputValue('#meal-form input[name=servings]'), '2');
    await page.click('#meal-form button[type=submit]');
    await page.waitForSelector('#plan:not([hidden])');
    const today = page.locator('.day.today');
    assert.match(await today.textContent(), /Tomaten-Pasta[\s\S]*2 Portionen/);
    // zweites Gericht und ein eigenes
    await today.locator('.day-head .icon-button').click();
    await page.selectOption('#meal-form select[name=recipeId]', { label: 'Kichererbsen-Curry' });
    await page.fill('#meal-form input[name=servings]', '4'); await page.click('#meal-form button[type=submit]');
    await today.locator('.day-head .icon-button').click();
    await page.selectOption('#meal-form select[name=recipeId]', '__custom');
    assert.ok(await page.locator('#meal-form [data-custom]').isVisible());
    await page.fill('#meal-form input[name=title]', 'Pizza bestellen'); await page.click('#meal-form button[type=submit]');
    assert.equal(await today.locator('.meal').count(), 3);
    // Wochen-Einkaufsliste
    await page.click('#plan-shopping'); await sheetOpen(page);
    const rows = await page.locator('#week-ingredients .transfer-row').allTextContents();
    assert.ok(rows.some(row => /Tomaten/.test(row)) && rows.some(row => /Kichererbsen/.test(row)), rows.join('|'));
    assert.ok(!rows.some(row => /Pizza/.test(row)), 'Eigene Gerichte haben keine Zutaten');
    await page.selectOption('#week-form select[name=storeId]', { label: 'Lidl' });
    await page.click('#week-form button[type=submit]');
    await page.waitForSelector('#shopping:not([hidden])');
    assert.match(await page.textContent('#items'), /Tomaten/);
    assert.equal(await page.locator('#store-chips [aria-selected=true]').textContent().then(text => text.replace(/\d+$/, '')), 'Alle', 'Nach dem Übernehmen zeigt die Gesamtliste alles');
    assert.match(await page.locator('#items .store-head', { hasText: 'Lidl' }).locator('xpath=following-sibling::li[1]').textContent(), /\w/);
    // abhaken setzt das Kochdatum des Rezepts
    await page.click('[data-tab=plan]');
    await today.locator('.meal', { hasText: 'Tomaten-Pasta' }).locator('.check').click();
    await page.click('[data-tab=recipes]');
    assert.match(await page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' }).locator('.recipe-meta').textContent(), /gekocht heute/);
    // Schon Gekochtes bleibt in der Wochenliste außen vor
    await page.click('[data-tab=plan]'); await page.click('#plan-shopping'); await sheetOpen(page);
    assert.ok(!(await page.locator('#week-ingredients').textContent()).includes('Nudeln'));
    await page.uncheck('#week-form input[name=skipDone]');
    assert.ok((await page.locator('#week-ingredients').textContent()).includes('Nudeln'));
    await page.click('#week-dialog [data-close]');
    // Wochen blättern, löschen, Rückgängig
    await page.click('#week-next'); assert.equal(await page.locator('.meal').count(), 0);
    await page.click('#week-today'); assert.equal(await today.locator('.meal').count(), 3);
    await today.locator('.meal', { hasText: 'Pizza bestellen' }).getByRole('button', { name: /entfernen/ }).click();
    assert.equal(await today.locator('.meal').count(), 2);
    await page.click('#undo'); assert.equal(await today.locator('.meal').count(), 3);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  const makePhoto = page => page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1000;
    const c = canvas.getContext('2d'); c.fillStyle = '#c06030'; c.fillRect(0, 0, 1600, 1000); c.fillStyle = '#fff'; c.fillRect(300, 200, 900, 500);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const addPhotoRecipe = async (page, name, png) => {
    await page.click('[data-tab=recipes]'); await page.click('#add-recipe');
    await page.fill('#recipe-form input[name=name]', name);
    await page.fill('#ingredient-editor [data-field=name]', 'Mehl'); await page.fill('#ingredient-editor [data-field=quantity]', '200'); await page.fill('#ingredient-editor [data-field=unit]', 'g');
    await page.setInputFiles('#recipe-form input[type=file]', { name: 'kuchen.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    await page.waitForFunction(() => !document.querySelector('#photo-preview').hidden);
    await page.click('#recipe-form button[type=submit]');
    await page.waitForSelector('#recipe-dialog', { state: 'hidden' });
  };
  const loadedPhoto = (page, name) => page.waitForFunction(title => { const card = [...document.querySelectorAll('.recipe-card')].find(node => node.textContent.includes(title)); const image = card?.querySelector('img[data-photo-id]'); return image && image.dataset.loaded && image.naturalWidth > 0; }, name, { timeout: 15000 });

  test('Rezeptfoto: verkleinert, als eigene Datei hochgeladen, auf dem zweiten Gerät sichtbar', async () => {
    const remote = github(demo);
    const a = await context({ config: connectedConfig }), b = await context({ config: { ...connectedConfig, actor: 'Anna' } });
    for (const device of [a, b]) await device.ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(a.page); await a.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    await addPhotoRecipe(a.page, 'Foto-Kuchen', await makePhoto(a.page));
    await loadedPhoto(a.page, 'Foto-Kuchen');
    await a.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    assert.equal(remote.stats.photoPuts, 1);
    const [[path, bytes]] = [...remote.photos];
    assert.match(path, /^photos\/[0-9a-f-]{36}\.jpg$/);
    assert.deepEqual([...bytes.subarray(0, 3)], [0xff, 0xd8, 0xff], 'Datei ist ein JPEG');
    assert.ok(bytes.length < 400_000);
    const recipe = remote.content.recipes.find(row => row.name === 'Foto-Kuchen');
    assert.equal(`photos/${recipe.photoId}.jpg`, path, 'Rezeptdaten enthalten nur die Kennung, kein Bild');
    assert.ok(JSON.stringify(remote.content).length < 100_000);
    // Zweites Gerät
    await open(b.page); await b.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    await b.page.click('[data-tab=recipes]');
    await loadedPhoto(b.page, 'Foto-Kuchen');
    assert.ok(remote.stats.photoGets >= 1);
    // Foto entfernen
    await a.page.locator('.recipe-card', { hasText: 'Foto-Kuchen' }).locator('summary').click();
    await a.page.locator('.recipe-card', { hasText: 'Foto-Kuchen' }).getByRole('button', { name: 'Bearbeiten' }).click();
    await a.page.waitForFunction(() => !document.querySelector('#photo-preview').hidden);
    await a.page.click('#photo-remove'); await a.page.click('#recipe-form button[type=submit]');
    await a.page.waitForSelector('#recipe-dialog', { state: 'hidden' });
    assert.equal(await a.page.locator('.recipe-card', { hasText: 'Foto-Kuchen' }).locator('img').count(), 0);
    assert.deepEqual([...a.problems, ...b.problems], []);
    await a.ctx.close(); await b.ctx.close();
  });

  test('Rezeptfoto ohne Verbindung: bleibt in der Warteschlange und wird später hochgeladen', async () => {
    const remote = github(demo); remote.behavior.failPhotoPuts = true;
    const a = await context({ config: connectedConfig });
    await a.ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(a.page); await a.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    await addPhotoRecipe(a.page, 'Spät-Kuchen', await makePhoto(a.page));
    await loadedPhoto(a.page, 'Spät-Kuchen');
    await a.page.waitForFunction(() => Object.keys(localStorage).some(key => key.startsWith('einkauf-photo-queue:') && JSON.parse(localStorage.getItem(key)).length === 1));
    assert.equal(remote.photos.size, 0);
    for (let attempt = 0; attempt < 50 && !remote.content.recipes.some(row => row.name === 'Spät-Kuchen'); attempt++) await a.page.waitForTimeout(200);
    assert.ok(remote.content.recipes.some(row => row.name === 'Spät-Kuchen'), 'Das Rezept selbst wird trotzdem abgeglichen');
    remote.behavior.failPhotoPuts = false;
    // Läuft gerade ein Abgleich, verpufft ein einzelner Klick; deshalb wiederholen, bis die Warteschlange leer ist.
    const emptyQueue = () => a.page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('einkauf-photo-queue:')).every(key => JSON.parse(localStorage.getItem(key)).length === 0));
    for (let attempt = 0; attempt < 25 && !(await emptyQueue()); attempt++) { await a.page.evaluate(() => document.querySelector('#refresh').click()); await a.page.waitForTimeout(1000); }
    assert.equal(await emptyQueue(), true);
    assert.equal(remote.photos.size, 1);
    assert.deepEqual(a.problems.filter(text => !/Failed to load resource/.test(text)), []);
    await a.ctx.close();
  });

  test('Startseite zeigt die Gesamtliste aller Geschäfte; Geschäft beim Hinzufügen wählbar, auch „Kein Geschäft“', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const chips = () => page.locator('#store-chips [role=tab]').evaluateAll(nodes => nodes.map(node => [node.firstChild.textContent, node.getAttribute('aria-selected')]));
    const heads = () => page.locator('#items .store-head span:nth-child(2)').allTextContents();
    // Start: „Alle“, alle Geschäfte mit ihren Artikeln (Beispieldaten: Edeka, Lidl, Rewe)
    assert.deepEqual((await chips())[0], ['Alle', 'true']);
    assert.deepEqual(await heads(), ['Edeka', 'Lidl', 'Rewe']);
    assert.match(await page.textContent('#shopping-total'), /Alle Geschäfte/);
    assert.equal(await page.locator('#offers-link').isHidden(), true, 'Angebote gibt es je Geschäft, nicht in der Gesamtliste');
    // Das Formular bietet „Kein Geschäft“ und alle Geschäfte als Schnellwahl an; Standard in „Alle“: kein Geschäft (nichts ist vorausgewählt).
    const pick = () => page.locator('#store-pick button').evaluateAll(nodes => nodes.map(node => [node.textContent, node.getAttribute('aria-pressed')]));
    assert.deepEqual(await pick(), [['Kein Geschäft', 'true'], ['Edeka', 'false'], ['Lidl', 'false'], ['Rewe', 'false']]);
    assert.equal(await page.inputValue('#item-form input[name=storeId]'), '');
    const add = async (name, store) => { if (store !== undefined) await page.locator('#store-pick button', { hasText: store }).click(); await page.fill('#item-form input[name=name]', name); await page.click('#item-form button[type=submit]'); };
    // Ohne Geschäft: steht übersichtlich ganz oben, eigener Filter erscheint
    await add('Klopapier');
    assert.deepEqual(await heads(), ['Ohne Geschäft', 'Edeka', 'Lidl', 'Rewe']);
    assert.match(await page.locator('#items .store-head').first().textContent(), /Ohne Geschäft\s*1/);
    assert.deepEqual((await chips()).map(row => row[0]), ['Alle', 'Ohne Geschäft', 'Edeka', 'Lidl', 'Rewe']);
    // Mit Geschäft: Auswahl bleibt für den nächsten Artikel stehen
    await add('Gurke', 'Lidl'); await add('Möhren');
    assert.deepEqual((await pick()).filter(row => row[1] === 'true').map(row => row[0]), ['Lidl']);
    const lidl = page.locator('#items .store-head', { hasText: 'Lidl' });
    assert.match(await lidl.textContent(), /Lidl\s*3/, 'Milch aus den Beispieldaten plus Gurke und Möhren');
    // Einzelansichten filtern; Geschäft anklicken wählt es auch für neue Artikel vor
    await page.getByRole('tab', { name: /^Ohne Geschäft/ }).click();
    assert.equal(await page.locator('#items .item').count(), 1);
    assert.equal(await page.inputValue('#item-form input[name=storeId]'), '');
    assert.deepEqual((await pick()).filter(row => row[1] === 'true').map(row => row[0]), ['Kein Geschäft']);
    assert.equal(await page.locator('#items .store-head').count(), 0, 'Einzelansicht braucht keine Geschäftsüberschrift');
    await page.getByRole('tab', { name: /^Rewe/ }).click();
    assert.equal(await page.locator('#items .item').count(), 1);
    assert.deepEqual((await pick()).filter(row => row[1] === 'true').map(row => row[0]), ['Rewe']);
    // Zweiter Tipp auf das gewählte Geschäft nimmt die Auswahl zurück: dann kommt der Artikel ohne Geschäft
    await page.locator('#store-pick button', { hasText: 'Rewe' }).click();
    assert.deepEqual((await pick()).filter(row => row[1] === 'true').map(row => row[0]), ['Kein Geschäft']);
    assert.equal(await page.inputValue('#item-form input[name=storeId]'), '');
    await page.locator('#store-pick button', { hasText: 'Rewe' }).click();
    assert.match(await page.textContent('#shopping-total'), /Rewe · offen/);
    // Ohne Geschäft später zuweisen: wandert in den Abschnitt des Geschäfts
    await page.getByRole('tab', { name: /^Ohne Geschäft/ }).click();
    await page.locator('.item', { hasText: 'Klopapier' }).getByRole('button', { name: /bearbeiten/ }).click();
    assert.equal(await page.inputValue('#edit-item-form select[name=storeId]'), '');
    await page.selectOption('#edit-item-form select[name=storeId]', { label: 'Rewe' });
    await page.click('#edit-item-form button[type=submit]');
    await page.waitForSelector('#item-dialog', { state: 'hidden' });
    assert.equal(await page.locator('#items .item').count(), 0);
    assert.equal(await page.locator('#store-chips [role=tab]', { hasText: 'Ohne Geschäft' }).count(), 1, 'Der gewählte Filter bleibt auch ohne Treffer sichtbar');
    await page.getByRole('tab', { name: /^Alle/ }).click();
    assert.deepEqual(await heads(), ['Edeka', 'Lidl', 'Rewe']);
    assert.match(await page.locator('#items .store-head', { hasText: 'Rewe' }).textContent(), /Rewe\s*2/);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Artikel, der in der gewählten Ansicht nicht erscheint: Hinweis mit Rückgängig', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.getByRole('tab', { name: /^Rewe/ }).click();
    await page.locator('#store-pick button', { hasText: 'Lidl' }).click();
    await page.fill('#item-form input[name=name]', 'Joghurt'); await page.click('#item-form button[type=submit]');
    assert.equal(await page.locator('#items .item', { hasText: 'Joghurt' }).count(), 0, 'In der Rewe-Ansicht steht der Lidl-Artikel nicht');
    await page.waitForSelector('#undo-bar:not([hidden])');
    assert.equal(await page.textContent('#undo-label'), '„Joghurt“ steht bei „Lidl“');
    await page.getByRole('tab', { name: /^Alle/ }).click();
    assert.equal(await page.locator('#items .item', { hasText: 'Joghurt' }).count(), 1);
    await page.click('#undo');
    assert.equal(await page.locator('#items .item', { hasText: 'Joghurt' }).count(), 0);
    // Ein Artikel, der in der Ansicht erscheint, braucht keinen Hinweis.
    await page.getByRole('tab', { name: /^Lidl/ }).click();
    await page.locator('#undo-bar').evaluate(node => { node.hidden = true; });
    await page.fill('#item-form input[name=name]', 'Quark'); await page.click('#item-form button[type=submit]');
    assert.equal(await page.locator('#undo-bar').isHidden(), true);
    assert.equal(await page.locator('#items .item', { hasText: 'Quark' }).count(), 1);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Gesamtliste: Summe über alle Geschäfte, Erledigtes mit Geschäft, „Erledigte entfernen“ gilt für die Ansicht', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const total = async () => (await page.textContent('#shopping-total')).match(/[\d.,]+ €/)?.[0];
    const alle = await total();
    await page.getByRole('tab', { name: /^Edeka/ }).click(); const edeka = await total();
    await page.getByRole('tab', { name: /^Lidl/ }).click(); const lidl = await total();
    await page.getByRole('tab', { name: /^Rewe/ }).click(); const rewe = await total();
    const cents = text => text ? Number(text.replace(/[^\d,]/g, '').replace(',', '.')) : 0;
    assert.ok(Math.abs(cents(alle) - (cents(edeka) + cents(lidl) + cents(rewe))) < 0.011, `${alle} ≠ ${edeka} + ${lidl} + ${rewe}`);
    await page.getByRole('tab', { name: /^Alle/ }).click();
    await page.locator('.item', { hasText: 'Milch' }).locator('.check').click();
    await page.locator('.item', { hasText: 'Äpfel' }).locator('.check').click();
    const done = page.locator('#items .group-head', { hasText: 'Erledigt' });
    assert.equal(await done.count(), 1);
    assert.match(await page.locator('.item.checked', { hasText: 'Milch' }).textContent(), /· Lidl/, 'Erledigte zeigen ihr Geschäft');
    await page.getByRole('tab', { name: /^Lidl/ }).click();
    await page.click('#clear-checked');
    await page.getByRole('tab', { name: /^Alle/ }).click();
    assert.equal(await page.locator('.item.checked').count(), 1, 'Nur die erledigten Artikel der gewählten Ansicht werden entfernt');
    await page.click('#clear-checked');
    assert.equal(await page.locator('.item.checked').count(), 0);
    await page.click('#undo');
    assert.equal(await page.locator('.item.checked').count(), 1);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Rezept auf die Liste ohne Geschäft; gelöschtes Geschäft verbirgt seine Artikel, nicht die ohne Geschäft', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('[data-tab=recipes]');
    await page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' }).getByRole('button', { name: 'Auf die Liste' }).click();
    await sheetOpen(page);
    assert.equal(await page.inputValue('#transfer-form select[name=storeId]'), '', 'In „Alle“ ist „Kein Geschäft“ vorgewählt');
    await page.click('#transfer-form button:not([data-close])');
    await page.waitForSelector('#transfer-dialog', { state: 'hidden' });
    assert.match(await page.locator('#items .store-head').first().textContent(), /Ohne Geschäft/);
    assert.ok(await page.locator('#items .item', { hasText: 'Nudeln' }).count() >= 1);
    // Geschäft löschen: seine Artikel verschwinden aus allen Ansichten, die ohne Geschäft bleiben
    await page.click('#manage-stores'); await sheetOpen(page);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Rewe löschen' }).click();
    await page.click('#stores-dialog [data-close]');
    assert.equal(await page.locator('#items .item', { hasText: 'Äpfel' }).count(), 0);
    assert.ok(await page.locator('#items .item', { hasText: 'Tomaten' }).count() >= 1);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  // Eine Datei voller alter, längst gelöschter Artikel, wie sie nach Monaten ohne Aufräumen entstünde.
  const bloated = count => {
    const content = structuredClone(demo), old = new Date(Date.now() - 40 * 86400000).toISOString();
    for (let index = 0; index < count; index++) {
      const clock = { at: old, id: `op-${index}` };
      content.items.push({ id: `alt-${index}`, storeId: 'store-edeka', name: `Altartikel ${index}`, quantity: 1, unit: 'Stück', checked: true, createdBy: 'Nico', createdAt: old, updatedAt: old, deletedAt: old, onSale: false,
        _clock: { storeId: clock, name: clock, quantity: clock, unit: clock, checked: clock, createdBy: clock, deletedAt: clock, onSale: clock } });
    }
    return content;
  };
  const synced = page => page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');

  test('Datenumfang: Anzeige, Aufräumen auf Wunsch schreibt die kleinere Datei', async () => {
    const remote = github(bloated(40));
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    await page.click('[data-tab=settings]');
    assert.match(await page.textContent('#storage-text'), /KB von 879 KB belegt/);
    assert.match(await page.textContent('#storage-hint'), /Aufräumbar: 40 Einträge/);
    const before = JSON.stringify(remote.content).length, puts = remote.stats.puts;
    await page.click('#compact-now');
    await page.waitForFunction(() => /Aufgeräumt: 40 Einträge entfernt/.test(document.querySelector('#storage-note').textContent));
    assert.equal(remote.stats.puts, puts + 1);
    assert.ok(remote.content.items.every(row => !row.deletedAt), 'Gelöschtes ist endgültig weg');
    assert.ok(JSON.stringify(remote.content).length < before / 2);
    assert.ok(remote.content.names.some(entry => entry.name === 'Altartikel 3'), 'Namensgedächtnis bleibt');
    assert.ok(remote.content.sync.compactedAt);
    assert.match(await page.textContent('#storage-hint'), /Nichts zum Aufräumen/);
    await page.click('#compact-now');
    await page.waitForFunction(() => /nichts aufzuräumen/.test(document.querySelector('#storage-note').textContent));
    assert.equal(remote.stats.puts, puts + 1, 'Ohne Änderung wird nichts geschrieben');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Datenumfang: ab 250 KB räumt die App beim Abgleich von selbst auf, Vorschläge bleiben', async () => {
    const remote = github(bloated(400));
    assert.ok(JSON.stringify(remote.content).length > 250_000);
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    assert.ok(remote.content.items.every(row => !row.deletedAt));
    assert.ok(JSON.stringify(remote.content).length < 100_000);
    // Gelernter Name erscheint weiterhin als Vorschlag.
    await page.fill('#item-form input[name=name]', 'Altartikel 12');
    await page.waitForFunction(() => /Altartikel 12/.test(document.querySelector('#item-suggestions')?.textContent || ''));
    await page.fill('#item-form input[name=name]', '');
    // Ein Partnergerät mit eigener, noch nicht abgeglichener Änderung an einem aufgeräumten Artikel verliert nichts anderes.
    await page.fill('#item-form input[name=name]', 'Hafermilch');
    await page.click('#item-form button[type=submit]');
    await synced(page);
    assert.ok(remote.content.items.some(row => row.name === 'Hafermilch'));
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Datenumfang im Beispielmodus: Aufräumen lokal, keine Foto-Bereinigung', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('[data-tab=settings]');
    assert.equal(await page.locator('#clean-photos').isHidden(), true);
    await page.click('#compact-now');
    await page.waitForFunction(() => /nichts aufzuräumen/.test(document.querySelector('#storage-note').textContent));
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Fotos aufräumen: nur Dateien ohne Rezept werden gelöscht, lokaler Zwischenspeicher wird bereinigt', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
    const remote = github(demo), keep = 'aaaaaaaa-1111-4222-8333-444444444444', lost = 'bbbbbbbb-1111-4222-8333-444444444444', lost2 = 'cccccccc-1111-4222-8333-444444444444';
    remote.content.recipes.find(row => row.id === 'recipe-pasta').photoId = keep;
    for (const id of [keep, lost, lost2]) remote.photos.set(`photos/${id}.jpg`, jpeg);
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    await page.evaluate(async ([url]) => { await (await caches.open('einkauf-photos-v1')).put(new Request(url), new Response('x')); }, [`${base}/photo/${lost}`]);
    await page.click('[data-tab=settings]');
    assert.equal(await page.locator('#clean-photos').isVisible(), true);
    page.once('dialog', dialog => { assert.match(dialog.message(), /2 nicht mehr verwendete Fotos/); void dialog.accept(); });
    await page.click('#clean-photos');
    await page.waitForFunction(() => /2 Fotos gelöscht/.test(document.querySelector('#storage-note').textContent));
    assert.deepEqual([...remote.photos.keys()], [`photos/${keep}.jpg`]);
    await page.click('#clean-photos');
    await page.waitForFunction(() => /Alle Fotos werden noch verwendet/.test(document.querySelector('#storage-note').textContent));
    assert.equal(remote.stats.photoDeletes, 2);
    await open(page); await synced(page);
    const cached = await page.evaluate(async () => (await (await caches.open('einkauf-photos-v1')).keys()).map(request => request.url.split('/').pop()));
    assert.ok(!cached.includes(lost), 'Foto ohne Rezept ist aus dem Zwischenspeicher entfernt');
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  test('Neuer Name und Backup', async () => {
    const { ctx, page } = await context({ seed: false });
    await open(page);
    await page.waitForSelector('#welcome[open]');
    await page.fill('#welcome-form input[name=actor]', 'Anna');
    await page.click('#welcome-form button');
    await page.waitForSelector('#welcome', { state: 'hidden' });
    assert.match(await page.textContent('#identity'), /Anna/);
    await page.fill('#item-form input[name=name]', 'Milch');
    await page.click('#item-form button[type=submit]');
    assert.match(await page.textContent('#items'), /Anna/);
    await page.click('[data-tab=settings]');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
    const backup = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.ok(backup.items.some(item => item.name === 'Milch'));
    assert.ok(!JSON.stringify(backup).includes('token'));
    await ctx.close();
  });
});
