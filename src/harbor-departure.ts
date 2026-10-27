import type {Profile} from './adventure';
import {unfinishedJourney} from './journey-progress';

type Text = {action:string;grade2Text:string;grade2Reading:string;hint:string;symbol:string};
export type HarborDeparture = Text & (
  {kind:'capture';source:'voyage'|'island';runId:string} |
  {kind:'island'|'journey'|'picker'}
);
// One decision drives both the visible primary action and its destination.
export function harborDeparture(p:Pick<Profile,'run'|'mathIsland'>):HarborDeparture {
 const voyage=p.run,island=p.mathIsland?.run;
 const capture=voyage?.status==='won'&&voyage.capture?.version===3&&voyage.capture.outcome==='pending'
  ? {source:'voyage' as const,runId:voyage.id}
  :island?.completed&&island.capture?.version===3&&island.capture.outcome==='pending'
    ? {source:'island' as const,runId:island.id}:null;
 if(capture)return {kind:'capture',...capture,action:'繼續降服挑戰',grade2Text:'繼續降服',grade2Reading:'ㄐㄧˋ ㄒㄩˋ ㄒㄧㄤˊ ㄈㄨˊ',hint:'戰鬥獎勵已保留。',symbol:'▶'};
 const resume={action:'繼續挑戰',grade2Text:'繼續挑戰',grade2Reading:'ㄐㄧˋ ㄒㄩˋ ㄊㄧㄠˇ ㄓㄢˋ',hint:'正在進行的學習會保留。',symbol:'▶'};
 if(island&&!island.completed)return {kind:'island',...resume};
 if(unfinishedJourney(voyage))return voyage?.reward==='pending'
  ? {kind:'journey',action:'領取獎勵',grade2Text:'領取獎勵',grade2Reading:'ㄌㄧㄥˇ ㄑㄩˇ ㄐㄧㄤˇ ㄌㄧˋ',hint:'上次完成六題的獎勵還在，先選好再出發。',symbol:'🎁'}
  : {kind:'journey',...resume};
 return {kind:'picker',action:'選一座島出發',grade2Text:'出發',grade2Reading:'ㄔㄨ ㄈㄚ',hint:'今天想學什麼？選一科，和夥伴一起出發。',symbol:'🏝️'};
}
