import source from '../../curriculum/hanlin_elementary_math_curriculum.json';

export const MATH_GRADES = [1, 2, 3, 4, 5, 6] as const;
export type MathGrade = typeof MATH_GRADES[number];
export type MathTerm = '上' | '下';
export const gradeName = (grade: MathGrade) => `${['一','二','三','四','五','六'][grade-1]}年級`;
export const MATH_BOOKS = source.books;
export const MATH_UNIT_COUNT = MATH_BOOKS.reduce((total, book) => total + book.units.length, 0);
export const curriculumBook = (grade: MathGrade, term: MathTerm) => MATH_BOOKS.find(book => book.grade === grade && book.semester === term)!;
export type CurriculumUnit = typeof MATH_BOOKS[number]['units'][number];
export const curriculumSpeech = (grade: MathGrade, term: MathTerm, unit: CurriculumUnit) =>
  `${gradeName(grade)}，${term}學期，第${unit.unit}單元，${unit.title}。這個單元要學：${unit.concepts.join('。')}。`;
