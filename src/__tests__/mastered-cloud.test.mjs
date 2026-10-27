import {describe,it,expect,beforeAll,afterAll} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createAppServer} from '../../server.mjs';
import {createCloudApi} from '../../server/cloud.mjs';
import {newFamily,questionById,hasMastered} from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('durable successes across cloud devices',()=>{
 let api,server,url,a,b,username;
 const password='test-only-mastered-2026';
 async function call(path,body,c){const r=await fetch(url+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:url,...(body?{'Content-Type':'application/json'}:{}),...(c?{Cookie:c.cookie,'X-CSRF-Token':c.state.csrf}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 async function send(c,command){const body={id:randomUUID(),revision:c.state.family.revision,command:{player:'quintus',...command}};const r=await call('command',body,c);expect(r.status,JSON.stringify(r.data)).toBe(200);c.state=r.data;return body;}
 async function open(){api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;}
 beforeAll(async()=>{await open();await api.pool.query('DELETE FROM request_limits');username='mastered_'+randomUUID().slice(0,8);const r=await call('register',{username,password});a={cookie:r.cookie,state:r.data};await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[username,newFamily()]);a.state=(await call('state',undefined,a)).data;const second=await call('login',{username,password});b={cookie:second.cookie,state:second.data};});
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 it('never reissues 48 correct question IDs when alternating devices, retries and server restart',async()=>{
  const seen=new Set();let firstCommand;
  for(let round=0;round<8;round++){
   const c=round%2?a:b;c.state=(await call('state',undefined,c)).data;
   await send(c,{type:'start',course:'english',practice:false,timing:'relaxed'});const runId=c.state.family.profiles.quintus.run.id;
   for(let index=0;index<6;index++){
    await send(c,{type:'ready-question',runId,index});const q=c.state.questions.quintus;
    expect(seen.has(q.id)).toBe(false);if(q.rephraseOf)expect(seen.has(q.rephraseOf)).toBe(true);seen.add(q.id);
    const body=await send(c,{type:'answer',runId,index,choice:questionById(q.id).answer});
    if(!firstCommand){firstCommand=body;const rev=c.state.family.revision;expect((await call('command',body,c)).status).toBe(200);expect((await call('state',undefined,c)).data.family.revision).toBe(rev);}
    if(index<5)await send(c,{type:'next',runId,index});
   }
   const capture=c.state.family.profiles.quintus.run.capture;if(capture?.outcome==='pending')await send(c,{type:'capture-skip',source:'voyage',runId});
   if(round===3){await new Promise(r=>server.close(r));await api.close();await open();}
  }
  const raw=(await api.pool.query('SELECT family FROM game_states WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[username])).rows[0].family;
  expect([...seen].every(id=>hasMastered(raw.profiles.quintus.learning,id))).toBe(true);
  expect(raw.profiles.feifei.learning.mastered).toEqual({ids:[],generated:{}});
  const stale=await call('command',{...firstCommand,id:randomUUID()},a);expect(stale.status).toBe(409);
 },30000);
});
