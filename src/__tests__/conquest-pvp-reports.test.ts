import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { battleResult, createConquest, ensureSeason } from '../conquest';
import { acknowledgeRaidReports, appendRaidReport, createPlayerRaidReport, validRaidReport, unreadRaidReports, type NpcRaidReport } from '../conquest-enemy';
import { parseConquest } from '../conquest-store';
import ConquestRaid from '../ConquestRaid';
import ConquestRaidNotice from '../ConquestRaidNotice';
import type { SharedConquestController } from '../conquest-cloud';

const now=Date.UTC(2026,10,6),owner='defender';
function fixture(won=true) {
 const state=createConquest(undefined,now),tile=state.tiles[0];
 const guard={id:'tideglow',level:1,element:'water' as const,hp:80,maxHp:80};
 const battle={...battleResult([guard],{...tile,guards:[guard]},0,1),won,initialDefenders:[guard],defendersAfter:[{...guard,hp:won?0:20}]};
 const report=createPlayerRaidReport({id:'pvp:attacker:command',season:state.season,now,tile,attackerId:'attacker',attackerName:'Olivia',defenderId:owner,territoryCountBefore:10,battle});
 const old:NpcRaidReport={id:'legacy-npc',season:state.season,wave:1,scheduledAt:now-1000,resolvedAt:now-500,tileId:tile.id,tileName:tile.name,defended:true,herbsLost:0,springLost:0,rounds:1,defendersBefore:[],defendersAfter:[],attackersBefore:[],attackersAfter:[]};
 state.raidReports=[old];state.raidReadIds=[old.id];
 return {state,battle,report,old};
}
describe('player defense reports',()=>{
 it.each([true,false])('preserves legacy reports/read IDs and exact outcome through storage and season rollover: won=%s',won=>{
  const {state,report,old}=fixture(won);Object.assign(state,appendRaidReport(state,report));
  expect(validRaidReport(report)).toBe(true);expect(validRaidReport(old)).toBe(true);
  expect(report).toMatchObject({defended:!won,previousOwnerId:owner,nextOwnerId:won?'attacker':owner,territoryCountBefore:10,territoryCountAfter:won?9:10});
  const restored=parseConquest(JSON.stringify(state),owner);
  expect(restored.raidReports).toEqual([report,old]);expect(restored.raidReadIds).toEqual([old.id]);
  expect(unreadRaidReports(restored)).toEqual([report]);expect(ensureSeason(restored,Date.UTC(2026,11,1)).raidReports).toEqual([report,old]);
  expect(restored.npcRaids).toBeUndefined();
 });
 it('keeps immutable battle wounds, deduplicates retries and leaves newly arriving reports unread',()=>{
  const {state,report,battle}=fixture();Object.assign(state,appendRaidReport(state,report));
  battle.defendersAfter[0].hp=80;expect(report.defendersAfter[0].hp).toBe(0);
  state.raidReadIds=acknowledgeRaidReports(state,[report.id]);
  Object.assign(state,appendRaidReport(state,{...report,defendersAfter:[]}));expect(state.raidReports).toHaveLength(2);expect(state.raidReports![0].defendersAfter[0].hp).toBe(0);
  Object.assign(state,appendRaidReport(state,{...report,id:'later'}));
  state.raidReadIds=acknowledgeRaidReports(state,[report.id]);expect(unreadRaidReports(state).map(r=>r.id)).toEqual(['later']);
  for(let i=0;i<30;i++)Object.assign(state,appendRaidReport(state,{...report,id:`next-${i}`}));
  expect(state.raidReports).toHaveLength(30);expect(state.raidReadIds).toEqual([]);
 });
 it('rejects inconsistent ownership/counts and unknown report kinds',()=>{
  const {report}=fixture();for(const patch of [{nextOwnerId:owner},{territoryCountAfter:10},{territoryCountBefore:0},{attackerName:''},{kind:'unknown'},{wave:1},{herbsLost:1}])expect(validRaidReport({...report,...patch})).toBe(false);
 });
 it.each([true,false])('renders attacker, defender outcome, territory change and wounds without NPC supply claims: won=%s',won=>{
  const {state,report}=fixture(won);state.raidReports=[report];
  const html=renderToStaticMarkup(createElement(ConquestRaid,{state,player:owner,now}));
  expect(html).toContain('攻擊者：Olivia');expect(html).toContain(won?'領地失守，這座島轉移給Olivia。':'守城成功，這座島仍屬於你。');
  expect(html).toContain(`你的領地：10 → ${won?9:10} 座`);expect(html).toContain(`血量 80 → ${won?0:20} / 80`);expect(html).not.toContain('補給損失：');
  const notice=renderToStaticMarkup(createElement(ConquestRaidNotice,{controller:{snapshot:{state},connected:true} as SharedConquestController,onOpen:()=>{}}));
  expect(notice).toContain('你有 1 份未讀守城戰報');expect(notice).toContain('玩家攻城 1 場');expect(notice).not.toContain('補給遭劫');
 });
});
