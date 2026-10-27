import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,startRun,answerRun,nextQuestion,questionById,markMastered} from '../../build/game.mjs';
import {LEARNING_BANK} from '../learning';
import {eligibleExam} from '../school-curriculum';
import {EXPECTED_CHILD_CURRICULA} from './helpers/child-curricula';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('all parent-confirmed child curriculum routing',()=>{
 let api,server,url;const accounts=[];const clients={};
 async function call(path,body,c){const r=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(c?{Cookie:c.cookie,'X-CSRF-Token':c.data.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 beforeAll(async()=>{
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  for(const [username,player,grade,school,courses] of EXPECTED_CHILD_CURRICULA){
   const made=await provisionChildAccount(api.pool,{username,grade,password:'0742',displayName:'Synthetic routing QA'});accounts.push(made.accountId);
   // Olivia has the doudou grade-one slot; provisioning's grade default is qingqing.
   await api.pool.query('UPDATE player_logins SET player_id=$2 WHERE id=$1',[made.memberId,player]);
   const original=newFamily();original.profiles[player].coins=735;original.profiles[player].tickets=5;
   const old=LEARNING_BANK.find(q=>!q.retired&&q.grade===grade&&!q.examSources&&q.course!=='math')??LEARNING_BANK.find(q=>!q.retired&&q.grade===grade);markMastered(original.profiles[player].learning,old.id);
   original.profiles[player].learning.school=school;startRun(original,player,'math','existing-'+username,41);
   const oldRun=original.profiles[player].run;answerRun(original,player,oldRun.id,0,questionById(oldRun.questions[0]).answer);nextQuestion(original,player,oldRun.id,0);
   delete original.profiles[player].learning.school;
   await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,original]);
   const c=await call('login',{username:username.toUpperCase(),password:'0742'});expect(c.status,JSON.stringify(c.data)).toBe(200);expect(c.data.playerId).toBe(player);expect(c.data.family.profiles[player].learning.school).toBe(school);
   clients[username]={...c,accountId:made.accountId,original,oldId:old.id};
  }
 },30000);
 afterAll(async()=>{
  await new Promise(r=>server.close(r));
  for(const table of ['command_receipts','sessions','player_logins','game_states'])await api.pool.query(`DELETE FROM ${table} WHERE account_id=ANY($1::uuid[])`,[accounts]);
  await api.pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[accounts]);await api.close();
 });
 for(const [username,player,grade,school,courses] of EXPECTED_CHILD_CURRICULA){
  it(`${username}: school overlay preserves old voyage, mastery, rewards and database bytes`,async()=>{
   const c=clients[username],st=await call('state',undefined,c);expect(st.status).toBe(200);expect(st.data.family.profiles[player].learning.school).toBe(school);
   const raw=(await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[c.accountId])).rows[0].family;expect(raw).toEqual(c.original);
   expect(st.data.family.profiles[player].run.id).toBe(c.original.profiles[player].run.id);expect(st.data.family.profiles[player].run.answers).toEqual(c.original.profiles[player].run.answers);expect(st.data.family.profiles[player].coins).toBe(c.original.profiles[player].coins);expect(st.data.family.profiles[player].tickets).toBe(5);
  });
  it(`${username}: all matching subject voyages save and reload without cross-school sources`,async()=>{
   const c=clients[username],earned=[];let st=(await call('state',undefined,c)).data;
   async function command(command){const r=await call('command',{id:randomUUID(),revision:st.family.revision,command:{player,...command}},c);expect(r.status,JSON.stringify(r.data)).toBe(200);st=r.data;}
   await command({type:'quit',runId:st.family.profiles[player].run.id});
   for(const [course,[publisher]] of Object.entries(courses)){
    await command({type:'start',course,practice:false,timing:'relaxed'});const run=st.family.profiles[player].run;expect(run.questions).toHaveLength(6);
    for(let index=0;index<6;index++){
     await command({type:'ready-question',runId:run.id,index});const q=st.questions[player];expect(q.grade).toBe(grade);expect(q.course).toBe(course);expect(q.publisher).toBe(publisher);expect(q.examSources?.length).toBeGreaterThan(0);expect(eligibleExam(school,grade,course,questionById(q.id))).toBe(true);expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();
     await command({type:'answer',runId:run.id,index,choice:questionById(q.id).answer});expect(st.result).toBe(true);earned.push(q.id);expect((await call('state',undefined,c)).data.family).toEqual(st.family);
     if(index<5)await command({type:'next',runId:run.id,index});
    }
    expect(st.family.profiles[player].run.status).toBe('won');
    if(st.family.profiles[player].run.capture?.outcome==='pending')await command({type:'capture-skip',source:'voyage',runId:run.id});
    const battle=await call('command',{id:randomUUID(),revision:st.family.revision,command:{type:'battle-start',player,course,used:[]}},c);expect(battle.status,JSON.stringify(battle.data)).toBe(200);const bq=battle.data.result.question;expect(bq.publisher).toBe(publisher);expect(bq.grade).toBe(grade);expect(bq.course).toBe(course);expect(eligibleExam(school,grade,course,questionById(bq.id))).toBe(true);expect(bq.answer).toBeUndefined();st=battle.data;
    await command({type:'battle-answer',token:battle.data.result.token,question:bq.id,choice:questionById(bq.id).answer});earned.push(bq.id);

   }
   // Historical practice intentionally exposes only its existing 0..2 rotation;
   // grade-one practice is English foundation, while Chinese/math use voyages/battle.
   for(let i=0;i<3;i++){
    const practice=await call('practice',{type:'start',player,used:Array.from({length:i},(_,j)=>'synthetic-used-'+j)},c);expect(practice.status,JSON.stringify(practice.data)).toBe(200);const q=practice.data;expect(q.grade).toBe(grade);expect(q.answer).toBeUndefined();if(q.examSources)expect(eligibleExam(school,grade,q.course,questionById(q.id))).toBe(true);
    const before=(await call('state',undefined,c)).data.family.profiles[player];
    const answered=await call('practice',{type:'answer',question:q.id,choice:questionById(q.id).answer},c);expect(answered.status,JSON.stringify(answered.data)).toBe(200);earned.push(q.id);
    const after=(await call('state',undefined,c)).data.family.profiles[player];expect(after.learning.mastered.ids).toContain(q.id);expect(after.coins).toBe(before.coins);expect(after.tickets).toBe(before.tickets);
   }
   const final=(await call('state',undefined,c)).data.family;expect(final.profiles[player].learning.school).toBe(school);for(const id of [...c.original.profiles[player].learning.mastered.ids,...earned])expect(final.profiles[player].learning.mastered.ids).toContain(id);expect(final.profiles[player].coins).toBeGreaterThanOrEqual(735);expect(final.profiles[player].tickets).toBeGreaterThanOrEqual(5);for(const [id,p] of Object.entries(c.original.profiles))if(id!==player)expect(final.profiles[id]).toEqual(p);
  },60000);
 }
});
