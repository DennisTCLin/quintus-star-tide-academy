import { expect, it } from 'vitest';
import { createConquest, type Companion } from '../conquest';
import { claimGuidance } from '../conquest-presentation';
import { displayConquest, islandDisplayTiles, reportIslandLabel } from '../conquest-names';
import { prepareBattle } from '../conquest-battle';
const now = Date.UTC(2026,10,6), roster: Companion[] = Array.from({length:6},(_,i)=>({id:`c${i}`,name:`Unit${i}`,image:'',element:'water',level:4,loan:true}));
const team=roster.slice(0,3).map(c=>c.id);
const fresh=()=>{const s=createConquest(undefined,now);s.shared=true;s.energy=1000;return s;};
it('gives every island a unique stable name across seasons, ordering, ownership and repeated projection without altering persisted data',()=>{
  for(let month=1;month<=12;month++) {
    const s=createConquest(`season-2026-${String(month).padStart(2,'0')}`,now), before=JSON.stringify(s), view=displayConquest(s);
    expect(new Set(view.tiles.map(t=>t.name)).size).toBe(91);
    expect(displayConquest(view)).toEqual(view);
    const reversed=islandDisplayTiles([...s.tiles].reverse());
    expect(Object.fromEntries(reversed.map(t=>[t.id,t.name]))).toEqual(Object.fromEntries(view.tiles.map(t=>[t.id,t.name])));
    const changed=islandDisplayTiles(s.tiles.map(t=>({...t,owner:'other'})));
    expect(changed.map(t=>t.name)).toEqual(view.tiles.map(t=>t.name));
    expect(view.tiles.map(({name,...t})=>t)).toEqual(s.tiles.map(({name,...t})=>t));
    expect(JSON.stringify(s)).toBe(before);
  }
});
it('reserves existing unique names and handles extreme duplicates without dropping islands',()=>{
 const s=fresh(); s.tiles.forEach(t=>{t.name='Same';t.terrain='plains';});s.tiles[0].name='曙色淺灘';
 const v=displayConquest(s);expect(v.tiles[0].name).toBe('曙色淺灘');expect(new Set(v.tiles.map(t=>t.name)).size).toBe(91);
 expect(displayConquest(v)).toEqual(v);
});
it('maps current reports by ID and preserves cross-season historical names',()=>{
 const s=displayConquest(fresh()),t=s.tiles[0];
 expect(reportIslandLabel(s,{season:s.season,tileId:t.id,tileName:'old'})).toContain(t.name);
 expect(reportIslandLabel(s,{season:'season-2026-01',tileId:t.id,tileName:'old'})).toBe(`old (${t.id})`);
});
it('matches actual preparation for all 91 tiles, including PvP, shield boundaries, battle locks and energy',()=>{
 const s=fresh();s.tiles.find(t=>t.id==='0,0')!.owner='p';
 const enemy=s.tiles.find(t=>t.id==='1,0')!;enemy.owner='enemy';enemy.shieldStartsAt=now+1000;enemy.shieldUntil=now+2000;
 for(const timestamp of [now,now+999,now+1000,now+1999,now+2000])for(const energy of [0,23,24,1000])for(const battleUntil of [0,timestamp+1]){
  s.energy=energy;enemy.battleUntil=battleUntil;
  for(const t of s.tiles){const g=claimGuidance(s,'p',t,team,roster,timestamp);const p=prepareBattle(s,{mode:'claim',player:'p',season:s.season,tileId:t.id},team,roster,'coast',timestamp);
   expect(g.ready,`${t.id}/${timestamp}/${energy}`).toBe(!p.block);expect(g.tileReason??g.teamReason).toBe(p.block);
  }
 }
});
it('allows any target within central radius five regardless of owned islands',()=>{
 const s=fresh(),t=s.tiles.find(t=>t.id==='-2,1')!;expect(claimGuidance(s,'p',t,team,roster,now).ready).toBe(true);
 s.tiles.find(t=>t.id==='1,0')!.owner='p';const g=claimGuidance(s,'p',t,team,roster,now);expect(g).toMatchObject({ready:true,inRangeTarget:true,distance:2,canPrepare:true});expect(g.reason).toBeNull();
});
it('blocks incomplete, duplicate, unavailable and missing teams plus pending/offline states without writes',()=>{
 const s=fresh(),t=s.tiles.find(t=>t.id==='0,0')!,before=JSON.stringify(s);
 for(const ids of [[],team.slice(0,2),roster.map(c=>c.id),['c0','c0','c1'],['c0','c1','missing']])expect(claimGuidance(s,'p',t,ids,roster,now).ready).toBe(false);
 for(const n of [3,5])expect(claimGuidance(s,'p',t,roster.slice(0,n).map(c=>c.id),roster,now).ready).toBe(true);
 expect(claimGuidance(s,'p',t,team,roster,now,true).reason).toContain('等待');
 expect(claimGuidance(s,'p',t,team,roster,now,false,'offline').reason).toBe('offline');expect(JSON.stringify(s)).toBe(before);
 s.tiles[0].owner='p';s.tiles[0].guards=[roster[0]];expect(claimGuidance(s,'p',t,team,roster,now).teamReason).toContain('駐守');
 s.tiles[0].guards=[];s.units.c0={...roster[0],hp:0};expect(claimGuidance(s,'p',t,team,roster,now).teamReason).toContain('倒地');
});
it('treats NPC islands as PvE targets with accurate labels in both shared and local worlds',()=>{
 for(const shared of [true,false])for(const energy of [0,1000])for(const count of [2,3])for(const battleUntil of [0,now+1]) {
  const s=fresh();s.shared=shared;s.energy=energy;s.playerId='p';s.tiles.find(t=>t.id==='0,0')!.owner='p';
  const t=s.tiles.find(t=>t.id==='1,0')!;t.owner='dark-tide';t.battleUntil=battleUntil;t.shieldUntil=0;
  const ids=team.slice(0,count),g=claimGuidance(s,'p',t,ids,roster,now);
  const setup=prepareBattle(s,{mode:'claim',player:'p',season:s.season,tileId:t.id},ids,roster,'coast',now);
  expect(g.ready).toBe(!setup.block);expect(g.label).not.toContain('玩家搶地');
  if(battleUntil>now)expect(g.label).toBe('交戰中');else if(!energy)expect(g.label).toBe('能量不足');else if(count<3)expect(g.label).toBe('隊伍未就緒');else expect(g.label).toBe('可出征');
 }
});

it('allows preparation to repair energy and team blockers but never allows premature combat',()=>{
 const s=fresh(),t=s.tiles[0];s.energy=0;
 expect(claimGuidance(s,'p',t,[],roster,now)).toMatchObject({ready:false,canPrepare:true,energyShortfall:24});
 expect(claimGuidance(s,'p',t,[],roster,now,true).canPrepare).toBe(false);
 expect(claimGuidance(s,'p',t,[],roster,now,false,'offline').canPrepare).toBe(false);
 t.owner='p';expect(claimGuidance(s,'p',t,team,roster,now).canPrepare).toBe(false);
 t.owner=null;t.q=6;t.r=0;t.distance=0;
 expect(claimGuidance(s,'p',t,team,roster,now)).toMatchObject({ready:false,canPrepare:false,inRangeTarget:false,label:'超出五格航域'});
});
