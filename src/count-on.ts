/** A local explanation for an already revealed answer; never a scoring input. */
export type CountOnInput = {
  grade: number;
  run: { course: string; settled: boolean; questions: string[]; index: number };
  question: { id: string; grade: number; course: string; prompt: string; options: { text: string }[]; answer?: number };
};
export type CountOnLesson = { start: number; add: number; total: number };
export function countOnLesson({ grade, run, question: q }: CountOnInput): CountOnLesson | undefined {
  if (grade !== 1 || q.grade !== 1 || run.course !== 'math' || q.course !== 'math' ||
      !run.settled || q.id !== run.questions[run.index] ||
      !Number.isInteger(q.answer) || q.answer! < 0 || q.answer! >= q.options.length) return;
  const match = /^(0|[1-9]\d*) \+ (0|[1-9]\d*) = \?$/.exec(q.prompt);
  if (!match) return;
  const start = Number(match[1]), add = Number(match[2]), total = start + add;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(add) || total > 10 ||
      q.options[q.answer!].text !== String(total)) return;
  return { start, add, total };
}
export function countOnFrame(lesson: CountOnLesson, step: number) {
  const added = Math.max(0, Math.min(lesson.add, Number.isSafeInteger(step) ? step : 0));
  return { added, count: lesson.start + added, remaining: lesson.add - added, complete: added === lesson.add };
}
const quantity = (n: number) => n === 2 ? '兩' : String(n);
export function countOnCurrentSpeech(lesson: CountOnLesson, step: number) {
  const frame = countOnFrame(lesson, step);
  return frame.complete ? `${lesson.start}加${lesson.add}等於${lesson.total}。`
    : `現在有${quantity(frame.count)}顆。還要加${quantity(frame.remaining)}顆。`;
}
export function countOnIntroduction({ start, add, total }: CountOnLesson) {
  return add === 0 ? `原本有${quantity(start)}顆星星。再加零顆，還是${quantity(total)}顆。`
    : `原本有${quantity(start)}顆星星。要再加${quantity(add)}顆。按加一，每次加一顆。`;
}
