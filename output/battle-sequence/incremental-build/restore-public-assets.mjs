import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const files=JSON.parse(readFileSync('asset-restore.json','utf8'));
const origin='https://quintus-star-tide-academy-production.up.railway.app';
let index=0,done=0;
async function worker(){while(index<files.length){const file=files[index++];const target=resolve('public',file.path);if(!target.startsWith(resolve('public')+'/'))throw Error('Invalid asset path');let failure;
 for(let attempt=0;attempt<4;attempt++){try{const response=await fetch(origin+'/'+file.path.split('/').map(encodeURIComponent).join('/'),{signal:AbortSignal.timeout(30000),headers:{'Cache-Control':'no-cache'}});if(!response.ok)throw Error('HTTP '+response.status);const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Content hash mismatch');mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);failure=null;break;}catch(error){failure=error;await new Promise(r=>setTimeout(r,1000*(attempt+1)));}}
 if(failure)throw Error(file.path+': '+failure.message);done++;if(done%100===0)console.log('Verified existing public assets '+done+'/'+files.length);
}}
await Promise.all(Array.from({length:12},worker));console.log('All '+done+' existing public assets restored byte-for-byte.');
