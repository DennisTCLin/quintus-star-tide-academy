import {it,expect} from 'vitest';
import {LEARNING_BANK,questionById} from '../learning';
import {freshLearning} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {enableAdaptive,reviewEligible,challengeEligible,observeAdaptive} from '../adaptive-learning';
import {examEvidenceMatches} from '../adaptive-source-evidence';
import {observeStudy,startStudy,answerStudy,studySummary} from '../study-review';
const day='2026-11-09',next='2026-11-10';
const english=LEARNING_BANK.find(q=>q.grade===5&&q.course==='english'&&q.curriculumMatch==='hwg7-u1-u2')!;
it('retains independently learned old English paper review without unlocking challenges or siblings',()=>{
 const s=freshLearning();s.school='dongmen';observeStudy(s,english,true,false,day);markMastered(s,english.id);enableAdaptive(s);
 expect(examEvidenceMatches(s.school,english)).toBe(true);expect(reviewEligible(s,english,5)).toBe(true);expect(challengeEligible(s,english,5)).toBe(false);
 const prior=structuredClone(s.mastered);startStudy(s,5,next,'review','all','english');expect(s.study!.session!.questions).toContain(english.id);
 answerStudy(s,5,'review',0,(english.answer+1)%english.options.length,next);expect(s.mastered).toEqual(prior);expect(reviewEligible(s,english,5)).toBe(true);expect(challengeEligible(s,english,5)).toBe(false);
 const sibling=LEARNING_BANK.find(q=>q.id!==english.id&&q.grade===5&&q.course==='english'&&q.curriculumMatch==='hwg7-u1-u2')!;expect(reviewEligible(s,sibling,5)).toBe(false);
});
it('does not use imported records, undated earned bits or assisted answers as review provenance',()=>{
 for(const kind of ['import','mastered','hint']){const s=freshLearning();s.school='dongmen';enableAdaptive(s);if(kind==='mastered')markMastered(s,english.id);else observeStudy(s,english,true,kind==='hint',day);if(kind==='import')s.adaptive!.ignoreLegacyEvidence=true;expect(reviewEligible(s,english,5),kind).toBe(false);expect(challengeEligible(s,english,5)).toBe(false);}
});
it('retains the historical totals while clearly counting held content',()=>{const s=freshLearning();s.school='dongmen';observeStudy(s,english,true,false,day);enableAdaptive(s);s.school='jianan';expect(studySummary(s,5,next)).toMatchObject({attempts:1,independent:1,correct:1,held:1});expect(reviewEligible(s,english,5)).toBe(false);});
it('uses actual English series evidence and the science subject book, not a grade-only formula',()=>{
 const h3=LEARNING_BANK.find(q=>q.examSources?.some(x=>x.id==='he-cd114'))!;expect(examEvidenceMatches('nantun',h3)).toBe(true);expect(examEvidenceMatches('dunhua',h3)).toBe(false);
 const hess=LEARNING_BANK.find(q=>q.examSources?.some(x=>x.id==='g6e1'))!;expect(examEvidenceMatches('jianan',hess)).toBe(false);
 const science=LEARNING_BANK.find(q=>q.examSources?.some(x=>x.id==='f4b20003548'))!;expect(examEvidenceMatches('jianan',science)).toBe(true);const s=freshLearning();s.school='jianan';observeStudy(s,science,true,false,day);enableAdaptive(s);expect(reviewEligible(s,science,6)).toBe(true);expect(challengeEligible(s,science,6)).toBe(false);
});
it('retains independent provenance for pre-update mistakes and a resumed legacy review',()=>{
 for(const resumed of [false,true]){const s=freshLearning();s.school='dongmen';observeStudy(s,english,true,false,'2026-11-08');if(resumed)startStudy(s,5,day,'legacy','all','english');else observeStudy(s,english,false,false,day);enableAdaptive(s);
  if(resumed){startStudy(s,5,day,'ignored','all','english');answerStudy(s,5,'legacy',0,(english.answer+1)%english.options.length,day);}
  expect(reviewEligible(s,english,5)).toBe(true);expect(challengeEligible(s,english,5)).toBe(false);startStudy(s,5,next,'mistakes','mistakes','english');expect(s.study!.session!.questions).toContain(english.id);
 }
});
