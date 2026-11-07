import{beforeAll,afterAll,describe,it,expect}from'vitest';
import{randomUUID}from'node:crypto';
import{createCloudApi}from'../../server/cloud.mjs';
import{createAppServer}from'../../server.mjs';
import{provisionChildAccount}from'../../server/child-account.mjs';
import{validateFamily,newFamily,initialCompanion,ROSTER}from'../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('mutually confirmed cross-account companion exchanges',()=>{
 let api,server,url,adult,child,stranger,aId,cId;
 const username='tradeqa_'+randomUUID().slice(0,8),password='Synthetic-adult-trade-2026';
 const call=async(path,body,c)=>{const r=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body!==undefined?{'Content-Type':'application/json'}:{}),...(c?{Cookie:c.cookie,'X-CSRF-Token':c.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();return{status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0],csrf:data.csrf};};
 const path=c=>c===adult?'adult/game/friend-trades':'friend-trades';
 async function trade(c,action,extra={},id=randomUUID()){return call(path(c),{player:'quintus',action,commandId:id,...extra},c);}
 async function snapshot(){return(await api.pool.query('SELECT account_id,family,verified FROM game_states WHERE account_id=ANY($1::uuid[]) ORDER BY account_id',[[aId,cId]])).rows;}
 const cards=ROSTER.filter(p=>p.rarity==='E').map(p=>p.id);let give,receive;
 async function profile(id){return(await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[id])).rows[0].family.profiles.quintus;}
 beforeAll(async()=>{
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false,npcRaidsEnabled:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;await api.pool.query('DELETE FROM request_limits');
  const makeChild=async suffix=>{const identity=await provisionChildAccount(api.pool,{username:username+suffix,password:'0042',displayName:'Synthetic child '+suffix,grade:4});const c=await call('login',{username:username+suffix,password:'0042'});c.identity=identity;for(const type of['starter-draw','starter-confirm']){const r=await call('command',{id:randomUUID(),revision:c.data.family.revision,command:{type,player:'quintus'}},c);expect(r.status).toBe(200);c.data=r.data;}return c;};
  child=await makeChild('c');cId=child.identity.accountId;stranger=await makeChild('s');
  const historical=(await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[cId])).rows[0].family;historical.profiles.quintus=newFamily().profiles.quintus;await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[cId,validateFamily(historical)]);
  adult=await call('adult/register',{username,password});expect(adult.status).toBe(200);let r=await call('adult/command',{username,id:randomUUID(),revision:0,command:{type:'profile',name:'Synthetic adult trade',track:'everyday',dailyGoal:6}},adult);adult.learning=r.data.state;r=await call('adult/game/enter',{},adult);expect(r.status).toBe(200);adult.data=r.data;aId=(await api.pool.query('SELECT id FROM adult_english_users WHERE username=$1',[username])).rows[0].id;
  for(const type of['starter-draw','starter-confirm']){r=await call('adult/game/command',{id:randomUUID(),revision:adult.data.family.revision,command:{type,player:'quintus'}},adult);expect(r.status).toBe(200);adult.data=r.data;}
  const starters=[initialCompanion(await profile(aId)),initialCompanion(await profile(cId))];[give,receive]=cards.filter(c=>!starters.includes(c)).slice(0,2);expect(receive).toBeTruthy();
  // Seed only this suite's synthetic inventories, preserving otherwise-valid real game structure.
  for(const[id,card]of[[aId,give],[cId,receive]]){const row=(await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[id])).rows[0];row.family.profiles.quintus.owned[card]=1;row.family.profiles.quintus.firstAcquired[card]='2026-11-06';row.family.profiles.quintus.growth.xp[card]=120;row.family.profiles.quintus.equipped=card;await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[id,validateFamily(row.family)]);}
 },30000);
 afterAll(async()=>{if(server)await new Promise(r=>server.close(r));await api?.close();});
 it('cannot enumerate or propose to an unlinked child and cannot forge the player slot',async()=>{
  expect((await call(path(adult)+'?player=quintus&friend='+child.identity.memberId,undefined,adult)).status).toBe(403);expect((await trade(adult,'propose',{friend:child.identity.memberId,give,receive})).status).toBe(403);
  expect((await call(path(adult),{player:'feifei',action:'propose',commandId:randomUUID(),friend:child.identity.memberId,give,receive},adult)).status).toBe(403);
 });
 it('supports declining a family invitation without creating friendships',async()=>{
  const code=(await call('crew',{player:'quintus',action:'create'},child)).data.code,r=await call('adult/game/crew',{player:'quintus',action:'request',code},adult);expect(r.status).toBe(200);expect((await call('crew',{player:'quintus',action:'decline',requestId:r.data.requests[0].id},child)).status).toBe(200);expect((await call(path(adult)+'?player=quintus&friend='+child.identity.memberId,undefined,adult)).status).toBe(403);
 });
 it('exposes only eligible cards after the child confirms the family invitation',async()=>{
  const code=(await call('crew',{player:'quintus',action:'create'},child)).data.code,r=await call('adult/game/crew',{player:'quintus',action:'request',code},adult);expect(r.status).toBe(200);expect((await call('crew',{player:'quintus',action:'accept',requestId:r.data.requests[0].id},child)).status).toBe(200);
  const view=await call(path(adult)+'?player=quintus&friend='+child.identity.memberId,undefined,adult);expect(view.status).toBe(200);expect(view.data.mine).toEqual([{id:give,copies:1}]);expect(view.data.theirs).toEqual([{id:receive,copies:1}]);expect(JSON.stringify(view.data)).not.toContain('learning');
  expect((await trade(adult,'propose',{friend:child.identity.memberId,give:(await profile(aId)).onboarding.pet,receive})).status).toBe(409);
 });
 it('proposals and replay never move cards; only the recipient can accept',async()=>{
  const before=await snapshot(),id=randomUUID(),body={friend:child.identity.memberId,give,receive};expect((await trade(adult,'propose',body,id)).status).toBe(200);expect((await trade(adult,'propose',body,id)).status).toBe(200);expect((await trade(adult,'propose',{...body,receive:give},id)).status).toBe(409);
  expect((await trade(adult,'accept',{offer:id})).status).toBe(403);expect((await trade(stranger,'accept',{offer:id})).status).toBe(404);expect(await snapshot()).toEqual(before);
  expect((await trade(adult,'cancel',{offer:id})).status).toBe(200);expect((await trade(adult,'cancel',{offer:id})).status).toBe(200);expect((await trade(child,'accept',{offer:id})).status).toBe(409);expect(await snapshot()).toEqual(before);
 });
 it('supports child-to-adult rejection with no reward or inventory mutation',async()=>{
  const before=await snapshot(),id=randomUUID();expect((await trade(child,'propose',{friend:aId,give:receive,receive:give},id)).status).toBe(200);expect((await trade(adult,'decline',{offer:id})).status).toBe(200);expect((await trade(adult,'decline',{offer:id})).status).toBe(200);expect(await snapshot()).toEqual(before);
 });
 it('blocks an accept during an adult lesson and safely resumes after it ends',async()=>{
  const id=randomUUID();expect((await trade(adult,'propose',{friend:child.identity.memberId,give,receive},id)).status).toBe(200);
  let r=await call('adult/command',{username,id:randomUUID(),revision:adult.learning.revision,command:{type:'lesson-start',lessonId:'hello'}},adult);expect(r.status).toBe(200);adult.learning=r.data.state;
  expect((await trade(child,'accept',{offer:id})).status).toBe(409);
  r=await call('adult/command',{username,id:randomUUID(),revision:adult.learning.revision,command:{type:'end',sessionId:adult.learning.session.id}},adult);expect(r.status).toBe(200);adult.learning=r.data.state;
  const before=await snapshot(),acceptId=randomUUID();const results=await Promise.all([trade(child,'accept',{offer:id},acceptId),trade(child,'accept',{offer:id},acceptId),trade(child,'accept',{offer:id})]);expect(results.map(r=>r.status)).toEqual([200,200,200]);
  const after=await snapshot();for(let i=0;i<before.length;i++){const a=after[i],b=before[i],p=a.family.profiles.quintus,old=b.family.profiles.quintus,own=a.account_id===aId?give:receive,newCard=a.account_id===aId?receive:give;
   expect(p.owned[own]).toBeUndefined();expect(p.owned[newCard]).toBe(1);expect(p.equipped).toBe(initialCompanion(p));expect(p.growth).toEqual(old.growth);expect(a.verified).toEqual(b.verified);expect(a.family.revision).toBe(b.family.revision+1);
   const mutable=['owned','firstAcquired','equipped'];for(const k of Object.keys(old))if(!mutable.includes(k))expect(p[k],k).toEqual(old[k]);
   for(const key of Object.keys(b.family.profiles).filter(k=>k!=='quintus'))expect(a.family.profiles[key]).toEqual(b.family.profiles[key]);
  }
  const saved=await snapshot();expect((await trade(child,'accept',{offer:id})).status).toBe(200);expect(await snapshot()).toEqual(saved);
 });
 it('supports a confirmed exchange initiated by the child in the opposite direction',async()=>{
  const id=randomUUID();expect((await trade(child,'propose',{friend:aId,give,receive},id)).status).toBe(200);expect((await trade(adult,'accept',{offer:id})).status).toBe(200);expect((await profile(aId)).owned[give]).toBe(1);expect((await profile(cId)).owned[receive]).toBe(1);
 });
 it('serializes accept versus cancel so only one outcome commits',async()=>{
  const id=randomUUID();expect((await trade(adult,'propose',{friend:child.identity.memberId,give,receive},id)).status).toBe(200);const before=await snapshot(),r=await Promise.all([trade(child,'accept',{offer:id}),trade(adult,'cancel',{offer:id})]);expect(r.filter(x=>x.status===200)).toHaveLength(1);expect(r.filter(x=>x.status===409)).toHaveLength(1);
  const accepted=(await api.pool.query('SELECT status FROM friend_trades WHERE id=$1',[id])).rows[0].status==='accepted',after=await snapshot();if(!accepted)expect(after).toEqual(before);else for(const row of after)expect(row.family.revision).toBe(before.find(b=>b.account_id===row.account_id).family.revision+1);
 });
 it('survives a server restart with durable offers and receipts',async()=>{
  const before=await snapshot(),offers=(await call(path(adult)+'?player=quintus',undefined,adult)).data;
  await new Promise(r=>server.close(r));await api.close();api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false,npcRaidsEnabled:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  expect((await call(path(adult)+'?player=quintus',undefined,adult)).data).toEqual(offers);expect(await snapshot()).toEqual(before);
 });
});
