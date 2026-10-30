import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brandOf, chainOf, defaultSymbol, symbolOf } from '../brand.js';
import { defaultOfferUrl, storeOfferUrl } from '../prices.js';
import { takesAnywhere } from '../shop.js';

test('bekannte Ketten werden am Namen erkannt, unbekannte nicht', () => {
  const known = { Edeka: 'edeka', 'EDEKA Müller': 'edeka', Lidl: 'lidl', Rewe: 'rewe', 'REWE Center': 'rewe', Rossmann: 'rossmann', Roßmann: 'rossmann', 'ROẞMANN': 'rossmann',
    'Rossmann Drogerie': 'rossmann', ' aldi süd': 'aldi-sued', Kaufland: 'kaufland', Penny: 'penny', dm: 'dm', Müller: 'mueller' };
  for (const [name, key] of Object.entries(known)) assert.equal(brandOf(name), key, name);
  for (const name of ['Bäckerei Rewe', 'Metzger', 'Hofladen', '', undefined, 'Lidlberg', 'Rossmann24']) assert.equal(brandOf(name), '', String(name));
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

test('Symbol statt Name: „Wünsche“ ist ein Geschenk, eine ausdrückliche Wahl gewinnt, andere Namen bleiben Text', () => {
  for (const name of ['Wünsche', 'wünsche', 'WÜNSCHE', 'Wuensche', 'Wunsch', 'Wunschliste', 'Wunschzettel', 'Wünsche und Ideen']) assert.equal(defaultSymbol(name), 'gift', name);
  for (const name of ['Edeka', 'Rossmann', 'Wünschelrute', 'Ohne Wünsche', 'Geschenke', '', undefined]) assert.equal(defaultSymbol(name), '', String(name));
  assert.equal(symbolOf({ name: 'Wünsche' }), 'gift');
  assert.equal(symbolOf({ name: 'Wünsche', symbol: null }), 'gift', 'null = Voreinstellung');
  assert.equal(symbolOf({ name: 'Wünsche', symbol: 'none' }), '', 'ausdrücklich der Name');
  assert.equal(symbolOf({ name: 'Edeka', symbol: 'gift' }), 'gift', 'ausdrücklich ein Geschenk');
  assert.equal(symbolOf({ name: 'Ideen', symbol: 'gift' }), 'gift', 'auch nach dem Umbenennen');
  assert.equal(symbolOf({ name: 'Wünsche', symbol: 'unbekannt' }), 'gift', 'Unbekanntes gilt als Voreinstellung');
  assert.equal(symbolOf(undefined), '');
});
