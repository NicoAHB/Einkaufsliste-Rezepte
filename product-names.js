/* Lokale Tippfehlerhilfe. Ganze Produktnamen vergleichen; keine Marken, Sorten,
   Zahlen oder Zusätze entfernen. Automatik nur bei einem eindeutigen kleinen Fehler.
   Das verändert weder alte Einträge noch die Regeln zum Zusammenzählen. */
import { spellingStem } from './data.js';
const keyOf = value => String(value || '').trim().toLocaleLowerCase('de').replace(/ä|ae/g, 'a').replace(/ö|oe/g, 'o').replace(/ü|ue/g, 'u').replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
// Damerau-Levenshtein: ein benachbarter Buchstabendreher zählt als ein Fehler.
function distance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const table = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  table[0] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    table[i][j] = Math.min(table[i - 1][j] + 1, table[i][j - 1] + 1, table[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) table[i][j] = Math.min(table[i][j], table[i - 2][j - 2] + 1);
  }
  return table[a.length][b.length];
}
export function makeNameMatcher(rows = []) {
  const names = new Map();
  for (const row of rows) {
    const name = String(typeof row === 'string' ? row : row?.name || '').trim();
    if (!name || name.length > 120) continue;
    const key = keyOf(name);
    if (!names.has(key)) names.set(key, { name, key, words: key.split(' '), family: spellingStem(name) });
  }
  const candidates = [...names.values()], families = new Set(candidates.map(row => row.family));
  return typed => {
    const original = String(typed || '').trim(), key = keyOf(original), empty = { name: original, correction: null, suggestions: [] };
    // Eigene exakte Namen und normale Ein-/Mehrzahl bleiben erhalten. Kurze Namen
    // sowie Mengen, Modellnummern und Sonderzeichen sind zu leicht verwechselbar.
    if (key.length < 4 || original.length > 120 || names.has(key) || families.has(spellingStem(original)) || /[\d/&+%]/u.test(original)) return empty;
    const words = key.split(' '), matches = [];
    for (const row of candidates) {
      if (row.words.length !== words.length || /\d/u.test(row.key)) continue;
      let score = 0, changed = 0, shortest = Infinity;
      for (let i = 0; i < words.length; i++) {
        if (words[i] === row.words[i]) continue;
        changed++; shortest = Math.min(shortest, words[i].length, row.words[i].length);
        score += distance(words[i], row.words[i]);
        if (score > 2) break;
      }
      if (score && score <= 2 && shortest >= 4) matches.push({ ...row, score, changed, shortest });
    }
    matches.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, 'de'));
    const best = matches[0]; if (!best) return empty;
    const near = matches.filter(row => row.score === best.score), groups = new Set(near.map(row => row.family));
    const correction = best.score === 1 && best.changed === 1 && best.shortest >= 5 && groups.size === 1 ? best.name : null;
    const seen = new Set(), suggestions = [];
    for (const row of matches) if (!seen.has(row.family)) { seen.add(row.family); suggestions.push(row.name); if (suggestions.length === 3) break; }
    return { name: correction || original, correction, suggestions };
  };
}
export const matchProductName = (typed, rows) => makeNameMatcher(rows)(typed);
