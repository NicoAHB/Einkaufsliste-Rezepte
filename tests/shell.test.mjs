/* Prüft das Offline-Paket und die Seite statisch: Fehlt eine Datei im Paket, startet die App offline nicht; fehlt ein Element, bricht sie beim Laden ab. */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = file => readFile(path.join(root, file), 'utf8');
const [sw, html, readme, manifest] = await Promise.all([read('sw.js'), read('index.html'), read('README.md'), read('manifest.webmanifest')]);
const files = [...sw.match(/const FILES = \[([^\]]*)\]/s)[1].matchAll(/'([^']+)'/g)].map(match => match[1]).filter(file => file !== './').map(file => file.replace(/^\.\//, ''));
const scripts = (await readdir(root)).filter(name => name.endsWith('.js') && name !== 'sw.js');

test('jede Datei im Offline-Paket gibt es, und jede Skriptdatei der App steckt im Paket', async () => {
  for (const file of files) await assert.doesNotReject(read(file), `${file} fehlt, steht aber im Offline-Paket`);
  for (const file of scripts) assert.ok(files.includes(file), `${file} fehlt im Offline-Paket (sw.js, FILES)`);
  for (const file of ['index.html', 'styles.css', 'app.js', 'manifest.webmanifest']) assert.ok(files.includes(file), file);
});

test('jede importierte Datei und jede in der Seite eingebundene Datei steckt im Offline-Paket', async () => {
  for (const file of scripts) {
    for (const match of (await read(file)).matchAll(/from '\.\/([^']+)'/g)) assert.ok(files.includes(match[1]), `${file} importiert ${match[1]}, das im Paket fehlt`);
  }
  for (const match of html.matchAll(/(?:src|href)="([^"#?]+\.(?:js|css|webmanifest|svg|png))"/g)) assert.ok(files.includes(match[1]), `index.html bindet ${match[1]} ein, das im Paket fehlt`);
  for (const icon of JSON.parse(manifest).icons) assert.ok(files.includes(icon.src), `Symbol ${icon.src} aus dem Manifest fehlt im Offline-Paket`);
});

test('die App ist fest im Hochformat (Manifest), und es gibt keine Einstellung dafür', async () => {
  assert.equal(JSON.parse(manifest).orientation, 'portrait');
  assert.ok(!/orientation|hochkant|querformat/i.test((await read('index.html')).replace(/<!--[\s\S]*?-->/g, '').replace(/<div id="turn-hint"[\s\S]*?<\/div>/, '').replace(/<symbol id="i-phone"[\s\S]*?<\/symbol>/, '')), 'in den Einstellungen gibt es keinen Schalter für die Ausrichtung');
});

test('die Seite verlinkt keine Dateien der App selbst als Text (kein Weg zurück in der Home-Bildschirm-App)', () => {
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    assert.ok(!/^(?![a-z]+:)[^#]*\.(md|txt|json)$/i.test(match[1]), `index.html verlinkt ${match[1]}: Dateien öffnen in der App ohne Schließen-Knopf, bitte ein Fenster in der App benutzen`);
  }
});

test('Elementkennungen in der Seite sind eindeutig, und die App sucht keine, die es nicht gibt', async () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, [], 'doppelte id');
  const created = new Set();
  const app = await read('app.js');
  for (const match of app.matchAll(/\.id = '([^']+)'/g)) created.add(match[1]);
  const missing = [...new Set([...app.matchAll(/\$\('#([A-Za-z][\w-]*)'\)/g)].map(match => match[1]))].filter(id => !ids.includes(id) && !created.has(id));
  assert.deepEqual(missing, [], 'App sucht Elemente, die nicht in index.html stehen');
});

test('die README nennt jede Skriptdatei der App in der Liste zum Hochladen', () => {
  const upload = readme.slice(readme.indexOf('Im Repo **Code → Add file → Upload files**'), readme.indexOf('Unten **Commit changes**'));
  assert.ok(upload.length > 100, 'Abschnitt zum Hochladen nicht gefunden');
  for (const file of [...scripts, 'sw.js', ...files.filter(file => file.endsWith('.json') && file !== 'manifest.webmanifest')]) assert.ok(upload.includes(`\`${file}\``), `${file} fehlt in der Upload-Liste der README`);
});
