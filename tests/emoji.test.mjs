import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CATEGORIES } from '../categories.js';
import { CATEGORY_EMOJI, FALLBACK_EMOJI, allEmoji, emojiFor } from '../emoji.js';

describe('Standard-Bild: Emoji zum Artikel', () => {
  test('gängige Artikel bekommen das passende Emoji (auch Mehrzahl, Groß-/Kleinschreibung und Zusammensetzungen)', () => {
    const table = { Birne: '🍐', Birnen: '🍐', BIRNE: '🍐', Äpfel: '🍎', Apfel: '🍎', Bananen: '🍌', Tomaten: '🍅', Cocktailtomaten: '🍅', Gurke: '🥒', Zucchini: '🥒', Paprika: '🫑', Karotten: '🥕', Kartoffeln: '🥔', Zwiebeln: '🧅',
      Knoblauch: '🧄', Brokkoli: '🥦', Rotkohl: '🥬', Salat: '🥬', Champignons: '🍄', Reis: '🍚', Basmatireis: '🍚', Nudeln: '🍝', Spaghetti: '🍝', Brot: '🍞', Brötchen: '🍞', Baguette: '🥖', Croissant: '🥐',
      Mehl: '🌾', Haferflocken: '🌾', Cornflakes: '🌾', Eier: '🥚', Ei: '🥚', Milch: '🥛', Joghurt: '🥛', Sahne: '🥛', Käse: '🧀', Mozzarella: '🧀', Butter: '🧈', Hähnchenbrust: '🍗', Schinken: '🥓', Salami: '🌭',
      Hackfleisch: '🥩', Rumpsteak: '🥩', Schweinefilet: '🥩', Lachs: '🐟', Thunfisch: '🐟', Garnelen: '🍤', Honig: '🍯', Olivenöl: '🫒', Zucker: '🍬', Salz: '🧂', Pfeffer: '🧂', Schokolade: '🍫', Nutella: '🍫',
      Kekse: '🍪', Chips: '🍿', Popcorn: '🍿', Eis: '🍦', Wasser: '💧', Mineralwasser: '💧', Cola: '🥤', Bier: '🍺', Weißwein: '🍷', Kaffee: '☕', Tee: '🍵', Spülmittel: '🧼', 'Domol Feinwaschmittel': '🧼',
      Shampoo: '🧴', Zahnpasta: '🪥', Toilettenpapier: '🧻', Katzenfutter: '🐾', Zitronen: '🍋', Orangen: '🍊', Erdbeeren: '🍓', Heidelbeeren: '🫐', Mandeln: '🥜', Linsen: '🫘', 'Kidneybohnen': '🫘' };
    for (const [name, emoji] of Object.entries(table)) assert.equal(emojiFor(name), emoji, name);
  });
  test('Verwechslungen sind ausgeschlossen: Saft ist kein Obst, „Reiswaffeln“ kein Reis, „Kokosmilch“ keine Milch, „Buttermilch“ keine Butter, „Zahnpasta“ keine Pasta, „Alkohol“ kein Kohl', () => {
    const table = { Birnensaft: '🧃', Apfelsaft: '🧃', Orangensaft: '🧃', Reiswaffeln: '🍘', Kokosmilch: '🥥', Buttermilch: '🥛', Zahnpasta: '🪥', Zahncreme: '🪥', Handcreme: '🧴', Paprikapulver: '🧂', Ölsardinen: '🐟',
      Eistee: '🥤', Kornflakes: '🌾', Kölsch: '🍺', Kürbis: '🎃', Apfelmus: '🍎', Milchschokolade: '🍫', Tomatenmark: '🍅' };
    for (const [name, emoji] of Object.entries(table)) assert.equal(emojiFor(name), emoji, name);
    assert.notEqual(emojiFor('Alkohol'), '🥬'); assert.notEqual(emojiFor('Reise'), '🥚'); assert.notEqual(emojiFor('Reis'), '🥚', '„Ei“ steckt nicht in „Reis“');
  });
  test('ohne Treffer: Emoji der Kategorie, sonst ein Paket; leere und merkwürdige Namen brechen nichts', () => {
    assert.equal(emojiFor('Xyz', 'getraenke'), '🥤'); assert.equal(emojiFor('Xyz', 'haushalt'), '🧼'); assert.equal(emojiFor('Xyz', 'sonstiges'), FALLBACK_EMOJI); assert.equal(emojiFor('Xyz'), '📦');
    assert.equal(emojiFor('Ingwer', 'obst'), '🍎'); assert.equal(emojiFor('Ingwer', 'gibtsnicht'), '📦');
    for (const odd of ['', null, undefined, 42, '   ', '!!!', '🍎']) assert.doesNotThrow(() => emojiFor(odd, 'obst'));
    assert.equal(emojiFor('', 'haushalt'), '🧼');
  });
  test('jede Kategorie hat ein eigenes Emoji; alle Emoji sind echte Emoji (kein Text, keine Kontrollzeichen)', () => {
    for (const { id } of CATEGORIES.filter(category => category.id !== 'sonstiges')) assert.ok(CATEGORY_EMOJI[id], `${id} ohne Emoji`);
    assert.equal(new Set(Object.values(CATEGORY_EMOJI)).size, Object.keys(CATEGORY_EMOJI).length, 'jede Kategorie ein eigenes');
    for (const emoji of allEmoji()) { assert.match(emoji, /\p{Extended_Pictographic}/u, emoji); assert.doesNotMatch(emoji, /[A-Za-z0-9\s]/, emoji); }
    assert.ok(allEmoji().length >= 60, `nur ${allEmoji().length} verschiedene Emoji`);
  });
  test('die Kategorie-Schätzung der App und die Emoji passen zusammen: jeder Artikelname der Beispielkategorien ergibt ein sinnvolles Symbol (nie ein Paket bei bekannten Lebensmitteln)', () => {
    const common = ['Milch', 'Butter', 'Eier', 'Brot', 'Äpfel', 'Bananen', 'Tomaten', 'Nudeln', 'Reis', 'Kartoffeln', 'Zwiebeln', 'Käse', 'Joghurt', 'Hähnchen', 'Hackfleisch', 'Lachs', 'Mehl', 'Zucker', 'Salz', 'Öl', 'Kaffee', 'Tee', 'Wasser', 'Saft', 'Bier', 'Wein', 'Schokolade', 'Kekse', 'Spülmittel', 'Shampoo', 'Toilettenpapier'];
    for (const name of common) assert.notEqual(emojiFor(name), FALLBACK_EMOJI, name);
  });
  test('keine Lookbehind-Ausdrücke im Code (ältere iOS-Versionen können sie nicht und würden die ganze Datei ablehnen)', async () => {
    for (const file of ['emoji.js', 'app.js']) assert.doesNotMatch(await readFile(path.join(import.meta.dirname, '..', file), 'utf8'), /\(\?<[=!]/, file);
  });
});
