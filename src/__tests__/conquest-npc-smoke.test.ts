import { expect, it } from 'vitest';
import * as THREE from 'three';
import { createConquest } from '../conquest';
import { release } from '../conquest-art';
import { buildNpcSmoke, NPC_SMOKE_PUFFS } from '../conquest-npc-smoke';
it('renders only NPC holdings and removes smoke after reclaim without changing state',()=>{
 const state=createConquest('season-2026-11',0), heights=new Map(state.tiles.map(t=>[t.id,{ground:1,top:2}]));
 state.tiles[0].owner='dark-tide';state.tiles[1].owner='player';
 const before=JSON.stringify(state),clock={value:0},smoke=buildNpcSmoke(state.tiles,heights,clock)!;
 expect(smoke.userData.islandIds).toEqual([state.tiles[0].id]);expect(smoke.geometry.instanceCount).toBe(NPC_SMOKE_PUFFS);
 expect(smoke.material.uniforms.time).toBe(clock);expect(smoke.material.depthWrite).toBe(false);expect(smoke.material.forceSinglePass).toBe(true);
 expect(JSON.stringify(state)).toBe(before);release(smoke);
 state.tiles[0].owner='player';expect(buildNpcSmoke(state.tiles,heights,clock)).toBeNull();
});
it('bounds the full-map GPU workload to one instanced mesh and disposes its resources',()=>{
 const state=createConquest('season-2026-11',0);state.tiles.forEach(t=>{t.owner='dark-tide';});
 const heights=new Map(state.tiles.map(t=>[t.id,{ground:1,top:2}]));
 const smoke=buildNpcSmoke(state.tiles,heights,{value:0})!;
 expect(smoke).toBeInstanceOf(THREE.Mesh);expect(smoke.geometry.instanceCount).toBe(91*NPC_SMOKE_PUFFS);
 expect([...smoke.geometry.getAttribute('smokeCenter').array].every(Number.isFinite)).toBe(true);
 let geometry=0,material=0;smoke.geometry.addEventListener('dispose',()=>geometry++);smoke.material.addEventListener('dispose',()=>material++);
 release(smoke);expect([geometry,material]).toEqual([1,1]);
});
