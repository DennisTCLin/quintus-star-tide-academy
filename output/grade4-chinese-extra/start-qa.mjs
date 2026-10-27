// Isolated synthetic account only; never use a production database.
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,markMastered,startRun} from '../../build/game.mjs';
import {writeFileSync} from 'node:fs';
import {loadCatalog} from '../../scripts/content-audit.mjs';
const api=await createCloudApi({connectionString:'postgres://127.0.0.1:55432/g1_math_browser_20261026',production:false});
const {LEARNING_BANK}=await loadCatalog();
for (const [course,suffix] of [['chinese','regular'],['chinese','reading']]){
 const made=await provisionChildAccount(api.pool,{username:'g4_chinese_'+suffix,password:'0742',displayName:'小四國語測試',grade:4});
 const f=newFamily(),p=f.profiles[made.playerId];p.learning.school='yongchun';
 for(const q of LEARNING_BANK.filter(q=>q.grade===4&&q.examSources&&!q.id.startsWith('hc1-extra-')))markMastered(p.learning,q.id);
 if(suffix==='reading')for(const q of LEARNING_BANK.filter(q=>q.id.startsWith('hc1-extra-')&&q.format!=='short-passage'))markMastered(p.learning,q.id);
 // All questions are new source-derived items after old-bank mastery.
 startRun(f,made.playerId,course,crypto.randomUUID(),1,false,'2026-10-26','relaxed');
 await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,f]);
}
writeFileSync('/tmp/g4-chinese-answers.json',JSON.stringify(Object.fromEntries(LEARNING_BANK.map(q=>[q.id,q.answer]))));
const server=createAppServer({api});await new Promise(r=>server.listen(4334,'127.0.0.1',r));console.log('ready4334');
process.on('SIGTERM',()=>server.close(()=>api.close().then(()=>process.exit(0))));
