import type { LearningState } from "./learning-engine";
export function learningSummary(s: LearningState) {
  return {
    allocated:
      s.seen.length + Object.values(s.cursors).reduce((a, b) => a + b, 0),
    answered: Object.values(s.skills).reduce((a, b) => a + b.answered, 0),
  };
}
