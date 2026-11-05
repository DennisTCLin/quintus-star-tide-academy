import rows from './data/g2-math-sanchong113.json';
import type {LearningQuestion} from './learning';
import type {ExamSource} from './exam-sources';
/** Add provenance without replacing any saved question ID or answer. */
export function withReviewedGrade2Math(original:LearningQuestion[]):LearningQuestion[]{
 const legacy=original.map(q=>{
  if(q.id==='mxg2-bfd6eed9dc1c1911')return {...q,examSources:[...q.examSources!,{id:'g2mnsc113' as const,page:1,locator:'I-5',kind:'文字填答改編為選擇題；獨立運算核對'}]};
  if(q.id==='mxg2-22eed7dd59041518')return {...q,sourceFamily:'math-g2-consecutive-296-300'};
  return q;
 });
 return [...legacy,...rows.map(row=>({...row,grade:2 as const,course:'math' as const,subject:'math' as const,publisher:'南一' as const,level:1 as const,examSources:row.examSources as ExamSource[],options:row.options.map(text=>({text}))}))];
}
