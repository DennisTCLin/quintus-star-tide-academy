// Isolated synthetic fixtures only. Credentials never enter the repository.
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,startRun,startIsland,readyQuestion,answerRun,nextQuestion,questionById,validateFamily} from '../../build/game.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
import {randomInt,randomUUID} from 'node:crypto';
const connectionString=process.env.TEST_DATABASE_URL;
if(!connectionString?.endsWith('/harbor_first_screen_20261026'))throw Error('Dedicated local database required');
const api=await createCloudApi({connectionString,production:false}), fixtures=[];
for(const [grade,state] of [[1,'new'],[2,'new'],[4,'new'],[6,'new'],[1,'ready'],[2,'ready'],[4,'ready'],[1,'reward'],[1,'failed'],[1,'math'],[1,'settled']]){
 const username='harbor_'+grade+'_'+state,password=String(randomInt(1000,10000));
 const made=await provisionChildAccount(api.pool,{username,password,displayName:'港口驗收',grade});
 const f=newFamily(),p=f.profiles[made.playerId];p.learning.school=grade===6?'jianan':'yongchun';
 if(!['new','math'].includes(state)){
  startRun(f,made.playerId,grade<=2?'medials':'chinese',randomUUID(),5,false,undefined,state==='reward'?undefined:'relaxed');
  const r=p.run;
  if(['reward','failed','settled'].includes(state)){
   for(let i=0;i<(state==='failed'?3:state==='settled'?1:6);i++){
    if(r.challenge)readyQuestion(f,made.playerId,r.id,r.index);
    const q=questionById(r.questions[r.index]);answerRun(f,made.playerId,r.id,r.index,state==='failed'?(q.answer+1)%q.options.length:q.answer);
    if(r.status==='active'&&state!=='settled')nextQuestion(f,made.playerId,r.id,r.index);
   }
  }
 }
 if(state==='reward')p.run.reward='pending'; // Supported legacy reward awaiting selection.
 if(state==='math')startIsland(f,made.playerId,'learn','1A-01',randomUUID(),new Date().toISOString().slice(0,10));
 validateFamily(f);
 await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,f]);
 fixtures.push({grade,state,username,password,player:made.playerId});
}
mkdirSync('/tmp/star-tide-harbor-private',{recursive:true,mode:0o700});
writeFileSync('/tmp/star-tide-harbor-private/local.json',JSON.stringify(fixtures),{mode:0o600});
const server=createAppServer({api});await new Promise(r=>server.listen(4364,'127.0.0.1',r));console.log('Isolated harbor QA ready on 4364');
process.on('SIGTERM',()=>server.close(()=>api.close().then(()=>process.exit(0))));
