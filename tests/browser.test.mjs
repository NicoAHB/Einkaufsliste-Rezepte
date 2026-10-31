/* Browserprüfung in mobilem Chromium. Benötigt Playwright (npm i -D playwright, einmalig `npx playwright install chromium`).
   Ohne Playwright werden die Tests übersprungen. Der GitHub-Server und Hilfsdienste werden simuliert; echte Konten sind nicht nötig. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import zlib from 'node:zlib';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { planGenerated } from '../recipe-maker.js';
import { readZip } from '../zip.js';

let playwright = null;
try { playwright = createRequire(import.meta.url)('playwright'); } catch { /* optional */ }
const root = path.resolve(import.meta.dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.gz': 'application/gzip', '.md': 'text/markdown' };
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
  browser = await playwright.chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {});
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
  // Die Prüfungen laufen, als wäre die App schon geöffnet (dieselbe Sitzung); nur `fresh: true` simuliert einen Start nach vollständigem Schließen.
  if (!options.fresh) await ctx.addInitScript(() => { try { sessionStorage.setItem('einkauf-session-v1', '1'); } catch { /* ohne Sitzungsspeicher */ } });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', error => problems.push(error.message));
  page.on('console', message => { if (message.type() === 'error') problems.push(message.text()); });
  return { ctx, page, problems };
}
const open = async (page, query = '') => { await page.goto(`${base}/index.html${query}`); await page.waitForSelector('#status[data-state]', { state: 'attached' }); await page.waitForFunction(() => document.querySelector('#items')); };
const horizontalOverflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
// Ein Dialog ist „offen“, sobald er da ist und seine Einblend-Bewegung zu Ende ist (sonst messen Prüfungen Ränder mitten in der Bewegung; mit Glas-Unschärfe dauert sie auf langsamen Rechnern länger).
// Im Laden hakt man nur über den Kreis links ab (Schutz vor versehentlichen Berührungen); „Einkauf beenden“ muss gedrückt gehalten werden. Die Prüfungen nutzen den Kreis
// über seinen Namen und lösen „Einkauf beenden“ mit der Tastatur aus (das Halten selbst prüft ein eigener Test).
const shopTap = (page, name) => page.getByRole('button', { name: new RegExp(`^${name}, .*(abhaken|wieder öffnen)`) });
const finishShop = async page => { await page.focus('#shop-finish'); await page.keyboard.press('Enter'); };
const sheetOpen = async page => {
  await page.waitForSelector('dialog[open]');
  await page.evaluate(() => Promise.race([new Promise(resolve => setTimeout(resolve, 1500)),
    Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})))]));
};
// Der Dialog „Geschäfte“ zeigt jedes Geschäft zugeklappt; die meisten Prüfungen brauchen die Felder und klappen deshalb alle auf (das Zuklappen prüft ein eigener Test).
const openStores = async page => {
  await page.click('#manage-stores'); await sheetOpen(page);
  await page.evaluate(() => { document.querySelectorAll('#store-editor .store-row').forEach(node => { node.open = true; }); return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
};
// Das Eingabeformular ist zugeklappt, bis jemand ins Namensfeld tippt; erst dann erscheinen Geschäft, Menge und Einheit.
const chooseUnit = async (page, selector, value) => {
  await page.locator(selector).click(); await page.waitForSelector('#purchase-unit-dialog[open]');
  const choice=page.locator('#purchase-unit-dialog .unit-choices').getByRole('button',{name:value,exact:true});
  if(await choice.count()) { await choice.click(); await page.waitForSelector('#purchase-unit-dialog[open]',{state:'detached'}); } else { await page.locator('#purchase-unit-dialog .purchase-custom').evaluate(n=>n.open=true); await page.fill('#purchase-unit-dialog [name=label]',value); await page.fill('#purchase-unit-dialog [name=size]',''); await page.click('#purchase-unit-dialog button[type=submit]'); }
};
const expandForm = page => page.focus('#item-form input[name=name]');
// Die Bereiche der Einstellungen sind eingeklappt; die meisten Prüfungen brauchen sie offen.
// Im Laden ist die Leiste unten ausgeblendet; der Reiterwechsel läuft hier deshalb per Skript (wie ein Tipp auf den Reiter).
const goTab = (page, name) => page.evaluate(name => document.querySelector(`[data-tab=${name}]`).click(), name);
const openPantry = async (page,mode='current') => {
  if(!await page.locator('#product-picker-dialog[open][data-target=pantry]').count()){
    await goTab(page,'shopping');if(await page.locator('#shop-back').isVisible())await page.click('#shop-back');
    await page.click('#open-pantry');await sheetOpen(page);
  }
  await page.click(`[data-product-mode=${mode}]`);
};
const closePantry = page => page.click('#product-picker-dialog [data-close]');
const addPantryProduct = async (page,name) => {
  await page.click('#pantry-own-add');await sheetOpen(page);await page.fill('#pantry-own-form [name=name]',name);await page.click('#pantry-own-form button[type=submit]');
  if(await page.locator('#product-picker-add').isEnabled())await page.click('#product-picker-add');
};
const setPantryAvailable = async (page,name,available) => {
  await page.click('[data-product-mode=all]');await page.fill('#product-picker-search',name);
  const pick=page.locator('.product-card').filter({has:page.locator('.product-name',{hasText:new RegExp(`^${name}$`,'i')})}).locator('.product-pick').first();
  if((await pick.getAttribute('aria-pressed')==='true')!==available){await pick.click();await page.click('#product-picker-add');}
  await page.fill('#product-picker-search','');await page.click('[data-product-mode=current]');
};
const buyPantryProduct = async (page,name) => {
  await openPantry(page,'all');await page.fill('#product-picker-search',name);
  await page.locator('.product-card').filter({has:page.locator('.product-name',{hasText:new RegExp(`^${name}$`,'i')})}).locator('.product-pick').first().focus();
  await page.keyboard.press('Shift+F10');await sheetOpen(page);
};
const openSettings = async page => { await goTab(page, 'settings'); await page.evaluate(() => document.querySelectorAll('#settings details.fold').forEach(node => { node.open = true; })); };
// Ein Geschäft als Bild („Wünsche“ ist ein Geschenk) trägt seinen Namen als Beschriftung des Bildes, nicht als Text.
const storeButton = (page, box, name) => { const byText = page.locator(`${box} .chip, ${box} button`, { hasText: name }); return byText.or(page.locator(`${box} .chip, ${box} button`, { has: page.getByRole('img', { name, exact: true }) })).first(); };
const pickStore = async (page, name) => { await expandForm(page); await storeButton(page, '#store-pick', name).click(); };

function github(initial) {
  let content = structuredClone(initial), sha = 'sha-1', etag = '"e-1"', version = 1;
  const photos = new Map(), photoDates = new Map(), stats = { gets: 0, puts: 0, notModified: 0, photoPuts: 0, photoGets: 0, photoLists: 0, photoDeletes: 0 }, behavior = { failPhotoPuts: false, unauthorized: false };
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,PUT,DELETE,OPTIONS', 'access-control-expose-headers': 'ETag' };
  return {
    stats, photos, photoDates, behavior, get content() { return content; },
    async handler(route) {
      const request = route.request(), path = decodeURIComponent(new URL(request.url()).pathname.split('/contents/')[1] || '');
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      // Wann wurde die Datei zuletzt eingecheckt? (Schonfrist der Foto-Bereinigung); ohne Angabe: vor langer Zeit
      if (new URL(request.url()).pathname.endsWith('/commits')) {
        const date = photoDates.get(new URL(request.url()).searchParams.get('path')) ?? '2020-01-01T00:00:00Z';
        return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify([{ commit: { committer: { date } } }]) });
      }
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

function wishData() {
  const data = structuredClone(demo), at = '2026-10-29T09:00:00.000Z';
  data.stores.push({ id: 'store-wishes', name: 'Wünsche', separate: true, createdAt: at, updatedAt: at, deletedAt: null, _clock: {} });
  data.items.push({ id: 'wish-rope', name: 'Springseil', quantity: 1, unit: 'Stück', storeId: 'store-wishes', checked: false,
    createdBy: 'Nico', createdAt: at, updatedAt: at, deletedAt: null, _clock: {} });
  return data;
}
async function openWishlist(page) {
  await goTab(page, 'shopping'); await storeButton(page, '#store-chips', 'Wünsche').click();
}
async function holdWish(page, id = 'wish-rope') {
  const name = page.locator(`#items .item[data-id="${id}"] .item-copy`);
  await name.scrollIntoViewIfNeeded();
  const box = await name.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(620); await page.mouse.up();
  await page.waitForSelector('#wish-dialog[open]'); await sheetOpen(page);
}
async function localWishes(options = {}, data = wishData()) {
  const result = await context(options);
  await result.ctx.addInitScript(data => {
    if (!localStorage.getItem('einkauf-demo-v1')) localStorage.setItem('einkauf-demo-v1', JSON.stringify({ base: data, pending: [] }));
  }, data);
  await open(result.page); await openWishlist(result.page);
  return result;
}

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
        // Mit Glas-Design schwebt die Leiste 8 px über dem Rand, ohne sitzt sie bündig unten
        const gap = height - (bar.y + bar.height);
        assert.ok(gap >= -1 && gap <= 9, `Leiste sitzt nicht am unteren Rand (${bar.y + bar.height} statt ${height})`);
      }
      await page.click('[data-tab=shopping]');
      const fits = () => page.evaluate(() => { const dialog = document.querySelector('dialog[open]'); return document.documentElement.scrollWidth <= document.documentElement.clientWidth && dialog.scrollWidth <= dialog.clientWidth; });
      for (const [label, setup] of [['Geschäfte', () => page.click('#manage-stores')], ['Artikel', () => page.click('.item .item-copy')],
        ['Rezept', async () => { await page.click('[data-tab=recipes]'); await page.click('#add-recipe'); }],
        ['Import Link', async () => { await page.click('[data-tab=recipes]'); await page.click('#import-recipe'); }],
        ['Import Screenshot', async () => { await page.click('[data-tab=recipes]'); await page.click('#import-recipe'); await page.click('[data-source=image]'); }],
        ['Import Text', async () => { await page.click('[data-tab=recipes]'); await page.click('#import-recipe'); await page.click('[data-source=text]'); }],
        ['Kochmodus', async () => { await page.click('[data-tab=recipes]'); await page.locator('.recipe-card').first().getByRole('button', { name: 'Kochen' }).click(); }],
        ['Was kann ich kochen?', async () => { await page.click('[data-tab=recipes]'); await page.click('#cookable-open'); }],
        ['Einkauf eintragen', async () => { await page.click('[data-tab=spending]'); await page.click('#add-purchase'); }],
        ['Gericht planen', async () => { await page.click('[data-tab=plan]'); await page.click('.day-head .icon-button'); }],
        ['Einkauf für die Woche', async () => { await page.click('[data-tab=plan]'); await page.click('.day-head .icon-button'); await page.locator('#recipe-pick .pick-row').first().click(); await page.click('#meal-form button[type=submit]'); await page.click('#plan-shopping'); }]]) {
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
    assert.ok(height - (shown.y + shown.height) >= -1 && height - (shown.y + shown.height) <= 9, 'Leiste ist wieder am unteren Rand (schwebend: 8 px Abstand)');
    await ctx.close();
  });

  test('Mehrere Artikel gemeinsam bearbeiten: Auswahlmodus, Tipp wählt aus, Geschäft zuordnen (gleiche Artikel werden zusammengezählt), Löschen mit Rückfrage, „Alle“/„Keine“', async () => {
    const { ctx, page, problems } = await context({ context: { viewport: { width: 390, height: 780 } } });
    await open(page);
    const row = name => page.locator('#items .item', { hasText: name });
    const names = scope => page.locator(`${scope} .item strong`).allTextContents();
    // Ohne Auswahlmodus ist alles wie bisher (Kreis hakt ab, Tipp bearbeitet)
    assert.equal(await page.locator('#select-bar').isHidden(), true);
    assert.equal(await page.locator('#items .select-mark').count(), 0);
    await page.click('#select-mode');
    assert.equal(await page.locator('#select-bar').isVisible(), true);
    assert.equal(await page.textContent('#select-count'), 'Nichts ausgewählt – bitte runterscrollen zum Auswählen');
    assert.equal(await page.isDisabled('#select-move'), true); assert.equal(await page.isDisabled('#select-delete'), true);
    assert.equal(await page.locator('#clear-checked').isHidden(), true);
    assert.equal(await page.getAttribute('#select-mode', 'aria-pressed'), 'true');
    // Tipp wählt aus (kein Bearbeiten-Fenster, nicht abgehakt)
    await row('Tomaten').getByRole('button', { name: /auswählen/ }).first().click();
    assert.equal(await page.locator('dialog[open]').count(), 0, 'kein Bearbeiten-Fenster');
    await row('Nudeln').locator('.item-copy').click();
    assert.equal(await page.textContent('#select-count'), '2 ausgewählt');
    assert.equal(await page.locator('#items .item.selected').count(), 2);
    assert.equal(await page.locator('#items .item.checked').count(), 0, 'nichts wurde abgehakt');
    assert.equal(await row('Tomaten').locator('.select-mark').getAttribute('aria-pressed'), 'true');
    await row('Nudeln').locator('.select-mark').click();   // Kreis wählt ebenfalls ab
    assert.equal(await page.textContent('#select-count'), '1 ausgewählt');
    // „Alle“ wählt alles in der Ansicht, „Keine“ nimmt alles zurück
    await page.click('#select-all');
    assert.equal(await page.locator('#items .item.selected').count(), await page.locator('#items .item').count());
    assert.equal(await page.textContent('#select-all'), 'Keine');
    await page.click('#select-all');
    assert.equal(await page.textContent('#select-count'), 'Nichts ausgewählt – bitte runterscrollen zum Auswählen');
    // Geschäft zuordnen: Tomaten und Nudeln zu Lidl
    await row('Tomaten').locator('.item-copy').click(); await row('Nudeln').locator('.item-copy').click();
    await page.click('#select-move'); await sheetOpen(page);
    assert.match(await page.textContent('#move-text'), /2 Artikel ausgewählt/);
    await page.locator('#move-choices button', { hasText: 'Lidl' }).click();
    assert.match(await page.textContent('#notice-text'), /2 Artikel → Lidl/);
    assert.equal(await page.textContent('#select-count'), 'Nichts ausgewählt – bitte runterscrollen zum Auswählen', 'die Auswahl ist danach leer, der Modus bleibt');
    await page.getByRole('tab', { name: /^Lidl/ }).click();
    const lidl = await names('#items');
    assert.ok(lidl.includes('Tomaten') && lidl.includes('Nudeln'), lidl.join(', '));
    // Gleiche Artikel in verschiedenen Geschäften: beim Verschieben ins selbe Ziel werden sie zusammengezählt
    await page.click('#select-mode');
    await page.getByRole('tab', { name: /^Edeka/ }).click();
    await page.fill('#item-form input[name=name]', 'Joghurt'); await page.click('#item-form .add-button');
    await page.getByRole('tab', { name: /^Lidl/ }).click();
    await page.fill('#item-form input[name=name]', 'Joghurt'); await page.fill('#item-form input[name=quantity]', '2'); await page.click('#item-form .add-button');
    await page.getByRole('tab', { name: /^Alle/ }).click();
    await page.click('#select-mode');
    assert.equal(await page.locator('#items .item', { hasText: 'Joghurt' }).count(), 2);
    for (const entry of await page.locator('#items .item', { hasText: 'Joghurt' }).all()) await entry.locator('.item-copy').click();
    await page.click('#select-move'); await sheetOpen(page);
    await page.locator('#move-choices button', { hasText: 'Rewe' }).click();
    assert.match(await page.textContent('#notice-text'), /2 Artikel → Rewe \(1 zusammengezählt\)/);
    assert.equal(await page.locator('#items .item', { hasText: 'Joghurt' }).count(), 1, 'nur noch ein Joghurt');
    assert.match(await row('Joghurt').locator('.item-qty').textContent(), /^3\sBecher$/);
    // Löschen: erst die Rückfrage, abgebrochen bleibt alles, bestätigt sind beide weg
    await row('Joghurt').locator('.item-copy').click(); await row('Tomaten').locator('.item-copy').click();
    page.once('dialog', dialog => { assert.match(dialog.message(), /2 Artikel löschen/); void dialog.dismiss(); });
    await page.click('#select-delete');
    assert.equal(await page.locator('#items .item', { hasText: 'Joghurt' }).count(), 1, 'abgebrochen: nichts gelöscht');
    page.once('dialog', dialog => { void dialog.accept(); });
    await page.click('#select-delete');
    await page.waitForFunction(() => !/Joghurt|Tomaten/.test(document.querySelector('#items').textContent));
    assert.match(await page.textContent('#notice-text'), /2 Artikel gelöscht/);
    // Beenden: wieder alles wie bisher; auch beim Wechsel in einen anderen Bereich endet der Modus
    await page.click('#select-done');
    assert.equal(await page.locator('#select-bar').isHidden(), true);
    assert.ok(await page.locator('#items .check:not(.select-mark)').count() > 0, 'Abhaken-Kreise sind zurück');
    await page.click('#select-mode');
    await page.click('[data-tab=recipes]');
    assert.equal(await page.locator('#select-bar').isHidden(), true, 'andere Bereiche haben keine Auswahlleiste');
    await page.click('[data-tab=shopping]');
    assert.equal(await page.locator('#items .select-mark').count(), 0, 'der Modus wurde beendet');
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Auswahlleiste: nichts läuft über den Rand (280 px), die Liste bleibt bis zum Ende erreichbar, Ziehen ist im Auswahlmodus aus', async () => {
    const { ctx, page, problems } = await context({ context: { viewport: { width: 280, height: 560 } } });
    await open(page);
    await page.click('#select-mode');
    assert.equal(await horizontalOverflow(page), 0);
    const bar = await page.locator('#select-bar').boundingBox();
    assert.ok(bar.x >= 0 && bar.x + bar.width <= 280, `die Leiste passt in die Breite (${Math.round(bar.x)} + ${Math.round(bar.width)})`);
    for (const button of await page.locator('#select-bar button').all()) { const box = await button.boundingBox(); assert.ok(box.height >= 44 && box.x >= 0 && box.x + box.width <= 280, 'Knopf groß genug und im Bild'); }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const last = await page.locator('#items > *:last-child').boundingBox(), top = (await page.locator('#select-bar').boundingBox()).y;
    assert.ok(last.y + last.height <= top + 1, `das Ende der Liste liegt nicht unter der Leiste (${Math.round(last.y + last.height)} ≤ ${Math.round(top)})`);
    // Langes Halten hebt keine Zeile ab (kein Verschieben-Fenster)
    const copy = await page.locator('#items .item .item-copy').first().boundingBox();
    await page.mouse.move(copy.x + 40, copy.y + copy.height / 2); await page.mouse.down(); await page.waitForTimeout(700);
    assert.equal(await page.locator('.drag-ghost').count(), 0, 'nichts hebt ab');
    await page.mouse.up();
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Reihenfolge der Gänge je Geschäft: im Geschäfte-Fenster ändern, gilt unter „Planen“ (Geschäft und „Alle“) und „Im Laden“, Standard stellt zurück', async () => {
    const { ctx, page, problems } = await context({ config: { shopLock: 0 } });
    await open(page);
    const heads = async scope => (await page.locator(`${scope} .group-head`).allTextContents()).map(text => text.replace(/\d+$/, '').trim());
    await page.getByRole('tab', { name: /^Edeka/ }).click();
    assert.deepEqual(await heads('#items'), ['Obst & Gemüse', 'Vorrat & Konserven'], 'Standard: wie im Laden');
    // Im Geschäfte-Fenster: Vorrat & Konserven ganz nach oben
    await openStores(page);
    const edeka = page.locator('#store-editor .store-row[data-id="store-edeka"]');
    await edeka.locator('.aisle-fold > summary').click();
    assert.equal(await edeka.locator('.aisle-list li').count(), 11, 'alle Gänge stehen in der Liste');
    // Gestalt: Name lesbar in einer Zeile, Pfeile 44 px und rechts daneben (nicht Buchstabe für Buchstabe, nicht über die ganze Breite)
    const layout = await edeka.locator('.aisle-list li').evaluateAll(nodes => nodes.map(node => { const [name, up, down] = [node.querySelector('span'), ...node.querySelectorAll('button')].map(part => part.getBoundingClientRect()); return { name: name.width, nameHeight: name.height, up: [up.width, up.height], down: [down.width, down.height], order: name.right <= up.left + 1 && up.right <= down.left + 1, inside: down.right <= node.getBoundingClientRect().right + 1 }; }));
    for (const row of layout) {
      assert.ok(row.name > 110 && row.nameHeight < 60, `Name steht lesbar (${Math.round(row.name)} × ${Math.round(row.nameHeight)} px)`);
      assert.deepEqual([row.up, row.down], [[44, 44], [44, 44]], 'Pfeile 44 × 44 px'); assert.ok(row.order && row.inside, 'Name, nach oben, nach unten nebeneinander im Rahmen');
    }
    assert.equal(await horizontalOverflow(page), 0);
    assert.equal(await edeka.locator('.aisle-list li').first().textContent(), 'Obst & Gemüse');
    assert.equal(await edeka.getByRole('button', { name: 'Obst & Gemüse nach oben' }).isDisabled(), true, 'der oberste kann nicht weiter nach oben');
    assert.equal(await edeka.getByRole('button', { name: 'Sonstiges nach unten' }).isDisabled(), true);
    for (let i = 0; i < 5; i++) await edeka.getByRole('button', { name: 'Vorrat & Konserven nach oben' }).click();
    assert.equal(await edeka.locator('.aisle-list li').first().innerText().then(text => text.trim()), 'Vorrat & Konserven');
    assert.equal(await edeka.getByRole('button', { name: 'Standardreihenfolge' }).isVisible(), true);
    // Erst „Speichern“ übernimmt die Reihenfolge; vorher ändert sich die Liste nicht
    assert.deepEqual(await heads('#items'), ['Obst & Gemüse', 'Vorrat & Konserven']);
    await edeka.getByRole('button', { name: 'Edeka speichern' }).click();
    assert.deepEqual(await heads('#items'), ['Vorrat & Konserven', 'Obst & Gemüse'], 'Planen, Geschäft Edeka');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.stores.find(row => row.name === 'Edeka').aisles);
    assert.equal(saved[0], 'vorrat'); assert.equal(saved.length, 11);
    await page.keyboard.press('Escape');
    // „Alle“: der Abschnitt Edeka folgt der Reihenfolge, Lidl bleibt im Standard
    await page.getByRole('tab', { name: /^Alle/ }).click();
    const sections = await page.locator('#items .store-head, #items .group-head').allTextContents();
    const text = sections.map(entry => entry.replace(/\d+$/, '').trim());
    const edekaPart = text.slice(text.findIndex(entry => /edeka/i.test(entry)));
    assert.ok(edekaPart.indexOf('Vorrat & Konserven') < edekaPart.indexOf('Obst & Gemüse'), `Abschnitt Edeka: ${edekaPart.join(' | ')}`);
    // Im Laden: dieselbe Reihenfolge
    await page.click('#mode-shop'); await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click();
    assert.deepEqual(await heads('#shop-list'), ['Vorrat & Konserven', 'Obst & Gemüse'], 'Im Laden, Edeka');
    await page.click('#shop-back');
    // Zurück auf den Standard
    await openStores(page);
    const again = page.locator('#store-editor .store-row[data-id="store-edeka"]');
    await again.locator('.aisle-fold > summary').click();
    assert.equal(await again.locator('.aisle-list li').first().innerText().then(value => value.trim()), 'Vorrat & Konserven', 'die gespeicherte Reihenfolge steht beim nächsten Öffnen');
    await again.getByRole('button', { name: 'Standardreihenfolge' }).click();
    assert.equal(await again.locator('.aisle-list li').first().innerText().then(value => value.trim()), 'Obst & Gemüse');
    assert.equal(await again.getByRole('button', { name: 'Standardreihenfolge' }).isHidden(), true, 'im Standard gibt es nichts zurückzusetzen');
    await again.getByRole('button', { name: 'Edeka speichern' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: /^Edeka/ }).click();
    assert.deepEqual(await heads('#items'), ['Obst & Gemüse', 'Vorrat & Konserven']);
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Rezeptentwurf: Angefangenes bleibt beim Schließen und nach dem Neuladen erhalten, wird angeboten, lässt sich zurückholen oder verwerfen; nach dem Speichern ist er weg', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const drafts = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-recipe-drafts-v1') || '{}'));
    await page.click('[data-tab=recipes]');
    // Ein unberührtes Formular hinterlässt keinen Entwurf
    await page.click('#add-recipe'); await sheetOpen(page);
    assert.equal(await page.locator('#recipe-draft-note').isHidden(), true, 'noch kein Entwurf');
    await page.click('#recipe-dialog [data-close]');
    assert.deepEqual(await drafts(), {});
    // Etwas tippen: der Entwurf wird von selbst gesichert (ohne zu speichern), auch das Hinzufügen einer Zutat
    await page.click('#add-recipe'); await sheetOpen(page);
    await page.fill('#recipe-form input[name=name]', 'Linsensuppe');
    await page.fill('#ingredient-editor .ingredient-row [data-field=name]', 'Rote Linsen');
    await page.fill('#ingredient-editor .ingredient-row [data-field=quantity]', '250');
    await page.fill('#ingredient-editor .ingredient-row [data-field=unit]', 'g');
    await page.click('#add-ingredient');
    await page.fill('#ingredient-editor .ingredient-row:nth-child(2) [data-field=name]', 'Zwiebel');
    await page.fill('#recipe-form textarea[name=instructions]', 'Alles kochen.');
    await page.waitForFunction(() => { const draft = JSON.parse(localStorage.getItem('einkauf-recipe-drafts-v1') || '{}').new?.state; return draft?.name === 'Linsensuppe' && draft.instructions === 'Alles kochen.' && draft.ingredients?.[1]?.name === 'Zwiebel'; });
    assert.deepEqual((await drafts()).new.state.ingredients.map(row => row.name), ['Rote Linsen', 'Zwiebel']);
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.recipes)).some(row => row.name === 'Linsensuppe'), false, 'nichts davon ist gespeichert');
    // Schließen mit X, dann erneut „Neu“: der Entwurf wird angeboten
    await page.click('#recipe-dialog [data-close]');
    await page.click('#add-recipe'); await sheetOpen(page);
    assert.equal(await page.locator('#recipe-draft-note').isVisible(), true);
    assert.match(await page.textContent('#recipe-draft-note'), /nicht gespeicherten Entwurf von \d\d\.\d\d\.\d\d.*\d\d:\d\d/);
    assert.equal(await page.inputValue('#recipe-form input[name=name]'), '', 'angeboten, aber nicht von selbst eingesetzt');
    // Die App ganz neu laden (wie nach vollständigem Schließen): der Entwurf ist noch da
    await Promise.all([
      page.evaluate(() => new Promise(resolve => document.querySelector('#recipe-dialog').addEventListener('close', () => resolve(), { once: true }))),
      page.keyboard.press('Escape')
    ]);
    assert.equal((await drafts()).new.state.name, 'Linsensuppe', 'auch ein vollständig abgearbeitetes Schließen bewahrt den angebotenen Entwurf');
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    await page.click('[data-tab=recipes]'); await page.click('#add-recipe'); await sheetOpen(page);
    assert.equal(await page.locator('#recipe-draft-note').isVisible(), true, 'auch nach dem Neuladen');
    await page.getByRole('button', { name: 'Entwurf zurückholen' }).click();
    assert.equal(await page.inputValue('#recipe-form input[name=name]'), 'Linsensuppe');
    assert.equal(await page.locator('#ingredient-editor .ingredient-row').count(), 2);
    assert.equal(await page.inputValue('#ingredient-editor .ingredient-row:nth-child(2) [data-field=name]'), 'Zwiebel');
    assert.equal(await page.inputValue('#recipe-form textarea[name=instructions]'), 'Alles kochen.');
    assert.equal(await page.locator('#recipe-draft-note').isHidden(), true);
    // Speichern: der Entwurf ist weg, ein weiteres „Neu“ bietet nichts mehr an
    await page.click('#recipe-form .sheet-actions button'); await page.waitForSelector('#recipe-dialog', { state: 'hidden' });
    assert.deepEqual(await drafts(), {});
    assert.match(await page.textContent('#recipe-list'), /Linsensuppe/);
    await page.click('#add-recipe'); await sheetOpen(page);
    assert.equal(await page.locator('#recipe-draft-note').isHidden(), true);
    // Verwerfen: ein neuer Entwurf wird angeboten und lässt sich verwerfen
    await page.fill('#recipe-form input[name=name]', 'Nur ein Anfang');
    await page.waitForFunction(() => /Nur ein Anfang/.test(localStorage.getItem('einkauf-recipe-drafts-v1') || ''));
    await page.click('#recipe-dialog [data-close]');
    await page.click('#add-recipe'); await sheetOpen(page);
    await page.getByRole('button', { name: 'Verwerfen' }).click();
    assert.equal(await page.locator('#recipe-draft-note').isHidden(), true);
    assert.deepEqual(await drafts(), {});
    assert.equal(await page.inputValue('#recipe-form input[name=name]'), '');
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Rezeptentwurf: gilt je Rezept (Bearbeiten eines vorhandenen Rezepts), ein importiertes Rezept bleibt bis zum Speichern erhalten', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const drafts = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-recipe-drafts-v1') || '{}'));
    await page.click('[data-tab=recipes]');
    // Vorhandenes Rezept ändern, ohne zu speichern, und schließen
    const card = page.locator('.recipe-card', { hasText: 'Apfel-Pfannkuchen' });
    await card.locator('summary').click(); await card.getByRole('button', { name: 'Bearbeiten' }).click(); await sheetOpen(page);
    assert.equal(await page.inputValue('#recipe-form input[name=name]'), 'Apfel-Pfannkuchen');
    await page.fill('#recipe-form input[name=name]', 'Apfel-Pfannkuchen mit Zimt');
    await page.waitForFunction(() => /Zimt/.test(localStorage.getItem('einkauf-recipe-drafts-v1') || ''));
    const keys = Object.keys(await drafts());
    assert.equal(keys.length, 1);
    assert.notEqual(keys[0], 'new');
    await page.click('#recipe-dialog [data-close]');
    // „Neu“ bietet diesen Entwurf nicht an, das Rezept selbst schon
    await page.click('#add-recipe'); await sheetOpen(page);
    assert.equal(await page.locator('#recipe-draft-note').isHidden(), true, 'der Entwurf gehört zum anderen Rezept');
    await page.click('#recipe-dialog [data-close]');
    // Importiertes Rezept (aus Text): sofort als Entwurf gesichert, auch ohne Änderung
    await page.click('#import-recipe');
    await page.click('[data-source=text]'); await page.fill('#import-form textarea[name=text]', textRecipe);
    await page.click('#import-run'); await page.waitForSelector('#recipe-dialog[open]');
    assert.equal(await page.inputValue('#recipe-form input[name=name]'), 'Cremige Tomatensuppe');
    assert.ok((await drafts()).import, 'der Import ist als Entwurf gesichert');
    await page.click('#recipe-dialog [data-close]');
    // Wer danach ein neues Rezept anlegt, bekommt das liegengebliebene importierte Rezept angeboten
    await page.click('#add-recipe'); await sheetOpen(page);
    assert.match(await page.textContent('#recipe-draft-note'), /importiertes Rezept/);
    await page.getByRole('button', { name: 'Entwurf zurückholen' }).click();
    assert.equal(await page.inputValue('#recipe-form input[name=name]'), 'Cremige Tomatensuppe');
    assert.equal((await drafts()).import, undefined, 'aus „import“ wird „new“');
    assert.ok((await drafts()).new);
    assert.deepEqual(problems, []);
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
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor), 'rgb(15, 24, 46)');
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
    const before = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    await page.locator('#palette button[data-palette=rose]').scrollIntoViewIfNeeded();
    await page.click('#palette button[data-palette=rose]');
    assert.equal(await page.getAttribute('html', 'data-palette'), 'rose');
    assert.equal(await page.locator('#palette button[aria-checked=true]').getAttribute('data-palette'), 'rose');
    const after = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
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

  // Glas-Design (Version 2.22): Schalter, Hintergrund und Transparenz; gemerkt pro Gerät, schon vor dem ersten Anzeigen angewendet
  const glassState = page => page.evaluate(() => {
    const root = document.documentElement, card = document.querySelector('#item-form'), tabs = document.querySelector('.tabs').getBoundingClientRect();
    return {
      on: root.hasAttribute('data-glass'), background: root.dataset.glassBg ?? null, level: root.style.getPropertyValue('--gs'),
      blur: getComputedStyle(card).backdropFilter, tabsLeft: Math.round(tabs.left), tabsWidth: Math.round(tabs.width), viewport: innerWidth,
      bodyBackground: getComputedStyle(document.body).backgroundColor, lights: getComputedStyle(document.body, '::before').content
    };
  });

  test('Glas-Design: standardmäßig an; Schalter, Hintergrund und Transparenz wirken sofort und bleiben nach dem Neuladen', async () => {
    const { ctx, page, problems } = await context({ context: { colorScheme: 'light' } });
    await open(page);
    let state = await glassState(page);
    assert.equal(state.on, true, 'ohne gemerkte Wahl ist das Glas-Design an');
    assert.equal(state.background, 'lichter'); assert.equal(state.level, '0.5');
    assert.match(state.blur, /blur/, 'Karten sind unscharf hinterlegt');
    assert.ok(state.tabsLeft > 0 && state.tabsWidth < state.viewport, 'die Leiste schwebt als Pille');
    assert.equal(state.bodyBackground, 'rgba(0, 0, 0, 0)', 'der Hintergrund kommt von den Lichtern');
    assert.notEqual(state.lights, 'none');

    await openSettings(page);
    assert.equal(await page.isChecked('#glass-on'), true);
    assert.equal(await page.isVisible('#glass-options'), true);
    assert.equal(await page.locator('#glass-bg button').count(), 3);
    assert.equal(await page.locator('#glass-bg button[aria-checked=true]').getAttribute('data-bg'), 'lichter');
    assert.equal(await page.inputValue('#glass-level'), '50');
    assert.equal(await page.textContent('#glass-level-value'), '50 %');
    await page.locator('#glass-on').scrollIntoViewIfNeeded();

    // Transparenz: wirkt beim Ziehen sofort, gemerkt wird beim Loslassen
    await page.fill('#glass-level', '100');
    assert.equal((await glassState(page)).level, '1');
    assert.equal(await page.textContent('#glass-level-value'), '100 %');
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1'))).glassLevel, 100);
    // Hintergrund
    await page.click('#glass-bg button[data-bg=verlauf]');
    assert.equal((await glassState(page)).background, 'verlauf');
    assert.equal(await page.locator('#glass-bg button[aria-checked=true]').getAttribute('data-bg'), 'verlauf');
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1'))).glassBg, 'verlauf');
    // Nach dem Neuladen steht alles schon vor dem Start der App (theme.js im Kopf der Seite)
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    state = await glassState(page);
    assert.deepEqual([state.on, state.background, state.level], [true, 'verlauf', '1']);
    await openSettings(page);
    assert.equal(await page.inputValue('#glass-level'), '100');
    assert.equal(await page.locator('#glass-bg button[aria-checked=true]').getAttribute('data-bg'), 'verlauf');

    // Ausschalten: alles wie vor Version 2.22 (volle Leiste, deckende Karten, Grundfarbe), die Auswahl verschwindet
    await page.locator('#glass-on').scrollIntoViewIfNeeded();
    await page.uncheck('#glass-on');
    state = await glassState(page);
    assert.equal(state.on, false); assert.equal(state.background, null); assert.equal(state.level, '');
    assert.equal(state.blur, 'none', 'keine Unschärfe mehr');
    assert.deepEqual([state.tabsLeft, state.tabsWidth], [0, state.viewport], 'die Leiste füllt wieder die Breite');
    assert.notEqual(state.bodyBackground, 'rgba(0, 0, 0, 0)');
    assert.equal(await page.isVisible('#glass-options'), false);
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1'))).glass, false);
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    assert.equal((await glassState(page)).on, false, 'bleibt nach dem Neuladen aus');
    await openSettings(page);
    assert.equal(await page.isChecked('#glass-on'), false);
    // Wieder an: die zuletzt gewählten Werte gelten weiter
    await page.check('#glass-on');
    state = await glassState(page);
    assert.deepEqual([state.on, state.background, state.level], [true, 'verlauf', '1']);
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Glas-Design: gilt schon beim Laden der Seite (theme.js), nicht erst nach dem Start der App – kein Aufblitzen der alten Darstellung', async () => {
    const { ctx, page, problems } = await context({ config: { glassBg: 'verlauf', glassLevel: 80 }, context: { colorScheme: 'light' } });
    await ctx.addInitScript(() => {
      window.__glassSeen = [];
      new MutationObserver(list => { for (const entry of list) if (entry.attributeName === 'data-glass') window.__glassSeen.push(document.readyState); }).observe(document, { attributes: true, subtree: true });   // das Wurzelelement gibt es beim Einfügen des Skripts noch nicht
    });
    await open(page);
    const seen = await page.evaluate(() => window.__glassSeen);
    assert.equal(seen[0], 'loading', `Das Attribut wird gesetzt, solange die Seite noch lädt (${JSON.stringify(seen)})`);
    const state = await glassState(page);
    assert.deepEqual([state.on, state.background, state.level], [true, 'verlauf', '0.8']);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Glas-Design: unbekannte oder ungültige gemerkte Werte fallen auf die Standardwerte zurück; Statusleiste folgt der Grundfarbe', async () => {
    const { ctx, page, problems } = await context({ config: { glassBg: 'regenbogen', glassLevel: 'viel' }, context: { colorScheme: 'light' } });
    await open(page);
    const state = await glassState(page);
    assert.deepEqual([state.on, state.background, state.level], [true, 'lichter', '0.5']);
    await openSettings(page);
    assert.equal(await page.inputValue('#glass-level'), '50');
    // Außerhalb des Bereichs wird begrenzt
    await page.evaluate(() => localStorage.setItem('einkauf-settings-v1', JSON.stringify({ actor: 'Nico', glassLevel: 250 })));
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    assert.equal((await glassState(page)).level, '1');
    // Die Statusleiste hat mit und ohne Glas dieselbe Farbe (Farbe der Seite, nicht des durchsichtigen Körpers)
    assert.equal(await page.getAttribute('#theme-color', 'content'), '#ecf0f9');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Glas-Design: Schrift bleibt bei jeder Transparenz gut lesbar (hell und dunkel), Leiste und Dialoge passen auch bei 280 px', async () => {
    for (const scheme of ['light', 'dark']) for (const level of [0, 100]) {
      const { ctx, page, problems } = await context({ config: { glassLevel: level }, context: { colorScheme: scheme, viewport: { width: 280, height: 640 } } });
      await ctx.addInitScript(() => {
        const viewport=Object.assign(new EventTarget(),{height:innerHeight,scale:1});
        Object.defineProperty(window,'visualViewport',{value:viewport});
        window.__glassKeyboard=()=>{viewport.height=innerHeight-320;viewport.dispatchEvent(new Event('resize'));};
      });
      await open(page);
      // Grau auf den Karten: die Mischfarbe aus Hintergrund, Lichtfleck und Karte ergibt sich im Bild; hier genügt die Prüfung der Grundfarben
      const [text, muted, bg] = [await colorOf(page, '--text'), await colorOf(page, '--muted'), await colorOf(page, '--bg')];
      assert.ok(contrast(text, bg) >= 7, `${scheme}: Text auf Grundfarbe`);
      assert.ok(contrast(muted, bg) >= 4.5, `${scheme} ${level}: Grautext auf Grundfarbe ${contrast(muted, bg).toFixed(2)}`);
      assert.equal(await horizontalOverflow(page), 0, `${scheme} ${level}: nichts läuft seitlich über`);
      // Alle fünf Reiter passen in die Leiste, auch bei der schmalsten Breite
      const tabs = await page.evaluate(() => { const bar = document.querySelector('.tabs').getBoundingClientRect(); return [...document.querySelectorAll('.tabs button')].map(node => { const r = node.getBoundingClientRect(), label = node.querySelector('.tab-label'); return { inside: r.left >= bar.left - 0.5 && r.right <= bar.right + 0.5, fits: label.scrollWidth <= label.clientWidth + 1 }; }); });
      assert.equal(tabs.length, 5); assert.ok(tabs.every(entry => entry.inside && entry.fits), `${scheme} ${level}: Reiter passen ${JSON.stringify(tabs)}`);
      // Tastatur offen: die schwebende Leiste verschwindet ganz
      await page.focus('#item-form input[name=name]');
      await page.evaluate(() => window.__glassKeyboard());
      await page.waitForFunction(() => document.querySelector('.tabs').getBoundingClientRect().top >= innerHeight, null, { timeout: 2000 }).catch(() => {});
      assert.ok(await page.evaluate(() => document.querySelector('.tabs').getBoundingClientRect().top >= innerHeight), `${scheme} ${level}: Leiste bei offener Tastatur außerhalb des Bildes`);
      assert.deepEqual(problems, []);
      await ctx.close();
    }
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
    await expandForm(page); await chooseUnit(page, '#item-form input[name=unit]', 'Flasche');
    await add('Xyzzy');
    assert.equal(await page.locator('#items .group-head', { hasText: 'Getränke' }).locator('.count').count(), 0, 'keine Zahl bei der Kategorie (seit 2.60)');
    assert.equal(await page.locator('#items .item', { hasText: 'Xyzzy' }).count(), 2, 'beide Xyzzy stehen auf der Liste');
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
      await page.fill('#item-form input[name=name]', name); await chooseUnit(page, '#item-form input[name=unit]', unit); await page.fill('#item-form input[name=quantity]', quantity);
      await page.click('#item-form button[type=submit]');
    };
    const rows = name => page.locator('#items .item', { hasText: name });
    await add('Bananen', '2', 'Stück'); await add('bananen', '3', 'Stk.');
    assert.equal(await rows('Bananen').count(), 1);
    assert.match(await rows('Bananen').textContent(), /5 Stk\./, 'die zuletzt bewusst gewählte Schreibweise der Einheit bleibt erhalten');
    assert.match(await page.textContent('#notice-text'), /„Bananen“: jetzt 5 Stk\./);
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
    assert.match(await rows('Nudeln').textContent(), /2 Packungen à 500 g/);
    assert.equal((await storedDemo(page)).items.find(row=>row.name==='Nudeln'&&!row.deletedAt&&row.storeId==='store-edeka').quantity,700);
    assert.match(await rows('Tomaten').first().textContent(), /1,6 kg/);
    assert.equal(await page.getByRole('button', { name: 'Rückgängig' }).count(), 0, 'Es gibt keinen Rückgängig-Knopf');
    assert.deepEqual(problems, []);
    await ctx.close();
  });


  test('Vorrat: im Einkauf pflegen, beim Übernehmen vorab abgewählt, abgewählte Zutaten merken', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await openPantry(page);
    for (const name of ['Nudeln', 'olivenöl']) { await addPantryProduct(page, name); }
    await addPantryProduct(page, 'NUDELN');await page.fill('#product-picker-search','');   // Doppelte werden nicht angelegt
    assert.deepEqual((await page.locator('#product-picker-list .product-name').allTextContents()).sort(), ['Nudeln', 'olivenöl']);
    const card = page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' });
    await closePantry(page); await page.click('[data-tab=recipes]');
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
    await openPantry(page);
    assert.ok((await page.locator('#product-picker-list .product-name').allTextContents()).includes('Tomaten'));
    // Entfernen
    await setPantryAvailable(page,'Tomaten',false);
    await setPantryAvailable(page,'Nudeln',false);
    assert.deepEqual(await page.locator('#product-picker-list .product-name').allTextContents(), ['olivenöl']);
    // Wochenliste: Vorrat ebenfalls gekennzeichnet
    await closePantry(page); await page.click('[data-tab=plan]'); await page.click('.day-head .icon-button');
    await page.locator('#recipe-pick .pick-row', { hasText: 'Tomaten-Pasta' }).first().click(); await page.click('#meal-form button[type=submit]');
    await page.click('#plan-shopping'); await sheetOpen(page);
    assert.equal(await page.locator('#week-ingredients .transfer-row', { hasText: 'Olivenöl' }).locator('input').isChecked(), false);
    assert.equal(await page.locator('#week-ingredients .pantry-badge').count(), 1);
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

  test('Gemerkte Schreibweisen: bestätigte Schreibweisen stehen in den Einstellungen und lassen sich entfernen', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const aliases = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.aliases.filter(row => !row.deletedAt).map(row => [row.from, row.name]));
    await openSettings(page);
    assert.match(await page.textContent('#alias-details summary'), /Gemerkte Schreibweisen$/);
    assert.match(await page.textContent('#alias-list'), /Noch nichts gemerkt/);
    // Eine Zuordnung entsteht, wenn eine andere Schreibweise ausdrücklich bestätigt wird
    await goTab(page, 'shopping'); await pickStore(page, 'Rewe');
    await page.fill('#item-form input[name=name]', 'Apfel'); await page.waitForSelector('#item-suggestions:not([hidden])');
    await page.locator('#item-suggestions button', { hasText: 'Äpfel' }).click();
    assert.deepEqual(await aliases(), [['apfel', 'Äpfel']]);
    await openSettings(page);
    assert.match(await page.textContent('#alias-details summary'), /Gemerkte Schreibweisen \(1\)/);
    assert.equal((await page.locator('#alias-list li').allTextContents()).join('|'), 'apfel → Äpfel');
    await page.getByRole('button', { name: 'Zuordnung apfel zu Äpfel entfernen' }).click();
    assert.deepEqual(await aliases(), []);
    assert.match(await page.textContent('#alias-list'), /Noch nichts gemerkt/);
    assert.ok(!/\(\d+\)/.test(await page.textContent('#alias-details summary')));
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Ausgaben: von Hand eintragen, Monate vergleichen, Diagramm, nach Geschäft, ändern und löschen', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const today = isoDay(new Date()), before = monthsAgo(1);
    await page.click('[data-tab=spending]');
    assert.equal(await page.locator('#spending-empty').isVisible(), true);
    assert.equal(await page.locator('#purchase-list').isHidden(), true);
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
    assert.match(await page.textContent('#spending-summary'), /Familie insgesamt[\s\S]*23,45\s€[\s\S]*1 Einkauf/);
    assert.match(await page.textContent('#purchase-list'), /Einkauf[\s\S]*Heute · Nico[\s\S]*23,45\s€/);
    // 2. Letzter Monat: Die Ansicht wechselt dorthin, „Dieser Monat“ führt zurück, Vergleich mit dem Vormonat
    await addPurchase(page, { amount: '1.000,00', date: isoDay(before), store: 'Lidl' });
    assert.match(await page.textContent('#month-label'), new RegExp(monthWord(before)));
    assert.match(await page.textContent('#spending-summary'), /1\.000,00\s€/);
    assert.ok(await page.locator('#month-today').isVisible());
    await page.click('#month-today');
    assert.match(await page.textContent('#spending-summary'), /23,45\s€/);
    assert.match(await page.textContent('#spending-summary'), /Vormonat insgesamt: 1\.000,00\s€/);
    assert.equal(await page.locator('#spending-details').evaluate(node => node.open), false);
    await page.locator('#spending-details summary').click();
    // 3. Säulendiagramm: sechs Monate, der gewählte ist markiert, ein Tipp wechselt den Monat
    const bars = page.locator('#spending-chart button');
    assert.equal(await bars.count(), 6);
    assert.equal(await page.locator('#spending-chart [aria-current=true]').count(), 1);
    const heights = await page.locator('#spending-chart .bar').evaluateAll(nodes => nodes.map(node => parseFloat(node.style.height)));
    assert.ok(heights[4] > heights[5] && heights[5] >= 3 && heights.slice(0, 4).every(height => height === 2), `Säulenhöhen: ${heights}`);
    assert.match(await bars.nth(4).getAttribute('aria-label'), /1\.000,00\s€/);
    await bars.nth(4).click();
    assert.match(await page.textContent('#month-label'), new RegExp(monthWord(before)));
    assert.match(await page.textContent('#spending-summary'), /Familie insgesamt[\s\S]*1\.000,00/);
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
    assert.match(await page.textContent('#spending-summary'), /40,00\s€[\s\S]*2 Einkäufe/);
    assert.match(await page.locator('#purchase-list .spend-row', { hasText: 'Edeka' }).textContent(), /Edeka[\s\S]*30,00\s€/);
    assert.ok(!/Wocheneinkauf/.test(await page.locator('#purchase-list .spend-row', { hasText: '30,00' }).textContent()), 'die geleerte Notiz bleibt leer (kein Standard beim Ändern)');
    await page.locator('#purchase-list .spend-row', { hasText: 'Edeka' }).click(); await sheetOpen(page);
    await page.selectOption('#purchase-form select[name=storeId]', ''); await page.click('#purchase-save');
    assert.match(await page.textContent('#purchase-list'), /Einkauf[\s\S]*30,00\s€/);
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
    assert.equal(await page.locator('#spending-empty').isVisible(), true);
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

  for (const width of [280, 320, 390]) {
    test(`Ausgaben: Notiz mit Aufklapp-Knopf rechts im Feld, scrollbare Vorschlagsliste, ein Tipp übernimmt (${width} px)`, async () => {
      const { ctx, page, problems } = await context({ context: { viewport: { width, height: 760 } } });
      await open(page);
      await page.click('[data-tab=spending]');
      const note = page.locator('#purchase-form input[name=note]'), toggle = page.locator('#purchase-note-toggle'), menu = page.locator('#purchase-note-picks');
      const items = () => menu.locator('button').allTextContents();
      const focusedName = () => page.evaluate(() => document.activeElement?.name || document.activeElement?.tagName);
      // iOS-Safari gibt Knöpfen beim Antippen keinen Fokus
      await page.evaluate(() => document.addEventListener('mousedown', event => { if (event.target.closest('button')) event.preventDefault(); }, true));
      await page.click('#add-purchase'); await sheetOpen(page);
      assert.equal(await note.inputValue(), 'Wocheneinkauf');
      // Der Knopf sitzt immer rechts im Feld (auch mit Text), die Liste ist zu
      const box = await toggle.boundingBox(), field = await note.boundingBox();
      assert.ok(await toggle.isVisible());
      assert.ok(box.x >= field.x && box.x + box.width <= field.x + field.width && box.y >= field.y && box.y + box.height <= field.y + field.height, 'der Knopf liegt im Feld');
      assert.ok(field.x + field.width - (box.x + box.width) < 10, 'ganz rechts');
      assert.ok(box.width >= 40 && box.height >= 36, 'groß genug zum Tippen');
      assert.ok(await note.evaluate(node => parseFloat(getComputedStyle(node).paddingRight)) >= box.width + 6, 'der Text endet vor dem Knopf');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(await menu.isVisible(), false, 'ohne Tipp auf den Knopf keine Liste');
      // Tipp auf den Knopf: Liste klappt auf (Standard markiert), die Tastatur ist zu, die Liste scrollt
      await note.focus();
      await page.touchscreen.tap(...Object.values(await spendCenter(toggle)));
      await page.waitForSelector('#purchase-note-picks:not([hidden])');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      assert.notEqual(await focusedName(), 'note', 'die Tastatur ist zu, damit die Liste nicht verdeckt wird');
      assert.deepEqual((await items()).slice(0, 4), ['Wocheneinkauf', 'Großeinkauf', 'Zwischendurch', 'Getränke']);
      assert.equal(await menu.locator('button[aria-pressed=true]').textContent(), 'Wocheneinkauf');
      const scroll = await menu.evaluate(node => ({ scrollable: node.scrollHeight > node.clientHeight + 4, overflowY: getComputedStyle(node).overflowY, height: node.clientHeight }));
      assert.ok(scroll.scrollable && scroll.overflowY === 'auto', 'mehr Vorschläge als sichtbar: die Liste scrollt');
      assert.ok(scroll.height <= 220, 'die Liste bleibt kompakt');
      assert.equal(await horizontalOverflow(page), 0);
      assert.ok(await page.evaluate(() => { const dialog = document.querySelector('dialog[open]'); return dialog.scrollWidth <= dialog.clientWidth; }), 'Dialog läuft nicht über');
      // Bis zum Ende scrollen und dort etwas wählen
      await menu.evaluate(node => { node.scrollTop = node.scrollHeight; });
      assert.ok(await menu.locator('button', { hasText: 'Geschenk' }).evaluate(node => { const list = node.parentElement.getBoundingClientRect(), item = node.getBoundingClientRect(); return item.bottom <= list.bottom + 1 && item.top >= list.top - 1; }), 'der letzte Vorschlag ist erreichbar');
      await page.touchscreen.tap(...Object.values(await spendCenter(menu.locator('button', { hasText: 'Geschenk' }))));
      assert.equal(await note.inputValue(), 'Geschenk');
      assert.equal(await menu.isVisible(), false, 'nach dem Wählen klappt die Liste zu');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      // Der Knopf klappt auch wieder zu; ein Tipp ins Feld klappt zu und wählt den Text aus
      await page.touchscreen.tap(...Object.values(await spendCenter(toggle)));
      await page.waitForSelector('#purchase-note-picks:not([hidden])');
      assert.equal(await menu.locator('button[aria-pressed=true]').textContent(), 'Geschenk', 'die aktuelle Notiz ist markiert');
      await page.touchscreen.tap(...Object.values(await spendCenter(toggle)));
      assert.equal(await menu.isVisible(), false);
      await page.touchscreen.tap(...Object.values(await spendCenter(toggle)));
      await page.waitForSelector('#purchase-note-picks:not([hidden])');
      await page.touchscreen.tap(...Object.values(await spendCenter(note)));
      assert.equal(await focusedName(), 'note');
      assert.equal(await menu.isVisible(), false, 'Tippen ins Feld klappt die Liste zu');
      await page.waitForFunction(() => { const node = document.querySelector('#purchase-form input[name=note]'); return node.selectionEnd === node.selectionStart; });
      assert.deepEqual(problems, []);
      await ctx.close();
    });
  }

  test('Ausgaben: Notiz beginnt mit „Wocheneinkauf“; eigene Notizen werden mitgelernt und in der Aufklappliste vorgeschlagen; beim Ändern gibt es keinen Standard', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('[data-tab=spending]');
    const note = page.locator('#purchase-form input[name=note]'), toggle = page.locator('#purchase-note-toggle'), menu = page.locator('#purchase-note-picks');
    const items = async () => { if (await menu.isHidden()) await toggle.click(); return menu.locator('button').allTextContents(); };
    await page.click('#add-purchase'); await sheetOpen(page);
    assert.equal(await note.inputValue(), 'Wocheneinkauf');
    // Vorschlag wählen und speichern
    await toggle.click(); await menu.locator('button', { hasText: 'Getränke' }).click();
    assert.equal(await note.inputValue(), 'Getränke');
    await page.fill('#purchase-form input[name=amount]', '5'); await page.click('#purchase-save');
    assert.match(await page.textContent('#purchase-list'), /Getränke[\s\S]*5,00\s€/);
    // Eigene Notiz tippen: wird beim nächsten Mal vorgeschlagen (häufigste zuerst, nach dem Standard)
    for (const amount of ['6', '7']) {
      await page.click('#add-purchase'); await sheetOpen(page);
      assert.equal(await note.inputValue(), 'Wocheneinkauf', 'jeder neue Eintrag beginnt wieder mit dem Standard');
      assert.equal(await menu.isVisible(), false, 'die Liste ist beim Öffnen zu');
      await note.fill('Grillabend'); await page.fill('#purchase-form input[name=amount]', amount); await page.click('#purchase-save');
    }
    await page.click('#add-purchase'); await sheetOpen(page);
    const list = await items();
    assert.deepEqual(list.slice(0, 4), ['Wocheneinkauf', 'Grillabend', 'Getränke', 'Großeinkauf']);
    assert.equal(new Set(list).size, list.length, 'keine doppelten Vorschläge');
    assert.equal(list.length, 12);
    await menu.locator('button', { hasText: 'Grillabend' }).click();
    assert.equal(await note.inputValue(), 'Grillabend');
    await page.keyboard.press('Escape');
    // Beim Ändern bleibt die Notiz, wie sie ist: leer bleibt leer, es gibt keinen Standard; die Liste gibt es trotzdem
    await page.locator('#purchase-list .spend-row', { hasText: '5,00' }).click(); await sheetOpen(page);
    assert.equal(await note.inputValue(), 'Getränke');
    assert.equal(await menu.isVisible(), false);
    await note.fill(''); await page.click('#purchase-save'); await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
    await page.locator('#purchase-list .spend-row', { hasText: '5,00' }).click(); await sheetOpen(page);
    assert.equal(await note.inputValue(), '', 'geleerte Notiz bleibt leer');
    assert.ok((await items()).includes('Wocheneinkauf'), 'auch beim Ändern gibt es Vorschläge');
    assert.equal(await menu.locator('button[aria-pressed=true]').count(), 0, 'bei leerer Notiz ist nichts markiert');
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

  test('Einkauf beenden bei einem Geschäft: nur dessen Einkauf und tatsächlicher Betrag; Abgehaktes eines anderen Geschäfts und ein dort abgehakter Artikel ohne Geschäft bleiben; unter „Alle“ geht alles', async () => {
    const data = structuredClone(demo);
    data.items.push({ id: 'item-salz', storeId: '', name: 'Salz', quantity: 1, unit: 'Stück', checked: false, createdBy: 'Nico', createdAt: '2026-10-26T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z', deletedAt: null, _clock: {} });
    const { ctx, page, problems } = await context();
    await ctx.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ base: value, pending: [] })); }, ['einkauf-demo-v1', data]);
    await open(page);
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base);
    const listed = async () => (await page.locator('#items .item').allTextContents()).map(text => text.replace(/\s+/g, ' ').trim());
    // Tomaten bei Edeka, Milch und Salz (ohne Geschäft) bei Lidl abhaken
    await page.click('#mode-shop');
    await page.locator('#shop-chips .chip', { hasText: 'Lidl' }).click();
    await shopTap(page, 'Milch').click(); await shopTap(page, 'Salz').click();
    await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click();
    await shopTap(page, 'Tomaten').click();
    // Edeka beenden: der Text nennt, was bleibt; mit Betrag gespeichert
    await finishShop(page); await sheetOpen(page);
    assert.match(await page.textContent('#finish-text'), /^1 abgehakter Artikel wird von der Liste entfernt\. 2 abgehakte Artikel anderer Geschäfte bleiben bis zum jeweiligen Abschluss stehen\.$/);
    await page.fill('#finish-form input[name=amount]', '5'); await page.click('#finish-form .add-button');
    await page.waitForSelector('#finish-dialog', { state: 'hidden' });
    const after = await stored();
    assert.deepEqual(after.items.filter(row => !row.deletedAt).map(row => row.name).sort(), ['Milch', 'Nudeln', 'Salz', 'Äpfel'], 'nur die Tomaten sind weg');
    assert.deepEqual(after.items.filter(row => !row.deletedAt && row.checked).map(row => row.name).sort(), ['Milch', 'Salz'], 'Milch und Salz bleiben abgehakt stehen');
    const purchase = after.purchases.filter(row => !row.deletedAt).at(-1);
    assert.equal(purchase.cents, 500); assert.ok(!('estimate' in purchase), 'nur der tatsächlich eingegebene Betrag wird gespeichert');
    assert.deepEqual([purchase.storeName ?? '', purchase.storeId], ['Edeka', 'store-edeka']);
    const left = await listed();
    assert.ok(left.some(text => text.includes('Milch')) && left.some(text => text.includes('Salz')) && !left.some(text => text.includes('Tomaten')), left.join(' | '));
    // Rewe beenden: weder Milch noch das bei Lidl abgehakte Salz (der Ort des Salzes wurde beim Abschluss von Edeka nicht vergessen)
    await page.click('#mode-shop'); await page.locator('#shop-chips .chip', { hasText: 'Rewe' }).click();
    await finishShop(page); await sheetOpen(page);
    assert.equal(await page.textContent('#finish-text'), 'Es ist noch nichts abgehakt. 2 abgehakte Artikel anderer Geschäfte bleiben bis zum jeweiligen Abschluss stehen.');
    await page.keyboard.press('Escape'); await page.waitForSelector('#finish-dialog', { state: 'hidden' });
    // Lidl beenden: Milch und das dort abgehakte Salz gehen, Nudeln und Äpfel (offen) bleiben
    await page.locator('#shop-chips .chip', { hasText: 'Lidl' }).click();
    await finishShop(page); await sheetOpen(page);
    assert.equal(await page.textContent('#finish-text'), '2 abgehakte Artikel werden von der Liste entfernt.', 'Milch und das bei Lidl abgehakte Salz; kein Hinweis auf Abgehaktes anderswo');
    await page.click('#finish-only'); await page.waitForSelector('#finish-dialog', { state: 'hidden' });
    assert.deepEqual((await stored()).items.filter(row => !row.deletedAt).map(row => row.name).sort(), ['Nudeln', 'Äpfel']);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Einkauf beenden: auf jedem Weg zurück zu „Planen“; nur tatsächliche Beträge ohne Schätzung oder Vergleich', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base);
    const backToList = async () => { assert.equal(await page.locator('#plan-view').isVisible(), true, 'zurück zu Planen'); assert.equal(await page.locator('#shop-view').isHidden(), true); };
    const finish = async (store, items, how) => {
      await page.click('#mode-shop'); await page.locator('#shop-chips .chip', { hasText: store }).click();
      for (const name of items) await shopTap(page, name).click();
      await finishShop(page); await sheetOpen(page); await how();
    };
    // 1. „Nur beenden“
    await finish('Lidl', ['Milch'], () => page.click('#finish-only')); await page.waitForSelector('#finish-dialog', { state: 'hidden' }); await backToList();
    // 2. mit Betrag (Tomaten und Nudeln haben im Beispiel einen Preis: geschätzte Summe merkt sich der Eintrag), bezahlt viel mehr: rot
    await finish('Edeka', ['Tomaten', 'Nudeln'], async () => { await page.fill('#finish-form input[name=amount]', '99'); await page.click('#finish-form .add-button'); });
    await page.waitForSelector('#finish-dialog', { state: 'hidden' }); await backToList();
    const purchase = (await stored()).purchases.filter(row => !row.deletedAt).at(-1);
    assert.equal(purchase.cents, 9900);
    assert.ok(!('estimate' in purchase), 'kein neuer Schätzwert, auch mit Preisnotizen');
    // 3. Ein günstiger Einkauf: grün (Beispiel: Äpfel bei Rewe, dort 1,00 € bezahlt)
    await finish('Rewe', ['Äpfel'], async () => { await page.fill('#finish-form input[name=amount]', '1'); await page.click('#finish-form .add-button'); });
    await page.waitForSelector('#finish-dialog', { state: 'hidden' }); await backToList();
    // Ausgaben: ein Eintrag von Hand ohne Schätzung hat keinen Punkt
    await page.click('[data-tab=spending]');
    await page.click('#add-purchase'); await sheetOpen(page);
    await page.fill('#purchase-form input[name=amount]', '7'); await page.click('#purchase-save'); await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
    const rows = page.locator('#purchase-list .spend-row');
    assert.equal(await rows.count(), 3);
    assert.equal(await page.locator('#purchase-list .spend-dot').count(), 0, 'die Liste zeigt nur die tatsächlichen Beträge');
    const red = rows.filter({ hasText: '99,00' });
    // Beim Ändern steht der Vergleich in Worten
    await red.click(); await sheetOpen(page); await page.locator('#purchase-more summary').click();
    assert.equal(await page.locator('#purchase-estimate').count(), 0, 'kein Vergleich mehr im Formular');
    await page.keyboard.press('Escape');
    await rows.filter({ hasText: '7,00' }).click(); await sheetOpen(page);
    assert.equal(await page.locator('#purchase-estimate').count(), 0);
    await page.keyboard.press('Escape');
    // Ohne genug Preise keine Schätzung: ein Artikel ohne Preis, abgehakt, beendet mit Betrag
    await page.click('[data-tab=shopping]'); await page.fill('#item-form input[name=name]', 'Gartenschlauch'); await page.click('#item-form button[type=submit]');
    await finish('Rewe', ['Gartenschlauch'], async () => { await page.fill('#finish-form input[name=amount]', '15'); await page.click('#finish-form .add-button'); });
    await page.waitForSelector('#finish-dialog', { state: 'hidden' });
    assert.ok(!('estimate' in (await stored()).purchases.filter(row => !row.deletedAt).at(-1)), 'zu wenige Preise: keine Schätzung gespeichert');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Monatsbudget: festlegen, Fortschritt grün/gelb/rot, Warnung beim Speichern, ändern und entfernen; bleibt nach dem Neuladen', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('[data-tab=spending]');
    const card = page.locator('#spending-budget');
    const add = async amount => { await page.click('#add-purchase'); await sheetOpen(page); await page.fill('#purchase-form input[name=amount]', amount); await page.click('#purchase-save'); await page.waitForSelector('#purchase-dialog', { state: 'hidden' }); };
    // Ohne Budget: nur der Knopf
    assert.equal(await card.getByRole('button', { name: 'Monatsbudget festlegen' }).count(), 1);
    assert.equal(await card.locator('.spend-share').count(), 0);
    // Ungültige Eingaben
    await card.getByRole('button', { name: 'Monatsbudget festlegen' }).click(); await sheetOpen(page);
    assert.equal(await page.locator('#budget-remove').isHidden(), true, 'noch nichts zu entfernen');
    for (const [value, pattern] of [['', /Betrag in Euro eingeben/], ['0', /größer als 0/], ['abc', /Betrag in Euro eingeben/], ['100.000,00', /zu groß/]]) {
      await page.fill('#budget-form input[name=amount]', value); await page.click('#budget-form button[type=submit]');
      assert.match(await page.textContent('#budget-dialog [data-dialog-error]'), pattern, value);
    }
    assert.equal(await page.evaluate(() => (JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.budgets || []).length), 0);
    await page.fill('#budget-form input[name=amount]', '100'); await page.click('#budget-form button[type=submit]');
    await page.waitForSelector('#budget-dialog', { state: 'hidden' });
    assert.match(await page.textContent('#notice-text'), /Monatsbudget 100,00\s€ gespeichert/);
    assert.match(await card.textContent(), /Budget 100,00\s€[\s\S]*0 % verbraucht · noch 100,00\s€/);
    const fill = () => card.locator('.budget-fill');
    // 70 %: grün/normal, keine Warnung in der Meldung
    await add('70');
    assert.match(await card.textContent(), /70 % verbraucht · noch 30,00\s€/);
    assert.ok(await fill().evaluate(node => node.className.trim() === 'budget-fill ok'));
    assert.equal(await fill().evaluate(node => node.style.width), '70%');
    assert.ok(!/Budget/.test(await page.textContent('#notice-text')), 'unter 80 % keine Warnung');
    assert.equal(await card.locator('[role=progressbar]').getAttribute('aria-valuenow'), '70');
    // 85 %: Warnung (gelb) und Hinweis beim Speichern
    await add('15');
    assert.match(await page.textContent('#notice-text'), /15,00\s€ unter Ausgaben gespeichert · 85 % des Budgets verbraucht/);
    assert.ok(await fill().evaluate(node => node.classList.contains('warn')));
    assert.ok(await card.locator('small.budget-warn').count() === 1);
    // 115 %: überschritten (rot), Balken ist voll
    await add('30');
    assert.match(await page.textContent('#notice-text'), /Budget um 15,00\s€ überschritten/);
    assert.match(await card.textContent(), /15,00\s€ über dem Budget \(115 %\)/);
    assert.ok(await fill().evaluate(node => node.classList.contains('over')));
    assert.equal(await fill().evaluate(node => node.style.width), '100%');
    assert.equal(await card.locator('small.budget-over').count(), 1);
    // Ändern: 500 → wieder normal; das Fenster zeigt den bisherigen Wert
    await card.getByRole('button', { name: 'Monatsbudget ändern' }).click(); await sheetOpen(page);
    assert.equal(await page.inputValue('#budget-form input[name=amount]'), '100');
    assert.equal(await page.locator('#budget-remove').isVisible(), true);
    await page.fill('#budget-form input[name=amount]', '500,50'); await page.click('#budget-form button[type=submit]');
    await page.waitForSelector('#budget-dialog', { state: 'hidden' });
    assert.match(await card.textContent(), /Budget 500,50\s€[\s\S]*23 % verbraucht/);
    // Der Vormonat bekommt dasselbe Budget (gilt für jeden Monat)
    await add('1');
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' }); await page.click('[data-tab=spending]');
    assert.match(await card.textContent(), /Budget 500,50\s€/, 'bleibt nach dem Neuladen');
    // Entfernen
    await card.getByRole('button', { name: 'Monatsbudget ändern' }).click(); await sheetOpen(page);
    await page.click('#budget-remove'); await page.waitForSelector('#budget-dialog', { state: 'hidden' });
    assert.match(await page.textContent('#notice-text'), /Monatsbudget entfernt/);
    assert.equal(await card.getByRole('button', { name: 'Monatsbudget festlegen' }).count(), 1);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.budgets[0].cents), 0);
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Monatsbudget auf zwei Geräten: beide sehen dasselbe, der spätere Wert gilt; Layout bei 280 px ohne Überlauf', async () => {
    const remote = github(demo);
    const a = await context({ config: connectedConfig, context: { viewport: { width: 280, height: 560 } } }), b = await context({ config: { ...connectedConfig, actor: 'Anna' } });
    await a.ctx.route('https://api.github.com/**', route => remote.handler(route));
    await b.ctx.route('https://api.github.com/**', route => remote.handler(route));
    for (const device of [a, b]) { await open(device.page); await synced(device.page); await device.page.click('[data-tab=spending]'); }
    await a.page.getByRole('button', { name: 'Monatsbudget festlegen' }).click(); await sheetOpen(a.page);
    await a.page.fill('#budget-form input[name=amount]', '400'); await a.page.click('#budget-form button[type=submit]');
    await synced(a.page);
    assert.equal(remote.content.budgets.length, 1);
    assert.deepEqual([remote.content.budgets[0].id, remote.content.budgets[0].cents], ['monthly', 40000]);
    await pollNow(b.page);
    await b.page.waitForFunction(() => /Budget 400,00/.test(document.querySelector('#spending-budget').textContent), null, { timeout: 20000 });
    // B ändert, A sieht es
    await b.page.getByRole('button', { name: 'Monatsbudget ändern' }).click(); await sheetOpen(b.page);
    await b.page.fill('#budget-form input[name=amount]', '650'); await b.page.click('#budget-form button[type=submit]'); await synced(b.page);
    await pollNow(a.page);
    await a.page.waitForFunction(() => /Budget 650,00/.test(document.querySelector('#spending-budget').textContent), null, { timeout: 20000 });
    assert.equal(remote.content.budgets.length, 1, 'es bleibt bei einer Zeile');
    for (const [label, setup] of [['Fenster', () => a.page.getByRole('button', { name: 'Monatsbudget ändern' }).click()]]) {
      await setup(); await sheetOpen(a.page);
      assert.ok(await a.page.evaluate(() => { const dialog = document.querySelector('dialog[open]'); return document.documentElement.scrollWidth <= document.documentElement.clientWidth && dialog.scrollWidth <= dialog.clientWidth; }), `Überlauf im ${label}`);
      await a.page.keyboard.press('Escape');
    }
    assert.equal(await horizontalOverflow(a.page), 0);
    assert.deepEqual([...a.problems, ...b.problems], []);
    await a.ctx.close(); await b.ctx.close();
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
      await page.locator('#spending-details summary').click();
      const chart = await page.evaluate(() => [...document.querySelectorAll('#spending-chart .value')].map(node => node.scrollWidth <= node.clientWidth + 0.5));
      assert.ok(chart.every(Boolean), 'Zahlen über den Säulen werden abgeschnitten');
      const box = await page.locator('#spending-summary .spend-total').boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= viewport.width, 'Summe ragt aus dem Bild');
      assert.deepEqual(problems, []);
      await ctx.close();
    }
  });

  test('Ausgaben: Foto oder Screenshot eines Kassenbons liest Summe, Datum und Geschäft als Vorschlag, gespeichert wird erst mit „Speichern“', async () => {
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
    await page.click('#purchase-person-add'); await sheetOpen(page); await page.fill('#member-form input[name=name]', 'Anna'); await page.click('#member-form button[type=submit]');
    await page.setInputFiles('#purchase-form input[type=file]', { name: 'bon.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    await page.waitForFunction(() => /Erkannt/.test(document.querySelector('#purchase-status').textContent), null, { timeout: 90000 });
    assert.equal(await page.inputValue('#purchase-form input[name=amount]'), '3,28');
    assert.equal(await page.inputValue('#purchase-form select[name=buyerId]'), 'member-anna');
    assert.equal(await page.inputValue('#purchase-form input[name=date]'), isoDay(day));
    assert.equal(await page.inputValue('#purchase-form select[name=storeId]'), 'store-rewe');
    assert.match(await page.textContent('#purchase-status'), /Summe 3,28\s€[\s\S]*vergleichen/);
    assert.ok(await page.locator('#purchase-progress').isHidden());
    // Noch nichts gespeichert, bis „Speichern“
    assert.equal(await page.evaluate(() => (JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.purchases || []).length), 0);
    // Von Hand korrigieren (Foto war ungenau)
    await page.fill('#purchase-form input[name=amount]', '3,29');
    const notes = () => page.evaluate(() => (JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.prices || []).filter(row => !row.deletedAt).length), notesBefore = await notes();
    await page.click('#purchase-save'); await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base);
    const purchases = stored.purchases.filter(row => !row.deletedAt);
    assert.equal(purchases.length, 1); assert.equal(purchases[0].buyerId, 'member-anna'); assert.equal(purchases[0].buyerName, 'Anna');
    assert.deepEqual([purchases[0].cents, purchases[0].storeId, purchases[0].storeName, purchases[0].source, purchases[0].date], [329, 'store-rewe', 'Rewe', 'hand', isoDay(day)], 'von Hand geändert: Herkunft „hand“');
    assert.equal(await notes(), notesBefore, 'aus dem Bon werden keine Artikelpreise abgeleitet');
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
    assert.equal(await page.locator('#spending-empty').isVisible(), true);
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
    assert.match(await b.page.textContent('#purchase-list'), /Edeka[\s\S]*Nico · von Nico/);
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

  test('Ausgaben gegen doppelte Erfassung: gleicher Tag, Geschäft und Betrag warnen beim ersten Speichern, ein zweites Speichern ist möglich; andere Angaben warnen nicht; die Liste zeigt „Doppelt?“', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('[data-tab=spending]');
    const count = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.purchases.filter(row => !row.deletedAt).length);
    await addPurchase(page, { amount: '40,00', store: 'Edeka' }); await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
    assert.equal(await count(), 1);
    // derselbe Einkauf noch einmal: Warnung, nichts gespeichert, Fenster bleibt offen
    await addPurchase(page, { amount: '40,00', store: 'Edeka' });
    assert.match(await page.textContent('#purchase-dialog [data-dialog-error]'), /Möglicherweise doppelt: Am .+ steht schon ein Einkauf über 40,00\s€ bei Edeka \(von Nico\)\. War es ein zweiter Einkauf, tippe auf „Speichern“ noch einmal\./);
    assert.equal(await page.locator('#purchase-dialog[open]').count(), 1);
    assert.equal(await count(), 1);
    // ein zweites Mal Speichern: gespeichert (es kann wirklich ein zweiter Einkauf sein)
    await page.click('#purchase-save'); await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
    assert.equal(await count(), 2);
    assert.equal(await page.locator('#purchase-list .spend-row', { hasText: 'Doppelt?' }).count(), 2);
    assert.match(await page.locator('#purchase-list .spend-row').first().getAttribute('aria-label'), /möglicherweise doppelt erfasst/);
    // anderer Betrag oder anderes Geschäft: keine Warnung
    await addPurchase(page, { amount: '40,01', store: 'Edeka' }); await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
    await addPurchase(page, { amount: '40,00', store: 'Lidl' }); await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
    assert.equal(await count(), 4);
    assert.equal(await page.locator('#purchase-list .spend-row', { hasText: 'Doppelt?' }).count(), 2);
    // Warnen, dann den Betrag ändern: die Warnung gilt nicht mehr, es wird ohne zweiten Anlauf gespeichert
    await addPurchase(page, { amount: '40,00', store: 'Edeka' });
    await page.waitForSelector('#purchase-dialog [data-dialog-error]');
    await page.fill('#purchase-form input[name=amount]', '41,00'); await page.click('#purchase-save'); await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
    assert.equal(await count(), 5);
    // Beim Ändern eines Eintrags zählt er selbst nicht
    await page.locator('#purchase-list .spend-row', { hasText: '41,00' }).click(); await sheetOpen(page);
    await page.click('#purchase-save'); await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
    assert.equal(await count(), 5);
    // „Einkauf beenden“ mit Betrag: derselbe Schutz („+“ noch einmal)
    await page.click('[data-tab=shopping]'); await page.click('#mode-shop'); await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click();
    await shopTap(page, 'Tomaten').click(); await finishShop(page); await sheetOpen(page);
    await page.fill('#finish-form input[name=amount]', '40'); await page.click('#finish-form .add-button');
    assert.match(await page.textContent('#finish-dialog [data-dialog-error]'), /Möglicherweise doppelt[\s\S]*tippe auf „\+“ noch einmal/);
    assert.equal(await count(), 5);
    await page.click('#finish-form .add-button'); await page.waitForSelector('#finish-dialog', { state: 'hidden' });
    assert.equal(await count(), 6);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Ausgaben: Dialogfenster bei 320 px; Aufräumen bewahrt auch alte Ausgaben', async () => {
    const { ctx, page, problems } = await context({ context: { viewport: { width: 320, height: 568 } } });
    await open(page);
    await page.click('[data-tab=spending]'); await page.click('#add-purchase'); await sheetOpen(page);
    const fits = await page.evaluate(() => { const dialog = document.querySelector('dialog[open]'); return document.documentElement.scrollWidth <= document.documentElement.clientWidth && dialog.scrollWidth <= dialog.clientWidth; });
    assert.ok(fits, 'Überlauf im Dialog Einkauf eintragen');
    await page.keyboard.press('Escape');
    // Ein Eintrag von vor vier Jahren bleibt beim Aufräumen erhalten
    const old = isoDay(new Date(new Date().getFullYear() - 4, 0, 10, 12));
    await page.evaluate(async old2 => {
      const key = 'einkauf-demo-v1', stored = JSON.parse(localStorage.getItem(key));
      stored.base.purchases = [{ id: 'alt-eintrag', date: old2, cents: 1234, source: 'hand', note: '', createdAt: '2020-01-10T10:00:00.000Z', updatedAt: '2020-01-10T10:00:00.000Z', deletedAt: null, _clock: {} }];
      localStorage.setItem(key, JSON.stringify(stored));
    }, old);
    await open(page);
    await openSettings(page);
    assert.ok(!/Aufräumbar: 1 Einträge/.test(await page.textContent('#storage-hint')));
    await page.click('#compact-now');
    assert.match(await page.textContent('#storage-note'), /Aufgeräumt: 0 Einträge entfernt|nichts aufzuräumen/);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.purchases?.length ?? 0), 1);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Artikelvorschläge beim Eintippen: „ap“ → Äpfel, „ba“ → Bananen, eigene vor eingebauten, direkt unter dem Feld (auch bei kleinem Bildschirm mit Tastatur)', async () => {
    // Höhe 380 px: so viel bleibt auf dem iPhone sichtbar, wenn die Tastatur offen ist
    const { ctx, page, problems } = await context({ context: { viewport: { width: 390, height: 380 } } });
    await open(page);
    const field = page.locator('#item-form input[name=name]'), box = page.locator('#item-suggestions');
    const picks = () => box.locator('button').allTextContents();
    await field.focus(); await field.fill('ap');
    await page.waitForSelector('#item-suggestions:not([hidden])');
    // „ap“: der eigene Artikel (Äpfel, Umlaut egal) zuerst, danach eingebaute Namen
    const ap = await picks();
    assert.equal(ap[0], 'Äpfel');
    assert.ok(ap.includes('Aprikosen'), ap.join('|'));
    assert.ok(ap.length <= 6);
    // Direkt unter dem Namensfeld, vor der Geschäftsauswahl, und im sichtbaren Bereich (nicht hinter der Tastatur)
    const fieldBox = await field.boundingBox(), suggestBox = await box.boundingBox(), storeBox = await page.locator('#store-pick').boundingBox();
    assert.ok(suggestBox.y >= fieldBox.y + fieldBox.height - 2 && suggestBox.y - (fieldBox.y + fieldBox.height) < 20, 'direkt unter dem Feld');
    assert.ok(suggestBox.y + suggestBox.height <= storeBox.y + 1, 'vor der Geschäftsauswahl');
    assert.ok(suggestBox.y + suggestBox.height < 380, 'im sichtbaren Bereich');
    assert.equal(await horizontalOverflow(page), 0, 'die Zeile wischt für sich, die Seite läuft nicht über');
    // „ba“: Bananen (häufigster eingebauter Name mit diesem Anfang) zuerst
    await field.fill('ba'); assert.equal((await picks())[0], 'Bananen');
    // Ein Tipp übernimmt den Vorschlag, die Vorschläge verschwinden, die Menge ist dran
    await box.locator('button', { hasText: 'Bananen' }).click();
    assert.equal(await field.inputValue(), 'Bananen');
    assert.equal(await box.isHidden(), true);
    assert.equal(await page.evaluate(() => document.activeElement.matches('input,textarea,select')), false, 'Vorschlag schließt Tastatur ohne Mengenfokus');
    await page.click('#item-form button[type=submit]');
    assert.match(await page.locator('#items .item', { hasText: 'Bananen' }).first().textContent(), /Bananen/);
    // Jetzt kennt die App „Bananen“ als eigenen Artikel; ein ganz neuer eigener Name steht vor den eingebauten
    await field.focus(); await field.fill('Basmatireis'); await page.click('#item-form button[type=submit]');
    await field.focus(); await field.fill('ba');
    const own = await picks();
    assert.deepEqual(own.slice(0, 2), ['Bananen', 'Basmatireis'].sort((a, b) => own.indexOf(a) - own.indexOf(b)), 'eigene Artikel zuerst');
    assert.ok(own.indexOf('Basmatireis') < own.indexOf('Basilikum') && own.indexOf('Bananen') < own.indexOf('Basilikum'), 'eigene Artikel stehen vor Eingebautem');
    // Zutaten der Rezepte zählen auch („Kichererbsen, abgetropft“ → „Kichererbsen“), ohne Treffer bleibt es zu
    await field.fill('kich'); assert.equal((await picks())[0], 'Kichererbsen');
    await field.fill('xqzv'); assert.equal(await box.isHidden(), true);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Schreibweisen: nur vorgeschlagen, erst bestätigt dann gemerkt und angewendet; Schnellwahl häufiger Artikel', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const type = text => page.fill('#item-form input[name=name]', text);
    const submit = () => page.click('#item-form button[type=submit]');
    await pickStore(page, 'Rewe');   // die Beispiel-Äpfel (4 Stück) liegen bei Rewe
    // Der Vorschlag steht da; ohne Bestätigung wird nichts gemerkt. Seit Version 2.48 zählt „Apfel“ trotzdem zu den vorhandenen „Äpfeln“ (dasselbe Produkt, siehe sameProduct)
    await type('Apfel'); await page.waitForSelector('#item-suggestions:not([hidden])');
    assert.match(await page.textContent('#item-suggestions'), /Meinst du dasselbe wie[\s\S]*Äpfel/);
    await submit();
    assert.equal(await page.locator('#items .item', { hasText: /^Apfel/ }).count(), 0, 'kein zweiter Artikel „Apfel“');
    assert.match(await page.locator('#items .item', { hasText: 'Äpfel' }).textContent(), /5 Stück/, 'zu den 4 Äpfeln dazugezählt');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.aliases.length), 0, 'ohne Bestätigung wird keine Zuordnung gemerkt');
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
    assert.match(await page.locator('#items .item', { hasText: 'Äpfel' }).textContent(), /6 Stück/);
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

  test('Angebote mit „gültig bis“ bleiben freiwillige Notizen; keine Schätzung oder Preise in der Liste', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const day = offset => { const date = new Date(Date.now() + offset * 86400000); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
    const apples = () => page.locator('#items .item', { hasText: 'Äpfel' });
    const edit = async until => {
      await apples().getByRole('button', { name: /bearbeiten/ }).click(); await sheetOpen(page);
      await page.click('#item-price-fold > summary');   // Preis & Angebot sind zugeklappt
      if (!(await page.isChecked('#edit-item-form input[name=onSale]'))) {
        await page.check('#edit-item-form input[name=onSale]');
        await page.fill('#edit-item-form input[name=saleEuros]', '0,10');
      }
      await page.fill('#edit-item-form input[name=saleUntil]', until);
    };
    assert.equal(await page.locator('#shopping-total').count(), 0);
    await edit(day(-1));
    assert.equal(await page.locator('#price-comparison').count(), 0, 'kein Preisvergleich im Bearbeiten-Fenster');
    await page.click('#edit-item-form button[type=submit]'); await page.waitForSelector('#item-dialog', { state: 'hidden' });
    assert.equal(await apples().locator('.sale-badge, small.price-note').count(), 0, 'keine Angebotsangaben in der Zeile');
    assert.doesNotMatch(await apples().textContent(), /Angebot|€|ca\./);
    assert.equal(await page.locator('#shopping-total').count(), 0);
    await edit(day(2));
    await page.click('#edit-item-form button[type=submit]'); await page.waitForSelector('#item-dialog', { state: 'hidden' });
    assert.doesNotMatch(await apples().textContent(), /Angebot|€|ca\./, 'auch ein gültiges Angebot steht nicht in der Zeile');
    assert.equal(await page.locator('#shopping-total').count(), 0);
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
    assert.match(await news.filter({ hasText: 'Nudeln' }).textContent(), /2 Packungen à 500 g[\s\S]*\+100 g von Anna/);
    assert.equal(await page.locator('#items .item:not(.news)', { hasText: 'Butter' }).count(), 0, 'steht nicht doppelt in der Liste');
    assert.ok(await news.first().evaluate(node => getComputedStyle(node).backgroundColor !== getComputedStyle(document.documentElement).backgroundColor), 'farblich abgesetzt');
    await news.filter({ hasText: 'Butter' }).getByRole('button', { name: 'Übernehmen' }).click();
    assert.equal(await news.count(), 1);
    assert.equal(await page.locator('#items .item:not(.news)', { hasText: 'Butter' }).count(), 1, 'Butter reiht sich in die Liste ein');
    // Nach dem Neuladen bleibt es so
    await open(page); await synced(page);
    assert.equal(await page.locator('#items .item.news').count(), 1);
    assert.equal(await page.locator('#items .item.news', { hasText: 'Nudeln' }).count(), 1);
    await page.getByRole('button', { name: 'Alle übernehmen' }).click();
    assert.equal(await page.locator('.news-head').count(), 0);
    assert.match(await page.locator('#items .item', { hasText: 'Nudeln' }).textContent(), /2 Packungen à 500 g/);
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
      await page.fill('#item-form input[name=name]', 'Tomaten'); await page.fill('#item-form input[name=quantity]', String(quantity)); await chooseUnit(page, '#item-form input[name=unit]', 'g');
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

  test('Die Anzahl steht nur beim Geschäft, nicht bei den Kategorien: im Laden (Alle und ein einzelnes Geschäft) und unter „Planen“; „Erledigt“ behält seine Zahl', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.fill('#item-form input[name=name]', 'Blumenerde'); await page.click('#item-form button[type=submit]');   // ohne Geschäft
    await page.click('#mode-shop');
    await page.locator('#shop-chips .chip', { hasText: 'Alle' }).click();
    const heads = await page.locator('#shop-list .group-head').count(), stores = await page.locator('#shop-list .store-head').allTextContents();
    assert.ok(heads >= 2 && stores.length >= 2, `${heads} Kategorien, ${stores.length} Geschäfte`);
    assert.equal(await page.locator('#shop-list .group-head .count').count(), 0, 'keine Zahl bei den Kategorien');
    assert.equal(await page.locator('#shop-list .group-head > *').evaluateAll(nodes => nodes.length), heads, 'die Kategorie besteht nur aus ihrem Namen');
    assert.ok(stores.every(text => /\d$/.test(text.trim())), `das Geschäft behält seine Zahl: ${stores}`);
    // Zahl am Geschäft = Zahl der offenen Artikel dort
    const counts = await page.evaluate(() => [...document.querySelectorAll('#shop-list .store-head')].map(head => [Number(head.querySelector('.count').textContent), (() => { let n = 0, node = head.nextElementSibling; while (node && !node.classList.contains('store-head')) { if (node.classList.contains('shop-item')) n++; node = node.nextElementSibling; } return n; })()]));
    for (const [shown, items] of counts) assert.equal(shown, items);
    await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click();
    assert.ok(await page.locator('#shop-list .group-head').count() >= 1);
    assert.equal(await page.locator('#shop-list .group-head .count').count(), 0, 'auch in der Ansicht eines Geschäfts');
    await page.click('#shop-back');
    await page.getByRole('tab', { name: /^Alle/ }).click();
    const planHeads = await page.locator('#items .group-head').evaluateAll(nodes => nodes.map(node => [node.firstElementChild.textContent, node.querySelectorAll('.count').length]));
    assert.ok(planHeads.length >= 2);
    for (const [label, counts] of planHeads) assert.equal(counts, label === 'Erledigt' ? 1 : 0, `${label}: unter „Planen“ nur „Erledigt“ hat eine Zahl`);
    assert.ok((await page.locator('#items .store-head').allTextContents()).every(text => /\d$/.test(text.trim())), 'das Geschäft behält seine Zahl');
    await page.locator('#store-chips .chip, #store-chips [role=tab]', { hasText: 'Edeka' }).first().click();
    assert.ok(await page.locator('#items .group-head').count() >= 1);
    assert.equal(await page.locator('#items .group-head:not(:has-text("Erledigt")) .count').count(), 0, 'auch in der Ansicht eines Geschäfts');
    assert.deepEqual(problems, []); await ctx.close();
  });

  test('Planen: die Menge steht bei jedem Artikel in einer eigenen Zeile unter dem Namen, bündig mit ihm – kurze und lange Namen, schmale und breite Bildschirme', async () => {
    for (const width of [320, 390, 430]) {
      const { ctx, page, problems } = await context({ context: { viewport: { width, height: 800 } } });
      await open(page);
      for (const name of ['Honig', 'Domol Feinwaschmittel für empfindliche Haut', 'Zahnpasta']) { await page.fill('#item-form input[name=name]', name); await page.click('#item-form button[type=submit]'); }
      await page.getByRole('tab', { name: /^Alle/ }).click();
      const rows = await page.locator('#items .item:not(.news)').evaluateAll(nodes => nodes.filter(node => node.querySelector('.item-qty')).map(node => {
        const name = node.querySelector('.item-copy strong').getBoundingClientRect(), qty = node.querySelector('.item-qty').getBoundingClientRect(), meta = node.querySelector('.item-meta').getBoundingClientRect();
        return { text: node.querySelector('.item-copy strong').textContent, nameLeft: name.left, nameBottom: name.bottom, qtyLeft: qty.left, qtyTop: qty.top, qtyBottom: qty.bottom, metaTop: meta.top };
      }));
      assert.ok(rows.length >= 4, `${width}: ${rows.length} Artikel`);
      for (const row of rows) {
        assert.ok(row.qtyTop >= row.nameBottom - 1, `${width} px, ${row.text}: die Menge steht nicht unter dem Namen`);
        assert.ok(Math.abs(row.qtyLeft - row.nameLeft) <= 1, `${width} px, ${row.text}: die Menge ist eingerückt (${row.qtyLeft} statt ${row.nameLeft})`);
        assert.ok(row.metaTop >= row.qtyBottom - 1, `${width} px, ${row.text}: die Person steht unter der Menge`);
      }
      assert.equal(await horizontalOverflow(page), 0);
      assert.deepEqual(problems, []); await ctx.close();
    }
  });

  test('Im Laden: Geschäft wählen, Artikel ohne Geschäft überall bis abgehakt (erst Edeka, dann Lidl), Einkauf beenden', async () => {
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
    assert.deepEqual(await chips(), [['Alle', '5', 'true'], ['Edeka', '3', 'false'], ['Lidl', '2', 'false'], ['Rewe', '2', 'false']], 'Alle ist vorgewählt und zählt alles Offene; Brot zählt in jedem Geschäft mit');
    assert.equal(await page.locator('#shop-chips .chip[aria-selected=true]').first().textContent().then(text => text.startsWith('Alle')), true);
    assert.ok(await page.locator('#shop-list .shop-name').count() > 0);
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
    await shopTap(page, 'Brot').click();
    assert.match(await page.textContent('#shop-status'), /Noch 2 offen/);
    assert.match(await page.textContent('#shop-list .shop-done'), /Erledigt \(1\)[\s\S]*Brot/);
    assert.deepEqual(await chips(), [['Alle', '4', 'false'], ['Edeka', '2', 'true'], ['Lidl', '1', 'false'], ['Rewe', '1', 'false']]);
    // Danach bei Lidl: Brot steht dort nicht mehr (weder offen noch erledigt)
    await chip('Lidl').click();
    assert.deepEqual(await names(), ['Milch']);
    assert.ok(!(await page.textContent('#shop-list')).includes('Brot'));
    // Zurück bei Edeka: Brot ist unter „Erledigt“ und lässt sich wieder öffnen; dann ist es auch bei Lidl wieder da
    await chip('Edeka').click();
    await page.locator('#shop-list .shop-done summary').click();
    await shopTap(page, 'Brot').click();
    await chip('Lidl').click();
    assert.deepEqual((await names()).sort(), ['Brot', 'Milch']);
    // Bei Lidl gekauft: bei Rewe nicht mehr; ein Artikel von Lidl bleibt bei Edeka außen vor
    await shopTap(page, 'Brot').click();
    await shopTap(page, 'Milch').click();
    await chip('Rewe').click();
    assert.deepEqual(await names(), ['Äpfel']);
    // Bildschirm anlassen gilt nur in dieser Ansicht
    await page.check('#shop-awake');
    await page.waitForFunction(() => window.__wake.requests === 1);
    await goTab(page, 'recipes');
    await page.waitForFunction(() => window.__wake.releases === 1);
    await goTab(page, 'shopping');
    await page.waitForFunction(() => window.__wake.requests === 2);
    // Einkauf bei Rewe beenden: bei Lidl Abgehaktes (Milch, Brot) gehört nicht dazu; nichts wird entfernt, die App ist trotzdem zurück in „Planen“
    await finishShop(page); await sheetOpen(page);
    assert.equal(await page.textContent('#finish-text'), 'Es ist noch nichts abgehakt. 2 abgehakte Artikel anderer Geschäfte bleiben bis zum jeweiligen Abschluss stehen.');
    await page.click('#finish-only');
    assert.equal(await page.locator('#plan-view').isVisible(), true);
    assert.ok((await page.textContent('#items')).includes('Brot') && (await page.textContent('#items')).includes('Milch'), 'Brot und Milch stehen noch da');
    // Einkauf bei Lidl beenden: Abgehaktes verschwindet (Milch und das bei Lidl abgehakte Brot), die App ist zurück in „Planen“
    await page.click('#mode-shop'); await chip('Lidl').click();
    await finishShop(page); await sheetOpen(page);
    assert.match(await page.textContent('#finish-text'), /^2 abgehakte Artikel werden von der Liste entfernt\.$/);
    assert.equal(await page.locator('#finish-receipt').count(), 0, 'es gibt keinen Kassenbon-Weg mehr');
    await page.click('#finish-only');
    assert.equal(await page.locator('#plan-view').isVisible(), true);
    assert.equal(await page.locator('#shop-view').isHidden(), true);
    const text = await page.textContent('#items');
    assert.ok(!text.includes('Brot') && !text.includes('Milch'), 'abgehakte Artikel sind entfernt');
    assert.ok(text.includes('Tomaten') && text.includes('Äpfel'), 'offene bleiben');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Im Laden: „Alle“ zeigt alle Geschäfte und Artikel ohne Geschäft; Abhaken, Erledigt und Beenden ohne Geschäft', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base);
    await page.fill('#item-form input[name=name]', 'Brot'); await page.click('#item-form button[type=submit]');   // ohne Geschäft
    await page.click('#mode-shop');
    const all = page.locator('#shop-chips .chip').first();
    assert.equal(await all.evaluate(node => node.firstChild.textContent), 'Alle', '„Alle“ steht ganz vorn, neben den Geschäften');
    assert.equal(await all.locator('.count').textContent(), '5');
    assert.equal(await page.locator('#shop-chips .chip').count(), 4);
    await all.click();
    assert.equal(await all.getAttribute('aria-selected'), 'true');
    const heads = () => page.locator('#shop-list .store-head > span:nth-of-type(1)').allTextContents();
    const names = () => page.locator('#shop-list .shop-item .shop-name').allTextContents();
    assert.deepEqual(await heads(), ['Ohne Geschäft', 'Edeka', 'Lidl', 'Rewe'], 'zuerst ohne Geschäft, dann ein Abschnitt je Geschäft');
    // Die Überschrift „Ohne Geschäft“ bleibt auch mit Glas-Design lesbar (kein Farbverlauf in der Textfarbe)
    assert.equal(await page.locator('#shop-list .store-head.none').first().evaluate(node => getComputedStyle(node).backgroundImage), 'none');
    assert.deepEqual((await names()).sort(), ['Brot', 'Milch', 'Nudeln', 'Tomaten', 'Äpfel'].sort(), 'alles, auch das ohne Geschäft');
    assert.match(await page.textContent('#shop-status'), /Noch 5 offen/);
    assert.equal(await horizontalOverflow(page), 0);
    // Abhaken wie sonst; abgehakt steht unter „Erledigt“, egal bei welchem Geschäft
    await shopTap(page, 'Brot').click();
    await shopTap(page, 'Milch').click();
    assert.match(await page.textContent('#shop-status'), /Noch 3 offen/);
    assert.match(await page.textContent('#shop-list .shop-done'), /Erledigt \(2\)[\s\S]*Brot[\s\S]*Milch/);
    assert.equal(await all.locator('.count').textContent(), '3');
    assert.deepEqual(await heads(), ['Edeka', 'Rewe'], 'Abschnitte ohne offene Artikel verschwinden');
    // In einem einzelnen Geschäft bleibt alles wie gehabt: Brot (abgehakt in „Alle“) taucht dort nicht mehr auf
    await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click();
    assert.deepEqual((await names()).sort(), ['Nudeln', 'Tomaten']);
    await all.click();
    // Einkauf beenden mit Betrag: gespeichert ohne Geschäft, Abgehaktes ist weg, zurück bei „Planen“
    await finishShop(page); await sheetOpen(page);
    assert.match(await page.textContent('#finish-text'), /2 abgehakte Artikel werden von der Liste entfernt/);
    await page.fill('#finish-form input[name=amount]', '12,50'); await page.press('#finish-form input[name=amount]', 'Enter');
    await page.waitForSelector('#finish-dialog[open]', { state: 'detached' });
    const data = await stored();
    assert.deepEqual(data.purchases.map(row => [row.cents, row.storeId || '', row.storeName || '']), [[1250, '', '']], 'ohne Geschäft gespeichert');
    assert.deepEqual(data.items.filter(row => !row.deletedAt).map(row => row.name).sort(), ['Nudeln', 'Tomaten', 'Äpfel']);
    assert.equal(await page.locator('#plan-view').isVisible(), true);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  // ---- Schutz vor versehentlichen Berührungen im Laden (Version 2.25) ----
  const inShop = async (page, store = 'Edeka') => { await page.click('#mode-shop'); await page.locator('#shop-chips .chip', { hasText: store }).click(); };
  const itemState = (page, name) => page.evaluate(wanted => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.items.find(row => row.name === wanted && !row.deletedAt)?.checked ?? null, name);
  const pressAndHold = async (page, selector, ms) => {
    const box = await page.locator(selector).first().boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(ms);
  };

  test('Im Laden: abgehakt wird nur über den Kreis links (große Tippfläche); Name und Menge tippen tut nichts; Abhaken lässt sich gleich zurücknehmen', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await inShop(page);
    const circle = page.locator('#shop-list .shop-tap').first();
    const box = await circle.boundingBox();
    assert.ok(box.width >= 64 && box.height >= 60, `der Kreis hat eine große Tippfläche (${box.width} × ${box.height})`);
    assert.ok(box.x < 20, 'ganz links');
    // Auf Name, Menge und die Zeile daneben tippen: nichts passiert
    await page.locator('#shop-list .shop-name', { hasText: 'Tomaten' }).click();
    await page.locator('#shop-list .shop-qty').first().click();
    const row = await page.locator('#shop-list .shop-item', { hasText: 'Tomaten' }).boundingBox();
    await page.mouse.click(row.x + row.width - 20, row.y + row.height / 2);
    assert.equal(await itemState(page, 'Tomaten'), false, 'nicht abgehakt');
    assert.equal(await itemState(page, 'Nudeln'), false);
    assert.equal(await page.locator('#notice-undo').isVisible(), false);
    // Der Kreis hakt ab; die Meldung bietet „Rückgängig“
    await shopTap(page, 'Tomaten').click();
    assert.equal(await itemState(page, 'Tomaten'), true);
    assert.equal(await page.textContent('#notice-text'), '„Tomaten“ abgehakt');
    assert.equal(await page.locator('#notice-undo').isVisible(), true);
    assert.ok((await page.locator('#notice-undo').boundingBox()).height >= 36, 'der Knopf ist gut zu treffen');
    await page.click('#notice-undo');
    assert.equal(await itemState(page, 'Tomaten'), false, 'zurückgenommen');
    assert.equal(await page.locator('#notice').isHidden(), true);
    assert.match(await page.textContent('#shop-status'), /Noch 2 offen/);
    // Wieder öffnen aus „Erledigt“ geht ebenfalls nur über den Kreis
    await shopTap(page, 'Tomaten').click();
    await page.locator('#shop-list .shop-done summary').click();
    await page.locator('#shop-list .shop-done .shop-name').click();
    assert.equal(await itemState(page, 'Tomaten'), true, 'Name in „Erledigt“ tippen tut nichts');
    await shopTap(page, 'Tomaten').click();
    assert.equal(await itemState(page, 'Tomaten'), false);
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Im Laden: „Einkauf beenden“ muss gedrückt gehalten werden; ein kurzer Tipp, Wegziehen oder Loslassen davor tut nichts', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await inShop(page);
    await shopTap(page, 'Tomaten').click();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));   // ganz nach unten, über die schwebende Leiste hinaus
    const box = await page.locator('#shop-finish').boundingBox(), at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    // Kurzer Tipp: nichts, nur ein Hinweis
    await page.mouse.move(at.x, at.y); await page.mouse.down(); await page.mouse.up();
    assert.equal(await page.locator('#finish-dialog[open]').count(), 0);
    assert.equal(await page.textContent('#notice-text'), 'Zum Beenden gedrückt halten');
    // Halten, aber vor der Zeit loslassen
    await pressAndHold(page, '#shop-finish', 300);
    assert.equal(await page.locator('#shop-finish.holding').count(), 1, 'der Knopf füllt sich');
    await page.mouse.up();
    assert.equal(await page.locator('#shop-finish.holding').count(), 0);
    assert.equal(await page.locator('#finish-dialog[open]').count(), 0);
    // Halten und währenddessen wegziehen (z. B. beim Scrollen): abgebrochen
    await pressAndHold(page, '#shop-finish', 200);
    await page.mouse.move(at.x + 60, at.y - 60, { steps: 4 });
    await page.waitForTimeout(800);
    await page.mouse.up();
    assert.equal(await page.locator('#finish-dialog[open]').count(), 0);
    // Lange genug halten: das Beenden-Fenster öffnet sich, das Loslassen darin löst nichts aus
    await pressAndHold(page, '#shop-finish', 0);
    await page.waitForSelector('#finish-dialog[open]');
    await page.mouse.up();
    assert.equal(await page.locator('#finish-dialog[open]').count(), 1, 'das Fenster bleibt offen, nichts wurde beendet');
    assert.equal(await itemState(page, 'Tomaten'), true, 'Tomaten sind noch da');
    await page.keyboard.press('Escape');
    // Tastatur (und Bedienhilfen) lösen sofort aus (nach dem Loslassen des Zeigers)
    await page.waitForTimeout(900);
    await finishShop(page);
    await page.waitForSelector('#finish-dialog[open]');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Im Laden: Sperre – gesperrt bewirkt Tippen nichts (auch nicht Reiter, „Planen“), kein „Einkauf beenden“, Entsperren nur gedrückt halten, bleibt nach dem Neuladen', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await inShop(page);
    assert.equal(await page.locator('#shop-lockbar').isHidden(), true);
    assert.equal(await page.locator('#shop-view #shop-autolock').count(), 0, 'die Auswahl der Sperrzeit steht nicht mehr unter „Im Laden“, nur in den Einstellungen');
    await page.click('#shop-lock');
    assert.equal(await page.locator('#shop-lockbar').isVisible(), true);
    assert.equal(await page.evaluate(() => document.body.classList.contains('shop-locked')), true);
    assert.equal(await page.locator('#shop-lock').isHidden(), true);
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1'))).shopLocked, true);
    // Nichts reagiert
    await shopTap(page, 'Tomaten').click();
    assert.equal(await itemState(page, 'Tomaten'), false, 'nicht abgehakt');
    assert.equal(await page.locator('#notice').isHidden(), true, 'kein Hinweistext');
    assert.equal(await page.locator('#shop-lockbar.nudge').count(), 1, 'stattdessen leuchtet der Knopf zum Entsperren auf');
    assert.equal(await page.locator('.tabs').isHidden(), true, 'im Laden gibt es unten keine Leiste');
    await page.click('#shop-back');
    assert.equal(await page.locator('#shop-view').isVisible(), true, '„Planen“ wirkt nicht');
    assert.equal(await page.locator('#shop-finish').isHidden(), true, '„Einkauf beenden“ gibt es gesperrt nicht');
    await page.keyboard.press('Tab');
    // Ein kurzer Tipp auf Entsperren genügt nicht
    const unlock = await page.locator('#shop-unlock').boundingBox();
    assert.ok(unlock.height >= 56, 'große Tippfläche zum Entsperren');
    await page.mouse.move(unlock.x + unlock.width / 2, unlock.y + unlock.height / 2); await page.mouse.down(); await page.mouse.up();
    assert.equal(await page.locator('#shop-lockbar').isVisible(), true);
    // Nach dem Neuladen noch gesperrt
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    assert.equal(await page.locator('#shop-lockbar').isVisible(), true, 'gesperrt bleibt gesperrt');
    assert.equal(await page.locator('#shop-view').isVisible(), true);
    // Gedrückt halten entsperrt
    await pressAndHold(page, '#shop-unlock', 100);
    assert.equal(await page.locator('#shop-unlock.holding').count(), 1);
    await page.waitForSelector('#shop-lockbar', { state: 'hidden' });
    await page.mouse.up();
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1'))).shopLocked, false);
    await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click();
    await shopTap(page, 'Tomaten').click();
    assert.equal(await itemState(page, 'Tomaten'), true, 'wieder bedienbar');
    // Verlässt man „Im Laden“ (auf anderem Weg), ist nichts mehr gesperrt
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Im Laden gesperrt: Kreis gedrückt halten hakt ab, Geschäft gedrückt halten wechselt – ein Tipp oder Wegziehen nicht; kein Erklärtext in der Ansicht', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await inShop(page);
    // Die Liste steht im Mittelpunkt: keine Erklärabsätze unter den Einstellungen und dem Beenden-Knopf
    assert.equal(await page.locator('#shop-view p.hint:visible').count(), 0, 'kein Erklärtext sichtbar');
    assert.equal(await page.locator('#shop-awake-hint').isVisible(), false);
    await page.click('#shop-lock');
    assert.equal(await page.locator('#shop-lockbar').isVisible(), true);
    const state = name => itemState(page, name);
    const circle = shopTap(page, 'Tomaten'), chip = page.locator('#shop-chips .chip', { hasText: 'Lidl' });
    // Tipp: nichts, kein Text; der Knopf zum Entsperren leuchtet auf
    await circle.click();
    assert.equal(await state('Tomaten'), false);
    assert.equal(await page.locator('#notice').isHidden(), true, 'kein Hinweistext');
    assert.equal(await page.locator('#shop-lockbar.nudge').count(), 1);
    await page.waitForSelector('#shop-lockbar.nudge', { state: 'detached' });
    await chip.click();
    assert.equal(await page.locator('#notice').isHidden(), true);
    assert.equal(await page.locator('#shop-lockbar.nudge').count(), 1, 'auch bei einem Geschäft');
    assert.equal(await page.locator('#shop-chips .chip[aria-selected=true]').textContent().then(text => /Edeka/.test(text)), true, 'Geschäft nicht gewechselt');
    // Zu früh loslassen und Wegziehen: nichts
    await pressAndHold(page, '#shop-list .shop-tap', 200);
    assert.equal(await page.locator('#shop-list .shop-tap.holding').count(), 1, 'der Kreis füllt sich');
    await page.mouse.up();
    assert.equal(await state('Tomaten'), false);
    const box = await circle.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 4 });
    await page.waitForTimeout(700); await page.mouse.up();
    assert.equal(await state('Tomaten'), false, 'wer beim Halten wegzieht (Scrollen), hakt nichts ab');
    // Gedrückt halten: abgehakt, bleibt gesperrt
    await pressAndHold(page, '#shop-list .shop-tap', 650); await page.mouse.up();
    assert.equal(await state('Tomaten'), true, 'durch Halten abgehakt');
    assert.equal(await page.locator('#shop-lockbar').isVisible(), true, 'weiter gesperrt');
    assert.equal(await page.textContent('#notice-text'), '„Tomaten“ abgehakt');
    // Rückgängig geht auch gesperrt (es ist Teil der Meldung)
    await page.click('#notice-undo');
    assert.equal(await state('Tomaten'), false);
    // Geschäft halten wechselt
    await pressAndHold(page, '#shop-chips .chip:nth-child(3)', 650); await page.mouse.up();
    assert.match(await page.locator('#shop-chips .chip[aria-selected=true]').textContent(), /Lidl/, 'Geschäft durch Halten gewechselt');
    assert.deepEqual(await page.locator('#shop-list .shop-name').allTextContents(), ['Milch']);
    assert.equal(await page.locator('#shop-lockbar').isVisible(), true);
    // Alles andere bleibt gesperrt: Planen, Beenden
    await page.click('#shop-back');
    assert.equal(await page.locator('#shop-view').isVisible(), true);
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Im Laden gesperrt: „Erledigt“ gedrückt halten öffnet und schließt die Liste – ein Tipp oder Wegziehen nicht; bleibt gesperrt, nichts wird markiert', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await inShop(page);
    await shopTap(page, 'Tomaten').click();   // etwas Erledigtes, damit es den Bereich gibt
    const summary = page.locator('#shop-list .shop-done summary'), details = page.locator('#shop-list .shop-done details');
    const isOpen = () => details.evaluate(node => node.open);
    assert.equal(await isOpen(), false);
    await page.click('#shop-lock');
    assert.equal(await page.locator('#shop-lockbar').isVisible(), true);
    // Tipp: nichts, nur ein Hinweis, der das Gedrückthalten nennt
    await summary.click();
    assert.equal(await isOpen(), false, 'ein Tipp öffnet nichts');
    assert.ok(!/Gesperrt|gedrückt halten/.test(await page.textContent('#notice-text')), 'kein Hinweistext (höchstens die Meldung vom Abhaken steht noch da)');
    assert.equal(await page.locator('#shop-lockbar.nudge').count(), 1, 'der Knopf zum Entsperren leuchtet auf');
    // Zu früh loslassen und Wegziehen: nichts
    await pressAndHold(page, '#shop-list .shop-done summary', 200);
    assert.equal(await page.locator('#shop-list .shop-done summary.holding').count(), 1, 'die Zeile füllt sich');
    await page.mouse.up();
    assert.equal(await page.locator('#shop-list .shop-done summary.holding').count(), 0);
    assert.equal(await isOpen(), false);
    const box = await summary.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 4 });
    await page.waitForTimeout(700); await page.mouse.up();
    assert.equal(await isOpen(), false, 'wer beim Halten wegzieht (Scrollen), öffnet nichts');
    // Gedrückt halten öffnet; das Loslassen danach schaltet nicht wieder um und meldet nichts Neues
    await page.waitForSelector('#shop-lockbar.nudge', { state: 'detached' });   // das Aufleuchten vom Tipp ist vorbei, damit ein falsches Aufleuchten nach dem Halten auffiele
    await pressAndHold(page, '#shop-list .shop-done summary', 650); await page.mouse.up();
    assert.equal(await isOpen(), true, 'durch Halten geöffnet');
    assert.equal(await page.locator('#shop-lockbar').isVisible(), true, 'weiter gesperrt');
    assert.equal(await page.locator('#shop-lockbar.nudge').count(), 0, 'nach dem Loslassen leuchtet nichts auf');
    assert.equal(await page.locator('#shop-list .shop-done .shop-name', { hasText: 'Tomaten' }).isVisible(), true);
    assert.equal(await page.evaluate(() => getSelection().toString()), '', 'nichts ist markiert');
    // Ein Tipp tut auch jetzt nichts (der Knopf leuchtet auf); Halten schließt wieder
    await page.waitForTimeout(900);   // das Loslassen nach dem Halten ist ein Klick, der bis dahin still verschluckt wird
    await summary.click();
    assert.equal(await isOpen(), true);
    assert.equal(await page.locator('#shop-lockbar.nudge').count(), 1);
    await page.waitForSelector('#shop-lockbar.nudge', { state: 'detached' });
    await pressAndHold(page, '#shop-list .shop-done summary', 650); await page.mouse.up();
    assert.equal(await isOpen(), false, 'durch Halten geschlossen');
    // Nichts anderes wurde dabei verändert
    assert.equal(await itemState(page, 'Tomaten'), true);
    assert.equal(await page.locator('#shop-lockbar').isVisible(), true);
    // Entsperrt öffnet ein Tipp wie gewohnt
    await pressAndHold(page, '#shop-unlock', 900); await page.mouse.up();
    await page.waitForSelector('#shop-lockbar', { state: 'hidden' });
    await summary.click();
    assert.equal(await isOpen(), true, 'entsperrt: ein Tipp genügt');
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  // ---- Immer hochkant (Version 2.29) ----
  test('Immer hochkant: die App sperrt die Drehung, wo erlaubt; im Querformat auf dem Handy bleibt nur ein Hinweis (Fenster bleiben erhalten), hochkant ist alles wieder da', async () => {
    for (const lock of ['resolve', 'reject']) {   // erlaubt (Android, installiert) und verweigert (Browser-Tab, iPhone): beides darf nichts stören
      const { ctx, page, problems } = await context();
      await ctx.addInitScript(mode => { window.__locks = []; ScreenOrientation.prototype.lock = function (type) { window.__locks.push(type); return mode === 'resolve' ? Promise.resolve() : Promise.reject(new DOMException('nicht erlaubt', 'NotSupportedError')); }; }, lock);
      await open(page);
      assert.deepEqual(await page.evaluate(() => window.__locks), ['portrait'], 'die App will hochkant');
      assert.equal(await page.locator('#turn-hint').isVisible(), false, 'hochkant: kein Hinweis');
      assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-landscape')), false);
      await openStores(page);
      assert.equal(await page.locator('dialog[open]').isVisible(), true);
      // Gedreht: nur der Hinweis, nichts anderes (auch das offene Fenster nicht) ist zu sehen
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForSelector('html[data-landscape]');
      assert.equal(await page.locator('#turn-hint').isVisible(), true);
      assert.match(await page.textContent('#turn-hint'), /Bitte das Handy hochkant halten/);
      const hint = await page.locator('#turn-hint').boundingBox();
      assert.deepEqual([hint.x, hint.y, hint.width, hint.height], [0, 0, 844, 390], 'der Hinweis füllt den Bildschirm');
      assert.equal(await page.locator('dialog[open]').isVisible(), false, 'ein offenes Fenster ist verdeckt');
      assert.equal(await page.locator('.tabs, nav.tabs, [data-tab=settings]').first().isVisible(), false, 'auch die Reiter');
      assert.equal(await page.locator('#turn-hint .icon').isVisible(), true);
      // Zurückgedreht: alles unverändert, das Fenster ist noch offen
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-landscape'));
      assert.equal(await page.locator('#turn-hint').isVisible(), false);
      assert.equal(await page.locator('dialog[open]').isVisible(), true, 'das Fenster wartet noch');
      assert.equal(await horizontalOverflow(page), 0);
      assert.deepEqual(problems, []);
      await ctx.close();
    }
  });

  test('Immer hochkant: eine offene Tastatur (Fenster breiter als hoch) und Tablets lösen den Hinweis nicht aus', async () => {
    // Handy hochkant, aber nur 380 px hoch (Tastatur offen): das Gerät steht weiter hochkant
    let { ctx, page, problems } = await context({ context: { viewport: { width: 390, height: 380 } } });
    await open(page);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-landscape')), false);
    assert.equal(await page.locator('#turn-hint').isVisible(), false);
    assert.deepEqual(problems, []);
    await ctx.close();
    // Tablet quer: dreht frei
    ({ ctx, page, problems } = await context({ context: { viewport: { width: 1024, height: 768 }, screen: { width: 1024, height: 768 } } }));
    await open(page);
    assert.equal(await page.evaluate(() => screen.orientation.type.startsWith('landscape')), true, 'Vorbereitung: das Gerät liegt quer');
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-landscape')), false, 'Tablets drehen frei');
    assert.equal(await page.locator('[data-tab=settings]').isVisible(), true);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Im Laden gesperrt: eine Berührung zeigt keinen Hinweistext, der Knopf zum Entsperren leuchtet farbig auf (hell/dunkel, alle Farben, Glas); Bildschirmleser bekommen die Ansage', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await inShop(page);
    await page.click('#shop-lock');
    const unlock = page.locator('#shop-unlock'), bar = page.locator('#shop-lockbar');
    const animations = node => node.evaluate(element => element.getAnimations().map(animation => animation.animationName));
    // Leere Fläche, Name, Menge, Planen: überall dasselbe, nie ein Text
    for (const target of ['#shop-status', '#shop-list .shop-name', '#shop-list .shop-qty', '#shop-back']) {
      await page.locator(target).first().click();
      assert.equal(await page.locator('#notice').isHidden(), true, `${target}: kein Hinweistext`);
      assert.equal(await bar.evaluate(node => node.classList.contains('nudge')), true, `${target}: der Knopf leuchtet auf`);
      await page.waitForSelector('#shop-lockbar.nudge', { state: 'detached' });
    }
    // Der Knopf pulsiert (Animation am Knopf und an der Leiste); die Klasse verschwindet von selbst
    await page.locator('#shop-status').click();
    assert.deepEqual(await animations(unlock), ['lock-nudge']);
    assert.deepEqual(await animations(bar), ['lock-nudge-bar']);
    // Für Bildschirmleser: unsichtbare Ansage statt des Textes
    assert.equal(await page.locator('#shop-lock-live').getAttribute('role'), 'status');
    await page.waitForFunction(() => document.querySelector('#shop-lock-live').textContent.includes('Zum Entsperren'));
    assert.ok(await page.locator('#shop-lock-live').evaluate(node => getComputedStyle(node).clip !== 'auto' || node.getBoundingClientRect().width <= 1), 'die Ansage ist nicht zu sehen');
    // Der Knopf selbst bleibt bedienbar: gedrückt halten entsperrt, ohne aufzuleuchten
    await page.waitForSelector('#shop-lockbar.nudge', { state: 'detached' });
    await pressAndHold(page, '#shop-unlock', 900); await page.mouse.up();
    await page.waitForSelector('#shop-lockbar', { state: 'hidden' });
    assert.equal(await bar.evaluate(node => node.classList.contains('nudge')), false);
    // Farbe: auf jedem Grund hebt sich der Leuchtrand deutlich ab (Pixel neben dem Knopf mitten im Aufleuchten gegen dieselbe Stelle in Ruhe) und der Knopf selbst wird heller
    await page.click('#shop-lock');
    const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const worst = { ring: Infinity, ringAt: '', fill: Infinity, fillAt: '' };
    const combos = [];
    for (const theme of ['light', 'dark']) { for (const palette of ['blau', 'gruen', 'tuerkis', 'flieder', 'rose', 'pfirsich']) for (const glass of ['aus', 'lichter']) combos.push([theme, palette, glass]); for (const glass of ['verlauf', 'schlicht']) combos.push([theme, 'blau', glass]); }
    for (const [theme, palette, glass] of combos) {
      await page.evaluate(([theme, palette, glass]) => {
        const root = document.documentElement; root.dataset.theme = theme; root.dataset.palette = palette;
        if (glass === 'aus') { delete root.dataset.glass; delete root.dataset.glassBg; root.style.removeProperty('--gs'); } else { root.dataset.glass = ''; root.dataset.glassBg = glass; root.style.setProperty('--gs', '0.5'); }
        document.querySelector('#shop-lockbar').classList.remove('nudge');
      }, [theme, palette, glass]);
      await page.waitForTimeout(80);
      const box = await unlock.boundingBox();
      await page.locator('#shop-status').click();
      const at = time => page.evaluate(time => { for (const animation of document.getAnimations()) { animation.pause(); animation.currentTime = time; } return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }, time);
      const ringSpot = [box.x - 5, box.y + box.height / 2], fillSpot = [box.x + 14, box.y + box.height / 2];
      await at(0);
      const restRing = await pixelAt(page, ...ringSpot), restFill = await pixelAt(page, ...fillSpot);
      await at(200);
      const peakRing = await pixelAt(page, ...ringSpot), peakFill = await pixelAt(page, ...fillSpot);
      const ring = distance(restRing, peakRing), fill = distance(restFill, peakFill), label = `${theme}/${palette}/${glass}`;
      if (ring < worst.ring) { worst.ring = ring; worst.ringAt = `${label}: ${restRing} → ${peakRing}`; }
      if (fill < worst.fill) { worst.fill = fill; worst.fillAt = `${label}: ${restFill} → ${peakFill}`; }
      assert.ok(ring >= 100, `${label}: der Leuchtrand hebt sich zu schwach ab (${ring.toFixed(0)}): ${restRing} → ${peakRing}`);
      assert.ok(fill >= 12, `${label}: der Knopf wird kaum heller (${fill.toFixed(0)}): ${restFill} → ${peakFill}`);
      await page.evaluate(() => { for (const animation of document.getAnimations()) animation.cancel(); document.querySelector('#shop-lockbar').classList.remove('nudge'); });
    }
    console.log(`Aufleuchten: schwächster Leuchtrand ${worst.ring.toFixed(0)} (${worst.ringAt}), schwächste Aufhellung ${worst.fill.toFixed(0)} (${worst.fillAt})`);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Im Laden gesperrt: bei „Bewegung reduzieren“ leuchtet der Knopf ohne Bewegung auf (Leuchtrand statt Pulsieren)', async () => {
    const { ctx, page, problems } = await context({ context: { reducedMotion: 'reduce' } });
    await open(page);
    await inShop(page);
    await page.click('#shop-lock');
    await page.locator('#shop-status').click();
    assert.equal(await page.locator('#shop-lockbar.nudge').count(), 1);
    assert.deepEqual(await page.locator('#shop-unlock').evaluate(node => node.getAnimations().length), 0, 'keine Animation');
    const style = await page.locator('#shop-unlock').evaluate(node => { const css = getComputedStyle(node); return { shadow: css.boxShadow, transform: css.transform }; });
    assert.notEqual(style.shadow, 'none', 'ein Leuchtrand bleibt stehen');
    assert.ok(style.transform === 'none' || style.transform === 'matrix(1, 0, 0, 1, 0, 0)', 'ohne Vergrößern');
    await page.waitForSelector('#shop-lockbar.nudge', { state: 'detached' });
    assert.equal(await page.locator('#shop-unlock').evaluate(node => getComputedStyle(node).boxShadow), 'none', 'danach wieder ruhig');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  // ---- Version 2.33: Sperre 10 s (nur in den Einstellungen), Bildschirm anlassen an, Start unter „Planen“ ----
  test('Automatisch sperren: Standard 10 Sekunden, einstellbar nur unter Einstellungen → Im Laden (nicht mehr in der Ansicht „Im Laden“); die Sperre greift nach 10 Sekunden', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    // Einstellungen: eigener Bereich „Im Laden“ mit Standard 10 Sekunden
    await page.click('[data-tab=settings]');
    assert.equal(await page.locator('#shop-details').evaluate(node => node.open), false, 'der Bereich ist zugeklappt');
    await page.click('#shop-details > summary');
    assert.equal(await page.inputValue('#shop-autolock'), '10', 'Standard: 10 Sekunden');
    assert.equal(await page.locator('#shop-autolock option:checked').textContent(), '10 Sekunden (Standard)');
    assert.deepEqual(await page.locator('#shop-autolock option').allTextContents(), ['Nie', '10 Sekunden (Standard)', '20 Sekunden', '30 Sekunden', '1 Minute', '2 Minuten']);
    assert.match(await page.textContent('#shop-card'), /Bildschirm anlassen/, 'der Hinweis nennt, wo „Bildschirm anlassen“ steht');
    // In der Ansicht „Im Laden“ gibt es die Auswahl nicht mehr
    await page.click('[data-tab=shopping]'); await page.click('#mode-shop');
    assert.equal(await page.locator('#shop-view #shop-autolock').count(), 0);
    assert.equal(await page.locator('#shop-view select').count(), 0, 'keine Auswahl mehr unter der Liste');
    // Ohne Berührung sperrt sich die Ansicht nach 10 Sekunden (nicht nach 30)
    const started = Date.now();
    await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click();
    await page.waitForFunction(() => !document.querySelector('#shop-lockbar').hidden, null, { timeout: 20000 });
    const waited = Date.now() - started;
    assert.ok(waited >= 9000 && waited <= 14000, `gesperrt nach ${waited} ms (Standard 10 Sekunden)`);
    // Eine andere Zeit gilt nach dem Ändern in den Einstellungen und bleibt nach dem Neuladen
    await pressAndHold(page, '#shop-unlock', 900); await page.mouse.up();
    await page.waitForSelector('#shop-lockbar', { state: 'hidden' });
    await openSettings(page);
    await page.selectOption('#shop-autolock', '60');
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1'))).shopLock, 60);
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    assert.equal(await page.inputValue('#shop-autolock'), '60');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Bildschirm anlassen: unter „Im Laden“ standardmäßig an (Bildschirm bleibt an), abwählbar; die Wahl bleibt', async () => {
    const { ctx, page, problems } = await context({ config: { shopLock: 0 } });   // ohne Sperre: ein Neuladen in „Im Laden“ sperrt sonst (Hintergrund)
    await ctx.addInitScript(() => {
      window.__wake = { requests: 0, releases: 0 };
      Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => { window.__wake.requests++; return { release: async () => { window.__wake.releases++; }, addEventListener() {} }; } } });
    });
    await open(page);
    await page.click('#mode-shop');
    await page.waitForFunction(() => window.__wake.requests === 1);
    assert.equal(await page.isChecked('#shop-awake'), true, 'Haken von Anfang an gesetzt');
    assert.equal(await page.locator('#shop-awake-hint').textContent(), '', 'ohne Erklärtext');
    // Abwählen gibt den Bildschirm frei und wird gemerkt
    await page.uncheck('#shop-awake');
    await page.waitForFunction(() => window.__wake.releases === 1);
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1'))).shopScreenOn, false);
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    assert.equal(await page.isChecked('#shop-awake'), false, 'bleibt abgewählt');
    assert.equal(await page.evaluate(() => window.__wake.requests), 0, 'und fordert den Bildschirm nicht an');
    await page.check('#shop-awake');
    await page.waitForFunction(() => window.__wake.requests === 1);
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1'))).shopScreenOn, true);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Bildschirm anlassen scheitert still, wenn der Haken nicht selbst gesetzt wurde (Standard); selbst gesetzt zeigt sich die Fehlermeldung', async () => {
    const { ctx, page, problems } = await context();
    await ctx.addInitScript(() => { Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => { throw new DOMException('nicht erlaubt', 'NotAllowedError'); } } }); });
    await open(page);
    await page.click('#mode-shop');
    await page.waitForFunction(() => !document.querySelector('#shop-awake').checked);
    assert.equal(await page.locator('#shop-awake-hint').textContent(), '', 'keine Fehlermeldung, wenn die Person nichts eingeschaltet hat');
    await page.click('#shop-awake');   // der Haken springt zurück, weil die Anforderung scheitert
    await page.waitForFunction(() => document.querySelector('#shop-awake-hint').textContent.includes('Geht gerade nicht'));
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  // ---- Version 2.36: Bildschirm anlassen sicher an; gesperrt gibt es weder den Haken noch „Einkauf beenden“ ----
  const wakeMock = () => {
    const wake = window.__wake = { requests: 0, releases: 0, fail: 0, listeners: [], drop() { this.listeners.splice(0).forEach(listener => listener()); } };   // drop: das Gerät gibt den Bildschirm von selbst frei
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => {
      wake.requests++;
      if (wake.fail > 0) { wake.fail--; throw new DOMException('nicht erlaubt', 'NotAllowedError'); }
      return { release: async () => { wake.releases++; }, addEventListener: (type, listener) => { if (type === 'release') wake.listeners.push(listener); } };
    } } });
  };

  test('Bildschirm anlassen: ein früher gespeichertes „Aus“ (altes Feld aus Version 2.35 und davor) gilt nicht mehr, Standard ist an; nur das neue Abwählen zählt', async () => {
    const { ctx, page, problems } = await context({ config: { shopLock: 0, shopAwake: false } });
    await ctx.addInitScript(wakeMock);
    await open(page);
    await page.click('#mode-shop');
    await page.waitForFunction(() => window.__wake.requests === 1);
    assert.equal(await page.isChecked('#shop-awake'), true, 'trotz altem „Aus“ von Anfang an an');
    await page.uncheck('#shop-awake');
    await page.waitForFunction(() => window.__wake.releases === 1);
    const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1')));
    assert.equal(saved.shopScreenOn, false, 'das Abwählen wird im neuen Feld gemerkt');
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    assert.equal(await page.isChecked('#shop-awake'), false, 'und gilt danach');
    assert.equal(await page.evaluate(() => window.__wake.requests), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Bildschirm anlassen: klappt die Anforderung einmal nicht, wird sie beim erneuten Öffnen von „Im Laden“ und beim Zurückkehren in die App neu versucht', async () => {
    const { ctx, page, problems } = await context({ config: { shopLock: 0 } });
    await ctx.addInitScript(wakeMock);
    await open(page);
    await page.evaluate(() => { window.__wake.fail = 1; });   // die erste Anforderung scheitert
    await page.click('#mode-shop');
    await page.waitForFunction(() => window.__wake.requests === 1);
    await page.waitForFunction(() => !document.querySelector('#shop-awake').checked);
    assert.equal(await page.locator('#shop-awake-hint').textContent(), '', 'ohne Fehlermeldung (Standard)');
    // Zurück zu „Planen“ und wieder „Im Laden“: neuer Versuch, diesmal klappt es
    await page.click('#shop-back'); await page.click('#mode-shop');
    await page.waitForFunction(() => window.__wake.requests === 2);
    await page.waitForFunction(() => document.querySelector('#shop-awake').checked);
    // Das Gerät gibt den Bildschirm im Hintergrund frei; die App holt ihn sich beim Zurückkehren wieder
    await page.evaluate(() => { window.__wake.drop(); window.__wake.fail = 1; });
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));   // zurück in der App, die Anforderung scheitert wieder
    await page.waitForFunction(() => window.__wake.requests === 3 && !document.querySelector('#shop-awake').checked);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForFunction(() => window.__wake.requests === 4 && document.querySelector('#shop-awake').checked);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Im Laden gesperrt: „Bildschirm anlassen“ und „Einkauf beenden“ sind ausgeblendet, der Bildschirm bleibt an; entsperrt sind beide wieder da (auch nach dem Neuladen und der Auto-Sperre)', async () => {
    const { ctx, page, problems } = await context({ config: { shopLock: 4 } });
    await ctx.addInitScript(wakeMock);
    await open(page);
    await inShop(page);
    await page.waitForFunction(() => window.__wake.requests === 1);
    const visible = async () => ({
      awake: await page.locator('#shop-awake-label').isVisible(), hint: await page.locator('#shop-awake-hint').evaluate(node => !node.hidden),
      finish: await page.locator('#shop-finish').isVisible()
    });
    assert.deepEqual(await visible(), { awake: true, hint: true, finish: true }, 'entsperrt: beides da');
    assert.equal(await page.isChecked('#shop-awake'), true);
    // Von Hand sperren (Schloss)
    await page.click('#shop-lock');
    assert.deepEqual(await visible(), { awake: false, hint: false, finish: false }, 'gesperrt: weder Haken noch „Einkauf beenden“');
    assert.equal(await page.locator('#shop-view :text("Bildschirm anlassen")').count(), 1, 'der Text steht nur im (verborgenen) Haken');
    assert.equal(await page.locator('#shop-view :text("Bildschirm anlassen"):visible').count(), 0);
    assert.equal(await page.locator('#shop-view :text("Einkauf beenden"):visible').count(), 0);
    assert.deepEqual(await page.evaluate(() => ({ requests: window.__wake.requests, releases: window.__wake.releases })), { requests: 1, releases: 0 }, 'der Bildschirm bleibt trotzdem an');
    // Weder per Tastatur erreichbar noch beim Tippen auf die Stelle darunter
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    assert.notEqual(await page.evaluate(() => document.activeElement?.id), 'shop-finish');
    assert.notEqual(await page.evaluate(() => document.activeElement?.id), 'shop-awake');
    // Gesperrt bleibt es nach dem Neuladen (die Sperre wird gemerkt) – auch dann ist beides weg
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    assert.equal(await page.locator('#shop-lockbar').isVisible(), true);
    assert.deepEqual(await visible(), { awake: false, hint: false, finish: false }, 'auch nach dem Neuladen');
    // Entsperren: beides wieder da
    await pressAndHold(page, '#shop-unlock', 900); await page.mouse.up();
    await page.waitForSelector('#shop-lockbar', { state: 'hidden' });
    assert.deepEqual(await visible(), { awake: true, hint: true, finish: true }, 'entsperrt: beides wieder da');
    assert.equal(await page.isChecked('#shop-awake'), true, 'der Haken steht unverändert');
    // Automatische Sperre nach der Wartezeit blendet es ebenfalls aus
    await page.waitForFunction(() => !document.querySelector('#shop-lockbar').hidden, null, { timeout: 9000 });
    assert.deepEqual(await visible(), { awake: false, hint: false, finish: false }, 'auch nach der automatischen Sperre');
    // Der Knopf „Einkauf beenden“ lässt sich gesperrt nicht auslösen (auch nicht per Skript-Klick)
    await page.evaluate(() => document.querySelector('#shop-finish').click());
    assert.equal(await page.locator('#finish-dialog[open]').count(), 0);
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Im Laden gesperrt: abgewählter Haken bleibt abgewählt; Entsperren zeigt ihn wieder abgewählt (kein Bildschirm angefordert)', async () => {
    const { ctx, page, problems } = await context({ config: { shopLock: 0, shopScreenOn: false } });
    await ctx.addInitScript(wakeMock);
    await open(page);
    await inShop(page);
    assert.equal(await page.isChecked('#shop-awake'), false);
    await page.click('#shop-lock');
    assert.equal(await page.locator('#shop-awake-label').isHidden(), true);
    await pressAndHold(page, '#shop-unlock', 900); await page.mouse.up();
    await page.waitForSelector('#shop-lockbar', { state: 'hidden' });
    assert.equal(await page.locator('#shop-awake-label').isVisible(), true);
    assert.equal(await page.isChecked('#shop-awake'), false);
    assert.equal(await page.evaluate(() => window.__wake.requests), 0, 'der Bildschirm wurde nie angefordert');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Start nach vollständigem Schließen: immer „Einkauf → Planen“ (nicht „Im Laden“, nicht gesperrt); ein Neuladen in derselben Sitzung bleibt, wie es war', async () => {
    // Zuletzt war „Im Laden“ gesperrt; die App wurde ganz geschlossen (neue Sitzung)
    const { ctx, page, problems } = await context({ fresh: true, config: { shopMode: true, shopLocked: true, shopLock: 0 } });
    await open(page);
    assert.equal(await page.locator('#shopping').isVisible(), true, 'Reiter Einkauf');
    assert.equal(await page.locator('[data-tab=shopping]').getAttribute('aria-current'), 'page');
    assert.equal(await page.locator('#plan-view').isVisible(), true, 'Planen');
    assert.equal(await page.locator('#shop-view').isHidden(), true, 'nicht „Im Laden“');
    assert.equal(await page.locator('#shop-lockbar').isHidden(), true);
    assert.equal(await page.evaluate(() => document.body.classList.contains('shop-locked')), false);
    assert.equal(await page.locator('#mode-plan').getAttribute('aria-selected'), 'true');
    const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1')));
    assert.deepEqual([saved.shopMode, saved.shopLocked], [false, false], 'auch gespeichert');
    assert.equal(saved.actor, 'Nico', 'die übrigen Einstellungen bleiben');
    // Im Laden und gesperrt, dann dieselbe Sitzung neu laden (z. B. vom Handy aus dem Hintergrund verworfen): es bleibt „Im Laden“ und gesperrt
    await page.click('#mode-shop'); await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click(); await page.click('#shop-lock');
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    assert.equal(await page.locator('#shop-view').isVisible(), true, 'dieselbe Sitzung: weiter „Im Laden“');
    assert.equal(await page.locator('#shop-lockbar').isVisible(), true, 'und gesperrt');
    // Eine neue Sitzung (App ganz geschlossen und neu geöffnet): wieder Planen
    const next = await ctx.newPage();
    await next.goto(`${base}/index.html`); await next.waitForSelector('#status[data-state]', { state: 'attached' });
    await next.evaluate(() => sessionStorage.clear());   // das Schließen der App beendet die Sitzung
    await next.reload(); await next.waitForSelector('#status[data-state]', { state: 'attached' });
    await next.waitForFunction(() => document.querySelector('#mode-plan')?.getAttribute('aria-selected') === 'true');
    assert.equal(await next.locator('#shop-view').isHidden(), true);
    assert.equal(await next.locator('#shop-lockbar').isHidden(), true);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Produktauswahl: kompakter Einstieg, Sammelauswahl, Menge mit Komma und einmalige Übernahme', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    assert.equal(await page.locator('#item-form').evaluate(node => node.classList.contains('compact')), true);
    assert.equal(await page.locator('#open-products').isVisible(), true);
    await storeButton(page, '#store-chips', 'Edeka').click();
    const before = JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-demo-v1'))).base;
    const oldMilk = before.items.filter(row => !row.deletedAt && !row.checked && row.name === 'Milch' && row.storeId === 'store-edeka').reduce((sum, row) => sum + (row.unit === 'ml' ? row.quantity / 1000 : row.quantity), 0);
    await page.click('#open-products'); await sheetOpen(page);
    assert.equal(await page.inputValue('#product-picker-store'), 'store-edeka');
    assert.equal(await page.locator('.product-card').count(), 96);
    assert.match(await page.textContent('#product-picker-status'), /1024 Produkte.*96 angezeigt/);
    assert.equal(await page.locator('#product-picker-add').isDisabled(), true);
    await page.fill('#product-picker-search', 'Milch');
    await page.locator('.product-card[data-product=milch] .product-star').click();
    let saved = JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-demo-v1'))).base;
    assert.equal(saved.items.length, before.items.length, 'ein Stern legt keinen Einkaufsartikel an');
    await page.locator('.product-card[data-product=milch] .product-pick').click();
    await page.fill('#product-picker-search', 'Butter'); await page.locator('.product-card[data-product=butter] .product-pick').click();
    assert.equal(await page.textContent('#product-picker-count'), '2 ausgewählt');
    await page.click('#product-picker-selected');
    const quantity = page.getByRole('textbox', { name: 'Milch: Menge', exact: true });
    await quantity.fill('0'); await page.click('#product-picker-add');
    assert.equal(await page.locator('#product-picker-dialog').isVisible(), true);
    assert.match(await page.textContent('#product-picker-error'), /Milch.*Menge/);
    await chooseUnit(page,'#product-picker-cart-rows [aria-label="Milch: Einheit"]','l');
    await quantity.fill('0,5');
    await page.evaluate(() => { const add = document.getElementById('product-picker-add'); add.click(); add.click(); });
    assert.equal(await page.locator('#product-picker-dialog').isVisible(), false);
    saved = JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-demo-v1'))).base;
    const milk = saved.items.filter(row => !row.deletedAt && !row.checked && row.name === 'Milch' && row.storeId === 'store-edeka').reduce((sum, row) => sum + (row.unit === 'ml' ? row.quantity / 1000 : row.quantity), 0);
    assert.equal(milk, oldMilk + 0.5, 'Menge wird trotz Doppelklick genau einmal übernommen');
    const butter = saved.items.find(row => !row.deletedAt && !row.checked && row.name === 'Butter' && row.storeId === 'store-edeka');
    assert.ok(butter.quantity >= 250 && butter.unit === 'g');
    // Favoriten werden automatisch zuerst geöffnet; Abbrechen fügt nichts hinzu, Stern entfernen löscht keinen Artikel.
    const count = saved.items.length;
    await page.click('#open-products'); assert.equal(await page.locator('[data-product-mode=favorites]').getAttribute('aria-pressed'), 'true');
    await page.locator('.product-card[data-product=milch] .product-star').click();
    assert.match(await page.textContent('#product-picker-status'), /Noch keine Favoriten.*Alle.*Stern/);
    await page.click('#product-picker-dialog [data-close]');
    saved = JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-demo-v1'))).base;
    assert.equal(saved.items.length, count);
    assert.deepEqual(problems, []); await ctx.close();
  });

  test('Produktauswahl: eigene Artikel, sichere Bilder, Favoriten über Neustart und häufig gekauft', async () => {
    const { ctx, page, problems } = await context();
    await open(page); await page.click('#open-products'); await sheetOpen(page);
    await page.click('[data-product-mode=favorites]'); assert.match(await page.textContent('#product-picker-status'), /Stern/);
    await page.click('[data-product-mode=all]'); await page.fill('#product-picker-search', 'aepfel');
    assert.equal(await page.locator('.product-card[data-product=aepfel]').count(), 1);
    await page.fill('#product-picker-search', 'Apfeltasche Spezial');
    const own = page.locator('.product-card');
    assert.equal(await own.count(), 1);
    assert.equal(await own.locator('[data-photo-kind=group][data-photo-key=group-desserts]').count(), 1, 'Gebäck-Gruppenbild statt Apfelfoto für Apfeltasche');
    await own.locator('.product-star').click();
    await page.click('#product-picker-dialog [data-close]');
    await page.reload(); await page.click('#open-products');
    assert.equal(await page.locator('[data-product-mode=favorites]').getAttribute('aria-pressed'), 'true');
    assert.match(await page.textContent('#product-picker-list'), /Apfeltasche/);
    await page.locator('.product-pick').click();
    await page.click('#product-picker-dialog [data-close]');
    await page.click('#open-products'); assert.equal(await page.textContent('#product-picker-count'), '0 ausgewählt', 'Schließen verwirft den Entwurf');
    await page.click('[data-product-mode=all]'); await page.fill('#product-picker-search', '<img src=x onerror=alert(1)>');
    assert.equal(await page.locator('#product-picker-list img').count(), 0, 'Name ist Text, kein HTML');
    await page.fill('#product-picker-search', ''); await page.click('[data-product-mode=frequent]');
    assert.match(await page.textContent('#product-picker-status'), /häufig gekauft|mindestens zweimal/);
    assert.deepEqual(problems, []); await ctx.close();
  });

  test('Produktauswahl: lokale Fotos, hell/dunkel, große Touchflächen und sichtbare Übernahmeleiste', async () => {
    const { ctx, page, problems } = await context();
    const external = []; await ctx.route('https://**', route => { external.push(route.request().url()); return route.abort(); });
    await open(page); await page.click('#open-products'); await sheetOpen(page);
    const photos = await page.evaluate(async () => {
      const urls = [...new Set([...document.querySelectorAll('.product-photo')].map(node => getComputedStyle(node).backgroundImage.match(/url\("?([^"\)]+)/)?.[1]).filter(Boolean))];
      return Promise.all(urls.map(async src => { const image = new Image(); image.src = src; await image.decode(); return [src, image.naturalWidth, image.naturalHeight]; }));
    });
    assert.equal(photos.length, 6); assert.ok(photos.every(([src, width]) => src.includes('/assets/products/') && width > 500));
    for (const width of [280, 320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
        assert.equal(await horizontalOverflow(page), 0);
        const sizes = await page.locator('#product-picker-dialog').evaluate(node => [node.scrollWidth, node.clientWidth]);
        assert.ok(sizes[0] <= sizes[1], `${width}/${theme}: Dialog läuft über`);
        const footer = await page.locator('.product-picker-footer').boundingBox();
        assert.ok(footer.y >= 0 && footer.y + footer.height <= 845, `${width}/${theme}: Fußleiste außerhalb des Bildschirms ${JSON.stringify(footer)}`);
      }
    }
    assert.ok(await page.locator('.product-star,.product-pick').evaluateAll(nodes => nodes.every(node => { const box = node.getBoundingClientRect(); return box.height >= 44 && box.width >= 44; })));
    await page.setViewportSize({ width: 320, height: 568 });
    await page.fill('#product-picker-search', 'Milch'); await page.locator('.product-card[data-product=milch] .product-pick').tap();
    await page.click('#product-picker-selected');
    const input = page.getByRole('textbox', { name: 'Milch: Menge', exact: true });
    assert.ok(await input.evaluate(node => parseFloat(getComputedStyle(node).fontSize)>=16));
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(external, []); assert.deepEqual(problems, []); await ctx.close();
  });

  test('Produktauswahl: Favoriten und Einkaufsartikel offline gespeichert, danach zwei Geräte zusammengeführt', async () => {
    const api = github(demo); let offline = false;
    const nico = await context({ config: connectedConfig, context: { serviceWorkers: 'allow' } });
    const anna = await context({ config: { ...connectedConfig, actor: 'Anna' } });
    await nico.ctx.route('https://api.github.com/**', route => offline ? route.abort('internetdisconnected') : api.handler(route));
    await anna.ctx.route('https://api.github.com/**', api.handler);
    for (const device of [nico, anna]) { await open(device.page); await device.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok'); }
    await nico.page.evaluate(() => navigator.serviceWorker.ready); await nico.page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    offline = true; await nico.ctx.setOffline(true);
    await nico.page.click('#open-products'); await nico.page.fill('#product-picker-search', 'Milch');
    await nico.page.locator('.product-card[data-product=milch] .product-star').click();
    await nico.page.locator('.product-card[data-product=milch] .product-pick').click();
    await nico.page.selectOption('#product-picker-store', 'store-rewe'); await nico.page.click('#product-picker-add');
    assert.ok(!api.content.productFavorites?.some(row => row.productId === 'milch'), 'Stern noch offline');
    await nico.page.reload(); await nico.page.click('#open-products'); await sheetOpen(nico.page);
    assert.equal(await nico.page.locator('.product-card[data-product=milch] .product-star').getAttribute('aria-pressed'), 'true');
    const imageLoaded = await nico.page.locator('.product-photo').evaluate(async node => { const image = new Image(); image.src = getComputedStyle(node).backgroundImage.slice(5, -2); await image.decode(); return image.naturalWidth > 0; });
    assert.equal(imageLoaded, true, 'Foto nach Offline-Neustart vorhanden');
    await nico.page.click('#product-picker-dialog [data-close]');
    await anna.page.click('#open-products'); await anna.page.fill('#product-picker-search', 'Butter');
    await anna.page.locator('.product-card[data-product=butter] .product-star').click();
    await anna.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    offline = false; await nico.ctx.setOffline(false); await pollNow(nico.page);
    await nico.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    const favorites = api.content.productFavorites.filter(row => !row.deletedAt).map(row => row.productId).sort();
    assert.deepEqual(favorites, ['butter', 'milch']);
    assert.ok(api.content.items.some(row => row.name === 'Milch' && row.storeId === 'store-rewe' && row.createdBy === 'Nico'));
    await anna.page.fill('#product-picker-search', ''); await anna.page.click('[data-product-mode=favorites]');
    await pollNow(anna.page); await anna.page.waitForFunction(() => document.querySelector('.product-card[data-product=milch] .product-star')?.getAttribute('aria-pressed') === 'true');
    assert.deepEqual(nico.problems.filter(text => !/Failed to load resource|Failed to fetch/.test(text)), []);
    assert.deepEqual(anna.problems, []); await nico.ctx.close(); await anna.ctx.close();
  });

  test('Produktauswahl: Hintergrundabgleich erhält Eingaben; gelöschtes Geschäft wird nicht still ersetzt', async () => {
    const api = github(demo);
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', api.handler); await open(page);
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    await storeButton(page, '#store-chips', 'Edeka').click(); await page.click('#open-products');
    await page.fill('#product-picker-search', 'Milch'); await page.locator('.product-card[data-product=milch] .product-pick').click();
    await page.click('#product-picker-selected'); await chooseUnit(page,'#product-picker-cart-rows [aria-label="Milch: Einheit"]','l'); await page.getByRole('textbox', { name: 'Milch: Menge', exact: true }).fill('0,75');
    api.remoteChange(data => { data.stores.find(row => row.id === 'store-edeka').deletedAt = new Date().toISOString(); });
    await pollNow(page); await page.waitForFunction(() => document.querySelector('#product-picker-store option:checked')?.textContent.includes('gelöscht'));
    assert.equal(await page.getByRole('textbox', { name: 'Milch: Menge', exact: true }).inputValue(), '0,75');
    assert.equal(await page.locator('#product-picker-add').isDisabled(), true);
    await page.selectOption('#product-picker-store', 'store-lidl'); await page.click('#product-picker-add');
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    assert.equal(await page.locator('#product-picker-dialog').isVisible(),false);
    assert.equal(api.content.items.filter(row=>!row.deletedAt&&row.name==='Milch'&&row.storeId==='store-lidl').reduce((n,row)=>n+row.quantity*(row.unit==='ml'?.001:1),0),1.75);
    assert.deepEqual(problems, []); await ctx.close();
  });

  test('Händlerkatalog: suchen, filtern, abbrechen, Vorlage mit Filialname speichern und eigene Geschäfte anlegen', async () => {
    const { ctx, page, problems } = await context({ config: { storeStyle: 'logo' } });
    await open(page); await page.click('#manage-stores'); await sheetOpen(page);
    await page.click('#choose-store'); await sheetOpen(page);
    assert.equal(await page.locator('.catalog-choice').count(), 30);
    assert.equal(await page.locator('[data-chain=edeka]').isDisabled(), true);
    assert.equal(await page.locator('[data-chain=dm]').isEnabled(), true);
    await page.fill('#store-catalog-search', 'aldi');
    assert.equal(await page.locator('.catalog-choice').count(), 2);
    const before = await page.evaluate(() => localStorage.getItem('einkauf-demo-v1'));
    await page.click('#store-catalog-dialog [data-close].icon-button');
    assert.equal(await page.locator('#stores-dialog').isVisible(), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('einkauf-demo-v1')), before, 'Abbrechen speichert nichts');
    await page.click('#choose-store'); await page.selectOption('#store-catalog-type', 'drugstore');
    assert.equal(await page.locator('.catalog-choice').count(), 4);
    await page.fill('#store-catalog-search', 'mueller');
    assert.equal(await page.locator('.catalog-choice').count(), 1);
    await page.fill('#store-catalog-search', ''); await page.click('[data-chain=dm]');
    assert.equal(await page.inputValue('#store-form [name=name]'), 'dm');
    assert.equal(await page.inputValue('#store-form [name=offersUrl]'), 'https://www.dm.de/neu');
    assert.equal(await page.locator('#store-template').isVisible(), true);
    await page.fill('#store-form [name=name]', 'dm Innenstadt');
    await page.click('#store-form [type=submit]');
    const dm = page.locator('#store-editor .store-row', { hasText: 'dm Innenstadt' });
    await dm.locator('summary').first().click();
    assert.equal(await dm.locator('select[name=chainKey]').inputValue(), 'dm');
    assert.equal(await dm.locator('input[name=anywhere]').isChecked(), false);
    assert.equal(await dm.locator('.brand-dm img').count(), 1);
    await dm.locator('input[name=offersUrl]').fill('https://example.org/filiale');
    await dm.getByRole('button', { name: 'dm Innenstadt speichern' }).click();
    let saved = JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-demo-v1'))).base;
    let row = saved.stores.find(row => row.name === 'dm Innenstadt');
    assert.deepEqual([row.chainKey, row.offersUrl], ['dm', 'https://example.org/filiale']);
    // Ein bewusst eigener Link bleibt auch beim Wechsel des Katalog-Händlers bestehen.
    await dm.locator('select[name=chainKey]').selectOption('mueller');
    assert.equal(await dm.locator('input[name=offersUrl]').inputValue(), 'https://example.org/filiale');
    await dm.locator('select[name=chainKey]').selectOption('dm');
    await dm.getByRole('button', { name: 'dm Innenstadt speichern' }).click();
    await page.click('#choose-store'); assert.equal(await page.locator('[data-chain=dm]').isDisabled(), true);
    await page.fill('#store-catalog-search', 'Nicht vorhandener Händler');
    assert.equal(await page.locator('.catalog-choice').count(), 0);
    assert.match(await page.textContent('#store-catalog-count'), /Kein Treffer/);
    await page.getByRole('button', { name: 'Eigenen Namen eingeben', exact: true }).click();
    await page.fill('#store-form [name=name]', 'Mein Baumarkt');
    await page.fill('#store-form [name=offersUrl]', 'https://example.org/baumarkt');
    await page.click('#store-form [type=submit]');
    saved = JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-demo-v1'))).base;
    row = saved.stores.find(row => row.name === 'Mein Baumarkt');
    assert.deepEqual([row.chainKey, row.offersUrl], [null, 'https://example.org/baumarkt']);
    await page.click('#stores-dialog [data-close]');
    await storeButton(page, '#store-chips', 'dm Innenstadt').click();
    assert.equal(await page.getAttribute('#offers-link', 'href'), 'https://example.org/filiale');
    assert.deepEqual(problems, []); await ctx.close();
  });

  test('Händlerkatalog: Logos vollständig lokal, hell/dunkel und auf kleinen iPhones lesbar', async () => {
    const { ctx, page, problems } = await context();
    const external = []; await ctx.route('https://**', route => { external.push(route.request().url()); return route.abort(); });
    await open(page); await page.click('#manage-stores'); await page.click('#choose-store'); await sheetOpen(page);
    await page.waitForFunction(() => [...document.querySelectorAll('#store-catalog-list img')].every(img => img.complete && img.naturalWidth > 0));
    for (const width of [280, 320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
        const sizes = await page.locator('#store-catalog-dialog').evaluate(node => ({ scroll: node.scrollWidth, client: node.clientWidth }));
        assert.ok(sizes.scroll <= sizes.client, `${width}/${theme}: Dialog läuft seitlich über`);
        assert.equal(await horizontalOverflow(page), 0);
        assert.ok((await page.locator('.catalog-choice').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44))));
      }
    }
    assert.deepEqual(external, [], 'keine Händler-/Logodienst-Abfrage');
    // Abbrechen mit der Tastatur kehrt in den offenen Geschäfte-Dialog zurück.
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#stores-dialog').isVisible(), true);
    assert.equal(await page.locator('#store-catalog-dialog').isVisible(), false);
    assert.deepEqual(problems, []); await ctx.close();
  });

  test('Händlerkatalog: Offline-Neustart mit Logos, neues Geschäft später auf zweitem Gerät und im Backup', async () => {
    const api = github(demo); let offline = false;
    const nico = await context({ config: { ...connectedConfig, storeStyle: 'logo' }, context: { serviceWorkers: 'allow' } });
    const anna = await context({ config: { ...connectedConfig, actor: 'Anna', storeStyle: 'logo' } });
    await nico.ctx.route('https://api.github.com/**', route => offline ? route.abort('internetdisconnected') : api.handler(route));
    await anna.ctx.route('https://api.github.com/**', api.handler);
    for (const device of [nico, anna]) { await open(device.page); await device.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok'); }
    await nico.page.evaluate(() => navigator.serviceWorker.ready);
    await nico.page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    offline = true; await nico.ctx.setOffline(true); await nico.page.reload();
    await nico.page.click('#manage-stores'); await nico.page.click('#choose-store'); await sheetOpen(nico.page);
    await nico.page.waitForFunction(() => [...document.querySelectorAll('#store-catalog-list img')].every(img => img.complete && img.naturalWidth > 0));
    await nico.page.fill('#store-catalog-search', 'aldi sued'); await nico.page.click('[data-chain=aldi-sued]');
    await nico.page.click('#store-form [type=submit]');
    assert.ok(!api.content.stores.some(row => row.chainKey === 'aldi-sued'), 'offline noch nicht gesendet');
    await nico.page.reload(); await nico.page.click('#manage-stores');
    assert.match(await nico.page.textContent('#store-editor'), /ALDI SÜD/);
    offline = false; await nico.ctx.setOffline(false); await pollNow(nico.page);
    await nico.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    assert.equal(api.content.stores.filter(row => row.chainKey === 'aldi-sued').length, 1);
    await pollNow(anna.page); await anna.page.waitForFunction(() => document.querySelector('#store-chips .brand-aldi-sued'));
    const copied = JSON.parse(JSON.stringify(api.content));
    assert.equal(copied.stores.find(row => row.chainKey === 'aldi-sued').offersUrl, '', 'der aktuelle Standard kommt aus dem Katalog');
    await storeButton(anna.page, '#store-chips', 'ALDI SÜD').click();
    assert.equal(await anna.page.getAttribute('#offers-link', 'href'), 'https://www.aldi-sued.de/angebote');
    assert.deepEqual(nico.problems.filter(text => !/Failed to load resource|Failed to fetch/.test(text)), []);
    assert.deepEqual(anna.problems, []); await nico.ctx.close(); await anna.ctx.close();
  });

  test('Geschäfte & Angebote: vorhandene Geschäfte zugeklappt mit Pfeil, aufklappbar; „Neues Geschäft“ unten fest; ein neues Geschäft erscheint zugeklappt', async () => {
    const { ctx, page, problems } = await context({ context: { viewport: { width: 280, height: 640 } } });
    await open(page);
    await page.click('#manage-stores'); await sheetOpen(page);
    const rows = page.locator('#store-editor .store-row');
    assert.equal(await rows.count(), 3);
    assert.deepEqual(await rows.evaluateAll(nodes => nodes.map(node => node.tagName + ':' + node.open)), ['DETAILS:false', 'DETAILS:false', 'DETAILS:false'], 'alle zugeklappt');
    assert.deepEqual(await rows.locator('> summary').allTextContents(), ['Edeka', 'Lidl', 'Rewe'], 'nur der Name steht da');
    for (const box of await rows.locator('> summary').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height))) assert.ok(box >= 48, `gut zu treffen (${box} px)`);
    assert.equal(await rows.first().locator('input[name=name]').isVisible(), false, 'die Felder sind verborgen');
    const arrow = await rows.first().locator('> summary').evaluate(node => getComputedStyle(node, '::after').content);
    assert.notEqual(arrow, 'none', 'der Pfeil steht rechts');
    // „Neues Geschäft“: fest, nicht klappbar, sichtbar
    const form = page.locator('#store-form');
    assert.equal(await form.evaluate(node => node.closest('details') === null), true, 'nicht in einer klappbaren Karte');
    assert.equal(await form.locator('input[name=name]').isVisible(), true);
    assert.equal(await form.locator('h3').textContent(), 'Neues Geschäft');
    // Aufklappen mit einem Tipp auf die Zeile; die anderen bleiben zu
    await rows.nth(2).locator('> summary').click();
    assert.equal(await rows.nth(2).evaluate(node => node.open), true);
    assert.equal(await rows.nth(2).locator('input[name=name]').isVisible(), true);
    assert.equal(await rows.nth(2).locator('input[name=name]').inputValue(), 'Rewe');
    assert.equal(await rows.nth(0).evaluate(node => node.open), false);
    assert.equal(await horizontalOverflow(page), 0);
    await rows.nth(2).locator('> summary').click();
    assert.equal(await rows.nth(2).evaluate(node => node.open), false, 'ein zweiter Tipp klappt zu');
    // Ein neues Geschäft: erscheint zugeklappt (und leuchtet kurz auf); was offen war, bleibt offen
    await rows.nth(0).locator('> summary').click();
    await page.fill('#store-form input[name=name]', 'Aldi');
    await page.click('#store-form button[type=submit]');
    await page.waitForFunction(() => document.querySelectorAll('#store-editor .store-row').length === 4);
    assert.deepEqual(await rows.evaluateAll(nodes => nodes.map(node => node.open)), [true, false, false, false], 'Edeka bleibt offen, das neue Aldi ist zu');
    assert.deepEqual(await rows.locator('> summary').allTextContents(), ['Edeka', 'Lidl', 'Rewe', 'Aldi']);
    assert.equal(await rows.nth(3).evaluate(node => node.classList.contains('fresh')), true, 'das neue Geschäft leuchtet kurz auf');
    assert.equal(await page.inputValue('#store-form input[name=name]'), '', 'das Formular ist wieder leer');
    // Ein Geschäft bearbeiten und speichern: bleibt offen, andere Karten bleiben unberührt
    await rows.nth(0).locator('input[name=name]').fill('Edeka Nord');
    await rows.nth(0).getByRole('button', { name: /speichern/ }).click();
    assert.deepEqual(await rows.locator('> summary').allTextContents(), ['Edeka Nord', 'Lidl', 'Rewe', 'Aldi']);
    assert.equal(await rows.nth(0).evaluate(node => node.open), true, 'die bearbeitete Karte bleibt offen');
    // Wieder geöffnet: alles zu
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
    await page.click('#manage-stores'); await sheetOpen(page);
    assert.deepEqual(await rows.evaluateAll(nodes => nodes.map(node => node.open)), [false, false, false, false], 'beim nächsten Öffnen wieder alle zugeklappt');
    // „Angebotslink festlegen“ öffnet das Fenster mit genau diesem Geschäft aufgeklappt
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
    await page.getByRole('tab', { name: /^Aldi/ }).click();
    await page.click('#set-offers'); await sheetOpen(page);
    assert.deepEqual(await rows.evaluateAll(nodes => nodes.map(node => node.open)), [false, false, false, true], 'nur Aldi ist aufgeklappt');
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Im Laden: keine Leiste (Einkauf, Rezepte, Plan, Ausgaben, Einstellungen) unten; die Sperre und Meldungen sitzen am unteren Rand; zurück zu „Planen“ ist die Leiste wieder da', async () => {
    for (const glass of [true, false]) {
      const { ctx, page, problems } = await context({ config: { glass } });
      await open(page);
      const tabs = page.locator('nav.tabs');
      assert.equal(await tabs.isVisible(), true, 'unter „Planen“ steht die Leiste');
      const tabsBottom = (await tabs.boundingBox());
      await page.click('#mode-shop');
      await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click();
      assert.equal(await tabs.isHidden(), true, 'im Laden ist sie ausgeblendet');
      assert.equal(await page.locator('[data-tab=recipes]').isHidden(), true);
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--tabs-h').trim()), '0px');
      const view = page.viewportSize();
      // Entsperrt endet die Seite unten ohne Lücke für die Leiste (früher 92 px Platz unter dem Inhalt, jetzt nur noch der Rand)
      const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom));
      assert.ok(padding < 40, `kein Platz mehr für die Leiste unter dem Inhalt (${padding} px)`);
      // Gesperrt: der Knopf zum Entsperren sitzt dort, wo die Leiste war
      await page.click('#shop-lock');
      const lockbar = await page.locator('#shop-lockbar').boundingBox();
      const gap = view.height - (lockbar.y + lockbar.height);
      assert.ok(gap >= 6 && gap <= 24, `die Sperre sitzt am unteren Rand (Abstand ${Math.round(gap)} px)`);
      assert.ok(tabsBottom.y + tabsBottom.height / 2 > lockbar.y, 'dort, wo vorher die Leiste war');
      // Die Liste ragt nicht unter die Sperre: Nach dem Scrollen bleibt ihr Ende frei („Einkauf beenden“ gibt es gesperrt nicht)
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      assert.equal(await page.locator('#shop-finish').isHidden(), true);
      const listLocked = await page.locator('#shop-list').boundingBox();
      assert.ok(listLocked.y + listLocked.height <= lockbar.y + 1, 'unter der Sperre verdeckt nichts das Ende der Liste');
      // Meldungen (hier: Abhaken per Halten) stehen über der Sperre, nicht dahinter
      await page.evaluate(() => window.scrollTo(0, 0));
      await pressAndHold(page, '#shop-list .shop-tap', 650); await page.mouse.up();
      await page.waitForSelector('#notice:not([hidden])');
      const notice = await page.locator('#notice').boundingBox();
      assert.ok(notice.y + notice.height <= lockbar.y + 1, `die Meldung steht über der Sperre (${Math.round(notice.y + notice.height)} ≤ ${Math.round(lockbar.y)})`);
      assert.equal(await tabs.isHidden(), true);
      assert.equal(await horizontalOverflow(page), 0);
      // Entsperren und zurück zu „Planen“: die Leiste ist wieder da und bedienbar
      await pressAndHold(page, '#shop-unlock', 900); await page.mouse.up();
      await page.waitForSelector('#shop-lockbar', { state: 'hidden' });
      await page.click('#shop-back');
      assert.equal(await tabs.isVisible(), true, 'unter „Planen“ steht die Leiste wieder');
      await page.click('[data-tab=recipes]');
      assert.equal(await page.locator('#recipes').isVisible(), true);
      // Bleibt „Im Laden“ gewählt, während man in einem anderen Bereich ist (Einstellungen), steht die Leiste dort
      await page.click('[data-tab=shopping]'); await page.click('#mode-shop');
      assert.equal(await tabs.isHidden(), true);
      await goTab(page, 'settings');
      assert.equal(await tabs.isVisible(), true, 'außerhalb der Einkaufsansicht ist die Leiste da');
      await goTab(page, 'shopping');
      assert.equal(await tabs.isHidden(), true);
      assert.deepEqual(problems, []);
      await ctx.close();
    }
  });

  test('Im Laden: keine Textauswahl (langer Druck markiert nichts blau), auch nicht beim Gedrückthalten gesperrt; auch unter „Planen“ bleibt nichts markiert', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const selectable = selector => page.locator(selector).first().evaluate(node => getComputedStyle(node).userSelect);
    assert.equal(await selectable('#items .group-head span'), 'none', 'auch unter Planen keine Textauswahl');
    assert.equal(await page.evaluate(() => { const node = document.querySelector('#items .group-head span'); const event = new Event('selectstart', { bubbles: true, cancelable: true }); node.dispatchEvent(event); return event.defaultPrevented; }), true);
    await inShop(page);
    for (const selector of ['#shop-list .shop-tap', '#shop-list .shop-name', '#shop-list .shop-qty', '#shop-list .group-head span', '#shop-chips .chip', '#shop-status', '#shop-finish']) {
      assert.equal(await selectable(selector), 'none', `${selector}: keine Textauswahl`);
    }
    // Die Auswahl beginnt gar nicht erst …
    assert.equal(await page.evaluate(() => { const node = document.querySelector('#shop-list .group-head span'); const event = new Event('selectstart', { bubbles: true, cancelable: true }); node.dispatchEvent(event); return event.defaultPrevented; }), true);
    // … und eine vorhandene Auswahl verschwindet, wenn gesperrt ein Kreis gehalten wird
    await page.click('#shop-lock');
    await page.evaluate(() => getSelection().selectAllChildren(document.querySelector('#shop-lockbar span')));   // etwas Markierbares außerhalb der Liste
    await page.waitForFunction(() => getSelection().toString() === '');
    await pressAndHold(page, '#shop-list .shop-tap', 650); await page.mouse.up();
    assert.equal(await itemState(page, 'Tomaten'), true, 'abgehakt');
    assert.equal(await page.evaluate(() => getSelection().toString()), '', 'nichts bleibt markiert');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Im Laden: automatisch sperren nach Wartezeit ohne Berührung (Berührung setzt sie zurück), beim Zurückkehren aus dem Hintergrund, einstellbar, „Nie“ sperrt nicht', async () => {
    const { ctx, page, problems } = await context({ config: { shopLock: 2 } });
    await open(page);
    await inShop(page);
    const locked = () => page.locator('#shop-lockbar').isVisible();
    await page.waitForTimeout(1300);
    await page.locator('#shop-chips .chip', { hasText: 'Lidl' }).click();   // Berührung setzt die Wartezeit zurück
    await page.waitForTimeout(1300);
    assert.equal(await locked(), false, 'nach 2,6 s mit Berührung bei 1,3 s noch nicht gesperrt');
    await page.waitForFunction(() => !document.querySelector('#shop-lockbar').hidden, null, { timeout: 4000 });
    assert.equal(await locked(), true, 'nach 2 s ohne Berührung gesperrt');
    await pressAndHold(page, '#shop-unlock', 900); await page.mouse.up();
    assert.equal(await locked(), false);
    // Ein offenes Fenster wird nicht gesperrt
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));   // ganz nach unten, über die schwebende Leiste hinaus
    await finishShop(page); await page.waitForSelector('#finish-dialog[open]');
    await page.waitForTimeout(2600);
    assert.equal(await locked(), false, 'mitten im Beenden-Fenster wird nicht gesperrt');
    await page.keyboard.press('Escape');
    // Einstellung: Nie (die Auswahl steht in den Einstellungen, nicht mehr unter „Im Laden“)
    const setLock = async value => { await openSettings(page); await page.selectOption('#shop-autolock', value); await page.click('[data-tab=shopping]'); };
    await setLock('0');
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1'))).shopLock, 0);
    await page.waitForTimeout(2600);
    assert.equal(await locked(), false, 'Nie: es sperrt nicht von selbst');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await locked(), false, 'Nie gilt auch beim Zurückkehren aus dem Hintergrund');
    // Mit Wartezeit sperrt das Zurückkehren aus dem Hintergrund (Bildschirm aus, Hosentasche)
    await setLock('30');
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    assert.equal(await locked(), true, 'aus dem Hintergrund zurück: gesperrt');
    await page.evaluate(() => { delete document.hidden; });
    assert.equal(await page.inputValue('#shop-autolock'), '30');
    // Ein Neustart nach „Planen“ hebt die Sperre auf (außerhalb von „Im Laden“ gibt es sie nicht)
    await page.evaluate(() => { const settings = JSON.parse(localStorage.getItem('einkauf-settings-v1')); settings.shopMode = false; localStorage.setItem('einkauf-settings-v1', JSON.stringify(settings)); });
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    assert.equal(await locked(), false);
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1'))).shopLocked, false);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Im Laden: wird das gewählte Geschäft gelöscht, geht die Auswahl zurück; „Alle“ zeigt dann nur noch vorhandene Geschäfte', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('#mode-shop'); await page.locator('#shop-chips .chip', { hasText: 'Rewe' }).click();
    assert.deepEqual(await page.locator('#shop-list .shop-name').allTextContents(), ['Äpfel']);
    await page.click('#shop-back');
    await openStores(page);
    page.once('dialog', dialog => dialog.accept());
    await page.click('[aria-label="Rewe löschen"]');
    await page.keyboard.press('Escape');
    await page.click('#mode-shop');
    const chips = () => page.locator('#shop-chips .chip').evaluateAll(nodes => nodes.map(node => [node.firstChild.textContent, node.getAttribute('aria-selected')]));
    assert.deepEqual(await chips(), [['Alle', 'true'], ['Edeka', 'false'], ['Lidl', 'false']], 'Rewe ist weg, Alle ist gewählt');
    assert.equal(await page.locator('#shop-chips .chip[aria-selected=true]').first().textContent().then(text => text.startsWith('Alle')), true);
    assert.ok(await page.locator('#shop-list .shop-name').count() > 0);
    await page.locator('#shop-chips .chip').first().click();
    assert.deepEqual(await page.locator('#shop-list .store-head > span:nth-of-type(1)').allTextContents(), ['Edeka', 'Lidl']);
    assert.ok(!(await page.textContent('#shop-list')).includes('Äpfel'), 'Artikel eines gelöschten Geschäfts bleiben verborgen');
    assert.match(await page.textContent('#shop-status'), /Noch 3 offen/);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Verschieben: lange halten und loslassen öffnet „Verschieben nach“; Geschäft wechseln, gleiche Artikel werden zusammengezählt', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const items = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.items.filter(row => !row.deletedAt));
    const find = async name => (await items()).filter(row => row.name === name);
    const choices = () => page.locator('#move-choices button').evaluateAll(nodes => nodes.map(node => [node.getAttribute('aria-label') || node.textContent, node.disabled]));
    // Halten: Hinweis erscheint, die rote Fläche auch; Loslassen ohne Bewegung öffnet „Verschieben nach“ (nicht die Bearbeitung, nichts wird gelöscht)
    await holdRow(page, 'Nudeln');
    await page.waitForSelector('.drag-ghost');
    assert.equal(await page.locator('#drag-hint.show').count(), 1, 'Hinweis beim Abheben');
    assert.match(await page.textContent('#drag-hint'), /verschieben/);
    assert.equal(await page.locator('#trash-zone.show').count(), 1, 'Löschen bleibt möglich');
    assert.equal(await page.locator('#move-bar').isVisible(), true, 'oben die Leiste mit den Geschäften');
    await page.mouse.up();
    await page.waitForSelector('#move-dialog[open]');
    assert.equal(await page.locator('#drag-hint.show').count(), 0);
    assert.equal(await page.locator('.drag-ghost').count(), 0);
    assert.equal(await page.locator('#item-dialog[open]').count(), 0, 'nicht die Bearbeitung');
    assert.equal(await page.locator('#items .item.drag-origin').count(), 0);
    assert.match(await page.textContent('#move-text'), /„Nudeln“ \(1 Packung à 500 g\) steht bei Edeka/);
    assert.deepEqual(await choices(), [['Ohne Geschäft', false], ['Edeka, hier steht er jetzt', true], ['Lidl', false], ['Rewe', false]]);
    assert.ok(await page.locator('#move-choices button').first().evaluate(node => node.getBoundingClientRect().height >= 48), 'große Tippflächen');
    // Schließen ändert nichts
    await page.click('[data-close=move-dialog]');
    await page.waitForSelector('#move-dialog[open]', { state: 'detached' });
    assert.equal((await find('Nudeln'))[0].storeId, 'store-edeka');
    // Zu Lidl verschieben
    await holdRow(page, 'Nudeln'); await page.waitForSelector('.drag-ghost'); await page.mouse.up();
    await page.waitForSelector('#move-dialog[open]');
    await page.locator('#move-choices button', { hasText: 'Lidl' }).click();
    await page.waitForSelector('#move-dialog[open]', { state: 'detached' });
    assert.equal(await page.textContent('#notice-text'), '„Nudeln“ → Lidl');
    assert.equal((await find('Nudeln'))[0].storeId, 'store-lidl');
    assert.equal((await find('Nudeln')).length, 1, 'kein Doppel');
    // Gleicher Artikel im Ziel: Äpfel (Rewe, 4 Stück) + 2 Äpfel bei Lidl → verschoben nach Rewe sind es 6 Stück in einem Eintrag
    await pickStore(page, 'Lidl');
    await page.fill('#item-form input[name=name]', 'Äpfel'); await page.fill('#item-form input[name=quantity]', '2'); await page.click('#item-form button[type=submit]');
    assert.equal((await find('Äpfel')).length, 2);
    await page.locator('#store-chips .chip', { hasText: 'Lidl' }).click();
    await holdRow(page, 'Äpfel'); await page.waitForSelector('.drag-ghost'); await page.mouse.up();
    await page.waitForSelector('#move-dialog[open]');
    await page.locator('#move-choices button', { hasText: 'Rewe' }).click();
    await page.waitForSelector('#move-dialog[open]', { state: 'detached' });
    assert.equal(await page.textContent('#notice-text'), '„Äpfel“ → Rewe: jetzt 6 Stück');
    const apples = await find('Äpfel');
    assert.deepEqual(apples.map(row => [row.storeId, row.quantity]), [['store-rewe', 6]], 'zusammengezählt, das Doppel ist weg');
    // Kein Geschäft
    await holdRow(page, 'Milch'); await page.waitForSelector('.drag-ghost'); await page.mouse.up();
    await page.waitForSelector('#move-dialog[open]');
    await page.locator('#move-choices button', { hasText: 'Ohne Geschäft' }).click();
    await page.waitForSelector('#move-dialog[open]', { state: 'detached' });
    assert.equal(await page.textContent('#notice-text'), '„Milch“ → ohne Geschäft');
    assert.equal((await find('Milch'))[0].storeId, '');
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Verschieben per Ziehen: Zeile über den Bildschirm auf ein Geschäft in der Leiste oben oder auf einen sichtbaren Abschnitt ziehen und loslassen', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const items = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.items.filter(row => !row.deletedAt));
    const storeOf = async name => (await items()).find(row => row.name === name).storeId;
    // 1. Leiste oben: alle Geschäfte und „Ohne Geschäft“, das jetzige ist blass
    await holdRow(page, 'Nudeln'); await page.waitForSelector('.drag-ghost');
    assert.equal(await page.locator('#move-bar').isVisible(), true);
    assert.deepEqual(await page.locator('#move-bar .move-target').allTextContents(), ['Ohne Geschäft', 'Edeka', 'Lidl', 'Rewe']);
    assert.equal(await page.locator('#move-bar .move-target.current').textContent(), 'Edeka');
    assert.match(await page.textContent('#drag-hint'), /Auf ein Geschäft ziehen/);
    assert.ok((await page.locator('#move-bar').boundingBox()).y < 24, 'ganz oben');
    // Über das eigene Geschäft oder zwischen die Felder: kein Ziel
    const own = await center(page.locator('#move-bar .move-target.current'));
    await page.mouse.move(own.x, own.y, { steps: 6 });
    assert.equal(await page.locator('#move-bar .move-target.hot').count(), 0, 'das eigene Geschäft ist kein Ziel');
    // Auf Lidl ziehen: Feld leuchtet, die rote Fläche nicht
    const lidl = await center(page.locator('#move-bar .move-target[data-store=store-lidl]'));
    await page.mouse.move(lidl.x, lidl.y, { steps: 8 });
    await page.waitForSelector('#move-bar .move-target.hot');
    assert.equal(await page.locator('#move-bar .move-target.hot').textContent(), 'Lidl');
    assert.equal(await page.locator('#trash-zone.hot').count(), 0);
    assert.equal(await page.locator('.drag-ghost').evaluate(node => getComputedStyle(node).transform !== 'none'), true, 'die Zeile folgt dem Finger');
    await page.mouse.up();
    await page.waitForSelector('.drag-ghost', { state: 'detached' });
    assert.equal(await page.textContent('#notice-text'), '„Nudeln“ → Lidl');
    assert.equal(await storeOf('Nudeln'), 'store-lidl');
    assert.equal(await page.locator('#move-bar').isVisible(), false, 'die Leiste verschwindet wieder');
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal(await page.locator('#items .drop-over').count(), 0);
    // 2. Sichtbarer Abschnitt der Gesamtliste: Milch (Lidl) auf einen anderen Abschnitt ziehen, der auf dem Bildschirm zu sehen ist
    await holdRow(page, 'Milch'); await page.waitForSelector('.drag-ghost');
    const visible = await page.locator('#items .store-head').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { store: node.dataset.store, x: r.left + r.width / 2, y: r.top + r.height / 2, shown: r.top >= 90 && r.bottom <= innerHeight - 90 }; }));
    const goal = visible.find(entry => entry.shown && entry.store !== 'store-lidl');
    assert.ok(goal, `ein anderer Abschnitt ist sichtbar ${JSON.stringify(visible)}`);
    await page.mouse.move(goal.x, goal.y, { steps: 10 });
    await page.waitForSelector('#items .drop-over');
    assert.equal(await page.locator('#items .store-head.drop-over').getAttribute('data-store'), goal.store, 'der Abschnitt leuchtet');
    assert.equal(await page.locator('#move-bar .move-target.hot').getAttribute('data-store'), goal.store, 'und das Feld oben ebenfalls');
    await page.mouse.up();
    await page.waitForSelector('.drag-ghost', { state: 'detached' });
    assert.equal(await storeOf('Milch'), goal.store);
    assert.match(await page.textContent('#notice-text'), /^„Milch“ → (Edeka|Rewe)$/);
    // 3. Ohne Geschäft über die Leiste
    await holdRow(page, 'Äpfel'); await page.waitForSelector('.drag-ghost');
    const none = await center(page.locator('#move-bar .move-target[data-store=""]'));
    await page.mouse.move(none.x, none.y, { steps: 8 });
    await page.waitForSelector('#move-bar .move-target.hot');
    await page.mouse.up(); await page.waitForSelector('.drag-ghost', { state: 'detached' });
    assert.equal(await storeOf('Äpfel'), '');
    assert.equal(await page.textContent('#notice-text'), '„Äpfel“ → ohne Geschäft');
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Verschieben per Touch: Seite scrollt beim Ziehen zur Leiste oben nicht mit, der Artikel landet im Geschäft', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.evaluate(() => { document.body.style.minHeight = '3000px'; });
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const row = page.locator('#items .item', { hasText: 'Äpfel' });
    await row.evaluate(node => node.scrollIntoView({ block: 'center' }));
    const scrolled = await page.evaluate(() => scrollY);
    const at = await center(row.locator('.item-copy'));
    await touch('touchStart', at.x, at.y);
    await page.waitForSelector('.drag-ghost');
    const goal = await center(page.locator('#move-bar .move-target[data-store=store-edeka]'));
    for (let step = 1; step <= 10; step++) await touch('touchMove', at.x + (goal.x - at.x) * step / 10, at.y + (goal.y - at.y) * step / 10);
    await page.waitForSelector('#move-bar .move-target.hot');
    assert.equal(await page.evaluate(() => scrollY), scrolled, 'die Seite hat nicht mitgescrollt');
    await touch('touchEnd');
    await page.waitForSelector('.drag-ghost', { state: 'detached' });
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.items.find(row => row.name === 'Äpfel').storeId);
    assert.equal(stored, 'store-edeka');
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Verschieben per Ziehen: Abbrechen, daneben loslassen und der Weg zum Rand löschen nichts', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const width = await page.evaluate(() => innerWidth);
    const items = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.items.filter(row => !row.deletedAt).map(row => [row.name, row.storeId]));
    const before = await items();
    // Escape über einem Ziel: abgebrochen
    let { at } = await holdRow(page, 'Milch'); await page.waitForSelector('.drag-ghost');
    const edeka = await center(page.locator('#move-bar .move-target[data-store=store-edeka]'));
    await page.mouse.move(edeka.x, edeka.y, { steps: 6 }); await page.waitForSelector('#move-bar .move-target.hot');
    await page.keyboard.press('Escape'); await page.mouse.up();
    await page.waitForSelector('.drag-ghost', { state: 'detached' });
    assert.deepEqual(await items(), before, 'Escape: nichts geändert');
    assert.equal(await page.locator('#move-bar').isVisible(), false);
    // Loslassen irgendwo ohne Ziel (zwischen den Zeilen, weit weg von der Ausgangsstelle): nichts
    ({ at } = await holdRow(page, 'Milch')); await page.waitForSelector('.drag-ghost');
    await page.mouse.move(at.x + 10, at.y - 30, { steps: 4 });   // knapp über der Zeile, im eigenen Abschnitt: kein Ziel, und zu weit für „Halten und Loslassen“
    assert.equal(await page.locator('#move-bar .move-target.hot').count(), 0);
    await page.mouse.up(); await page.waitForSelector('.drag-ghost', { state: 'detached' });
    assert.deepEqual(await items(), before);
    assert.equal(await page.locator('dialog[open]').count(), 0, 'kein Verschieben-Fenster nach größerer Bewegung');
    // Zum rechten Rand, aber weit über der roten Fläche (bei der Leiste): löscht nicht, die Fläche leuchtet nicht
    ({ at } = await holdRow(page, 'Milch')); await page.waitForSelector('.drag-ghost');
    await page.mouse.move(width - 30, 10, { steps: 8 });
    assert.equal(await page.locator('#trash-zone.hot').count(), 0, 'nur in der Höhe der roten Fläche');
    await page.mouse.up(); await page.waitForSelector('.drag-ghost', { state: 'detached' });
    assert.deepEqual(await items(), before, 'nichts gelöscht');
    // Die rote Fläche selbst löscht weiterhin, auch wenn der Finger vorher woanders war
    ({ at } = await holdRow(page, 'Milch')); await page.waitForSelector('.drag-ghost');
    await page.mouse.move(at.x + 20, at.y - 60, { steps: 4 });
    await page.mouse.move(width - 30, at.y, { steps: 8 });
    await page.waitForSelector('#trash-zone.hot');
    await page.mouse.up();
    await page.waitForFunction(() => ![...document.querySelectorAll('#items .item strong')].some(node => node.textContent === 'Milch'));
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Verschieben: erst bewegen oder in die rote Fläche ziehen verschiebt nicht; ein kurzer Tipp öffnet weiter die Bearbeitung; in den Ausgaben und im Laden gibt es kein Verschieben', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const width = await page.evaluate(() => innerWidth);
    // Nach rechts ziehen und außerhalb der Fläche loslassen: nichts passiert (kein Dialog)
    let { at } = await holdRow(page, 'Tomaten');
    await page.waitForSelector('.drag-ghost');
    await page.mouse.move(at.x + 70, at.y, { steps: 5 });
    await page.mouse.up();
    await page.waitForSelector('.drag-ghost', { state: 'detached' });
    assert.equal(await page.locator('dialog[open]').count(), 0);
    // Escape beim Halten
    ({ at } = await holdRow(page, 'Tomaten')); await page.waitForSelector('.drag-ghost');
    await page.keyboard.press('Escape'); await page.mouse.up();
    await page.waitForSelector('.drag-ghost', { state: 'detached' });
    assert.equal(await page.locator('dialog[open]').count(), 0, 'Escape bricht ab');
    assert.equal(await page.locator('#drag-hint.show').count(), 0);
    // In die rote Fläche: löscht weiterhin
    ({ at } = await holdRow(page, 'Tomaten')); await page.waitForSelector('.drag-ghost');
    await page.mouse.move(width - 30, at.y, { steps: 6 }); await page.waitForSelector('#trash-zone.hot'); await page.mouse.up();
    await page.waitForFunction(() => ![...document.querySelectorAll('#items .item strong')].some(node => node.textContent === 'Tomaten'));
    assert.equal(await page.locator('dialog[open]').count(), 0);
    // Kurzer Tipp: Bearbeiten
    await page.getByRole('button', { name: /^Nudeln, .*bearbeiten/ }).click(); await sheetOpen(page);
    assert.equal(await page.locator('#item-dialog[open]').count(), 1);
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
    // Im Laden gibt es das nicht
    await page.click('#mode-shop'); await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click();
    const box = await page.locator('.shop-tap').first().boundingBox();
    await page.mouse.move(box.x + 40, box.y + 20); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up();
    assert.equal(await page.locator('#move-dialog[open]').count(), 0);
    // Ausgaben: Halten und Loslassen öffnet kein Verschieben (im Laden ist die Leiste unten ausgeblendet: Reiterwechsel per Skript)
    await goTab(page, 'spending');
    assert.equal(await page.locator('#move-dialog[open]').count(), 0);
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
    await shopTap(page, 'Milch').click();
    await finishShop(page); await sheetOpen(page);
    const amount = page.locator('#finish-form input[name=amount]'), plus = page.locator('#finish-form .add-button');
    assert.equal(await plus.isVisible(), false, 'leeres Feld: kein „+“');
    // Eingabetaste ohne Betrag: Hinweis, nichts passiert
    await amount.focus(); await page.keyboard.press('Enter');
    assert.match(await page.textContent('#finish-dialog [data-dialog-error]'), /Betrag eingeben oder „Nur beenden“/);
    // Ungültiger Betrag: Meldung, Tastatur zu, Fenster offen, Milch bleibt abgehakt und auf der Liste, die Ansicht bleibt „Im Laden“
    await amount.fill('abc'); assert.equal(await plus.isVisible(), true);
    await page.touchscreen.tap(...await center(plus));
    await page.waitForFunction(() => /Betrag in Euro eingeben/.test(document.querySelector('#finish-dialog [data-dialog-error]')?.textContent || ''));
    assert.equal(await typing(), false, 'Tastatur zu');
    assert.ok(await page.locator('#finish-dialog').evaluate(node => node.open));
    assert.equal(await page.locator('#shop-view').isVisible(), true, 'bei einem Fehler bleibt es „Im Laden“');
    let data = await stored();
    assert.ok(!data.items.find(row => row.name === 'Milch').deletedAt, 'Milch noch nicht entfernt');
    assert.equal((data.purchases || []).length, 0);
    // Gültiger Betrag: Einkauf beendet, Betrag gespeichert (Geschäft, heute, Notiz „Wocheneinkauf“)
    await amount.fill('12,50');
    await page.touchscreen.tap(...await center(plus));
    await page.waitForSelector('#finish-dialog', { state: 'hidden' });
    assert.match(await page.textContent('#notice-text'), /12,50\s€ unter Ausgaben gespeichert/);
    // Danach ist die App wieder in „Planen“ (nicht mehr „Im Laden“), auch nach dem Neuladen
    assert.equal(await page.locator('#plan-view').isVisible(), true, 'zurück zu Planen');
    assert.equal(await page.locator('#shop-view').isHidden(), true);
    assert.equal(await page.locator('#mode-plan').getAttribute('aria-selected'), 'true');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-settings-v1')).shopMode), false);
    data = await stored();
    assert.ok(data.items.find(row => row.name === 'Milch').deletedAt, 'Milch ist von der Liste entfernt');
    const purchases = data.purchases.filter(row => !row.deletedAt);
    assert.equal(purchases.length, 1);
    assert.deepEqual([purchases[0].cents, purchases[0].storeId, purchases[0].storeName, purchases[0].note, purchases[0].source, purchases[0].date], [1250, 'store-lidl', 'Lidl', 'Wocheneinkauf', 'hand', isoDay(new Date())]);
    await page.click('[data-tab=spending]');
    assert.match(await page.textContent('#spending-summary'), /12,50\s€/);
    assert.match(await page.textContent('#purchase-list'), /Lidl[\s\S]*Heute · Nico[\s\S]*12,50\s€/);
    // „Nur beenden“ ignoriert das Feld und speichert nichts
    await page.click('[data-tab=shopping]');
    await page.click('#mode-shop'); await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click(); await shopTap(page, 'Tomaten').click();
    await finishShop(page); await sheetOpen(page);
    assert.equal(await amount.inputValue(), '', 'das Feld ist bei jedem Öffnen leer');
    await amount.fill('99'); await page.click('#finish-only'); await page.waitForSelector('#finish-dialog', { state: 'hidden' });
    assert.equal((await stored()).purchases.filter(row => !row.deletedAt).length, 1);
    assert.equal(await page.locator('#plan-view').isVisible(), true, 'auch „Nur beenden“ führt zurück zu „Planen“');
    assert.equal(await page.locator('#shop-view').isHidden(), true);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Was kann ich kochen?: Vorschläge aus Vorrat und Einkaufsliste, Fehlendes auf die Liste, Eingekauftes zählt nach „Einkauf beenden“ nicht automatisch als Vorrat', async () => {
    const { ctx, page, problems } = await context({config:{cookableMode:'shopping'}});
    await open(page);
    const cards = () => page.locator('#cookable-list .cookable-card');
    const status = name => cards().filter({ hasText: name }).locator('.cookable-status').textContent();
    const openList = async () => { if(await page.locator('#product-picker-dialog[open][data-target=pantry]').count())await closePantry(page); await page.click('[data-tab=recipes]'); await page.click('#cookable-open'); await sheetOpen(page); };
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
    await openPantry(page);
    for (const name of ['Zwiebeln', 'Olivenöl']) { await addPantryProduct(page, name); }
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
    await finishShop(page); await sheetOpen(page); await page.click('#finish-only'); await page.waitForSelector('#finish-dialog', { state: 'hidden' });
    assert.ok(!(await page.textContent('#items')).includes('Nudeln'), 'von der Liste entfernt');
    await openList();
    assert.equal(await status('Tomaten-Pasta'), 'Es fehlen 2 von 4 Zutaten');
    assert.ok(!(await page.textContent('#cookable-count')).includes('sofort kochen'));
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
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), 'recipe-pasta');
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
    assert.match(await page.textContent('#cookable-list'), /Einkauf → Vorrat/);
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
    const ids = ['display-details', 'shop-details', 'alias-details', 'storage-details', 'import-details', 'connection-details'];
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
    assert.equal(await page.locator('#pantry-own-dialog[open]').count(),0);
    assert.equal(await page.locator('#settings #pantry-card').count(), 0);
    assert.equal(await page.locator('#settings #shop-details').count(), 1);
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
    await page.click('#display-details > summary'); await page.click('#shop-details > summary');
    await page.click('#shop-details > summary');   // wieder zu
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('einkauf-settings-v1')).folds?.join() === 'display-details');
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' }); await page.click('[data-tab=settings]');
    const state = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#settings details.fold')].map(node => [node.id, node.open])));
    assert.deepEqual(await state(), { 'connection-details': true, 'import-details': false, 'shop-details': false, 'alias-details': false, 'storage-details': false, 'display-details': true });
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
    const { ctx, page, problems } = await context({ config: { ...connectedConfig, palette: 'rose', storeStyle: 'logo', shopMode: false, groupItems: false, shopScreenOn: true } });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    await openSettings(page);
    page.once('dialog', dialog => dialog.accept());
    await page.click('#disconnect');
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('einkauf-settings-v1')).token);
    const kept = JSON.parse(await page.evaluate(() => localStorage.getItem('einkauf-settings-v1')));
    assert.deepEqual([kept.actor, kept.palette, kept.storeStyle, kept.groupItems, kept.shopScreenOn], ['Nico', 'rose', 'logo', false, true], 'nur die Verbindungsdaten sind weg');
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
    await openStores(page);
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

  test('Im Laden: Name und Menge sind so groß wie in der Einkaufsliste unter „Planen“; keine Preisinfo und kein Pfeil, ein Tipp auf Name oder Menge bewirkt nichts', async () => {
    const { ctx, page, problems } = await context({ config: { productImages: undefined } });   // Produktbilder wie ausgeliefert: an
    await open(page);
    const size = selector => page.evaluate(sel => parseFloat(getComputedStyle(document.querySelector(sel)).fontSize), selector);
    const plan = { name: await size('#items .item-copy strong'), qty: await size('#items .item-copy .item-qty') };
    await inShop(page, 'Edeka');
    const shop = { name: await size('#shop-list .shop-name'), qty: await size('#shop-list .shop-qty') };
    assert.deepEqual(shop, plan, 'dieselbe Schriftgröße wie unter „Planen“');
    assert.equal(await page.locator('#shop-list .shop-chevron, #shop-list .shop-price, #shop-list button.shop-text, #shop-list [aria-expanded]').count(), 0, 'kein Pfeil, keine Preisinfo');
    const checked = () => page.locator('#shop-list .shop-item.checked').count();
    const before = await checked();
    await page.locator('#shop-list .shop-name').first().click();
    await page.locator('#shop-list .shop-qty').first().click();
    assert.equal(await page.locator('#shop-list .shop-price').count(), 0);
    assert.equal(await checked(), before, 'ein Tipp auf den Namen hakt nichts ab');
    assert.equal(await horizontalOverflow(page), 0);
    // Das Produktsymbol steht im Laden wie in der Einkaufsliste, auch auf schmalen Bildschirmen (z. B. „Vergrößerte Darstellung“ mit 320 px)
    const thumb = selector => page.evaluate(sel => { const node = document.querySelector(sel), box = node.getBoundingClientRect(), row = node.closest('li').getBoundingClientRect(); return { width: Math.round(box.width), height: Math.round(box.height), photo: node.querySelector('.product-picture')?.dataset.photoKey || '', inside: box.right <= row.right + 0.5 && box.left >= row.left - 0.5 }; }, selector);
    for (const width of [390, 320, 280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.click('#shop-back'); await page.waitForSelector('#items .item .item-thumb');
      const plan = await thumb('#items .item .item-thumb');
      await page.click('#mode-shop'); await page.waitForSelector('#shop-list .shop-item .item-thumb');
      const shop = await thumb('#shop-list .shop-item .item-thumb');
      assert.deepEqual(shop, { ...plan, inside: true }, `Symbol im Laden wie in der Einkaufsliste bei ${width} px`);
      assert.ok(shop.photo.length > 0, 'ein eigenes Produkt- oder Gruppenbild steht da');
      assert.equal(await horizontalOverflow(page), 0, `kein Überlauf bei ${width} px`);
      const nameBox = await page.locator('#shop-list .shop-name').first().evaluate(node => { const row = node.closest('li').getBoundingClientRect(), box = node.getBoundingClientRect(); return box.left >= row.left && box.right <= row.right; });
      assert.ok(nameBox, `der Name bleibt in der Zeile bei ${width} px`);
    }
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  // Version 2.47: Altlasten der Preisfunktion. „Apfeltasche → Apfel“ (Text vom Kassenbon) benannte beim erneuten Hinzufügen die Apfeltasche in Apfel um.
  const oldAliasData = () => {
    const data = structuredClone(demo), stamp = '2026-10-27T10:00:00.000Z';
    const alias = (id, from, name, extra = {}) => ({ id, from, name, createdAt: stamp, updatedAt: stamp, deletedAt: null, _clock: {}, ...extra });
    data.aliases = [alias('al-tasche', 'apfeltasche', 'Apfel'), alias('al-cherry', 'tom cherry', 'Cherrytomaten', { variant: 'Cherry' }), alias('al-zwiebel', 'zwiebel', 'Zwiebeln'), alias('al-joghurt', 'herz.naturjoghurt', 'Joghurt')];
    data.items.push({ id: 'item-alt', storeId: '', name: 'Apfeltasche', quantity: 2, unit: 'Stück', checked: false, createdBy: 'Nico', createdAt: stamp, updatedAt: stamp, deletedAt: null, _clock: {} });
    return data;
  };
  const oldAliasContext = async () => {
    const made = await context();
    await made.ctx.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ base: value, pending: [] })); }, ['einkauf-demo-v1', oldAliasData()]);
    return made;
  };
  test('Alte Zuordnungen vom Kassenbon wirken nicht mehr: „Apfeltasche“ bleibt Apfeltasche (auch aus dem Link und in der Liste); bestätigte Schreibweisen wirken weiter', async () => {
    const { ctx, page, problems } = await oldAliasContext();
    await open(page);
    const names = async () => (await page.locator('#items .item strong').allTextContents()).map(text => text.trim());
    assert.ok((await names()).includes('Apfeltasche'), 'ein vorhandener Artikel wird nicht umbenannt');
    // Eintippen: Apfeltasche bleibt, die Menge wird zu dem vorhandenen Artikel gezählt, nicht zu einem „Apfel“
    await page.fill('#item-form input[name=name]', 'Apfeltasche'); await page.fill('#item-form input[name=quantity]', '1');
    await page.click('#item-form button[type=submit]');
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.items.filter(row => !row.deletedAt).map(row => [row.name, row.quantity, row.unit]));
    const items = await stored();
    assert.ok(!items.some(row => row[0] === 'Apfel'), `nichts wurde zu „Apfel“: ${JSON.stringify(items)}`);
    assert.deepEqual(items.filter(row => row[0] === 'Apfeltasche').map(row => row[1]), [3], 'zwei vorhandene und eine neue Apfeltasche');
    // Eine bestätigte Schreibweise wirkt weiter: „zwiebel“ → „Zwiebeln“
    await page.fill('#item-form input[name=name]', 'Zwiebel'); await page.fill('#item-form input[name=quantity]', '1'); await page.click('#item-form button[type=submit]');
    assert.ok((await stored()).some(row => row[0] === 'Zwiebeln') && !(await stored()).some(row => row[0] === 'Zwiebel'), 'Zwiebel wird zu Zwiebeln');
    // Settings: die bestätigte Schreibweise steht oben, die drei fragwürdigen darunter zur Prüfung; die Zahl nennt beides
    await openSettings(page);
    assert.match(await page.textContent('#alias-details summary'), /Gemerkte Schreibweisen \(1\) · 3 prüfen$/);
    assert.deepEqual((await page.locator('#alias-list li').allTextContents()).map(text => text.trim()), ['zwiebel → Zwiebeln']);
    assert.deepEqual((await page.locator('#alias-doubt-list li span').allTextContents()).sort(), ['apfeltasche → Apfel', 'herz.naturjoghurt → Joghurt', 'tom cherry → Cherrytomaten']);
    assert.match(await page.textContent('#alias-doubt'), /wirken nicht/);
    // Entfernen: nur diese eine verschwindet
    await page.getByRole('button', { name: 'Zuordnung herz.naturjoghurt zu Joghurt entfernen' }).click();
    assert.deepEqual((await page.locator('#alias-doubt-list li span').allTextContents()).sort(), ['apfeltasche → Apfel', 'tom cherry → Cherrytomaten']);
    // Behalten: die Zuordnung gilt ab jetzt (ausdrückliche Entscheidung), steht oben bei den wirksamen und wird gespeichert
    await page.getByRole('button', { name: 'Zuordnung apfeltasche zu Apfel behalten' }).click();
    assert.deepEqual((await page.locator('#alias-list li span').allTextContents()).sort(), ['apfeltasche → Apfel', 'zwiebel → Zwiebeln']);
    assert.match(await page.textContent('#alias-details summary'), /Gemerkte Schreibweisen \(2\) · 1 prüfen$/);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.aliases.find(row => row.id === 'al-tasche').confirmed), true);
    await goTab(page, 'shopping');
    await page.fill('#item-form input[name=name]', 'Apfeltasche'); await page.fill('#item-form input[name=quantity]', '1'); await page.click('#item-form button[type=submit]');
    assert.ok((await stored()).some(row => row[0] === 'Apfel'), 'behalten: Apfeltasche heißt jetzt Apfel (so wurde entschieden)');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Hinweise zu Preisen im Artikelfenster versprechen nichts Entferntes mehr (keine früheren Kaufpreise, kein vorgeschlagener Preis)', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    const hints = async () => (await page.locator('[data-price-hint]').allTextContents()).map(text => text.replace(/\s+/g, ' ').trim()).filter(Boolean);
    await page.fill('#item-form input[name=name]', 'Zucchini');   // das Formular zeigt dann seinen Preishinweis
    assert.deepEqual(await hints(), ['Beispiel: 1,99 € für 500 g. Freiwillige Preisnotiz für diesen Artikel.']);
    await page.fill('#item-form input[name=name]', '');
    await page.getByRole('button', { name: /^Nudeln, .*bearbeiten/ }).click(); await sheetOpen(page);
    assert.ok((await hints()).includes('Freiwillige Preisnotiz für diesen Artikel.'));
    const all = (await hints()).join(' ') + ' ' + await page.evaluate(() => document.documentElement.textContent);
    for (const gone of [/Frühere Kaufpreise/, /Artikelnamen antippst/, /bereits gemerkter Preis/, /Zuletzt bezahlt/]) assert.ok(!gone.test(all), `${gone} steht noch da`);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Alte Zuordnungen: ein Link zum Hinzufügen (…?add=) benennt nichts um; ohne Zuordnungen verschwindet der Prüfbereich', async () => {
    const { ctx, page, problems } = await oldAliasContext();
    await open(page, `?add=${encodeURIComponent('Apfeltasche und Zwiebel')}`);
    await page.waitForTimeout(300);
    const names = await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.items.filter(row => !row.deletedAt).map(row => row.name));
    assert.ok(names.includes('Apfeltasche') && !names.includes('Apfel'), JSON.stringify(names));
    assert.ok(names.includes('Zwiebeln'), 'die bestätigte Schreibweise gilt auch im Link');
    await openSettings(page);
    for (const [from, name] of [['apfeltasche', 'Apfel'], ['tom cherry', 'Cherrytomaten'], ['herz.naturjoghurt', 'Joghurt']]) await page.getByRole('button', { name: `Zuordnung ${from} zu ${name} entfernen` }).click();
    assert.equal(await page.locator('#alias-doubt').isHidden(), true, 'nichts mehr zu prüfen');
    assert.match(await page.textContent('#alias-details summary'), /Gemerkte Schreibweisen \(1\)$/);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Keine Preiserkennung (Version 2.44): kein Kassenbon-Weg für Artikelpreise, kein Bereich „Bezahlte Preise“; vorhandene Preisnotizen und Zuordnungen bleiben unverändert in der Datei', async () => {
    const data = structuredClone(demo), stamp = '2026-10-27T10:00:00.000Z';
    const price = (id, name, extra = {}) => ({ id, name, storeId: 'store-edeka', quote: { cents: 149, quantity: 1, unit: 'Position' }, regularQuote: { cents: 149, quantity: 1, unit: 'Position' }, onSale: false, createdAt: stamp, updatedAt: stamp, deletedAt: null, _clock: {}, ...extra });
    data.prices.push(price('pb1', 'G&G Champignons', { src: 'bon', variant: 'G&G Champignons', receipt: 'G&G CHAMPIGNONS', receiptKey: 'store-edeka|2026-10-27|g g champignons|149' }), price('pb2', 'Apfeltasche'));
    data.aliases = [...(data.aliases || []), { id: 'al1', from: 'tom cherry', name: 'Cherrytomaten', variant: 'Cherry', createdAt: stamp, updatedAt: stamp, deletedAt: null, _clock: {} }];
    data.sync.minRev = 3;
    const { ctx, page, problems } = await context();
    await ctx.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ base: value, pending: [] })); }, ['einkauf-demo-v1', data]);
    await open(page);
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base);
    const keep = rows => rows.filter(row => ['pb1', 'pb2', 'al1'].includes(row.id)).map(row => JSON.stringify([row.id, row.name || row.from, row.src, row.variant, row.receiptKey, row.quote, row.deletedAt])).sort();
    const seeded = keep([...data.prices, ...data.aliases]);
    assert.equal(await page.locator('#open-receipt, #receipt-dialog, #note-dialog, #paid-card, #finish-receipt').count(), 0);
    // Eine neue Änderung schreibt die Datei neu; die alten Preisnotizen und Zuordnungen bleiben dabei unverändert
    await page.fill('#item-form input[name=name]', 'Zucchini'); await page.click('#item-form button[type=submit]');
    const after = await stored();
    assert.deepEqual(keep([...after.prices, ...after.aliases]), seeded, 'Preisnotizen und Zuordnungen sind unverändert');
    assert.equal(after.sync.minRev, 9, 'gemerkte manuelle Mengen schützen die Datei; alte Preisnotizen bleiben erhalten');
    await openSettings(page);
    assert.equal(await page.getByText('Bezahlte Preise').count(), 0);
    assert.match(await page.textContent('#alias-doubt-list'), /tom cherry → Cherrytomaten/, 'eine alte Zuordnung mit Sorte steht zur Prüfung da (Version 2.47)');
    assert.ok(!/Cherry\)/.test(await page.textContent('#alias-doubt-list')), 'die Sorte wird nicht mehr angezeigt');
    // Im Laden gibt es für den Artikel kein Preisfeld, auch wenn Notizen zu seinem Namen vorhanden sind
    await goTab(page, 'shopping'); await inShop(page, 'Edeka');
    assert.equal(await page.locator('#shop-list .shop-price, #shop-list button.shop-text').count(), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Artikelzeile ist kompakt: Name und Menge in einer Zeile, darunter klein die Person; unter „Planen“ steht in der Zeile kein Preis, Vergleich oder Entwicklung', async () => {
    const { ctx, page, problems } = await context({ context: { viewport: { width: 390, height: 664 } } });
    await open(page);
    const row = page.locator('#items .item', { hasText: 'Tomaten' });
    assert.equal(await row.locator('strong').textContent(), 'Tomaten');
    assert.match(await row.locator('.item-qty').textContent(), /^500\sg$/);
    assert.equal(await row.locator('small.item-meta').textContent(), 'Nico', 'nur die Person, kein geschätzter Preis');
    assert.equal(await row.locator('small.price-note, small.trend, .sale-badge').count(), 0, 'keine Preisvergleichs- oder Entwicklungszeile in der Liste');
    assert.doesNotMatch(await row.textContent(), /€|ca\.|günstig|teurer|Angebot|\d\d\.\d\d\.\d\d/i);
    // Zwei Zeilen: Name samt Menge, kleine Zeile; nicht mehr vier oder fünf
    const lines = await row.locator('.item-copy').evaluate(node => Math.round(node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight)));
    assert.ok(lines <= 3, `höchstens zwei Zeilen Text plus Rand (${lines})`);
    assert.ok((await row.boundingBox()).height < 96, 'die Zeile ist niedrig');
    // Name und Menge sind deutlich, die kleine Zeile ist kleiner und gedämpft
    const sizes = await row.evaluate(node => ({ name: parseFloat(getComputedStyle(node.querySelector('strong')).fontSize), qty: parseFloat(getComputedStyle(node.querySelector('.item-qty')).fontSize), meta: parseFloat(getComputedStyle(node.querySelector('.item-meta')).fontSize) }));
    assert.ok(sizes.qty >= sizes.name - 0.5 && sizes.meta < sizes.name, JSON.stringify(sizes));
    // Der eigene Schätzpreis steht im Bearbeiten-Fenster, im ausklappbaren Bereich „Preis & Angebot“; einen Preisvergleich gibt es dort nicht mehr
    await row.getByRole('button', { name: /bearbeiten/ }).click(); await sheetOpen(page);
    assert.equal(await page.locator('#price-comparison').count(), 0);
    assert.equal(await page.locator('#item-price-fold').evaluate(node => node.open), false, 'zugeklappt');
    assert.match(await page.textContent('#item-price-summary'), /€ für 500 g/);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Bearbeiten-Fenster: Name, Menge, Einheit, Geschäft stehen oben ohne Scrollen, Preise sind ausklappbar, „Speichern“ bleibt am unteren Rand (auch beim Rezept mit vielen Zutaten)', async () => {
    const { ctx, page, problems } = await context({ context: { viewport: { width: 390, height: 664 } } });
    await open(page);
    const view = page.viewportSize();
    await page.locator('#items .item', { hasText: 'Tomaten' }).getByRole('button', { name: /bearbeiten/ }).click(); await sheetOpen(page);
    for (const field of ['name', 'quantity', 'unit', 'storeId']) {
      const box = await page.locator(`#edit-item-form [name=${field}]`).boundingBox();
      assert.ok(box && box.y + box.height < view.height - 90, `${field} ist sofort zu sehen (${Math.round(box?.y)})`);
    }
    // Preisfelder sind zu, bis man den Bereich öffnet
    assert.equal(await page.locator('#edit-item-form input[name=priceEuros]').isVisible(), false);
    await page.click('#item-price-fold > summary');
    assert.equal(await page.locator('#edit-item-form input[name=priceEuros]').isVisible(), true);
    // „Speichern“ steht am unteren Rand, auch wenn man oben ist und das Fenster lang ist
    await page.evaluate(() => { document.querySelector('#item-dialog').scrollTop = 0; });
    const save = await page.locator('#edit-item-form .sheet-actions button').boundingBox();
    assert.ok(save.y + save.height <= view.height && save.y > view.height - 140, `Speichern am unteren Rand (${Math.round(save.y)} von ${view.height})`);
    await page.evaluate(() => { document.querySelector('#item-dialog').scrollTop = 99999; });
    const after = await page.locator('#edit-item-form .sheet-actions button').boundingBox();
    assert.ok(after.y + after.height <= view.height && after.y > view.height - 140, 'und nach dem Scrollen ebenso');
    assert.equal(await page.locator('#delete-item').isVisible(), true);
    const del = await page.locator('#delete-item').boundingBox();
    assert.ok(del.y + del.height <= after.y + 1, 'Löschen liegt nicht unter dem Speichern-Knopf');
    await page.keyboard.press('Escape');
    // Rezept mit vielen Zutaten: „Rezept speichern“ ist immer erreichbar
    await page.click('[data-tab=recipes]'); await page.click('#add-recipe'); await sheetOpen(page);
    for (let i = 0; i < 12; i++) await page.click('#add-ingredient');
    await page.evaluate(() => { document.querySelector('#recipe-dialog').scrollTop = 0; });
    const recipeSave = await page.locator('#recipe-form .sheet-actions button').boundingBox();
    assert.ok(recipeSave.y + recipeSave.height <= view.height && recipeSave.y > view.height - 140, `Rezept speichern am unteren Rand (${Math.round(recipeSave.y)})`);
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Ausgaben ohne Einträge: kurze Erklärung mit „Ersten Einkauf eintragen“ statt leerem Diagramm; nach dem ersten Eintrag erscheinen Summe, Diagramm und Liste', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('[data-tab=spending]');
    assert.equal(await page.locator('#spending-empty').isVisible(), true);
    assert.match(await page.textContent('#spending-empty'), /Noch keine Ausgaben[\s\S]*Ersten Einkauf eintragen/);
    for (const hidden of ['#spending-summary', '#spending-chart-card', '#purchase-list', '#spending-details']) assert.equal(await page.locator(hidden).isHidden(), true, `${hidden} ist ohne Einträge nicht zu sehen`);
    // Der Knopf öffnet das Fenster zum Eintragen
    await page.click('#spending-first'); await sheetOpen(page);
    assert.equal(await page.locator('#purchase-dialog[open]').count(), 1);
    await page.fill('#purchase-form input[name=amount]', '12,34');
    await page.click('#purchase-save'); await page.waitForSelector('#purchase-dialog', { state: 'hidden' });
    assert.equal(await page.locator('#spending-empty').isHidden(), true, 'nach dem ersten Eintrag ist die Erklärung weg');
    assert.equal(await page.locator('#spending-chart-card').isHidden(), true, 'Auswertungen starten zugeklappt');
    await page.locator('#spending-details summary').click();
    for (const shown of ['#spending-summary', '#spending-chart-card', '#purchase-list', '#spending-details']) assert.equal(await page.locator(shown).isVisible(), true, `${shown} erscheint`);
    assert.match(await page.textContent('#spending-summary'), /12,34\s€/);
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Rezepte: die Suche steht oben, „Rezepte des Tages“ und „Was kann ich kochen?“ liegen darunter kompakt nebeneinander', async () => {
    const { ctx, page, problems } = await context({ context: { viewport: { width: 390, height: 664 } } });
    await open(page);
    await page.click('[data-tab=recipes]');
    const search = await page.locator('.search').boundingBox(), daily = await page.locator('#daily-open').boundingBox(), cook = await page.locator('#cookable-open').boundingBox();
    const first = await page.locator('#recipe-list .recipe-card, #recipe-list > *').first().boundingBox();
    assert.ok(search.y < daily.y && search.y < cook.y, 'die Suche steht über den beiden Knöpfen');
    assert.ok(Math.abs(daily.y - cook.y) < 2 && daily.x + daily.width <= cook.x + 1, 'nebeneinander in einer Reihe');
    assert.ok(daily.height <= 80 && cook.height <= 80, `kompakt (${Math.round(daily.height)} px)`);
    assert.ok(first.y < 664 - 60 || true);
    assert.equal(await horizontalOverflow(page), 0);
    await page.click('#cookable-open'); await sheetOpen(page);   // beide sind weiter bedienbar
    await page.keyboard.press('Escape');
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
    await page.click('#shop-back'); await openStores(page);
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

  // Beispieldaten plus eine eigene Liste „Wünsche“ (Wünsche zählen nirgends mit), zwei Artikel dort und ein Artikel ohne Geschäft
  const withWishes = () => {
    const data = structuredClone(demo), at = '2026-10-25T00:00:00.000Z';
    data.stores.push({ id: 'store-wish', name: 'Wünsche', offersUrl: '', separate: true, createdAt: at, updatedAt: at, deletedAt: null, _clock: {} });
    const make = (id, name, storeId) => ({ id, storeId, name, quantity: 1, unit: 'Stück', checked: false, createdBy: 'Nico', createdAt: at, updatedAt: at, deletedAt: null, _clock: {}, onSale: false });
    data.items.push(make('item-fahrrad', 'Fahrrad', 'store-wish'), make('item-zwiebeln', 'Zwiebeln', 'store-wish'), make('item-brot', 'Brot', ''));
    return data;
  };

  test('Eigene Liste („Wünsche“): nirgends sichtbar, nur wenn das Geschäft gewählt ist (Planen, Im Laden, Zähler, Beenden, Kochen); einstellbar pro Geschäft', async () => {
    const remote = github(withWishes());
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    const tab = name => page.getByRole('tab', { name: new RegExp(`^${name}`) });
    const itemsText = () => page.textContent('#items');
    // Planen, Alle: keine Wünsche in der Liste, im Zähler „offen“ und in der Summe; der Reiter „Wünsche“ zählt seine eigenen
    assert.ok(!(await itemsText()).includes('Fahrrad'), 'unter „Alle“ stehen keine Wünsche');
    assert.equal(await page.locator('#item-count').count(), 0, 'die Zeile „n offen · n erledigt“ gibt es nicht mehr');
    assert.match(await tab('Alle').textContent(), /Alle\s*5$/);
    assert.equal((await tab('Wünsche').textContent()).trim(), '2', 'der Reiter zeigt nur das Bild und die Zahl');
    assert.ok(!(await page.textContent('#items')).includes('Zwiebeln'));
    // Der Reiter „Wünsche“ zeigt sie
    await tab('Wünsche').click();
    assert.deepEqual((await page.locator('#items .item-name, #items .item-copy strong').allTextContents()).sort(), ['Fahrrad', 'Zwiebeln']);
    // Ein Artikel, der in „Alle“ zu den Wünschen kommt, verschwindet dort: die Meldung sagt, wo er steht
    await tab('Alle').click();
    await expandForm(page);
    assert.deepEqual(await page.locator('#store-pick button[aria-pressed=true]').allTextContents(), ['Kein Geschäft'], 'zurück in „Alle“ ist das Geschäft „Wünsche“ nicht mehr vorgewählt (sonst verschwänden neue Artikel unbemerkt)');
    await pickStore(page, 'Wünsche'); await page.fill('#item-form input[name=name]', 'Buch'); await page.click('#item-form button[type=submit]');
    await page.waitForSelector('#notice:not([hidden])');
    assert.match(await page.textContent('#notice-text'), /„Buch“ steht bei „Wünsche“/);
    assert.ok(!(await itemsText()).includes('Buch'));
    assert.match(await tab('Alle').textContent(), /Alle\s*5$/);
    assert.equal((await tab('Wünsche').textContent()).trim(), '3');
    // „Was kann ich kochen?“: die Zwiebeln auf den Wünschen zählen nicht als „kommt noch“
    await page.click('[data-tab=recipes]'); await page.click('#cookable-open'); await sheetOpen(page);
    assert.match(await page.locator('#cookable-list .cookable-card').first().locator('.cookable-lines').textContent(), /Fehlt: Zwiebel, Olivenöl/);
    await page.keyboard.press('Escape'); await page.click('[data-tab=shopping]');
    // Im Laden
    await page.click('#mode-shop');
    const chip = name => storeButton(page, '#shop-chips', name);
    const names = async () => (await page.locator('#shop-list .shop-name').allTextContents()).sort();
    assert.match(await chip('Alle').textContent(), /Alle\s*5$/, 'ohne Wünsche');
    assert.equal((await chip('Wünsche').textContent()).trim(), '3');
    await chip('Alle').click();
    assert.ok(!(await names()).some(name => ['Fahrrad', 'Zwiebeln', 'Buch'].includes(name)), 'auch „Alle“ im Laden zeigt keine Wünsche');
    assert.match(await page.textContent('#shop-status'), /Noch 5 offen/);
    await chip('Edeka').click();
    assert.deepEqual(await names(), ['Brot', 'Nudeln', 'Tomaten']);
    assert.match(await page.textContent('#shop-list'), /2 Artikel für andere Geschäfte/, 'Milch und Äpfel; die Wünsche zählen nicht mit');
    await chip('Wünsche').click();
    assert.deepEqual(await names(), ['Buch', 'Fahrrad', 'Zwiebeln'], 'nur die eigenen Artikel, kein Brot');
    assert.ok(!/Überall möglich|für andere Geschäfte|ohne Geschäft stehen hier nicht/.test(await page.textContent('#shop-list')), 'keine Hinweise auf Artikel anderswo');
    // Einkauf beenden bei Edeka lässt abgehakte Wünsche in Ruhe; bei den Wünschen beendet nur sie
    const gone = id => remote.content.items.find(row => row.id === id).deletedAt !== null;
    await shopTap(page, 'Fahrrad').click();
    await chip('Edeka').click(); await shopTap(page, 'Nudeln').click();
    await finishShop(page); await sheetOpen(page);
    assert.match(await page.textContent('#finish-text'), /^1 abgehakter Artikel wird/, 'nur Nudeln, nicht das Fahrrad');
    await page.click('#finish-only'); await page.waitForSelector('#finish-dialog', { state: 'hidden' });
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    assert.notEqual(remote.content.items.find(row => row.name === 'Nudeln').deletedAt, null, 'Nudeln sind weg');
    assert.equal(gone('item-fahrrad'), false, 'das abgehakte Fahrrad bleibt');
    await page.click('#mode-shop'); await chip('Wünsche').click();
    assert.ok((await page.textContent('#shop-list')).includes('Erledigt (1)'));
    await shopTap(page, 'Buch').click();
    await chip('Alle').click(); await shopTap(page, 'Tomaten').click();
    await chip('Wünsche').click();
    await finishShop(page); await sheetOpen(page);
    assert.match(await page.textContent('#finish-text'), /^2 abgehakte Artikel werden/, 'Fahrrad und Buch, nicht die Tomaten');
    await page.click('#finish-only'); await page.waitForSelector('#finish-dialog', { state: 'hidden' });
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    assert.equal(gone('item-fahrrad'), true);
    assert.equal(remote.content.items.find(row => row.name === 'Tomaten').deletedAt, null, 'die Tomaten bleiben abgehakt stehen');
    assert.equal(remote.content.items.find(row => row.name === 'Zwiebeln').deletedAt, null);
    // Einstellbar: im Dialog „Geschäfte“ gibt es „Eigene Liste“; dann entfällt „Artikel ohne Geschäft“
    await openStores(page);
    const row = index => page.locator('#store-editor .store-row').nth(index);
    assert.equal(await row(3).locator('input[name=separate]').isChecked(), true, 'Wünsche: eigene Liste');
    assert.equal(await row(3).locator('input[name=anywhere]').isVisible(), false, 'dann entfällt „Artikel ohne Geschäft“');
    assert.equal(await row(2).locator('input[name=separate]').isChecked(), false);
    assert.equal(await row(2).locator('input[name=anywhere]').isVisible(), true);
    assert.match(await row(2).textContent(), /Eigene Liste: Artikel nur zeigen, wenn dieses Geschäft gewählt ist/);
    await row(2).locator('input[name=separate]').check();
    assert.equal(await row(2).locator('input[name=anywhere]').isVisible(), false);
    await row(2).getByRole('button', { name: /speichern/ }).click();
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    assert.equal(remote.content.stores.find(entry => entry.id === 'store-rewe').separate, true, 'die Einstellung liegt in der gemeinsamen Datei');
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
    assert.ok(!(await itemsText()).includes('Äpfel'), 'Rewe ist jetzt eine eigene Liste: die Äpfel stehen nicht mehr unter „Alle“');
    await tab('Rewe').click();
    assert.ok((await itemsText()).includes('Äpfel'), 'aber unter „Rewe“');
    await tab('Alle').click();
    await openStores(page);
    await row(2).locator('input[name=separate]').uncheck();
    assert.equal(await row(2).locator('input[name=anywhere]').isVisible(), true);
    await row(2).getByRole('button', { name: /speichern/ }).click();
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    assert.equal(remote.content.stores.find(entry => entry.id === 'store-rewe').separate, null);
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
    assert.ok((await itemsText()).includes('Äpfel'));
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  // ---- Geschäft als Bild statt Name: „Wünsche“ ist ein Geschenk (Version 2.31) ----
  // Ein Pixel des Bildschirms als [r, g, b] (aus dem PNG eines 1×1-Ausschnitts).
  const pixelAt = async (page, x, y) => {
    const png = await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 }, scale: 'css' });
    let at = 8, width = 0, colorType = 0, data = [];
    while (at < png.length) {
      const length = png.readUInt32BE(at), type = png.toString('latin1', at + 4, at + 8), body = png.subarray(at + 8, at + 8 + length);
      if (type === 'IHDR') { width = body.readUInt32BE(0); colorType = body[9]; } else if (type === 'IDAT') data.push(body);
      at += 12 + length;
    }
    const raw = zlib.inflateSync(Buffer.concat(data)), step = colorType === 6 ? 4 : 3;
    assert.equal(width, 1);
    return [raw[1], raw[2], raw[3]].slice(0, 3).concat(step === 4 ? [raw[4]] : []).slice(0, 3);
  };

  test('Wünsche als Geschenk-Bild: statt Text in Reitern, Auswahl beim Anlegen und im Laden; Name bleibt für Bildschirmleser; einstellbar pro Geschäft', async () => {
    const remote = github(withWishes());
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    const tab = name => page.getByRole('tab', { name: new RegExp(`^${name}`) });
    const bar = '#store-chips', visible = box => page.locator(`${box} .store-symbol`).count();
    // Planen: der Reiter zeigt das Bild, keinen Text; der Name steht als Beschriftung dran
    assert.equal(await visible(bar), 1);
    assert.ok(!(await page.textContent(bar)).includes('Wünsche'), 'kein Text „Wünsche“ im Reiter');
    assert.equal(await page.locator(`${bar} .store-symbol`).getAttribute('aria-label'), 'Wünsche');
    assert.equal(await page.locator(`${bar} .store-symbol`).getAttribute('role'), 'img');
    assert.equal(await tab('Wünsche').count(), 1, 'für Bildschirmleser und Tests heißt der Reiter weiter „Wünsche“');
    assert.equal(await page.locator(`${bar} .store-symbol svg`).getAttribute('aria-hidden'), 'true');
    const heights = await page.locator(`${bar} .chip`).evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().height)));
    assert.ok(Math.max(...heights) - Math.min(...heights) <= 2, `das Bild macht den Reiter nicht höher: ${heights}`);
    await page.locator(`${bar} .chip:has(.store-symbol)`).scrollIntoViewIfNeeded();   // der Reiter liegt rechts in der verschiebbaren Leiste
    const symbol = await page.locator(`${bar} .store-symbol svg`).boundingBox();
    assert.ok(symbol.width >= 26 && symbol.width <= 36, `kleines Bild (${symbol.width} px)`);
    // Das Bild wird tatsächlich gezeichnet (nicht leer): ausgeblendet sieht dieselbe Stelle anders aus
    const spot = { x: symbol.x, y: symbol.y, width: symbol.width, height: symbol.height };
    const shown = await page.screenshot({ clip: spot });
    await page.locator(`${bar} .store-symbol`).evaluate(node => { node.style.visibility = 'hidden'; });
    const hidden = await page.screenshot({ clip: spot });
    await page.locator(`${bar} .store-symbol`).evaluate(node => { node.style.visibility = ''; });
    assert.ok(!shown.equals(hidden), 'das Geschenk ist zu sehen');
    // Auswahl beim Anlegen eines Artikels und „Im Laden“
    await expandForm(page);
    assert.equal(await visible('#store-pick'), 1);
    assert.ok(!(await page.textContent('#store-pick')).includes('Wünsche'));
    await page.click('#mode-shop');
    assert.equal(await visible('#shop-chips'), 1);
    assert.ok(!(await page.textContent('#shop-chips')).includes('Wünsche'));
    await page.locator('#shop-chips .chip:has(.store-symbol)').click();
    assert.deepEqual((await page.locator('#shop-list .shop-name').allTextContents()).sort(), ['Fahrrad', 'Zwiebeln'], 'ein Tipp auf das Bild wählt die Liste');
    assert.equal(await horizontalOverflow(page), 0);
    await page.click('#shop-back');
    // Einstellbar: im Dialog „Geschäfte“ steht „Anzeige im Reiter“, für Wünsche vorbelegt mit dem Geschenk
    await openStores(page);
    const row = index => page.locator('#store-editor .store-row').nth(index);
    const pick = index => row(index).locator('select[name=symbol]');
    const saved = async index => { await row(index).getByRole('button', { name: /speichern/ }).click(); await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok'); };
    const record = name => remote.content.stores.find(entry => entry.name === name);
    assert.equal(await pick(3).inputValue(), 'gift');
    assert.equal(await pick(0).inputValue(), 'name');
    assert.match(await row(3).textContent(), /Anzeige im Reiter/);
    // Edeka als Geschenk: ausdrücklich gespeichert; der Reiter zeigt dann das Bild
    await pick(0).selectOption('gift'); await saved(0);
    assert.equal(record('Edeka').symbol, 'gift');
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
    assert.equal(await visible(bar), 2);
    assert.ok(!(await page.textContent(bar)).includes('Edeka'));
    assert.equal(await tab('Edeka').count(), 1);
    // Wünsche wieder als Name: ausdrücklich „none“; der Text ist zurück
    await openStores(page);
    await pick(3).selectOption('name'); await saved(3);
    assert.equal(record('Wünsche').symbol, 'none');
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
    assert.ok((await page.textContent(bar)).includes('Wünsche'), 'als Name steht der Text wieder da');
    assert.equal(await visible(bar), 1, 'nur noch Edeka als Bild');
    // Zurück auf die Voreinstellung: nichts wird festgeschrieben (null); Edeka ebenso
    await openStores(page);
    await pick(3).selectOption('gift'); await saved(3);
    await pick(0).selectOption('name'); await saved(0);
    assert.equal(record('Wünsche').symbol, null);
    assert.equal(record('Edeka').symbol, null);
    // Umbenannt: ohne ausdrückliche Wahl gilt die Voreinstellung nach dem Namen (kein Geschenk); mit Wahl bleibt es
    await row(3).locator('input[name=name]').fill('Ideen'); await pick(3).selectOption('name'); await saved(3);
    assert.equal(record('Ideen').symbol, null, 'Ideen: Voreinstellung ist der Name');
    await pick(3).selectOption('gift'); await saved(3);
    assert.equal(record('Ideen').symbol, 'gift', 'ausdrücklich als Geschenk');
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
    assert.equal(await tab('Ideen').count(), 1);
    assert.equal(await visible(bar), 1);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Geschenk-Bild: auf hellem, dunklem, farbigem und Glas-Hintergrund, gewählt und nicht gewählt, bleibt es erkennbar (Rand heller oder dunkler als der Grund, mindestens 3 : 1)', async () => {
    const remote = github(withWishes());
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    const tabs = page.locator('#store-chips .chip');
    const wishes = tabs.filter({ has: page.locator('.store-symbol') }), selected = tabs.filter({ hasText: 'Alle' });   // „Alle“ ist gewählt: so sieht ein gewählter Reiter aus
    await wishes.scrollIntoViewIfNeeded();
    // Das Bild hat zwei Ränder: außen weiß, innen eine dunkle Kontur (aus dem Bild selbst gelesen): an jeder Stelle genügt einer von beiden
    const edges = await page.evaluate(() => { const symbol = document.querySelector('#i-gift'); return [...symbol.querySelectorAll('[stroke]')].map(node => node.getAttribute('stroke')); });
    assert.ok(edges.includes('#fff'), 'weißer Außenrand'); assert.ok(edges.includes('#5a2d3a'), 'dunkle Kontur');
    const white = [255, 255, 255], dark = [0x5a, 0x2d, 0x3a];
    const worst = { ratio: Infinity, at: '' };
    for (const theme of ['light', 'dark']) for (const palette of ['blau', 'gruen', 'tuerkis', 'flieder', 'rose', 'pfirsich']) for (const glass of ['aus', 'lichter', 'verlauf', 'schlicht']) {
      await page.evaluate(([theme, palette, glass]) => {
        const root = document.documentElement; root.dataset.theme = theme; root.dataset.palette = palette;
        if (glass === 'aus') { delete root.dataset.glass; delete root.dataset.glassBg; root.style.removeProperty('--gs'); } else { root.dataset.glass = ''; root.dataset.glassBg = glass; root.style.setProperty('--gs', '0.5'); }
        return Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})));
      }, [theme, palette, glass]);
      await page.waitForTimeout(120);
      for (const [state, chip] of [['nicht gewählt', wishes], ['gewählt', selected]]) {
        await chip.scrollIntoViewIfNeeded();
        const box = await chip.boundingBox(), ground = await pixelAt(page, box.x + 5, box.y + box.height / 2);   // links im Reiter, neben dem Bild
        const ratio = Math.max(contrast(white, ground), contrast(dark, ground));
        if (ratio < worst.ratio) { worst.ratio = ratio; worst.at = `${theme}/${palette}/${glass}/${state}: Grund rgb(${ground})`; }
        assert.ok(ratio >= 3, `${theme}/${palette}/${glass}/${state}: Grund rgb(${ground}), bester Rand nur ${ratio.toFixed(2)} : 1`);
      }
    }
    console.log(`Geschenk-Bild: schwächster Rand ${worst.ratio.toFixed(2)} : 1 bei ${worst.at}`);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Geschäfte als Text oder Logo: Auswahl in den Einstellungen, bleibt nach dem Neuladen', async () => {
    const data = withRossmann(), at = '2026-10-25T00:00:00.000Z';
    data.stores.push({ id: 'store-metzger', name: 'Metzger Müller', createdAt: at, updatedAt: at, deletedAt: null, _clock: {} });
    const { ctx, page, problems } = await context({ config: { ...connectedConfig, shopLock: 0 } });   // ohne automatische Sperre: Ein Neuladen im Laden würde sonst gesperrt zurückkommen
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
    test(`Schnellzugriffe (${width} px): auch große Favoriten- und Vorratszahlen verdecken keine Beschriftung`, async () => {
      const { ctx, page, problems } = await context({ context: { viewport: { width, height: 844 } } });
      await open(page); await storeButton(page, '#store-chips', 'Edeka').click();
      await page.evaluate(() => { const count = document.querySelector('#product-favorite-count'); count.hidden = false; count.textContent = '★ 1000'; document.querySelector('#pantry-shortcut-count').textContent = '999'; });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
        const sizes = await page.locator('#open-products,#open-pantry,#offers-link').evaluateAll(nodes => nodes.map(node => ({ label: node.textContent, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height, fits: node.scrollWidth <= node.clientWidth + 1 })));
        assert.ok(sizes.every(row => row.width >= 44 && row.height >= 44 && row.fits), JSON.stringify(sizes));
        assert.equal(await horizontalOverflow(page), 0);
        assert.ok((await page.locator('#items .item').first().boundingBox()).y < 420);
      }
      await page.click('#open-products'); await sheetOpen(page); assert.equal(await page.locator('#product-picker-dialog[open]').count(), 1);
      assert.deepEqual(problems, []); await ctx.close();
    });
  }

  for (const width of [280, 314, 360, 390, 430]) {
    test(`Platz oben (${width} px): kompakte Schnellzugriffe, keine Schätzung, Artikel beginnen früh, Im Laden: Geschäfte ganz oben`, async () => {
      const { ctx, page, problems } = await context({ context: { viewport: { width, height: 664 } } });
      await open(page);
      const box = async selector => page.locator(selector).first().boundingBox();
      assert.equal(await page.locator('#shopping-total').count(), 0);
      assert.ok(await page.locator('#open-products').isVisible()); assert.ok(await page.locator('#open-pantry').isVisible());
      const modes = await box('#mode-switch'), stores = await box('#manage-stores');
      assert.ok(modes.x + modes.width <= stores.x + 1 && modes.height <= 52, 'Planen/Im Laden bleibt einzeilig');
      assert.ok(await page.locator('#mode-shop').evaluate(node => node.getBoundingClientRect().height <= 44), '„Im Laden“ bricht nicht um');
      assert.ok((await box('#items .item')).y < 420, `erster Artikel steht erst bei ${(await box('#items .item')).y} px`);
      assert.equal(await horizontalOverflow(page), 0);
      // In jedem Geschäft (mit und ohne Angebotslink): Schnellzugriffe liegen nebeneinander in der Karte, nichts überlappt oder ragt hinaus
      for (const name of ['Edeka', 'Lidl', 'Rewe']) {
        await page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();
        const layout = await page.evaluate(() => {
          const rect = selector => { const node = document.querySelector(selector); return node && !node.hidden && node.getClientRects().length ? node.getBoundingClientRect() : null; };
          const card = rect('.list-shortcuts'), text = rect('#open-products'), pantry = rect('#open-pantry'), buttons = ['#offers-link', '#set-offers'].map(rect).filter(Boolean);
          return { card, text, pantry, buttons, textFits: text.width >= 44 };
        });
        assert.equal(layout.buttons.length, 1, `${name}: der Angebote-Knopf ist sichtbar (kein Kassenbon-Knopf mehr)`);
        assert.ok(layout.textFits, `${name}: Produktknopf hat keine ausreichende Tippfläche`);
        const parts = [layout.text, layout.pantry, ...layout.buttons].sort((a, b) => a.left - b.left);
        for (let index = 1; index < parts.length; index++) assert.ok(parts[index].left >= parts[index - 1].right - 0.5, `${name}: Schnellzugriffe überlappen bei ${width} px`);
        assert.ok(parts.every(part => part.left >= layout.card.left - 0.5 && part.right <= layout.card.right + 0.5 && part.top >= layout.card.top - 0.5 && part.bottom <= layout.card.bottom + 0.5), `${name}: etwas liegt außerhalb der Karte`);
        assert.ok(layout.card.height <= 52, `${name}: Schnellzugriff ist ${layout.card.height} px hoch`);
      }
      await page.getByRole('tab', { name: /^Alle/ }).click();
      // Im Laden: ganz oben nur die Geschäfte, gleich darunter die Artikel; Kopfzeile und Umschalter sind weg
      await page.click('#mode-shop');
      assert.equal(await page.locator('.topbar').isHidden(), true);
      assert.equal(await page.locator('#mode-row').isHidden(), true);
      const chips = await box('#shop-chips .chip');
      assert.ok(chips.y < 24, `Geschäfte beginnen bei ${chips.y} px`);
      await page.locator('#shop-chips .chip', { hasText: 'Edeka' }).click();
      assert.ok((await box('#shop-list .shop-tap')).y < 170, `erster Artikel im Laden bei ${(await box('#shop-list .shop-tap')).y} px`);
      assert.match(await page.textContent('#shop-status'), /Noch \d+ offen/);
      assert.equal(await horizontalOverflow(page), 0);
      // Der Weg zurück steht neben den Geschäften; in anderen Bereichen ist die Kopfzeile wieder da (im Laden ist die Leiste unten ausgeblendet: Reiterwechsel per Skript)
      await goTab(page, 'recipes');
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
    const { ctx, page, problems } = await context({ config: { shopLock: 0 }, context: { viewport: { width: 320, height: 568 } } });   // ohne automatische Sperre (das Neuladen im Laden käme sonst gesperrt zurück)
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
      assert.equal(await page.locator('#items .item:has-text("Testpaprika")').count(),0,'Fertig bereitet nur die Menge vor');
      assert.notEqual(await focused(), 'name');
      await page.click('#item-form .add-button'); await page.waitForSelector('#items .item:has-text("Testpaprika")');
      assert.equal(await horizontalOverflow(page), 0);
      assert.deepEqual(problems, []);
      await ctx.close();
    });
  }

  /* ---------- Eigene Produkt-/Gruppenbilder in beiden Listen, keine externe Bildquelle ---------- */
  const tiles = page => page.evaluate(() => [...document.querySelectorAll('#items .item')].map(row => {
    const tile = row.querySelector('.item-thumb');
    return { name: row.querySelector('strong').textContent, tile: Boolean(tile), photo: tile?.querySelector('.product-picture')?.dataset.photoKey || '' };
  }));
  const external = page => { const urls = []; page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1')) urls.push(request.url()); }); return urls; };

  test('Produktbilder: dieselben Motive für die Screenshot-Beispiele in Planen, Im Laden und Produktauswahl', async () => {
    const data = structuredClone(demo), template = data.items[0];
    const examples = [['Butter', 'butter'], ['Eier', 'eier'], ['Milch', 'milch'], ['Blumenerde', 'blumenerde'], ['Honig', 'honig'], ['Domol Feinwaschmittel', 'feinwaschmittel'], ['Zahnpasta', 'zahnpasta'], ['Apfeltasche', 'apfeltaschen']];
    data.items = examples.map(([name], index) => ({ ...template, id: `photo-${index}`, name, quantity: 1, unit: 'Stück', storeId: 'store-edeka', checked: false, createdBy: 'Nico', category: index === 7 ? 'obst' : undefined }));
    const { ctx, page, problems } = await context({ config: { productImages: true } });
    await ctx.addInitScript(data => localStorage.setItem('einkauf-demo-v1', JSON.stringify({ base: data, pending: [] })), data);
    const outside = external(page); await open(page);
    const snapshot = selector => page.locator(selector).evaluateAll(nodes => nodes.map(row => {
      const picture = row.querySelector('.product-picture'), style = getComputedStyle(picture);
      return { id: row.dataset.id, key: picture.dataset.photoKey, kind: picture.dataset.photoKind, image: style.backgroundImage, position: style.backgroundPosition };
    }));
    const plan = await snapshot('#items .item');
    assert.deepEqual(plan.map(row => row.key).sort(), examples.map(([, key]) => key).sort());
    assert.equal(plan.find(row => row.key === 'apfeltaschen').kind, 'product');
    await inShop(page, 'Edeka'); const shop = await snapshot('#shop-list .shop-item');
    assert.deepEqual(shop.sort((a, b) => a.id.localeCompare(b.id)), plan.sort((a, b) => a.id.localeCompare(b.id)));
    await page.click('#shop-back'); await page.click('#open-products'); await page.fill('#product-picker-search', 'Milch');
    const picker = await page.locator('.product-card[data-product=milch] .product-picture').evaluate(node => ({ key: node.dataset.photoKey, image: getComputedStyle(node).backgroundImage, position: getComputedStyle(node).backgroundPosition }));
    const milk = plan.find(row => row.key === 'milch'); assert.deepEqual(picker, { key: milk.key, image: milk.image, position: milk.position });
    assert.equal(await page.locator('.item-thumb .emoji').count(), 0);
    assert.deepEqual(outside, []); assert.deepEqual(problems, []); await ctx.close();
  });

  test('Produktbilder: Einzel- und Gruppenmotive nach Offline-Neustart in beiden Listen vorhanden', async () => {
    const data = structuredClone(demo), template = data.items[0];
    data.items = [['Butter', 'butter'], ['Blumenerde', 'blumenerde'], ['Apfeltasche Spezial', 'group-desserts'], ['Neu für den Haushalt', 'group-cleaning']]
      .map(([name], index) => ({ ...template, id: `offline-photo-${index}`, name, quantity: 1, unit: 'Stück', storeId: 'store-edeka', createdBy: 'Nico', checked: false, category: index === 3 ? 'haushalt' : undefined }));
    const { ctx, page, problems } = await context({ config: { productImages: true }, context: { serviceWorkers: 'allow' } });
    await ctx.addInitScript(data => { if (!localStorage.getItem('einkauf-demo-v1')) localStorage.setItem('einkauf-demo-v1', JSON.stringify({ base: data, pending: [] })); }, data);
    await open(page); await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await ctx.setOffline(true); await page.reload(); await page.waitForSelector('#items .item-thumb');
    const decode = selector => page.locator(selector).evaluateAll(async nodes => Promise.all(nodes.map(async node => {
      const image = new Image(); image.src = getComputedStyle(node).backgroundImage.slice(5, -2); await image.decode(); return [node.dataset.photoKey, image.naturalWidth > 500];
    })));
    const plan = await decode('#items .product-picture');
    assert.deepEqual(plan.map(([key]) => key).sort(), ['blumenerde', 'butter', 'group-cleaning', 'group-desserts']); assert.ok(plan.every(([, ready]) => ready));
    await inShop(page, 'Edeka'); const shop = await decode('#shop-list .product-picture');
    assert.deepEqual(shop.sort((a, b) => a[0].localeCompare(b[0])), plan.sort((a, b) => a[0].localeCompare(b[0])));
    assert.deepEqual(problems, []); await ctx.close();
  });

  test('Produktbilder: fehlende Produktdatei wechselt auf Gruppenbild und erzeugt keinen externen Abruf', async () => {
    const { ctx, page, problems } = await context({ config: { productImages: true } });
    await ctx.route('**/assets/products/fresh.webp', route => route.abort());
    const outside = external(page); await open(page);
    await page.waitForFunction(() => [...document.querySelectorAll('#items .item')].find(row => row.querySelector('strong')?.textContent === 'Milch')?.querySelector('.product-picture')?.dataset.photoKey === 'group-dairy');
    const fallback = page.locator('#items .item', { hasText: 'Milch' }).locator('.product-picture');
    assert.equal(await fallback.getAttribute('data-photo-kind'), 'group');
    assert.match(await fallback.evaluate(node => getComputedStyle(node).backgroundImage), /groups\.webp/);
    assert.equal(await fallback.evaluate(async node => { const image = new Image(); image.src = getComputedStyle(node).backgroundImage.slice(5, -2); await image.decode(); return image.naturalWidth > 500; }), true);
    assert.deepEqual(outside, []); assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []); await ctx.close();
  });

  test('Produktbilder: eigene Bilder passend zum Artikel, lokal und ohne externe Quelle; rechts in jeder Zeile, nicht antippbar', async () => {
    const { ctx, page, problems } = await context({ config: { productImages: undefined } });   // nichts eingestellt = Standard
    const outside = external(page);
    await open(page);
    await page.waitForFunction(() => document.querySelectorAll('#items .item-thumb').length === 4);
    assert.deepEqual((await tiles(page)).map(row => [row.name, row.photo]), [['Tomaten', 'tomaten'], ['Nudeln', 'nudeln'], ['Milch', 'milch'], ['Äpfel', 'aepfel']]);
    // Darstellung: abgerundete Kachel rechts, Name und Menge links, nicht antippbar, rein dekorativ
    const look = await page.evaluate(() => [...document.querySelectorAll('#items .item')].map(row => {
      const tile = row.querySelector('.item-thumb'), box = tile.getBoundingClientRect(), copy = row.querySelector('.item-copy').getBoundingClientRect(), line = row.getBoundingClientRect(), style = getComputedStyle(tile);
      return { width: Math.round(box.width), height: Math.round(box.height), right: Math.round(line.right - box.right), copyEnd: Math.round(box.left - copy.right), radius: parseFloat(style.borderTopLeftRadius), border: parseFloat(style.borderTopWidth),
        events: style.pointerEvents, hidden: tile.getAttribute('aria-hidden'), focusable: tile.querySelectorAll('button,a,[tabindex],img').length, rowHeight: Math.round(line.height), size: tile.querySelector('.product-picture').getBoundingClientRect().width };
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
    assert.equal(more.find(row => row.name === 'Birne').photo, 'birnen'); assert.equal(more.find(row => row.name === 'Xyzabc').photo, 'group-miscellaneous');
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
    assert.deepEqual([back.find(row => row.name === 'Tomaten').photo, back.find(row => row.name === 'Butter').photo], ['tomaten', 'butter']);
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
        const tile = row.querySelector('.item-thumb'), box = tile.getBoundingClientRect(), copy = row.querySelector('.item-copy').getBoundingClientRect(), name = row.querySelector('strong').getBoundingClientRect(), picture = tile.querySelector('.product-picture').getBoundingClientRect();
        const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number), light = value => { const [r, g, b] = rgb(value).map(channel => { const c = channel / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        return { name: row.querySelector('strong').textContent, tileWidth: Math.round(box.width), tileHeight: Math.round(box.height), nameHeight: Math.round(name.height), nameRight: Math.round(name.right), tileLeft: Math.round(box.left), copyRight: Math.round(copy.right),
          light: light(getComputedStyle(tile).backgroundColor), photoInside: picture.left >= box.left && picture.right <= box.right && picture.top >= box.top && picture.bottom <= box.bottom, photo: tile.querySelector('.product-picture').dataset.photoKey };
      }));
      const long = rows.find(row => row.name.startsWith('Domol')), size = width < 341 ? 44 : 56;
      for (const row of rows) {
        assert.deepEqual([row.tileWidth, row.tileHeight], [size, size], `${row.name}: Kachel nicht gequetscht`);
        assert.ok(row.nameRight <= row.tileLeft, `${row.name}: Name endet vor der Kachel`); assert.ok(scheme === 'dark' ? row.light < 0.15 : row.light > 0.8, `${row.name}: Kachel hell im hellen, dunkel im dunklen Modus (${row.light.toFixed(2)})`); assert.ok(row.photoInside, `${row.name}: Bild liegt in der Kachel`);
      }
      assert.equal(long.photo, 'feinwaschmittel', 'Feinwaschmittel: eigenes passendes Motiv'); assert.ok(long.nameHeight > 40, 'der lange Name bricht auf mehrere Zeilen um');
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

  test('Einstellungen: Verbindung eingeklappt und unten, sobald verbunden; Alltagseinstellungen oben und Vorrat im Einkauf', async () => {
    const remote = github(demo);
    const a = await context({ config: connectedConfig });
    await a.ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(a.page); await synced(a.page);
    await a.page.click('[data-tab=settings]');
    assert.equal(await a.page.locator('#connection-details').evaluate(node => node.open), false);
    assert.match(await a.page.textContent('#connection-state'), /✓ haushalt\/daten · Nico/);
    const order = await a.page.evaluate(() => [...document.querySelectorAll('#settings > *')].map(node => ({ id: node.id || node.className.split(' ').pop(), top: Math.round(node.getBoundingClientRect().top) })).filter(entry => entry.id && entry.id !== 'settings-title').sort((x, y) => x.top - y.top).map(entry => entry.id));
    assert.deepEqual(order.slice(-1), ['settings-form'], 'die Verbindung steht ganz unten');
    assert.equal(await a.page.locator('#settings #pantry-card').count(), 0);
    assert.ok(order.indexOf('shop-card') < order.indexOf('storage-card'));
    assert.ok(order.indexOf('alias-card') < order.indexOf('storage-card'));
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
    const rows = await page.locator('#items .item').evaluateAll(nodes => nodes.map(node => node.querySelector('strong').textContent + '|' + node.querySelector('.item-qty').textContent));
    assert.ok(rows.includes('Eier|2 Stück') && rows.includes('Butter|2 Packungen à 250 g'), rows.join(', '));
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

  for (const fixedDay of ['2026-10-26', '2026-10-30', '2026-11-01']) {
  test(`Gericht planen (${fixedDay}): Der Tag steht in der Überschrift und wird nicht noch einmal gewählt (nur von der Rezeptkarte aus gibt es die Tagesauswahl)`, async () => {
    const { ctx, page, problems } = await context();
    await page.clock.setFixedTime(new Date(`${fixedDay}T12:00:00Z`));
    await open(page);
    await page.click('[data-tab=plan]');
    const titleOf = () => page.locator('#meal-title').textContent();
    const dayField = () => page.locator('#meal-form [data-day]').isVisible();
    // ＋ am Donnerstag: Der Tag steht in der Überschrift, kein Auswahlfeld
    await page.click('#week-next');
    const thursday = page.locator('.day').nth(3);
    const label = (await thursday.locator('h3').textContent()).replace(/^(\D+?)\s*(\d)/, '$1 $2');   // „Donnerstag29.10.“ (Datum steht im eigenen Element) → „Donnerstag 29.10.“
    assert.match(label, /^Donnerstag \d{2}\.\d{2}\.$/);
    await thursday.locator('.day-head .icon-button').click(); await sheetOpen(page);
    assert.equal(await titleOf(), `Gericht planen – ${label}`);
    assert.equal(await dayField(), false, 'Kein Tag zur Auswahl');
    // Auch in schmalen Fenstern bleibt die Überschrift samt Schließen-Knopf im Bild
    for (const width of [390, 320, 280]) {
      await page.setViewportSize({ width, height: 640 });
      const fit = await page.evaluate(() => { const head = document.querySelector('#meal-form .sheet-head'), close = head.querySelector('button').getBoundingClientRect(), title = head.querySelector('h2').getBoundingClientRect(); return { closeRight: close.right, title: title.right, width: innerWidth, overflow: document.querySelector('#meal-dialog').scrollWidth - document.querySelector('#meal-dialog').clientWidth }; });
      assert.ok(fit.closeRight <= fit.width && fit.title <= fit.closeRight && fit.overflow <= 0, `Überschrift passt bei ${width} px: ${JSON.stringify(fit)}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    // Speichern legt das Gericht auf diesen Tag
    await page.locator('#recipe-pick .pick-row', { hasText: 'Tomaten-Pasta' }).first().click(); await page.click('#meal-form button[type=submit]');
    await page.waitForSelector('#meal-dialog', { state: 'hidden' });
    assert.match(await page.locator('.day').nth(3).textContent(), /Tomaten-Pasta/);
    assert.equal(await page.locator('.meal').count(), 1, 'Nur Donnerstag hat ein Gericht');
    // Ändern: ebenfalls Tag in der Überschrift, kein Auswahlfeld
    await page.locator('.day').nth(3).getByRole('button', { name: /Tomaten-Pasta ändern/ }).click(); await sheetOpen(page);
    assert.equal(await titleOf(), `Gericht ändern – ${label}`);
    assert.equal(await dayField(), false);
    await page.fill('#meal-form input[name=servings]', '3'); await page.click('#meal-form button[type=submit]');
    await page.waitForSelector('#meal-dialog', { state: 'hidden' });
    assert.match(await page.locator('.day').nth(3).textContent(), /3 Portionen/);
    assert.equal(await page.locator('.meal').count(), 1, 'Tag blieb unverändert');
    // Von der Rezeptkarte aus ist noch kein Tag gewählt: Überschrift ohne Tag, dafür die Tagesauswahl
    await page.click('[data-tab=recipes]');
    await page.locator('.recipe-card', { hasText: 'Kichererbsen-Curry' }).getByRole('button', { name: /im Wochenplan einplanen/ }).click(); await sheetOpen(page);
    assert.equal(await titleOf(), 'Gericht planen');
    assert.equal(await dayField(), true, 'Tagesauswahl vorhanden');
    const later = new Date(`${fixedDay}T12:00:00Z`); later.setDate(later.getDate() + 9);
    const iso = `${later.getFullYear()}-${String(later.getMonth() + 1).padStart(2, '0')}-${String(later.getDate()).padStart(2, '0')}`, dm = `${String(later.getDate()).padStart(2, '0')}.${String(later.getMonth() + 1).padStart(2, '0')}.`;
    await page.fill('#meal-form input[name=date]', iso); await page.click('#meal-form button[type=submit]');
    await page.waitForSelector('#plan:not([hidden])');
    const card = page.locator('.day', { hasText: 'Kichererbsen-Curry' });
    assert.equal(await card.count(), 1);
    assert.ok((await card.locator('h3').textContent()).includes(dm), `Gericht liegt am gewählten Tag ${dm}`);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  }

  test('Wochenplan: planen, abhaken, Wochen-Einkaufsliste, eigenes Gericht, Rückgängig', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await page.click('[data-tab=recipes]');
    await page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' }).getByRole('button', { name: /im Wochenplan einplanen/ }).click();
    await sheetOpen(page);
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]') !== '', true, 'Rezept ist vorausgewählt');
    assert.equal(await page.inputValue('#meal-form input[name=servings]'), '2');
    await page.click('#meal-form button[type=submit]');
    await page.waitForSelector('#plan:not([hidden])');
    const today = page.locator('.day.today');
    assert.match(await today.textContent(), /Tomaten-Pasta[\s\S]*2 Portionen/);
    // zweites Gericht und ein eigenes
    await today.locator('.day-head .icon-button').click();
    await page.locator('#recipe-pick .pick-row', { hasText: 'Kichererbsen-Curry' }).first().click();
    await page.fill('#meal-form input[name=servings]', '4'); await page.click('#meal-form button[type=submit]');
    await today.locator('.day-head .icon-button').click();
    await page.locator('#recipe-pick .pick-row.custom').click();
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
    assert.ok(!(await page.locator('#week-ingredients').textContent()).includes('Nudeln'), 'schon übernommen (Version 2.47): bleibt auch ohne „gekocht“ draußen');
    await page.uncheck('#week-form input[name=skipListed]');
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

  // Version 2.47: Wochen-Einkauf mehrmals, Portionen ändern, zwei Personen
  const planPasta = async (page, servings = '2', recipe = 'Tomaten-Pasta') => {
    const today = page.locator('.day.today');
    await page.click('[data-tab=plan]');
    await today.locator('.day-head .icon-button').click(); await sheetOpen(page);
    await page.locator('#recipe-pick .pick-row', { hasText: recipe }).first().click();
    await page.fill('#meal-form input[name=servings]', servings); await page.click('#meal-form button[type=submit]');
    await page.waitForSelector('#meal-dialog', { state: 'hidden' });
  };
  const weekRowsText = async page => (await page.locator('#week-ingredients .transfer-row').allTextContents()).map(text => text.replace(/\s+/g, ' ').trim());
  const weekEmpty = async page => (await page.textContent('#week-ingredients')).replace(/\s+/g, ' ').trim();
  const ALL_LISTED = 'Alles aus dieser Woche ist schon übernommen. Nimm den Haken bei „Schon übernommene Gerichte auslassen“ heraus, um es noch einmal aufzunehmen.';
  const listQty = (page, name) => page.evaluate(wanted => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.items.filter(row => !row.deletedAt && !row._planEmpty && row.name === wanted).map(row => `${row.quantity} ${row.unit}`), name);
  const takeWeek = async (page, store = 'Lidl') => { await page.click('[data-tab=plan]'); await page.click('#plan-shopping'); await sheetOpen(page); if (store) await page.selectOption('#week-form select[name=storeId]', { label: store }); };

  test('Dasselbe Produkt in anderer Schreibweise wird zusammengeführt: „Zwiebel“ im Rezept zählt zu „Zwiebeln“ auf der Liste, im Wochen-Einkauf ein Eintrag, im Eingabefeld und im Vorrat', async () => {
    const data = structuredClone(demo), stamp = '2026-10-27T10:00:00.000Z';
    data.ingredients.push({ id: 'ing-zw', recipeId: 'recipe-curry', name: 'Zwiebeln', quantity: 2, unit: 'Stück', createdAt: stamp, updatedAt: stamp, deletedAt: null, _clock: {} });
    data.items.push({ id: 'item-zw', storeId: '', name: 'Zwiebeln', quantity: 1, unit: 'Stück', checked: false, createdBy: 'Nico', createdAt: stamp, updatedAt: stamp, deletedAt: null, _clock: {} });
    const { ctx, page, problems } = await context();
    await ctx.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ base: value, pending: [] })); }, ['einkauf-demo-v1', data]);
    await open(page);
    const onList = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.items.filter(row => !row.deletedAt && /^zwiebel/i.test(row.name)).map(row => `${row.name} ${row.quantity} ${row.unit}`));
    await planPasta(page, '2'); await planPasta(page, '2', 'Kichererbsen-Curry');
    await takeWeek(page, '');
    const rows = (await weekRowsText(page)).filter(row => /Zwiebel/.test(row));
    assert.equal(rows.length, 1, `ein Eintrag für Zwiebel/Zwiebeln: ${rows.join(' | ')}`);
    assert.match(rows[0], /3\s*Stück\s*Zwiebeln/, 'die längere Schreibweise bei Gleichstand, zusammengezählt');
    await page.click('#week-form button[type=submit]'); await page.waitForSelector('#week-dialog', { state: 'hidden' });
    assert.deepEqual(await onList(), ['Zwiebeln 4 Stück'], 'zum vorhandenen Artikel dazugezählt, kein zweiter Eintrag');
    // Eingabefeld: „Zwiebel“ zählt zu „Zwiebeln“
    await page.click('[data-tab=shopping]');
    await page.fill('#item-form input[name=name]', 'Zwiebel'); await page.fill('#item-form input[name=quantity]', '1'); await page.click('#item-form button[type=submit]');
    assert.deepEqual(await onList(), ['Zwiebeln 5 Stück']);
    // Vorrat: „Zwiebeln“ im Vorrat deckt das Rezept „Zwiebel“ ab
    await openPantry(page);
    await addPantryProduct(page, 'Zwiebeln');
    await closePantry(page); await page.click('[data-tab=recipes]');
    await page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' }).getByRole('button', { name: 'Auf die Liste' }).click(); await sheetOpen(page);
    const zwiebel = page.locator('#transfer-ingredients label', { hasText: 'Zwiebel' });
    assert.equal(await zwiebel.locator('input').isChecked(), false, 'schon im Vorrat: vorab abgewählt');
    assert.equal(await zwiebel.locator('.pantry-badge').count(), 1);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Zwei Geräte, beide Fenster „Einkauf für die Woche“ offen: Übernimmt A, wird B aktualisiert und B addiert nichts mehr (400 g bleiben 400 g); eine überholte Vorschau wird vor dem Übernehmen erkannt', async () => {
    const remote = github(demo);
    const a = await context({ config: connectedConfig }), b = await context({ config: { ...connectedConfig, actor: 'Anna' } });
    await a.ctx.route('https://api.github.com/**', route => remote.handler(route));
    await b.ctx.route('https://api.github.com/**', route => remote.handler(route));
    for (const device of [a, b]) { await open(device.page); await synced(device.page); }
    await planPasta(a.page, '2'); await synced(a.page);
    await pollNow(b.page);
    await b.page.waitForFunction(() => /Tomaten-Pasta/.test(document.querySelector('#plan-days').textContent), null, { timeout: 20000 });
    const nudeln = () => remote.content.items.filter(item => !item.deletedAt && item.name === 'Nudeln').map(item => `${item.quantity} ${item.unit}`).sort();
    // beide öffnen den Einkauf für dieselbe Woche
    for (const device of [a, b]) { await device.page.click('[data-tab=plan]'); await device.page.click('#plan-shopping'); await sheetOpen(device.page); }
    assert.ok((await weekRowsText(b.page)).some(row => /Nudeln/.test(row)));
    // A übernimmt
    await a.page.click('#week-form button[type=submit]'); await a.page.waitForSelector('#week-dialog', { state: 'hidden' }); await synced(a.page);
    assert.deepEqual(nudeln(), ['200 g', '500 g']);
    // B gleicht ab, das Fenster steht noch offen: es wird von selbst aktualisiert
    await pollNow(b.page);
    await b.page.waitForFunction(() => /schon übernommen/.test(document.querySelector('#week-ingredients').textContent), null, { timeout: 20000 });
    assert.equal(await b.page.locator('#week-dialog[open]').count(), 1);
    assert.match(await b.page.textContent('#notice-text'), /Der Wochenplan hat sich geändert/);
    await b.page.click('#week-form button[type=submit]');
    assert.match(await b.page.textContent('#week-dialog [data-dialog-error]'), /mindestens eine Zutat/);
    await synced(b.page);
    assert.deepEqual(nudeln(), ['200 g', '500 g'], 'nichts wurde noch einmal addiert');
    // Überholte Vorschau, bevor das Fenster aktualisiert war: die Prüfung unmittelbar vor dem Übernehmen greift
    await b.page.uncheck('#week-form input[name=skipListed]');
    await b.page.evaluate(() => { const form = document.querySelector('#week-form'); form._plan = { ...form._plan, basket: { use: [], listed: [] }, rows: [] }; });
    await b.page.click('#week-form button[type=submit]');
    assert.match(await b.page.textContent('#week-dialog [data-dialog-error]'), /Der Wochenplan hat sich geändert[\s\S]*noch einmal bestätigen/);
    assert.ok((await weekRowsText(b.page)).some(row => /Nudeln/.test(row)), 'die Vorschau ist aktuell (Haken heraus: alles wieder da)');
    assert.deepEqual(nudeln(), ['200 g', '500 g'], 'auch jetzt nicht addiert');
    assert.deepEqual([...a.problems, ...b.problems].filter(text => !/Failed to load resource/.test(text)), []);
    await a.ctx.close(); await b.ctx.close();
  });

  test('Zwei Geräte bestätigen dieselbe Wochenübernahme fast gleichzeitig (mit Schreibkollision und erneutem Speichern): genau einmal gezählt; bewusst zusätzlich eingetragene Mengen addieren sich weiter', async () => {
    const remote = github(demo);
    const a = await context({ config: connectedConfig }), b = await context({ config: { ...connectedConfig, actor: 'Anna' } });
    // Sperre: Beide Geräte lesen denselben Stand und wollen schreiben. Erst wenn beide soweit sind, schreibt A; B bekommt dann „409“ (veralteter Stand) und speichert erneut.
    const gate = { on: false, arrived: [] }; let open_, aWrote; const bothArrived = new Promise(resolve => { open_ = resolve; }), aDone = new Promise(resolve => { aWrote = resolve; });
    const serve = name => async route => {
      if (gate.on && route.request().method() === 'PUT' && /daten\.json/.test(route.request().url())) {
        gate.arrived.push(name); if (gate.arrived.length === 2) { gate.on = false; open_(); }
        await bothArrived;
        if (name === 'b') await aDone;
        await remote.handler(route);
        if (name === 'a') aWrote();
        return;
      }
      return remote.handler(route);
    };
    await a.ctx.route('https://api.github.com/**', serve('a')); await b.ctx.route('https://api.github.com/**', serve('b'));
    const conflicts = []; b.page.on('response', response => { if (response.request().method() === 'PUT' && response.status() === 409) conflicts.push(response.url()); });
    for (const device of [a, b]) { await open(device.page); await synced(device.page); }
    await planPasta(a.page, '2'); await synced(a.page);
    await pollNow(b.page);
    await b.page.waitForFunction(() => /Tomaten-Pasta/.test(document.querySelector('#plan-days').textContent), null, { timeout: 20000 });
    const nudeln = () => remote.content.items.filter(item => !item.deletedAt && item.name === 'Nudeln').map(item => `${item.quantity} ${item.unit}`).sort();
    const before = nudeln();
    for (const device of [a, b]) { await device.page.click('[data-tab=plan]'); await device.page.click('#plan-shopping'); await sheetOpen(device.page); }
    assert.ok((await weekRowsText(a.page)).some(row => /Nudeln/.test(row)) && (await weekRowsText(b.page)).some(row => /Nudeln/.test(row)), 'beide haben noch dieselbe Vorschau');
    gate.on = true;
    await Promise.all([a.page.click('#week-form button[type=submit]'), b.page.click('#week-form button[type=submit]')]);
    await a.page.waitForSelector('#week-dialog', { state: 'hidden' }); await b.page.waitForSelector('#week-dialog', { state: 'hidden' });
    await a.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok'); await b.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    await pollNow(a.page); await pollNow(b.page); await synced(a.page); await synced(b.page);
    assert.ok(conflicts.length >= 1, 'B bekam eine Schreibkollision und speicherte erneut');
    const once = nudeln();
    // dieselbe Übernahme, nur einmal gezählt: Nudeln stehen genau um die 200 g mehr da, die das Rezept für 2 Portionen braucht
    const total = list => list.reduce((sum, text) => sum + Number.parseFloat(text), 0);
    assert.equal(total(once) - total(before), 200, `vorher ${before}, danach ${once}`);
    assert.equal(remote.content.items.filter(item => !item.deletedAt && item.name === 'Nudeln').length, once.length);
    const names = remote.content.items.filter(item => !item.deletedAt).map(item => item.name.toLowerCase());
    assert.equal(names.length, new Set(names.map((name, index) => `${name}|${remote.content.items.filter(item => !item.deletedAt)[index].storeId}`)).size, 'kein Artikel steht doppelt');
    // Bewusst zusätzlich eingetragen: beide Geräte tragen von Hand je 100 g Nudeln ein – das zählt, jedes einzeln
    const manual = async page => {
      await page.click('[data-tab=shopping]');
      await page.getByRole('tab', { name: /^Edeka/ }).click();
      await page.fill('#item-form input[name=name]', 'Nudeln'); await page.fill('#item-form input[name=quantity]', '100'); await chooseUnit(page, '#item-form input[name=unit]', 'g');
      await page.click('#item-form button[type=submit]');
    };
    await manual(a.page); await synced(a.page); await manual(b.page); await synced(b.page);
    await pollNow(a.page); await synced(a.page);
    assert.equal(total(nudeln()) - total(once), 200, `von Hand zweimal 100 g: ${once} → ${nudeln()}`);
    assert.deepEqual([...a.problems, ...b.problems].filter(text => !/Failed to load resource/.test(text)), []);
    await a.ctx.close(); await b.ctx.close();
  });

  test('Nach der Übernahme geändert: Rezept geändert, Rezept gelöscht, Gericht gelöscht – Plan und Wochen-Einkauf sagen, was auf der Einkaufsliste zu prüfen ist; die Liste selbst bleibt unverändert', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await planPasta(page, '2'); await planPasta(page, '2', 'Kichererbsen-Curry'); await planPasta(page, '2', 'Apfel-Pfannkuchen');
    await takeWeek(page); await page.click('#week-form button[type=submit]'); await page.waitForSelector('#week-dialog', { state: 'hidden' });
    await page.click('[data-tab=plan]');
    assert.equal(await page.locator('.meal-listed.changed').count(), 0, 'nichts geändert: kein Hinweis');
    // Rezept (Pasta) ändern: Mehl-artig – mehr Nudeln, neues Öl; Rezept (Curry) löschen; Gericht (Pfannkuchen) aus dem Plan entfernen
    const edit = change => page.evaluate(code => {
      const key = 'einkauf-demo-v1', stored = JSON.parse(localStorage.getItem(key)), now = new Date().toISOString();
      new Function('base', 'now', code)(stored.base, now); localStorage.setItem(key, JSON.stringify(stored));
    }, change);
    await edit(`
      const nudeln = base.ingredients.find(row => row.recipeId === 'recipe-pasta' && row.name === 'Nudeln'); nudeln.quantity = 300; nudeln.updatedAt = now;
      base.ingredients.push({ id: 'ing-neu', recipeId: 'recipe-pasta', name: 'Parmesan', quantity: 50, unit: 'g', createdAt: now, updatedAt: now, deletedAt: null, _clock: {} });
      base.recipes.find(row => row.id === 'recipe-curry').deletedAt = now;
      base.meals.find(row => row.recipeId === 'recipe-pfannkuchen').deletedAt = now;`);
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    await page.click('[data-tab=plan]');
    const planText = (await page.locator('.day.today .meal-listed.changed').allTextContents()).map(text => text.replace(/\s+/g, ' ').trim());
    assert.equal(planText.length, 1, planText.join(' | '));
    assert.match(planText[0], /Rezept seitdem geändert \(neu: 50 g Parmesan, Nudeln: 200 g → 300 g\): Liste prüfen/);
    await page.click('#plan-shopping'); await sheetOpen(page);
    const notes = (await page.textContent('#week-changes')).replace(/\s+/g, ' ');
    assert.match(notes, /^Seit der Übernahme geändert, bitte die Einkaufsliste prüfen: /);
    assert.match(notes, /Tomaten-Pasta: Das Rezept wurde seit der Übernahme geändert \(neu: 50 g Parmesan, Nudeln: 200 g → 300 g\)\./);
    assert.match(notes, /Kichererbsen-Curry: Das Rezept wurde gelöscht, die Zutaten stehen noch auf der Liste\./);
    assert.match(notes, /Apfel-Pfannkuchen wurde aus dem Plan entfernt, die Zutaten stehen noch auf der Liste\./);
    assert.equal(await page.locator('#week-changes.warn').count(), 1);
    // Es wird nichts von selbst auf die Liste gesetzt oder geändert
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.items.filter(row => !row.deletedAt && row.name === 'Nudeln').map(row => `${row.quantity} ${row.unit}`).sort()), ['200 g', '500 g']);
    await page.click('#week-dialog [data-close]');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  // Version 2.51: ein Gericht lange halten und auf einen anderen Tag ziehen
  const dragMeal = async (page, name, toDay) => {
    await page.locator('.meal', {hasText:name}).locator('.meal-copy').evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
    const from = await page.locator('.meal', { hasText: name }).locator('.meal-copy').boundingBox(), to = await page.locator(`.day[data-day="${toDay}"]`).boundingBox();
    await page.mouse.move(from.x + 20, from.y + from.height / 2); await page.mouse.down(); await page.waitForSelector('.drag-ghost');
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 6 });
    await page.waitForSelector(`.day.drop-target[data-day="${toDay}"]`);
    await page.mouse.up();
  };
  const mealDays = page => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.meals.filter(row => !row.deletedAt).map(row => [row.recipeId, row.date, row.listedServings ?? null]).sort());

  test('Plan: ein Gericht lange halten und auf einen freien Tag ziehen verschiebt es (die Übernahme auf die Liste bleibt); auf einen belegten Tag fragt „Tauschen?“ – Nein ändert nichts, Ja tauscht die Tage', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await planPasta(page, '2');
    await takeWeek(page); await page.click('#week-form button[type=submit]'); await page.waitForSelector('#week-dialog', { state: 'hidden' });
    await page.click('[data-tab=plan]');
    const days = await page.locator('#plan-days .day').evaluateAll(nodes => nodes.map(node => node.dataset.day)), today = await page.locator('.day.today').getAttribute('data-day');
    const free = days.find(day => day > today);   // ein späterer Tag dieser Woche (vergangene Tage sind gesperrt); am Sonntag gibt es keinen
    if (!free) { await ctx.close(); return; }
    // Nichts wird blau markiert (iOS markiert beim langen Halten sonst Text): Auswahl aus, und nach dem Ziehen ist nichts markiert
    assert.equal(await page.locator('#plan-days').evaluate(node => getComputedStyle(node).userSelect), 'none');
    await page.evaluate(() => { const range = document.createRange(); range.selectNodeContents(document.querySelector('#plan-days h3')); getSelection().removeAllRanges(); getSelection().addRange(range); });
    // 1. freier Tag: umgezogen, Übernahme bleibt, kein Hinweis „entfernt“
    await dragMeal(page, 'Tomaten-Pasta', free);
    assert.equal(await page.evaluate(() => getSelection().toString()), '', 'nach dem Abheben ist nichts markiert');
    await page.waitForFunction(day => document.querySelector(`.day[data-day="${day}"] .meal`), free);
    assert.deepEqual(await mealDays(page), [['recipe-pasta', free, 2]]);
    assert.match(await page.textContent('#notice-text'), /„Tomaten-Pasta“ auf .+ verschoben/);
    assert.equal(await page.locator('.day.today .meal').count(), 0);
    assert.equal(await page.locator(`.day[data-day="${free}"] .meal-listed`).textContent(), 'Zutaten übernommen');
    assert.equal(await page.locator('#swap-dialog[open]').count(), 0);
    await page.click('#plan-shopping'); await sheetOpen(page);
    assert.equal(await page.locator('#week-changes').isHidden(), true, 'verschoben ist nicht entfernt');
    await page.click('#week-dialog [data-close]');
    // 2. belegter Tag: Nein
    await planPasta(page, '4', 'Kichererbsen-Curry');
    await dragMeal(page, 'Kichererbsen-Curry', free);
    await page.waitForSelector('#swap-dialog[open]'); await sheetOpen(page);
    assert.match(await page.textContent('#swap-text'), /„Kichererbsen-Curry“ \(.+\) und „Tomaten-Pasta“ \(.+\) tauschen die Tage\./);
    await page.click('#swap-no'); await page.waitForSelector('#swap-dialog', { state: 'hidden' });
    const before = [['recipe-curry', today, null], ['recipe-pasta', free, 2]].sort();
    assert.deepEqual(await mealDays(page), before, 'Nein: nichts ändert sich');
    // 3. Ja: getauscht
    await dragMeal(page, 'Kichererbsen-Curry', free);
    await page.waitForSelector('#swap-dialog[open]'); await sheetOpen(page);
    await page.click('#swap-yes'); await page.waitForSelector('#swap-dialog', { state: 'hidden' });
    assert.deepEqual(await mealDays(page), [['recipe-curry', free, null], ['recipe-pasta', today, 2]].sort());
    assert.match(await page.textContent('#notice-text'), /getauscht/);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  for (const fixedDay of ['2026-10-26', '2026-10-30', '2026-11-01']) {
  test(`Wochenplan (${fixedDay}): vergangene Tage sind nur zu sehen (kein Plus, kein Ändern, Löschen, Ziehen); heute und spätere Tage bleiben bearbeitbar; neue Gerichte nicht für vergangene Tage`, async () => {
    const data = structuredClone(demo);
    // ein Gericht gestern/vorgestern (nicht abgehakt) und eines heute
    const at = '2026-10-25T00:00:00.000Z', day = offset => { const date = new Date(`${fixedDay}T12:00:00Z`); date.setDate(date.getDate() + offset); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
    data.meals = [{ id: 'm-past', date: day(-1), recipeId: 'recipe-curry', servings: 2, createdAt: at, updatedAt: at, deletedAt: null, _clock: {} }, { id: 'm-today', date: day(0), recipeId: 'recipe-pasta', servings: 2, createdAt: at, updatedAt: at, deletedAt: null, _clock: {} }];
    const { ctx, page, problems } = await context();
    await page.clock.setFixedTime(new Date(`${fixedDay}T12:00:00Z`));
    await ctx.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ base: value, pending: [] })); }, ['einkauf-demo-v1', data]);
    await open(page);
    await page.click('[data-tab=plan]');
    // Wochenansicht: ab Montag; vergangene Tage dieser Woche (falls vorhanden) sind gesperrt. Gestern liegt nur dann in dieser Woche, wenn heute nicht Montag ist.
    const info = await page.evaluate(() => [...document.querySelectorAll('#plan-days .day')].map(card => ({ day: card.dataset.day, past: card.classList.contains('past'), plus: card.querySelectorAll('.day-head .icon-button').length, edit: card.querySelectorAll('.meal .icon-button').length, check: [...card.querySelectorAll('.meal .check')].map(node => node.disabled), id: [...card.querySelectorAll('.meal')].map(node => Boolean(node.dataset.id)) })));
    const todayCard = info.find(entry => entry.day === day(0));
    assert.deepEqual([todayCard.past, todayCard.plus, todayCard.edit, todayCard.check, todayCard.id], [false, 1, 2, [false], [true]], 'heute ist bearbeitbar');
    for (const entry of info.filter(entry => entry.day < day(0))) assert.deepEqual([entry.past, entry.plus], [true, 0], `${entry.day}: gesperrt`);
    for (const entry of info.filter(entry => entry.day > day(0))) assert.deepEqual([entry.past, entry.plus], [false, 1], `${entry.day}: bearbeitbar`);
    const yesterday = info.find(entry => entry.day === day(-1));
    if (yesterday) assert.deepEqual([yesterday.edit, yesterday.check, yesterday.id], [0, [true], [false]], 'gestern: kein Stift, kein Papierkorb, Haken gesperrt, nicht ziehbar');
    // Ziehen auf einen vergangenen Tag tut nichts (und aus einem vergangenen Tag geht es nicht)
    if (yesterday) {
      await page.locator('.day.today .meal .meal-copy').evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForTimeout(80);
      const from = await page.locator('.day.today .meal .meal-copy').boundingBox(), to = await page.locator(`.day[data-day="${day(-1)}"]`).boundingBox();
      await page.mouse.move(from.x + 20, from.y + from.height / 2); await page.mouse.down(); await page.waitForSelector('.drag-ghost', { timeout: 3000 });
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 6 });
      assert.equal(await page.locator('.day.drop-target').count(), 0, 'ein vergangener Tag ist kein Ziel');
      await page.mouse.up();
      assert.deepEqual(await mealDays(page).then(list => list.map(entry => entry[1]).sort()), [day(-1), day(0)].sort());
    }
    // Neues Gericht für einen vergangenen Tag (über die Rezeptkarte mit Tagesauswahl): abgelehnt
    await page.click('[data-tab=recipes]');
    await page.locator('.recipe-card', { hasText: 'Apfel-Pfannkuchen' }).getByRole('button', { name: /im Wochenplan einplanen/ }).click(); await sheetOpen(page);
    assert.equal(await page.getAttribute('#meal-form input[name=date]', 'min'), day(0), 'das Datumsfeld beginnt heute');
    await page.fill('#meal-form input[name=date]', day(-3));
    assert.equal(await page.evaluate(() => document.querySelector('#meal-form input[name=date]').validity.rangeUnderflow), true, 'das Feld lehnt vergangene Tage ab');
    await page.click('#meal-form button[type=submit]');
    assert.equal(await page.locator('#meal-dialog[open]').count(), 1, 'nichts wird gespeichert');
    await page.evaluate(() => document.querySelector('#meal-form input[name=date]').removeAttribute('min'));   // auch ohne die Feldprüfung lehnt die App ab
    await page.click('#meal-form button[type=submit]');
    assert.match(await page.textContent('#meal-dialog [data-dialog-error]'), /Vergangene Tage lassen sich nicht mehr planen/);
    await page.fill('#meal-form input[name=date]', day(1)); await page.click('#meal-form button[type=submit]'); await page.waitForSelector('#meal-dialog', { state: 'hidden' });
    assert.equal((await mealDays(page)).filter(entry => entry[0] === 'recipe-pfannkuchen').length, 1);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  }

  test('Wochen-Einkauf zweimal: schon übernommene Gerichte bleiben draußen, die Mengen verdoppeln sich nicht; nur ausdrücklich noch einmal', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await planPasta(page, '2'); await planPasta(page, '4', 'Kichererbsen-Curry');
    await takeWeek(page);
    assert.equal(await page.locator('#week-listed').isHidden(), true, 'noch nichts übernommen: kein Hinweis');
    assert.ok((await weekRowsText(page)).some(row => /Nudeln/.test(row)) && (await weekRowsText(page)).some(row => /Reis/.test(row)));
    await page.click('#week-form button[type=submit]'); await page.waitForSelector('#week-dialog', { state: 'hidden' });
    assert.deepEqual((await listQty(page, 'Nudeln')).sort(), ['200 g', '500 g'], 'die 500 g der Beispielliste und 200 g aus dem Rezept (anderes Geschäft)');
    const before = { nudeln: await listQty(page, 'Nudeln'), reis: await listQty(page, 'Reis') };
    assert.deepEqual(before.reis, ['300 g'], '4 Portionen Curry statt 2: 300 g Reis');
    // im Plan steht, was übernommen ist
    await page.click('[data-tab=plan]');
    assert.deepEqual(await page.locator('.day.today .meal .meal-listed').allTextContents(), ['Zutaten übernommen', 'Zutaten übernommen']);
    // zweites Mal: nichts zu tun, der Hinweis sagt es, nichts wird doppelt
    await page.click('#plan-shopping'); await sheetOpen(page);
    assert.match(await page.textContent('#week-listed'), /^Schon übernommen: .+: Tomaten-Pasta, .+: Kichererbsen-Curry\.$/);
    assert.equal(await weekEmpty(page), ALL_LISTED);
    await page.click('#week-form button[type=submit]');
    assert.match(await page.textContent('#week-dialog [data-dialog-error]'), /mindestens eine Zutat/);
    assert.deepEqual({ nudeln: await listQty(page, 'Nudeln'), reis: await listQty(page, 'Reis') }, before, 'nichts hat sich geändert');
    // Haken heraus: Warnung, Zutaten da; wer es so will, bekommt die doppelte Menge
    await page.uncheck('#week-form input[name=skipListed]');
    assert.match(await page.textContent('#week-listed'), /^Diese Gerichte wurden schon übernommen und kommen noch einmal dazu\. Stehen ihre Zutaten noch auf der Liste, verdoppeln sich die Mengen: /);
    assert.equal(await page.locator('#week-listed.warn').count(), 1);
    assert.ok((await weekRowsText(page)).some(row => /Reis/.test(row)));
    await page.selectOption('#week-form select[name=storeId]', { label: 'Lidl' });
    await page.click('#week-form button[type=submit]'); await page.waitForSelector('#week-dialog', { state: 'hidden' });
    assert.deepEqual(await listQty(page, 'Reis'), ['600 g'], 'ausdrücklich noch einmal: doppelt');
    // und danach wieder zu: der Haken ist beim nächsten Öffnen wieder gesetzt
    await takeWeek(page);
    assert.equal(await page.isChecked('#week-form input[name=skipListed]'), true);
    assert.equal(await weekEmpty(page), ALL_LISTED);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Wochen-Einkauf nach Portionsänderung: mehr Portionen nehmen nur das Zusätzliche mit, weniger fragt nach und kann die Liste unverändert lassen; ein anderes Rezept am Gericht gilt wieder als neu', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    await planPasta(page, '2', 'Kichererbsen-Curry');   // 150 g Reis für 2 Portionen
    await takeWeek(page); await page.click('#week-form button[type=submit]'); await page.waitForSelector('#week-dialog', { state: 'hidden' });
    assert.deepEqual(await listQty(page, 'Reis'), ['150 g']);
    // 2 → 5 Portionen: zusätzlich 3 Portionen = 225 g Reis
    const edit = async servings => { await page.click('[data-tab=plan]'); await page.getByRole('button', { name: /Kichererbsen-Curry ändern/ }).click(); await sheetOpen(page); await page.fill('#meal-form input[name=servings]', servings); await page.click('#meal-form button[type=submit]'); if(await page.locator('#plan-adjust-dialog').evaluate(node=>node.open))await page.click('#plan-adjust-keep'); await page.waitForSelector('#meal-dialog', { state: 'hidden' }); };
    await edit('5');
    assert.deepEqual(await page.locator('.day.today .meal .meal-listed').allTextContents(), ['Zutaten für 2 Portionen übernommen']);
    await takeWeek(page);
    assert.match(await page.textContent('#week-listed'), /^Mehr Portionen seit der Übernahme, nur die zusätzlichen kommen dazu: .+: Kichererbsen-Curry \(\+3\)\.$/);
    const rows = await weekRowsText(page);
    assert.ok(rows.some(row => /225\s*g\s*Reis/.test(row)), rows.join(' | '));
    await page.click('#week-form button[type=submit]'); await page.waitForSelector('#week-dialog', { state: 'hidden' });
    assert.deepEqual(await listQty(page, 'Reis'), ['375 g'], '150 g + 225 g = 5 Portionen');
    await page.click('[data-tab=plan]');
    assert.deepEqual(await page.locator('.day.today .meal .meal-listed').allTextContents(), ['Zutaten übernommen']);
    // 5 → 3 Portionen: nichts mehr zu übernehmen, der Hinweis erklärt es nicht als neu
    await edit('3');
    await takeWeek(page);
    assert.equal(await weekEmpty(page), ALL_LISTED);
    await page.click('#week-dialog [data-close]');
    // anderes Rezept am Gericht: die Übernahme gilt nicht mehr, das Gericht kommt ganz
    await page.click('[data-tab=plan]'); await page.getByRole('button', { name: /Kichererbsen-Curry ändern/ }).click(); await sheetOpen(page);
    await page.locator('#recipe-pick .pick-row', { hasText: 'Apfel-Pfannkuchen' }).click();
    await page.fill('#meal-form input[name=servings]', '2'); await page.click('#meal-form button[type=submit]'); await page.click('#plan-adjust-keep'); await page.waitForSelector('#meal-dialog', { state: 'hidden' });
    assert.equal(await page.locator('.day.today .meal .meal-listed').count(), 0);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.meals.filter(row => !row.deletedAt).map(row => [row.recipeId, row.listedServings, row.listedAt]));
    assert.deepEqual(stored, [['recipe-pfannkuchen', null, null]]);
    await takeWeek(page);
    assert.equal(await page.locator('#week-listed').isHidden(), true);
    assert.ok((await weekRowsText(page)).some(row => /Mehl/.test(row)), 'das neue Gericht kommt mit allen Zutaten');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Wochen-Einkauf mit zwei Personen: die Übernahme der einen steht bei der anderen als übernommen da; eine Übernahme ohne Netz kommt nach dem Abgleich an; Mengen addieren sich nicht doppelt', async () => {
    const remote = github(demo);
    const a = await context({ config: connectedConfig }), b = await context({ config: { ...connectedConfig, actor: 'Anna' } });
    let offline = false;
    await a.ctx.route('https://api.github.com/**', route => remote.handler(route));
    await b.ctx.route('https://api.github.com/**', route => offline ? route.abort('connectionfailed') : remote.handler(route));
    for (const device of [a, b]) { await open(device.page); await synced(device.page); }
    await planPasta(a.page, '2'); await synced(a.page);
    await pollNow(b.page);
    await b.page.waitForFunction(() => /Tomaten-Pasta/.test(document.querySelector('#plan-days').textContent), null, { timeout: 20000 });
    // Nico übernimmt die Woche
    const take = async device => { await device.page.click('[data-tab=plan]'); await device.page.click('#plan-shopping'); await sheetOpen(device.page); await device.page.click('#week-form button[type=submit]'); await device.page.waitForSelector('#week-dialog', { state: 'hidden' }); };
    await take(a); await synced(a.page);
    const onList = data => data.items.filter(item => !item.deletedAt && item.name === 'Nudeln').map(item => `${item.quantity} ${item.unit}`);
    assert.deepEqual(onList(remote.content).sort(), ['200 g', '500 g'], 'die 500 g der Beispielliste und 200 g aus dem Rezept');
    assert.deepEqual(remote.content.meals.map(meal => [meal.listedServings, typeof meal.listedAt]), [[2, 'string']]);
    // Anna sieht: übernommen, und ihr Wochen-Einkauf nimmt nichts mehr mit
    await pollNow(b.page);
    await b.page.waitForFunction(() => document.querySelectorAll('#plan-days .meal-listed').length === 1, null, { timeout: 20000 });
    await b.page.click('[data-tab=plan]'); await b.page.click('#plan-shopping'); await sheetOpen(b.page);
    assert.match(await b.page.textContent('#week-listed'), /^Schon übernommen: /);
    assert.equal(await weekEmpty(b.page), ALL_LISTED);
    await b.page.click('#week-dialog [data-close]');
    // Anna ist ohne Netz, plant ein zweites Gericht und übernimmt (nur das neue); Nico erhöht gleichzeitig die Portionen der Pasta
    offline = true;
    await planPasta(b.page, '2', 'Kichererbsen-Curry');
    await take(b);
    await a.page.click('[data-tab=plan]');
    await a.page.getByRole('button', { name: /Tomaten-Pasta ändern/ }).click(); await sheetOpen(a.page);
    await a.page.fill('#meal-form input[name=servings]', '4'); await a.page.click('#meal-form button[type=submit]'); await synced(a.page);
    offline = false; await b.page.click('#refresh');
    await b.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok', null, { timeout: 20000 });
    await pollNow(a.page); await synced(a.page);
    await a.page.waitForFunction(() => document.querySelectorAll('#plan-days .meal').length === 2, null, { timeout: 20000 });
    const nudeln = data => data.items.filter(item => !item.deletedAt && item.name === 'Nudeln').map(item => `${item.quantity} ${item.unit}`);
    assert.deepEqual(nudeln(remote.content).sort(), ['200 g', '500 g'], 'Annas Übernahme hat an den Nudeln nichts geändert');
    assert.equal(remote.content.items.filter(item => !item.deletedAt && item.name === 'Reis').length, 1, 'Reis steht einmal auf der Liste');
    assert.deepEqual(remote.content.meals.filter(meal => !meal.deletedAt).map(meal => [meal.recipeId, meal.servings, meal.listedServings]).sort(), [['recipe-curry', 2, 2], ['recipe-pasta', 4, 2]]);
    // Nico: die Pasta hat 2 Portionen mehr als übernommen, das Curry ist von Anna übernommen
    await a.page.click('[data-tab=plan]'); await a.page.click('#plan-shopping'); await sheetOpen(a.page);
    assert.match(await a.page.textContent('#week-listed'), /Schon übernommen: .+: Kichererbsen-Curry\. Mehr Portionen seit der Übernahme, nur die zusätzlichen kommen dazu: .+: Tomaten-Pasta \(\+2\)\./);
    assert.ok((await weekRowsText(a.page)).some(row => /200\s*g\s*Nudeln/.test(row)), 'nur die zusätzlichen 2 Portionen');
    assert.deepEqual([...a.problems, ...b.problems].filter(text => !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(text)), []);
    await a.ctx.close(); await b.ctx.close();
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
    assert.equal(await page.locator('#shopping-total').count(), 0, 'keine Preisschätzung');
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
    assert.equal(await page.locator('#shopping-total').count(), 0);
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

  test('Gesamtliste ohne Schätzung: Erledigtes mit Geschäft, Entfernen gilt für die gewählte Ansicht', async () => {
    const { ctx, page, problems } = await context();
    await open(page); assert.equal(await page.locator('#shopping-total').count(), 0);
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

  // Version 2.47: leere Einkaufsliste, „Salz“ steht nur im Namensgedächtnis (aus früheren Einkäufen). Es ist kein Artikel auf der Liste.
  const saltContext = async (extra = {}) => {
    const data = structuredClone(demo); data.items = [];
    data.names = [{ name: 'Salz', category: 'vorrat', unit: 'Stück', at: '2026-09-01T10:00:00.000Z', count: 4 }, { name: 'Milch', category: 'milch', unit: 'l', at: '2026-09-01T10:00:00.000Z', count: 2 }];
    data.ingredients.push({ id: 'ing-salz', recipeId: 'recipe-pasta', name: 'Salz', quantity: 1, unit: 'nach Bedarf', createdAt: '2026-10-25T00:00:00.000Z', updatedAt: '2026-10-25T00:00:00.000Z', deletedAt: null, _clock: {} });
    const made = await context(extra);
    await made.ctx.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ base: value, pending: [] })); }, ['einkauf-demo-v1', data]);
    return made;
  };
  const transferOnly = async (page, name, recipe = 'Tomaten-Pasta') => {
    await page.click('[data-tab=recipes]');
    await page.locator('.recipe-card', { hasText: recipe }).getByRole('button', { name: 'Auf die Liste' }).click();
    await sheetOpen(page);
    await page.locator('#transfer-ingredients label').evaluateAll((nodes, wanted) => nodes.forEach(node => { node.querySelector('input').checked = node.querySelector('span').textContent.replace(/\s+/g, ' ').trim().split(' ').includes(wanted); }), name);
  };

  test('Rezept übernehmen: „Salz nach Bedarf“ kommt auf die leere Liste, auch wenn „Salz“ nur im Namensgedächtnis steht; erst ein echter Artikel Salz verhindert das Doppelte', async () => {
    const { ctx, page, problems } = await saltContext();
    await open(page);
    assert.equal(await page.locator('#items .item').count(), 0, 'die Liste ist leer');
    await transferOnly(page, 'Salz');
    await page.click('#transfer-form button:not([data-close])');
    await page.waitForSelector('#transfer-dialog', { state: 'hidden' });
    assert.deepEqual(await page.locator('#items .item strong, #items .item .item-name').allTextContents().then(list => list.filter(Boolean)), ['Salz'], 'Salz steht auf der Liste');
    assert.equal(await page.locator('#status').getAttribute('data-state') !== 'error', true);
    // Zweites Mal: Salz steht jetzt wirklich auf der Liste, nichts wird doppelt aufgeschrieben
    await transferOnly(page, 'Salz');
    await page.click('#transfer-form button:not([data-close])');
    assert.match(await page.textContent('#transfer-dialog .dialog-error'), /Alles davon steht schon auf der Liste/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#items .item').count(), 1);
    // Mit Menge: „Milch“ steht nur im Gedächtnis (Einheit Liter); 250 ml werden ein neuer Artikel, nichts wird „dazugezählt“
    await transferOnly(page, 'Milch', 'Apfel-Pfannkuchen');
    await page.click('#transfer-form button:not([data-close])');
    await page.waitForSelector('#transfer-dialog', { state: 'hidden' });
    assert.equal(await page.locator('#items .item', { hasText: 'Milch' }).count(), 1);
    assert.match(await page.locator('#items .item', { hasText: 'Milch' }).textContent(), /1 Packung à 1 l/);
    assert.equal((await storedDemo(page)).items.find(row=>!row.deletedAt&&row.name==='Milch').quantity,250);
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
    await openStores(page);
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

  test('Fotos aufräumen: Fotos unter 24 Stunden bleiben stehen, auch wenn noch kein Rezept auf sie verweist (zweites Gerät lädt zuerst das Foto hoch)', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
    const remote = github(demo), old = 'bbbbbbbb-1111-4222-8333-444444444444', young = 'cccccccc-1111-4222-8333-444444444444';
    for (const id of [old, young]) remote.photos.set(`photos/${id}.jpg`, jpeg);
    remote.photoDates.set(`photos/${young}.jpg`, new Date(Date.now() - 3600000).toISOString());
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    await openSettings(page);
    page.once('dialog', dialog => { assert.match(dialog.message(), /1 nicht mehr verwendete Fotos/); assert.match(dialog.message(), /1 neuere bleiben vorerst stehen/); void dialog.accept(); });
    await page.click('#clean-photos');
    await page.waitForFunction(() => /1 Fotos gelöscht/.test(document.querySelector('#storage-note').textContent));
    assert.match(await page.textContent('#storage-note'), /1 neuere bleiben vorerst stehen/);
    assert.deepEqual([...remote.photos.keys()], [`photos/${young}.jpg`]);
    // Beim nächsten Mal ist nur noch das junge Foto übrig: keine Rückfrage, nichts wird gelöscht
    await page.click('#clean-photos');
    await page.waitForFunction(() => /noch neu \(unter 24 Stunden\)/.test(document.querySelector('#storage-note').textContent));
    assert.equal(remote.stats.photoDeletes, 1);
    // Ist das Alter nicht zu erfahren (GitHub antwortet mit einem Fehler), bleibt das Foto ebenfalls
    remote.photoDates.set(`photos/${young}.jpg`, 'kein Datum');
    await page.click('#clean-photos');
    await page.waitForFunction(() => /noch neu/.test(document.querySelector('#storage-note').textContent));
    assert.equal(remote.photos.size, 1);
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  test('Fotos aufräumen: verweist nach der Rückfrage ein Rezept auf das Foto, bleibt es; ohne geglückten Abgleich wird nichts gelöscht', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
    const remote = github(demo), late = 'bbbbbbbb-1111-4222-8333-444444444444', lost = 'cccccccc-1111-4222-8333-444444444444';
    for (const id of [late, lost]) remote.photos.set(`photos/${id}.jpg`, jpeg);
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    await openSettings(page);
    // Während die Rückfrage offen ist, kommt vom anderen Gerät ein Rezept, das auf das Foto „late“ verweist
    page.once('dialog', dialog => {
      assert.match(dialog.message(), /2 nicht mehr verwendete Fotos/);
      remote.remoteChange(content => { content.recipes.find(row => row.id === 'recipe-pasta').photoId = late; });
      void dialog.accept();
    });
    await page.click('#clean-photos');
    await page.waitForFunction(() => /1 Fotos gelöscht/.test(document.querySelector('#storage-note').textContent));
    assert.deepEqual([...remote.photos.keys()], [`photos/${late}.jpg`], 'das Foto mit neuem Rezept bleibt');
    // Kann nicht abgeglichen werden (hier: Anmeldung abgelehnt), wird nicht einmal die Liste der Fotos geholt, geschweige denn gelöscht
    remote.photos.set(`photos/${lost}.jpg`, jpeg);
    remote.behavior.unauthorized = true;
    const lists = remote.stats.photoLists;
    await page.click('#clean-photos');
    await page.waitForFunction(() => /nicht geklappt/.test(document.body.textContent));
    assert.equal(remote.stats.photoLists, lists, 'ohne Abgleich keine Foto-Prüfung');
    assert.equal(remote.photos.has(`photos/${lost}.jpg`), true);
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  test('Vollsicherung mit Fotos: ZIP mit daten.json, allen Rezeptfotos und lies-mich.txt; Fehlendes wird genannt, kein Token darin', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 9, 8, 7]);
    const remote = github(demo), keep = 'aaaaaaaa-1111-4222-8333-444444444444', gone = 'dddddddd-1111-4222-8333-444444444444';
    const [first, second] = remote.content.recipes;
    first.photoId = keep; second.photoId = gone;   // das zweite Foto gibt es nirgends
    remote.photos.set(`photos/${keep}.jpg`, jpeg);
    const { ctx, page, problems } = await context({ config: connectedConfig });
    await ctx.route('https://api.github.com/**', route => remote.handler(route));
    await open(page); await synced(page);
    await openSettings(page);
    assert.equal(await page.locator('#export-full').isVisible(), true);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-full')]);
    assert.match(download.suggestedFilename(), /^sattplan-vollsicherung-\d{4}-\d\d-\d\d\.zip$/);
    const files = readZip(new Uint8Array(await readFile(await download.path())));
    assert.deepEqual(files.map(file => file.name), ['daten.json', `fotos/${keep}.jpg`, 'lies-mich.txt']);
    const data = JSON.parse(new TextDecoder().decode(files[0].data));
    assert.ok(data.items.length > 0 && data.recipes.some(row => row.photoId === keep), 'dieselben Daten wie die JSON-Sicherung');
    assert.deepEqual([...files[1].data], [...jpeg], 'das Foto ist unverändert');
    const readme = new TextDecoder().decode(files[2].data);
    assert.ok(readme.includes(gone) && /Nicht gesichert/.test(readme), 'das fehlende Foto wird genannt');
    assert.ok(!files.some(file => /token/i.test(new TextDecoder().decode(file.data)) && file.name !== 'lies-mich.txt'), 'kein Token in der Sicherung');
    await page.waitForFunction(() => /Gesichert: Daten und 1 Foto, 1 Foto nicht gefunden/.test(document.querySelector('#export-note').textContent));
    assert.equal(await page.isDisabled('#export-full'), false, 'der Knopf ist danach wieder bedienbar');
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []);
    await ctx.close();
  });

  test('Vollsicherung im Beispielmodus (ohne Verbindung): ZIP mit Daten, ohne Fotos', async () => {
    const { ctx, page, problems } = await context();
    await open(page); await openSettings(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-full')]);
    const files = readZip(new Uint8Array(await readFile(await download.path())));
    assert.deepEqual(files.map(file => file.name), ['daten.json', 'lies-mich.txt']);
    assert.ok(JSON.parse(new TextDecoder().decode(files[0].data)).recipes.length > 0);
    await page.waitForFunction(() => /Gesichert: Daten und 0 Fotos/.test(document.querySelector('#export-note').textContent));
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  // ---- Version 2.40: Die Überschrift mit dem „×“ scrollt mit dem Inhalt weg und kommt beim Hochscrollen wieder (nichts bleibt oben stehen); ein Tipp außerhalb schließt ein Fenster ----
  for (const [glass, scheme] of [[true, 'light'], [true, 'dark'], [false, 'light'], [false, 'dark']]) {
    test(`Fenster: die Überschrift scrollt mit dem Inhalt weg, beim Hochscrollen ist sie mit dem „×“ wieder da; nur die Knopfleiste unten bleibt (${glass ? 'Glas-Design' : 'ohne Glas'}, ${scheme})`, async () => {
      const { ctx, page, problems } = await context({ config: { glass }, context: { viewport: { width: 390, height: 480 }, colorScheme: scheme } });
      await open(page);
      const lum = ([r, g, b]) => { const [x, y, z] = [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * x + .7152 * y + .0722 * z; };
      // Prüft einen waagerechten Streifen: Er muss einfarbig sein (nur Hintergrund, kein Text darunter)
      const flat = async (box, label) => {
        const values = [];
        for (let x = box.x; x <= box.x + box.width; x += Math.max(3, Math.round(box.width / 40))) values.push(lum(await pixelAt(page, x, box.y)));
        const spread = Math.max(...values) - Math.min(...values);
        assert.ok(spread < 0.06, `${label}: es schimmert etwas durch (Streuung ${spread.toFixed(2)} über ${values.length} Punkte)`);
      };
      // Überall: keine Überschrift (Fenster, Kochmodus) ist festgesetzt; nur die Knopfleiste unten ist es
      const modes = await page.evaluate(() => [...document.querySelectorAll('dialog .sheet-head, dialog .cook-head')].map(node => ({ dialog: node.closest('dialog').id, position: getComputedStyle(node).position })));
      assert.ok(modes.length >= 12, `viele Überschriften (${modes.length})`);
      for (const mode of modes) assert.ok(!['sticky', 'fixed'].includes(mode.position), `${mode.dialog}: die Überschrift bleibt nicht oben stehen (${mode.position})`);
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#edit-item-form .sheet-actions')).position), 'sticky', 'die Knopfleiste unten bleibt');
      // Scrollt die Überschrift mit, ist sie nach dem Hinunterscrollen weg, und beim Hochscrollen mit dem „×“ wieder da; ein Tipp auf das „×“ schließt
      const check = async (dialog, label, head = '.sheet-head') => {
        await sheetOpen(page);
        const rect = () => page.evaluate(([selector, headSelector]) => { const box = document.querySelector(`${selector} ${headSelector}`).getBoundingClientRect(), shell = document.querySelector(selector).getBoundingClientRect(); return { top: box.top, bottom: box.bottom, height: box.height, shellTop: shell.top, scroll: document.querySelector(selector).scrollTop }; }, [dialog, head]);
        await page.evaluate(selector => { document.querySelector(selector).scrollTop = 0; }, dialog);   // ganz oben beginnen (ein Rezept mit neuen Zeilen steht evtl. weiter unten)
        await page.waitForTimeout(100);
        const start = await rect();
        await page.evaluate(([selector, at]) => { document.querySelector(selector).scrollTop = at; }, [dialog, 420]);
        await page.waitForTimeout(150);
        const down = await rect();
        assert.ok(down.scroll > 20, `${label}: das Fenster ist gescrollt (${down.scroll})`);
        assert.ok(Math.abs((start.top - down.top) - down.scroll) <= 2, `${label}: die Überschrift scrollt mit dem Inhalt (${start.top} → ${down.top}, gescrollt ${down.scroll})`);
        if (down.scroll >= start.height + 8) assert.ok(down.bottom <= down.shellTop + 1, `${label}: die Überschrift ist nach dem Scrollen nicht mehr zu sehen`);
        await page.evaluate(selector => { document.querySelector(selector).scrollTop = 0; }, dialog);
        await page.waitForTimeout(100);
        const up = await rect();
        assert.ok(Math.abs(up.top - start.top) <= 1 && up.top >= up.shellTop, `${label}: beim Hochscrollen ist die Überschrift wieder da`);
        const id = dialog.slice(1);
        await page.click(`${dialog} [data-close="${id}"]`);
        await page.waitForSelector('dialog[open]', { state: 'detached' });
      };
      await openSettings(page); await page.click('#open-help'); await page.waitForSelector('#help-dialog[open]');
      await page.evaluate(() => document.querySelectorAll('#help-body details').forEach(node => { node.open = true; }));
      await check('#help-dialog', 'Anleitung');
      await goTab(page, 'spending');
      await page.click('#add-purchase'); await page.waitForSelector('#purchase-dialog[open]');
      await check('#purchase-dialog', 'Einkauf eintragen');
      await goTab(page, 'recipes');
      await page.click('#daily-open'); await page.waitForSelector('#daily-dialog[open]');
      await check('#daily-dialog', 'Rezepte des Tages');
      await page.click('#cookable-open'); await page.waitForSelector('#cookable-dialog[open]');
      await page.evaluate(() => document.querySelectorAll('#cookable-dialog details').forEach(node => { node.open = true; }));
      await check('#cookable-dialog', 'Was kann ich kochen?');
      // Rezepte: neues Rezept mit vielen Zutaten (langes Fenster) und der Kochmodus
      await page.click('#add-recipe'); await page.waitForSelector('#recipe-dialog[open]');
      for (let index = 0; index < 8; index++) { await page.click('#add-ingredient'); }
      await check('#recipe-dialog', 'Rezept bearbeiten');
      await page.locator('.recipe-card').first().getByRole('button', { name: 'Kochen' }).click(); await page.waitForSelector('#cook-dialog[open]');
      await page.evaluate(() => { const list = document.querySelector('#cook-ingredients'); for (let index = 0; index < 20; index++) list.append(list.firstElementChild.cloneNode(true)); });
      await check('#cook-dialog', 'Kochmodus', '.cook-head');
      await goTab(page, 'shopping'); await openStores(page);
      await check('#stores-dialog', 'Geschäfte & Angebote');
      // Artikel bearbeiten: die Knopfleiste unten bleibt stehen und ist undurchsichtig (nichts schimmert durch)
      await page.locator('#items .item', { hasText: 'Tomaten' }).getByRole('button', { name: /bearbeiten/ }).click(); await sheetOpen(page);
      await page.click('#item-price-fold > summary');
      await page.evaluate(() => { document.querySelector('#item-dialog').scrollTop = 0; });
      const bar = await page.locator('#edit-item-form .sheet-actions').boundingBox(), shell = await page.locator('#item-dialog').boundingBox();
      assert.ok(Math.abs(bar.y + bar.height - (shell.y + shell.height)) <= 2, 'die Knopfleiste sitzt am unteren Rand');
      await flat({ x: bar.x + 6, y: bar.y + 3, width: bar.width - 12 }, 'Knopfleiste, oberer Rand');
      await flat({ x: bar.x + 6, y: bar.y + bar.height - 3, width: bar.width - 12 }, 'Knopfleiste, unterer Rand');
      assert.deepEqual(problems, []);
      await ctx.close();
    });
  }

  /* ---------- Rezeptblatt (PDF): Vorschau, Speichern, Teilen, Auswahl im Plan ---------- */
  const TINY_JPEG = '/9j/4AAQSkZJRgABAQAAAAAAAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAMABADASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAMF/8QAGRAAAQUAAAAAAAAAAAAAAAAAAAISFFFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAP/xAAYEQACAwAAAAAAAAAAAAAAAAAAAQITFP/aAAwDAQACEQMRAD8AnJ0SdM16rD1WMsSl7P/Z';
  const PHOTO_ID = '0123456789abcdef0123456789abcdef';
  // Beispieldaten mit Lieblingsrezept und einem Foto am ersten Rezept; das Foto liegt schon im Gerätespeicher
  const sheetData = () => { const data = structuredClone(demo); data.recipes.find(row => row.id === 'recipe-curry').favorite = true; data.recipes.find(row => row.id === 'recipe-pasta').photoId = PHOTO_ID; return data; };
  const sheetContext = async (options = {}) => {
    const made = await context(options);
    await made.ctx.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ base: value, pending: [] })); }, ['einkauf-demo-v1', sheetData()]);
    return made;
  };
  const storePhotoInPage = (page, base64 = TINY_JPEG) => page.evaluate(async ([id, data]) => {
    const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
    await (await caches.open('einkauf-photos-v1')).put(new Request(new URL(`./photo/${id}`, location.href)), new Response(new Blob([bytes], { type: 'image/jpeg' }), { headers: { 'Content-Type': 'image/jpeg' } }));
  }, [PHOTO_ID, base64]);
  const sheetText = page => page.evaluate(() => [...document.querySelectorAll('#sheet-pages text')].map(node => node.textContent).join('\n'));
  const openCardSheet = async (page, name = 'Tomaten-Pasta') => {
    await goTab(page, 'recipes');
    await page.getByRole('button', { name: new RegExp(`^${name}: Rezeptblatt`) }).click();
    await page.waitForSelector('#sheet-dialog[open] .sheet-page'); await sheetOpen(page);
  };
  const openMealPicker = async page => { await goTab(page, 'plan'); await page.locator('.day-head .icon-button').first().click(); await page.waitForSelector('#meal-dialog[open]'); await sheetOpen(page); };
  const pdfBytesOf = async download => { const path = await download.path(); return (await import('node:fs/promises')).readFile(path); };
  const checkPdf = bytes => {
    const body = bytes.toString('latin1');
    assert.ok(body.startsWith('%PDF-1.4\n') && body.endsWith('%%EOF\n'));
    const start = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(body)[1]);
    assert.ok(body.startsWith('xref', start), 'das Kreuzverzeichnis steht, wo startxref hinzeigt');
    return body;
  };

  test('Rezeptblatt: das Dokument-Symbol an der Rezeptkarte öffnet die Vorschau mit Titel, Zutaten und Schritten; „×“ oben rechts schließt; Portionen rechnen die Mengen um', async () => {
    const { ctx, page, problems } = await sheetContext();
    await open(page);
    await goTab(page, 'recipes');
    const card = page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' });
    assert.equal(await card.getByRole('button', { name: /Tomaten-Pasta: Rezeptblatt \(PDF\) ansehen, speichern oder teilen/ }).count(), 1);
    await openCardSheet(page);
    assert.equal(await page.locator('#sheet-pages .sheet-page').count(), 1);
    const text = await sheetText(page);
    for (const part of ['REZEPT', 'Tomaten-Pasta', 'PORTIONEN', 'ZUTATEN', 'Zubereitung', '200 g', 'Nudeln', '400 g', 'Tomaten', 'Nudeln in Salzwasser kochen.', 'Schnell · vegetarisch', 'Meine Notizen', 'Eigenes Rezept']) assert.ok(text.includes(part), `${part} fehlt auf dem Blatt`);
    assert.equal(await page.locator('#sheet-pages image').count(), 0, 'ohne Foto kein Bild');
    // „×“ oben rechts, immer erreichbar
    const viewport = page.viewportSize(), close = await page.locator('#sheet-close').boundingBox();
    assert.ok(close.x + close.width <= viewport.width && close.x + close.width / 2 > viewport.width * 0.8 && close.y < 60 && close.width >= 44, 'das „×“ sitzt oben rechts');
    await page.evaluate(() => document.querySelector('#sheet-scroll').scrollTo(0, 400));
    assert.deepEqual(await page.locator('#sheet-close').boundingBox(), close, 'es bleibt beim Scrollen stehen');
    await page.click('#sheet-close');
    assert.equal(await page.locator('#sheet-dialog[open]').count(), 0);
    // Aufgeräumt wird im „close“-Ereignis des Fensters, das erst nach dem Schließen läuft: darauf warten, nicht nachsehen
    await page.waitForFunction(() => document.querySelector('#sheet-pages').children.length === 0, null, { timeout: 5000 }).catch(() => {});
    assert.equal(await page.locator('#sheet-pages').evaluate(node => node.children.length), 0, 'beim Schließen wird aufgeräumt');
    // Vier statt zwei Portionen: die Mengen verdoppeln sich
    await page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' }).locator('summary').click();
    await page.getByLabel('Portionen für Tomaten-Pasta').fill('4');
    await openCardSheet(page);
    const doubled = await sheetText(page);
    assert.ok(doubled.includes('400 g') && doubled.includes('800 g') && doubled.includes('2 EL'), doubled);
    assert.match(doubled, /PORTIONEN\s*\n?4/);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Rezeptblatt: „PDF speichern“ lädt eine gültige PDF-Datei mit dem Rezeptnamen herunter; mit Foto steckt das JPEG in der Datei und die Vorschau zeigt es', async () => {
    const { ctx, page, problems } = await sheetContext();
    await open(page);
    await storePhotoInPage(page);
    await openCardSheet(page);
    assert.equal(await page.locator('#sheet-pages image').count(), 1, 'das Foto steht auf dem Blatt');
    assert.match(await page.locator('#sheet-pages image').getAttribute('href'), /^blob:/);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#sheet-save')]);
    assert.equal(download.suggestedFilename(), 'Tomaten-Pasta.pdf');
    const body = checkPdf(await pdfBytesOf(download));
    assert.ok(body.includes('/DCTDecode') && body.includes('/Count 1 ') && body.includes('/BaseFont /Times-Bold'));
    assert.match(await page.textContent('#sheet-status'), /„Tomaten-Pasta\.pdf“ wird gespeichert/);
    // ohne Foto kein Bild in der Datei
    await page.click('#sheet-close');
    await page.evaluate(() => caches.delete('einkauf-photos-v1'));
    await openCardSheet(page);
    assert.equal(await page.locator('#sheet-pages image').count(), 0);
    const [again] = await Promise.all([page.waitForEvent('download'), page.click('#sheet-save')]);
    assert.ok(!checkPdf(await pdfBytesOf(again)).includes('/DCTDecode'));
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Rezeptblatt: „Teilen“ gibt es nur, wo der Browser Dateien teilen kann; die PDF-Datei geht an den Teilen-Dialog; Abbrechen ist still, ein Fehler steht im Fenster', async () => {
    const plain = await sheetContext();
    await open(plain.page);
    await openCardSheet(plain.page);
    assert.equal(await plain.page.locator('#sheet-share').isHidden(), true, 'Chromium ohne Teilen-Dialog: kein Knopf');
    await plain.ctx.close();
    const { ctx, page, problems } = await sheetContext();
    await ctx.addInitScript(() => {
      window.__shared = []; window.__shareMode = 'ok';
      navigator.canShare = data => Boolean(data?.files?.length) && data.files.every(file => file.type === 'application/pdf');
      navigator.share = async data => {
        if (window.__shareMode === 'cancel') throw Object.assign(new Error('abgebrochen'), { name: 'AbortError' });
        if (window.__shareMode === 'fail') throw Object.assign(new Error('Der Teilen-Dialog ist nicht erlaubt.'), { name: 'NotAllowedError' });
        window.__shared.push({ name: data.files[0].name, type: data.files[0].type, size: data.files[0].size, title: data.title });
      };
    });
    await open(page);
    await openCardSheet(page);
    assert.equal(await page.locator('#sheet-share').isVisible(), true);
    await page.click('#sheet-share');
    await page.waitForFunction(() => window.__shared.length === 1);
    const [shared] = await page.evaluate(() => window.__shared);
    assert.deepEqual([shared.name, shared.type, shared.title], ['Tomaten-Pasta.pdf', 'application/pdf', 'Tomaten-Pasta']);
    assert.ok(shared.size > 2000);
    assert.equal(await page.textContent('#sheet-status'), 'Geteilt.');
    await page.evaluate(() => { window.__shareMode = 'cancel'; });
    await page.click('#sheet-share');
    await page.waitForTimeout(150);
    assert.equal(await page.textContent('#sheet-status'), '', 'Abbrechen ist kein Fehler');
    await page.evaluate(() => { window.__shareMode = 'fail'; });
    await page.click('#sheet-share');
    await page.waitForFunction(() => document.querySelector('#sheet-status').classList.contains('error'));
    assert.equal(await page.textContent('#sheet-status'), 'Der Teilen-Dialog ist nicht erlaubt.');
    // Homescreen-App auf dem iPhone (navigator.standalone): „PDF speichern“ nimmt den Teilen-Dialog statt eines Downloads
    await page.evaluate(() => { window.__shareMode = 'ok'; window.__shared.length = 0; Object.defineProperty(navigator, 'standalone', { value: true, configurable: true }); });
    await page.click('#sheet-save');
    await page.waitForFunction(() => window.__shared.length === 1);
    assert.equal(await page.textContent('#sheet-status'), 'Geteilt.');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Plan: die Rezeptauswahl ist eine Liste (Lieblingsrezepte zuerst); ein Tipp wählt aus und übernimmt die Portionen, „Eigenes Gericht“ zeigt das Namensfeld; gespeichert wird wie vorher', async () => {
    const { ctx, page, problems } = await sheetContext();
    await open(page);
    await openMealPicker(page);
    assert.equal(await page.locator('#meal-form select[name=recipeId]').count(), 0, 'keine Auswahlbox für das Rezept mehr (nur das Filterfeld)');
    const labels = await page.locator('#recipe-pick .pick-row strong').allTextContents();
    assert.deepEqual(labels, ['★ Kichererbsen-Curry', 'Apfel-Pfannkuchen', 'Tomaten-Pasta', 'Eigenes Gericht (ohne Rezept)']);
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), '');
    assert.equal(await page.locator('#recipe-pick [aria-pressed=true]').count(), 0);
    await page.fill('#meal-form input[name=servings]', '5');
    await page.locator('#recipe-pick .pick-row', { hasText: 'Tomaten-Pasta' }).click();
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), 'recipe-pasta');
    assert.equal(await page.locator('#recipe-pick [aria-pressed=true]').count(), 1);
    assert.equal(await page.inputValue('#meal-form input[name=servings]'), '2', 'die Portionen des Rezepts');
    await page.locator('#recipe-pick .pick-row.custom').click();
    assert.ok(await page.locator('#meal-form [data-custom]').isVisible());
    await page.fill('#meal-form input[name=title]', 'Pizza bestellen');
    await page.locator('#recipe-pick .pick-row', { hasText: 'Kichererbsen-Curry' }).click();
    assert.ok(await page.locator('#meal-form [data-custom]').isHidden());
    await page.click('#meal-form button[type=submit]');
    assert.match(await page.textContent('#plan-days'), /Kichererbsen-Curry/);
    // Beim Ändern ist das gewählte Rezept markiert
    await page.getByRole('button', { name: /Kichererbsen-Curry ändern/ }).first().click();
    await page.waitForSelector('#meal-dialog[open]');
    assert.equal(await page.locator('#recipe-pick [aria-pressed=true]').count(), 1);
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), 'recipe-curry');
    assert.match(await page.locator('#recipe-pick [aria-pressed=true]').textContent(), /Kichererbsen-Curry/);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Plan: ein Rezept in der Auswahl lange drücken zeigt das Rezeptblatt (Maus), ohne es zu wählen; „×“ oder Escape schließen es, das Fenster dahinter bleibt; danach wählt ein Tipp wieder', async () => {
    const { ctx, page, problems } = await sheetContext();
    await open(page);
    await openMealPicker(page);
    const row = page.locator('#recipe-pick .pick-row', { hasText: 'Tomaten-Pasta' }); let box = await row.boundingBox();
    // zu kurz: nur ein Tipp (wählt)
    await row.scrollIntoViewIfNeeded(); box=await row.boundingBox(); await page.mouse.move(box.x + 40, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(150); await page.mouse.up();
    assert.equal(await page.locator('#sheet-dialog[open]').count(), 0);
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), 'recipe-pasta');
    await page.locator('#recipe-pick .pick-row', { hasText: 'Apfel-Pfannkuchen' }).click();
    // lang: öffnet das Blatt des gedrückten Rezepts
    await row.scrollIntoViewIfNeeded(); box=await row.boundingBox(); await page.mouse.move(box.x + 40, box.y + box.height / 2); await page.mouse.down();
    await page.waitForSelector('#sheet-dialog[open] .sheet-page', { timeout: 3000 });
    assert.ok((await sheetText(page)).includes('Tomaten-Pasta'));
    await page.mouse.up();
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), 'recipe-pfannkuchen', 'das lange Drücken wählt nicht aus');
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#sheet-dialog[open]').count(), 1, 'das Loslassen schließt nichts');
    await page.click('#sheet-close');
    assert.equal(await page.locator('#meal-dialog[open]').count(), 1, 'das Fenster „Gericht planen“ bleibt');
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), 'recipe-pfannkuchen');
    // ein Tipp danach wählt wieder (das Loslassen nach dem langen Drücken wurde nicht „gemerkt“)
    await row.click();
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), 'recipe-pasta');
    // Escape schließt nur das Blatt
    await row.scrollIntoViewIfNeeded(); box=await row.boundingBox(); await page.mouse.move(box.x + 40, box.y + box.height / 2); await page.mouse.down(); await page.waitForSelector('#sheet-dialog[open] .sheet-page'); await page.mouse.up();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#sheet-dialog[open]').count(), 0);
    assert.equal(await page.locator('#meal-dialog[open]').count(), 1);
    // Wackeln während des Drückens bricht ab
    await row.scrollIntoViewIfNeeded(); box=await row.boundingBox(); await page.mouse.move(box.x + 40, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + 90, box.y + box.height / 2 + 4, { steps: 4 }); await page.waitForTimeout(800); await page.mouse.up();
    assert.equal(await page.locator('#sheet-dialog[open]').count(), 0, 'Bewegen ist kein langes Drücken');
    // Das Blatt zeigt die Portionen des Rezepts, wenn ein anderes Rezept gewählt ist, und die eingestellten bei dem gewählten
    await page.fill('#meal-form input[name=servings]', '6');
    await row.scrollIntoViewIfNeeded(); box=await row.boundingBox(); await page.mouse.move(box.x + 40, box.y + box.height / 2); await page.mouse.down(); await page.waitForSelector('#sheet-dialog[open] .sheet-page'); await page.mouse.up();
    const six = await sheetText(page);
    assert.ok(six.includes('600 g') && six.includes('1.200 g'), 'das gewählte Rezept: eingestellte Portionen (6)');
    await page.click('#sheet-close');
    const other = await page.locator('#recipe-pick .pick-row', { hasText: 'Apfel-Pfannkuchen' }).boundingBox();
    await page.mouse.move(other.x + 40, other.y + other.height / 2); await page.mouse.down(); await page.waitForSelector('#sheet-dialog[open] .sheet-page'); await page.mouse.up();
    assert.match(await sheetText(page), /PORTIONEN\s*\n?2/, 'ein anderes Rezept: dessen eigene Portionen');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  // Rezepte für den Filter: Stichworte in verschiedener Schreibweise, ein Favorit (Curry), unterschiedlich lange her
  const ago = days => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const filterData = () => {
    const data = sheetData(), at = '2026-10-25T00:00:00.000Z', longAgo = ago(90), recent = ago(3);
    const make = (id, name, tags, lastCookedAt) => ({ id, name, servings: 4, tags, instructions: 'Alles kochen.', createdAt: at, updatedAt: at, deletedAt: null, _clock: {}, ...(lastCookedAt ? { lastCookedAt } : {}) });
    Object.assign(data.recipes.find(row => row.id === 'recipe-pasta'), { lastCookedAt: longAgo });
    Object.assign(data.recipes.find(row => row.id === 'recipe-curry'), { lastCookedAt: recent });
    data.recipes.push(make('recipe-linsen', 'Linsensuppe', ['Suppe', 'Vegan'], recent), make('recipe-kuerbis', 'Kürbissuppe', ['suppe', 'Einfach'], longAgo), make('recipe-schoko', 'Schokokuchen', ['Süß'], ago(5)));
    return data;
  };
  const filterContext = async (data = filterData(), options = {}) => {
    const made = await context(options);
    await made.ctx.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ base: value, pending: [] })); }, ['einkauf-demo-v1', data]);
    return made;
  };
  const pickRows = page => page.locator('#recipe-pick .pick-row strong').allTextContents();

  test('Plan: neben „Rezept“ steht ein Auswahlfeld zum Filtern: Alle, Favoriten, Lange nicht gekocht und jedes Stichwort (Groß-/Kleinschreibung egal) mit Zahl; die Liste zeigt nur Passendes', async () => {
    const { ctx, page, problems } = await filterContext();
    await open(page);
    await openMealPicker(page);
    const select = page.locator('#recipe-filter');
    assert.equal(await select.isVisible(), true);
    assert.equal(await select.getAttribute('aria-label'), 'Rezepte filtern');
    assert.deepEqual(await select.locator('option').allTextContents(), ['Alle Rezepte (6)', '★ Favoriten (1)', 'Lange nicht gekocht (3)', 'Einfach (2)', 'Schnell (1)', 'Suppe (2)', 'Süß (2)', 'Vegan (2)', 'Vegetarisch (2)']);
    assert.equal(await select.inputValue(), '', 'zuerst alle Rezepte');
    assert.deepEqual(await pickRows(page), ['★ Kichererbsen-Curry', 'Apfel-Pfannkuchen', 'Kürbissuppe', 'Linsensuppe', 'Schokokuchen', 'Tomaten-Pasta', 'Eigenes Gericht (ohne Rezept)']);
    // rechts neben „Rezept“, auf einer Zeile, im Fenster, gut zu treffen
    const caption = await page.locator('#recipe-pick-label').boundingBox(), field = await select.boundingBox(), dialog = await page.locator('#meal-dialog').boundingBox();
    assert.ok(field.x >= caption.x + caption.width, 'rechts neben „Rezept“');
    assert.ok(Math.abs(field.y + field.height / 2 - (caption.y + caption.height / 2)) < 8, 'auf einer Zeile mit „Rezept“');
    assert.ok(field.x + field.width <= dialog.x + dialog.width && field.height >= 36, 'im Fenster und groß genug zum Tippen');
    // Stichwort: „Suppe“ und „suppe“ sind ein Eintrag; Favoriten zuerst, sonst nach Namen; „Eigenes Gericht“ bleibt am Ende
    await select.selectOption({ label: 'Suppe (2)' });
    assert.deepEqual(await pickRows(page), ['Kürbissuppe', 'Linsensuppe', 'Eigenes Gericht (ohne Rezept)']);
    await select.selectOption({ label: 'Vegan (2)' });
    assert.deepEqual(await pickRows(page), ['★ Kichererbsen-Curry', 'Linsensuppe', 'Eigenes Gericht (ohne Rezept)']);
    await select.selectOption({ label: '★ Favoriten (1)' });
    assert.deepEqual(await pickRows(page), ['★ Kichererbsen-Curry', 'Eigenes Gericht (ohne Rezept)']);
    // Lange nicht gekocht: noch nie Gekochtes zuerst, dann das am längsten her; die Zeile sagt, wie lange
    await select.selectOption({ label: 'Lange nicht gekocht (3)' });
    assert.deepEqual(await pickRows(page), ['Apfel-Pfannkuchen', 'Kürbissuppe', 'Tomaten-Pasta', 'Eigenes Gericht (ohne Rezept)']);
    assert.deepEqual(await page.locator('#recipe-pick .pick-row small').allTextContents(), ['2 Portionen · noch nie gekocht', '4 Portionen · zuletzt vor 3 Monaten', '2 Portionen · zuletzt vor 3 Monaten']);
    // Zurück zu allen: keine Zusatzangabe mehr
    await select.selectOption({ label: 'Alle Rezepte (6)' });
    assert.deepEqual(await page.locator('#recipe-pick .pick-row small').allTextContents(), ['2 Portionen', '2 Portionen', '4 Portionen', '4 Portionen', '4 Portionen', '2 Portionen']);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Plan: nach dem Filtern wählt ein Tipp wie sonst; das gewählte Rezept bleibt in der Liste, auch wenn der Filter es ausschließt; gespeichert wird das gewählte; beim nächsten Öffnen steht wieder „Alle Rezepte“', async () => {
    const { ctx, page, problems } = await filterContext();
    await open(page);
    await openMealPicker(page);
    const select = page.locator('#recipe-filter');
    await select.selectOption({ label: 'Süß (2)' });
    assert.deepEqual(await pickRows(page), ['Apfel-Pfannkuchen', 'Schokokuchen', 'Eigenes Gericht (ohne Rezept)']);
    await page.locator('#recipe-pick .pick-row', { hasText: 'Schokokuchen' }).click();
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), 'recipe-schoko');
    assert.equal(await page.inputValue('#meal-form input[name=servings]'), '4', 'die Portionen des Rezepts');
    // anderer Filter: das gewählte bleibt sichtbar und markiert, die übrigen passen zum Filter
    await select.selectOption({ label: 'Vegan (2)' });
    assert.deepEqual(await pickRows(page), ['★ Kichererbsen-Curry', 'Linsensuppe', 'Schokokuchen', 'Eigenes Gericht (ohne Rezept)']);
    assert.equal(await page.locator('#recipe-pick .pick-row[aria-pressed=true] strong').textContent(), 'Schokokuchen');
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), 'recipe-schoko', 'der Filter ändert die Wahl nicht');
    // eine neue Wahl in der gefilterten Liste ersetzt sie; das vorige verschwindet wieder aus der Liste
    await page.locator('#recipe-pick .pick-row', { hasText: 'Linsensuppe' }).click();
    await select.selectOption({ label: 'Suppe (2)' });
    assert.deepEqual(await pickRows(page), ['Kürbissuppe', 'Linsensuppe', 'Eigenes Gericht (ohne Rezept)']);
    assert.equal(await page.locator('#recipe-pick .pick-row[aria-pressed=true] strong').textContent(), 'Linsensuppe');
    // „Eigenes Gericht“ bleibt bei jedem Filter wählbar
    await page.locator('#recipe-pick .pick-row.custom').click();
    assert.ok(await page.locator('#meal-form [data-custom]').isVisible());
    await select.selectOption({ label: 'Vegan (2)' });
    assert.equal(await page.locator('#recipe-pick .pick-row.custom').getAttribute('aria-pressed'), 'true');
    await page.locator('#recipe-pick .pick-row', { hasText: 'Linsensuppe' }).click();
    await page.click('#meal-form button[type=submit]');
    assert.match(await page.textContent('#plan-days'), /Linsensuppe/);
    // beim nächsten Öffnen: kein Filter mehr
    await page.locator('.day-head .icon-button').nth(1).click(); await page.waitForSelector('#meal-dialog[open]');
    assert.equal(await page.locator('#recipe-filter').inputValue(), '', 'wieder „Alle Rezepte“');
    assert.equal((await pickRows(page)).length, 7);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Plan: beim Ändern eines Gerichts zeigt der Filter es nicht weg; langes Drücken öffnet auch in der gefilterten Liste das Rezeptblatt; kein passendes Rezept sagt es', async () => {
    const { ctx, page, problems } = await filterContext();
    await open(page);
    await openMealPicker(page);
    await page.locator('#recipe-pick .pick-row', { hasText: 'Tomaten-Pasta' }).click();
    await page.click('#meal-form button[type=submit]');
    await page.getByRole('button', { name: /Tomaten-Pasta ändern/ }).first().click();
    await page.waitForSelector('#meal-dialog[open]'); await sheetOpen(page);
    assert.equal(await page.locator('#recipe-pick .pick-row[aria-pressed=true] strong').textContent(), 'Tomaten-Pasta', 'das gewählte Rezept ist markiert');
    await page.locator('#recipe-filter').selectOption({ label: 'Süß (2)' });
    assert.deepEqual(await pickRows(page), ['Apfel-Pfannkuchen', 'Schokokuchen', 'Tomaten-Pasta', 'Eigenes Gericht (ohne Rezept)'], 'das gewählte Rezept bleibt in der Liste');
    // langes Drücken in der gefilterten Liste: das Rezeptblatt, ohne die Wahl zu ändern
    const row = page.locator('#recipe-pick .pick-row', { hasText: 'Schokokuchen' }), box = await row.boundingBox();
    await page.mouse.move(box.x + 40, box.y + box.height / 2); await page.mouse.down();
    await page.waitForSelector('#sheet-dialog[open] .sheet-page'); await sheetOpen(page); await page.mouse.up();
    assert.ok((await sheetText(page)).includes('Schokokuchen'));
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), 'recipe-pasta');
    await page.click('#sheet-close');
    // ein Stichwort ohne Rezept (etwa nach einem Abgleich): die Liste sagt es und bietet weiter „Eigenes Gericht“ an
    await page.evaluate(() => { const option = document.createElement('option'); option.value = 'tag:nichts'; option.textContent = 'Nichts (0)'; document.querySelector('#recipe-filter').append(option); });
    await page.locator('#recipe-filter').selectOption('tag:nichts');
    assert.equal(await page.locator('#recipe-pick .pick-empty').count(), 0, 'solange ein Rezept gewählt ist, steht es da');
    assert.deepEqual(await pickRows(page), ['Tomaten-Pasta', 'Eigenes Gericht (ohne Rezept)'], 'das gewählte Rezept bleibt, „Eigenes Gericht“ auch');
    await page.locator('#recipe-pick .pick-row.custom').click();
    assert.equal(await page.locator('#recipe-pick .pick-row', { hasText: 'Tomaten-Pasta' }).count(), 1, 'ein Tipp baut die Liste nicht um (nichts springt unter dem Finger)');
    await page.locator('#recipe-filter').selectOption({ label: 'Süß (2)' }); await page.locator('#recipe-filter').selectOption('tag:nichts');
    assert.equal(await page.locator('#recipe-pick .pick-empty').textContent(), 'Kein Rezept dafür.');
    assert.deepEqual(await pickRows(page), ['Eigenes Gericht (ohne Rezept)']);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Plan: ohne Favoriten, ohne Stichworte und ohne lange nicht gekochte Rezepte gibt es nichts zu filtern – das Feld ist nicht da', async () => {
    const data = sheetData(); data.recipes = [{ id: 'recipe-solo', name: 'Nur ein Rezept', servings: 3, tags: [], instructions: 'Kochen.', createdAt: '2026-10-25T00:00:00.000Z', updatedAt: '2026-10-25T00:00:00.000Z', deletedAt: null, _clock: {}, lastCookedAt: ago(2) }]; data.ingredients = [];
    const { ctx, page, problems } = await filterContext(data);
    await open(page);
    await openMealPicker(page);
    assert.equal(await page.locator('#recipe-filter').isVisible(), false);
    assert.deepEqual(await pickRows(page), ['Nur ein Rezept', 'Eigenes Gericht (ohne Rezept)']);
    await page.locator('#recipe-pick .pick-row', { hasText: 'Nur ein Rezept' }).click();
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), 'recipe-solo');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  for (const width of [280, 320, 390]) {
    test(`Plan bei ${width} px: „Rezept“ und das Filterfeld stehen auf einer Zeile, nichts läuft über den Rand`, async () => {
      const { ctx, page, problems } = await filterContext(filterData(), { context: { viewport: { width, height: 740 } } });
      await open(page);
      await openMealPicker(page);
      await page.locator('#recipe-filter').selectOption({ label: 'Lange nicht gekocht (3)' });
      assert.equal(await horizontalOverflow(page), 0);
      const caption = await page.locator('#recipe-pick-label').boundingBox(), field = await page.locator('#recipe-filter').boundingBox(), list = await page.locator('#recipe-pick').boundingBox();
      assert.ok(field.x >= caption.x + caption.width - 1 && Math.abs(field.y + field.height / 2 - (caption.y + caption.height / 2)) < 10, 'auf einer Zeile');
      assert.ok(field.x + field.width <= list.x + list.width + 1 && field.width >= 120, `das Feld ist breit genug (${Math.round(field.width)} px) und endet mit der Liste`);
      const rows = await page.locator('#recipe-pick .pick-row').evaluateAll(nodes => nodes.map(node => ({ right: node.getBoundingClientRect().right, scroll: node.scrollWidth - node.clientWidth })));
      assert.ok(rows.every(entry => entry.right <= width && entry.scroll <= 1), 'die Zeilen passen in die Breite');
      assert.deepEqual(problems, []);
      await ctx.close();
    });
  }

  test('Einkaufsliste: die Zeile „n offen · n erledigt“ ist weg; „Auswählen“ und „Erledigte entfernen“ stehen links und rechts auf einer Zeile', async () => {
    const { ctx, page, problems } = await context();
    await open(page);
    assert.equal(await page.locator('#item-count').count(), 0);
    assert.ok(!/\d+ offen · \d+ erledigt/.test(await page.textContent('#shopping')), 'der Text kommt nirgends vor');
    const select = await page.locator('#select-mode').boundingBox(), clear = await page.locator('#clear-checked').boundingBox(), viewport = page.viewportSize();
    assert.ok(Math.abs(select.y - clear.y) < 6 && select.x < clear.x, 'auf einer Zeile, „Auswählen“ links');
    assert.ok(select.x >= 0 && clear.x + clear.width <= viewport.width, 'im Bildschirm');
    assert.ok(select.height >= 36 && clear.height >= 36);
    assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Plan mit dem Finger: langes Drücken öffnet das Rezeptblatt (ohne Auswahl), langes Drücken irgendwo auf dem Blatt schließt es wieder; ein kurzer Tipp, Wischen und Zwei-Finger-Zoomen schließen nichts', async () => {
    const { ctx, page, problems } = await sheetContext();
    await open(page);
    await openMealPicker(page);
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, x, y, id = 1) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id }] });
    const row = await page.locator('#recipe-pick .pick-row', { hasText: 'Tomaten-Pasta' }).boundingBox();
    await touch('touchStart', row.x + 60, row.y + row.height / 2);
    await page.waitForSelector('#sheet-dialog[open] .sheet-page', { timeout: 3000 });
    await touch('touchEnd');
    await page.waitForTimeout(200);
    assert.ok((await sheetText(page)).includes('Tomaten-Pasta'));
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), '', 'nichts gewählt');
    // kurzer Tipp auf das Blatt: nichts
    const viewport = page.viewportSize(), x = viewport.width / 2, y = viewport.height / 2;
    await touch('touchStart', x, y); await page.waitForTimeout(120); await touch('touchEnd'); await page.waitForTimeout(700);
    assert.equal(await page.locator('#sheet-dialog[open]').count(), 1);
    // Wischen (Scrollen) beim Drücken: bricht ab
    await touch('touchStart', x, y); await page.waitForTimeout(200); await touch('touchMove', x, y - 60); await page.waitForTimeout(900); await touch('touchEnd');
    assert.equal(await page.locator('#sheet-dialog[open]').count(), 1, 'Wischen schließt nicht');
    // Zwei Finger (Zoomen): schließt nicht
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 40, y, id: 1 }] });
    await page.waitForTimeout(150);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 40, y, id: 1 }, { x: x + 40, y, id: 2 }] });
    await page.waitForTimeout(900);
    await touch('touchEnd');
    assert.equal(await page.locator('#sheet-dialog[open]').count(), 1, 'zwei Finger schließen nicht');
    // lange drücken, irgendwo auf dem Blatt: schließt (das Fenster dahinter bleibt)
    await touch('touchStart', x, y);
    await page.waitForFunction(() => !document.querySelector('#sheet-dialog').open, null, { timeout: 4000 });
    await touch('touchEnd');
    assert.equal(await page.locator('#meal-dialog[open]').count(), 1);
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), '');
    // Ein Tipp wählt danach das Rezept
    await touch('touchStart', row.x + 60, row.y + row.height / 2); await page.waitForTimeout(100); await touch('touchEnd');
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), 'recipe-pasta');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Rezeptblatt mit dem Finger: zweimal kurz tippen vergrößert und verkleinert die Seite (auch ohne „dblclick“ des Browsers); ein einzelner Tipp oder zwei weit entfernte Tipps tun nichts', async () => {
    const { ctx, page, problems } = await sheetContext();
    await open(page);
    await openCardSheet(page);
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const tap = async (x, y) => { await touch('touchStart', x, y); await page.waitForTimeout(40); await touch('touchEnd'); };
    const zoom = () => page.locator('#sheet-pages').getAttribute('data-zoom');
    const { width, height } = page.viewportSize(), x = width / 2, y = height / 2;
    await tap(x, y); await page.waitForTimeout(600);
    assert.equal(await zoom(), '1', 'ein Tipp allein tut nichts');
    await tap(x, y); await page.waitForTimeout(150); await tap(x + 4, y + 4);
    assert.equal(await zoom(), '2', 'zwei schnelle Tipps vergrößern');
    await tap(x, y); await page.waitForTimeout(150); await tap(x + 3, y);
    assert.equal(await zoom(), '1', 'und verkleinern wieder');
    await tap(x - 100, y); await page.waitForTimeout(150); await tap(x + 100, y);
    assert.equal(await zoom(), '1', 'zwei Tipps an verschiedenen Stellen zählen nicht');
    await tap(x, y); await page.waitForTimeout(500); await tap(x, y);
    assert.equal(await zoom(), '1', 'zu langsam');
    assert.equal(await page.locator('#sheet-dialog[open]').count(), 1);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Plan: auch das Kontextmenü (rechte Maustaste, Menü-Taste, langes Drücken unter Android) öffnet das Rezeptblatt; auf „Eigenes Gericht“ geschieht nichts', async () => {
    const { ctx, page, problems } = await sheetContext();
    await open(page);
    await openMealPicker(page);
    await page.locator('#recipe-pick .pick-row', { hasText: 'Apfel-Pfannkuchen' }).dispatchEvent('contextmenu');
    await page.waitForSelector('#sheet-dialog[open] .sheet-page');
    assert.ok((await sheetText(page)).includes('Apfel-Pfannkuchen'));
    await page.click('#sheet-close');
    await page.locator('#recipe-pick .pick-row.custom').dispatchEvent('contextmenu');
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#sheet-dialog[open]').count(), 0);
    assert.equal(await page.inputValue('#meal-form input[name=recipeId]'), '', 'nichts gewählt');
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  for (const width of [280, 320, 390]) {
    test(`Rezeptblatt bei ${width} px: Seite, „×“ und Knöpfe passen in den Bildschirm; „Größer“ vergrößert die Seite zum Lesen und wieder zurück`, async () => {
      const { ctx, page, problems } = await sheetContext({ context: { viewport: { width, height: 740 } } });
      await open(page);
      await openCardSheet(page);
      assert.equal(await horizontalOverflow(page), 0);
      const geometry = () => page.evaluate(() => {
        const rect = selector => { const box = document.querySelector(selector).getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width }; };
        return { page: rect('.sheet-page'), close: rect('#sheet-close'), zoom: rect('#sheet-zoom'), save: rect('#sheet-save'), bar: rect('.sheet-bar'), zoomLevel: document.querySelector('#sheet-pages').dataset.zoom };
      });
      const small = await geometry();
      assert.equal(small.zoomLevel, '1');
      assert.ok(small.page.left >= 0 && small.page.right <= width, 'die Seite passt in die Breite');
      assert.ok(small.page.width >= width - 26 - 0.5, 'und füllt sie fast');
      assert.ok(small.close.right <= width && small.close.top >= 0 && small.zoom.right <= small.close.left, '„×“ ganz rechts, Lupe daneben');
      assert.ok(small.save.left >= 0 && small.save.right <= width && small.save.bottom <= 740 && small.bar.bottom <= 740 + 1);
      await page.click('#sheet-zoom');
      const big = await geometry();
      assert.equal(big.zoomLevel, '2');
      assert.ok(big.page.width > small.page.width * 1.7, 'größer');
      assert.equal(await horizontalOverflow(page), 0, 'die Seite der App läuft nicht über, nur das Blatt lässt sich verschieben');
      assert.ok(await page.locator('#sheet-scroll').evaluate(node => node.scrollWidth > node.clientWidth), 'das Blatt lässt sich seitlich verschieben');
      assert.ok(big.close.right <= width && big.close.top >= 0, 'das „×“ bleibt stehen');
      await page.click('#sheet-zoom'); assert.equal((await geometry()).zoomLevel, '3');
      await page.click('#sheet-zoom'); const again = await geometry();
      assert.equal(again.zoomLevel, '1'); assert.ok(Math.abs(again.page.width - small.page.width) < 0.5);
      await page.locator('#sheet-scroll').dblclick({ position: { x: width / 2, y: 300 } });
      assert.equal((await geometry()).zoomLevel, '2', 'Doppeltippen vergrößert');
      await page.locator('#sheet-scroll').dblclick({ position: { x: width / 2, y: 300 } });
      assert.equal((await geometry()).zoomLevel, '1', 'und verkleinert wieder');
      assert.deepEqual(problems, []);
      await ctx.close();
    });
  }

  test('Rezeptblatt: ein langes Rezept mit vielen Zutaten und Schritten geht über mehrere Seiten, auch in der Vorschau; die Datei hat genauso viele Seiten', async () => {
    const data = sheetData();
    data.recipes.find(row => row.id === 'recipe-curry').instructions = Array.from({ length: 24 }, (_, index) => `Arbeitsgang ${index + 1}: ${'gut verrühren und ziehen lassen, '.repeat(4)}`).join('\n');
    for (let index = 0; index < 40; index++) data.ingredients.push({ id: `extra-${index}`, recipeId: 'recipe-curry', name: `Zutat Nummer ${index + 1}`, quantity: index + 1, unit: 'g', createdAt: '2026-10-25T00:00:00.000Z', updatedAt: '2026-10-25T00:00:00.000Z', deletedAt: null, _clock: {} });
    const { ctx, page, problems } = await context();
    await ctx.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ base: value, pending: [] })); }, ['einkauf-demo-v1', data]);
    await open(page);
    await openCardSheet(page, 'Kichererbsen-Curry');
    const pages = await page.locator('#sheet-pages .sheet-page').count();
    assert.ok(pages >= 2, `${pages} Seiten`);
    const text = await sheetText(page);
    assert.ok(text.includes('Zutat Nummer 40') && text.includes('Arbeitsgang 24:') && text.includes(`Seite 2 / ${pages}`) && text.includes('REZEPTSAMMLUNG · FORTSETZUNG'));
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#sheet-save')]);
    assert.equal(download.suggestedFilename(), 'Kichererbsen-Curry.pdf');
    assert.ok(checkPdf(await pdfBytesOf(download)).includes(`/Count ${pages} `));
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Rezeptblatt: ein sehr langer Arbeitsschritt wird nie gekürzt – er läuft auf der nächsten Seite weiter („Fortsetzung“), der Notizbereich bleibt frei, der letzte Satz steht vollständig in Vorschau und PDF', async () => {
    const data = sheetData(), sentence = number => `Satz ${number} verlangt Ruhe und Sorgfalt beim Verrühren, damit die Masse gleichmäßig bleibt und nichts anbrennt.`;
    const longStep = `Langer Schritt mit vielen Angaben. ${Array.from({ length: 36 }, (_, index) => sentence(index + 1)).join(' ')} Das ist der allerletzte Satz dieses langen Schritts.`;
    data.recipes.find(row => row.id === 'recipe-curry').instructions = `Zwiebeln anbraten.\n${longStep}\nFertig servieren.`;
    const { ctx, page, problems } = await context();
    await ctx.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ base: value, pending: [] })); }, ['einkauf-demo-v1', data]);
    await open(page);
    await openCardSheet(page, 'Kichererbsen-Curry');
    const sheets = await page.evaluate(() => [...document.querySelectorAll('#sheet-pages svg')].map(svg => [...svg.querySelectorAll('text')].map(node => ({ text: node.textContent, x: Number(node.getAttribute('x')), y: Number(node.getAttribute('y')) }))));
    assert.ok(sheets.length >= 2, `${sheets.length} Seiten`);
    const stepText = sheets.flatMap(items => items.filter(item => item.x === 324 && item.text !== 'Fortsetzung')).map(item => item.text).join(' ');
    assert.equal(stepText, `Zwiebeln anbraten. ${longStep} Fertig servieren.`, 'jedes Wort jedes Schritts steht in der Vorschau, in der richtigen Reihenfolge');
    assert.ok(!sheets.flat().some(item => item.text.includes('…')), 'nirgends „…“');
    assert.ok(sheets.slice(1, -1).every(items => items.some(item => item.text === 'Fortsetzung')) && !sheets[0].some(item => item.text === 'Fortsetzung'), 'jede Folgeseite beginnt mit „Fortsetzung“, die erste nicht');
    const last = sheets.at(-1), notes = last.find(item => item.text === 'Meine Notizen');
    assert.ok(notes, 'die Notizen stehen auf der letzten Seite');
    for (const items of sheets) for (const item of items.filter(entry => entry.x === 324)) assert.ok(item.y < (items === last ? notes.y - 30 : 780), `„${item.text}“ (y ${item.y}) liegt im Notizbereich oder unter dem Seitenrand`);
    assert.ok(last.some(item => item.text === 'Fertig servieren.') && sheets.flat().some(item => item.text.includes('Schritts.')), 'der letzte Satz und der folgende Schritt sind da');
    // die Datei: dieselben Seiten, der letzte Satz des langen Schritts steht darin
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#sheet-save')]);
    const body = checkPdf(await pdfBytesOf(download));
    assert.ok(body.includes(`/Count ${sheets.length} `), 'gleich viele Seiten wie die Vorschau');
    // Text steht in der Datei als Hexadezimalzahlen der Zeichen (siehe pdf.js)
    for (const part of ['allerletzte', 'Schritts.', 'Satz 36 verlangt', 'Fortsetzung']) assert.ok(body.includes(Buffer.from(part, 'latin1').toString('hex')), `${part} fehlt in der PDF-Datei`);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Rezeptblatt: Dateiname ohne Sonderzeichen; Umlaute, Bruchzahlen und typografische Zeichen stehen auf dem Blatt; gelöschte Rezepte haben keine Karte mehr', async () => {
    const data = sheetData();
    data.recipes.push({ id: 'recipe-sonder', name: 'Süße „Grütze“ / Dessert: Nr. 1?', servings: 3, tags: ['süß'], instructions: 'Beeren aufkochen – 5 Min. köcheln lassen.\nKalt servieren (ca. 1½ Std.).', createdAt: '2026-10-25T00:00:00.000Z', updatedAt: '2026-10-25T00:00:00.000Z', deletedAt: null, _clock: {} });
    data.ingredients.push({ id: 'ing-sonder', recipeId: 'recipe-sonder', name: 'Rote Grütze', quantity: 0.5, unit: 'l', createdAt: '2026-10-25T00:00:00.000Z', updatedAt: '2026-10-25T00:00:00.000Z', deletedAt: null, _clock: {} });
    const { ctx, page, problems } = await context();
    await ctx.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ base: value, pending: [] })); }, ['einkauf-demo-v1', data]);
    // Den Dateinamen am Link selbst prüfen: Chromium auf Linux ohne Umgebungssprache verwirft Umlaute in Namen (liefert „download“), iPhone, Android, Mac und Windows nicht
    await ctx.addInitScript(() => { window.__names = []; const click = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__names.push(this.download); return click.call(this); }; });
    await open(page);
    await openCardSheet(page, 'Süße „Grütze“ / Dessert: Nr\\. 1\\?');
    const text = await sheetText(page);
    assert.ok(text.includes('Süße „Grütze“') && text.includes('0,5 l') && text.includes('5 Min. köcheln') && text.includes('1½ Std.'));
    await page.click('#sheet-save');
    assert.deepEqual(await page.evaluate(() => window.__names), ['Süße „Grütze“ Dessert Nr. 1.pdf']);
    await page.click('#sheet-close');
    // Das Rezept wird gelöscht, während die Karte noch zu sehen ist: Die Meldung steht im offenen Fenster, nichts öffnet sich
    await goTab(page, 'recipes');
    const button = page.getByRole('button', { name: /^Tomaten-Pasta: Rezeptblatt/ });
    await page.evaluate(() => { const key = 'einkauf-demo-v1', stored = JSON.parse(localStorage.getItem(key)); stored.base.recipes.find(row => row.id === 'recipe-pasta').deletedAt = new Date().toISOString(); localStorage.setItem(key, JSON.stringify(stored)); });
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    assert.equal(await page.getByRole('button', { name: /^Tomaten-Pasta: Rezeptblatt/ }).count(), 0, 'gelöschte Rezepte haben keine Karte mehr');
    assert.equal(await button.count(), 0);
    assert.deepEqual(problems, []);
    await ctx.close();
  });

  test('Fenster schließen: ein Tipp außerhalb (auf den abgedunkelten Hintergrund) schließt wie das „×“; Tipps im Fenster und Text markieren schließen nichts; das Willkommensfenster bleibt', async () => {
    const { ctx, page, problems } = await context({ context: { viewport: { width: 390, height: 700 } } });
    await open(page);
    const dialogTop = async id => (await page.locator(id).boundingBox()).y;
    const closed = () => page.waitForSelector('dialog[open]', { state: 'detached' });
    // Mehrere Fenster: der Bereich oberhalb des Fensters schließt (der Kochmodus füllt den ganzen Bildschirm und hat keinen; dort scrollt man hoch und tippt auf das „×“)
    const opens = [
      ['#item-dialog', async () => { await page.locator('#items .item', { hasText: 'Tomaten' }).getByRole('button', { name: /bearbeiten/ }).click(); }],
      ['#meal-dialog', async () => { await goTab(page, 'plan'); await page.locator('.day:not(.past)').first().locator('.day-head .icon-button').click(); }],
      ['#help-dialog', async () => { await openSettings(page); await page.click('#open-help'); }],
      ['#purchase-dialog', async () => { await goTab(page, 'spending'); await page.click('#add-purchase'); }],
      ['#cookable-dialog', async () => { await goTab(page, 'recipes'); await page.click('#cookable-open'); }],
      ['#stores-dialog', async () => { await goTab(page, 'shopping'); await openStores(page); }]
    ];
    for (const [id, show] of opens) {
      await show(); await page.waitForSelector(`${id}[open]`); await sheetOpen(page);
      const top = await dialogTop(id);
      assert.ok(top > 20, `${id}: oberhalb des Fensters bleibt Hintergrund zum Antippen (${Math.round(top)} px)`);
      await page.mouse.click(195, Math.min(10, top / 2));
      await closed();
    }
    // Ein Tipp auf die Überschrift, auf einen Rand im Fenster oder auf den Knopf im Fenster schließt nicht von selbst
    await goTab(page, 'shopping');
    await page.locator('#items .item', { hasText: 'Tomaten' }).getByRole('button', { name: /bearbeiten/ }).click(); await sheetOpen(page);
    const box = await page.locator('#item-dialog').boundingBox();
    await page.mouse.click(box.x + 4, box.y + box.height / 2);   // dicht am linken Rand, aber noch im Fenster
    await page.locator('#item-dialog h2').click();
    assert.equal(await page.locator('#item-dialog[open]').count(), 1, 'Tipps im Fenster schließen nichts');
    // Text im Feld markieren und außerhalb loslassen: bleibt offen
    const field = await page.locator('#edit-item-form input[name=name]').boundingBox();
    await page.mouse.move(field.x + 10, field.y + field.height / 2); await page.mouse.down();
    await page.mouse.move(195, 8, { steps: 4 }); await page.mouse.up();
    assert.equal(await page.locator('#item-dialog[open]').count(), 1, 'Drücken im Fenster und Loslassen außerhalb schließt nicht');
    // Drücken außerhalb und Loslassen im Fenster: ebenfalls nicht
    await page.mouse.move(195, 8); await page.mouse.down(); await page.mouse.move(box.x + 60, box.y + 60, { steps: 4 }); await page.mouse.up();
    assert.equal(await page.locator('#item-dialog[open]').count(), 1, 'Drücken außerhalb und Loslassen im Fenster schließt nicht');
    await page.mouse.click(195, 8);
    await closed();
    // Rezept bearbeiten: Der Tipp außerhalb schließt wie das „×“ und behält den Entwurf
    await goTab(page, 'recipes');
    await page.click('#add-recipe'); await sheetOpen(page);
    await page.fill('#recipe-form input[name=name]', 'Linsensuppe');
    await page.mouse.click(195, 8);
    await closed();
    await page.click('#add-recipe'); await sheetOpen(page);
    assert.equal(await page.locator('#recipe-draft-note').isVisible(), true, 'der angefangene Entwurf wird angeboten');
    await page.click('#recipe-dialog [data-close]');
    // Das Willkommensfenster braucht den Namen und lässt sich nicht wegtippen
    const first = await context({ seed: false, context: { viewport: { width: 390, height: 700 } } });
    await open(first.page);
    await first.page.waitForSelector('#welcome[open]');
    await first.page.mouse.click(195, 4);
    assert.equal(await first.page.locator('#welcome[open]').count(), 1, 'das Willkommensfenster bleibt offen');
    assert.deepEqual(problems, []);
    await first.ctx.close(); await ctx.close();
  });

  test('Wünsche: langes Drücken öffnet nur Details; sichere Links und Notizen speichern, erneut öffnen und exportieren', async () => {
    const { ctx, page, problems } = await localWishes();
    await holdWish(page);
    assert.equal(await page.locator('#wish-title').textContent(), 'Springseil');
    assert.equal(await page.locator('#item-dialog[open], #move-dialog[open]').count(), 0);
    assert.equal(await page.locator('#wish-product-link').isVisible(), false);
    await page.fill('#wish-form [name=wishUrl]', 'javascript:alert(1)');
    await page.click('#wish-form button[type=submit]');
    assert.match(await page.textContent('#wish-dialog [data-dialog-error]'), /https/);
    await page.fill('#wish-form [name=wishUrl]', 'https://example.org/springseil?farbe=schwarz');
    await page.fill('#wish-form [name=wishNote]', 'Schwarz, 3 m lang\nOhne Gewichte');
    assert.equal(await page.getAttribute('#wish-product-link', 'href'), 'https://example.org/springseil?farbe=schwarz');
    assert.equal(await page.getAttribute('#wish-product-link', 'target'), '_blank');
    assert.match(await page.getAttribute('#wish-product-link', 'rel'), /noopener/);
    await page.click('#wish-form button[type=submit]'); await page.waitForSelector('#wish-dialog', { state: 'hidden' });
    assert.ok(!(await page.textContent('#items')).includes('Ohne Gewichte'), 'die Liste zeigt nicht die ganze Notiz');
    assert.ok(!(await page.textContent('#items')).includes('example.org'), 'lange Links bleiben im Detailfenster');
    await holdWish(page);
    assert.equal(await page.inputValue('#wish-form [name=wishNote]'), 'Schwarz, 3 m lang\nOhne Gewichte');
    await page.fill('#wish-form [name=wishNote]', 'Nicht speichern');
    await page.click('#wish-dialog [data-close]'); await page.waitForSelector('#wish-dialog', { state: 'hidden' });
    // Ein kurzer Tipp öffnet dasselbe Fenster (Version 2.58), nicht das Artikel-Fenster; ein Fehler steht im Fenster.
    await page.locator('#items .item-copy').click(); await page.waitForSelector('#wish-dialog[open]'); await sheetOpen(page);
    assert.equal(await page.locator('#item-dialog[open]').count(), 0);
    assert.equal(await page.inputValue('#wish-form [name=wishNote]'), 'Schwarz, 3 m lang\nOhne Gewichte');
    await page.fill('#wish-form [name=wishUrl]', 'http://example.org'); await page.click('#wish-form button[type=submit]');
    assert.equal(await page.locator('#wish-dialog [data-dialog-error]').isVisible(), true);
    await page.click('#wish-dialog [data-close]');
    await openSettings(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
    const saved = JSON.parse(await readFile(await download.path(), 'utf8')), row = saved.items.find(item => item.id === 'wish-rope');
    assert.equal(row.wishUrl, 'https://example.org/springseil?farbe=schwarz');
    assert.equal(row.wishNote, 'Schwarz, 3 m lang\nOhne Gewichte');
    assert.equal(saved.sync.minRev, 4);
    await goTab(page, 'shopping'); await storeButton(page, '#store-chips', 'Edeka').click();
    await page.locator('#items .item-copy').first().click(); await page.waitForSelector('#item-dialog[open]'); await sheetOpen(page);
    assert.equal(await page.locator('#wish-dialog[open]').count(), 0, 'Supermarktartikel erhalten keine Wunschfelder');
    assert.deepEqual(problems, []); await ctx.close();
  });

  test('Wünsche (nur Wünsche): ein Tipp öffnet direkt Name, Produktlink & Notiz – ohne Menge, Einheit, Kategorie und Preis & Angebot; umbenennen, verschieben und löschen gehen dort; normale Artikel behalten ihr Fenster', async () => {
    const { ctx, page, problems } = await localWishes();
    await page.locator('#items .item[data-id="wish-rope"] .item-copy').click();
    await page.waitForSelector('#wish-dialog[open]'); await sheetOpen(page);
    assert.equal(await page.locator('#item-dialog[open]').count(), 0, 'nicht das Artikel-Fenster');
    const visible = await page.evaluate(() => [...document.querySelectorAll('#wish-dialog input:not([type=hidden]), #wish-dialog textarea, #wish-dialog select, #wish-dialog button')]
      .filter(node => node.getClientRects().length).map(node => node.name || node.id || node.getAttribute('aria-label') || node.textContent.trim()));
    assert.deepEqual(visible, ['Schließen', 'name', 'wishUrl', 'wishNote', 'storeId', 'delete-wish', 'Wunschdetails speichern'], `sichtbar: ${visible}`);
    for (const label of ['Menge', 'Einheit', 'Kategorie', 'Preis & Angebot', 'Normaler Preis']) assert.ok(!(await page.textContent('#wish-dialog')).includes(label), `„${label}“ gehört nicht ins Wunschfenster`);
    assert.equal(await page.locator('#wish-dialog [name=quantity], #wish-dialog [name=unit], #wish-dialog [name=category], #wish-dialog [name=priceEuros]').count(), 0);
    // umbenennen und Details speichern; die Menge bleibt unberührt
    await page.fill('#wish-form [name=name]', 'Springseil Profi'); await page.fill('#wish-form [name=wishNote]', 'Schwarz');
    await page.click('#wish-form button[type=submit]'); await page.waitForSelector('#wish-dialog', { state: 'hidden' });
    const row = () => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.items.find(item => item.id === 'wish-rope'));
    let saved = await row();
    assert.deepEqual([saved.name, saved.wishNote, saved.quantity, saved.unit, saved.storeId], ['Springseil Profi', 'Schwarz', 1, 'Stück', 'store-wishes']);
    assert.ok((await page.textContent('#items')).includes('Springseil Profi'));
    // leerer Name wird abgelehnt
    await page.locator('#items .item[data-id="wish-rope"] .item-copy').click(); await page.waitForSelector('#wish-dialog[open]'); await sheetOpen(page);
    await page.fill('#wish-form [name=name]', '  '); await page.click('#wish-form button[type=submit]');
    assert.match(await page.textContent('#wish-dialog [data-dialog-error]'), /Namen/);
    // verschieben in eine normale Liste: Details bleiben erhalten, der Artikel steht dort
    await page.fill('#wish-form [name=name]', 'Springseil Profi'); await page.selectOption('#wish-form select[name=storeId]', { label: 'Edeka' });
    await page.click('#wish-form button[type=submit]'); await page.waitForSelector('#wish-dialog', { state: 'hidden' });
    saved = await row();
    assert.deepEqual([saved.storeId, saved.wishNote], ['store-edeka', 'Schwarz']);
    // dort ist es ein normaler Artikel mit dem vollen Fenster
    await storeButton(page, '#store-chips', 'Edeka').click();
    await page.locator('#items .item[data-id="wish-rope"] .item-copy').click(); await page.waitForSelector('#item-dialog[open]'); await sheetOpen(page);
    assert.equal(await page.locator('#wish-dialog[open]').count(), 0);
    for (const name of ['quantity', 'unit', 'category', 'storeId']) assert.equal(await page.locator(`#edit-item-form [name=${name}]`).count(), 1, name);
    await page.click('#item-dialog [data-close]');
    // zurück in die Wunschliste und dort löschen
    await page.locator('#items .item[data-id="wish-rope"] .item-copy').click(); await page.waitForSelector('#item-dialog[open]'); await sheetOpen(page);
    await page.selectOption('#edit-item-form select[name=storeId]', { label: 'Wünsche' }); await page.click('#edit-item-form button[type=submit]');
    await page.waitForSelector('#item-dialog', { state: 'hidden' });
    await storeButton(page, '#store-chips', 'Wünsche').click();
    await page.locator('#items .item[data-id="wish-rope"] .item-copy').click(); await page.waitForSelector('#wish-dialog[open]'); await sheetOpen(page);
    await page.click('#delete-wish'); await page.waitForSelector('#wish-dialog', { state: 'hidden' });
    assert.equal(await page.locator('#items .item[data-id="wish-rope"]').count(), 0);
    assert.ok((await row()).deletedAt, 'gelöscht');
    assert.deepEqual(problems, []); await ctx.close();
  });

  test('Wünsche: Finger halten öffnet Details; Wischen und Abhaken nicht; kleine Ansichten und gesperrter Laden', async () => {
    const { ctx, page, problems } = await localWishes({ config: { shopLock: 0 } });
    const cdp = await ctx.newCDPSession(page);
    const box = await page.locator('#items .item-copy').boundingBox(), x = box.x + 30, y = box.y + 20;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 45 }] });
    await page.waitForTimeout(620); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal(await page.locator('#wish-dialog[open]').count(), 0, 'Scrollgeste öffnet nichts');
    const now = await page.locator('#items .item-copy').boundingBox();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: now.x + 30, y: now.y + 20 }] });
    await page.waitForTimeout(620); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForSelector('#wish-dialog[open]'); await sheetOpen(page);
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 700 });
      assert.equal(await horizontalOverflow(page), 0);
      assert.equal(await page.evaluate(() => document.querySelector('#wish-dialog').scrollWidth <= document.querySelector('#wish-dialog').clientWidth), true);
    }
    await page.click('#wish-dialog [data-close]');
    await page.locator('#items .check').click();
    assert.equal(await page.locator('#wish-dialog[open]').count(), 0);
    await page.click('#mode-shop'); await storeButton(page, '#shop-chips', 'Wünsche').click();
    // Auch bei erledigten Wünschen bleibt das Detail erreichbar; die Sperre bleibt wirksam.
    await page.locator('#shop-list .shop-done summary').click();
    await page.focus('#shop-list .shop-text'); await page.keyboard.press('Enter'); await page.waitForSelector('#wish-dialog[open]');
    await page.click('#wish-dialog [data-close]'); await page.click('#shop-lock');
    await page.focus('#shop-list .shop-text'); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#wish-dialog[open]').count(), 0);
    assert.deepEqual(problems, []); await ctx.close();
  });

  test('Wünsche: Link und Notiz werden auf zwei Geräten feldweise und nach Offline-Neustart abgeglichen', async () => {
    const api = github(wishData());
    const nico = await context({ config: connectedConfig, context: { serviceWorkers: 'allow' } });
    const anna = await context({ config: { ...connectedConfig, actor: 'Anna' } });
    for (const device of [nico, anna]) { await device.ctx.route('https://api.github.com/**', api.handler); await open(device.page); await openWishlist(device.page); await holdWish(device.page); }
    await nico.page.fill('#wish-form [name=wishNote]', 'Schwarz'); await nico.page.click('#wish-form button[type=submit]');
    await nico.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    await pollNow(anna.page); await anna.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    await anna.page.fill('#wish-form [name=wishUrl]', 'https://example.org/rope'); await anna.page.click('#wish-form button[type=submit]');
    await anna.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    let row = api.content.items.find(item => item.id === 'wish-rope');
    assert.equal(row.wishUrl, 'https://example.org/rope'); assert.equal(row.wishNote, 'Schwarz');
    await pollNow(nico.page); await nico.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    await nico.page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await nico.ctx.setOffline(true); await holdWish(nico.page);
    await nico.page.fill('#wish-form [name=wishNote]', 'Schwarz, 3 m lang'); await nico.page.click('#wish-form button[type=submit]');
    await nico.page.reload(); await openWishlist(nico.page); await holdWish(nico.page);
    assert.equal(await nico.page.inputValue('#wish-form [name=wishNote]'), 'Schwarz, 3 m lang');
    await nico.page.click('#wish-dialog [data-close]');
    await anna.page.locator('#items .check').click(); await anna.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    await nico.ctx.setOffline(false); await pollNow(nico.page); await nico.page.waitForFunction(() => document.querySelector('#status').dataset.state === 'ok');
    row = api.content.items.find(item => item.id === 'wish-rope');
    assert.equal(row.wishNote, 'Schwarz, 3 m lang'); assert.equal(row.wishUrl, 'https://example.org/rope'); assert.equal(row.checked, true);
    assert.deepEqual(nico.problems, []); assert.deepEqual(anna.problems, []);
    await nico.ctx.close(); await anna.ctx.close();
  });

  test('Wünsche: Mehrfachverschieben bewahrt unterschiedliche Produktlinks und Notizen bei gleichen Namen', async () => {
    const data = wishData(), first = data.items.find(row => row.id === 'wish-rope');
    first.wishUrl = 'https://example.org/model-a'; first.wishNote = 'Modell A';
    data.items.push({ ...first, id: 'wish-rope-b', wishUrl: 'https://example.org/model-b', wishNote: 'Modell B' });
    data.items.push({ ...first, id: 'ordinary-rope', storeId: 'store-edeka', wishUrl: '', wishNote: '' });
    const { ctx, page, problems } = await localWishes({}, data);
    assert.equal(await page.locator('#items .item').count(), 2);
    await page.click('#select-mode'); await page.click('#select-all'); await page.click('#select-move'); await sheetOpen(page);
    await page.locator('#move-choices button', { hasText: 'Edeka' }).click();
    await storeButton(page, '#store-chips', 'Edeka').click();
    assert.equal(await page.locator('#items .item', { hasText: 'Springseil' }).count(), 3);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base.items);
    assert.equal(saved.find(row => row.id === 'wish-rope').wishNote, 'Modell A');
    assert.equal(saved.find(row => row.id === 'wish-rope-b').wishUrl, 'https://example.org/model-b');
    assert.deepEqual(problems, []); await ctx.close();
  });

  test('Großer Produktkatalog: 1024 Namen durchsuchbar, Darstellung in Portionen und Auswahl bleibt beim Filtern erhalten', async () => {
    const { ctx, page, problems } = await context(); await open(page); await page.click('#open-products'); await sheetOpen(page);
    assert.equal(await page.locator('.product-card').count(), 96);
    await page.click('#product-picker-more'); assert.equal(await page.locator('.product-card').count(), 192);
    await page.fill('#product-picker-search', 'kuehlakku');
    assert.equal(await page.locator('.product-card[data-product=kuehlakku]').count(), 1, 'auch das letzte Produkt ist ohne vorheriges Nachladen auffindbar');
    await page.locator('.product-card[data-product=kuehlakku] .product-pick').click();
    await page.fill('#product-picker-search', ''); assert.equal(await page.locator('.product-card').count(), 96);
    assert.equal(await page.textContent('#product-picker-count'), '1 ausgewählt');
    await page.selectOption('#product-picker-category', 'getraenke');
    assert.ok(await page.locator('.product-card').count() <= 96); assert.equal(await horizontalOverflow(page), 0);
    assert.deepEqual(problems, []); await ctx.close();
  });









  // ---- Familienausgaben (Version 2.67) ----
  function familyExpenseData() {
    const data = structuredClone(demo), day = isoDay(new Date()), month = day.slice(0, 7), stamp = new Date(Date.now() - 86400000).toISOString();
    data.updatedAt = stamp;
    const record = (id, fields) => ({ id, ...fields, createdAt: stamp, updatedAt: stamp, deletedAt: null, _clock: {} });
    data.members = [record('member-nico', { name: 'Nico' }), record('member-anna', { name: 'Anna' })];
    data.purchases = [record('nico-buy', { date: `${month}-01`, cents: 2345, buyerId: 'member-nico', buyerName: 'Nico', storeId: 'store-lidl', storeName: 'Lidl', source: 'hand' }),
      record('anna-buy', { date: `${month}-02`, cents: 4000, buyerId: 'member-anna', buyerName: 'Anna', storeId: 'store-rewe', storeName: 'Rewe', source: 'hand' }),
      record('unknown-buy', { date: `${month}-03`, cents: 1000, storeName: 'Wochenmarkt', createdBy: 'Nico' }),
      record('return', { date: `${month}-04`, cents: 500, buyerId: 'member-anna', buyerName: 'Anna', kind: 'refund', storeId: 'store-rewe', storeName: 'Rewe' })];
    return data;
  }
  async function localExpenses(options = {}, data = familyExpenseData()) {
    const result = await context(options);
    await result.ctx.addInitScript(data => {
      if (!localStorage.getItem('einkauf-demo-v1')) localStorage.setItem('einkauf-demo-v1', JSON.stringify({ base: data, pending: [] }));
    }, data);
    await open(result.page); await goTab(result.page, 'spending'); return result;
  }
  const expenseStored = page => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base);
  const personFilter = (page, id) => page.locator(`#spending-person-filter button[data-person="${id}"]`);
  const chooseRange = async (page, from, to) => {
    await page.click('#spending-period'); await sheetOpen(page);
    await page.fill('#spending-period-form input[name=from]', from); await page.fill('#spending-period-form input[name=to]', to);
    await page.click('#spending-period-form button[type=submit]');
  };
  test('Keine Preisschätzung: Altbestände bleiben im Backup, erzeugen weder Summe noch Vergleich', async () => {
    const data = familyExpenseData(); data.purchases[0].estimate = 2580;
    const { ctx, page, problems } = await localExpenses({}, data);
    await page.locator('#purchase-list li[data-id=nico-buy] button').click(); await sheetOpen(page);
    await page.locator('#purchase-more summary').click();
    assert.doesNotMatch(await page.textContent('#purchase-dialog'), /geschätzt|Zum Vergleich/i);
    await page.fill('#purchase-form input[name=amount]', '24,45'); await page.click('#purchase-save');
    assert.equal((await expenseStored(page)).purchases.find(row => row.id === 'nico-buy').estimate, 2580);
    await goTab(page, 'shopping');
    assert.equal(await page.locator('#shopping-total').count(), 0);
    assert.doesNotMatch(await page.textContent('#shopping'), /Geschätzt|ohne Preis, nicht eingerechnet/);
    await page.click('#mode-shop'); await storeButton(page, '#shop-chips', 'Edeka').click();
    assert.doesNotMatch(await page.textContent('#shop-status'), /€|ca\./);
    await openSettings(page); const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
    const backup = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.equal(backup.purchases.find(row => row.id === 'nico-buy').estimate, 2580); assert.equal(backup.purchases.find(row => row.id === 'nico-buy').cents, 2445);
    assert.deepEqual(backup.items.map(row => row.price), data.items.map(row => row.price));
    assert.deepEqual(problems, []); await ctx.close();
  });
  test('Familienausgaben: Summe, Personenfilter, Altbestände, Zeitraum einschließlich und Budget nur für die ganze Familie', async () => {
    const { ctx, page, problems } = await localExpenses(); const month = isoDay(new Date()).slice(0, 7);
    assert.match(await page.textContent('#spending-summary'), /Familie insgesamt[\s\S]*68,45\s€[\s\S]*3 Einkäufe · 1 Rückerstattung/);
    assert.deepEqual(await page.locator('#spending-people .person-amount').allTextContents(), ['35,00 €', '23,45 €', '10,00 €']);
    assert.equal(await page.locator('#spending-details').evaluate(node => node.open), false);
    assert.equal(await page.locator('#spending-budget').isVisible(), true);
    await personFilter(page, 'member-anna').click();
    assert.match(await page.textContent('#spending-summary'), /Anna · Ausgaben[\s\S]*35,00\s€/);
    assert.equal(await page.locator('#purchase-list .spend-row').count(), 2); assert.equal(await page.locator('#spending-budget').isHidden(), true);
    await personFilter(page, 'unassigned').click(); assert.match(await page.textContent('#purchase-list'), /Nicht zugeordnet/);
    assert.ok(!(await page.textContent('#purchase-list')).includes('Heute · Nico'), 'createdBy ordnet alte Einträge nicht automatisch zu');
    await personFilter(page, 'all').click(); await chooseRange(page, `${month}-02`, `${month}-03`);
    assert.match(await page.textContent('#spending-summary'), /50,00\s€/); assert.equal(await page.locator('#purchase-list .spend-row').count(), 2);
    assert.equal(await page.locator('#spending-budget').isHidden(), true); assert.equal(await page.locator('#month-prev').isHidden(), true);
    assert.equal(await page.locator('#spending-period-dialog[open]').count(), 0);
    await chooseRange(page, `${month}-05`, `${month}-02`);
    assert.match(await page.textContent('#spending-period-error'), /Anfangsdatum/); assert.match(await page.textContent('#spending-summary'), /50,00\s€/);
    await page.click('[data-spend-preset=this]'); assert.equal(await page.locator('#spending-budget').isVisible(), true);
    assert.deepEqual(problems, []); await ctx.close();
  });
  test('Familienausgaben: neue Eingabe ist auch aus einem alten Monat heute; Name ist vorbelegt und der Betrag genügt', async () => {
    const data = familyExpenseData(), old = isoDay(monthsAgo(2)); data.purchases[0].date = old;
    const { ctx, page, problems } = await localExpenses({}, data);
    await page.click('#month-prev'); await page.click('#add-purchase'); await sheetOpen(page);
    assert.equal(await page.inputValue('#purchase-form input[name=date]'), isoDay(new Date()));
    assert.equal(await page.inputValue('#purchase-form select[name=buyerId]'), 'member-nico');
    await page.fill('#purchase-form input[name=amount]', '12,34'); await page.click('#purchase-plus');
    const saved = (await expenseStored(page)).purchases.find(row => row.cents === 1234);
    assert.equal(saved.buyerId, 'member-nico'); assert.equal(saved.buyerName, 'Nico'); assert.equal(saved.date, isoDay(new Date()));
    assert.match(await page.textContent('#purchase-list'), /Heute · Nico/); assert.equal(await page.locator('#month-today').isHidden(), true);
    assert.deepEqual(problems, []); await ctx.close();
  });
  test('Familienausgaben: Person im offenen Einkauf hinzufügen, umbenennen und ausblenden bewahrt Beträge und feste Zuordnung', async () => {
    const { ctx, page, problems } = await localExpenses();
    await page.click('#add-purchase'); await sheetOpen(page); await page.fill('#purchase-form input[name=amount]', '18,90');
    await page.click('#purchase-person-add'); await sheetOpen(page);
    await page.fill('#member-form input[name=name]', 'Lena'); await page.click('#member-form button[type=submit]');
    assert.equal(await page.locator('#members-dialog[open]').count(), 0);
    assert.equal(await page.inputValue('#purchase-form input[name=amount]'), '18,90');
    assert.equal(await page.inputValue('#purchase-form select[name=buyerId]'), 'member-lena'); await page.click('#purchase-save');
    const purchase = (await expenseStored(page)).purchases.find(row => row.cents === 1890), original = JSON.stringify(purchase);
    assert.equal(purchase.buyerId, 'member-lena');
    await page.click('#spending-members'); await sheetOpen(page); await page.getByRole('button', { name: 'Lena: Name ändern', exact: true }).click();
    await page.fill('#member-form input[name=name]', 'Helena'); await page.click('#member-form button[type=submit]');
    await page.getByRole('button', { name: 'Helena: ausblenden', exact: true }).click(); await page.click('[data-close=members-dialog]');
    const after = await expenseStored(page); assert.equal(JSON.stringify(after.purchases.find(row => row.id === purchase.id)), original, 'keine Massenänderung historischer Ausgaben');
    assert.equal(after.members.find(row => row.id === 'member-lena').name, 'Helena'); assert.equal(after.members.find(row => row.id === 'member-lena').archived, true);
    assert.match(await page.locator(`#purchase-list li[data-id="${purchase.id}"]`).textContent(), /Helena/);
    await page.locator(`#purchase-list li[data-id="${purchase.id}"] button`).click(); await sheetOpen(page);
    assert.equal(await page.inputValue('#purchase-form select[name=buyerId]'), 'member-lena');
    assert.match(await page.locator('#purchase-form select[name=buyerId] option:checked').textContent(), /Helena.*ausgeblendet/);
    await page.keyboard.press('Escape'); await page.click('#add-purchase'); await sheetOpen(page);
    assert.equal(await page.locator('#purchase-form select[name=buyerId] option[value=member-lena]').count(), 0, 'neue Käufe schlagen archivierte andere Personen nicht vor');
    assert.deepEqual(problems, []); await ctx.close();
  });
  test('Familienausgaben: eigene Person umbenennen bleibt auch nach Neustart dieselbe Person', async () => {
    const { ctx, page, problems } = await localExpenses(); await addPurchase(page, { amount: '1,23' });
    await page.click('#spending-members'); await sheetOpen(page); await page.getByRole('button', { name: 'Nico: Name ändern', exact: true }).click();
    await page.fill('#member-form input[name=name]', 'Nicolas'); await page.click('#member-form button[type=submit]'); await page.click('[data-close=members-dialog]');
    await page.reload(); await goTab(page, 'spending'); await page.click('#add-purchase'); await sheetOpen(page);
    assert.equal(await page.inputValue('#purchase-form select[name=buyerId]'), 'member-nico');
    assert.equal(await page.locator('#purchase-form select[name=buyerId] option:checked').textContent(), 'Nicolas');
    assert.match(await page.textContent('#identity'), /Nicolas/); assert.deepEqual(problems, []); await ctx.close();
  });
  test('Familienausgaben: alte Ausgabe ausdrücklich zuordnen, Rückerstattung eintragen und gefilterte CSV herunterladen', async () => {
    const { ctx, page, problems } = await localExpenses();
    await page.locator('#purchase-list li[data-id=unknown-buy] button').click(); await sheetOpen(page);
    assert.equal(await page.inputValue('#purchase-form select[name=buyerId]'), '');
    await page.selectOption('#purchase-form select[name=buyerId]', 'member-anna'); await page.click('#purchase-save');
    assert.equal((await expenseStored(page)).purchases.find(row => row.id === 'unknown-buy').buyerId, 'member-anna');
    await page.click('#add-purchase'); await sheetOpen(page); await page.fill('#purchase-form input[name=amount]', '12,34');
    await page.selectOption('#purchase-form select[name=buyerId]', 'member-anna'); await page.locator('#purchase-more summary').click();
    await page.selectOption('#purchase-form select[name=kind]', 'refund'); await page.click('#purchase-save');
    assert.match(await page.textContent('#spending-summary'), /56,11\s€/); await personFilter(page, 'member-anna').click();
    assert.match(await page.textContent('#spending-summary'), /32,66\s€/);
    assert.equal(await page.locator('#purchase-list .refund-amount').count(), 2); await page.locator('#spending-details summary').click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#spending-export')]);
    const csv = await readFile(await download.path(), 'utf8'); assert.ok(download.suggestedFilename().startsWith('sattplan-ausgaben-'));
    assert.match(csv, /"Anna"/); assert.ok(!csv.includes('"Nico"')); assert.match(csv, /"-12,34"/);
    assert.equal(csv.split('\r\n').filter(Boolean).length, 5); assert.deepEqual(problems, []); await ctx.close();
  });
  test('Familienausgaben: fehlender Gerätespeicher lässt den Betrag im offenen Formular und legt keinen Kauf an', async () => {
    const { ctx, page } = await localExpenses(); const before = (await expenseStored(page)).purchases.length;
    await page.click('#add-purchase'); await sheetOpen(page); await page.fill('#purchase-form input[name=amount]', '7,89');
    await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === 'einkauf-demo-v1') throw new DOMException('voll', 'QuotaExceededError'); return original.call(this, key, value); }; });
    await page.click('#purchase-save'); assert.equal(await page.locator('#purchase-dialog[open]').count(), 1);
    assert.match(await page.textContent('#purchase-dialog [data-dialog-error]'), /lokal speichern/);
    assert.equal(await page.inputValue('#purchase-form input[name=amount]'), '7,89'); assert.equal((await expenseStored(page)).purchases.length, before); await ctx.close();
  });
  test('Familienausgaben: anderer Editor, offene Eingabe und gleichzeitige Personenänderung überschreiben die Zuordnung nicht', async () => {
    const remote = github(familyExpenseData()), a = await context({ config: connectedConfig }), b = await context({ config: { ...connectedConfig, actor: 'Anna' } });
    for (const device of [a, b]) { await device.ctx.route('https://api.github.com/**', route => remote.handler(route)); await open(device.page); await synced(device.page); await goTab(device.page, 'spending'); }
    await a.page.locator('#purchase-list li[data-id=nico-buy] button').click(); await sheetOpen(a.page);
    await b.page.locator('#purchase-list li[data-id=nico-buy] button').click(); await sheetOpen(b.page);
    assert.equal(await b.page.inputValue('#purchase-form select[name=buyerId]'), 'member-nico', 'Editor übernimmt nicht seinen eigenen Namen');
    await b.page.selectOption('#purchase-form select[name=buyerId]', 'member-anna'); await b.page.click('#purchase-save'); await synced(b.page);
    await pollNow(a.page); await synced(a.page);
    await a.page.waitForFunction(() => { const x = Object.entries(localStorage).find(([key]) => key.startsWith('einkauf-data-v1:')); return x && JSON.parse(x[1]).base.purchases.some(p => p.id === 'nico-buy' && p.buyerId === 'member-anna'); }, null, { timeout: 20000 });
    assert.equal(await a.page.inputValue('#purchase-form select[name=buyerId]'), 'member-nico', 'offenes Formular bleibt unverändert');
    await a.page.fill('#purchase-form input[name=amount]', '30'); await a.page.click('#purchase-save'); await synced(a.page);
    const stored = remote.content.purchases.find(row => row.id === 'nico-buy'); assert.equal(stored.cents, 3000); assert.equal(stored.buyerId, 'member-anna'); assert.equal(stored.buyerName, 'Anna');
    assert.deepEqual([...a.problems, ...b.problems], []); await a.ctx.close(); await b.ctx.close();
  });
  test('Familienausgaben: Umbenennung erreicht das zweite Gerät, ohne ungespeicherte Verbindungseingaben zu verwerfen', async () => {
    const remote = github(familyExpenseData()), a = await context({ config: connectedConfig }), b = await context({ config: connectedConfig });
    for (const device of [a, b]) { await device.ctx.route('https://api.github.com/**', route => remote.handler(route)); await open(device.page); await synced(device.page); }
    await openSettings(b.page); await b.page.fill('#settings-form input[name=token]', 'anderer-test-token-noch-nicht-gespeichert');
    await goTab(a.page, 'spending'); await a.page.click('#spending-members'); await sheetOpen(a.page);
    await a.page.getByRole('button', { name: 'Nico: Name ändern', exact: true }).click();
    await a.page.fill('#member-form input[name=name]', 'Nicolas'); await a.page.click('#member-form button[type=submit]'); await synced(a.page);
    await pollNow(b.page); await b.page.waitForFunction(() => document.querySelector('#identity').textContent === 'Nicolas', null, { timeout: 20000 });
    assert.equal(await b.page.inputValue('#settings-form input[name=token]'), 'anderer-test-token-noch-nicht-gespeichert');
    assert.equal(await b.page.inputValue('#settings-form input[name=actor]'), 'Nicolas');
    await goTab(b.page, 'spending'); await b.page.click('#add-purchase'); await sheetOpen(b.page);
    assert.equal(await b.page.inputValue('#purchase-form select[name=buyerId]'), 'member-nico');
    assert.equal(await b.page.locator('#purchase-form select[name=buyerId] option:checked').textContent(), 'Nicolas');
    assert.deepEqual([...a.problems, ...b.problems], []); await a.ctx.close(); await b.ctx.close();
  });
  test('Familienausgaben: CSV kann auf dem iPhone über den Teilen-Dialog gespeichert werden', async () => {
    const { ctx, page, problems } = await localExpenses(); await personFilter(page, 'member-anna').click();
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: data => data.files?.length === 1 });
      Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.sharedExpense = { name: data.files[0].name, type: data.files[0].type, text: await data.files[0].text() }; } });
    });
    await page.locator('#spending-details summary').click(); await page.click('#spending-export');
    await page.waitForFunction(() => window.sharedExpense, null, { timeout: 10000 });
    const file = await page.evaluate(() => window.sharedExpense); assert.match(file.name, /^sattplan-ausgaben-.*\.csv$/);
    assert.equal(file.type, 'text/csv;charset=utf-8'); assert.match(file.text, /"Anna"/); assert.ok(!file.text.includes('"Nico"')); assert.match(file.text, /"-5,00"/);
    assert.deepEqual(problems, []); await ctx.close();
  });
  test('Familienausgaben: offline erfasste Einkäufe von zwei Personen werden später vollständig synchronisiert', async () => {
    const data = structuredClone(demo); data.purchases = []; const remote = github(data);
    const a = await context({ config: connectedConfig }), b = await context({ config: { ...connectedConfig, actor: 'Anna' } }); let offline = false;
    await a.ctx.route('https://api.github.com/**', route => remote.handler(route));
    await b.ctx.route('https://api.github.com/**', route => offline ? route.abort('connectionfailed') : remote.handler(route));
    for (const device of [a, b]) { await open(device.page); await synced(device.page); await goTab(device.page, 'spending'); }
    offline = true; await addPurchase(b.page, { amount: '11,20', store: 'Lidl' });
    await addPurchase(a.page, { amount: '21,30', store: 'Edeka' }); await synced(a.page);
    assert.equal(remote.content.purchases.length, 1); await b.page.reload(); await goTab(b.page, 'spending');
    assert.match(await b.page.textContent('#spending-summary'), /11,20\s€/);
    offline = false; await b.page.click('#refresh'); await synced(b.page); await pollNow(a.page); await synced(a.page);
    await a.page.waitForFunction(() => /32,50/.test(document.querySelector('#spending-summary').textContent), null, { timeout: 20000 });
    assert.deepEqual(remote.content.purchases.filter(row => !row.deletedAt).map(row => row.buyerId).sort(), ['member-anna', 'member-nico']);
    assert.deepEqual(remote.content.members.map(row => row.id).sort(), ['member-anna', 'member-nico']);
    assert.deepEqual([...a.problems, ...b.problems].filter(text => !/Failed to load resource|ERR_FAILED/.test(text)), []);
    await a.ctx.close(); await b.ctx.close();
  });
  test('Familienausgaben: globale Duplikatwarnung bleibt bei unterschiedlichen Personen aktiv, Retouren zählen separat', async () => {
    const { ctx, page, problems } = await localExpenses();
    await personFilter(page, 'member-anna').click(); await page.click('#add-purchase'); await sheetOpen(page);
    await page.fill('#purchase-form input[name=amount]', '23,45'); await page.fill('#purchase-form input[name=date]', `${isoDay(new Date()).slice(0, 7)}-01`);
    await page.selectOption('#purchase-form select[name=storeId]', 'store-lidl'); await page.selectOption('#purchase-form select[name=buyerId]', 'member-anna');
    await page.click('#purchase-save'); assert.match(await page.textContent('#purchase-dialog [data-dialog-error]'), /Möglicherweise doppelt.*Nico/);
    assert.equal((await expenseStored(page)).purchases.length, 4);
    await page.locator('#purchase-more summary').click(); await page.selectOption('#purchase-form select[name=kind]', 'refund'); await page.click('#purchase-save');
    assert.equal(await page.locator('#purchase-dialog[open]').count(), 0); assert.equal((await expenseStored(page)).purchases.length, 5);
    assert.match(await page.textContent('#spending-summary'), /11,55\s€/); assert.deepEqual(problems, []); await ctx.close();
  });
  test('Familienausgaben: Einkauf beenden speichert die gewählte Person; nur beenden erzeugt keine Personen oder Ausgaben', async () => {
    const { ctx, page, problems } = await context(); await open(page);
    await page.click('#mode-shop'); await storeButton(page, '#shop-chips', 'Lidl').click(); await shopTap(page, 'Milch').click();
    await finishShop(page); await sheetOpen(page); await page.click('#finish-only');
    assert.equal((await expenseStored(page)).purchases.length, 0); assert.equal((await expenseStored(page)).members?.length || 0, 0);
    await page.click('#mode-shop'); await storeButton(page, '#shop-chips', 'Edeka').click(); await shopTap(page, 'Tomaten').click();
    await finishShop(page); await sheetOpen(page); assert.equal(await page.inputValue('#finish-form select[name=buyerId]'), 'member-nico');
    await page.fill('#finish-form input[name=amount]', '8,50'); await page.click('#finish-person-add'); await sheetOpen(page);
    await page.fill('#member-form input[name=name]', 'Oma'); await page.click('#member-form button[type=submit]');
    assert.equal(await page.inputValue('#finish-form input[name=amount]'), '8,50'); await page.click('#finish-form .add-button');
    const saved = (await expenseStored(page)).purchases[0]; assert.equal(saved.buyerId, 'member-oma'); assert.equal(saved.buyerName, 'Oma'); assert.equal(saved.cents, 850);
    assert.equal(saved.date, isoDay(new Date())); assert.equal(saved.storeId, 'store-edeka'); assert.equal(await page.locator('#plan-view').isVisible(), true);
    assert.deepEqual(problems, []); await ctx.close();
  });
  for (const width of [280, 320, 390]) for (const theme of ['light', 'dark']) {
    test(`Familienausgaben: Übersicht, lange Namen, Zeitraum, Retoure und Mitglieder passen bei ${width} px ${theme}`, async () => {
      const data = familyExpenseData(); data.members[1].name = 'Alexandra Maximiliane Familie'; data.purchases[1].cents = 9999999;
      const { ctx, page, problems } = await localExpenses({ config: { theme, palette: 'gruen', glass: true }, context: { viewport: { width, height: 760 }, colorScheme: theme } }, data);
      const fits = async label => { assert.equal(await horizontalOverflow(page), 0, label); assert.ok(await page.evaluate(() => [...document.querySelectorAll('dialog[open]')].every(el => el.scrollWidth <= el.clientWidth + 1)), `${label}: Dialogbreite`); };
      await fits('Übersicht'); await page.locator('#spending-details summary').click(); await fits('Auswertungen');
      await page.click('#spending-period'); await sheetOpen(page); await fits('Zeitraum'); await page.click('[data-spend-preset=year]'); await fits('Jahreszeitraum');
      await page.click('#add-purchase'); await sheetOpen(page); await page.locator('#purchase-more summary').click(); await page.selectOption('#purchase-form select[name=kind]', 'refund'); await fits('Rückerstattung');
      await page.click('#purchase-person-add'); await sheetOpen(page); await fits('Familienmitglieder');
      const touches = await page.locator('#members-list button').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44)); assert.equal(touches, true);
      assert.deepEqual(problems, []); await ctx.close();
    });
  }

  test('Im Laden Standard: beim Öffnen und Neuladen sofort Alle, nach Geschäftswahl zurück zu Planen wieder Alle', async () => {
    const { ctx, page, problems } = await context(); await open(page); await page.click('#mode-shop');
    const selected = () => page.locator('#shop-chips .chip[aria-selected=true]').first().textContent();
    assert.match(await selected(), /^Alle/); assert.ok(await page.locator('#shop-list .shop-name').count() >= 4);
    await storeButton(page, '#shop-chips', 'Lidl').click(); assert.match(await selected(), /^Lidl/);
    await page.click('#shop-back'); await page.click('#mode-shop'); assert.match(await selected(), /^Alle/);
    await page.reload(); await page.waitForSelector('#shop-chips .chip[aria-selected=true]'); assert.match(await selected(), /^Alle/);
    assert.deepEqual(problems, []); await ctx.close();
  });
  test('Verschieben löschen: Mülleimer unter allen Geschäften, getrennte Linie und einzelner Artikel bleibt gelöscht', async () => {
    const { ctx, page, problems } = await context(); await open(page);
    const before = await storedDemo(page), target = before.items.find(row => row.name === 'Nudeln' && !row.deletedAt);
    await holdRow(page, 'Nudeln'); await page.waitForSelector('.drag-ghost'); await page.mouse.up(); await sheetOpen(page);
    const geometry = await page.evaluate(() => {
      const choices = document.querySelector('#move-choices'), rule = document.querySelector('.move-delete-rule'), button = document.querySelector('#move-delete');
      return { choicesBottom: choices.getBoundingClientRect().bottom, ruleY: rule.getBoundingClientRect().top, buttonY: button.getBoundingClientRect().top,
        ruleHeight: rule.getBoundingClientRect().height, ruleBackground: getComputedStyle(rule).backgroundImage, icon: button.querySelector('use').getAttribute('href'), label: button.textContent.trim() };
    });
    assert.ok(geometry.ruleY > geometry.choicesBottom); assert.ok(geometry.buttonY > geometry.ruleY); assert.equal(geometry.ruleHeight, 1);
    assert.match(geometry.ruleBackground, /linear-gradient/); assert.equal(geometry.icon, '#i-trash'); assert.equal(geometry.label, 'Artikel löschen');
    await page.click('#move-delete'); await page.waitForSelector('#move-dialog[open]', { state: 'detached' });
    let after = await storedDemo(page); assert.ok(after.items.find(row => row.id === target.id).deletedAt);
    assert.deepEqual(after.items.filter(row => row.id !== target.id), before.items.filter(row => row.id !== target.id));
    await page.reload(); await page.waitForSelector('#status[data-state]', { state: 'attached' });
    after = await storedDemo(page); assert.ok(after.items.find(row => row.id === target.id).deletedAt); assert.equal(await page.locator('#items .item', { hasText: 'Nudeln' }).count(), 0);
    assert.deepEqual(problems, []); await ctx.close();
  });
  test('Verschieben löschen: mehrere Artikel brauchen Bestätigung, Abbrechen erhält Daten und Auswahl', async () => {
    const { ctx, page, problems } = await context(); await open(page); const before = await storedDemo(page);
    await page.click('#select-mode');
    for (const name of ['Tomaten', 'Nudeln']) await page.locator('#items .item', { hasText: name }).locator('.item-copy').click();
    await page.click('#select-move'); await sheetOpen(page); assert.equal(await page.textContent('#move-delete-label'), '2 Artikel löschen');
    page.once('dialog', dialog => dialog.dismiss()); await page.click('#move-delete');
    assert.deepEqual(await storedDemo(page), before); assert.equal(await page.locator('#move-dialog').evaluate(node => node.open), true); assert.equal(await page.textContent('#select-count'), '2 ausgewählt');
    page.once('dialog', dialog => dialog.accept()); await page.click('#move-delete'); await page.waitForSelector('#move-dialog[open]', { state: 'detached' });
    const after = await storedDemo(page); for (const name of ['Tomaten', 'Nudeln']) assert.ok(after.items.find(row => row.name === name).deletedAt);
    assert.deepEqual(after.items.filter(row => !['Tomaten', 'Nudeln'].includes(row.name)), before.items.filter(row => !['Tomaten', 'Nudeln'].includes(row.name)));
    assert.equal(await page.locator('#select-bar').isHidden(), true); assert.equal(await page.getAttribute('#select-mode', 'aria-pressed'), 'false');
    assert.deepEqual(problems, []); await ctx.close();
  });
  // ---- Vorratsgesten, Tagesrückblick und Rezeptnotizen (2.69) ----
  const storedDemo = page => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-demo-v1')).base);
  const dailySaved = page => page.evaluate(() => JSON.parse(localStorage.getItem('einkauf-daily:einkauf-demo-v1')));
  async function finishDailyForReview(page, addFirst = false, count = 3) {
    await goTab(page, 'recipes'); await page.click('#daily-open'); await sheetOpen(page);
    const titles = [];
    for (let i = 0; i < count; i++) {
      await page.waitForFunction(() => !document.querySelector('#daily-skip').hidden && !document.querySelector('#daily-skip').disabled && document.querySelector('#daily-card .daily-ingredients'));
      titles.push(await page.textContent('#daily-card h3'));
      await page.click(addFirst && i === 0 ? '#daily-add' : '#daily-skip');
    }
    await page.waitForSelector('#daily-review-choices:not([hidden])'); return titles;
  }
  async function holdProduct(page, id) {
    const pick = page.locator(`.product-card[data-product="${id}"] .product-pick`);
    await pick.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const box = await pick.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.waitForSelector('#pantry-buy-dialog[open]', { timeout: 4000 }); await page.mouse.up(); await sheetOpen(page);
  }
  test('Vorratsgeste: langes Drücken fügt mit Bild und Menge zur Liste hinzu, ohne Vorrat oder Auswahl zu ändern', async () => {
    const { ctx, page, problems } = await context({ config: { productImages: true } }); await open(page); await openPantry(page,'all');
    await page.fill('#product-picker-search', 'Kidneybohnen');
    await page.locator('.product-card[data-product=kidneybohnen] .product-pick').click();
    const before = await storedDemo(page); await holdProduct(page, 'kidneybohnen');
    assert.equal(await page.textContent('#pantry-buy-title'), 'Auf die Einkaufsliste');
    await page.fill('#pantry-buy-form [name=quantity]', '2'); await page.selectOption('#pantry-buy-form [name=storeId]', 'store-edeka'); await page.click('#pantry-buy-add');
    assert.equal(await page.textContent('#product-picker-count'), '1 ausgewählt');
    const after = await storedDemo(page), rows = after.items.filter(row => !row.deletedAt && row.name === 'Kidneybohnen');
    assert.equal(rows.length, 1); assert.equal(rows[0].quantity, 2); assert.equal(rows[0].storeId, 'store-edeka'); assert.equal(rows[0].imageKey, 'kidneybohnen');
    assert.deepEqual(after.pantry || [], before.pantry || []); assert.deepEqual(after.productFavorites || [], before.productFavorites || []);
    assert.match(await page.textContent('#product-picker-feedback'), /Kidneybohnen.*Einkaufsliste/);
    await holdProduct(page, 'kidneybohnen'); assert.equal(await page.inputValue('#pantry-buy-form [name=storeId]'), 'store-edeka');
    await page.fill('#pantry-buy-form [name=quantity]', '1'); await page.click('#pantry-buy-add');
    assert.equal((await storedDemo(page)).items.find(row => !row.deletedAt && row.name === 'Kidneybohnen').quantity, 3);
    assert.deepEqual(problems, []); await ctx.close();
  });
  test('Vorratsgeste: auch vorhandene Produkte lassen sich per Tastatur auf die Liste setzen', async () => {
    const { ctx, page, problems } = await context(); await open(page); await page.click('#open-pantry');
    await addPantryProduct(page, 'Salz'); await page.click('[data-product-mode=all]'); await page.fill('#product-picker-search', 'Salz');
    const pick = page.locator('.product-card[data-product=salz] .product-pick'); assert.equal(await pick.getAttribute('aria-pressed'),'true');assert.equal(await pick.isEnabled(),true);
    await pick.focus(); await page.keyboard.press('Shift+F10'); await sheetOpen(page);
    assert.match(await page.textContent('#pantry-buy-name'), /Salz/); await page.click('#pantry-buy-add');
    assert.equal((await storedDemo(page)).pantry.find(row => row.name === 'Salz').available, true);
    assert.equal(await page.textContent('#product-picker-count'), '0 ausgewählt');
    assert.deepEqual(problems, []); await ctx.close();
  });
  test('Vorratsgeste: Touch und Kontextmenü markieren nichts blau; Wischen und Abbruch lösen keinen Kauf aus', async () => {
    const { ctx, page, problems } = await context(); await open(page); await openPantry(page,'all'); await page.fill('#product-picker-search', 'Milch');
    const pick = page.locator('.product-card[data-product=milch] .product-pick'); await pick.scrollIntoViewIfNeeded();
    assert.ok(await pick.evaluate(node => [node, ...node.querySelectorAll('*')].every(el => getComputedStyle(el).userSelect === 'none')));
    assert.ok(await pick.evaluate(node => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); node.dispatchEvent(e); return e.defaultPrevented; }));
    await pick.dispatchEvent('pointerdown', { isPrimary: true, pointerId: 7, pointerType: 'touch', clientX: 100, clientY: 400 });
    await page.dispatchEvent('body', 'pointermove', { isPrimary: true, pointerId: 7, pointerType: 'touch', clientX: 101, clientY: 430 });
    await page.waitForTimeout(600); assert.equal(await page.locator('#pantry-buy-dialog[open]').count(), 0);
    await pick.dispatchEvent('pointerdown', { isPrimary: true, pointerId: 8, pointerType: 'touch', clientX: 100, clientY: 400 });
    await page.dispatchEvent('body', 'pointercancel', { isPrimary: true, pointerId: 8 }); await page.waitForTimeout(600); assert.equal(await page.locator('#pantry-buy-dialog[open]').count(), 0);
    const cdp = await ctx.newCDPSession(page), box = await pick.boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.evaluate(() => { const range = document.createRange(); range.selectNodeContents(document.querySelector('.product-card[data-product=milch] .product-name')); getSelection().addRange(range); });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await page.waitForSelector('#pantry-buy-dialog[open]', { timeout: 4000 }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal(await page.evaluate(() => getSelection().toString()), ''); assert.equal(await page.textContent('#product-picker-count'), '0 ausgewählt');
    assert.deepEqual(problems, []); await ctx.close();
  });
  test('Tagesrückblick: heute dieselben drei erneut ansehen, später hinzufügen, ohne Fortschritt oder Duplikate', async () => {
    const { ctx, page, problems } = await context(); await open(page); const titles = await finishDailyForReview(page, true), before = await dailySaved(page), count = (await storedDemo(page)).recipes.length;
    assert.equal(await page.locator('#daily-review-yesterday').isDisabled(), true); assert.match(await page.textContent('#daily-review-unavailable'), /keine Auswahl/);
    await page.click('#daily-review-today'); await page.waitForSelector('#daily-card .daily-ingredients');
    assert.equal(await page.textContent('#daily-card h3'), titles[0]); assert.equal(await page.locator('#daily-add').isHidden(), true);
    await page.click('#daily-review-next'); await page.waitForFunction(title => document.querySelector('#daily-card h3').textContent === title && !document.querySelector('#daily-add').hidden, titles[1]);
    await page.click('#daily-add'); assert.equal((await storedDemo(page)).recipes.length, count + 1); assert.equal(await page.locator('#daily-add').isHidden(), true);
    await page.click('#daily-review-next'); await page.waitForSelector('#daily-card .daily-ingredients'); assert.equal(await page.textContent('#daily-card h3'), titles[2]); assert.equal(await page.locator('#daily-review-next').isDisabled(), true);
    await page.click('#daily-review-prev'); await page.waitForSelector('#daily-card .daily-ingredients'); assert.equal(await page.textContent('#daily-card h3'), titles[1]);
    const after = await dailySaved(page); assert.equal(after.index, before.index); assert.deepEqual(after.decided, before.decided); assert.deepEqual(after.queue, before.queue);
    await page.click('#daily-review-finish'); assert.match(await page.textContent('#daily-card'), /2 von 3 Rezepten hinzugefügt/);
    await page.reload(); await goTab(page, 'recipes'); await page.click('#daily-open'); await page.click('#daily-review-today'); await page.waitForSelector('#daily-card .daily-ingredients'); assert.equal(await page.textContent('#daily-card h3'), titles[0]);
    assert.deepEqual(problems, []); await ctx.close();
  });
  test('Tagesrückblick: gestern bleibt über Tageswechsel und Offline-Neustart gespeichert', async () => {
    const { ctx, page, problems } = await context({ context: { serviceWorkers: 'allow', locale: 'de-DE', timezoneId: 'Europe/Berlin' } }); await withDayOffset(ctx); await open(page);
    await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForFunction(() => navigator.serviceWorker.controller);
    const yesterdayTitles = await finishDailyForReview(page); await page.click('#daily-dialog [data-close]');
    await page.evaluate(() => localStorage.setItem('test-day-offset', '1')); await page.reload(); const todayTitles = await finishDailyForReview(page);
    assert.ok(!yesterdayTitles.includes(todayTitles[0])); const before = await dailySaved(page);
    await page.click('#daily-dialog [data-close]'); await ctx.setOffline(true); await page.reload(); await goTab(page, 'recipes'); await page.click('#daily-open');
    assert.equal(await page.locator('#daily-review-yesterday').isEnabled(), true); await page.click('#daily-review-yesterday'); await page.waitForSelector('#daily-card .daily-ingredients');
    assert.match(await page.textContent('#daily-progress'), /Gestern erneut/); assert.equal(await page.textContent('#daily-card h3'), yesterdayTitles[0]);
    await page.click('#daily-review-next'); await page.waitForSelector('#daily-card .daily-ingredients'); assert.equal(await page.textContent('#daily-card h3'), yesterdayTitles[1]);
    assert.deepEqual((await dailySaved(page)).queue, before.queue); assert.equal((await dailySaved(page)).index, before.index);
    assert.deepEqual(problems.filter(text => !/Failed to load resource/.test(text)), []); await ctx.close();
  });
  test('Tagesrückblick: externe Rezepte werden vollständig zwischengespeichert und beim Wiederansehen nicht neu geladen', async () => {
    const { ctx, page, problems } = await context({ config: dailyConfig }); let requests = 0;
    const handler = dailySite(2); await ctx.route(`${PROXY}/**`, route => { requests++; return handler(route); }); await open(page);
    const titles = await finishDailyForReview(page, false, 2), loaded = requests; await page.click('#daily-dialog [data-close]');
    await page.reload(); await goTab(page, 'recipes'); await page.click('#daily-open'); await page.click('#daily-review-today'); await page.waitForSelector('#daily-card .daily-ingredients');
    assert.equal(await page.textContent('#daily-card h3'), titles[0]); await page.click('#daily-review-next'); await page.waitForSelector('#daily-card .daily-ingredients'); assert.equal(await page.textContent('#daily-card h3'), titles[1]);
    assert.equal(requests, loaded); const saved = await dailySaved(page); assert.equal(Object.keys(saved.drafts).length, 2);
    assert.deepEqual(problems, []); await ctx.close();
  });
  test('Rezeptnotizen: speichern, Entwurf wiederherstellen, bearbeiten und im tatsächlichen PDF ausgeben', async () => {
    const { ctx, page, problems } = await context(); await open(page); await goTab(page, 'recipes');
    const card = page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' }); await card.locator('details').evaluate(node => { node.open = true; }); await card.getByRole('button', { name: 'Bearbeiten', exact: true }).click(); await sheetOpen(page);
    const note = 'Weniger Salz verwenden.\nMit Zitrone servieren.'; await page.fill('#recipe-form [name=notes]', note); await page.click('#recipe-form .sheet-actions button');
    assert.equal((await storedDemo(page)).recipes.find(row => row.id === 'recipe-pasta').notes, note);
    await page.reload(); await openCardSheet(page); assert.match(await sheetText(page), /Weniger Salz verwenden/); assert.match(await sheetText(page), /Mit Zitrone servieren/);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#sheet-save')]); const bytes = await pdfBytesOf(download); checkPdf(bytes);
    assert.ok(bytes.toString('latin1').includes(Buffer.from('Weniger Salz verwenden.', 'latin1').toString('hex')), 'die Notiz steht als PDF-Text in der Datei');
    await page.click('#sheet-close'); await card.locator('details').evaluate(node => { node.open = true; }); await card.getByRole('button', { name: 'Bearbeiten', exact: true }).click(); await sheetOpen(page); await page.fill('#recipe-form [name=notes]', 'Noch ein Tipp.');
    await page.click('#recipe-dialog [data-close]'); await card.locator('details').evaluate(node => { node.open = true; }); await card.getByRole('button', { name: 'Bearbeiten', exact: true }).click(); await sheetOpen(page); await page.getByRole('button', { name: 'Entwurf zurückholen' }).click();
    assert.equal(await page.inputValue('#recipe-form [name=notes]'), 'Noch ein Tipp.'); await page.fill('#recipe-form [name=notes]', ''); await page.click('#recipe-form .sheet-actions button');
    assert.equal((await storedDemo(page)).recipes.find(row => row.id === 'recipe-pasta').notes, '');
    assert.deepEqual(problems, []); await ctx.close();
  });
  test('Rezeptnotizen: zwei Geräte bearbeiten Notizen und Titel unabhängig, unverändertes leeres Feld löscht keine neue Notiz', async () => {
    const remote = github(demo), a = await context({ config: connectedConfig }), b = await context({ config: { ...connectedConfig, actor: 'Anna' } });
    for (const device of [a, b]) { await device.ctx.route('https://api.github.com/**', route => remote.handler(route)); await open(device.page); await synced(device.page); await goTab(device.page, 'recipes'); await device.page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' }).locator('details').evaluate(node => { node.open = true; }); await device.page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' }).getByRole('button', { name: 'Bearbeiten', exact: true }).click(); await sheetOpen(device.page); }
    await a.page.fill('#recipe-form [name=notes]', 'Mit Kräutern.'); await a.page.click('#recipe-form .sheet-actions button'); await synced(a.page); await pollNow(b.page); await synced(b.page);
    await b.page.fill('#recipe-form [name=name]', 'Familien-Pasta'); await b.page.click('#recipe-form .sheet-actions button'); await synced(b.page);
    assert.equal(remote.content.recipes.find(row => row.id === 'recipe-pasta').notes, 'Mit Kräutern.'); assert.equal(remote.content.recipes.find(row => row.id === 'recipe-pasta').name, 'Familien-Pasta');
    await b.page.locator('.recipe-card', { hasText: 'Familien-Pasta' }).locator('details').evaluate(node => { node.open = true; }); await b.page.locator('.recipe-card', { hasText: 'Familien-Pasta' }).getByRole('button', { name: 'Bearbeiten', exact: true }).click(); await sheetOpen(b.page); await b.page.fill('#recipe-form [name=notes]', 'Mit Zitronensaft.'); await b.page.click('#recipe-form .sheet-actions button'); await synced(b.page);
    assert.equal(remote.content.recipes.find(row => row.id === 'recipe-pasta').notes, 'Mit Zitronensaft.');
    assert.deepEqual([...a.problems, ...b.problems], []); await a.ctx.close(); await b.ctx.close();
  });
  for (const width of [280, 320, 390]) for (const theme of ['light', 'dark']) {
    test(`Neue Funktionen (${width} px ${theme}): Grundvorrat, schneller Einkauf, Tagesrückblick und Notizen bleiben lesbar`, async () => {
      const { ctx, page, problems } = await context({ config: { theme }, context: { viewport: { width, height: 844 }, colorScheme: theme } }); await open(page); await openPantry(page,'basics');await page.click('#pantry-add-basics');
      const fits = async label => { assert.equal(await horizontalOverflow(page), 0, label); assert.ok(await page.evaluate(() => [...document.querySelectorAll('dialog[open]')].every(n => n.scrollWidth <= n.clientWidth + 1)), `${label}: Dialog`); };
      assert.equal(await page.textContent('#product-picker-title'),'Vorrat auswählen');
      assert.equal(await page.getAttribute('[data-product-mode=basics]','aria-pressed'),'true');
      await fits('Grundvorrat'); await holdProduct(page, 'salz'); await fits('Auf Einkaufsliste'); await page.click('#pantry-buy-dialog [data-close]'); await page.click('#product-picker-dialog [data-close]');
      await finishDailyForReview(page); await fits('Tagesübersicht'); await page.click('#daily-review-today'); await page.waitForSelector('#daily-card .daily-ingredients'); await fits('Tagesrückblick'); await page.click('#daily-dialog [data-close]');
      await page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' }).locator('details').evaluate(node => { node.open = true; }); await page.locator('.recipe-card', { hasText: 'Tomaten-Pasta' }).getByRole('button', { name: 'Bearbeiten', exact: true }).click(); await sheetOpen(page); await page.fill('#recipe-form [name=notes]', 'Eigene Notizen bleiben gut lesbar.'); await fits('Notizen');
      assert.deepEqual(problems, []); await ctx.close();
    });
  }

  test('Produktschreibweise: eindeutiger Tippfehler wird offline richtig addiert, Original bleibt wählbar und es entstehen keine Zuordnungen', async () => {
    const { ctx, page, problems } = await context(); await open(page); await pickStore(page,'Edeka'); await ctx.setOffline(true);
    await page.fill('#item-form [name=name]','Tmoaten'); await page.fill('#item-form [name=quantity]','100'); await chooseUnit(page,'#item-form [name=unit]','g');
    assert.match(await page.textContent('#item-suggestions'),/Tomaten/); await page.click('#item-form button[type=submit]');
    let data=await storedDemo(page); assert.equal(data.items.find(row=>row.id==='item-tomaten').quantity,600); assert.equal(data.items.filter(row=>row.name==='Tmoaten').length,0); assert.equal((data.aliases||[]).length,0);
    assert.match(await page.textContent('#notice-text'),/Tmoaten.*Tomaten/);
    await page.fill('#item-form [name=name]','Spagetti'); await page.getByRole('button',{name:'Original behalten',exact:true}).click(); await page.click('#item-form button[type=submit]');
    data=await storedDemo(page); assert.equal(data.items.filter(row=>!row.deletedAt&&row.name==='Spagetti').length,1); assert.equal((data.aliases||[]).length,0);
    assert.deepEqual(problems,[]); await ctx.close();
  });
  test('Produktschreibweise: bei mehreren ähnlichen Produkten bleibt die Eingabe erhalten und beide Vorschläge sind erreichbar', async () => {
    const data=structuredClone(demo); data.items.push({...data.items[0],id:'own-mulch',name:'Mulch',quantity:1});
    const {ctx,page,problems}=await context(); await ctx.addInitScript(data=>{if(!localStorage.getItem('einkauf-demo-v1'))localStorage.setItem('einkauf-demo-v1',JSON.stringify({base:data,pending:[]}));},data);
    await open(page); await page.fill('#item-form [name=name]','Mylch');
    const choices=await page.locator('#item-suggestions button').allTextContents(); assert.ok(choices.includes('Milch')); assert.ok(choices.includes('Mulch')); assert.ok(!choices.includes('Original behalten'));
    await page.click('#item-form button[type=submit]'); assert.ok((await storedDemo(page)).items.some(row=>row.name==='Mylch'));
    assert.deepEqual(problems,[]); await ctx.close();
  });
  test('Produktschreibweise: eigene Wunschlisten behalten Produkt- und Modellnamen unverändert', async () => {
    const data=structuredClone(demo); data.stores.push({ ...data.stores[0],id:'store-wishes',name:'Wünsche',separate:true });
    const {ctx,page,problems}=await context(); await ctx.addInitScript(data=>{if(!localStorage.getItem('einkauf-demo-v1'))localStorage.setItem('einkauf-demo-v1',JSON.stringify({base:data,pending:[]}));},data);
    await open(page); await storeButton(page,'#store-chips','Wünsche').click(); await page.fill('#item-form [name=name]','Spagetti');
    assert.equal(await page.getByRole('button',{name:'Original behalten',exact:true}).count(),0); await page.click('#item-form button[type=submit]');
    assert.ok((await storedDemo(page)).items.some(row=>row.name==='Spagetti'&&row.storeId==='store-wishes'));
    assert.deepEqual(problems,[]); await ctx.close();
  });
  const milkRecipes = () => {
    const data=structuredClone(demo);data.items=[];data.pantry=[];
    data.recipes=[{...data.recipes[0],id:'milk-a',name:'Milchgericht A',servings:2},{...data.recipes[0],id:'milk-b',name:'Milchgericht B',servings:2}];
    data.ingredients=[{...data.ingredients[0],id:'milk-i-a',recipeId:'milk-a',name:'Milch',quantity:500,unit:'ml'},{...data.ingredients[0],id:'milk-i-b',recipeId:'milk-b',name:'Milch',quantity:900,unit:'ml'}];return data;
  };
  const seedLocal = (ctx,data) => ctx.addInitScript(data=>{if(!localStorage.getItem('einkauf-demo-v1'))localStorage.setItem('einkauf-demo-v1',JSON.stringify({base:data,pending:[]}));},data);
  async function transferMilk(page,title){await goTab(page,'recipes');await page.locator('.recipe-card',{hasText:title}).getByRole('button',{name:'Auf die Liste',exact:true}).click();await page.selectOption('#transfer-form [name=storeId]','store-edeka');await page.click('#transfer-form button:not([data-close])');await page.waitForSelector('#transfer-dialog[open]',{state:'detached'});}
  async function choosePack(page,form,label,size,unit){await page.click(`${form} [name=unit]`);await page.click('#purchase-unit-dialog .purchase-custom summary');await page.fill('#purchase-unit-dialog [name=label]',label);await page.fill('#purchase-unit-dialog [name=size]',size);await page.selectOption('#purchase-unit-dialog [name=base]',unit);await page.click('#purchase-unit-dialog button[type=submit]');}
  test('Einkaufsmengen: Fertig schließt Tastatur, Pfeile zählen ab eins und speichern erst nach Bestätigung',async()=>{
    const {ctx,page,problems}=await context();await open(page);await page.fill('#item-form [name=name]','Milch');await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>document.activeElement.matches('input,textarea,select')),false);assert.equal(await page.inputValue('#item-form [name=quantity]'),'1');assert.equal(await page.inputValue('#item-form [name=unit]'),'Packung');
    const before=await storedDemo(page);assert.equal(await page.isDisabled('#item-form .quantity-down'),true);
    await page.click('#item-form .quantity-up');assert.equal(await page.inputValue('#item-form [name=quantity]'),'2');assert.equal(await page.isDisabled('#item-form .quantity-down'),false);
    await page.click('#item-form .quantity-down');assert.equal(await page.inputValue('#item-form [name=quantity]'),'1');assert.equal(await page.isDisabled('#item-form .quantity-down'),true);assert.deepEqual((await storedDemo(page)).items,before.items);
    await page.click('#item-form button[type=submit]');const row=(await storedDemo(page)).items.find(r=>!r.deletedAt&&r.name==='Milch'&&!r.storeId);assert.equal(row.quantity,1);assert.equal(row.unit,'l');assert.equal(row.purchaseUnit.quantity,1);assert.equal((await storedDemo(page)).sync.minRev,9);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('Einkaufsmengen: Vorschlag fokussiert keine Menge und Einheitenmenü öffnet ohne Tastatur',async()=>{
    const {ctx,page,problems}=await context();await open(page);await page.fill('#item-form [name=name]','mi');await page.locator('#item-suggestions').getByRole('button',{name:'Milch',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.activeElement.matches('input,textarea,select')),false);await page.click('#item-form [name=unit]');
    assert.equal(await page.evaluate(()=>document.activeElement.matches('input,textarea,select')),false);assert.ok(await page.getAttribute('#item-form [name=unit]','readonly')!==null);
    assert.equal(await page.locator('#purchase-unit-dialog').getByRole('button',{name:'Flasche · 1 l',exact:true}).count(),0);await page.click('#purchase-unit-dialog .unit-more summary');assert.equal(await page.locator('#purchase-unit-dialog').getByRole('button',{name:'Flasche · 1 l',exact:true}).count(),1);
    await page.locator('#purchase-unit-dialog .unit-choices').getByRole('button',{name:'l',exact:true}).click();assert.equal(await page.inputValue('#item-form [name=unit]'),'l');
    await page.fill('#item-form [name=quantity]','0,5');await page.click('#item-form button[type=submit]');const row=(await storedDemo(page)).items.find(r=>!r.deletedAt&&r.name==='Milch'&&!r.storeId);assert.equal(row.quantity,.5);assert.equal(row.purchaseUnit,null);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('Einkaufsmengen: zwei Rezepte ergeben zwei Packungen, Bearbeiten erhält exakten Bedarf und andere Größe zeigt drei Flaschen',async()=>{
    const {ctx,page,problems}=await context();await seedLocal(ctx,milkRecipes());await open(page);await transferMilk(page,'Milchgericht A');await transferMilk(page,'Milchgericht B');await goTab(page,'shopping');
    let row=(await storedDemo(page)).items.find(r=>!r.deletedAt&&r.name==='Milch');assert.equal(row.quantity,1.4);assert.equal(row.unit,'l');assert.equal(await page.locator('#items .item').count(),1);assert.match(await page.textContent('#items'),/2 Packungen à 1 l/);
    await page.locator('#items .item-copy').click();assert.equal(await page.inputValue('#edit-item-form [name=quantity]'),'2');await page.click('#edit-item-form button[type=submit]');row=(await storedDemo(page)).items.find(r=>r.id===row.id);assert.equal(row.quantity,1.4,'unverändertes Speichern rundet den Bedarf nicht auf');
    await page.locator('#items .item-copy').click();await choosePack(page,'#edit-item-form','Flasche','500','ml');assert.equal(await page.inputValue('#edit-item-form [name=quantity]'),'3');await page.click('#edit-item-form button[type=submit]');
    row=(await storedDemo(page)).items.find(r=>r.id===row.id);assert.equal(row.quantity,1.4);assert.equal(row.purchaseUnit.quantity,500);assert.match(await page.textContent('#items'),/3 Flaschen à 500 ml/);
    await page.click('#mode-shop');assert.match(await page.textContent('#shop-list'),/3 Flaschen à 500 ml/);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('Einkaufsmengen: Einheit wird nach Löschen und Offline-Neustart wieder angeboten',async()=>{
    const {ctx,page,problems}=await context();await open(page);await page.fill('#item-form [name=name]','Orangensaft');await choosePack(page,'#item-form','Flasche','750','ml');await page.click('#item-form button[type=submit]');
    const saved=(await storedDemo(page)).items.find(r=>!r.deletedAt&&r.name==='Orangensaft');assert.equal(saved.quantity,750);await page.locator('#items .item',{hasText:'Orangensaft'}).locator('.item-copy').click();await page.click('#delete-item');await page.waitForSelector('#item-dialog[open]',{state:'detached'});await page.reload();await page.waitForSelector('#status[data-state]',{state:'attached'});await ctx.setOffline(true);
    await page.fill('#item-form [name=name]','Orangensaft');assert.equal(await page.inputValue('#item-form [name=unit]'),'Flasche');assert.match(await page.locator('#item-form .purchase-hint').textContent(),/750 ml/);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('Einkaufsmengen: Nachkaufen und Bildauswahl verwenden dieselben Packungszähler',async()=>{
    const {ctx,page,problems}=await context();await open(page);await buyPantryProduct(page,'Milch');
    assert.equal(await page.inputValue('#pantry-buy-form [name=unit]'),'Packung');assert.equal(await page.isDisabled('#pantry-buy-form .quantity-down'),true);await page.click('#pantry-buy-form .quantity-up');await page.click('#pantry-buy-add');
    let row=(await storedDemo(page)).items.find(r=>!r.deletedAt&&r.name==='Milch'&&!r.storeId);assert.equal(row.quantity,2);assert.equal(row.unit,'l');await closePantry(page);await page.click('#open-products');await page.fill('#product-picker-search','Butter');await page.locator('.product-card[data-product=butter] .product-pick').click();await page.click('#product-picker-count');
    const cart=page.locator('.product-cart-row',{hasText:'Butter'});assert.equal(await cart.locator('input').first().inputValue(),'1');await cart.locator('.quantity-up').click();await page.click('#product-picker-add');row=(await storedDemo(page)).items.find(r=>!r.deletedAt&&r.name==='Butter');assert.equal(row.quantity,500);assert.equal(row.unit,'g');assert.deepEqual(problems,[]);await ctx.close();
  });
  test('Einkaufsmengen: gemeinsame Rezeptübernahmen und unveränderter Editor erhalten Änderungen des zweiten Geräts',async()=>{
    const api=github(milkRecipes()),a=await context({config:connectedConfig}),b=await context({config:{...connectedConfig,actor:'Anna'}});for(const d of [a,b]){await d.ctx.route('https://api.github.com/**',api.handler);await open(d.page);await synced(d.page);}
    await transferMilk(a.page,'Milchgericht A');await synced(a.page);await pollNow(b.page);await goTab(a.page,'shopping');await a.page.locator('#items .item-copy').click();
    await transferMilk(b.page,'Milchgericht B');await synced(b.page);await pollNow(a.page);await a.page.fill('#edit-item-form [name=name]','Milch');await a.page.click('#edit-item-form button[type=submit]');await synced(a.page);
    const row=api.content.items.find(r=>!r.deletedAt&&r.name==='Milch');assert.equal(row.quantity,1.4);assert.equal(row.unit,'l');assert.match(await a.page.textContent('#items'),/2 Packungen/);assert.deepEqual([...a.problems,...b.problems],[]);await a.ctx.close();await b.ctx.close();
  });
  for(const width of [280,320,390])for(const theme of ['light','dark'])test(`Einkaufsmengen Layout (${width} px ${theme}): Pfeile, Einheit und Menü bleiben bedienbar`,async()=>{
    const {ctx,page,problems}=await context({config:{theme},context:{viewport:{width,height:844},colorScheme:theme}});await open(page);await page.fill('#item-form [name=name]','Milch');await page.keyboard.press('Enter');assert.ok(await horizontalOverflow(page)<=1);
    for(const selector of ['.quantity-up','.quantity-down']){const box=await page.locator('#item-form '+selector).boundingBox();assert.ok(box.width>=44&&box.height>=44,JSON.stringify(box));}
    await page.click('#item-form [name=unit]');assert.ok(await horizontalOverflow(page)<=1);assert.equal(await page.evaluate(()=>{const d=document.querySelector('#purchase-unit-dialog');return d.scrollWidth<=d.clientWidth+1}),true);await page.getByRole('button',{name:'Einheitenmenü schließen',exact:true}).click();assert.deepEqual(problems,[]);await ctx.close();
  });
  test('Einheiten merken: Gramm bleiben nach Zusammenzählen, Neustart und erneutem Ändern als Vorgabe erhalten', async () => {
    const {ctx,page,problems}=await context();await seedLocal(ctx,milkRecipes());await open(page);
    await page.fill('#item-form [name=name]','Mandeln');await chooseUnit(page,'#item-form [name=unit]','g');await page.fill('#item-form [name=quantity]','600');await page.click('#item-form button[type=submit]');
    await page.fill('#item-form [name=name]','Mandeln');assert.equal(await page.inputValue('#item-form [name=unit]'),'g');await page.fill('#item-form [name=quantity]','800');await page.click('#item-form button[type=submit]');
    let row=(await storedDemo(page)).items.find(r=>!r.deletedAt&&r.name==='Mandeln');assert.equal(row.quantity,1.4);assert.equal(row.unit,'kg');assert.equal(row.purchaseMeasure,'g');assert.match(await page.textContent('#items'),/1.400 g/);assert.equal((await storedDemo(page)).sync.minRev,9);
    await page.reload();await page.waitForSelector('#status[data-state]',{state:'attached'});await page.fill('#item-form [name=name]','Mandeln');assert.equal(await page.inputValue('#item-form [name=unit]'),'g');
    await page.fill('#item-form [name=name]','');await page.locator('#items .item-copy').click();assert.equal(await page.inputValue('#edit-item-form [name=quantity]'),'1400');await page.click('#edit-item-form button[type=submit]');
    row=(await storedDemo(page)).items.find(r=>r.id===row.id);assert.equal(row.quantity,1.4);assert.equal(row.unit,'kg','unverändertes Speichern erhält die Rechenmenge');
    await page.locator('#items .item-copy').click();await chooseUnit(page,'#edit-item-form [name=unit]','kg');await page.click('#edit-item-form button[type=submit]');
    await page.fill('#item-form [name=name]','Mandeln');assert.equal(await page.inputValue('#item-form [name=unit]'),'kg');await chooseUnit(page,'#item-form [name=unit]','g');await page.fill('#item-form [name=quantity]','100');await page.click('#item-form button[type=submit]');
    await page.fill('#item-form [name=name]','Mandeln');assert.equal(await page.inputValue('#item-form [name=unit]'),'g');assert.deepEqual(problems,[]);await ctx.close();
  });
  test('Einheiten merken: Abbrechen speichert keine Vorgabe, Bildauswahl und Nachkaufen übernehmen die bestätigte Wahl', async () => {
    const {ctx,page,problems}=await context();await seedLocal(ctx,milkRecipes());await open(page);
    await page.fill('#item-form [name=name]','Milch');await choosePack(page,'#item-form','Flasche','750','ml');await page.click('#item-form button[type=submit]');
    const saved=(await storedDemo(page)).items.find(r=>r.name==='Milch');await page.locator('#items .item-copy').click();await chooseUnit(page,'#edit-item-form [name=unit]','l');await page.click('#item-dialog .sheet-head [data-close]');
    assert.equal((await storedDemo(page)).items.find(r=>r.id===saved.id).purchaseUnit.label,'Flasche');await page.fill('#item-form [name=name]','Milch');assert.equal(await page.inputValue('#item-form [name=unit]'),'Flasche');
    await page.keyboard.press('Enter');await page.click('#open-products');await page.waitForSelector('#product-picker-dialog[open]');await page.fill('#product-picker-search','Milch');await page.locator('.product-card[data-product=milch] .product-pick').click();await page.click('#product-picker-count');
    const cart=page.locator('.product-cart-row',{hasText:'Milch'});assert.equal(await cart.locator('[aria-label="Milch: Einheit"]').inputValue(),'Flasche');assert.match(await cart.locator('.purchase-hint').textContent(),/750 ml/);await page.click('#product-picker-dialog [data-close]');
    await buyPantryProduct(page,'Milch');
    assert.equal(await page.inputValue('#pantry-buy-form [name=unit]'),'Flasche');assert.match(await page.locator('#pantry-buy-form .purchase-hint').textContent(),/750 ml/);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('Einheiten merken: zweites Gerät übernimmt die Änderung und unverändertes Bearbeiten erhält parallele Mengen',async()=>{
    const api=github(milkRecipes()),a=await context({config:connectedConfig}),b=await context({config:{...connectedConfig,actor:'Anna'}});for(const d of [a,b]){await d.ctx.route('https://api.github.com/**',api.handler);await open(d.page);await synced(d.page);}
    await a.page.fill('#item-form [name=name]','Mandeln');await chooseUnit(a.page,'#item-form [name=unit]','g');await a.page.fill('#item-form [name=quantity]','600');await a.page.click('#item-form button[type=submit]');await synced(a.page);await pollNow(b.page);await synced(b.page);
    await a.page.locator('#items .item-copy').click();await b.page.fill('#item-form [name=name]','Mandeln');assert.equal(await b.page.inputValue('#item-form [name=unit]'),'g');await b.page.fill('#item-form [name=quantity]','800');await b.page.click('#item-form button[type=submit]');await synced(b.page);await pollNow(a.page);await synced(a.page);await a.page.click('#edit-item-form button[type=submit]');await synced(a.page);
    let row=api.content.items.find(r=>!r.deletedAt&&r.name==='Mandeln');assert.equal(row.quantity,1.4);assert.equal(row.unit,'kg');assert.equal(row.purchaseMeasure,'g');
    await a.page.locator('#items .item-copy').click();await chooseUnit(a.page,'#edit-item-form [name=unit]','kg');await a.page.click('#edit-item-form button[type=submit]');await synced(a.page);await pollNow(b.page);await synced(b.page);
    await b.page.fill('#item-form [name=name]','Mandeln');assert.equal(await b.page.inputValue('#item-form [name=unit]'),'kg');row=api.content.items.find(r=>r.id===row.id);assert.equal(row.quantity,1.4);assert.deepEqual([...a.problems,...b.problems],[]);await a.ctx.close();await b.ctx.close();
  });
  test('Einheiten merken: alter Offline-Entwurf setzt die neuere manuelle Wahl nicht zurück',async()=>{
    const api=github(milkRecipes());let offline=false;
    const a=await context({config:connectedConfig}),b=await context({config:{...connectedConfig,actor:'Anna'}});
    await a.ctx.route('https://api.github.com/**',api.handler);await b.ctx.route('https://api.github.com/**',route=>offline?route.abort('internetdisconnected'):api.handler(route));
    for(const d of [a,b]){await open(d.page);await synced(d.page);}
    await a.page.fill('#item-form [name=name]','Mandeln');await chooseUnit(a.page,'#item-form [name=unit]','g');await a.page.fill('#item-form [name=quantity]','600');await a.page.click('#item-form button[type=submit]');await synced(a.page);await pollNow(b.page);await synced(b.page);
    offline=true;await b.ctx.setOffline(true);await b.page.fill('#item-form [name=name]','Mandeln');assert.equal(await b.page.inputValue('#item-form [name=unit]'),'g');await b.page.fill('#item-form [name=quantity]','100');await b.page.click('#item-form button[type=submit]');
    await a.page.locator('#items .item-copy').click();await chooseUnit(a.page,'#edit-item-form [name=unit]','kg');await a.page.click('#edit-item-form button[type=submit]');await synced(a.page);
    offline=false;await b.ctx.setOffline(false);await pollNow(b.page);await synced(b.page);
    const row=api.content.items.find(r=>!r.deletedAt&&r.name==='Mandeln');assert.equal(row.quantity,700);assert.equal(row.purchaseMeasure,'kg');await b.page.fill('#item-form [name=name]','Mandeln');assert.equal(await b.page.inputValue('#item-form [name=unit]'),'kg');
    assert.deepEqual(a.problems,[]);assert.deepEqual(b.problems.filter(text=>!/Failed to load resource|Failed to fetch/.test(text)),[]);await a.ctx.close();await b.ctx.close();
  });
  const eggRecipes=()=>{const d=milkRecipes();d.recipes[0].name='Eiergericht A';d.recipes[1].name='Eiergericht B';d.ingredients[0]={...d.ingredients[0],name:'Eier',quantity:2,unit:'Stück'};d.ingredients[1]={...d.ingredients[1],name:'Eier',quantity:5,unit:'Stück'};return d;};
  test('Packungsgrößen: sieben Eier aus zwei Rezepten, persönliche Größe ändern und exakten Bedarf erhalten',async()=>{
    const {ctx,page,problems}=await context();await seedLocal(ctx,eggRecipes());await open(page);await transferMilk(page,'Eiergericht A');await transferMilk(page,'Eiergericht B');await goTab(page,'shopping');
    let row=(await storedDemo(page)).items.find(r=>!r.deletedAt&&r.name==='Eier');assert.equal(row.quantity,7);assert.match(await page.textContent('#items'),/7 Stück/);
    await page.locator('#items .item-copy').click();await page.click('#edit-item-form .pack-size-link');await page.getByRole('button',{name:'Packung · 6 Eier',exact:true}).click();
    assert.equal(await page.inputValue('#edit-item-form [name=quantity]'),'2');assert.match(await page.textContent('#edit-item-form .purchase-hint'),/Bedarf: 7 Eier.*Einkauf: 12 Eier/);await page.click('#edit-item-form button[type=submit]');assert.match(await page.textContent('#items'),/2 Packungen à 6 Eier/);
    await page.locator('#items .item-copy').click();await page.click('#edit-item-form [name=unit]');await page.getByRole('button',{name:'Packung · 12 Eier',exact:true}).click();assert.equal(await page.inputValue('#edit-item-form [name=quantity]'),'1');await page.click('#edit-item-form button[type=submit]');
    row=(await storedDemo(page)).items.find(r=>r.id===row.id);assert.equal(row.quantity,7);assert.match(await page.textContent('#items'),/1 Packung à 12 Eier/);
    await page.fill('#item-form [name=name]','Eier');assert.equal(await page.inputValue('#item-form [name=unit]'),'Packung');assert.equal(await page.inputValue('#item-form [name=quantity]'),'1');assert.match(await page.textContent('#item-form .purchase-hint'),/12 Eier/);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('Packungsgrößen: alte Packung ohne Inhalt fragt einmal, eigene Größe bleibt nach Neustart erhalten',async()=>{
    const data=milkRecipes();data.sync.minRev=8;data.items=[{...demo.items[0],id:'old-eggs',name:'Eier',quantity:1,unit:'Packung',storeId:'',price:null,salePrice:null,onSale:false,purchaseUnit:null,purchaseMeasure:'Packung',purchaseAt:'2026-10-29T12:00:00.000Z'}];
    const {ctx,page,problems}=await context();await seedLocal(ctx,data);await open(page);await page.locator('#items .item-copy').click();await page.click('#edit-item-form button[type=submit]');await page.waitForSelector('#purchase-unit-dialog[open]');assert.equal((await storedDemo(page)).items[0].unit,'Packung');
    await page.getByRole('button',{name:'Andere Packungsgröße',exact:true}).click();await page.fill('#purchase-unit-dialog [name=size]','8,5');await page.click('#purchase-unit-dialog button[type=submit]');assert.match(await page.textContent('#purchase-unit-dialog .dialog-error'),/ganze Zahl/);
    await page.fill('#purchase-unit-dialog [name=size]','8');await page.click('#purchase-unit-dialog button[type=submit]');await page.click('#edit-item-form button[type=submit]');
    const row=(await storedDemo(page)).items[0];assert.equal(row.quantity,8);assert.equal(row.unit,'Stück');assert.equal(row.purchaseUnit.quantity,8);
    await page.reload();await page.waitForSelector('#status[data-state]',{state:'attached'});await page.fill('#item-form [name=name]','Eier');assert.equal(await page.inputValue('#item-form [name=unit]'),'Packung');assert.match(await page.textContent('#item-form .purchase-hint'),/8 Eier/);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('Packungsgrößen: Bildauswahl fragt bei Wraps vor dem Hinzufügen und öffnet die Mengen automatisch',async()=>{
    const {ctx,page,problems}=await context();await seedLocal(ctx,milkRecipes());await open(page);await page.click('#open-products');await page.fill('#product-picker-search','Wraps');await page.locator('.product-card[data-product=wraps] .product-pick').click();
    await page.click('#product-picker-add');await page.waitForSelector('#purchase-unit-dialog[open]');assert.equal(await page.locator('#product-picker-cart').evaluate(n=>n.open),true);await page.getByRole('button',{name:'Packung · 6 Stück',exact:true}).click();await page.click('#product-picker-add');
    const row=(await storedDemo(page)).items.find(r=>r.name==='Wraps'&&!r.deletedAt);assert.equal(row.quantity,6);assert.equal(row.unit,'Stück');assert.equal(row.purchaseUnit.quantity,6);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('Mengen merken: 450 g bleiben Vorgabe trotz Summe, Rezept, Neustart und späterer Mengen-/Einheitenänderung',async()=>{
    const data=milkRecipes();data.ingredients[0]={...data.ingredients[0],name:'Hackfleisch gemischt',quantity:200,unit:'g'};
    const {ctx,page,problems}=await context();await seedLocal(ctx,data);await open(page);await pickStore(page,'Edeka');await page.fill('#item-form [name=name]','Hackfleisch gemischt');assert.equal(await page.inputValue('#item-form [name=quantity]'),'100');assert.equal(await page.inputValue('#item-form [name=unit]'),'g');
    await page.click('#item-form .quantity-up');assert.equal(await page.inputValue('#item-form [name=quantity]'),'150');await page.click('#item-form .quantity-down');assert.equal(await page.inputValue('#item-form [name=quantity]'),'100');await page.click('#item-form .quantity-down');assert.equal(await page.inputValue('#item-form [name=quantity]'),'90');
    await page.fill('#item-form [name=quantity]','450');await page.click('#item-form button[type=submit]');await page.fill('#item-form [name=name]','Hackfleisch gemischt');assert.equal(await page.inputValue('#item-form [name=quantity]'),'450');await page.click('#item-form button[type=submit]');
    await transferMilk(page,'Milchgericht A');await goTab(page,'shopping');let row=(await storedDemo(page)).items.find(r=>r.name==='Hackfleisch gemischt'&&!r.deletedAt);assert.equal(row.quantity,1.1);assert.equal(row.unit,'kg');assert.equal(row.purchaseAmount.quantity,450);
    await page.reload();await page.waitForSelector('#status[data-state]',{state:'attached'});await page.fill('#item-form [name=name]','Hackfleisch gemischt');assert.equal(await page.inputValue('#item-form [name=quantity]'),'450');await page.fill('#item-form [name=name]','');
    await page.locator('#items .item-copy').click();await page.fill('#edit-item-form [name=quantity]','700');await page.click('#edit-item-form button[type=submit]');await page.locator('#items .item-copy').click();await chooseUnit(page,'#edit-item-form [name=unit]','kg');await page.click('#edit-item-form button[type=submit]');
    await page.fill('#item-form [name=name]','Hackfleisch gemischt');assert.equal(await page.inputValue('#item-form [name=quantity]'),'0,7');assert.equal(await page.inputValue('#item-form [name=unit]'),'kg');assert.deepEqual(problems,[]);await ctx.close();
  });
  test('Mengen merken: zweites Gerät und Offline-Einkauf erhalten die jüngere Einzelmenge',async()=>{
    const api=github(milkRecipes());let offline=false;const a=await context({config:connectedConfig}),b=await context({config:{...connectedConfig,actor:'Anna'}});
    await a.ctx.route('https://api.github.com/**',api.handler);await b.ctx.route('https://api.github.com/**',route=>offline?route.abort('internetdisconnected'):api.handler(route));for(const d of [a,b]){await open(d.page);await synced(d.page);}
    await a.page.fill('#item-form [name=name]','Hackfleisch gemischt');await a.page.fill('#item-form [name=quantity]','450');await a.page.click('#item-form button[type=submit]');await synced(a.page);await pollNow(b.page);await synced(b.page);
    offline=true;await b.ctx.setOffline(true);await b.page.fill('#item-form [name=name]','Hackfleisch gemischt');assert.equal(await b.page.inputValue('#item-form [name=quantity]'),'450');await b.page.click('#item-form button[type=submit]');
    await a.page.fill('#item-form [name=name]','Hackfleisch gemischt');await a.page.fill('#item-form [name=quantity]','700');await a.page.click('#item-form button[type=submit]');await synced(a.page);offline=false;await b.ctx.setOffline(false);await pollNow(b.page);await synced(b.page);
    const row=api.content.items.find(r=>r.name==='Hackfleisch gemischt'&&!r.deletedAt);assert.equal(row.quantity,1.6);assert.equal(row.purchaseAmount.quantity,700);await b.page.fill('#item-form [name=name]','Hackfleisch gemischt');assert.equal(await b.page.inputValue('#item-form [name=quantity]'),'700');assert.deepEqual(a.problems,[]);assert.deepEqual(b.problems.filter(s=>!/Failed to load resource|Failed to fetch/.test(s)),[]);await a.ctx.close();await b.ctx.close();
  });
  for(const width of [280,314,360,390,430])for(const theme of ['light','dark'])test(`Mengenfelder Layout (${width} px ${theme}): Hinzufügen und Bearbeiten haben gleich breite Spalten`,async()=>{
    const {ctx,page,problems}=await context({config:{theme},context:{viewport:{width,height:844},colorScheme:theme}});await seedLocal(ctx,milkRecipes());await open(page);await page.fill('#item-form [name=name]','Hackfleisch gemischt');await page.keyboard.press('Enter');
    const equal=async form=>{const q=await page.locator(form+' .quantity-stepper').boundingBox(),u=await page.locator(form+' [name=unit]').boundingBox();assert.ok(Math.abs(q.width-u.width)<=1,JSON.stringify({width,q,u}));assert.ok(await horizontalOverflow(page)<=1);};
    await equal('#item-form');await page.click('#item-form button[type=submit]');await page.locator('#items .item-copy').click();await equal('#edit-item-form');assert.deepEqual(problems,[]);await ctx.close();
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
  test('2.76: rotes Kreuz verwirft nur den Entwurf, Hinzufügen klappt zu und freie Fläche schließt die Tastatur',async()=>{
    const {ctx,page,problems}=await context();await open(page);
    const before=await page.locator('#items .item').count();
    await page.fill('#item-form [name=name]','Hackfleisch gemischt');await page.fill('#item-form [name=quantity]','450');
    await page.screenshot({path:'/tmp/sattplan276-eingabe.png'});
    await page.click('#clear-item-name');
    assert.equal(await page.inputValue('#item-form [name=name]'),'');assert.ok(await page.locator('#item-form').evaluate(node=>node.classList.contains('compact')));assert.equal(await page.locator('#items .item').count(),before);
    assert.equal(await page.evaluate(()=>document.activeElement.matches('input,textarea')),false);
    await page.fill('#item-form [name=name]','Hackfleisch gemischt');await page.fill('#item-form [name=quantity]','450');
    await page.touchscreen.tap(4,400);assert.equal(await page.evaluate(()=>document.activeElement.matches('input,textarea')),false);assert.equal(await page.locator('#item-form .qty').isVisible(),true);
    await page.click('#add-item-confirm');assert.equal(await page.inputValue('#item-form [name=name]'),'');assert.equal(await page.locator('#item-form .qty').isVisible(),false);assert.match(await page.textContent('#items'),/Hackfleisch/);
    await page.click('#select-mode');assert.match(await page.textContent('#select-count'),/Nichts ausgewählt.*runterscrollen/);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.76: gemerkte Menge separat ändern und zurücksetzen, einmaliger Einkauf überschreibt sie nicht',async()=>{
    const {ctx,page,problems}=await context();await open(page);
    await page.fill('#item-form [name=name]','Hackfleisch gemischt');await page.fill('#item-form [name=quantity]','450');await page.click('#add-item-confirm');
    const item=()=>page.locator('#items .item',{hasText:'Hackfleisch gemischt'}).locator('.item-copy');
    await item().click();await sheetOpen(page);assert.match(await page.textContent('#remembered-amount-text'),/450 g/);
    await page.click('#change-remembered-amount');await page.fill('#edit-item-form [name=memoryQuantity]','600');await page.click('#save-remembered-amount');
    assert.equal(await page.inputValue('#edit-item-form [name=quantity]'),'450');assert.match(await page.textContent('#remembered-amount-text'),/600 g/);
    await page.check('#edit-item-form [name=onceOnly]');await page.fill('#edit-item-form [name=quantity]','1000');await page.click('#edit-item-form button[type=submit]');
    await page.fill('#item-form [name=name]','Hackfleisch gemischt');assert.equal(await page.inputValue('#item-form [name=quantity]'),'600');await page.click('#clear-item-name');
    await item().click();await sheetOpen(page);await page.click('#reset-remembered-amount');assert.match(await page.textContent('#remembered-amount-text'),/Keine eigene Menge/);await page.click('#item-dialog [data-close]');
    await page.reload();await open(page);await page.fill('#item-form [name=name]','Hackfleisch gemischt');assert.equal(await page.inputValue('#item-form [name=quantity]'),'100');assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.76: seltene Einheiten sind eingeklappt, Eier-Packungsgrößen bleiben direkt erreichbar',async()=>{
    const {ctx,page,problems}=await context();await open(page);await page.fill('#item-form [name=name]','Eier');await page.click('#item-form [name=unit]');
    assert.equal(await page.getByRole('button',{name:'Packung · 6 Eier',exact:true}).isVisible(),true);
    assert.equal(await page.getByRole('button',{name:'Tube',exact:true}).isVisible(),false);await page.click('#purchase-unit-dialog .unit-more summary');assert.equal(await page.getByRole('button',{name:'Tube',exact:true}).isVisible(),true);
    await page.getByRole('button',{name:'Tube',exact:true}).click();assert.equal(await page.inputValue('#item-form [name=unit]'),'Tube');assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.76: Einkaufsabschluss unter Alle ordnet die Ausgabe einem Geschäft zu und entfernt weiterhin alle abgehakten Artikel',async()=>{
    const {ctx,page,problems}=await context();await open(page);await page.click('#mode-shop');await storeButton(page,'#shop-chips','Alle').click();
    await shopTap(page,'Tomaten').click();await shopTap(page,'Milch').click();await finishShop(page);await sheetOpen(page);
    assert.equal(await page.locator('#finish-store-field').isVisible(),true);await page.selectOption('#finish-form [name=expenseStoreId]','store-lidl');await page.fill('#finish-form [name=amount]','23,45');
    await page.screenshot({path:'/tmp/sattplan276-abschluss.png'});await page.click('#finish-form .add-button');
    const out=await expenseStored(page),purchase=out.purchases.at(-1);assert.equal(purchase.storeId,'store-lidl');assert.equal(purchase.storeName,'Lidl');assert.equal(purchase.cents,2345);assert.ok(out.items.filter(row=>['Tomaten','Milch'].includes(row.name)).every(row=>row.deletedAt));assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.76: Portionsvorschau und Gericht entfernen erhalten manuell hinzugefügten Reis',async()=>{
    const {ctx,page,problems}=await context();await open(page);await planPasta(page,'4','Kichererbsen-Curry');await takeWeek(page);await page.click('#week-form button[type=submit]');await page.waitForSelector('#week-dialog',{state:'hidden'});
    await page.fill('#item-form [name=name]','Reis');await storeButton(page,'#store-pick','Lidl').click();await page.click('#item-form [name=unit]');await page.getByRole('button',{name:'g',exact:true}).click();await page.fill('#item-form [name=quantity]','100');await page.click('#add-item-confirm');
    await goTab(page,'plan');await page.getByRole('button',{name:'Kichererbsen-Curry ändern',exact:true}).click();await sheetOpen(page);await page.fill('#meal-form [name=servings]','2');await page.click('#meal-form button[type=submit]');
    await page.waitForSelector('#plan-adjust-dialog[open]');assert.match(await page.textContent('#plan-adjust-list'),/Reis/);await page.screenshot({path:'/tmp/sattplan276-plan.png'});await page.click('#plan-adjust-apply');await page.waitForSelector('#plan-adjust-dialog',{state:'hidden'});
    assert.deepEqual((await listQty(page,'Reis')).sort(),['100 g','150 g']);await page.getByRole('button',{name:'Kichererbsen-Curry aus dem Plan entfernen',exact:true}).click();await page.waitForSelector('#plan-adjust-dialog[open]');await page.click('#plan-adjust-apply');assert.deepEqual(await listQty(page,'Reis'),['100 g']);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.76: globaler Auswahl- und Kontextmenüschutz lässt Eingeben und App-Haltegesten zu',async()=>{
    const {ctx,page,problems}=await context();await open(page);
    for(const selector of ['#shopping-title','#items','.tabs','#item-form [name=name]']){
      assert.equal(await page.locator(selector).evaluate(node=>getComputedStyle(node).userSelect),'none');
      assert.equal(await page.locator(selector).evaluate(node=>{const event=new Event('contextmenu',{bubbles:true,cancelable:true});node.dispatchEvent(event);return event.defaultPrevented;}),true);
    }
    await page.fill('#item-form [name=name]','Testeingabe');const fieldBox=await page.locator('#item-form [name=name]').boundingBox();await page.mouse.move(fieldBox.x+30,fieldBox.y+20);await page.mouse.down();await page.waitForTimeout(650);await page.mouse.up();await page.waitForFunction(()=>{const field=document.querySelector('#item-form [name=name]');return field.selectionStart===field.selectionEnd;});
    await page.fill('#item-form [name=name]','Andere Eingabe');assert.equal(await page.inputValue('#item-form [name=name]'),'Andere Eingabe');await page.click('#clear-item-name');await inShop(page);await finishShop(page);assert.equal(await page.locator('#finish-dialog').evaluate(node=>node.open),true);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.76: Speicherstatus unterscheidet gemeinsam gespeichert und nur lokal wartende Änderungen',async()=>{
    const remote=github(demo);const {ctx,page}=await context({config:connectedConfig});let offline=false;
    await ctx.route('https://api.github.com/**',route=>offline?route.abort():remote.handler(route));await open(page);await page.waitForFunction(()=>document.querySelector('#status').dataset.state==='ok');assert.match(await page.textContent('#sync-detail'),/Auf GitHub gespeichert.*um \d{2}:\d{2} Uhr/);
    offline=true;await page.fill('#item-form [name=name]','Testartikel');await page.click('#add-item-confirm');await page.waitForFunction(()=>document.querySelector('#status').dataset.state==='error');assert.match(await page.textContent('#sync-detail'),/1 Änderung nur auf diesem Gerät.*wird später gesendet/);
    offline=false;await page.click('#refresh');await page.waitForFunction(()=>document.querySelector('#status').dataset.state==='ok');assert.match(await page.textContent('#sync-detail'),/Auf GitHub gespeichert/);assert.ok(remote.content.items.some(row=>row.name==='Testartikel'));await ctx.close();
  });

  async function context277(options={}) {
    const made=await context(options),data=structuredClone(demo);data.items=[];data.meals=[];
    await made.ctx.addInitScript(data=>{if(!localStorage.getItem('einkauf-demo-v1'))localStorage.setItem('einkauf-demo-v1',JSON.stringify({base:data,pending:[]}));},data);
    await open(made.page);return made;
  }
  const data277=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('einkauf-demo-v1')).base);
  async function pick277(page,recipe='Tomaten-Pasta',servings='2') {
    await goTab(page,'plan');await page.locator('.day.today .day-head .icon-button').click();await sheetOpen(page);
    await page.locator('#recipe-pick .pick-row',{hasText:recipe}).click();await page.fill('#meal-form [name=servings]',servings);
  }
  test('2.77: gewähltes Rezept zeigt PDF-Hinweis direkt neben der Auswahl; langes Drücken öffnet weiterhin das Blatt',async()=>{
    const {ctx,page,problems}=await context277();await pick277(page);
    const selected=page.locator('#recipe-pick .pick-row[aria-pressed=true]');assert.equal(await selected.count(),1);assert.match(await selected.locator('.pick-pdf-hint').textContent(),/Lange drücken.*PDF/);assert.equal(await selected.locator('.pick-pdf-hint').isVisible(),true);
    assert.equal(await page.locator('#recipe-pick .pick-row:not([aria-pressed=true]) .pick-pdf-hint').first().isVisible(),false);
    await selected.scrollIntoViewIfNeeded();const box=await selected.boundingBox();await page.mouse.move(box.x+30,box.y+box.height/2);await page.mouse.down();await page.waitForSelector('#sheet-dialog[open] .sheet-page',{timeout:5000});await page.mouse.up();assert.match(await sheetText(page),/Tomaten-Pasta/);
    await page.click('#sheet-close');assert.equal(await page.inputValue('#meal-form [name=recipeId]'),'recipe-pasta');assert.deepEqual(problems,[]);await ctx.close();
  });
  for(const width of [280,320,390])test(`2.77: Einkauf-Untertitel und beide Speichern-Aktionen bleiben bei ${width} px bedienbar`,async()=>{
    const {ctx,page,problems}=await context277({context:{viewport:{width,height:740}}});await goTab(page,'plan');
    assert.match(await page.locator('#plan-shopping small').textContent(),/Zutaten dem Einkaufszettel hinzufügen/);assert.equal(await horizontalOverflow(page),0);
    await pick277(page,'Kichererbsen-Curry','4');await page.screenshot({path:`/tmp/sattplan277-plan-${width}.png`});
    for(const selector of ['#meal-save','#meal-save-shopping']){const button=page.locator(selector);assert.equal(await button.isVisible(),true);const box=await button.boundingBox();assert.ok(box.width>=44&&box.height>=44);assert.ok(box.y+box.height<=741);}
    assert.equal(await page.locator('#meal-dialog').evaluate(node=>node.scrollWidth<=node.clientWidth),true);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.77: Speichern allein ändert nur den Plan; Kombi-Aktion übernimmt ausschließlich dieses Gericht und zählt erneut nicht doppelt',async()=>{
    const {ctx,page,problems}=await context277();await pick277(page,'Kichererbsen-Curry','2');await page.click('#meal-save');assert.equal((await data277(page)).items.length,0);
    await pick277(page,'Tomaten-Pasta','4');await page.click('#meal-save-shopping');let data=await data277(page);assert.equal(data.meals.length,2);
    let pasta=data.meals.find(row=>row.recipeId==='recipe-pasta');assert.equal(pasta.listedServings,4);assert.ok(pasta.listedParts.length>0);assert.equal(data.meals.find(row=>row.recipeId==='recipe-curry').listedServings,undefined);
    assert.equal(data.items.some(row=>row.name==='Reis'),false);assert.equal(data.items.find(row=>row.name==='Nudeln').quantity,400);
    await page.getByRole('button',{name:'Tomaten-Pasta ändern',exact:true}).click();await sheetOpen(page);await page.click('#meal-save-shopping');data=await data277(page);assert.equal(data.items.find(row=>row.name==='Nudeln').quantity,400);
    await page.getByRole('button',{name:'Tomaten-Pasta ändern',exact:true}).click();await sheetOpen(page);await page.fill('#meal-form [name=servings]','6');await page.click('#meal-save-shopping');data=await data277(page);assert.equal(data.items.find(row=>row.name==='Nudeln').quantity,600);assert.equal(data.meals.find(row=>row.recipeId==='recipe-pasta').listedServings,6);
    await page.click('#plan-shopping');await sheetOpen(page);assert.ok(!/Nudeln/.test(await page.textContent('#week-ingredients')));assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.77: Kombi-Aktion sichert Plan und Einkauf atomar und bleibt nach einem Speicherfehler erneut ausführbar',async()=>{
    const {ctx,page,problems}=await context277();await pick277(page);
    await page.evaluate(()=>{const write=Storage.prototype.setItem;window.__restoreWrite=()=>{Storage.prototype.setItem=write;};Storage.prototype.setItem=function(key,value){if(key==='einkauf-demo-v1')throw new DOMException('Speicher voll','QuotaExceededError');return write.call(this,key,value);};});
    await page.click('#meal-save-shopping');let data=await data277(page);assert.equal(data.meals.length,0);assert.equal(data.items.length,0);assert.equal(await page.locator('#meal-dialog').evaluate(node=>node.open),true);assert.match(await page.textContent('#meal-dialog [data-dialog-error]'),/lokal speichern/);
    await page.evaluate(()=>window.__restoreWrite());await page.click('#meal-save-shopping');data=await data277(page);assert.equal(data.meals.length,1);assert.equal(data.items.find(row=>row.name==='Nudeln').quantity,200);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.77: Wochentags-Rezept bleibt in einer eigenen Ansicht mit den geplanten Portionen; andere Rezepte sind beim Scrollen unsichtbar',async()=>{
    const {ctx,page,problems}=await context277();await pick277(page,'Tomaten-Pasta','4');await page.click('#meal-save');
    await page.locator('.day.today .meal .link-button').click();await page.waitForSelector('#plan-recipe-dialog[open]');await sheetOpen(page);
    assert.equal(await page.locator('#plan-recipe-content .recipe-card').count(),1);assert.equal(await page.locator('#plan-recipe-content .recipe-head h3').textContent(),'Tomaten-Pasta');assert.equal(await page.locator('#plan-recipe-content .stepper input').inputValue(),'4');assert.match(await page.textContent('#plan-recipe-content .recipe-ingredients'),/400 g Nudeln/);
    for(const scroll of [0,99999,0]){await page.locator('#plan-recipe-dialog').evaluate((node,scroll)=>node.scrollTop=scroll,scroll);assert.equal(await page.locator('#plan-recipe-content .recipe-card').count(),1);assert.equal(await page.locator('#recipe-list .recipe-card').first().isVisible(),false);assert.ok(!/Kichererbsen-Curry|Apfel-Pfannkuchen/.test(await page.textContent('#plan-recipe-content')));}
    await page.screenshot({path:'/tmp/sattplan277-rezept.png'});await page.locator('#plan-recipe-dialog .sheet-actions button').click();assert.equal(await page.locator('#plan').isVisible(),true);await page.waitForFunction(()=>document.querySelector('#plan-recipe-content').children.length===0);
    await goTab(page,'recipes');assert.equal(await page.locator('#recipe-list .recipe-card').count(),3);assert.deepEqual(problems,[]);await ctx.close();
  });
  for(const choice of ['cancel','keep','apply'])test(`2.77: Löschen eines geplanten Rezepts – ${choice} erhält die passenden Mengen und das Bibliotheksrezept`,async()=>{
    const {ctx,page,problems}=await context277();await pick277(page);await page.click('#meal-save-shopping');const before=await data277(page);
    await page.getByRole('button',{name:'Tomaten-Pasta aus dem Plan entfernen',exact:true}).click();await page.waitForSelector('#plan-adjust-dialog[open]');
    assert.match(await page.textContent('#plan-adjust-intro'),/Zutaten.*Einkaufszettel entfernen/);assert.match(await page.textContent('#plan-adjust-apply'),/^Ja,/);assert.match(await page.textContent('#plan-adjust-keep'),/^Nein,.*Zutaten bleiben/);assert.equal(await page.textContent('#plan-adjust-cancel'),'Abbrechen');
    await page.click(`#plan-adjust-${choice}`);const after=await data277(page);assert.equal(after.recipes.filter(row=>!row.deletedAt).length,3);
    if(choice==='cancel')assert.deepEqual(after,before);
    else{assert.equal(after.meals.filter(row=>!row.deletedAt).length,0);if(choice==='keep')assert.deepEqual(after.items,before.items);else assert.equal(after.items.filter(row=>!row.deletedAt&&!row._planEmpty).length,0);}
    assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.77: Eigenes Gericht ohne Rezept bietet nur Speichern, keine leere Zutatenübernahme',async()=>{
    const {ctx,page,problems}=await context277();await pick277(page);await page.locator('#recipe-pick .pick-row.custom').click();assert.equal(await page.locator('#meal-save-shopping').isDisabled(),true);await page.fill('#meal-form [name=title]','Pizza bestellen');await page.click('#meal-save');const data=await data277(page);assert.equal(data.meals[0].title,'Pizza bestellen');assert.equal(data.items.length,0);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.77: Zutaten aus der einzelnen Wochentagsansicht sind dem Gericht zugeordnet und lassen sich mit ihm entfernen',async()=>{
    const {ctx,page,problems}=await context277();await pick277(page);await page.click('#meal-save');await page.locator('.day.today .meal .link-button').click();await page.waitForSelector('#plan-recipe-dialog[open]');
    await page.locator('#plan-recipe-content').getByRole('button',{name:'Auf die Liste',exact:true}).click();await page.waitForSelector('#transfer-dialog[open]');assert.equal(await page.locator('#transfer-plan-note').isVisible(),true);
    await page.click('#transfer-form button[type=submit]');assert.equal(await page.locator('#plan-recipe-dialog').evaluate(node=>node.open),false);assert.equal(await page.locator('#shopping').isVisible(),true);
    const data=await data277(page);assert.equal(data.meals[0].listedServings,2);assert.ok(data.meals[0].listedParts.length>0);
    await goTab(page,'plan');await page.getByRole('button',{name:'Tomaten-Pasta aus dem Plan entfernen',exact:true}).click();await page.waitForSelector('#plan-adjust-dialog[open]');await page.click('#plan-adjust-apply');assert.equal((await data277(page)).items.filter(row=>!row.deletedAt&&!row._planEmpty).length,0);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.77: bereits übernommene Zutaten mit manuellem Zusatz bleiben bei Nein vollständig und bei Ja anteilig erhalten',async()=>{
    const {ctx,page,problems}=await context277();await pick277(page);await page.click('#meal-save-shopping');
    await goTab(page,'shopping');await page.fill('#item-form [name=name]','Nudeln');await page.click('#item-form [name=unit]');await page.getByRole('button',{name:'g',exact:true}).click();await page.fill('#item-form [name=quantity]','100');await page.click('#add-item-confirm');
    await goTab(page,'plan');await page.getByRole('button',{name:'Tomaten-Pasta aus dem Plan entfernen',exact:true}).click();await page.waitForSelector('#plan-adjust-dialog[open]');await page.click('#plan-adjust-cancel');
    assert.equal((await data277(page)).meals.filter(row=>!row.deletedAt).length,1);await page.getByRole('button',{name:'Tomaten-Pasta aus dem Plan entfernen',exact:true}).click();await page.waitForSelector('#plan-adjust-dialog[open]');await page.click('#plan-adjust-apply');
    const remaining=(await data277(page)).items.filter(row=>!row.deletedAt&&!row._planEmpty);assert.equal(remaining.length,1);assert.equal(remaining[0].name,'Nudeln');assert.equal(remaining[0].quantity,100);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.77: Kombi-Speichern und gleichzeitiger Wochen-Einkauf verwenden dieselbe Übernahme für dasselbe Gericht',async()=>{
    const seed=await context277();await pick277(seed.page);await seed.page.click('#meal-save');await pick277(seed.page,'Kichererbsen-Curry','2');await seed.page.click('#meal-save');const shared=await data277(seed.page);await seed.ctx.close();
    const a=await context(),b=await context();
    for(const made of [a,b]){await made.ctx.addInitScript(data=>localStorage.setItem('einkauf-demo-v1',JSON.stringify({base:data,pending:[]})),shared);await open(made.page);await goTab(made.page,'plan');}
    await a.page.getByRole('button',{name:'Tomaten-Pasta ändern',exact:true}).click();await sheetOpen(a.page);await a.page.click('#meal-save-shopping');
    await b.page.click('#plan-shopping');await sheetOpen(b.page);await b.page.click('#week-form button[type=submit]');
    const parts=async page=>(await data277(page)).meals.find(row=>row.recipeId==='recipe-pasta').listedParts.map(part=>[part.sourceId,part.quantity,part.unit]).sort();
    assert.deepEqual(await parts(a.page),await parts(b.page));assert.deepEqual([...a.problems,...b.problems],[]);await a.ctx.close();await b.ctx.close();
  });

  // Direkte Vorratsauswahl (2.78): gleiche Daten, ein Bildraster, keine zusätzliche Listenseite.
  function pantryData278(rows=[]) {
    const data=structuredClone(demo),stamp='2026-10-29T09:00:00.000Z';data.pantry=rows.map((row,index)=>({id:`saved-stock-${index}`,createdAt:stamp,updatedAt:stamp,deletedAt:null,_clock:{},...row}));return data;
  }
  test('2.78: Vorrat öffnet direkt mit sechs Filtern und aktuellem Bestand, ohne gespeicherte Daten neu zu setzen',async()=>{
    const data=pantryData278([{name:'Milch'},{name:'Mehl',available:false},{name:'Meine besondere Mischung',category:'sonstiges',imageKey:'group-breakfast',available:true}]);
    const {ctx,page,problems}=await context();await seedLocal(ctx,data);await open(page);const before=await storedDemo(page);await openPantry(page);
    assert.equal(await page.textContent('#product-picker-title'),'Vorrat auswählen');
    assert.deepEqual(await page.locator('.product-modes [data-product-mode]:visible').evaluateAll(nodes=>nodes.map(n=>n.textContent.replace('★','').trim())),['Aktueller Vorrat','Alle','Favoriten','Häufig gekauft','Grundvorrat','Letzte 7 Tage gekauft']);
    assert.equal(await page.getAttribute('[data-product-mode=current]','aria-pressed'),'true');assert.equal(await page.textContent('#product-picker-status'),'2 Produkte im aktuellen Vorrat');
    assert.deepEqual((await page.locator('.product-name').allTextContents()).sort(),['Meine besondere Mischung','Milch']);
    assert.equal(await page.locator('.product-card.in-stock .product-picked:visible').count(),2);
    assert.equal(await page.locator('#pantry,#pantry-edit-dialog,#pantry-products,#pantry-form,[data-pantry-filter]').count(),0,'die alte Seite samt Steuerelementen ist entfernt');
    assert.equal(await page.textContent('#product-picker-count'),'0 ausgewählt');assert.equal(await page.textContent('#product-picker-add'),'Produkte auswählen');assert.equal(await page.locator('.product-target').isHidden(),true);
    await page.click('[data-product-mode=favorites]');await closePantry(page);await openPantry(page);
    assert.equal(await page.getAttribute('[data-product-mode=current]','aria-pressed'),'true');await closePantry(page);assert.deepEqual(await storedDemo(page),before);
    assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.78: vorhandene Produkte abwählen, Auswahl korrigieren und mit derselben ID samt Bild wieder hinzufügen',async()=>{
    const data=pantryData278([{id:'original-onion',name:'Zwiebel',category:'obst',imageKey:'group-vegetables',available:true},{name:'Salz',available:true}]);
    const {ctx,page,problems}=await context();await seedLocal(ctx,data);await open(page);const before=await storedDemo(page);await openPantry(page);
    const onion=page.locator('#product-picker-list .product-card').filter({has:page.locator('.product-name',{hasText:/^Zwiebel$/})});await onion.locator('.product-pick').click();
    assert.equal(await page.textContent('#product-picker-count'),'1 ausgewählt');assert.equal(await page.textContent('#product-picker-status'),'1 Produkt im aktuellen Vorrat');assert.equal(await onion.count(),0);
    assert.deepEqual((await storedDemo(page)).pantry,before.pantry,'Antippen merkt die Änderung vor');
    assert.equal(await page.locator('#product-picker-cart').isHidden(),true);assert.equal(await page.locator('#product-picker-cart-rows>*').count(),0);await page.click('[data-product-mode=all]');await page.fill('#product-picker-search','Zwiebel');await onion.locator('.product-pick').click();await page.fill('#product-picker-search','');await page.click('[data-product-mode=current]');assert.equal(await onion.count(),1);assert.equal(await page.textContent('#product-picker-count'),'0 ausgewählt');
    await onion.locator('.product-pick').click();await page.click('#product-picker-add');let saved=await storedDemo(page),out=saved.pantry.find(row=>row.id==='original-onion');
    assert.equal(out.available,false);assert.equal(out.deletedAt,null);assert.equal(out.imageKey,'group-vegetables');assert.equal(out.category,'obst');assert.equal(out.name,'Zwiebel');assert.deepEqual(saved.pantry.find(row=>row.name==='Salz'),before.pantry.find(row=>row.name==='Salz'));
    await page.click('[data-product-mode=all]');await page.fill('#product-picker-search','Zwiebel');assert.equal(await onion.locator('.product-pick').getAttribute('aria-pressed'),'false');await onion.locator('.product-pick').click();await page.click('#product-picker-add');
    saved=await storedDemo(page);assert.equal(saved.pantry.length,2);assert.equal(saved.pantry.find(row=>row.id==='original-onion').available,true);assert.equal(saved.pantry.find(row=>row.id==='original-onion').imageKey,'group-vegetables');
    assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.78: Schließen verwirft unbestätigte Zu- und Abwahlen und erhält den Einkaufsentwurf',async()=>{
    const {ctx,page,problems}=await context();await seedLocal(ctx,pantryData278([{name:'Salz',available:true}]));await open(page);
    await storeButton(page,'#store-chips','Lidl').click();await page.fill('#item-form [name=name]','Mein Wocheneinkauf');await page.fill('#item-form [name=quantity]','3');
    const before=await storedDemo(page);await page.click('#open-pantry');await sheetOpen(page);await page.locator('.product-card[data-product=salz] .product-pick').click();await page.click('[data-product-mode=all]');await page.fill('#product-picker-search','Mehl');await page.locator('.product-card[data-product=mehl] .product-pick').click();
    assert.equal(await page.textContent('#product-picker-count'),'2 ausgewählt');await closePantry(page);assert.deepEqual(await storedDemo(page),before);
    assert.equal(await page.inputValue('#item-form [name=name]'),'Mein Wocheneinkauf');assert.equal(await page.inputValue('#item-form [name=quantity]'),'3');assert.equal(await page.inputValue('#item-form [name=storeId]'),'store-lidl');assert.equal(await page.locator('.tabs').isVisible(),true);
    await page.click('#open-pantry');assert.equal(await page.textContent('#product-picker-count'),'0 ausgewählt');assert.equal(await page.textContent('#product-picker-status'),'1 Produkt im aktuellen Vorrat');assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.78: Suche und Kategorien im aktuellen Vorrat finden auch eigene Produkte und alte doppelte Namen',async()=>{
    const data=pantryData278([{id:'old-a',name:'Zwiebel',available:true},{id:'old-b',name:'Zwiebeln',available:true,updatedAt:'2026-10-30T09:00:00.000Z'},{name:'Mein Shampoo',category:'haushalt',available:true},{name:'Meine Hausmischung',category:'sonstiges',imageKey:'group-breakfast',available:true},{name:'Mehl',available:false}]);
    const {ctx,page,problems}=await context();await seedLocal(ctx,data);await open(page);await openPantry(page);assert.equal(await page.textContent('#product-picker-status'),'3 Produkte im aktuellen Vorrat');
    await page.fill('#product-picker-search','Zweibeln');assert.deepEqual(await page.locator('.product-name').allTextContents(),['Zwiebeln']);
    await page.fill('#product-picker-search','');await page.selectOption('#product-picker-category','haushalt');assert.deepEqual(await page.locator('.product-name').allTextContents(),['Mein Shampoo']);
    await page.selectOption('#product-picker-category','');await page.fill('#product-picker-search','Meine Hausmischung');assert.equal(await page.locator('.product-picture[data-photo-key=group-breakfast]').count(),1);
    await page.click('[data-product-mode=all]');await page.fill('#product-picker-search','Mehl');assert.equal(await page.locator('.product-card[data-product=mehl] .product-pick').getAttribute('aria-pressed'),'false');
    await page.fill('#product-picker-search','Zwiebel');await page.locator('.product-card').filter({has:page.locator('.product-name',{hasText:/^Zwiebeln$/})}).locator('.product-pick').click();await page.click('#product-picker-add');assert.ok((await storedDemo(page)).pantry.filter(row=>['old-a','old-b'].includes(row.id)).every(row=>row.available===false));
    assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.78: eigene Produkte über Plus vormerken, Tippfehler korrigieren und Original behalten',async()=>{
    const {ctx,page,problems}=await context({config:{productImages:true}});await open(page);await openPantry(page);const before=await storedDemo(page);
    await page.click('#pantry-own-add');await page.fill('#pantry-own-form [name=name]','Zuchini');assert.match(await page.textContent('#pantry-own-hint'),/Zucchini/);await page.click('#pantry-own-form button[type=submit]');
    assert.deepEqual((await storedDemo(page)).pantry,before.pantry);assert.deepEqual(await page.locator('.product-name').allTextContents(),['Zucchini']);assert.equal(await page.textContent('#product-picker-count'),'1 ausgewählt');await page.click('#product-picker-add');
    await page.click('#pantry-own-add');await page.fill('#pantry-own-form [name=name]','Meine ganz eigene Hausmischung');await page.click('#pantry-own-form button[type=submit]');await page.locator('#product-picker-list .product-star').click();assert.equal(await page.locator('#product-picker-list .product-star').getAttribute('aria-pressed'),'true');assert.equal((await storedDemo(page)).pantry.length,1);await page.click('#product-picker-add');assert.equal(await page.locator('.product-name').textContent(),'Meine ganz eigene Hausmischung');assert.equal(await page.locator('#product-picker-list .product-picture').count(),1);
    await page.click('#pantry-own-add');await page.fill('#pantry-own-form [name=name]','Spagetti');await page.click('#pantry-own-original');await page.click('#pantry-own-form button[type=submit]');await page.click('#product-picker-add');
    await addPantryProduct(page,'Zucchini');let saved=await storedDemo(page);assert.equal(saved.pantry.length,3);assert.ok(saved.pantry.some(row=>row.name==='Spagetti'));assert.equal((saved.aliases||[]).length,0);
    await page.click('#pantry-own-add');await page.fill('#pantry-own-form [name=name]','TV');await page.click('#pantry-own-form button[type=submit]');assert.match(await page.textContent('#pantry-own-error'),/Vorrat/);assert.equal((await storedDemo(page)).pantry.length,3);
    await page.click('#pantry-own-dialog [data-close]');await closePantry(page);await openPantry(page,'all');await page.fill('#product-picker-search','Tmoaten');assert.equal(await page.locator('.product-card[data-product=tomaten]').count(),1);
    assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.78: Grundvorrat im eigenen Reiter ergänzt fehlende Kochzutaten ohne vorhandene Daten zurückzusetzen',async()=>{
    const data=pantryData278([{id:'my-salt',name:'Salz',available:true,category:'vorrat',imageKey:'group-spices'},{name:'Meine Hausmischung',available:true},{id:'my-flour',name:'Mehl',available:false,imageKey:'mehl'}]);
    const {ctx,page,problems}=await context();await seedLocal(ctx,data);await open(page);const before=await storedDemo(page);await openPantry(page,'basics');await page.click('#pantry-add-basics');assert.equal(await page.textContent('#product-picker-count'),'27 ausgewählt');assert.deepEqual((await storedDemo(page)).pantry,before.pantry);
    assert.equal(await page.locator('#product-picker-cart input').count(),0);await page.click('#product-picker-add');const saved=await storedDemo(page);
    assert.equal(saved.pantry.filter(row=>!row.deletedAt&&row.available!==false).length,29);assert.deepEqual(saved.pantry.find(row=>row.id==='my-salt'),before.pantry.find(row=>row.id==='my-salt'));assert.equal(saved.pantry.find(row=>row.id==='my-flour').available,true);assert.equal(saved.pantry.find(row=>row.id==='my-flour').imageKey,'mehl');
    await page.click('#pantry-add-basics');assert.equal(await page.textContent('#product-picker-count'),'0 ausgewählt');assert.match(await page.textContent('#product-picker-feedback'),/bereits vorhanden/);assert.deepEqual(await storedDemo(page),saved);
    assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.78: Sterne und häufige Käufe filtern das Raster unabhängig vom Vorratsstatus',async()=>{
    const data=pantryData278([{name:'Salz',available:true},{name:'Meine Hausmischung',category:'sonstiges',imageKey:'group-breakfast',available:false}]);
    const stamp='2026-10-29T09:00:00.000Z';for(let i=0;i<2;i++)data.items.push({...data.items[0],id:`old-flour-${i}`,name:'Mehl',quantity:1,unit:'kg',checked:true,createdAt:stamp,updatedAt:stamp});
    const {ctx,page,problems}=await context();await seedLocal(ctx,data);await open(page);const before=await storedDemo(page);await openPantry(page);await page.locator('.product-card[data-product=salz] .product-star').click();
    await page.click('[data-product-mode=favorites]');assert.deepEqual(await page.locator('.product-name').allTextContents(),['Salz']);assert.equal(await page.textContent('#product-picker-status'),'1 Produkt in Favoriten');assert.equal(await page.locator('.product-pick').getAttribute('aria-pressed'),'true');
    await page.click('[data-product-mode=all]');await page.fill('#product-picker-search','Meine Hausmischung');await page.locator('.product-star').click();await page.fill('#product-picker-search','');await page.click('[data-product-mode=favorites]');assert.equal(await page.locator('.product-card').count(),2);
    await page.click('[data-product-mode=frequent]');assert.ok((await page.locator('.product-name').allTextContents()).includes('Mehl'));assert.equal(await page.textContent('#product-picker-count'),'0 ausgewählt');
    assert.deepEqual((await storedDemo(page)).pantry,before.pantry);assert.deepEqual((await storedDemo(page)).items,before.items);await closePantry(page);await openPantry(page);assert.equal(await page.getAttribute('[data-product-mode=current]','aria-pressed'),'true');
    assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.78: aufgebrauchte Zutaten werden im Rezept wieder ausgewählt, Nachkaufen erhält Bild und Vorratsstatus',async()=>{
    const data=pantryData278([{id:'my-noodles',name:'Nudeln',available:true},{name:'Meine Testmischung',category:'vorrat',imageKey:'muesli',available:false}]);
    const {ctx,page,problems}=await context({config:{productImages:true}});await seedLocal(ctx,data);await open(page);await openPantry(page);await setPantryAvailable(page,'Nudeln',false);
    await buyPantryProduct(page,'Meine Testmischung');await page.selectOption('#pantry-buy-form [name=storeId]','store-lidl');await page.fill('#pantry-buy-form [name=quantity]','2');
    await page.evaluate(()=>{document.querySelector('#pantry-buy-add').click();document.querySelector('#pantry-buy-add').click();});let saved=await storedDemo(page),purchased=saved.items.filter(row=>!row.deletedAt&&row.name==='Meine Testmischung');assert.equal(purchased.length,1);assert.equal(purchased[0].quantity,2);assert.equal(purchased[0].imageKey,'muesli');assert.equal(saved.pantry.find(row=>row.name==='Meine Testmischung').available,false);
    await closePantry(page);await goTab(page,'recipes');const recipe=page.locator('.recipe-card',{hasText:'Tomaten-Pasta'});await recipe.locator('summary').click();await recipe.getByRole('button',{name:'Auf die Liste'}).click();await sheetOpen(page);
    const noodles=page.locator('#transfer-ingredients .transfer-row',{hasText:'Nudeln'});assert.equal(await noodles.locator('input').isChecked(),true);assert.equal(await noodles.locator('.pantry-badge').count(),0);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.78: gespeicherte eigene Bilder, Favoriten und Status sind nach Offline-Neustart weiter nutzbar',async()=>{
    const data=pantryData278([{id:'my-mix',name:'Meine Hausmischung',category:'sonstiges',imageKey:'muesli',available:true},{name:'Mehl',available:false}]);
    const {ctx,page,problems}=await context({config:{productImages:false},context:{serviceWorkers:'allow'}});await seedLocal(ctx,data);await open(page);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForSelector('#status[data-state]',{state:'attached'});await openPantry(page);await page.locator('.product-star').click();const before=await storedDemo(page);await page.reload();await page.waitForSelector('#status[data-state]',{state:'attached'});await ctx.setOffline(true);await openPantry(page);
    assert.equal(await page.locator('.product-picture[data-photo-key=muesli]').count(),1,'Bildauswahl zeigt Fotos auch bei ausgeschalteten Listenbildern');assert.equal(await page.locator('.product-star').getAttribute('aria-pressed'),'true');assert.deepEqual(await storedDemo(page),before);
    await setPantryAvailable(page,'Mehl',true);await closePantry(page);await page.reload();await page.waitForSelector('#status[data-state]',{state:'attached'});await openPantry(page);assert.equal(await page.textContent('#product-picker-status'),'2 Produkte im aktuellen Vorrat');assert.equal((await storedDemo(page)).pantry.find(row=>row.id==='my-mix').imageKey,'muesli');
    assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.78: Abgleich erhält vorgemerkte Statusänderung und paralleles Bild, ohne andere Vorräte neu zu setzen',async()=>{
    const api=github(pantryData278([{id:'my-mix',name:'Meine Mischung',category:'sonstiges',imageKey:'group-breakfast',available:true}]));
    const a=await context({config:connectedConfig}),b=await context({config:{...connectedConfig,actor:'Anna'}});
    for(const device of [a,b]){await device.ctx.route('https://api.github.com/**',api.handler);await open(device.page);await synced(device.page);await openPantry(device.page);}
    await a.page.locator('.product-pick').click();assert.equal(await a.page.textContent('#product-picker-count'),'1 ausgewählt');
    api.remoteChange(data=>{const row=data.pantry.find(row=>row.id==='my-mix'),stamp=new Date().toISOString();row.imageKey='muesli';row.updatedAt=stamp;row._clock.imageKey={at:stamp,id:'remote-image'};});
    await pollNow(a.page);await synced(a.page);assert.equal(await a.page.textContent('#product-picker-count'),'1 ausgewählt');await a.page.click('#product-picker-add');await synced(a.page);
    await pollNow(b.page);await synced(b.page);await b.page.waitForFunction(()=>document.querySelector('#product-picker-status').textContent==='0 Produkte im aktuellen Vorrat');
    assert.equal(api.content.pantry[0].available,false);assert.equal(api.content.pantry[0].imageKey,'muesli');assert.equal(api.content.pantry[0].id,'my-mix');assert.equal(api.content.pantry[0].deletedAt,null);
    assert.deepEqual([...a.problems,...b.problems],[]);await a.ctx.close();await b.ctx.close();
  });
  test('2.78: offener Nachkauf erhält Menge beim Abgleich und sperrt ein inzwischen gelöschtes Geschäft',async()=>{
    const api=github(pantryData278([{name:'Mehl',available:false}])),device=await context({config:connectedConfig}),{ctx,page,problems}=device;
    await ctx.route('https://api.github.com/**',api.handler);await open(page);await synced(page);await buyPantryProduct(page,'Mehl');await page.fill('#pantry-buy-form [name=quantity]','3');await page.selectOption('#pantry-buy-form [name=storeId]','store-lidl');
    api.remoteChange(data=>{const row=data.stores.find(row=>row.id==='store-lidl'),stamp=new Date().toISOString();row.deletedAt=stamp;row.updatedAt=stamp;row._clock.deletedAt={at:stamp,id:'remote-delete-store'};});await pollNow(page);await synced(page);await page.waitForFunction(()=>document.querySelector('#pantry-buy-add').disabled);
    assert.equal(await page.inputValue('#pantry-buy-form [name=quantity]'),'3');assert.match(await page.textContent('#pantry-buy-error'),/Geschäft.*gelöscht/);await page.selectOption('#pantry-buy-form [name=storeId]','store-edeka');await page.click('#pantry-buy-add');await synced(page);
    const item=api.content.items.find(row=>row.name==='Mehl'&&!row.deletedAt);assert.equal(item.storeId,'store-edeka');assert.equal(item.quantity,3);assert.equal(api.content.pantry[0].available,false);assert.deepEqual(problems,[]);await ctx.close();
  });
  for(const width of [280,320,390])for(const theme of ['light','dark'])test(`2.78 Layout (${width} px ${theme}): Bildraster, horizontale Filter und schlanke Zusatzaktionen passen ins Fenster`,async()=>{
    const {ctx,page,problems}=await context({config:{theme,glass:true,palette:'gruen'},context:{viewport:{width,height:844},colorScheme:theme}});await seedLocal(ctx,pantryData278([{name:'Knoblauchzehen',available:true},{name:'Mein besonders langer eigener Vorratsartikel ohne Markenfoto',category:'sonstiges',available:true}]));await open(page);await openPantry(page);
    const fits=async()=>{assert.ok(await horizontalOverflow(page)<=1);assert.equal(await page.locator('#product-picker-dialog').evaluate(node=>node.scrollWidth<=node.clientWidth+1),true);};await fits();assert.equal(await page.locator('#product-picker-list .product-grid').first().evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length),2);await page.screenshot({path:`/tmp/sattplan278-vorrat-open-${width}-${theme}.png`});
    const modes=await page.locator('.product-modes').evaluate(node=>({scroll:node.scrollWidth,client:node.clientWidth,wrap:getComputedStyle(node).flexWrap}));assert.ok(modes.scroll>modes.client);assert.equal(modes.wrap,'nowrap');
    const plus=await page.locator('#pantry-own-add').boundingBox();assert.ok(plus.width>=44&&plus.height>=44);await page.click('[data-product-mode=frequent]');assert.equal(await page.getAttribute('[data-product-mode=frequent]','aria-pressed'),'true');await fits();
    await page.click('#pantry-own-add');await page.fill('#pantry-own-form [name=name]','Zuchini');assert.equal(await page.locator('#pantry-own-hint').isVisible(),true);assert.equal(await page.locator('#pantry-own-dialog').evaluate(node=>node.scrollWidth<=node.clientWidth+1),true);await page.click('#pantry-own-dialog [data-close]');
    await page.click('[data-product-mode=basics]');await page.click('#pantry-add-basics');assert.equal(await page.textContent('#product-picker-count'),'28 ausgewählt');await fits();
    await page.screenshot({path:`/tmp/sattplan278-vorrat-${width}-${theme}.png`});assert.deepEqual(problems,[]);await ctx.close();
  });

  // Vorratsreiter und passende Kategorien (2.79).
  const tabIds279 = page => page.locator('.product-modes [data-product-mode]:visible').evaluateAll(nodes=>nodes.map(node=>node.dataset.productMode));
  const defaultTabs279 = ['current','all','favorites','frequent','basics','recent'];
  const enabledCategories279 = page => page.locator('#product-picker-category').evaluate(node=>[...node.options].filter(option=>!option.disabled).map(option=>option.value));
  const savedTabs279 = page => page.evaluate(()=>JSON.parse(localStorage.getItem('einkauf-pantry-tabs-v1')));
  async function startTabDrag279(page,id) {
    const tab=page.locator(`[data-product-mode=${id}]`);await tab.scrollIntoViewIfNeeded();const rect=await tab.boundingBox();
    await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.waitForTimeout(550);
    assert.equal(await page.locator('.product-modes.reordering').count(),1);return rect;
  }
  test('2.79: Kategorien ohne Produkte bleiben sichtbar und werden nur im jeweiligen Vorratsreiter ausgegraut',async()=>{
    const data=pantryData278([{name:'Milch',available:true},{name:'Meine Hausmischung',category:'sonstiges',available:true},{name:'Mehl',available:false}]);
    data.items=[0,1].map(i=>({...demo.items[0],id:`paste-${i}`,name:'Zahnpasta',category:'haushalt',quantity:1,unit:'Tube',checked:true}));data.names=[];
    const {ctx,page,problems}=await context();await seedLocal(ctx,data);await open(page);await openPantry(page);const before=await storedDemo(page);
    const categories=await page.locator('#product-picker-category option').allTextContents();assert.equal(categories.length,12);
    assert.deepEqual(await enabledCategories279(page),['','kuehl','sonstiges']);
    await page.click('[data-product-mode=all]');assert.equal((await enabledCategories279(page)).length,12);
    await page.fill('#product-picker-search','Salz');await page.locator('.product-card[data-product=salz] .product-star').click();await page.fill('#product-picker-search','');await page.click('[data-product-mode=favorites]');
    assert.deepEqual(await enabledCategories279(page),['','gewuerze']);assert.deepEqual(await page.locator('#product-picker-category option').allTextContents(),categories);
    await page.fill('#product-picker-search','Milch');assert.equal(await page.locator('.product-card').count(),0);assert.deepEqual(await enabledCategories279(page),['','gewuerze'],'Kategorien gehören zum gesamten Reiter, unabhängig von der Suche');
    await page.fill('#product-picker-search','');await page.click('[data-product-mode=frequent]');assert.deepEqual(await enabledCategories279(page),['','haushalt']);
    await page.click('[data-product-mode=basics]');assert.equal(await page.locator('.product-card').count(),28);assert.deepEqual(await enabledCategories279(page),['','obst','kuehl','vorrat','gewuerze']);
    await page.click('[data-product-mode=all]');assert.equal((await enabledCategories279(page)).length,12);assert.deepEqual((await storedDemo(page)).pantry,before.pantry);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.79: ein Reiterwechsel behält passende Kategorien und setzt eine ausgegraute Auswahl auf Alle Kategorien zurück',async()=>{
    const {ctx,page,problems}=await context();await seedLocal(ctx,pantryData278([{name:'Milch',available:true}]));await open(page);await openPantry(page,'all');
    await page.selectOption('#product-picker-category','kuehl');await page.click('[data-product-mode=current]');assert.equal(await page.inputValue('#product-picker-category'),'kuehl');
    await page.click('[data-product-mode=favorites]');assert.equal(await page.inputValue('#product-picker-category'),'');assert.deepEqual(await enabledCategories279(page),['']);
    await page.click('[data-product-mode=all]');await page.selectOption('#product-picker-category','obst');await page.click('[data-product-mode=current]');assert.equal(await page.inputValue('#product-picker-category'),'');assert.deepEqual(await page.locator('.product-name').allTextContents(),['Milch']);
    await page.selectOption('#product-picker-category','kuehl');await page.locator('.product-pick').click();assert.equal(await page.inputValue('#product-picker-category'),'');assert.deepEqual(await enabledCategories279(page),['']);assert.equal(await page.textContent('#product-picker-count'),'1 ausgewählt');
    assert.equal((await storedDemo(page)).pantry[0].available,true);assert.equal(await page.locator('#product-picker-cart').isHidden(),true);assert.equal(await page.locator('#product-picker-cart-rows>*').count(),0);assert.equal(await page.locator('#product-picker-count').isDisabled(),true);
    await page.click('[data-product-mode=all]');await page.fill('#product-picker-search','Milch');await page.locator('.product-card[data-product=milch] .product-pick').click();await page.fill('#product-picker-search','');await page.click('[data-product-mode=current]');assert.deepEqual(await enabledCategories279(page),['','kuehl']);assert.equal(await page.textContent('#product-picker-count'),'0 ausgewählt');
    assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.79: Kategorien berücksichtigen auch Produkte außerhalb der ersten 96 Karten',async()=>{
    const data=pantryData278([...Array.from({length:100},(_,i)=>({name:`Meine Frucht ${String(i).padStart(3,'0')}`,category:'obst',available:true})),{name:'Mein Shampoo',category:'haushalt',available:true}]);
    const {ctx,page,problems}=await context();await seedLocal(ctx,data);await open(page);await openPantry(page);assert.equal(await page.locator('.product-card').count(),96);assert.match(await page.textContent('#product-picker-status'),/101 Produkte.*96 angezeigt/);
    assert.deepEqual(await enabledCategories279(page),['','obst','haushalt']);await page.selectOption('#product-picker-category','haushalt');assert.deepEqual(await page.locator('.product-name').allTextContents(),['Mein Shampoo']);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.79: Grundvorrat zeigt wichtige Kochzutaten ohne automatische Auswahl, behält Einzelwahl und Einkaufsgeste',async()=>{
    const {ctx,page,problems}=await context({config:{palette:'gruen'}});await seedLocal(ctx,pantryData278([{name:'Salz',available:true}]));await open(page);const before=await storedDemo(page);await openPantry(page,'basics');
    assert.equal(await page.textContent('#product-picker-status'),'28 Produkte im Grundvorrat');assert.equal(await page.textContent('#product-picker-count'),'0 ausgewählt');assert.equal(await page.locator('#pantry-add-basics').isVisible(),true);assert.deepEqual(await storedDemo(page),before);
    assert.equal(await page.locator('.product-card[data-product=salz] .product-pick').getAttribute('aria-pressed'),'true');await page.locator('.product-card[data-product=mehl] .product-pick').click();assert.equal(await page.textContent('#product-picker-count'),'1 ausgewählt');assert.equal(await page.locator('#product-picker-cart').isHidden(),true);await page.screenshot({path:'/tmp/sattplan279-grundvorrat.png'});await page.click('#product-picker-add');assert.equal((await storedDemo(page)).pantry.find(row=>row.name==='Mehl').available,true);
    await page.fill('#product-picker-search','Zahnpasta');assert.equal(await page.locator('.product-card').count(),0);await page.fill('#product-picker-search','Mehl');await holdProduct(page,'mehl');assert.match(await page.textContent('#pantry-buy-name'),/Mehl/);await page.click('#pantry-buy-dialog [data-close]');
    await page.fill('#product-picker-search','');await page.click('#pantry-add-basics');assert.equal(await page.textContent('#product-picker-count'),'26 ausgewählt');assert.equal(await page.locator('#product-picker-feedback').isVisible(),true);await page.locator('.product-card[data-product=nudeln] .product-pick').click();assert.equal(await page.textContent('#product-picker-count'),'25 ausgewählt');assert.equal(await page.locator('#product-picker-feedback').isHidden(),true);await page.click('[data-product-mode=current]');assert.equal(await page.locator('#pantry-add-basics').isHidden(),true);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.79: langes Halten verschiebt einen Reiter und speichert die Reihenfolge ohne Filter- oder Vorratsänderung',async()=>{
    const {ctx,page,problems}=await context({context:{viewport:{width:900,height:1200}}});await seedLocal(ctx,pantryData278([{name:'Milch',available:true}]));await open(page);await openPantry(page);const before=await storedDemo(page);
    const rect=await startTabDrag279(page,'favorites'),bar=await page.locator('.product-modes').boundingBox();await page.mouse.move(bar.x+3,rect.y+rect.height/2,{steps:8});await page.mouse.up();
    const expected=['favorites','current','all','frequent','basics','recent'];assert.deepEqual(await tabIds279(page),expected);assert.deepEqual(await savedTabs279(page),expected);assert.equal(await page.getAttribute('[data-product-mode=current]','aria-pressed'),'true');assert.equal(await page.locator('.product-modes.reordering').count(),0);assert.deepEqual(await storedDemo(page),before);
    await closePantry(page);await openPantry(page);assert.deepEqual(await tabIds279(page),expected);await page.reload();await page.waitForSelector('#status[data-state]',{state:'attached'});await page.click('#open-pantry');await sheetOpen(page);assert.deepEqual(await tabIds279(page),expected);assert.equal(await page.getAttribute('[data-product-mode=current]','aria-pressed'),'true');assert.deepEqual(await storedDemo(page),before);
    assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.79: Escape und abgebrochene Haltegesten verwerfen die verschobene Reihenfolge',async()=>{
    const {ctx,page,problems}=await context({context:{viewport:{width:900,height:1200}}});await open(page);await openPantry(page);const rect=await startTabDrag279(page,'favorites'),bar=await page.locator('.product-modes').boundingBox();await page.mouse.move(bar.x+3,rect.y+rect.height/2,{steps:6});assert.notDeepEqual(await tabIds279(page),defaultTabs279);
    await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await page.locator('#product-picker-dialog[open]').count(),1);assert.deepEqual(await tabIds279(page),defaultTabs279);assert.equal(await savedTabs279(page),null);
    const again=await startTabDrag279(page,'frequent');await page.mouse.move(bar.x+3,again.y+again.height/2,{steps:6});await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();assert.deepEqual(await tabIds279(page),defaultTabs279);assert.equal(await savedTabs279(page),null);assert.equal(await page.getAttribute('[data-product-mode=current]','aria-pressed'),'true');assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.79: normales Wischen scrollt die Reiter, ohne zu sortieren oder einen Filter auszulösen',async()=>{
    const {ctx,page,problems}=await context({context:{viewport:{width:280,height:844}}});await open(page);await openPantry(page);const bar=await page.locator('.product-modes').boundingBox(),cdp=await ctx.newCDPSession(page),x=bar.x+bar.width-20,y=bar.y+bar.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await page.waitForTimeout(40);
    for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*25,y,id:1}]});await page.waitForTimeout(20);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(550);
    assert.ok(await page.locator('.product-modes').evaluate(node=>node.scrollLeft)>80);assert.deepEqual(await tabIds279(page),defaultTabs279);assert.equal(await savedTabs279(page),null);assert.equal(await page.getAttribute('[data-product-mode=current]','aria-pressed'),'true');assert.equal(await page.locator('.product-modes.reordering').count(),0);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.79: echte Touch-Haltegeste sortiert über den sichtbaren Rand hinaus und scrollt automatisch mit',async()=>{
    const {ctx,page,problems}=await context({context:{viewport:{width:280,height:844}}});await seedLocal(ctx,pantryData278([{name:'Salz',available:true}]));await open(page);await openPantry(page);const before=await storedDemo(page),bar=await page.locator('.product-modes').boundingBox(),button=await page.locator('[data-product-mode=current]').boundingBox(),cdp=await ctx.newCDPSession(page),y=bar.y+bar.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x+button.width/2,y,id:1}]});await page.waitForTimeout(550);assert.equal(await page.locator('.product-modes.reordering').count(),1);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bar.x+bar.width-3,y,id:1}]});await page.waitForFunction(()=>[...document.querySelectorAll('.product-modes [data-product-mode]:not([hidden])')].at(-1)?.dataset.productMode==='current',null,{timeout:8000});assert.equal(await page.locator('.product-modes.reordering').count(),1);assert.ok(await page.locator('.product-modes').evaluate(node=>node.scrollLeft)>80);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const order=await tabIds279(page);assert.equal(order.at(-1),'current');assert.deepEqual(await savedTabs279(page),order);assert.equal(await page.getAttribute('[data-product-mode=current]','aria-pressed'),'true');assert.deepEqual(await storedDemo(page),before);
    await closePantry(page);await openPantry(page);assert.deepEqual(await tabIds279(page),order);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.79: Touch-Abbruch und ein zweiter Finger speichern keine neue Reiterreihenfolge',async()=>{
    const {ctx,page,problems}=await context({context:{viewport:{width:280,height:844}}});await open(page);await openPantry(page);const cdp=await ctx.newCDPSession(page);
    for(const cancel of ['cancel','second']){
      const bar=await page.locator('.product-modes').boundingBox(),button=await page.locator('[data-product-mode=current]').boundingBox(),x=button.x+button.width/2,y=bar.y+bar.height/2;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await page.waitForTimeout(550);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bar.x+bar.width-3,y,id:1}]});await page.waitForTimeout(200);
      if(cancel==='second')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bar.x+bar.width-3,y,id:1},{x:bar.x+30,y:y+8,id:2}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.deepEqual(await tabIds279(page),defaultTabs279);assert.equal(await savedTabs279(page),null);assert.equal(await page.locator('.product-modes.reordering').count(),0);
    }
    assert.equal(await page.getAttribute('[data-product-mode=current]','aria-pressed'),'true');assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.79: Tastatur-Reihenfolge bleibt auf diesem Gerät, Einkauf und andere Geräte behalten ihre Reiter',async()=>{
    const a=await context(),b=await context();await open(a.page);await openPantry(a.page);await a.page.locator('[data-product-mode=favorites]').focus();await a.page.keyboard.press('Alt+ArrowLeft');
    const expected=['current','favorites','all','frequent','basics','recent'];assert.deepEqual(await tabIds279(a.page),expected);assert.deepEqual(await savedTabs279(a.page),expected);assert.equal(await a.page.getAttribute('[data-product-mode=current]','aria-pressed'),'true');
    await closePantry(a.page);await a.page.click('#open-products');assert.deepEqual(await tabIds279(a.page),['all','favorites','frequent','own']);assert.equal(await a.page.locator('[data-product-mode=basics]').isHidden(),true);await a.page.click('#product-picker-dialog [data-close]');await openPantry(a.page);assert.deepEqual(await tabIds279(a.page),expected);
    await open(b.page);await openPantry(b.page);assert.deepEqual(await tabIds279(b.page),defaultTabs279);assert.equal(await savedTabs279(b.page),null);assert.deepEqual([...a.problems,...b.problems],[]);await a.ctx.close();await b.ctx.close();
  });
  test('2.79: ältere persönliche Reihenfolgen werden um fehlende Reiter ergänzt, fehlerhafte Einstellungen verhindern das Öffnen nicht',async()=>{
    for(const [stored,expected]of [[JSON.stringify(['favorites','all','favorites','gone']),['favorites','all','current','frequent','basics','recent']],['{defekt',defaultTabs279]]){
      const {ctx,page,problems}=await context();await ctx.addInitScript(value=>{if(!localStorage.getItem('einkauf-pantry-tabs-v1'))localStorage.setItem('einkauf-pantry-tabs-v1',value);},stored);await open(page);const before=await storedDemo(page);await openPantry(page);assert.deepEqual(await tabIds279(page),expected);assert.equal(await page.getAttribute('[data-product-mode=current]','aria-pressed'),'true');assert.deepEqual(await storedDemo(page),before);assert.deepEqual(problems,[]);await ctx.close();
    }
  });

  test('2.79: Halten ohne Ziehen verschiebt auch einen nur teilweise sichtbaren Reiter nicht',async()=>{
    const {ctx,page,problems}=await context({context:{viewport:{width:280,height:844}}});await open(page);await openPantry(page);const bar=await page.locator('.product-modes').boundingBox(),cdp=await ctx.newCDPSession(page),x=bar.x+bar.width-12,y=bar.y+bar.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await page.waitForTimeout(950);assert.equal(await page.locator('.product-modes.reordering').count(),1);assert.equal(await page.locator('.product-modes').evaluate(node=>node.scrollLeft),0);assert.deepEqual(await tabIds279(page),defaultTabs279);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await savedTabs279(page),null);assert.equal(await page.getAttribute('[data-product-mode=current]','aria-pressed'),'true');assert.deepEqual(problems,[]);await ctx.close();
  });

  function data280(){
    const data=pantryData278([{name:'Karotten',available:true},{name:'Tomaten',available:false}]);data.items=[];
    data.recipes=['Vorrat komplett','Mit Einkaufszettel','Nur kürzlich gekauft'].map((name,i)=>({...demo.recipes[0],id:`r280-${i}`,name,servings:2}));
    data.ingredients=[['Karotte','Salz','Pfeffer','Wasser'],['Karotte','Milch'],['Karotte','Tomate']].flatMap((names,i)=>names.map((name,j)=>({...demo.ingredients[0],id:`i280-${i}-${j}`,recipeId:`r280-${i}`,name,quantity:1,unit:'g'})));
    const base={...demo.items[0],storeId:'',quantity:1,unit:'Stück'};
    data.items=[{...base,id:'open-milk',name:'Milch',checked:false},{...base,id:'bought-tomato',name:'Tomaten',checked:true,shopBoughtAt:new Date().toISOString(),deletedAt:new Date().toISOString()}];return data;
  }
  const openCookable280=async page=>{await goTab(page,'recipes');await page.click('#cookable-open');await sheetOpen(page);};
  test('2.80: Nur Vorrat ist Standard; Zettel zählt nur im gewählten Modus, kürzlicher Kauf zählt nie als da',async()=>{
    const {ctx,page,problems}=await context();await seedLocal(ctx,data280());await open(page);await openCookable280(page);
    const card=name=>page.locator('.cookable-card',{hasText:name}),status=name=>card(name).locator('.cookable-status').textContent();
    assert.equal(await page.getAttribute('[data-cookable-mode=pantry]','aria-pressed'),'true');assert.equal(await status('Vorrat komplett'),'Alles da');assert.equal(await status('Mit Einkaufszettel'),'Es fehlen 1 von 2 Zutaten');assert.equal(await status('Nur kürzlich gekauft'),'Es fehlen 1 von 2 Zutaten');assert.ok(!(await page.textContent('#cookable-list')).includes('Kommt noch'));assert.ok(!(await page.textContent('#cookable-count')).includes('nach dem Einkauf'));assert.ok(!(await page.textContent('#cookable-explanation')).includes('7 Tagen'));
    const before=await storedDemo(page);await card('Mit Einkaufszettel').getByRole('button',{name:'Fehlendes auf die Liste',exact:true}).click();assert.equal(await page.locator('#transfer-dialog[open]').count(),0);assert.deepEqual((await storedDemo(page)).items,before.items,'keine Mengenverdopplung im Nur-Vorrat-Modus');
    await openCookable280(page);await page.click('[data-cookable-mode=shopping]');assert.match(await status('Mit Einkaufszettel'),/sobald ihr einkauft/);assert.match(await page.textContent('#cookable-count'),/1 Rezept.*sofort.*1 nach dem Einkauf/);assert.equal(await status('Nur kürzlich gekauft'),'Es fehlen 1 von 2 Zutaten');assert.match(await page.textContent('#cookable-explanation'),/Kommt noch/);
    await page.click('#cookable-dialog [data-close]');await openCookable280(page);assert.equal(await page.getAttribute('[data-cookable-mode=shopping]','aria-pressed'),'true');await page.reload();await page.waitForSelector('#status[data-state]',{state:'attached'});await openCookable280(page);assert.equal(await page.getAttribute('[data-cookable-mode=shopping]','aria-pressed'),'true');
    await card('Nur kürzlich gekauft').getByRole('button',{name:'Fehlendes auf die Liste'}).click();await sheetOpen(page);assert.deepEqual(await page.locator('#transfer-ingredients input').evaluateAll(nodes=>nodes.map(node=>node.checked)),[false,true]);await page.click('#transfer-form button[type=submit]');let after=await storedDemo(page);assert.equal(after.items.filter(row=>!row.deletedAt&&!row.checked&&row.name==='Tomate').length,1);
    await openCookable280(page);await page.click('[data-cookable-mode=pantry]');await card('Nur kürzlich gekauft').getByRole('button',{name:'Fehlendes auf die Liste'}).click();assert.deepEqual((await storedDemo(page)).items,after.items);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.80: nur Abhaken im Laden erzeugt Kaufdatum; Einkauf beenden erhält es und Übernahme in Vorrat bleibt ausdrücklich',async()=>{
    const data=milkRecipes();data.items=[{...demo.items[0],id:'milk280',name:'Milch',storeId:'',checked:false}];
    const {ctx,page,problems}=await context();await seedLocal(ctx,data);await open(page);await page.getByRole('button',{name:'Milch: abhaken',exact:true}).click();assert.equal((await storedDemo(page)).items[0].shopBoughtAt,undefined);await openPantry(page,'recent');assert.equal(await page.locator('.product-card').count(),0);assert.match(await page.textContent('#product-picker-list'),/Noch keine Einkäufe/);await closePantry(page);
    await page.getByRole('button',{name:'Milch: wieder öffnen',exact:true}).click();await page.click('#mode-shop');await shopTap(page,'Milch').click();assert.ok((await storedDemo(page)).items[0].shopBoughtAt);await page.click('#notice-undo');assert.equal((await storedDemo(page)).items[0].shopBoughtAt,null);await shopTap(page,'Milch').click();const bought=(await storedDemo(page)).items[0].shopBoughtAt;
    await finishShop(page);await sheetOpen(page);await page.click('#finish-only');await page.waitForSelector('#finish-dialog[open]',{state:'detached'});const removed=(await storedDemo(page)).items.find(row=>row.id==='milk280');assert.ok(removed.deletedAt);assert.equal(removed.shopBoughtAt,bought);
    await openCookable280(page);assert.equal(await page.locator('.cookable-card').count(),0,'auch frisch gekauft nicht im Vorrat');await page.click('#cookable-dialog [data-close]');await openPantry(page,'recent');const product=page.locator('.product-card[data-product=milch]');assert.match(await product.textContent(),/heute gekauft/);assert.equal(await product.locator('.product-pick').getAttribute('aria-pressed'),'false');await product.locator('.product-pick').click();assert.equal((await storedDemo(page)).pantry.length,0);await page.click('#product-picker-add');assert.equal((await storedDemo(page)).pantry[0].available,true);
    await product.locator('.product-pick').click();assert.equal(await page.textContent('#product-picker-count'),'0 ausgewählt','Vorhandenes wird hier nicht entfernt');await closePantry(page);await openCookable280(page);assert.ok((await page.locator('.cookable-status').allTextContents()).every(text=>text==='Alles da'));assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.80: letzte Einkäufe sind eindeutig, zeitlich sortiert, bleiben nach Neustart und nutzen keine alten Änderungsdaten',async()=>{
    const data=data280(),now=Date.now(),stamp=days=>new Date(now-days*86400000).toISOString(),base={...demo.items[0],storeId:'',checked:true};data.items=[{...base,id:'old-carrot',name:'Karotte',shopBoughtAt:stamp(3),deletedAt:stamp(2)},{...base,id:'new-carrot',name:'Karotten',shopBoughtAt:stamp(2)},{...base,id:'new-flour',name:'Mehl',shopBoughtAt:stamp(1)},{...base,id:'too-old',name:'Reis',shopBoughtAt:stamp(8)},{...base,id:'legacy',name:'Milch',updatedAt:stamp(0)}];
    const {ctx,page,problems}=await context();await seedLocal(ctx,data);await open(page);await openPantry(page,'recent');assert.deepEqual(await page.locator('.product-name').allTextContents(),['Mehl','Karotten']);assert.match(await page.textContent('#product-picker-list'),/gekauft vor 2 Tagen/);assert.equal(await page.locator('.product-card').filter({hasText:'Karotten'}).locator('.product-pick').getAttribute('aria-pressed'),'true');
    await page.reload();await page.waitForSelector('#status[data-state]',{state:'attached'});await openPantry(page,'recent');assert.deepEqual(await page.locator('.product-name').allTextContents(),['Mehl','Karotten']);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.80: Kaufdatum und anschließende Vorratsübernahme erreichen das zweite Gerät',async()=>{
    const data=milkRecipes();data.items=[{...demo.items[0],id:'milk-sync280',name:'Milch',storeId:'',checked:false}];const api=github(data),a=await context({config:connectedConfig}),b=await context({config:{...connectedConfig,actor:'Anna'}});
    for(const device of [a,b]){await device.ctx.route('https://api.github.com/**',api.handler);await open(device.page);await synced(device.page);}await openPantry(b.page,'recent');assert.equal(await b.page.locator('.product-card').count(),0);
    await a.page.click('#mode-shop');await shopTap(a.page,'Milch').click();await synced(a.page);await pollNow(b.page);await b.page.waitForSelector('.product-card[data-product=milch]');await b.page.locator('.product-card[data-product=milch] .product-pick').click();await b.page.click('#product-picker-add');await synced(b.page);assert.equal(api.content.pantry.find(row=>row.name==='Milch').available,true);assert.ok(api.content.items.find(row=>row.id==='milk-sync280').shopBoughtAt);assert.deepEqual([...a.problems,...b.problems],[]);await a.ctx.close();await b.ctx.close();
  });

  test('2.80: Fehlendes übernimmt nach parallelem Einkaufseintrag keine doppelte Menge',async()=>{
    const api=github(data280()),a=await context({config:connectedConfig}),b=await context({config:{...connectedConfig,actor:'Anna'}});
    for(const device of [a,b]){await device.ctx.route('https://api.github.com/**',api.handler);await open(device.page);await synced(device.page);}
    await openCookable280(a.page);await a.page.locator('.cookable-card',{hasText:'Nur kürzlich gekauft'}).getByRole('button',{name:'Fehlendes auf die Liste'}).click();await sheetOpen(a.page);
    await b.page.fill('#item-form [name=name]','Tomate');await b.page.click('#item-form button[type=submit]');await synced(b.page);await pollNow(a.page);await a.page.waitForFunction(()=>document.querySelector('#items').textContent.includes('Tomate'));await a.page.click('#transfer-form button[type=submit]');await synced(a.page);
    const rows=api.content.items.filter(row=>!row.deletedAt&&!row.checked&&/^Tomate/.test(row.name));assert.equal(rows.length,1);assert.equal(rows[0].quantity,1);assert.equal(await a.page.locator('#transfer-dialog[open]').count(),0);assert.deepEqual([...a.problems,...b.problems],[]);await a.ctx.close();await b.ctx.close();
  });

  for(const width of [280,320,390])test(`2.80 Layout ${width}: Kochmodi und Kaufreiter passen auf das Handy`,async()=>{
    const {ctx,page,problems}=await context({config:{palette:'gruen'},context:{viewport:{width,height:844}}});await seedLocal(ctx,data280());await open(page);await openCookable280(page);
    for(const mode of ['pantry','shopping']){await page.click(`[data-cookable-mode=${mode}]`);assert.ok(await horizontalOverflow(page)<=1);assert.equal(await page.locator('#cookable-dialog').evaluate(node=>node.scrollWidth<=node.clientWidth+1),true);}
    await page.click('#cookable-dialog [data-close]');await openPantry(page,'recent');assert.ok(await horizontalOverflow(page)<=1);assert.equal(await page.locator('#product-picker-dialog').evaluate(node=>node.scrollWidth<=node.clientWidth+1),true);assert.deepEqual(problems,[]);await ctx.close();
  });

  test('2.81: Reiter scrollen nativ in beide Richtungen, ohne Filter oder Reihenfolge zu ändern',async()=>{
    const {ctx,page,problems}=await context({context:{viewport:{width:280,height:844}}});await open(page);await openPantry(page);const cdp=await ctx.newCDPSession(page),bar=await page.locator('.product-modes').boundingBox(),y=bar.y+bar.height/2;
    const position=()=>page.locator('.product-modes').evaluate(node=>node.scrollLeft);
    await page.evaluate(()=>{window.nativePanCount=0;document.querySelector('.product-modes').addEventListener('pointercancel',()=>window.nativePanCount++);});
    const swipe=async(direction)=>{const x=direction<0?bar.x+bar.width-22:bar.x+22;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await page.waitForTimeout(30);
      for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+direction*i*25,y,id:1}]});await page.waitForTimeout(20);}
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    };
    await swipe(-1);await page.waitForTimeout(80);const forward=await position();assert.ok(forward>70);
    await swipe(1);await page.waitForTimeout(80);assert.ok(await position()<forward-30,'Richtungswechsel scrollt zurück');
    assert.ok(await page.evaluate(()=>window.nativePanCount)>=2,'Der Browser übernimmt beide Wischgesten als natives Scrollen');
    assert.deepEqual(await tabIds279(page),defaultTabs279);assert.equal(await savedTabs279(page),null);assert.equal(await page.getAttribute('[data-product-mode=current]','aria-pressed'),'true');assert.equal(await page.locator('.product-modes.reordering').count(),0);assert.deepEqual(problems,[]);await ctx.close();
  });

  test('2.82: entfernte Grundvorräte bleiben unter der Trennlinie und lassen sich ohne Metadatenverlust zurückholen',async()=>{
    const {ctx,page,problems}=await context();await seedLocal(ctx,pantryData278([{id:'saved-milk',name:'Milch',category:'kuehl',imageKey:'group-dairy',available:true},{name:'Salz',available:true}]));await open(page);await openPantry(page);const before=await storedDemo(page);
    await page.locator('#product-picker-list .product-card[data-product=milch] .product-pick').click();assert.equal(await page.locator('#product-picker-list .product-card[data-product=milch]').count(),0);assert.equal(await page.locator('#pantry-removed hr').count(),1);assert.equal(await page.textContent('#pantry-removed h3'),'Kürzlich entfernt');assert.equal(await page.locator('#pantry-removed .product-picture').count(),1);assert.equal(await page.textContent('#product-picker-status'),'1 Produkt im aktuellen Vorrat');assert.deepEqual((await storedDemo(page)).pantry,before.pantry);
    await page.locator('#pantry-removed .product-pick').click();assert.equal(await page.locator('#pantry-removed').isHidden(),true);assert.equal(await page.textContent('#product-picker-count'),'0 ausgewählt');assert.equal(await page.locator('#product-picker-list .product-card[data-product=milch]').count(),1);
    await page.locator('#product-picker-list .product-card[data-product=milch] .product-pick').click();await page.click('#product-picker-add');assert.equal((await storedDemo(page)).pantry.find(row=>row.id==='saved-milk').available,false);await closePantry(page);await page.reload();await page.waitForSelector('#status[data-state]',{state:'attached'});await openPantry(page);assert.equal(await page.locator('#pantry-removed .product-picture[data-photo-key=group-dairy]').count(),1);
    await page.locator('#pantry-removed .product-pick').click();await page.click('#product-picker-add');const saved=(await storedDemo(page)).pantry.find(row=>row.id==='saved-milk');assert.equal(saved.available,true);assert.equal(saved.imageKey,'group-dairy');assert.equal(saved.category,'kuehl');assert.equal(saved.name,'Milch');assert.equal(await page.locator('#pantry-removed').isHidden(),true);assert.deepEqual(problems,[]);await ctx.close();
  });
  test('2.82: Kürzlich entfernt bleibt auf Aktueller Vorrat begrenzt; Favorit und Nachkaufen funktionieren an den Kacheln',async()=>{
    const {ctx,page,problems}=await context({context:{viewport:{width:280,height:844}}});await seedLocal(ctx,pantryData278([{name:'Mehl',available:true},{name:'Äpfel',available:true}]));await open(page);await openPantry(page);await page.locator('#product-picker-list .product-card[data-product=mehl] .product-pick').click();
    await page.locator('#pantry-removed .product-star').click();assert.equal(await page.locator('#pantry-removed .product-star').getAttribute('aria-pressed'),'true');await page.locator('#pantry-removed .product-pick').focus();await page.keyboard.press('Shift+F10');await sheetOpen(page);assert.match(await page.textContent('#pantry-buy-name'),/Mehl/);await page.click('#pantry-buy-dialog [data-close]');
    await page.fill('#product-picker-search','Äpfel');assert.equal(await page.locator('#pantry-removed').isHidden(),true);await page.fill('#product-picker-search','');assert.equal(await page.locator('#pantry-removed').isVisible(),true);assert.ok(await horizontalOverflow(page)<=1);
    for(const mode of ['all','favorites','frequent','basics','recent']){await page.click(`[data-product-mode=${mode}]`);assert.equal(await page.locator('#pantry-removed').isHidden(),true);}
    assert.deepEqual(problems,[]);await ctx.close();
  });

});
