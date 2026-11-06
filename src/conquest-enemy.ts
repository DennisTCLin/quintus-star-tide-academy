import { adjacent, alive, battleResult, health, maxHealth, round, shieldActive, withHealth, type BattleResult, type ConquestState, type Guard, type Tile } from './conquest';

// Reserved NPC owner, deliberately outside player UUIDs and selectable alliances.
export const NPC_FACTION = { id: 'dark-tide', name: '黯潮軍團', title: '吞沒星光、掠奪航路的入侵軍團' } as const;
export const RAID_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const RAID_WARNING_MS = 10 * 60 * 1000;
export const RAID_REPORT_LIMIT = 30;
export const NPC_EXPANSION_INTERVAL_MS = RAID_INTERVAL_MS;
export const isNpcOwner = (owner: string | null | undefined) => owner === NPC_FACTION.id;
export function occupyNpcTile(tile: Tile, guards: Guard[], now: number): Tile {
  return { ...tile, owner: NPC_FACTION.id, ownerInfo: undefined, commander: undefined,
    capturedAt: now, shieldStartsAt: 0, shieldUntil: 0, guards: guards.filter(alive).map(g => ({ ...g })) };
}
// One bounded attempt, serialized by the world's durable expansion clock. Keep
// the central seven islands available to new explorers; never seize player land here.
export function expandNpcTerritory(tiles: Tile[], now: number, lastExpansionAt: number | null) {
  if (!Number.isFinite(now) || lastExpansionAt !== null && now < lastExpansionAt + NPC_EXPANSION_INTERVAL_MS) return null;
  const owned = tiles.filter(t => isNpcOwner(t.owner));
  const tile = tiles.filter(t => !t.owner && t.distance > 1 && (t.battleUntil ?? 0) <= now
    && (!owned.length || owned.some(o => adjacent(o, t))))
    .sort((a,b) => b.distance - a.distance || a.id.localeCompare(b.id))[0];
  if (!tile) return null;
  const army = tile.wild.map((g,i) => withHealth({ id: `npc:dark-tide:outpost:${tile.id}:${now}:${i}`, element: g.element, level: Math.max(1,g.level) + 2 }));
  const battle = battleResult(army, tile, 0, 0);
  return { tileId: tile.id, captured: battle.won, tiles: tiles.map(t => t.id === tile.id
    ? battle.won ? occupyNpcTile(t, battle.attackersAfter, now) : { ...t, guards: battle.defendersAfter }
    : t) };
}
export type NpcRaidReport = {
  kind?: 'npc'; captured?: boolean;
  id: string; season: string; wave: number; scheduledAt: number; resolvedAt: number;
  tileId: string; tileName: string; defended: boolean; herbsLost: number; springLost: number;
  rounds: number; defendersBefore: Guard[]; defendersAfter: Guard[]; attackersBefore: Guard[]; attackersAfter: Guard[];
};
export type PlayerRaidReport = Omit<NpcRaidReport, 'kind' | 'wave' | 'scheduledAt' | 'captured'> & {
  kind: 'pvp'; wave?: never; scheduledAt?: never;
  attackerId: string; attackerName: string; previousOwnerId: string; nextOwnerId: string;
  territoryCountBefore: number; territoryCountAfter: number;
};
export type RaidReport = NpcRaidReport | PlayerRaidReport;
export const validRaidReport = (value: unknown): value is RaidReport => {
  const v = value as RaidReport;
  const guards = (gs: unknown) => Array.isArray(gs) && gs.length <= 5 && gs.every(g => g && typeof g.id === 'string' && Number.isInteger(g.level) && g.level >= 0 && g.level <= 1000 && ['metal','wood','earth','water','fire'].includes(g.element) && Number.isFinite(maxHealth(g)) && maxHealth(g) > 0 && Number.isFinite(health(g)) && health(g) >= 0 && health(g) <= maxHealth(g));
  if (!v || typeof v.id !== 'string' || typeof v.season !== 'string' || !/^season-\d{4}-\d{2}$/.test(v.season)
    || !Number.isFinite(v.resolvedAt) || v.resolvedAt < 0 || typeof v.tileId !== 'string' || typeof v.tileName !== 'string' || typeof v.defended !== 'boolean'
    || !Number.isFinite(v.herbsLost) || v.herbsLost < 0 || v.herbsLost > 5 || !Number.isFinite(v.springLost) || v.springLost < 0 || v.springLost > 2
    || !Number.isInteger(v.rounds) || v.rounds < 0 || v.rounds > 60 || ![v.defendersBefore,v.defendersAfter,v.attackersBefore,v.attackersAfter].every(guards)) return false;
  if (v.kind === 'pvp') {
    const text = (s: unknown) => typeof s === 'string' && s.length > 0 && s.length <= 100;
    return v.wave === undefined && v.scheduledAt === undefined && v.herbsLost === 0 && v.springLost === 0
      && [v.attackerId,v.attackerName,v.previousOwnerId,v.nextOwnerId].every(text) && v.attackerId !== v.previousOwnerId
      && v.nextOwnerId === (v.defended ? v.previousOwnerId : v.attackerId)
      && Number.isInteger(v.territoryCountBefore) && v.territoryCountBefore >= 1 && v.territoryCountBefore <= 91
      && v.territoryCountAfter === v.territoryCountBefore - (v.defended ? 0 : 1);
  }
  return (v.kind === undefined || v.kind === 'npc') && (v.captured === undefined || typeof v.captured === 'boolean' && v.captured === !v.defended) && Number.isSafeInteger(v.wave) && v.wave > 0
    && Number.isFinite(v.scheduledAt) && v.scheduledAt >= 0 && v.resolvedAt >= v.scheduledAt;
};
export function appendRaidReport(state: ConquestState, report: RaidReport) {
  // Retries retain the original historical snapshot and its read status.
  if ((state.raidReports ?? []).some(r => r.id === report.id)) return { raidReports: state.raidReports!, raidReadIds: state.raidReadIds ?? [] };
  const raidReports = [report, ...(state.raidReports ?? [])].slice(0, RAID_REPORT_LIMIT);
  const retained = new Set(raidReports.map(r => r.id));
  return { raidReports, raidReadIds: (state.raidReadIds ?? []).filter(id => retained.has(id)) };
}
export function createPlayerRaidReport(input: { id: string; season: string; now: number; tile: Tile; attackerId: string; attackerName: string; defenderId: string; territoryCountBefore: number; battle: BattleResult }): PlayerRaidReport {
  const { battle, tile } = input;
  const copy = (guards: Guard[]) => guards.map(g => ({ ...g }));
  return { kind: 'pvp', id: input.id, season: input.season, resolvedAt: input.now, tileId: tile.id, tileName: tile.name,
    attackerId: input.attackerId, attackerName: input.attackerName, previousOwnerId: input.defenderId, nextOwnerId: battle.won ? input.attackerId : input.defenderId,
    territoryCountBefore: input.territoryCountBefore, territoryCountAfter: input.territoryCountBefore - (battle.won ? 1 : 0),
    defended: !battle.won, herbsLost: 0, springLost: 0, rounds: battle.rounds,
    defendersBefore: copy(battle.initialDefenders), defendersAfter: copy(battle.defendersAfter), attackersBefore: copy(battle.initialAttackers), attackersAfter: copy(battle.attackersAfter) };
}
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
  const guards: Guard[] = tile.wild.slice(0, Math.min(3, tile.wild.length)).map((g,i) => withHealth({ id: `npc:dark-tide:${state.season}:${tile.id}:${tile.capturedAt ?? 0}:${wave}:${i}`, element: g.element, level: Math.max(1, g.level) }));
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
  const report: NpcRaidReport = { captured: !defended, id: raid.id, season: state.season, wave: raid.wave, scheduledAt: raid.scheduledAt, resolvedAt: now, tileId: tile.id, tileName: tile.name, defended, herbsLost: herbs, springLost: spring, rounds: result.rounds, defendersBefore: result.initialDefenders, defendersAfter: result.defendersAfter, attackersBefore: result.initialAttackers, attackersAfter: result.attackersAfter };
  const message = `${NPC_FACTION.name}第 ${raid.wave} 波襲擊${tile.name}：${defended ? '守軍擊退敵軍，補給保全' : `敵軍佔領島嶼，掠走 ${round(herbs)} 草藥、${round(spring)} 靈泉`}。守軍傷勢已保存，學習進度保留。`;
  return { ...state, units, ...appendRaidReport(state, report), npcRaids: { wave: raid.wave, resolvedAt: now, defended, tileName: tile.name }, inventory: { ...state.inventory, herbs: state.inventory.herbs - herbs, spring: state.inventory.spring - spring }, lastBattle: result,
    tiles: state.tiles.map(t => t.id === tile.id ? defended ? { ...t, guards: result.defendersAfter.filter(alive) } : occupyNpcTile(t, result.attackersAfter, now) : t), log: [message, ...state.log].slice(0,30) };
}
