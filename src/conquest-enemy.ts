import { alive, battleResult, health, maxHealth, round, shieldActive, withHealth, type ConquestState, type Guard, type Tile } from './conquest';

// NPC identity is deliberately outside ALLIANCES and player ownership IDs.
export const NPC_FACTION = { id: 'dark-tide', name: '黯潮軍團', title: '吞沒星光、掠奪航路的入侵軍團' } as const;
export const RAID_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const RAID_WARNING_MS = 10 * 60 * 1000;
export const RAID_REPORT_LIMIT = 30;
export type NpcRaidReport = {
  id: string; season: string; wave: number; scheduledAt: number; resolvedAt: number;
  tileId: string; tileName: string; defended: boolean; herbsLost: number; springLost: number;
  rounds: number; defendersBefore: Guard[]; defendersAfter: Guard[]; attackersBefore: Guard[]; attackersAfter: Guard[];
};
export const validRaidReport = (value: unknown): value is NpcRaidReport => {
  const v = value as NpcRaidReport;
  const guards = (gs: unknown) => Array.isArray(gs) && gs.length <= 5 && gs.every(g => g && typeof g.id === 'string' && Number.isInteger(g.level) && g.level >= 0 && g.level <= 1000 && ['metal','wood','earth','water','fire'].includes(g.element) && Number.isFinite(maxHealth(g)) && maxHealth(g) > 0 && Number.isFinite(health(g)) && health(g) >= 0 && health(g) <= maxHealth(g));
  return !!v && typeof v.id === 'string' && typeof v.season === 'string' && /^season-\d{4}-\d{2}$/.test(v.season)
    && Number.isSafeInteger(v.wave) && v.wave > 0 && Number.isFinite(v.scheduledAt) && v.scheduledAt >= 0 && Number.isFinite(v.resolvedAt) && v.resolvedAt >= v.scheduledAt
    && typeof v.tileId === 'string' && typeof v.tileName === 'string' && typeof v.defended === 'boolean'
    && Number.isFinite(v.herbsLost) && v.herbsLost >= 0 && v.herbsLost <= 5 && Number.isFinite(v.springLost) && v.springLost >= 0 && v.springLost <= 2
    && Number.isInteger(v.rounds) && v.rounds >= 0 && v.rounds <= 60 && [v.defendersBefore,v.defendersAfter,v.attackersBefore,v.attackersAfter].every(guards);
};
export type NpcRaidProgress = { wave: number; resolvedAt: number; defended: boolean; tileName: string };
export const validRaidProgress = (value: unknown): value is NpcRaidProgress => {
  const v = value as NpcRaidProgress;
  return !!v && Number.isSafeInteger(v.wave) && v.wave > 0 && Number.isFinite(v.resolvedAt) && v.resolvedAt >= 0 && typeof v.defended === 'boolean' && typeof v.tileName === 'string' && v.tileName.length <= 100;
};
// This is the earliest eligible time, not a promise of an exact worker tick.
function eligibleAt(tile: Tile, gate: number, joinedAt: number, now: number) {
  const battleUntil = 'battleUntil' in tile && typeof tile.battleUntil === 'number' ? tile.battleUntil : 0;
  const at = Math.max(now, gate, (tile.capturedAt ?? joinedAt) + RAID_WARNING_MS, battleUntil);
  return shieldActive(tile, at) ? tile.shieldUntil : at;
}
export function nextRaidWindow(state: ConquestState, player: string, now: number) {
  const wave = (state.npcRaids?.wave ?? 0) + 1;
  if (!state.enrollment || !Number.isFinite(now)) return { wave, at: null, reason: 'unenrolled' as const };
  const tiles = state.tiles.filter(t => t.owner === player);
  if (!tiles.length) return { wave, at: null, reason: 'no-territory' as const };
  const gate = state.npcRaids ? state.npcRaids.resolvedAt + RAID_INTERVAL_MS : state.enrollment.joinedAt + RAID_WARNING_MS;
  const at = Math.min(...tiles.map(t => eligibleAt(t, gate, state.enrollment!.joinedAt, now)));
  return { wave, at, reason: at <= now ? 'due' as const : 'waiting' as const };
}
export const unreadRaidReports = (state: ConquestState) => {
  const read = new Set(state.raidReadIds ?? []);
  return (state.raidReports ?? []).filter(report => !read.has(report.id));
};
export function acknowledgeRaidReports(state: ConquestState, ids: string[]) {
  const read = new Set([...(state.raidReadIds ?? []), ...ids]);
  return (state.raidReports ?? []).filter(report => read.has(report.id)).map(report => report.id);
}
export function incomingRaid(state: ConquestState, player: string, now: number) {
  if (!state.enrollment || !Number.isFinite(now)) return null;
  const wave = (state.npcRaids?.wave ?? 0) + 1;
  const nextAt = state.npcRaids ? state.npcRaids.resolvedAt + RAID_INTERVAL_MS : state.enrollment.joinedAt + RAID_WARNING_MS;
  if (now < nextAt) return null;
  const targets = state.tiles.filter(t => t.owner === player && eligibleAt(t, nextAt, state.enrollment!.joinedAt, now) <= now).sort((a,b) => a.id.localeCompare(b.id));
  if (!targets.length) return null;
  const tile = targets[(wave - 1) % targets.length];
  // Fixed island-based force; removing guards cannot lower the attacking army's level.
  const guards: Guard[] = tile.wild.slice(0, Math.min(3, tile.wild.length)).map((g,i) => withHealth({ id: `npc:dark-tide:${wave}:${i}`, element: g.element, level: Math.max(1, g.level) }));
  const scheduledAt = Math.max(nextAt, (tile.capturedAt ?? state.enrollment.joinedAt) + RAID_WARNING_MS, tile.shieldUntil <= now ? tile.shieldUntil : 0);
  return { scheduledAt, id: `${state.season}:${wave}:${tile.id}:${tile.capturedAt ?? 0}`, wave, tileId: tile.id, tileName: tile.name, guards };
}
export function resolveNpcRaid(state: ConquestState, player: string, raidId: string | undefined, now: number, tileId?: string): ConquestState {
  const raid = incomingRaid(state, player, now);
  if (!raid || raid.id !== raidId || tileId !== undefined && tileId !== raid.tileId) throw Error('黯潮軍團戰況已更新，請重新查看來襲情報。');
  const tile = state.tiles.find(t => t.id === raid.tileId)!;
  const result = { ...battleResult(raid.guards, { ...tile, owner: null }, 0, 0), cost: 0 };
  const defended = !result.won, units = { ...state.units };
  for (const guard of result.defendersAfter) units[guard.id] = { ...guard };
  const herbs = defended ? 0 : Math.min(5, state.inventory.herbs), spring = defended ? 0 : Math.min(2, state.inventory.spring);
  const report: NpcRaidReport = { id: raid.id, season: state.season, wave: raid.wave, scheduledAt: raid.scheduledAt, resolvedAt: now, tileId: tile.id, tileName: tile.name, defended, herbsLost: herbs, springLost: spring, rounds: result.rounds, defendersBefore: result.initialDefenders, defendersAfter: result.defendersAfter, attackersBefore: result.initialAttackers, attackersAfter: result.attackersAfter };
  const message = `${NPC_FACTION.name}第 ${raid.wave} 波襲擊${tile.name}：${defended ? '守軍擊退敵軍，補給保全' : `敵軍掠走 ${round(herbs)} 草藥、${round(spring)} 靈泉後撤退`}。守軍傷勢已保存，領地與學習進度保留。`;
  return { ...state, units, raidReadIds: (state.raidReadIds ?? []).filter(id => (state.raidReports ?? []).slice(0, RAID_REPORT_LIMIT - 1).some(r => r.id === id)), raidReports: [report, ...(state.raidReports ?? [])].slice(0, RAID_REPORT_LIMIT), npcRaids: { wave: raid.wave, resolvedAt: now, defended, tileName: tile.name }, inventory: { ...state.inventory, herbs: state.inventory.herbs - herbs, spring: state.inventory.spring - spring }, lastBattle: result,
    tiles: state.tiles.map(t => t.id === tile.id ? { ...t, guards: result.defendersAfter.filter(alive) } : t), log: [message, ...state.log].slice(0,30) };
}
