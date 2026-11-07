import fs from'node:fs';import{build}from'esbuild';import{createHash}from'node:crypto';
await build({entryPoints:['src/readability.tsx'],bundle:true,platform:'node',format:'esm',outfile:'output/next100/candidate-reading.mjs',loader:{'.svg':'text','.css':'empty'},logLevel:'silent'});
const old=await import('./base-reading.mjs'),now=await import('./candidate-reading.mjs'),base=await import('./base-learning.mjs'),d=JSON.parse(fs.readFileSync('src/data/interface-zhuyin.json')),b=JSON.parse(fs.readFileSync('output/next100/base-dictionary.json')),delta=[];
for(const key of ['phrases','chars'])for(const [word,z]of Object.entries(b[key]))if(JSON.stringify(d[key][word])!==JSON.stringify(z))throw Error('Old dictionary changed: '+word);
for(const q of [...base.LEARNING_BANK,...base.ENGLISH_REPHRASES]){
 for(const [field,text]of [['prompt',q.prompt],['hint',q.hint],['explanation',q.explanation],...q.options.map((o,i)=>['options.'+i+'.text',o.text])]){
  if(!text||!/[\u3400-\u9fff]/.test(text))continue;
  const before=old.syllables(text),after=now.syllables(text);if(JSON.stringify(before)!==JSON.stringify(after))delta.push({id:q.id,field,text,before,after});
 }
}
const report={base:'65d3a309bf012f6f54bd21d9b81387d45bf1c992',oldDictionaryEntriesChanged:0,oldDictionaryEntriesRemoved:0,oldQuestionFieldsImpacted:delta.length,oldQuestionsImpacted:new Set(delta.map(x=>x.id)).size,fields:delta};fs.writeFileSync('output/next100/existing-reading-delta.json',JSON.stringify(report,null,2)+'\n');console.log({...report,fields:undefined});
