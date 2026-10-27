// 數學島共用的亂數工具。測試可用 setRandom 注入固定種子。
let rand: () => number = Math.random;
export function setRandom(fn: () => number) {
  rand = fn;
}
export const random = () => rand();
export const ri = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
export const pick = <T,>(a: readonly T[]): T => a[Math.floor(rand() * a.length)];
export function shuffle<T>(a: readonly T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
/** 以答案為中心的 k 個相異數字選項，由小到大排列。 */
export function numOpts(ans: number, lo: number, hi: number, k = 3): string[] {
  const s = new Set([ans]);
  for (const d of shuffle([1, -1, 2, -2, 3, -3])) {
    if (s.size >= k) break;
    const v = ans + d;
    if (v >= lo && v <= hi) s.add(v);
  }
  for (let v = lo; s.size < k && v <= hi; v++) s.add(v);
  return [...s].sort((a, b) => a - b).map(String);
}
const CN_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
/** 0–100 的國字，給語音用，避免語音引擎把數字唸成別的讀法。 */
export const cn = (n: number): string => CN_DIGITS[n] ?? (n === 100 ? '一百' : n > 10 && n < 100 ? `${n < 20 ? '' : CN_DIGITS[Math.floor(n / 10)]}十${n % 10 ? CN_DIGITS[n % 10] : ''}` : String(n));
/** 數量後面接量詞時，2 要唸「兩」（兩顆、兩隻），其他同 cn。 */
export const cnq = (n: number) => (n === 2 ? "兩" : cn(n));
