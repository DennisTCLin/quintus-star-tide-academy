// Local synthetic fixtures only; never included in the production server.
import {createServer} from 'node:http';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
const connectionString=process.env.TEST_DATABASE_URL || 'postgresql://127.0.0.1:55432/star_tide_voice_ui_20261025';
const port=Number(process.env.QA_PORT || 4292), accessFile=process.env.QA_ACCESS_FILE || '/tmp/tideglow-voice-qa-access.json';
if(!/^postgres(?:ql)?:\/\/(?:[^@]+@)?(?:127\.0\.0\.1|localhost)(?::\d+)?\//.test(connectionString)) throw new Error('QA requires a local synthetic database');
const events=[];let transcript=0;
const api=await createCloudApi({connectionString,production:false,guideProvider:async()=>null,voiceProvider:{available:true,transcribe:async file=>{events.push({event:'transcribe',mime:file.mime,bytes:file.bytes.length});writeFileSync('outputs/voice-battle-release/synthetic-browser-capture.bin',file.bytes);return ++transcript%2?'我喜歡海龜，因為牠會游泳。':'我剛剛說喜歡什麼動物？';},reply:async input=>{await new Promise(r=>setTimeout(r,500));return {user:input.text,reply:input.history.length?'你剛剛說喜歡海龜，因為牠會游泳。你想一起看看大海嗎？':'海龜游泳好可愛！你喜歡牠的殼，還是牠游泳的樣子？',source:'ai'};},speech:async()=>{events.push({event:'speech'});return {audio:readFileSync('outputs/tideglow-voice/synthetic-ai-reply.mp3').toString('base64'),mime:'audio/mpeg'};}}});
const delegate=createAppServer({api}).listeners('request')[0];let cookie;
const server=createServer((req,res)=>{
 if(req.url.startsWith('/assets/tideglow-voice/')) events.push({event:'fixed-audio',path:req.url});

 if(req.url==='/qa-login'){res.writeHead(302,{'Set-Cookie':cookie,Location:'/'});res.end();return;}
 if(req.url==='/qa-audio.mp3'){res.writeHead(200,{'Content-Type':'audio/mpeg'});res.end(readFileSync('outputs/tideglow-voice/synthetic-child-sentence.mp3'));return;}
 if(req.url==='/qa-evidence'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(events));return;}
 if(req.url==='/qa-mic.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(readFileSync('outputs/tideglow-voice/qa-mic.js'));return;}
 if(req.url==='/'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html'});res.end(readFileSync('dist/index.html','utf8').replace('</head>','<script src="/qa-mic.js"></script></head>'));return;}
 delegate(req,res);
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));const url='http://localhost:'+port;
const call=async(path,body,csrf)=>{const r=await fetch(url+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:url,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(JSON.stringify(data));cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;return data;};
const username='voiceqa_'+randomUUID().slice(0,8),password=randomUUID();let state=await call('register',{username,password});
for(const player of ['doudou','feifei']){state=await call('command',{id:randomUUID(),revision:state.family.revision,command:{type:'starter-draw',player}},state.csrf);state=await call('command',{id:randomUUID(),revision:state.family.revision,command:{type:'starter-confirm',player}},state.csrf);}
writeFileSync(accessFile,JSON.stringify({url: url+'/qa-login',username,password,cookie,csrf:state.csrf}),{mode:0o600});
console.log('Synthetic QA ready at '+url+'/qa-login');
process.on('SIGTERM',()=>{server.close();void api.close();process.exit(0);});
