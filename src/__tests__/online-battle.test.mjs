import { beforeAll,afterAll,beforeEach,describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createCloudApi } from '../../server/cloud.mjs';
import { createAppServer } from '../../server.mjs';
import { connectCurrentPlayers } from '../../server/player-friends.mjs';
import { passwordHash } from '../../server/credentials.mjs';
import { newFamily } from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('server-owned online friend battles',()=>{
 let api,server,url,players,clients,pet,baseline;
 async function call(path,body,client,extra={}) {
  const r=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(client?{Cookie:client.cookie,'X-CSRF-Token':client.csrf}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await r.json();return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0],csrf:data.csrf};
 }
 const beat=(i,extra={})=>call('presence',{player:'quintus',clientId:randomUUID(),sequence:1,active:true,activity:'learning',...extra},clients[i]);
 const read=i=>call('online-battle?player=quintus',undefined,clients[i]);
 const action=(i,action,room,extra={})=>call('online-battle',{player:'quintus',action,commandId:randomUUID(),...(room?{room:room.id,revision:room.revision}:{}),...extra},clients[i]);
 const invite=async()=>{const r=await action(0,'invite',null,{friend:players[1].member,pet});expect(r.status).toBe(200);return r.data.room;};
 const accept=async()=>{const r=await action(1,'accept',await invite(),{pet});expect(r.status).toBe(200);return r.data.room;};
 const progress=async()=>JSON.stringify((await api.pool.query('SELECT account_id,family FROM game_states WHERE account_id=ANY($1::uuid[]) ORDER BY account_id',[players.map(p=>p.account)])).rows);
 beforeAll(async()=>{
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  const hash=await passwordHash('0042',undefined,4),prefix='online_'+randomUUID().slice(0,8);players=[];clients=[];
  for(let i=0;i<3;i++){
   const p={member:randomUUID(),account:randomUUID(),username:prefix+'_'+i};players.push(p);
   const family=newFamily();pet=family.profiles.quintus.equipped;
   await api.pool.query('INSERT INTO accounts(id,username,password_hash,recovery_hash) VALUES($1,$2,$3,$4)',[p.account,p.username,hash,'0'.repeat(64)]);
   await api.pool.query('INSERT INTO game_states(account_id,family,verified) VALUES($1,$2,$3)',[p.account,family,{}]);
   await api.pool.query("INSERT INTO player_logins(id,account_id,username,password_hash,player_id,display_name) VALUES($1,$2,$3,$4,'quintus',$5)",[p.member,p.account,p.username,hash,'Player '+i]);
   clients.push(await call('login',{username:p.username,password:'0042'}));expect(clients[i].status).toBe(200);
  }
  await connectCurrentPlayers(api.pool,players.slice(0,2).map(p=>p.member));baseline=await progress();
 },30000);
 beforeEach(async()=>{
  await api.pool.query('DELETE FROM online_battles WHERE host=ANY($1::uuid[]) OR guest=ANY($1::uuid[])',[players.map(p=>p.member)]);
  await api.pool.query('DELETE FROM request_limits');await beat(0);await beat(1);
 });
 afterAll(async()=>{
  if(server)await new Promise(r=>server.close(r));
  if(api&&players){const ids=players.map(p=>p.account);await api.pool.query('DELETE FROM sessions WHERE account_id=ANY($1::uuid[])',[ids]);await api.pool.query('DELETE FROM player_logins WHERE account_id=ANY($1::uuid[])',[ids]);await api.pool.query('DELETE FROM game_states WHERE account_id=ANY($1::uuid[])',[ids]);await api.pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[ids]);}
  await api?.close();
 });
 it('uses member identity across same-slot accounts; shows only live allowlisted activity',async()=>{
  let s=(await call('friends',undefined,clients[1])).data;
  expect(s.friends.find(f=>f.key===players[0].member).activity).toBe('learning');
  expect((await beat(0,{activity:'secret free text'})).status).toBe(400);
  expect((await beat(0,{player:'feifei'})).status).toBe(403);
  await api.pool.query("UPDATE presence_leases SET seen_at=now()-interval '40 seconds' WHERE token_hash IN (SELECT token_hash FROM sessions WHERE account_id=$1)",[players[0].account]);
  s=(await call('friends',undefined,clients[1])).data;expect(s.friends.find(f=>f.key===players[0].member).activity).toBe(null);
 });
 it('requires login, CSRF, player scope, explicit friend and live recipient',async()=>{
  expect((await call('online-battle?player=quintus')).status).toBe(401);
  expect((await action(0,'invite',null,{friend:players[2].member,pet})).status).toBe(403);
  expect((await action(0,'invite',null,{friend:players[1].member,pet,player:'feifei'})).status).toBe(403);
  expect((await call('online-battle',{player:'quintus',action:'invite',commandId:randomUUID(),friend:players[1].member,pet},clients[0],{'X-CSRF-Token':'wrong'})).status).toBe(403);
  await api.pool.query("UPDATE presence_leases SET active=false WHERE token_hash IN (SELECT token_hash FROM sessions WHERE account_id=$1)",[players[1].account]);
  expect((await action(0,'invite',null,{friend:players[1].member,pet})).status).toBe(409);
 });
 it('never accepts client stats, unowned pets, self acceptance or outsiders',async()=>{
  expect((await action(0,'invite',null,{friend:players[1].member,pet:'not-owned'})).status).toBe(400);
  const room=await invite();
  expect((await action(0,'accept',room,{pet})).status).toBe(409);
  expect((await action(2,'accept',room,{pet})).status).toBe(404);
  expect((await action(1,'accept',room,{pet:'not-owned'})).status).toBe(400);
  expect((await action(1,'accept',room,{pet,stats:{hp:999999}})).status).toBe(400);
  expect((await action(1,'accept',room,{pet})).data.room.battle.teams[0][0].stats.level).toBe(1);
 });
 it('makes invitation retry idempotent and prevents simultaneous crossed invites',async()=>{
  const body={player:'quintus',action:'invite',commandId:randomUUID(),friend:players[1].member,pet};
  const [a,b]=await Promise.all([call('online-battle',body,clients[0]),call('online-battle',body,clients[0])]);
  expect([a.status,b.status]).toEqual([200,200]);expect(a.data.room.id).toBe(b.data.room.id);
  expect((await action(1,'invite',null,{friend:players[0].member,pet})).status).toBe(409);
  expect((await api.pool.query('SELECT count(*) FROM online_battles WHERE host=$1',[players[0].member])).rows[0].count).toBe('1');
 });
 it('enforces turn ownership and revisions; retries cannot attack twice',async()=>{
  const room=await accept(),side=room.battle.turn;
  expect((await action(1-side,'move',room,{move:'attack'})).status).toBe(409);
  expect((await action(side,'move',room,{move:'burst'})).status).toBe(400);
  const body={player:'quintus',action:'move',commandId:randomUUID(),room:room.id,revision:room.revision,move:'attack'};
  const a=await call('online-battle',body,clients[side]),b=await call('online-battle',body,clients[side]);
  expect(a.status).toBe(200);expect(b.status).toBe(200);expect(a.data.room.battle).toEqual(b.data.room.battle);
  expect((await action(side,'move',room,{move:'attack'})).status).toBe(409);
  expect((await call('online-battle',{...body,move:'guard'},clients[side])).status).toBe(409);
  expect((await read(1-side)).data.room.battle).toEqual(a.data.room.battle);
  expect(await progress()).toBe(baseline);
 });
 it('serializes simultaneous moves and exposes no outsider match data',async()=>{
  const room=await accept(),side=room.battle.turn;
  const results=await Promise.all([action(side,'move',room,{move:'attack'}),action(side,'move',room,{move:'guard'})]);
  expect(results.map(r=>r.status).sort()).toEqual([200,409]);expect((await read(2)).data.room).toBe(null);
 });
 it('supports decline, cooldown, cancel and dismiss without rewards changes',async()=>{
  let room=await invite();let declined=await action(1,'decline',room);expect(declined.data.room.status).toBe('declined');
  expect((await action(0,'invite',null,{friend:players[1].member,pet})).status).toBe(429);
  expect((await action(1,'dismiss',declined.data.room)).data.room).toBe(null);
  await api.pool.query("UPDATE online_battles SET created_at=now()-interval '31 seconds'");
  room=await invite();expect((await action(0,'cancel',room)).data.room.status).toBe('cancelled');expect(await progress()).toBe(baseline);
 });
 it('lets both participants acknowledge a terminal result from the same revision',async()=>{
  const active=await accept();
  expect((await action(0,'dismiss',active)).status).toBe(409);
  const ended=(await action(0,'leave',active)).data.room;
  expect((await action(2,'dismiss',ended)).status).toBe(404);
  expect((await action(0,'dismiss',{...ended,revision:ended.revision+1})).status).toBe(409);
  const bodies=[0,1].map(()=>({player:'quintus',action:'dismiss',commandId:randomUUID(),room:ended.id,revision:ended.revision}));
  const results=await Promise.all(bodies.map((body,i)=>call('online-battle',body,clients[i])));
  expect(results.map(r=>r.status)).toEqual([200,200]);
  expect(results.map(r=>r.data.room)).toEqual([null,null]);
  const saved=async()=>(await api.pool.query('SELECT revision,battle,dismissed FROM online_battles WHERE id=$1',[ended.id])).rows[0];
  const before=await saved();
  expect([...before.dismissed].sort()).toEqual(players.slice(0,2).map(p=>p.member).sort());
  expect((await call('online-battle',bodies[1],clients[1])).status).toBe(200);
  expect(await saved()).toEqual(before);
  expect(await progress()).toBe(baseline);
 });
 it('expires unaccepted invites; timed out turns and leave have one result',async()=>{
  let room=await invite();await api.pool.query("UPDATE online_battles SET deadline=now()-interval '1 second' WHERE id=$1",[room.id]);
  expect((await read(1)).data.room.status).toBe('expired');expect((await action(1,'accept',room,{pet})).status).toBe(409);
  await api.pool.query('DELETE FROM online_battles WHERE id=$1',[room.id]);room=await accept();
  const expected=1-room.battle.turn;await api.pool.query("UPDATE online_battles SET deadline=now()-interval '1 second' WHERE id=$1",[room.id]);
  const result=(await read(0)).data.room;expect(result.status).toBe('finished');expect(result.reason).toBe('timeout');expect(result.battle.winner).toBe(expected);
  expect((await action(0,'move',result,{move:'attack'})).status).toBe(409);expect(await progress()).toBe(baseline);
 });
 it('resumes the same room after a new login, then can concede',async()=>{
  const room=await accept();const fresh=await call('login',{username:players[0].username,password:'0042'});
  expect((await call('online-battle?player=quintus',undefined,fresh)).data.room.id).toBe(room.id);
  const ended=await action(0,'leave',room);expect(ended.data.room.battle.winner).toBe(1);expect(ended.data.room.status).toBe('finished');
 });
});
