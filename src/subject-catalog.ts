import type { Subject } from "./core";
export type { Subject } from "./core";
export const SUBJECTS: {
  id: Subject;
  name: string;
  icon: string;
  description: string;
}[] = [
  { id: "math", name: "數學", icon: "✦", description: "計算、分數與量感" },
  { id: "chinese", name: "國語", icon: "文", description: "詞語、閱讀與表達" },
  { id: "english", name: "英文", icon: "A", description: "字彙、句型與理解" },
  { id: "science", name: "自然", icon: "☘", description: "觀察、推理與現象" },
  { id: "social", name: "社會", icon: "⌖", description: "生活、地圖與公民" },
];
