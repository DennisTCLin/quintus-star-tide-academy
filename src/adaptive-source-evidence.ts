import {EXAM_SOURCES} from './exam-sources';
import {eligibleExam,type SchoolId} from './school-curriculum';
import type {LearningQuestion} from './learning';

/** Semester and series evidence belongs to the subject, never a grade-only
 * formula. Natural/social textbooks begin at grade three. Unknown source books
 * remain held; English compatible units use the existing per-question approval.
 */
const firstBooks:Record<string,Partial<Record<number,string>>>={
 math:{1:'第1冊',2:'第3冊',4:'第7冊',5:'第9冊',6:'第11冊'},
 chinese:{1:'第1冊',2:'第3冊',4:'第7冊',5:'第9冊',6:'第11冊'},
 science:{4:'第3冊',5:'第5冊',6:'第7冊'},social:{4:'第3冊',5:'第5冊',6:'第7冊'},
};
export function examEvidenceMatches(school:SchoolId|undefined,q:LearningQuestion):boolean {
 if(!q.examSources?.length)return true;
 if(!eligibleExam(school,q.grade,q.course,q))return false;
 return q.examSources.some(source=>{
  const m=EXAM_SOURCES[source.id];if(!m||m.status!=='active'||m.publisher!==q.publisher||'grade' in m&&m.grade!==q.grade)return false;
  if(q.course==='english'){
   const book=school==='dongmen'&&q.grade===5?'Here We Go 7':school==='nantun'&&q.grade===4?'Here We Go 3':school==='dunhua'&&q.grade===4?'Here We Go 7':undefined;
   if(!book)return false; // Yongchun/Hess series still need source-level book evidence.
   return 'book' in m&&m.book===book||q.curriculumMatch==='hwg7-u1-u2'&&book==='Here We Go 7'&&'compatibleBook' in m&&m.compatibleBook===book;
  }
  const subject=['words','pairs','tones','medials'].includes(q.course)?'chinese':q.course;
  return 'book' in m&&m.book===firstBooks[subject]?.[q.grade];
 });
}
