import type { LearningQuestion } from "./learning";

export const GRADE4_STEPPED_MATH: LearningQuestion[] = [
  // ── 直式乘法：23 × 4 ──
  {
    id: "g4-step-mul-23x4",
    grade: 4,
    course: "math",
    subject: "math",
    kind: "stepped",
    prompt: "用直式計算 23 × 4",
    options: [{ text: "92" }],
    answer: 0,
    hint: "先算個位，再算十位。",
    explanation: "23 × 4 = 92",
    completionText: "答對了！23 × 4 = 92",
    steps: [
      {
        prompt: "第一步：個位 3 × 4 = ?",
        options: [
          { text: "12" },
          { text: "7", misconception: "addition_not_multiplication", wrongFeedback: "3 + 4 = 7，但這裡是乘法喔！" },
          { text: "10", misconception: "rounding_error", wrongFeedback: "再算一次 3 × 4。" },
          { text: "14", misconception: "confusion_with_other_fact", wrongFeedback: "這是 2 × 7 的結果，再想想 3 × 4。" },
        ],
        answer: 0,
        onCorrectText: "3 × 4 = 12，寫 2 進 1。",
      },
      {
        prompt: "第二步：十位 2 × 4 = ?，再加進位的 1",
        options: [
          { text: "9", },
          { text: "8", misconception: "forgot_carry", wrongFeedback: "2 × 4 = 8 沒錯，但還要加進位的 1 喔！" },
          { text: "10", misconception: "wrong_carry", wrongFeedback: "進位只有 1，不是 2。" },
          { text: "6", misconception: "addition_not_multiplication", wrongFeedback: "這裡是 2 × 4 再加 1，不是 2 + 4。" },
        ],
        answer: 0,
        onCorrectText: "2 × 4 + 1 = 9，所以答案是 92！",
      },
    ],
  },

  // ── 直式乘法：36 × 7 ──
  {
    id: "g4-step-mul-36x7",
    grade: 4,
    course: "math",
    subject: "math",
    kind: "stepped",
    prompt: "用直式計算 36 × 7",
    options: [{ text: "252" }],
    answer: 0,
    hint: "先算個位，再算十位，別忘了進位。",
    explanation: "36 × 7 = 252",
    completionText: "太棒了！36 × 7 = 252",
    steps: [
      {
        prompt: "第一步：個位 6 × 7 = ?",
        options: [
          { text: "42" },
          { text: "48", misconception: "confusion_with_6x8", wrongFeedback: "6 × 8 才是 48，再想想 6 × 7。" },
          { text: "36", misconception: "confusion_with_6x6", wrongFeedback: "6 × 6 = 36，但這裡是 6 × 7。" },
          { text: "13", misconception: "addition_not_multiplication", wrongFeedback: "6 + 7 = 13，但這裡是乘法。" },
        ],
        answer: 0,
        onCorrectText: "6 × 7 = 42，寫 2 進 4。",
      },
      {
        prompt: "第二步：十位 3 × 7 = ?，再加進位的 4",
        options: [
          { text: "25" },
          { text: "21", misconception: "forgot_carry", wrongFeedback: "3 × 7 = 21 沒錯，但還要加進位的 4！" },
          { text: "24", misconception: "wrong_carry", wrongFeedback: "進位是 4 不是 3，再算一次。" },
          { text: "28", misconception: "wrong_multiplication", wrongFeedback: "3 × 7 = 21，不是 24 喔。" },
        ],
        answer: 0,
        onCorrectText: "3 × 7 + 4 = 25，答案是 252！",
      },
    ],
  },

  // ── 直式乘法：45 × 6 ──
  {
    id: "g4-step-mul-45x6",
    grade: 4,
    course: "math",
    subject: "math",
    kind: "stepped",
    prompt: "用直式計算 45 × 6",
    options: [{ text: "270" }],
    answer: 0,
    hint: "分成個位和十位，一步一步算。",
    explanation: "45 × 6 = 270",
    completionText: "45 × 6 = 270，做得好！",
    steps: [
      {
        prompt: "第一步：個位 5 × 6 = ?",
        options: [
          { text: "30" },
          { text: "11", misconception: "addition_not_multiplication", wrongFeedback: "5 + 6 = 11，但這裡是乘法。" },
          { text: "35", misconception: "confusion_with_5x7", wrongFeedback: "5 × 7 = 35，但這裡是 5 × 6。" },
          { text: "24", misconception: "confusion_with_4x6", wrongFeedback: "那是 4 × 6 的結果。" },
        ],
        answer: 0,
        onCorrectText: "5 × 6 = 30，寫 0 進 3。",
      },
      {
        prompt: "第二步：十位 4 × 6 = ?，再加進位的 3",
        options: [
          { text: "27" },
          { text: "24", misconception: "forgot_carry", wrongFeedback: "4 × 6 = 24 沒錯，但別忘了加進位的 3！" },
          { text: "30", misconception: "wrong_carry", wrongFeedback: "進位是 3，不是 6 喔。" },
          { text: "21", misconception: "wrong_multiplication", wrongFeedback: "4 × 6 是 24，不是 18。" },
        ],
        answer: 0,
        onCorrectText: "4 × 6 + 3 = 27，答案是 270！",
      },
    ],
  },

  // ── 除法：84 ÷ 4 ──
  {
    id: "g4-step-div-84d4",
    grade: 4,
    course: "math",
    subject: "math",
    kind: "stepped",
    prompt: "用直式計算 84 ÷ 4",
    options: [{ text: "21" }],
    answer: 0,
    hint: "從十位開始除，再除個位。",
    explanation: "84 ÷ 4 = 21",
    completionText: "答對了！84 ÷ 4 = 21",
    steps: [
      {
        prompt: "第一步：十位 8 ÷ 4 = ?",
        options: [
          { text: "2" },
          { text: "4", misconception: "divided_wrong_way", wrongFeedback: "8 ÷ 4 不是 4 喔，再想想。" },
          { text: "3", misconception: "estimation_error", wrongFeedback: "3 × 4 = 12，不是 8。" },
          { text: "1", misconception: "underestimate", wrongFeedback: "1 × 4 = 4，還有剩餘的 4。" },
        ],
        answer: 0,
        onCorrectText: "8 ÷ 4 = 2，十位寫 2。",
      },
      {
        prompt: "第二步：個位 4 ÷ 4 = ?",
        options: [
          { text: "1" },
          { text: "0", misconception: "confusion", wrongFeedback: "4 ÷ 4 = 1，不是 0。" },
          { text: "4", misconception: "no_division", wrongFeedback: "要除以 4，不是直接寫下來。" },
          { text: "2", misconception: "wrong_fact", wrongFeedback: "2 × 4 = 8，不是 4。" },
        ],
        answer: 0,
        onCorrectText: "4 ÷ 4 = 1，答案是 21！",
      },
    ],
  },

  // ── 除法有餘數：47 ÷ 3 ──
  {
    id: "g4-step-div-47d3",
    grade: 4,
    course: "math",
    subject: "math",
    kind: "stepped",
    prompt: "用直式計算 47 ÷ 3，求商和餘數",
    options: [{ text: "15⋯2" }],
    answer: 0,
    hint: "從十位開始，不夠除的部分留給下一位。",
    explanation: "47 ÷ 3 = 15⋯2",
    completionText: "47 ÷ 3 = 15 餘 2，很棒！",
    steps: [
      {
        prompt: "第一步：十位 4 ÷ 3，商是多少？",
        options: [
          { text: "1" },
          { text: "2", misconception: "overestimate", wrongFeedback: "2 × 3 = 6，比 4 大，不夠除。" },
          { text: "0", misconception: "underestimate", wrongFeedback: "4 裡面有 3，可以除。" },
          { text: "3", misconception: "no_division", wrongFeedback: "3 × 3 = 9，比 4 大太多了。" },
        ],
        answer: 0,
        onCorrectText: "4 ÷ 3 = 1 餘 1，餘數 1 和個位 7 合成 17。",
      },
      {
        prompt: "第二步：17 ÷ 3，商是多少？",
        options: [
          { text: "5" },
          { text: "6", misconception: "overestimate", wrongFeedback: "6 × 3 = 18，比 17 大。" },
          { text: "4", misconception: "underestimate", wrongFeedback: "4 × 3 = 12，還可以再多除一些。" },
          { text: "7", misconception: "no_division", wrongFeedback: "7 × 3 = 21，太大了。" },
        ],
        answer: 0,
        onCorrectText: "17 ÷ 3 = 5 餘 2。",
      },
      {
        prompt: "第三步：餘數是多少？",
        options: [
          { text: "2" },
          { text: "1", misconception: "wrong_remainder", wrongFeedback: "5 × 3 = 15，47 - 45 = 2。" },
          { text: "3", misconception: "remainder_equals_divisor", wrongFeedback: "餘數不能等於除數。" },
          { text: "0", misconception: "assumed_exact", wrongFeedback: "15 × 3 = 45，不是 47。" },
        ],
        answer: 0,
        onCorrectText: "47 - 45 = 2，答案是 15 餘 2！",
      },
    ],
  },

  // ── 四則混合（括號）：(12 + 8) × 3 ──
  {
    id: "g4-step-mixed-bracket1",
    grade: 4,
    course: "math",
    subject: "math",
    kind: "stepped",
    prompt: "計算 (12 + 8) × 3",
    options: [{ text: "60" }],
    answer: 0,
    hint: "先算括號裡面，再乘。",
    explanation: "(12 + 8) × 3 = 20 × 3 = 60",
    completionText: "(12 + 8) × 3 = 60！",
    steps: [
      {
        prompt: "第一步：先算括號 12 + 8 = ?",
        options: [
          { text: "20" },
          { text: "4", misconception: "subtracted", wrongFeedback: "12 - 8 = 4，但這裡是加法。" },
          { text: "128", misconception: "concatenated", wrongFeedback: "要做加法，不是拼起來。" },
          { text: "18", misconception: "miscalculation", wrongFeedback: "12 + 8 不是 18 喔，再算一次。" },
        ],
        answer: 0,
        onCorrectText: "12 + 8 = 20。",
      },
      {
        prompt: "第二步：20 × 3 = ?",
        options: [
          { text: "60" },
          { text: "23", misconception: "addition_not_multiplication", wrongFeedback: "20 + 3 = 23，但這裡是乘法。" },
          { text: "6", misconception: "ignored_zero", wrongFeedback: "別忘了 20 裡面的 0。" },
          { text: "90", misconception: "wrong_multiplication", wrongFeedback: "20 × 3 不是 90，再想想。" },
        ],
        answer: 0,
        onCorrectText: "20 × 3 = 60，答案是 60！",
      },
    ],
  },

  // ── 四則混合（先乘除後加減）：5 + 4 × 6 ──
  {
    id: "g4-step-mixed-order1",
    grade: 4,
    course: "math",
    subject: "math",
    kind: "stepped",
    prompt: "計算 5 + 4 × 6",
    options: [{ text: "29" }],
    answer: 0,
    hint: "沒有括號時，先乘除、後加減。",
    explanation: "5 + 4 × 6 = 5 + 24 = 29",
    completionText: "先乘後加，5 + 24 = 29！",
    steps: [
      {
        prompt: "第一步：先算哪個？4 × 6 = ?",
        options: [
          { text: "24" },
          { text: "54", misconception: "left_to_right", wrongFeedback: "不是先算 5 + 4 喔，要先乘除後加減。" },
          { text: "10", misconception: "addition_not_multiplication", wrongFeedback: "4 + 6 = 10，但這裡是乘法。" },
          { text: "28", misconception: "confusion_with_4x7", wrongFeedback: "4 × 7 = 28，但這裡是 4 × 6。" },
        ],
        answer: 0,
        hint: "記住：沒括號時，乘和除要先算！",
        onCorrectText: "先乘除：4 × 6 = 24。",
      },
      {
        prompt: "第二步：5 + 24 = ?",
        options: [
          { text: "29" },
          { text: "19", misconception: "subtracted", wrongFeedback: "24 - 5 = 19，但這裡是加法。" },
          { text: "30", misconception: "rounding", wrongFeedback: "5 + 24 不是 30，差一點。" },
          { text: "34", misconception: "miscalculation", wrongFeedback: "再算一次 5 + 24。" },
        ],
        answer: 0,
        onCorrectText: "5 + 24 = 29！",
      },
    ],
  },

  // ── 分數通分：1/2 + 1/3 ──
  {
    id: "g4-step-frac-add1",
    grade: 4,
    course: "math",
    subject: "math",
    kind: "stepped",
    prompt: "計算 1/2 + 1/3",
    options: [{ text: "5/6" }],
    answer: 0,
    hint: "分母不同，要先通分。",
    explanation: "1/2 + 1/3 = 3/6 + 2/6 = 5/6",
    completionText: "1/2 + 1/3 = 5/6，太強了！",
    steps: [
      {
        prompt: "第一步：2 和 3 的最小公倍數是？",
        options: [
          { text: "6" },
          { text: "5", misconception: "added_denominators", wrongFeedback: "2 + 3 = 5，但最小公倍數不是相加。" },
          { text: "12", misconception: "multiplied_extra", wrongFeedback: "12 也是公倍數，但不是最小的。" },
          { text: "3", misconception: "used_larger_denominator", wrongFeedback: "3 不是 2 的倍數喔。" },
        ],
        answer: 0,
        onCorrectText: "最小公倍數是 6。",
      },
      {
        prompt: "第二步：1/2 通分成 ?/6",
        options: [
          { text: "3/6" },
          { text: "2/6", misconception: "numerator_unchanged", wrongFeedback: "分母乘了 3，分子也要乘 3。" },
          { text: "1/6", misconception: "only_changed_denominator", wrongFeedback: "分母變了，分子也要跟著變。" },
          { text: "6/6", misconception: "wrong_multiplication", wrongFeedback: "1 × 3 = 3，不是 6。" },
        ],
        answer: 0,
        onCorrectText: "1/2 = 3/6。",
      },
      {
        prompt: "第三步：3/6 + 2/6 = ?",
        options: [
          { text: "5/6" },
          { text: "5/12", misconception: "added_denominators", wrongFeedback: "通分後分母相同，直接加分子就好。" },
          { text: "6/6", misconception: "miscalculation", wrongFeedback: "3 + 2 = 5，不是 6。" },
          { text: "1/6", misconception: "subtracted", wrongFeedback: "這裡是加法，不是減法。" },
        ],
        answer: 0,
        onCorrectText: "3/6 + 2/6 = 5/6！",
      },
    ],
  },

  // ── 直式乘法：128 × 3 ──
  {
    id: "g4-step-mul-128x3",
    grade: 4,
    course: "math",
    subject: "math",
    kind: "stepped",
    prompt: "用直式計算 128 × 3",
    options: [{ text: "384" }],
    answer: 0,
    hint: "從個位開始，一位一位算。",
    explanation: "128 × 3 = 384",
    completionText: "128 × 3 = 384！",
    steps: [
      {
        prompt: "第一步：個位 8 × 3 = ?",
        options: [
          { text: "24" },
          { text: "11", misconception: "addition_not_multiplication", wrongFeedback: "8 + 3 = 11，但這是乘法。" },
          { text: "21", misconception: "confusion_with_7x3", wrongFeedback: "7 × 3 = 21，但這裡是 8 × 3。" },
          { text: "18", misconception: "confusion_with_6x3", wrongFeedback: "6 × 3 = 18，但這裡是 8 × 3。" },
        ],
        answer: 0,
        onCorrectText: "8 × 3 = 24，寫 4 進 2。",
      },
      {
        prompt: "第二步：十位 2 × 3 = ?，再加進位的 2",
        options: [
          { text: "8" },
          { text: "6", misconception: "forgot_carry", wrongFeedback: "2 × 3 = 6，但還要加進位的 2。" },
          { text: "9", misconception: "wrong_carry", wrongFeedback: "進位是 2，不是 3。" },
          { text: "5", misconception: "addition_error", wrongFeedback: "2 × 3 + 2 = 8，不是 5。" },
        ],
        answer: 0,
        onCorrectText: "2 × 3 + 2 = 8。",
      },
      {
        prompt: "第三步：百位 1 × 3 = ?",
        options: [
          { text: "3" },
          { text: "4", misconception: "phantom_carry", wrongFeedback: "這一步沒有進位喔。" },
          { text: "13", misconception: "concatenated", wrongFeedback: "1 × 3 = 3，不用拼起來。" },
          { text: "0", misconception: "confusion", wrongFeedback: "1 × 3 = 3。" },
        ],
        answer: 0,
        onCorrectText: "1 × 3 = 3，答案是 384！",
      },
    ],
  },

  // ── 面積計算：長方形 ──
  {
    id: "g4-step-area-rect1",
    grade: 4,
    course: "math",
    subject: "math",
    kind: "stepped",
    prompt: "長方形的長是 12 公分，寬是 5 公分，面積和周長各是多少？",
    options: [{ text: "面積60，周長34" }],
    answer: 0,
    hint: "面積 = 長 × 寬，周長 = (長 + 寬) × 2。",
    explanation: "面積 = 12 × 5 = 60 平方公分，周長 = (12 + 5) × 2 = 34 公分",
    completionText: "面積 60 平方公分，周長 34 公分！",
    steps: [
      {
        prompt: "第一步：面積 = 長 × 寬 = 12 × 5 = ?",
        options: [
          { text: "60 平方公分" },
          { text: "17 平方公分", misconception: "added_not_multiplied", wrongFeedback: "面積是長乘寬，不是長加寬。" },
          { text: "34 平方公分", misconception: "used_perimeter", wrongFeedback: "那是周長的算法，面積是長 × 寬。" },
          { text: "120 平方公分", misconception: "doubled", wrongFeedback: "12 × 5 = 60，不用再乘 2。" },
        ],
        answer: 0,
        onCorrectText: "面積 = 12 × 5 = 60 平方公分。",
      },
      {
        prompt: "第二步：周長 = (長 + 寬) × 2 = (12 + 5) × 2 = ?",
        options: [
          { text: "34 公分" },
          { text: "17 公分", misconception: "forgot_times_2", wrongFeedback: "12 + 5 = 17，但周長還要乘 2。" },
          { text: "60 公分", misconception: "used_area", wrongFeedback: "那是面積，周長 = (長+寬) × 2。" },
          { text: "24 公分", misconception: "only_doubled_length", wrongFeedback: "不能只算長的兩倍，寬也要加進去。" },
        ],
        answer: 0,
        onCorrectText: "(12 + 5) × 2 = 34 公分！",
      },
    ],
  },
];
