// Uses only the compiled immutable Git c66 module; no current candidate import or formal data.
import fs from 'node:fs';import{createHash}from'node:crypto';import*as a from'./base-adventure.mjs';import*as c from'./base-catalog.mjs';
const h=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),map=new Map([...c.LEARNING_BANK,...c.ENGLISH_REPHRASES].map(q=>[q.id,q]));
const path='docs/content-review/finals131-round6-20261107/fixtures/base-c66-families.json',pinned=JSON.parse(fs.readFileSync(path)),results=[];
for(const old of pinned.items){const{player,grade,school,course}=old;const f=a.newFamily(),p=f.profiles[player];p.learning.school=school;p.coins=1234;p.tickets=3;p.starTickets=2;
 a.startRun(f,player,course,'round6-pinned-'+school,117,false,'2026-11-07');const first=map.get(p.run.questions[0]);a.answerRun(f,player,p.run.id,0,first.answer,'2026-11-07');a.nextQuestion(f,player,p.run.id,0);
 const storedFamily=JSON.parse(JSON.stringify(f)),expectedRuntime=structuredClone(a.validateFamily(structuredClone(storedFamily))),runQuestionHashes=Object.fromEntries(p.run.questions.map(id=>[id,h(map.get(id))]));
 for(const[k,v]of Object.entries({storedFamily,expectedRuntime,runQuestionHashes})){if(JSON.stringify(v)!==JSON.stringify(old[k]))throw Error(player+'/'+school+' '+k+' reproduction mismatch');}
 results.push({player,school,course,storedHash:h(storedFamily),runtimeHash:h(expectedRuntime),questionHashesEqual:true});}
fs.writeFileSync('output/round6/fixture-reproduction.json',JSON.stringify({base:pinned.base,seed:117,day:'2026-11-07',cases:results,passed:true},null,2)+'\n');console.log('All4 raw compact storage, expanded runtime and question hashes exactly reproduced from Git c66');
