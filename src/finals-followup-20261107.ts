import rows from './data/finals-followup-20261107.json';
import type {LearningQuestion,Grade,Course} from './learning';
import type {Subject} from './questions';
import type {Publisher} from './school-curriculum';
import type {ExamSource} from './exam-sources';

/** Independently reviewed additions; existing questions and saved state are immutable. */
export const FINALS_FOLLOWUP_20261107:LearningQuestion[]=rows.map(row=>({
 ...row,
 grade:row.grade as Grade,
 course:row.course as Course,
 subject:row.subject as Subject,
 publisher:row.publisher as Publisher,
 level:row.level as 1|2|3,
 examSources:row.examSources as ExamSource[],
 options:row.options.map(text=>({
  text,
  ...(['pairs','medials'].includes(row.course) && /^[ㄅ-ㄯˊˇˋ˙]+$/.test(text) ? {zy:text} : {}),
 })),
}));
