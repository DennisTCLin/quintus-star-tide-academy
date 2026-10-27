import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createCloudApi } from '../../server/cloud.mjs';
import { createAppServer } from '../../server.mjs';
import { provisionPlayerLogins } from '../../server/player-logins.mjs';
import { backfillPresenceHistory, hasAdventureHistory } from '../../server/presence-history.mjs';
import { newFamily, startRun, abandonRun, validateFamily, answerRun, questionById, territoryTransition } from '../../build/game.mjs';

it('recognizes an old practice-only learning record after leaving the voyage',()=>{
  const family=newFamily(),player='feifei';
  startRun(family,player,'math','history-practice',1,true,'2026-10-24');
  const q=questionById(family.profiles[player].run.questions[0]);
  answerRun(family,player,'history-practice',0,(q.answer+1)%q.options.length,'2026-10-24');
  abandonRun(family,player,'history-practice');
  const profile=validateFamily(family).profiles[player];
  expect(profile.learning.skills.add.answered).toBe(1);
  expect(profile.run).toBeNull();
  expect(profile.attempted).toEqual([]);
  expect(hasAdventureHistory(profile)).toBe(true);
});

it('recognizes retained collection history even if old inventory and collection dates were restored',()=>{
  const family=newFamily();
  expect(hasAdventureHistory(family.profiles.feifei)).toBe(false);
  family.profiles.feifei.firstAcquired.pebblefin=null;
  const profile=validateFamily(family).profiles.feifei;
  expect(profile.owned).toEqual({tideglow:1});
  expect(hasAdventureHistory(profile)).toBe(true);
});

it('recognizes a previously started territory without using its settlement time as a login time',()=>{
  const family=newFamily(),profile=family.profiles.feifei;
  profile.territory=territoryTransition(undefined,{action:'start'},1000,profile.owned);
  expect(hasAdventureHistory(validateFamily(family).profiles.feifei)).toBe(true);
});

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite('historical player presence (real PostgreSQL)', () => {
  let api, server, url, owner, accountId, members;
  async function open() {
    api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});
    server=createAppServer({api}); await new Promise(r=>server.listen(0,'127.0.0.1',r));
    url=`http://127.0.0.1:${server.address().port}`;
  }
  async function close() {await new Promise(r=>server.close(r));await api.close();}
  async function call(path,body,client=owner) {
    const r=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(client?{Cookie:client.cookie,'X-CSRF-Token':client.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    const data=await r.json();return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0],csrf:data.csrf};
  }
  const history=async()=> (await api.pool.query('SELECT player_id,seen_at FROM player_last_seen WHERE account_id=$1 ORDER BY player_id',[accountId])).rows;
  const snapshot=async()=>JSON.stringify((await api.pool.query('SELECT * FROM game_states WHERE account_id=$1',[accountId])).rows);
  const friends=async()=>{const r=await call('friends');expect(r.status).toBe(200);return r.data.friends;};
  const login=async()=>call('login',{username:members[1].username,password:'0042'},null);
  async function patchProfile(fn) {
    const state=(await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[accountId])).rows[0].family;
    fn(state.profiles.feifei);await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[accountId,state]);
  }
  beforeAll(open);
  beforeEach(async()=>{
    await api.pool.query('DELETE FROM request_limits');
    const name='history_'+randomUUID().slice(0,12).replaceAll('-','');
    owner=await call('register',{username:name,password:'isolated-history-test-password'},null);expect(owner.status).toBe(200);
    accountId=(await api.pool.query('SELECT id FROM accounts WHERE username=$1',[name])).rows[0].id;
    members=['quintus','feifei','qingqing','doudou'].map((playerId,i)=>({playerId,username:name+'_'+i,password:'0042',displayName:'Test '+i}));
    await provisionPlayerLogins(api.pool,accountId,members);
  });
  afterAll(close);

  it('backfills exact player login and matching draw times, without creating online state or changing saves',async()=>{
    const client=await login();expect(client.status).toBe(200);
    const loginAt=new Date(Date.now()-7200000),drawAt=new Date(Date.now()-3600000),receipt=randomUUID();
    await api.pool.query('UPDATE sessions SET created_at=$2 WHERE csrf=$1',[client.csrf,loginAt]);
    await api.pool.query('DELETE FROM player_last_seen WHERE account_id=$1',[accountId]);
    await patchProfile(p=>{p.owned.pebblefin=1;p.firstAcquired.pebblefin=null;p.lastDraw={id:receipt,pet:'pebblefin',duplicate:false,copies:1};});
    await api.pool.query('INSERT INTO command_receipts(account_id,command_id,payload_hash,result,created_at) VALUES($1,$2,$3,$4,$5)',[accountId,randomUUID(),'fixture',JSON.stringify({kind:'pet',pet:'pebblefin',receiptId:receipt}),drawAt]);
    const before=await snapshot();await close();await open();
    expect(await history()).toEqual([{player_id:'feifei',seen_at:drawAt}]);
    expect((await friends()).every(f=>f.onlineUntil===null)).toBe(true);
    expect(await snapshot()).toBe(before);
    const first=await history();await backfillPresenceHistory(api.pool);expect(await history()).toEqual(first);
    await api.pool.query("UPDATE player_last_seen SET seen_at=$2 WHERE account_id=$1",[accountId,new Date(drawAt.getTime()+10000)]);
    await backfillPresenceHistory(api.pool);expect((await history())[0].seen_at.getTime()).toBe(drawAt.getTime()+10000);
    await api.pool.query('DELETE FROM sessions WHERE csrf=$1',[client.csrf]);await close();await open();
    expect((await history())[0].seen_at.getTime()).toBe(drawAt.getTime()+10000);
  });

  it('can recover a retained member login alone, including expired sessions, without marking anyone online',async()=>{
    const client=await login(),at=new Date(Date.now()-86400000);
    await api.pool.query("UPDATE sessions SET created_at=$2,expires_at=now()-interval '1 second' WHERE csrf=$1",[client.csrf,at]);
    await api.pool.query('DELETE FROM player_last_seen WHERE account_id=$1',[accountId]);
    await backfillPresenceHistory(api.pool);
    expect(await history()).toEqual([{player_id:'feifei',seen_at:at}]);
    expect((await friends()).every(f=>f.onlineUntil===null)).toBe(true);
  });

  it('does not attribute parent sessions or another household receipt to a player',async()=>{
    const receipt=randomUUID();
    const other=await call('register',{username:'history_other_'+randomUUID().slice(0,8),password:'test-only-other-password'},null);
    const otherId=(await api.pool.query('SELECT account_id FROM sessions WHERE csrf=$1',[other.csrf])).rows[0].account_id;
    await patchProfile(p=>{p.owned.pebblefin=1;p.firstAcquired.pebblefin=null;p.lastDraw={id:receipt,pet:'pebblefin',duplicate:false,copies:1};});
    await api.pool.query('INSERT INTO command_receipts(account_id,command_id,payload_hash,result) VALUES($1,$2,$3,$4)',[otherId,randomUUID(),'fixture',JSON.stringify({kind:'pet',pet:'pebblefin',receiptId:receipt})]);
    await backfillPresenceHistory(api.pool);expect(await history()).toEqual([]);
    const f=(await friends()).find(f=>f.id==='feifei');expect(f).toMatchObject({lastSeenAt:null,onlineUntil:null,hasActivity:true});
  });

  it('distinguishes old progress with unknown time from starter defaults; never uses family save time or collection dates',async()=>{
    expect((await friends()).every(f=>!f.hasActivity&&f.lastSeenAt===null)).toBe(true);
    await patchProfile(p=>{p.owned.pebblefin=1;p.firstAcquired.pebblefin='2020-01-02';});
    await backfillPresenceHistory(api.pool);
    expect((await friends()).find(f=>f.id==='feifei')).toMatchObject({lastSeenAt:null,onlineUntil:null,hasActivity:true});
    expect(await history()).toEqual([]);
  });

  it('records successful member login durably but ignores failed authentication and parent login identity',async()=>{
    expect(await history()).toEqual([]);
    expect((await call('login',{username:members[1].username,password:'wrong'},null)).status).toBe(401);
    expect(await history()).toEqual([]);
    const before=await snapshot(),client=await login();expect(client.status).toBe(200);
    expect((await history()).map(h=>h.player_id)).toEqual(['feifei']);
    expect((await friends()).every(f=>f.onlineUntil===null)).toBe(true);
    expect(await snapshot()).toBe(before);
    await call('logout',{},client);expect((await history()).map(h=>h.player_id)).toEqual(['feifei']);
  });

  it('records only the acting player after valid commands; receipt replay cannot repeat rewards or rewrite saves',async()=>{
    const command={id:randomUUID(),revision:0,command:{type:'starter-draw',player:'feifei'}};
    const result=await call('command',command);expect(result.status).toBe(200);
    expect((await history()).map(h=>h.player_id)).toEqual(['feifei']);
    expect((await friends()).every(f=>f.onlineUntil===null)).toBe(true);
    const before=await snapshot();
    await api.pool.query("UPDATE player_last_seen SET seen_at=now()-interval '1 hour' WHERE account_id=$1",[accountId]);
    const replay=await call('command',command);expect(replay.status).toBe(200);expect(replay.data.replayed).toBe(true);
    expect(replay.data.result).toEqual(result.data.result);expect(await snapshot()).toBe(before);
    expect((await history())[0].seen_at.getTime()).toBeGreaterThan(Date.now()-30000);
    const at=(await history())[0].seen_at;
    expect((await call('command',{...command,command:{...command.command,player:'quintus'}})).status).toBe(409);
    expect(await history()).toEqual([{player_id:'feifei',seen_at:at}]);
  });

  it('does not add history for failed commands or unauthorized cross-player requests',async()=>{
    expect((await call('command',{id:randomUUID(),revision:0,command:{type:'equip',player:'feifei',pet:'invalid'}})).status).toBe(400);
    expect(await history()).toEqual([]);
    const client=await login();await api.pool.query('DELETE FROM player_last_seen WHERE account_id=$1',[accountId]);
    expect((await call('command',{id:randomUUID(),revision:0,command:{type:'starter-draw',player:'quintus'}},client)).status).toBe(403);
    expect(await history()).toEqual([]);
  });
});
