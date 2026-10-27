// Test-only replacement of the microphone source. Real MediaRecorder and codec remain in use.
let mode='normal',active=0;
const update=()=>{const e=document.querySelector('#qa-mic-state');if(e)e.textContent=`QA synthetic mic · ${mode} · active tracks ${active}`;};
document.addEventListener('DOMContentLoaded',()=>{const bar=document.createElement('aside');bar.style='position:fixed;top:0;left:0;z-index:99999;background:#fff;color:#000;font:11px sans-serif;padding:3px;';bar.innerHTML='<span id="qa-mic-state"></span> <button id="qa-normal">Synthetic mic</button> <button id="qa-denied">Deny mic</button>';document.body.append(bar);bar.querySelector('#qa-normal').onclick=()=>{mode='normal';update();};bar.querySelector('#qa-denied').onclick=()=>{mode='denied';update();};update();});
const syntheticGetUserMedia=async()=>{
 if(mode==='denied')throw new DOMException('QA denied','NotAllowedError');
 const ctx=new AudioContext();await ctx.resume();const bytes=await(await fetch('/qa-audio.mp3')).arrayBuffer();const buffer=await ctx.decodeAudioData(bytes);const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;const destination=ctx.createMediaStreamDestination();source.connect(destination);source.start();active++;update();
 destination.stream.getTracks().forEach(track=>{const original=track.stop.bind(track);let stopped=false;track.stop=()=>{original();if(!stopped){stopped=true;source.stop();void ctx.close();active--;update();}};});return destination.stream;
};

Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:syntheticGetUserMedia}});
