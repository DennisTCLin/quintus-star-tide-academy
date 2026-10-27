// Local synthetic accounts only. Keep production and existing previews untouched.
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,startRun,readyQuestion,questionById,taipeiDay,validateFamily} from '../../build/game.mjs';
import {loadCatalog} from '../../scripts/content-audit.mjs';
import {writeFileSync} from 'node:fs';
const api=await createCloudApi({connectionString:'postgres://127.0.0.1:55432/battle_cinematics_20261026',production:false});
const {LEARNING_BANK}=await loadCatalog();
const specs=[['short',1,'math',q=>q.prompt==='8 − 6 = ?'||q.prompt==='8 - 6 = ?'],['ruby',2,'math',q=>q.prompt.length<40],['long',6,'chinese',q=>q.prompt.length>180],['image',6,'science',q=>!!q.image],['english',1,'english',q=>q.options.some(o=>o.text.length>10)],['pictures',1,'pairs',q=>q.options.every(o=>o.image||o.icon)],['englishlong',6,'english',q=>q.id==='g6e-59eac6811a7a802a5d'],['sequence',4,'math',q=>q.prompt.length<40]];
const answers={};const fixtures=[];
for(const [suffix,grade,course,match] of specs){
 console.log('Seed',suffix);
 const made=await provisionChildAccount(api.pool,{username:'console_'+suffix,password:'0742',displayName:'上下戰鬥體驗',grade});
 const f=newFamily(),p=f.profiles[made.playerId];p.learning.school=grade===6?'jianan':'yongchun';p.owned.nebulafox=1;p.firstAcquired.nebulafox=null;p.equipped='nebulafox';
 startRun(f,made.playerId,course==='words'?'chinese':course,crypto.randomUUID(),grade,true,taipeiDay(),'relaxed');const r=p.run;
 const candidates=LEARNING_BANK.filter(q=>q.grade===grade&&q.course===course);const target=suffix==='long'?[...candidates].sort((a,b)=>b.prompt.length-a.prompt.length)[0]:candidates.find(match)||candidates[0];
 if(!target)throw Error('No fixture '+suffix);
 const other=r.questions.indexOf(target.id);if(other>=0)[r.questions[0],r.questions[other]]=[r.questions[other],r.questions[0]];else r.questions[0]=target.id;
 if(r.challenge)r.challenge.difficultyLevels=r.questions.map(id=>questionById(id).level??questionById(id).difficulty??(questionById(id).course==='words'&&(questionById(id).target?.text.length??2)>2?2:1));
 if(r.challenge&&!r.challenge.clock)readyQuestion(f,made.playerId,r.id,r.index,Date.now());
 validateFamily(f);for(const id of r.questions)answers[id]=questionById(id).answer;
 fixtures.push({suffix,grade,id:target.id,prompt:target.prompt,options:target.options.map(o=>o.text),image:target.image});
 await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,f]);
}
writeFileSync('output/stacked-quiz/answers.json',JSON.stringify(answers));writeFileSync('output/stacked-quiz/fixtures.json',JSON.stringify(fixtures,null,2));
if(process.argv.includes('--seed-only')){await api.close();process.exit(0);}
const server=createAppServer({api});await new Promise(r=>server.listen(4348,'127.0.0.1',r));console.log('Stacked quiz ready http://localhost:4348');
process.on('SIGTERM',()=>server.close(()=>api.close().then(()=>process.exit(0))));
