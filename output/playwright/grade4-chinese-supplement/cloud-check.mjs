// Synthetic local-only acceptance. Never point this at a production database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createCloudApi} from '../../../server/cloud.mjs';
import {createAppServer} from '../../../server.mjs';
import {provisionChildAccount} from '../../../server/child-account.mjs';
import {newFamily,markMastered,questionById} from '../../../build/game.mjs';
const api=await createCloudApi({connectionString:'postgres://localhost:55432/star_tide_g4_chinese_browser',production:false});
const server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
let cookie,csrf,accountId;
async function call(path,body){
 const response=await fetch(origin+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie,'X-CSRF-Token':csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));
 if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];if(data.csrf)csrf=data.csrf;return data;
}
try{
 const made=await provisionChildAccount(api.pool,{username:'alan',grade:4,password:'0742',displayName:'Synthetic source QA'});assert.ok(made.created);accountId=made.accountId;
 const family=newFamily();
 for(const file of ['20261025','20261026'])for(const row of JSON.parse(fs.readFileSync(`src/data/chinese-exams-${file}.json`,'utf8'))){
  if(!row.id.startsWith('cx1-sw109-7-'))markMastered(family.profiles.quintus.learning,row.id);
 }
 await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[accountId,family]);
 const login=await call('login',{username:'alan',password:'0742'});assert.equal(login.family.profiles.quintus.learning.school,'nantun');
 const started=await call('command',{id:randomUUID(),revision:login.family.revision,command:{type:'start',player:'quintus',course:'chinese',practice:false,timing:'relaxed'}});
 const run=started.family.profiles.quintus.run;
 const ready=await call('command',{id:randomUUID(),revision:started.family.revision,command:{type:'ready-question',player:'quintus',runId:run.id,index:0}});
 const q=ready.questions.quintus;assert.ok(q.id.startsWith('cx1-sw109-7-'));assert.equal(q.grade,4);assert.equal(q.publisher,'康軒');
 assert.ok(q.prompt.includes('每年的六、七月'));assert.ok(q.prompt.includes('流連忘返'));assert.equal(q.answer,undefined);assert.equal(q.explanation,undefined);assert.ok(ready.family.profiles.quintus.run.questions.slice(1).every(id=>id===''));
 const answered=await call('command',{id:randomUUID(),revision:ready.family.revision,command:{type:'answer',player:'quintus',runId:run.id,index:0,choice:questionById(q.id).answer}});assert.equal(answered.result,true);
 const restored=await call('state');assert.ok(restored.family.profiles.quintus.learning.mastered.ids.includes(q.id));assert.ok(restored.family.profiles.quintus.milestones.masteryPoints>=20);
 const result={passed:true,questionId:q.id,completePassage:true,serverOnlyAnswers:true,futureQuestionsHidden:true,correctAnswer:true,masteryPersisted:true,points:restored.family.profiles.quintus.milestones.masteryPoints};
 fs.writeFileSync('output/playwright/grade4-chinese-supplement/cloud-check.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{
 await new Promise(r=>server.close(r));
 if(accountId){for(const table of ['command_receipts','sessions','player_logins','game_states'])await api.pool.query(`DELETE FROM ${table} WHERE account_id=$1`,[accountId]);await api.pool.query('DELETE FROM accounts WHERE id=$1',[accountId]);}await api.close();
}
