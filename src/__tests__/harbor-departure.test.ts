import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {newFamily,startRun,answerRun,nextQuestion} from '../adventure';
import {questionById} from '../learning';
import {startIsland,answerIsland,finishIsland} from '../island/server';
import {answerCapture,skipCapture} from '../capture-trial';
import {harborDeparture} from '../harbor-departure';
const day='2026-10-26';
function voyage(won=false){
 const f=newFamily(),id='doudou' as const,p=f.profiles[id];startRun(f,id,'math',randomUUID(),2,false,day);
 if(won)for(let i=0;i<6;i++){answerRun(f,id,p.run!.id,i,questionById(p.run!.questions[i])!.answer,day,0);if(i<5)nextQuestion(f,id,p.run!.id,i);}
 return {f,p,id};
}
function island(completed=false){
 const f=newFamily(),id='doudou' as const,p=f.profiles[id];p.mathIsland={units:{'1A-01':{learn:true}},pool:[],stats:{},day:'',attempted:[]};
 const run=startIsland(f,id,'play','1A-01',randomUUID(),day,1);
 if(completed){for(let i=0;i<run.items.length;i++)answerIsland(f,id,run.id,i,run.items[i].answer,day);finishIsland(f,id,run.id,day,0);}
 return {f,p,id};
}
describe('single harbor departure destination',()=>{
 it('resumes a pending voyage capture ahead of an unfinished math island without mutating either',()=>{
  const {p}=voyage(true);p.mathIsland=island().p.mathIsland;const before=structuredClone(p);
  expect(harborDeparture(p)).toMatchObject({kind:'capture',source:'voyage',runId:p.run!.id,action:'繼續降服挑戰'});expect(p).toEqual(before);
 });
 it('resumes completed-island capture rather than treating it as a finished island',()=>{
  const {p}=island(true);expect(harborDeparture(p)).toMatchObject({kind:'capture',source:'island',runId:p.mathIsland!.run!.id});
 });
 it('uses the existing voyage-first source order when both captures remain pending',()=>{
  const {p}=voyage(true);p.mathIsland=island(true).p.mathIsland;expect(harborDeparture(p)).toMatchObject({kind:'capture',source:'voyage'});
 });
 it('keeps unfinished math ahead of a legacy pending voyage reward',()=>{
  const {p}=voyage(true);p.run!.capture=undefined;p.run!.reward='pending';p.mathIsland=island().p.mathIsland;
  expect(harborDeparture(p).kind).toBe('island');p.mathIsland=undefined;expect(harborDeparture(p)).toMatchObject({kind:'journey',action:'領取獎勵'});
 });
 it('resumes an ordinary active voyage and otherwise offers the picker',()=>{
  expect(harborDeparture(voyage().p).kind).toBe('journey');expect(harborDeparture(newFamily().profiles.doudou).kind).toBe('picker');
 });
 it('returns to the ordinary destination after skip, a wrong answer, or successful capture',()=>{
  for(const action of ['skip','wrong','correct']){
   const {f,p,id}=voyage(true),r=p.run!,t=r.capture!.trial!;
   if(action==='skip')skipCapture(f,id,'voyage',r.id);
   else for(let i=0;i<(action==='correct'?3:1);i++){const q=questionById(t.questions[i])!;answerCapture(f,id,'voyage',r.id,i,action==='correct'?q.answer:(q.answer+1)%q.options.length,day);}
   expect(harborDeparture(p).kind).toBe('picker');
  }
 });
 it('keeps the capture primary label and shortened second-grade reading aligned',()=>{
  expect(harborDeparture(voyage(true).p)).toMatchObject({action:'繼續降服挑戰',grade2Text:'繼續降服',grade2Reading:'ㄐㄧˋ ㄒㄩˋ ㄒㄧㄤˊ ㄈㄨˊ'});
 });
});
