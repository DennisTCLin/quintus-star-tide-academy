import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,startRun,questionById,validateFamily} from '../../build/game.mjs';
import {loadCatalog} from '../../scripts/content-audit.mjs';
import {writeFileSync} from 'node:fs';
const api=await createCloudApi({connectionString:'postgres://127.0.0.1:55432/ready_screen_20261026',production:false});
const {LEARNING_BANK}=await loadCatalog();const fixtures=[];
for(const grade of [1,2,4,6]){
 const made=await provisionChildAccount(api.pool,{username:'ready_'+grade,password:'0742',displayName:'準備頁測試',grade});
 const f=newFamily(),p=f.profiles[made.playerId];p.learning.school=grade===6?'jianan':'yongchun';
 startRun(f,made.playerId,grade===6?'science':'math',crypto.randomUUID(),5,false,undefined,grade<=2?'relaxed':'standard');
 if(grade===6){const figures=LEARNING_BANK.filter(q=>q.grade===6&&q.course==='science'&&q.image);const r=p.run; r.questions=[...new Set([...figures.slice(0,2).map(q=>q.id),...r.questions])].slice(0,6);r.challenge.difficultyLevels=r.questions.map(id=>questionById(id).level??1);}
 validateFamily(f);
 await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,f]);
 fixtures.push({grade,player:made.playerId,run:p.run.id,questions:p.run.questions.map(id=>({id,answer:questionById(id).answer,image:questionById(id).image}))});
}
writeFileSync('output/ready-screen/fixtures.json',JSON.stringify(fixtures,null,2));
const server=createAppServer({api});await new Promise(r=>server.listen(4356,'127.0.0.1',r));console.log('Ready QA 4356');
process.on('SIGTERM',()=>server.close(()=>api.close().then(()=>process.exit(0))));
