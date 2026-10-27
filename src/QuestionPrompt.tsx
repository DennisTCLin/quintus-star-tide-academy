import type { LearningQuestion } from './learning';
import { PhoneticText } from './PhoneticText';
export default function QuestionPrompt({ question }: { question: Pick<LearningQuestion, 'prompt' | 'hideReadingHints'>; grade: number }) {
  return <span data-learning-content><PhoneticText text={question.prompt} /></span>;
}
