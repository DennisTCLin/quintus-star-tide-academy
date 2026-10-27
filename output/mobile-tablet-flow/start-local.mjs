// Local-only synthetic QA. This entry point is not used by the production server.
import {createServer} from 'node:http';
import {SCHOOL_ROSTER} from '../../server/school-roster.mjs';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,startRun,questionById,validateFamily} from '../../build/game.mjs';
import {writeFileSync,mkdirSync,existsSync,readFileSync} from 'node:fs';
import {randomInt,randomUUID} from 'node:crypto';
const connectionString=process.env.TEST_DATABASE_URL;
if(connectionString!=='postgres://127.0.0.1:55432/mobile_tablet_flow_20261027')throw Error('Dedicated local QA database required');
const events=[],fixtures=[];
const api=await createCloudApi({connectionString,production:false,guideProvider:async()=>null,voiceProvider:{available:true,
 transcribe:async file=>{events.push({event:'transcribe',mime:file.mime,bytes:file.bytes.length});return '我喜歡海龜。';},
 reply:async input=>{events.push({event:'reply',historyLength:input.history.length});return {user:input.text,reply:input.history.length?'你剛剛說喜歡海龜。我記得喔！':'海龜好可愛，我記住了。',source:'ai'};},
 speech:async()=>({audio:readFileSync('outputs/tideglow-voice/synthetic-ai-reply.mp3').toString('base64'),mime:'audio/mpeg'})}});
if(existsSync('/tmp/star-tide-flow-private/accounts.json'))fixtures.push(...JSON.parse(readFileSync('/tmp/star-tide-flow-private/accounts.json')));
if(!fixtures.length)for(const engine of ['chromium','webkit'])for(const grade of [1,2,4,6])for(const state of ['ready','lose','new']){
 const username=`flow_${engine}_${grade}_${state}`,password=String(randomInt(1000,10000));
 const made=await provisionChildAccount(api.pool,{username,password,displayName:'合成流程驗收',grade});
 const family=newFamily(),p=family.profiles[made.playerId];p.learning.school=grade===6?'jianan':'yongchun';
 if(state!=='new')startRun(family,made.playerId,grade<=2?'medials':'chinese',randomUUID(),5,false,undefined,'relaxed');
 validateFamily(family);await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,family]);
 fixtures.push({username,password,grade,state,engine,player:made.playerId,accountId:made.accountId});
}
mkdirSync('/tmp/star-tide-flow-private',{recursive:true,mode:0o700});writeFileSync('/tmp/star-tide-flow-private/accounts.json',JSON.stringify(fixtures),{mode:0o600});
for(const f of fixtures)SCHOOL_ROSTER.push({username:f.username,playerId:f.player,grade:f.grade,school:f.grade===6?'jianan':'yongchun'});
const delegate=createAppServer({api}).listeners('request')[0];
const server=createServer(async(req,res)=>{
 if(req.url.startsWith('/qa-oracle?')){
  const f=fixtures.find(f=>f.username===new URL(req.url,'http://localhost').searchParams.get('username'));if(!f){res.writeHead(404);res.end();return;}
  const {rows}=await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[f.accountId]);const p=rows[0].family.profiles[f.player],r=p.run,q=r&&questionById(r.questions[r.index]);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({run:r,answer:q?.answer,options:q?.options.length}));return;
 }
 if(req.url==='/qa-evidence'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(events));return;}
 if(req.url==='/qa-audio.mp3'){res.setHeader('Content-Type','audio/mpeg');res.end(readFileSync('outputs/tideglow-voice/synthetic-child-sentence.mp3'));return;}
 if(req.url==='/qa-mic.js'){res.setHeader('Content-Type','text/javascript');res.end(readFileSync('output/mobile-tablet-flow/qa-mic.js'));return;}
 if(req.url==='/'&&req.method==='GET'){res.setHeader('Content-Type','text/html');res.end(readFileSync('dist/index.html','utf8').replace('</head>','<script src="/qa-mic.js"></script></head>'));return;}
 delegate(req,res);
});server.listen(4388,'127.0.0.1',()=>console.log('Isolated flow QA ready on 4388'));
process.on('SIGTERM',()=>server.close(()=>api.close().then(()=>process.exit(0))));
