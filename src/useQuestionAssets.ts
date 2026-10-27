import { useEffect, useState } from 'react';
export type QuestionAssets = {runId:string;index:number;images:string[]};
/** Preparation only: never start the server clock while required figures are unavailable. */
export function useQuestionAssets(assets:QuestionAssets|undefined,runId:string,index:number) {
 const valid=assets?.runId===runId&&assets.index===index;
 const key=JSON.stringify([runId,index,valid?assets.images:null]);
 const [result,setResult]=useState({key:'',status:'loading' as 'loading'|'ready'|'error'});
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let cancelled=false;
  const images:HTMLImageElement[]=[];
  setResult({key,status:'loading'});
  if(!valid)return;
  const timer=setTimeout(()=>{if(!cancelled)setResult({key,status:'error'});},15000);
  Promise.all(assets.images.map(src=>new Promise<void>((resolve,reject)=>{
   const image=new Image();images.push(image);
   image.onload=()=>resolve();image.onerror=()=>reject(new Error('Image unavailable'));
   // Keep the canonical URL warm for the actual question and CSS sprite.
   image.src=src;
  }))).then(()=>{clearTimeout(timer);if(!cancelled)setResult({key,status:'ready'});},()=>{clearTimeout(timer);if(!cancelled)setResult({key,status:'error'});});
  return()=>{cancelled=true;clearTimeout(timer);images.forEach(image=>{image.onload=null;image.onerror=null;});};
 },[key,attempt]);
 return {status:result.key===key?result.status:'loading',retry:()=>setAttempt(n=>n+1)};
}
