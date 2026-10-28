import { GRADE5_NEW_EXAMS } from './grade5-new-exams';
import { GRADE5_REMAINING_EXAMS } from './grade5-remaining-exams';
import { GRADE5_DONGMEN_EXAMS } from './grade5-dongmen-exams';
import { GRADE5_MATH_EXTRA } from './grade5-math-extra';
import { GRADE5_GENERAL } from './grade5-general';
import { GRADE5_STARTER } from './grade5-starter';
import {GRADE6_SUPPLEMENT_EXAMS} from './grade6-supplement-exams';
import {GRADE6_ENGLISH_EXAMS} from './grade6-english-exams';
import {GRADE6_MATH_EXAMS} from './grade6-math-exams';
import {GRADE6_GENERAL_PRACTICE} from './grade6-general-practice';
import {GRADE2_MATH_EXAMS} from './grade2-math-exams';
import {GRADE2_CHINESE_EXAMS} from './grade2-chinese-exams';
import {GRADE1_CHINESE_EXAMS} from './grade1-chinese-exams';
import {GRADE1_MATH_EXAMS} from './grade1-math-exams';
import {GRADE1_TONES_MEDIALS_GENERATED} from './grade1-tones-medials-generated';
import { ENGLISH_EXAMS } from "./english-exams";
import { HANLIN_CHINESE_EXAMS } from "./hanlin-chinese-exams";
import { MATH_EXAMS } from "./math-exams";
import { SOCIAL_EXAMS } from "./social-exams";
import { SCIENCE_EXAMS } from "./science-exams";
import { CHINESE_EXAMS } from "./chinese-exams";
import type { ExamSource } from "./exam-sources";
import type { Publisher } from "./school-curriculum";
import { englishRephrase } from "./english-rephrases";
import { ENGLISH_FOUNDATIONS } from "./english-foundations";
import { SCIENCE_INQUIRY_V1 } from "./science-inquiry";
import { READING_CONTEXTS_V1 } from "./reading-contexts";
import { EVIDENCE_CONTEXTS_V1 } from "./evidence-contexts";
import { ENGLISH_CONTEXTS_V1 } from "./english-contexts";
import { GENERATED_POOLS, generatedQuestion } from "./question-generator";
import garden from "./data/garden.json";
import { QUESTION_BANK, type Subject } from "./questions";
import { GRADE4_STEPPED_MATH } from "./grade4-stepped-math";
export type Grade = 1 | 2 | 4 | 5 | 6;
export type Course = Subject | "words" | "tones" | "medials" | "pairs";
export type Choice = {
  text: string;
  zy?: string;
  icon?: string;
  image?: string;
  position?: number;
  audio?: string;
  end?: number;
};
export type StepChoice = {
  text: string;
  /** Diagnostic tag for wrong options — identifies the specific misconception */
  misconception?: string;
  /** Feedback shown when this wrong option is selected */
  wrongFeedback?: string;
};
export type QuestionStep = {
  prompt: string;
  options: StepChoice[];
  answer: number;
  hint?: string;
  onCorrectText?: string;
};
export type LearningQuestion = {
  id: string;
  rephraseOf?: string;
  /** Keep IDs resolvable for saved runs, but never allocate withdrawn source items. */
  retired?: boolean;
  retirementReason?: string;
  publisher?: Publisher;
  examSources?: ExamSource[];
  /** Explicitly reviewed legacy-source intersection, never inferred from publisher alone. */
  curriculumMatch?: "hwg7-u1-u2";
  hideReadingHints?: boolean;
  grade: Grade;
  course: Course;
  subject: Subject;
  prompt: string;
  promptZy?: string;
  speechText?: string;
  visual?: string;
  image?: string;
  imageAlt?: string;
  audio?: string;
  end?: number;
  options: Choice[];
  answer: number;
  hint: string;
  explanation: string;
  target?: Choice;
  skill?: string;
  level?: 1 | 2 | 3;
  format?: "short-passage";
  /** Stepped question: 'stepped' shows multi-step UI; omit or 'single' for normal */
  kind?: "single" | "stepped";
  /** Steps for stepped questions (kind='stepped') */
  steps?: QuestionStep[];
  /** Message shown after all steps are completed */
  completionText?: string;
};
const icons = [
  ["🍌", "🍎", "🍉", "🍓", "🍇", "🌽", "🎃", "🥕", "🍅"],
  ["🍞", "🥛", "🥚", "🫘🥛", "🥟", "🍞☁️", "🍙", "🍠", "🍪"],
  ["🦀", "⭐", "🐚", "🪼", "🐙", "🐢", "🐟", "🦞", "🐴🌊"],
  ["🪥", "🧺", "🧼", "🪮", "🪞", "🛁", "🩴", "🪣", "🚿"],
  ["🧱", "🚂", "✈️", "🤖", "🧸", "⚽", "🧩", "🌀", "🥁"],
  ["🎹", "🎻", "🎸", "🎺", "🎵🪵", "🪇", "🔺🎵", "🪈", "🪇"],
  ["✂️", "🧴", "🖍️", "🖊️🌈", "🎨", "🖌️", "📄", "🟤", "🌟"],
  ["🧢", "🧥", "🧥☔", "🧣", "🧤", "🧦", "🥾☔", "👗", "👖"],
  ["🦋", "🐝", "🐌", "🐜", "🪰", "🐞", "🕷️", "🦗", "🐛"],
  ["💡", "🕰️", "☎️", "🛏️", "🛌", "🎒", "🔑", "👓", "🪭"],
  ["🐰📖", "🐻🥛", "🐷🪢", "🐒🪥", "🦆☂️", "🐢🍇", "🐘🪁", "🐰🌽", "🐻⚽"],
];
export { COURSES } from "./course-catalog";
const audio = (id: string) => `/garden/audio/higgsfield/${id}.mp3`;
const recorded = (id: string) => `/garden/audio/higgsfield/${id}.mp3`;
const words = garden.themes.flatMap((theme, t) =>
  theme.items.map((item, i) => ({
    ...item,
    icon: icons[t][i],
    theme: theme.id,
  })),
);
export const LEARNING_BANK: LearningQuestion[] = [...GRADE5_NEW_EXAMS, ...GRADE5_DONGMEN_EXAMS, ...GRADE5_REMAINING_EXAMS, ...GRADE5_STARTER, ...GRADE5_MATH_EXTRA, ...GRADE5_GENERAL, ...GRADE6_MATH_EXAMS, ...GRADE6_ENGLISH_EXAMS, ...GRADE6_SUPPLEMENT_EXAMS, ...GRADE6_GENERAL_PRACTICE];
for (const grade of [1, 2] as const) {
  for (const [i, w] of words.entries()) {
    if (grade === 1 && w.theme === "camp") continue;
    const pool = words.filter((x) => x.theme === w.theme && x.id !== w.id);
    const choices = [
      w,
      ...pool.slice(i % 4, (i % 4) + (grade === 1 ? 2 : 3)),
    ].map((x) => ({
      text: x.word,
      zy: x.zy,
      icon: x.icon,
      image: `/garden/scenes/${x.theme}.png`,
      position: x.pos,
      audio: recorded(x.id),
    }));
    const offset = i % choices.length;
    const options = [...choices.slice(offset), ...choices.slice(0, offset)];
    LEARNING_BANK.push({
      id: `g${grade}-word-${w.id}`,
      grade,
      course: "words",
      subject: "chinese",
      prompt: "聽聲音，選圖片",
      promptZy: "ㄊㄧㄥ ㄕㄥ ㄧㄣ ㄒㄩㄢˇ ㄊㄨˊ ㄆㄧㄢˋ",
      audio: recorded(w.id),
      options,
      answer: options.findIndex((x) => x.text === w.word),
      hint: "先聽一次，再比較圖片。",
      explanation: w.word,
      target: choices[0],
    });
  }
  for (const w of garden.tones.filter(
    (x) => grade === 2 || [2, 3].includes(x.tone),
  )) {
    const nums = grade === 1 ? [2, 3] : [1, 2, 3, 4];
    const marks = ["―", "ˊ", "ˇ", "ˋ"];
    LEARNING_BANK.push({
      id: `g${grade}-${w.id}`,
      grade,
      course: "tones",
      subject: "chinese",
      prompt: "聽聲音，選聲調",
      promptZy: "ㄊㄧㄥ ㄕㄥ ㄧㄣ ㄒㄩㄢˇ ㄕㄥ ㄉㄧㄠˋ",
      audio: audio(w.id),
      options: nums.map((n) => ({
        text: marks[n - 1],
        icon: ["→", "↗", "↘↗", "↘"][n - 1],
      })),
      answer: nums.indexOf(w.tone),
      hint: "二聲往上走，三聲先低再高。",
      explanation: `${w.word}：${w.zy}`,
      target: { text: w.word, zy: w.zy },
    });
  }
  for (const w of garden.medials.filter(
    (x) => x.level === (grade === 1 ? "simple" : "blend"),
  )) {
    LEARNING_BANK.push({
      id: `g${grade}-${w.id}`,
      grade,
      course: "medials",
      subject: "chinese",
      prompt: grade === 1 ? "聽聲音，選ㄧ、ㄨ或ㄩ" : "聽聲音，選中間的音",
      promptZy: grade === 1 ? "ㄊㄧㄥ ㄕㄥ ㄧㄣ ㄒㄩㄢˇ ㄧ ㄨ ㄏㄨㄛˋ ㄩ" : "ㄊㄧㄥ ㄕㄥ ㄧㄣ ㄒㄩㄢˇ ㄓㄨㄥ ㄐㄧㄢ ˙ㄉㄜ ㄧㄣ",
      audio: audio(w.id),
      options: ["ㄧ", "ㄨ", "ㄩ"].map((text) => ({ text })),
      answer: ["ㄧ", "ㄨ", "ㄩ"].indexOf(w.medial),
      hint: grade === 1 ? "慢慢讀，找出ㄧ、ㄨ或ㄩ的聲音。" : "把聲音慢慢接起來，找出中間的音。",
      explanation: `${w.word}：${w.zy}`,
      target: { text: w.word, zy: w.zy },
    });
  }
  for (const w of garden.pairs) {
    const opts = [
      ...new Set(
        garden.pairs.filter((x) => x.level === w.level).map((x) => x.focus),
      ),
    ];
    LEARNING_BANK.push({
      id: `g${grade}-${w.id}`,
      grade,
      course: "pairs",
      subject: "chinese",
      prompt: "聽聲音，選注音",
      promptZy: "ㄊㄧㄥ ㄕㄥ ㄧㄣ ㄒㄩㄢˇ ㄓㄨˋ ㄧㄣ",
      audio: audio(w.id),
      options: opts.map((text) => ({ text })),
      answer: opts.indexOf(w.focus),
      hint: "聽清楚開頭和結尾，再選一次。",
      explanation: `${w.word}：${w.zy}`,
      target: { text: w.word, zy: w.zy },
    });
  }
  for (let i = 0; i < 30; i++) {
    const a = grade === 1 ? (i % 7) + 1 : 12 + i,
      b = grade === 1 ? (i % 3) + 1 : (i % 8) + 2,
      multiply = grade === 2 && i >= 15,
      subtract = i % 3 === 0;
    const answer = multiply ? b * ((i % 7) + 2) : subtract ? a - b : a + b;
    const prompt = multiply
      ? `${b} × ${(i % 7) + 2} = ?`
      : `${a} ${subtract ? "−" : "+"} ${b} = ?`;
    const nums = [
      answer,
      answer + 1,
      answer + 2,
      ...(grade === 2 ? [answer + 10] : []),
    ];
    const offset = i % nums.length;
    const options = [...nums.slice(offset), ...nums.slice(0, offset)].map(
      (n) => ({ text: String(n) }),
    );
    LEARNING_BANK.push({
      id: `g${grade}-math-${i}`,
      grade,
      course: "math",
      subject: "math",
      prompt,
      visual:
        grade === 1
          ? `${"●".repeat(a)} ${subtract ? "−" : "+"} ${"●".repeat(b)}`
          : undefined,
      options,
      answer: options.findIndex((x) => x.text === String(answer)),
      hint: grade === 1 ? "用手指數一數。" : grade === 2 && i >= 15 ? "把相同的數量一組一組加起來。" : "可以把十位和個位分開算。",
      explanation: prompt.replace("?", String(answer)),
    });
  }
}
LEARNING_BANK.push(...CHINESE_EXAMS, ...HANLIN_CHINESE_EXAMS, ...ENGLISH_EXAMS, ...SCIENCE_EXAMS, ...SOCIAL_EXAMS, ...MATH_EXAMS, ...GRADE1_MATH_EXAMS, ...GRADE1_CHINESE_EXAMS, ...GRADE2_CHINESE_EXAMS, ...GRADE2_MATH_EXAMS);
LEARNING_BANK.push(...ENGLISH_FOUNDATIONS);
LEARNING_BANK.push(...GRADE1_TONES_MEDIALS_GENERATED);
LEARNING_BANK.push(...SCIENCE_INQUIRY_V1);
LEARNING_BANK.push(...READING_CONTEXTS_V1);
LEARNING_BANK.push(...EVIDENCE_CONTEXTS_V1);
LEARNING_BANK.push(...ENGLISH_CONTEXTS_V1);
LEARNING_BANK.push(...GRADE4_STEPPED_MATH);
LEARNING_BANK.push(
  ...QUESTION_BANK.map((q) => ({
    ...q,
    grade: 4 as const,
    course: q.subject,
    options: q.options.map((text) => ({ text })),
  })),
);
export const ENGLISH_REPHRASES = [...LEARNING_BANK.filter(q=>q.grade===4 && q.course==='english'),
  ...GENERATED_POOLS.filter(p=>p.grade===4 && p.course==='english').flatMap(p=>p.params.map((_,i)=>generatedQuestion(`n1-${p.key}-${i.toString(36)}`)!))]
  .flatMap(q=>{const variant=englishRephrase(q);return variant?[variant]:[];});
// A catalog bound, not a daily reward quota. Every credited ID is also validated.
export const questionCapacity = (grade: Grade) => [...LEARNING_BANK,...ENGLISH_REPHRASES].filter(q=>q.grade===grade).length + GENERATED_POOLS.filter(p=>p.grade===grade).reduce((n,p)=>n+p.params.length,0);
const questionIndex = new Map([...LEARNING_BANK,...ENGLISH_REPHRASES].map((q) => [q.id, q]));
export const questionById = (id: string) =>
  questionIndex.get(id) ?? generatedQuestion(id);
export function selectQuestions(
  grade: Grade,
  course: Course,
  credited: string[],
  seed: number,
) {
  const pool = LEARNING_BANK.filter(
    (q) => !q.retired && !q.examSources && q.grade === grade && q.course === course,
  );
  if (pool.length < 5) throw Error("這條航線的題目還沒準備好");
  const rotated = [
    ...pool.slice(seed % pool.length),
    ...pool.slice(0, seed % pool.length),
  ];
  return rotated
    .sort(
      (a, b) =>
        Number(credited.includes(a.id)) - Number(credited.includes(b.id)),
    )
    .slice(0, 5)
    .map((q) => q.id);
}
