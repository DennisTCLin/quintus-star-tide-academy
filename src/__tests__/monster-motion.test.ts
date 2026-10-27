import {describe,it,expect} from 'vitest';
import {applyMonsterMatte} from '../MonsterMotion';

describe('packed monster video alpha',()=>{
 it('preserves opaque armor and colored effects while removing the independent background mask',()=>{
  const pixels=new Uint8ClampedArray([255,0,255,255, 180,160,175,255, 30,120,220,255]);
  // The same magenta may belong to a character: its mask, never its hue,
  // determines whether it is visible. This prevents holes in reflective armor.
  const masks=new Uint8ClampedArray([255,255,255,255, 0,0,0,255, 128,128,128,255]);
  applyMonsterMatte(pixels,masks);
  expect([...pixels.slice(0,4)]).toEqual([255,0,255,255]);
  expect([...pixels.slice(4,8)]).toEqual([180,160,175,0]);
  expect([...pixels.slice(8,11)]).toEqual([30,120,220]);
  expect(pixels[11]).toBeGreaterThan(100);expect(pixels[11]).toBeLessThan(160);
 });
});

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MONSTER_CATALOG} from '../monsters';
import {WAVE4_MONSTERS} from '../monster-wave4';
import {hasMonsterMotion,monsterMotionSource,HELD_MONSTER_ACTIONS,type MonsterAction} from '../monster-motion-policy';
it('publishes only 30 species and resolves every action to a reviewed same-character file',()=>{
 const audit=JSON.parse(readFileSync('outputs/monster-wave4/media-audit/results.json','utf8'));
 const actions:MonsterAction[]=['entrance','idle','attack','hit','capture'];
 expect(MONSTER_CATALOG.filter(m=>hasMonsterMotion(m.id))).toHaveLength(30);
 for(const m of WAVE4_MONSTERS.slice(30)){expect(hasMonsterMotion(m.id)).toBe(false);expect(MONSTER_CATALOG.some(x=>x.id===m.id)).toBe(false);}
 for(const m of MONSTER_CATALOG.filter(m=>hasMonsterMotion(m.id)))for(const action of actions){
  const safe=monsterMotionSource(m.id,action),row=audit.find((r:any)=>r.id===m.id&&r.action===safe);
  expect(row).toBeDefined();expect((HELD_MONSTER_ACTIONS[m.id]??[]).includes(safe)).toBe(false);
  // Only two reviewed light-effect edge warnings are accepted; no body crops.
  expect(row.flags.length===0||[4,38].includes(row.index)).toBe(true);
  expect(createHash('sha256').update(readFileSync(`public/assets/monsters/wave4/${m.id}-${safe}.mp4`)).digest('hex')).toBe(row.sha256);
 }
 expect(Object.values(HELD_MONSTER_ACTIONS).flat()).toHaveLength(30);
});
