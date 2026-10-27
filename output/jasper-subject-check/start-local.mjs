// Dedicated localhost QA only. The synthetic name exercises Jasper's roster mapping.
import {writeFileSync} from 'node:fs';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,startRun,readyQuestion,answerRun,nextQuestion,questionById,markMastered,validateFamily,taipeiDay,startStudy} from '../../build/game.mjs';
import {loadCatalog} from '../../scripts/content-audit.mjs';
const api=await createCloudApi({connectionString:'postgresql://127.0.0.1:55432/star_tide_jasper_entry_20261026',production:false});
const made=await provisionChildAccount(api.pool,{username:'jasper',password:process.env.QA_PASSWORD,displayName:'Jasper synthetic QA',grade:1});
if(!made.created)throw Error('Expected a fresh synthetic account');
await api.pool.query('UPDATE player_logins SET player_id=$2 WHERE id=$1',[made.memberId,'qingqing']);
const f=newFamily(),p=f.profiles.qingqing,day=taipeiDay();
startRun(f,'qingqing','math',crypto.randomUUID(),42,false,day,'relaxed');
for(let i=0;i<6;i++) {const r=p.run;readyQuestion(f,'qingqing',r.id,i,Date.now());answerRun(f,'qingqing',r.id,i,questionById(r.questions[i]).answer,day);if(i<5)nextQuestion(f,'qingqing',r.id,i);}
const c=await loadCatalog();
for(const q of c.LEARNING_BANK.filter(q=>q.grade===1))markMastered(p.learning,q.id);
for(const pool of c.GENERATED_POOLS.filter(pool=>pool.grade===1))for(let i=0;i<pool.params.length;i++)markMastered(p.learning,c.generatedId(pool,i));
// Restore a few unmastered items to match the observed shortage per subject.
for(const [course,count] of Object.entries({math:1,tones:4,medials:3,pairs:4})) {
  const candidates=course==='math'?c.GENERATED_POOLS.filter(pool=>pool.grade===1&&(pool.course??'math')===course).flatMap(pool=>pool.params.map((_,i)=>c.generatedId(pool,i))):c.LEARNING_BANK.filter(q=>q.grade===1&&q.course===course&&!q.examSources&&!q.retired&&!q.rephraseOf).map(q=>q.id);
  for(const id of candidates.slice(-count)) {
    const m=id.match(/^n1-(.+)-([0-9a-z]+)$/);
    if(!m)p.learning.mastered.ids=p.learning.mastered.ids.filter(x=>x!==id);
    else {const i=parseInt(m[2],36),pos=i>>2,bits=p.learning.mastered.generated[m[1]];p.learning.mastered.generated[m[1]]=bits.slice(0,pos)+(parseInt(bits[pos],16)&~(1<<(i%4))).toString(16)+bits.slice(pos+1);}
  }
}
validateFamily(f);writeFileSync('/tmp/jasper-entry-exhausted.json',JSON.stringify(f));
const resume=structuredClone(f);startStudy(resume.profiles.qingqing.learning,1,day,crypto.randomUUID(),'all','english');validateFamily(resume);writeFileSync('/tmp/jasper-entry-resume.json',JSON.stringify(resume));
await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,f]);
const server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));
writeFileSync('/tmp/jasper-entry-base.txt',`http://127.0.0.1:${server.address().port}`);console.log('Synthetic Jasper QA ready on localhost');
process.on('SIGTERM',()=>server.close(()=>api.close().then(()=>process.exit(0))));
