// Only for the dedicated disposable localhost QA database.
import {pathToFileURL}from'node:url';import{writeFileSync}from'node:fs';
const root=process.cwd(),load=p=>import(pathToFileURL(root+'/'+p).href);
const {createCloudApi}=await load('server/cloud.mjs'),{createAppServer}=await load('server.mjs'),{provisionChildAccount}=await load('server/child-account.mjs');
const {newFamily,startRun,answerRun,nextQuestion,readyQuestion,questionById,taipeiDay,validateFamily}=await load('build/game.mjs');
const api=await createCloudApi({connectionString:'postgresql://127.0.0.1:55432/star_tide_ipad_next_20261026',production:false});
const made=await provisionChildAccount(api.pool,{username:'ipad_next_qa',password:process.env.QA_PASSWORD,displayName:'iPad next-button QA',grade:6});
if(!made.created)throw Error('Expected new local fixture');
const f=newFamily(),p=f.profiles.alston;p.learning.school='jianan';startRun(f,'alston','science',crypto.randomUUID(),42,false,taipeiDay(),'relaxed');
const run=p.run;
const{loadCatalog}=await load('scripts/content-audit.mjs');const{LEARNING_BANK}=await loadCatalog();const q=LEARNING_BANK.find(q=>q.grade===6&&q.prompt.includes('颱風編號202504'));if(!q)throw Error('Target question missing');
const other=run.questions.indexOf(q.id);if(other>=0)[run.questions[3],run.questions[other]]=[run.questions[other],run.questions[3]];else run.questions[3]=q.id;
for(let i=0;i<3;i++){readyQuestion(f,'alston',run.id,i,Date.now());answerRun(f,'alston',run.id,i,questionById(run.questions[i]).answer,taipeiDay());nextQuestion(f,'alston',run.id,i);}
readyQuestion(f,'alston',run.id,3,Date.now());validateFamily(f);
await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,f]);
writeFileSync('/tmp/ipad-next-family.json',JSON.stringify(f));
writeFileSync('output/ipad-next-button/fixture-state.json',JSON.stringify({questionId:q.id,answer:q.answer,wrong:(q.answer+1)%q.options.length,runId:run.id}));
const server=createAppServer({api});await new Promise(r=>server.listen(47829,'127.0.0.1',r));console.log('Isolated QA ready on 47829');process.on('SIGTERM',()=>server.close(()=>api.close().then(()=>process.exit(0))));
