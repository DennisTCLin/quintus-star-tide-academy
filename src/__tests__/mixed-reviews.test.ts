import {startAfterDecliningCapture} from './helpers/capture';
import { describe, expect, it } from 'vitest';
import { LEARNING_BANK, questionById, type Course, type Grade } from '../learning';
import { GENERATED_POOLS, generatedId } from '../question-generator';
import { allocateQuestions, freshLearning, mergeLearning, validateLearning } from '../learning-engine';
import { allocateBattleQuestion, answerRun, claimReward, newFamily, nextQuestion, recordBattleAnswer, startRun, validateFamily } from '../adventure';

const courses = ['chinese','english','science','social'] as const;
const day = '2026-10-25';
const bank = (grade: Grade, course: Course) => LEARNING_BANK.filter(q => !q.examSources && q.grade === grade && q.course === course);
const pools = (grade: Grade, course: Course) => GENERATED_POOLS.filter(p => p.grade === grade && (p.course ?? 'math') === course);
function exhausted(grade: Grade, course: Course, level: 1 | 2 | 3 = 1) {
  const s = freshLearning();
  s.seen = bank(grade,course).map(q => q.id);
  for (const p of pools(grade,course)) {
    s.cursors[p.key] = p.params.length;
    s.skills[p.skill] = {level,recent:'',answered:0,correct:0,reviewDay:''};
  }
  return s;
}

describe('mixed exhausted-context reviews', () => {
  it('covers every curated and eligible generated ID at all three levels with single, six and mixed batch sizes', () => {
    for (const course of courses) for (const level of [1,2,3] as const) for (const counts of [[1],[6],[1,6,2,5]]) {
      let s = exhausted(4,course,level);
      const contexts = bank(4,course), eligible = pools(4,course).filter(p => p.level <= level);
      const expected = new Set([...contexts.map(q=>q.id), ...eligible.flatMap(p=>p.params.map((_,i)=>generatedId(p,i)))]);
      const originals = {seen:[...s.seen],cursors:{...s.cursors}};
      const total = 4 * Math.max(contexts.length, Math.ceil(eligible.reduce((n,p)=>n+p.params.length,0)/3));
      const observed = new Set<string>(); let issued=0, batchIndex=0;
      while (issued < total) {
        const count=Math.min(counts[batchIndex++ % counts.length],total-issued);
        const batch=allocateQuestions(s,4,course,count);
        expect(new Set(batch.map(q=>q.id)).size).toBe(count);
        for (const [i,q] of batch.entries()) {
          expect(q.review).toBe(true);expect(expected.has(q.id),q.id).toBe(true);
          expect(q.id.startsWith('n1-')).toBe((issued+i)%4 !== 0);observed.add(q.id);
        }
        issued+=count;
        s=validateLearning(JSON.parse(JSON.stringify(s)),4);
      }
      expect(observed,`${course}/level${level}/${counts}`).toEqual(expected);
      expect(s.seen).toEqual(originals.seen);expect(s.cursors).toEqual(originals.cursors);
      expect(s.review[course]).toBe(total);
    }
  });

  it('deduplicates fresh-to-review transitions without mislabeling fresh questions or skipping the selected review lane', () => {
    for (const course of courses) for (const remaining of [1,2,3,4,5]) for (const cursor of [0,1,3,9_999_998,10_000_000]) {
      const s=exhausted(4,course);s.seen=bank(4,course).slice(remaining).map(q=>q.id);s.review[course]=cursor;
      const seenBefore=new Set(s.seen),batch=allocateQuestions(s,4,course,6);
      expect(new Set(batch.map(q=>q.id)).size).toBe(6);
      expect(batch.filter(q=>!q.review)).toHaveLength(remaining);
      for (const q of batch.filter(q=>!q.review)) expect(seenBefore.has(q.id)).toBe(false);
      for (const [i,q] of batch.slice(remaining).entries())
        expect(q.id.startsWith('n1-')).toBe(((cursor+i)%10_000_000)%4 !== 0);
      expect(validateLearning(s,4)).toBe(s);
    }
    for(const course of courses) {
      const s=exhausted(4,course),first=pools(4,course).filter(p=>p.level===1)[0];
      s.cursors[first.key]=first.params.length-1;
      // Start the generated review ordinal on the final fresh item, forcing a collision.
      const offset=first.params.length-1;
      s.review[course]=4*Math.floor(offset/3)+offset%3+1;
      const batch=allocateQuestions(s,4,course,6);
      expect(batch[0].review).toBe(false);expect(batch.slice(1).every(q=>q.review)).toBe(true);
      expect(new Set(batch.map(q=>q.id)).size).toBe(6);
    }
  });

  it('prioritizes newly unlocked generators and restricts generated reviews again after a level decrease', () => {
    for(const course of courses) {
      const s=exhausted(4,course);
      for(const p of pools(4,course).filter(p=>p.level>1))s.cursors[p.key]=0;
      expect(allocateQuestions(s,4,course,6).every(q=>q.review)).toBe(true);
      for(const skill of Object.values(s.skills))skill.level=2;
      const fresh=allocateQuestions(s,4,course,6);
      expect(fresh.every(q=>!q.review && questionById(q.id)!.level===2)).toBe(true);
      for(const skill of Object.values(s.skills))skill.level=1;
      const reviews=allocateQuestions(s,4,course,6);
      expect(reviews.every(q=>q.review)).toBe(true);
      expect(reviews.filter(q=>q.id.startsWith('n1-')).every(q=>questionById(q.id)!.level===1)).toBe(true);
      expect(validateLearning(s,4)).toBe(s);
    }
  });

  it('restores and merges bounded cursors through wrap with six distinct legal questions', () => {
    for(const course of courses) for(const start of [0,1,3,9_999_994,9_999_995,9_999_996,9_999_997,9_999_998,9_999_999,10_000_000]) {
      let s=exhausted(4,course,3);s.review[course]=start;
      const before=structuredClone(s);
      for(let i=0;i<3;i++) {
        const batch=allocateQuestions(s,4,course,6);
        expect(new Set(batch.map(q=>q.id)).size).toBe(6);
        expect(batch.every(q=>q.review && questionById(q.id)!.course===course)).toBe(true);
        s=validateLearning(JSON.parse(JSON.stringify(s)),4);
      }
      // Existing max-based backup merge is retained; it cannot infer chronology across wrap.
      const merged=validateLearning(mergeLearning(s,before),4);
      expect(new Set(allocateQuestions(merged,4,course,6).map(q=>q.id)).size).toBe(6);
    }
  });

  it('preserves three battle questions, two exclusions, restored pending tokens and once-only answers', () => {
    for(const course of courses) for(const cursor of [0,1,9_999_998,9_999_999,10_000_000]) {
      let family=newFamily();family.profiles.quintus.learning=exhausted(4,course);
      family.profiles.quintus.learning.review[course]=cursor;
      const preview=structuredClone(family.profiles.quintus.learning);
      const excluded=[allocateQuestions(preview,4,course,1)[0].id,allocateQuestions(preview,4,course,1)[0].id];
      const candidate=allocateBattleQuestion(family,'quintus',course,'excluded-probe',excluded);
      expect(excluded).not.toContain(candidate.id);expect(candidate.review).toBe(true);
      recordBattleAnswer(family,'quintus','excluded-probe',candidate.id,true,day);
      const used:string[]=[];
      for(let i=0;i<3;i++) {
        const token=`review-${i}`,q=allocateBattleQuestion(family,'quintus',course,token,used);
        expect(used).not.toContain(q.id);expect(q.review).toBe(true);used.push(q.id);
        family=validateFamily(JSON.parse(JSON.stringify(family)));
        recordBattleAnswer(family,'quintus',token,q.id,true,day);
        expect(()=>recordBattleAnswer(family,'quintus',token,q.id,true,day)).toThrow();
      }
    }
  });

  it('rewards system reviews once per day alongside XP, materials and completion rewards', () => {
    for(const course of courses) {
      const family=newFamily(),p=family.profiles.quintus;
      p.learning=exhausted(4,course);
      const before={coins:p.coins,mastery:p.milestones.masteryPoints,xp:p.growth.xp[p.equipped]??0};
      const play=(id:string)=>{
        startAfterDecliningCapture(family,'quintus',course,id,0,false,day);
        const r=p.run!;expect(r.review.every(Boolean)).toBe(true);
        for(let i=0;i<6;i++) {answerRun(family,'quintus',id,i,questionById(r.questions[i])!.answer,day);if(i<5)nextQuestion(family,'quintus',id,i);}
        expect(r.status).toBe('won');expect(['saved','exchanged']).toContain(r.reward);return r;
      };
      const first=play('review-first');expect(first.materials).toEqual({credited:6,packs:1});
      expect(p.growth.xp[p.equipped]).toBe(before.xp+60);expect(p.coins).toBe(before.coins+60);expect(p.milestones.masteryPoints).toBe(before.mastery+120);
      expect(p.rewardStars).toBe(1);
      p.learning.review[course]=0;
      const second=play('review-again');expect(second.questions.some(id=>first.questions.includes(id))).toBe(false);
      expect(second.materials).toEqual({credited:6,packs:1});expect(p.growth.xp[p.equipped]).toBe(before.xp+120);
      expect(p.coins).toBe(before.coins+120);expect(p.milestones.masteryPoints).toBe(before.mastery+240);
      expect(validateFamily(JSON.parse(JSON.stringify(family)))).toEqual(family);
    }
  });
});
