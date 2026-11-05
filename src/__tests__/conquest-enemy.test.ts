import { describe, expect, it } from 'vitest';
import { incomingRaid, NPC_FACTION, RAID_INTERVAL_MS, RAID_WARNING_MS } from '../conquest-enemy';
import { act, createConquest, ensureSeason, health, SHIELD_MS, withHealth } from '../conquest';
import { enrollConquest } from '../conquest-alliance';
import { expeditionRoster } from '../conquest-characters';
import { parseConquest } from '../conquest-store';
const start=Date.UTC(2026,10,5),player='quintus';
function fixture(alliance='light',hero='hero-elf'){
 const state=enrollConquest(createConquest(undefined,start),player,alliance,hero,{},start), roster=expeditionRoster({},state.enrollment);
 const tile=state.tiles.find(t=>t.id==='0,0')!;tile.owner=player;tile.capturedAt=start;tile.commander=hero;
 tile.guards=roster.map(g=>withHealth(g));state.units=Object.fromEntries(tile.guards.map(g=>[g.id,g]));state.inventory={herbs:20,spring:10,bandage:2,potion:1};
 return {state,roster,tile};
}
describe('dark tide NPC raids',()=>{
 it.each([['light','hero-elf'],['night','hero-orc']])('attacks %s after warning and never targets other owners',(a,h)=>{
  const {state,tile}=fixture(a,h);expect(NPC_FACTION.name).toBe('黯潮軍團');expect(incomingRaid(state,player,start+RAID_WARNING_MS-1)).toBeNull();
  expect(incomingRaid(state,player,start+RAID_WARNING_MS)?.tileId).toBe(tile.id);
  expect(incomingRaid(state,'other',start+RAID_WARNING_MS)).toBeNull();tile.owner=null;expect(incomingRaid(state,player,start+RAID_WARNING_MS)).toBeNull();
 });
 it('previews without mutation and bounds server-downtime catch-up to one wave',()=>{
  const {state,tile}=fixture();tile.shieldStartsAt=start;tile.shieldUntil=start+SHIELD_MS;
  expect(incomingRaid(state,player,start+RAID_WARNING_MS)).toBeNull();
  const copy=JSON.stringify(state),raid=incomingRaid(state,player,start+SHIELD_MS+RAID_INTERVAL_MS*20)!;
  expect(raid.wave).toBe(1);expect(JSON.stringify(state)).toBe(copy);
 });
 it('resolves once, preserves learning/ownership and persists wounds and the next wave',()=>{
  const {state,roster,tile}=fixture(), now=start+RAID_WARNING_MS, raid=incomingRaid(state,player,now)!;
  expect(()=>act(state,player,{type:'defend',raidId:raid.id,tileId:'1,1'},roster,now)).toThrow();
  state.credited=['earned'];const result=act(state,player,{type:'defend',raidId:raid.id,tileId:tile.id},roster,now);
  expect(result.npcRaids).toMatchObject({wave:1,resolvedAt:now});expect(result.energy).toBe(state.energy);expect(result.credited).toEqual(['earned']);
  expect(result.tiles.find(t=>t.id===tile.id)?.owner).toBe(player);expect(result.lastBattle?.cost).toBe(0);
  for(const guard of result.lastBattle!.defendersAfter)expect(result.units[guard.id]).toEqual(guard);
  expect(()=>act(result,player,{type:'defend',raidId:raid.id},roster,now)).toThrow('戰況');
  expect(incomingRaid(result,player,now+RAID_INTERVAL_MS-1)).toBeNull();expect(incomingRaid(result,player,now+RAID_INTERVAL_MS)?.wave).toBe(2);
  expect(parseConquest(JSON.stringify(result),player).npcRaids).toEqual(result.npcRaids);
  expect(parseConquest(JSON.stringify(result),player).raidReports).toEqual(result.raidReports);
  expect(ensureSeason(result,Date.UTC(2026,11,1)).raidReports).toEqual(result.raidReports);
  expect(ensureSeason(result,Date.UTC(2026,11,1)).npcRaids).toEqual(result.npcRaids);
 });
 it('bounds defeat losses and cannot heal by previewing or turn the enemy into a player owner',()=>{
  const {state,roster,tile}=fixture();tile.guards=[];state.inventory.herbs=3;state.inventory.spring=1;
  const now=start+RAID_WARNING_MS,raid=incomingRaid(state,player,now)!;const result=act(state,player,{type:'defend',raidId:raid.id},roster,now);
  expect(result.npcRaids?.defended).toBe(false);expect(result.inventory.herbs).toBeGreaterThanOrEqual(0);expect(result.inventory.spring).toBeGreaterThanOrEqual(0);
  expect(result.inventory.bandage).toBe(2);expect(result.inventory.potion).toBe(1);expect(result.tiles.find(t=>t.id===tile.id)?.owner).toBe(player);
  expect(result.tiles.some(t=>t.owner===NPC_FACTION.id)).toBe(false);
  expect(()=>act(state,'other',{type:'defend',raidId:raid.id},roster,now)).toThrow();
 });
 it('keeps the latest thirty immutable reports across later waves and season rollover',()=>{
  let {state,roster}=fixture();const first=start+RAID_WARNING_MS;
  for(let i=0;i<35;i++){
   const now=first+i*RAID_INTERVAL_MS,raid=incomingRaid(state,player,now)!;
   state=act(state,player,{type:'defend',raidId:raid.id},roster,now);
  }
  expect(state.raidReports).toHaveLength(30);expect(state.raidReports?.map(r=>r.wave)).toEqual(Array.from({length:30},(_,i)=>35-i));
  expect(parseConquest(JSON.stringify(state),player).raidReports).toEqual(state.raidReports);
  const invalid=structuredClone(state);invalid.raidReports![0].herbsLost=6;expect(()=>parseConquest(JSON.stringify(invalid),player)).toThrow();
 });

 it('retains the six-hour cooldown when a raid occurs just before a new season',()=>{
  const {state,roster}=fixture(),now=Date.UTC(2026,10,30,15,55),raid=incomingRaid(state,player,now)!;
  const fought=act(state,player,{type:'defend',raidId:raid.id},roster,now);
  const next=ensureSeason(fought,now+20*60000),tile=next.tiles[0];tile.owner=player;tile.capturedAt=now+5*60000;tile.shieldUntil=0;
  expect(incomingRaid(next,player,now+20*60000)).toBeNull();
  expect(incomingRaid(next,player,now+RAID_INTERVAL_MS)?.wave).toBe(2);
 });

});
