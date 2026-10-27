import type { LearningQuestion } from './learning';
import type { ExamSource } from './exam-sources';
// Reviewed transcription; regenerate with scripts/imports/build-grade2-chinese.py.
const rows = [
  {
    "id": "cxg2-52126f88b2b1e35d",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "一-假1",
        "kind": "字音選擇改編"
      },
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "三2-假",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「暑假」的「假」，正確的注音是哪一個？",
    "options": [
      "ㄐㄧㄚˋ",
      "ㄐㄧㄚˇ",
      "ㄒㄧㄚˋ"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「暑假」的「假」讀作 ㄐㄧㄚˋ。"
  },
  {
    "id": "cxg2-749421f0e41f73cd",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "一-假2",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「假扮」的「假」，正確的注音是哪一個？",
    "options": [
      "ㄐㄧㄚˋ",
      "ㄒㄧㄚˇ",
      "ㄐㄧㄚˇ"
    ],
    "answer": 2,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「假扮」的「假」讀作 ㄐㄧㄚˇ。"
  },
  {
    "id": "cxg2-97b69da5bcba9ad6",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "一-為1",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「為了拿出更好的表演」的「為」，正確的注音是哪一個？",
    "options": [
      "ㄨㄟˇ",
      "ㄨㄟˋ",
      "ㄨㄟˊ"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「為了拿出更好的表演」的「為」讀作 ㄨㄟˋ。"
  },
  {
    "id": "cxg2-1345d04fb653c232",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "一-為2",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「成為強大的對手」的「為」，正確的注音是哪一個？",
    "options": [
      "ㄨㄟˊ",
      "ㄨㄟˋ",
      "ㄨㄟˇ"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「成為強大的對手」的「為」讀作 ㄨㄟˊ。"
  },
  {
    "id": "cxg2-79841d3e79c30f2e",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "一-賽",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「比賽」的「賽」，正確的注音是哪一個？",
    "options": [
      "ㄙㄞ",
      "ㄕㄞˋ",
      "ㄙㄞˋ"
    ],
    "answer": 2,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「比賽」的「賽」讀作 ㄙㄞˋ。"
  },
  {
    "id": "cxg2-87a0339bc9779b29",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "一-拔",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「選拔」的「拔」，正確的注音是哪一個？",
    "options": [
      "ㄅㄛˊ",
      "ㄅㄚˊ",
      "ㄅㄚ"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「選拔」的「拔」讀作 ㄅㄚˊ。"
  },
  {
    "id": "cxg2-e4dd6f68663ae30c",
    "examSources": [
      {
        "id": "g2ck2",
        "page": 1,
        "locator": "一1",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「活潑」的「潑」，正確的注音是哪一個？",
    "options": [
      "ㄆㄛ",
      "ㄅㄛ",
      "ㄆㄛˊ"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「活潑」的「潑」讀作 ㄆㄛ。"
  },
  {
    "id": "cxg2-6421b2b93319df76",
    "examSources": [
      {
        "id": "g2ck2",
        "page": 1,
        "locator": "一2-演",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「表演」的「演」，正確的注音是哪一個？",
    "options": [
      "ㄧㄢˊ",
      "ㄧㄢˋ",
      "ㄧㄢˇ"
    ],
    "answer": 2,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「表演」的「演」讀作 ㄧㄢˇ。"
  },
  {
    "id": "cxg2-33d2a99fa27f0e59",
    "examSources": [
      {
        "id": "g2ck2",
        "page": 1,
        "locator": "一2-樂",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「音樂」的「樂」，正確的注音是哪一個？",
    "options": [
      "ㄧㄠˋ",
      "ㄩㄝˋ",
      "ㄌㄜˋ"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「音樂」的「樂」讀作 ㄩㄝˋ。"
  },
  {
    "id": "cxg2-20c750c24161adff",
    "examSources": [
      {
        "id": "g2ck2",
        "page": 1,
        "locator": "一2-緩",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「緩緩站起」的「緩」，正確的注音是哪一個？",
    "options": [
      "ㄏㄨㄢˇ",
      "ㄏㄨㄢˊ",
      "ㄏㄨㄢˋ"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「緩緩站起」的「緩」讀作 ㄏㄨㄢˇ。"
  },
  {
    "id": "cxg2-04303d22f075fdb4",
    "examSources": [
      {
        "id": "g2ck2",
        "page": 1,
        "locator": "一3",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「晒太陽」的「晒」，正確的注音是哪一個？",
    "options": [
      "ㄙㄞˋ",
      "ㄕㄞ",
      "ㄕㄞˋ"
    ],
    "answer": 2,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「晒太陽」的「晒」讀作 ㄕㄞˋ。"
  },
  {
    "id": "cxg2-7f06613e5ed55f1f",
    "examSources": [
      {
        "id": "g2ck3",
        "page": 1,
        "locator": "一1",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「老師」的「師」，正確的注音是哪一個？",
    "options": [
      "ㄕˊ",
      "ㄕ",
      "ㄙ"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「老師」的「師」讀作 ㄕ。"
  },
  {
    "id": "cxg2-3c4f51cf5887444f",
    "examSources": [
      {
        "id": "g2ck3",
        "page": 1,
        "locator": "一3-餐",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「早餐」的「餐」，正確的注音是哪一個？",
    "options": [
      "ㄘㄢ",
      "ㄔㄢ",
      "ㄘㄢˊ"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「早餐」的「餐」讀作 ㄘㄢ。"
  },
  {
    "id": "cxg2-bc08d5477b5508c8",
    "examSources": [
      {
        "id": "g2ck3",
        "page": 1,
        "locator": "一3-煎",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「煎蛋」的「煎」，正確的注音是哪一個？",
    "options": [
      "ㄐㄧㄢˇ",
      "ㄑㄧㄢ",
      "ㄐㄧㄢ"
    ],
    "answer": 2,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「煎蛋」的「煎」讀作 ㄐㄧㄢ。"
  },
  {
    "id": "cxg2-25b265b915dc52e2",
    "examSources": [
      {
        "id": "g2ck3",
        "page": 1,
        "locator": "一3-還",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「還有番茄片」的「還」，正確的注音是哪一個？",
    "options": [
      "ㄏㄞˋ",
      "ㄏㄞˊ",
      "ㄏㄨㄢˊ"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「還有番茄片」的「還」讀作 ㄏㄞˊ。"
  },
  {
    "id": "cxg2-96b433c02c37b89a",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "三1-還",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「還書」的「還」，正確的注音是哪一個？",
    "options": [
      "ㄏㄨㄢˊ",
      "ㄏㄞˊ",
      "ㄏㄨㄢˋ"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「還書」的「還」讀作 ㄏㄨㄢˊ。"
  },
  {
    "id": "cxg2-5dd4d9b9156f17e2",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "二1-捧",
        "kind": "字詞句意選擇改編"
      },
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "三3-捧",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "新娘拿著「ㄆㄥˇ」花。應填哪個國字？",
    "options": [
      "棒",
      "碰",
      "捧"
    ],
    "answer": 2,
    "hideReadingHints": true,
    "speechText": "新娘拿著「ㄆㄥˇ」花。應填哪個國字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「捧」。"
  },
  {
    "id": "cxg2-22fc0789c20510c1",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "二1-往",
        "kind": "字詞句意選擇改編"
      },
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "三4-往",
        "kind": "字詞句意選擇改編"
      },
      {
        "id": "g2ck7",
        "page": 2,
        "locator": "四5",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "慢慢「ㄨㄤˇ」前走。應填哪個國字？",
    "options": [
      "旺",
      "往",
      "住"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "慢慢「ㄨㄤˇ」前走。應填哪個國字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「往」。"
  },
  {
    "id": "cxg2-6ae9456659ce9da2",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "二2-師",
        "kind": "字詞句意選擇改編"
      },
      {
        "id": "g2ck5",
        "page": 1,
        "locator": "二4",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "老□教我讀書。空格應填哪個字？",
    "options": [
      "師",
      "帥",
      "獅"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "老空格教我讀書。空格應填哪個字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「師」。"
  },
  {
    "id": "cxg2-eca77868002e83b1",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "二2-識",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "老師教我知「ㄕˋ」。應填哪個國字？",
    "options": [
      "事",
      "是",
      "識"
    ],
    "answer": 2,
    "hideReadingHints": true,
    "speechText": "老師教我知「ㄕˋ」。應填哪個國字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「識」。"
  },
  {
    "id": "cxg2-a4811361a6cd5586",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "二3-番",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "奶奶做「ㄈㄢ」茄炒蛋。應填哪個國字？",
    "options": [
      "飯",
      "番",
      "翻"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "奶奶做「ㄈㄢ」茄炒蛋。應填哪個國字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「番」。"
  },
  {
    "id": "cxg2-244ec35844ba4d0c",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "二3-蛋",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "奶奶做番茄炒「ㄉㄢˋ」。應填哪個國字？",
    "options": [
      "蛋",
      "淡",
      "但"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "奶奶做番茄炒「ㄉㄢˋ」。應填哪個國字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「蛋」。"
  },
  {
    "id": "cxg2-08c972c1a97530e2",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "二5-書",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "漫畫放在「ㄕㄨ」架上。應填哪個國字？",
    "options": [
      "輸",
      "叔",
      "書"
    ],
    "answer": 2,
    "hideReadingHints": true,
    "speechText": "漫畫放在「ㄕㄨ」架上。應填哪個國字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「書」。"
  },
  {
    "id": "cxg2-0f29b0f26eb21e3c",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "二5-籃",
        "kind": "字詞句意選擇改編"
      },
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "三2-籃",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "「ㄌㄢˊ」球高手。應填哪個國字？",
    "options": [
      "蘭",
      "籃",
      "藍"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "「ㄌㄢˊ」球高手。應填哪個國字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「籃」。"
  },
  {
    "id": "cxg2-50daaa87228c932b",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "二6-帶",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "媽媽「ㄉㄞˋ」全家人去河邊。應填哪個國字？",
    "options": [
      "帶",
      "待",
      "代"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "媽媽「ㄉㄞˋ」全家人去河邊。應填哪個國字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「帶」。"
  },
  {
    "id": "cxg2-365fa8599a73ab8a",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "二6-划",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "大家一起「ㄏㄨㄚˊ」龍舟。應填哪個國字？",
    "options": [
      "滑",
      "華",
      "划"
    ],
    "answer": 2,
    "hideReadingHints": true,
    "speechText": "大家一起「ㄏㄨㄚˊ」龍舟。應填哪個國字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「划」。"
  },
  {
    "id": "cxg2-d5219815a2f78efd",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "三1",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "節慶送禮時，「柿子」常代表哪句祝福？",
    "options": [
      "平平安安",
      "事事如意",
      "年年有餘"
    ],
    "answer": 1,
    "hideReadingHints": false,
    "speechText": "節慶送禮時，「柿子」常代表哪句祝福？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「事事如意」。"
  },
  {
    "id": "cxg2-48df3f8164127630",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "三2",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "節慶送禮時，「蘋果」常代表哪句祝福？",
    "options": [
      "平平安安",
      "大吉大利",
      "好運旺來"
    ],
    "answer": 0,
    "hideReadingHints": false,
    "speechText": "節慶送禮時，「蘋果」常代表哪句祝福？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「平平安安」。"
  },
  {
    "id": "cxg2-54589b628fca3ce2",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "三3",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "節慶送禮時，「橘子」常代表哪句祝福？",
    "options": [
      "事事如意",
      "年年有餘",
      "大吉大利"
    ],
    "answer": 2,
    "hideReadingHints": false,
    "speechText": "節慶送禮時，「橘子」常代表哪句祝福？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「大吉大利」。"
  },
  {
    "id": "cxg2-102ce80cad5806c8",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "三4",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "節慶送禮時，「鳳梨」常代表哪句祝福？",
    "options": [
      "年年有餘",
      "好運旺來",
      "平平安安"
    ],
    "answer": 1,
    "hideReadingHints": false,
    "speechText": "節慶送禮時，「鳳梨」常代表哪句祝福？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「好運旺來」。"
  },
  {
    "id": "cxg2-44dd742c0e602f15",
    "examSources": [
      {
        "id": "g2ck1",
        "page": 1,
        "locator": "三5",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "節慶送禮時，「魚」常代表哪句祝福？",
    "options": [
      "年年有餘",
      "事事如意",
      "大吉大利"
    ],
    "answer": 0,
    "hideReadingHints": false,
    "speechText": "節慶送禮時，「魚」常代表哪句祝福？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「年年有餘」。"
  },
  {
    "id": "cxg2-5ecf2bc8b7335ff0",
    "examSources": [
      {
        "id": "g2ck2",
        "page": 1,
        "locator": "二1",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "桌上的紅「ㄅㄧˇ」是誰的？應填哪個國字？",
    "options": [
      "比",
      "彼",
      "筆"
    ],
    "answer": 2,
    "hideReadingHints": true,
    "speechText": "桌上的紅「ㄅㄧˇ」是誰的？應填哪個國字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「筆」。"
  },
  {
    "id": "cxg2-7ee228e0e15f0e3f",
    "examSources": [
      {
        "id": "g2ck2",
        "page": 1,
        "locator": "二2",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "哥哥打鼓的「ㄧㄤˋ」子好神氣。應填哪個國字？",
    "options": [
      "養",
      "樣",
      "漾"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "哥哥打鼓的「ㄧㄤˋ」子好神氣。應填哪個國字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「樣」。"
  },
  {
    "id": "cxg2-387e47268d46277f",
    "examSources": [
      {
        "id": "g2ck2",
        "page": 1,
        "locator": "二3",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "今天去參觀蝴「ㄉㄧㄝˊ」館。應填哪個國字？",
    "options": [
      "蝶",
      "碟",
      "牒"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "今天去參觀蝴「ㄉㄧㄝˊ」館。應填哪個國字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「蝶」。"
  },
  {
    "id": "cxg2-6306ad0c3a0fa51b",
    "examSources": [
      {
        "id": "g2ck2",
        "page": 1,
        "locator": "二4",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "他在紙上「ㄏㄨㄚˋ」了圖案。應填哪個國字？",
    "options": [
      "化",
      "話",
      "畫"
    ],
    "answer": 2,
    "hideReadingHints": true,
    "speechText": "他在紙上「ㄏㄨㄚˋ」了圖案。應填哪個國字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「畫」。"
  },
  {
    "id": "cxg2-2209ad15c59344bc",
    "examSources": [
      {
        "id": "g2ck2",
        "page": 1,
        "locator": "三1",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "她跌倒撞到腳，疼得（　）叫。",
    "options": [
      "娃娃",
      "哇哇"
    ],
    "answer": 1,
    "hideReadingHints": false,
    "speechText": "她跌倒撞到腳，疼得（　）叫。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「哇哇」。"
  },
  {
    "id": "cxg2-a20adad2b590e637",
    "examSources": [
      {
        "id": "g2ck2",
        "page": 1,
        "locator": "三2-1",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "媽媽做了糕餅，要送給（　）品嘗。",
    "options": [
      "親朋好友",
      "事事如意"
    ],
    "answer": 0,
    "hideReadingHints": false,
    "speechText": "媽媽做了糕餅，要送給（　）品嘗。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「親朋好友」。"
  },
  {
    "id": "cxg2-9b181c2f692295bd",
    "examSources": [
      {
        "id": "g2ck2",
        "page": 1,
        "locator": "三2-2",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "賀年卡上寫著：祝您（　）。",
    "options": [
      "親朋好友",
      "事事如意"
    ],
    "answer": 1,
    "hideReadingHints": false,
    "speechText": "賀年卡上寫著：祝您（　）。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「事事如意」。"
  },
  {
    "id": "cxg2-69364de19a978981",
    "examSources": [
      {
        "id": "g2ck3",
        "page": 1,
        "locator": "三1",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "「重」加「力」可以組成哪個字？",
    "options": [
      "童",
      "動",
      "種"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "「重」加「力」可以組成哪個字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「動」。"
  },
  {
    "id": "cxg2-35e1359135c821ab",
    "examSources": [
      {
        "id": "g2ck3",
        "page": 1,
        "locator": "三2",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "「取」加「女」可以組成哪個字？",
    "options": [
      "娶",
      "趣",
      "最"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "「取」加「女」可以組成哪個字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「娶」。"
  },
  {
    "id": "cxg2-02202e4b33e9d6cc",
    "examSources": [
      {
        "id": "g2ck3",
        "page": 1,
        "locator": "三3",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "「日」加「者」可以組成哪個字？",
    "options": [
      "署",
      "都",
      "暑"
    ],
    "answer": 2,
    "hideReadingHints": true,
    "speechText": "「日」加「者」可以組成哪個字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「暑」。"
  },
  {
    "id": "cxg2-2285c5da2463dfb8",
    "examSources": [
      {
        "id": "g2ck3",
        "page": 1,
        "locator": "三4",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "「立」加「占」可以組成哪個字？",
    "options": [
      "店",
      "站",
      "貼"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "「立」加「占」可以組成哪個字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「站」。"
  },
  {
    "id": "cxg2-210c6057436fec93",
    "examSources": [
      {
        "id": "g2ck3",
        "page": 1,
        "locator": "三5",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "「鬥」裡面加上「市」可以組成哪個字？",
    "options": [
      "鬧",
      "閃",
      "間"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "「鬥」裡面加上「市」可以組成哪個字？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「鬧」的外部是「鬥」，裡面是「市」；外部不是「門」。"
  },
  {
    "id": "cxg2-a4d0734fef7aed4b",
    "examSources": [
      {
        "id": "g2ck3",
        "page": 2,
        "locator": "五5",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "大家「協力」把木頭桌搬進屋裡。「協力」能換成哪個詞？",
    "options": [
      "熱力",
      "合力",
      "心力",
      "活力"
    ],
    "answer": 1,
    "hideReadingHints": false,
    "speechText": "大家「協力」把木頭桌搬進屋裡。「協力」能換成哪個詞？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "協力是共同出力，與「合力」意思相近。"
  },
  {
    "id": "cxg2-c47b0ff35371b791",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "三1-叔",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "□叔要到附近的圖書館還書。",
    "options": [
      "叔",
      "淑"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "空格叔要到附近的圖書館還書。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「叔」。"
  },
  {
    "id": "cxg2-263fa7d8fffddabe",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "三1-近",
        "kind": "字詞句意選擇改編"
      },
      {
        "id": "g2ck5",
        "page": 1,
        "locator": "二2",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "叔叔要到附□的圖書館。",
    "options": [
      "進",
      "近"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "叔叔要到附空格的圖書館。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「近」。"
  },
  {
    "id": "cxg2-bb3ed9276db2fd1e",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "三3-哇",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "□！這位新娘的捧花好漂亮。",
    "options": [
      "哇",
      "蛙"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "空格！這位新娘的捧花好漂亮。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「哇」。"
  },
  {
    "id": "cxg2-20098209682ba993",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "三3-娘",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "這位新□的捧花好漂亮。",
    "options": [
      "浪",
      "娘"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "這位新空格的捧花好漂亮。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「娘」。"
  },
  {
    "id": "cxg2-4b262af2a4c3fded",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "三4-園",
        "kind": "字詞句意選擇改編"
      },
      {
        "id": "g2ck6",
        "page": 1,
        "locator": "三1-園",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "前往花□的遊客請小心慢行。",
    "options": [
      "園",
      "圓"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "前往花空格的遊客請小心慢行。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「園」。"
  },
  {
    "id": "cxg2-c5b57d6c7fc317f8",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "四1",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "「演出」的意思接近哪個詞？",
    "options": [
      "作業",
      "力量",
      "表演"
    ],
    "answer": 2,
    "hideReadingHints": false,
    "speechText": "「演出」的意思接近哪個詞？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「表演」。"
  },
  {
    "id": "cxg2-873b678f70123cd3",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "四2",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "「功課」的意思接近哪個詞？",
    "options": [
      "從前",
      "作業",
      "表演"
    ],
    "answer": 1,
    "hideReadingHints": false,
    "speechText": "「功課」的意思接近哪個詞？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「作業」。"
  },
  {
    "id": "cxg2-a479e9ed146d44c7",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "四3",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "「力氣」的意思接近哪個詞？",
    "options": [
      "力量",
      "漂亮",
      "作業"
    ],
    "answer": 0,
    "hideReadingHints": false,
    "speechText": "「力氣」的意思接近哪個詞？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「力量」。"
  },
  {
    "id": "cxg2-ae9b846d8e44108c",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "四4",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "「美麗」的意思接近哪個詞？",
    "options": [
      "從前",
      "力量",
      "漂亮"
    ],
    "answer": 2,
    "hideReadingHints": false,
    "speechText": "「美麗」的意思接近哪個詞？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「漂亮」。"
  },
  {
    "id": "cxg2-507c6e6a01f4fb7f",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "四5",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "「以前」的意思接近哪個詞？",
    "options": [
      "作業",
      "從前",
      "表演"
    ],
    "answer": 1,
    "hideReadingHints": false,
    "speechText": "「以前」的意思接近哪個詞？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「從前」。"
  },
  {
    "id": "cxg2-15d1e4f856ab1ab0",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "五1",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "品嘗好吃的（　）。",
    "options": [
      "甜點",
      "電影",
      "歌曲"
    ],
    "answer": 0,
    "hideReadingHints": false,
    "speechText": "品嘗好吃的（　）。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「甜點」。"
  },
  {
    "id": "cxg2-be9fee1858b47d4b",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "五2",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "觀賞精彩的（　）。",
    "options": [
      "甜點",
      "櫃子",
      "電影"
    ],
    "answer": 2,
    "hideReadingHints": false,
    "speechText": "觀賞精彩的（　）。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「電影」。"
  },
  {
    "id": "cxg2-4084900060b4cda0",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 1,
        "locator": "五5",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "聆聽悅耳的（　）。",
    "options": [
      "櫃子",
      "歌曲",
      "課本"
    ],
    "answer": 1,
    "hideReadingHints": false,
    "speechText": "聆聽悅耳的（　）。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「歌曲」。"
  },
  {
    "id": "cxg2-67723522722cba8f",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 2,
        "locator": "六1",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "「冬天來了，動物忙著儲存食物。」動物儲存食物的原因是什麼？",
    "options": [
      "動物忙著儲存食物",
      "冬天來了"
    ],
    "answer": 1,
    "hideReadingHints": false,
    "speechText": "「冬天來了，動物忙著儲存食物。」動物儲存食物的原因是什麼？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "因為冬天來了，所以動物忙著儲存食物。"
  },
  {
    "id": "cxg2-84e7e1bf7b17e1fb",
    "examSources": [
      {
        "id": "g2ck4",
        "page": 2,
        "locator": "六2",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "「我考了一百分，因為我每天認真複習。」考一百分的原因是什麼？",
    "options": [
      "每天認真複習",
      "考了一百分"
    ],
    "answer": 0,
    "hideReadingHints": false,
    "speechText": "「我考了一百分，因為我每天認真複習。」考一百分的原因是什麼？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「因為」後面說明原因：每天認真複習。"
  },
  {
    "id": "cxg2-b1adebe370403b64",
    "examSources": [
      {
        "id": "g2ck5",
        "page": 2,
        "locator": "三1-為",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「弟弟以為自己中獎了」的「為」，正確的注音是哪一個？",
    "options": [
      "ㄨㄟˋ",
      "ㄨㄟˊ"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「弟弟以為自己中獎了」的「為」讀作 ㄨㄟˊ。"
  },
  {
    "id": "cxg2-95594fdfc6fb35f5",
    "examSources": [
      {
        "id": "g2ck5",
        "page": 2,
        "locator": "三1-中",
        "kind": "字音選擇改編"
      },
      {
        "id": "g2ck7",
        "page": 1,
        "locator": "二1-中2",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「弟弟以為自己中獎了」的「中」，正確的注音是哪一個？",
    "options": [
      "ㄓㄨㄥˋ",
      "ㄓㄨㄥ"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「弟弟以為自己中獎了」的「中」讀作 ㄓㄨㄥˋ。"
  },
  {
    "id": "cxg2-2a8a956db2ccc1ce",
    "examSources": [
      {
        "id": "g2ck5",
        "page": 2,
        "locator": "三2-中",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「今天中午」的「中」，正確的注音是哪一個？",
    "options": [
      "ㄓㄨㄥˋ",
      "ㄓㄨㄥ"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「今天中午」的「中」讀作 ㄓㄨㄥ。"
  },
  {
    "id": "cxg2-8be8c77edc987e31",
    "examSources": [
      {
        "id": "g2ck5",
        "page": 2,
        "locator": "三2-還1",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「我要跟同學去還器材」的「還」，正確的注音是哪一個？",
    "options": [
      "ㄏㄨㄢˊ",
      "ㄏㄞˊ"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「我要跟同學去還器材」的「還」讀作 ㄏㄨㄢˊ。"
  },
  {
    "id": "cxg2-e62b97392e4bceef",
    "examSources": [
      {
        "id": "g2ck5",
        "page": 2,
        "locator": "三2-還2",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「還要記得去裝水」的「還」，正確的注音是哪一個？",
    "options": [
      "ㄏㄨㄢˊ",
      "ㄏㄞˊ"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「還要記得去裝水」的「還」讀作 ㄏㄞˊ。"
  },
  {
    "id": "cxg2-4c9fdfaefa9228c1",
    "examSources": [
      {
        "id": "g2ck5",
        "page": 2,
        "locator": "三3-為",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「我今天因為持續嘔吐而請假」的「為」，正確的注音是哪一個？",
    "options": [
      "ㄨㄟˋ",
      "ㄨㄟˊ"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「我今天因為持續嘔吐而請假」的「為」讀作 ㄨㄟˋ。"
  },
  {
    "id": "cxg2-66704ee5ad6bb3ac",
    "examSources": [
      {
        "id": "g2ck5",
        "page": 2,
        "locator": "三3-吐",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「嘔吐」的「吐」，正確的注音是哪一個？",
    "options": [
      "ㄊㄨˇ",
      "ㄊㄨˋ"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「嘔吐」的「吐」讀作 ㄊㄨˋ。"
  },
  {
    "id": "cxg2-fe2fb9e7f9eb6405",
    "examSources": [
      {
        "id": "g2ck5",
        "page": 2,
        "locator": "三3-假",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「向學校請假一天」的「假」，正確的注音是哪一個？",
    "options": [
      "ㄐㄧㄚˋ",
      "ㄐㄧㄚˇ"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「向學校請假一天」的「假」讀作 ㄐㄧㄚˋ。"
  },
  {
    "id": "cxg2-69dfe4d306546964",
    "examSources": [
      {
        "id": "g2ck5",
        "page": 2,
        "locator": "三4-切1",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「店員親切地對我說」的「切」，正確的注音是哪一個？",
    "options": [
      "ㄑㄧㄝ",
      "ㄑㄧㄝˋ"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「店員親切地對我說」的「切」讀作 ㄑㄧㄝˋ。"
  },
  {
    "id": "cxg2-084838a003eafea8",
    "examSources": [
      {
        "id": "g2ck5",
        "page": 2,
        "locator": "三4-假",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「假如你覺得牛排太大了」的「假」，正確的注音是哪一個？",
    "options": [
      "ㄐㄧㄚˇ",
      "ㄐㄧㄚˋ"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「假如你覺得牛排太大了」的「假」讀作 ㄐㄧㄚˇ。"
  },
  {
    "id": "cxg2-aff3e6eeb66b5bf2",
    "examSources": [
      {
        "id": "g2ck5",
        "page": 2,
        "locator": "三4-切2",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「把牛排切成一口大小」的「切」，正確的注音是哪一個？",
    "options": [
      "ㄑㄧㄝˋ",
      "ㄑㄧㄝ"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「把牛排切成一口大小」的「切」讀作 ㄑㄧㄝ。"
  },
  {
    "id": "cxg2-a62eb3ee366d34cb",
    "examSources": [
      {
        "id": "g2ck5",
        "page": 1,
        "locator": "二1",
        "kind": "字詞句意選擇改編"
      },
      {
        "id": "g2ck7",
        "page": 2,
        "locator": "四2",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "白雲在天空中□動。",
    "options": [
      "飄",
      "漂"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "白雲在天空中空格動。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「飄」。"
  },
  {
    "id": "cxg2-26e05a3cfe1960a2",
    "examSources": [
      {
        "id": "g2ck5",
        "page": 1,
        "locator": "二3",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "上課鐘響了，快回到位子上□好。",
    "options": [
      "座",
      "坐"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "上課鐘響了，快回到位子上空格好。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「坐」。"
  },
  {
    "id": "cxg2-4044a98be6905f72",
    "examSources": [
      {
        "id": "g2ck5",
        "page": 2,
        "locator": "二5",
        "kind": "字詞句意選擇改編"
      },
      {
        "id": "g2ck6",
        "page": 1,
        "locator": "二2",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "妹妹打□得就像一位新娘。",
    "options": [
      "扮",
      "半"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "妹妹打空格得就像一位新娘。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「扮」。"
  },
  {
    "id": "cxg2-13611b9fa2a00cc7",
    "examSources": [
      {
        "id": "g2ck6",
        "page": 1,
        "locator": "二1",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "我□前很喜歡吃巧克力。",
    "options": [
      "已",
      "以"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "我空格前很喜歡吃巧克力。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「以」。"
  },
  {
    "id": "cxg2-81b127fd6b3e5de9",
    "examSources": [
      {
        "id": "g2ck6",
        "page": 1,
        "locator": "二3",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "我們要同心□力，一起完成比賽！",
    "options": [
      "協",
      "拹"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "我們要同心空格力，一起完成比賽！",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「協」。"
  },
  {
    "id": "cxg2-6136b4d9b4ddc902",
    "examSources": [
      {
        "id": "g2ck6",
        "page": 1,
        "locator": "二4",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "妹妹很喜歡童話裡的城□。",
    "options": [
      "保",
      "堡"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "妹妹很喜歡童話裡的城空格。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「堡」。"
  },
  {
    "id": "cxg2-0ae821d65862a203",
    "examSources": [
      {
        "id": "g2ck6",
        "page": 1,
        "locator": "二5",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "我買柿餅送爺爺，祝他事事如□。",
    "options": [
      "意",
      "億"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "我買柿餅送爺爺，祝他事事如空格。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「意」。"
  },
  {
    "id": "cxg2-ae8e9da860b5266c",
    "examSources": [
      {
        "id": "g2ck6",
        "page": 1,
        "locator": "三1-原",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "□本我們要去花園吃圓形的蛋糕。",
    "options": [
      "圓",
      "原",
      "園"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "空格本我們要去花園吃圓形的蛋糕。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「原」。"
  },
  {
    "id": "cxg2-50be082c3580f792",
    "examSources": [
      {
        "id": "g2ck6",
        "page": 1,
        "locator": "三1-圓",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "原本我們要去花園吃□形的蛋糕。",
    "options": [
      "圓",
      "園",
      "原"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "原本我們要去花園吃空格形的蛋糕。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「圓」。"
  },
  {
    "id": "cxg2-f3ed4a52c0cccfea",
    "examSources": [
      {
        "id": "g2ck6",
        "page": 1,
        "locator": "三2-進",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "請大家走□自然科學博物館來參觀最近的環保展。",
    "options": [
      "近",
      "進"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "請大家走空格自然科學博物館來參觀最近的環保展。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「進」。"
  },
  {
    "id": "cxg2-8afa5c98cf380931",
    "examSources": [
      {
        "id": "g2ck6",
        "page": 1,
        "locator": "三2-近",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "請大家走進自然科學博物館來參觀最□的環保展。",
    "options": [
      "近",
      "進"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "請大家走進自然科學博物館來參觀最空格的環保展。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「近」。"
  },
  {
    "id": "cxg2-830121592cd7e9b1",
    "examSources": [
      {
        "id": "g2ck6",
        "page": 1,
        "locator": "三3-事",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "該做的□要認真做，這是常識。",
    "options": [
      "識",
      "事"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "該做的空格要認真做，這是常識。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「事」。"
  },
  {
    "id": "cxg2-6af0f57404040a96",
    "examSources": [
      {
        "id": "g2ck6",
        "page": 1,
        "locator": "三3-識",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "該做的事要認真做，這是常□。",
    "options": [
      "識",
      "事"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "該做的事要認真做，這是常空格。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「識」。"
  },
  {
    "id": "cxg2-b77300d50eac23fe",
    "examSources": [
      {
        "id": "g2ck7",
        "page": 2,
        "locator": "四1",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "□堡裡有一位長髮公主。",
    "options": [
      "成",
      "城"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "空格堡裡有一位長髮公主。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「城」。"
  },
  {
    "id": "cxg2-fd677f137adb1b46",
    "examSources": [
      {
        "id": "g2ck7",
        "page": 2,
        "locator": "四3",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "越南有很多池□和水田。",
    "options": [
      "塘",
      "唐"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "越南有很多池空格和水田。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「塘」。"
  },
  {
    "id": "cxg2-02b07588e8971f06",
    "examSources": [
      {
        "id": "g2ck7",
        "page": 2,
        "locator": "四4",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "牆角有一隻小□在睡覺。",
    "options": [
      "喵",
      "貓"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "牆角有一隻小空格在睡覺。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「貓」。"
  },
  {
    "id": "cxg2-e6ae544eb096c16a",
    "examSources": [
      {
        "id": "g2ck7",
        "page": 2,
        "locator": "四6",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "菜□裡有好多食材。",
    "options": [
      "籃",
      "藍"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "菜空格裡有好多食材。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「籃」。"
  },
  {
    "id": "cxg2-a5573af84e4585dc",
    "examSources": [
      {
        "id": "g2ck7",
        "page": 1,
        "locator": "二3-暑",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "我的□假作業要畫一張海報。",
    "options": [
      "署",
      "暑"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "我的空格假作業要畫一張海報。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「暑」。"
  },
  {
    "id": "cxg2-d2856422b9bf7de3",
    "examSources": [
      {
        "id": "g2ck7",
        "page": 1,
        "locator": "二3-畫",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "我的暑假作業要□一張海報。",
    "options": [
      "畫",
      "書"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "我的暑假作業要空格一張海報。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「畫」。"
  },
  {
    "id": "cxg2-feddaa2b9a85c1e8",
    "examSources": [
      {
        "id": "g2ck7",
        "page": 1,
        "locator": "二6-進",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "下雨了，我趕緊□來躲雨。",
    "options": [
      "近",
      "進"
    ],
    "answer": 1,
    "hideReadingHints": true,
    "speechText": "下雨了，我趕緊空格來躲雨。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "正確答案是「進」。"
  },
  {
    "id": "cxg2-aa153b462c282a3f",
    "examSources": [
      {
        "id": "g2ck6",
        "page": 1,
        "locator": "六1",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "看了精彩的表演後拍手，說「大力拍手」和「用力拍手」，意思相近嗎？",
    "options": [
      "相近",
      "不相近"
    ],
    "answer": 0,
    "hideReadingHints": false,
    "speechText": "看了精彩的表演後拍手，說「大力拍手」和「用力拍手」，意思相近嗎？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "兩者都表示拍手時使出力氣。"
  },
  {
    "id": "cxg2-172db16635912d37",
    "examSources": [
      {
        "id": "g2ck6",
        "page": 1,
        "locator": "六2",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "「慢慢地走過小巷」和「快速地走過小巷」，意思相近嗎？",
    "options": [
      "相近",
      "不相近"
    ],
    "answer": 1,
    "hideReadingHints": false,
    "speechText": "「慢慢地走過小巷」和「快速地走過小巷」，意思相近嗎？",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「慢慢地」速度慢，「快速地」速度快。"
  },
  {
    "id": "cxg2-e27f2c568291e3c8",
    "examSources": [
      {
        "id": "g2ck7",
        "page": 1,
        "locator": "二1-中1",
        "kind": "字音選擇改編"
      }
    ],
    "course": "pairs",
    "prompt": "「叔叔在下班途中」的「中」，正確的注音是哪一個？",
    "options": [
      "ㄓㄨㄥ",
      "ㄓㄨㄥˋ"
    ],
    "answer": 0,
    "hideReadingHints": true,
    "speechText": "請看畫面中的詞句，選出標示字的正確注音。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「叔叔在下班途中」的「中」讀作 ㄓㄨㄥ。"
  },
  {
    "id": "cxg2-40602802e32abca1",
    "examSources": [
      {
        "id": "g2ck7",
        "page": 1,
        "locator": "二4-正在",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "媽媽（　）陽台上曬衣服，突然被鞭炮聲嚇到。",
    "options": [
      "正要",
      "正在"
    ],
    "answer": 1,
    "hideReadingHints": false,
    "speechText": "媽媽（　）陽台上曬衣服，突然被鞭炮聲嚇到。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「正在」表示動作進行中。"
  },
  {
    "id": "cxg2-55866b96f9c4e98d",
    "examSources": [
      {
        "id": "g2ck7",
        "page": 1,
        "locator": "二4-原來",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "媽媽曬衣服時聽到鞭炮聲，（　）今天是鄰居嫁新娘的好日子。",
    "options": [
      "原來",
      "因此"
    ],
    "answer": 0,
    "hideReadingHints": false,
    "speechText": "媽媽曬衣服時聽到鞭炮聲，（　）今天是鄰居嫁新娘的好日子。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「原來」表示發現先前不知道的原因。"
  },
  {
    "id": "cxg2-0464fb134e474b82",
    "examSources": [
      {
        "id": "g2ck7",
        "page": 1,
        "locator": "二5",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "（　）身材瘦小的她，食量竟然這麼大。",
    "options": [
      "為什麼",
      "沒想到"
    ],
    "answer": 1,
    "hideReadingHints": false,
    "speechText": "（　）身材瘦小的她，食量竟然這麼大。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「沒想到」和「竟然」表達出乎意料。"
  },
  {
    "id": "cxg2-744707addf111d8c",
    "examSources": [
      {
        "id": "g2ck7",
        "page": 1,
        "locator": "二6-不過",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "天氣預報說今天是晴天，（　）下午還是下起了雨。",
    "options": [
      "不過",
      "所以"
    ],
    "answer": 0,
    "hideReadingHints": false,
    "speechText": "天氣預報說今天是晴天，（　）下午還是下起了雨。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「不過」表示轉折，實際天氣與預報不同。"
  },
  {
    "id": "cxg2-f24961858ed10a97",
    "examSources": [
      {
        "id": "g2ck7",
        "page": 2,
        "locator": "五4",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "我們到公園（　）溫暖的陽光。",
    "options": [
      "分享",
      "享用",
      "享樂",
      "享受"
    ],
    "answer": 3,
    "hideReadingHints": false,
    "speechText": "我們到公園（　）溫暖的陽光。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「享受陽光」表示舒服地感受陽光。"
  },
  {
    "id": "cxg2-6991a2aee639e7bb",
    "examSources": [
      {
        "id": "g2ck7",
        "page": 2,
        "locator": "五5",
        "kind": "字詞句意選擇改編"
      }
    ],
    "course": "words",
    "prompt": "阿姨為了參加喜宴，（　）得很漂亮。",
    "options": [
      "裝成",
      "扮成",
      "打扮",
      "扮演"
    ],
    "answer": 2,
    "hideReadingHints": false,
    "speechText": "阿姨為了參加喜宴，（　）得很漂亮。",
    "hint": "留意前後的詞句，再比較選項。",
    "explanation": "「打扮」指整理裝飾自己的外表。"
  }
];
export const GRADE2_CHINESE_EXAMS: LearningQuestion[] = rows.map(row => ({
 ...row, grade:2, subject:'chinese', publisher:'康軒', level:1,
 course:row.course as LearningQuestion['course'], examSources:row.examSources as ExamSource[],
 options:row.options.map(text=>({text,...(row.course==='pairs'?{zy:text}:{})})),
}));
