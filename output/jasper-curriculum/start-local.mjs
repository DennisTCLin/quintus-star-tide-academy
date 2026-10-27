// Synthetic isolated QA only. No production account or database is accessed.
import pg from 'pg';
import {randomInt} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,markMastered} from '../../build/game.mjs';
import {loadCatalog} from '../../scripts/content-audit.mjs';
const catalog=await loadCatalog(),name='jasper_browser_'+Date.now();
const control=new pg.Pool({connectionString:'postgres://127.0.0.1:55432/postgres'});await control.query('CREATE DATABASE '+name);
const api=await createCloudApi({connectionString:'postgres://127.0.0.1:55432/'+name,production:false});
const password=String(randomInt(1000,10000)),made=await provisionChildAccount(api.pool,{username:'jasper',password,displayName:'Synthetic Jasper QA',grade:1});
const f=newFamily();f.profiles.qingqing.coins=735;f.profiles.qingqing.tickets=5;
await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,f]);
mkdirSync('/tmp/star-tide-jasper-private',{recursive:true,mode:0o700});writeFileSync('/tmp/star-tide-jasper-private/browser.json',JSON.stringify({username:'jasper',password,database:name,answers:Object.fromEntries(catalog.LEARNING_BANK.filter(q=>q.grade===1).map(q=>[q.id,q.answer]))}),{mode:0o600});
const server=createAppServer({api:(req,res)=>{if(req.url?.startsWith('/api/dragon/')){res.writeHead(503,{'Content-Type':'application/json'});res.end('{}');return;}return api(req,res);}});
await new Promise(r=>server.listen(4385,'127.0.0.1',r));console.log('Synthetic Jasper QA ready on4385');
const cleanup=()=>server.close(async()=>{await api.close();await control.query('DROP DATABASE '+name+' WITH (FORCE)');await control.end();process.exit(0);});process.on('SIGTERM',cleanup);process.on('SIGINT',cleanup);
