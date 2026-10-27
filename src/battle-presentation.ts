import { battleCinematic, cinematicTiming } from './battle-cinematics';
import { ELEMENTS, BATTLE_BUFFS, petById, type Battle, type BattleEvent, type Fighter } from "./game-view";

export type BattlePhase = "windup" | "flight" | "impact" | "settle";
export type BattlePlayback = {
  nonce: number;
  startedAt?: number;
  before: Battle;
  after: Battle;
  event: BattleEvent;
  phase: BattlePhase;
};
export const BATTLE_TIMING = { flight: 280, impact: 680, settle: 1080, end: 1640 };
export const FAST_BATTLE_TIMING = { flight: 0, impact: 40, settle: 90, end: 180 };
export function battlePresentationTiming(event: BattleEvent, reduced: boolean) {
  if (reduced) return FAST_BATTLE_TIMING;
  const clip = battleCinematic(event.source, event.kind);
  return clip ? cinematicTiming(clip) : BATTLE_TIMING;
}
export function hasLanded(playback: BattlePlayback | null) {
  return !playback || playback.phase === "impact" || playback.phase === "settle";
}
export function visibleBattle(battle: Battle, playback: BattlePlayback | null) {
  return playback && !hasLanded(playback) ? playback.before : battle;
}
// Hold the defeated fighter until its reaction ends, even if the engine has
// already selected a reserve. Never use this visual snapshot to resolve a move.
export function visibleFighter(battle: Battle, playback: BattlePlayback | null, side: number): Fighter {
  if (playback && hasLanded(playback) && playback.event.targetSide === side)
    return playback.event.targetFighter;
  const shown = visibleBattle(battle, playback);
  return shown.teams[side][shown.active[side]];
}
export function moveTitle(event: BattleEvent) {
  const pet = petById(event.source);
  if (pet?.signatureMove && ((event.kind === "burst" && pet.supportType === "focus") || (event.kind === "guard" && pet.supportType === "shield") || (event.kind === "heal" && pet.supportType === "spark") || event.kind === "buff")) return pet.signatureMove;
  switch (event.kind) {
    case "burst": return ELEMENTS[event.element]?.burst ?? "星潮絕招";
    case "attack": return "星光突擊";
    case "guard": return "星環守護";
    case "heal": return "生命微光";
    case "swap": return event.amount > 0 ? "相生接力" : "夥伴接力";
    case "buff": return BATTLE_BUFFS[event.skill].name;
  }
}

export function advanceBattlePhase(playback: BattlePlayback, phase: BattlePhase): BattlePlayback {
  const order: BattlePhase[] = ["windup", "flight", "impact", "settle"];
  return order.indexOf(phase) > order.indexOf(playback.phase) ? { ...playback, phase } : playback;
}
