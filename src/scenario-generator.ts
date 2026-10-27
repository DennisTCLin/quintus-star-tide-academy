import type { GeneratedPool } from "./question-generator";
import type { LearningQuestion } from "./learning";

// Frozen, deliberately narrow v1 scenarios. Facts are given in the question,
// never inferred as general scientific or social claims from invented data.
export const SCENARIO_POOLS: GeneratedPool[] = [];
function group(
  skill: string,
  course: "chinese" | "english" | "science" | "social",
  params: number[][],
  level: (p: number[]) => 1 | 2 | 3,
) {
  for (const n of [1, 2, 3] as const)
    SCENARIO_POOLS.push({
      key: `g4-${skill}-${n}`,
      grade: 4,
      skill,
      course,
      level: n,
      params: params.filter((p) => level(p) === n),
    });
}
const routes: number[][] = [];
for (let a = 0; a < 6; a++)
  for (let b = 0; b < 6; b++)
    for (let c = 0; c < 6; c++)
      for (let d = 0; d < 6; d++) {
        if (new Set([a, b, c, d]).size !== 4) continue;
        for (let target = 0; target < 4; target++) {
          // Canonicalize unasked route details. Extraction alone is not novelty.
          const used = target === 1 ? [a, b] : [[a, b, c, d][target]];
          const rest = [0, 1, 2, 3, 4, 5].filter((x) => !used.includes(x));
          if (target === 0 && (b !== rest[0] || c !== rest[1] || d !== rest[2]))
            continue;
          if (target === 3 && (a !== rest[0] || b !== rest[1] || c !== rest[2]))
            continue;
          if (target === 1 && (c !== rest[0] || d !== rest[1])) continue;
          if (target === 2 && (a !== rest[0] || b !== rest[1] || d !== rest[2]))
            continue;
          routes.push([a, b, c, d, target]);
        }
      }
group("reading", "chinese", routes, (p) =>
  p[4] === 0 ? 1 : p[4] === 3 ? 2 : 3,
);
const english: number[][] = [];
for (let a = 1; a <= 20; a++)
  for (let b = 1; b <= 20; b++)
    for (let ask = 0; ask < 3; ask++) {
      if (
        (ask === 0 && b !== 1) ||
        (ask === 1 && a !== 1) ||
        (ask === 2 && a > b)
      )
        continue;
      english.push([a, b, ask]);
    }
group("englishread", "english", english, (p) =>
  p[2] === 0 ? 1 : p[2] === 1 ? 2 : 3,
);
const observations: number[][] = [];
for (let a = 1; a <= 12; a++)
  for (let b = 1; b <= 12; b++)
    for (let c = 1; c <= 12; c++) {
      if (new Set([a, b, c]).size === 3)
        for (let ask = 0; ask < 2; ask++) observations.push([a, b, c, ask]);
    }
group("observation", "science", observations, (p) =>
  Math.max(...p.slice(0, 3)) <= 5 ? 1 : Math.max(...p.slice(0, 3)) <= 8 ? 2 : 3,
);
const maps: number[][] = [];
for (let scale = 50; scale <= 500; scale += 25)
  for (let length = 2; length <= 20; length++) maps.push([scale, length]);
group("mapscale", "social", maps, (p) => (p[1] <= 5 ? 1 : p[1] <= 10 ? 2 : 3));
const stations = ["燈塔", "漁港", "圖書館", "學校", "公園", "碼頭"];
function choices(answer: string, distractors: string[], index: number) {
  const values = [answer, ...distractors.filter((x) => x !== answer)]
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, 4);
  const offset = index % values.length;
  const options = [...values.slice(offset), ...values.slice(0, offset)].map(
    (text) => ({ text }),
  );
  return { options, answer: options.findIndex((x) => x.text === answer) };
}
export function scenarioQuestion(
  pool: GeneratedPool,
  index: number,
  id: string,
): LearningQuestion | undefined {
  const p = pool.params[index],
    [a, b, c] = p;
  let prompt = "",
    hint = "",
    explanation = "",
    answer = "",
    wrong: string[] = [];
  if (pool.skill === "reading") {
    const route = p.slice(0, 4).map((x) => stations[x]),
      target = p[4];
    prompt = `航線說明：先到${route[0]}，再到${route[1]}，接著到${route[2]}，最後到${route[3]}。${target === 0 ? "第一站是哪裡" : target === 3 ? "最後一站是哪裡" : target === 1 ? "離開第一站後，下一站是哪裡" : "倒數第二站是哪裡"}？`;
    answer = route[target];
    wrong = route;
    hint = "注意「先、再、接著、最後」表示的順序。";
    explanation = `依序是${route.join("、")}。題目要找第 ${target + 1} 站，所以是${answer}。`;
  } else if (pool.skill === "englishread") {
    const n = c === 0 ? a : c === 1 ? b : a + b;
    prompt = `Mia has ${a} red ${a === 1 ? "shell" : "shells"} and ${b} blue ${b === 1 ? "shell" : "shells"}. ${c === 2 ? "How many shells does Mia have in total?" : `How many ${c === 0 ? "red" : "blue"} shells does Mia have?`}`;
    answer = String(n);
    wrong = [String(n + 1), String(n + 2), String(Math.max(0, n - 1))];
    hint = "red 是紅色，blue 是藍色，in total 是合計。先看問題要找哪一種。";
    explanation =
      c === 2
        ? `紅色 ${a} 個加藍色 ${b} 個，合計 ${a + b} 個。`
        : `題目問${c === 0 ? "紅色" : "藍色"}，文中對應數量是 ${n}。`;
  } else if (pool.skill === "observation") {
    const names = ["紙巾甲", "紙巾乙", "紙巾丙"],
      amounts = [a, b, c],
      target = p[3] === 0 ? Math.max(...amounts) : Math.min(...amounts);
    prompt = `觀察紀錄：三張同樣大小的紙巾，在相同時間內吸水，甲 ${a} 毫升、乙 ${b} 毫升、丙 ${c} 毫升。只依這次紀錄，哪一張吸水${p[3] === 0 ? "最多" : "最少"}？`;
    answer = names[amounts.indexOf(target)];
    wrong = names;
    hint = "比較紀錄中的三個數量。這只代表這次實驗結果。";
    explanation = `${target} 是三個數量中${p[3] === 0 ? "最大" : "最小"}的，所以這次是${answer}吸水${p[3] === 0 ? "最多" : "最少"}。`;
  } else if (pool.skill === "mapscale") {
    const n = a * b;
    prompt = `地圖的比例尺標示：圖上 1 公分代表實際 ${a} 公尺。學校到圖書館在圖上相距 ${b} 公分，實際距離是多少公尺？`;
    answer = String(n);
    wrong = [String(n + a), String(n - a), String(n + 25)];
    hint = "先找出每一公分代表的距離，再乘以圖上的公分數。";
    explanation = `${b} × ${a} = ${n}，實際距離是 ${n} 公尺。`;
  } else return;
  return {
    id,
    grade: 4,
    course: pool.course!,
    subject: pool.course as "chinese" | "english" | "science" | "social",
    prompt,
    ...choices(answer, wrong, index),
    hint,
    explanation,
    skill: pool.skill,
    level: pool.level,
  };
}
