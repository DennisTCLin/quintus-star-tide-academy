import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const folder=mkdtempSync(join(tmpdir(),'adaptive-compatible-hold-'));
try{
 writeFileSync(join(folder,'server.mjs'),readFileSync('server.mjs'));
 execFileSync('git',['apply','--unsafe-paths',process.cwd()+'/output/adaptive-learning-20261110/progression-final/recovery-hold.patch'],{cwd:folder});
 const {createAppServer}=await import(pathToFileURL(join(folder,'server.mjs')));
 let invoked=0;const s=createAppServer({api:()=>{invoked++;throw Error('must not enter DB service');}});
 await new Promise(r=>s.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${s.address().port}`;
 try{
  const cases=[];
  for(const path of ['/api/state','/api/command','/api/practice','/api/migrate','/api/login','/api/adult/game/command','/api/admin/command','/api%2Fcommand'])for(const method of ['GET','POST','PUT','DELETE']){
   const r=await fetch(base+path,{method});assert.equal(r.status,503);assert.equal(r.headers.get('retry-after'),'300');assert.match((await r.json()).error,/進度與獎勵/);cases.push({path,method,status:r.status});
  }
  const health=await fetch(base+'/health');assert.equal(health.status,200);assert.equal((await health.json()).ok,true);assert.equal(invoked,0);
  writeFileSync('output/adaptive-learning-20261110/progression-final/recovery-hold-results.json',JSON.stringify({allPassed:true,apiInvocations:invoked,health:200,cases},null,2)+'\n');
  console.log('Compatible hold patch: 32 API requests blocked; health 200; no API/DB service invoked.');
 }finally{await new Promise(r=>s.close(r));}
}finally{rmSync(folder,{recursive:true,force:true});}
