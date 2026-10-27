/* Browserprüfung in mobilem Chromium. Benötigt Playwright (npm i -D playwright, einmalig `npx playwright install chromium`).
   Ohne Playwright werden die Tests übersprungen. Der GitHub-Server und Hilfsdienste werden simuliert; echte Konten sind nicht nötig. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { planGenerated } from '../recipe-maker.js';

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
  // Die Produktbilder (Symbole in den Artikelzeilen) sind in der App standardmäßig an; die übrigen Prüfungen laufen ohne sie (die Zeilen bleiben so wie sie waren), die eigenen Tests schalten sie ein.
  const settings = { actor: 'Nico', productImages: false, ...options.config };
  await ctx.addInitScript(([key, value, seed]) => { if (!localStorage.getItem(key) && seed) localStorage.setItem(key, JSON.stringify(value)); }, ['einkauf-settings-v1', settings, options.seed !== false]);
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', error => problems.push(error.message));
  page.on('console', message => { if (message.type() === 'error') problems.push(message.text()); });
  return { ctx, page, problems };
}
const open = async (page, query = '') => { await page.goto(`${base}/index.html${query}`); await page.waitForSelector('#status[data-state]', { state: 'attached' }); await page.waitForFunction(() => document.querySelector('#items')); };
const horizontalOverflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const sheetOpen = page => page.waitForSelector('dialog[open]');
// Das Eingabeformular ist zugeklappt, bis jemand ins Namensfeld tippt; erst dann erscheinen Geschäft, Menge und Einheit.
const expandForm = page => page.focus('#item-form input[name=name]');
// Die Bereiche der Einstellungen sind eingeklappt; die meisten Prüfungen brauchen sie offen.
const openSettings = async page => { await page.click('[data-tab=settings]'); await page.evaluate(() => document.querySelectorAll('#settings details.fold').forEach(node => { node.open = true; })); };
const pickStore = async (page, name) => { await expandForm(page); await page.locator('#store-pick button', { hasText: name }).click(); };

function github(initial) {
  let content = structuredClone(initial), sha = 'sha-1', etag = '"e-1"', version = 1;
  const photos = new Map(), stats = { gets: 0, puts: 0, notModified: 0, photoPuts: 0, photoGets: 0, photoLists: 0, photoDeletes: 0 }, behavior = { failPhotoPuts: false, unauthorized: false };
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
      if (behavior.unauthorized && !path.startsWith('photos')) return route.fulfill({ status: 401, headers: cors, body: '{}' });
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
      for (const name of ['shopping', 'recipes', 'plan', 'spending', 'settings']) {
        await page.click(`[data-tab=${name}]`);
        assert.equal(await horizontalOverflow(page), 0, `Überlauf im Bereich ${name}`);
        assert.ok((await sizes()).every(size => size >= 16), `Schrift unter 16 px im Bereich ${name}`);
        const bar = await page.locator('.tabs').boundingBox(), height = await page.evaluate(() => innerHeight);
        assert.ok(Math.abs(bar.y + bar.height - height) < 1, `Leiste sitzt nicht am unteren Rand (${bar.y + bar.height} statt ${height})`);
      }
      await page.click('[data-tab=shopping]');
      const fits = () => page.evaluate(() => { const dialog = document.querySelector('dialog[open]'); return document.documentElement.scrollWidth <= document.documentElement.clientWidth && dialog.scrollWidth <= dialog.clientWidth; });
      for (const [label, setup] of [['Geschäfte', () => page.click('#manage-stores')], ['Artikel', () => page.click('.item .item-copy')],
        ['Rezept', async () => { await page.click('[data-tab=recipes]'); await page.click('#add-recipe'); }],
        ['Import Link', async () => { await page.click('[data-tab=recipes]'); await page.click('#import-recipe'); }],
        ['Import Screenshot', async () => { await page.click('[data-tab=recipes]'); await page.click('#import-recipe'); await page.click('[data-source=image]'); }],
        ['Import Text', async () => { await page.click('[data-tab=recipes]'); await page.click('#import-recipe'); await page.click('[data-source=text]'); }],
        ['Kochmodus', async () => { await page.click('[data-tab=recipes]'); await page.locator('.recipe-card').first().getByRole('button', { name: 'Kochen' }).click(); }],
        ['Kassenbon', () => page.click('#open-receipt')],
        ['Was kann ich kochen?', async () => { await page.click('[data-tab=recipes]'); await page.click('#cookable-open'); }],
        ['Einkauf eintragen', async () => { await page.click('[data-tab=spending]'); await page.click('#add-purchase'); }],
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

  test('Tastatur: Ein Tipp auf leere Fläche nimmt dem Eingabefeld den Fokus, Tipps auf Eingaben und Knöpfe nicht', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const focused = () => page.evaluate(() => document.activeElement?.name || document.activeElement?.tagName || '');
    const tapOnEmpty = async selector => { const box = await page.locator(selector).boundingBox(); await page.touchscreen.tap(box.x + 3, box.y + 3); };
    // Einkaufsliste: Name eingeben, dann auf die Überschrift tippen
    await page.focus('#item-form input[name=name]');
    assert.equal(await focused(), 'name');
    await tapOnEmpty('#shopping-title');
    assert.notEqual(await focused(), 'name', 'Fokus weg, Tastatur schließt sich');
    // In ein anderes Feld tippen behält den Fokus; auf einen Knopf tippen auch (die Schnellwahl der Geschäfte)
    await page.focus('#item-form input[name=name]');
    await page.locator('#item-form input[name=quantity]').tap();
    assert.equal(await focused(), 'quantity');
    await page.locator('#store-pick button').first().tap();
    assert.equal(await page.locator('#store-pick button[aria-pressed=true]').count(), 1, 'der Knopf wurde ausgelöst');
    // Wischen (Scrollen) ist kein Tipp
    await page.focus('#item-form input[name=name]');
    await page.evaluate(() => {
      const fire = (type, y) => document.body.dispatchEvent(new PointerEvent(type, { bubbles: true, isPrimary: true, pointerType: 'touch', clientX: 200, clientY: y }));
      fire('pointerdown', 400); fire('pointerup', 300);   // 100 px Bewegung = Wischen
    });
    assert.equal(await focused(), 'name');
    await page.evaluate(() => {
      const fire = (type, y) => document.body.dispatchEvent(new PointerEvent(type, { bubbles: true, isPrimary: true, pointerType: 'touch', clientX: 200, clientY: y }));
      fire('pointerdown', 400); fire('pointerup', 402);   // 2 px = Tipp auf leere Fläche
    });
    assert.notEqual(await focused(), 'name');
    await page.focus('#item-form input[name=name]');
    // Neue Zutaten im Rezept: Zutat hinzufügen, Name tippen, auf die Überschrift des Dialogs tippen
    await page.click('[data-tab=recipes]'); await page.click('#add-recipe'); await sheetOpen(page);
    await page.click('#add-ingredient');
    await page.locator('#ingredient-editor input').first().focus();
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'INPUT');
    const heading = await page.locator('#recipe-dialog h2').boundingBox();
    await page.touchscreen.tap(heading.x + 3, heading.y + 3);
    assert.equal(await page.evaluate(() => typeof document.activeElement?.name === 'string' && document.activeElement.matches('input,textarea,select')), false);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

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

  test('Dunkelmodus: Farben und Statusleistenfarbe folgen der Einstellung (Standard ist Blau)', async () => {
    const { ctx, page } = await context({ context: { colorScheme: 'light' } });
    await open(page);
    assert.equal(await page.getAttribute('#theme-color', 'content'), '#ecf0f9', 'hell: Pastellblau');
    await openSettings(page);
    await page.selectOption('#theme', 'dark');
    assert.equal(await page.getAttribute('#theme-color', 'content'), '#0f182e', 'dunkel: Dunkelblau, nicht mehr Dunkelgrün');
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(15, 24, 46)');
    await ctx.close();
  });

  // Farbwahl: sechs Farben, hell als Pastell und dunkel als tiefer Ton; gemerkt pro Gerät, schon vor dem ersten Anzeigen angewendet
  const PALETTES = ['blau', 'gruen', 'tuerkis', 'flieder', 'rose', 'pfirsich'];
  const colorOf = (page, token) => page.evaluate(name => {
    const probe = document.createElement('i'); probe.style.color = `var(${name})`; document.body.append(probe);
    const color = getComputedStyle(probe).color.match(/[\d.]+/g).slice(0, 3).map(Number); probe.remove(); return color;
  }, token);
  const luminance = rgb => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + .05) / (lo + .05); };

  test('Farbwahl: Auswahl in den Einstellungen wirkt sofort, bleibt nach dem Neuladen und färbt die Statusleiste', async () => {
    const { ctx, page, problems } = await context({ context: { colorScheme: 'dark' } });
    await open(page);
    assert.equal(await page.getAttribute('html', 'data-palette'), 'blau');
    await openSettings(page);
    assert.equal(await page.locator('#palette button').count(), 6);
    assert.equal(await page.locator('#palette button[aria-checked=true]').getAttribute('data-palette'), 'blau');
    const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.locator('#palette button[data-palette=rose]').scrollIntoViewIfNeeded();
    await page.click('#palette button[data-palette=rose]');
    assert.equal(await page.getAttribute('html', 'data-palette'), 'rose');
    assert.equal(await page.locator('#palette button[aria-checked=true]').getAttribute('data-palette'), 'rose');
    const after = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.notEqual(after, before, 'der Hintergrund hat die Farbe gewechselt');
    assert.equal(await page.getAttribute('#theme-color', 'content'), '#2e0f1a', 'Statusleiste: dunkles Rosé');
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1'))).palette, 'rose');
    // Nach dem Neuladen steht die Farbe schon vor dem Start der App (theme.js im Kopf der Seite)
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    assert.equal(await page.getAttribute('html', 'data-palette'), 'rose');
    await openSettings(page);
    assert.equal(await page.locator('#palette button[aria-checked=true]').getAttribute('data-palette'), 'rose');
    // Hell wird es ein Pastellton; Darstellung und Farbe sind unabhängig
    await page.selectOption('#theme', 'light');
    assert.equal(await page.getAttribute('#theme-color', 'content'), '#f9ecf0');
    assert.equal(await page.getAttribute('html', 'data-palette'), 'rose');
    // Eine unbekannte gemerkte Farbe fällt auf Blau zurück
    await page.evaluate(() => localStorage.setItem('einkauf-settings-v1', JSON.stringify({ actor: 'Nico', palette: 'gelb' })));
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    assert.equal(await page.getAttribute('html', 'data-palette'), 'blau');
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Farbwahl: Beim Trennen der Verbindung bleibt die Farbe', async () => {
    const remote = github(structuredClone(demo));
    const { ctx, page, problems } = await context({ config: { ...connectedConfig, palette: 'flieder' }, context: { colorScheme: 'light' } });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page);
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    assert.equal(await page.getAttribute('html', 'data-palette'), 'flieder');
    await page.click('[data-tab=settings]');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#connection-details summary').click();
    await page.click('#disconnect');
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('einkauf-settings-v1')).token);
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1'))).palette, 'flieder');
    assert.equal(await page.getAttribute('html', 'data-palette'), 'flieder');
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  for (const scheme of ['light', 'dark']) {
    test(`Farbwahl: Alle Farben bleiben gut lesbar (${scheme}, Kontrast mindestens 4,5 : 1)`, async () => {
      const { ctx, page } = await context({ context: { colorScheme: scheme } });
      await open(page);
      for (const palette of PALETTES) {
        await page.evaluate(name => { document.documentElement.dataset.palette = name; }, palette);
        const c = {}; for (const token of ['--bg', '--card', '--text', '--muted', '--accent', '--accent-soft', '--on-accent', '--danger']) c[token] = await colorOf(page, token);
        for (const [a, b] of [['--text', '--bg'], ['--text', '--card'], ['--muted', '--bg'], ['--muted', '--card'], ['--accent', '--bg'], ['--accent', '--card'],
          ['--on-accent', '--accent'], ['--accent', '--accent-soft'], ['--text', '--accent-soft'], ['--danger', '--card']]) {
          assert.ok(contrast(c[a], c[b]) >= 4.5, `${scheme}/${palette}: ${a} auf ${b} nur ${contrast(c[a], c[b]).toFixed(2)} : 1`);
        }
      }
      await ctx.close();
    });
  }

  test('Offline: App und Texterkennung starten ohne Netz, Update-Hinweis erscheint', async () => {
    const { ctx, page, problems } = await context({ context: { serviceWorkers: 'allow' } });
    await open(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
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
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
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
    await expandForm(page); await page.fill('#item-form input[name=unit]', 'Flasche');
    await add('Xyzzy');
    assert.equal(await page.locator('#items .group-head', { hasText: 'Getränke' }).locator('.count').textContent(), '2');
    assert.ok(!(await heads()).includes('Sonstiges'));
    // Erledigt steht unten.
    await page.locator('.item', { hasText: 'Butter' }).locator('.check').click();
    const all = await heads(); assert.equal(all.at(-1), 'Erledigt');
    // Abschalten.
    await openSettings(page); await page.uncheck('#group-items'); await page.click('[data-tab=shopping]');
    assert.equal(await page.locator('#items .group-head').count(), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Gleiche Artikel werden zusammengezählt; Rezept-Zutaten zählen zur Liste dazu', async () => {
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
    assert.match(await page.textContent('#notice-text'), /„Bananen“: jetzt 5 Stück/);
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
    assert.match(await page.textContent('#notice-text'), /dazugezählt/);
    await page.getByRole('tab', { name: /^Edeka/ }).click();
    assert.equal(await rows('Nudeln').count(), 1);
    assert.match(await rows('Nudeln').textContent(), /700 g/);
    assert.match(await rows('Tomaten').first().textContent(), /1,6 kg/);
    assert.equal(await page.getByRole('button', { name: 'Rückgängig' }).count(), 0, 'Es gibt keinen Rückgängig-Knopf');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Vorrat: in den Einstellungen pflegen, beim Übernehmen vorab abgewählt, abgewählte Zutaten merken', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await openSettings(page);
    for (const name of ['Nudeln', 'olivenöl']) { await page.fill('#pantry-form input[name=name]', name); await page.click('#pantry-form button'); }
    await page.fill('#pantry-form input[name=name]', 'NUDELN'); await page.click('#pantry-form button');   // Doppelte werden nicht angelegt
    assert.deepEqual(await page.locator('#pantry-list li span').allTextContents(), ['Nudeln', 'olivenöl']);
    const card = page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' });
    await page.click('[data-tab=recipes]');
    await card.locator('summary').click();
    await card.getByRole('button', { name: 'Auf die Liste' }).click();
    await sheetOpen(page);
    const row = name => page.locator('#transfer-ingredients .transfer-row', { hasText: name });
    assert.equal(await row('Nudeln').locator('input').isChecked(), false);
    assert.equal(await row('Nudeln').locator('.pantry-badge').count(), 1);
    assert.equal(await row('Tomaten').locator('input').isChecked(), true);
    assert.equal(await row('Tomaten').locator('.pantry-badge').count(), 0);
    // Tomaten für dieses Mal abwählen und als Vorrat merken
    await row('Tomaten').locator('input').uncheck();
    await page.check('#transfer-form input[name=rememberPantry]');
    await page.click('#transfer-form button:not([data-close])');
    await page.waitForSelector('#transfer-dialog', { state: 'hidden' });
    assert.match(await page.textContent('#notice-text'), /in den Vorrat/);
    await openSettings(page);
    assert.ok((await page.locator('#pantry-list li span').allTextContents()).includes('Tomaten'));
    // Entfernen
    await page.getByRole('button', { name: 'Tomaten aus dem Vorrat entfernen' }).click();
    await page.getByRole('button', { name: 'Nudeln aus dem Vorrat entfernen' }).click();
    assert.deepEqual(await page.locator('#pantry-list li span').allTextContents(), ['olivenöl']);
    // Wochenliste: Vorrat ebenfalls gekennzeichnet
    await page.click('[data-tab=plan]'); await page.click('.day-head .icon-button');
    await page.selectOption('#meal-form select[name=recipeId]', { label: 'Tomaten-Pasta' }); await page.click('#meal-form button[type=submit]');
    await page.click('#plan-shopping'); await sheetOpen(page);
    assert.equal(await page.locator('#week-ingredients .transfer-row', { hasText: 'Olivenöl' }).locator('input').isChecked(), false);
    assert.equal(await page.locator('#week-ingredients .pantry-badge').count(), 1);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Kassenbon: Text einfügen, prüfen, Preise merken, Zuordnung lernen, Preisänderung rot und grün', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const dated = days => { const day = new Date(Date.now() - days * 86400000); return `${String(day.getDate()).padStart(2, '0')}.${String(day.getMonth() + 1).padStart(2, '0')}.${day.getFullYear()}`; };
    const comma = cents => (cents / 100).toFixed(2).replace('.', ',');
    const bon = (milk, tomato, days) => `REWE Markt GmbH\nMusterstraße 1\nHAFERDRINK BIO 1L     ${comma(milk)} B\nKIRSCHTOMATEN 250G     ${comma(tomato)} B\nSUMME     EUR  ${comma(milk + tomato)}\nGeg. Karte ${comma(milk + tomato)}\nDatum: ${dated(days)}`;
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base);
    const parse = async text => {
      await page.click('#open-receipt'); await sheetOpen(page);
      await page.fill('#receipt-form textarea[name=text]', text); await page.click('#receipt-parse');
      await page.waitForSelector('#receipt-review:not([hidden])');
    };
    const note = index => page.locator('#receipt-lines .receipt-line').nth(index).locator('.receipt-note');
    // 1. Erster Bon: Geschäft aus dem Bon, Summenprobe, Zuordnung „Kirschtomaten“ → „Cherrytomaten“ von Hand
    await parse(bon(129, 199, 10));
    assert.equal(await page.inputValue('#receipt-form select[name=storeId]'), 'store-rewe');
    assert.equal(await page.locator('#receipt-lines .receipt-line').count(), 2);
    assert.match(await page.textContent('#receipt-check'), /Summe stimmt/);
    assert.match(await note(0).textContent(), /neu in der Preisliste/);
    await page.locator('#receipt-lines .receipt-line').nth(1).locator('input[name=name]').fill('Cherrytomaten');
    await page.click('#receipt-save');
    await page.waitForSelector('#receipt-dialog', { state: 'hidden' });
    assert.match(await page.textContent('#notice-text'), /2 Preise gemerkt/);
    let data = await stored();
    const price = name => data.prices.filter(row => row.name === name && row.storeId === 'store-rewe').at(-1);   // neueste Notiz (die Beispieldaten enthalten schon Preise)
    assert.deepEqual(price('Haferdrink Bio').quote, { cents: 129, quantity: 1, unit: 'l' });
    assert.deepEqual(price('Cherrytomaten').quote, { cents: 199, quantity: 250, unit: 'g' });
    assert.ok(data.aliases.some(row => row.from === 'kirschtomaten' && row.name === 'Cherrytomaten'), 'Zuordnung gemerkt');
    // 2. Zweiter Bon: gemerkte Zuordnung, Milch ist teurer geworden
    await parse(bon(139, 199, 3));
    assert.equal(await page.locator('#receipt-lines .receipt-line').nth(1).locator('input[name=name]').inputValue(), 'Cherrytomaten');
    assert.match(await note(1).textContent(), /Zuordnung gemerkt/);
    assert.match(await note(0).textContent(), /▲ Teurer: 1,29\s€ → 1,39\s€/);
    assert.ok(await note(0).evaluate(node => node.classList.contains('trend') && node.classList.contains('up')));
    assert.ok(!(await note(1).textContent()).includes('Teurer'), 'unveränderter Preis: keine Meldung');
    await page.click('#receipt-save'); await page.waitForSelector('#receipt-dialog', { state: 'hidden' });
    assert.match(await page.textContent('#notice-text'), /2 Preise gemerkt · 1 teurer/);
    // 3. Auf der Liste steht der Hinweis rot am Artikel
    await page.getByRole('tab', { name: /^Rewe/ }).click();
    await page.fill('#item-form input[name=name]', 'Haferdrink Bio'); await page.fill('#item-form input[name=unit]', 'l'); await page.click('#item-form button[type=submit]');
    const row = page.locator('#items .item', { hasText: 'Haferdrink' });
    assert.match(await row.textContent(), /▲ Teurer: 1,29\s€ → 1,39\s€ je l \(\+8 %\)/);
    assert.ok(await row.locator('small.trend.up').count() === 1);
    // 4. Dritter Bon: günstiger, grün; ein Aktionspreis ist keine Änderung
    await parse(bon(119, 199, 1).replace('KIRSCHTOMATEN 250G     1,99 B', 'KIRSCHTOMATEN 250G     1,99 B\nPreisvorteil          -0,50'));
    assert.match(await note(0).textContent(), /▼ Günstiger: 1,39\s€ → 1,19\s€/);
    assert.ok(await note(0).evaluate(node => node.classList.contains('down')));
    assert.match(await note(1).textContent(), /Aktion: bezahlt 1,49\s€/);
    assert.ok(!(await note(1).textContent()).includes('Teurer') && !(await note(1).textContent()).includes('Günstiger'));
    await page.keyboard.press('Escape');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Kassenbon: Text ohne Artikelzeilen, Summe stimmt nicht, schon eingetragene Zeilen sind abgewählt', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('#open-receipt'); await sheetOpen(page);
    await page.fill('#receipt-form textarea[name=text]', 'Das ist kein Kassenbon.'); await page.click('#receipt-parse');
    assert.match(await page.textContent('#receipt-dialog [data-dialog-error]'), /keine Artikelzeilen/);
    const day = new Date(Date.now() - 86400000), stamp = `${String(day.getDate()).padStart(2, '0')}.${String(day.getMonth() + 1).padStart(2, '0')}.${day.getFullYear()}`;
    await page.fill('#receipt-form textarea[name=text]', `Lidl\nGurke 0,79 A\nButter 1,99 A\nSUMME 3,50\nDatum ${stamp}`); await page.click('#receipt-parse');
    assert.match(await page.textContent('#receipt-check'), /Achtung: Die erkannten Zeilen ergeben 2,78\s€, der Bon nennt 3,50\s€/);
    await page.click('#receipt-save'); await page.waitForSelector('#receipt-dialog', { state: 'hidden' });
    // Derselbe Bon noch einmal: alles schon eingetragen und abgewählt
    await page.click('#open-receipt'); await sheetOpen(page);
    await page.fill('#receipt-form textarea[name=text]', `Lidl\nGurke 0,79 A\nButter 1,99 A\nSUMME 2,78\nDatum ${stamp}`); await page.click('#receipt-parse');
    assert.equal(await page.locator('#receipt-lines input[type=checkbox]:checked').count(), 0);
    assert.match(await page.locator('#receipt-lines .receipt-note').first().textContent(), /Schon eingetragen/);
    await page.click('#receipt-save');
    assert.match(await page.textContent('#receipt-dialog [data-dialog-error]'), /mindestens eine Zeile/);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  // ---- Ausgaben (Version 2.15) ----
  const isoDay = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const monthsAgo = (count, day = 15) => new Date(new Date().getFullYear(), new Date().getMonth() - count, day, 12);
  const monthWord = date => new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(date);
  const addPurchase = async (page, { amount, date, store = '', note = '' }) => {
    await page.click('#add-purchase'); await sheetOpen(page);
    await page.fill('#purchase-form input[name=amount]', amount);
    if (date) await page.fill('#purchase-form input[name=date]', date);
    await page.selectOption('#purchase-form select[name=storeId]', store ? { label: store } : '');
    if (note) await page.fill('#purchase-form input[name=note]', note);
    await page.click('#purchase-save');
  };

  test('Ausgaben: von Hand eintragen, Monate vergleichen, Diagramm, nach Geschäft, ändern und löschen', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const today = isoDay(new Date()), before = monthsAgo(1);
    await page.click('[data-tab=spending]');
    assert.match(await page.textContent('#spending-summary'), /0,00\s€[\s\S]*noch nichts eingetragen/);
    assert.match(await page.textContent('#purchase-list'), /Noch nichts eingetragen/);
    assert.ok(await page.locator('#month-prev').isDisabled() && await page.locator('#month-next').isDisabled(), 'ohne Einträge gibt es keinen anderen Monat');
    assert.ok(await page.locator('#month-today').isHidden());
    assert.equal(await page.locator('#spending-chart button').count(), 6);
    // 1. Ein Betrag von Hand, Datum ist heute
    await page.click('#add-purchase'); await sheetOpen(page);
    assert.equal(await page.inputValue('#purchase-form input[name=date]'), today);
    assert.equal(await page.locator('#purchase-delete').isHidden(), true);
    assert.equal(await page.inputValue('#purchase-form input[name=note]'), 'Wocheneinkauf', 'neue Einträge beginnen mit „Wocheneinkauf“');
    await page.fill('#purchase-form input[name=amount]', '23,45');
    await page.click('#purchase-save'); await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
    assert.match(await page.textContent('#notice-text'), /23,45\s€ unter Ausgaben gespeichert/);
    assert.match(await page.textContent('#spending-summary'), /Bisher ausgegeben[\s\S]*23,45\s€[\s\S]*1 Einkauf · Ø 23,45\s€/);
    assert.match(await page.textContent('#purchase-list'), /Ohne Geschäft · Wocheneinkauf[\s\S]*23,45\s€/);
    // 2. Letzter Monat: Die Ansicht wechselt dorthin, „Dieser Monat“ führt zurück, Vergleich mit dem Vormonat
    await addPurchase(page, { amount: '1.000,00', date: isoDay(before), store: 'Lidl' });
    assert.match(await page.textContent('#month-label'), new RegExp(monthWord(before)));
    assert.match(await page.textContent('#spending-summary'), /1\.000,00\s€/);
    assert.ok(await page.locator('#month-today').isVisible());
    await page.click('#month-today');
    assert.match(await page.textContent('#spending-summary'), /23,45\s€/);
    assert.match(await page.textContent('#spending-summary'), new RegExp(`▼ 976,55\\s€ weniger als im ${monthWord(before)} \\(−98\\s%\\)`));
    assert.ok(await page.locator('#spending-summary .trend.down').count() === 1);
    // 3. Säulendiagramm: sechs Monate, der gewählte ist markiert, ein Tipp wechselt den Monat
    const bars = page.locator('#spending-chart button');
    assert.equal(await bars.count(), 6);
    assert.equal(await page.locator('#spending-chart [aria-current=true]').count(), 1);
    const heights = await page.locator('#spending-chart .bar').evaluateAll(nodes => nodes.map(node => parseFloat(node.style.height)));
    assert.ok(heights[4] > heights[5] && heights[5] >= 3 && heights.slice(0, 4).every(height => height === 2), `Säulenhöhen: ${heights}`);
    assert.match(await bars.nth(4).getAttribute('aria-label'), /1\.000,00\s€/);
    await bars.nth(4).click();
    assert.match(await page.textContent('#month-label'), new RegExp(monthWord(before)));
    assert.match(await page.textContent('#spending-summary'), /Ausgegeben[\s\S]*1\.000,00/);
    assert.ok(await page.locator('#month-next').isEnabled() && await page.locator('#month-prev').isDisabled(), 'vor dem ersten Eintrag geht es nicht weiter zurück');
    await page.click('#month-next');
    // 4. Aufteilung nach Geschäft erst ab zwei Gruppen
    assert.ok(await page.locator('#spending-stores-card').isHidden());
    await addPurchase(page, { amount: '10', store: 'Lidl' });
    assert.ok(await page.locator('#month-today').isHidden(), 'der neue Eintrag liegt im aktuellen Monat, die Ansicht bleibt dort');
    assert.ok(await page.locator('#spending-stores-card').isVisible());
    assert.deepEqual(await page.locator('#spending-stores .spend-store-head').evaluateAll(nodes => nodes.map(node => [...node.children].map(child => child.textContent.replace(/\s+/g, ' ').trim()).join(' | '))), ['Ohne Geschäft | 23,45 €', 'Lidl | 10,00 €']);
    // 5. Ändern: Betrag und Geschäft, dann löschen
    await page.locator('#purchase-list .spend-row', { hasText: '23,45' }).click(); await sheetOpen(page);
    assert.equal(await page.textContent('#purchase-title'), 'Einkauf ändern');
    assert.equal(await page.inputValue('#purchase-form input[name=amount]'), '23,45');
    assert.equal(await page.inputValue('#purchase-form input[name=note]'), 'Wocheneinkauf');
    await page.fill('#purchase-form input[name=amount]', '30'); await page.selectOption('#purchase-form select[name=storeId]', { label: 'Edeka' }); await page.fill('#purchase-form input[name=note]', '');
    await page.click('#purchase-save'); await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
    assert.match(await page.textContent('#spending-summary'), /40,00\s€[\s\S]*2 Einkäufe · Ø 20,00\s€/);
    assert.match(await page.locator('#purchase-list .spend-row', { hasText: 'Edeka' }).textContent(), /Edeka[\s\S]*30,00\s€/);
    assert.ok(!/Wocheneinkauf/.test(await page.locator('#purchase-list .spend-row', { hasText: '30,00' }).textContent()), 'die geleerte Notiz bleibt leer (kein Standard beim Ändern)');
    await page.locator('#purchase-list .spend-row', { hasText: 'Edeka' }).click(); await sheetOpen(page);
    await page.selectOption('#purchase-form select[name=storeId]', ''); await page.click('#purchase-save');
    assert.match(await page.textContent('#purchase-list'), /Ohne Geschäft[\s\S]*30,00\s€/);
    await page.locator('#purchase-list .spend-row', { hasText: '30,00' }).click(); await sheetOpen(page);
    await page.click('#purchase-delete'); await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
    assert.match(await page.textContent('#spending-summary'), /10,00\s€[\s\S]*1 Einkauf/);
    // 6. Nach dem Neuladen noch da (Beispielmodus speichert auf dem Gerät)
    await open(page); await page.click('[data-tab=spending]');
    assert.match(await page.textContent('#spending-summary'), /10,00\s€/);
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Ausgaben: ungültige Eingaben werden mit verständlicher Meldung abgelehnt und nichts wird gespeichert', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('[data-tab=spending]');
    const farFuture = isoDay(new Date(Date.now() + 5 * 86400000));
    const attempts = [['', null, /Betrag in Euro eingeben/], ['0', null, /größer als 0/], ['abc', null, /Betrag in Euro eingeben/], ['12,345', null, /Betrag in Euro eingeben/], ['-5', null, /Betrag in Euro eingeben/],
      ['100.000,00', null, /zu groß/], ['5', '', /gültiges Datum/], ['5', farFuture, /Zukunft/]];
    await page.click('#add-purchase'); await sheetOpen(page);
    for (const [amount, date, pattern] of attempts) {
      await page.fill('#purchase-form input[name=amount]', amount);
      if (date !== null) await page.fill('#purchase-form input[name=date]', date);
      await page.click('#purchase-save');
      assert.match(await page.textContent('#purchase-dialog [data-dialog-error]'), pattern, `Eingabe ${amount} / ${date}`);
      assert.ok(await page.locator('#purchase-dialog').evaluate(node => node.open), 'das Fenster bleibt offen');
      if (date !== null) await page.fill('#purchase-form input[name=date]', isoDay(new Date()));
    }
    await page.keyboard.press('Escape');
    assert.match(await page.textContent('#purchase-list'), /Noch nichts eingetragen/);
    assert.match(await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.purchases || [])), /^\[\]$/);
    // Morgen ist erlaubt (Zeitunterschiede), auch 1.234,56 und „€ 12“
    await addPurchase(page, { amount: '€ 12', date: isoDay(new Date(Date.now() + 86400000)) });
    assert.equal(await page.locator('#purchase-dialog[open]').count(), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  const spendCenter = async locator => { const box = await locator.boundingBox(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; };
  const spendHold = async (page, text) => {
    const row = page.locator('#purchase-list .spend-row', { hasText: text });
    await row.evaluate(node => node.scrollIntoView({ block: 'center' }));
    const box = await row.boundingBox(), at = { x: box.x + 40, y: box.y + box.height / 2 };
    await page.mouse.move(at.x, at.y); await page.mouse.down();
    return { row, at };
  };

  for (const width of [280, 320, 390]) {
    test(`Ausgaben: grünes „+“ im Betragsfeld sobald ein Betrag steht; Tipp darauf fügt hinzu und schließt die Tastatur (${width} px)`, async () => {
      const { ctx, page, problems } = await context({ context: { viewport: { width, height: 760 } } });
      await open(page);
      await page.click('[data-tab=spending]');
      await page.click('#add-purchase'); await sheetOpen(page);
      const amount = page.locator('#purchase-form input[name=amount]'), plus = page.locator('#purchase-plus');
      const typing = () => page.evaluate(() => document.activeElement.matches('input,textarea,select'));
      // Leeres Feld: kein „+“; mit Betrag erscheint es rechts im Feld, der Text endet davor
      assert.equal(await plus.isVisible(), false, 'leeres Feld: kein „+“');
      await amount.fill('1234,56');
      assert.equal(await plus.isVisible(), true);
      const box = await plus.boundingBox(), field = await amount.boundingBox();
      assert.ok(box.x >= field.x && box.x + box.width <= field.x + field.width && box.y >= field.y && box.y + box.height <= field.y + field.height, 'das „+“ liegt im Feld');
      assert.ok(field.x + field.width - (box.x + box.width) < 10, 'ganz rechts');
      assert.ok(await amount.evaluate(node => parseFloat(getComputedStyle(node).paddingRight)) >= box.width + 6, 'der Text endet vor dem „+“');
      assert.ok(box.width >= 40 && box.height >= 36, 'groß genug zum Tippen');
      assert.ok(await plus.evaluate(node => getComputedStyle(node).backgroundColor !== 'rgba(0, 0, 0, 0)'), 'farbig (Akzentfarbe) gefüllt');
      assert.equal(await horizontalOverflow(page), 0);
      assert.ok(await page.evaluate(() => { const dialog = document.querySelector('dialog[open]'); return dialog.scrollWidth <= dialog.clientWidth; }), 'Dialog läuft nicht über');
      await amount.fill('');
      assert.equal(await plus.isVisible(), false, 'Betrag gelöscht: „+“ weg');
      // Tipp auf das „+“: gespeichert, Fenster zu, nichts mehr im Fokus (Tastatur zu)
      await amount.focus(); await amount.fill('23,45');
      await page.touchscreen.tap(...Object.values(await spendCenter(plus)));
      await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
      assert.match(await page.textContent('#spending-summary'), /23,45\s€/);
      assert.equal(await typing(), false, 'kein Feld mehr im Fokus');
      // Fehlt etwas, schließt der Tipp auf das „+“ trotzdem die Tastatur und die Meldung bleibt sichtbar.
      // iOS-Safari gibt Knöpfen beim Antippen keinen Fokus: Das Eingabefeld behielte ihn (und die Tastatur) ohne ausdrückliches Schließen.
      await page.evaluate(() => document.addEventListener('mousedown', event => { if (event.target.closest('button')) event.preventDefault(); }, true));
      await page.click('#add-purchase'); await sheetOpen(page);
      await amount.focus(); await amount.fill('0');
      await page.touchscreen.tap(...Object.values(await spendCenter(plus)));
      await page.waitForSelector('#purchase-dialog [data-dialog-error]:not([hidden])');
      assert.match(await page.textContent('#purchase-dialog [data-dialog-error]'), /größer als 0/);
      assert.equal(await typing(), false, 'Tastatur zu, obwohl nichts gespeichert wurde');
      assert.ok(await page.locator('#purchase-dialog').evaluate(node => node.open));
      // Ein Tipp ins Feld öffnet die Tastatur wieder; die Eingabetaste speichert weiterhin
      await page.touchscreen.tap(...Object.values(await spendCenter(amount)));
      assert.equal(await page.evaluate(() => document.activeElement.name), 'amount');
      await amount.fill('7,50'); await page.keyboard.press('Enter');
      await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
      assert.match(await page.textContent('#spending-summary'), /30,95\s€/);
      assert.deepEqual(problems, []);
      await ctx.close();
    });
  }

  test('Ausgaben: Notiz beginnt mit „Wocheneinkauf“, ein Tipp ins Feld zeigt Vorschläge, ein Tipp darauf übernimmt sie; eigene Notizen werden mitgelernt', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('[data-tab=spending]');
    const note = page.locator('#purchase-form input[name=note]'), picks = page.locator('#purchase-note-picks'), chips = () => picks.locator('.chip').allTextContents();
    const focusedName = () => page.evaluate(() => document.activeElement?.name || document.activeElement?.tagName);
    await page.click('#add-purchase'); await sheetOpen(page);
    assert.equal(await note.inputValue(), 'Wocheneinkauf');
    assert.equal(await picks.isVisible(), false, 'ohne Tipp ins Feld keine Vorschläge');
    // Tipp ins Feld: Vorschläge erscheinen, der Standard ist markiert und der Text ausgewählt (Tippen ersetzt ihn)
    await page.touchscreen.tap(...Object.values(await spendCenter(note)));
    await page.waitForSelector('#purchase-note-picks:not([hidden])');
    assert.equal(await focusedName(), 'note');
    assert.deepEqual((await chips()).slice(0, 4), ['Wocheneinkauf', 'Großeinkauf', 'Zwischendurch', 'Getränke']);
    assert.equal(await picks.locator('.chip[aria-pressed=true]').textContent(), 'Wocheneinkauf');
    assert.equal(await note.evaluate(node => node.selectionEnd - node.selectionStart), 'Wocheneinkauf'.length);
    // Ein Tipp auf einen Vorschlag übernimmt ihn, schließt die Tastatur und blendet die Vorschläge aus
    await picks.locator('.chip', { hasText: 'Getränke' }).tap();
    assert.equal(await note.inputValue(), 'Getränke');
    assert.equal(await picks.isVisible(), false);
    assert.notEqual(await focusedName(), 'note', 'Tastatur zu');
    await page.fill('#purchase-form input[name=amount]', '5'); await page.click('#purchase-save');
    assert.match(await page.textContent('#purchase-list'), /Getränke[\s\S]*5,00\s€/);
    // Eigene Notiz tippen: wird beim nächsten Mal vorgeschlagen (häufigste zuerst, nach dem Standard)
    for (const amount of ['6', '7']) {
      await page.click('#add-purchase'); await sheetOpen(page);
      assert.equal(await note.inputValue(), 'Wocheneinkauf', 'jeder neue Eintrag beginnt wieder mit dem Standard');
      await note.fill('Grillabend'); await page.fill('#purchase-form input[name=amount]', amount); await page.click('#purchase-save');
    }
    await page.click('#add-purchase'); await sheetOpen(page);
    await note.focus();
    assert.deepEqual((await chips()).slice(0, 4), ['Wocheneinkauf', 'Grillabend', 'Getränke', 'Großeinkauf']);
    assert.equal(new Set(await chips()).size, (await chips()).length, 'keine doppelten Vorschläge');
    assert.ok((await chips()).length <= 8);
    // Ein Tipp auf „Wocheneinkauf“ setzt den Standard zurück; Tippen im Feld zeigt weiter alle Vorschläge
    await note.fill('Gri'); assert.ok((await chips()).includes('Grillabend'));
    await picks.locator('.chip', { hasText: 'Wocheneinkauf' }).click();
    assert.equal(await note.inputValue(), 'Wocheneinkauf');
    // Ein Tipp daneben blendet die Vorschläge wieder aus
    await note.focus(); await page.waitForSelector('#purchase-note-picks:not([hidden])');
    await page.click('#purchase-title'); await page.waitForSelector('#purchase-note-picks', { state: 'hidden' });
    await page.keyboard.press('Escape');
    // Beim Ändern bleibt die Notiz, wie sie ist: leer bleibt leer, es gibt keinen Standard
    await page.locator('#purchase-list .spend-row', { hasText: '5,00' }).click(); await sheetOpen(page);
    assert.equal(await note.inputValue(), 'Getränke');
    await note.fill(''); await page.click('#purchase-save'); await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
    await page.locator('#purchase-list .spend-row', { hasText: '5,00' }).click(); await sheetOpen(page);
    assert.equal(await note.inputValue(), '', 'geleerte Notiz bleibt leer');
    assert.equal(await picks.isVisible(), false);
    await note.focus(); assert.ok((await chips()).includes('Wocheneinkauf'), 'auch beim Ändern gibt es Vorschläge');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Ausgaben: Eintrag lange halten und in den roten Mülleimer ziehen löscht ihn; kurzer Tipp ändert weiter, Loslassen daneben und Escape löschen nichts', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('[data-tab=spending]');
    for (const amount of ['11,11', '22,22', '33,33']) await addPurchase(page, { amount, note: `Notiz ${amount.slice(0, 2)}` });
    const amounts = () => page.locator('#purchase-list .spend-amount').allTextContents().then(list => list.map(text => text.replace(/\s/g, ' ')));
    assert.equal((await amounts()).length, 3);
    const width = await page.evaluate(() => innerWidth);
    // Halten und neben der Fläche loslassen: nichts gelöscht, nichts geöffnet
    let { at } = await spendHold(page, '22,22');
    await page.waitForSelector('.drag-ghost');
    assert.equal(await page.locator('#trash-zone.show').count(), 1, 'rote Fläche erscheint');
    assert.equal(await page.locator('#trash-zone.hot').count(), 0);
    await page.mouse.move(at.x + 60, at.y, { steps: 4 });
    await page.mouse.up();
    await page.waitForSelector('.drag-ghost', { state: 'detached' });
    assert.equal((await amounts()).length, 3, 'nicht in der Fläche losgelassen: nichts gelöscht');
    assert.equal(await page.locator('dialog[open]').count(), 0, 'das Loslassen nach langem Halten öffnet die Bearbeitung nicht');
    assert.equal(await page.locator('#purchase-list .spend-item.drag-origin').count(), 0);
    // Wer sich vor Ablauf der Haltezeit bewegt, scrollt nur
    ({ at } = await spendHold(page, '22,22'));
    await page.mouse.move(4, at.y + 40, { steps: 3 }); await page.waitForTimeout(650);
    assert.equal(await page.locator('.drag-ghost').count(), 0);
    await page.mouse.up();
    // Escape bricht ab
    ({ at } = await spendHold(page, '22,22'));
    await page.waitForSelector('.drag-ghost');
    await page.mouse.move(width - 30, at.y, { steps: 5 });
    await page.waitForSelector('#trash-zone.hot');
    await page.keyboard.press('Escape'); await page.mouse.up();
    await page.waitForSelector('.drag-ghost', { state: 'detached' });
    assert.equal((await amounts()).length, 3, 'abgebrochen: nichts gelöscht');
    // Kurzer Tipp öffnet weiterhin die Bearbeitung
    await page.locator('#purchase-list .spend-row', { hasText: '22,22' }).click(); await sheetOpen(page);
    assert.equal(await page.inputValue('#purchase-form input[name=amount]'), '22,22');
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
    // In die Fläche ziehen und loslassen löscht
    ({ at } = await spendHold(page, '22,22'));
    await page.waitForSelector('.drag-ghost');
    await page.mouse.move(at.x + 80, at.y, { steps: 4 });
    assert.equal(await page.locator('#trash-zone.hot').count(), 0, 'noch nicht an der Fläche');
    await page.mouse.move(width - 40, at.y, { steps: 6 });
    await page.waitForSelector('#trash-zone.hot');
    await page.mouse.up();
    await page.waitForFunction(() => ![...document.querySelectorAll('#purchase-list .spend-amount')].some(node => /22,22/.test(node.textContent)));
    assert.equal(await page.locator('.drag-ghost').count(), 0);
    assert.equal(await page.locator('#trash-zone.show').count(), 0, 'Fläche verschwindet wieder');
    assert.match(await page.textContent('#notice-text'), /22,22\s€ gelöscht/);
    assert.match(await page.textContent('#spending-summary'), /44,44\s€[\s\S]*2 Einkäufe/);
    assert.equal((await amounts()).length, 2, 'die anderen Einträge bleiben');
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Ausgaben: Löschen per Ziehen mit dem Finger (Touch) kommt auf GitHub an; die Seite scrollt dabei nicht mit', async () => {
    const remote = github(structuredClone(demo));
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    await page.click('[data-tab=spending]');
    for (const amount of ['11,11', '22,22']) await addPurchase(page, { amount });
    await synced(page);
    await page.evaluate(() => { document.body.style.minHeight = '3000px'; });
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const row = page.locator('#purchase-list .spend-row', { hasText: '22,22' });
    await row.evaluate(node => node.scrollIntoView({ block: 'center' }));
    const scrolled = await page.evaluate(() => scrollY), at = await spendCenter(row), width = await page.evaluate(() => innerWidth);
    await touch('touchStart', at.x - 60, at.y);
    await page.waitForSelector('.drag-ghost');
    for (let step = 1; step <= 8; step++) await touch('touchMove', at.x - 60 + (width - 30 - at.x + 60) * step / 8, at.y + step * 6);
    await page.waitForSelector('#trash-zone.hot');
    assert.equal(await page.evaluate(() => scrollY), scrolled, 'die Seite hat nicht mitgescrollt');
    await touch('touchEnd');
    await page.waitForFunction(() => ![...document.querySelectorAll('#purchase-list .spend-amount')].some(node => /22,22/.test(node.textContent)));
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    const byCents = cents => remote.content.purchases.find(entry => entry.cents === cents);
    assert.ok(byCents(2222).deletedAt, 'Löschmarkierung liegt auf GitHub');
    assert.ok(!byCents(1111).deletedAt, 'der andere Eintrag bleibt');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Ausgaben: Layout bei 280, 320, 375 und 390 px, fünf Reiter ohne abgeschnittene Beschriftung', async () => {
    for (const viewport of [{ width: 280, height: 560 }, { width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }]) {
      const { ctx, page, problems } = await context({ context: { viewport } });
      await open(page);
      await page.click('[data-tab=spending]');
      for (const [amount, date, store] of [['1234,56', isoDay(monthsAgo(2)), 'Edeka'], ['987,65', isoDay(monthsAgo(1)), 'Lidl'], ['456,78', isoDay(new Date()), 'Rewe'], ['54,32', isoDay(new Date()), 'Lidl'], ['9999,99', isoDay(new Date()), '']]) {
        await addPurchase(page, { amount, date, store, note: 'Ein langer Hinweis zum Einkauf, der umbrechen muss, ohne etwas zu sprengen' });
      }
      assert.ok(await page.locator('#month-today').isHidden(), 'die zuletzt erfassten Einträge liegen im aktuellen Monat');
      assert.equal(await horizontalOverflow(page), 0, `Überlauf ${viewport.width}`);
      const tabs = await page.evaluate(() => [...document.querySelectorAll('.tabs button')].map(button => {
        const box = button.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(button.querySelector('.tab-label'));
        const text = range.getBoundingClientRect();
        return { name: button.textContent, fits: text.left >= box.left - 0.5 && text.right <= box.right + 0.5, left: box.left, right: box.right, textLeft: text.left, textRight: text.right };
      }));
      assert.equal(tabs.length, 5);
      assert.ok(tabs.every(tab => tab.fits), `Beschriftung ragt über den Reiter hinaus: ${JSON.stringify(tabs)}`);
      assert.ok(tabs.every(tab => tab.left >= 0 && tab.right <= viewport.width), 'Reiter ragen aus dem Bild');
      assert.ok(tabs.every((tab, index) => index === 0 || (tab.left >= tabs[index - 1].right - 0.5 && tab.textLeft >= tabs[index - 1].textRight)), 'Reiter oder Beschriftungen überlappen sich');
      const chart = await page.evaluate(() => [...document.querySelectorAll('#spending-chart .value')].map(node => node.scrollWidth <= node.clientWidth + 0.5));
      assert.ok(chart.every(Boolean), 'Zahlen über den Säulen werden abgeschnitten');
      const box = await page.locator('#spending-summary .spend-total').boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= viewport.width, 'Summe ragt aus dem Bild');
      assert.deepEqual(problems, []);
      await ctx.close();
    }
  });

  test('Ausgaben: Kassenbon-Text speichert den Gesamtbetrag mit, derselbe Bon wird nicht doppelt gezählt', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const day = new Date(Date.now() - 86400000), stamp = `${String(day.getDate()).padStart(2, '0')}.${String(day.getMonth() + 1).padStart(2, '0')}.${day.getFullYear()}`;
    const bon = `Lidl\nGurke 0,79 A\nButter 1,99 A\nSUMME 2,78\nDatum ${stamp}`;
    const parse = async () => {
      await page.click('[data-tab=shopping]'); await page.click('#open-receipt'); await sheetOpen(page);
      await page.fill('#receipt-form textarea[name=text]', bon); await page.click('#receipt-parse'); await page.waitForSelector('#receipt-review:not([hidden])');
    };
    await parse();
    assert.ok(await page.locator('#receipt-spend-label').isVisible());
    assert.match(await page.textContent('#receipt-spend-text'), /Gesamtbetrag 2,78\s€ unter Ausgaben speichern/);
    assert.ok(await page.locator('#receipt-form input[name=spend]').isChecked(), 'vorab angehakt');
    await page.click('#receipt-save'); await page.waitForSelector('#receipt-dialog', { state: 'hidden' });
    assert.match(await page.textContent('#notice-text'), /2 Preise gemerkt · 2,78\s€ unter Ausgaben/);
    await page.click('[data-tab=spending]');
    if (!(await page.locator('#purchase-list .spend-row').count())) await page.click('#month-prev');
    const rows = page.locator('#purchase-list .spend-row');
    assert.equal(await rows.count(), 1);
    assert.match(await rows.first().textContent(), /Lidl · vom Kassenbon[\s\S]*2,78\s€/);
    // Derselbe Bon noch einmal: nicht noch einmal angehakt, Preise lassen sich nicht erneut wählen (schon eingetragen), nichts doppelt
    await parse();
    assert.equal(await page.locator('#receipt-form input[name=spend]').isChecked(), false, 'schon unter Ausgaben');
    await page.locator('#receipt-lines input[type=checkbox]').first().check();
    await page.locator('#receipt-form input[name=spend]').check();
    await page.click('#receipt-save'); await page.waitForSelector('#receipt-dialog', { state: 'hidden' });
    const purchases = await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.purchases.filter(row => !row.deletedAt));
    assert.equal(purchases.length, 1, 'der Betrag wird auch bei gesetztem Häkchen nicht doppelt angelegt');
    assert.equal(purchases[0].cents, 278);
    assert.equal(purchases[0].source, 'bon');
    // Ohne Summe im Text: Summe der Zeilen
    await page.click('[data-tab=shopping]'); await page.click('#open-receipt'); await sheetOpen(page);
    await page.fill('#receipt-form textarea[name=text]', `Rewe\nMilch 1,29 A\nBrot 2,49 A\nDatum ${stamp}`); await page.click('#receipt-parse');
    assert.match(await page.textContent('#receipt-spend-text'), /3,78\s€ unter Ausgaben speichern \(Summe der erkannten Zeilen\)/);
    await page.keyboard.press('Escape');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Ausgaben: Foto oder Screenshot eines Kassenbons liest Summe, Datum und Geschäft als Vorschlag; Preise lassen sich gleich übernehmen', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const day = new Date(Date.now() - 2 * 86400000), stamp = `${String(day.getDate()).padStart(2, '0')}.${String(day.getMonth() + 1).padStart(2, '0')}.${day.getFullYear()}`;
    const png = await page.evaluate(lines => {
      const canvas = document.createElement('canvas'); canvas.width = 1170; canvas.height = 900;
      const c = canvas.getContext('2d'); c.fillStyle = '#ffffff'; c.fillRect(0, 0, 1170, 900); c.fillStyle = '#000000'; c.font = '48px sans-serif';
      lines.forEach((line, index) => c.fillText(line, 60, 90 + index * 74));
      return canvas.toDataURL('image/png').split(',')[1];
    }, ['REWE Markt GmbH', 'HAFERDRINK BIO 1L  1,29 B', 'KIRSCHTOMATEN 250G  1,99 B', 'SUMME EUR  3,28', `Datum: ${stamp}`]);
    await page.click('[data-tab=spending]'); await page.click('#add-purchase'); await sheetOpen(page);
    assert.ok(await page.locator('#purchase-prices-label').isHidden());
    await page.setInputFiles('#purchase-form input[type=file]', { name: 'bon.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    await page.waitForFunction(() => /Erkannt/.test(document.querySelector('#purchase-status').textContent), null, { timeout: 90000 });
    assert.equal(await page.inputValue('#purchase-form input[name=amount]'), '3,28');
    assert.equal(await page.inputValue('#purchase-form input[name=date]'), isoDay(day));
    assert.equal(await page.inputValue('#purchase-form select[name=storeId]'), 'store-rewe');
    assert.match(await page.textContent('#purchase-status'), /Summe 3,28\s€[\s\S]*vergleichen/);
    assert.ok(await page.locator('#purchase-progress').isHidden());
    assert.ok(await page.locator('#purchase-prices-label').isVisible());
    // Noch nichts gespeichert, bis „Speichern“
    assert.equal(await page.evaluate(() => (JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.purchases || []).length), 0);
    // Von Hand korrigieren (Foto war ungenau) und die Artikelpreise gleich mitnehmen
    await page.fill('#purchase-form input[name=amount]', '3,29');
    await page.locator('#purchase-form input[name=prices]').check();
    await page.click('#purchase-save');
    await page.waitForSelector('#receipt-dialog[open]');
    await page.waitForSelector('#receipt-review:not([hidden])');
    assert.equal(await page.locator('#receipt-lines .receipt-line').count(), 2);
    assert.equal(await page.locator('#receipt-form input[name=spend]').isChecked(), false, 'der Gesamtbetrag ist schon gespeichert');
    await page.click('#receipt-save'); await page.waitForSelector('#receipt-dialog', { state: 'hidden' });
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base);
    const purchases = stored.purchases.filter(row => !row.deletedAt);
    assert.equal(purchases.length, 1);
    assert.deepEqual([purchases[0].cents, purchases[0].storeId, purchases[0].storeName, purchases[0].source, purchases[0].date], [329, 'store-rewe', 'Rewe', 'hand', isoDay(day)], 'von Hand geändert: Herkunft „hand“');
    assert.ok(stored.prices.some(row => row.name === 'Haferdrink Bio' && row.createdAt.slice(0, 10) === isoDay(day)), 'Artikelpreis aus dem Bon');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Ausgaben: Foto ohne erkennbaren Betrag meldet das klar, das Fenster bleibt benutzbar', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 1170; canvas.height = 500;
      const c = canvas.getContext('2d'); c.fillStyle = '#ffffff'; c.fillRect(0, 0, 1170, 500); c.fillStyle = '#000000'; c.font = '52px sans-serif';
      c.fillText('Ein Foto ohne jede Zahl', 60, 120); c.fillText('nur ein paar Worte', 60, 220);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    await page.click('[data-tab=spending]'); await page.click('#add-purchase'); await sheetOpen(page);
    await page.fill('#purchase-form input[name=amount]', '5');
    await page.setInputFiles('#purchase-form input[type=file]', { name: 'leer.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    await page.waitForFunction(() => document.querySelector('#purchase-dialog [data-dialog-error]:not([hidden])'), null, { timeout: 90000 });
    assert.match(await page.textContent('#purchase-dialog [data-dialog-error]'), /kein Betrag gefunden[\s\S]*von Hand/);
    assert.equal(await page.inputValue('#purchase-form input[name=amount]'), '5', 'der eingetippte Betrag bleibt stehen');
    assert.equal(await page.locator('#purchase-prices-label').isHidden(), true);
    await page.click('#purchase-save'); await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
    assert.match(await page.textContent('#spending-summary'), /5,00\s€/);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Ausgaben: Dialog schließen bricht die Texterkennung ab, ohne Fehler und ohne dass etwas gespeichert wird', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 1170; canvas.height = 5200;
      const c = canvas.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 1170, 5200); c.fillStyle = '#000'; c.font = '44px sans-serif';
      for (let i = 0; i < 80; i++) c.fillText(`Artikel ${i + 1}   ${i + 1},99 A`, 60, 80 + i * 62);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    await page.click('[data-tab=spending]'); await page.click('#add-purchase'); await sheetOpen(page);
    await page.setInputFiles('#purchase-form input[type=file]', { name: 'lang.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    await page.waitForFunction(() => /erkannt|geladen/.test(document.querySelector('#purchase-status').textContent), null, { timeout: 30000 });
    await page.click('#purchase-dialog [data-close]');
    await page.waitForTimeout(2500);
    assert.equal(await page.locator('#purchase-dialog[open]').count(), 0);
    assert.match(await page.textContent('#purchase-list'), /Noch nichts eingetragen/);
    assert.deepEqual(problems, []);
    // Danach geht ein neuer Eintrag
    await addPurchase(page, { amount: '7,50' });
    assert.match(await page.textContent('#spending-summary'), /7,50\s€/);
    await ctx.close();
  });

  test('Ausgaben auf zwei Geräten: beide sehen dieselben Einträge, gleichzeitig Erfasstes bleibt, Löschen kommt an', async () => {
    const remote = github(demo);
    const a = await context({ config: connectedConfig }), b = await context({ config: { ...connectedConfig, actor: 'Anna' } });
    let offline = false;
    await a.ctx.route('https://api.github.com/**', route => remote.handler(route));
    await b.ctx.route('https://api.github.com/**', route => offline ? route.abort('connectionfailed') : remote.handler(route));
    for (const device of [a, b]) { await open(device.page); await synced(device.page); await device.page.click('[data-tab=spending]'); }
    await addPurchase(a.page, { amount: '40,00', store: 'Edeka', note: 'von Nico' });
    await synced(a.page);
    assert.equal(remote.content.purchases.length, 1);
    assert.deepEqual([remote.content.purchases[0].cents, remote.content.purchases[0].storeId, remote.content.purchases[0].date], [4000, 'store-edeka', isoDay(new Date())]);
    await pollNow(b.page);
    await b.page.waitForFunction(() => /40,00/.test(document.querySelector('#spending-summary').textContent), null, { timeout: 20000 });
    assert.match(await b.page.textContent('#purchase-list'), /Edeka · von Nico/);
    // B ist offline und erfasst, A erfasst gleichzeitig: nichts geht verloren
    offline = true;
    await addPurchase(b.page, { amount: '15,50', store: 'Lidl' });
    assert.match(await b.page.textContent('#spending-summary'), /55,50\s€/, 'lokal sofort sichtbar');
    await addPurchase(a.page, { amount: '2', note: 'Kleinigkeit' }); await synced(a.page);
    offline = false;
    await b.page.click('#refresh');
    await b.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok' && /57,50/.test(document.querySelector('#spending-summary').textContent), null, { timeout: 20000 });
    await pollNow(a.page);
    await a.page.waitForFunction(() => /57,50/.test(document.querySelector('#spending-summary').textContent), null, { timeout: 20000 });
    assert.equal(remote.content.purchases.filter(row => !row.deletedAt).length, 3);
    // A löscht einen Eintrag, B sieht das
    await a.page.locator('#purchase-list .spend-row', { hasText: 'Kleinigkeit' }).click(); await sheetOpen(a.page);
    await a.page.click('#purchase-delete'); await synced(a.page);
    await pollNow(b.page);
    await b.page.waitForFunction(() => /55,50/.test(document.querySelector('#spending-summary').textContent), null, { timeout: 20000 });
    assert.deepEqual([...a.problems, ...b.problems].filter(text => !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(text)), []);
    await a.ctx.close(); await b.ctx.close();
  });

  test('Ausgaben: Dialogfenster und Einstellungen laufen bei 320 px nicht über; „Jetzt aufräumen“ zählt alte Ausgaben mit', async () => {
    const { ctx, page, problems } = await context({ context: { viewport: { width: 320, height: 568 } } });
    await open(page);
    await page.click('[data-tab=spending]'); await page.click('#add-purchase'); await sheetOpen(page);
    const fits = await page.evaluate(() => { const dialog = document.querySelector('dialog[open]'); return document.documentElement.scrollWidth <= document.documentElement.clientWidth && dialog.scrollWidth <= dialog.clientWidth; });
    assert.ok(fits, 'Überlauf im Dialog Einkauf eintragen');
    await page.keyboard.press('Escape');
    // Ein Eintrag von vor vier Jahren wird beim Aufräumen entfernt
    const old = isoDay(new Date(new Date().getFullYear() - 4, 0, 10, 12));
    await page.evaluate(async old2 => {
      const key = 'einkauf-demo-v1', stored = JSON.parse(localStorage.getItem(key));
      stored.base.purchases = [{ id: 'alt-eintrag', date: old2, cents: 1234, source: 'hand', note: '', createdAt: '2020-01-10T10:00:00.000Z', updatedAt: '2020-01-10T10:00:00.000Z', deletedAt: null, _clock: {} }];
      localStorage.setItem(key, JSON.stringify(stored));
    }, old);
    await open(page);
    await openSettings(page);
    assert.match(await page.textContent('#storage-hint'), /Aufräumbar: 1 Einträge/);
    await page.click('#compact-now');
    assert.match(await page.textContent('#storage-note'), /Aufgeräumt: 1 Einträge entfernt/);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.purchases?.length ?? 0), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Schreibweisen: nur vorgeschlagen, erst bestätigt dann gemerkt und angewendet; Schnellwahl häufiger Artikel', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const type = text => page.fill('#item-form input[name=name]', text);
    const submit = () => page.click('#item-form button[type=submit]');
    await pickStore(page, 'Rewe');   // die Beispiel-Äpfel (4 Stück) liegen bei Rewe
    // Unsicher: „Apfel“ ist nicht „Äpfel“, solange es niemand bestätigt hat
    await type('Apfel'); await page.waitForSelector('#item-suggestions:not([hidden])');
    assert.match(await page.textContent('#item-suggestions'), /Meinst du dasselbe wie[\s\S]*Äpfel/);
    await submit();
    assert.equal(await page.locator('#items .item', { hasText: /^Apfel/ }).count(), 1, 'ohne Bestätigung bleibt es bei „Apfel“');
    await page.getByRole('button', { name: /^Apfel, .*bearbeiten/ }).click(); await sheetOpen(page); await page.click('#delete-item'); await page.waitForSelector('#item-dialog', { state: 'hidden' });
    // Bestätigt: ein Tipp merkt die Zuordnung
    await type('Apfel'); await page.waitForSelector('#item-suggestions:not([hidden])');
    await page.locator('#item-suggestions button', { hasText: 'Äpfel' }).click();
    assert.equal(await page.inputValue('#item-form input[name=name]'), 'Äpfel');
    assert.match(await page.textContent('#notice-text'), /„Apfel“ heißt jetzt immer „Äpfel“/);
    await page.fill('#item-form input[name=name]', '');
    // Danach wird die andere Schreibweise automatisch ersetzt und der Artikel zählt zum vorhandenen dazu
    await type('apfel'); await submit();
    assert.match(await page.textContent('#notice-text'), /„apfel“ → „Äpfel“/);
    assert.equal(await page.locator('#items .item', { hasText: /^Apfel/ }).count(), 0);
    assert.match(await page.locator('#items .item', { hasText: 'Äpfel' }).textContent(), /5 Stück/);
    // Schnellwahl: erst nach mehrfachem Kaufen, nie für offene Artikel
    assert.equal(await page.locator('#quick-pick').isHidden(), true);
    await type('Quark'); await submit(); await type('Quark'); await submit();
    assert.equal(await page.locator('#items .item', { hasText: 'Quark' }).count(), 1, 'gleiche Artikel zählen zusammen');
    await page.locator('#items .item', { hasText: 'Quark' }).locator('.check').click();
    assert.equal(await page.locator('#quick-pick .chip').first().isVisible(), false, 'zugeklapptes Formular: keine Schnellwahl');
    await expandForm(page);   // ins Namensfeld tippen klappt das Formular auf
    await page.waitForSelector('#quick-pick:not([hidden])');
    assert.deepEqual(await page.locator('#quick-pick .chip').allTextContents(), ['Quark']);
    await type('Qu'); assert.equal(await page.locator('#quick-pick').isHidden(), true, 'beim Tippen ausgeblendet');
    await type('');
    await page.locator('#quick-pick .chip', { hasText: 'Quark' }).click();
    assert.equal(await page.locator('#items .item:not(.checked)', { hasText: 'Quark' }).count(), 1);
    assert.equal(await page.locator('#quick-pick').isHidden(), true, 'jetzt offen, also nicht mehr in der Schnellwahl');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Angebote mit „gültig bis“: abgelaufene zählen nicht mehr; Preisvergleich zeigt, wann ein Preis eingetragen wurde', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const day = offset => { const date = new Date(Date.now() + offset * 86400000); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
    const apples = () => page.locator('#items .item', { hasText: 'Äpfel' });
    const edit = async until => {
      await apples().getByRole('button', { name: /bearbeiten/ }).click(); await sheetOpen(page);
      if (!(await page.isChecked('#edit-item-form input[name=onSale]'))) {
        await page.check('#edit-item-form input[name=onSale]');
        await page.fill('#edit-item-form input[name=saleEuros]', '0,10');
      }
      await page.fill('#edit-item-form input[name=saleUntil]', until);
    };
    await edit(day(-1));
    assert.match(await page.textContent('#price-comparison'), /zuletzt eingetragen am/);
    await page.click('#edit-item-form button[type=submit]'); await page.waitForSelector('#item-dialog', { state: 'hidden' });
    assert.match(await apples().textContent(), /Angebot abgelaufen/);
    assert.ok(await apples().locator('.sale-badge.expired').count() === 1);
    assert.doesNotMatch(await apples().textContent(), /Angebot: /, 'der abgelaufene Angebotspreis wird nicht mehr als aktuell gezeigt');
    const expiredCost = await apples().locator('.price-note', { hasText: 'Geschätzt' }).textContent();
    await edit(day(2));
    await page.click('#edit-item-form button[type=submit]'); await page.waitForSelector('#item-dialog', { state: 'hidden' });
    assert.match(await apples().textContent(), /Im Angebot bis \d{2}\.\d{2}\.\d{2,4}/);
    const saleCost = await apples().locator('.price-note', { hasText: 'Geschätzt' }).textContent();
    assert.notEqual(saleCost, expiredCost, 'solange das Angebot gilt, ist die Schätzung niedriger');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Kochmodus: große Schritte, abhakbare Zutaten und Schritte, Bildschirm anlassen, „Heute gekocht“', async () => {
    const { ctx, page, problems } = await context();
    await ctx.addInitScript(() => {
      window.__wake = { requests: 0, releases: 0 };
      Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => { window.__wake.requests++; return { release: async () => { window.__wake.releases++; }, addEventListener() {} }; } } });
    });
    await open(page);
    await page.click('[data-tab=recipes]');
    const card = page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' });
    await card.getByRole('button', { name: 'Kochen' }).click(); await sheetOpen(page);
    assert.equal(await page.textContent('#cook-title'), 'Tomaten-Pasta');
    assert.match(await page.textContent('#cook-portions'), /Für 2 Portionen/);
    assert.equal(await page.locator('#cook-ingredients input').count(), 4);
    const steps = page.locator('#cook-steps button');
    assert.ok(await steps.count() >= 3, 'die Zubereitung ist in Schritte zerlegt');
    assert.ok(parseFloat(await steps.first().evaluate(node => getComputedStyle(node).fontSize)) >= 20, 'große Schrift');
    // Haken bleiben beim erneuten Öffnen erhalten (nur in dieser Sitzung)
    await page.locator('#cook-ingredients input').first().check();
    await steps.first().click();
    assert.equal(await steps.first().getAttribute('aria-pressed'), 'true');
    // Bildschirm anlassen
    assert.equal(await page.locator('#cook-awake-label').isVisible(), true);
    await page.check('#cook-awake');
    await page.waitForFunction(() => window.__wake.requests === 1);
    assert.match(await page.textContent('#cook-awake-hint'), /Bildschirm bleibt an/);
    await page.click('#cook-dialog [data-close]');
    await page.waitForFunction(() => window.__wake.releases === 1);
    await card.getByRole('button', { name: 'Kochen' }).click(); await sheetOpen(page);
    assert.equal(await page.locator('#cook-ingredients input').first().isChecked(), true);
    assert.equal(await page.locator('#cook-steps button').first().getAttribute('aria-pressed'), 'true');
    assert.equal(await page.isChecked('#cook-awake'), true, 'die Wahl wird auf diesem Gerät gemerkt');
    await page.waitForFunction(() => window.__wake.requests === 2);
    // Fertig
    await page.click('#cook-done');
    await page.waitForSelector('#cook-dialog', { state: 'hidden' });
    assert.match(await card.locator('.recipe-meta').textContent(), /gekocht heute/);
    await page.waitForFunction(() => window.__wake.releases === 2);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Neu von der Partnerin: farbig oben, Übernehmen reiht den Artikel ein, bleibt nach dem Neuladen übernommen', async () => {
    const remote = github(demo);
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    assert.equal(await page.locator('.news-head').count(), 0, 'beim ersten Start gilt alles Vorhandene als gesehen');
    remote.remoteChange(content => {
      const at = new Date(Date.now() + 2000).toISOString();
      content.items.push({ id: 'item-butter', storeId: 'store-edeka', name: 'Butter', quantity: 1, unit: 'Stück', checked: false, createdBy: 'Anna', createdAt: at, updatedAt: at, deletedAt: null, _clock: {}, onSale: false });
      const noodles = content.items.find(row => row.id === 'item-nudeln');
      noodles._base = { quantity: noodles.quantity, unit: noodles.unit }; noodles._adds = [{ id: 'anna-add', at, quantity: 100, unit: 'g', by: 'Anna' }]; noodles.quantity += 100;
    });
    await pollNow(page);
    await page.waitForSelector('.news-head');
    assert.match(await page.textContent('.news-head'), /Neu von Anna/);
    const news = page.locator('#items .item.news');
    assert.equal(await news.count(), 2);
    assert.match(await news.filter({ hasText: 'Butter' }).textContent(), /neu von Anna/);
    assert.match(await news.filter({ hasText: 'Nudeln' }).textContent(), /600 g[\s\S]*\+100 g von Anna/);
    assert.equal(await page.locator('#items .item:not(.news)', { hasText: 'Butter' }).count(), 0, 'steht nicht doppelt in der Liste');
    assert.ok(await news.first().evaluate(node => getComputedStyle(node).backgroundColor !== getComputedStyle(document.body).backgroundColor), 'farblich abgesetzt');
    await news.filter({ hasText: 'Butter' }).getByRole('button', { name: 'Übernehmen' }).click();
    assert.equal(await news.count(), 1);
    assert.equal(await page.locator('#items .item:not(.news)', { hasText: 'Butter' }).count(), 1, 'Butter reiht sich in die Liste ein');
    // Nach dem Neuladen bleibt es so
    await open(page); await synced(page);
    assert.equal(await page.locator('#items .item.news').count(), 1);
    assert.equal(await page.locator('#items .item.news', { hasText: 'Nudeln' }).count(), 1);
    await page.getByRole('button', { name: 'Alle übernehmen' }).click();
    assert.equal(await page.locator('.news-head').count(), 0);
    assert.match(await page.locator('#items .item', { hasText: 'Nudeln' }).textContent(), /600 g/);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Zwei Geräte zählen gleichzeitig dazu, eines war offline: nichts geht verloren (500 g + 100 g + 200 g = 800 g)', async () => {
    const remote = github(demo);
    const a = await context({ config: connectedConfig }), b = await context({ config: { ...connectedConfig, actor: 'Anna' } });
    let offline = false;   // Gerät B verliert die Verbindung (die Anfragen werden simuliert abgebrochen)
    await a.ctx.route('https://api.github.com/**', route => remote.handler(route));
    await b.ctx.route('https://api.github.com/**', route => offline ? route.abort('connectionfailed') : remote.handler(route));
    for (const device of [a, b]) { await open(device.page); await synced(device.page); }
    const add = async (page, quantity) => {
      await page.getByRole('tab', { name: /^Edeka/ }).click();
      await page.fill('#item-form input[name=name]', 'Tomaten'); await page.fill('#item-form input[name=quantity]', String(quantity)); await page.fill('#item-form input[name=unit]', 'g');
      await page.click('#item-form button[type=submit]');
    };
    offline = true;
    await add(b.page, 200);
    assert.match(await b.page.locator('#items .item', { hasText: 'Tomaten' }).textContent(), /700 g/, 'lokal sofort sichtbar');
    await add(a.page, 100); await synced(a.page);
    assert.equal(remote.content.items.find(row => row.id === 'item-tomaten').quantity, 600);
    offline = false;
    await b.page.click('#refresh');
    await b.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok' && /800 g/.test(document.querySelector('#items').textContent), null, { timeout: 20000 });
    assert.equal(remote.content.items.find(row => row.id === 'item-tomaten').quantity, 800);
    await pollNow(a.page);
    await a.page.waitForFunction(() => /800 g/.test(document.querySelector('#items').textContent), null, { timeout: 20000 });
    assert.equal(await a.page.locator('#items .item', { hasText: 'Tomaten' }).count(), 1);
    assert.deepEqual([...a.problems, ...b.problems].filter(text => !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(text)), []);
    await a.ctx.close(); await b.ctx.close();
  });

  test('Im Laden: Geschäft wählen, Artikel ohne Geschäft überall bis abgehakt (erst Edeka, dann Lidl), Einkauf beenden mit Kassenbon', async () => {
    const { ctx, page, problems } = await context();
    await ctx.addInitScript(() => {
      window.__wake = { requests: 0, releases: 0 };
      Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => { window.__wake.requests++; return { release: async () => { window.__wake.releases++; }, addEventListener() {} }; } } });
    });
    await open(page);
    // Ein Artikel ohne Geschäft (Beispieldaten: Tomaten und Nudeln bei Edeka, Milch bei Lidl, Äpfel bei Rewe)
    await page.fill('#item-form input[name=name]', 'Brot'); await page.click('#item-form button[type=submit]');
    await page.click('#mode-shop');
    assert.equal(await page.locator('#plan-view').isHidden(), true);
    assert.equal(await page.locator('#item-form').isHidden(), true, 'kein Eingabeformular im Laden');
    const chips = () => page.locator('#shop-chips .chip').evaluateAll(nodes => nodes.map(node => [node.firstChild.textContent, node.querySelector('.count')?.textContent ?? '', node.getAttribute('aria-selected')]));
    assert.deepEqual(await chips(), [['Edeka', '3', 'false'], ['Lidl', '2', 'false'], ['Rewe', '2', 'false']], 'nichts vorgewählt; Brot zählt in jedem Geschäft mit');
    assert.match(await page.textContent('#shop-list'), /Tippe oben auf das Geschäft/);
    const names = () => page.locator('#shop-list .shop-item .shop-name').allTextContents();
    const chip = name => page.locator('#shop-chips .chip', { hasText: name });
    // Bei Edeka
    await chip('Edeka').click();
    assert.deepEqual((await names()).sort(), ['Brot', 'Nudeln', 'Tomaten']);
    assert.match(await page.textContent('#shop-status'), /Noch 3 offen/);
    assert.match(await page.textContent('#shop-list'), /Überall möglich/);
    assert.match(await page.textContent('#shop-list'), /2 Artikel für andere Geschäfte/);
    assert.equal(await page.locator('#shop-list .item-actions, #shop-list .icon-button').count(), 0, 'kein Stift, kein Mülleimer');
    assert.ok(await page.locator('.shop-tap').first().evaluate(node => node.getBoundingClientRect().height >= 60), 'große Tippfläche');
    await page.locator('.shop-tap', { hasText: 'Brot' }).click();
    assert.match(await page.textContent('#shop-status'), /Noch 2 offen/);
    assert.match(await page.textContent('#shop-list .shop-done'), /Erledigt \(1\)[\s\S]*Brot/);
    assert.deepEqual(await chips(), [['Edeka', '2', 'true'], ['Lidl', '1', 'false'], ['Rewe', '1', 'false']]);
    // Danach bei Lidl: Brot steht dort nicht mehr (weder offen noch erledigt)
    await chip('Lidl').click();
    assert.deepEqual(await names(), ['Milch']);
    assert.ok(!(await page.textContent('#shop-list')).includes('Brot'));
    // Zurück bei Edeka: Brot ist unter „Erledigt“ und lässt sich wieder öffnen; dann ist es auch bei Lidl wieder da
    await chip('Edeka').click();
    await page.locator('#shop-list .shop-done summary').click();
    await page.locator('#shop-list .shop-done .shop-tap', { hasText: 'Brot' }).click();
    await chip('Lidl').click();
    assert.deepEqual((await names()).sort(), ['Brot', 'Milch']);
    // Bei Lidl gekauft: bei Rewe nicht mehr; ein Artikel von Lidl bleibt bei Edeka außen vor
    await page.locator('.shop-tap', { hasText: 'Brot' }).click();
    await page.locator('.shop-tap', { hasText: 'Milch' }).click();
    await chip('Rewe').click();
    assert.deepEqual(await names(), ['Äpfel']);
    // Bildschirm anlassen gilt nur in dieser Ansicht
    await page.check('#shop-awake');
    await page.waitForFunction(() => window.__wake.requests === 1);
    await page.click('[data-tab=recipes]');
    await page.waitForFunction(() => window.__wake.releases === 1);
    await page.click('[data-tab=shopping]');
    await page.waitForFunction(() => window.__wake.requests === 2);
    // Einkauf beenden: Abgehaktes verschwindet, Kassenbon-Dialog mit dem Geschäft
    await page.click('#shop-finish'); await sheetOpen(page);
    assert.match(await page.textContent('#finish-text'), /2 abgehakte Artikel werden von der Liste entfernt/);
    await page.click('#finish-receipt');
    await page.waitForSelector('#receipt-dialog[open]');
    await page.fill('#receipt-form textarea[name=text]', 'Kassenbon\nBrot 1,99 A\nSUMME 1,99');
    await page.click('#receipt-parse');
    assert.equal(await page.inputValue('#receipt-form select[name=storeId]'), 'store-rewe', 'das Geschäft, in dem man zuletzt war');
    await page.keyboard.press('Escape');
    await page.click('#shop-back');
    assert.equal(await page.locator('#plan-view').isVisible(), true);
    const text = await page.textContent('#items');
    assert.ok(!text.includes('Brot') && !text.includes('Milch'), 'abgehakte Artikel sind entfernt');
    assert.ok(text.includes('Tomaten') && text.includes('Äpfel'), 'offene bleiben');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Einkauf beenden: Betrag mit dem „+“ direkt unter Ausgaben speichern; Fehler lassen alles unverändert, die Tastatur schließt sich', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base);
    const typing = () => page.evaluate(() => document.activeElement.matches('input,textarea,select'));
    const center = async locator => { const box = await locator.boundingBox(); return [box.x + box.width / 2, box.y + box.height / 2]; };
    // iOS-Safari gibt Knöpfen beim Antippen keinen Fokus
    await page.evaluate(() => document.addEventListener('mousedown', event => { if (event.target.closest('button')) event.preventDefault(); }, true));
    await page.click('#mode-shop'); await page.locator('#shop-chips .chip', { hasText: 'Lidl' }).click();
    await page.locator('.shop-tap', { hasText: 'Milch' }).click();
    await page.click('#shop-finish'); await sheetOpen(page);
    const amount = page.locator('#finish-form input[name=amount]'), plus = page.locator('#finish-form .add-button');
    assert.equal(await plus.isVisible(), false, 'leeres Feld: kein „+“');
    // Eingabetaste ohne Betrag: Hinweis, nichts passiert
    await amount.focus(); await page.keyboard.press('Enter');
    assert.match(await page.textContent('#finish-dialog [data-dialog-error]'), /Betrag eingeben oder „Nur beenden“/);
    // Ungültiger Betrag: Meldung, Tastatur zu, Fenster offen, Milch bleibt abgehakt und auf der Liste
    await amount.fill('abc'); assert.equal(await plus.isVisible(), true);
    await page.touchscreen.tap(...await center(plus));
    await page.waitForFunction(() => /Betrag in Euro eingeben/.test(document.querySelector('#finish-dialog [data-dialog-error]')?.textContent || ''));
    assert.equal(await typing(), false, 'Tastatur zu');
    assert.ok(await page.locator('#finish-dialog').evaluate(node => node.open));
    let data = await stored();
    assert.ok(!data.items.find(row => row.name === 'Milch').deletedAt, 'Milch noch nicht entfernt');
    assert.equal((data.purchases || []).length, 0);
    // Gültiger Betrag: Einkauf beendet, Betrag gespeichert (Geschäft, heute, Notiz „Wocheneinkauf“)
    await amount.fill('12,50');
    await page.touchscreen.tap(...await center(plus));
    await page.waitForSelector('#finish-dialog', { state: 'hidden' });
    assert.match(await page.textContent('#notice-text'), /12,50\s€ unter Ausgaben gespeichert/);
    data = await stored();
    assert.ok(data.items.find(row => row.name === 'Milch').deletedAt, 'Milch ist von der Liste entfernt');
    const purchases = data.purchases.filter(row => !row.deletedAt);
    assert.equal(purchases.length, 1);
    assert.deepEqual([purchases[0].cents, purchases[0].storeId, purchases[0].storeName, purchases[0].note, purchases[0].source, purchases[0].date], [1250, 'store-lidl', 'Lidl', 'Wocheneinkauf', 'hand', isoDay(new Date())]);
    await page.click('[data-tab=spending]');
    assert.match(await page.textContent('#spending-summary'), /12,50\s€/);
    assert.match(await page.textContent('#purchase-list'), /Lidl · Wocheneinkauf[\s\S]*12,50\s€/);
    // „Nur beenden“ ignoriert das Feld und speichert nichts
    await page.click('[data-tab=shopping]');
    await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click(); await page.locator('.shop-tap', { hasText: 'Tomaten' }).click();
    await page.click('#shop-finish'); await sheetOpen(page);
    assert.equal(await amount.inputValue(), '', 'das Feld ist bei jedem Öffnen leer');
    await amount.fill('99'); await page.click('#finish-only'); await page.waitForSelector('#finish-dialog', { state: 'hidden' });
    assert.equal((await stored()).purchases.filter(row => !row.deletedAt).length, 1);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Was kann ich kochen?: Vorschläge aus Vorrat und Einkaufsliste, Fehlendes auf die Liste, Eingekauftes zählt auch nach „Einkauf beenden“', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const cards = () => page.locator('#cookable-list .cookable-card');
    const status = name => cards().filter({ hasText: name }).locator('.cookable-status').textContent();
    const openList = async () => { await page.click('[data-tab=recipes]'); await page.click('#cookable-open'); await sheetOpen(page); };
    // 1. Die Beispielliste hat Nudeln und Tomaten (offen): Tomaten-Pasta fehlen Zwiebel und Olivenöl; Curry und Pfannkuchen passen kaum
    await openList();
    assert.deepEqual(await cards().locator('h3').allTextContents(), ['Tomaten-Pasta']);
    assert.match(await status('Tomaten-Pasta'), /Es fehlen 2 von 4 Zutaten/);
    assert.match(await cards().first().locator('.cookable-lines').textContent(), /Kommt noch: Nudeln, Tomaten[\s\S]*Fehlt: Zwiebel, Olivenöl/);
    // 2. „Fehlendes auf die Liste“: nur Zwiebel und Olivenöl sind vorausgewählt
    await cards().first().getByRole('button', { name: 'Fehlendes auf die Liste' }).click();
    await page.waitForSelector('#transfer-dialog[open]');
    assert.equal(await page.locator('#cookable-dialog[open]').count(), 0, 'das Vorschlagsfenster ist zu');
    const picked = await page.locator('#transfer-ingredients label').evaluateAll(nodes => nodes.map(node => [node.querySelector('span').textContent.replace(/\s+/g, ' '), node.querySelector('input').checked]));
    assert.deepEqual(picked.map(entry => entry[1]), [false, false, true, true], JSON.stringify(picked));
    await page.keyboard.press('Escape');
    // 3. Zwiebel und Olivenöl im Vorrat: alles da, sobald ihr einkauft
    await openSettings(page);
    for (const name of ['Zwiebeln', 'Olivenöl']) { await page.fill('#pantry-form input[name=name]', name); await page.click('#pantry-form button[type=submit]'); }
    await openList();
    assert.match(await status('Tomaten-Pasta'), /Alles da, sobald ihr einkauft \(2 von der Liste\)/);
    assert.match(await cards().first().locator('.cookable-lines').textContent(), /Da: Zwiebel, Olivenöl[\s\S]*Kommt noch: Nudeln, Tomaten/);
    assert.equal(await cards().first().getByRole('button', { name: 'Fehlendes auf die Liste' }).count(), 0, 'nichts fehlt');
    assert.match(await page.textContent('#cookable-count'), /1 nach dem Einkauf/);
    await page.keyboard.press('Escape');
    // 4. Nudeln und Tomaten eingekauft (abgehakt), Einkauf beendet: sie sind von der Liste weg, zählen aber noch als da
    await page.click('[data-tab=shopping]');
    await page.getByRole('button', { name: 'Nudeln: abhaken' }).click(); await page.getByRole('button', { name: 'Tomaten: abhaken' }).click();
    await page.click('#mode-shop'); await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click();
    await page.click('#shop-finish'); await sheetOpen(page); await page.click('#finish-only'); await page.waitForSelector('#finish-dialog', { state: 'hidden' });
    await page.click('#shop-back');
    assert.ok(!(await page.textContent('#items')).includes('Nudeln'), 'von der Liste entfernt');
    await openList();
    assert.equal(await status('Tomaten-Pasta'), 'Alles da');
    assert.match(await page.textContent('#cookable-count'), /1 Rezept könnt ihr sofort kochen/);
    // 5. Kochen öffnet den Kochmodus, das Vorschlagsfenster schließt sich
    await cards().first().getByRole('button', { name: 'Kochen' }).click();
    await page.waitForSelector('#cook-dialog[open]');
    assert.equal(await page.locator('#cookable-dialog[open]').count(), 0);
    assert.match(await page.textContent('#cook-title'), /Tomaten-Pasta/);
    await page.keyboard.press('Escape');
    // 6. Einplanen öffnet den Wochenplan-Dialog mit dem Rezept
    await openList();
    await cards().first().getByRole('button', { name: /im Wochenplan einplanen/ }).click();
    await page.waitForSelector('#meal-dialog[open]');
    assert.equal(await page.inputValue('#meal-form select[name=recipeId]'), 'recipe-pasta');
    await page.keyboard.press('Escape');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Was kann ich kochen?: ohne Treffer ein Hinweis; entfernte, nicht abgehakte Artikel zählen nicht als eingekauft', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    // Liste leeren (Artikel ohne Abhaken löschen): nichts ist da, nichts kommt noch
    await page.click('[data-tab=shopping]');
    for (const name of ['Tomaten', 'Nudeln', 'Milch', 'Äpfel']) { await page.locator('#items .item', { hasText: name }).locator('.item-copy').click(); await sheetOpen(page); await page.click('#delete-item'); await page.waitForSelector('dialog[open]', { state: 'detached' }); }
    await page.click('[data-tab=recipes]'); await page.click('#cookable-open'); await sheetOpen(page);
    assert.match(await page.textContent('#cookable-count'), /Noch passt kein Rezept/);
    assert.match(await page.textContent('#cookable-list'), /Einstellungen → Vorrat/);
    assert.equal(await page.locator('#cookable-list .cookable-card').count(), 0, 'gelöschte, nicht abgehakte Artikel gelten nicht als eingekauft');
    await page.keyboard.press('Escape');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Einstellungen: jeder Bereich lässt sich auf- und zuklappen, verbunden stehen sie eingeklappt', async () => {
    const remote = github(structuredClone(demo));
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    await page.click('[data-tab=settings]');
    const ids = ['display-details', 'pantry-details', 'storage-details', 'import-details', 'connection-details'];
    for (const id of ids) assert.equal(await page.locator(`#${id}`).evaluate(node => node.open), false, `${id} startet eingeklappt`);
    for (const id of ids) {
      const summary = page.locator(`#${id} > summary`);
      assert.ok((await summary.boundingBox()).height >= 44, `${id}: Titel ist gut antippbar`);
      await summary.click();
      assert.equal(await page.locator(`#${id}`).evaluate(node => node.open), true, `${id} klappt auf`);
      await summary.click();
      assert.equal(await page.locator(`#${id}`).evaluate(node => node.open), false, `${id} klappt zu`);
    }
    // Aufgeklappt sind Inhalte bedienbar, zugeklappt nicht sichtbar
    assert.equal(await page.locator('#pantry-form input').isVisible(), false);
    await page.click('#pantry-details > summary');
    assert.equal(await page.locator('#pantry-form input').isVisible(), true);
    await page.click('#display-details > summary');
    await page.click('#palette button[data-palette=rose]');
    assert.equal(await page.getAttribute('html', 'data-palette'), 'rose');
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Vorlagen: Liste als Vorlage speichern und später wieder auf die Liste setzen (mit Geschäft, zusammengezählt)', async () => {
    const remote = github(structuredClone(demo));
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    assert.equal(await page.locator('#open-templates').isHidden(), true, 'zugeklapptes Formular: Vorlagen erst beim Hineintippen');
    await expandForm(page);
    await page.click('#open-templates'); await sheetOpen(page);
    assert.match(await page.textContent('#template-list'), /Noch keine Vorlage/);
    assert.match(await page.textContent('#template-hint'), /4 offenen Artikel von „Alle Geschäfte“/);
    await page.fill('#template-form input[name=name]', 'Wocheneinkauf');
    await page.click('#template-form button[type=submit]');
    assert.match(await page.textContent('#template-list'), /Wocheneinkauf\s*4 Artikel/);
    await synced(page);
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    const saved = remote.content.templates.find(row => row.name === 'Wocheneinkauf');
    assert.equal(saved.items.length, 4, 'liegt auf GitHub, die Partnerin sieht sie auch');
    assert.ok(saved.items.some(entry => entry.name === 'Tomaten' && entry.storeId === 'store-edeka'), 'mit Geschäft');
    // Zweimal speichern ersetzt die Vorlage, statt eine zweite anzulegen
    await page.fill('#template-form input[name=name]', 'wocheneinkauf'); await page.click('#template-form button[type=submit]');
    assert.equal(await page.locator('#template-list li').count(), 1);
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
    // Tomaten löschen, Vorlage verwenden: Tomaten sind zurück, die anderen werden zusammengezählt
    await page.getByRole('button', { name: /^Tomaten, .*bearbeiten/ }).click(); await sheetOpen(page); await page.click('#delete-item');
    await page.waitForSelector('#item-dialog', { state: 'hidden' });
    assert.equal(await page.locator('#items .item', { hasText: 'Tomaten' }).count(), 0);
    await expandForm(page); await page.click('#open-templates'); await sheetOpen(page);
    await page.getByRole('button', { name: 'Auf die Liste' }).click();
    await page.waitForSelector('#template-dialog', { state: 'hidden' });
    assert.match(await page.textContent('#notice-text'), /„Wocheneinkauf“: 1 neu, 3 dazugezählt/);
    await page.getByRole('tab', { name: /^Edeka/ }).click();
    assert.equal(await page.locator('#items .item', { hasText: 'Tomaten' }).count(), 1, 'Tomaten stehen wieder bei Edeka');
    // Löschen einer Vorlage
    await expandForm(page); await page.click('#open-templates'); await sheetOpen(page);
    await page.getByRole('button', { name: /Vorlage „Wocheneinkauf“ löschen/ }).click();
    assert.match(await page.textContent('#template-list'), /Noch keine Vorlage/);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Einstellungen merken, welche Bereiche offen waren (pro Gerät, auch nach dem Neuladen)', async () => {
    const { ctx, page, problems } = await context();
    await open(page); await page.click('[data-tab=settings]');
    assert.equal(await page.locator('#connection-details').evaluate(node => node.open), true, 'ohne Verbindung steht „Gemeinsame Liste“ offen');
    await page.click('#display-details > summary'); await page.click('#pantry-details > summary');
    await page.click('#pantry-details > summary');   // wieder zu
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('einkauf-settings-v1')).folds?.join() === 'display-details');
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' }); await page.click('[data-tab=settings]');
    const state = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#settings details.fold')].map(node => [node.id, node.open])));
    assert.deepEqual(await state(), { 'connection-details': true, 'import-details': false, 'pantry-details': false, 'storage-details': false, 'display-details': true });
    assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1'))).folds, ['display-details'], 'die Automatik der Verbindung wird nicht gemerkt');
    await ctx.close();
  });

  test('Token mit Ablaufdatum (von Hand eingetragen): Warnung in der Statuszeile ab sieben Tagen vorher, abgelaufen klar benannt', async () => {
    const day = offset => { const date = new Date(Date.now() + offset * 86400000); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
    const remote = github(structuredClone(demo));
    const { ctx, page, problems } = await context({ config: { ...connectedConfig, tokenExpires: day(60) } });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    assert.equal(await page.textContent('#status'), 'Mit GitHub abgeglichen', 'in 60 Tagen: keine Warnung');
    const setDate = async value => {
      await openSettings(page);
      await page.fill('#settings-form input[name=tokenExpires]', value); await page.click('#settings-form button[type=submit]');
    };
    for (const [offset, text, state] of [[3, /^Token läuft in 3 Tagen ab · neuen anlegen$/, 'pending'], [1, /^Token läuft morgen ab/, 'pending'], [0, /^Token läuft heute ab/, 'pending'], [-5, /^Token abgelaufen · neuen anlegen$/, 'error']]) {
      await setDate(day(offset));
      await page.waitForFunction(pattern => new RegExp(pattern).test(document.querySelector('#status').textContent), text.source);
      assert.equal(await page.getAttribute('#status', 'data-state'), state, `${offset} Tage`);
    }
    // Ein Tipp auf die Warnung führt zur Eingabe des neuen Tokens (statt nur abzugleichen)
    await page.click('[data-tab=shopping]'); await page.click('#syncline');
    assert.equal(await page.locator('#settings').isVisible(), true);
    assert.equal(await page.locator('#connection-details').evaluate(node => node.open), true);
    assert.match(await page.textContent('#connection-state'), /Token abgelaufen/);
    // Neuer Token ohne neues Datum: das alte Datum gilt nicht mehr, die Warnung verschwindet
    await page.fill('#settings-form input[name=token]', 'neuer-token'); await page.click('#settings-form button[type=submit]');
    await page.waitForFunction(() => document.querySelector('#status').textContent === 'Mit GitHub abgeglichen');
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1'))).tokenExpires, '');
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  test('Speichern-Knopf der Verbindung: grau mit „Gespeichert am …“, bei Änderung aktiv, nach einem Fehler wieder aktiv', async () => {
    const remote = github(structuredClone(demo));
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    await openSettings(page);
    const button = page.locator('#settings-form button[type=submit]');
    assert.equal(await button.isDisabled(), true, 'nichts geändert: grau');
    assert.equal((await button.textContent()).trim(), 'Gespeichert', 'schon vor Version 2.7 verbunden: ohne Datum');
    await page.fill('#settings-form input[name=branch]', 'anderer-branch');
    assert.equal(await button.isDisabled(), false);
    assert.equal((await button.textContent()).trim(), 'Speichern');
    await page.fill('#settings-form input[name=branch]', 'main');
    assert.equal(await button.isDisabled(), true, 'zurückgestellt: wieder grau');
    // Speichern: danach grau mit Datum und Uhrzeit
    await page.fill('#settings-form input[name=actor]', 'Nico B');
    assert.equal((await button.textContent()).trim(), 'Speichern');
    await button.click();
    await page.waitForFunction(() => /^Gespeichert am \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/.test(document.querySelector('#settings-form button[type=submit]').textContent.trim()));
    assert.equal(await button.isDisabled(), true);
    // Noch einmal ändern: wieder aktiv; ein falscher Token scheitert, der Knopf bleibt dann für einen neuen Versuch aktiv
    await page.fill('#settings-form input[name=token]', 'falsch');
    remote.behavior.unauthorized = true;
    await button.click();
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'error');
    assert.equal(await button.isDisabled(), false, 'Verbinden gescheitert: erneut möglich');
    assert.equal((await button.textContent()).trim(), 'Speichern');
    remote.behavior.unauthorized = false;
    await button.click();
    await page.waitForFunction(() => /^Gespeichert am/.test(document.querySelector('#settings-form button[type=submit]').textContent.trim()));
    assert.equal(await button.isDisabled(), true);
    // Rezept-Import-Einstellungen: dasselbe Verhalten
    const importButton = page.locator('#import-settings-form button[type=submit]');
    assert.equal(await importButton.isDisabled(), true);
    await page.fill('#import-settings-form input[name=importProxy]', 'https://rezepte.beispiel.workers.dev');
    assert.equal(await importButton.isDisabled(), false);
    await importButton.click();
    await page.waitForFunction(() => /^Gespeichert am/.test(document.querySelector('#import-settings-form button[type=submit]').textContent.trim()));
    assert.equal(await importButton.isDisabled(), true);
    await page.check('#import-settings-form input[name=publicProxy]');
    assert.equal((await importButton.textContent()).trim(), 'Import-Einstellungen speichern');
    assert.equal(await importButton.isDisabled(), false);
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  test('Ohne Verbindung: „Speichern & verbinden“ ist aktiv; „Token entfernen“ behält Name, Darstellung und Geräteeinstellungen', async () => {
    const remote = github(structuredClone(demo));
    const { ctx, page, problems } = await context({ config: { ...connectedConfig, palette: 'rose', storeStyle: 'logo', shopMode: false, groupItems: false, shopAwake: true } });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    await openSettings(page);
    page.once('dialog', dialog => dialog.accept());
    await page.click('#disconnect');
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('einkauf-settings-v1')).token);
    const kept = JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1')));
    assert.deepEqual([kept.actor, kept.palette, kept.storeStyle, kept.groupItems, kept.shopAwake], ['Nico', 'rose', 'logo', false, true], 'nur die Verbindungsdaten sind weg');
    for (const key of ['owner', 'repo', 'token', 'savedAt', 'tokenExpires']) assert.equal(kept[key], undefined, key);
    const button = page.locator('#settings-form button[type=submit]');
    assert.equal(await button.isDisabled(), false);
    assert.equal((await button.textContent()).trim(), 'Speichern & verbinden');
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  test('Geschäfte speichern schreibt den Standardlink und die Voreinstellung nicht fest', async () => {
    const remote = github(withRossmann());
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    await page.click('#manage-stores'); await sheetOpen(page);
    const row = page.locator('#store-editor .store-row').nth(3);   // Roßmann
    await row.locator('input[name=name]').fill('Rossmann Drogerie'); await row.getByRole('button', { name: /speichern/ }).click();
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    const saved = remote.content.stores.find(entry => entry.id === 'store-ross');
    assert.equal(saved.name, 'Rossmann Drogerie');
    assert.equal(saved.offersUrl, '', 'Standardlink nicht festgeschrieben');
    assert.equal(saved.anywhere, null, 'Voreinstellung (Drogerie) nicht festgeschrieben');
    assert.equal(await page.locator('#store-editor .store-row').nth(3).locator('input[name=offersUrl]').inputValue(), 'https://www.rossmann.de/de/angebote');
    // Abweichung wird gespeichert
    await row.locator('input[name=anywhere]').check(); await row.getByRole('button', { name: /speichern/ }).click();
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    assert.equal(remote.content.stores.find(entry => entry.id === 'store-ross').anywhere, true);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Ziehen: Escape und spätes Loslassen öffnet nichts (Klick wird erst nach dem Loslassen wieder zugelassen)', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const row = page.locator('#items .item', { hasText: 'Nudeln' });
    await row.evaluate(node => node.scrollIntoView({ block: 'center' }));
    const box = await row.locator('.item-copy').boundingBox(), at = { x: box.x + 40, y: box.y + box.height / 2 };
    await page.mouse.move(at.x, at.y); await page.mouse.down();
    await page.waitForSelector('.drag-ghost');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.drag-ghost', { state: 'detached' });
    await page.waitForTimeout(700);   // länger als die frühere feste Frist
    await page.mouse.up();
    assert.equal(await page.locator('dialog[open]').count(), 0, 'das späte Loslassen öffnet die Bearbeitung nicht');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /^Nudeln, .*bearbeiten/ }).click(); await sheetOpen(page);   // danach geht ein Tipp wieder
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Preiszeile unter dem Artikel ist kurz (eine Zeile statt langem Satz)', async () => {
    const { ctx, page, problems } = await context({ context: { viewport: { width: 390, height: 664 } } });
    await open(page);
    const note = page.locator('#items .item', { hasText: 'Tomaten' }).locator('small.price-note', { hasText: /^(Am günstigsten|Preis):/ });
    const text = await note.textContent();
    assert.match(text, /^Am günstigsten: .+ [\d,]+\s€\/\S+ · \d\d\.\d\d\.\d\d( \(alt\))?$/, text);
    assert.ok((await note.boundingBox()).height < 2.2 * parseFloat(await note.evaluate(node => getComputedStyle(node).lineHeight)), 'höchstens zwei Zeilen statt vier');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Android (Pixel 7, Chrome): Layout, Ziehen zum Löschen per Touch, kein Kontextmenü beim langen Drücken', async () => {
    const { devices } = playwright;
    const { ctx, page, problems } = await context({ context: { ...devices['Pixel 7'] } });
    await open(page);
    assert.match(await page.evaluate(() => navigator.userAgent), /Android/);
    assert.equal(await horizontalOverflow(page), 0);
    assert.ok((await page.locator('#items .item').first().boundingBox()).y < 460, 'erste Zeile früh im Bild');
    await page.evaluate(() => { document.body.style.minHeight = '3000px'; });   // scrollbar machen, damit ein Mitscrollen auffiele
    const row = page.locator('#items .item', { hasText: 'Milch' });
    await row.evaluate(node => node.scrollIntoView({ block: 'center' }));
    // Langes Drücken löst auf Android ein „contextmenu“ aus: Es wird unterdrückt
    const prevented = await row.locator('.item-copy').evaluate(node => { const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); node.dispatchEvent(event); return event.defaultPrevented; });
    assert.equal(prevented, true);
    const box = await row.locator('.item-copy').boundingBox(), width = await page.evaluate(() => innerWidth);
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const y = box.y + box.height / 2;
    // Kurzes Halten mit Wischen bricht ab (es soll scrollen)
    await touch('touchStart', box.x + 40, y); await touch('touchMove', box.x + 40, y + 30); await page.waitForTimeout(600);
    assert.equal(await page.locator('.drag-ghost').count(), 0);
    await touch('touchEnd');
    // Halten, ziehen, loslassen im roten Mülleimer (das Wischen davor hat die Seite scrollen lassen: ab hier darf sie sich nicht mehr bewegen)
    const before = await page.evaluate(() => scrollY);
    await touch('touchStart', box.x + 40, y);
    await page.waitForSelector('.drag-ghost');
    for (let step = 1; step <= 8; step++) await touch('touchMove', box.x + 40 + (width - 30 - box.x - 40) * step / 8, y + step * 5);
    await page.waitForSelector('#trash-zone.hot');
    assert.equal(await page.evaluate(() => scrollY), before, 'die Seite hat beim Ziehen nicht mitgescrollt');
    await touch('touchEnd');
    await page.waitForFunction(() => ![...document.querySelectorAll('#items .item strong')].some(node => node.textContent === 'Milch'));
    assert.equal(await page.locator('dialog[open]').count(), 0, 'danach öffnet sich nichts');
    // Im Laden: Geschäfte oben, Layout ohne Überlauf
    await page.click('#mode-shop');
    assert.ok((await page.locator('#shop-chips .chip').first().boundingBox()).y < 24);
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  // Beispieldaten plus ein Rossmann (wie über das Formular angelegt: Angebotslink leer), ein Artikel dort und ein Artikel ohne Geschäft
  const withRossmann = () => {
    const data = structuredClone(demo), at = '2026-10-25T00:00:00.000Z';
    data.stores.push({ id: 'store-ross', name: 'Roßmann', offersUrl: '', createdAt: at, updatedAt: at, deletedAt: null, _clock: {} });
    data.items.push({ id: 'item-shampoo', storeId: 'store-ross', name: 'Shampoo', quantity: 1, unit: 'Stück', checked: false, createdBy: 'Nico', createdAt: at, updatedAt: at, deletedAt: null, _clock: {}, onSale: false },
      { id: 'item-brot', storeId: '', name: 'Brot', quantity: 1, unit: 'Stück', checked: false, createdBy: 'Nico', createdAt: at, updatedAt: at, deletedAt: null, _clock: {}, onSale: false });
    return data;
  };

  test('Rossmann: Artikel ohne Geschäft stehen dort im Laden nicht (einstellbar), Angebotsseite ist hinterlegt', async () => {
    const remote = github(withRossmann());
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    // Planen: Angebotsseite von Rossmann
    await page.getByRole('tab', { name: /^Roßmann/ }).click();
    assert.equal(await page.getAttribute('#offers-link', 'href'), 'https://www.rossmann.de/de/angebote');
    // Im Laden: bei Edeka steht Brot unter „Überall möglich“, bei Rossmann nicht
    await page.click('#mode-shop');
    const names = async () => (await page.locator('#shop-list .shop-name').allTextContents()).sort();
    const chip = name => page.locator('#shop-chips .chip', { hasText: name });
    await chip('Edeka').click();
    assert.ok((await names()).includes('Brot'));
    await chip('Roßmann').click();
    assert.deepEqual(await names(), ['Shampoo']);
    assert.match(await page.textContent('#shop-list'), /1 Artikel ohne Geschäft stehen hier nicht/);
    assert.match(await chip('Roßmann').textContent(), /Roßmann\s*1$/, 'der Zähler am Reiter zählt Brot nicht mit');
    assert.match(await chip('Edeka').textContent(), /Edeka\s*3$/);
    // Einstellbar: im Dialog „Geschäfte“ lässt sich das pro Geschäft umstellen
    await page.click('#shop-back'); await page.click('#manage-stores'); await sheetOpen(page);
    const row = name => page.locator('#store-editor .store-row').nth({ Edeka: 0, 'Roßmann': 3 }[name]);
    assert.equal(await row('Roßmann').locator('input[name=anywhere]').isChecked(), false, 'Drogerie: standardmäßig aus');
    assert.equal(await row('Edeka').locator('input[name=anywhere]').isChecked(), true);
    assert.match(await row('Roßmann').locator('input[name=offersUrl]').inputValue(), /rossmann\.de\/de\/angebote/, 'der Standardlink steht im Feld');
    await row('Roßmann').locator('input[name=anywhere]').check(); await row('Roßmann').getByRole('button', { name: /speichern/ }).click();
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
    await page.click('#mode-shop'); await chip('Roßmann').click();
    assert.deepEqual(await names(), ['Brot', 'Shampoo'], 'nach der Umstellung stehen Artikel ohne Geschäft auch dort');
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    assert.equal(remote.content.stores.find(row => row.id === 'store-ross').anywhere, true, 'die Einstellung liegt in der gemeinsamen Datei');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Geschäfte als Text oder Logo: Auswahl in den Einstellungen, bleibt nach dem Neuladen', async () => {
    const data = withRossmann(), at = '2026-10-25T00:00:00.000Z';
    data.stores.push({ id: 'store-metzger', name: 'Metzger Müller', createdAt: at, updatedAt: at, deletedAt: null, _clock: {} });
    const { ctx, page, problems } = await context({ config: connectedConfig });
    const remote = github(data);
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    assert.equal(await page.locator('.brand').count(), 0, 'Standard: Text');
    await openSettings(page);
    assert.equal(await page.inputValue('#store-style'), 'text');
    await page.selectOption('#store-style', 'logo');
    await page.click('[data-tab=shopping]');
    const brand = cls => page.locator(`#store-chips .chip .${cls}`);
    assert.equal(await brand('brand-edeka').count(), 1);
    assert.equal(await brand('brand-lidl').count(), 1);
    assert.equal(await brand('brand-rewe').count(), 1);
    assert.equal(await brand('brand-rossmann').count(), 1, 'Roßmann und Rossmann werden erkannt');
    assert.equal(await page.locator('#store-chips .chip .brand').count(), 4, 'Metzger Müller ist unbekannt und bleibt Text');
    assert.match(await page.locator('#store-chips .chip', { hasText: 'Metzger' }).textContent(), /Metzger Müller/);
    assert.ok(await page.locator('#items .store-head .brand').count() >= 1, 'auch die Überschriften in der Liste');
    assert.ok(await page.getByRole('tab', { name: /^Edeka/ }).count() === 1, 'der Name bleibt für Screenreader und Suche erhalten');
    await expandForm(page);
    assert.ok(await page.locator('#store-pick .chip .brand-lidl').count() === 1, 'auch die Schnellwahl beim Hinzufügen');
    await page.click('#mode-shop');
    assert.equal(await page.locator('#shop-chips .chip .brand-edeka').count(), 1, 'und im Laden');
    assert.equal(await horizontalOverflow(page), 0);
    // bleibt nach dem Neuladen, und zurück auf Text
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    assert.equal(await page.locator('#shop-chips .chip .brand-edeka').count(), 1);
    await page.click('#shop-back'); await openSettings(page);
    await page.selectOption('#store-style', 'text');
    await page.click('[data-tab=shopping]');
    assert.equal(await page.locator('.brand').count(), 0);
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  // Nachgebaute Tagesrezepte-Seite und Rezeptseiten hinter einem „Hilfsdienst“ (kein echtes Chefkoch: Es geht um den Ablauf in der App)
  const PROXY = 'https://rezepte.beispiel.workers.dev';
  const dailyLinks = count => Array.from({ length: count }, (_, index) => `/rezepte/${2000000 + index}/Tagesrezept-Nummer-${index + 1}.html`);
  const dailySite = (count = 12, behavior = {}) => async route => {
    const url = new URL(route.request().url()), target = new URL(url.searchParams.get('url'));
    const cors = { 'access-control-allow-origin': '*', 'content-type': 'text/html; charset=utf-8' };
    if (behavior.fail) return route.fulfill({ status: 502, headers: cors, body: 'kaputt' });
    behavior.requests = (behavior.requests || 0) + 1;
    if (target.pathname.startsWith('/rezepte/tagesrezepte')) {
      return route.fulfill({ status: 200, headers: cors, body: `<!doctype html><html><head><title>Tagesrezepte</title></head><body>${'x'.repeat(250)}<nav><a href="/rezepte/">Rezepte</a></nav>${dailyLinks(count).map(link => `<a href="${link}?x=1">Rezept</a>`).join('')}</body></html>` });
    }
    const number = Number(/Nummer-(\d+)/.exec(target.pathname)?.[1] || 0);
    const recipe = { '@context': 'https://schema.org', '@type': 'Recipe', name: `Tagesrezept ${number}`, recipeYield: '4 Portionen', totalTime: 'PT30M',
      recipeIngredient: ['200 g Mehl', '2 Eier', '1 Prise Salz'], recipeInstructions: 'Alles verrühren.\nAusbacken.' };
    return route.fulfill({ status: 200, headers: cors, body: `<!doctype html><html><head><title>Tagesrezept ${number}</title><script type="application/ld+json">${JSON.stringify(recipe)}</script></head><body>${'x'.repeat(250)}</body></html>` });
  };
  const dailyConfig = { importProxy: PROXY, dailySource: 'https://www.chefkoch.de/rezepte/tagesrezepte/' };

  test('Rezepte des Tages: bis zu zehn einzeln durchklicken, 0 bis alle hinzufügen, entschiedene kommen nicht wieder', async () => {
    const behavior = {};
    const { ctx, page, problems } = await context({ config: dailyConfig });
    await ctx.route(`${PROXY}/**`, dailySite(12, behavior));
    await open(page);
    await page.click('[data-tab=recipes]');
    await page.waitForFunction(() => /10 offen/.test(document.querySelector('#daily-label').textContent));   // die Liste wurde still vorgeladen
    const recipeCount = () => page.locator('#recipe-list .recipe-card').count();
    const before = await recipeCount();
    await page.click('#daily-open'); await sheetOpen(page);
    assert.match(await page.textContent('#daily-progress'), /Rezept 1 von 10/);
    await page.waitForSelector('#daily-card h3:has-text("Tagesrezept 1")');
    assert.match(await page.textContent('#daily-card'), /30 Min.*4 Portionen.*3 Zutaten/);
    assert.match(await page.textContent('#daily-card'), /200 g Mehl/);
    assert.equal(await page.getAttribute('#daily-card a.daily-link', 'href'), 'https://www.chefkoch.de/rezepte/2000000/Tagesrezept-Nummer-1.html');
    // 1 hinzufügen, 2 überspringen, 3 hinzufügen, den Rest überspringen
    const decide = async (number, button) => {
      await page.waitForSelector(`#daily-card h3:has-text("Tagesrezept ${number}")`);
      await page.click(button);
    };
    await decide(1, '#daily-add');
    await page.waitForSelector('#daily-card h3:has-text("Tagesrezept 2")');
    assert.match(await page.textContent('#daily-progress'), /Rezept 2 von 10/);
    await decide(2, '#daily-skip');
    await decide(3, '#daily-add');
    for (let number = 4; number <= 10; number++) await decide(number, '#daily-skip');
    await page.waitForSelector('#daily-card h3:has-text("Für heute geschafft")');
    assert.match(await page.textContent('#daily-card'), /2 von 10 Rezepten hinzugefügt, 8 übersprungen/);
    assert.equal(await page.locator('#daily-add').isHidden(), true);
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
    assert.equal(await recipeCount(), before + 2, 'zwei neue Rezepte in der Sammlung');
    assert.equal(await page.locator('#recipe-list', { hasText: 'Tagesrezept 3' }).count(), 1);
    assert.match(await page.textContent('#daily-label'), /alles gesehen/);
    // Gespeichert mit Quelle und Zutaten
    await page.locator('#recipe-list .recipe-card', { hasText: 'Tagesrezept 3' }).click();
    await page.waitForSelector('#recipe-list .recipe-card[open], #recipe-list details[open]').catch(() => {});
    const card = page.locator('#recipe-list .recipe-card', { hasText: 'Tagesrezept 3' });
    assert.match(await card.textContent(), /200 g Mehl/);
    assert.match(await card.textContent(), /Eier/);
    // Am nächsten Tag: nur die zwei Rezepte, die gestern nicht dabei waren (die entschiedenen zehn und vorhandenen bleiben weg)
    await page.evaluate(() => { const key = 'einkauf-daily:einkauf-demo-v1'; const data = JSON.parse(localStorage.getItem(key)); data.day = '2020-01-01'; localStorage.setItem(key, JSON.stringify(data)); });
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    await page.click('[data-tab=recipes]');
    await page.waitForFunction(() => /2 offen/.test(document.querySelector('#daily-label').textContent));
    await page.click('#daily-open'); await sheetOpen(page);
    await page.waitForSelector('#daily-card h3:has-text("Tagesrezept 11")');
    assert.match(await page.textContent('#daily-progress'), /Rezept 1 von 2/);
    await page.click('#daily-skip'); await page.waitForSelector('#daily-card h3:has-text("Tagesrezept 12")');
    await page.click('#daily-skip'); await page.waitForSelector('#daily-card h3:has-text("Für heute geschafft")');
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  test('Rezepte des Tages ohne Hilfsdienst: drei eingebaute Rezepte pro Tag, hinzufügen/überspringen, am nächsten Tag neue', async () => {
    const { ctx, page, problems } = await context();   // kein Hilfsdienst, kein Link
    const external = [];
    page.on('request', request => { if (!request.url().startsWith(base)) external.push(request.url()); });
    await open(page);
    await page.click('[data-tab=recipes]');
    await page.waitForFunction(() => /3 offen/.test(document.querySelector('#daily-label').textContent));
    const recipeCount = () => page.locator('#recipe-list .recipe-card').count();
    const before = await recipeCount();
    await page.click('#daily-open'); await sheetOpen(page);
    assert.match(await page.textContent('#daily-progress'), /Rezept 1 von 3/);
    const title = async () => (await page.textContent('#daily-card h3')).trim();
    const first = [];
    await page.waitForSelector('#daily-card .daily-ingredients');
    first.push(await title());
    assert.match(await page.textContent('#daily-card'), /(Min|Std)\..*Portionen.*Zutaten/s);
    assert.match(await page.textContent('#daily-card'), /Aus der eingebauten Sammlung/);
    assert.equal(await page.locator('#daily-card a.daily-link').count(), 0, 'keine fremde Seite');
    await page.click('#daily-add');                                        // 1: hinzufügen
    await page.waitForFunction(text => document.querySelector('#daily-card h3')?.textContent.trim() !== text, first[0]);
    first.push(await title()); await page.click('#daily-skip');           // 2: überspringen
    await page.waitForFunction(text => document.querySelector('#daily-card h3')?.textContent.trim() !== text, first[1]);
    first.push(await title()); await page.click('#daily-add');            // 3: hinzufügen
    await page.waitForSelector('#daily-card h3:has-text("Für heute geschafft")');
    assert.match(await page.textContent('#daily-card'), /2 von 3 Rezepten hinzugefügt, 1 übersprungen/);
    assert.equal(new Set(first).size, 3);
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
    assert.equal(await recipeCount(), before + 2);
    for (const name of [first[0], first[2]]) assert.equal(await page.locator('#recipe-list .recipe-card', { hasText: name }).count(), 1, name);
    assert.equal(await page.locator('#recipe-list .recipe-card', { hasText: first[1] }).count(), 0, 'das übersprungene wurde nicht hinzugefügt');
    // Das hinzugefügte Rezept ist vollständig und benutzbar (Zutaten, Schritte, Portionen)
    const card = page.locator('#recipe-list .recipe-card', { hasText: first[0] });
    assert.match(await card.textContent(), /Zutaten/);
    assert.match(await card.textContent(), /Zubereitung/);
    assert.match(await page.textContent('#daily-label'), /alles gesehen/);
    // Nächster Tag: drei andere Rezepte
    await page.evaluate(() => { const key = 'einkauf-daily:einkauf-demo-v1'; const data = JSON.parse(localStorage.getItem(key)); data.day = '2020-01-01'; localStorage.setItem(key, JSON.stringify(data)); });
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    await page.click('[data-tab=recipes]');
    await page.waitForFunction(() => /3 offen/.test(document.querySelector('#daily-label').textContent));
    await page.click('#daily-open'); await sheetOpen(page);
    await page.waitForSelector('#daily-card .daily-ingredients');
    assert.ok(!first.includes(await title()), 'ein neues Rezept');
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(external, [], 'es wurde keine fremde Adresse abgerufen (kein Hilfsdienst, kein Netz nötig)');
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  // Ein anderer Tag: Date läuft um `Tage` vor (die Zahl steht im localStorage und überlebt das Neuladen).
  const withDayOffset = ctx => ctx.addInitScript(() => {
    const Original = Date, offset = () => Number(localStorage.getItem('test-day-offset') || 0) * 86400000;
    window.Date = class extends Original { constructor(...args) { if (args.length) super(...args); else super(Original.now() + offset()); } static now() { return Original.now() + offset(); } };
  });
  const dayString = offset => { const date = new Date(Date.now() + offset * 86400000); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
  // Alle Rezepte der Sammlung sind entschieden. Mit `day` = heute und leerer Liste: der Stand von vor den neuen Rezepten („alles gesehen“).
  const finishCollection = (page, day = '') => page.evaluate(async today => {
    const all = await (await fetch('./rezepte-des-tages.json')).json();
    localStorage.setItem('einkauf-daily:einkauf-demo-v1', JSON.stringify({ day: today, source: 'eingebaut', queue: [], index: 0, outcome: {}, builtin: true, decided: all.map(entry => `eigene:${entry.n.toLowerCase()}`) }));
    return all.length;
  }, day);

  test('Rezepte des Tages: ist die Sammlung durch, kommen automatisch neue Rezepte, und gespeichert wird nur, was hinzugefügt wird', async () => {
    const { ctx, page, problems } = await context();
    await withDayOffset(ctx);
    const external = [];
    page.on('request', request => { if (!request.url().startsWith(base)) external.push(request.url()); });
    await open(page);
    const total = await finishCollection(page, dayString(0));   // heute schon als „alles gesehen“ gespeichert: wird neu geplant
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    await page.click('[data-tab=recipes]');
    await page.waitForFunction(() => /3 offen/.test(document.querySelector('#daily-label').textContent), null, { timeout: 8000 });
    await page.click('#daily-open'); await sheetOpen(page);
    await page.waitForSelector('#daily-card .daily-ingredients');
    const title = async () => (await page.textContent('#daily-card h3')).trim();
    const advance = async button => { const old = await title(); await page.click(button); await page.waitForFunction(text => document.querySelector('#daily-card h3')?.textContent.trim() !== text, old); };
    assert.equal(await page.locator('#daily-reset').count(), 0, 'kein „Von vorn beginnen“ mehr');
    assert.match(await page.textContent('#daily-card'), /Neu zusammengestellt\. Gespeichert wird nur, was du hinzufügst\./);
    assert.match(await page.textContent('#daily-card'), /(Min|Std)\..*Portionen.*Zutaten/s);
    const shown = [await title()];
    await advance('#daily-add'); shown.push(await title());
    await advance('#daily-skip'); shown.push(await title());
    await advance('#daily-skip');
    await page.waitForSelector('#daily-card h3:has-text("Für heute geschafft")');
    assert.match(await page.textContent('#daily-card'), /1 von 3 Rezepten hinzugefügt, 2 übersprungen/);
    assert.equal(new Set(shown).size, 3);
    const expected = planGenerated(dayString(0)).map(pick => pick.title);
    assert.deepEqual(shown, expected, 'dieselben drei wie auf jedem anderen Gerät (feste Reihenfolge, nur der Tag zählt)');
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
    assert.equal(await page.locator('#recipe-list .recipe-card', { hasText: shown[0] }).count(), 1, 'das hinzugefügte Rezept ist gespeichert');
    for (const name of shown.slice(1)) assert.equal(await page.locator('#recipe-list .recipe-card', { hasText: name }).count(), 0, `${name} wurde übersprungen und steht nirgends`);
    const card = page.locator('#recipe-list .recipe-card', { hasText: shown[0] });
    assert.match(await card.textContent(), /Zutaten/); assert.match(await card.textContent(), /Zubereitung/);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-daily:einkauf-demo-v1')));
    assert.equal(saved.decided.length, total, 'gemerkt wird nur die eingebaute Sammlung, nichts von den neu zusammengestellten');
    assert.ok(!JSON.stringify(saved.decided).toLowerCase().includes(shown[1].toLowerCase()));
    // Am nächsten Tag drei andere, wieder neue Rezepte
    await page.evaluate(() => localStorage.setItem('test-day-offset', '1'));
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    await page.click('[data-tab=recipes]');
    await page.waitForFunction(() => /3 offen/.test(document.querySelector('#daily-label').textContent), null, { timeout: 8000 });
    await page.click('#daily-open'); await sheetOpen(page);
    await page.waitForSelector('#daily-card .daily-ingredients');
    const tomorrow = [await title()];
    await advance('#daily-skip'); tomorrow.push(await title());
    await advance('#daily-skip'); tomorrow.push(await title());
    assert.deepEqual(tomorrow, planGenerated(dayString(1)).map(pick => pick.title));
    assert.ok(tomorrow.every(name => !shown.includes(name)), 'nichts vom Vortag');
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(external, [], 'kein Netz nötig');
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  test('Rezepte des Tages: bleiben noch Rezepte der Sammlung übrig, füllen neue die freien Plätze des Tages', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.evaluate(async () => {
      const all = await (await fetch('./rezepte-des-tages.json')).json();   // alle bis auf ein Rezept entschieden
      localStorage.setItem('einkauf-daily:einkauf-demo-v1', JSON.stringify({ day: '', source: 'eingebaut', queue: [], index: 0, outcome: {}, decided: all.slice(1).map(entry => `eigene:${entry.n.toLowerCase()}`) }));
      localStorage.setItem('test-rest', all[0].n);
    });
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    await page.click('[data-tab=recipes]'); await page.waitForFunction(() => /3 offen/.test(document.querySelector('#daily-label').textContent), null, { timeout: 8000 });
    await page.click('#daily-open'); await sheetOpen(page);
    await page.waitForSelector('#daily-card .daily-ingredients');
    const rest = await page.evaluate(() => localStorage.getItem('test-rest'));
    assert.equal((await page.textContent('#daily-card h3')).trim(), rest, 'zuerst das letzte Rezept der Sammlung');
    assert.match(await page.textContent('#daily-card'), /Aus der eingebauten Sammlung/);
    await page.click('#daily-skip');
    await page.waitForFunction(() => /Neu zusammengestellt/.test(document.querySelector('#daily-card').textContent));
    assert.match(await page.textContent('#daily-progress'), /Rezept 2 von 3/);
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  for (const width of [280, 314, 390]) {
    test(`Rezepte des Tages: der Dialog lässt sich nicht zur Seite schieben (${width} px, auch mit großer Schrift)`, async () => {
      const { ctx, page, problems } = await context({ context: { viewport: { width, height: 700 } } });
      await open(page);
      await page.click('[data-tab=recipes]');
      await page.waitForFunction(() => /3 offen/.test(document.querySelector('#daily-label').textContent), null, { timeout: 8000 });
      const measure = () => page.evaluate(() => {
        const dialog = document.querySelector('#daily-dialog'), limit = document.documentElement.clientWidth, wide = [];
        for (const node of dialog.querySelectorAll('*')) { const box = node.getBoundingClientRect(); if (box.width && (box.right > limit + 0.5 || box.left < -0.5)) wide.push(`${node.tagName.toLowerCase()}#${node.id} ${Math.round(box.left)}…${Math.round(box.right)}`); }
        return { overflow: dialog.scrollWidth - dialog.clientWidth, wide, page: document.documentElement.scrollWidth - limit, scrollLeft: dialog.scrollLeft };
      });
      await page.click('#daily-open'); await sheetOpen(page);
      await page.waitForSelector('#daily-card .daily-ingredients');
      for (const scale of ['100%', '150%', '200%']) {
        await page.evaluate(size => { document.documentElement.style.fontSize = size; }, scale);
        for (let step = 0; step < 3; step++) {
          const result = await measure();
          assert.deepEqual(result, { overflow: 0, wide: [], page: 0, scrollLeft: 0 }, `Schrift ${scale}, Rezept ${step + 1}`);
          // Ein Wischversuch zur Seite bewegt nichts
          await page.evaluate(() => { document.querySelector('#daily-dialog').scrollLeft = 80; });
          assert.equal((await measure()).scrollLeft, 0, 'seitlich nicht scrollbar');
          if (step < 2) { const old = (await page.textContent('#daily-card h3')).trim(); await page.click('#daily-skip'); await page.waitForFunction(text => document.querySelector('#daily-card h3')?.textContent.trim() !== text, old); }
        }
        await page.evaluate(() => localStorage.removeItem('einkauf-daily:einkauf-demo-v1'));
        await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
        await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
        await page.click('[data-tab=recipes]'); await page.waitForFunction(() => /3 offen/.test(document.querySelector('#daily-label').textContent), null, { timeout: 8000 });
        await page.click('#daily-open'); await sheetOpen(page); await page.waitForSelector('#daily-card .daily-ingredients');
      }
      assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
      await ctx.close();
    });
  }

  test('Rezepte des Tages mit eigener Seite: Fehler lassen sich wiederholen, Link prüfen und speichern, Stand wird gemerkt', async () => {
    const behavior = { fail: true };
    const { ctx, page, problems } = await context({ config: { importProxy: PROXY } });
    await ctx.route(`${PROXY}/**`, dailySite(3, behavior));
    await open(page);
    await openSettings(page);
    // Ungültiger Link wird abgelehnt, gültiger gespeichert
    await page.fill('#import-settings-form input[name=dailySource]', 'ftp://beispiel.de/rezepte');
    await page.click('#import-settings-form button[type=submit]');
    await page.waitForSelector('#message:not([hidden])');
    assert.match(await page.textContent('#message'), /vollständigen Link/);
    await page.fill('#import-settings-form input[name=dailySource]', 'https://www.chefkoch.de/rezepte/tagesrezepte/');
    await page.click('#import-settings-form button[type=submit]');
    await page.waitForFunction(() => /^Gespeichert am/.test(document.querySelector('#import-settings-form button[type=submit]').textContent.trim()));
    // Der Hilfsdienst fällt aus: Meldung, dann „Erneut versuchen“
    await page.click('[data-tab=recipes]'); await page.click('#daily-open'); await sheetOpen(page);
    await page.waitForFunction(() => document.querySelector('#daily-note').textContent.length > 0);
    assert.equal(await page.locator('#daily-retry').isVisible(), true);
    assert.equal(await page.locator('#daily-add').isHidden(), true);
    behavior.fail = false;
    await page.click('#daily-retry');
    await page.waitForSelector('#daily-card h3:has-text("Tagesrezept 1")');
    assert.equal(await page.locator('#daily-note').textContent(), '');
    await page.click('#daily-add');
    await page.waitForSelector('#daily-card h3:has-text("Tagesrezept 2")');
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
    assert.match(await page.textContent('#daily-label'), /2 offen/, 'Schließen merkt den Stand');
    await page.click('#daily-open'); await sheetOpen(page);
    await page.waitForSelector('#daily-card h3:has-text("Tagesrezept 2")');
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  test('Rezepte des Tages: schon vorhandene Rezepte (gleiche Quelle) und Seiten ohne Rezept-Links', async () => {
    const behavior = {};
    const { ctx, page, problems } = await context({ config: dailyConfig });
    await ctx.route(`${PROXY}/**`, dailySite(3, behavior));
    await open(page);
    // Ein Rezept mit derselben Quelle wie Tagesrezept 1 anlegen (über das Formular)
    await page.click('[data-tab=recipes]'); await page.click('#add-recipe'); await sheetOpen(page);
    await page.fill('#recipe-form input[name=name]', 'Mein Tagesrezept'); await page.fill('#recipe-form input[name=sourceUrl]', 'https://www.chefkoch.de/rezepte/2000000/Ganz-anderer-Name.html');
    await page.locator('#ingredient-editor [data-field=name]').first().fill('Mehl'); await page.locator('#ingredient-editor [data-field=quantity]').first().fill('1');
    await page.click('#recipe-form button[type=submit]'); await page.waitForSelector('#recipe-dialog', { state: 'hidden' });
    await page.click('#daily-open'); await sheetOpen(page);
    await page.waitForSelector('#daily-card h3:has-text("Tagesrezept 2")');
    assert.match(await page.textContent('#daily-progress'), /Rezept 2 von 3/, 'das vorhandene Rezept (Nummer 1) wird übersprungen, nicht noch einmal vorgeschlagen');
    await page.keyboard.press('Escape');
    // Seite ohne Rezepte
    await page.evaluate(() => localStorage.removeItem('einkauf-daily:einkauf-demo-v1'));
    await ctx.unroute(`${PROXY}/**`);
    await ctx.route(`${PROXY}/**`, route => route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'text/html' }, body: `<html><body>${'Hallo '.repeat(80)}<a href="/magazin/">Magazin</a></body></html>` }));
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    await page.click('[data-tab=recipes]'); await page.click('#daily-open'); await sheetOpen(page);
    await page.waitForFunction(() => /keine Rezept-Links gefunden/.test(document.querySelector('#daily-card').textContent));
    assert.equal(await page.locator('#daily-add').isHidden(), true);
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  for (const width of [280, 314, 390]) {
    test(`Einstellungen: nichts lässt sich seitlich verschieben (${width} px), auch wenn <summary> kein Flex kann (ältere iOS-Versionen)`, async () => {
      const day = new Date(Date.now() + 2 * 86400000), stamp = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      const { ctx, page, problems } = await context({ context: { viewport: { width, height: 700 } },
        config: { ...connectedConfig, owner: 'haushalt-mueller-schmidt', repo: 'einkaufsliste-daten-privat', tokenExpires: stamp, dailySource: 'https://www.chefkoch.de/rezepte/tagesrezepte/mit-sehr-langem-pfad/und-noch-mehr-pfad/' } });
      await ctx.route('https://api.github.com/**', route => route.abort());
      await open(page);
      await page.click('[data-tab=settings]');
      const widths = () => page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth, document.body.scrollWidth]);
      for (const [label, prepare] of [['Bereiche zu', () => {}], ['Bereiche offen', () => document.querySelectorAll('#settings details.fold').forEach(node => { node.open = true; })],
        ['ohne Flex in <summary>, Bereiche zu', () => { document.styleSheets[0].insertRule('summary { display: block !important }'); document.querySelectorAll('#settings details.fold').forEach(node => { node.open = false; }); }],
        ['ohne Flex in <summary>, Bereiche offen', () => document.querySelectorAll('#settings details.fold').forEach(node => { node.open = true; })]]) {
        await page.evaluate(prepare);
        const [scroll, client, body] = await widths();
        assert.ok(scroll <= client && body <= client, `${label}: Seite ist ${Math.max(scroll, body)} px breit statt ${client} px`);
      }
      assert.match(await page.textContent('#connection-state'), /haushalt-mueller-schmidt.*Token läuft in 2 Tagen ab/, 'der lange Hinweis steht vollständig da (bricht um statt abzuschneiden)');
      assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
      await ctx.close();
    });
  }

  test('Anleitung: eigenes Fenster in der App, gegliedert, schließbar, kein Rohtext', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('[data-tab=settings]');
    assert.equal(await page.locator('a[href$=".md"]').count(), 0, 'kein Link auf eine Textdatei');
    assert.equal(await page.locator('#open-help').isVisible(), true, 'Knopf steht oben, nicht in einem zugeklappten Bereich');
    await page.click('#open-help'); await sheetOpen(page);
    const sections = page.locator('#help-body details.help-section');
    assert.ok(await sections.count() >= 10, 'gegliedert in Abschnitte');
    assert.equal(await page.locator('#help-body details[open]').count(), 1, 'nur der erste Abschnitt ist offen');
    const text = await page.textContent('#help-body');
    assert.ok(!/\*\*|`|^#|\]\(/m.test(text), `Markdown-Zeichen im Text: ${text.match(/\*\*|`|\]\(/)?.[0]}`);
    assert.ok(await page.locator('#help-body strong').count() > 10, 'Wichtiges ist fett');
    assert.ok(await page.locator('#help-body code').count() >= 2, 'Eingaben als Code');
    // Abschnitte auf- und zuklappen
    const second = sections.nth(1);
    await second.locator('summary').click();
    assert.equal(await second.evaluate(node => node.open), true);
    assert.match(await second.textContent(), /privates.*Repository/s);
    await second.locator('summary').click();
    assert.equal(await second.evaluate(node => node.open), false);
    // Äußerer Link nur auf GitHub, in neuem Fenster
    const link = page.locator('#help-dialog a');
    assert.equal(await link.count(), 1);
    assert.match(await link.getAttribute('href'), /^https:\/\/github\.com\/NicoAHB\/Einkaufsliste-Rezepte/);
    assert.match(await link.getAttribute('rel'), /noopener/);
    assert.equal(await link.getAttribute('target'), '_blank');
    // Schließen: Knopf oben, Knopf unten, Escape
    const close = async how => {
      if (how === 'top') await page.click('#help-dialog .sheet-head [data-close]');
      else if (how === 'bottom') await page.click('#help-dialog > .stack > [data-close]');
      else await page.keyboard.press('Escape');
      await page.waitForSelector('dialog[open]', { state: 'detached' });
    };
    await close('top');
    for (const how of ['bottom', 'escape']) { await page.click('#open-help'); await sheetOpen(page); await close(how); }
    assert.equal(await page.locator('#help-body details.help-section').count(), await sections.count(), 'wird nicht doppelt aufgebaut');
    assert.equal(await horizontalOverflow(page), 0);
    // Das Fenster passt auch auf kleine Geräte
    await page.setViewportSize({ width: 320, height: 568 });
    await page.click('#open-help'); await sheetOpen(page);
    assert.ok(await page.evaluate(() => { const dialog = document.querySelector('#help-dialog'); return dialog.scrollWidth <= dialog.clientWidth; }), 'kein seitlicher Überlauf im Fenster');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Kopfbereich: kein Beispielmodus-Banner, eine schmale Statuszeile, die zum Verbinden führt', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    assert.equal(await page.locator('#demo-banner').count(), 0, 'das Banner ist weg');
    assert.ok(!(await page.textContent('body')).includes('erfundene Daten'));
    const top = await page.locator('.topbar').boundingBox();
    assert.ok(top.height <= 56, `Kopfzeile ist ${top.height} px hoch`);
    assert.ok((await page.locator('.topbar h1').boundingBox()).width <= 1, 'Überschrift nur für Screenreader');
    assert.match(await page.textContent('#syncline'), /Nur auf diesem Gerät.*Nico/);
    // Ohne Verbindung führt ein Tipp auf die Statuszeile in die Einstellungen
    await page.click('#syncline');
    assert.equal(await page.locator('#settings').isVisible(), true);
    assert.equal(await page.locator('#connection-details').evaluate(node => node.open), true, 'Verbinden steht offen da');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Kopfbereich: Statuszeile gleicht bei Verbindung ab', async () => {
    const remote = github(structuredClone(demo));
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    const gets = remote.stats.gets;
    await page.click('#syncline');
    await page.waitForFunction(count => count > 0, remote.stats.gets - gets);
    assert.equal(await page.locator('#settings').isHidden(), true, 'bleibt auf der Liste');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  for (const width of [280, 314, 360, 390, 430]) {
    test(`Platz oben (${width} px): Summe und Knöpfe überlappen nicht, Artikel beginnen früh, Im Laden: Geschäfte ganz oben`, async () => {
      const { ctx, page, problems } = await context({ context: { viewport: { width, height: 664 } } });
      await open(page);
      const box = async selector => page.locator(selector).first().boundingBox();
      const total = await box('#shopping-total'), tools = await box('.shop-tools');
      assert.ok(total.x + total.width <= tools.x + 1, 'Summentext reicht nicht unter die Knöpfe');
      const modes = await box('#mode-switch'), stores = await box('#manage-stores');
      assert.ok(modes.x + modes.width <= stores.x + 1 && modes.height <= 52, 'Planen/Im Laden bleibt einzeilig');
      assert.ok(await page.locator('#mode-shop').evaluate(node => node.getBoundingClientRect().height <= 44), '„Im Laden“ bricht nicht um');
      assert.ok((await box('#items .item')).y < 460, `erster Artikel steht erst bei ${(await box('#items .item')).y} px`);
      assert.equal(await horizontalOverflow(page), 0);
      // In jedem Geschäft (mit und ohne Angebotslink): Summentext und beide Knöpfe liegen nebeneinander in der Karte, nichts überlappt oder ragt hinaus
      for (const name of ['Edeka', 'Lidl', 'Rewe']) {
        await page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();
        const layout = await page.evaluate(() => {
          const rect = selector => { const node = document.querySelector(selector); return node && !node.hidden && node.getClientRects().length ? node.getBoundingClientRect() : null; };
          const card = rect('.summary'), text = rect('#shopping-total'), buttons = ['#offers-link', '#set-offers', '#open-receipt'].map(rect).filter(Boolean);
          const inner = document.querySelector('#shopping-total').querySelector('strong, small');
          return { card, text, buttons, textFits: !inner || inner.scrollWidth <= document.querySelector('#shopping-total').clientWidth + 1 };
        });
        assert.ok(layout.buttons.length >= 2, `${name}: Knöpfe sichtbar`);
        assert.ok(layout.textFits, `${name}: Summentext ragt über seinen Platz hinaus`);
        const parts = [layout.text, ...layout.buttons].sort((a, b) => a.left - b.left);
        for (let index = 1; index < parts.length; index++) assert.ok(parts[index].left >= parts[index - 1].right - 0.5, `${name}: Summe und Knöpfe überlappen bei ${width} px`);
        assert.ok(parts.every(part => part.left >= layout.card.left - 0.5 && part.right <= layout.card.right + 0.5 && part.top >= layout.card.top - 0.5 && part.bottom <= layout.card.bottom + 0.5), `${name}: etwas liegt außerhalb der Karte`);
        assert.ok(layout.card.height <= 64, `${name}: Karte ist ${layout.card.height} px hoch`);
      }
      await page.getByRole('tab', { name: /^Alle/ }).click();
      // Im Laden: ganz oben nur die Geschäfte, gleich darunter die Artikel; Kopfzeile und Umschalter sind weg
      await page.click('#mode-shop');
      assert.equal(await page.locator('.topbar').isHidden(), true);
      assert.equal(await page.locator('#mode-row').isHidden(), true);
      const chips = await box('#shop-chips .chip');
      assert.ok(chips.y < 24, `Geschäfte beginnen bei ${chips.y} px`);
      await page.locator('#shop-chips .chip').first().click();
      assert.ok((await box('#shop-list .shop-tap')).y < 170, `erster Artikel im Laden bei ${(await box('#shop-list .shop-tap')).y} px`);
      assert.match(await page.textContent('#shop-status'), /Noch \d+ offen/);
      assert.equal(await horizontalOverflow(page), 0);
      // Der Weg zurück steht neben den Geschäften; in anderen Bereichen ist die Kopfzeile wieder da
      await page.click('[data-tab=recipes]');
      assert.equal(await page.locator('.topbar').isVisible(), true);
      await page.click('[data-tab=shopping]');
      assert.equal(await page.locator('.topbar').isHidden(), true, 'zurück im Laden-Modus');
      await page.click('#shop-back');
      assert.equal(await page.locator('.topbar').isVisible(), true);
      assert.equal(await page.locator('#plan-view').isVisible(), true);
      assert.deepEqual(problems, []);
      await ctx.close();
    });
  }

  test('Im Laden: Modus bleibt nach dem Neuladen, Neues von anderen steht schmal oben, kein seitlicher Überlauf bei 320 px', async () => {
    const { ctx, page, problems } = await context({ context: { viewport: { width: 320, height: 568 } } });
    await open(page);
    await page.evaluate(() => {
      const key = 'einkauf-demo-v1', data = JSON.parse(localStorage.getItem(key)), at = new Date().toISOString();
      data.base.items.push({ id: 'butter', storeId: 'store-edeka', name: 'Butter', quantity: 1, unit: 'Stück', checked: false, createdBy: 'Anna', createdAt: at, updatedAt: at, deletedAt: null, _clock: {} });
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem('einkauf-seen:einkauf-demo-v1', JSON.stringify({ ids: data.base.items.filter(item => item.id !== 'butter').map(item => item.id) }));
    });
    await page.click('#mode-shop');
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    assert.equal(await page.locator('#shop-view').isVisible(), true, 'der Modus bleibt auf diesem Gerät gespeichert');
    await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click();
    assert.match(await page.textContent('#shop-list .shop-item.news'), /Butter[\s\S]*neu von Anna/);
    assert.equal(await page.locator('#shop-list .shop-item:not(.news) .shop-name', { hasText: 'Butter' }).count(), 0);
    assert.equal(await horizontalOverflow(page), 0);
    await page.locator('#shop-list .shop-item.news').getByRole('button', { name: 'Übernehmen' }).click();
    assert.equal(await page.locator('#shop-list .shop-item.news').count(), 0);
    assert.equal(await page.locator('#shop-list .shop-item:not(.news) .shop-name', { hasText: 'Butter' }).count(), 1);
    await page.click('#shop-back');
    assert.equal(await page.locator('#shop-view').isHidden(), true);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Aufgeräumt: Formular zugeklappt, Liste gleich sichtbar; Zeile antippen bearbeitet, Löschen im Dialog', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const top = selector => page.locator(selector).first().evaluate(node => Math.round(node.getBoundingClientRect().top + scrollY));
    const height = await page.evaluate(() => innerHeight);
    // Zugeklappt: nur das Namensfeld (das „+“ erscheint erst mit Text); die erste Artikelzeile steht ohne Scrollen im Bild
    assert.equal(await page.locator('#item-form.compact').count(), 1);
    for (const selector of ['#store-pick', '#item-form .qty', '#item-form .unit', '#item-form .price-fields']) assert.equal(await page.locator(selector).first().isVisible(), false, `${selector} versteckt`);
    assert.equal(await page.locator('#item-form .add-button').isVisible(), false, 'ohne Text kein „+“');
    assert.ok(await top('#items .item') < height - 60, `erste Artikelzeile bei ${await top('#items .item')} px, Bildschirm ${height} px`);
    // Hineintippen klappt auf, Tippen auf freie Fläche (ohne Text) klappt wieder zu
    await page.focus('#item-form input[name=name]');
    await page.waitForSelector('#item-form:not(.compact)');
    assert.equal(await page.locator('#store-pick').isVisible(), true);
    assert.equal(await page.locator('#item-form .qty').isVisible(), true);
    const heading = await page.locator('#shopping-title').boundingBox(); await page.touchscreen.tap(heading.x + 3, heading.y + 3);
    await page.waitForSelector('#item-form.compact');
    // Mit Text im Namensfeld bleibt es offen
    await page.fill('#item-form input[name=name]', 'Hafer'); await page.touchscreen.tap(heading.x + 3, heading.y + 3);
    assert.equal(await page.locator('#item-form.compact').count(), 0);
    await page.fill('#item-form input[name=name]', '');
    await page.touchscreen.tap(heading.x + 3, heading.y + 3);
    await page.waitForSelector('#item-form.compact');
    // Hinzufügen mit dem „+“ im Namensfeld (Menge 1 Stück)
    await page.fill('#item-form input[name=name]', 'Mandelmilch'); await page.click('#item-form .add-button');
    assert.match(await page.locator('#items .item', { hasText: 'Mandelmilch' }).textContent(), /1 Stück/);
    // Zeilen haben nur den Haken; Antippen öffnet die Bearbeitung, dort steht „Artikel löschen“
    const row = page.locator('#items .item', { hasText: 'Mandelmilch' });
    assert.equal(await row.locator('.icon-button').count(), 0, 'kein Stift und kein Mülleimer in der Zeile');
    await row.locator('.item-copy').click(); await sheetOpen(page);
    assert.equal(await page.inputValue('#edit-item-form input[name=name]'), 'Mandelmilch');
    await page.click('#delete-item'); await page.waitForSelector('#item-dialog', { state: 'hidden' });
    assert.equal(await page.locator('#items .item', { hasText: 'Mandelmilch' }).count(), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  for (const width of [280, 314, 390]) {
    test(`Namensfeld: grünes „+“ im Feld sobald etwas getippt ist; Tipp darauf fügt hinzu und schließt die Tastatur, Tipp ins Feld öffnet sie wieder (${width} px)`, async () => {
      const { ctx, page, problems } = await context({ context: { viewport: { width, height: 760 } } });
      await open(page);
      const name = page.locator('#item-form input[name=name]'), plus = page.locator('#item-form .add-button');
      const focused = () => page.evaluate(() => document.activeElement?.name || document.activeElement?.tagName);
      const center = async locator => { const box = await locator.boundingBox(); return [box.x + box.width / 2, box.y + box.height / 2]; };
      assert.equal(await plus.isVisible(), false, 'leeres Feld: kein „+“');
      // Mit Text erscheint das „+“ innerhalb des Feldes, am rechten Rand; langer Text läuft nicht darunter
      await name.fill('Testgurke');
      assert.equal(await plus.isVisible(), true);
      const box = await plus.boundingBox(), field = await name.boundingBox();
      assert.ok(box.x >= field.x && box.x + box.width <= field.x + field.width && box.y >= field.y && box.y + box.height <= field.y + field.height, 'das „+“ liegt im Feld');
      assert.ok(field.x + field.width - (box.x + box.width) < 10, 'ganz rechts');
      assert.ok(await name.evaluate(node => parseFloat(getComputedStyle(node).paddingRight)) >= box.width + 6, 'der Text endet vor dem „+“');
      assert.ok(box.width >= 40 && box.height >= 36, 'groß genug zum Tippen');
      assert.equal(await page.locator('#item-form .add-button svg').count(), 1);
      await name.fill('');
      assert.equal(await plus.isVisible(), false, 'Text gelöscht: „+“ weg');
      // Tipp auf das „+“: Artikel ist da, Feld leer, Tastatur zu (kein Feld mehr im Fokus)
      await name.focus(); await name.fill('Testgurke');
      await page.touchscreen.tap(...await center(plus));
      await page.waitForSelector('#items .item:has-text("Testgurke")');
      assert.equal(await name.inputValue(), '');
      assert.notEqual(await focused(), 'name', 'das Namensfeld hat den Fokus verloren (Tastatur zu)');
      assert.equal(await page.evaluate(() => document.activeElement.matches('input,textarea,select')), false);
      assert.equal(await plus.isVisible(), false);
      await page.waitForSelector('#item-form.compact');
      // Ein Tipp ins Feld öffnet die Tastatur wieder
      await page.touchscreen.tap(...await center(name));
      assert.equal(await focused(), 'name');
      await page.waitForSelector('#item-form:not(.compact)');
      // Mit der Eingabetaste der Tastatur bleibt der Fokus im Feld (mehrere Artikel nacheinander)
      await name.fill('Testpaprika'); await page.keyboard.press('Enter');
      await page.waitForSelector('#items .item:has-text("Testpaprika")');
      assert.equal(await focused(), 'name');
      assert.equal(await horizontalOverflow(page), 0);
      assert.deepEqual(problems, []);
      await ctx.close();
    });
  }

  /* ---------- Produktbilder: farbige Symbole (Emoji) rechts in jeder Artikelzeile, ohne Internet ---------- */
  const tiles = page => page.evaluate(() => [...document.querySelectorAll('#items .item')].map(row => {
    const tile = row.querySelector('.item-thumb');
    return { name: row.querySelector('strong').textContent, tile: Boolean(tile), emoji: tile?.querySelector('.emoji')?.textContent || '' };
  }));
  const external = page => { const urls = []; page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1')) urls.push(request.url()); }); return urls; };

  test('Produktbilder: farbige Symbole passend zum Artikel, sofort da, ohne Internet; rechts in jeder Zeile, nicht antippbar', async () => {
    const { ctx, page, problems } = await context({ config: { productImages: undefined } });   // nichts eingestellt = Standard
    const outside = external(page);
    await open(page);
    await page.waitForFunction(() => document.querySelectorAll('#items .item-thumb').length === 4);
    assert.deepEqual((await tiles(page)).map(row => [row.name, row.emoji]), [['Tomaten', '🍅'], ['Nudeln', '🍝'], ['Milch', '🥛'], ['Äpfel', '🍎']]);
    // Darstellung: abgerundete Kachel rechts, Name und Menge links, nicht antippbar, rein dekorativ
    const look = await page.evaluate(() => [...document.querySelectorAll('#items .item')].map(row => {
      const tile = row.querySelector('.item-thumb'), box = tile.getBoundingClientRect(), copy = row.querySelector('.item-copy').getBoundingClientRect(), line = row.getBoundingClientRect(), style = getComputedStyle(tile);
      return { width: Math.round(box.width), height: Math.round(box.height), right: Math.round(line.right - box.right), copyEnd: Math.round(box.left - copy.right), radius: parseFloat(style.borderTopLeftRadius), border: parseFloat(style.borderTopWidth),
        events: style.pointerEvents, hidden: tile.getAttribute('aria-hidden'), focusable: tile.querySelectorAll('button,a,[tabindex],img').length, rowHeight: Math.round(line.height), size: parseFloat(getComputedStyle(tile.querySelector('.emoji')).fontSize) };
    }));
    for (const row of look) {
      assert.deepEqual([row.width, row.height], [56, 56]);
      assert.ok(row.right >= 8 && row.right <= 16, `Abstand zum rechten Rand ${row.right}`); assert.ok(row.copyEnd >= 0, 'der Text läuft nicht unter die Kachel');
      assert.ok(row.radius >= 10 && row.border >= 1); assert.deepEqual([row.events, row.hidden, row.focusable], ['none', 'true', 0]); assert.ok(row.rowHeight >= 76); assert.ok(row.size >= 28);
    }
    const box = await page.locator('#items .item-thumb').first().boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    assert.equal(await page.locator('dialog[open]').count(), 0, 'Antippen der Kachel tut nichts');
    // Ein neuer Artikel bekommt sein Symbol ebenfalls sofort; unbekannte Namen das der Kategorie, sonst ein Paket
    await page.fill('#item-form input[name=name]', 'Birne'); await page.click('#item-form .add-button');
    await page.waitForSelector('#items .item:has-text("Birne")');
    await page.fill('#item-form input[name=name]', 'Xyzabc'); await page.click('#item-form .add-button');
    await page.waitForSelector('#items .item:has-text("Xyzabc")');
    const more = await tiles(page);
    assert.equal(more.find(row => row.name === 'Birne').emoji, '🍐'); assert.equal(more.find(row => row.name === 'Xyzabc').emoji, '📦');
    await page.waitForTimeout(500);
    assert.deepEqual(outside, [], 'keine einzige Anfrage ins Internet');
    assert.equal(await page.evaluate(() => localStorage.getItem('einkauf-images-v2') ?? localStorage.getItem('einkauf-images-v1')), null);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Produktbilder: Schalter in den Einstellungen (Standard an), gilt sofort, speichert sich; aus = keine Kacheln, die Zeile sieht aus wie früher; keine Foto-Einstellung', async () => {
    const { ctx, page, problems } = await context({ config: { productImages: undefined } });   // nichts eingestellt = Standard
    await ctx.addInitScript(() => { localStorage.setItem('einkauf-images-v1', '{"reis":{"u":"x","t":1}}'); localStorage.setItem('einkauf-images-v2', '{}'); });   // Reste aus Version 2.13
    const outside = external(page);
    await open(page);
    await page.waitForFunction(() => document.querySelectorAll('#items .item-thumb').length === 4);
    assert.equal(await page.evaluate(() => [localStorage.getItem('einkauf-images-v1'), localStorage.getItem('einkauf-images-v2')].join()), ',', 'alte Bild-Speicher aus Version 2.13 sind weg');
    await openSettings(page);
    assert.equal(await page.locator('label.checkbox-label', { hasText: 'Produktbilder anzeigen' }).count(), 1);
    assert.equal(await page.locator('#product-images').isChecked(), true, 'Standard: an');
    assert.equal(await page.textContent('#product-images-hint'), 'Zeigt zu jedem Artikel automatisch ein Beispielbild.');
    assert.equal(await page.locator('#product-photos, :text("Fotos aus dem Internet")').count(), 0, 'keine Einstellung für Internet-Fotos');
    // Aus: sofort keine Kacheln, die Zeile sieht aus wie früher (Haken und Text)
    await page.uncheck('#product-images');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-settings-v1')).productImages), false, 'dauerhaft gespeichert, bei den übrigen Einstellungen');
    await page.click('[data-tab=shopping]');
    assert.equal(await page.locator('.item-thumb').count(), 0);
    assert.deepEqual(await page.evaluate(() => [...document.querySelector('#items .item').children].map(node => node.className)), ['check', 'item-copy']);
    await page.fill('#item-form input[name=name]', 'Butter'); await page.click('#item-form .add-button');
    await page.waitForSelector('#items .item:has-text("Butter")');
    assert.equal(await page.locator('.item-thumb').count(), 0, 'auch neue Artikel ohne Kachel');
    // Nach dem Neuladen bleibt es aus; wieder an gilt sofort, ohne Neuladen
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    await page.waitForFunction(() => document.querySelector('#items .item'));
    assert.equal(await page.locator('.item-thumb').count(), 0);
    await openSettings(page);
    assert.equal(await page.locator('#product-images').isChecked(), false);
    await page.check('#product-images'); await page.click('[data-tab=shopping]');
    await page.waitForFunction(() => document.querySelectorAll('#items .item-thumb').length === 5);
    const back = await tiles(page);
    assert.deepEqual([back.find(row => row.name === 'Tomaten').emoji, back.find(row => row.name === 'Butter').emoji], ['🍅', '🧈']);
    assert.deepEqual(outside, [], 'nie eine Anfrage ins Internet');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  for (const [width, scheme] of [[280, 'light'], [320, 'dark'], [390, 'light'], [390, 'dark']]) {
    test(`Produktbilder: lange Namen brechen sauber um, die Kachel bleibt ganz (${width} px, ${scheme})`, async () => {
      const { ctx, page, problems } = await context({ config: { productImages: true }, context: { viewport: { width, height: 800 }, colorScheme: scheme } });
      await open(page);
      await page.fill('#item-form input[name=name]', 'Domol Feinwaschmittel Extra Sensitiv Konzentrat 1,5 Liter Nachfüllpack'); await page.click('#item-form .add-button');
      await page.waitForSelector('#items .item:has-text("Domol")');
      const rows = await page.evaluate(() => [...document.querySelectorAll('#items .item')].map(row => {
        const tile = row.querySelector('.item-thumb'), box = tile.getBoundingClientRect(), copy = row.querySelector('.item-copy').getBoundingClientRect(), name = row.querySelector('strong').getBoundingClientRect(), emoji = tile.querySelector('.emoji').getBoundingClientRect();
        const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number), light = value => { const [r, g, b] = rgb(value).map(channel => { const c = channel / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        return { name: row.querySelector('strong').textContent, tileWidth: Math.round(box.width), tileHeight: Math.round(box.height), nameHeight: Math.round(name.height), nameRight: Math.round(name.right), tileLeft: Math.round(box.left), copyRight: Math.round(copy.right),
          light: light(getComputedStyle(tile).backgroundColor), emojiInside: emoji.left >= box.left && emoji.right <= box.right && emoji.top >= box.top && emoji.bottom <= box.bottom, symbol: tile.querySelector('.emoji').textContent };
      }));
      const long = rows.find(row => row.name.startsWith('Domol')), size = width < 341 ? 44 : 56;
      for (const row of rows) {
        assert.deepEqual([row.tileWidth, row.tileHeight], [size, size], `${row.name}: Kachel nicht gequetscht`);
        assert.ok(row.nameRight <= row.tileLeft, `${row.name}: Name endet vor der Kachel`); assert.ok(row.light > 0.8, `${row.name}: heller Hintergrund auch im Dunkelmodus (${row.light.toFixed(2)})`); assert.ok(row.emojiInside, `${row.name}: Symbol liegt in der Kachel`);
      }
      assert.equal(long.symbol, '🧼', 'Haushaltsartikel: Seife'); assert.ok(long.nameHeight > 40, 'der lange Name bricht auf mehrere Zeilen um');
      assert.equal(await horizontalOverflow(page), 0);
      assert.deepEqual(problems, []);
      await ctx.close();
    });
  }

  test('Produktbilder: auch die Zeilen unter „Neu von …“ haben die Kachel; ohne Bilder bleiben sie wie vorher', async () => {
    for (const on of [true, false]) {
      const { ctx, page, problems } = await context({ config: { actor: 'Anna', productImages: on }, context: { viewport: { width: 360, height: 800 } } });
      await ctx.addInitScript(() => localStorage.setItem('einkauf-seen:einkauf-demo-v1', JSON.stringify({ ids: ['x'] })));   // Nicos Artikel sind für Anna neu
      await open(page);
      await page.waitForSelector('#items .item.news');
      assert.equal(await page.locator('#items .item.news').count(), 4);
      assert.equal(await page.locator('#items .item.news .item-thumb').count(), on ? 4 : 0);
      if (on) {
        const boxes = await page.evaluate(() => [...document.querySelectorAll('#items .item.news')].map(row => {
          const tile = row.querySelector('.item-thumb').getBoundingClientRect(), copy = row.querySelector('.item-copy').getBoundingClientRect(), button = row.querySelector('.item-actions button').getBoundingClientRect(), line = row.getBoundingClientRect();
          return [Math.round(tile.width), tile.left >= copy.right - 1, button.width > 60 && button.right <= line.right, Math.round(line.right - tile.right)];
        }));
        for (const [width, besideText, buttonInside, edge] of boxes) { assert.equal(width, 56); assert.ok(besideText, 'Kachel neben dem Text'); assert.ok(buttonInside, '„Übernehmen“ bleibt ganz im Bild'); assert.ok(edge >= 4 && edge <= 20, `Abstand rechts ${edge}`); }
      } else assert.deepEqual(await page.evaluate(() => [...document.querySelector('#items .item.news').children].map(node => node.className)), ['item-copy', 'item-actions']);
      assert.equal(await horizontalOverflow(page), 0);
      assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
      await ctx.close();
    }
  });

  test('Einstellungen: Verbindung eingeklappt und unten, sobald verbunden; Vorrat und Darstellung oben', async () => {
    const remote = github(demo);
    const a = await context({ config: connectedConfig });
    await a.ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(a.page); await synced(a.page);
    await a.page.click('[data-tab=settings]');
    assert.equal(await a.page.locator('#connection-details').evaluate(node => node.open), false);
    assert.match(await a.page.textContent('#connection-state'), /✓ haushalt\/daten · Nico/);
    const order = await a.page.evaluate(() => [...document.querySelectorAll('#settings > *')].map(node => ({ id: node.id || node.className.split(' ').pop(), top: Math.round(node.getBoundingClientRect().top) })).filter(entry => entry.id && entry.id !== 'settings-title').sort((x, y) => x.top - y.top).map(entry => entry.id));
    assert.deepEqual(order.slice(-1), ['settings-form'], 'die Verbindung steht ganz unten');
    assert.ok(order.indexOf('pantry-card') < order.indexOf('storage-card'));
    await a.page.locator('#connection-details summary').click();
    assert.equal(await a.page.locator('#settings-form input[name=owner]').isVisible(), true);
    assert.deepEqual(a.problems, []);
    await a.ctx.close();
    // Nicht verbunden: die Verbindung steht oben und ist offen
    const b = await context({ seed: false });
    await open(b.page); await b.page.waitForSelector('#welcome[open]');
    await b.page.fill('#welcome-form input[name=actor]', 'Anna'); await b.page.click('#welcome-form button');
    await b.page.click('[data-tab=settings]');
    assert.equal(await b.page.locator('#connection-details').evaluate(node => node.open), true);
    assert.equal(await b.page.locator('#settings').getAttribute('data-connected'), 'no');
    await b.ctx.close();
  });

  test('Link …/?add=: Artikel per Kurzbefehl oder Siri hinzufügen, mit Geschäft, Mengen und zusammengezählt; Adresse wird bereinigt', async () => {
    const { ctx, page, problems } = await context();
    await page.goto(`${base}/index.html?add=${encodeURIComponent('Haferflocken, 2 Eier und 500 g Butter')}&store=lidl`);
    await page.waitForSelector('#status[data-state]');
    assert.equal(new URL(page.url()).search, '', 'die Adresse wird bereinigt, ein Neuladen fügt nichts doppelt hinzu');
    assert.match(await page.textContent('#notice-text'), /Hinzugefügt: Haferflocken, Eier, Butter \(Lidl\)/);
    assert.match(await page.textContent('#notice-text'), /nur auf diesem Gerät/, 'im Beispielmodus ein Hinweis');
    await page.getByRole('tab', { name: /^Lidl/ }).click();
    const rows = await page.locator('#items .item').evaluateAll(nodes => nodes.map(node => node.querySelector('strong').textContent + '|' + node.querySelector('small').textContent.split(' · ')[0]));
    assert.ok(rows.includes('Eier|2 Stück') && rows.includes('Butter|500 g'), rows.join(', '));
    assert.ok(rows.includes('Haferflocken|1 Stück'), 'ohne Menge: 1 Stück');
    // Noch einmal dieselben Eier: zählt zum vorhandenen Eintrag dazu (kein zweiter Eintrag)
    await page.goto(`${base}/index.html?add=Eier&store=Lidl`);
    await page.waitForSelector('#status[data-state]');
    await page.getByRole('tab', { name: /^Lidl/ }).click();
    assert.equal(await page.locator('#items .item', { hasText: 'Eier' }).count(), 1);
    assert.match(await page.locator('#items .item', { hasText: 'Eier' }).textContent(), /3 Stück/);
    // Ohne Text: nichts passiert; Zahlen mit Komma wie „1,5 l Milch“ werden nicht zerteilt
    await page.goto(`${base}/index.html?add=${encodeURIComponent('1,5 l Hafermilch')}`);
    await page.waitForSelector('#status[data-state]');
    assert.match(await page.textContent('#notice-text'), /Hinzugefügt: Hafermilch/);
    await page.getByRole('tab', { name: /^Alle/ }).click();
    assert.match(await page.locator('#items .item', { hasText: 'Hafermilch' }).textContent(), /1,5 l/);
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
    // Wochen blättern, löschen
    await page.click('#week-next'); assert.equal(await page.locator('.meal').count(), 0);
    await page.click('#week-today'); assert.equal(await today.locator('.meal').count(), 3);
    await today.locator('.meal', { hasText: 'Pizza bestellen' }).getByRole('button', { name: /entfernen/ }).click();
    assert.equal(await today.locator('.meal').count(), 2);
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
    assert.match(await page.textContent('#shopping-total'), /Geschätzt \d/, 'Summe der Gesamtliste, ohne Geschäftsname');
    assert.equal(await page.locator('#offers-link').isHidden(), true, 'Angebote gibt es je Geschäft, nicht in der Gesamtliste');
    // Das Formular bietet „Kein Geschäft“ und alle Geschäfte als Schnellwahl an; Standard in „Alle“: kein Geschäft (nichts ist vorausgewählt).
    const pick = () => page.locator('#store-pick button').evaluateAll(nodes => nodes.map(node => [node.textContent, node.getAttribute('aria-pressed')]));
    assert.deepEqual(await pick(), [['Kein Geschäft', 'true'], ['Edeka', 'false'], ['Lidl', 'false'], ['Rewe', 'false']]);
    assert.equal(await page.inputValue('#item-form input[name=storeId]'), '');
    const add = async (name, store) => { if (store !== undefined) await pickStore(page, store); await page.fill('#item-form input[name=name]', name); await page.click('#item-form button[type=submit]'); };
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
    await pickStore(page, 'Rewe');
    assert.deepEqual((await pick()).filter(row => row[1] === 'true').map(row => row[0]), ['Kein Geschäft']);
    assert.equal(await page.inputValue('#item-form input[name=storeId]'), '');
    await pickStore(page, 'Rewe');
    assert.match(await page.textContent('#shopping-total'), /Geschätzt \d|Noch keine Preise|Alles erledigt/);
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

  test('Artikel, der in der gewählten Ansicht nicht erscheint: kurzer Hinweis, der von selbst verschwindet', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.getByRole('tab', { name: /^Rewe/ }).click();
    await pickStore(page, 'Lidl');
    await page.fill('#item-form input[name=name]', 'Joghurt'); await page.click('#item-form button[type=submit]');
    assert.equal(await page.locator('#items .item', { hasText: 'Joghurt' }).count(), 0, 'In der Rewe-Ansicht steht der Lidl-Artikel nicht');
    await page.waitForSelector('#notice:not([hidden])');
    assert.equal(await page.textContent('#notice-text'), '„Joghurt“ steht bei „Lidl“');
    assert.equal(await page.getByRole('button', { name: 'Rückgängig' }).count(), 0, 'Es gibt keinen Rückgängig-Knopf');
    await page.waitForSelector('#notice', { state: 'hidden', timeout: 8000 });
    await page.getByRole('tab', { name: /^Alle/ }).click();
    assert.equal(await page.locator('#items .item', { hasText: 'Joghurt' }).count(), 1);
    // Rückgängig geht über den Mülleimer.
    await page.getByRole('button', { name: /^Joghurt, .*bearbeiten/ }).click(); await sheetOpen(page); await page.click('#delete-item'); await page.waitForSelector('#item-dialog', { state: 'hidden' });
    assert.equal(await page.locator('#items .item', { hasText: 'Joghurt' }).count(), 0);
    // Ein Artikel, der in der Ansicht erscheint, braucht keinen Hinweis.
    await page.getByRole('tab', { name: /^Lidl/ }).click();
    await page.fill('#item-form input[name=name]', 'Quark'); await page.click('#item-form button[type=submit]');
    assert.equal(await page.locator('#notice').isHidden(), true);
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

  // Hilfen für „lange halten und nach rechts in den Mülleimer ziehen“ (Maus: echte Zeigerereignisse wie auf dem Handy)
  const center = async locator => { const box = await locator.boundingBox(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; };
  const holdRow = async (page, name) => {
    const row = page.locator('#items .item', { hasText: name });
    await row.evaluate(node => node.scrollIntoView({ block: 'center' }));   // mittig, damit die untere Leiste die Zeile nicht verdeckt
    const box = await row.locator('.item-copy').boundingBox(), at = { x: box.x + 40, y: box.y + box.height / 2 };
    await page.mouse.move(at.x, at.y); await page.mouse.down();
    return { row, at };
  };

  test('Artikel löschen: lange halten und nach rechts in den roten Mülleimer schieben', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const names = () => page.locator('#items .item strong').allTextContents();
    assert.ok((await names()).includes('Nudeln'));
    // Nach dem Loslassen außerhalb der Fläche bleibt der Artikel; es öffnet sich auch nichts
    let { at } = await holdRow(page, 'Nudeln');
    await page.waitForSelector('.drag-ghost');
    assert.equal(await page.locator('#trash-zone.show').count(), 1, 'rote Fläche erscheint');
    assert.equal(await page.locator('#trash-zone.hot').count(), 0);
    await page.mouse.move(at.x + 60, at.y, { steps: 4 });
    await page.mouse.up();
    await page.waitForSelector('.drag-ghost', { state: 'detached' });
    assert.ok((await names()).includes('Nudeln'), 'nicht in der Fläche losgelassen: nichts gelöscht');
    assert.equal(await page.locator('dialog[open]').count(), 0, 'das Loslassen nach langem Halten öffnet die Bearbeitung nicht');
    assert.equal(await page.locator('#items .item.drag-origin').count(), 0);
    // Weniger als die Haltezeit und Bewegung: Scrollen, es hebt nichts ab
    ({ at } = await holdRow(page, 'Nudeln'));
    await page.mouse.move(4, at.y + 40, { steps: 3 });   // weg von der Zeile: ein Wischen, kein Tipp
    await page.waitForTimeout(650);
    assert.equal(await page.locator('.drag-ghost').count(), 0, 'wer sich zuerst bewegt, scrollt nur');
    await page.mouse.up();
    // Kurzer Tipp öffnet weiterhin die Bearbeitung
    await page.getByRole('button', { name: /^Nudeln, .*bearbeiten/ }).click(); await sheetOpen(page); await page.keyboard.press('Escape');
    await page.waitForSelector('dialog[open]', { state: 'detached' });
    // In die Fläche ziehen und loslassen löscht
    ({ at } = await holdRow(page, 'Nudeln'));
    await page.waitForSelector('.drag-ghost');
    const width = await page.evaluate(() => innerWidth);
    await page.mouse.move(at.x + 80, at.y, { steps: 4 });
    assert.equal(await page.locator('#trash-zone.hot').count(), 0, 'noch nicht an der Fläche');
    await page.mouse.move(width - 40, at.y, { steps: 6 });
    await page.waitForSelector('#trash-zone.hot');
    await page.mouse.up();
    await page.waitForFunction(() => ![...document.querySelectorAll('#items .item strong')].some(node => node.textContent === 'Nudeln'));
    assert.equal(await page.locator('.drag-ghost').count(), 0);
    assert.equal(await page.locator('#trash-zone.show').count(), 0, 'Fläche verschwindet wieder');
    assert.equal(await page.textContent('#notice-text'), '„Nudeln“ gelöscht');
    assert.ok((await names()).includes('Tomaten'), 'die anderen Artikel bleiben');
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Artikel löschen per Ziehen: Escape bricht ab, abgehakte und neue Artikel lassen sich ebenfalls löschen, Im-Laden-Modus nicht', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const width = await page.evaluate(() => innerWidth);
    const names = () => page.locator('#items .item strong').allTextContents();
    // Escape während des Ziehens
    let { at } = await holdRow(page, 'Milch');
    await page.waitForSelector('.drag-ghost');
    await page.mouse.move(width - 30, at.y, { steps: 5 });
    await page.waitForSelector('#trash-zone.hot');
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await page.waitForSelector('.drag-ghost', { state: 'detached' });
    assert.ok((await names()).includes('Milch'), 'abgebrochen: nichts gelöscht');
    // Abgehakter Artikel
    await page.getByRole('button', { name: 'Äpfel: abhaken' }).click();
    ({ at } = await holdRow(page, 'Äpfel'));
    await page.waitForSelector('.drag-ghost');
    await page.mouse.move(width - 30, at.y, { steps: 6 });
    await page.mouse.up();
    await page.waitForFunction(() => ![...document.querySelectorAll('#items .item strong')].some(node => node.textContent === 'Äpfel'));
    // Im Laden gibt es das Ziehen nicht
    await page.click('#mode-shop'); await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click();
    const tap = page.locator('.shop-tap').first(), box = await tap.boundingBox();
    await page.mouse.move(box.x + 40, box.y + 20); await page.mouse.down();
    await page.waitForTimeout(650);
    assert.equal(await page.locator('.drag-ghost').count(), 0);
    await page.mouse.up();
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Artikel löschen per Touch: Seite scrollt beim Ziehen nicht mit, Löschen wird nach GitHub geschrieben', async () => {
    const remote = github(structuredClone(demo));
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    // genug Zeilen, damit die Seite scrollbar ist
    await page.evaluate(() => { document.body.style.minHeight = '3000px'; });
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const at = await center(page.locator('#items .item', { hasText: 'Tomaten' }).locator('.item-copy'));
    const width = await page.evaluate(() => innerWidth);
    await touch('touchStart', at.x, at.y);
    await page.waitForSelector('.drag-ghost');
    for (let step = 1; step <= 8; step++) await touch('touchMove', at.x + (width - 30 - at.x) * step / 8, at.y + step * 6);
    await page.waitForSelector('#trash-zone.hot');
    assert.equal(await page.evaluate(() => scrollY), 0, 'die Seite hat nicht mitgescrollt');
    await touch('touchEnd');
    await page.waitForFunction(() => ![...document.querySelectorAll('#items .item strong')].some(node => node.textContent === 'Tomaten'));
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    assert.ok(remote.content.items.find(row => row.name === 'Tomaten').deletedAt, 'Löschmarkierung liegt auf GitHub');
    assert.ok(!remote.content.items.find(row => row.name === 'Nudeln').deletedAt);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Datenumfang: Anzeige, Aufräumen auf Wunsch schreibt die kleinere Datei', async () => {
    const remote = github(bloated(40));
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    await openSettings(page);
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
    await openSettings(page);
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
    await openSettings(page);
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
    await openSettings(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
    const backup = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.ok(backup.items.some(item => item.name === 'Milch'));
    assert.ok(!JSON.stringify(backup).includes('token'));
    await ctx.close();
  });
});
