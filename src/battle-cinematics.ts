import clips from './data/battle-cinematics.json';

export type Cinematic = { src: string; poster: string; duration: number; impactAt: number; jobId: string; name: string; pet: string; slot: number };
export type CinematicAction = 'attack' | 'burst' | 'guard' | 'heal' | 'buff' | 'swap';
export const BATTLE_CINEMATICS: Readonly<Record<string, Cinematic>> = clips;

// Presentation only: never substitute another creature or resolve game rules here.
export function battleCinematic(pet: string, kind: CinematicAction): Cinematic | undefined {
  if (kind === 'swap') return undefined;
  const slot = kind === 'burst' ? 3 : kind === 'attack' ? 1 : 2;
  return BATTLE_CINEMATICS[`${pet}-${slot}`];
}

export function cinematicTiming(clip: Cinematic) {
  const end = clip.slot === 2 ? 4000 : 2800;
  const impact = Math.round(end * clip.impactAt);
  return { flight: 280, impact, settle: Math.max(impact + 250, end - 650), end };
}

// Seek late loads onto the existing visual clock; never replay an old hit.
export function cinematicPosition(clip: Cinematic, elapsed: number) {
  const timing = cinematicTiming(clip);
  return elapsed >= timing.impact - 100 ? null : Math.max(0, elapsed) / timing.end * clip.duration;
}

// Question position, not level or outcome, selects the presentation. Only the
// final answered question gets the ultimate; wrong answers use the counterattack path.
export function quizMoveSlot(index: number, questionCount: number): 0 | 1 | 2 {
  return questionCount > 0 && index === questionCount - 1 ? 2 : index % 2 === 1 ? 1 : 0;
}
export function quizCinematic(pet: string, index: number, questionCount: number) {
  return BATTLE_CINEMATICS[`${pet}-${quizMoveSlot(index, questionCount) + 1}`];
}
export function quizAnimationMs(pet: string, index: number, questionCount: number) {
  const clip = quizCinematic(pet, index, questionCount);
  return clip ? cinematicTiming(clip).end : 1100;
}
