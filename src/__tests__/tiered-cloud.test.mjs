import {describe,it,expect,beforeAll,afterAll} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createAppServer} from '../../server.mjs';
import {createCloudApi} from '../../server/cloud.mjs';
import {newFamily,questionById} from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('tiered challenge authoritative PostgreSQL protocol',()=>{
 let api,server,url,c;
 async function call(path,body){const r=await fetch(url+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:url,...(body?{'Content-Type':'application/json'}:{}),...(c?{Cookie:c.cookie,'X-CSRF-Token':c.state.csrf}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const payload=(command,id=randomUUID())=>({id,revision:c.state.family.revision,command:{player:'quintus',...command}});
 async function send(command){const r=await call('command',payload(command));expect(r.status,JSON.stringify(r.data)).toBe(200);c.state=r.data;return r;}
 beforeAll(async()=>{api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});await api.pool.query('DELETE FROM request_limits');server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
 const username='tier_'+randomUUID().slice(0,16).replaceAll('-','');const r=await call('register',{username,password:'isolated-local-tier-test-2026'});expect(r.status).toBe(200);c={username,cookie:r.cookie,state:r.data};
 await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[username,newFamily()]);c.state=(await call('state')).data;});
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 it('rejects falsy/forged timing and conceals question until a durable ready command',async()=>{
  for(const timing of [false,0,'',null,'forever'])expect((await call('command',payload({type:'start',course:'math',practice:false,timing}))).status).toBe(400);
  await send({type:'start',course:'math',practice:false});const r=c.state.family.profiles.quintus.run;
  expect(r.challenge).toBeDefined();expect(c.state.questions.quintus).toBeUndefined();expect(r.questions).toEqual(Array(6).fill(''));
  expect((await call('command',payload({type:'answer',runId:r.id,index:0,choice:0}))).status).toBe(400);
  const body=payload({type:'ready-question',runId:r.id,index:0});const replies=await Promise.all([call('command',body),call('command',body)]);
  expect(replies.map(r=>r.status)).toEqual([200,200]);c.state=replies[0].data;
  const clock=c.state.family.profiles.quintus.run.challenge.clock;
  expect(replies[1].data.family.profiles.quintus.run.challenge.clock).toEqual(clock);
  expect(c.state.questions.quintus.answer).toBeUndefined();expect(c.state.family.profiles.quintus.run.questions.filter(Boolean)).toHaveLength(1);
  await send({type:'ready-question',runId:r.id,index:0});expect(c.state.family.profiles.quintus.run.challenge.clock).toEqual(clock);
  expect((await call('command',payload({type:'challenge-mode',runId:r.id,mode:'relaxed'}))).status).toBe(400);
  expect((await call('command',payload({type:'answer',runId:r.id,index:0,choice:0,now:0}))).status).toBe(400);
 });
 it('settles a timeout once despite concurrent replay and a late correct answer',async()=>{
  const raw=(await api.pool.query('SELECT family FROM game_states WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[c.username])).rows[0].family;
  const r=raw.profiles.quintus.run,clock=r.challenge.clock;
  const shift=clock.deadlineAt-Date.now()+10000;for(const key of ['openedAt','answerAt','deadlineAt'])clock[key]-=shift;
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[c.username,raw]);c.state=(await call('state')).data;
  const q=questionById(r.questions[0]),body=payload({type:'answer',runId:r.id,index:0,choice:q.answer});
  const replies=await Promise.all([call('command',body),call('command',body)]);expect(replies.map(r=>r.status)).toEqual([200,200]);c.state=replies[0].data;
  const saved=c.state.family.profiles.quintus;
  expect(saved.run.answers).toEqual([false]);expect(saved.run.challenge.timeouts).toEqual([0]);expect(saved.coins).toBe(0);expect(saved.run.streak).toBe(1);
  expect((await call('command',payload({type:'question-timeout',runId:r.id,index:0}))).status).toBe(400);
  expect((await call('state')).data.family).toEqual(c.state.family);
 });
});
