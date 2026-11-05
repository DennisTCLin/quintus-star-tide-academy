import { describe, expect, it } from 'vitest';
import { creditAnswer, knowledgeBonus, act, advanceConquest, battleResult, createConquest, currentUnit, deploymentBlock, ensureSeason, health, maxHealth, production, readyToDeploy, RECOVERY_MS, seasonAt, shieldActive, SHIELD_DELAY_MS, SHIELD_MS, type Companion } from '../conquest';
import { parseConquest } from '../conquest-store';
const now = Date.UTC(2026,10,3,2), fresh = () => createConquest(seasonAt(now), now);
const roster: Companion[] = Array.from({ length: 10 }, (_,i) => ({ id: `c${i}`, level:4, element:'metal', name:`夥伴${i}`, image:'', loan:true }));
const team = roster.slice(0,5).map(g => g.id), capture = () => act(fresh(),'p',{type:'claim',tileId:'0,0',team},roster,now);
const center = (s: ReturnType<typeof fresh>) => s.tiles.find(t => t.id === '0,0')!;
describe('continuous recovery and unique assignments', () => {
  it('restores 5% per ten minutes with no rounding loss from frequent ticks', () => {
    const s = fresh(); s.units.c0 = {...roster[0],hp:0};
    const full = advanceConquest(s,now+RECOVERY_MS); let frequent = s;
    for(let i=1;i<=10;i++) frequent = advanceConquest(frequent,now+i*RECOVERY_MS/10);
    expect(health(full.units.c0)).toBeCloseTo(7); expect(health(frequent.units.c0)).toBeCloseTo(7);
    expect(advanceConquest(full,now+RECOVERY_MS)).toBe(full); expect(advanceConquest(full,now)).toBe(full);
  });
  it('allows redeployment exactly at 20% and never auto-restations a recovered unit', () => {
    const s = fresh(); s.units.c0={...roster[0],hp:0};
    const before=advanceConquest(s,now+4*RECOVERY_MS-1),ready=advanceConquest(s,now+4*RECOVERY_MS);
    expect(readyToDeploy(before.units.c0)).toBe(false); expect(readyToDeploy(ready.units.c0)).toBe(true);
    expect(deploymentBlock(before,roster[0])).toContain('20%'); expect(deploymentBlock(ready,roster[0])).toBeNull();
    expect(ready.tiles.every(t=>!t.owner)).toBe(true);
  });
  it('blocks duplicate deployment and allows partial/empty garrisons without resetting wounds', () => {
    const s=capture(); expect(deploymentBlock(s,roster[0])).toContain('駐守');
    expect(()=>act(s,'p',{type:'claim',tileId:'1,0',team},roster,now)).toThrow('駐守');
    const one=act(s,'p',{type:'reinforce',tileId:'0,0',team:['c0']},roster,now);
    expect(center(one).guards).toHaveLength(1); expect(one.units).toEqual(s.units);
    const empty=act(one,'p',{type:'reinforce',tileId:'0,0',team:[]},roster,now);
    expect(center(empty).guards).toEqual([]); expect(center(empty).owner).toBe('p'); expect(center(empty).shieldUntil).toBe(center(s).shieldUntil);
    expect(health(currentUnit(empty,roster[0]))).toBe(health(s.units.c0));
  });
  it('keeps defenders below 20% in place but forbids sending them to a new island', () => {
    const s=capture(); s.units.c0.hp=10; center(s).guards[0]={...s.units.c0};
    expect(deploymentBlock(s,roster[0],'0,0')).toBeNull();
    const recalled=act(s,'p',{type:'reinforce',tileId:'0,0',team:[]},roster,now);
    expect(deploymentBlock(recalled,roster[0])).toContain('20%');
  });
  it('all casualties return to rest and a failed invasion preserves both sides damage', () => {
    const s=fresh(); center(s).guards=[{id:'boss',level:50,element:'wood'}];
    const lost=act(s,'p',{type:'claim',tileId:'0,0',team},roster,now);
    expect(lost.lastBattle!.won).toBe(false); expect(lost.energy).toBe(38);
    expect(team.every(id=>health(lost.units[id])===0)).toBe(true);
    expect(health(center(lost).guards[0])).toBeLessThan(maxHealth(center(lost).guards[0]));
    expect(lost.tiles.every(t=>!t.owner)).toBe(true);
  });
});
describe('serialized unit-level garrison intents', () => {
  it('rejects a stale quoted cost without spending energy', () => {
    const s=fresh();expect(()=>act(s,'p',{type:'claim',tileId:'0,0',team,expectedCost:30},roster,now)).toThrow('費用已變更');expect(s.energy).toBe(50);
  });
  it('does not resurrect a unit withdrawn by another tab, and keeps orphan withdrawal available', () => {
    const s=capture(),first=act(s,'p',{type:'recall',tileId:'0,0',unitId:'c0'},roster,now);
    const second=act(first,'p',{type:'recall',tileId:'0,0',unitId:'c1'},roster,now);
    expect(center(second).guards.map(g=>g.id)).toEqual(['c2','c3','c4']);
    expect(()=>act(second,'p',{type:'recall',tileId:'0,0',unitId:'c0'},roster,now)).toThrow('已不在');
    const orphan=act(second,'p',{type:'recall',tileId:'0,0',unitId:'c2'},[],now);
    expect(center(orphan).guards.map(g=>g.id)).toEqual(['c3','c4']);expect(orphan.units).toEqual(s.units);
  });
});
describe('delayed protection and resource economy', () => {
  it('has an exact one-hour contested period followed by 24h shield', () => {
    const t=center(capture()); expect(shieldActive(t,now)).toBe(false); expect(shieldActive(t,now+SHIELD_DELAY_MS-1)).toBe(false);
    expect(shieldActive(t,now+SHIELD_DELAY_MS)).toBe(true); expect(shieldActive(t,now+SHIELD_DELAY_MS+SHIELD_MS-1)).toBe(true); expect(shieldActive(t,now+SHIELD_DELAY_MS+SHIELD_MS)).toBe(false);
  });
  it('produces only while garrisoned, and never credits empty time on reinforcement', () => {
    const s=capture(); center(s).facility=null; const hour=advanceConquest(s,now+3600000);
    expect(hour.inventory.herbs).toBe(3);
    const empty=act(hour,'p',{type:'reinforce',tileId:'0,0',team:[]},roster,now+3600000);
    const returned=act(empty,'p',{type:'reinforce',tileId:'0,0',team:['c1']},roster,now+7200000);
    expect(returned.inventory.herbs).toBe(3); expect(advanceConquest(returned,now+10800000).inventory.herbs).toBe(6);
  });
  it('knowledge grants bounded correct-answer energy only with living garrisons and remains deduplicated', () => {
    const s=fresh();for(let i=0;i<4;i++){s.tiles[i].facility='knowledge';s.tiles[i].owner='p';s.tiles[i].guards=[roster[i]];}
    expect(knowledgeBonus(s)).toBe(6);const credited=creditAnswer(s,'question',true);expect(credited.energy).toBe(66);expect(creditAnswer(credited,'question',true)).toBe(credited);
    s.tiles.slice(0,4).forEach(t=>t.guards=[]);expect(knowledgeBonus(s)).toBe(0);expect(creditAnswer(s,'wrong',false).energy).toBe(52);
  });
  it('applies terrain, resource and knowledge yields with finite caps', () => {
    const s=capture(),t=center(s); t.terrain='river'; t.facility='resource'; expect(production(t)).toEqual({herbs:0,spring:4});
    t.facility='knowledge'; expect(production(t)).toEqual({herbs:0,spring:3});
    expect(advanceConquest(s,now+100*3600000).inventory.spring).toBe(200);
  });
  it('crafts exact recipes, rejects insufficient materials and does not consume inputs on failure', () => {
    const s=fresh(); expect(()=>act(s,'p',{type:'craft',remedy:'potion'},roster,now)).toThrow('材料不足');
    s.inventory.herbs=8;s.inventory.spring=2;
    const first=act(s,'p',{type:'craft',remedy:'bandage'},roster,now),second=act(first,'p',{type:'craft',remedy:'potion'},roster,now);
    expect(second.inventory).toEqual({herbs:0,spring:0,bandage:1,potion:1}); expect(s.inventory.herbs).toBe(8);
    const capped={...s,inventory:{...s.inventory,bandage:99}};expect(()=>act(capped,'p',{type:'craft',remedy:'bandage'},roster,now)).toThrow('上限');
  });
  it('treats fallen and stationed units, caps HP, and does not waste a remedy at full health', () => {
    const s=fresh();s.units.c0={...roster[0],hp:0};s.inventory.bandage=1;s.inventory.potion=2;
    const healed=act(s,'p',{type:'heal',unitId:'c0',remedy:'bandage'},roster,now); expect(health(healed.units.c0)).toBe(42); expect(healed.inventory.bandage).toBe(0);
    const more=act(healed,'p',{type:'heal',unitId:'c0',remedy:'potion'},roster,now),full=act(more,'p',{type:'heal',unitId:'c0',remedy:'potion'},roster,now);
    expect(health(full.units.c0)).toBe(140); expect(()=>act(full,'p',{type:'heal',unitId:'c0',remedy:'potion'},roster,now)).toThrow('血量已滿');
    const stationed=capture(); stationed.inventory.bandage=1; const treated=act(stationed,'p',{type:'heal',unitId:'c0',remedy:'bandage'},roster,now);
    expect(health(center(treated).guards[0])).toBe(health(treated.units.c0)); expect(center(treated).shieldStartsAt).toBe(center(stationed).shieldStartsAt);
  });
  it('settles old-season production only until midnight and keeps wounds/inventory after releasing garrisons', () => {
    const boundary=Date.UTC(2026,10,30,16),s=createConquest('season-2026-11',boundary-3600000);
    s.units.c0={...roster[0],hp:0};s.units.c1={...roster[1],hp:140};center(s).owner='p';center(s).guards=[s.units.c1];center(s).facility=null;s.energy=9;s.inventory.potion=1;
    const next=ensureSeason(s,boundary+7200000);
    expect(next.season).toBe('season-2026-12');expect(next.energy).toBe(50);expect(next.tiles.every(t=>!t.owner)).toBe(true);
    expect(next.inventory.herbs).toBe(3);expect(next.inventory.potion).toBe(1);expect(health(next.units.c0)).toBeCloseTo(126);
  });
});
describe('authoritative receipts and validated saves', () => {
  it('records damage equal to HP lost, never attacks from a fallen source, and never mutates input', () => {
    const s=fresh(),before=JSON.stringify(s),result=battleResult(roster.slice(0,5),center(s),0,0),hp=new Map<string,number>();
    result.initialAttackers.forEach(g=>hp.set(`-1:${g.id}`,health(g)));result.initialDefenders.forEach(g=>hp.set(`1:${g.id}`,health(g)));
    for(const e of result.events){expect(hp.get(`${e.side}:${e.source}`)).toBeGreaterThan(0);const key=`${-e.side}:${e.target}`;expect(e.hp).toBeCloseTo(hp.get(key)!-e.damage);hp.set(key,e.hp);}
    expect(JSON.stringify(s)).toBe(before);
  });
  it('round-trips health, inventories and assignment without restoring a stale battle', () => {
    const s=capture(),parsed=parseConquest(JSON.stringify(s),'p');expect(parsed.units).toEqual(s.units);expect(parsed.inventory).toEqual(s.inventory);expect(center(parsed).guards).toEqual(center(s).guards);expect(parsed.lastBattle).toBeNull();
  });
  it.each(['inventory','duplicate','hp','owner'])('rejects corrupt %s saves', kind => {
    const s=capture();if(kind==='inventory')s.inventory.herbs=-1;if(kind==='duplicate') {s.tiles[0].owner='p';s.tiles[0].guards=[s.units.c0];}if(kind==='hp')s.units.c0.hp=-1;if(kind==='owner')center(s).owner='another-profile';
    expect(()=>parseConquest(JSON.stringify(s),'p')).toThrow('存檔');
  });
});
