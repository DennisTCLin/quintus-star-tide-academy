import { describe,it,expect } from 'vitest';
import { createConquest,ensureSeason } from '../conquest';
import { enrollConquest } from '../conquest-alliance';
import { incomingRaid,nextRaidWindow,resolveNpcRaid,unreadRaidReports,acknowledgeRaidReports,RAID_INTERVAL_MS,RAID_WARNING_MS } from '../conquest-enemy';
import { parseConquest } from '../conquest-store';
import { raidDuration } from '../ConquestRaidCountdown';
const start=Date.UTC(2026,10,5),owner='quintus';
function fixture(){const state=enrollConquest(createConquest(undefined,start),owner,'light','hero-elf',{},start),tile=state.tiles[0];Object.assign(tile,{owner,capturedAt:start,guards:[],shieldUntil:0});return {state,tile};}
function fight(){const {state,tile}=fixture(),now=start+RAID_WARNING_MS,raid=incomingRaid(state,owner,now)!;return {state:resolveNpcRaid(state,owner,raid.id,now),tile,now};}
describe('raid countdown and unread reports',()=>{
 it('shows no countdown without territory or enrollment and the first capture grace otherwise',()=>{
  expect(nextRaidWindow(createConquest(undefined,start),owner,start).at).toBeNull();
  const {state,tile}=fixture();expect(nextRaidWindow(state,owner,start).at).toBe(start+RAID_WARNING_MS);
  tile.capturedAt=start+300000;expect(nextRaidWindow(state,owner,start).at).toBe(start+900000);
  tile.owner='other';expect(nextRaidWindow(state,owner,start).reason).toBe('no-territory');
 });
 it('evaluates future shields at the due time and waits for battle protection',()=>{
  const {state,now}=fight(),tile=state.tiles[0];tile.shieldStartsAt=now+3600000;tile.shieldUntil=now+25*3600000;
  expect(nextRaidWindow(state,owner,now).at).toBe(tile.shieldUntil);
  Object.assign(tile,{battleUntil:tile.shieldUntil+20000});expect(nextRaidWindow(state,owner,now).at).toBe(tile.shieldUntil+20000);
  const at=nextRaidWindow(state,owner,now).at!;expect(incomingRaid(state,owner,at-1)).toBeNull();expect(incomingRaid(state,owner,at)).not.toBeNull();
 });
 it('selects the earliest eligible owned island and agrees with server settlement at exact boundaries',()=>{
  const {state,tile}=fixture();tile.shieldUntil=start+86400000;
  Object.assign(state.tiles[1],{owner,capturedAt:start+300000,guards:[],shieldUntil:0});
  const forecast=nextRaidWindow(state,owner,start);expect(forecast.at).toBe(start+900000);
  expect(incomingRaid(state,owner,forecast.at!-1)).toBeNull();expect(incomingRaid(state,owner,forecast.at!)).not.toBeNull();
  expect(nextRaidWindow(state,owner,forecast.at!).reason).toBe('due');expect(raidDuration(-3000)).toBe('00:00:00');expect(raidDuration(3661001)).toBe('01:01:02');
 });
 it('acknowledges only specified reports and preserves unread later arrivals through season/storage',()=>{
  const {state,now}=fight(),id=state.raidReports![0].id;
  expect(unreadRaidReports(state)).toHaveLength(1);state.raidReadIds=acknowledgeRaidReports(state,[id,'foreign']);expect(unreadRaidReports(state)).toHaveLength(0);
  const raid=incomingRaid(state,owner,now+RAID_INTERVAL_MS)!,next=resolveNpcRaid(state,owner,raid.id,now+RAID_INTERVAL_MS);
  next.raidReadIds=acknowledgeRaidReports(next,[id]);expect(unreadRaidReports(next).map(r=>r.id)).toEqual([raid.id]);
  expect(parseConquest(JSON.stringify(next),owner).raidReadIds).toEqual([id]);expect(ensureSeason(next,Date.UTC(2026,11,1)).raidReadIds).toEqual([id]);
  next.raidReadIds=acknowledgeRaidReports(next,[raid.id]);expect(unreadRaidReports(next)).toHaveLength(0);
 });
 it('prunes read IDs as reports expire without reintroducing old unread notifications',()=>{
  let {state,now}=fight();const old=state.raidReports![0].id;state.raidReadIds=[old];
  for(let i=1;i<=30;i++){const at=now+i*RAID_INTERVAL_MS,raid=incomingRaid(state,owner,at)!;state=resolveNpcRaid(state,owner,raid.id,at);}
  expect(state.raidReports).toHaveLength(30);expect(state.raidReadIds).toEqual([]);expect(unreadRaidReports(state)).toHaveLength(30);
 });
});
