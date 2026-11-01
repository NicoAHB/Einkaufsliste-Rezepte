// Entwürfe bleiben auf dem Gerät und gehören genau zu einer Datenverbindung.
export const LEGACY_DRAFT_KEY = 'einkauf-recipe-drafts-v1';
export const draftStorageKey = scope => `einkauf-recipe-drafts-v2:${encodeURIComponent(scope)}`;
const OWNER = 'einkauf-recipe-drafts-legacy-owner-v1';
const clean = (value, now) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Die gespeicherten Rezeptentwürfe sind nicht lesbar. Sie bleiben für eine Wiederherstellung erhalten.');
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry && typeof entry.at === 'string' && Date.parse(entry.at) > now - 30 * 86400000 && entry.state && typeof entry.state === 'object'));
};
const storageError = () => new Error('Der Rezeptentwurf konnte auf diesem Gerät nicht gespeichert werden. Bitte das Fenster offen lassen und Speicher freigeben oder das Rezept mit Speichern übernehmen.');
export function createDraftStore(storage, initialScope, now = () => Date.now()) {
  function readKey(key) { const text = storage.getItem(key); return text === null ? {} : clean(JSON.parse(text), now()); }
  function write(scope, value) {
    const keys = Object.keys(value).sort((a, b) => value[b].at.localeCompare(value[a].at)).slice(0, 10);
    try {
      if (keys.length) storage.setItem(draftStorageKey(scope), JSON.stringify(Object.fromEntries(keys.map(key => [key, value[key]]))));
      else storage.removeItem(draftStorageKey(scope));
    } catch { throw storageError(); }
  }
  function migrateLegacy() {
    if (storage.getItem(LEGACY_DRAFT_KEY) === null) return;
    let owner = storage.getItem(OWNER);
    if (!owner) { try { storage.setItem(OWNER, initialScope); owner = initialScope; } catch { throw storageError(); } }
    const legacy = readKey(LEGACY_DRAFT_KEY), current = readKey(draftStorageKey(owner));
    for (const [key, entry] of Object.entries(legacy)) if (!current[key] || entry.at > current[key].at) current[key] = entry;
    write(owner, current); storage.removeItem(LEGACY_DRAFT_KEY);
  }
  function read(scope) {
    const current = readKey(draftStorageKey(scope));
    // Bei fehlgeschlagener Migration ist das Original weiter verfügbar, aber
    // ausschließlich für die Verbindung, der es beim Update zugeordnet wurde.
    if (storage.getItem(OWNER) === scope && storage.getItem(LEGACY_DRAFT_KEY) !== null) {
      for (const [key, entry] of Object.entries(readKey(LEGACY_DRAFT_KEY))) if (!current[key] || entry.at > current[key].at) current[key] = entry;
    }
    return current;
  }
  return { read, write, migrateLegacy };
}
