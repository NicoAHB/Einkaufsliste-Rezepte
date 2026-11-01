// Portables Sicherungsformat und geführte Oberfläche, ohne Bindung an GitHub.
import { active, clone, collections, merge, operation, uid, validPhotoId, validate } from './data.js';
import { productGroupMigration } from './product-groups.js';
import { LIMIT_BYTES, sizeOf } from './compact.js';
import { isJpeg, readPhoto } from './photos.js';
import { readZip } from './zip.js';

export const MAX_BACKUP_BYTES = 64 * 1024 * 1024;
export const recoveryStorageKey = scope => `einkauf-restore-recovery-v1:${encodeURIComponent(scope)}`;
export const backupPhotoIds = data => [...new Set((data.recipes || []).map(row => row.photoId).filter(validPhotoId))];
export function normaliseBackup(value) {
  validate(value);
  const data = { version: 1, updatedAt: value.updatedAt, sync: clone(value.sync) };
  for (const key of collections) data[key] = clone(value[key] || []);
  if (value.names) data.names = clone(value.names);
  if (!Number.isFinite(Date.parse(data.updatedAt)) || new Date(data.updatedAt).toISOString()!==data.updatedAt) throw new Error('Die Sicherung enthält kein gültiges Speicherdatum.');
  for (const key of collections) for (const row of data[key]) {
    const dates = [row.createdAt,row.updatedAt,...Object.values(row._clock || {}).map(clock=>clock?.at),...(row._adds || []).map(add=>add.at)];
    if (dates.some(at=>!Number.isFinite(Date.parse(at)) || new Date(at).toISOString()!==at)) throw new Error('Die Sicherung enthält ungültige Zeitangaben. Es wurde nichts ersetzt.');
  }
  const result = merge(data, productGroupMigration(data));
  if (sizeOf(result) > LIMIT_BYTES) throw new Error('Die Datensicherung überschreitet die unterstützte Datengröße von 900 KB.');
  return result;
}
export function decodeBackup(bytes, fileName = '') {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > MAX_BACKUP_BYTES) throw new Error('Bitte eine JSON- oder ZIP-Sicherung bis 64 MB auswählen.');
  let json = bytes, photos = new Map();
  if (/\.zip$/i.test(fileName) || (bytes[0] === 0x50 && bytes[1] === 0x4b)) {
    const files = readZip(bytes), records = files.filter(file => /(?:^|\/)daten\.json$/.test(file.name));
    if (records.length !== 1) throw new Error('Die ZIP-Sicherung muss genau eine daten.json enthalten.');
    json = records[0].data;
    const prefix = records[0].name.slice(0, -'daten.json'.length);
    for (const file of files) {
      const match = file.name.slice(prefix.length).match(/^(?:fotos|photos)\/([A-Za-z0-9-]{8,64})\.jpg$/);
      if (!file.name.startsWith(prefix) || !match) continue;
      if (photos.has(match[1])) throw new Error('Ein Foto kommt mehrfach in der Sicherung vor.');
      if (!isJpeg(file.data) || file.data.length > 12 * 1024 * 1024) throw new Error('Die Sicherung enthält ein ungültiges oder zu großes Rezeptfoto.');
      photos.set(match[1], file.data);
    }
  }
  if (json.length > 8 * 1024 * 1024) throw new Error('Die Datendatei in der Sicherung ist zu groß.');
  let parsed;
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(json).replace(/^\uFEFF/, '')); }
  catch { throw new Error('Diese Datei enthält keine lesbare Sattplan-Datensicherung.'); }
  const data = normaliseBackup(parsed), referenced = new Set(backupPhotoIds(data));
  photos = new Map([...photos].filter(([id]) => referenced.has(id)));
  return { data, photos, fileName };
}
export function backupCounts(data) {
  return [['stores','Geschäfte und Listen'],['items','Artikel und Wünsche'],['recipes','Rezepte'],['meals','Geplante Gerichte'],['purchases','Ausgaben'],['pantry','Vorratseinträge']]
    .map(([key,label]) => ({ key, label, count: active(data[key] || []).length }));
}
export function makeRestoreOperation(snapshot, current, actor, now = Date.now()) {
  snapshot = normaliseBackup(snapshot);
  const times = [now, Date.parse(current.updatedAt), Date.parse(snapshot.updatedAt), Date.parse(current.sync?.restore?.at), Date.parse(snapshot.sync?.restore?.at)];
  for (const data of [current,snapshot]) for (const key of collections) for (const row of data[key] || []) {
    times.push(Date.parse(row.updatedAt));
    for (const clock of Object.values(row._clock || {})) times.push(Date.parse(clock.at));
  }
  const latest = times.filter(Number.isFinite).reduce((max,at) => Math.max(max,at),0) + 1;
  if (latest >= 253402300799999) throw new Error('Die Sicherung enthält nicht unterstützte Zeitangaben.');
  return { ...operation('restore', uid(), {}, actor, new Date(latest).toISOString()), snapshot };
}

export function mountBackupRestore({ getData, getScope, getSignature, getTarget, resolvePhoto = readPhoto, onRestore, storage = localStorage, onSuccess }) {
  const $ = id => document.getElementById(id), dialog = $('restore-dialog'), form = $('restore-form');
  let bundle = null, scope = null, signature = '', generation = 0, working = false, applying = false;
  const error = text => { $('restore-error').textContent = text; $('restore-error').hidden = !text; };
  const updateApply = () => { $('restore-apply').disabled = working || !bundle || !$('restore-confirm').checked || (!$('restore-missing-label').hidden && !$('restore-missing-ok').checked); };
  function setBusy(on, text = '', critical = false) {
    working = on; applying = on && critical; form.setAttribute('aria-busy',String(on));
    $('restore-file').disabled = on; $('restore-confirm').disabled = on; $('restore-missing-ok').disabled = on;
    dialog.querySelector('[data-close]').disabled = applying;
    $('restore-status').textContent = text; $('restore-status').hidden = !text; updateApply();
  }
  function clear() {
    ++generation; bundle = null; $('restore-preview').hidden = true; $('restore-confirm').checked = false;
    $('restore-missing-ok').checked = false; error(''); updateApply();
  }
  function drawPreview() {
    const rows = $('restore-counts'); rows.replaceChildren();
    const current = backupCounts(getData());
    for (const row of backupCounts(bundle.data)) {
      const li = document.createElement('li'), name = document.createElement('span'), numbers = document.createElement('span');
      name.textContent = row.label; numbers.textContent = `${current.find(r=>r.key===row.key).count} → ${row.count}`;
      li.append(name,numbers); rows.append(li);
    }
    $('restore-source').textContent = bundle.fileName;
    $('restore-target').textContent = getTarget(); signature = getSignature();
    $('restore-confirm').checked = false; $('restore-missing-ok').checked = false;
    $('restore-preview').hidden = false; updateApply();
  }
  async function inspect(next, ticket) {
    let missing = 0; const ids = backupPhotoIds(next.data);
    for (let i = 0; i < ids.length; i++) {
      if (ticket !== generation || scope !== getScope()) return;
      $('restore-status').textContent = `Fotos prüfen: ${i + 1} von ${ids.length}`;
      if (!next.photos.has(ids[i]) && !await resolvePhoto(ids[i])) missing++;
    }
    if (ticket !== generation || scope !== getScope()) return;
    bundle = next; bundle.missingPhotos = missing; drawPreview();
    $('restore-photos').textContent = `${ids.length} Rezeptfotos · ${next.photos.size} in der Datei${missing ? ` · ${missing} nicht verfügbar` : ''}`;
    $('restore-missing-label').hidden = !missing;
    $('restore-missing-text').textContent = missing ? `${missing} ${missing===1?'Rezeptfoto fehlt':'Rezeptfotos fehlen'} in der Datei und im aktuellen Speicher. Die Daten können ohne diese Fotos wiederhergestellt werden.` : '';
    $('restore-missing-text').hidden = !missing;
  }
  $('restore-open').addEventListener('click', () => { clear(); scope = getScope(); form.reset(); dialog.showModal(); });
  $('restore-file').addEventListener('change', async event => {
    clear(); const file = event.target.files[0]; if (!file) return;
    const ticket = generation; setBusy(true,'Datei wird geprüft …');
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Die Sicherung darf höchstens 64 MB groß sein.');
      const next = decodeBackup(new Uint8Array(await file.arrayBuffer()),file.name);
      await inspect(next,ticket);
    } catch (err) { if (ticket === generation) error(err.message); }
    finally { if (ticket === generation) setBusy(false); }
  });
  $('restore-recovery').addEventListener('click', async () => {
    clear(); scope = getScope(); form.reset(); dialog.showModal(); const ticket = generation;
    setBusy(true,'Vorherigen Stand prüfen …');
    try {
      const saved = JSON.parse(storage.getItem(recoveryStorageKey(scope)) || 'null');
      if (!saved?.data) throw new Error('Für diese Liste gibt es noch keinen automatisch gesicherten Stand.');
      await inspect({ data:normaliseBackup(saved.data),photos:new Map(),fileName:`Automatisch gesicherter Stand vom ${new Date(saved.at).toLocaleString('de-DE')}` },ticket);
    } catch (err) { if(ticket===generation)error(err.message); }
    finally { if(ticket===generation)setBusy(false); }
  });
  form.addEventListener('change',updateApply);
  form.addEventListener('submit',async event => {
    event.preventDefault(); if (working || !bundle || $('restore-apply').disabled) return;
    if (scope !== getScope()) { clear(); error('Die Liste hat sich geändert. Bitte die Sicherung erneut auswählen.'); return; }
    setBusy(true,'Wiederherstellung läuft …',true); error('');
    try {
      await onRestore(bundle,{scope,signature});
      setBusy(false); dialog.close(); clear(); refreshRecovery(); onSuccess?.();
    } catch (err) {
      if (err.changed && bundle) drawPreview();
      error(err.message);
    } finally { setBusy(false); }
  });
  dialog.addEventListener('cancel',event => { if(applying)event.preventDefault(); });
  dialog.addEventListener('close',()=>{if(applying){dialog.showModal();return;}clear();setBusy(false);});
  function refreshRecovery() {
    try { $('restore-recovery').hidden = !storage.getItem(recoveryStorageKey(getScope())); } catch { $('restore-recovery').hidden = true; }
    if(dialog.open && scope!==getScope() && !applying){dialog.close();scope=getScope();}
  }
  refreshRecovery();
  return { refreshRecovery, busy:()=>applying };
}
