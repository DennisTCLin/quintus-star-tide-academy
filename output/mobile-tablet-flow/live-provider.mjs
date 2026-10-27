// Synthetic phrases only. No database connection or real child conversation.
import {createCompanionVoiceProvider} from '../../server/companion-voice-provider.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const out='output/mobile-tablet-flow/live-provider.json';
try{
 const provider=createCompanionVoiceProvider();if(!provider.available)throw Error('unavailable');
 const started=Date.now(),bytes=readFileSync('outputs/tideglow-voice/synthetic-child-sentence.mp3');
 const transcript=await provider.transcribe({bytes,mime:'audio/mpeg',extension:'mp3'});
 const first=await provider.reply({text:transcript,history:[],context:{grade:1,preference:'sea'}});
 const second=await provider.reply({text:'我剛剛說喜歡什麼動物？',history:[first],context:{grade:1,preference:'sea'}});
 const spoken=await provider.speech(second.reply),audio=Buffer.from(spoken.audio,'base64');writeFileSync('output/mobile-tablet-flow/live-reply.mp3',audio);
 const result={syntheticOnly:true,noDatabaseAccess:true,transcript,first,second,contextRetained:second.reply.includes('海龜'),speechBytes:audio.length,mime:spoken.mime,elapsedMs:Date.now()-started};writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(!result.contextRetained||audio.length<1000)process.exitCode=1;
}catch{writeFileSync(out,JSON.stringify({status:'FAIL',syntheticOnly:true,noDatabaseAccess:true}));console.log('FAIL live provider check; no credentials logged');process.exitCode=1;}
