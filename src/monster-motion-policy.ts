import {RELEASED_WAVE4_MONSTERS} from './monster-wave4';
export type MonsterAction='entrance'|'idle'|'attack'|'hit'|'capture';
const released=new Set<string>(RELEASED_WAVE4_MONSTERS.map(m=>m.id));
export const hasMonsterMotion=(id:string)=>released.has(id);
// Reviewed production exclusions. Original clips remain in the local review archive.
export const HELD_MONSTER_ACTIONS:Readonly<Record<string,readonly MonsterAction[]>>={
  "wave4-metal-02": [
    "hit"
  ],
  "wave4-metal-03": [
    "attack",
    "capture"
  ],
  "wave4-metal-04": [
    "attack",
    "hit"
  ],
  "wave4-metal-05": [
    "attack"
  ],
  "wave4-metal-07": [
    "attack",
    "hit"
  ],
  "wave4-metal-09": [
    "idle",
    "attack",
    "hit"
  ],
  "wave4-metal-10": [
    "hit"
  ],
  "wave4-wood-11": [
    "hit"
  ],
  "wave4-wood-12": [
    "attack"
  ],
  "wave4-wood-13": [
    "attack",
    "hit"
  ],
  "wave4-wood-15": [
    "attack",
    "hit",
    "capture"
  ],
  "wave4-wood-17": [
    "attack",
    "hit"
  ],
  "wave4-wood-18": [
    "hit"
  ],
  "wave4-wood-20": [
    "attack",
    "hit"
  ],
  "wave4-water-22": [
    "attack",
    "hit",
    "capture"
  ],
  "wave4-water-27": [
    "attack"
  ],
  "wave4-water-28": [
    "attack",
    "hit"
  ]
};
export function monsterMotionSource(id:string,action:MonsterAction):MonsterAction {
 const held=HELD_MONSTER_ACTIONS[id]??[];
 if(!held.includes(action))return action;
 return held.includes('idle')?'entrance':'idle';
}
