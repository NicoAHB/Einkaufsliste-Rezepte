// Reine Wiederherstellungslogik, unabhängig vom Synchronisationsdienst.
const clone = value => JSON.parse(JSON.stringify(value));
export const revisionKey = clock => clock ? `${clock.at}|${clock.id}` : '';
const internal = new Set(['id','createdAt','updatedAt','_clock','_base','_adds','_planCuts','_planEmpty']);
export function restoredState(current, snapshot, clock, collections, replay) {
  const next = clone(snapshot), ops = new Map(), boundary = revisionKey(clock);
  function change(collection, entityId, revision, patch) {
    if (!revision || revisionKey(revision) <= boundary) return;
    const key = `${collection}|${entityId}|${revisionKey(revision)}`;
    const op = ops.get(key) || { ...revision, collection, entityId, actor:'Wiederherstellung', patch:{} };
    if (revision.by) op.actor=revision.by;
    Object.assign(op.patch,patch); ops.set(key,op);
  }
  for (const collection of collections) {
    next[collection] ||= [];
    for (const row of current[collection] || []) {
      // Wirklich nach der Wiederherstellung angelegte Datensätze bleiben erhalten.
      if (`${row.createdAt}|` > boundary) {
        next[collection] = next[collection].filter(entry => entry.id !== row.id);
        next[collection].push(clone(row)); continue;
      }
      // Bei vorhandenen Datensätzen ausschließlich jüngere Feldänderungen erneut
      // anwenden. Sonst hinge das Ergebnis von der Reihenfolge des Abgleichs ab.
      // Zeitgleiche Neuanlagen werden anhand ihrer Feldrevisionen rekonstruiert.
      if (!next[collection].some(entry => entry.id === row.id) && row.createdAt !== clock.at) continue;
      for (const [field,value] of Object.entries(row)) {
        if (internal.has(field)) continue;
        const rev = row._clock?.[field] || row._clock?.['*'];
        const base = ['quantity','unit'].includes(field) && row._base ? row._base[field] : value;
        change(collection,row.id,rev,{[field]:clone(base)});
      }
      for (const add of row._adds || []) change(collection,row.id,add,{add:{quantity:add.quantity,unit:add.unit}});
      for (const cut of row._planCuts || []) {
        const split = cut.revision?.lastIndexOf('|');
        if (split >= 0) change(collection,row.id,{at:cut.revision.slice(0,split),id:cut.revision.slice(split+1)},{cutPlan:clone(cut)});
      }
    }
  }
  next.updatedAt = [clock.at, ...collections.flatMap(key => next[key].map(row => row.updatedAt))].sort().at(-1);
  next.sync = { ...next.sync, minRev: Math.max(14, next.sync.minRev || 1), restore: clock };
  return replay(next,[...ops.values()]);
}
