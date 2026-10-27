import type { Course, Grade } from "./learning";
export const COURSES: Record<
  Grade,
  { id: Course; name: string; zy: string; icon: string; description: string }[]
> = {
  5: [
    {id:"math",name:"數學",zy:"",icon:"🔢",description:"因數、分數、小數、幾何與生活應用"},
    {id:"chinese",name:"國語",zy:"",icon:"📖",description:"短文理解、詞意、修辭與推論"},
    {id:"english",name:"英文",zy:"",icon:"🔤",description:"生活字彙、句型與短文閱讀"},
    {id:"science",name:"自然",zy:"",icon:"🌱",description:"實驗比較、物質變化與生物觀察"},
    {id:"social",name:"社會",zy:"",icon:"🧭",description:"地圖、資料判讀與環境生活"},
  ],
  6: [{id:"math",name:"數學",zy:"",icon:"🔢",description:"質因數、分數與小數除法、比與規律"},{id:"english",name:"英文",zy:"",icon:"🔤",description:"國家、休閒、交通與閱讀補充練習"},{id:"chinese",name:"國語",zy:"",icon:"📖",description:"詞語、修辭與閱讀理解"},{id:"science",name:"自然",zy:"",icon:"🌱",description:"熱、天氣與科學推理"},{id:"social",name:"社會",zy:"",icon:"🧭",description:"臺灣歷史與社會發展"}],
  1: [
    {
      id: "english",
      name: "英文入門",
      zy: "ㄧㄥ ㄨㄣˊ ㄖㄨˋ ㄇㄣˊ",
      icon: "🔤",
      description: "ABC、數字、單字與生活句型",
    },
    {
      id: "tones",
      name: "聲調",
      zy: "ㄕㄥ ㄉㄧㄠˋ",
      icon: "🎵",
      description: "聽聽聲音往哪走",
    },
    {
      id: "medials",
      name: "拼音",
      zy: "ㄆㄧㄣ ㄧㄣ",
      icon: "🧩",
      description: "拼讀注音，把聲音接起來",
    },
    {
      id: "pairs",
      name: "辨音",
      zy: "ㄅㄧㄢˋ ㄧㄣ",
      icon: "🐚",
      description: "分辨相近的聲音",
    },
    {
      id: "math",
      name: "數學",
      zy: "ㄕㄨˋ ㄒㄩㄝˊ",
      icon: "🔢",
      description: "看圖加加減減",
    },
  ],
  2: [
    {
      id: "words",
      name: "詞語",
      zy: "ㄘˊ ㄩˇ",
      icon: "📖",
      description: "中文和注音一起讀",
    },
    {
      id: "tones",
      name: "聲調",
      zy: "ㄕㄥ ㄉㄧㄠˋ",
      icon: "🎵",
      description: "四聲混合挑戰",
    },
    {
      id: "medials",
      name: "拼音",
      zy: "ㄆㄧㄣ ㄧㄣ",
      icon: "🧩",
      description: "三個音接起來",
    },
    {
      id: "pairs",
      name: "辨音",
      zy: "ㄅㄧㄢˋ ㄧㄣ",
      icon: "🐚",
      description: "分清楚相似字音",
    },
    {
      id: "math",
      name: "數學",
      zy: "ㄕㄨˋ ㄒㄩㄝˊ",
      icon: "🔢",
      description: "兩位數和乘法",
    },
  ],
  4: [
    {
      id: "math",
      name: "數學",
      zy: "",
      icon: "🔢",
      description: "分數、幾何與計算",
    },
    {
      id: "chinese",
      name: "國語",
      zy: "",
      icon: "📖",
      description: "閱讀與詞語",
    },
    {
      id: "english",
      name: "英文",
      zy: "",
      icon: "🔤",
      description: "字彙與句型",
    },
    {
      id: "science",
      name: "自然",
      zy: "",
      icon: "🌱",
      description: "觀察與推理",
    },
    {
      id: "social",
      name: "社會",
      zy: "",
      icon: "🧭",
      description: "地圖與生活",
    },
  ],
};

// Historical grade-one Chinese word records remain readable after the course replacement.
export const storedCourses = (grade: Grade): Course[] => [...COURSES[grade].map(c => c.id), ...(grade === 1 ? ["words" as const] : [])];
