// Run with a clean detached base checkout at /tmp/finals131-base-3437 and freshly built server bundle.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
if(execFileSync('git',['-C','/tmp/finals131-base-3437','rev-parse','HEAD'],{encoding:'utf8'}).trim()!=='3437ad63e8bfb8e0b689440176d94a0ea223be8c')throw Error('Wrong legacy base');
execFileSync('git',['-C','/tmp/finals131-base-3437','diff','--exit-code','--','src','server']);
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import * as g from '/tmp/finals131-base-3437/build/game.mjs';
const {loadCatalog}=await import('/tmp/finals131-base-3437/scripts/content-audit.mjs');
const {LEARNING_BANK}=await loadCatalog();
const bundle=await build({entryPoints:['/tmp/finals131-base-3437/src/__tests__/helpers/child-curricula.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {EXPECTED_CHILD_CURRICULA:cases}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const snapshots={};
for(const [username,player,grade,school] of cases){
 const family=g.newFamily(),p=family.profiles[player];p.coins=735;p.tickets=5;p.starTickets=4;p.rewardStars=1;p.rewardRounds=6;
 const old=LEARNING_BANK.find(q=>!q.retired&&q.grade===grade&&!q.examSources&&q.course!=='math')??LEARNING_BANK.find(q=>!q.retired&&q.grade===grade);
 g.markMastered(p.learning,old.id);p.learning.school=school;
 g.startRun(family,player,'math','base3437-existing-'+username,41,false,'2026-11-07');
 const run=p.run;g.answerRun(family,player,run.id,0,g.questionById(run.questions[0]).answer,'2026-11-07');g.nextQuestion(family,player,run.id,0);delete p.learning.school;
 snapshots[username]={player,grade,school,runtime:structuredClone(family),stored:JSON.parse(JSON.stringify(family)),questionHashes:Object.fromEntries(run.questions.map(id=>[id,createHash('sha256').update(JSON.stringify(g.questionById(id))).digest('hex')]))};
}
const output={sourceCommit:'3437ad63e8bfb8e0b689440176d94a0ea223be8c',sourceTree:'f64aee5e6b8e806dc43f6375e7d90875c9d24742',synthetic:true,snapshots};
fs.writeFileSync('docs/content-review/finals131-20261107/fixtures/base3437-cloud-families.json',JSON.stringify(output,null,2)+'\n');
console.log({snapshots:Object.keys(snapshots).length,oldIds:new Set(Object.values(snapshots).flatMap(s=>Object.keys(s.questionHashes))).size});
