import {it,expect} from 'vitest';
import {coursePublisher,eligibleExam,schoolDisplayName} from '../school-curriculum';
import {LEARNING_BANK,questionById} from '../learning';
import {freshLearning,allocateQuestions,validateLearning} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {newFamily,startRun,validateFamily} from '../adventure';
it('routes only verified first-grade subjects to existing exams',()=>{
 expect(schoolDisplayName('xingan')).toContain('幸安');
 const chinese=LEARNING_BANK.filter(q=>!q.retired&&q.grade===1&&eligibleExam('xingan',1,q.course,q));
 expect(chinese.filter(q=>q.course!=='math')).toHaveLength(159);expect(chinese.filter(q=>q.course==='math')).toHaveLength(134);
 for(const course of ['tones','medials','pairs','math'] as const){
  const s={...freshLearning(),school:'xingan' as const};
  expect(()=>validateLearning(s,1)).not.toThrow();
  const qs=allocateQuestions(s,1,course,6).map(q=>questionById(q.id)!);
  expect(qs.every(q=>q.grade===1&&q.examSources?.length&&q.publisher===(course==='math'?'翰林':'康軒'))).toBe(true);
 }
 for(const grade of [2,4,5,6] as const)for(const course of ['chinese','math','english','science','social'])expect(coursePublisher('xingan',grade,course)).toBeUndefined();
 expect(coursePublisher('xingan',1,'english')).toBeUndefined();
});
it('keeps old voyage, mastery, rewards and other players unchanged when routing is added',()=>{
 const f=newFamily();f.profiles.qingqing.coins=735;f.profiles.qingqing.tickets=5;
 startRun(f,'qingqing','math','existing-jasper-voyage',19);
 const old=LEARNING_BANK.find(q=>q.grade===1&&q.publisher==='翰林'&&q.course==='math')!;
 markMastered(f.profiles.qingqing.learning,old.id);
 const before=structuredClone(f);f.profiles.qingqing.learning.school='xingan';const restored=validateFamily(f);
 expect(restored.profiles.qingqing.run).toEqual(before.profiles.qingqing.run);
 delete restored.profiles.qingqing.learning.school;expect(restored).toEqual(before);
 const s={...freshLearning(),school:'xingan' as const};markMastered(s,old.id);
 expect(allocateQuestions(s,1,'math',6).some(q=>q.id===old.id)).toBe(false);
 for(const q of LEARNING_BANK.filter(q=>q.grade===1&&eligibleExam('xingan',1,'math',q)))markMastered(s,q.id);
 expect(allocateQuestions(s,1,'math',6).every(q=>!questionById(q.id)?.examSources)).toBe(true);
});
