// Synthetic input only: actual AudioContext/MediaStream/MediaRecorder encode paths remain active.
window.__qaMic={mode:'normal',active:0};
const syntheticGetUserMedia=async()=>{
 if(window.__qaMic.mode==='denied')throw new DOMException('QA denied','NotAllowedError');
 const ctx=new AudioContext();await ctx.resume();const buffer=await ctx.decodeAudioData(await(await fetch('/qa-audio.mp3')).arrayBuffer());const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;const destination=ctx.createMediaStreamDestination();source.connect(destination);source.start();window.__qaMic.active++;
 destination.stream.getTracks().forEach(track=>{const original=track.stop.bind(track);let stopped=false;track.stop=()=>{original();if(!stopped){stopped=true;source.stop();void ctx.close();window.__qaMic.active--;}};});return destination.stream;
};
Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:syntheticGetUserMedia}});
