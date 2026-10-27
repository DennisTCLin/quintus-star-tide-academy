import {createCompanionVoiceProvider} from '../../server/companion-voice-provider.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const bytes=readFileSync('outputs/tideglow-voice/synthetic-browser-capture.m4a');
const started=Date.now();
const transcript=await createCompanionVoiceProvider().transcribe({bytes,mime:'audio/mp4',extension:'m4a'});
const result={syntheticOnly:true,noDatabaseAccess:true,browser:'macOS Safari native MediaRecorder, synthetic MediaStream',mime:'audio/mp4',bytes:bytes.length,elapsedMs:Date.now()-started,transcript,passed:transcript.includes('海龜')};
writeFileSync('outputs/tideglow-voice/safari-transcript.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;
