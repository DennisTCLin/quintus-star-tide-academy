import { capturePending } from "../capture-trial";
import type { Family, Profile } from '../adventure';
import { saveCompletionStar, settleCapture, pendingRemediation } from '../adventure';
import { PLAYERS, petById, petSkill, type PlayerId } from '../game-view';
import { chooseMonster, monsterById } from '../monsters';
import { encounterStats } from '../creature-rules';
import { awardQuestion, completeVoyage } from '../core';
import { CHALLENGE_QUESTIONS } from '../challenge-rules';
import { QUESTION_XP, MAX_COMPANION_XP, growthProgress } from '../companion-growth';
import { awardLearningMaterials } from '../learning-rewards';
import { GAMES, UNIT_BY_ID, itemSet, makeItem, mixedExam, type Mode } from './games';
import { isIslandNumber } from './question-contract';
import { unitGrade } from './catalog';
import { emptyPlayer, stageOpen, kingOpen, playMixKeys, recordAnswer, finishStage, takeFirstAttempt, PLAY_MIX_SLOTS } from './engine';
import { islandFailed, type CloudIsland, type IslandRun, type IslandAnswer } from './schema';
const need = (ok: unknown, message: string) => { if (!ok) throw Error(message); };
function profile(s: Family,id: PlayerId) {
  need(PLAYERS.some(p => p.id === id),'找不到航海員');
  return s.profiles[id];
}
function tick(p: Profile, day: string) {
  if (p.day !== day) { p.day=day; p.credited=[]; p.attempted=[]; p.draws=0; p.rewardRounds=0; }
  if (p.growth.day !== day) p.growth={...p.growth,day,credited:[]};
}
export function startIsland(s: Family,id: PlayerId,mode: Mode,unit: string|undefined,runId: string,day: string,seed=0,requestedGrade?:number): IslandRun {
  const p=profile(s,id);
  need(!capturePending(p),'先完成或放棄這次降服挑戰，通關獎勵已保留');
  need(!p.run || (p.run.status !== 'active' && p.run.reward !== 'pending'),'先完成目前航線並領好獎勵，再去數學島');
  need(!pendingRemediation(p.run),'先完成錯題補練，或選擇略過，再去數學島');
  const island: CloudIsland=p.mathIsland??=(emptyPlayer());
  need(['learn','play','boss','mock'].includes(mode),'找不到這一關');
  const grade=unit?unitGrade(unit):requestedGrade??1;
  need(Number.isInteger(grade)&&grade>=1&&grade<=6,'找不到這個年級');
  need(requestedGrade===undefined||requestedGrade===grade,'年級與單元不一致');
  need(mode === 'mock' ? unit === undefined && kingOpen(island,grade) : !!unit && Object.prototype.hasOwnProperty.call(UNIT_BY_ID,unit) && stageOpen(island,unit,mode),'先完成前一關再挑戰');
  if (island.run && !island.run.completed) {
    need(island.run.mode === mode && island.run.unit === unit && (island.run.mode!=='mock'||(island.run.grade??1)===grade),'先繼續或結束數學島目前這一關');
    return island.run;
  }
  tick(p,day);
  const seen=new Set(island.day===day?island.attempted:[]);
  let items;
  if(mode==='learn') items=UNIT_BY_ID[unit!].games.flatMap((k,j)=>Array.from({length:UNIT_BY_ID[unit!].learn[j]},()=>makeItem(k,seen)));
  else if(mode==='mock') items=mixedExam(CHALLENGE_QUESTIONS,seen,grade);
  else if(mode==='boss') items=itemSet([unit!],CHALLENGE_QUESTIONS,seen,true);
  else {
    const mix=playMixKeys(island,unit!,day);
    const own=itemSet([unit!],CHALLENGE_QUESTIONS-mix.filter(x=>x.why!=='own').length,seen);
    const extras=mix.map(x=>x.why==='own'?null:makeItem(x.k,seen));
    let i=0; items=Array.from({length:CHALLENGE_QUESTIONS},(_,index)=>{
      const slot=PLAY_MIX_SLOTS.findIndex(at=>at===index);
      return (slot>=0?extras[slot]:null)??own[i++];
    });
  }
  const unique=new Set<string>();
  items=items.map(item=>{
    for(let i=0;unique.has(item.id)&&i<200;i++) item=makeItem(item.k,undefined,mode==='boss'||mode==='mock');
    need(!unique.has(item.id),'題目還在準備，請再試一次'); unique.add(item.id); return item;
  });
  const prev=mode==='mock'?(grade===1?island.mock:island.mocks?.[grade]):mode==='boss'?island.units[unit!]?.boss:undefined;
  const level=growthProgress(p.growth.xp[p.equipped]??0).level;
  // Existing runs resume above; only newly created math encounters use metal.
  const monster=chooseMonster(level,seed,monsterById(p.lastMonsterVariant)?.family,'金');
  if(mode!=='learn') p.lastMonsterVariant=monster.id;
  return island.run={captureRule:"three-correct-v1",id:runId,day,mode,...(unit?{unit}:{}),...(grade>1?{grade}:{}),companion:p.equipped,items,answers:[],completed:false,skillUsed:false,
    ...(mode==='learn'?{}:{encounter:{monster:monster.family,variant:monster.id,level,earned:0,
      combat:{version:2,ally:encounterStats(2,petById(p.equipped)!.rarity,level),foe:encounterStats(2,monster.rarity,level)}}}),
    coins:0,points:0,rewarded:0,xp:0,packs:0,found:0,tickets:0,bonus:0,savedStar:false,prevBest:prev===undefined?null:Math.round(prev*items.length)};
}
export function answerIsland(s:Family,id:PlayerId,runId:string,index:number,choice:string,day:string):IslandAnswer {
  const p=profile(s,id), island=p.mathIsland, r=island?.run;
  need(r && r.id===runId && !r.completed && !islandFailed(r) && index===r.answers.length && index<r.items.length,'這一題已更新，請回小島繼續');
  need(isIslandNumber(choice),'請填零到一百的數字');
  const run=r!, q=run.items[index];
  need(['boss','mock'].includes(run.mode) || q.choices.includes(choice),'請選題目提供的答案');
  need(Number(q.unit[0])===1||q.choices.includes(choice),'請選題目提供的答案');
  tick(p,day);
  const first=takeFirstAttempt(island!,q.id,day);
  const correct=choice===q.answer;
  const star=recordAnswer(island!,q,correct,new Date(`${day}T12:00:00`));
  run.answers.push(choice);
  if(star==='found'||star==='home') run.found++;
  let coins=0,points=0;
  if(correct && first && run.day===day) {
    if(!p.growth.credited.includes(q.id)) {
      p.growth.credited.push(q.id);
      const before=p.growth.xp[run.companion]??0;
      const after=Math.min(MAX_COMPANION_XP,before+QUESTION_XP);
      p.growth.xp[run.companion]=after; run.xp+=after-before;
      run.packs+=Number(awardLearningMaterials(p));
    }
    if(!p.credited.includes(q.id)) {
      const got=awardQuestion(p.milestones,{questionId:q.id,subject:'math',dayKey:day,attempts:1});
      p.milestones=got.state;
      if(got.awarded) { p.coins+=10;p.credited.push(q.id);coins=10;points=20;run.rewarded++;run.coins+=10;run.points+=20; }
    }
  }
  return {correct,answer:q.answer,coins,points,star};
}
export function finishIsland(s:Family,id:PlayerId,runId:string,day:string,captureRoll=0.999999999):IslandRun {
  const p=profile(s,id),island=p.mathIsland,r=island?.run;
  need(r && r.id===runId && (r.answers.length===r.items.length || islandFailed(r)),'先完成這一關的題目');
  if(r!.completed) return r!;
  tick(p,day);
  const run=r!,right=run.answers.filter((a,i)=>a===run.items[i].answer).length,ratio=right/run.items.length;
  if(run.mode==='mock') {const grade=run.grade??1;if(grade===1)island!.mock=Math.max(island!.mock??0,ratio);else (island!.mocks??={})[grade]=Math.max(island!.mocks?.[grade]??0,ratio);}
  else if(run.mode==='boss' || !islandFailed(run)) finishStage(island!,run.unit!,run.mode,ratio);
  const won=run.mode!=='learn' && run.answers.length===CHALLENGE_QUESTIONS && !islandFailed(run);
  if(won) p.milestones=completeVoyage(p.milestones,Math.min(120,run.points));
  if(won && run.day===day) {
    p.rewardRounds++;run.savedStar=true;
    if(saveCompletionStar(p)==='exchanged') run.tickets=1;
  }
  if(won && run.encounter) {
    const capture={encounter:run.encounter,day:run.day,practice:false,capture:run.capture};
    settleCapture(p,capture,day,captureRoll,run.captureRule?{grade:PLAYERS.find(x=>x.id===id)!.grade,course:"math",exclude:[]}:undefined);run.capture=capture.capture;
  }
  if(won && run.rewarded===run.items.length && petSkill(run.companion)==='spark') {p.coins+=5;run.bonus=5;}
  run.completed=true;
  return run;
}
export function quitIsland(s:Family,id:PlayerId,runId:string) {
  const p=profile(s,id);
  need(p.mathIsland?.run?.id===runId,'這一關已更新，請確認同步');
  need(p.mathIsland?.run?.capture?.outcome!=='pending','先完成或放棄這次降服挑戰，通關獎勵已保留');
  delete p.mathIsland!.run;
  return true;
}

export function helpIsland(s:Family,id:PlayerId,runId:string,index:number) {
  const r=profile(s,id).mathIsland?.run;
  need(r && r.id===runId && !r.completed && !r.skillUsed && (index===r.answers.length || (r.mode==='learn' && index===r.answers.length-1 && r.answers[index]!==r.items[index].answer)) && index<r.items.length && ['learn','play'].includes(r.mode),'夥伴這一關已幫過忙，或題目已更新');
  const skill=petSkill(r!.companion); need(skill!=='spark','星火會在完成後送出獎勵');
  r!.skillUsed=true;
  r!.help={index,eliminated:skill==='focus'?r!.items[index].choices.find(c=>c!==r!.items[index].answer)??null:null};
  return {eliminated:r!.help.eliminated};
}
