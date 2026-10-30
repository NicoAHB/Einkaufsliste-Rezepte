import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { CATEGORIES, guessCategory } from '../categories.js';
import { GROCERY_NAMES } from '../grocery-names.js';
import { GROCERY_PRODUCTS, PRODUCT_PHOTOS } from '../product-catalog.js';
import { GROUP_PHOTO, PRODUCT_GROUP_IMAGES, groupImageFor, productImageById, resolveProductImage } from '../product-images.js';
import { addToList } from '../data.js';

test('Jeder vorgegebene Artikelname hat ein eigenes Bild; alle 1024 Katalogbilder sind eindeutig erreichbar', () => {
  for (const name of GROCERY_NAMES) assert.equal(resolveProductImage(name).kind, 'product', name);
  for (const product of GROCERY_PRODUCTS) assert.equal(resolveProductImage(product.name, product.category), productImageById(product.id), product.name);
  assert.equal(new Set(GROCERY_PRODUCTS.map(product => `${productImageById(product.id).url}:${product.cell}`)).size, 1024);
  assert.equal(productImageById('unbekannt'), null);
});

test('Bilder der Beispiele, Marken-Zusätze und Schreibweisen: nur Bilder zuordnen, Namen bleiben erhalten', () => {
  const examples = { Butter: 'butter', Eier: 'eier', Milch: 'milch', Blumenerde: 'blumenerde', Honig: 'honig', Zahnpasta: 'zahnpasta',
    'Domol Feinwaschmittel': 'feinwaschmittel', 'COMPO Blumenerde 20 l': 'blumenerde', 'Bio Äpfel': 'aepfel', 'Bio Milch 1,5%': 'milch',
    'WEIHENSTEPHAN H-Milch 1 l': 'milch', 'Birne': 'birnen', 'Möhren': 'karotten', 'Hafermilch': 'haferdrink', 'Nutella': 'nuss-nougat-creme' };
  for (const [name, expected] of Object.entries(examples)) {
    const source = { name, quantity: 1, unit: 'Stück' }; assert.equal(resolveProductImage(source.name).key, expected, name);
    assert.equal(source.name, name, 'Bildauswahl verändert den Artikelnamen nicht');
  }
});

test('Ähnliche Namen bekommen kein falsches Produktfoto; klare Gruppen statt riskanter Teilworttreffer', () => {
  const groups = { 'Apfeltasche Spezial': 'desserts', Apfelkuchen: 'desserts', Apfelmusspezial: 'miscellaneous', Birnensaftschorle: 'drinks',
    Milchreis: 'desserts', 'Zwiebelmett vom Metzger': 'meat', Handtasche: 'clothing', 'Blumendünger Spezial': 'garden', Springseil: 'sports' };
  for (const [name, expected] of Object.entries(groups)) {
    const image = resolveProductImage(name); assert.equal(image.kind, 'group', name); assert.equal(image.group, expected, name);
  }
  assert.equal(resolveProductImage('Ei').key, 'eier'); assert.equal(resolveProductImage('Eis').key, 'eis');
  const products = { Apfeltasche: 'apfeltaschen', Apfelmus: 'apfelmus', Birnensaft: 'birnensaft', Reiswaffeln: 'reiswaffeln', Zwiebelmett: 'zwiebelmett', Blumendünger: 'blumenduenger', Sesamsamen: 'sesamsamen' };
  for (const [name, key] of Object.entries(products)) assert.equal(resolveProductImage(name).key, key);
  assert.equal(resolveProductImage('Apfel Zimt Joghurt', 'kuehl').group, 'dairy');
  assert.equal(resolveProductImage('Hafermilch Schokolade', 'getraenke').group, 'plant-based');
  assert.equal(resolveProductImage('MilchXYZ', 'kuehl').kind, 'group');
  assert.equal(resolveProductImage('Unbekannte Marke Knusperneu', 'snacks').group, 'snacks');
  assert.equal(guessCategory('Apfeltasche'), 'brot', 'neu eingetragenes Gebäck auch im richtigen Gang');
  assert.equal(guessCategory('Handtasche'), null, 'keine allgemeine Taschen-Regel');
});

test('Neue Artikel jeder Kategorie erhalten ein Gruppenmotiv; Sonderzeichen sind nur Text', () => {
  for (const category of CATEGORIES) {
    const photo = resolveProductImage('Xyzabc', category.id); assert.equal(photo.kind, 'group', category.label); assert.equal(photo.url, GROUP_PHOTO);
  }
  assert.equal(resolveProductImage('Xyzabc').group, 'miscellaneous');
  for (const name of ['constructor', '__proto__', '<img src=https://example.org/x>', 'url(https://example.org/x)']) {
    assert.equal(resolveProductImage(name, '__proto__').url, GROUP_PHOTO);
  }
  assert.equal(groupImageFor('Milch', 'kuehl').group, 'dairy');
});

test('1056 eigene Motive: 1024 Produkte und 32 Gruppen, vollständig offline und zusammen unter 9 MB', async () => {
  assert.equal(PRODUCT_GROUP_IMAGES.length, 32);
  assert.equal(new Set(PRODUCT_GROUP_IMAGES.map(group => group.cell)).size, 32);
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8'); let bytes = 0;
  for (const url of [...PRODUCT_PHOTOS, GROUP_PHOTO]) {
    assert.match(url, /^assets\/products\/[a-z-]+\.webp$/);
    const image = await readFile(new URL('../' + url, import.meta.url)); bytes += image.length;
    assert.equal(image.subarray(8, 12).toString(), 'WEBP'); assert.ok(sw.includes(`'./${url}'`));
  }
  assert.ok(bytes < 9000000);
});

test('Katalog-Kategorie bleibt bei neuen, nicht erkannten Namen erhalten; gelernte Zuordnung hat weiter Vorrang', () => {
  const at = '2026-10-29T21:00:00Z';
  const row = GROCERY_PRODUCTS.find(product => product.name === 'Rote Bete');
  assert.equal(addToList([row], '', 'Nico', at).ops[0].patch.category, 'obst');
  const history = [{ name: 'Rote Bete', category: 'vorrat', updatedAt: at }];
  assert.equal(addToList([row], '', 'Nico', at, [], history).ops[0].patch.category, 'vorrat');
});
