import {startRun,type Family} from '../../adventure';
import {startIsland} from '../../island/server';
import {PLAYERS} from '../../game-view';
import {skipCapture,answerCapture} from '../../capture-trial';
import {questionById} from '../../learning';
// Economy/curriculum tests explicitly decline the additional capture phase.
// Capture-specific tests exercise its gate, resume and first-answer semantics.
export function dismissPendingCaptures(f:Family){
 for(const {id} of PLAYERS)for(const source of ['voyage','island'] as const){
  const r=source==='voyage'?f.profiles[id].run:f.profiles[id].mathIsland?.run;
  if(r?.capture?.outcome==='pending')skipCapture(f,id,source,r.id);
 }
}
export function completePendingCaptures(f:Family,day:string){
 for(const {id} of PLAYERS)for(const source of ['voyage','island'] as const){
  const r=source==='voyage'?f.profiles[id].run:f.profiles[id].mathIsland?.run;
  if(r?.capture?.outcome==='pending')for(let i=r.capture.trial!.answers.length;i<3;i++)answerCapture(f,id,source,r.id,i,questionById(r.capture.trial!.questions[i])!.answer,day);
 }
}
export function startAfterDecliningCapture(...args:Parameters<typeof startRun>){dismissPendingCaptures(args[0]);return startRun(...args);}
export function islandAfterDecliningCapture(...args:Parameters<typeof startIsland>){dismissPendingCaptures(args[0]);return startIsland(...args);}
