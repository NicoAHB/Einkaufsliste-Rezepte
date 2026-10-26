import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brandOf } from '../brand.js';

test('bekannte Ketten werden am Namen erkannt, unbekannte nicht', () => {
  const known = { Edeka: 'edeka', 'EDEKA Müller': 'edeka', Lidl: 'lidl', Rewe: 'rewe', 'REWE Center': 'rewe', Rossmann: 'rossmann', Roßmann: 'rossmann',
    ' aldi süd': 'aldi', Kaufland: 'kaufland', Penny: 'penny' };
  for (const [name, key] of Object.entries(known)) assert.equal(brandOf(name), key, name);
  for (const name of ['Bäckerei Rewe', 'Metzger', 'Hofladen', '', undefined, 'Lidlberg']) assert.equal(brandOf(name), '', String(name));
});
