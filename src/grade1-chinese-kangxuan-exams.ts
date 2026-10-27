import type {LearningQuestion} from './learning';
import type {ExamSource} from './exam-sources';
import rawRows from './data/g1-chinese-kangxuan-114mid.json';
export const GRADE1_CHINESE_KANGXUAN_EXAMS: LearningQuestion[] = rawRows.map(row => ({
 id: row.id, grade: 1 as const, subject: 'chinese' as const,
 course: row.course as LearningQuestion['course'], publisher: '康軒' as const, level: 1,
 examSources: [{id: row.sourceId as ExamSource['id'], page: row.page, locator: row.locator, kind: row.kind}],
 prompt: row.prompt, speechText: row.speechText,
 options: row.options.map(text => ({text, zy: text})),
 answer: row.answer, hint: row.hint, explanation: row.explanation,
}));
