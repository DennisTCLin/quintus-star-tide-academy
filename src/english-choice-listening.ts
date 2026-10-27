type QuestionForListening = {
  id: string; grade: number; course: string; audio?: string;
  options: { text: string }[];
};
/** Presentation only. No answer key or question-bank import belongs here. */
export function canListenToEnglishChoices(grade: number, q: QuestionForListening): boolean {
  const match = /^g1-en-v1-(\d{3})$/.exec(q.id);
  return grade === 1 && q.grade === 1 && q.course === 'english' && !q.audio &&
    !!match && Number(match[1]) >= 1 && Number(match[1]) <= 80 && q.options.length === 3 &&
    q.options.every(o => /^[A-Za-z][A-Za-z ,.?!'’-]*$/.test(o.text) && (o.text.match(/[A-Za-z]/g)?.length ?? 0) > 1);
}
