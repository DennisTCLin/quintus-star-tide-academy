import { describe,it,expect,beforeAll,afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createAppServer } from '../../server.mjs';
import { createCloudApi } from '../../server/cloud.mjs';
import { provisionChildAccount } from '../../server/child-account.mjs';
import { newFamily, skipCapture, startRun, answerRun, nextQuestion, questionById, taipeiDay } from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('review transactions, permissions and zero rewards',()=>{
 let api,server,url,a,b,username,baseline;
 const password='0742';
 async function call(path,body,c=a){const r=await fetch(url+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:url,...(body?{'Content-Type':'application/json'}:{}),...(c?{Cookie:c.cookie,'X-CSRF-Token':c.state.csrf}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const payload=(command,c=a)=>({id:randomUUID(),revision:c.state.family.revision,command:{player:'quintus',...command}});
 async function send(command,c=a){const r=await call('command',payload(command,c),c);expect(r.status,JSON.stringify(r.data)).toBe(200);c.state=r.data;return r.data;}
 beforeAll(async()=>{
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});await api.pool.query('DELETE FROM request_limits');server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  username='study_'+randomUUID().slice(0,10).replaceAll('-','');await provisionChildAccount(api.pool,{username,grade:4,password,displayName:'Synthetic Review QA'});
  const raw=newFamily(); startRun(raw,'quintus','math',randomUUID(),1,false,taipeiDay());const run=raw.profiles.quintus.run;
  for(let i=0;i<6;i++){answerRun(raw,'quintus',run.id,i,questionById(run.questions[i]).answer,taipeiDay());if(i<5)nextQuestion(raw,'quintus',run.id,i);}
  if(run.capture?.outcome==='pending')skipCapture(raw,'quintus','voyage',run.id);
  baseline=structuredClone(raw.profiles.quintus);
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT account_id FROM player_logins WHERE username=$1)',[username,raw]);
  const login=await call('login',{username,password},null);a={cookie:login.cookie,state:login.data};const login2=await call('login',{username,password},null);b={cookie:login2.cookie,state:login2.data};
 });
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 it('respects ownership, rejects forged dates/rewards and hides future answers',async()=>{
  expect((await call('command',payload({type:'review-start',player:'feifei',mode:'all'}))).status).toBe(403);
  expect((await call('command',payload({type:'review-start',mode:'all',day:'2099-01-01'}))).status).toBe(400);
  await send({type:'review-start',mode:'all'});
  const r=a.state.family.profiles.quintus.learning.study.session;
  expect(r.questions.filter(Boolean)).toHaveLength(1);expect(a.state.studyQuestions.quintus.answer).toBeUndefined();expect(a.state.studyQuestions.quintus.explanation).toBeUndefined();
  expect((await call('command',payload({type:'review-answer',sessionId:r.id,index:0,choice:0,coins:500}))).status).toBe(400);
 });
 it('duplicate/concurrent answers settle once, stale devices resync and can resume the same question',async()=>{
  const r=a.state.family.profiles.quintus.learning.study.session,q=a.state.studyQuestions.quintus;
  const command={type:'review-answer',sessionId:r.id,index:0,choice:(questionById(q.id).answer+1)%q.options.length};const body=payload(command);
  const rs=await Promise.all([call('command',body),call('command',body)]);expect(rs.map(r=>r.status)).toEqual([200,200]);a.state=rs[0].data;
  expect((await call('command',payload(command,b),b)).status).toBe(409);
  b.state=(await call('state',undefined,b)).data;expect(b.state.family.profiles.quintus.learning.study.session.settled).toBe(true);
  expect(b.state.studyQuestions.quintus.answer).toBe(questionById(q.id).answer);
  expect(b.state.family.profiles.quintus.learning.study.sequence).toBe(7);
  expect((await call('command',payload(command,b),b)).status).toBe(400);
  await send({type:'review-pause',sessionId:r.id},b);await send({type:'review-start',mode:'due'},b);
  expect(b.state.family.profiles.quintus.learning.study.session.id).toBe(r.id);
  a.state=(await call('state')).data;
 });
 it('keeps all reward ledgers and old completion/compensation exactly unchanged across the group',async()=>{
  const id=a.state.family.profiles.quintus.learning.study.session.id;
  for(let i=1;i<6;i++){
   await send({type:'review-next',sessionId:id,index:i-1});const q=a.state.studyQuestions.quintus;
   if(i===3)expect(a.state.family.profiles.quintus.learning.study.session.retries).toContain(3);
   await send({type:'review-answer',sessionId:id,index:i,choice:questionById(q.id).answer});
  }
  expect(a.state.family.profiles.quintus.learning.study.session.status).toBe('complete');
  const raw=(await api.pool.query('SELECT family FROM game_states WHERE account_id=(SELECT account_id FROM player_logins WHERE username=$1)',[username])).rows[0].family.profiles.quintus;
  const {learning:_,...old}=baseline,{learning:__,...now}=raw;expect(now).toEqual(old);
  expect(raw.learning.mastered).toEqual(baseline.learning.mastered);
  expect(a.state.studySummaries.quintus.independent).toBe(6); // Same-day review never pumps assessment totals.
 });
 it('refuses review while a normal challenge is active without losing saved progress',async()=>{
  await send({type:'start',course:'math',practice:true,timing:'relaxed'});
  const previous=structuredClone(a.state.family.profiles.quintus.learning.study);
  expect((await call('command',payload({type:'review-start',mode:'all'}))).status).toBe(400);
  expect((await call('state')).data.family.profiles.quintus.learning.study).toEqual(previous);
 });
});
