import { createDragonProvider } from '../../server/dragon-provider.mjs';
import { writeFileSync } from 'node:fs';
const provider = createDragonProvider();
const cases=[];
for (const choice of ['pet','feed','play']) {
  const reply=await provider({phase:'harbor',preference:'sea',history:[{choice:'sea',reply:'ready',line:'我記得你喜歡大海。'}],choice,companion:{element:'水',rarity:'E'}});
  cases.push({choice,status:reply?'PASS':'FALLBACK',reply});
}
const result={keyConfigured:!!process.env.OPENAI_API_KEY,anonymous:true,noDatabaseAccess:true,cases};
writeFileSync('outputs/tideglow-companion/live-ai-check.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
if(cases.some(x=>x.status!=='PASS')) process.exitCode=1;
