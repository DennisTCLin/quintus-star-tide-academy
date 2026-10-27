// Synthetic isolated QA only. No production account or database is accessed.
import pg from 'pg';
import {randomInt} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,markMastered} from '../../build/game.mjs';
import {loadCatalog} from '../../scripts/content-audit.mjs';
const catalog=await loadCatalog(),name='jay_new_browser_'+Date.now();
const control=new pg.Pool({connectionString:'postgres://127.0.0.1:55432/postgres'});await control.query('CREATE DATABASE '+name);
const api=await createCloudApi({connectionString:'postgres://127.0.0.1:55432/'+name,production:false});
const password=String(randomInt(1000,10000)),made=await provisionChildAccount(api.pool,{username:'jay',password,displayName:'Synthetic Grade5 New QA',grade:5});
const f=newFamily(),newRows=JSON.parse(readFileSync('src/grade5-new-exams.ts','utf8').split('= ')[1].trim().replace(/;$/,'')),remaining=new Set(newRows.map(q=>q.id));
// Keep twelve long new questions per course so both engines can start six-question voyages.
for(const course of ['math','social','english']){
 const targets=newRows.filter(q=>q.course===course).sort((a,b)=>b.prompt.length-a.prompt.length).slice(0,12);
 for(const q of catalog.LEARNING_BANK.filter(q=>q.grade===5&&q.course===course&&!targets.some(t=>t.id===q.id)))markMastered(f.profiles.jay.learning,q.id);
}
await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,f]);
mkdirSync('/tmp/star-tide-jay-new-private',{recursive:true,mode:0o700});writeFileSync('/tmp/star-tide-jay-new-private/browser.json',JSON.stringify({username:'jay',password,database:name,remainingIds:[...remaining],answers:Object.fromEntries(catalog.LEARNING_BANK.filter(q=>q.grade===5).map(q=>[q.id,q.answer]))}),{mode:0o600});
const server=createAppServer({api:(req,res)=>{if(req.url?.startsWith('/api/dragon/')){res.writeHead(503,{'Content-Type':'application/json'});res.end('{}');return;}return api(req,res);}});
await new Promise(r=>server.listen(4384,'127.0.0.1',r));console.log('Synthetic Jay new QA ready on4384');
const cleanup=()=>server.close(async()=>{await api.close();await control.query('DROP DATABASE '+name+' WITH (FORCE)');await control.end();process.exit(0);});process.on('SIGTERM',cleanup);process.on('SIGINT',cleanup);
