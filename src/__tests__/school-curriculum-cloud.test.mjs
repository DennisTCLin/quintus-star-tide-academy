import {beforeAll,afterAll,it,expect,describe} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,questionById,markMastered,challengeEligible} from '../../build/game.mjs';
import {LEARNING_BANK} from '../learning';
import {eligibleExam,coursePublisher} from '../school-curriculum';
import {EXAM_SOURCES} from '../exam-sources';
import {EXPECTED_CHILD_CURRICULA} from './helpers/child-curricula';
import {withAdaptiveOverlay,completeLearning} from './helpers/adaptive-fixture.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
// The prior forced-unseen-paper allocator tests are replaced by explicit cold
// start and authentic preparation contracts. All ten confirmed identities remain
// covered; source hashes and every-course reward transactions also run in the
// pinned finals/all-child suites. No test-only bypass is added to production.
suite('authenticated school routing and adaptive readiness',()=>{
 let api,server,url;const clients={};
 async function call(path,body,c){const r=await fetch(url+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:url,...(body?{'Content-Type':'application/json'}:{}),...(c?{Cookie:c.cookie,'X-CSRF-Token':c.data.csrf}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 async function raw(c){return (await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[c.accountId])).rows[0].family;}
 const ledger=p=>({coins:p.coins,tickets:p.tickets,starTickets:p.starTickets,growth:p.growth,milestones:p.milestones,owned:p.owned,rewardStars:p.rewardStars,rewardRounds:p.rewardRounds});
 beforeAll(async()=>{api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  for(const [username,player,grade] of EXPECTED_CHILD_CURRICULA){const made=await provisionChildAccount(api.pool,{username,grade,password:'0742',displayName:'Synthetic school QA'});await api.pool.query('UPDATE player_logins SET player_id=$2 WHERE id=$1',[made.memberId,player]);clients[username]={...await call('login',{username,password:'0742'}),accountId:made.accountId};}
 },30000);
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 for(const [username,player,grade,school,courses] of EXPECTED_CHILD_CURRICULA){
  it(`${username}: keeps school, source metadata and ledgers while unfamiliar subjects open teaching`,async()=>{
   const c=clients[username],original=newFamily(),p=original.profiles[player];p.coins=735;p.tickets=5;
   const originalPaper=LEARNING_BANK.find(q=>q.grade===grade&&!q.retired&&eligibleExam(school,grade,q.course,q));expect(originalPaper).toBeDefined();markMastered(p.learning,originalPaper.id);
   await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[c.accountId,original]);let st=(await call('state',undefined,c)).data;
   const expected=withAdaptiveOverlay(original);expected.profiles[player].learning.school=school;expect(st.family).toEqual(expected);expect(await raw(c)).toEqual(original);
   for(const [course,[publisher]] of Object.entries(courses)){
    expect(coursePublisher(school,grade,course)).toBe(publisher);
    const papers=LEARNING_BANK.filter(q=>!q.retired&&q.grade===grade&&q.course===course&&eligibleExam(school,grade,course,q));expect(papers.length).toBeGreaterThan(0);
    for(const q of papers){expect(q.publisher).toBe(publisher);expect(q.examSources.every(s=>!!EXAM_SOURCES[s.id])).toBe(true);expect(questionById(q.id)).toEqual(q);}
    const sent=await call('command',{id:randomUUID(),revision:st.family.revision,command:{type:'start',player,course,practice:false,timing:'relaxed'}},c);expect(sent.status,JSON.stringify(sent.data)).toBe(200);st=sent.data;
    expect(st.result).toBe('learn');expect(st.family.profiles[player].run).toBeNull();expect(st.learningLessons[player].example).toBeUndefined();expect(st.questions[player]).toBeUndefined();expect(ledger(st.family.profiles[player])).toEqual(ledger(p));
    expect(st.family.profiles[player].learning.mastered).toEqual(p.learning.mastered);
    const end=await call('command',{id:randomUUID(),revision:st.family.revision,command:{type:'review-finish',player,sessionId:st.family.profiles[player].learning.study.session.id}},c);expect(end.status).toBe(200);st=end.data;
    const battle=await call('command',{id:randomUUID(),revision:st.family.revision,command:{type:'battle-start',player,course,used:[]}},c);expect(battle.status).toBe(400);
   }
   for(const [id,peer] of Object.entries(expected.profiles))if(id!==player)expect(st.family.profiles[id]).toEqual(peer);
  });
  it(`${username}: genuine school-scope and independent learning enables safe redacted play across devices`,async()=>{
   const c=clients[username];let st=(await call('state',undefined,c)).data;const before=ledger(st.family.profiles[player]);
   async function send(command){const r=await call('command',{id:randomUUID(),revision:st.family.revision,command:{player,...command}},c);expect(r.status,JSON.stringify(r.data)).toBe(200);st=r.data;}
   await send({type:'review-start',mode:'learn',course:'math'});await completeLearning(send,()=>st,player);expect(ledger(st.family.profiles[player])).toEqual(before);
   await send({type:'start',course:'math',practice:false,timing:'relaxed'});const run=st.family.profiles[player].run;expect(run.questions).toEqual(Array(6).fill(''));expect(st.questions[player]).toBeUndefined();
   await send({type:'ready-question',runId:run.id,index:0});const q=st.questions[player];expect(q.grade).toBe(grade);expect(q.course).toBe('math');expect(q.answer).toBeUndefined();expect(q.explanation).toBeUndefined();
   expect(challengeEligible((await raw(c)).profiles[player].learning,questionById(q.id),grade,'math')).toBe(true);if(q.examSources?.length)expect(eligibleExam(school,grade,'math',questionById(q.id))).toBe(true);
   const body={id:randomUUID(),revision:st.family.revision,command:{type:'answer',player,runId:run.id,index:0,choice:questionById(q.id).answer}};
   const first=await call('command',body,c),replay=await call('command',body,c);expect(first.status).toBe(200);expect(replay.status).toBe(200);expect(replay.data.family).toEqual(first.data.family);expect(first.data.family.profiles[player].coins).toBe(before.coins+10);
   const other=await call('login',{username,password:'0742'});expect(other.status).toBe(200);expect(other.data.family).toEqual(first.data.family);
  });
 }
 it('rejects school/grade spoofing and unavailable younger courses without changing any save',async()=>{const c=clients.jimmy,before=await raw(c),st=(await call('state',undefined,c)).data;for(const extra of [{course:'science'},{course:'social'},{course:'math',school:'dongmen'},{course:'math',grade:5}]){const r=await call('command',{id:randomUUID(),revision:st.family.revision,command:{type:'start',player:'feifei',practice:false,...extra}},c);expect(r.status).toBe(400);}expect(await raw(c)).toEqual(before);});
});
