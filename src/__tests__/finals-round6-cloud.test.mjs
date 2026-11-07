import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {randomUUID,createHash} from 'node:crypto';
import pinned from '../../docs/content-review/finals131-round6-20261107/fixtures/base-c66-families.json';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,questionById,markMastered,validateFamily} from '../../build/game.mjs';
import {LEARNING_BANK} from '../learning';
import {eligibleExam} from '../school-curriculum';
import {FINALS_ROUND6_20261107 as additions} from '../finals-round6-20261107';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
const names={qingqing:'jasper',jay:'jay',alston:'alston'};
const hash=text=>createHash('sha256').update(text).digest('hex');
suite('round6 content on a fresh isolated PostgreSQL database',()=>{
 let api,server,url;const accounts={};
 async function storage(id){return (await api.pool.query('SELECT family,family::text AS text,updated_at::text AS updated FROM game_states WHERE account_id=$1',[id])).rows[0];}
 async function call(path,body,client){const response=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(client?{Cookie:client.cookie,'X-CSRF-Token':client.data.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};}
 beforeAll(async()=>{
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  for(const player of Object.keys(names))accounts[player]=await provisionChildAccount(api.pool,{username:names[player],grade:pinned.items.find(x=>x.player===player).grade,password:'0742',displayName:'Synthetic followup QA'});
 },30000);
 afterAll(async()=>{
  if(server)await new Promise(r=>server.close(r));
  if(api){const ids=Object.values(accounts).map(x=>x.accountId);for(const table of ['command_receipts','sessions','player_logins','game_states'])await api.pool.query(`DELETE FROM ${table} WHERE account_id=ANY($1::uuid[])`,[ids]);await api.pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[ids]);await api.close();}
 });
 for(const item of pinned.items.filter(x=>x.school!=='yongchun')){
  const {player,grade,school,course}=item;
  it(`${grade}.${course}: preserves actual-mainc66 progress and raw storage on login/state`,async()=>{
   for(const mode of ['array','prefix']){
    const stored=structuredClone(item.expectedRuntime);
    if(mode==='prefix')stored.profiles[player].learning.seen={codec:'prefix-v1',entries:item.expectedRuntime.profiles[player].learning.seen.map(id=>[0,id])};
    const account=accounts[player];await api.pool.query('UPDATE game_states SET family=$2,updated_at=now() WHERE account_id=$1',[account.accountId,stored]);
    const before=await storage(account.accountId),client=await call('login',{username:names[player],password:'0742'});expect(client.status,JSON.stringify(client.data)).toBe(200);account.client=client;
    const result=await call('state',undefined,client);expect(result.status).toBe(200);
    const after=await storage(account.accountId);expect(after.text).toBe(before.text);expect(after.updated).toBe(before.updated);
    expect(structuredClone(validateFamily(structuredClone(after.family)))).toEqual(item.expectedRuntime);
    const expected=structuredClone(item.expectedRuntime);expected.profiles[player].learning.school=school;
    for(const profile of Object.values(expected.profiles))if(profile.run)profile.run.questions=profile.run.questions.map((id,i)=>i===profile.run.index?id:'');
    expect(result.data.family).toEqual(expected);
    console.info('round6-pinned-storage',JSON.stringify({synthetic:true,grade,course,mode,base:pinned.base,before:hash(before.text),after:hash(after.text),timestampUnchanged:before.updated===after.updated,fullRuntimeEqual:true}));
   }
  });
  it(`${grade}.${course}: allocates new matched sources, reloads and rewards an answer once`,async()=>{
   const account=accounts[player],family=newFamily(),p=family.profiles[player];p.learning.school=school;p.coins=1234;p.tickets=3;p.starTickets=2;
   const newIds=new Set(additions.filter(q=>q.grade===grade&&q.course===course).map(q=>q.id));
   const newFamilies=new Set(additions.filter(q=>newIds.has(q.id)).map(q=>q.sourceFamily));
   // A six-question voyage may need old fillers when the new course intersection is only two/four families.
   const fillers=new Set(),fillerFamilies=new Set();
   for(const q of LEARNING_BANK)if(fillers.size<Math.max(0,6-newFamilies.size)&&q.grade===grade&&q.course===course&&!newIds.has(q.id)&&!q.retired&&!q.rephraseOf&&q.examSources?.length&&eligibleExam(school,grade,course,q)&&!fillerFamilies.has(q.sourceFamily??q.id)) {fillers.add(q.id);fillerFamilies.add(q.sourceFamily??q.id);}
   for(const q of LEARNING_BANK)if(q.grade===grade&&q.course===course&&!newIds.has(q.id)&&!fillers.has(q.id))markMastered(p.learning,q.id);
   const peerBefore=Object.fromEntries(Object.entries(family.profiles).filter(([id])=>id!==player));
   await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[account.accountId,family]);
   const client=account.client;expect(client.status).toBe(200);let st=(await call('state',undefined,client)).data;
   async function command(command,id=randomUUID()){const body={id,revision:st.family.revision,command:{player,...command}},r=await call('command',body,client);expect(r.status,JSON.stringify(r.data)).toBe(200);st=r.data;return body;}
   await command({type:'start',course,practice:false,timing:'relaxed'});const run=st.family.profiles[player].run;
   const storedRun=(await storage(account.accountId)).family.profiles[player].run;
   expect(storedRun.questions).toHaveLength(6);for(const id of storedRun.questions)expect(newIds.has(id)||fillers.has(id),id).toBe(true);
   expect(storedRun.questions.filter(id=>newIds.has(id))).toHaveLength(Math.min(6,newFamilies.size));
   expect(new Set(storedRun.questions.map(id=>questionById(id).sourceFamily??id)).size).toBe(6);
   let answered=0;
   for(let index=0;index<6;index++){
    await command({type:'ready-question',runId:run.id,index});const q=st.questions[player];expect(q.id).toBe(storedRun.questions[index]);expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();expect(q.examSources.length).toBeGreaterThan(0);
    const body=await command({type:'answer',runId:run.id,index,choice:questionById(q.id).answer});answered++;expect(st.result).toBe(true);expect(st.family.profiles[player].coins).toBe(1234+10*answered);
    const replay=await call('command',body,client);expect(replay.status).toBe(200);expect(replay.data.family.profiles[player].coins).toBe(1234+10*answered);
    const repeated=await call('command',{...body,id:randomUUID(),revision:st.family.revision},client);expect([200,400,409]).toContain(repeated.status);
    const reload=(await call('state',undefined,client)).data;expect(reload.family.profiles[player].coins).toBe(1234+10*answered);expect(reload.family.profiles[player].tickets).toBe(3);expect(reload.family.profiles[player].starTickets).toBe(2);expect(reload.family.profiles[player].run.answers[index]).toBe(true);
    for(const [id,before] of Object.entries(peerBefore))expect(reload.family.profiles[id]).toEqual(before);
    st=reload;if(index<5){await command({type:'next',runId:run.id,index});expect(st.family.profiles[player].run.index).toBe(index+1);expect((await call('state',undefined,client)).data.family).toEqual(st.family);}
   }
   expect(st.family.profiles[player].run.status).toBe('won');
  });
 }
});
