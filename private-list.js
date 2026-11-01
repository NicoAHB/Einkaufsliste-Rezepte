/* Ausschließlich Gerätespeicher. Diese Liste ist kein Teil von daten.json,
   Synchronisationsoperationen, Einkaufsverlauf oder gemeinsamen Backups. */
export const PRIVATE_VIEW = '@private';
export const LEGACY_PRIVATE_ID = 'legacy-private';
export const privateView = id => `${PRIVATE_VIEW}:${id}`;
export const privateViewId = view => String(view).startsWith(`${PRIVATE_VIEW}:`)?String(view).slice(PRIVATE_VIEW.length+1):'';
export const privateItemListId = (row,data) => row.listId || (privateLists(data).some(list=>list.id===LEGACY_PRIVATE_ID)?LEGACY_PRIVATE_ID:privateLists(data)[0]?.id||LEGACY_PRIVATE_ID);
export const privateListKey = scope => `einkauf-private-list-v1:${encodeURIComponent(String(scope))}`;
export const emptyPrivateList = () => ({version:1,enabled:false,items:[]});
export function privateLists(data) {
  if(Array.isArray(data.lists))return data.lists;
  return data.enabled||data.items.length?[{id:LEGACY_PRIVATE_ID,name:'Geheime Liste',enabled:data.enabled,symbol:'secret',updatedAt:data.items[0]?.createdAt||'1970-01-01T00:00:00.000Z'}]:[];
}
export function withPrivateLists(data) {
  const lists=privateLists(data);for(const item of data.items)if(!item.listId)item.listId=privateItemListId(item,data);
  data.lists=lists;data.enabled=lists.some(list=>list.enabled);return data;
}
export function validatePrivateList(value) {
  if(!value||value.version!==1||typeof value.enabled!=='boolean'||!Array.isArray(value.items))throw new Error('Die geheime Liste auf diesem Gerät konnte nicht gelesen werden.');
  const ids=new Set();
  if(value.lists!==undefined) {
    if(!Array.isArray(value.lists))throw new Error('Die geheimen Listen auf diesem Gerät sind beschädigt.');
    const listIds=new Set();for(const list of value.lists){if(!list||typeof list.id!=='string'||!list.id||listIds.has(list.id)||typeof list.name!=='string'||!list.name.trim()||list.name.length>80||typeof list.enabled!=='boolean'||list.symbol!=='secret'||(list.sharedStoreId!==undefined&&typeof list.sharedStoreId!=='string'))throw new Error('Eine geheime Liste auf diesem Gerät ist beschädigt.');listIds.add(list.id);}
  }
  for(const row of value.items) {
    if(!row||typeof row.id!=='string'||!row.id||ids.has(row.id)||typeof row.name!=='string'||!row.name.trim()||row.name.length>120||typeof row.note!=='string'||row.note.length>1000||typeof row.checked!=='boolean'||!Number.isFinite(Date.parse(row.createdAt)))throw new Error('Ein Eintrag der geheimen Liste auf diesem Gerät ist beschädigt.');
    ids.add(row.id);
    if((row.listId!==undefined&&(typeof row.listId!=='string'||!privateLists(value).some(list=>list.id===row.listId)))||(row.sharedId!==undefined&&typeof row.sharedId!=='string')||(row.source!==undefined&&(!row.source||typeof row.source!=='object'||Array.isArray(row.source))))throw new Error('Die Zuordnung eines privaten Eintrags ist beschädigt.');
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
