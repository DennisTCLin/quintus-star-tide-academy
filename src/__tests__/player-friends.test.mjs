import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createCloudApi } from '../../server/cloud.mjs';
import { createAppServer } from '../../server.mjs';
import { connectCurrentPlayers } from '../../server/player-friends.mjs';
import { passwordHash } from '../../server/credentials.mjs';
import { newFamily } from '../../build/game.mjs';
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite('explicit current-player friendships across accounts', () => {
  let api, server, url, players, clients, outsider, before;
  async function call(path, body, client) {
    const r=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(client?{Cookie:client.cookie,'X-CSRF-Token':client.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    const data=await r.json();return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0],csrf:data.csrf};
  }
  const snapshot=async()=>JSON.stringify((await api.pool.query('SELECT * FROM game_states WHERE account_id=ANY($1::uuid[]) ORDER BY account_id',[players.map(p=>p.account)])).rows);
  const beat=(client,player)=>call('presence',{player,clientId:randomUUID(),sequence:1,active:true},client);
  beforeAll(async()=>{
    api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});
    server=createAppServer({api}); await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
    await api.pool.query('DELETE FROM request_limits');
    const family=randomUUID(), hash=await passwordHash('0042',undefined,4), prefix='friends_'+randomUUID().slice(0,8);
    players=['quintus','feifei','qingqing','doudou','quintus','feifei','quintus'].map((id,i)=>({id,member:randomUUID(),account:i<4?family:randomUUID(),username:i===4?'alan':i===5?'jimmy':prefix+'_'+i,name:'Test child '+i}));
    for(const account of new Set(players.map(p=>p.account))){
      await api.pool.query('INSERT INTO accounts(id,username,password_hash,recovery_hash) VALUES($1,$2,$3,$4)',[account,prefix+'_'+account,hash,'0'.repeat(64)]);
      await api.pool.query('INSERT INTO game_states(account_id,family,verified) VALUES($1,$2,$3)',[account,newFamily(),{}]);
    }
    for(const p of players)await api.pool.query('INSERT INTO player_logins(id,account_id,username,password_hash,player_id,display_name) VALUES($1,$2,$3,$4,$5,$6)',[p.member,p.account,p.username,hash,p.id,p.name]);
    clients=[]; for(const p of players)clients.push(await call('login',{username:p.username,password:'0042'}));
    clients.forEach(c=>expect(c.status).toBe(200));outsider=clients[6];
    expect(await connectCurrentPlayers(api.pool,players.slice(0,6).map(p=>p.member))).toEqual({players:6,added:30});
    before=await snapshot();
  },30000);
  afterAll(async()=>{
    await new Promise(r=>server.close(r));
    if(players){
      const accounts=[...new Set(players.map(p=>p.account))];
      await api.pool.query('DELETE FROM sessions WHERE account_id=ANY($1::uuid[])',[accounts]);
      await api.pool.query('DELETE FROM player_logins WHERE account_id=ANY($1::uuid[])',[accounts]);
      await api.pool.query('DELETE FROM game_states WHERE account_id=ANY($1::uuid[])',[accounts]);
      await api.pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[accounts]);
    }
    await api.close();
  });
  it('gives every enrolled child the same six identities with five other friends and correct portraits',async()=>{
    for(let i=0;i<6;i++){
      const r=await call('friends',undefined,clients[i]);expect(r.status).toBe(200);
      expect(r.data.friends).toHaveLength(6);expect(new Set(r.data.friends.map(f=>f.key)).size).toBe(6);
      expect(r.data.friends.filter(f=>!(f.sameAccount&&f.id===players[i].id))).toHaveLength(5);
      expect(r.data.friends.find(f=>f.key===players[4].member).avatarKey).toBe('alan');
      expect(r.data.friends.find(f=>f.key===players[5].member).avatarKey).toBe('jimmy');
      expect(r.data.friends.find(f=>f.key===players[0].member).avatarKey).toBe('quintus');
      expect(Object.keys(r.data.friends[0]).sort()).toEqual(['activity','avatarKey','hasActivity','id','key','lastSeenAt','name','onlineUntil','sameAccount']);
    }
  });
  it('does not auto-enroll other accounts; preserves the original household boundary',async()=>{
    const r=await call('friends',undefined,outsider);expect(r.data.friends).toHaveLength(1);
    expect(r.data.friends[0].key).toBe(players[6].member);
    expect((await call('friends',undefined,clients[0])).data.friends.some(f=>f.name===players[6].name)).toBe(false);
  });
  it('is idempotent and rejects an incomplete snapshot atomically',async()=>{
    expect((await connectCurrentPlayers(api.pool,players.slice(0,6).map(p=>p.member))).added).toBe(0);
    await expect(connectCurrentPlayers(api.pool,[players[0].member,players[6].member,randomUUID()])).rejects.toThrow('snapshot changed');
    expect((await call('friends',undefined,clients[0])).data.friends).toHaveLength(6);
    await expect(connectCurrentPlayers(api.pool,[players[0].member,players[0].member])).rejects.toThrow('distinct');
  });
  it('keeps same-grade presence distinct across accounts and obeys logout and expiration',async()=>{
    expect((await beat(clients[4],'quintus')).status).toBe(200);
    let r=(await call('friends',undefined,clients[1])).data;
    expect(r.friends.find(f=>f.key===players[4].member).onlineUntil).toBeGreaterThan(r.serverNow);
    expect(r.friends.find(f=>f.key===players[0].member).onlineUntil).toBe(null);
    await beat(clients[0],'quintus');await call('logout',{},clients[4]);
    r=(await call('friends',undefined,clients[1])).data;
    expect(r.friends.find(f=>f.key===players[4].member).onlineUntil).toBe(null);
    expect(r.friends.find(f=>f.key===players[0].member).onlineUntil).toBeGreaterThan(r.serverNow);
    await beat(clients[5],'feifei');
    await api.pool.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE csrf=$1",[clients[5].csrf]);
    r=(await call('friends',undefined,clients[1])).data;
    expect(r.friends.find(f=>f.key===players[5].member).onlineUntil).toBe(null);
    expect((await beat(clients[0],'feifei')).status).toBe(403);
    expect((await call('friends')).status).toBe(401);
    expect(await snapshot()).toBe(before);
  });
  it('ranks real members and reveals only authorized collection projections without mutating saves',async()=>{
    const first=await call('collections?player=quintus',undefined,clients[0]);expect(first.status).toBe(200);
    expect(first.data.players).toHaveLength(6);expect(new Set(first.data.players.map(p=>p.key)).size).toBe(6);
    const alan=first.data.players.find(p=>p.key===players[4].member);
    expect(alan).toMatchObject({name:players[4].name,avatarKey:'alan',isSelf:false,available:true});
    expect(first.data.players.filter(p=>p.isSelf).map(p=>p.key)).toEqual([players[0].member]);
    const cards=await call('collections?player=quintus&target='+players[4].member,undefined,clients[0]);
    expect(cards.status).toBe(200);expect(cards.data.player.cards.length).toBeGreaterThan(0);
    for(const card of cards.data.player.cards)expect(Object.keys(card).sort()).toEqual(['count','id','level']);
    expect(JSON.stringify(cards.data)).not.toMatch(/account_id|password|milestones|learning|coins|csrf/);
    expect((await call('collections?player=quintus&target='+players[6].member,undefined,clients[0])).status).toBe(404);
    expect((await call('collections?player=feifei',undefined,clients[0])).status).toBe(403);
    expect((await call('collections?player=quintus')).status).toBe(401);
    const alone=await call('collections?player=quintus',undefined,outsider);expect(alone.data.players).toHaveLength(1);
    expect(alone.data.players[0].avatarKey).toBe('unknown');
    expect(await snapshot()).toBe(before);
  });
  it('checks friendship again for collection detail after a link is removed',async()=>{
    await api.pool.query('DELETE FROM player_friendships WHERE member_id=$1 AND friend_id=$2',[players[0].member,players[4].member]);
    expect((await call('collections?player=quintus&target='+players[4].member,undefined,clients[0])).status).toBe(404);
    await connectCurrentPlayers(api.pool,players.slice(0,6).map(p=>p.member));
  });

  it('uses the same member keys for an unlinked household and its collection links',async()=>{
    const removed=(await api.pool.query('DELETE FROM player_friendships WHERE member_id=$1 RETURNING friend_id',[players[0].member])).rows;
    try {
      const friends=await call('friends',undefined,clients[0]);expect(friends.data.friends.map(f=>f.key).sort()).toEqual(players.slice(0,4).map(p=>p.member).sort());
      for(const friend of friends.data.friends){const c=await call('collections?player=quintus&target='+friend.key,undefined,clients[0]);expect(c.status).toBe(200);expect(c.data.player.key).toBe(friend.key);}
    }finally{for(const r of removed)await api.pool.query('INSERT INTO player_friendships(member_id,friend_id) VALUES($1,$2)',[players[0].member,r.friend_id]);}
  });

});
