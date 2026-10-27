import { describe, expect, it } from 'vitest'
import { SUBJECT_IDS } from '../core'
import { getLearningStrategies } from '../strategy'

describe('strategy compass', () => {
  it('offers three concise, distinct, non-scoring strategies for every subject', () => {
    for (const subject of SUBJECT_IDS) {
      const strategies = getLearningStrategies(subject)
      expect(strategies).toHaveLength(3)
      expect(new Set(strategies.map((strategy) => strategy.id)).size).toBe(3)
      for (const strategy of strategies) {
        expect(strategy.label.length).toBeGreaterThan(2)
        expect(strategy.instruction.length).toBeGreaterThan(12)
        expect(strategy.instruction).not.toMatch(/[+＋]\s*\d+|答案是|選[A-D]/)
      }
    }
  })
})
