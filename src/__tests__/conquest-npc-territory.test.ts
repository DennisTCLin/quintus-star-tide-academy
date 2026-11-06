import { describe, expect, it } from 'vitest';
import { act, adjacent, advanceConquest, claimBlock, createConquest, health, knowledgeBonus, production, withHealth } from '../conquest';
import { expandNpcTerritory, isNpcOwner, NPC_FACTION, NPC_EXPANSION_INTERVAL_MS, occupyNpcTile, validRaidReport } from '../conquest-enemy';
import { territoryMarker, territoryStatus } from '../conquest-presentation';
import { parseConquest } from '../conquest-store';
import { prepareBattle } from '../conquest-battle';
const now=Date.UTC(2026,10,6), player='quintus';
describe('Dark Tide territory',()=>{
 it('establishes an outer outpost and expands to only one adjacent neutral island per interval',()=>{
  const state=createConquest(undefined,now),before=JSON.stringify(state);
  const first=expandNpcTerritory(state.tiles,now,null)!;
  expect(first.captured).toBe(true);expect(JSON.stringify(state)).toBe(before);
  const outpost=first.tiles.find(t=>isNpcOwner(t.owner))!;expect(outpost.distance).toBe(5);
  expect(expandNpcTerritory(first.tiles,now+NPC_EXPANSION_INTERVAL_MS-1,now)).toBeNull();
  const second=expandNpcTerritory(first.tiles,now+NPC_EXPANSION_INTERVAL_MS,now)!;
  expect(second.captured).toBe(true);expect(second.tiles.filter(t=>isNpcOwner(t.owner))).toHaveLength(2);
  expect(adjacent(outpost,second.tiles.find(t=>t.id===second.tileId)!)).toBe(true);
  expect(expandNpcTerritory(state.tiles,now+NPC_EXPANSION_INTERVAL_MS*100,now)!.tiles.filter(t=>isNpcOwner(t.owner))).toHaveLength(1);
  expect(expandNpcTerritory(state.tiles,NaN,null)).toBeNull();
 });
 it('does not replace player islands, battle-locked islands or the neutral starter ring',()=>{
  const state=createConquest(undefined,now);
  state.tiles.filter(t=>t.distance>1).forEach(t=>{t.owner=player;});
  expect(expandNpcTerritory(state.tiles,now,null)).toBeNull();
  const outer=state.tiles.find(t=>t.distance===5)!;outer.owner=null;outer.battleUntil=now+1;
  expect(expandNpcTerritory(state.tiles,now,null)).toBeNull();
  expect(expandNpcTerritory(state.tiles,now+1,null)?.tileId).toBe(outer.id);
 });
 it('keeps NPC holdings out of personal supplies and knowledge bonuses, including old local saves',()=>{
  const state=createConquest(undefined,now),tile=state.tiles[0];
  state.tiles[0]=occupyNpcTile({...tile,facility:'knowledge'},[withHealth({id:'npc:one',level:3,element:'water'})],now);
  expect(production(state.tiles[0])).toEqual({herbs:0,spring:0});expect(knowledgeBonus(state)).toBe(0);
  expect(advanceConquest(state,now+3600000).inventory).toEqual(state.inventory);
  expect(parseConquest(JSON.stringify(state),player).tiles[0].owner).toBe(NPC_FACTION.id);
  state.tiles[0].owner='untrusted';expect(()=>parseConquest(JSON.stringify(state),player)).toThrow();
 });
 it('uses an explicit enemy marker and a normal PvE claim to reclaim land, preserving player shields',()=>{
  const state=createConquest(undefined,now);state.energy=1000;
  const target=occupyNpcTile(state.tiles[0],[withHealth({id:'npc:one',level:1,element:'water'})],now);state.tiles[0]=target;
  expect(territoryMarker(target,player)).toMatchObject({kind:'npc'});expect(territoryStatus(target,player).ownerLabel).toBe(NPC_FACTION.name);
  const roster=['a','b','c'].map(id=>({...withHealth({id,level:20,element:'wood' as const}),name:id,image:'',loan:false}));
  const plan={mode:'claim' as const,player,season:state.season,tileId:target.id};
  const setup=prepareBattle(state,plan,roster.map(g=>g.id),roster,'coast',now);
  expect(setup.source).toContain('黯潮軍團');expect(setup.defenders[0].npc).toBe(true);expect(setup.defenders[0].image).toBeTruthy();expect(setup.block).toBeNull();
  const next=act(state,player,{type:'claim',tileId:target.id,team:roster.map(g=>g.id)},roster,now);
  expect(next.tiles[0].owner).toBe(player);expect(next.tiles[0].shieldUntil).toBeGreaterThan(now);
  expect(next.units['npc:one']).toBeUndefined();expect(next.lastBattle!.attackersAfter.some(g=>health(g)>0)).toBe(true);
  state.tiles[state.tiles.length-1].owner=player;expect(claimBlock(state,player,target,now)).toContain('相鄰');
 });
 it('accepts legacy raid reports without retroactively marking land captured',()=>{
  const report={id:'old',season:'season-2026-11',wave:1,scheduledAt:now,resolvedAt:now,tileId:'0,0',tileName:'島',defended:false,herbsLost:2,springLost:1,rounds:0,defendersBefore:[],defendersAfter:[],attackersBefore:[],attackersAfter:[]};
  expect(validRaidReport(report)).toBe(true);expect(validRaidReport({...report,captured:true})).toBe(true);
  expect(validRaidReport({...report,captured:true,defended:true})).toBe(false);
 });
});
