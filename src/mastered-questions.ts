import { ENGLISH_REPHRASES, LEARNING_BANK, questionById, type Grade } from './learning';
import { GENERATED_POOLS, generatorPool } from './question-generator';

/** Permanent, per-learner successes. Generated pools use bounded hex bitsets. */
export type MasteredQuestions = { ids: string[]; generated: Record<string, string> };
export const freshMastered = (): MasteredQuestions => ({ ids: [], generated: {} });
type Holder = { mastered?: MasteredQuestions };
function location(id: string) {
  const match = /^n1-(.+)-([0-9a-z]+)$/.exec(id);
  if (!match) return;
  const pool = generatorPool(match[1]), index = parseInt(match[2], 36);
  if (pool && index.toString(36) === match[2] && index < pool.params.length)
    return { pool, index };
}
export function hasMastered(s: Holder, id: string): boolean {
  const m = s.mastered;
  if (!m) return false;
  if (!m.ids.length && !Object.keys(m.generated).length) return false;
  const at = location(id);
  return at ? !!(parseInt(m.generated[at.pool.key]?.[at.index >> 2] ?? '0', 16) & (1 << (at.index % 4))) : m.ids.includes(id);
}
export function markMastered(s: Holder, id: string) {
  if (!questionById(id)) return;
  const m = s.mastered ??= freshMastered(), at = location(id);
  if (!at) { if (!m.ids.includes(id)) m.ids.push(id); return; }
  const pos = at.index >> 2, bits = (m.generated[at.pool.key] ?? '').padEnd(pos + 1, '0');
  const digit = (parseInt(bits[pos], 16) | (1 << (at.index % 4))).toString(16);
  m.generated[at.pool.key] = bits.slice(0, pos) + digit + bits.slice(pos + 1);
}
export function validateMastered(value: unknown, grade: Grade) {
  if (value === undefined) return; // Upgrade historical snapshots from proven successes.
  const m = value as MasteredQuestions;
  if (!m || typeof m !== 'object' || !Array.isArray(m.ids) || m.ids.length > LEARNING_BANK.length + ENGLISH_REPHRASES.length
      || new Set(m.ids).size !== m.ids.length
      || m.ids.some(id => typeof id !== 'string' || id.startsWith('n1-') || questionById(id)?.grade !== grade)
      || !m.generated || typeof m.generated !== 'object' || Array.isArray(m.generated)
      || Object.keys(m.generated).length > GENERATED_POOLS.length)
    throw Error('答對紀錄格式不正確，原有進度沒有更動');
  for (const [key, bits] of Object.entries(m.generated)) {
    const pool = generatorPool(key), size = pool?.params.length ?? 0;
    if (!pool || pool.grade !== grade || typeof bits !== 'string' || !/^[0-9a-f]+$/.test(bits)
        || bits.length > Math.ceil(size / 4)
        || (bits.length === Math.ceil(size / 4) && size % 4 && parseInt(bits.at(-1)!, 16) >= (1 << (size % 4))))
      throw Error('答對紀錄格式不正確，原有進度沒有更動');
  }
}
export function mergeMastered(a?: MasteredQuestions, b?: MasteredQuestions): MasteredQuestions {
  const out = freshMastered();
  out.ids = [...new Set([...(a?.ids ?? []), ...(b?.ids ?? [])])];
  for (const key of new Set([...Object.keys(a?.generated ?? {}), ...Object.keys(b?.generated ?? {})])) {
    const x = a?.generated[key] ?? '', y = b?.generated[key] ?? '';
    out.generated[key] = Array.from({ length: Math.max(x.length, y.length) }, (_, i) =>
      (parseInt(x[i] ?? '0', 16) | parseInt(y[i] ?? '0', 16)).toString(16)).join('');
  }
  return out;
}

/** Count bounded bits directly; never materialize the entire generated bank per request. */
export function remainingGenerated(s: Holder, pool: {key:string; params:unknown[]}, excluded: string[]) {
  const bits = s.mastered?.generated[pool.key] ?? '';
  const pop = [0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4];
  let count = pool.params.length;
  for (const digit of bits) count -= pop[parseInt(digit,16)];
  for (const id of new Set(excluded)) {
    const at = location(id);
    if (at?.pool.key === pool.key && !hasMastered(s,id)) count--;
  }
  return count;
}
