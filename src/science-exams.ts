import originalRows from './data/science-exams-20261025.json';
import supplementRows from './data/science-supplement-20261026.json';
import g4scienceKangxuanRows from './data/g4-science-kangxuan-114mid.json';
const rows: typeof originalRows = [...originalRows, ...supplementRows, ...g4scienceKangxuanRows];
import type { LearningQuestion } from './learning';
import { EXAM_SOURCES, type ExamSource } from './exam-sources';
const unique=new Map<string,LearningQuestion>();
for(const row of rows){
 const source:ExamSource={id:row.sourceId as ExamSource['id'],page:row.page,locator:row.locator,kind:row.kind};
 const publisher=EXAM_SOURCES[source.id].publisher;
 const key=JSON.stringify([publisher,row.prompt,[...row.options].sort(),row.passage??'']);
 const previous=unique.get(key);
 if(previous){previous.examSources!.push(source);continue;}
 unique.set(key,{id:row.id,grade:4,course:'science',subject:'science',level:row.passage?2:1,publisher,examSources:[source],
 prompt:row.passage?`${row.passage}\n\n${row.prompt}`:row.prompt,
 options:row.options.map(text=>({text})),answer:row.answer,hint:row.hint,explanation:row.explanation,
 ...(row.passage?{format:'short-passage' as const}:{})});
}
export const SCIENCE_EXAMS=[...unique.values()];
