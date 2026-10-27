import { describe,it,expect,beforeAll,afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createAppServer } from '../../server.mjs';
import { createCloudApi } from '../../server/cloud.mjs';
import { newFamily,startRun,answerRun,nextQuestion,questionById,taipeiDay } from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('remediation authoritative transaction and projection',()=>{
 let api,server,url,c,raw;
 async function call(path,body){const r=await fetch(url+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:url,...(body?{'Content-Type':'application/json'}:{}),...(c?{Cookie:c.cookie,'X-CSRF-Token':c.state.csrf}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const payload=command=>({id:randomUUID(),revision:c.state.family.revision,command:{player:'doudou',...command}});
 beforeAll(async()=>{api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
 const username='review_'+randomUUID().slice(0,12).replaceAll('-','');const r=await call('register',{username,password:'isolated-remediation-fixture-2026'});expect(r.status).toBe(200);c={username,cookie:r.cookie,state:r.data};
 raw=newFamily();startRun(raw,'doudou','math',randomUUID(),1,false,taipeiDay(),'relaxed');
 await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[username,raw]);c.state=(await call('state')).data;});
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 it('reveals no future questions and automatically opens the next clock exactly once',async()=>{
  const run=raw.profiles.doudou.run;
  expect(c.state.reviews.doudou).toBeUndefined();expect(c.state.questions.doudou).toBeUndefined();
  const ready=await call('command',payload({type:'ready-question',runId:run.id,index:0}));expect(ready.status).toBe(200);c.state=ready.data;
  expect(c.state.questions.doudou.answer).toBeUndefined();const q=questionById(run.questions[0]);
  c.state=(await call('command',payload({type:'answer',runId:run.id,index:0,choice:(q.answer+1)%q.options.length}))).data;
  const body=payload({type:'advance-question',runId:run.id,index:0});const both=await Promise.all([call('command',body),call('command',body)]);expect(both.map(x=>x.status)).toEqual([200,200]);c.state=both[0].data;
  expect(c.state.family.profiles.doudou.run.index).toBe(1);expect(c.state.family.profiles.doudou.run.challenge.clock.index).toBe(1);expect(c.state.questions.doudou.answer).toBeUndefined();expect(c.state.reviews.doudou).toBeUndefined();
  expect((await call('command',payload({type:'advance-question',runId:run.id,index:0}))).status).toBe(400);
 });
 it('projects only wrong completed questions, rejects forged commands, and resumes corrections',async()=>{
  const run=raw.profiles.doudou.run;
  for(let i=1;i<3;i++){const q=questionById(run.questions[i]);const r=await call('command',payload({type:'answer',runId:run.id,index:i,choice:(q.answer+1)%q.options.length}));expect(r.status).toBe(200);c.state=r.data;if(i===1)c.state=(await call('command',payload({type:'advance-question',runId:run.id,index:i}))).data;}
  expect(c.state.reviews.doudou.map(x=>x.index)).toEqual([0,1,2]);expect(c.state.family.profiles.doudou.run.questions.filter(Boolean)).toHaveLength(1);
  expect((await call('command',payload({type:'correct-run',runId:run.id,index:5,choice:0}))).status).toBe(400);
  expect((await call('command',payload({type:'correct-run',runId:run.id,index:0,choice:0,coins:999}))).status).toBe(400);
  for(let i=0;i<2;i++){const r=await call('command',payload({type:'correct-run',runId:run.id,index:i,choice:questionById(run.questions[i]).answer}));expect(r.status).toBe(200);c.state=r.data;}
  c.state=(await call('state')).data;expect(c.state.family.profiles.doudou.run.remediation.corrected).toEqual([0,1]);expect(c.state.family.profiles.doudou.coins).toBe(0);
 });
 it('commits the last correction/reward once under duplicate and competing final requests',async()=>{
  const run=raw.profiles.doudou.run,cmd={type:'correct-run',runId:run.id,index:2,choice:questionById(run.questions[2]).answer};const same=payload(cmd),other=payload(cmd);
  const rs=await Promise.all([call('command',same),call('command',same),call('command',other)]);expect(rs.filter(r=>r.status===200).length).toBeGreaterThanOrEqual(1);expect(rs.every(r=>[200,409].includes(r.status))).toBe(true);const winner=rs[2].status===200?other:same;expect((await call('command',winner)).status).toBe(200);
  c.state=(await call('state')).data;const p=c.state.family.profiles.doudou;expect(p.coins).toBe(30);expect(p.growth.xp[run.companion]).toBe(30);expect(p.run.status).toBe('failed');expect(p.run.answers).toEqual([false,false,false]);expect(p.run.remediation.receipt).toEqual({coins:30,xp:30,skipped:false});
  expect((await call('command',payload(cmd))).status).toBe(400);expect((await call('state')).data.family).toEqual(c.state.family);
 });
});
