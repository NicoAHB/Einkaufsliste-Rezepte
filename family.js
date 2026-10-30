/* Gemeinsame Personen mit stabilen Kennungen. Kein Konto-/Einrichtungsassistent.
   Derselbe neu angelegte Name bekommt offline dieselbe ID; Umbenennen ändert die ID nicht. */
export const UNASSIGNED = 'unassigned';
export const validMemberId = value => typeof value === 'string' && !['all', UNASSIGNED].includes(value) && /^[A-Za-z0-9%._~-]{1,360}$/.test(value);
export function memberName(value) {
  const name = String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 30 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error('Bitte einen Namen mit 1 bis 30 Zeichen eingeben.');
  return name;
}
export const memberKey = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('de');
export const liveMembers = rows => (rows || []).filter(row => !row.deletedAt);
export function prepareMember(name, members = []) {
  name = memberName(name); const key = memberKey(name);
  const existing = liveMembers(members).find(row => memberKey(row.name) === key);
  if (existing) return { id: existing.id, name: existing.name, change: null };
  const encoded = encodeURIComponent(key).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  let id = `member-${encoded}`;
  while (members.some(row => row.id === id)) id += '-new';
  if (!validMemberId(id)) throw new Error('Bitte einen kürzeren Namen wählen.');
  return { id, name, change: { id, patch: { name, archived: false, deletedAt: null } } };
}
export function ownMember(members, actor, preferredId = '') {
  const known = liveMembers(members).find(row => row.id === preferredId);
  if (known) return { id: known.id, name: known.name, change: null };
  return prepareMember(actor, members || []);
}
export const buyerKey = row => row.buyerId || UNASSIGNED;
export function buyerNameOf(row, members = []) {
  if (!row.buyerId) return 'Nicht zugeordnet';
  return liveMembers(members).find(member => member.id === row.buyerId)?.name || row.buyerName || 'Unbekannte Person';
}
export function renameMember(id, name, members) {
  name = memberName(name);
  const member = liveMembers(members).find(row => row.id === id);
  if (!member) throw new Error('Diese Person ist nicht mehr vorhanden.');
  if (liveMembers(members).some(row => row.id !== id && memberKey(row.name) === memberKey(name))) throw new Error('Diesen Namen gibt es bereits.');
  return { id, patch: { name } };
}
