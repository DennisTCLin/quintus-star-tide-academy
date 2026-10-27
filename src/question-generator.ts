import { SCENARIO_POOLS, scenarioQuestion } from "./scenario-generator";
import type { Grade, LearningQuestion } from "./learning";

// Frozen v1 enumeration. Never reorder these parameters; add a new version instead.
export type GeneratedPool = {
  key: string;
  grade: Grade;
  course?: "math" | "chinese" | "english" | "science" | "social";
  skill: string;
  level: 1 | 2 | 3;
  params: number[][];
};
export const GENERATED_POOLS: GeneratedPool[] = [];
const tier = (n: number, a: number, b: number): 1 | 2 | 3 =>
  n <= a ? 1 : n <= b ? 2 : 3;
function add(
  grade: Grade,
  skill: string,
  groups: number[][][],
  levelOf: (p: number[]) => 1 | 2 | 3,
) {
  for (const level of [1, 2, 3] as const)
    GENERATED_POOLS.push({
      key: `g${grade}-${skill}-${level}`,
      grade,
      skill,
      level,
      params: groups.flat().filter((p) => levelOf(p) === level),
    });
}
for (const grade of [1, 2] as const) {
  const max = grade === 1 ? 20 : 100;
  // Exclude equations already present in the legacy bank, even if history was lost.
  const legacy = new Set<string>();
  for (let i = 0; i < 30; i++) {
    const a = grade === 1 ? (i % 7) + 1 : 12 + i,
      b = grade === 1 ? (i % 3) + 1 : (i % 8) + 2;
    const op = grade === 2 && i >= 15 ? "mul" : i % 3 === 0 ? "sub" : "add";
    const x = op === "mul" ? b : a,
      y = op === "mul" ? (i % 7) + 2 : b;
    legacy.add(
      `${op}-${op === "sub" ? x : Math.min(x, y)}-${op === "sub" ? y : Math.max(x, y)}`,
    );
  }
  for (const skill of ["add", "sub", "mul"]) {
    if (grade === 1 && skill === "mul") continue;
    const params: number[][] = [];
    for (let a = 1; a <= (skill === "mul" ? 9 : max); a++)
      for (let b = 1; b <= (skill === "mul" ? a : max); b++) {
        if (skill === "add" && (a > b || a + b > max)) continue;
        if (skill === "sub" && b > a) continue;
        if (skill === "mul" && (a < 2 || b < 2)) continue;
        const sig = `${skill}-${skill === "sub" ? a : Math.min(a, b)}-${skill === "sub" ? b : Math.max(a, b)}`;
        if (!legacy.has(sig)) params.push(skill === "mul" ? [b, a] : [a, b]);
      }
    add(grade, skill, [params], (p) =>
      skill === "mul"
        ? tier(p[1], 4, 6)
        : tier(
            skill === "add" ? p[0] + p[1] : p[0],
            grade === 1 ? 10 : 30,
            grade === 1 ? 15 : 60,
          ),
    );
  }
}
for (const skill of ["mul", "div", "fraction", "area", "perimeter"]) {
  const params: number[][] = [];
  if (skill === "mul" || skill === "div") {
    for (
      let a = skill === "mul" ? 12 : 10;
      a <= (skill === "mul" ? 99 : 199);
      a++
    )
      for (let b = 2; b <= 9; b++) {
        if (
          (skill === "mul" && a === 36 && b === 7) ||
          (skill === "div" && a === 108 && b === 8)
        )
          continue;
        params.push([a, b]);
      }
  } else if (skill === "fraction") {
    for (let d = 3; d <= 12; d++)
      for (let a = 1; a < d; a++)
        for (let b = a; a + b < d; b++) {
          if (d === 8 && a === 2 && b === 3) continue;
          params.push([a, b, d]);
        }
  } else {
    for (let a = 2; a <= 99; a++)
      for (let b = 2; b <= a; b++) {
        if (skill === "perimeter" && a === 9 && b === 6) continue;
        params.push([a, b]);
      }
  }
  add(4, skill, [params], (p) =>
    skill === "fraction"
      ? tier(p[2], 5, 8)
      : tier(
          p[0],
          skill === "div" ? 50 : skill === "mul" ? 39 : 10,
          skill === "div" ? 100 : skill === "mul" ? 69 : 30,
        ),
  );
}
GENERATED_POOLS.push(...SCENARIO_POOLS);
const pools = new Map(GENERATED_POOLS.map((p) => [p.key, p]));
export const generatorPool = (key: string) => pools.get(key);
export const generatedId = (pool: GeneratedPool, index: number) =>
  `n1-${pool.key}-${index.toString(36)}`;
export { SKILL_NAMES } from "./learning-catalog";
export function generatedQuestion(id: string): LearningQuestion | undefined {
  const m =
    /^n1-(g[124]-(?:add|sub|mul|div|fraction|area|perimeter|reading|englishread|observation|mapscale)-[123])-([0-9a-z]+)$/.exec(
      id,
    );
  if (!m) return;
  const pool = pools.get(m[1]),
    index = parseInt(m[2], 36);
  if (
    !pool ||
    !Number.isSafeInteger(index) ||
    index.toString(36) !== m[2] ||
    index >= pool.params.length
  )
    return;
  if (pool.course && pool.course !== "math")
    return scenarioQuestion(pool, index, id);
  const [a, b, d] = pool.params[index];
  let answer = 0,
    prompt = "",
    hint = "",
    explanation = "",
    visual: string | undefined;
  const op = pool.skill;
  if (op === "add" || op === "sub" || op === "mul" || op === "div") {
    const x = op === "div" ? a * b : a,
      symbol =
        op === "add" ? "+" : op === "sub" ? "−" : op === "mul" ? "×" : "÷";
    answer =
      op === "add" ? a + b : op === "sub" ? a - b : op === "mul" ? a * b : a;
    prompt = `${x} ${symbol} ${b} = ?`;
    hint =
      op === "add"
        ? "先把十位和個位分開，再合起來。"
        : op === "sub"
          ? "從原來的數量拿走一些，再數剩下多少。"
          : op === "mul"
            ? "把相同的數量一組一組加起來。"
            : "想一想，除數乘幾會等於原來的數量？";
    explanation = `${x} ${symbol} ${b} = ${answer}。`;
    if (pool.grade === 1) {
      visual = `${"●".repeat(a)} ${symbol} ${"●".repeat(b)}`;
      hint = "用手指數一數，拿走或合起來。";
    }
  } else if (op === "fraction") {
    answer = a + b;
    prompt = `${a}/${d} + ${b}/${d} = ?`;
    hint = "每一份一樣大，分母不變，把分子相加。";
    explanation = `${a} + ${b} = ${answer}，所以答案是 ${answer}/${d}。`;
  } else {
    answer = op === "area" ? a * b : (a + b) * 2;
    prompt = `長方形長 ${a} 公分、寬 ${b} 公分，它的${op === "area" ? "面積是多少平方公分" : "周長是多少公分"}？`;
    hint = op === "area" ? "面積是長乘以寬。" : "周長是四條邊的總長。";
    explanation =
      op === "area"
        ? `${a} × ${b} = ${answer} 平方公分。`
        : `（${a} + ${b}）× 2 = ${answer} 公分。`;
  }
  const values = [answer];
  const bound = pool.grade === 1 ? 20 : Infinity;
  for (const delta of [1, -1, 2, -2, 10, -10, 3]) {
    const n = answer + delta;
    if (n >= 0 && n <= bound && !values.includes(n)) values.push(n);
    if (values.length === (pool.grade === 1 ? 3 : 4)) break;
  }
  const offset = (index + pool.level) % values.length;
  const options = [...values.slice(offset), ...values.slice(0, offset)].map(
    (n) => ({ text: op === "fraction" ? `${n}/${d}` : String(n) }),
  );
  return {
    id,
    grade: pool.grade,
    course: "math",
    subject: "math",
    prompt,
    visual,
    options,
    answer: options.findIndex(
      (o) => o.text === (op === "fraction" ? `${answer}/${d}` : String(answer)),
    ),
    hint,
    explanation,
    skill: op,
    level: pool.level,
  };
}
