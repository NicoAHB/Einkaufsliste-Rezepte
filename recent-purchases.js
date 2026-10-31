/* Nachweis eines Einkaufs ausschließlich durch Abhaken im Laden, kein Rückschluss aus updatedAt. */
import { pantryKey } from './data.js';
export const PURCHASE_DAYS = 7;
export function isRecentPurchase(row, now = Date.now()) {
  const time = typeof row.shopBoughtAt === 'string' ? Date.parse(row.shopBoughtAt) : NaN;
  return Number.isFinite(time) && time <= now && time >= now - PURCHASE_DAYS * 86400000;
}
export function recentPurchases(items = [], now = Date.now()) {
  const found = new Map();
  for (const item of items) {
    if (typeof item.name !== 'string' || !item.name.trim() || !isRecentPurchase(item, now)) continue;
    const key = pantryKey(item.name), previous = found.get(key);
    if (!previous || Date.parse(item.shopBoughtAt) > Date.parse(previous.shopBoughtAt)) found.set(key, {...item});
  }
  return [...found.values()].sort((a,b) => Date.parse(b.shopBoughtAt) - Date.parse(a.shopBoughtAt) || a.name.localeCompare(b.name,'de'));
}
export function purchaseLabel(at, now = Date.now()) {
  const day = value => {const d=new Date(value);return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());};
  const days=Math.round((day(now)-day(at))/86400000);
  return days === 0 ? 'heute gekauft' : days === 1 ? 'gestern gekauft' : `gekauft vor ${days} Tagen`;
}
