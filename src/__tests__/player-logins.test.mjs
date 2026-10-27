import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { randomUUID, createHash } from 'node:crypto';
import { createCloudApi } from '../../server/cloud.mjs';
import { provisionPlayerLogins } from '../../server/player-logins.mjs';
import { createAppServer } from '../../server.mjs';
import { newFamily, ROSTER } from '../../build/game.mjs';
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite('individual logins preserve the existing household (real PostgreSQL)', () => {
  let api, server, url, accountId, owner, original, family;
  const prefix = 'member_' + randomUUID().slice(0, 8);
  const players = ['quintus', 'doudou', 'qingqing', 'feifei'];
  const members = players.map((playerId, i) => ({ playerId, username: `${prefix}_${i}`, password: `00${30 + i}`, displayName: `Test player ${i}` }));
  const parentPassword = 'test-parent-passphrase-2026';
  async function open() {
    api = await createCloudApi({ connectionString: process.env.TEST_DATABASE_URL, production: false });
    server = createAppServer({ api });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    url = `http://127.0.0.1:${server.address().port}`;
  }
  async function close() { await new Promise(r => server.close(r)); await api.close(); }
  async function call(path, body, client) {
    const r = await fetch(url + '/api/' + path, { method: body === undefined ? 'GET' : 'POST', headers: {
      Origin: url, ...(body === undefined ? {} : {'Content-Type':'application/json'}),
      ...(client ? {Cookie: client.cookie, 'X-CSRF-Token':client.csrf} : {})
    }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await r.json();
    return { status:r.status, data, cookie:r.headers.get('set-cookie')?.split(';')[0], csrf:data.csrf };
  }
  const login = e => call('login', {username:e.username.toUpperCase(), password:e.password});
  async function snapshot() {
    const r = await api.pool.query('SELECT family::text,verified::text,legacy_archive::text,updated_at FROM game_states WHERE account_id=$1', [accountId]);
    return JSON.stringify(r.rows[0]);
  }
  beforeAll(async () => {
    await open();
    await api.pool.query('DELETE FROM request_limits');
    owner = await call('register', {username:prefix+'_parent', password:parentPassword});
    expect(owner.status).toBe(200);
    accountId = (await api.pool.query('SELECT id FROM accounts WHERE username=$1',[prefix+'_parent'])).rows[0].id;
    family = newFamily();
    family.revision = 37;
    for (const [i,id] of players.entries()) {
      const p=family.profiles[id];
      p.milestones.masteryPoints=(i+1)*100; p.coins=41+i; p.tickets=2+i;
      p.owned[ROSTER[1].id]=i+2; p.firstAcquired[ROSTER[1].id]='2026-10-20';
      p.owned[ROSTER[2].id]=i+2; p.firstAcquired[ROSTER[2].id]='2026-10-20';
    }
    await api.pool.query('UPDATE game_states SET family=$2,verified=$3,legacy_archive=$4 WHERE account_id=$1',[accountId,family,{quintus:20,doudou:40,qingqing:60,feifei:80},{original:'preserve this archive'}]);
    original=await snapshot();
  },30000);
  beforeEach(async () => { await api.pool.query('DELETE FROM request_limits'); });
  afterAll(close);
  it('provisions four identities without rewriting any stored progress, archive or timestamp',async()=>{
    expect((await provisionPlayerLogins(api.pool,accountId,members)).every(x=>x.changed)).toBe(true);
    expect(await snapshot()).toBe(original);
    expect((await api.pool.query('SELECT count(*) FROM game_states WHERE account_id=$1',[accountId])).rows[0].count).toBe('1');
  },30000);
  it('all four PINs including leading zero log into the original player with identical scores',async()=>{
    for (const e of members) {
      const r=await login(e); expect(r.status).toBe(200); expect(r.data.playerId).toBe(e.playerId);
      expect(r.data.displayName).toBe(e.displayName); expect(r.data.canMigrate).toBe(false);
      expect(r.data.family.profiles).toEqual(family.profiles);
      expect(r.data.verified).toEqual({quintus:20,doudou:40,qingqing:60,feifei:80});
      expect(JSON.stringify(r.data)).not.toContain('password_hash');
    }
    expect((await call('login',{username:members[0].username,password:'9999'})).status).toBe(401);
    expect(await snapshot()).toBe(original);
  },30000);
  it('reprovision and restart preserve data and existing member sessions',async()=>{
    const client=await login(members[0]);
    expect((await provisionPlayerLogins(api.pool,accountId,members)).every(x=>!x.changed)).toBe(true);
    await close(); await open();
    expect((await call('state',undefined,client)).data.playerId).toBe('quintus');
    expect(await snapshot()).toBe(original);
  },30000);
  it('denies sibling writes, receipt replay, whole-family migration and owner recovery',async()=>{
    const c=await login(members[0]);
    const body={id:randomUUID(),revision:37,command:{type:'equip',player:'doudou',pet:ROSTER[0].id}};
    const digest=createHash('sha256').update(JSON.stringify({path:'/api/command',...body})).digest('hex');
    await api.pool.query('INSERT INTO command_receipts(account_id,command_id,payload_hash,result) VALUES($1,$2,$3,$4)',[accountId,body.id,digest,JSON.stringify('other player result')]);
    expect((await call('command',body,c)).status).toBe(403);
    expect((await call('command',{id:randomUUID(),revision:37,command:{type:'territory',player:'doudou',action:'start'}},c)).status).toBe(403);
    expect((await call('command',{...body,id:randomUUID()},c)).status).toBe(403);
    expect((await call('migrate',{id:randomUUID(),revision:37,snapshot:family},c)).status).toBe(403);
    expect((await call('recovery-code',{password:members[0].password},c)).status).toBe(403);
    expect((await call('practice',{type:'start',player:'doudou',used:[]},c)).status).toBe(403);
    expect((await call('command',{id:randomUUID(),revision:37,command:{type:'learning-goal',player:'doudou',goal:'grove'}},c)).status).toBe(403);
    expect((await call('command',{id:randomUUID(),revision:37,command:{type:'home-decor',player:'doudou',action:'open'}},c)).status).toBe(403);
    expect((await call('recover',{username:members[0].username,password:parentPassword,recoveryCode:'x'},c)).status).toBe(403);
    expect((await call('register',{username:members[0].username,password:parentPassword})).status).toBe(403);
    expect(await snapshot()).toBe(original);
  },30000);
  it('keeps ordinary registration at twelve characters and rejects reassigning a member atomically',async()=>{
    expect((await call('register',{username:prefix+'_short',password:'0030'})).status).toBe(400);
    const altered=members.map((e,i)=>({...e,playerId:players[(i+1)%4]}));
    await expect(provisionPlayerLogins(api.pool,accountId,altered)).rejects.toThrow('Refusing to reassign');
    const ownerCollision = members.map((e,i) => i ? e : {...e,username:prefix+'_parent'});
    await expect(provisionPlayerLogins(api.pool,accountId,ownerCollision)).rejects.toThrow('household account');
    expect((await call('login',{username:prefix+'_parent',password:parentPassword})).status).toBe(200);
    expect(await snapshot()).toBe(original);
  },30000);
  it('allows own commands, cross-member trades and idempotent cancellations without resetting scores',async()=>{
    const a=await login(members[0]), b=await login(members[1]), unrelated=await login(members[2]);
    let revision=37;
    const command=async(c,cmd)=> { const r=await call('command',{id:randomUUID(),revision,command:cmd},c); if(r.status===200)revision=r.data.family.revision;return r; };
    const first=ROSTER[0].id, gift=ROSTER[1].id;
    expect((await command(a,{type:'equip',player:'quintus',pet:first})).status).toBe(200);
    const offered=await command(a,{type:'trade-propose',player:'quintus',to:'doudou',give:gift,receive:ROSTER[2].id});
    expect(offered.status).toBe(200);
    const tradeId=offered.data.family.pendingTrade.id;
    expect((await command(unrelated,{type:'trade-cancel',player:'qingqing',tradeId})).status).toBe(403);
    expect((await command(b,{type:'trade-accept',player:'doudou',tradeId})).status).toBe(200);
    const second=await command(a,{type:'trade-propose',player:'quintus',to:'doudou',give:gift,receive:ROSTER[2].id});
    const body={id:randomUUID(),revision,command:{type:'trade-cancel',player:'quintus',tradeId:second.data.family.pendingTrade.id}};
    const cancelled=await call('command',body,a);expect(cancelled.status).toBe(200);
    expect((await call('command',body,a)).data.replayed).toBe(true);
    for (const id of players) expect(cancelled.data.family.profiles[id].milestones.masteryPoints).toBe(family.profiles[id].milestones.masteryPoints);
  },30000);
});
