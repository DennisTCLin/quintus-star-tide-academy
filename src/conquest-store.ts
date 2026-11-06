import { isNpcOwner, validRaidProgress, validRaidReport, RAID_REPORT_LIMIT } from './conquest-enemy';
import { migrateEnrollment } from './conquest-alliance';
import { advanceConquest, createConquest, ensureSeason, health, maxHealth, type ConquestState, type Guard } from './conquest';
export const CONQUEST_CHANGED = 'star-tide:conquest-changed';
export const conquestKey = (player: string, scope?: string) => `star-tide.conquest.v2.${scope ? `${encodeURIComponent(scope.toLowerCase())}.` : ""}${player}`;
const number = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
export function parseConquest(raw: string, player: string): ConquestState {
  const s = JSON.parse(raw) as ConquestState;
  const bad = () => { throw Error('群島存檔格式不完整，原始存檔已保留，請先匯出備份。'); };
  if (!s || s.schema !== 2 || !/^season-\d{4}-(0[1-9]|1[0-2])$/.test(s.season) || !number(s.updatedAt) || !number(s.energy) || !s.inventory || !s.units || typeof s.units !== 'object' || Array.isArray(s.units) || !Array.isArray(s.tiles) || s.tiles.length !== 91 || !Array.isArray(s.credited) || !s.credited.every(x => typeof x === 'string') || !Array.isArray(s.log) || !s.log.every(x => typeof x === 'string')) bad();
  if (s.enrollment !== undefined) { const enrollment = migrateEnrollment(s.enrollment); if (!enrollment) bad(); s.enrollment = enrollment; }
  if (s.npcRaids !== undefined && !validRaidProgress(s.npcRaids)) bad();
  if (s.raidReports !== undefined && (!Array.isArray(s.raidReports) || s.raidReports.length > RAID_REPORT_LIMIT || !s.raidReports.every(validRaidReport))) bad();
  if (s.raidReadIds !== undefined && (!Array.isArray(s.raidReadIds) || s.raidReadIds.length > RAID_REPORT_LIMIT || !s.raidReadIds.every(id => typeof id === 'string' && s.raidReports?.some(r => r.id === id)))) bad();
  for (const key of ['herbs', 'spring', 'bandage', 'potion'] as const) if (!number(s.inventory[key], 0, key === 'herbs' || key === 'spring' ? 200 : 99) || (key === 'bandage' || key === 'potion') && !Number.isInteger(s.inventory[key])) bad();
  const validGuard = (g: Guard) => g && typeof g.id === 'string' && !['__proto__', 'constructor', 'prototype'].includes(g.id) && Number.isInteger(g.level) && number(g.level, 0, 1000) && ['metal','wood','earth','water','fire'].includes(g.element) && number(maxHealth(g), 1, 100000) && number(health(g), 0, maxHealth(g));
  if (!Object.entries(s.units).every(([id, g]) => id === g.id && validGuard(g))) bad();
  const base = createConquest(s.season, s.updatedAt), used = new Set<string>(), seen = new Set<string>();
  const tiles = base.tiles.map(original => {
    const tile = s.tiles.find(t => t?.id === original.id);
    if (!tile || seen.has(tile.id) || tile.owner !== null && tile.owner !== player && !isNpcOwner(tile.owner) || !number(tile.shieldUntil) || tile.shieldStartsAt !== undefined && !number(tile.shieldStartsAt) || tile.capturedAt !== undefined && !number(tile.capturedAt) || !Array.isArray(tile.guards) || tile.guards.length > 5 || !tile.guards.every(validGuard)) return bad();
    seen.add(tile.id);
    if (tile.owner === player) for (const g of tile.guards) { if (used.has(g.id) || !s.units[g.id] || health(s.units[g.id]) <= 0) bad(); used.add(g.id); }
    return { ...original, owner: tile.owner, guards: tile.owner === player ? tile.guards.map(g => ({ ...s.units[g.id] })) : tile.guards, shieldUntil: tile.shieldUntil, shieldStartsAt: tile.shieldStartsAt ?? 0, capturedAt: tile.capturedAt ?? 0, commander: tile.owner === player && s.enrollment ? s.enrollment.heroId : typeof tile.commander === 'string' ? tile.commander : undefined };
  });
  return { ...base, enrollment: s.enrollment, npcRaids: s.npcRaids, raidReports: s.raidReports, raidReadIds: s.raidReadIds, energy: s.energy, units: s.units, inventory: s.inventory, tiles, credited: s.credited, log: s.log.slice(0,30), lastBattle: null };
}
export function readConquest(player: string, now = Date.now(), scope?: string) {
  const raw = localStorage.getItem(conquestKey(player, scope));
  return raw ? ensureSeason(parseConquest(raw, player), now) : createConquest(undefined, now);
}
export async function transactConquest(player: string, mutate: (state: ConquestState) => ConquestState, scope?: string) {
  const run = () => {
    const current = readConquest(player, Date.now(), scope), next = mutate(advanceConquest(current, Date.now()));
    // Storage failure must reject the action instead of displaying an unsaved success.
    localStorage.setItem(conquestKey(player, scope), JSON.stringify({ ...next, lastBattle: null }));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(CONQUEST_CHANGED));
    return next;
  };
  if (!navigator.locks) throw Error('此瀏覽器不支援安全存檔鎖，請使用較新的 Chrome、Safari 或 Edge。');
  return navigator.locks.request(conquestKey(player, scope), run);
}
