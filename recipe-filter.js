/* Filter für die Rezeptauswahl im Fenster „Gericht planen“. Reine Logik ohne DOM.
   Die Einträge des Auswahlfelds: alle Rezepte, Favoriten, „Lange nicht gekocht“ und jedes Stichwort, das mindestens ein Rezept trägt
   (Groß- und Kleinschreibung egal: „vegan“ und „Vegan“ sind ein Eintrag). Einträge ohne Rezept gibt es nicht. */
import { daysBetween } from './plan.js';

export const LONG_AGO_DAYS = 28;   // so lange darf ein Rezept höchstens nicht gekocht worden sein; wer noch nie gekocht wurde, zählt mit
export const ALL = '', FAVORITES = 'favorites', LONG_AGO = 'long-ago';
const TAG = 'tag:';

const tagKey = tag => String(tag ?? '').trim().toLocaleLowerCase('de');
const tagsOf = recipe => (Array.isArray(recipe.tags) ? recipe.tags : []).map(tagKey).filter(Boolean);
const capital = text => text.charAt(0).toLocaleUpperCase('de') + text.slice(1);
const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'de');

// Wurde das Rezept seit LONG_AGO_DAYS Tagen nicht gekocht (oder noch nie)? `today` ist ein Tag als „JJJJ-MM-TT“.
export function cookedLongAgo(recipe, today) {
  if (!recipe.lastCookedAt) return true;
  return daysBetween(String(recipe.lastCookedAt).slice(0, 10), today) >= LONG_AGO_DAYS;
}

// Die Einträge des Auswahlfelds: [{ value, label, count }]. „Alle Rezepte“ steht immer da, Favoriten und „Lange nicht gekocht“ nur mit mindestens einem Rezept.
export function filterOptions(recipes, today) {
  const options = [{ value: ALL, label: 'Alle Rezepte', count: recipes.length }];
  const favorites = recipes.filter(recipe => recipe.favorite).length, longAgo = recipes.filter(recipe => cookedLongAgo(recipe, today)).length;
  if (favorites) options.push({ value: FAVORITES, label: '★ Favoriten', count: favorites });
  if (longAgo) options.push({ value: LONG_AGO, label: 'Lange nicht gekocht', count: longAgo });
  const tags = new Map();   // Schlüssel (klein) → { label, count }
  for (const recipe of recipes) {
    const seen = new Set();
    for (const raw of Array.isArray(recipe.tags) ? recipe.tags : []) {
      const key = tagKey(raw);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const entry = tags.get(key);
      if (entry) entry.count++; else tags.set(key, { label: capital(String(raw).trim()), count: 1 });
    }
  }
  for (const [key, entry] of [...tags].sort((a, b) => a[1].label.localeCompare(b[1].label, 'de'))) options.push({ value: TAG + key, label: entry.label, count: entry.count });
  return options;
}

// Die Rezepte für die Auswahlliste, in der Reihenfolge der Anzeige. `keep` (das gerade gewählte Rezept) bleibt immer in der Liste,
// auch wenn der Filter es ausschließt: So sieht man im Fenster stets, was gespeichert würde.
// „Lange nicht gekocht“: das am längsten nicht gekochte zuerst (noch nie gekochte ganz vorn). Sonst: Favoriten zuerst, dann nach Namen.
export function pickRecipes(recipes, value, { today, keep = '' } = {}) {
  if (value === LONG_AGO) {
    return recipes.filter(recipe => recipe.id === keep || cookedLongAgo(recipe, today))
      .sort((a, b) => String(a.lastCookedAt || '').slice(0, 10).localeCompare(String(b.lastCookedAt || '').slice(0, 10)) || byName(a, b));
  }
  const wanted = String(value).startsWith(TAG) ? String(value).slice(TAG.length) : '';
  const matches = value === FAVORITES ? recipe => Boolean(recipe.favorite) : wanted ? recipe => tagsOf(recipe).includes(wanted) : () => true;
  return recipes.filter(recipe => recipe.id === keep || matches(recipe))
    .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || byName(a, b));
}
