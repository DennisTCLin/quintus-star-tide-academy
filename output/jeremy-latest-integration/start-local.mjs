// A dedicated localhost database. No production credentials or player saves are used.
import {writeFileSync} from 'node:fs';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,startRun,readyQuestion,answerRun,nextQuestion,questionById,validateFamily,taipeiDay,startIsland,answerIsland} from '../../build/game.mjs';
import {loadCatalog} from '../../scripts/content-audit.mjs';
const database='star_tide_latest_browser_20261026',out='output/jeremy-latest-integration';
const api=await createCloudApi({connectionString:`postgresql://127.0.0.1:55432/${database}`,production:false});
async function account(username,grade,family) {
 const made=await provisionChildAccount(api.pool,{username,grade,password:process.env.MATH_QA_PASSWORD,displayName:'Integration QA'});
 if(!made.created)throw Error('Expected new isolated account');
 await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,family]);
}
for(const grade of [1,2,4,5])await account('mathqa_g'+grade,grade,newFamily());
const day=taipeiDay();
function ordinary(mode='failed') {
 const f=newFamily(),p=f.profiles.alston;p.learning.school='jianan';
 startRun(f,'alston','science',crypto.randomUUID(),42,false,day,'relaxed');
 if(mode!=='active')for(let i=0;i<6;i++) {
  const r=p.run,q=questionById(r.questions[i]);readyQuestion(f,'alston',r.id,i,Date.now());
  answerRun(f,'alston',r.id,i,mode==='failed'&&i>=3?(q.answer+1)%q.options.length:q.answer,day);
  if(i<5)nextQuestion(f,'alston',r.id,i);
 }
 if(mode==='pending'){p.run.reward='pending';p.rewardStars--;}
 validateFamily(f);return f;
}
for(const mode of ['failed','active','pending','completed'])writeFileSync(`/tmp/jeremy-latest-${mode}.json`,JSON.stringify(ordinary(mode)));
await account('alston',6,ordinary());
const next=newFamily(),p=next.profiles.alston;p.learning.school='jianan';startRun(next,'alston','science',crypto.randomUUID(),42,false,day,'relaxed');
const {LEARNING_BANK}=await loadCatalog(),q=LEARNING_BANK.find(q=>q.grade===6&&q.prompt.includes('颱風編號202504')),r=p.run;
if(!q)throw Error('Missing retained question');
const at=r.questions.indexOf(q.id);if(at>=0)[r.questions[3],r.questions[at]]=[r.questions[at],r.questions[3]];else r.questions[3]=q.id;
for(let i=0;i<3;i++){readyQuestion(next,'alston',r.id,i,Date.now());answerRun(next,'alston',r.id,i,questionById(r.questions[i]).answer,day);nextQuestion(next,'alston',r.id,i);}
readyQuestion(next,'alston',r.id,3,Date.now());validateFamily(next);await account('ipad_next_qa',6,next);
writeFileSync('/tmp/jeremy-latest-next-family.json',JSON.stringify(next));writeFileSync(out+'/next-fixture-state.json',JSON.stringify({runId:r.id,questionId:q.id,answer:q.answer,wrong:(q.answer+1)%q.options.length}));
const mathActive=ordinary('completed'),math=startIsland(mathActive,'alston','learn','6A-01',crypto.randomUUID(),day,42,6);
answerIsland(mathActive,'alston',math.id,0,math.items[0].answer,day);validateFamily(mathActive);writeFileSync('/tmp/jeremy-latest-math-active.json',JSON.stringify(mathActive));
const server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));
writeFileSync('/tmp/jeremy-latest-browser-base.txt',`http://127.0.0.1:${server.address().port}`);console.log('Isolated integration QA ready');
process.on('SIGTERM',()=>server.close(()=>api.close().then(()=>process.exit(0))));
