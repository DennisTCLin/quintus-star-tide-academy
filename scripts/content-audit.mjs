import {createHash} from 'node:crypto';
import {readFileSync, existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, relative, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {build} from 'esbuild';

export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=value=>createHash('sha256').update(value).digest('hex');
export const digest=value=>sha(JSON.stringify(value));
const mediaFields=['audio','image'];
export function mediaPaths(q){return [...new Set([q,...q.options,...(q.target?[q.target]:[])].flatMap(o=>mediaFields.map(k=>o[k]).filter(Boolean)))].sort();}
export function structuralIssues(q){
 const errors=[];
 if(!q.id||!q.prompt?.trim()||!q.hint?.trim()||!q.explanation?.trim())errors.push('missing-text');
 if(![1,2,4,5,6].includes(q.grade)||!['math','chinese','english','science','social','words','tones','pairs','medials'].includes(q.course))errors.push('invalid-routing');
 if(!Array.isArray(q.options)||q.options.length<2||q.options.length>8||q.options.some(o=>!o.text?.trim()))errors.push('invalid-options');
 if(!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length)errors.push('invalid-answer-index');
 if(new Set(q.options.map(o=>o.text.normalize('NFKC').trim())).size!==q.options.length)errors.push('duplicate-options');
 if(/[\uFFFD]|\bEMBED\b/.test(JSON.stringify(q)))errors.push('extraction-artifact');
 if(/如下圖|如右圖|如左圖|看下圖|根據圖片/.test(q.prompt)&&!q.visual&&!q.image&&!q.options.some(o=>o.image))errors.push('missing-visual-context');
 if(q.image&&!q.imageAlt?.trim())errors.push('missing-image-alt');
 if(/聽聲音|聽音檔/.test(q.prompt)&&!q.audio&&!q.speechText)errors.push('missing-audio-context');
 return errors;
}
// Independent oracle reads the rendered prompt, never the generator parameters or key.
export function solveGenerated(q){
 const p=q.prompt;let m;
 if((m=p.match(/^(\d+) ([+−×÷]) (\d+) = \?$/))){const a=+m[1],b=+m[3];return String(m[2]==='+'?a+b:m[2]==='−'?a-b:m[2]==='×'?a*b:a/b);}
 if((m=p.match(/^(\d+)\/(\d+) \+ (\d+)\/(\d+) = \?$/))){if(m[2]!==m[4])throw Error('unhandled denominator');return `${+m[1]+ +m[3]}/${m[2]}`;}
 if((m=p.match(/^長方形長 (\d+) 公分、寬 (\d+) 公分，它的(面積|周長)/)))return String(m[3]==='面積'?+m[1]*+m[2]:2*(+m[1]+ +m[2]));
 if((m=p.match(/^Mia has (\d+) red shells? and (\d+) blue shells?\. (.+)$/)))return String(m[3].includes('in total')?+m[1]+ +m[2]:m[3].includes('red')?+m[1]:+m[2]);
 if((m=p.match(/甲 (\d+) 毫升、乙 (\d+) 毫升、丙 (\d+) 毫升。.*吸水(最多|最少)/))){const ns=m.slice(1,4).map(Number),best=m[4]==='最多'?Math.max(...ns):Math.min(...ns);return `紙巾${['甲','乙','丙'][ns.indexOf(best)]}`;}
 if((m=p.match(/圖上 1 公分代表實際 (\d+) 公尺。.*相距 (\d+) 公分/)))return String(+m[1]*+m[2]);
 if(q.skill==='reading'){
  const stations=['燈塔','漁港','圖書館','學校','公園','碼頭'];
  const route=p.slice(0,p.indexOf('。')).match(new RegExp(stations.join('|'),'g'));
  if(!route||route.length!==4)throw Error('reading route missing');
  const ask=p.slice(p.indexOf('。')+1);
  if(ask.includes('離開第一站後'))return route[1];
  if(ask.includes('倒數第二站'))return route[2];
  if(ask.includes('第一站'))return route[0];if(ask.includes('最後一站'))return route[3];
 }
 throw Error('unsupported generated prompt');
}
export function reviewIssues(record,hash){
 if(!record)return ['not-reviewed'];
 if(record.status!=='approved')return [record.status==='quarantined'?'quarantined':'not-approved'];
 if(record.hash!==hash)return ['stale-review'];
 if(!record.reviewer||!record.evidence)return ['missing-review-evidence'];
 return [];
}
export async function loadCatalog(){
 const result=await build({entryPoints:[resolve(ROOT,'scripts/content-catalog.ts')],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
 return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
export async function audit({inventory=false,exportDir,manifestPath=resolve(ROOT,'docs/content-review/approvals.json'),reportPath=resolve(ROOT,'output/content-audit/report.json')}={}){
 const start=performance.now(),c=await loadCatalog(),staticRows=[...c.LEARNING_BANK,...c.ENGLISH_REPHRASES];
 const manifest=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')):{};
 const findings=[],counts={static:staticRows.length,generated:0,pools:c.GENERATED_POOLS.length,approvedStatic:0,approvedTemplates:0},hashes={},assetCache=new Map(),seen=new Set();
 const error=(id,reason)=>findings.push({id,reason});
 function assetHash(path){
  if(assetCache.has(path))return assetCache.get(path);
  if(typeof path!=='string'||!path.startsWith('/')||path.includes('..')||path.includes('://')){error(path,'unsupported-media-path');return null;}
  const file=resolve(ROOT,'public',path.slice(1));
  if(!existsSync(file)){error(path,'missing-media');return null;}
  const hash=sha(readFileSync(file));assetCache.set(path,hash);return hash;
 }
 const policyHash=digest(['scripts/content-audit.mjs','scripts/content-catalog.ts'].map(p=>[p,sha(readFileSync(resolve(ROOT,p)))]));
 const generatorHash=digest(['src/question-generator.ts','src/scenario-generator.ts','src/english-rephrases.ts'].map(p=>[p,sha(readFileSync(resolve(ROOT,p)))]));
 const check=(q)=>{
  if(seen.has(q.id))error(q.id,'duplicate-id');seen.add(q.id);
  structuralIssues(q).forEach(reason=>error(q.id,reason));
  for(const path of mediaPaths(q))assetHash(path);
  for(const source of q.examSources??[]){
   const metadata=c.EXAM_SOURCES[source.id];
   if(!metadata||metadata.status!=='active'||metadata.publisher!==q.publisher||!(source.page===null&&/\.docx?$/.test(metadata.file))&&(!Number.isInteger(source.page)||source.page<1)||!source.locator)error(q.id,'invalid-source');
  }
 };
 function checkApproval(id,hash,records){
  if(inventory)return;
  const record=records?.[id];const problems=reviewIssues(record,hash);
  if(record?.evidence){const evidence=resolve(ROOT,record.evidence);if(relative(resolve(ROOT,'docs/content-review'),evidence).startsWith('..')||!existsSync(evidence))problems.push('missing-evidence-file');}
  problems.forEach(reason=>error(id,reason));return !problems.length;
 }
 if(!inventory&&manifest.policyHash!==policyHash)error('policy','stale-review-policy');
 for(const q of staticRows){
  check(q);
  const assets=mediaPaths(q).map(p=>[p,assetHash(p)]),sources=(q.examSources??[]).map(s=>c.EXAM_SOURCES[s.id]);
  const hash=digest({question:q,assets,sources});hashes[q.id]=hash;
  if(checkApproval(q.id,hash,manifest.questions))counts.approvedStatic++;
 }
 if(!inventory)for(const id of Object.keys(manifest.questions??{}))if(!hashes[id])error(id,'removed-reviewed-question');
 const templates={};
 for(const pool of c.GENERATED_POOLS){
  const variantHashes=[];
  for(let i=0;i<pool.params.length;i++){
   const id=c.generatedId(pool,i),q=c.generatedQuestion(id);counts.generated++;
   if(!q){error(id,'missing-generated-question');continue;}
   check(q);variantHashes.push(digest({question:q,assets:mediaPaths(q).map(p=>[p,assetHash(p)]),sources:(q.examSources??[]).map(s=>c.EXAM_SOURCES[s.id])}));
   try{const answer=solveGenerated(q);if(q.options.filter(o=>o.text===answer).length!==1||q.options[q.answer]?.text!==answer)error(id,'oracle-answer-mismatch');}
   catch{error(id,'oracle-unsupported');}
  }
  const hash=digest({generatorHash,pool,variantHashes});templates[pool.key]=hash;
  if(checkApproval(pool.key,hash,manifest.templates))counts.approvedTemplates++;
 }
 if(!inventory)for(const key of Object.keys(manifest.templates??{}))if(!templates[key])error(key,'removed-reviewed-template');
 if(exportDir){
  mkdirSync(exportDir,{recursive:true});
  writeFileSync(resolve(exportDir,'inventory.json'),JSON.stringify({policyHash,questions:hashes,templates},null,2)+'\n');
  // Blind packet: answer, hint, explanation and target are withheld for independent solving.
  for(let start=0;start<staticRows.length;start+=60)writeFileSync(resolve(exportDir,`blind-${String(start/60).padStart(3,'0')}.jsonl`),staticRows.slice(start,start+60).map(q=>JSON.stringify({id:q.id,grade:q.grade,course:q.course,prompt:q.prompt,options:q.options,visual:q.visual,image:q.image,imageAlt:q.imageAlt,audio:q.audio})).join('\n')+'\n');
 }
 const report={version:1,status:findings.length?'FAIL':inventory?'INVENTORY_ONLY':'PASS',counts,mediaFiles:assetCache.size,findings,coverage:{static:`${counts.approvedStatic}/${counts.static} hash-matched approvals; media bytes/existence checked, audio listening not certified`,generated:`${counts.approvedTemplates}/${counts.pools} hash-matched template approvals; all ${counts.generated} variants checked structurally and by prompt-based oracle, not individually AI-reviewed`},durationMs:Math.round(performance.now()-start),peakRssMB:Math.round(process.resourceUsage().maxRSS/1024)};
 mkdirSync(dirname(reportPath),{recursive:true});writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
 return {report,inventory:{policyHash,questions:hashes,templates}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),at=args.indexOf('--export');
 const {report}=await audit({inventory:args.includes('--inventory'),exportDir:at>=0?resolve(args[at+1]):undefined});
 console.log(JSON.stringify({status:report.status,...report.counts,findings:report.findings.length,durationMs:report.durationMs,report:'output/content-audit/report.json'}));
 if(report.status==='FAIL')process.exitCode=1;
}
