import {it,expect} from 'vitest';
import {LEARNING_BANK,questionById} from '../learning';
import {coursePublisher,eligibleExam} from '../school-curriculum';
import {allocateQuestions,freshLearning} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {EXPECTED_CHILD_CURRICULA as cases} from './helpers/child-curricula';
for(const [username,player,grade,school,courses] of cases)it(`${username}: every supplied lane, mastered exclusion and general fallback`,()=>{
 for(const [course,[publisher,count]] of Object.entries(courses)){
  expect(coursePublisher(school,grade,course)).toBe(publisher);
  const available=LEARNING_BANK.filter(q=>!q.retired&&!q.rephraseOf&&q.grade===grade&&q.course===course&&eligibleExam(school,grade,course,q));expect(available.length).toBe(count);
  const s={...freshLearning(),school};markMastered(s,available[0].id);
  for(const {id} of allocateQuestions(s,grade,course as any,6)){
   const q=questionById(id)!;expect(q.grade).toBe(grade);expect(q.publisher).toBe(publisher);expect(available.some(x=>x.id===id)).toBe(true);expect(id).not.toBe(available[0].id);
  }
  for(const q of available)markMastered(s,q.id);
  expect(allocateQuestions(s,grade,course as any,6).every(x=>!questionById(x.id)?.examSources)).toBe(true);
 }
});
