import fs from'node:fs';import{build}from'esbuild';import{createHash}from'node:crypto';
await build({entryPoints:['src/readability.tsx'],bundle:true,platform:'node',format:'esm',outfile:'output/next100-contextfix/candidate-reading.mjs',loader:{'.svg':'text','.css':'empty'},logLevel:'silent'});
const old=await import('../next100/base-reading.mjs'),now=await import('./candidate-reading.mjs'),base=await import('../next100/base-learning.mjs'),d=JSON.parse(fs.readFileSync('src/data/interface-zhuyin.json')),b=JSON.parse(fs.readFileSync('output/next100/base-dictionary.json')),delta=[];
for(const key of ['phrases','chars'])for(const [word,z]of Object.entries(b[key]))if(JSON.stringify(d[key][word])!==JSON.stringify(z))throw Error('Old dictionary changed: '+word);
for(const q of [...base.LEARNING_BANK,...base.ENGLISH_REPHRASES]){
 for(const [field,text]of [['prompt',q.prompt],['hint',q.hint],['explanation',q.explanation],...q.options.map((o,i)=>['options.'+i+'.text',o.text])]){
  if(!text||!/[\u3400-\u9fff]/.test(text))continue;
  const before=old.syllables(text),after=now.syllables(text);if(JSON.stringify(before)!==JSON.stringify(after))delta.push({id:q.id,field,text,before,after});
 }
}
const report={base:'65d3a309bf012f6f54bd21d9b81387d45bf1c992',oldDictionaryEntriesChanged:0,oldDictionaryEntriesRemoved:0,oldQuestionFieldsImpacted:delta.length,oldQuestionsImpacted:new Set(delta.map(x=>x.id)).size,fields:delta};fs.writeFileSync('output/next100-contextfix/existing-reading-delta.json',JSON.stringify(report,null,2)+'\n');console.log({...report,fields:undefined});

const nested=[];function walk(value,path='',rows=[]){if(typeof value==='string')rows.push([path,value]);else if(value&&typeof value==='object')for(const[k,v]of Object.entries(value))walk(v,path?path+'.'+k:k,rows);return rows;}
for(const q of [...base.LEARNING_BANK,...base.ENGLISH_REPHRASES])for(const[field,text]of walk(q)){if(!/[\u3400-\u9fff]/.test(text))continue;const before=old.syllables(text),after=now.syllables(text);if(JSON.stringify(before)!==JSON.stringify(after))nested.push({id:q.id,field,text,before,after});}
for(const row of nested)for(let i=0;i<row.before.length;i++)if(JSON.stringify(row.before[i])!==JSON.stringify(row.after[i])&&(row.before[i].zy||!row.after[i].zy))throw Error('Changed nonempty reading '+row.id+':'+row.field);
fs.writeFileSync('output/next100-contextfix/existing-all-nested-reading-delta.json',JSON.stringify({base:report.base,coreQuestionFields:delta.length,allNestedStringFields:nested.length,scope:'all nested string properties including provenance locators; does not imply all properties are actually rendered',nonemptyReadingsReplaced:0,fields:nested},null,2)+'\n');console.log({coreFields:delta.length,allNested:nested.length});
const {loadCatalog}=await import('../../scripts/content-audit.mjs');const catalog=await loadCatalog(),ids=new Set(JSON.parse(fs.readFileSync('src/data/finals-next100-20261107.json')).map(q=>q.id));const rows=[];for(const q of catalog.LEARNING_BANK.filter(q=>ids.has(q.id))){
 const fields=[['prompt',q.prompt],['hint',q.hint],['explanation',q.explanation],...q.options.map((x,i)=>['options.'+i+'.text',x.text]),...(q.examSources??[]).flatMap((x,i)=>[['examSources.'+i+'.locator',x.locator],['examSources.'+i+'.kind',x.kind]])];
 for(const[field,text]of fields){if(typeof text!=='string')continue;const rendered=now.syllables(text);rows.push({id:q.id,field,text,syllables:rendered,missingChinese:rendered.filter(x=>/[\u3400-\u9fff]/.test(x.text)&&!x.zy).map(x=>x.text),status:q.id==='phase4-lang-g2-fa'&&field==='options.1.text'?'LEGACY_SINGLE_CHAR_FALLBACK_NOT_RENDERED_OR_USED_BY_DICTIONARY_AUDIO':'REVIEWED_FULL_CONTEXT'});}
}
if(rows.some(r=>r.missingChinese.length))throw Error('Missing Chinese reading');fs.writeFileSync('output/next100-contextfix/full-field-reading-scan.json',JSON.stringify({questions:ids.size,fields:rows.length,missingChinese:0,scope:'actual syllables for prompt/hint/explanation/options/locator/kind;not an acoustic listening certificate; legacy hidden bare髮 exception explicit',rows},null,2)+'\n');console.log('new full fields',rows.length);
