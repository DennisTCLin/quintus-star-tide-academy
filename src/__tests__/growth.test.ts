import { describe, expect, it } from 'vitest'
import { awardQuestion, createInitialState, type Subject } from '../core'
import { abilityStage, abilityValue, selectAbilitySnapshot, suggestedSubject } from '../growth'

describe('five-subject growth compass', () => {
  it('maps practice points to a bounded, monotonic display value', () => {
    const samples = [0, 1, 9, 10, 20, 120, 900, 9_999].map(abilityValue)
    expect(samples[0]).toBe(10)
    expect(samples[samples.length - 1]).toBe(100)
    expect(samples.every((value, index) => index === 0 || value >= samples[index - 1])).toBe(true)
    expect(samples.every((value) => Number.isInteger(value) && value >= 10 && value <= 100)).toBe(true)
  })

  it('keeps every subject visible and advances only the practised route', () => {
    const result = awardQuestion(createInitialState(), {
      questionId: 'science-01', subject: 'science', dayKey: '2026-10-24', attempts: 2,
    })
    const snapshot = selectAbilitySnapshot(result.state)
    expect(Object.keys(snapshot).sort()).toEqual(['chinese', 'english', 'math', 'science', 'social'])
    expect(snapshot.science).toMatchObject({ value: 12, masteryPoints: 20, creditedAnswers: 1 })
    expect(snapshot.math).toMatchObject({ value: 10, masteryPoints: 0, creditedAnswers: 0 })
  })

  it('uses coarse, non-diagnostic stages based on credited practice count', () => {
    expect(abilityStage({ masteryPoints: 0, creditedAnswers: 0 }).name).toBe('待探索')
    expect(abilityStage({ masteryPoints: 48, creditedAnswers: 3 }).name).toBe('航線點亮')
    expect(abilityStage({ masteryPoints: 60, creditedAnswers: 5 }).name).toBe('穩定航行')
    expect(abilityStage({ masteryPoints: 180, creditedAnswers: 15 }).name).toBe('潮流熟悉')
    expect(abilityStage({ masteryPoints: 360, creditedAnswers: 30 }).name).toBe('星潮領航')
  })

  it('rotates equal low-value route suggestions without ranking the child', () => {
    const subjects: Subject[] = ['math', 'chinese', 'english', 'science', 'social']
    subjects.forEach((subject, index) => {
      expect(suggestedSubject({ ...createInitialState(), completedVoyages: index })).toBe(subject)
    })

    const practised = awardQuestion(createInitialState(), {
      questionId: 'math-01', subject: 'math', dayKey: '2026-10-24', attempts: 1,
    }).state
    expect(suggestedSubject(practised)).toBe('chinese')
  })
})
