import {
  SUBJECT_IDS,
  canonicalizeMilestones,
  type MilestoneState,
  type Subject,
  type SubjectGrowth,
} from './core'

export type AbilityStage = {
  name: string
  description: string
}

export type AbilitySnapshot = Record<Subject, {
  value: number
  masteryPoints: number
  creditedAnswers: number
  stage: AbilityStage
}>

export function abilityValue(masteryPoints: number): number {
  const safePoints = Number.isFinite(masteryPoints) ? Math.max(0, Math.floor(masteryPoints)) : 0
  return Math.min(100, 10 + Math.floor(safePoints / 10))
}

export function abilityStage(growth: SubjectGrowth): AbilityStage {
  if (growth.creditedAnswers === 0) {
    return { name: '待探索', description: '完成第一題後，這條能力航線就會亮起。' }
  }
  if (growth.creditedAnswers < 5) {
    return { name: '航線點亮', description: '你已開始累積這一科的練習足跡。' }
  }
  if (growth.creditedAnswers < 15) {
    return { name: '穩定航行', description: '持續練習正在讓這條航線更清楚。' }
  }
  if (growth.creditedAnswers < 30) {
    return { name: '潮流熟悉', description: '你已在不同航程中反覆鍛鍊這項能力。' }
  }
  return { name: '星潮領航', description: '大量練習已在航海誌留下清楚足跡。' }
}

export function selectAbilitySnapshot(state: MilestoneState): AbilitySnapshot {
  const canonical = canonicalizeMilestones(state)
  return Object.fromEntries(SUBJECT_IDS.map((subject) => {
    const growth = canonical.subjectGrowth[subject]
    return [subject, {
      value: abilityValue(growth.masteryPoints),
      masteryPoints: growth.masteryPoints,
      creditedAnswers: growth.creditedAnswers,
      stage: abilityStage(growth),
    }]
  })) as AbilitySnapshot
}

export function suggestedSubject(state: MilestoneState): Subject {
  const snapshot = selectAbilitySnapshot(state)
  const minimum = Math.min(...SUBJECT_IDS.map((subject) => snapshot[subject].value))
  const tied = SUBJECT_IDS.filter((subject) => snapshot[subject].value === minimum)
  return tied[state.completedVoyages % tied.length]
}
