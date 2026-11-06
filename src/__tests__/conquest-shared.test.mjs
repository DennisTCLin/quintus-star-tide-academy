import { beforeAll,afterAll,beforeEach,describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createCloudApi } from '../../server/cloud.mjs';
import { createAppServer } from '../../server.mjs';
import { passwordHash } from '../../server/credentials.mjs';
import { xpForLevel } from '../companion-growth';
import { newFamily, startRun, questionById, taipeiDay } from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('shared conquest authoritative world',()=>{
 let api,server,url,clients=[],players=[],baseline;
 const team=['tideglow','seasprout','kelpcub'];
 async function call(path,body,i=0,headers={}) {
  const client=clients[i];const response=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(client?{Cookie:client.cookie,'X-CSRF-Token':client.csrf}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await response.json();return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0],csrf:data.csrf};
 }
 const read=i=>call('conquest?player=quintus',undefined,i);
 async function body(i,type,extra={}) {const s=(await read(i)).data;return {player:'quintus',type,commandId:randomUUID(),revision:s.revision,season:s.state.season,...extra};}
 const action=async(i,type,extra={})=>call('conquest',await body(i,type,extra),i);
 async function setPlayer(i,patch) {const {me}= (await read(i)).data;const row=(await api.pool.query('SELECT state FROM conquest_players WHERE id=$1',[me])).rows[0];Object.assign(row.state,patch);await api.pool.query('UPDATE conquest_players SET state=$2 WHERE id=$1',[me,row.state]);}
 async function tile(id,fn) {const w=(await api.pool.query("SELECT * FROM conquest_worlds WHERE id='global'")).rows[0];fn(w.tiles.find(t=>t.id===id));await api.pool.query("UPDATE conquest_worlds SET tiles=$1,revision=revision+1 WHERE id='global'",[JSON.stringify(w.tiles)]);}
 const familyBytes=async()=>JSON.stringify((await api.pool.query('SELECT account_id,family FROM game_states WHERE account_id=ANY($1::uuid[]) ORDER BY account_id',[players.map(p=>p.account)])).rows);
 beforeAll(async()=>{
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  const hash=await passwordHash('0042',undefined,4),prefix='conquest_'+randomUUID().slice(0,8);
  for(let i=0;i<3;i++) {
   const p={member:randomUUID(),account:randomUUID(),username:prefix+'_'+i};players.push(p);
   await api.pool.query('INSERT INTO accounts(id,username,password_hash,recovery_hash) VALUES($1,$2,$3,$4)',[p.account,p.username,hash,'0'.repeat(64)]);
   await api.pool.query('INSERT INTO game_states(account_id,family,verified) VALUES($1,$2,$3)',[p.account,newFamily(),{}]);
   await api.pool.query("INSERT INTO player_logins(id,account_id,username,password_hash,player_id,display_name) VALUES($1,$2,$3,$4,'quintus',$5)",[p.member,p.account,p.username,hash,'Shared captain '+i]);
   const login=await call('login',{username:p.username,password:'0042'},99);expect(login.status).toBe(200);clients.push(login);
  }
  baseline=await familyBytes();
 },30000);
 beforeEach(async()=>{
  for(const p of players)await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[p.account,newFamily()]);baseline=await familyBytes();
  await api.pool.query('TRUNCATE conquest_commands,conquest_players,conquest_worlds');await api.pool.query('DELETE FROM request_limits');
  for(let i=0;i<3;i++){const r=await action(i,'join',{alliance:'light',hero:'hero-elf'});expect(r.status,JSON.stringify(r.data)).toBe(200);await setPlayer(i,{energy:500});}
 });
 afterAll(async()=>{
  if(server)await new Promise(r=>server.close(r));
  if(api&&players.length){for(const table of ['sessions','player_logins','command_receipts','game_states'])await api.pool.query(`DELETE FROM ${table} WHERE account_id=ANY($1::uuid[])`,[players.map(p=>p.account)]);await api.pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[players.map(p=>p.account)]);await api.pool.query('DELETE FROM conquest_worlds');}await api?.close();
 });
 it('starts fresh with 50 energy and shares the same map across same-slot accounts',async()=>{
  await api.pool.query('DELETE FROM conquest_players WHERE account_id=$1',[players[2].account]);
  const a=(await read(0)).data,b=(await read(1)).data,c=(await read(2)).data;
  expect(a.me).not.toBe(b.me);expect(a.state.tiles).toEqual(b.state.tiles);expect(c.state.energy).toBe(50);expect(c.state.tiles.filter(t=>t.owner===c.me)).toHaveLength(0);expect(c.state.enrollment).toBeUndefined();
  expect(await familyBytes()).toBe(baseline);
  const text=JSON.stringify(a);expect(text).not.toContain(players[1].account);expect(text).not.toContain(players[1].username);expect(a.players[1]).not.toHaveProperty('units');expect(a.players[1]).not.toHaveProperty('growth');
 });
 it('rejects unauthenticated, cross-profile, forged stats and malformed items',async()=>{
  expect((await call('conquest?player=quintus',undefined,99)).status).toBe(401);
  expect((await call('conquest?player=feifei')).status).toBe(403);
  expect((await call('conquest',await body(0,'claim',{tileId:'0,0',team}),0,{'X-CSRF-Token':'wrong'})).status).toBe(403);
  expect((await action(0,'claim',{tileId:'0,0',team,energy:9999})).status).toBe(400);
  expect((await action(0,'claim',{tileId:'0,0',team:['fake','tideglow','kelpcub']})).status).toBe(400);
  expect((await action(0,'craft',{remedy:'constructor'})).status).toBe(400);
  expect((await action(0,'join',{alliance:'night',hero:'hero-undead'})).status).toBe(400);
 });
 it('rejects cached manual raid commands; reads cannot settle a raid',async()=>{
  const before=await familyBytes();
  expect((await action(0,'defend',{raidId:'cached-wave',tileId:'0,0'})).status).toBe(400);
  expect((await read(0)).data.state.npcRaids).toBeUndefined();
  expect(await familyBytes()).toBe(before);
 });
 it('serializes simultaneous claims and replays the exact original result without charging twice',async()=>{
  const a=await body(0,'claim',{tileId:'0,0',team}),b=await body(1,'claim',{tileId:'0,0',team});
  const results=await Promise.all([call('conquest',a,0),call('conquest',b,1)]);expect(results.map(r=>r.status).sort()).toEqual([200,409]);
  const winner=results[0].status===200?0:1,command=winner===0?a:b,original=results[winner].data;
  const retries=await Promise.all([call('conquest',command,winner),call('conquest',command,winner)]);
  for(const retry of retries){expect(retry.status).toBe(200);expect(retry.data.replayed).toBe(true);expect(retry.data.result).toEqual(original.result);expect(retry.data.state.energy).toBe(original.state.energy);}
  expect((await call('conquest',{...command,tileId:'1,0'},winner)).status).toBe(409);
  expect((await read(1-winner)).data.state.tiles.find(t=>t.id==='0,0').owner).toBe(original.me);
  expect(await familyBytes()).toBe(baseline);
 });
 it('allows same-species opponents, saves defeated defenders to their owner and survives relogin',async()=>{
  const first=await action(0,'claim',{tileId:'0,0',team});expect(first.status).toBe(200);
  const a=(await read(0)).data,units=structuredClone(a.state.units);for(const g of Object.values(units))g.hp=1;await setPlayer(0,{units});
  await tile('0,0',t=>{t.battleUntil=0;t.shieldStartsAt=Date.now()+3600000;t.guards.forEach(g=>g.hp=1);});
  const captured=await action(1,'claim',{tileId:'0,0',team});expect(captured.status,JSON.stringify(captured.data)).toBe(200);expect(captured.data.result.state.lastBattle.won).toBe(true);
  const owner=(await read(0)).data,enemy=(await read(1)).data;
  expect(owner.state.tiles.find(t=>t.id==='0,0').owner).toBe(enemy.me);
  expect(team.every(id=>owner.state.units[id].hp<1)).toBe(true);
  const lhs=owner.state.tiles.find(t=>t.id==='0,0').guards,rhs=enemy.state.tiles.find(t=>t.id==='0,0').guards;expect(lhs.map(g=>g.id)).toEqual(rhs.map(g=>g.id));lhs.forEach((g,i)=>expect(g.hp).toBeCloseTo(rhs[i].hp,2));
  const login=await call('login',{username:players[0].username,password:'0042'},99);clients[0]=login;
  expect((await read(0)).data.state.tiles.find(t=>t.id==='0,0').owner).toBe(enemy.me);
  expect(await familyBytes()).toBe(baseline);
 });
 it('blocks battle cooldown and active shields but permits the first vulnerable hour and expired shields',async()=>{
  expect((await action(0,'claim',{tileId:'0,0',team})).status).toBe(200);
  expect((await action(1,'claim',{tileId:'0,0',team})).data.error).toContain('交戰');
  await tile('0,0',t=>{t.battleUntil=0;t.shieldStartsAt=Date.now()-1;t.shieldUntil=Date.now()+100000;});
  expect((await action(1,'claim',{tileId:'0,0',team})).data.error).toContain('護盾');
  await tile('0,0',t=>{t.shieldUntil=Date.now()-1;});
  expect((await action(1,'claim',{tileId:'0,0',team})).status).toBe(200);
 });
 it('keeps private HP/production separate across owners and persists offline recovery without repeated gains',async()=>{
  await action(0,'claim',{tileId:'0,0',team});await tile('5,0',t=>{t.guards=[{id:'wild:5,0:0',level:0,element:'wood',hp:1,maxHp:60}];});expect((await action(1,'claim',{tileId:'5,0',team})).data.result.state.lastBattle.won).toBe(true);
  const a=(await read(0)).data,b=(await read(1)).data;
  const units=structuredClone(a.state.units);for(const unit of Object.values(units))unit.hp=0;
  await setPlayer(0,{units,updatedAt:Date.now()-600000});
  const recovered=(await read(0)).data;
  expect(recovered.state.units.tideglow.hp).toBeGreaterThan(0);expect(recovered.state.units.tideglow.hp).toBeLessThan(10);
  const again=(await read(0)).data;expect(again.state.units.tideglow.hp-recovered.state.units.tideglow.hp).toBeLessThan(.1);
  expect((await read(1)).data.state.units.tideglow.hp).toBeGreaterThan(20);
  expect(recovered.state.tiles.filter(t=>t.owner===b.me).every(t=>t.guards.every(g=>g.hp>20))).toBe(true);
 });
 it('syncs consecutive offline defender levels by owner, retains HP ratio and never writes collection data',async()=>{
  for(let i=0;i<2;i++) {
   const f=newFamily();f.profiles.quintus.owned.aetherdragon=1;f.profiles.quintus.growth.xp.aetherdragon=xpForLevel(i?1:23);
   await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[players[i].account,f]);
   const id=(await read(i)).data.me;
   const unit={id:'aetherdragon',level:i?40:62,element:'water',hp:i?430:650,maxHp:i?860:1300};
   await setPlayer(i,{units:{aetherdragon:unit},updatedAt:Date.now()+60000});
   await tile(i?'1,0':'0,0',t=>{t.owner=id;t.guards=[unit];});
  }
  for(const [level,hp,maxHp] of [[63,660,1320],[64,670,1340]]) {
   const f=(await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[players[0].account])).rows[0].family;f.profiles.quintus.growth.xp.aetherdragon=xpForLevel(level-39);
   await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[players[0].account,f]);
   const before=await familyBytes();
   const a=(await read(0)).data,b=(await read(1)).data;
   expect(a.state.units.aetherdragon).toMatchObject({level,hp,maxHp});
   expect(b.state.tiles.find(t=>t.id==='0,0').guards[0]).toMatchObject({level,hp,maxHp});
   expect(b.state.units.aetherdragon).toMatchObject({level:40,hp:430,maxHp:860});
   expect(await familyBytes()).toBe(before);
  }
  await setPlayer(0,{units:{aetherdragon:{id:'aetherdragon',level:62,element:'water',hp:0,maxHp:1300}},updatedAt:Date.now()+60000});
  expect((await read(0)).data.state.units.aetherdragon.hp).toBe(0);
  // Simulate committed collection removal while reads race; no conquest write may restore the collection.
  const f=(await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[players[1].account])).rows[0].family;delete f.profiles.quintus.owned.aetherdragon;
  await Promise.all([api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[players[1].account,f]),read(0)]);
  expect((await read(0)).data.state.tiles.find(t=>t.id==='1,0').guards).toHaveLength(0);
  expect((await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[players[1].account])).rows[0].family).toEqual(f);
 });
 it('never rewinds a stored season or world timestamp when wall time is behind the world clock',async()=>{
  const future=Date.UTC(2099,11,1,1);
  await api.pool.query("UPDATE conquest_worlds SET season='season-2099-12',updated_at=$1",[future]);
  await api.pool.query("UPDATE conquest_players SET state=jsonb_set(jsonb_set(state,'{season}','\"season-2099-12\"'::jsonb),'{updatedAt}',to_jsonb($1::bigint))",[future]);
  const snapshot=(await read(0)).data;expect(snapshot.serverNow).toBe(future);expect(snapshot.state.season).toBe('season-2099-12');
  const command=await action(0,'craft',{remedy:'bandage'});expect(command.status).toBe(400);
  const world=(await api.pool.query("SELECT season,updated_at FROM conquest_worlds WHERE id='global'")).rows[0];expect(world.season).toBe('season-2099-12');expect(Number(world.updated_at)).toBe(future);
 });
 it('serializes real collection trading against PvP without overwriting XP, wounds or returning an unowned garrison',async()=>{
  const f=newFamily(),p=f.profiles.quintus,q=f.profiles.feifei;
  p.owned.aetherdragon=1;p.firstAcquired.aetherdragon=taipeiDay();p.growth.xp.aetherdragon=xpForLevel(23);
  q.owned.shellmole=1;q.firstAcquired.shellmole=taipeiDay();
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[players[0].account,f]);
  await api.pool.query('UPDATE accounts SET username=$2 WHERE id=$1',[players[0].account,players[0].username+'_parent']);
  const parent=await call('login',{username:players[0].username+'_parent',password:'0042'},99);expect(parent.status).toBe(200);clients.push(parent);
  const index=clients.length-1,me=(await read(0)).data.me,unit={id:'aetherdragon',element:'water',level:62,hp:650,maxHp:1300};
  await setPlayer(0,{units:{aetherdragon:unit},updatedAt:Date.now()+60000});await tile('0,0',t=>{t.owner=me;t.guards=[unit];t.shieldUntil=0;});
  const s=(await call('conquest?player=feifei',undefined,index)).data;
  expect((await call('conquest',{player:'feifei',type:'join',alliance:'light',hero:'hero-dwarf',commandId:randomUUID(),revision:s.revision,season:s.state.season},index)).status).toBe(200);
  const current=(await call('state',undefined,index)).data;
  const proposal=await call('command',{id:randomUUID(),revision:current.family.revision,command:{type:'trade-propose',player:'quintus',to:'feifei',give:'aetherdragon',receive:'shellmole'}},index);expect(proposal.status,JSON.stringify(proposal.data)).toBe(200);
  const accept={id:randomUUID(),revision:proposal.data.family.revision,command:{type:'trade-accept',player:'feifei',tradeId:proposal.data.family.pendingTrade.id}};
  const attack=await body(1,'claim',{tileId:'0,0',team});
  const [traded,battle]=await Promise.all([call('command',accept,index),call('conquest',attack,1)]);
  expect(traded.status,JSON.stringify(traded.data)).toBe(200);expect([200,409]).toContain(battle.status);
  const after=(await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[players[0].account])).rows[0].family;
  expect(after.profiles.quintus.owned.aetherdragon).toBeUndefined();expect(after.profiles.feifei.owned.aetherdragon).toBe(1);expect(after.profiles.quintus.growth.xp.aetherdragon).toBe(xpForLevel(23));
  const own=(await read(0)).data;expect(own.state.tiles.find(t=>t.id==='0,0').guards).toHaveLength(0);expect(own.state.units.aetherdragon.hp).toBeLessThanOrEqual(650);expect(own.state.units.aetherdragon.hp).toBeGreaterThan(0);
  expect((await call('command',accept,index)).status).toBe(200);expect((await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[players[0].account])).rows[0].family).toEqual(after);clients.pop();
 });
 it('updates a fully logged-out defender from attacker reads and commits exact PvP wounds without changing learning saves',async()=>{
  const f=newFamily();f.profiles.quintus.owned.aetherdragon=1;f.profiles.quintus.firstAcquired.aetherdragon=taipeiDay();f.profiles.quintus.growth.xp.aetherdragon=xpForLevel(23);
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[players[0].account,f]);
  const defender=(await read(0)).data.me;
  const unit={id:'aetherdragon',level:62,element:'water',hp:650,maxHp:1300};
  await setPlayer(0,{units:{aetherdragon:unit},updatedAt:Date.now()+120000,inventory:{herbs:17,spring:9,bandage:2,potion:1},credited:['retained-learning'],log:['retained-progress']});
  await tile('0,0',t=>{t.owner=defender;t.guards=[unit];t.shieldUntil=0;t.shieldStartsAt=0;t.battleUntil=0;t.capturedAt=Date.now()-1000;});
  // No subsequent defender request until the final relogin. Even its session is absent.
  await api.pool.query('DELETE FROM sessions WHERE account_id=$1',[players[0].account]);
  expect(Number((await api.pool.query('SELECT count(*) AS n FROM sessions WHERE account_id=$1',[players[0].account])).rows[0].n)).toBe(0);
  const ledger=async()=>(await api.pool.query('SELECT state FROM conquest_players WHERE id=$1',[defender])).rows[0].state;
  const savedBefore=await ledger();
  for(const [level,hp,maxHp] of [[63,660,1320],[64,670,1340]]){
   f.profiles.quintus.growth.xp.aetherdragon=xpForLevel(level-39);
   await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[players[0].account,f]);
   const learningBefore=await familyBytes();
   for(let repeat=0;repeat<3;repeat++){
    const visible=(await read(1)).data;
    expect(visible.state.tiles.find(t=>t.id==='0,0').guards[0]).toMatchObject({id:'aetherdragon',level,hp,maxHp});
   }
   expect(await familyBytes()).toBe(learningBefore);
   // Snapshot projection must not spend resources, erase history, or alter enrollment.
   const after=await ledger();
   for(const key of ['energy','inventory','credited','log','enrollment'])expect(after[key]).toEqual(savedBefore[key]);
  }
  const learningBefore=await familyBytes(),command=await body(1,'claim',{tileId:'0,0',team});
  const fight=await call('conquest',command,1);expect(fight.status,JSON.stringify(fight.data)).toBe(200);
  const battle=fight.data.result.state.lastBattle;
  expect(battle.initialDefenders[0]).toMatchObject({level:64,hp:670,maxHp:1340});
  expect(battle.defendersAfter[0].hp).toBeLessThan(670);
  const after=await ledger();expect(after.units.aetherdragon).toEqual(battle.defendersAfter[0]);
  for(const key of ['energy','inventory','credited','enrollment'])expect(after[key]).toEqual(savedBefore[key]);
  expect(after.log).toContain('retained-progress');
  const retry=await call('conquest',command,1);expect(retry.data.replayed).toBe(true);expect(retry.data.result).toEqual(fight.data.result);
  expect((await ledger()).units.aetherdragon).toEqual(after.units.aetherdragon);
  expect(await familyBytes()).toBe(learningBefore);
  const relogin=await call('login',{username:players[0].username,password:'0042'},99);expect(relogin.status,JSON.stringify(relogin.data)).toBe(200);clients[0]=relogin;
  const reconnect=await read(0);expect(reconnect.status,JSON.stringify(reconnect.data)).toBe(200);const returned=reconnect.data.state.units.aetherdragon;
  expect(returned.level).toBe(64);expect(returned.hp).toBeGreaterThanOrEqual(after.units.aetherdragon.hp);
  expect(returned.hp-after.units.aetherdragon.hp).toBeLessThan(.2);
  expect(await familyBytes()).toBe(learningBefore);
 });
 it('credits authenticated learning answers once inside the same transaction',async()=>{
  const f=newFamily();f.profiles.quintus.growth.xp.tideglow=45;startRun(f,'quintus','math','shared-energy',1,false,taipeiDay());
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[players[0].account,f]);
  await setPlayer(0,{units:{tideglow:{id:'tideglow',element:'water',level:1,hp:40,maxHp:80}},updatedAt:Date.now()+60000});
  const state=(await call('state')).data,p=f.profiles.quintus,q=questionById(p.run.questions[0]);
  const cmd={id:randomUUID(),revision:state.family.revision,command:{type:'answer',player:'quintus',runId:p.run.id,index:0,choice:q.answer}};
  const before=(await read(0)).data.state.energy;
  const result=await Promise.all([call('command',cmd),call('command',cmd)]);expect(result.map(r=>r.status),JSON.stringify(result.map(r=>r.data))).toEqual([200,200]);
  expect((await read(0)).data.state.energy).toBe(before+10);
  const persisted=(await api.pool.query('SELECT state FROM conquest_players WHERE account_id=$1',[players[0].account])).rows[0].state;
  expect(persisted.units.tideglow).toMatchObject({level:2,hp:50,maxHp:100});
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[players[0].account,newFamily()]);baseline=await familyBytes();
 });
 it.each(['win','loss'])('synchronizes a same-household doudou attack against offline quintus: %s',async outcome=>{
  const sibling={member:randomUUID(),username:'sibling_'+randomUUID().slice(0,8)};
  const hash=await passwordHash('0042',undefined,4),idx=clients.length;
  await api.pool.query("INSERT INTO player_logins(id,account_id,username,password_hash,player_id,display_name) VALUES($1,$2,$3,$4,'doudou','Test sibling attacker')",[sibling.member,players[0].account,sibling.username,hash]);
  try {
   clients.push(await call('login',{username:sibling.username,password:'0042'},99));
   const siblingRead=()=>call('conquest?player=doudou',undefined,idx);
   const siblingBody=async(type,extra={})=>{const s=(await siblingRead()).data;return {player:'doudou',type,commandId:randomUUID(),revision:s.revision,season:s.state.season,...extra};};
   expect((await call('conquest',await siblingBody('join',{alliance:'light',hero:'hero-elf'}),idx)).status).toBe(200);
   const attacker=(await siblingRead()).data.me;
   await api.pool.query("UPDATE conquest_players SET state=jsonb_set(state,'{energy}','500'::jsonb) WHERE id=$1",[attacker]);
   expect((await action(0,'claim',{tileId:'0,0',team})).status).toBe(200);
   const defender=(await read(0)).data.me;
   if(outcome==='win') {
    const u=(await read(0)).data.state.units;for(const g of Object.values(u))g.hp=1;
    await setPlayer(0,{units:u,updatedAt:Date.now()+120000});
    await tile('0,0',t=>{t.guards.forEach(g=>g.hp=1);t.battleUntil=0;t.shieldStartsAt=0;t.shieldUntil=0;});
   } else {
    const f=(await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[players[0].account])).rows[0].family;
    f.profiles.quintus.owned.aetherdragon=1;f.profiles.quintus.firstAcquired.aetherdragon=taipeiDay();f.profiles.quintus.growth.xp.aetherdragon=xpForLevel(23);
    await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[players[0].account,f]);
    const unit={id:'aetherdragon',level:62,element:'water',hp:1300,maxHp:1300};
    await setPlayer(0,{units:{aetherdragon:unit},updatedAt:Date.now()+120000});
    await tile('0,0',t=>{t.guards=[unit];t.battleUntil=0;t.shieldStartsAt=0;t.shieldUntil=0;});
   }
   const savedFamily=await familyBytes();
   const defenderBefore=(await api.pool.query('SELECT state FROM conquest_players WHERE id=$1',[defender])).rows[0].state;
   await api.pool.query('DELETE FROM sessions WHERE member_id=$1',[players[0].member]);
   const command=await siblingBody('claim',{tileId:'0,0',team});
   const fight=await call('conquest',command,idx);expect(fight.status,JSON.stringify(fight.data)).toBe(200);
   const battle=fight.data.result.state.lastBattle;expect(battle.won).toBe(outcome==='win');
   expect(fight.data.state.energy).toBeCloseTo(500-battle.cost,6);
   const ledger=(await api.pool.query('SELECT state FROM conquest_players WHERE id=$1',[defender])).rows[0].state;
   for(const g of battle.defendersAfter)expect(ledger.units[g.id]).toEqual(g);
   const report=ledger.raidReports.find(r=>r.kind==='pvp');
   expect(report).toMatchObject({id:`pvp:${attacker}:${command.commandId}`,attackerId:attacker,attackerName:'Test sibling attacker',previousOwnerId:defender,nextOwnerId:outcome==='win'?attacker:defender,defended:outcome!=='win',territoryCountBefore:1,territoryCountAfter:outcome==='win'?0:1,defendersBefore:battle.initialDefenders,defendersAfter:battle.defendersAfter,attackersBefore:battle.initialAttackers,attackersAfter:battle.attackersAfter});
   expect(ledger.raidReadIds??[]).not.toContain(report.id);expect(ledger.npcRaids).toEqual(defenderBefore.npcRaids);
   expect(fight.data.state.raidReports??[]).not.toContainEqual(report);
   expect(JSON.stringify(report)).not.toContain(sibling.username);expect(JSON.stringify(report)).not.toContain(players[0].account);
   expect(ledger.energy).toBe(defenderBefore.energy);
   expect(ledger.inventory).toEqual(defenderBefore.inventory);
   expect(ledger.log[0]).toContain(outcome==='win'?'領地失守':'守軍成功防守');
   expect(fight.data.state.log[0]).toContain(outcome==='win'?'佔領成功':'出征未成功');
   for(const repeat of await Promise.all([call('conquest',command,idx),call('conquest',command,idx)])) {
    expect(repeat.status).toBe(200);expect(repeat.data.replayed).toBe(true);expect(repeat.data.result).toEqual(fight.data.result);expect(repeat.data.state.energy).toBe(fight.data.state.energy);
   }
   clients[0]=await call('login',{username:players[0].username,password:'0042'},99);expect(clients[0].status,JSON.stringify(clients[0].data)).toBe(200);
   clients[idx]=await call('login',{username:sibling.username,password:'0042'},99);expect(clients[idx].status,JSON.stringify(clients[idx].data)).toBe(200);
   const defenderView=(await read(0)).data,attackerView=(await siblingRead()).data;
   const owner=outcome==='win'?attacker:defender;
   expect(defenderView.state.tiles.find(t=>t.id==='0,0').owner).toBe(owner);expect(attackerView.state.tiles.find(t=>t.id==='0,0').owner).toBe(owner);
   expect(defenderView.state.tiles.map(t=>[t.id,t.owner])).toEqual(attackerView.state.tiles.map(t=>[t.id,t.owner]));
   expect(defenderView.players.map(p=>[p.id,p.count])).toEqual(attackerView.players.map(p=>[p.id,p.count]));
   expect(attackerView.state.energy).toBeCloseTo(500-battle.cost,6);expect(defenderView.state.energy).toBe(defenderBefore.energy);
   for(const g of battle.attackersAfter){const live=attackerView.state.units[g.id];expect(live.level).toBe(g.level);expect(live.hp).toBeGreaterThanOrEqual(g.hp);expect(live.hp-g.hp).toBeLessThan(.2);}
   expect(defenderView.state.raidReports.filter(r=>r.id===report.id)).toEqual([report]);
   expect(attackerView.state.raidReports??[]).not.toContainEqual(report);
   const beforeAck=(await api.pool.query('SELECT state FROM conquest_players WHERE id=$1',[defender])).rows[0].state;
   const ack=await call('conquest/reports/read',{player:'quintus',reportIds:[report.id]});expect(ack.status).toBe(200);expect(ack.data.raidReadIds).toContain(report.id);
   const afterAck=(await api.pool.query('SELECT state FROM conquest_players WHERE id=$1',[defender])).rows[0].state;
   expect({...afterAck,raidReadIds:undefined}).toEqual({...beforeAck,raidReadIds:undefined});
   clients[0]=await call('login',{username:players[0].username,password:'0042'},99);
   expect((await read(0)).data.state.raidReadIds).toContain(report.id);
   expect(await familyBytes()).toBe(savedFamily);
  } finally {
   clients.splice(idx,1);
   await api.pool.query('DELETE FROM sessions WHERE member_id=$1',[sibling.member]);
   await api.pool.query('DELETE FROM player_logins WHERE id=$1',[sibling.member]);
  }
 });

 it('rolls back defender reports, both armies and ownership when receipt persistence fails',async()=>{
  await action(0,'claim',{tileId:'0,0',team});
  await tile('0,0',t=>{t.battleUntil=0;t.shieldUntil=0;t.shieldStartsAt=0;});
  const command=await body(1,'claim',{tileId:'0,0',team});
  const snapshot=async()=>({players:(await api.pool.query('SELECT * FROM conquest_players ORDER BY id')).rows,world:(await api.pool.query('SELECT * FROM conquest_worlds')).rows,receipts:(await api.pool.query('SELECT * FROM conquest_commands ORDER BY player_id,id')).rows});
  const before=await snapshot(),family=await familyBytes();
  await api.pool.query("CREATE FUNCTION pvp_report_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected PvP receipt failure'; END $$");
  await api.pool.query('CREATE TRIGGER pvp_report_fail BEFORE INSERT ON conquest_commands FOR EACH ROW EXECUTE FUNCTION pvp_report_fail()');
  try {expect((await call('conquest',command,1)).status).toBe(503);expect(await snapshot()).toEqual(before);expect(await familyBytes()).toBe(family);}
  finally {await api.pool.query('DROP TRIGGER pvp_report_fail ON conquest_commands');await api.pool.query('DROP FUNCTION pvp_report_fail()');}
  expect((await call('conquest',command,1)).status).toBe(200);
  const defender=(await read(0)).data;expect(defender.state.raidReports.filter(r=>r.kind==='pvp')).toHaveLength(1);
 });

});
