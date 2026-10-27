import { describe, expect, it } from 'vitest'
import { getDailyQuestions, getLegacyDailyQuestions } from '../questions'
import {
  ACTIVE_VOYAGE_VERSION,
  loadActiveVoyage,
  validateActiveVoyage,
  type ActiveVoyageState,
} from '../voyage-state'

function validQuestionThreeState(): ActiveVoyageState {
  const questions = getDailyQuestions('math', '2026-10-24')
  const current = questions[2]
  const wrong = [0, 1, 2, 3].find((index) => index !== current.answer)!
  return {
    version: ACTIVE_VOYAGE_VERSION,
    subject: 'math',
    companionId: 'tideglow',
    dayKey: '2026-10-24',
    questionIds: questions.map((question) => question.id),
    questionIndex: 2,
    attempts: 1,
    wrongOptions: [wrong],
    feedback: { kind: 'wrong' },
    voyageEarned: 40,
  }
}

describe('active voyage recovery', () => {
  it('restores a strictly valid Q3 voyage with prior voyage points', () => {
    const state = validQuestionThreeState()
    expect(loadActiveVoyage(JSON.stringify(state))).toEqual(state)
  })

  it('accepts registry companions beyond the legacy three and rejects unknown IDs', () => {
    const expanded = { ...validQuestionThreeState(), companionId: 'astraltide' }
    expect(validateActiveVoyage(expanded)?.companionId).toBe('astraltide')
    expect(validateActiveVoyage({ ...expanded, companionId: 'not-in-the-bestiary' })).toBeNull()
    expect(validateActiveVoyage(validQuestionThreeState())?.companionId).toBe('tideglow')
  })

  it('rejects corrupt, unknown, and non-deterministic voyage state', () => {
    expect(loadActiveVoyage('{broken')).toBeNull()
    expect(validateActiveVoyage({ ...validQuestionThreeState(), injected: true })).toBeNull()
    const wrongOrder = validQuestionThreeState()
    ;[wrongOrder.questionIds[0], wrongOrder.questionIds[1]] = [wrongOrder.questionIds[1], wrongOrder.questionIds[0]]
    expect(validateActiveVoyage(wrongOrder)).toBeNull()
  })

  it('rejects impossible attempts, answers, and earned points', () => {
    const badAttempts = { ...validQuestionThreeState(), attempts: 4 }
    expect(validateActiveVoyage(badAttempts)).toBeNull()
    const badPoints = { ...validQuestionThreeState(), voyageEarned: 99 }
    expect(validateActiveVoyage(badPoints)).toBeNull()
  })

  it('reconciles current feedback points with the stored voyage total', () => {
    const validCorrect = validQuestionThreeState()
    validCorrect.attempts = 1
    validCorrect.wrongOptions = []
    validCorrect.feedback = { kind: 'correct', points: 20, awarded: true }
    validCorrect.voyageEarned = 60
    expect(validateActiveVoyage(validCorrect)).toEqual(validCorrect)

    const firstQuestion = validQuestionThreeState()
    firstQuestion.questionIndex = 0
    firstQuestion.attempts = 1
    firstQuestion.wrongOptions = []
    firstQuestion.feedback = { kind: 'correct', points: 20, awarded: true }
    firstQuestion.voyageEarned = 0
    expect(validateActiveVoyage(firstQuestion)).toBeNull()

    const fifthQuestion = validQuestionThreeState()
    fifthQuestion.questionIndex = 4
    fifthQuestion.attempts = 1
    fifthQuestion.wrongOptions = []
    fifthQuestion.feedback = { kind: 'correct', points: 0, awarded: false }
    fifthQuestion.voyageEarned = 100
    expect(validateActiveVoyage(fifthQuestion)).toBeNull()
  })

  it('restores a legacy v1 route and accepts its historical retry reward', () => {
    const questions = getLegacyDailyQuestions('math', '2026-10-24')
    const current = questions[2]
    const wrong = [0, 1, 2, 3].find((index) => index !== current.answer)!
    const legacy: ActiveVoyageState = {
      version: ACTIVE_VOYAGE_VERSION,
      subject: 'math',
      companionId: 'tideglow',
      dayKey: '2026-10-24',
      questionIds: questions.map((question) => question.id),
      questionIndex: 2,
      attempts: 2,
      wrongOptions: [wrong],
      feedback: { kind: 'correct', points: 12, awarded: true },
      voyageEarned: 52,
    }
    expect(validateActiveVoyage(legacy)).toEqual(legacy)
  })

  it('accepts the new full reward after using a hint', () => {
    const state = validQuestionThreeState()
    state.attempts = 2
    state.feedback = { kind: 'correct', points: 20, awarded: true }
    state.voyageEarned = 60
    expect(validateActiveVoyage(state)).toEqual(state)
  })

  it('rejects the retired 12-point reward on a current v2 route', () => {
    const state = validQuestionThreeState()
    state.attempts = 2
    state.feedback = { kind: 'correct', points: 12, awarded: true }
    state.voyageEarned = 52
    expect(validateActiveVoyage(state)).toBeNull()
  })
})
