import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createCloudApi } from '../../server/cloud.mjs';
import { createAppServer } from '../../server.mjs';
import { provisionPlayerLogins } from '../../server/player-logins.mjs';
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite('family friends presence (real PostgreSQL)', () => {
  let api, server, url, accountId, owner, other, members, clients;
  const prefix = 'presence_' + randomUUID().slice(0,8);
  const playerIds = ['quintus','feifei','qingqing','doudou'];
  async function open() {
    api = await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});
    server = createAppServer({api});
    await new Promise(r => server.listen(0,'127.0.0.1',r));
    url = `http://127.0.0.1:${server.address().port}`;
  }
  async function close() { await new Promise(r=>server.close(r)); await api.close(); }
  async function call(path, body, client, headers={}) {
    const r=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(client?{Cookie:client.cookie,'X-CSRF-Token':client.csrf}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
    const data=await r.json();return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0],csrf:data.csrf};
  }
  const login = m => call('login',{username:m.username,password:m.password});
  const beat = (c, player, clientId=randomUUID(), sequence=1, active=true) => call('presence',{player,clientId,sequence,active},c);
  const friends = async c => {const r=await call('friends',undefined,c);expect(r.status).toBe(200);return r.data;};
  const isOnline = (data,id) => data.friends.find(f=>f.id===id).onlineUntil > data.serverNow;
  beforeAll(async()=>{
    await open();
    // Each serial integration suite starts with its own rate-limit window.
    await api.pool.query("DELETE FROM request_limits");
    owner=await call('register',{username:prefix,password:'test-only-parent-password'});expect(owner.status).toBe(200);
    other=await call('register',{username:prefix+'_other',password:'test-only-parent-password'});expect(other.status).toBe(200);
    accountId=(await api.pool.query('SELECT id FROM accounts WHERE username=$1',[prefix])).rows[0].id;
    members=playerIds.map((playerId,i)=>({playerId,username:prefix+'_'+i,password:'0042',displayName:'好友 '+i}));
    await provisionPlayerLogins(api.pool,accountId,members);
    clients=[];
    for (const member of members) clients.push(await login(member));
    clients.forEach(c=>expect(c.status).toBe(200));
  },30000);
  beforeEach(async()=>{
    await api.pool.query('DELETE FROM presence_leases WHERE token_hash IN (SELECT token_hash FROM sessions WHERE account_id=$1)',[accountId]);
    await api.pool.query('DELETE FROM player_last_seen WHERE account_id=$1',[accountId]);
    await api.pool.query('DELETE FROM request_limits');
  });
  afterAll(close);
  it('shows all four mutual friends with real display names and no invented history',async()=>{
    const initial=await friends(clients[0]);
    expect(initial.friends).toHaveLength(4);
    expect(initial.friends.every(f=>f.lastSeenAt===null&&f.onlineUntil===null)).toBe(true);
    for(let i=0;i<4;i++) expect((await beat(clients[i],playerIds[i])).status).toBe(200);
    for(const c of clients) {
      const data=await friends(c);
      expect(data.friends.every(f=>isOnline(data,f.id))).toBe(true);
      expect(data.friends.map(f=>f.name).sort()).toEqual(members.map(m=>m.displayName).sort());
      expect(Object.keys(data.friends[0]).sort()).toEqual(['activity','avatarKey','hasActivity','id','key','lastSeenAt','name','onlineUntil','sameAccount']);
    }
    const unrelated=await friends(other);
    expect(unrelated.friends.every(f=>f.lastSeenAt===null&&f.onlineUntil===null)).toBe(true);
    expect(JSON.stringify(unrelated)).not.toContain('好友 0');
  });
  it('requires login, CSRF, same origin and own player, ignoring client timestamps',async()=>{
    const body={clientId:randomUUID(),player:'quintus',sequence:1,active:true};
    expect((await call('friends')).status).toBe(401);
    expect((await call('presence',body)).status).toBe(401);
    expect((await call('presence',body,clients[0],{'X-CSRF-Token':'wrong'})).status).toBe(403);
    expect((await call('presence',body,clients[0],{Origin:'https://elsewhere.invalid'})).status).toBe(403);
    expect((await beat(clients[0],'feifei')).status).toBe(403);
    expect((await call('presence',{...body,seenAt:Date.now()},clients[0])).status).toBe(400);
    expect((await beat(clients[0],'quintus','invalid')).status).toBe(400);
  });
  it('does not change any game progress, revision, archive or save timestamp',async()=>{
    const snapshot=async()=>JSON.stringify((await api.pool.query('SELECT * FROM game_states WHERE account_id=$1',[accountId])).rows);
    const before=await snapshot();
    const tab=randomUUID();await beat(clients[0],'quintus',tab);await beat(clients[0],'quintus',tab,2,false);
    await friends(clients[1]);expect(await snapshot()).toBe(before);
  });
  it('aggregates multiple tabs and devices; logout removes only its own sessions leases',async()=>{
    const device=await login(members[0]), tab1=randomUUID(),tab2=randomUUID();
    await beat(clients[0],'quintus',tab1);await beat(clients[0],'quintus',tab2);await beat(device,'quintus');
    await beat(clients[0],'quintus',tab1,2,false);
    expect(isOnline(await friends(clients[1]),'quintus')).toBe(true);
    expect((await call('logout',{},device)).status).toBe(200);
    expect(isOnline(await friends(clients[1]),'quintus')).toBe(true);
    await beat(clients[0],'quintus',tab2,2,false);
    const data=await friends(clients[1]);expect(isOnline(data,'quintus')).toBe(false);
    expect(data.friends.find(f=>f.id==='quintus').lastSeenAt).toBeGreaterThan(0);
    expect((await beat(device,'quintus')).status).toBe(401);
  });
  it('expires dropped connections by TTL and preserves durable last-seen across restart',async()=>{
    await beat(clients[0],'quintus');
    const last=(await friends(clients[1])).friends.find(f=>f.id==='quintus').lastSeenAt;
    await api.pool.query("UPDATE presence_leases SET seen_at=now()-interval '36 seconds' WHERE token_hash IN (SELECT token_hash FROM sessions WHERE account_id=$1)",[accountId]);
    expect(isOnline(await friends(clients[1]),'quintus')).toBe(false);
    await close();await open();
    const data=await friends(clients[1]);expect(isOnline(data,'quintus')).toBe(false);
    expect(data.friends.find(f=>f.id==='quintus').lastSeenAt).toBe(last);
  });
  it('does not revive closed tabs when requests arrive out of order, including leave before first beat',async()=>{
    const tab=randomUUID();await beat(clients[0],'quintus',tab,3,false);
    await beat(clients[0],'quintus',tab,2,true);
    let data=await friends(clients[1]);expect(isOnline(data,'quintus')).toBe(false);
    expect(data.friends.find(f=>f.id==='quintus').lastSeenAt).toBe(null);
    await beat(clients[0],'quintus',tab,4,true);
    await beat(clients[0],'quintus',tab,6,false);
    await beat(clients[0],'quintus',tab,5,true);
    expect(isOnline(await friends(clients[1]),'quintus')).toBe(false);
  });
  it('expires sessions even before cleanup and keeps history after revocation',async()=>{
    const device=await login(members[0]);await beat(device,'quintus');
    await api.pool.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE csrf=$1",[device.csrf]);
    expect(isOnline(await friends(clients[1]),'quintus')).toBe(false);
    expect((await beat(device,'quintus')).status).toBe(401);
    await api.pool.query('DELETE FROM sessions WHERE csrf=$1',[device.csrf]);
    expect((await friends(clients[1])).friends.find(f=>f.id==='quintus').lastSeenAt).toBeGreaterThan(0);
  });
  it('permits parent-selected players but does not change the identity of an existing tab lease',async()=>{
    const tab=randomUUID();expect((await beat(owner,'qingqing',tab)).status).toBe(200);
    expect((await beat(owner,'feifei',tab,2)).status).toBe(409);
    expect(isOnline(await friends(clients[0]),'qingqing')).toBe(true);
  });
  it('bounds open tab leases per session',async()=>{
    for(let i=0;i<16;i++) expect((await beat(clients[0],'quintus')).status).toBe(200);
    expect((await beat(clients[0],'quintus')).status).toBe(429);
  });
});
