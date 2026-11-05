import { companionById, characterModel, heroById, wildIdentity, type ConquestHero } from './conquest-characters';
import { ELEMENT_LABEL, advanceConquest, syncConquestRoster, currentUnit, deploymentBlock, battleResult, claimBlock, claimCost, power, seasonAt, territories, type BattleResult, type Companion, type ConquestState, type Guard, type Tile } from './conquest';

export type BattleMode = 'claim' | 'drill';
export type DrillTier = 'coast' | 'offshore' | 'deep';
export const DRILL_TIERS: Record<DrillTier, string> = { coast: '近岸偵察', offshore: '外海突襲', deep: '深海強敵' };
export type BattleUnit = Guard & { name: string; image?: string; model?: string; speciesId?: string; wild: boolean };
export type BattlePlan = { mode: BattleMode; player: string; season: string; tileId: string };
export type BattleSetup = {
  mode: BattleMode; tileId: string; islandName: string; terrain: Tile['terrain']; element: Tile['element']; facility: Tile['facility'];
  attackers: BattleUnit[]; defenders: BattleUnit[]; result: BattleResult;
  commander?: ConquestHero; defenderCommander?: ConquestHero; fullCost: number; block: string | null; source: string;
};
export type BattleReport = BattleSetup & { playerWon: boolean; energyAfter: number; shieldUntil: number; occurredAt: number };
const units = (guards: readonly Guard[], roster: Companion[], wild: boolean): BattleUnit[] => guards.map((guard, index) => {
  const companion = wild ? wildIdentity(guard) : companionById(guard.id) ?? roster.find(c => c.id === guard.id);
  return { ...guard, name: (companion && wild ? `${ELEMENT_LABEL[guard.element]}・${companion.name}` : companion?.name) ?? (wild ? `野怪 ${index + 1}` : `守衛 ${index + 1}`), image: companion?.image, speciesId: companion?.id, model: companion && characterModel(companion.id), wild };
});

export function prepareBattle(state: ConquestState, plan: BattlePlan, team: string[], roster: Companion[], tier: DrillTier, now: number, commander?: string): BattleSetup {
  state = advanceConquest(syncConquestRoster(state, roster), now);
  if (state.enrollment) {
    if (commander && commander !== state.enrollment.heroId) throw Error('這位英雄尚未解鎖。');
    commander = state.enrollment.heroId;
  }
  if (plan.season !== state.season || state.season !== seasonAt(now)) throw Error('航季已更新，請重新選島。');
  const tile = state.tiles.find(t => t.id === plan.tileId);
  if (!tile) throw Error('這座島嶼尚未開放。');
  if (plan.mode === 'drill') {
    if (tile.owner !== plan.player) throw Error('只能演練自己島嶼的防守。');
    const range = tier === 'coast' ? [0, 1] : tier === 'offshore' ? [2, 3] : [4, 5];
    const source = state.tiles.filter(t => t.distance >= range[0] && t.distance <= range[1]).sort((a, b) => power(b.wild) - power(a.wild) || a.id.localeCompare(b.id))[0];
    if (!source) throw Error('尚無可用的演練敵軍。');
    // Wild drills have no player-territory catch-up multipliers and never mutate the world.
    const result = { ...battleResult(source.wild, { ...tile, owner: null }, 0, 0), cost: 0 };
    return { commander: heroById(state.enrollment?.heroId ?? tile.commander), mode: 'drill', tileId: tile.id, islandName: tile.name, terrain: tile.terrain, element: tile.element, facility: tile.facility, attackers: units(source.wild, roster, true), defenders: units(tile.guards, roster, false), result, fullCost: 0, block: null, source: `${DRILL_TIERS[tier]}・模擬${source.name}的原生野怪` };
  }
  const guards = team.map(id => roster.find(c => c.id === id)).filter((c): c is Companion => !!c).map(c => ({ ...c, ...currentUnit(state, c) }));
  const invalid = team.length < 3 || team.length > 5 || new Set(team).size !== team.length || guards.length !== team.length;
  const count = territories(state, plan.player).length;
  return {
    commander: heroById(commander), defenderCommander: tile.owner ? heroById(tile.commander) : undefined, mode: 'claim', tileId: tile.id, islandName: tile.name, terrain: tile.terrain, element: tile.element, facility: tile.facility,
    attackers: units(guards, roster, false), defenders: units(tile.guards, roster, !tile.owner),
    result: battleResult(guards, tile, count, tile.owner ? territories(state, tile.owner).length : 0), fullCost: claimCost(tile, count),
    block: invalid ? '請選擇 3–5 位不同的出征夥伴。' : claimBlock(state, plan.player, tile, now, state.shared) ?? guards.map(g => deploymentBlock(state, g)).find(Boolean) ?? null, source: tile.owner ? '進攻其他玩家駐守的島嶼' : '進攻野怪駐守的島嶼',
  };
}

export function claimReport(setup: BattleSetup, committed: ConquestState, now: number): BattleReport {
  const tile = committed.tiles.find(t => t.id === setup.tileId);
  if (setup.mode !== 'claim' || !committed.lastBattle || !tile) throw Error('找不到本次戰鬥結算。');
  // Only the parent's committed outcome is authoritative; never replay a rules mutation here.
  return { ...setup, attackers: setup.attackers.map(u => ({ ...u, ...committed.lastBattle!.initialAttackers.find(g => g.id === u.id) })), defenders: setup.defenders.map(u => ({ ...u, ...committed.lastBattle!.initialDefenders.find(g => g.id === u.id) })), result: { ...committed.lastBattle }, playerWon: committed.lastBattle.won, energyAfter: committed.energy, shieldUntil: tile.shieldUntil, occurredAt: now };
}
export function drillReport(setup: BattleSetup, state: ConquestState, now: number): BattleReport {
  if (setup.mode !== 'drill') throw Error('不是防守演練。');
  return { ...setup, result: { ...setup.result, cost: 0 }, playerWon: !setup.result.won, energyAfter: state.energy, shieldUntil: state.tiles.find(t => t.id === setup.tileId)!.shieldUntil, occurredAt: now };
}
