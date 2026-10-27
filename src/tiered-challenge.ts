/** Frozen gameplay contract. Existing runs without this field keep their rules. */
export type TimingMode = 'standard' | 'relaxed';
export type ChallengeClock = { index:number; openedAt:number; answerAt:number; deadlineAt:number };
export type TieredChallenge = {
  version:1; tier:1|2|3; requiredCorrect:4|5|6; targetDifficulty:1|2|3;
  mode:TimingMode; seconds:number; difficultyLevels:number[];
  clock:ChallengeClock|null; timeouts:number[];
};
export const TIMING_GRACE_MS = 2000;
export const TIER_NAMES = {1:'初階',2:'進階',3:'高手'};
export function newChallenge(level:number,grade:number,mode:TimingMode):TieredChallenge {
  if(!['standard','relaxed'].includes(mode)) throw Error('請選擇挑戰節奏');
  const tier=level>=20?3:level>=10?2:1;
  return {version:1,tier,requiredCorrect:(tier+3) as 4|5|6,targetDifficulty:tier,mode,
    seconds:(grade===1?90:grade===2?75:60)-(tier-1)*5,difficultyLevels:[],clock:null,timeouts:[]};
}
/** A bounded presentation budget, separate from the answering time, not an audio completion claim. */
export function readingSeconds(text:string,audioSeconds=0) {
  return Math.min(120,Math.max(30,Math.ceil(text.length*.55),Math.ceil(audioSeconds)+10));
}
export function openChallenge(c:TieredChallenge,index:number,now:number,reading:number) {
  if(c.clock) {if(c.clock.index!==index)throw Error('題目已更新');return;}
  if(!Number.isSafeInteger(now)||now<0)throw Error('時間資料不正確');
  c.clock={index,openedAt:now,answerAt:now+reading*1000,deadlineAt:now+(reading+c.seconds)*1000};
}
export const challengeExpired=(c:TieredChallenge,now:number)=>c.mode==='standard'&&!!c.clock&&now>c.clock.deadlineAt+TIMING_GRACE_MS;
export const correctNeeded=(c?:TieredChallenge)=>c?.requiredCorrect??4;
export function validateChallenge(c:TieredChallenge,level:number,grade:number,index:number,answers:boolean[]) {
  if(!c || c.version!==1 || !['standard','relaxed'].includes(c.mode))throw Error('挑戰規則格式不正確');
  const expected=newChallenge(level,grade,c.mode);
  for(const k of ['tier','requiredCorrect','targetDifficulty','seconds'] as const) if(c[k]!==expected[k])throw Error('挑戰規則已改變');
  if(!Array.isArray(c.difficultyLevels)||c.difficultyLevels.length!==6||!c.difficultyLevels.every(n=>[1,2,3].includes(n)))throw Error('題目難度格式不正確');
  if(!Array.isArray(c.timeouts)||new Set(c.timeouts).size!==c.timeouts.length||!c.timeouts.every(i=>Number.isInteger(i)&&i>=0&&i<answers.length&&answers[i]===false)||c.mode==='relaxed'&&c.timeouts.length)throw Error('超時紀錄格式不正確');
  if(c.clock!==null) {
    const t=c.clock;
    if(!t||t.index!==index||![t.openedAt,t.answerAt,t.deadlineAt].every(n=>Number.isSafeInteger(n)&&n>=0)||t.answerAt-t.openedAt<30000||t.answerAt-t.openedAt>120000||t.deadlineAt-t.answerAt!==c.seconds*1000)throw Error('題目時鐘格式不正確');
  }
}
