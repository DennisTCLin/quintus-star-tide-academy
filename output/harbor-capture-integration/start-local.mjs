// A new local synthetic database only. Never connects to a production host.
import pg from 'pg';
import {randomInt,randomUUID} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,startRun,readyQuestion,answerRun,nextQuestion,startIsland,answerIsland,finishIsland,questionById,validateFamily,taipeiDay} from '../../build/game.mjs';
const control=new pg.Pool({connectionString:'postgres://127.0.0.1:55432/postgres'}),name='harbor_capture_review_'+Date.now();
await control.query('CREATE DATABASE '+name);
const api=await createCloudApi({connectionString:'postgres://127.0.0.1:55432/'+name,production:false});
const fixtures=[],day=taipeiDay();
for(const engine of ['webkit','chromium'])for(const [grade,state] of [[1,'capture-voyage'],[2,'capture-voyage'],[4,'capture-voyage'],[1,'capture-island'],[2,'capture-island'],[1,'active'],[1,'legacy-reward'],[1,'new'],[2,'new'],[1,'active-math']]){
 const username='hcr_'+(engine==='webkit'?'wk':'cr')+'_'+grade+'_'+state.replaceAll('-','_'),password=String(randomInt(1000,10000));
 const made=await provisionChildAccount(api.pool,{username,password,displayName:'港口降服測試',grade});
 const f=newFamily(),id=made.playerId,p=f.profiles[id];
 if(['capture-voyage','active','legacy-reward'].includes(state)){
  startRun(f,id,'math',randomUUID(),2,false,day,'relaxed');const r=p.run;
  if(state!=='active')for(let i=0;i<6;i++){
   if(r.challenge)readyQuestion(f,id,r.id,r.index);
   answerRun(f,id,r.id,r.index,questionById(r.questions[r.index]).answer,day,0);
   if(i<5)nextQuestion(f,id,r.id,r.index);
  }
  if(state==='legacy-reward'){delete r.capture;delete r.captureRule;r.reward='pending';}
 }
 if(['capture-island','active-math'].includes(state)){
  const unit=grade===2?'2A-01':'1A-01';p.mathIsland={units:{[unit]:{learn:true}},pool:[],stats:{},day:'',attempted:[]};
  const r=startIsland(f,id,'play',unit,randomUUID(),day,1);
  if(state==='capture-island'){
   for(let i=0;i<r.items.length;i++)answerIsland(f,id,r.id,i,r.items[i].answer,day);
   finishIsland(f,id,r.id,day,0);
  }
 }
 validateFamily(f);await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,f]);
 const r=state==='capture-island'?p.mathIsland.run:p.run;
 fixtures.push({engine,username,password,grade,state,player:id,runId:r?.id,captureAnswers:r?.capture?.trial?.questions.map(qid=>questionById(qid).answer)});
}
mkdirSync('/tmp/star-tide-harbor-capture-private',{recursive:true,mode:0o700});
writeFileSync('/tmp/star-tide-harbor-capture-private/fixtures.json',JSON.stringify(fixtures),{mode:0o600});
const server=createAppServer({api});await new Promise(r=>server.listen(4378,'127.0.0.1',r));console.log('Harbor capture integration synthetic fixtures ready4378');
async function close(){await new Promise(r=>server.close(r));await api.close();await control.query('DROP DATABASE '+name);await control.end();process.exit(0);}
process.on('SIGTERM',()=>void close());
