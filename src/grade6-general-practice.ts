import type {LearningQuestion} from './learning';
import rows from './data/g6-general-practice.json';
const subjectOf = (c: string) => c === 'words' || c === 'tones' || c === 'medials' || c === 'pairs' ? 'chinese' as const : c as LearningQuestion['subject'];
export const GRADE6_GENERAL_PRACTICE: LearningQuestion[] = rows.map(row => ({
 id: row.id, grade: 6 as const, subject: subjectOf(row.course),
 course: row.course as LearningQuestion['course'], level: row.level as 1 | 2 | 3,
 prompt: row.prompt, speechText: row.prompt,
 options: row.options.map(text => ({text})),
 answer: row.answer, hint: row.hint, explanation: row.explanation,
}));
