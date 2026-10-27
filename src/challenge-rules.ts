// Shared presentation rules; answer correctness is decided by the server.
export const CHALLENGE_QUESTIONS = 6;
export const MAX_MISTAKES = 3;
export const mistakeCount = (run: { answers?: boolean[]; streak: number }) =>
  run.answers ? run.answers.filter(answer => !answer).length : run.streak;

export function challengeHp(max: number, mistakes: number) {
  return Math.max(0, Math.ceil(max * (MAX_MISTAKES - mistakes) / MAX_MISTAKES));
}
