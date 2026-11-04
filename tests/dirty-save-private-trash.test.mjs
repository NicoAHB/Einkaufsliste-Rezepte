import assert from 'node:assert/strict';
import { test } from 'node:test';
import { savedLabel } from '../dirty-save.js';
import { PRIVATE_TRASH_DAYS, privateTrash, prunePrivateTrash, readPrivateList, updatePrivateList, validatePrivateList } from '../private-list.js';
import { emptyData } from '../data.js';
import { SINGLE_DELETE, trashEntries } from '../trash.js';

// 2.147: Speichern-Knopf im Ruhezustand nennt die letzte Speicherung
test('Speichern erst nach Änderung: „Gespeichert um …“ heute, „Gespeichert am … um …“ an anderen Tagen, sonst „Keine Änderungen“', () => {
  const now = new Date(2026, 10, 3, 18, 30);
  assert.equal(savedLabel(new Date(2026, 10, 3, 14, 5).toISOString(), now), 'Gespeichert um 14:05 Uhr');
  assert.equal(savedLabel(new Date(2026, 10, 2, 9, 7).toISOString(), now), 'Gespeichert am 02.11. um 09:07 Uhr');
  assert.equal(savedLabel(new Date(2025, 10, 3, 14, 5).toISOString(), now), 'Gespeichert am 03.11. um 14:05 Uhr', 'gleicher Tag im Vorjahr ist nicht heute');
  for (const value of ['', null, undefined, 'kein Datum']) assert.equal(savedLabel(value, now), 'Keine Änderungen');
});

const store = () => { const values = new Map(); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) }; };
const row = (id, extra = {}) => ({ id, listId: 'liste', name: id, note: '', checked: false, createdAt: '2026-11-01T10:00:00.000Z', ...extra });
const list = { id: 'liste', name: 'Geschenke', symbol: 'secret', enabled: true };

test('Geheime Liste: Papierkorb hält Löschungen 14 Tage, Aufräumen entfernt nur Abgelaufenes, beim Lesen wird nichts geschrieben', () => {
  const now = Date.parse('2026-11-03T12:00:00.000Z'), day = 86400000;
  const data = { version: 1, enabled: true, lists: [list], items: [row('offen'), row('frisch', { deletedAt: new Date(now - day).toISOString() }), row('alt', { deletedAt: new Date(now - (PRIVATE_TRASH_DAYS + 1) * day).toISOString() })] };
  assert.deepEqual(privateTrash(data, now).map(entry => entry.id), ['frisch']);
  assert.deepEqual(prunePrivateTrash(structuredClone(data), now).items.map(entry => entry.id), ['offen', 'frisch']);
  const storage = store(); storage.setItem('einkauf-private-list-v1:familie', JSON.stringify(data));
  assert.equal(readPrivateList(storage, 'familie').items.length, 3, 'bloßes Lesen räumt nicht auf');
  updatePrivateList(storage, 'familie', value => value);
  assert.equal(readPrivateList(storage, 'familie').items.length, 3, 'updatePrivateList selbst räumt nicht auf (das macht die Ansicht beim Schreiben)');
});

test('Geheime Liste: Löschmarke und Bearbeitungszeit müssen gültige Zeitpunkte sein', () => {
  const ok = { version: 1, enabled: true, lists: [list], items: [row('a', { deletedAt: '2026-11-02T10:00:00.000Z', updatedAt: '2026-11-02T10:00:00.000Z' })] };
  assert.doesNotThrow(() => validatePrivateList(ok));
  for (const field of ['deletedAt', 'updatedAt']) for (const value of ['gestern', 5, null]) {
    assert.throws(() => validatePrivateList({ ...ok, items: [row('a', { [field]: value })] }), /beschädigt/, `${field}=${value}`);
  }
});

test('Papierkorb: abgehakte Artikel erscheinen nur, wenn sie einzeln gelöscht wurden (Kennung one-del-)', () => {
  const now = Date.parse('2026-11-03T12:00:00.000Z'), at = new Date(now - 3600000).toISOString(), data = emptyData();
  const item = (id, clockId) => ({ id, name: id, quantity: 1, unit: 'Stück', storeId: '', checked: true, createdBy: 'Nico', createdAt: at, updatedAt: at, deletedAt: at, _clock: { deletedAt: { at, id: clockId } } });
  data.items = [item('Einzeln', `${SINGLE_DELETE}abc`), item('Erledigt', 'op-123'), item('Zusammengelegt', 'fold-del-x')];
  assert.deepEqual(trashEntries(data, now).map(entry => entry.title), ['Einzeln']);
});
