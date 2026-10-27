import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionAdmin} from '../../server/admin.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily} from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('separate super-admin authority and audited grants',()=>{
 let api,server,url,admin,child,parent,students=[],adminName;
 const password='local-admin-test-only-2026',suffix=randomUUID().replaceAll('-','').slice(0,10);
 async function call(path,body,client,headers={}){
  const r=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(client?{Cookie:client.cookie,'X-CSRF-Token':client.csrf}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};
 }
 const client=r=>({cookie:r.cookie.split(';')[0],csrf:r.data.csrf});
 const stored=async id=>(await api.pool.query('SELECT * FROM game_states WHERE account_id=$1',[id])).rows[0];
 beforeAll(async()=>{
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});await api.pool.query('DELETE FROM request_limits');server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  adminName='Admin_'+suffix;await provisionAdmin(api.pool,{username:adminName,password});
  for(const part of ['one','two']){
   const username=`admqa_${part}_${suffix}`;
   const made=await provisionChildAccount(api.pool,{username,password:'0482',displayName:'Synthetic '+part,grade:4});
   const family=newFamily();family.profiles.quintus.learning.skills.math={level:2,answered:5,correct:3,recent:'101h1',reviewDay:''};
   await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,family]);students.push({...made,username});
  }
  child=client(await call('login',{username:students[0].username,password:'0482'}));
  parent=client(await call('register',{username:'admqa_parent_'+suffix,password}));
  const r=await call('admin/login',{username:adminName.toUpperCase(),password});expect(r.status).toBe(200);admin=client(r);
 },30000);
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 it('creates only an explicit hashed admin, refusing credential overwrite',async()=>{
  const row=(await api.pool.query('SELECT * FROM admin_users WHERE username=$1',[adminName.toLowerCase()])).rows[0];
  expect(row.password_hash).not.toContain(password);expect(row.role).toBe('super_admin');
  expect(await provisionAdmin(api.pool,{username:adminName,password})).toMatchObject({created:false});
  await expect(provisionAdmin(api.pool,{username:adminName,password:'different-test-password'})).rejects.toThrow('未覆寫');
 });
 it('denies every admin route to anonymous, child, and household sessions',async()=>{
  for(const c of [undefined,child,parent])for(const [path,body] of [['admin/session',undefined],['admin/students',undefined],['admin/grants',undefined],['admin/tickets/preview',{}],['admin/tickets/grant',{}],['admin/logout',{}]])expect((await call(path,body,c)).status).toBe(401);
  expect((await call('state',undefined,admin)).status).toBe(401);
 });
 it('does not accept registration or forged role/operator assertions',async()=>{
  expect((await call('admin/register',{username:'other',password},admin)).status).toBe(404);
  expect((await call('admin/tickets/grant',{grantId:randomUUID(),username:students[0].username,amount:1,reason:'QA',operator:'forged'},admin)).status).toBe(400);
  expect((await call('admin/login',{username:adminName,password,role:'super_admin'})).status).toBe(400);
 });
 it('checks exact origin and CSRF before any grant',async()=>{
  const body={grantId:randomUUID(),username:students[0].username,amount:1,reason:'QA'};
  expect((await call('admin/tickets/grant',body,admin,{Origin:'https://other.invalid'})).status).toBe(403);
  expect((await call('admin/tickets/grant',body,admin,{'X-CSRF-Token':'wrong'})).status).toBe(403);
  expect((await call('admin/login',{username:adminName,password},undefined,{Origin:'https://other.invalid'})).status).toBe(403);
 });
 it('returns actual member identity and scoped learning aggregates without writing progress',async()=>{
  const before=await stored(students[0].accountId),r=await call('admin/students',undefined,admin);
  expect(r.status).toBe(200);const rows=r.data.students.filter(s=>students.some(t=>t.username===s.username));expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({displayName:'Synthetic one',grade:4,playerId:'quintus',answered:5,correct:3,lastSeen:expect.any(String)});
  expect(rows[1]).toMatchObject({displayName:'Synthetic two',grade:4,lastSeen:null});
  expect(rows[0].skills).toEqual([{key:'math',level:2,answered:5,correct:3,recent:'101h1'}]);
  expect(await stored(students[0].accountId)).toEqual(before);
  expect(JSON.stringify(r.data)).not.toMatch(/password_hash|recovery_hash|token_hash|"csrf"|"family"|"questions"/);
 });
 it('isolates malformed learning records and never invents zero balances',async()=>{
  const original=await stored(students[1].accountId);
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[students[1].accountId,{version:0}]);
  try {
   const r=await call('admin/students',undefined,admin);expect(r.status).toBe(200);
   expect(r.data.students.find(x=>x.username===students[1].username)).toMatchObject({available:false,starTickets:null,answered:null});
   expect(r.data.students.find(x=>x.username===students[0].username).available).toBe(true);
   expect((await stored(students[1].accountId)).family).toEqual({version:0});
  } finally {await api.pool.query('UPDATE game_states SET family=$2,updated_at=$3 WHERE account_id=$1',[students[1].accountId,original.family,original.updated_at]);}
 });
 it('previews without changing balance then serializes concurrent duplicates into one receipt',async()=>{
  const before=await stored(students[0].accountId),other=await stored(students[1].accountId);
  const body={grantId:randomUUID(),username:students[0].username,amount:3,reason:'完成學習目標'};
  const preview=await call('admin/tickets/preview',body,admin);expect(preview.status).toBe(200);expect(preview.data.receipt).toMatchObject({before:0,after:3,preview:true});expect(await stored(students[0].accountId)).toEqual(before);
  const pair=await Promise.all([call('admin/tickets/grant',body,admin),call('admin/tickets/grant',body,admin)]);
  expect(pair.map(x=>x.status)).toEqual([200,200]);expect(pair.filter(x=>x.data.receipt.replayed)).toHaveLength(1);
  const after=await stored(students[0].accountId);const expected=structuredClone(before.family);expected.revision++;expected.profiles.quintus.starTickets=3;
  expect(after.family).toEqual(expected);expect(after.verified).toEqual(before.verified);expect(after.legacy_archive).toEqual(before.legacy_archive);expect(await stored(students[1].accountId)).toEqual(other);
  const receipt=pair[0].data.receipt;expect(receipt.operator).toBe('admin:'+adminName.toLowerCase());
  expect((await call('admin/grants',undefined,admin)).data.receipts.some(r=>r.grantId===body.grantId)).toBe(true);
  expect((await call('admin/tickets/grant',{...body,amount:4},admin)).status).toBe(400);
  // A later spend must never be refilled by replay of the original request.
  expected.profiles.quintus.starTickets=0;await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[students[0].accountId,expected]);
  expect((await call('admin/tickets/grant',body,admin)).data.receipt.replayed).toBe(true);
  expect((await stored(students[0].accountId)).family.profiles.quintus.starTickets).toBe(0);
 });
 it('rejects invalid amount, missing member and blank reason',async()=>{
  for(const patch of [{amount:0},{amount:101},{amount:1.5},{username:'missing_'+suffix},{reason:'  '}]){
   const r=await call('admin/tickets/grant',{grantId:randomUUID(),username:students[0].username,amount:1,reason:'QA',...patch},admin);expect(r.status).toBe(400);
  }
 });
 it('rejects an exceeded cap after preview without changing balance or issuing a receipt',async()=>{
  const original=await stored(students[1].accountId),family=structuredClone(original.family);
  family.profiles.quintus.starTickets=9998;await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[students[1].accountId,family]);
  const body={grantId:randomUUID(),username:students[1].username,amount:2,reason:'cap race'};
  try {
   expect((await call('admin/tickets/preview',body,admin)).status).toBe(200);
   expect((await call('admin/tickets/grant',{...body,grantId:randomUUID()},admin)).status).toBe(200);
   const before=await stored(students[1].accountId);
   expect((await call('admin/tickets/grant',body,admin)).status).toBe(400);
   expect(await stored(students[1].accountId)).toEqual(before);
   expect((await api.pool.query('SELECT grant_id FROM star_ticket_grants WHERE grant_id=$1',[body.grantId])).rowCount).toBe(0);
  } finally {await api.pool.query('UPDATE game_states SET family=$2,updated_at=$3 WHERE account_id=$1',[students[1].accountId,original.family,original.updated_at]);}
 });
 it('grants ordinary tickets once, preserves all other progress, and can spend them in normal gacha',async()=>{
  const before=await stored(students[0].accountId),other=await stored(students[1].accountId);
  const body={grantId:randomUUID(),username:students[0].username,ticketType:'standard',amount:3,reason:'一般券測試'};
  const preview=await call('admin/tickets/preview',body,admin);expect(preview.status).toBe(200);expect(preview.data.receipt).toMatchObject({ticketType:'standard',before:before.family.profiles.quintus.tickets,after:before.family.profiles.quintus.tickets+3,preview:true});expect(await stored(students[0].accountId)).toEqual(before);
  const pair=await Promise.all([call('admin/tickets/grant',body,admin),call('admin/tickets/grant',body,admin)]);
  expect(pair.map(r=>r.status)).toEqual([200,200]);expect(pair.filter(r=>r.data.receipt.replayed)).toHaveLength(1);
  const expected=structuredClone(before.family);expected.revision++;expected.profiles.quintus.tickets+=3;
  const after=await stored(students[0].accountId);expect(after.family).toEqual(expected);expect(after.verified).toEqual(before.verified);expect(after.legacy_archive).toEqual(before.legacy_archive);expect(await stored(students[1].accountId)).toEqual(other);
  expect((await call('admin/tickets/grant',{...body,ticketType:'star'},admin)).status).toBe(400);
  const command={id:randomUUID(),revision:expected.revision,command:{type:'draw',player:'quintus'}};
  const draws=await Promise.all([call('command',command,child),call('command',command,child)]);expect(draws.map(r=>r.status)).toEqual([200,200]);expect(draws[0].data.result).toEqual(draws[1].data.result);
  const spent=await stored(students[0].accountId);expect(spent.family.profiles.quintus.tickets).toBe(expected.profiles.quintus.tickets-1);expect(spent.family.profiles.quintus.starTickets).toBe(expected.profiles.quintus.starTickets);
  expect((await call('admin/tickets/grant',body,admin)).data.receipt).toMatchObject({replayed:true,ticketType:'standard'});expect(await stored(students[0].accountId)).toEqual(spent);
  expect((await call('admin/tickets/status',{grantId:body.grantId},admin)).data.status).toBe('applied');
  expect((await call('admin/grants',undefined,admin)).data.receipts.find(r=>r.grantId===body.grantId).ticketType).toBe('standard');
 });
 it('preserves untyped legacy star receipts and rejects reusing their UUID as ordinary tickets',async()=>{
  const body={grantId:randomUUID(),username:students[0].username,amount:1,reason:'Legacy star receipt'};
  expect((await call('admin/tickets/grant',body,admin)).status).toBe(200);
  await api.pool.query("UPDATE star_ticket_grants SET payload=payload-'ticketType',receipt=receipt-'ticketType' WHERE grant_id=$1",[body.grantId]);
  const before=await stored(students[0].accountId);
  expect((await call('admin/tickets/grant',{...body,ticketType:'star'},admin)).data.receipt).toMatchObject({ticketType:'star',replayed:true});
  expect((await call('admin/tickets/grant',body,admin)).data.receipt.ticketType).toBe('star');
  expect((await call('admin/tickets/grant',{...body,ticketType:'standard'},admin)).status).toBe(400);
  expect((await call('admin/grants',undefined,admin)).data.receipts.find(r=>r.grantId===body.grantId).ticketType).toBe('star');expect(await stored(students[0].accountId)).toEqual(before);
 });
 it('serializes different ticket types without losing either balance',async()=>{
  const before=(await stored(students[0].accountId)).family;
  const results=await Promise.all(['standard','star'].map(ticketType=>call('admin/tickets/grant',{grantId:randomUUID(),username:students[0].username,ticketType,amount:2,reason:'Concurrent types'},admin)));
  expect(results.map(r=>r.status)).toEqual([200,200]);const expected=structuredClone(before);expected.revision+=2;expected.profiles.quintus.tickets+=2;expected.profiles.quintus.starTickets+=2;expect((await stored(students[0].accountId)).family).toEqual(expected);
 });
 it('rejects invalid ticket types and honors the existing ordinary balance cap',async()=>{
  const body={grantId:randomUUID(),username:students[1].username,ticketType:'standard',amount:1,reason:'Cap check'};
  for(const ticketType of [null,{},['standard'],'free','tickets','STAR'])expect((await call('admin/tickets/grant',{...body,ticketType},admin)).status).toBe(400);
  const original=await stored(students[1].accountId),family=structuredClone(original.family);family.profiles.quintus.tickets=9999999;
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[students[1].accountId,family]);
  try {
   expect((await call('admin/tickets/grant',body,admin)).data.receipt.after).toBe(10000000);
   const before=await stored(students[1].accountId);expect((await call('admin/tickets/grant',{...body,grantId:randomUUID()},admin)).status).toBe(400);expect(await stored(students[1].accountId)).toEqual(before);
  }finally{await api.pool.query('UPDATE game_states SET family=$2,updated_at=$3 WHERE account_id=$1',[students[1].accountId,original.family,original.updated_at]);}
 });
 it('rejects wrong credentials and disables revoked admins immediately',async()=>{
  expect((await call('admin/login',{username:adminName,password:'wrong-password'})).status).toBe(401);
  await api.pool.query('UPDATE admin_users SET enabled=false WHERE username=$1',[adminName.toLowerCase()]);
  expect((await call('admin/students',undefined,admin)).status).toBe(401);
  await api.pool.query('UPDATE admin_users SET enabled=true WHERE username=$1',[adminName.toLowerCase()]);
 });
 it('uses separate HttpOnly Strict cookies and rejects expired/logged-out sessions',async()=>{
  const r=await call('admin/login',{username:adminName,password});expect(r.cookie).toMatch(/^star-tide-admin=/);expect(r.cookie).toContain('HttpOnly; SameSite=Strict');
  const c=client(r);expect((await call('admin/logout',{},c)).status).toBe(200);expect((await call('admin/session',undefined,c)).status).toBe(401);
  await api.pool.query("UPDATE admin_sessions SET expires_at=now()-interval '1 second' WHERE admin_id=(SELECT id FROM admin_users WHERE username=$1)",[adminName.toLowerCase()]);
  expect((await call('admin/students',undefined,admin)).status).toBe(401);
  expect((await call('state',undefined,child)).status).toBe(200);
 });
 it('rate limits repeated admin authentication',async()=>{
  const key='unknown_'+suffix;let response;
  for(let i=0;i<11;i++)response=await call('admin/login',{username:key,password:'test-only-unknown'});
  expect(response.status).toBe(429);
 },20000);
});
