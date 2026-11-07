import {FINALS_REVIEWED_20261107} from '../finals-reviewed-20261107';
import {eligibleExam} from '../school-curriculum';
import {SCIENCE_EXAMS} from '../science-exams';
import {SOCIAL_EXAMS} from '../social-exams';
import {MATH_EXAMS} from '../math-exams';
import {GRADE2_MATH_EXAMS} from '../grade2-math-exams';
import {GRADE1_CHINESE_EXAMS} from '../grade1-chinese-exams';
const grade2MathIds=new Set([...GRADE2_MATH_EXAMS,...FINALS_REVIEWED_20261107.filter(q=>q.grade===2&&q.course==='math')].map(q=>q.id));
const scienceIds=new Set(SCIENCE_EXAMS.map(q=>q.id)),socialIds=new Set(SOCIAL_EXAMS.map(q=>q.id)),g1ChineseIds=new Set(GRADE1_CHINESE_EXAMS.map(q=>q.id));
const socialSupplement=new Set(SOCIAL_EXAMS.filter(q=>q.examSources.some(s=>/^ksn\d+$/.test(s.id))).map(q=>q.id));
const scienceSupplement=new Set(SCIENCE_EXAMS.filter(q=>q.examSources.some(s=>/^ksu\d+$/.test(s.id))).map(q=>q.id));
import {GRADE5_NEW_EXAMS} from '../grade5-new-exams';
import {GRADE5_DONGMEN_EXAMS} from '../grade5-dongmen-exams';
import {GRADE5_REMAINING_EXAMS} from '../grade5-remaining-exams';
import {beforeAll,afterAll,it,expect,describe} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,questionById,markMastered} from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('school routing through authenticated cloud API',()=>{
 let api,server,url,accounts=[],clients={};
 async function call(path,body,client){
  const r=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(client?{Cookie:client.cookie,'X-CSRF-Token':client.data.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 }
 beforeAll(async()=>{
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});await api.pool.query('DELETE FROM request_limits');server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  for(const [username,grade] of [['jasper',1],['jay',5],['alston',6],['alan',4],['quintus',4],['jimmy',2],['feifei',2],['sunny',1],['brownie',4]]){
   const made=await provisionChildAccount(api.pool,{username,grade,password:'0742',displayName:'Synthetic school QA'});expect(made.created).toBe(true);accounts.push(made.accountId);
   await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,newFamily()]);
   clients[username]=await call('login',{username,password:'0742'});clients[username].accountId=made.accountId;expect(clients[username].status).toBe(200);
  }
 },30000);
 afterAll(async()=>{
  await new Promise(r=>server.close(r));
  for(const table of ['command_receipts','sessions','player_logins','game_states'])await api.pool.query(`DELETE FROM ${table} WHERE account_id=ANY($1::uuid[])`,[accounts]);
  await api.pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[accounts]);await api.close();
 });
 it('routes authenticated Jasper to first-grade exams and preserves existing saves and rewards',async()=>{
  const c=clients.jasper,original=newFamily();original.profiles.qingqing.coins=735;original.profiles.qingqing.tickets=5;
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[c.accountId,original]);
  let st=(await call('state',undefined,c)).data;expect(st.family.profiles.qingqing.learning.school).toBe('xingan');
  const untouched=structuredClone(st.family);delete untouched.profiles.qingqing.learning.school;expect(untouched).toEqual(original);
  async function command(command){const r=await call('command',{id:randomUUID(),revision:st.family.revision,command:{player:'qingqing',...command}},c);expect(r.status,JSON.stringify(r.data)).toBe(200);st=r.data;}
  for(const course of ['medials','math']){
   await command({type:'start',course,practice:false,timing:'relaxed'});const run=st.family.profiles.qingqing.run;
   for(let i=0;i<6;i++){
    await command({type:'ready-question',runId:run.id,index:i});const q=st.questions.qingqing;
    expect(q.grade).toBe(1);expect(q.publisher).toBe(course==='math'?'翰林':'康軒');expect(q.examSources.length).toBeGreaterThan(0);expect(q.answer).toBeUndefined();
    await command({type:'answer',runId:run.id,index:i,choice:questionById(q.id).answer});expect(st.result).toBe(true);
    expect((await call('state',undefined,c)).data.family).toEqual(st.family);if(i<5)await command({type:'next',runId:run.id,index:i});
   }
   expect(st.family.profiles.qingqing.run.status).toBe('won');
   if(st.family.profiles.qingqing.run.capture?.outcome==='pending')await command({type:'capture-skip',source:'voyage',runId:run.id});
  }
  expect(st.family.profiles.qingqing.coins).toBeGreaterThanOrEqual(735);expect(st.family.profiles.qingqing.tickets).toBeGreaterThanOrEqual(5);
  for(const [id,profile] of Object.entries(original.profiles))if(id!=='qingqing')expect(st.family.profiles[id]).toEqual(profile);
 });
 it('supports three consecutive grade-six battle questions and denies unavailable grade-one courses',async()=>{
  const c=clients.alston;expect(c.data.family.profiles.alston.learning.school).toBe('jianan');
  const used=[];
  for(let i=0;i<3;i++){
   const st=await call('state',undefined,c);
   const r=await call('command',{id:randomUUID(),revision:st.data.family.revision,command:{type:'battle-start',player:'alston',course:'math',used}},c);
   expect(r.status,JSON.stringify(r.data)).toBe(200);const q=r.data.result.question;expect(q.grade).toBe(6);expect(q.answer).toBeUndefined();used.push(q.id);
   const answered=await call('command',{id:randomUUID(),revision:r.data.family.revision,command:{type:'battle-answer',player:'alston',token:r.data.result.token,question:q.id,choice:questionById(q.id).answer}},c);
   expect(answered.status,JSON.stringify(answered.data)).toBe(200);
  }
  const practice=await call('practice',{type:'start',player:'alston',used:[]},c);
  expect(practice.status,JSON.stringify(practice.data)).toBe(200);expect(practice.data.grade).toBe(6);expect(practice.data.answer).toBeUndefined();
  const st=await call('state',undefined,c);
  const denied=await call('command',{id:randomUUID(),revision:st.data.family.revision,command:{type:'start',player:'alston',course:'tones',practice:true,timing:'relaxed'}},c);
  expect(denied.status).toBe(400);
 });
 it('opens authenticated grade-six English, hides answers and persists progress without changing math mastery',async()=>{
  const c=clients.alston;let st=(await call('state',undefined,c)).data;
  const mathBefore=st.family.profiles.alston.learning.mastered;
  async function command(command){const r=await call('command',{id:randomUUID(),revision:st.family.revision,command:{player:'alston',...command}},c);expect(r.status,JSON.stringify(r.data)).toBe(200);st=r.data;return r.data;}
  await command({type:'start',course:'english',practice:false,timing:'relaxed'});
  const run=st.family.profiles.alston.run;expect(run.questions).toHaveLength(6);
  await command({type:'ready-question',runId:run.id,index:0});const q=st.questions.alston;
  expect(q.grade).toBe(6);expect(q.course).toBe('english');expect(q.publisher).toBe('何嘉仁');expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();
  await command({type:'answer',runId:run.id,index:0,choice:questionById(q.id).answer});expect(st.result).toBe(true);
  expect((await call('state',undefined,c)).data.family.profiles.alston.learning.mastered).toEqual(st.family.profiles.alston.learning.mastered);
  expect(st.family.profiles.alston.learning.mastered).not.toEqual(mathBefore);
  await command({type:'quit',runId:run.id});
  const practice=await call('practice',{type:'start',player:'alston',used:[q.id]},c);
  expect(practice.status,JSON.stringify(practice.data)).toBe(200);expect(practice.data.grade).toBe(6);expect(practice.data.course).toBe('english');
 });
 it('saves authenticated sixth-grade Chinese, science and social answers without leaking answers',async()=>{
  const c=clients.alston;
  for(const course of ['chinese','science','social']){
   let st=(await call('state',undefined,c)).data;
   async function command(command){const r=await call('command',{id:randomUUID(),revision:st.family.revision,command:{player:'alston',...command}},c);expect(r.status,JSON.stringify(r.data)).toBe(200);st=r.data;return r.data;}
   await command({type:'start',course,practice:false,timing:'relaxed'});const run=st.family.profiles.alston.run;expect(run.questions).toHaveLength(6);
   await command({type:'ready-question',runId:run.id,index:0});const q=st.questions.alston;expect(q.grade).toBe(6);expect(q.course).toBe(course);expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();expect(q.publisher).toBe(course==='science'?'翰林':'康軒');
   await command({type:'answer',runId:run.id,index:0,choice:questionById(q.id).answer});expect(st.result).toBe(true);
   expect((await call('state',undefined,c)).data.family.profiles.alston.learning.mastered).toEqual(st.family.profiles.alston.learning.mastered);
   await command({type:'quit',runId:run.id});
  }
 });
 it('routes Jay by the authenticated account and saves supplied and fallback courses without answer leakage',async()=>{
  const c=clients.jay;
  for(const course of ['chinese','science','english','math','social']){
   const original=newFamily();original.profiles.jay.coins=123;
   await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[c.accountId,original]);
   let st=(await call('state',undefined,c)).data;expect(st.family.profiles.jay.learning.school).toBe('dongmen');expect(st.family.profiles.jay.coins).toBe(123);
   async function command(command){const r=await call('command',{id:randomUUID(),revision:st.family.revision,command:{player:'jay',...command}},c);expect(r.status,JSON.stringify(r.data)).toBe(200);st=r.data;return r.data;}
   await command({type:'start',course,practice:false,timing:'relaxed'});const run=st.family.profiles.jay.run;
   for(let i=0;i<6;i++){
    await command({type:'ready-question',runId:run.id,index:i});const q=st.questions.jay;expect(q.grade).toBe(5);expect(q.course).toBe(course);expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();expect(q.examSources?.length).toBeGreaterThan(0);
    await command({type:'answer',runId:run.id,index:i,choice:questionById(q.id).answer});expect(st.result).toBe(true);
    const reload=(await call('state',undefined,c)).data;expect(reload.family.profiles.jay.learning).toEqual(st.family.profiles.jay.learning);
    if(i<5)await command({type:'next',runId:run.id,index:i});
   }
   expect(st.family.profiles.jay.run.status).toBe('won');
   for(const [id,profile] of Object.entries(original.profiles))if(id!=='jay')expect(st.family.profiles[id]).toEqual(profile);
  }
 });
 it('serves continuation questions after old-source mastery without resetting rewards',async()=>{
  const c=clients.jay;
  for(const course of ['chinese','science','english']){
   const original=newFamily();original.profiles.jay.coins=789;original.profiles.jay.tickets=3;for(const q of [...GRADE5_DONGMEN_EXAMS,...GRADE5_NEW_EXAMS])markMastered(original.profiles.jay.learning,q.id);
   await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[c.accountId,original]);
   let st=(await call('state',undefined,c)).data;expect(st.family.profiles.jay.coins).toBe(789);expect(st.family.profiles.jay.tickets).toBe(3);
   async function command(command){const r=await call('command',{id:randomUUID(),revision:st.family.revision,command:{player:'jay',...command}},c);expect(r.status,JSON.stringify(r.data)).toBe(200);st=r.data;}
   await command({type:'start',course,practice:false,timing:'relaxed'});const run=st.family.profiles.jay.run;
   for(let i=0;i<6;i++){
    await command({type:'ready-question',runId:run.id,index:i});const q=st.questions.jay;expect(GRADE5_REMAINING_EXAMS.some(row=>row.id===q.id)).toBe(true);expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();
    await command({type:'answer',runId:run.id,index:i,choice:questionById(q.id).answer});expect(st.result).toBe(true);expect((await call('state',undefined,c)).data.family).toEqual(st.family);if(i<5)await command({type:'next',runId:run.id,index:i});
   }
   expect(st.family.profiles.jay.run.status).toBe('won');expect(st.family.profiles.jay.coins).toBeGreaterThanOrEqual(789);expect(st.family.profiles.jay.tickets).toBeGreaterThanOrEqual(3);for(const q of GRADE5_DONGMEN_EXAMS)expect(st.family.profiles.jay.learning.mastered.ids).toContain(q.id);
   for(const [id,profile] of Object.entries(original.profiles))if(id!=='jay')expect(st.family.profiles[id]).toEqual(profile);
  }
 });
 it('persists new math/social and English intersection voyages while retaining prior source mastery',async()=>{
  const c=clients.jay;
  for(const course of ['math','social','english']){
   const original=newFamily();original.profiles.jay.coins=951;original.profiles.jay.tickets=4;for(const q of [...GRADE5_DONGMEN_EXAMS,...GRADE5_REMAINING_EXAMS])markMastered(original.profiles.jay.learning,q.id);
   await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[c.accountId,original]);let st=(await call('state',undefined,c)).data;expect(st.family.profiles.jay.coins).toBe(951);expect(st.family.profiles.jay.tickets).toBe(4);
   async function command(command){const r=await call('command',{id:randomUUID(),revision:st.family.revision,command:{player:'jay',...command}},c);expect(r.status,JSON.stringify(r.data)).toBe(200);st=r.data;}
   await command({type:'start',course,practice:false,timing:'relaxed'});const run=st.family.profiles.jay.run;
   for(let i=0;i<6;i++){
    await command({type:'ready-question',runId:run.id,index:i});const q=st.questions.jay;expect(GRADE5_NEW_EXAMS.some(n=>n.id===q.id)).toBe(true);expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();expect(st.family.profiles.jay.run.questions.filter(Boolean)).toHaveLength(1);
    await command({type:'answer',runId:run.id,index:i,choice:questionById(q.id).answer});expect(st.result).toBe(true);expect((await call('state',undefined,c)).data.family).toEqual(st.family);if(i<5)await command({type:'next',runId:run.id,index:i});
   }
   expect(st.family.profiles.jay.run.status).toBe('won');expect(st.family.profiles.jay.coins).toBeGreaterThanOrEqual(951);expect(st.family.profiles.jay.tickets).toBeGreaterThanOrEqual(4);for(const q of [...GRADE5_DONGMEN_EXAMS,...GRADE5_REMAINING_EXAMS])expect(st.family.profiles.jay.learning.mastered.ids).toContain(q.id);for(const [id,profile] of Object.entries(original.profiles))if(id!=='jay')expect(st.family.profiles[id]).toEqual(profile);
  }
 });
 it('derives the school on login without changing other gameplay fields',()=>{
  expect(clients.alan.data.family.profiles.quintus.learning.school).toBe('nantun');
  expect(clients.quintus.data.family.profiles.quintus.learning.school).toBe('yongchun');
  expect(clients.jimmy.data.family.profiles.feifei.learning.school).toBe('nantun');
  expect(clients.alan.data.family.profiles.feifei.learning.school).toBeUndefined();
 });
 it('allocates the right publisher server-side without sending future questions or answers',async()=>{
  for(const [name,player,course] of [['alan','quintus','chinese'],['quintus','quintus','chinese'],['jimmy','feifei','words']]){
   const c=clients[name];const started=await call('command',{id:randomUUID(),revision:c.data.family.revision,command:{type:'start',player,course,practice:true,timing:'relaxed'}},c);
   expect(started.status,JSON.stringify(started.data)).toBe(200);
   const run=started.data.family.profiles[player].run;
   const ready=await call('command',{id:randomUUID(),revision:started.data.family.revision,command:{type:'ready-question',player,runId:run.id,index:0}},c);
   expect(ready.status,JSON.stringify(ready.data)).toBe(200);
   const q=ready.data.questions[player];expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();
   expect(q.examSources.length).toBeGreaterThan(0);
   expect(q.grade).toBe(name==='jimmy'?2:4);
   if(name!=='jimmy')expect(q.publisher).toBe(name==='alan'?'康軒':'翰林');
   expect(ready.data.family.profiles[player].run.questions.slice(1).every(x=>x==='')).toBe(true);
   const answer=questionById(q.id).answer;
   const answered=await call('command',{id:randomUUID(),revision:ready.data.family.revision,command:{type:'answer',player,runId:run.id,index:0,choice:answer}},c);
   expect(answered.status,JSON.stringify(answered.data)).toBe(200);
   expect(answered.data.result).toBe(true);
  }
 });
 it('saves grade-two source answers and points for both schools in normal play',async()=>{
  for(const name of ['jimmy','feifei'])for(const course of ['words','pairs','math']){
   const c=clients[name];let state=await call('state',undefined,c);
   const old=state.data.family.profiles.feifei.run;
   if(old?.status==='active')state=await call('command',{id:randomUUID(),revision:state.data.family.revision,command:{type:'quit',player:'feifei',runId:old.id}},c);
   const started=await call('command',{id:randomUUID(),revision:state.data.family.revision,command:{type:'start',player:'feifei',course,practice:false,timing:'relaxed'}},c);
   expect(started.status,JSON.stringify(started.data)).toBe(200);
   const run=started.data.family.profiles.feifei.run;
   const ready=await call('command',{id:randomUUID(),revision:started.data.family.revision,command:{type:'ready-question',player:'feifei',runId:run.id,index:0}},c);
   expect(ready.status,JSON.stringify(ready.data)).toBe(200);
   const q=ready.data.questions.feifei;
   expect(q.grade).toBe(2);expect(q.publisher).toBe(course==='math'?'南一':'康軒');expect(q.course).toBe(course);
   if(course==='math'){expect(grade2MathIds.has(q.id),q.id).toBe(true);expect(eligibleExam(name==='jimmy'?'nantun':'yongchun',2,course,questionById(q.id)),q.id).toBe(true);}
   else expect(q.id.startsWith('cxg2-'),q.id).toBe(true);
   expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();
   console.info('authenticated-routing-evidence',JSON.stringify({synthetic:true,case:name,id:q.id,grade:q.grade,course:q.course,publisher:q.publisher,sources:q.examSources?.map(s=>s.id)}));
   if(course==='pairs')expect(q.hideReadingHints).toBe(true);
   expect(ready.data.family.profiles.feifei.run.questions.slice(1).every(id=>id==='')).toBe(true);
   const answered=await call('command',{id:randomUUID(),revision:ready.data.family.revision,command:{type:'answer',player:'feifei',runId:run.id,index:0,choice:questionById(q.id).answer}},c);
   expect(answered.status,JSON.stringify(answered.data)).toBe(200);expect(answered.data.result).toBe(true);
   expect(answered.data.family.profiles.feifei.milestones.masteryPoints).toBeGreaterThanOrEqual(20);
   const restored=await call('state',undefined,c);
   expect(restored.data.family.profiles.feifei.milestones.masteryPoints).toBe(answered.data.family.profiles.feifei.milestones.masteryPoints);
   const ended=await call('command',{id:randomUUID(),revision:restored.data.family.revision,command:{type:'quit',player:'feifei',runId:run.id}},c);
   expect(ended.status,JSON.stringify(ended.data)).toBe(200);
   const battle=await call('command',{id:randomUUID(),revision:ended.data.family.revision,command:{type:'battle-start',player:'feifei',course,used:[]}},c);
   expect(battle.status,JSON.stringify(battle.data)).toBe(200);const bq=battle.data.result.question;
   expect(bq.grade).toBe(2);expect(bq.course).toBe(course);expect(bq.publisher).toBe(course==='math'?'南一':'康軒');
   if(course==='math')expect(grade2MathIds.has(bq.id),bq.id).toBe(true);else expect(bq.id.startsWith('cxg2-'),bq.id).toBe(true);
   expect(eligibleExam(name==='jimmy'?'nantun':'yongchun',2,course,questionById(bq.id)),bq.id).toBe(true);
   expect(bq.examSources).toEqual(questionById(bq.id).examSources);expect(bq.answer).toBeUndefined();expect(bq.explanation).toBeUndefined();
   console.info('authenticated-grade2-battle-evidence',JSON.stringify({synthetic:true,case:name,id:bq.id,grade:bq.grade,course:bq.course,publisher:bq.publisher,sources:bq.examSources?.map(s=>s.id)}));
   if(course==='pairs')expect(battle.data.result.question.hideReadingHints).toBe(true);
  }
 });
 it('routes grade-one math for the authenticated Yongchun student and hides answers',async()=>{
  const c=clients.sunny;
  const state=await call('state',undefined,c);
  const r=await call('command',{id:randomUUID(),revision:state.data.family.revision,command:{type:'battle-start',player:'qingqing',course:'math',used:[]}},c);
  expect(r.status,JSON.stringify(r.data)).toBe(200);
  const q=r.data.result.question;
  expect(q.grade).toBe(1);expect(q.publisher).toBe('翰林');const approved=questionById(q.id);expect(approved).toBeDefined();expect(approved.grade).toBe(1);expect(approved.publisher).toBe('翰林');expect(approved.course).toBe('math');
  expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();
 });
 it('serves and grades source phonetics for grade one without exposing future answers',async()=>{
  const c=clients.sunny;
  for(const course of ['medials','pairs','tones']){
   const state=await call('state',undefined,c);
   const started=await call('command',{id:randomUUID(),revision:state.data.family.revision,command:{type:'start',player:'qingqing',course,practice:false,timing:'relaxed'}},c);
   expect(started.status,JSON.stringify(started.data)).toBe(200);
   const run=started.data.family.profiles.qingqing.run;
   const ready=await call('command',{id:randomUUID(),revision:started.data.family.revision,command:{type:'ready-question',player:'qingqing',runId:run.id,index:0}},c);
   expect(ready.status,JSON.stringify(ready.data)).toBe(200);
   const q=ready.data.questions.qingqing;
   expect(q.grade).toBe(1);expect(q.course).toBe(course);expect(q.publisher).toBe('康軒');expect(g1ChineseIds.has(q.id)).toBe(true);
   expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();expect(q.speechText).toBeTruthy();
   expect(ready.data.family.profiles.qingqing.run.questions.slice(1).every(id=>id==='')).toBe(true);
   const answered=await call('command',{id:randomUUID(),revision:ready.data.family.revision,command:{type:'answer',player:'qingqing',runId:run.id,index:0,choice:questionById(q.id).answer}},c);
   expect(answered.status,JSON.stringify(answered.data)).toBe(200);expect(answered.data.result).toBe(true);
   expect(answered.data.family.profiles.qingqing.milestones.masteryPoints).toBeGreaterThanOrEqual(20);
   const ended=await call('command',{id:randomUUID(),revision:answered.data.family.revision,command:{type:'quit',player:'qingqing',runId:run.id}},c);
   expect(ended.status,JSON.stringify(ended.data)).toBe(200);
  }
 });
 it('routes English practice by each authenticated account without leaking answers',async()=>{
  for(const [name,publisher] of [['alan','翰林'],['quintus','康軒']]){
   const c=clients[name];
   const r=await call('practice',{type:'start',player:'quintus',used:['math-previous','chinese-previous']},c);
   expect(r.status,JSON.stringify(r.data)).toBe(200);
   const q=r.data;
   expect(q.publisher).toBe(publisher);expect(q.examSources.length).toBeGreaterThan(0);
   expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();
  }
 });

 it('routes science battle questions for both schools and keeps answers server-only',async()=>{
  for(const name of ['alan','quintus']){
   const c=clients[name];const state=await call('state',undefined,c);
   const r=await call('command',{id:randomUUID(),revision:state.data.family.revision,command:{type:'battle-start',player:'quintus',course:'science',used:[]}},c);
   expect(r.status,JSON.stringify(r.data)).toBe(200);
   const q=r.data.result.question;
   expect(q.course).toBe('science');expect(q.publisher).toBe('康軒');expect(scienceIds.has(q.id)).toBe(true);
   expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();
  }
 });
 it('rejects a grade-two account trying to request grade-four science',async()=>{
  const c=clients.jimmy;const state=await call('state',undefined,c);
  const r=await call('command',{id:randomUUID(),revision:state.data.family.revision,command:{type:'battle-start',player:'feifei',course:'science',used:[]}},c);
  expect(r.status).toBe(400);
 });
 it('routes social battle questions for both schools and keeps answers server-only',async()=>{
  for(const name of ['alan','quintus']){
   const c=clients[name];const state=await call('state',undefined,c);
   const r=await call('command',{id:randomUUID(),revision:state.data.family.revision,command:{type:'battle-start',player:'quintus',course:'social',used:[]}},c);
   expect(r.status,JSON.stringify(r.data)).toBe(200);
   const q=r.data.result.question;
   expect(q.course).toBe('social');expect(q.publisher).toBe('康軒');expect(socialIds.has(q.id)).toBe(true);
   expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();
  }
 });
 it('rejects a grade-two account trying to request grade-four social',async()=>{
  const c=clients.jimmy;const state=await call('state',undefined,c);
  const r=await call('command',{id:randomUUID(),revision:state.data.family.revision,command:{type:'battle-start',player:'feifei',course:'social',used:[]}},c);
  expect(r.status).toBe(400);
 });

 it('routes math by authenticated school and keeps younger math age appropriate',async()=>{
  for(const [name,player,publisher] of [['alan','quintus','翰林'],['quintus','quintus','康軒'],['jimmy','feifei','南一']]){
   const c=clients[name];const state=await call('state',undefined,c);
   const r=await call('command',{id:randomUUID(),revision:state.data.family.revision,command:{type:'battle-start',player,course:'math',used:[]}},c);
   expect(r.status,JSON.stringify(r.data)).toBe(200);
   const q=r.data.result.question;
   expect(q.course).toBe('math');expect(q.grade).toBe(name==='jimmy'?2:4);
   expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();
   if(publisher){expect(q.publisher).toBe(publisher);expect(name==='jimmy'?grade2MathIds.has(q.id):MATH_EXAMS.some(item=>item.id===q.id&&item.publisher===publisher),q.id).toBe(true);expect(eligibleExam(name==='quintus'?'yongchun':'nantun',q.grade,'math',questionById(q.id)),q.id).toBe(true);}
   else {expect(q.examSources).toBeUndefined();expect(q.id.startsWith('n1-')).toBe(true);}
   console.info('authenticated-math-routing-evidence',JSON.stringify({synthetic:true,case:name,id:q.id,grade:q.grade,course:q.course,publisher:q.publisher,sources:q.examSources?.map(s=>s.id)}));
   // Grade two alternates words then math; grade four starts with math.
   const practice=await call('practice',{type:'start',player,used:name==='jimmy'?['words-previous']:[]},c);
   expect(practice.status,JSON.stringify(practice.data)).toBe(200);
   expect(practice.data.answer).toBeUndefined();expect(practice.data.explanation).toBeUndefined();
   if(publisher)expect(practice.data.publisher).toBe(publisher);
   else expect(practice.data.grade).toBe(2);
  }
 });

 it('authenticates Dunhua, persists Nanyi math progress and keeps book 3 out of English',async()=>{
  const c=clients.brownie;
  expect(c.data.family.profiles.quintus.learning.school).toBe('dunhua');
  let state=await call('state',undefined,c);
  const started=await call('command',{id:randomUUID(),revision:state.data.family.revision,command:{type:'start',player:'quintus',course:'math',practice:false,timing:'relaxed'}},c);
  expect(started.status,JSON.stringify(started.data)).toBe(200);
  const run=started.data.family.profiles.quintus.run;
  const ready=await call('command',{id:randomUUID(),revision:started.data.family.revision,command:{type:'ready-question',player:'quintus',runId:run.id,index:0}},c);
  expect(ready.status,JSON.stringify(ready.data)).toBe(200);
  const q=ready.data.questions.quintus;
  expect(q.grade).toBe(4);expect(q.publisher).toBe('南一');expect(q.id.startsWith('mx1-nm')).toBe(true);
  expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();
  expect(ready.data.family.profiles.quintus.run.questions.slice(1).every(id=>id==='')).toBe(true);
  const answered=await call('command',{id:randomUUID(),revision:ready.data.family.revision,command:{type:'answer',player:'quintus',runId:run.id,index:0,choice:questionById(q.id).answer}},c);
  expect(answered.status,JSON.stringify(answered.data)).toBe(200);expect(answered.data.result).toBe(true);
  expect(answered.data.family.profiles.quintus.milestones.masteryPoints).toBe(20);
  state=await call('state',undefined,c);
  expect(state.data.family.profiles.quintus.milestones.masteryPoints).toBe(20);
  expect(state.data.family.profiles.quintus.learning.school).toBe('dunhua');
  expect(state.data.family.profiles.quintus.learning.mastered.ids).toContain(q.id);
  const ended=await call('command',{id:randomUUID(),revision:state.data.family.revision,command:{type:'quit',player:'quintus',runId:run.id}},c);
  expect(ended.status).toBe(200);
  for(const [course,publisher] of [['math','南一'],['chinese','康軒'],['science','康軒'],['social','康軒'],['english',undefined]]){
   state=await call('state',undefined,c);
   const battle=await call('command',{id:randomUUID(),revision:state.data.family.revision,command:{type:'battle-start',player:'quintus',course,used:[]}},c);
   expect(battle.status,JSON.stringify(battle.data)).toBe(200);
   const question=battle.data.result.question;
   expect(question.publisher).toBe(publisher);expect(question.grade).toBe(4);
   expect(question.answer).toBeUndefined();expect(question.explanation).toBeUndefined();
   if(course==='english')expect(question.examSources).toBeUndefined();
   else expect(question.examSources.length).toBeGreaterThan(0);
  }
  const practice=await call('practice',{type:'start',player:'quintus',used:['math-previous','chinese-previous']},c);
  expect(practice.status,JSON.stringify(practice.data)).toBe(200);
  expect(practice.data.course).toBe('english');expect(practice.data.examSources).toBeUndefined();
  expect(practice.data.answer).toBeUndefined();
 });

 it('serves the new social supplement for three authenticated schools after prior mastery',async()=>{
  for(const name of ['alan','quintus','brownie']){
   const c=clients[name];
   const {rows:[stored]}=await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[c.accountId]);
   const learning=stored.family.profiles.quintus.learning;
   learning.mastered ??= {ids:[],generated:{}};
   SOCIAL_EXAMS.filter(q=>!socialSupplement.has(q.id)).forEach(q=>markMastered(learning,q.id));
   await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[c.accountId,stored.family]);
   const state=await call('state',undefined,c);
   const r=await call('command',{id:randomUUID(),revision:state.data.family.revision,command:{type:'battle-start',player:'quintus',course:'social',used:[]}},c);
   expect(r.status,JSON.stringify(r.data)).toBe(200);
   const q=r.data.result.question;
   expect(socialSupplement.has(q.id)).toBe(true);expect(q.publisher).toBe('康軒');expect(q.grade).toBe(4);
   expect(q.examSources.length).toBeGreaterThan(0);expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();
   expect(q.prompt).toBe(questionById(q.id).prompt);
  }
 }); it('serves the new science supplement for three authenticated schools after prior mastery',async()=>{
  for(const name of ['alan','quintus','brownie']){
   const c=clients[name];
   const {rows:[stored]}=await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[c.accountId]);
   const learning=stored.family.profiles.quintus.learning;
   learning.mastered ??= {ids:[],generated:{}};
   SCIENCE_EXAMS.filter(q=>!scienceSupplement.has(q.id)).forEach(q=>markMastered(learning,q.id));
   await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[c.accountId,stored.family]);
   const state=await call('state',undefined,c);
   const r=await call('command',{id:randomUUID(),revision:state.data.family.revision,command:{type:'battle-start',player:'quintus',course:'science',used:[]}},c);
   expect(r.status,JSON.stringify(r.data)).toBe(200);
   const q=r.data.result.question;
   expect(scienceSupplement.has(q.id)).toBe(true);expect(q.publisher).toBe('康軒');expect(q.grade).toBe(4);
   expect(q.examSources.length).toBeGreaterThan(0);expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();
   expect(q.prompt).toBe(questionById(q.id).prompt);
  }
 });

});
