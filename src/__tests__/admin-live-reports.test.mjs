import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionAdmin} from '../../server/admin.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {passwordHash} from '../../server/credentials.mjs';
import {grantTickets} from '../../server/star-ticket-admin.mjs';
import {newFamily,draw,validateFamily,selectAbilitySnapshot,observeStudy,questionById,selectQuestions,taipeiDay} from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('admin live presence, radar and per-child parent reports',()=>{
 let api,server,url,owner,staff,children=[],clients=[];const suffix=randomUUID().slice(0,8),password='local-report-test-password';
 async function call(path,body,c){const r=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(c?{Cookie:c.cookie,'X-CSRF-Token':c.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const client=r=>({cookie:r.cookie,csrf:r.data.csrf});
 const beat=(c,id,sequence=1,active=true)=>call('presence',{clientId:id,sequence,active,player:'quintus',activity:'learning'},c);
 const live=async c=>{const r=await call('admin/presence',undefined,c??owner);expect(r.status).toBe(200);return r.data;};
 const entry=(data,index)=>data.students.find(s=>s.memberId===children[index].memberId);
 const online=(data,index)=>entry(data,index).onlineUntil>data.serverNow;
 const rows=async()=> (await api.pool.query('SELECT * FROM game_states WHERE account_id=ANY($1::uuid[]) ORDER BY account_id',[children.map(c=>c.accountId)])).rows;
 beforeAll(async()=>{api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;await api.pool.query('DELETE FROM request_limits');await provisionAdmin(api.pool,{username:'reports_'+suffix,password});owner=client(await call('admin/login',{username:'reports_'+suffix,password}));
  for(const part of ['one','two']){const username='report_'+part+'_'+suffix,made=await provisionChildAccount(api.pool,{username,displayName:'Report '+part,grade:4,password:'2864'});const memberId=(await api.pool.query('SELECT id FROM player_logins WHERE username=$1',[username])).rows[0].id;children.push({...made,username,memberId});const f=newFamily(),p=f.profiles.quintus;
   for(const qid of selectQuestions(4,'math',[],1).slice(0,part==='one'?1:2))observeStudy(p.learning,questionById(qid),part==='one',false,taipeiDay());
   p.milestones.masteryPoints=108;p.milestones.subjectGrowth.math={masteryPoints:84,creditedAnswers:7};p.milestones.subjectGrowth.science={masteryPoints:24,creditedAnswers:2};p.tickets=2;draw(f,'quintus','report-draw-'+part,0,0);f.log.push({id:'private-other-player',time:Date.now(),text:'OTHER_CHILD_PRIVATE_LEDGER'});
   await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,validateFamily(f)]);const login=await call('login',{username,password:'2864'});expect(login.status).toBe(200);clients.push(client(login));
  }
  const hash=await passwordHash(password,undefined,10);await api.pool.query("INSERT INTO admin_users(id,username,display_name,password_hash,role,member_ids) VALUES($1,$2,'Report reader',$3,'staff',$4)",[randomUUID(),'reader_'+suffix,hash,[children[0].memberId]]);staff=client(await call('admin/login',{username:'reader_'+suffix,password}));
 },30000);
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 it('requires admin authority and preserves assigned child scope',async()=>{
  for(const c of [undefined,clients[0]])for(const path of ['admin/presence','admin/parent/'+children[0].memberId])expect((await call(path,undefined,c)).status).toBe(401);
  expect((await live(staff)).students.map(s=>s.memberId)).toEqual([children[0].memberId]);
  for(const child of children)expect((await call('admin/parent/'+child.memberId,undefined,staff)).status).toBe(403);
  expect((await call('admin/parent/'+randomUUID(),undefined,owner)).status).toBe(404);
 });
 it('does not treat a recent login or administrative reads as online activity',async()=>{
  const before=await rows(),data=await live();expect(online(data,0)).toBe(false);expect(entry(data,0).lastSeenAt).toBeGreaterThan(0);
  await call('admin/students',undefined,owner);await call('admin/parent/'+children[0].memberId,undefined,owner);expect(await rows()).toEqual(before);expect(online(await live(),0)).toBe(false);
 });
 it('keeps same-grade players separate and aggregates multiple devices until all leave',async()=>{
  const tab=randomUUID(),tab2=randomUUID();expect((await beat(clients[0],tab)).status).toBe(200);let data=await live();expect(online(data,0)).toBe(true);expect(online(data,1)).toBe(false);expect(entry(data,0).activity).toBe('learning');expect(entry(data,0).onlineUntil-data.serverNow).toBeLessThanOrEqual(35000);
  const second=client(await call('login',{username:children[0].username,password:'2864'}));await beat(second,tab2);await beat(clients[0],tab,2,false);expect(online(await live(),0)).toBe(true);await call('logout',{},second);expect(online(await live(),0)).toBe(false);
 });
 it('expires stale leases and caps presence at the actual session expiry',async()=>{
  const tab=randomUUID();await beat(clients[0],tab);await api.pool.query("UPDATE presence_leases SET seen_at=now()-interval '36 seconds' WHERE client_id=$1",[tab]);expect(online(await live(),0)).toBe(false);
  const short=client(await call('login',{username:children[1].username,password:'2864'}));await beat(short,randomUUID());await api.pool.query("UPDATE sessions SET expires_at=now()+interval '2 seconds' WHERE csrf=$1",[short.csrf]);const data=await live();expect(online(data,1)).toBe(true);expect(entry(data,1).onlineUntil-data.serverNow).toBeLessThanOrEqual(2000);await api.pool.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE csrf=$1",[short.csrf]);expect(online(await live(),1)).toBe(false);
 });
 it('does not revive a closed tab after a delayed older heartbeat',async()=>{
  const tab=randomUUID();await beat(clients[0],tab,3,false);await beat(clients[0],tab,2,true);expect(online(await live(),0)).toBe(false);
 });
 it('returns the exact main-site ability calculation without answer keys or raw progress',async()=>{
  const before=await rows(),r=await call('admin/students',undefined,owner);expect(r.status).toBe(200);const row=r.data.students.find(s=>s.memberId===children[0].memberId);const saved=before.find(s=>s.account_id===children[0].accountId);
  expect(row.ability).toEqual(selectAbilitySnapshot(saved.family.profiles.quintus.milestones));expect(row.ability.math.value).toBe(18);expect(row.ability.english).toMatchObject({value:10,creditedAnswers:0,stage:{name:'待探索'}});expect(await rows()).toEqual(before);expect(JSON.stringify(r.data)).not.toMatch(/"questions"|password_hash|token_hash|"family"/);
 });
 it('parent reports only the selected child and typed grants, with no child data mutation',async()=>{
  for(const [index,ticketType] of [[0,'standard'],[1,'star']])await grantTickets(api.pool,{grantId:randomUUID(),username:children[index].username,ticketType,amount:2,reason:'Report grant '+index,operator:'test'},{apply:true});
  const before=await rows(),r=await call('admin/parent/'+children[0].memberId,undefined,owner);expect(r.status).toBe(200);expect(r.data).toMatchObject({memberId:children[0].memberId,username:children[0].username,collection:{draws:1},lastDraw:{ticketType:'standard'}});expect(r.data.grants).toHaveLength(1);expect(r.data.grants[0]).toMatchObject({ticketType:'standard',reason:'Report grant 0'});expect(JSON.stringify(r.data)).not.toMatch(/OTHER_CHILD_PRIVATE_LEDGER|Report grant 1|"questions"|password_hash|token_hash|"family"/);expect(await rows()).toEqual(before);
 });
 it('returns only the selected child review summary without mutation or answer leakage',async()=>{
  const before=await rows();
  for(const [index,expected] of [[0,{independent:1,correct:1,accuracy:100}],[1,{independent:2,correct:0,accuracy:0}]]) {
   const r=await call('admin/parent/'+children[index].memberId,undefined,owner);expect(r.status).toBe(200);expect(r.data.study).toMatchObject(expected);expect(r.data.study).not.toHaveProperty('entries');
  }
  expect(await rows()).toEqual(before);
 });
 it('isolates invalid progress rather than inventing radar values or parent counts',async()=>{
  const original=(await rows()).find(r=>r.account_id===children[1].accountId);await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[children[1].accountId,{version:0}]);
  try{const r=await call('admin/students',undefined,owner);expect(r.data.students.find(s=>s.memberId===children[1].memberId)).toMatchObject({available:false,ability:null});expect((await call('admin/parent/'+children[1].memberId,undefined,owner)).status).toBe(422);expect((await live()).students.some(s=>s.memberId===children[1].memberId)).toBe(true);}finally{await api.pool.query('UPDATE game_states SET family=$2,updated_at=$3 WHERE account_id=$1',[children[1].accountId,original.family,original.updated_at]);}
 });
 it('revokes report access with disabled admins',async()=>{await api.pool.query("UPDATE admin_users SET enabled=false WHERE username=$1",['reader_'+suffix]);expect((await call('admin/presence',undefined,staff)).status).toBe(401);});
});
