import assert from 'node:assert/strict';
import { test } from 'node:test';
import { splitSteps } from '../cook.js';

test('Eine Zeile je Schritt, Nummern am Anfang fallen weg', () => {
  assert.deepEqual(splitSteps('1. Nudeln kochen.\n2) Zwiebel würfeln.\n\nSchritt 3: Alles mischen.'), ['Nudeln kochen.', 'Zwiebel würfeln.', 'Alles mischen.']);
});

test('Ein einziger Absatz wird an Satzenden geteilt, „ca. 10 Minuten“ und Zahlen bleiben zusammen', () => {
  assert.deepEqual(splitSteps('Zwiebel würfeln und in Öl glasig dünsten. Tomaten zugeben und ca. 10 Minuten köcheln lassen. Mit 100 ml Sahne verfeinern.'),
    ['Zwiebel würfeln und in Öl glasig dünsten.', 'Tomaten zugeben und ca. 10 Minuten köcheln lassen.', 'Mit 100 ml Sahne verfeinern.']);
});

test('Leer oder nur Leerzeichen: keine Schritte', () => {
  assert.deepEqual(splitSteps(''), []);
  assert.deepEqual(splitSteps('  \n  '), []);
  assert.deepEqual(splitSteps(undefined), []);
  assert.deepEqual(splitSteps('Fertig'), ['Fertig']);
});
