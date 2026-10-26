import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { HOLD_MS, SLOP, ZONE_REACH, ZONE_WIDTH, moved, overZone, shift } from '../dragdelete.js';

describe('Zum Löschen ziehen', () => {
  test('die rote Fläche sitzt am rechten Rand; etwas davor zählt schon als getroffen', () => {
    assert.equal(overZone(390, 390), true);
    assert.equal(overZone(390 - ZONE_WIDTH, 390), true);
    assert.equal(overZone(390 - ZONE_WIDTH - ZONE_REACH, 390), true);
    assert.equal(overZone(390 - ZONE_WIDTH - ZONE_REACH - 1, 390), false);
    assert.equal(overZone(20, 390), false);
  });
  test('beim Halten gilt eine kleine Bewegung nicht als Scrollen, eine größere schon', () => {
    assert.equal(moved(0, 0), false);
    assert.equal(moved(SLOP - 2, 0), false);
    assert.equal(moved(0, SLOP + 1), true);
    assert.equal(moved(8, 8), true, 'schräg: 11,3 px');
  });
  test('die Zeile folgt nur nach rechts und bleibt am Rand sichtbar', () => {
    assert.equal(shift(-30, 16, 390), 0, 'nach links bewegt sie sich nicht');
    assert.equal(shift(100, 16, 390), 100);
    assert.equal(shift(900, 16, 390), 390 - 16 - 40, 'am Rand bleiben 40 px stehen');
  });
  test('Haltezeit ist spürbar länger als ein Tipp, aber nicht lästig', () => {
    assert.ok(HOLD_MS >= 350 && HOLD_MS <= 600);
  });
});
