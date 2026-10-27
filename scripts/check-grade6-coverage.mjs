import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCatalog} from './content-audit.mjs';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
export function coverageIssues(ledger,bank){
 const issues=[],records=ledger.records??[],sources=ledger.sources??[],byKey=new Map(),ids=new Set(bank.map(q=>q.id));
 const allowed=new Set(['included','duplicate','requires_image_asset','missing_image','missing_passage','open_ended','ambiguous','outdated','pending_verification']);
 for(const r of records){
  const key=`${r.source}:${r.locator}`;
  if(byKey.has(key))issues.push(`duplicate coverage locator ${key}`);byKey.set(key,r);
  if(!r.locator||!r.reason||!allowed.has(r.status))issues.push(`invalid record ${key}`);
  if(r.status==='included'&&!ids.has(r.questionId))issues.push(`unregistered question ${key}`);
  if(r.status==='duplicate'&&!r.duplicateOf)issues.push(`unresolved duplicate ${key}`);
 }
 for(const prefix of ['g6c','g6so','g6sc'])for(let i=1;i<=10;i++){
  const id=prefix+i,matching=sources.filter(s=>s.id===id),rows=records.filter(r=>r.source===id);
  if(matching.length!==1||!rows.length){issues.push(`missing source coverage ${id}`);continue;}
  if(matching[0].itemCount!==rows.length)issues.push(`source count mismatch ${id}`);
 }
 for(const r of records){
  const source=sources.find(s=>s.id===r.source);
  if(!source)issues.push(`unknown source ${r.source}`);
  else if(source.format==='pdf'&&(!Number.isInteger(r.page)||r.page<1||r.page>source.pageCount))issues.push(`invalid coverage page ${r.source}:${r.locator}`);
  if(r.status!=='duplicate')continue;
  const seen=new Set([`${r.source}:${r.locator}`]);let target=r.duplicateOf;
  while(target&&!ids.has(target)){
   if(seen.has(target)){issues.push(`duplicate cycle ${target}`);break;}
   seen.add(target);const next=byKey.get(target);
   if(!next){issues.push(`missing duplicate target ${target}`);break;}
   if(next.status!=='duplicate')break;target=next.duplicateOf;
  }
 }
 for(const q of bank)if(!q.retired&&!records.some(r=>r.status==='included'&&r.questionId===q.id))issues.push(`question without source disposition ${q.id}`);
 return [...new Set(issues)];
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const ledger=JSON.parse(readFileSync(resolve(root,'docs/content-review/grade6-coverage.json'),'utf8'));
 const {LEARNING_BANK}=await loadCatalog();const bank=LEARNING_BANK.filter(q=>/^g6(?:c|so|sc)-/.test(q.id));
 const issues=coverageIssues(ledger,bank);console.log(JSON.stringify({status:issues.length?'FAIL':'PASS',sources:ledger.sources.length,items:ledger.records.length,questions:bank.length,issues},null,2));if(issues.length)process.exitCode=1;
}
