import { beforeAll,afterAll,beforeEach,afterEach,describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createCloudApi } from '../../server/cloud.mjs';
import { createAppServer } from '../../server.mjs';
import { passwordHash } from '../../server/credentials.mjs';
import { xpForLevel } from '../companion-growth';
import { newFamily,createConquest,enrollConquest,taipeiDay } from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('automatic offline NPC raids in PostgreSQL',()=>{
 let api,server,url,players=[],workers=[],clock;
 const state=async i=>(await api.pool.query('SELECT state FROM conquest_players WHERE id=$1',[players[i].id])).rows[0].state;
 const world=async()=>(await api.pool.query("SELECT * FROM conquest_worlds WHERE id='global'")).rows[0];
 const families=async()=>JSON.stringify((await api.pool.query('SELECT account_id,family FROM game_states ORDER BY account_id')).rows);
 async function worker(){const w=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false,npcRaidsEnabled:true,npcRaidIntervalMs:25});workers.push(w);return w;}
 async function until(check){const end=Date.now()+5000;while(Date.now()<end){if(await check())return;await new Promise(r=>setTimeout(r,20));}throw Error('Timed out waiting for autonomous worker');}
 async function login(i){const p=players[i],r=await fetch(url+'/api/login',{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body:JSON.stringify({username:p.username,password:'0042'})});expect(r.status).toBe(200);return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:(await r.json()).csrf};}
 async function loginRead(i){const client=await login(i);return (await fetch(url+'/api/conquest?player=quintus',{headers:{Cookie:client.cookie}})).json();}
 async function acknowledge(client,ids,extra={},headers={}){const r=await fetch(url+'/api/conquest/reports/read',{method:'POST',headers:{Origin:url,'Content-Type':'application/json',Cookie:client?.cookie??'','X-CSRF-Token':client?.csrf??'',...headers},body:JSON.stringify({player:'quintus',reportIds:ids,...extra})});return {status:r.status,data:await r.json()};}
 async function makeNextDue(){const s=await state(0);s.npcRaids.resolvedAt=Date.now()-6*3600000-1;await api.pool.query('UPDATE conquest_players SET state=$2 WHERE id=$1',[players[0].id,s]);const w=await world();w.tiles.find(t=>t.id==='0,0').battleUntil=0;await api.pool.query("UPDATE conquest_worlds SET tiles=$1 WHERE id='global'",[JSON.stringify(w.tiles)]);}
 beforeAll(async()=>{
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  const hash=await passwordHash('0042',undefined,4);
  for(let i=0;i<2;i++){const p={id:randomUUID(),account:randomUUID(),username:'auto_npc_'+randomUUID().replaceAll('-','').slice(0,12)};players.push(p);
   await api.pool.query('INSERT INTO accounts(id,username,password_hash,recovery_hash) VALUES($1,$2,$3,$4)',[p.account,p.username,hash,'0'.repeat(64)]);
   await api.pool.query('INSERT INTO game_states(account_id,family,verified) VALUES($1,$2,$3)',[p.account,newFamily(),{}]);
   await api.pool.query("INSERT INTO player_logins(id,account_id,username,password_hash,player_id,display_name) VALUES($1,$2,$3,$4,'quintus',$5)",[randomUUID(),p.account,p.username,hash,'NPC test '+i]);
  }
 },30000);
 beforeEach(async()=>{
  await api.pool.query('DELETE FROM request_limits');
  await api.pool.query('TRUNCATE conquest_commands,conquest_players,conquest_worlds,conquest_npc_clock');clock=Date.now();
  const base=createConquest(undefined,clock);
  for(let i=0;i<2;i++){
   const p=players[i],f=newFamily();f.profiles.quintus.owned.aetherdragon=1;f.profiles.quintus.firstAcquired.aetherdragon=taipeiDay();f.profiles.quintus.growth.xp.aetherdragon=xpForLevel(i?1:24);
   await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[p.account,f]);
   const s=enrollConquest(createConquest(undefined,clock),p.id,'light','hero-elf',f.profiles.quintus.owned,clock-660000);
   const unit={id:'aetherdragon',level:i?40:62,element:'water',hp:i?430:650,maxHp:i?860:1300};s.units={aetherdragon:unit};s.inventory={herbs:20,spring:10,bandage:1,potion:1};s.updatedAt=clock+60000;
   const t=base.tiles.find(t=>t.id===(i?'1,0':'0,0'));Object.assign(t,{owner:p.id,guards:[unit],capturedAt:clock-660000,shieldUntil:0,shieldStartsAt:0,battleUntil:0});
   // One owner is protected; neither owner has an HTTP session or presence.
   if(i)t.shieldUntil=clock+3600000;
   const {tiles,lastBattle,...saved}=s;await api.pool.query("INSERT INTO conquest_players(id,account_id,player_id,state) VALUES($1,$2,'quintus',$3)",[p.id,p.account,saved]);
  }
  await api.pool.query("INSERT INTO conquest_worlds(id,season,tiles,updated_at) VALUES('global',$1,$2,$3)",[base.season,JSON.stringify(base.tiles),clock]);
  await api.pool.query('DELETE FROM sessions WHERE account_id=ANY($1::uuid[])',[players.map(p=>p.account)]);
 });
 afterEach(async()=>{await Promise.all(workers.map(w=>w.close()));workers=[];await api.pool.query('DROP TRIGGER IF EXISTS npc_test_fail ON conquest_npc_clock');await api.pool.query('DROP FUNCTION IF EXISTS npc_test_fail()');});
 afterAll(async()=>{await new Promise(r=>server.close(r));for(const table of ['sessions','player_logins','command_receipts','game_states'])await api.pool.query(`DELETE FROM ${table} WHERE account_id=ANY($1::uuid[])`,[players.map(p=>p.account)]);await api.pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[players.map(p=>p.account)]);await api.pool.query('TRUNCATE conquest_worlds,conquest_npc_clock');await api.close();});
 it('attacks without HTTP or sessions, uses latest owner XP and wounds, and exposes private reports after login',async()=>{
  const before=await families();await worker();await until(async()=>!!(await state(0)).raidReports?.length);
  const saved=await state(0),report=saved.raidReports[0];expect(report.defendersBefore[0]).toMatchObject({level:63,hp:660,maxHp:1320});
  expect(saved.npcRaids.wave).toBe(1);expect(report.resolvedAt).toBeGreaterThanOrEqual(clock);expect(saved.units.aetherdragon.hp).toBe(report.defendersAfter[0].hp);
  expect((await state(1)).units.aetherdragon).toMatchObject({level:40,hp:430,maxHp:860});expect((await state(1)).raidReports).toBeUndefined();expect(await families()).toBe(before);
  await Promise.all(workers.map(w=>w.close()));workers=[];
  const own=await loginRead(0),other=await loginRead(1);expect(own.state.raidReports).toEqual(saved.raidReports);expect(other.state.raidReports).toBeUndefined();expect(JSON.stringify(other)).not.toContain(report.id);
  await loginRead(0);expect((await state(0)).raidReports).toEqual(saved.raidReports);expect(await families()).toBe(before);
 });
 it('serializes two replicas and restart, then automatically settles the next due wave exactly once',async()=>{
  await Promise.all([worker(),worker()]);await until(async()=>!!(await state(0)).raidReports?.length);
  await Promise.all(workers.map(w=>w.close()));workers=[];expect((await state(0)).raidReports).toHaveLength(1);
  await worker();await until(async()=>Number((await api.pool.query('SELECT last_tick_at FROM conquest_npc_clock')).rows[0]?.last_tick_at)>clock);await workers.pop().close();expect((await state(0)).raidReports).toHaveLength(1);
  const s=await state(0);s.npcRaids.resolvedAt=Date.now()-6*3600000-1;await api.pool.query('UPDATE conquest_players SET state=$2 WHERE id=$1',[players[0].id,s]);
  const w=await world();w.tiles.find(t=>t.id==='0,0').battleUntil=0;await api.pool.query("UPDATE conquest_worlds SET tiles=$1 WHERE id='global'",[JSON.stringify(w.tiles)]);
  await Promise.all([worker(),worker()]);await until(async()=>(await state(0)).raidReports?.length===2);await Promise.all(workers.map(w=>w.close()));workers=[];
  expect((await state(0)).raidReports.map(r=>r.wave)).toEqual([2,1]);
 });
 it('rolls back wounds, report, resources and world when commit work fails, then retries once',async()=>{
  const s=await state(0),w=await world();await api.pool.query("CREATE FUNCTION npc_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$");await api.pool.query('CREATE TRIGGER npc_test_fail BEFORE INSERT OR UPDATE ON conquest_npc_clock FOR EACH ROW EXECUTE FUNCTION npc_test_fail()');
  await expect(api.conquestNpcTick()).rejects.toThrow('injected failure');expect(await state(0)).toEqual(s);expect(await world()).toEqual(w);
  await api.pool.query('DROP TRIGGER npc_test_fail ON conquest_npc_clock');expect((await api.conquestNpcTick()).raids).toBe(1);expect((await api.conquestNpcTick()).raids).toBe(0);expect((await state(0)).raidReports).toHaveLength(1);
 });
 it('respects active battles, shields and the first ten minutes even with no connected player',async()=>{
  const w=await world(),t=w.tiles.find(t=>t.id==='0,0');t.battleUntil=clock+60000;await api.pool.query("UPDATE conquest_worlds SET tiles=$1 WHERE id='global'",[JSON.stringify(w.tiles)]);expect((await api.conquestNpcTick()).raids).toBe(0);
  t.battleUntil=0;t.capturedAt=clock;await api.pool.query("UPDATE conquest_worlds SET tiles=$1 WHERE id='global'",[JSON.stringify(w.tiles)]);expect((await api.conquestNpcTick()).raids).toBe(0);
  expect((await state(0)).raidReports).toBeUndefined();expect((await state(1)).raidReports).toBeUndefined();
 });
 it('persists owner-private read acknowledgments across login without changing combat or world state',async()=>{
  await api.conquestNpcTick();const before=await state(0),other=await state(1),w=await world(),family=await families(),client=await login(0),id=before.raidReports[0].id;
  const ack=await acknowledge(client,[id]);expect(ack.status).toBe(200);expect(ack.data.raidReadIds).toEqual([id]);
  const after=await state(0);delete after.raidReadIds;delete before.raidReadIds;expect(after).toEqual(before);expect(await state(1)).toEqual(other);expect(await world()).toEqual(w);expect(await families()).toBe(family);
  expect((await api.pool.query('SELECT count(*) FROM conquest_commands')).rows[0].count).toBe('0');
  expect((await loginRead(0)).state.raidReadIds).toEqual([id]);expect((await loginRead(1)).state.raidReadIds).toBeUndefined();
  const second=await login(0);expect((await acknowledge(second,[id])).status).toBe(200);expect((await state(0)).raidReadIds).toEqual([id]);
 });
 it('leaves a concurrently arriving raid unread and merges two-device acknowledgments',async()=>{
  await api.conquestNpcTick();const first=(await state(0)).raidReports[0].id,client=await login(0),secondClient=await login(0);
  await makeNextDue();const [ack,tick]=await Promise.all([acknowledge(client,[first]),api.conquestNpcTick()]);expect(ack.status).toBe(200);expect(tick.raids).toBe(1);
  const s=await state(0),second=s.raidReports[0].id;expect(s.raidReports).toHaveLength(2);expect(s.raidReadIds).toEqual([first]);
  const results=await Promise.all([acknowledge(client,[first]),acknowledge(secondClient,[second])]);expect(results.map(r=>r.status)).toEqual([200,200]);expect(new Set((await state(0)).raidReadIds)).toEqual(new Set([first,second]));
  await acknowledge(client,[first]);expect((await state(0)).raidReadIds).toHaveLength(2);
 });
 it('rejects unauthenticated, CSRF, cross-profile and malformed acknowledgments; foreign IDs have no effect',async()=>{
  await api.conquestNpcTick();const id=(await state(0)).raidReports[0].id,a=await login(0),b=await login(1);
  expect((await acknowledge(null,[id])).status).toBe(401);expect((await acknowledge(a,[id],{}, {'X-CSRF-Token':'wrong'})).status).toBe(403);
  expect((await acknowledge(a,[id],{player:'feifei'})).status).toBe(403);expect((await acknowledge(a,[id],{owner:players[1].id})).status).toBe(400);
  for(const ids of [[],Array(31).fill(id),[null],['x'.repeat(201)],'all'])expect((await acknowledge(a,ids)).status).toBe(400);
  expect((await acknowledge(b,[id])).status).toBe(200);expect((await state(1)).raidReadIds).toEqual([]);expect((await state(0)).raidReadIds??[]).toEqual([]);
 });

 it('does not trigger season rollover or world writes when marking a previous-season report read',async()=>{
  await api.conquestNpcTick();const id=(await state(0)).raidReports[0].id,client=await login(0);
  await api.pool.query("UPDATE conquest_worlds SET season='season-2020-01'");
  await api.pool.query("UPDATE conquest_players SET state=jsonb_set(state,'{season}','\"season-2020-01\"'::jsonb)");
  const w=await world(),before=await state(0),other=await state(1);
  expect((await acknowledge(client,[id])).status).toBe(200);
  const after=await state(0);delete after.raidReadIds;delete before.raidReadIds;expect(after).toEqual(before);expect(await world()).toEqual(w);expect(await state(1)).toEqual(other);
 });

 it('occupies a defeated island durably, withdraws wounded player guards and lets a player reclaim it',async()=>{
  const before=await families(),w=await world(),tile=w.tiles.find(t=>t.id==='0,0');
  // No garrison: the same production worker path must perform the capture.
  tile.guards=[];await api.pool.query("UPDATE conquest_worlds SET tiles=$1 WHERE id='global'",[JSON.stringify(w.tiles)]);
  expect((await api.conquestNpcTick()).raids).toBe(1);
  const saved=await state(0),captured=(await world()).tiles.find(t=>t.id==='0,0');
  expect(captured.owner).toBe('dark-tide');expect(captured.guards.length).toBeGreaterThan(0);
  expect(captured.shieldUntil).toBe(0);expect(captured.commander).toBeUndefined();
  expect(saved.raidReports[0]).toMatchObject({captured:true,defended:false});
  const snapshot=await loginRead(0);expect(snapshot.state.tiles.find(t=>t.id==='0,0').ownerInfo.name).toBe('黯潮軍團');
  expect(snapshot.players.some(p=>p.id==='dark-tide')).toBe(false);
  expect((await api.conquestNpcTick()).raids).toBe(0);expect((await world()).tiles.find(t=>t.id==='0,0').owner).toBe('dark-tide');
  const owned=await world();owned.tiles.find(t=>t.id==='0,0').battleUntil=0;
  await api.pool.query("UPDATE conquest_worlds SET tiles=$1 WHERE id='global'",[JSON.stringify(owned.tiles)]);
  const current=await state(0);current.energy=1000;await api.pool.query('UPDATE conquest_players SET state=$2 WHERE id=$1',[players[0].id,current]);
  const client=await login(0),view=await loginRead(0),commandId=randomUUID();
  const command={player:'quintus',type:'claim',tileId:'0,0',team:['aetherdragon','tideglow','kelpcub'],season:view.state.season,revision:view.revision,commandId};
  const send=()=>fetch(url+'/api/conquest',{method:'POST',headers:{Origin:url,'Content-Type':'application/json',Cookie:client.cookie,'X-CSRF-Token':client.csrf},body:JSON.stringify(command)});
  const response=await send(),result=await response.json();expect(response.status,JSON.stringify(result)).toBe(200);
  expect(result.result.state.lastBattle.won).toBe(true);expect(result.state.tiles.find(t=>t.id==='0,0').owner).toBe(players[0].id);
  expect((await (await send()).json()).replayed).toBe(true);expect(await families()).toBe(before);
 });
 it('expands with no enrolled owners, serializes replicas and retains cooldown after all NPC land is reclaimed',async()=>{
  await api.pool.query('TRUNCATE conquest_commands,conquest_players');
  const w=await world();w.tiles.forEach(t=>{t.owner=null;t.guards=t.wild;});
  await api.pool.query("UPDATE conquest_worlds SET tiles=$1 WHERE id='global'",[JSON.stringify(w.tiles)]);
  const before=await families(),ticks=await Promise.all([api.conquestNpcTick(),api.conquestNpcTick()]);
  expect(ticks.map(t=>t.expansions).sort()).toEqual([0,1]);
  const first=await world(),outposts=first.tiles.filter(t=>t.owner==='dark-tide');expect(outposts).toHaveLength(1);
  expect(outposts[0].distance).toBe(5);const revision=Number(first.revision);
  expect((await api.conquestNpcTick()).expansions).toBe(0);expect(Number((await world()).revision)).toBe(revision);
  // Eliminate the outpost without deleting the durable expansion clock.
  first.tiles.find(t=>t.owner==='dark-tide').owner=null;
  await api.pool.query("UPDATE conquest_worlds SET tiles=$1 WHERE id='global'",[JSON.stringify(first.tiles)]);
  expect((await api.conquestNpcTick()).expansions).toBe(0);
  await api.pool.query("UPDATE conquest_npc_clock SET last_expansion_at=$1",[Date.now()-6*3600000-1]);
  expect((await api.conquestNpcTick()).expansions).toBe(1);expect((await world()).tiles.filter(t=>t.owner==='dark-tide')).toHaveLength(1);
  expect(await families()).toBe(before);
 });

});
