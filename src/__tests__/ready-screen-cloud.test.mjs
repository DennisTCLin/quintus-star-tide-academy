import {describe,it,expect,beforeAll,afterAll} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createAppServer} from '../../server.mjs';
import {createCloudApi} from '../../server/cloud.mjs';
import {newFamily,questionById,validateFamily} from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('preparation preferences and image preflight',()=>{
 let api,server,url,c;
 async function call(path,body){const r=await fetch(url+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:url,...(body?{'Content-Type':'application/json'}:{}),...(c?{Cookie:c.cookie,'X-CSRF-Token':c.state.csrf}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 async function send(command){const r=await call('command',{id:randomUUID(),revision:c.state.family.revision,command});expect(r.status,JSON.stringify({command,data:r.data})).toBe(200);c.state=r.data;return r.data;}
 beforeAll(async()=>{api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});await api.pool.query('DELETE FROM request_limits');server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;const username='ready_'+randomUUID().slice(0,12).replaceAll('-','');const r=await call('register',{username,password:'isolated-ready-test-2026'});expect(r.status).toBe(200);c={username,cookie:r.cookie,state:r.data};await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[username,(()=>{const f=newFamily();for(const [id,p] of Object.entries(f.profiles))p.learning.school=id==='alston'?'jianan':'yongchun';return f;})()]);c.state=(await call('state')).data;});
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 it('defaults by grade and persists an explicit choice without practice overwriting it',async()=>{
  for(const [player,expected] of [['qingqing','relaxed'],['feifei','relaxed'],['quintus','standard'],['alston','standard']]){
   await send({type:'start',player,course:'math',practice:false});let run=c.state.family.profiles[player].run;
   expect(run.challenge.mode).toBe(expected);expect(run.challenge.clock).toBeNull();
   expect(c.state.questions[player]).toBeUndefined();expect(run.questions.every(id=>id==='')).toBe(true);
   expect(Object.keys(c.state.questionAssets[player]).sort()).toEqual(['images','index','runId']);
   await send({type:'quit',player,runId:run.id});
  }
  const player='qingqing';await send({type:'start',player,course:'math',practice:false});let run=c.state.family.profiles[player].run;
  await send({type:'challenge-mode',player,runId:run.id,mode:'standard'});expect(c.state.family.profiles[player].challengeTiming).toBe('standard');
  await send({type:'quit',player,runId:run.id});await send({type:'start',player,course:'math',practice:true});run=c.state.family.profiles[player].run;
  expect(run.challenge.mode).toBe('relaxed');await send({type:'challenge-mode',player,runId:run.id,mode:'relaxed'});expect(c.state.family.profiles[player].challengeTiming).toBe('standard');
  await send({type:'quit',player,runId:run.id});c.state=(await call('state')).data;await send({type:'start',player,course:'math',practice:false});expect(c.state.family.profiles[player].run.challenge.mode).toBe('standard');expect(c.state.family.profiles.feifei.challengeTiming).toBeUndefined();
 });
 it('new clients advance without starting a clock; ready is still idempotent',async()=>{
  const player='qingqing',r=c.state.family.profiles[player].run;
  await send({type:'ready-question',player,runId:r.id,index:0});let q=c.state.questions[player];await send({type:'answer',player,runId:r.id,index:0,choice:questionById(q.id).answer});
  await send({type:'advance-question',prepare:true,player,runId:r.id,index:0});expect(c.state.family.profiles[player].run.challenge.clock).toBeNull();expect(c.state.questions[player]).toBeUndefined();expect(c.state.questionAssets[player].index).toBe(1);
  await send({type:'ready-question',player,runId:r.id,index:1});const clock=c.state.family.profiles[player].run.challenge.clock;await send({type:'ready-question',player,runId:r.id,index:1});expect(c.state.family.profiles[player].run.challenge.clock).toEqual(clock);
 });
 it('rejects invalid stored preference',()=>{const f=newFamily();f.profiles.quintus.challengeTiming='forever';expect(()=>validateFamily(f)).toThrow();});
});
