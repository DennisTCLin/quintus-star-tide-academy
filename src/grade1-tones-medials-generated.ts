import type {LearningQuestion} from './learning';
import tonesRows from './data/g1-tones-generated.json';
import medialsRows from './data/g1-medials-generated.json';
const rows = [...tonesRows, ...medialsRows];
export const GRADE1_TONES_MEDIALS_GENERATED: LearningQuestion[] = rows.map(row => ({
 id: row.id, grade: 1 as const, subject: 'chinese' as const,
 course: row.course as LearningQuestion['course'], level: 1,
 prompt: row.prompt, speechText: row.speechText,
 options: row.options.map(text => ({text, zy: text})),
 answer: row.answer, hint: row.hint, explanation: row.explanation,
}));
