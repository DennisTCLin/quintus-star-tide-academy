import {it,expect} from 'vitest';
import legacy from '../../docs/content-review/sanchong113-g2-math/legacy-snapshot.json';
import mapping from '../../docs/content-review/sanchong113-g2-math/mapping.json';
import {GRADE2_MATH_EXAMS as bank} from '../grade2-math-exams';
import {questionById} from '../learning';
import {allocateQuestions,allocateAdventureQuestions,freshLearning} from '../learning-engine';
import {markMastered,hasMastered} from '../mastered-questions';
import {newFamily,startRun,validateFamily} from '../adventure';

it('preserves every legacy ID, prompt, option, answer and explanation while merging one duplicate source',()=>{
 for(const old of legacy){
  const q=questionById(old.id)!;
  expect({id:q.id,prompt:q.prompt,options:q.options.map(o=>o.text),answer:q.answer,hint:q.hint,explanation:q.explanation}).toEqual(old);
 }
 expect(mapping).toHaveLength(27);
 expect(new Set(mapping.map(m=>m.gameId)).size).toBe(27);
 expect(bank.filter(q=>q.id.startsWith('mxg2-sc113-'))).toHaveLength(26);
 const duplicate=questionById('mxg2-bfd6eed9dc1c1911')!;
 expect(duplicate.examSources?.some(s=>s.id==='g2mnsc113'&&s.locator==='I-5')).toBe(true);
 expect(duplicate.options[duplicate.answer].text).toBe('38');
});

it('allocates all reviewed candidates only to matching grade/school without clue-sharing siblings in one voyage',()=>{
 for(const school of ['nantun','yongchun'] as const){
  const state={...freshLearning(),school};
  legacy.forEach(q=>markMastered(state,q.id));
  for(let round=0;round<8;round++){
   const picked=allocateAdventureQuestions(state,2,'math',6);
   const families=picked.map(q=>questionById(q.id)?.sourceFamily).filter(Boolean);
   expect(new Set(families).size).toBe(families.length);
   expect(picked.some(q=>q.id.startsWith('mxg2-sc113-'))).toBe(true);
  }
  const excluded='mxg2-sc113-ii_2_1a';
  const picked=allocateQuestions(state,2,'math',6,undefined,[excluded]);
  expect(picked.map(q=>questionById(q.id)?.sourceFamily)).not.toContain(questionById(excluded)!.sourceFamily);
 }
 expect(allocateQuestions(freshLearning(),2,'math',6).some(q=>q.id.startsWith('mxg2-sc113-'))).toBe(false);
 const other={...freshLearning(),school:'xingan' as const};
 expect(allocateQuestions(other,1,'math',6).some(q=>q.id.startsWith('mxg2-sc113-'))).toBe(false);
});

it('keeps an in-progress legacy run, mastery and existing rewards across validation',()=>{
 const family=newFamily();startRun(family,'feifei','math','legacy-run',7);
 const p=family.profiles.feifei;
 p.run!.questions=legacy.slice(0,6).map(q=>q.id);
 p.coins=1234;p.tickets=3;p.starTickets=4;p.rewardStars=1;p.rewardRounds=6;
 p.learning.school='nantun';markMastered(p.learning,legacy[8].id);
 const before=structuredClone(p);
 const after=validateFamily(family).profiles.feifei;
 expect(after.run!.questions).toEqual(before.run!.questions);
 for(const key of ['coins','tickets','starTickets','rewardStars','rewardRounds','owned','growth','credited','attempted'] as const)expect(after[key]).toEqual(before[key]);
 expect(hasMastered(after.learning,legacy[8].id)).toBe(true);
});
