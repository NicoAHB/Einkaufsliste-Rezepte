/* Schutz der Warteschlange: Eine einzelne Änderung, die sich mit dem gemeinsamen Stand nicht mehr vereinbaren lässt
   (z. B. nach einer Änderung auf einem anderen Gerät oder durch einen Fehler einer älteren App-Version), darf den Abgleich
   aller übrigen Änderungen nicht dauerhaft blockieren. Sie wird beiseitegelegt und bleibt als Datei sicherbar.
   Reine Logik ohne DOM und ohne Speicher. */
import { merge, validate } from './data.js';

const byTime = (a, b) => a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const reason = error => String(error?.message || error || 'Unbekannter Fehler').slice(0, 300);

/* Teilt `ops` in Änderungen, die sich auf `base` anwenden lassen (`good`, in der ursprünglichen Reihenfolge), und solche, die
   das Zusammenführen scheitern lassen (`bad`, jeweils mit Grund). `state` ist das Ergebnis von merge(base, good).
   Ein ungültiger Ausgangsstand ist kein Problem einzelner Änderungen: Dann wird der Fehler weitergegeben. */
export function applicableOps(base, ops) {
  try { return { good: ops, bad: [], state: merge(base, ops) }; }
  catch (first) {
    validate(base);
    if (!ops.length) throw first;
  }
  const bad = new Map();
  // Nach der Zeit, wie merge selbst: Eine spätere Änderung kann auf einer früheren aufbauen.
  for (let round = 0; round < 3; round++) {
    let current = base;
    for (const op of [...ops].sort(byTime)) {
      if (bad.has(op.id)) continue;
      try { current = merge(current, [op]); }
      catch (error) { bad.set(op.id, { op, error: reason(error) }); }
    }
    const good = ops.filter(op => !bad.has(op.id));
    try { return { good, bad: [...bad.values()], state: merge(base, good) }; }
    catch (error) {
      // Nur in der Kombination ungültig (sehr selten): die jüngste verbliebene Änderung beiseitelegen und erneut prüfen.
      const latest = [...good].sort(byTime).at(-1);
      if (!latest) throw error;
      bad.set(latest.id, { op: latest, error: reason(error) });
    }
  }
  const good = ops.filter(op => !bad.has(op.id));
  return { good, bad: [...bad.values()], state: merge(base, good) };
}

export const QUARANTINE_LIMIT = 200;
// Beiseitegelegte Änderungen ergänzen, ohne doppelte Einträge; die neuesten bleiben bei Überlänge erhalten.
export function addToQuarantine(list, entries, at = new Date().toISOString()) {
  const known = new Set((Array.isArray(list) ? list : []).map(entry => entry?.op?.id));
  const next = [...(Array.isArray(list) ? list : []), ...entries.filter(entry => !known.has(entry.op.id)).map(entry => ({ ...entry, at }))];
  return next.slice(-QUARANTINE_LIMIT);
}
