import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createCloudApi } from '../../server/cloud.mjs';
import { createAppServer } from '../../server.mjs';
import { provisionChildAccount } from '../../server/child-account.mjs';
import { PLAYERS } from '../../build/game.mjs';
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite('independent child provisioning (real PostgreSQL)', () => {
  let api, server, url, before, result, client;
  const identity = {username:'childtest_'+randomUUID().slice(0,8),password:'0073',displayName:'Synthetic grade four',grade:4};
  async function snapshot(exclude) {
    return (await api.pool.query(`SELECT a.id, to_jsonb(a) AS account, to_jsonb(g) AS state,
      (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) FROM player_logins m WHERE m.account_id=a.id) AS members
      FROM accounts a LEFT JOIN game_states g ON g.account_id=a.id WHERE a.id <> $1 ORDER BY a.id`,[exclude??'00000000-0000-0000-0000-000000000000'])).rows;
  }
  async function call(path, body, session) {
    const response=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,
      ...(body===undefined?{}:{'Content-Type':'application/json'}),...(session?{Cookie:session.cookie,'X-CSRF-Token':session.data.csrf}:{})},
      body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  beforeAll(async()=>{
    api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});
    server=createAppServer({api}); await new Promise(r=>server.listen(0,'127.0.0.1',r));
    url=`http://127.0.0.1:${server.address().port}`;
    await api.pool.query('DELETE FROM request_limits');
    const owner=await call('register',{username:identity.username+'_owner',password:'synthetic-parent-long-password'});
    expect(owner.status).toBe(200);
    before=await snapshot();
  },30000);
  afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
  it('creates a separate grade four child without changing any existing account or game state',async()=>{
    result=await provisionChildAccount(api.pool,identity);
    expect(result.created).toBe(true);
    expect(PLAYERS.find(p=>p.id===result.playerId).grade).toBe(4);
    expect(await snapshot(result.accountId)).toEqual(before);
    client=await call('login',{username:identity.username.toUpperCase(),password:identity.password});
    expect(client.status).toBe(200);
    expect(client.data.displayName).toBe(identity.displayName);
    expect(client.data.playerId).toBe('quintus');
    expect(client.data.canMigrate).toBe(false);
    expect(client.data.family.profiles.quintus.onboarding).toEqual({pet:null,confirmed:false});
    expect(Object.values(client.data.verified).every(x=>x===0)).toBe(true);
  },30000);
  it('retries without resetting progress, changing hashes or invalidating sessions',async()=>{
    await api.pool.query("UPDATE game_states SET legacy_archive=$2 WHERE account_id=$1",[result.accountId,{preserve:'existing history'}]);
    const all=await snapshot();
    expect(await provisionChildAccount(api.pool,identity)).toEqual({...result,created:false});
    expect(await snapshot()).toEqual(all);
    expect((await call('state',undefined,client)).status).toBe(200);
  },30000);
  it('rejects identity, grade, password and household collisions without partial inserts',async()=>{
    const all=await snapshot();
    for(const changed of [{displayName:'Another child'},{grade:2},{password:'0074'},{username:identity.username+'_owner'}]) {
      await expect(provisionChildAccount(api.pool,{...identity,...changed})).rejects.toThrow();
    }
    await expect(provisionChildAccount(api.pool,{...identity,password:73})).rejects.toThrow();
    expect(await snapshot()).toEqual(all);
  },30000);
  it('denies sibling commands, migration and parent recovery while keeping onboarding untouched',async()=>{
    const all=await snapshot();
    expect((await call('command',{id:randomUUID(),revision:0,command:{type:'home-decor',player:'feifei',action:'open'}},client)).status).toBe(403);
    expect((await call('migrate',{id:randomUUID(),revision:0,snapshot:client.data.family},client)).status).toBe(403);
    expect((await call('recovery-code',{password:identity.password},client)).status).toBe(403);
    expect(await snapshot()).toEqual(all);
  });
  it('creates grade-six child, preserves other accounts, and supports leading-zero authentication',async()=>{
    const otherBefore=await snapshot();
    // Simulate the three legacy table checks before a restart migration.
    for(const table of ['player_logins','presence_leases','player_last_seen']) {
      await api.pool.query(`ALTER TABLE ${table} DROP CONSTRAINT ${table}_player_id_check`);
      await api.pool.query(`ALTER TABLE ${table} ADD CONSTRAINT ${table}_player_id_check CHECK(player_id IN ('quintus','doudou','qingqing','feifei'))`);
    }
    const migrated=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});await migrated.close();
    expect(await snapshot()).toEqual(otherBefore);
    const identity6={username:'grade6_'+randomUUID().slice(0,8),password:'0032',displayName:'Synthetic grade six',grade:6};
    const created=await provisionChildAccount(api.pool,identity6);
    expect(created.playerId).toBe('alston');expect(await snapshot(created.accountId)).toEqual(otherBefore);
    const logged=await call('login',{username:identity6.username.toUpperCase(),password:identity6.password});
    expect(logged.status).toBe(200);expect(logged.data.playerId).toBe('alston');
    expect(logged.data.family.profiles.alston.onboarding).toEqual({pet:null,confirmed:false});
    const current=await snapshot();expect((await provisionChildAccount(api.pool,identity6)).created).toBe(false);expect(await snapshot()).toEqual(current);
    expect((await call('command',{id:randomUUID(),revision:0,command:{type:'home-decor',player:'quintus',action:'open'}},logged)).status).toBe(403);
  },30000);

  it('provisions grade five after legacy checks, connects only new-old friendships and preserves all prior states',async()=>{
    for(const table of ['player_logins','presence_leases','player_last_seen']) {
      await api.pool.query(`ALTER TABLE ${table} DROP CONSTRAINT ${table}_player_id_check`);
      await api.pool.query(`ALTER TABLE ${table} ADD CONSTRAINT ${table}_player_id_check CHECK(player_id IN ('quintus','doudou','qingqing','feifei','alston'))`);
    }
    const beforeFive=await snapshot();const migrated=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});await migrated.close();expect(await snapshot()).toEqual(beforeFive);
    const identity5={username:'grade5_'+randomUUID().slice(0,8),password:'0039',displayName:'Synthetic grade five',grade:5};
    const result5=await provisionChildAccount(api.pool,identity5);expect(result5.playerId).toBe('jay');expect(await snapshot(result5.accountId)).toEqual(beforeFive);
    const five=await call('login',{username:identity5.username.toUpperCase(),password:identity5.password});expect(five.status).toBe(200);expect(five.data.playerId).toBe('jay');expect(five.data.family.profiles.jay.onboarding).toEqual({pet:null,confirmed:false});
    expect((await call('command',{id:randomUUID(),revision:0,command:{type:'home-decor',player:'alston',action:'open'}},five)).status).toBe(403);
    const {connectCurrentPlayers}=await import('../../server/player-friends.mjs');
    const others=(await api.pool.query('SELECT id FROM player_logins WHERE id<>$1',[result5.memberId])).rows;
    const oldEdges=(await api.pool.query('SELECT * FROM player_friendships ORDER BY member_id,friend_id')).rows;
    const preserved=await snapshot();
    for(const other of others)expect((await connectCurrentPlayers(api.pool,[result5.memberId,other.id])).added).toBe(2);
    for(const other of others)expect((await connectCurrentPlayers(api.pool,[result5.memberId,other.id])).added).toBe(0);
    expect((await api.pool.query('SELECT * FROM player_friendships WHERE member_id<>$1 AND friend_id<>$1 ORDER BY member_id,friend_id',[result5.memberId])).rows).toEqual(oldEdges);
    expect(await snapshot()).toEqual(preserved);expect((await provisionChildAccount(api.pool,identity5)).created).toBe(false);expect(await snapshot()).toEqual(preserved);
  },30000);

});
