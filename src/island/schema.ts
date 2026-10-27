import { validateCaptureTrial, captureIndex } from "../capture-trial";
import { isLocalDayKey } from '../core';
import { CHALLENGE_QUESTIONS, MAX_MISTAKES } from '../challenge-rules';
import { GAME_UNITS, UNIT_BY_ID } from './catalog';
import { isExtendedQuestion, isIslandNumber, answerLimit } from './question-contract';
import type { PlayerIsland } from './engine';
import type { Item, Mode } from './games';
import type { QuizEncounter } from '../companion-growth';
import { validCaptureRate, encounterStats, sameStats, type CaptureOutcome } from '../creature-rules';
import { monsterById, monsterEligible } from '../monsters';
import { petById } from '../game-view';
import { UPPER_PLANS } from './upper-plans';

export type IslandRun = {
  id: string; day: string; mode: Mode; unit?: string; companion: string;
  items: Item[]; answers: string[]; completed: boolean; skillUsed: boolean; help?: {index: number; eliminated: string | null};
  coins: number; points: number; rewarded: number; xp: number; packs: number; found: number;
  tickets: number; bonus: number; savedStar: boolean; prevBest: number | null;
  encounter?: QuizEncounter;
  capture?: CaptureOutcome;
  captureRule?: "three-correct-v1";
  grade?: number;
};
export type CloudIsland = PlayerIsland & { run?: IslandRun };
export type IslandAnswer = { correct: boolean; answer: string; coins: number; points: number; star: 'lost' | 'found' | 'home' | null };

/** Stable Math Island IDs only; ordinary course validators keep their own grade rules. */
export function isIslandQuestion(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  if (isExtendedQuestion(id)) return true;
  const n = '(?:[0-9]|10)';
  return new RegExp(`^isl-(?:count-(?:[3-9]|10)-[0-4]|find-[sdf]-(?:[1-9]|10)|(?:split|merge|boat|hop|add)-${n}-${n}|zero-e-${n}|zero-p-${n}-${n}|ten-[1-9])$`).test(id);
}
const obj = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);
const num = (x: unknown, max = 10000000): x is number => Number.isSafeInteger(x) && Number(x) >= 0 && Number(x) <= max;
const ratio = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
const need = (ok: unknown) => { if (!ok) throw Error('數學島進度格式不正確，原有資料沒有更動'); };
export function validateIsland(value: unknown): asserts value is CloudIsland {
  need(obj(value)); const p = value as CloudIsland;
  need(obj(p.units) && Object.entries(p.units).every(([k, u]) => Object.prototype.hasOwnProperty.call(UNIT_BY_ID,k) && obj(u)
    && (u.learn === undefined || typeof u.learn === 'boolean') && (u.play === undefined || typeof u.play === 'boolean')
    && (u.boss === undefined || ratio(u.boss)) && (!u.play || u.learn) && (u.boss === undefined || u.play)));
  need(p.mock === undefined || ratio(p.mock));
  need(p.mocks === undefined || (obj(p.mocks)&&Object.entries(p.mocks).every(([grade,score])=>/^[1-6]$/.test(grade)&&ratio(score))));
  need(Array.isArray(p.pool) && p.pool.length <= Object.keys(GAME_UNITS).length && new Set(p.pool.map(x => x?.k)).size === p.pool.length
    && p.pool.every(s => obj(s) && Object.prototype.hasOwnProperty.call(GAME_UNITS,s.k) && isLocalDayKey(s.due) && isLocalDayKey(s.added) && num(s.streak,1)));
  need(obj(p.stats) && Object.entries(p.stats).every(([k,v]) => Object.prototype.hasOwnProperty.call(GAME_UNITS,k) && obj(v) && num(v.a) && num(v.w,v.a)));
  if(p.recent!==undefined) need(obj(p.recent) && Object.entries(p.recent).every(([k,v])=>{
    const st=p.stats[k];
    return Object.prototype.hasOwnProperty.call(GAME_UNITS,k)&&Array.isArray(v)&&v.length<=3&&v.every(a=>typeof a==='boolean')
      && !!st && v.length<=st.a && v.filter(a=>!a).length<=st.w && v.filter(Boolean).length<=st.a-st.w;
  }));
  need((p.day === '' || isLocalDayKey(p.day)) && Array.isArray(p.attempted) && p.attempted.length <= 5000
    && p.attempted.every(isIslandQuestion) && new Set(p.attempted).size === p.attempted.length);
  if (!p.run) return;
  const r = p.run;
  need(obj(r) && typeof r.id === 'string' && /^[a-f0-9-]{36}$/i.test(r.id) && isLocalDayKey(r.day)
    && ['learn','play','boss','mock'].includes(r.mode) && (r.mode === 'mock' ? r.unit === undefined : typeof r.unit === 'string' && Object.prototype.hasOwnProperty.call(UNIT_BY_ID,r.unit))
    && typeof r.companion === 'string' && typeof r.completed === 'boolean' && typeof r.skillUsed === 'boolean');
  need(r.grade===undefined || (Number.isInteger(r.grade)&&r.grade>=1&&r.grade<=6&&(!r.unit||Number(r.unit[0])===r.grade)));
  const size = r.mode === 'learn' ? UNIT_BY_ID[r.unit!].learn.reduce((a,b)=>a+b,0) : CHALLENGE_QUESTIONS;
  need(Array.isArray(r.items) && r.items.length === size && r.items.every(q => obj(q) && isIslandQuestion(q.id)
    && Object.prototype.hasOwnProperty.call(GAME_UNITS,q.k) && GAME_UNITS[q.k].unit === q.unit && isIslandNumber(q.answer) && Number(q.answer) <= answerLimit(q.unit)
    && Array.isArray(q.choices) && q.choices.length <= 11 && q.choices.includes(q.answer)
    && q.choices.every(c => isIslandNumber(c) && Number(c) <= answerLimit(q.unit))
    && typeof q.text === 'string' && q.text.length < 300 && typeof q.say === 'string' && q.say.length < 300
    && obj(q.p) && JSON.stringify(q.p).length < 4000
    && (!isExtendedQuestion(q.id)||q.id.startsWith('isl-g'+q.unit[0]+'-'+q.k+'-'))
    && (Number(q.unit[0])===1 || (
      Object.keys(q.p).length===3 && q.p.code===UPPER_PLANS[q.unit]?.[UNIT_BY_ID[q.unit].games.indexOf(q.k)]
      && obj(q.p.seed) && Object.keys(q.p.seed).length===6
      && ['a','b','c','d'].every(k=>Number.isInteger(q.p.seed[k])&&q.p.seed[k]>=2&&q.p.seed[k]<=9)
      && ['t','u'].every(k=>num(q.p.seed[k],999999999))
      && Array.isArray(q.p.options)&&q.p.options.length>=3&&q.p.options.length<=4
      && q.p.options.every((v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=120)
      && new Set(q.p.options).size===q.p.options.length
      && JSON.stringify(q.choices)===JSON.stringify(q.p.options.map((_:unknown,i:number)=>String(i+1)))
    ))));
  if(r.unit)need(r.items.every(q=>q.unit[0]===r.unit![0]&&(['learn','boss'].includes(r.mode)?q.unit===r.unit:true)));
  if(r.mode==='mock')need(r.items.every(q=>Number(q.unit[0])===(r.grade??1)));
  if(r.help !== undefined) need(obj(r.help) && num(r.help.index,size-1) && (r.help.eliminated === null || (typeof r.help.eliminated === 'string' && r.items[r.help.index].choices.includes(r.help.eliminated) && r.help.eliminated !== r.items[r.help.index].answer)));
  need(Array.isArray(r.answers) && r.answers.length <= size && r.answers.every((a,i)=>isIslandNumber(a)&&(Number(r.items[i].unit[0])===1||r.items[i].choices.includes(a)))
    && (!r.completed || r.answers.length === size || islandFailed(r)));
  need(['coins','points','rewarded','xp','packs','found','tickets','bonus'].every(k => num(r[k as keyof IslandRun]))
    && typeof r.savedStar === 'boolean' && (r.prevBest === null || num(r.prevBest,10)));
  if(r.encounter !== undefined) {
    const e=r.encounter,monster=monsterById(e?.variant),pet=petById(r.companion);
    need(obj(e) && r.mode!=='learn' && monster && pet && monster.family===e.monster
      && num(e.level,1000) && e.level>=1 && monsterEligible(monster!,e.level) && e.earned===0
      && e.combat?.version===2 && sameStats(e.combat.ally,encounterStats(2,pet!.rarity,e.level))
      && sameStats(e.combat.foe,encounterStats(2,monster!.rarity,e.level)));
  }
  need(r.captureRule===undefined||r.captureRule==="three-correct-v1");
  if(r.capture !== undefined) {
    validateCaptureTrial(r.capture,undefined,'math');
    need(r.capture.version!==3||r.captureRule==='three-correct-v1');
    const c=r.capture,monster=monsterById(r.encounter?.variant);
    need(obj(c) && monster && r.completed && !islandFailed(r) && r.answers.length===CHALLENGE_QUESTIONS
      && c.monster===monster!.id && validCaptureRate(c,monster!.rarity));
    if(c.outcome==='joined'||c.outcome==='duplicate') need(num(c.copies,10000) && c.copies!>0 && c.reason===undefined);
    else if(c.outcome==='unavailable') need(['old-day','capacity','legacy'].includes(c.reason!) && c.copies===undefined);
    else need((c.outcome==='escaped'||c.outcome==='pending') && c.reason===undefined && c.copies===undefined);
  }
}

/** Keep solutions private until the first submitted answer. */
export function publicIslandRun(r: IslandRun): IslandRun {
  const out=structuredClone(r);
  if(out.capture?.trial){const index=captureIndex(out.capture);out.capture.trial.questions=out.capture.trial.questions.map((id,i)=>i===index?id:"");}
  out.items.forEach((item,i)=>{if(i>=out.answers.length) item.answer="";});
  return out;
}

export const islandFailed = (r: IslandRun) => r.mode !== "learn" && r.answers.filter((a,i)=>a !== r.items[i]?.answer).length >= MAX_MISTAKES;
