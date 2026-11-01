/* Ausschließlich Gerätespeicher. Diese Liste ist kein Teil von daten.json,
   Synchronisationsoperationen, Einkaufsverlauf oder gemeinsamen Backups. */
export const PRIVATE_VIEW = '@private';
export const privateListKey = scope => `einkauf-private-list-v1:${encodeURIComponent(String(scope))}`;
export const emptyPrivateList = () => ({version:1,enabled:false,items:[]});
export function validatePrivateList(value) {
  if(!value||value.version!==1||typeof value.enabled!=='boolean'||!Array.isArray(value.items))throw new Error('Die geheime Liste auf diesem Gerät konnte nicht gelesen werden.');
  const ids=new Set();
  for(const row of value.items) {
    if(!row||typeof row.id!=='string'||!row.id||ids.has(row.id)||typeof row.name!=='string'||!row.name.trim()||row.name.length>120||typeof row.note!=='string'||row.note.length>1000||typeof row.checked!=='boolean'||!Number.isFinite(Date.parse(row.createdAt)))throw new Error('Ein Eintrag der geheimen Liste auf diesem Gerät ist beschädigt.');
    ids.add(row.id);
  }
  return value;
}
export function readPrivateList(storage,scope) {
  const text=storage.getItem(privateListKey(scope));
  if(text===null)return emptyPrivateList();
  let parsed;try{parsed=JSON.parse(text);}catch{throw new Error('Die geheime Liste auf diesem Gerät konnte nicht gelesen werden. Die gespeicherten Daten bleiben unverändert.');}
  return validatePrivateList(parsed);
}
export function updatePrivateList(storage,scope,change) {
  // Erst schreiben, dann den sichtbaren Stand ersetzen. Auch bei vollem
  // Gerätespeicher gibt es keine falsche Bestätigung oder verlorene Altwerte.
  const next=validatePrivateList(change(structuredClone(readPrivateList(storage,scope))));
  storage.setItem(privateListKey(scope),JSON.stringify(next));return next;
}
