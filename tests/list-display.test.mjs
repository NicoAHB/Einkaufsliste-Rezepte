// 2.152: Festes Listensymbol und Anzeige im Reiter (Nur Symbol, Nur Name, Symbol und Name)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyData, merge, operation, validate } from '../data.js';
import { DISPLAY_MODES, REGULAR_SYMBOLS, NOTES_SYMBOL, displayModeOf, fixedSymbol, symbolName } from '../list-symbols.js';
import { validatePrivateList } from '../private-list.js';

const at = '2026-11-04T10:00:00.000Z', later = seconds => new Date(Date.parse(at) + seconds * 1000).toISOString();
const store = (patch, id = 'liste') => merge(emptyData(), [operation('stores', id, { name: 'Urlaub', separate: true, ...patch }, 'Nico', at)]);
const apply = (data, patch, seconds, actor = 'Nico', id = 'liste') => merge(data, [operation('stores', id, patch, actor, later(seconds))]);
const row = (data, id = 'liste') => data.stores.find(entry => entry.id === id);

test('Festes Symbol: gespeichert, aus „Wünsche“ abgeleitet oder noch keines', () => {
  assert.equal(fixedSymbol({ separate: true, symbol: 'travel', name: 'Urlaub' }), 'travel');
  assert.equal(fixedSymbol({ separate: true, symbol: null, name: 'Wünsche' }), 'gift', 'bisher sichtbares Geschenk zählt als fest');
  assert.equal(fixedSymbol({ separate: true, name: 'Wunschzettel' }), 'gift');
  assert.equal(fixedSymbol({ separate: true, symbol: 'none', name: 'Wünsche' }), '', '„none“ ist kein Motiv und wird nicht erraten');
  assert.equal(fixedSymbol({ separate: true, name: 'Urlaub' }), '');
  assert.equal(fixedSymbol({ name: 'Wünsche' }), '', 'ein Geschäft bekommt kein abgeleitetes Geschenk');
  assert.equal(fixedSymbol({ symbol: 'pharmacy', name: 'Edeka' }), 'pharmacy', 'ein gespeichertes Symbol bleibt auch nach einer Typumstellung fest');
  assert.equal(fixedSymbol(null), '');
});

test('Anzeige: ohne Angabe die bisherige Ansicht, ohne Symbol immer der Name', () => {
  assert.deepEqual(DISPLAY_MODES, ['symbol', 'name', 'both']);
  assert.equal(displayModeOf(undefined, 'travel'), 'symbol', 'alte Listen mit Symbol zeigen weiter nur das Symbol');
  assert.equal(displayModeOf(null, ''), 'name');
  assert.equal(displayModeOf('both', ''), 'name', 'ohne Symbol gibt es nur den Namen');
  for (const mode of DISPLAY_MODES) assert.equal(displayModeOf(mode, 'gift'), mode);
  assert.equal(displayModeOf('unbekannt', 'gift'), 'symbol');
  assert.ok(!REGULAR_SYMBOLS.some(entry => entry.id === NOTES_SYMBOL), 'das Klemmbrett ist kein gewöhnliches Motiv');
  assert.equal(symbolName('travel'), 'Reisen'); assert.equal(symbolName('x'), '');
});

test('Ein gespeichertes Symbol wird durch keine Änderung ausgetauscht oder gelöscht', () => {
  const base = store({ symbol: 'travel', displayMode: 'both' });
  for (const symbol of ['gift', 'checklist', 'secret', 'none', null]) assert.equal(row(apply(base, { symbol }, 1)).symbol, 'travel', `kein Tausch zu ${symbol}`);
  // Anzeige, Name und Sichtbarkeit bleiben änderbar; das Symbol bleibt
  let next = apply(base, { displayMode: 'name' }, 1);
  assert.equal(row(next).displayMode, 'name'); assert.equal(row(next).symbol, 'travel');
  next = apply(next, { name: 'Sommer', displayMode: 'symbol', listEnabled: false }, 2);
  assert.deepEqual([row(next).name, row(next).displayMode, row(next).symbol, row(next).listEnabled], ['Sommer', 'symbol', 'travel', false]);
  // Typumstellung (Liste → Geschäft → Liste) umgeht die Sperre nicht
  next = apply(apply(next, { separate: null, symbol: 'gift' }, 3), { separate: true, symbol: 'pets' }, 4);
  assert.equal(row(next).symbol, 'travel');
});

test('Eine Liste ohne Motiv bekommt einmal ein Symbol, danach gilt die Sperre', () => {
  let data = store({ symbol: 'none' });
  data = apply(data, { symbol: 'home', displayMode: 'both' }, 1);
  assert.equal(row(data).symbol, 'home');
  assert.equal(row(apply(data, { symbol: 'gift' }, 2)).symbol, 'home');
  // Auch Listen ganz ohne Angabe (alte Daten) und ehemalige Geschäfte
  assert.equal(row(apply(store({}), { symbol: 'pets' }, 1)).symbol, 'pets');
  const shop = merge(emptyData(), [operation('stores', 'laden', { name: 'Edeka' }, 'Nico', at)]);
  assert.equal(row(apply(shop, { separate: true, symbol: 'pharmacy' }, 1, 'Nico', 'laden'), 'laden').symbol, 'pharmacy');
});

test('Umbenennen und Typumstellung halten ein nur aus „Wünsche“ abgeleitetes Geschenk fest', () => {
  const wishes = merge(emptyData(), [operation('stores', 'w', { name: 'Wünsche', separate: true }, 'Nico', at)]);
  assert.equal(row(wishes, 'w').symbol, undefined);
  const renamed = apply(wishes, { name: 'Geschenkideen' }, 1, 'Nico', 'w');
  assert.equal(row(renamed, 'w').symbol, 'gift', 'Umbenennen ändert das Motiv nicht');
  assert.equal(fixedSymbol(row(renamed, 'w')), 'gift');
  const asShop = apply(wishes, { separate: null }, 1, 'Nico', 'w');
  assert.equal(row(asShop, 'w').symbol, 'gift', 'auch als Geschäft bleibt das Motiv hinterlegt');
  assert.equal(row(apply(wishes, { symbol: 'travel' }, 1, 'Nico', 'w'), 'w').symbol ?? 'gift', 'gift', 'kein Tausch des abgeleiteten Geschenks');
  // Eine ausdrückliche Bestätigung desselben Symbols ist erlaubt
  assert.equal(row(apply(wishes, { symbol: 'gift', name: 'Ideen' }, 1, 'Nico', 'w'), 'w').symbol, 'gift');
});

test('Abgleich: eine ältere Offline-Änderung tauscht ein inzwischen festes Symbol nicht aus', () => {
  const base = store({ symbol: 'none' });
  const offline = operation('stores', 'liste', { symbol: 'gift' }, 'Anna', later(1));     // früher erstellt, später eingetroffen
  const first = operation('stores', 'liste', { symbol: 'travel' }, 'Nico', later(2));
  const shared = merge(base, [first]);
  assert.equal(row(merge(shared, [offline])).symbol, 'travel', 'was schon in der Datei steht, bleibt');
  // Gleichzeitige Anzeigeänderungen: die jüngste gewinnt, das Symbol bleibt
  const a = operation('stores', 'liste', { displayMode: 'name' }, 'Nico', later(3)), b = operation('stores', 'liste', { displayMode: 'both', symbol: 'pets' }, 'Anna', later(4));
  for (const ops of [[a, b], [b, a]]) { const next = merge(shared, ops); assert.equal(row(next).displayMode, 'both'); assert.equal(row(next).symbol, 'travel'); }
});

test('Notizlisten bleiben Notizlisten, auch mit „Nur Name“', () => {
  const notes = store({ name: 'Notizen', symbol: NOTES_SYMBOL, displayMode: 'both' }, 'n');
  for (const patch of [{ displayMode: 'name' }, { displayMode: 'name', symbol: 'none' }, { symbol: 'gift' }, { name: 'Familie', symbol: null }])
    assert.equal(row(apply(notes, patch, 1, 'Nico', 'n'), 'n').symbol, NOTES_SYMBOL, JSON.stringify(patch));
});

test('Anzeige im Reiter wird geprüft und schützt vor älteren App-Versionen (Revision 18)', () => {
  const plain = store({ symbol: 'travel' });
  assert.ok((plain.sync.minRev || 1) < 18, 'ohne Anzeigeangabe bleiben ältere Apps lesefähig');
  const shown = apply(plain, { displayMode: 'both' }, 1);
  assert.equal(shown.sync.minRev, 18);
  const broken = structuredClone(shown); row(broken).displayMode = 'gross';
  assert.throws(() => validate(broken), /Ungültige Anzeige im Reiter/);
  const legacy = structuredClone(shown); row(legacy).displayMode = null; assert.doesNotThrow(() => validate(legacy));
  const old = structuredClone(shown); old.sync.minRev = 19;
  assert.throws(() => validate(old), /App-Version ist für die Daten zu alt/);
});

test('Geheime Listen merken ihre Anzeige auf dem Gerät', () => {
  const list = mode => ({ version: 1, enabled: true, items: [], lists: [{ id: 'p', name: 'Geheim', enabled: true, symbol: 'secret', updatedAt: at, ...(mode === undefined ? {} : { displayMode: mode }) }] });
  for (const mode of [undefined, ...DISPLAY_MODES]) assert.doesNotThrow(() => validatePrivateList(list(mode)));
  assert.throws(() => validatePrivateList(list('gross')), /beschädigt/);
});
