import { describe, expect, it } from 'vitest'
import {
  QUESTION_BANK,
  SUBJECTS,
  getDailyQuestions,
  getLegacyDailyQuestions,
  getQuestionsByIds,
} from '../questions'

describe('question bank quality gates', () => {
  it('contains ten structurally valid, uniquely identified questions per subject', () => {
    expect(QUESTION_BANK).toHaveLength(50)
    expect(new Set(QUESTION_BANK.map((question) => question.id)).size).toBe(QUESTION_BANK.length)

    for (const subject of SUBJECTS) {
      const questions = QUESTION_BANK.filter((question) => question.subject === subject.id)
      expect(questions).toHaveLength(10)
      expect(questions.filter((question) => question.difficulty === 1).length).toBeGreaterThanOrEqual(2)
      expect(questions.filter((question) => question.difficulty === 2).length).toBeGreaterThanOrEqual(2)
      expect(questions.filter((question) => question.difficulty === 3).length).toBeGreaterThanOrEqual(2)
    }

    for (const question of QUESTION_BANK) {
      expect(question.prompt.trim().length).toBeGreaterThan(5)
      expect(question.options).toHaveLength(4)
      expect(new Set(question.options).size).toBe(4)
      expect(question.answer).toBeGreaterThanOrEqual(0)
      expect(question.answer).toBeLessThan(question.options.length)
      expect(question.hint.trim().length).toBeGreaterThan(5)
      expect(question.explanation.trim().length).toBeGreaterThan(5)

      const visibleCopy = [question.prompt, ...question.options, question.hint, question.explanation].join(' ')
      expect(visibleCopy).not.toMatch(/[\u2460-\u24FF\uFFFD]/)
    }
  })

  it('builds a deterministic five-question route with a fair difficulty curve', () => {
    for (const subject of SUBJECTS) {
      for (const dayKey of ['2026-10-24', '2026-10-25', '2026-11-03']) {
        const first = getDailyQuestions(subject.id, dayKey)
        const second = getDailyQuestions(subject.id, dayKey)
        expect(first.map((question) => question.id)).toEqual(second.map((question) => question.id))
        expect(first.map((question) => question.difficulty)).toEqual([1, 1, 2, 2, 3])
        expect(new Set(first.map((question) => question.id)).size).toBe(5)
      }
    }
  })

  it('renders the sentence-order question as readable sentences instead of enclosed-number glyphs', () => {
    const question = QUESTION_BANK.find((item) => item.id === 'chinese-07')
    expect(question).toMatchObject({
      prompt: '請選出語序正確、意思通順的句子。',
      options: [
        '我們仔細地觀察潮池裡的生物。',
        '我們觀察仔細地潮池裡的生物。',
        '仔細地我們潮池裡的生物觀察。',
        '潮池裡的生物觀察我們仔細地。',
      ],
      answer: 0,
    })
  })

  it('reproduces the v1 route exactly and restores its stored order', () => {
    const expectedRoutes = {
      math: ['math-06', 'math-02', 'math-01', 'math-03', 'math-04'],
      chinese: ['chinese-08', 'chinese-04', 'chinese-06', 'chinese-07', 'chinese-02'],
      english: ['english-04', 'english-03', 'english-08', 'english-02', 'english-07'],
      science: ['science-08', 'science-05', 'science-06', 'science-01', 'science-03'],
      social: ['social-01', 'social-04', 'social-03', 'social-05', 'social-02'],
    } as const

    for (const [subject, expected] of Object.entries(expectedRoutes)) {
      expect(getLegacyDailyQuestions(subject as keyof typeof expectedRoutes, '2026-10-24').map((question) => question.id)).toEqual(expected)
      expect(getQuestionsByIds(expected).map((question) => question.id)).toEqual(expected)
    }
  })
})
