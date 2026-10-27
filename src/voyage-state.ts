import { SUBJECT_IDS, isLocalDayKey } from './core'
import { QUESTION_BANK, getDailyQuestions, getLegacyDailyQuestions, type Subject } from './questions'
import { isCharacterId } from './characters'

export const ACTIVE_VOYAGE_KEY = 'star-tide-academy.active-voyage.v1'
export const ACTIVE_VOYAGE_VERSION = 1 as const

export type VoyageFeedback =
  | { kind: 'wrong' }
  | { kind: 'correct'; points: 0 | 12 | 20; awarded: boolean }
  | null

export type ActiveVoyageState = {
  version: typeof ACTIVE_VOYAGE_VERSION
  subject: Subject
  companionId: string
  dayKey: string
  questionIds: string[]
  questionIndex: number
  attempts: number
  wrongOptions: number[]
  feedback: VoyageFeedback
  voyageEarned: number
}

const exactKeys = (value: Record<string, unknown>, expected: string[]) => {
  const actual = Object.keys(value).sort()
  return actual.length === expected.length && actual.every((key, index) => key === [...expected].sort()[index])
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max
}

function isPossibleEarned(points: number, answeredCount: number, allowHistoricalRetry: boolean): boolean {
  let possible = new Set([0])
  for (let index = 0; index < answeredCount; index += 1) {
    possible = new Set([...possible].flatMap((total) => (
      allowHistoricalRetry ? [total, total + 12, total + 20] : [total, total + 20]
    )))
  }
  return possible.has(points)
}

export function validateActiveVoyage(value: unknown): ActiveVoyageState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>
  if (!exactKeys(candidate, [
    'version', 'subject', 'companionId', 'dayKey', 'questionIds', 'questionIndex',
    'attempts', 'wrongOptions', 'feedback', 'voyageEarned',
  ])) return null
  if (candidate.version !== ACTIVE_VOYAGE_VERSION) return null
  if (!SUBJECT_IDS.includes(candidate.subject as Subject)) return null
  if (!isCharacterId(candidate.companionId)) return null
  if (!isLocalDayKey(candidate.dayKey)) return null
  if (!Array.isArray(candidate.questionIds)
    || candidate.questionIds.length !== 5
    || new Set(candidate.questionIds).size !== 5
    || !candidate.questionIds.every((id) => typeof id === 'string')) return null
  if (!isIntegerInRange(candidate.questionIndex, 0, 4)) return null
  if (!isIntegerInRange(candidate.attempts, 0, 4)) return null
  if (!Array.isArray(candidate.wrongOptions)
    || candidate.wrongOptions.length > 3
    || new Set(candidate.wrongOptions).size !== candidate.wrongOptions.length
    || !candidate.wrongOptions.every((index) => isIntegerInRange(index, 0, 3))) return null
  if (!isIntegerInRange(candidate.voyageEarned, 0, 100)) return null

  const subject = candidate.subject as Subject
  const questionIds = candidate.questionIds as string[]
  const wrongOptions = candidate.wrongOptions as number[]
  const currentIds = getDailyQuestions(subject, candidate.dayKey).map((question) => question.id)
  const legacyIds = getLegacyDailyQuestions(subject, candidate.dayKey).map((question) => question.id)
  const matchesCurrent = questionIds.every((id, index) => id === currentIds[index])
  const matchesLegacy = questionIds.every((id, index) => id === legacyIds[index])
  if (!matchesCurrent && !matchesLegacy) return null
  const currentQuestion = QUESTION_BANK.find((question) => question.id === questionIds[candidate.questionIndex as number])
  if (!currentQuestion || wrongOptions.includes(currentQuestion.answer)) return null

  const feedback = candidate.feedback
  let normalizedFeedback: VoyageFeedback = null
  if (feedback !== null) {
    if (!feedback || typeof feedback !== 'object' || Array.isArray(feedback)) return null
    const feedbackObject = feedback as Record<string, unknown>
    if (feedbackObject.kind === 'wrong') {
      if (!exactKeys(feedbackObject, ['kind'])) return null
      if (candidate.wrongOptions.length < 1 || candidate.attempts !== candidate.wrongOptions.length) return null
      normalizedFeedback = { kind: 'wrong' }
    } else if (feedbackObject.kind === 'correct') {
      if (!exactKeys(feedbackObject, ['kind', 'points', 'awarded'])) return null
      if (typeof feedbackObject.awarded !== 'boolean') return null
      const allowedPoints = feedbackObject.awarded
        ? candidate.attempts === 1 ? [20] : matchesLegacy ? [12, 20] : [20]
        : [0]
      if (!allowedPoints.includes(feedbackObject.points as number)) return null
      if (candidate.attempts !== candidate.wrongOptions.length + 1) return null
      normalizedFeedback = {
        kind: 'correct',
        points: feedbackObject.points as 0 | 12 | 20,
        awarded: feedbackObject.awarded,
      }
    } else {
      return null
    }
  } else if (candidate.attempts !== candidate.wrongOptions.length || candidate.attempts !== 0) {
    return null
  }

  const currentFeedbackPoints = normalizedFeedback?.kind === 'correct' ? normalizedFeedback.points : 0
  const priorEarned = (candidate.voyageEarned as number) - currentFeedbackPoints
  if (priorEarned < 0 || !isPossibleEarned(priorEarned, candidate.questionIndex as number, matchesLegacy)) return null

  return {
    version: ACTIVE_VOYAGE_VERSION,
    subject,
    companionId: candidate.companionId,
    dayKey: candidate.dayKey,
    questionIds: [...questionIds],
    questionIndex: candidate.questionIndex,
    attempts: candidate.attempts,
    wrongOptions: [...wrongOptions],
    feedback: normalizedFeedback,
    voyageEarned: candidate.voyageEarned,
  }
}

export function loadActiveVoyage(raw: string | null): ActiveVoyageState | null {
  if (!raw) return null
  try {
    return validateActiveVoyage(JSON.parse(raw))
  } catch {
    return null
  }
}
