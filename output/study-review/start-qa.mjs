// Isolated local fixtures only. Never use with a production database.
import {provisionAdmin} from '../../server/admin.mjs';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,markMastered} from '../../build/game.mjs';
import {writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
const connectionString='postgres://127.0.0.1:55432/study_review_browser';
await build({entryPoints:['scripts/content-catalog.ts'],bundle:true,platform:'node',format:'esm',outfile:'/tmp/study-catalog.mjs'});
const {LEARNING_BANK,ENGLISH_REPHRASES,GENERATED_POOLS,generatedId}=await import('/tmp/study-catalog.mjs');
const api=await createCloudApi({connectionString,production:false});
const password='0742', names=['review_qa_four','review_qa_one','review_qa_exhausted'];
for(const [index,username] of names.entries()) {
 const grade=index===1?1:4;const made=await provisionChildAccount(api.pool,{username,grade,password,displayName:'複習測試航海員'});const family=newFamily(),s=family.profiles[made.playerId].learning;
 const items=LEARNING_BANK.filter(q=>q.grade===grade&&!q.examSources&&(grade===1?(!!q.audio&&['tones','medials','pairs'].includes(q.course)):q.course==='math'));
 if(index===2){
  for(const q of [...LEARNING_BANK,...ENGLISH_REPHRASES].filter(q=>q.grade===4))markMastered(s,q.id);
  for(const pool of GENERATED_POOLS.filter(p=>p.grade===4))for(let i=0;i<pool.params.length;i++)markMastered(s,generatedId(pool,i));
 } else items.slice(0,12).forEach(q=>markMastered(s,q.id));
 await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,family]);
}
await provisionAdmin(api.pool,{username:'review_admin_qa',password:'isolated-review-admin-2026'});
await api.pool.query('DELETE FROM request_limits');
const server=createAppServer({api});await new Promise(r=>server.listen(4317,'127.0.0.1',r));
await writeFile('/tmp/study-review-qa.json',JSON.stringify({base:'http://127.0.0.1:4317',password,names,answers:Object.fromEntries(LEARNING_BANK.map(q=>[q.id,q.answer]))}));
console.log('Isolated review QA server ready on 4317');
process.on('SIGTERM',()=>server.close(()=>api.close().then(()=>process.exit(0))));
