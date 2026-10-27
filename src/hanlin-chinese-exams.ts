import rows from './data/hanlin-chinese-20261025.json';
import extraRows from './data/hanlin-chinese-extra-20261026.json';
import type { LearningQuestion } from './learning';
import { type ExamSource } from "./exam-sources";
// Identical questions appearing in multiple exam papers share one mastery ID.
const unique = new Map<string,LearningQuestion>();
for (const row of [...rows,...extraRows]) {
  const source:ExamSource={id:row.sourceId as ExamSource["id"],page:row.page,locator:row.locator,kind:row.kind};
  const key=JSON.stringify([row.prompt,[...row.options].sort(),row.passage??'']);
  const previous=unique.get(key);
  if(previous){previous.examSources!.push(source);continue;}
  unique.set(key,{
    id:row.id,grade:4,course:'chinese',subject:'chinese',level:row.passage?2:1,
    publisher:'翰林',examSources:[source],
    prompt:row.passage?`閱讀文章：${row.passage}\n\n${row.prompt}`:row.prompt,
    options:row.options.map(text=>({text})),answer:row.answer,hint:row.hint,explanation:row.explanation,
    ...(row.passage?{format:'short-passage' as const}:{}),
  });
}
export const HANLIN_CHINESE_EXAMS:LearningQuestion[]=[...unique.values()];
