import { battleKit, hasBattleKit, MOTIFS } from './conquest-moves';
import { health } from './conquest';
import type { BattleSetup } from './conquest-battle';

export const BATTLE_DURATION_MS = 12000;
export const BATTLE_RESOLVE = .84;
export const battleDuration = (setup: BattleSetup) => setup.result.events.length ? Math.max(9000, Math.min(42000, 4800 + setup.result.events.length * 1000)) : 3200;
export type AttackStyle = 'crescent' | 'stone' | 'leaf' | 'mist' | 'star' | 'pounce' | 'rush';
export type CombatBeat = { id: string; source: string; target: string; sourceName: string; targetName: string; name: string; style: AttackStyle; color: string; side: -1 | 1; start: number; launch: number; impact: number; end: number; finale: boolean; damage: number; targetHp: number; knockedOut: boolean; round: number };
export const combatKey = (side: number, id: string) => `${side}:${id}`;
const MELEE = new Set(['foamferret', 'sailskipper', 'kelpcub', 'shellmole', 'starheron', 'reefrabbit']);
export const isMelee = (beat: CombatBeat) => beat.style === 'pounce' || beat.style === 'rush';
export function createChoreography(setup: BattleSetup): CombatBeat[] {
  const events = setup.result.events, side = setup.mode === 'drill' ? 1 : -1;
  const weights = events.map((event, i) => setup.commander && event.side === side && !events.slice(0, i).some(previous => previous.round === event.round && previous.side === side) ? 1.6 : 1);
  const total = weights.reduce((sum, value) => sum + value, 0); let cursor = .07;
  return events.map((event, index) => {
    const source = (event.side === -1 ? setup.attackers : setup.defenders).find(u => u.id === event.source)!;
    const target = (event.side === -1 ? setup.defenders : setup.attackers).find(u => u.id === event.target)!;
    const species = source.speciesId ?? source.id, kit = hasBattleKit(species) ? battleKit(species) : undefined;
    const style: AttackStyle = MELEE.has(species) ? (['sailskipper', 'reefrabbit', 'starheron'].includes(species) ? 'pounce' : 'rush') : kit?.motif === 'stone' ? 'stone' : kit?.motif === 'leaf' ? 'leaf' : kit?.motif === 'mist' ? 'mist' : kit?.motif === 'star' ? 'star' : 'crescent';
    const stride = .75 * weights[index] / total, start = cursor, span = stride * .95; cursor += stride;
    return { id: `beat-${index}`, source: combatKey(event.side, event.source), target: combatKey(-event.side, event.target), sourceName: source.name, targetName: target.name, side: event.side, name: kit?.moves[0].name ?? '元素突擊', style, color: kit ? MOTIFS[kit.motif].color : '#e7c875', start, launch: start + span * .4, impact: start + span * .72, end: start + span, finale: index === events.length - 1 && event.side === (setup.result.won ? -1 : 1), damage: event.damage, targetHp: event.hp, knockedOut: event.knockedOut, round: event.round };
  });
}
export const beatAt = (beats: CombatBeat[], progress: number) => [...beats].reverse().find(b => progress >= b.start && progress < b.end);
export const ease = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
export function beatPhase(beat: CombatBeat, progress: number) {
  return progress < beat.launch ? '蓄勢' : progress < beat.impact ? '出招' : progress < beat.end ? '命中' : '收勢';
}

export function battleHealth(setup: BattleSetup, beats: CombatBeat[], side: number, id: string, progress: number) {
  const initial = (side === -1 ? setup.result.initialAttackers : setup.result.initialDefenders).find(g => g.id === id);
  if (!initial) return 0;
  let hp = health(initial);
  for (const beat of beats) if (beat.target === combatKey(side, id) && progress >= beat.impact) hp = beat.targetHp;
  return hp;
}
