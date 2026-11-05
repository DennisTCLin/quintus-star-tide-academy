import {describe,it,expect,beforeAll,afterAll} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createAppServer} from '../../server.mjs';
import {createCloudApi} from '../../server/cloud.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {grantTickets} from '../../server/star-ticket-admin.mjs';
import {newFamily,validateFamily,questionById,startRun,taipeiDay} from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('lossless seen history through real PostgreSQL and existing public API',()=>{
 let api,server,url,account,client,baseline;
 const username='codec_'+randomUUID().slice(0,8),password='0742';
 async function call(path,body){const r=await fetch(url+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:url,...(body?{'Content-Type':'application/json'}:{}),...(client?{Cookie:client.cookie,'X-CSRF-Token':client.data.csrf}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const raw=async()=>(await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[account.accountId])).rows[0].family;
 beforeAll(async()=>{
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  account=await provisionChildAccount(api.pool,{username,grade:4,password,displayName:'Synthetic codec QA'});
  baseline=newFamily();startRun(baseline,'quintus','math','codec-cloud-active',0,false,taipeiDay(),'relaxed');
  baseline.profiles.quintus.learning.seen=[];
  // The source IDs in this complete legacy cohort are independently known.
  for(let i=1;i<=13;i++)baseline.profiles.quintus.learning.seen.push(`cx1-dd114-2-${i}`);
  baseline.profiles.quintus.coins=1234;baseline.profiles.quintus.tickets=3;
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[account.accountId,structuredClone(baseline)]);
  client=await call('login',{username,password});expect(client.status).toBe(200);
 });
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 it('reads old arrays, persists compact on a real command, hides future IDs, and replays once',async()=>{
  expect(Array.isArray((await raw()).profiles.quintus.learning.seen)).toBe(true);
  expect(Array.isArray(client.data.family.profiles.quintus.learning.seen)).toBe(true);
  const run=client.data.family.profiles.quintus.run;
  const ready=await call('command',{id:randomUUID(),revision:client.data.family.revision,command:{type:'ready-question',player:'quintus',runId:run.id,index:0}});expect(ready.status,JSON.stringify(ready.data)).toBe(200);client.data=ready.data;
  const stored=await raw();expect(stored.profiles.quintus.learning.seen.codec).toBe('prefix-v1');
  expect(validateFamily(stored).profiles.quintus.learning.seen).toEqual(baseline.profiles.quintus.learning.seen);
  expect(Array.isArray(ready.data.family.profiles.quintus.learning.seen)).toBe(true);
  expect(ready.data.family.profiles.quintus.run.questions.slice(1)).toEqual(['','','','','']);
  const q=ready.data.questions.quintus;expect(q.answer).toBeUndefined();
  const body={id:randomUUID(),revision:ready.data.family.revision,command:{type:'answer',player:'quintus',runId:run.id,index:0,choice:questionById(q.id).answer}};
  const answer=await call('command',body);expect(answer.status).toBe(200);client.data=answer.data;
  const once=await raw();expect((await call('command',body)).status).toBe(200);expect(await raw()).toEqual(once);
  expect(validateFamily(once).profiles.quintus.coins).toBe(1244);expect(validateFamily(once).profiles.quintus.tickets).toBe(3);
 });
 it('admin grant preserves compact data byte for byte apart from balance and revision',async()=>{
  const before=await raw();const input={grantId:randomUUID(),username,amount:2,reason:'Isolated codec QA',operator:'test'};
  const result=await grantTickets(api.pool,input,{apply:true});expect(result.replayed).toBe(false);
  const after=await raw(),expected=structuredClone(before);expected.revision++;expected.profiles.quintus.starTickets+=2;
  expect(after).toEqual(expected);expect((await grantTickets(api.pool,input,{apply:true})).replayed).toBe(true);expect(await raw()).toEqual(after);
 });
});
