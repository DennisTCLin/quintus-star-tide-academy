import { describe, expect, it } from 'vitest'
import {
  awardQuestion,
  canonicalizeMilestones,
  createExportPayload,
  createInitialState,
  loadMilestones,
  validateImport,
  type MilestoneState,
  type Subject,
} from '../core'

function dayKey(offset: number): string {
  const date = new Date(Date.UTC(2024, 0, 1 + offset))
  return date.toISOString().slice(0, 10)
}

function award(
  state: MilestoneState,
  questionId: string,
  day: string,
  attempts: number,
  subject: Subject = 'math',
) {
  return awardQuestion(state, { questionId, subject, dayKey: day, attempts })
}

describe('mastery scoring', () => {
  it('awards 20 points for a first-try correct answer', () => {
    const result = award(createInitialState(), 'math-01', '2026-10-24', 1)
    expect(result.awarded).toBe(true)
    expect(result.points).toBe(20)
    expect(result.state.masteryPoints).toBe(20)
    expect(result.state.subjectGrowth.math).toEqual({ masteryPoints: 20, creditedAnswers: 1 })
    expect(result.state.subjectGrowth.english).toEqual({ masteryPoints: 0, creditedAnswers: 0 })
  })

  it('keeps the full 20-point reward after a retry', () => {
    const result = award(createInitialState(), 'math-01', '2026-10-24', 2)
    expect(result.awarded).toBe(true)
    expect(result.points).toBe(20)
    expect(result.state.masteryPoints).toBe(20)
    expect(result.state.subjectGrowth.math).toEqual({ masteryPoints: 20, creditedAnswers: 1 })
  })

  it('does not award the same question twice on the same local day', () => {
    const first = award(createInitialState(), 'math-01', '2026-10-24', 1)
    const repeat = award(first.state, 'math-01', '2026-10-24', 1)
    expect(repeat.awarded).toBe(false)
    expect(repeat.points).toBe(0)
    expect(repeat.state.masteryPoints).toBe(20)
    expect(repeat.state.subjectGrowth.math).toEqual({ masteryPoints: 20, creditedAnswers: 1 })
  })

  it('allows the same question to earn points on a different local day', () => {
    const dayOne = award(createInitialState(), 'math-01', '2026-10-24', 1)
    const dayTwo = award(dayOne.state, 'math-01', '2026-10-25', 2)
    expect(dayTwo.awarded).toBe(true)
    expect(dayTwo.points).toBe(20)
    expect(dayTwo.state.masteryPoints).toBe(40)
    expect(dayTwo.state.subjectGrowth.math).toEqual({ masteryPoints: 40, creditedAnswers: 2 })
  })

  it('prunes the oldest ledger day at 730→731 without losing long-term points', () => {
    const awardedByDay = Object.fromEntries(
      Array.from({ length: 730 }, (_, index) => [dayKey(index), ['math-01']]),
    )
    const state: MilestoneState = {
      ...createInitialState(),
      masteryPoints: 9_000,
      awardedByDay,
    }
    const result = award(state, 'math-02', dayKey(730), 1)
    expect(result.state.masteryPoints).toBe(9_020)
    expect(Object.keys(result.state.awardedByDay)).toHaveLength(730)
    expect(result.state.awardedByDay[dayKey(0)]).toBeUndefined()
    expect(result.state.awardedByDay[dayKey(730)]).toEqual(['math-02'])
  })
})

describe('storage recovery and migration', () => {
  it('migrates a supported version 1 milestone record', () => {
    const old = JSON.stringify({
      version: 1,
      points: 52,
      date: '2026-10-24',
      rewardedToday: ['math-01', 'math-02'],
      voyages: 3,
      best: 72,
    })
    const loaded = loadMilestones(old)
    expect(loaded.migrated).toBe(true)
    expect(loaded.recovered).toBe(false)
    expect(loaded.state).toMatchObject({
      version: 3,
      masteryPoints: 52,
      completedVoyages: 3,
      bestVoyagePoints: 72,
    })
    expect(loaded.state.awardedByDay['2026-10-24']).toEqual(['math-01', 'math-02'])
    expect(loaded.state.subjectGrowth).toEqual(createInitialState().subjectGrowth)
  })

  it('migrates version 2 without inventing subject history', () => {
    const old = JSON.stringify({
      version: 2,
      masteryPoints: 188,
      awardedByDay: { '2026-10-24': ['english-01'] },
      completedVoyages: 4,
      bestVoyagePoints: 92,
    })
    const loaded = loadMilestones(old)
    expect(loaded.migrated).toBe(true)
    expect(loaded.state).toMatchObject({ version: 3, masteryPoints: 188, completedVoyages: 4, bestVoyagePoints: 92 })
    expect(loaded.state.subjectGrowth).toEqual(createInitialState().subjectGrowth)
  })

  it('recovers safely from corrupt or unsupported data', () => {
    expect(loadMilestones('{bad json').recovered).toBe(true)
    expect(loadMilestones('{bad json').state).toEqual(createInitialState())
    expect(loadMilestones(JSON.stringify({ version: 99, masteryPoints: 999 })).state).toEqual(createInitialState())
  })

  it('loads a legacy 731-day ledger by pruning, never by blanking accumulated points', () => {
    const oversized = {
      ...createInitialState(),
      masteryPoints: 7_777,
      awardedByDay: Object.fromEntries(
        Array.from({ length: 731 }, (_, index) => [dayKey(index), ['english-01']]),
      ),
    }
    const loaded = loadMilestones(JSON.stringify(oversized))
    expect(loaded.recovered).toBe(false)
    expect(loaded.state.masteryPoints).toBe(7_777)
    expect(Object.keys(loaded.state.awardedByDay)).toHaveLength(730)
    expect(loaded.state.awardedByDay[dayKey(0)]).toBeUndefined()
  })

  it('keeps valid historical 12-point subject growth after the new flat reward ships', () => {
    const historical: MilestoneState = {
      ...createInitialState(),
      masteryPoints: 32,
      awardedByDay: { '2026-10-24': ['math-01', 'math-02'] },
      subjectGrowth: {
        ...createInitialState().subjectGrowth,
        math: { masteryPoints: 32, creditedAnswers: 2 },
      },
    }
    const loaded = loadMilestones(JSON.stringify(historical))
    expect(loaded.recovered).toBe(false)
    expect(loaded.state.subjectGrowth.math).toEqual({ masteryPoints: 32, creditedAnswers: 2 })
  })
})

describe('import validation', () => {
  it('accepts a valid exported milestone file', () => {
    const state = award(createInitialState(), 'science-02', '2026-10-24', 1, 'science').state
    const result = validateImport(createExportPayload(state))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.state).toEqual(state)
  })

  it('accepts an import exactly at the 730-day cap', () => {
    const state: MilestoneState = {
      ...createInitialState(),
      masteryPoints: 14_600,
      awardedByDay: Object.fromEntries(
        Array.from({ length: 730 }, (_, index) => [dayKey(index), ['science-01']]),
      ),
    }
    const result = validateImport(createExportPayload(state))
    expect(result.ok).toBe(true)
    if (result.ok) expect(Object.keys(result.state.awardedByDay)).toHaveLength(730)
  })

  it('strips undeclared fields before persistence or re-export', () => {
    const imported = validateImport(JSON.stringify({
      product: '星潮學院',
      milestones: {
        ...createInitialState(),
        arbitrarySecret: 'must-not-survive',
      },
      outerUnknown: { tracking: true },
    }))
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    expect(Object.keys(imported.state).sort()).toEqual([
      'awardedByDay', 'bestVoyagePoints', 'completedVoyages', 'masteryPoints', 'subjectGrowth', 'version',
    ])
    expect(createExportPayload(imported.state)).not.toContain('arbitrarySecret')
    expect(canonicalizeMilestones(imported.state)).toEqual(imported.state)
  })

  it('rejects malformed, oversized-range, and duplicate-ledger records', () => {
    expect(validateImport('not json').ok).toBe(false)
    expect(validateImport(JSON.stringify({
      version: 2,
      masteryPoints: -1,
      awardedByDay: {},
      completedVoyages: 0,
      bestVoyagePoints: 0,
    })).ok).toBe(false)
    expect(validateImport(JSON.stringify({
      version: 2,
      masteryPoints: 20,
      awardedByDay: { '2026-10-24': ['math-01', 'math-01'] },
      completedVoyages: 0,
      bestVoyagePoints: 20,
    })).ok).toBe(false)
  })

  it('accepts a version 2 backup and starts its five subject routes unexplored', () => {
    const result = validateImport(JSON.stringify({
      product: '星潮學院',
      milestones: {
        version: 2,
        masteryPoints: 64,
        awardedByDay: { '2026-10-24': ['chinese-01'] },
        completedVoyages: 1,
        bestVoyagePoints: 64,
      },
    }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.masteryPoints).toBe(64)
      expect(result.state.subjectGrowth).toEqual(createInitialState().subjectGrowth)
    }
  })

  it('rejects missing, extra, or mathematically impossible subject growth', () => {
    const missing = createInitialState()
    const missingGrowth = { ...missing.subjectGrowth } as Record<string, unknown>
    delete missingGrowth.social
    expect(validateImport(JSON.stringify({ ...missing, subjectGrowth: missingGrowth })).ok).toBe(false)

    const extra = createInitialState()
    expect(validateImport(JSON.stringify({
      ...extra,
      subjectGrowth: { ...extra.subjectGrowth, history: { masteryPoints: 0, creditedAnswers: 0 } },
    })).ok).toBe(false)

    const impossible = createInitialState()
    expect(validateImport(JSON.stringify({
      ...impossible,
      masteryPoints: 19,
      subjectGrowth: { ...impossible.subjectGrowth, math: { masteryPoints: 19, creditedAnswers: 1 } },
    })).ok).toBe(false)
  })
})
