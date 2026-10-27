export const STORAGE_KEY = 'star-tide-academy.milestones.v2'
export const STATE_VERSION = 3 as const
export const MAX_LEDGER_DAYS = 730
export const SUBJECT_IDS = ['math', 'chinese', 'english', 'science', 'social'] as const
export type Subject = typeof SUBJECT_IDS[number]

export type SubjectGrowth = {
  masteryPoints: number
  creditedAnswers: number
}

export type SubjectGrowthMap = Record<Subject, SubjectGrowth>

export type MilestoneState = {
  version: typeof STATE_VERSION
  masteryPoints: number
  awardedByDay: Record<string, string[]>
  completedVoyages: number
  bestVoyagePoints: number
  subjectGrowth: SubjectGrowthMap
}

export type AwardResult = {
  state: MilestoneState
  awarded: boolean
  points: 0 | 12 | 20
}

export type AwardQuestionInput = {
  questionId: string
  subject: Subject
  dayKey: string
  attempts: number
}

export const createSubjectGrowth = (): SubjectGrowthMap => ({
  math: { masteryPoints: 0, creditedAnswers: 0 },
  chinese: { masteryPoints: 0, creditedAnswers: 0 },
  english: { masteryPoints: 0, creditedAnswers: 0 },
  science: { masteryPoints: 0, creditedAnswers: 0 },
  social: { masteryPoints: 0, creditedAnswers: 0 },
})

export const createInitialState = (): MilestoneState => ({
  version: STATE_VERSION,
  masteryPoints: 0,
  awardedByDay: {},
  completedVoyages: 0,
  bestVoyagePoints: 0,
  subjectGrowth: createSubjectGrowth(),
})

export function localDayKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isSafeInteger(value: unknown, max = 10_000_000): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max
}

export function isLocalDayKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function isAwardLedger(value: unknown): value is Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const entries = Object.entries(value)
  if (entries.length > 5_000) return false
  return entries.every(([date, ids]) =>
    isLocalDayKey(date)
    && Array.isArray(ids)
    && ids.length <= 100_000
    && ids.every((id) => typeof id === 'string' && /^[a-z0-9-]{2,40}$/i.test(id))
    && new Set(ids).size === ids.length,
  )
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index])
}

function isSubjectGrowth(value: unknown): value is SubjectGrowth {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  if (!hasExactKeys(candidate, ['masteryPoints', 'creditedAnswers'])) return false
  if (!isSafeInteger(candidate.masteryPoints) || !isSafeInteger(candidate.creditedAnswers, 500_000)) return false
  const points = candidate.masteryPoints
  const answers = candidate.creditedAnswers
  if (answers === 0) return points === 0
  return points >= answers * 12
    && points <= answers * 20
    && (points - answers * 12) % 8 === 0
}

function isSubjectGrowthMap(value: unknown): value is SubjectGrowthMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return hasExactKeys(candidate, SUBJECT_IDS)
    && SUBJECT_IDS.every((subject) => isSubjectGrowth(candidate[subject]))
}

export function pruneAwardLedger(ledger: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(ledger)
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-MAX_LEDGER_DAYS)
      .map(([day, ids]) => [day, [...ids]]),
  )
}

export function canonicalizeMilestones(state: MilestoneState): MilestoneState {
  return {
    version: STATE_VERSION,
    masteryPoints: state.masteryPoints,
    completedVoyages: state.completedVoyages,
    bestVoyagePoints: state.bestVoyagePoints,
    awardedByDay: pruneAwardLedger(state.awardedByDay),
    subjectGrowth: Object.fromEntries(
      SUBJECT_IDS.map((subject) => [subject, { ...state.subjectGrowth[subject] }]),
    ) as SubjectGrowthMap,
  }
}

function isMilestoneState(value: unknown): value is MilestoneState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Partial<MilestoneState>
  const growth = candidate.subjectGrowth
  if (!isSubjectGrowthMap(growth)) return false
  return candidate.version === STATE_VERSION
    && isSafeInteger(candidate.masteryPoints)
    && isAwardLedger(candidate.awardedByDay)
    && isSafeInteger(candidate.completedVoyages, 1_000_000)
    && isSafeInteger(candidate.bestVoyagePoints, 120)
    && SUBJECT_IDS.reduce((sum, subject) => sum + growth[subject].masteryPoints, 0) <= candidate.masteryPoints
}

type V2State = {
  version: 2
  masteryPoints: number
  awardedByDay: Record<string, string[]>
  completedVoyages: number
  bestVoyagePoints: number
}

type V1State = {
  version: 1
  points?: number
  totalPoints?: number
  rewardedToday?: string[]
  date?: string
  voyages?: number
  best?: number
}

function migrateV1(value: V1State): MilestoneState | null {
  const masteryPoints = value.points ?? value.totalPoints ?? 0
  const date = value.date
  const ids = value.rewardedToday ?? []
  if (!isSafeInteger(masteryPoints) || !isSafeInteger(value.voyages ?? 0, 1_000_000)) return null
  if (!isSafeInteger(value.best ?? 0, 100)) return null
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string' && /^[a-z0-9-]{2,40}$/i.test(id))) return null
  if (date !== undefined && !isLocalDayKey(date)) return null
  const uniqueIds = [...new Set(ids)]
  if (uniqueIds.length > 100) return null
  return {
    version: STATE_VERSION,
    masteryPoints,
    awardedByDay: date ? { [date]: uniqueIds } : {},
    completedVoyages: value.voyages ?? 0,
    bestVoyagePoints: value.best ?? 0,
    subjectGrowth: createSubjectGrowth(),
  }
}

function migrateV2(value: V2State): MilestoneState | null {
  if (!isSafeInteger(value.masteryPoints)
    || !isAwardLedger(value.awardedByDay)
    || !isSafeInteger(value.completedVoyages, 1_000_000)
    || !isSafeInteger(value.bestVoyagePoints, 100)) return null
  return {
    version: STATE_VERSION,
    masteryPoints: value.masteryPoints,
    awardedByDay: pruneAwardLedger(value.awardedByDay),
    completedVoyages: value.completedVoyages,
    bestVoyagePoints: value.bestVoyagePoints,
    subjectGrowth: createSubjectGrowth(),
  }
}

function decodeMilestones(value: unknown): { state: MilestoneState; migrated: boolean } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const version = (value as { version?: unknown }).version
  if (version === STATE_VERSION && isMilestoneState(value)) {
    return { state: canonicalizeMilestones(value), migrated: false }
  }
  if (version === 2) {
    const migrated = migrateV2(value as V2State)
    return migrated ? { state: migrated, migrated: true } : null
  }
  if (version === 1) {
    const migrated = migrateV1(value as V1State)
    return migrated ? { state: migrated, migrated: true } : null
  }
  return null
}

export function loadMilestones(raw: string | null): {
  state: MilestoneState
  recovered: boolean
  migrated: boolean
} {
  if (!raw) return { state: createInitialState(), recovered: false, migrated: false }
  try {
    const parsed: unknown = JSON.parse(raw)
    const decoded = decodeMilestones(parsed)
    if (decoded) return { ...decoded, recovered: false }
  } catch {
    // A safe blank state is returned below.
  }
  return { state: createInitialState(), recovered: true, migrated: false }
}

export function awardQuestion(
  state: MilestoneState,
  input: AwardQuestionInput,
): AwardResult {
  const { questionId, subject, dayKey, attempts } = input
  if (!/^[a-z0-9-]{2,40}$/i.test(questionId)
    || !SUBJECT_IDS.includes(subject)
    || !isLocalDayKey(dayKey)
    || !Number.isSafeInteger(attempts)
    || attempts < 1
    || attempts > 4) {
    throw new RangeError('Invalid award input')
  }
  const canonical = canonicalizeMilestones(state)
  const answeredToday = canonical.awardedByDay[dayKey] ?? []
  if (answeredToday.includes(questionId)) return { state: canonical, awarded: false, points: 0 }
  const points = 20
  const awardedByDay = pruneAwardLedger({
    ...canonical.awardedByDay,
    [dayKey]: [...answeredToday, questionId],
  })
  return {
    awarded: true,
    points,
    state: {
      ...canonical,
      masteryPoints: canonical.masteryPoints + points,
      awardedByDay,
      subjectGrowth: {
        ...canonical.subjectGrowth,
        [subject]: {
          masteryPoints: canonical.subjectGrowth[subject].masteryPoints + points,
          creditedAnswers: canonical.subjectGrowth[subject].creditedAnswers + 1,
        },
      },
    },
  }
}

export function completeVoyage(state: MilestoneState, voyagePoints: number): MilestoneState {
  const canonical = canonicalizeMilestones(state)
  return {
    ...canonical,
    completedVoyages: canonical.completedVoyages + 1,
    bestVoyagePoints: Math.max(canonical.bestVoyagePoints, voyagePoints),
  }
}

export function createExportPayload(state: MilestoneState): string {
  return JSON.stringify({
    product: '星潮學院',
    exportedAt: new Date().toISOString(),
    milestones: canonicalizeMilestones(state),
  }, null, 2)
}

export type ImportResult = { ok: true; state: MilestoneState } | { ok: false; error: string }

export function validateImport(raw: string): ImportResult {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: '檔案格式不是有效的星潮紀錄。' }
    }
    const candidate = 'milestones' in parsed ? (parsed as { milestones: unknown }).milestones : parsed
    const decoded = decodeMilestones(candidate)
    if (!decoded) {
      return { ok: false, error: '紀錄版本或欄位不正確，沒有匯入。' }
    }
    return { ok: true, state: decoded.state }
  } catch {
    return { ok: false, error: '無法讀取 JSON，原有紀錄沒有改變。' }
  }
}

export function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  return () => {
    let value = seed += 0x6d2b79f5
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

export function seededPick<T>(items: readonly T[], count: number, seedText: string): T[] {
  const result = [...items]
  const random = mulberry32(hashString(seedText))
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[result[index], result[swap]] = [result[swap], result[index]]
  }
  return result.slice(0, count)
}
