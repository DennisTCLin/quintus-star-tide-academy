import {describe,it,expect,beforeAll,afterAll} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createAppServer} from '../../server.mjs';
import {createCloudApi} from '../../server/cloud.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,taipeiDay,enableAdaptive,reportSchoolExposure,observeAdaptive,questionById} from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('adaptive policy in authenticated cloud transactions',()=>{
 let api,server,url,a,b,baseline,player;
 async function call(path,body,c=a){const r=await fetch(url+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:url,...(body?{'Content-Type':'application/json'}:{}),...(c?{Cookie:c.cookie,'X-CSRF-Token':c.state.csrf}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const body=(command,c=a)=>({id:randomUUID(),revision:c.state.family.revision,command:{player,...command}});
 async function send(command){const r=await call('command',body(command));expect(r.status,JSON.stringify(r.data)).toBe(200);a.state=r.data;return r.data;}
 const ledger=p=>({coins:p.coins,tickets:p.tickets,owned:p.owned,growth:p.growth,milestones:p.milestones,rewardStars:p.rewardStars});
 beforeAll(async()=>{
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  const username='adapt_'+randomUUID().slice(0,10).replaceAll('-',''),password='2947';const child=await provisionChildAccount(api.pool,{username,password,displayName:'適性測試',grade:4});player=child.playerId;
  const login=await call('login',{username,password},null);expect(login.status).toBe(200);a={cookie:login.cookie,state:login.data};const second=await call('login',{username,password},null);b={cookie:second.cookie,state:second.data};baseline=ledger(a.state.family.profiles[player]);
  // Complete existing starter onboarding using real commands.
  if(a.state.family.profiles[player].onboarding&&!a.state.family.profiles[player].onboarding.confirmed){await send({type:'starter-draw'});await send({type:'starter-confirm'});baseline=ledger(a.state.family.profiles[player]);}
 });
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 it('routes a new child into school scope, strips future questions, rejects forged fields',async()=>{
  const r=await send({type:'start',course:'math',practice:false});expect(r.result).toBe('learn');expect(r.family.profiles[player].run).toBeNull();expect(r.learningLessons[player].example).toBeUndefined();expect(r.studyQuestions[player]).toBeUndefined();
  expect((await call('command',body({type:'learning-progress',topic:r.learningLessons[player].topic,state:'taught',ready:true}))).status).toBe(400);
  expect(ledger(r.family.profiles[player])).toEqual(baseline);
 });
 it('synchronizes the same teaching and assessment session across devices without exposing an answer',async()=>{
  let r=a.state.family.profiles[player].learning.study.session;
  await send({type:'learning-scope',sessionId:r.id,state:'taught'});
  await send({type:'learning-lesson',sessionId:r.id,index:0,done:false});expect(a.state.learningLessons[player].example.answer).toBeTypeOf('number');
  const other=await call('state',undefined,b);expect(other.status).toBe(200);expect(other.data.family.profiles[player].learning.study.session.id).toBe(r.id);expect(other.data.learningLessons[player].title).toBe(a.state.learningLessons[player].title);
  await send({type:'learning-lesson',sessionId:r.id,index:0,done:true});expect(a.state.studyQuestions[player].answer).toBeUndefined();expect(a.state.studyQuestions[player].explanation).toBeUndefined();expect(a.state.family.profiles[player].learning.study.session.assisted).toBe(true);expect(a.state.learningPlans[player].some(t=>t.ready>0)).toBe(false);
 });
 it('commits one assisted answer once under retry; stale devices cannot overwrite it or balances',async()=>{
  let r=a.state.family.profiles[player].learning.study.session,q=a.state.studyQuestions[player];const command=body({type:'review-answer',sessionId:r.id,index:0,choice:questionById(q.id).answer});
  const first=await call('command',command);expect(first.status).toBe(200);a.state=first.data;const duplicate=await call('command',command);expect(duplicate.status).toBe(200);expect(duplicate.data.family.revision).toBe(first.data.family.revision);
  expect(ledger(a.state.family.profiles[player])).toEqual(baseline);
  expect((await call('command',body({type:'review-answer',sessionId:r.id,index:0,choice:0},b),b)).status).toBe(409);
  for(let i=1;i<6;i++){await send({type:'review-next',sessionId:r.id,index:i-1});await send({type:'learning-lesson',sessionId:r.id,index:i,done:true});q=a.state.studyQuestions[player];await send({type:'review-answer',sessionId:r.id,index:i,choice:questionById(q.id).answer});}
  expect(a.state.learningPlans[player].some(t=>t.ready>0)).toBe(false);
  await send({type:'review-start',mode:'learn',course:'math'});r=a.state.family.profiles[player].learning.study.session;
  for(let i=0;i<6;i++){if(i)await send({type:'review-next',sessionId:r.id,index:i-1});q=a.state.studyQuestions[player];await send({type:'review-answer',sessionId:r.id,index:i,choice:questionById(q.id).answer});}
  expect(a.state.learningPlans[player].some(t=>t.ready>=6)).toBe(true);expect(ledger(a.state.family.profiles[player])).toEqual(baseline);
 });
 it('allocates only independently learned content for real voyages; a scope change blocks old reservations without losses',async()=>{
  await send({type:'start',course:'math',practice:false});const r=a.state.family.profiles[player].run;expect(r.adaptive).toBe(1);
  await send({type:'ready-question',runId:r.id,index:0});expect(a.state.questions[player]).toBeDefined();const topic=a.state.learningPlans[player].find(t=>t.ready>=6).id;
  await send({type:'learning-progress',topic,state:'not-yet'});expect(a.state.learningBlocks[player]).toBe(true);expect(a.state.questions[player]).toBeUndefined();const before=ledger(a.state.family.profiles[player]);
  expect((await call('command',body({type:'answer',runId:r.id,index:0,choice:0}))).status).toBe(400);
  const after=await call('state');expect(ledger(after.data.family.profiles[player])).toEqual(before);expect(after.data.family.profiles[player].run.id).toBe(r.id);
 });
 it('also gates the legacy practice endpoint instead of filling from the old bank',async()=>{
  const r=await call('practice',{type:'start',player,used:[]});expect(r.status).toBe(400);expect(r.data.error).toContain('跟著我學');
 });
 it('keeps imported study history but rejects imported school/mastery authority',async()=>{
  const registered=await call('register',{username:'import_'+randomUUID().slice(0,8),password:'Synthetic-import-passphrase'},null);expect(registered.status).toBe(200);
  const c={cookie:registered.cookie,state:registered.data},snapshot=newFamily(),s=snapshot.profiles.quintus.learning;
  enableAdaptive(s);reportSchoolExposure(s,4,'4:math:mul-1','taught',taipeiDay());
  s.study=structuredClone(a.state.family.profiles[player].learning.study);s.study.session=null;
  const id=Object.keys(a.state.family.profiles[player].learning.adaptive.evidence)[0];observeAdaptive(s,questionById(id),true,false,taipeiDay());
  const imported=await call('migrate',{id:randomUUID(),revision:0,snapshot},c);expect(imported.status,JSON.stringify(imported.data)).toBe(200);
  const saved=imported.data.family.profiles.quintus.learning;expect(saved.study.entries).toEqual(s.study.entries);expect(saved.adaptive.scope).toEqual({});expect(saved.adaptive.evidence).toEqual({});expect(saved.adaptive.ignoreLegacyEvidence).toBe(true);
 });
});
