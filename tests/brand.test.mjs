import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brandOf, chainOf } from '../brand.js';
import { defaultOfferUrl, storeOfferUrl } from '../prices.js';
import { takesAnywhere } from '../shop.js';

test('bekannte Ketten werden am Namen erkannt, unbekannte nicht', () => {
  const known = { Edeka: 'edeka', 'EDEKA Müller': 'edeka', Lidl: 'lidl', Rewe: 'rewe', 'REWE Center': 'rewe', Rossmann: 'rossmann', Roßmann: 'rossmann', 'ROẞMANN': 'rossmann',
    'Rossmann Drogerie': 'rossmann', ' aldi süd': 'aldi', Kaufland: 'kaufland', Penny: 'penny' };
  for (const [name, key] of Object.entries(known)) assert.equal(brandOf(name), key, name);
  for (const name of ['Bäckerei Rewe', 'Metzger', 'Hofladen', '', undefined, 'Lidlberg', 'Rossmann24', 'dm', 'Müller']) assert.equal(brandOf(name), '', String(name));
});

test('Drogerien: ganze Namen, nicht jeder Name, der so beginnt', () => {
  for (const name of ['Rossmann', 'Roßmann', 'ROẞMANN', 'Rossmann Drogerie', 'dm', 'DM', 'dm-drogerie markt', 'dm Drogeriemarkt', 'Müller', 'Mueller', 'Müller Drogeriemarkt', 'Douglas', 'Budni']) {
    assert.equal(chainOf(name)?.drugstore, true, name);
    assert.equal(takesAnywhere({ name }), false, name);
  }
  for (const name of ['Müller Bäckerei', 'Müller Fleischerei', 'Dmitri Markt', 'dmx', 'Edeka', 'Lidl', 'Aldi', 'Hofladen Rossmann24']) {
    assert.equal(takesAnywhere({ name }), true, name);
  }
  assert.equal(takesAnywhere({ name: 'Rossmann', anywhere: true }), true, 'ausdrückliche Einstellung gewinnt');
  assert.equal(takesAnywhere({ name: 'Edeka', anywhere: false }), false);
  assert.equal(takesAnywhere({ name: 'Rossmann', anywhere: null }), false, 'null = Voreinstellung');
});

test('Angebotsseiten und Drogerien kommen aus derselben Tabelle: Rossmann hat beides, auch mit Zusatz im Namen', () => {
  for (const name of ['Rossmann', 'Roßmann', 'Rossmann Drogerie']) assert.equal(storeOfferUrl({ name }), 'https://www.rossmann.de/de/angebote', name);
  assert.equal(defaultOfferUrl({ name: 'Edeka' }), 'https://www.edeka.de/angebote/');
  assert.equal(defaultOfferUrl({ name: 'Aldi' }), '');
  assert.equal(storeOfferUrl({ name: 'Rossmann', offersUrl: 'https://example.com/x' }), 'https://example.com/x');
});
