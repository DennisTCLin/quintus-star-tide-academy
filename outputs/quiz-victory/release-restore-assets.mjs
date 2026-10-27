import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
const items=JSON.parse(await readFile('preserved-assets.json','utf8'));
let next=0,done=0;
async function worker(){while(next<items.length){const item=items[next++];let bytes;
for(let attempt=0;attempt<3;attempt++){try{const response=await fetch('https://quintus-star-tide-academy-production.up.railway.app/'+item.path,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error('HTTP '+response.status+' '+item.path);bytes=Buffer.from(await response.arrayBuffer());if(bytes.length!==item.bytes||createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('Asset mismatch '+item.path);break;}catch(error){if(attempt===2)throw error;await new Promise(r=>setTimeout(r,1000));}}
const target=join('dist',item.path);await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);done++;}}
await Promise.all(Array.from({length:8},worker));console.log('Verified and restored '+done+' existing assets');
