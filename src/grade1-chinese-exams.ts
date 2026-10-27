import { GRADE1_CHINESE_EXTRA_EXAMS } from './grade1-chinese-extra-exams';
import type { LearningQuestion } from './learning';
import type { ExamSource } from './exam-sources';
// Reviewed transcription. Rebuild with scripts/imports/build-grade1-chinese.py.
const rows = [
  {
    "id": "cxg1-g1ck1-707f2a9063c3",
    "sourceId": "g1ck1",
    "page": 1,
    "locator": "二1",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "medials",
    "prompt": "「螞蟻」的「蟻」，正確的注音是哪一個？",
    "options": [
      "ㄧˇ",
      "ㄨˇ",
      "ㄩˇ"
    ],
    "answer": 0,
    "speechText": "螞蟻。蟻。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「螞蟻」的「蟻」讀作 ㄧˇ。"
  },
  {
    "id": "cxg1-g1ck1-646f5d8468ff",
    "sourceId": "g1ck1",
    "page": 1,
    "locator": "二2",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "medials",
    "prompt": "「房屋」的「屋」，正確的注音是哪一個？",
    "options": [
      "ㄨ",
      "ㄩ",
      "ㄧ"
    ],
    "answer": 0,
    "speechText": "房屋。屋。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「房屋」的「屋」讀作 ㄨ。"
  },
  {
    "id": "cxg1-g1ck1-3305feb8b473",
    "sourceId": "g1ck1",
    "page": 1,
    "locator": "二3",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "medials",
    "prompt": "「金魚」的「魚」，正確的注音是哪一個？",
    "options": [
      "ㄨˊ",
      "ㄩˊ",
      "ㄧˊ"
    ],
    "answer": 1,
    "speechText": "金魚。魚。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「金魚」的「魚」讀作 ㄩˊ。"
  },
  {
    "id": "cxg1-g1ck1-0125ea2d899e",
    "sourceId": "g1ck1",
    "page": 1,
    "locator": "二4",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "medials",
    "prompt": "「跳舞」的「舞」，正確的注音是哪一個？",
    "options": [
      "ㄩˇ",
      "ㄨˇ",
      "ㄧˇ"
    ],
    "answer": 1,
    "speechText": "跳舞。舞。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「跳舞」的「舞」讀作 ㄨˇ。"
  },
  {
    "id": "cxg1-g1ck1-4915d674122d",
    "sourceId": "g1ck1",
    "page": 1,
    "locator": "二5",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "medials",
    "prompt": "「雨傘」的「雨」，正確的注音是哪一個？",
    "options": [
      "ㄨˇ",
      "ㄩˇ",
      "ㄧˇ"
    ],
    "answer": 1,
    "speechText": "雨傘。雨。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「雨傘」的「雨」讀作 ㄩˇ。"
  },
  {
    "id": "cxg1-g1ck2-dacfeb03142b",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "一1",
    "kind": "拼音填寫改為選擇",
    "course": "medials",
    "prompt": "ㄐ ＋ ㄧ，拼起來是哪個音？",
    "options": [
      "ㄒㄧ",
      "ㄐㄧ",
      "ㄑㄧ"
    ],
    "answer": 1,
    "speechText": "請看畫面，把兩邊的注音拼起來，選出正確的音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "ㄐ 和 ㄧ 拼起來是 ㄐㄧ。"
  },
  {
    "id": "cxg1-g1ck2-6842e8b189e8",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "一2",
    "kind": "拼音填寫改為選擇",
    "course": "medials",
    "prompt": "ㄖ ＋ ㄠˋ，拼起來是哪個音？",
    "options": [
      "ㄖㄠˊ",
      "ㄖㄠˇ",
      "ㄖㄠˋ"
    ],
    "answer": 2,
    "speechText": "請看畫面，把兩邊的注音拼起來，選出正確的音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "ㄖ 和 ㄠˋ 拼起來是 ㄖㄠˋ。"
  },
  {
    "id": "cxg1-g1ck2-2385d615ea34",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "一3",
    "kind": "拼音填寫改為選擇",
    "course": "medials",
    "prompt": "ㄍ ＋ ㄨㄛˇ，拼起來是哪個音？",
    "options": [
      "ㄎㄨㄛˇ",
      "ㄍㄨㄛˋ",
      "ㄍㄨㄛˇ"
    ],
    "answer": 2,
    "speechText": "請看畫面，把兩邊的注音拼起來，選出正確的音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "ㄍ 和 ㄨㄛˇ 拼起來是 ㄍㄨㄛˇ。"
  },
  {
    "id": "cxg1-g1ck2-e4aa2e472e21",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "一4",
    "kind": "拼音填寫改為選擇",
    "course": "medials",
    "prompt": "ㄊ ＋ ㄧㄠ，拼起來是哪個音？",
    "options": [
      "ㄉㄧㄠ",
      "ㄊㄧㄠ",
      "ㄊㄧㄠˊ"
    ],
    "answer": 1,
    "speechText": "請看畫面，把兩邊的注音拼起來，選出正確的音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "ㄊ 和 ㄧㄠ 拼起來是 ㄊㄧㄠ。"
  },
  {
    "id": "cxg1-g1ck2-dc9d4a1be017",
    "sourceId": "g1ck2",
    "page": 2,
    "locator": "五1-友",
    "kind": "原空格聲調選擇改編／裝置朗讀",
    "course": "tones",
    "prompt": "好朋友一起玩遊戲。「友」的注音應標哪個聲調？",
    "options": [
      "˙",
      "―",
      "ˊ",
      "ˇ",
      "ˋ"
    ],
    "answer": 3,
    "speechText": "友。請選出友的注音聲調。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「友」的注音是 ㄧㄡˇ，標第三聲。"
  },
  {
    "id": "cxg1-g1ck2-6091a53aee43",
    "sourceId": "g1ck2",
    "page": 2,
    "locator": "五1-遊",
    "kind": "原空格聲調選擇改編／裝置朗讀",
    "course": "tones",
    "prompt": "好朋友一起玩遊戲。「遊」的注音應標哪個聲調？",
    "options": [
      "―",
      "ˊ",
      "ˇ",
      "ˋ",
      "˙"
    ],
    "answer": 1,
    "speechText": "遊。請選出遊的注音聲調。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「遊」的注音是 ㄧㄡˊ，標第二聲。"
  },
  {
    "id": "cxg1-g1ck2-ec9237228621",
    "sourceId": "g1ck2",
    "page": 2,
    "locator": "五2-小",
    "kind": "原空格聲調選擇改編／裝置朗讀",
    "course": "tones",
    "prompt": "小狗餓了要喝奶。「小」的注音應標哪個聲調？",
    "options": [
      "ˊ",
      "ˇ",
      "ˋ",
      "˙",
      "―"
    ],
    "answer": 1,
    "speechText": "小。請選出小的注音聲調。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「小」的注音是 ㄒㄧㄠˇ，標第三聲。"
  },
  {
    "id": "cxg1-g1ck2-33fa3970e036",
    "sourceId": "g1ck2",
    "page": 2,
    "locator": "五2-狗",
    "kind": "原空格聲調選擇改編／裝置朗讀",
    "course": "tones",
    "prompt": "小狗餓了要喝奶。「狗」的注音應標哪個聲調？",
    "options": [
      "ˇ",
      "ˋ",
      "˙",
      "―",
      "ˊ"
    ],
    "answer": 0,
    "speechText": "狗。請選出狗的注音聲調。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「狗」的注音是 ㄍㄡˇ，標第三聲。"
  },
  {
    "id": "cxg1-g1ck2-1dd5ac483f5a",
    "sourceId": "g1ck2",
    "page": 2,
    "locator": "五2-奶",
    "kind": "原空格聲調選擇改編／裝置朗讀",
    "course": "tones",
    "prompt": "小狗餓了要喝奶。「奶」的注音應標哪個聲調？",
    "options": [
      "ˋ",
      "˙",
      "―",
      "ˊ",
      "ˇ"
    ],
    "answer": 4,
    "speechText": "奶。請選出奶的注音聲調。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「奶」的注音是 ㄋㄞˇ，標第三聲。"
  },
  {
    "id": "cxg1-g1ck2-1e6a2b91f40a",
    "sourceId": "g1ck2",
    "page": 2,
    "locator": "五3-忙",
    "kind": "原空格聲調選擇改編／裝置朗讀",
    "course": "tones",
    "prompt": "豬小弟忙著蓋房子。「忙」的注音應標哪個聲調？",
    "options": [
      "˙",
      "―",
      "ˊ",
      "ˇ",
      "ˋ"
    ],
    "answer": 2,
    "speechText": "忙。請選出忙的注音聲調。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「忙」的注音是 ㄇㄤˊ，標第二聲。"
  },
  {
    "id": "cxg1-g1ck2-75c9a7af3ec9",
    "sourceId": "g1ck2",
    "page": 2,
    "locator": "五3-蓋",
    "kind": "原空格聲調選擇改編／裝置朗讀",
    "course": "tones",
    "prompt": "豬小弟忙著蓋房子。「蓋」的注音應標哪個聲調？",
    "options": [
      "―",
      "ˊ",
      "ˇ",
      "ˋ",
      "˙"
    ],
    "answer": 3,
    "speechText": "蓋。請選出蓋的注音聲調。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「蓋」的注音是 ㄍㄞˋ，標第四聲。"
  },
  {
    "id": "cxg1-g1ck2-a11cf43d9e7f",
    "sourceId": "g1ck2",
    "page": 2,
    "locator": "五4-豆",
    "kind": "原空格聲調選擇改編／裝置朗讀",
    "course": "tones",
    "prompt": "小豆子發芽了。「豆」的注音應標哪個聲調？",
    "options": [
      "ˊ",
      "ˇ",
      "ˋ",
      "˙",
      "―"
    ],
    "answer": 2,
    "speechText": "豆。請選出豆的注音聲調。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「豆」的注音是 ㄉㄡˋ，標第四聲。"
  },
  {
    "id": "cxg1-g1ck2-7b09434eba81",
    "sourceId": "g1ck2",
    "page": 2,
    "locator": "五4-芽",
    "kind": "原空格聲調選擇改編／裝置朗讀",
    "course": "tones",
    "prompt": "小豆子發芽了。「芽」的注音應標哪個聲調？",
    "options": [
      "ˇ",
      "ˋ",
      "˙",
      "―",
      "ˊ"
    ],
    "answer": 4,
    "speechText": "芽。請選出芽的注音聲調。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「芽」的注音是 ㄧㄚˊ，標第二聲。"
  },
  {
    "id": "cxg1-g1ck1-51f3132d1b1b",
    "sourceId": "g1ck1",
    "page": 2,
    "locator": "五4",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「飛機」，正確的注音是哪一個？",
    "options": [
      "ㄈㄟ ㄐㄧ",
      "ㄏㄟ ㄐㄧ",
      "ㄈㄟ ㄑㄧ"
    ],
    "answer": 0,
    "speechText": "飛機。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「飛機」讀作 ㄈㄟ ㄐㄧ。"
  },
  {
    "id": "cxg1-g1ck1-bf89bf502933",
    "sourceId": "g1ck1",
    "page": 2,
    "locator": "七3",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「河馬」的「馬」，正確的注音是哪一個？",
    "options": [
      "ㄇㄚˊ",
      "ㄇㄚˇ",
      "ㄇㄚ"
    ],
    "answer": 1,
    "speechText": "河馬。馬。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「河馬」的「馬」讀作 ㄇㄚˇ。"
  },
  {
    "id": "cxg1-g1ck1-add5b84e2671",
    "sourceId": "g1ck1",
    "page": 2,
    "locator": "七5",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「孔雀」的「雀」，正確的注音是哪一個？",
    "options": [
      "ㄑㄩㄝˇ",
      "ㄑㄩㄝˋ",
      "ㄑㄩㄝˊ"
    ],
    "answer": 1,
    "speechText": "孔雀。雀。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「孔雀」的「雀」讀作 ㄑㄩㄝˋ。"
  },
  {
    "id": "cxg1-g1ck1-ea57b4a17a15",
    "sourceId": "g1ck1",
    "page": 2,
    "locator": "七6",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「無尾熊」的「熊」，正確的注音是哪一個？",
    "options": [
      "ㄒㄩㄥ",
      "ㄒㄩㄥˊ",
      "ㄒㄩㄥˇ"
    ],
    "answer": 1,
    "speechText": "無尾熊。熊。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「無尾熊」的「熊」讀作 ㄒㄩㄥˊ。"
  },
  {
    "id": "cxg1-g1ck1-73a17b67421d",
    "sourceId": "g1ck1",
    "page": 2,
    "locator": "七10",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「變魔術」的「魔」，正確的注音是哪一個？",
    "options": [
      "ㄇㄛˊ",
      "ㄇㄛˇ",
      "ㄇㄛ"
    ],
    "answer": 0,
    "speechText": "變魔術。魔。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「變魔術」的「魔」讀作 ㄇㄛˊ。"
  },
  {
    "id": "cxg1-g1ck2-646f5d8468ff",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "二2",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「汽車」，正確的注音是哪一個？",
    "options": [
      "ㄑㄧˋ ㄘㄜ",
      "ㄑㄧˋ ㄔㄜ",
      "ㄐㄧˋ ㄔㄜ"
    ],
    "answer": 1,
    "speechText": "汽車。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「汽車」讀作 ㄑㄧˋ ㄔㄜ。"
  },
  {
    "id": "cxg1-g1ck2-3305feb8b473",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "二3",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「鉛筆」，正確的注音是哪一個？",
    "options": [
      "ㄑㄧㄢ ㄅㄧˇ",
      "ㄑㄧㄥ ㄅㄧˇ",
      "ㄑㄧㄢ ㄆㄧˇ"
    ],
    "answer": 0,
    "speechText": "鉛筆。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「鉛筆」讀作 ㄑㄧㄢ ㄅㄧˇ。"
  },
  {
    "id": "cxg1-g1ck2-0125ea2d899e",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "二4",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「巫婆」，正確的注音是哪一個？",
    "options": [
      "ㄨˊ ㄆㄛˊ",
      "ㄨ ㄅㄛˊ",
      "ㄨ ㄆㄛˊ"
    ],
    "answer": 2,
    "speechText": "巫婆。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「巫婆」讀作 ㄨ ㄆㄛˊ。"
  },
  {
    "id": "cxg1-g1ck2-4915d674122d",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "二5",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「牙齒」，正確的注音是哪一個？",
    "options": [
      "ㄧㄚˇ ㄔˇ",
      "ㄧㄚˊ ㄔˇ",
      "ㄧㄚˊ ㄘˇ"
    ],
    "answer": 1,
    "speechText": "牙齒。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「牙齒」讀作 ㄧㄚˊ ㄔˇ。"
  },
  {
    "id": "cxg1-g1ck2-fd6b0db38925",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "二6",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「青蛙」，正確的注音是哪一個？",
    "options": [
      "ㄑㄧㄥ ㄨㄚ",
      "ㄑㄧㄣ ㄨㄚ",
      "ㄑㄧㄥ ㄨㄛ"
    ],
    "answer": 0,
    "speechText": "青蛙。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「青蛙」讀作 ㄑㄧㄥ ㄨㄚ。"
  },
  {
    "id": "cxg1-g1ck2-07fa3204cc99",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "二8",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「眼鏡」，正確的注音是哪一個？",
    "options": [
      "ㄧㄢˇ ㄐㄧㄣˋ",
      "ㄧㄢˊ ㄐㄧㄥˋ",
      "ㄧㄢˇ ㄐㄧㄥˋ"
    ],
    "answer": 2,
    "speechText": "眼鏡。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「眼鏡」讀作 ㄧㄢˇ ㄐㄧㄥˋ。"
  },
  {
    "id": "cxg1-g1ck2-046f7e395359",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "三1-1",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「蛋糕」的「蛋」，正確的注音是哪一個？",
    "options": [
      "ㄉㄢˇ",
      "ㄉㄢˋ",
      "ㄉㄤˋ"
    ],
    "answer": 1,
    "speechText": "蛋糕。蛋。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「蛋糕」的「蛋」讀作 ㄉㄢˋ。"
  },
  {
    "id": "cxg1-g1ck2-75b76eae3833",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "三1-2",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「盪鞦韆」的「盪」，正確的注音是哪一個？",
    "options": [
      "ㄉㄢˋ",
      "ㄉㄤˋ",
      "ㄊㄤˋ"
    ],
    "answer": 1,
    "speechText": "盪鞦韆。盪。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「盪鞦韆」的「盪」讀作 ㄉㄤˋ。"
  },
  {
    "id": "cxg1-g1ck2-338d7e17cb90",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "三2-1",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「風箏」的「箏」，正確的注音是哪一個？",
    "options": [
      "ㄓㄥ",
      "ㄗㄥ",
      "ㄓㄣ"
    ],
    "answer": 0,
    "speechText": "風箏。箏。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「風箏」的「箏」讀作 ㄓㄥ。"
  },
  {
    "id": "cxg1-g1ck2-7858276891ba",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "三2-2",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「珍珠」的「珍」，正確的注音是哪一個？",
    "options": [
      "ㄗㄣ",
      "ㄓㄣ",
      "ㄓㄥ"
    ],
    "answer": 1,
    "speechText": "珍珠。珍。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「珍珠」的「珍」讀作 ㄓㄣ。"
  },
  {
    "id": "cxg1-g1ck2-a1293094401a",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "三3-2",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「影子」的「子」，正確的注音是哪一個？",
    "options": [
      "˙ㄗ",
      "ㄗˇ",
      "ㄗˋ"
    ],
    "answer": 0,
    "speechText": "影子。請選出最後一個字的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「影子」的「子」讀作 ˙ㄗ。"
  },
  {
    "id": "cxg1-g1ck2-c5f69184e89f",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "三4-1",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「金魚」的「金」，正確的注音是哪一個？",
    "options": [
      "ㄐㄧㄣ",
      "ㄑㄧㄣ",
      "ㄐㄧㄥ"
    ],
    "answer": 0,
    "speechText": "金魚。金。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「金魚」的「金」讀作 ㄐㄧㄣ。"
  },
  {
    "id": "cxg1-g1ck2-338a7d66256b",
    "sourceId": "g1ck2",
    "page": 1,
    "locator": "三4-2",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「經常」的「經」，正確的注音是哪一個？",
    "options": [
      "ㄑㄧㄥ",
      "ㄐㄧㄣ",
      "ㄐㄧㄥ"
    ],
    "answer": 2,
    "speechText": "經常。經。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「經常」的「經」讀作 ㄐㄧㄥ。"
  },
  {
    "id": "cxg1-g1ck3-dacfeb03142b",
    "sourceId": "g1ck3",
    "page": 1,
    "locator": "一1",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「房屋」的「房」，正確的注音是哪一個？",
    "options": [
      "ㄈㄤˊ",
      "ㄈㄢˊ",
      "ㄈㄤˇ"
    ],
    "answer": 0,
    "speechText": "房屋。房。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「房屋」的「房」讀作 ㄈㄤˊ。"
  },
  {
    "id": "cxg1-g1ck3-6842e8b189e8",
    "sourceId": "g1ck3",
    "page": 1,
    "locator": "一2",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「掃地」的「掃」，正確的注音是哪一個？",
    "options": [
      "ㄙㄠˋ",
      "ㄕㄠˇ",
      "ㄙㄠˇ"
    ],
    "answer": 2,
    "speechText": "掃地。掃。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「掃地」的「掃」讀作 ㄙㄠˇ。"
  },
  {
    "id": "cxg1-g1ck3-2385d615ea34",
    "sourceId": "g1ck3",
    "page": 1,
    "locator": "一3",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「瀑布」的「布」，正確的注音是哪一個？",
    "options": [
      "ㄅㄨˇ",
      "ㄅㄨˋ",
      "ㄆㄨˋ"
    ],
    "answer": 1,
    "speechText": "瀑布。布。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「瀑布」的「布」讀作 ㄅㄨˋ。"
  },
  {
    "id": "cxg1-g1ck3-e4aa2e472e21",
    "sourceId": "g1ck3",
    "page": 1,
    "locator": "一4",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「喇叭」的「喇」，正確的注音是哪一個？",
    "options": [
      "ㄌㄚ",
      "ㄌㄚˇ",
      "ㄌㄚˋ"
    ],
    "answer": 1,
    "speechText": "喇叭。喇。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「喇叭」的「喇」讀作 ㄌㄚˇ。"
  },
  {
    "id": "cxg1-g1ck3-5c8472e75b5f",
    "sourceId": "g1ck3",
    "page": 1,
    "locator": "一5",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「蚯蚓」的「蚯」，正確的注音是哪一個？",
    "options": [
      "ㄐㄧㄡ",
      "ㄑㄧㄡˊ",
      "ㄑㄧㄡ"
    ],
    "answer": 2,
    "speechText": "蚯蚓。蚯。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「蚯蚓」的「蚯」讀作 ㄑㄧㄡ。"
  },
  {
    "id": "cxg1-g1ck3-707f2a9063c3",
    "sourceId": "g1ck3",
    "page": 1,
    "locator": "二1",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「手帕」的「手」，正確的注音是哪一個？",
    "options": [
      "ㄕㄡˊ",
      "ㄕㄡˇ",
      "ㄙㄡˇ"
    ],
    "answer": 1,
    "speechText": "手帕。手。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「手帕」的「手」讀作 ㄕㄡˇ。"
  },
  {
    "id": "cxg1-g1ck3-646f5d8468ff",
    "sourceId": "g1ck3",
    "page": 1,
    "locator": "二2",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「小寶寶」的「寶」，正確的注音是哪一個？",
    "options": [
      "ㄅㄠˇ",
      "ㄆㄠˇ",
      "ㄅㄠˊ"
    ],
    "answer": 0,
    "speechText": "小寶寶。寶。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「小寶寶」的「寶」讀作 ㄅㄠˇ。"
  },
  {
    "id": "cxg1-g1ck3-3305feb8b473",
    "sourceId": "g1ck3",
    "page": 1,
    "locator": "二3",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「獅子」的「獅」，正確的注音是哪一個？",
    "options": [
      "ㄙ",
      "ㄕˊ",
      "ㄕ"
    ],
    "answer": 2,
    "speechText": "獅子。獅。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「獅子」的「獅」讀作 ㄕ。"
  },
  {
    "id": "cxg1-g1ck3-0125ea2d899e",
    "sourceId": "g1ck3",
    "page": 1,
    "locator": "二4",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「企鵝」，正確的注音是哪一個？",
    "options": [
      "ㄑㄧˋ ㄜˇ",
      "ㄑㄧˋ ㄜˊ",
      "ㄑㄧˇ ㄜˊ"
    ],
    "answer": 1,
    "speechText": "企鵝。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「企鵝」讀作 ㄑㄧˋ ㄜˊ。"
  },
  {
    "id": "cxg1-g1ck3-4915d674122d",
    "sourceId": "g1ck3",
    "page": 1,
    "locator": "二5",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「蚊子」的「蚊」，正確的注音是哪一個？",
    "options": [
      "ㄨㄣˊ",
      "ㄨㄥˊ",
      "ㄨㄣˇ"
    ],
    "answer": 0,
    "speechText": "蚊子。蚊。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「蚊子」的「蚊」讀作 ㄨㄣˊ。"
  },
  {
    "id": "cxg1-g1ck3-fd6b0db38925",
    "sourceId": "g1ck3",
    "page": 1,
    "locator": "二6",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「珠寶」的「珠」，正確的注音是哪一個？",
    "options": [
      "ㄗㄨ",
      "ㄓㄨˊ",
      "ㄓㄨ"
    ],
    "answer": 2,
    "speechText": "珠寶。珠。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「珠寶」的「珠」讀作 ㄓㄨ。"
  },
  {
    "id": "cxg1-g1ck3-367fad35927f",
    "sourceId": "g1ck3",
    "page": 1,
    "locator": "二7",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「小狗」的「狗」，正確的注音是哪一個？",
    "options": [
      "ㄍㄡˊ",
      "ㄍㄡˇ",
      "ㄎㄡˇ"
    ],
    "answer": 1,
    "speechText": "小狗。狗。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「小狗」的「狗」讀作 ㄍㄡˇ。"
  },
  {
    "id": "cxg1-g1ck3-07fa3204cc99",
    "sourceId": "g1ck3",
    "page": 1,
    "locator": "二8",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「大象」的「象」，正確的注音是哪一個？",
    "options": [
      "ㄒㄧㄤˋ",
      "ㄒㄧㄢˋ",
      "ㄒㄧㄤˇ"
    ],
    "answer": 0,
    "speechText": "大象。象。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「大象」的「象」讀作 ㄒㄧㄤˋ。"
  },
  {
    "id": "cxg1-g1ck3-53ab74f32986",
    "sourceId": "g1ck3",
    "page": 1,
    "locator": "二9",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「燈泡」的「燈」，正確的注音是哪一個？",
    "options": [
      "ㄉㄥ",
      "ㄊㄥ",
      "ㄉㄣ"
    ],
    "answer": 0,
    "speechText": "燈泡。燈。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「燈泡」的「燈」讀作 ㄉㄥ。"
  },
  {
    "id": "cxg1-g1ck3-a13b5fc33605",
    "sourceId": "g1ck3",
    "page": 1,
    "locator": "二10",
    "kind": "注音選擇改編／裝置朗讀",
    "course": "pairs",
    "prompt": "「蜜蜂」的「蜂」，正確的注音是哪一個？",
    "options": [
      "ㄏㄥ",
      "ㄈㄣ",
      "ㄈㄥ"
    ],
    "answer": 2,
    "speechText": "蜜蜂。蜂。請選出正確的注音。",
    "hint": "先聽清楚題目，再仔細比較注音和聲調。",
    "explanation": "「蜜蜂」的「蜂」讀作 ㄈㄥ。"
  }
];
const ORIGINAL_GRADE1_CHINESE_EXAMS:LearningQuestion[]=rows.map(row=>({
 id:row.id,grade:1,subject:'chinese',course:row.course as LearningQuestion['course'],publisher:'康軒',level:1,
 examSources:[{id:row.sourceId as ExamSource['id'],page:row.page,locator:row.locator,kind:row.kind}],
 prompt:row.prompt,speechText:row.speechText,options:row.options.map(text=>({text,zy:text})),
 answer:row.answer,hint:row.hint,explanation:row.explanation,
}));
export const GRADE1_CHINESE_EXAMS = [...ORIGINAL_GRADE1_CHINESE_EXAMS, ...GRADE1_CHINESE_EXTRA_EXAMS];
