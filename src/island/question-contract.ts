import { GAME_UNITS } from './catalog';
/** Stable identity includes diagrams and wording, including shuffled alternatives. */
export function questionId(key: string, parameters: unknown, text: string) {
  let hash = 2166136261;
  for (const c of JSON.stringify([parameters,text])) hash = Math.imul(hash ^ c.charCodeAt(0),16777619) >>> 0;
  return `isl-g${GAME_UNITS[key]?.unit[0]??1}-${key}-${hash.toString(16).padStart(8,'0')}`;
}
export function isExtendedQuestion(id: string) {
  const m = /^isl-g([1-6])-([a-z0-9]+)-[a-f0-9]{8}$/.exec(id);
  return !!m && Object.prototype.hasOwnProperty.call(GAME_UNITS,m[2]) && GAME_UNITS[m[2]].unit[0]===m[1];
}
export const isIslandNumber = (x: unknown): x is string => typeof x === 'string' && /^(?:0|[1-9][0-9]?|100)$/.test(x);
export function answerLimit(unit: string) {
  return unit.startsWith('1B') ? 100 : unit === '1A-08' ? 30 : unit === '1A-09' ? 12 : 10;
}
export const appendDigit = (current: string | null, digit: string) => {
  const next = String(Number(`${current ?? ''}${digit}`));
  return Number(next) <= 100 ? next : current;
};
