import {EXAM_SOURCES, type ExamSource} from './exam-sources';
/** 115學年度；依家長提供截圖與敦化教科書一覽表。 */
export type SchoolId = 'yongchun' | 'nantun' | 'dunhua' | 'jianan' | 'dongmen' | 'xingan';
export type Publisher = '康軒' | '翰林' | '南一' | '何嘉仁';
export const SCHOOL_NAMES: Record<SchoolId,string> = {xingan:'臺北市大安區幸安國小',dongmen:'臺北市東門國小',jianan:'臺北市大安區建安國小',yongchun:'臺中市永春國小',nantun:'臺中市南屯國小',dunhua:'臺北市敦化國小'};
export function schoolDisplayName(value:string|null|undefined,confirmedName?:string|null):string {
  if(confirmedName?.trim())return confirmedName.trim();
  return value && Object.prototype.hasOwnProperty.call(SCHOOL_NAMES,value) ? SCHOOL_NAMES[value as SchoolId] : '學校待確認';
}
/** Official 115 notice: https://www.tmps.tp.edu.tw/uploads/1780367044908s3pcX9N3.pdf */
export const DONGMEN_GRADE5_BOOKS = {chinese:'翰林',math:'康軒',social:'南一',science:'翰林',english:'翰林'} as const;
export const SCHOOL_BOOKS = {
  jianan: {6:{chinese:'康軒',math:'康軒',english:'何嘉仁',science:'翰林',social:'康軒'},1:{chinese:'康軒',math:'南一'},2:{chinese:'康軒',math:'翰林'},4:{chinese:'康軒',math:'翰林',english:'翰林',science:'康軒',social:'翰林'}},
  dunhua: {
    1:{chinese:'康軒',math:'翰林'}, 2:{chinese:'康軒',math:'康軒'},
    4:{chinese:'康軒',math:'南一',english:'翰林',science:'康軒',social:'康軒'},
  },
  yongchun: {
    1:{chinese:'康軒',math:'翰林'}, 2:{chinese:'康軒',math:'南一'},
    4:{chinese:'翰林',math:'康軒',english:'康軒',science:'康軒',social:'康軒'},
  },
  nantun: {
    1:{chinese:'康軒',math:'康軒'}, 2:{chinese:'康軒',math:'南一'},
    4:{chinese:'康軒',math:'翰林',english:'翰林',science:'康軒',social:'康軒'},
  },
} as const;
export function chinesePublisher(school:SchoolId|undefined,grade:1|2|4|5|6):Publisher|undefined {
  if(school==='xingan')return grade===1 ? '康軒' : undefined;
  if(grade===5)return school==='dongmen' ? '翰林' : undefined;
  if(school==='dongmen')return undefined;
  if(grade===6)return school==='jianan' ? '康軒' : undefined;
  return school ? SCHOOL_BOOKS[school][grade].chinese : undefined;
}
export function curriculumNotice(school:SchoolId|undefined,grade:1|2|4|5|6) {
  if(grade===5)return school==='dongmen' ? '臺北市東門國小・五年級：依115學年度版本使用歷屆補充；國語、自然翰林，數學康軒、社會南一；英文含Here We Go 7期末U3／U4及逐題核准的舊版U1／U2交集筆試補充，當次考試範圍待確認。' : '五年級五科通用暖身：教材版本與學校評量範圍尚待確認。';
  if(!school)return '學校尚未確認，目前使用通用題庫。';
  if(grade===6)return `${SCHOOL_NAMES[school]}・6 年級：教材依115學年度草案核對；開放數學、國語、英文、自然與社會歷屆補充題，實際評量範圍待確認。`;
  const prefix=`${SCHOOL_NAMES[school]}・${grade} 年級國語・${chinesePublisher(school,grade)}版`;
  if(grade===1)return `${prefix}：優先練習家長提供的一上歷屆試卷，從拼音、辨音、聲調出發；題目使用裝置朗讀，115學年度範圍待確認。`;
  return grade===4
    ? `${prefix}：優先練習家長提供的四上第一次評量歷屆試卷；115學年度範圍待確認，全部答對後接續通用題。`
    : `${prefix}：優先練習家長提供的二上第一次評量歷屆試卷，從詞語、辨音出發；115學年度範圍待確認。`;
}

export function coursePublisher(school:SchoolId|undefined,grade:1|2|4|5|6,course:string):Publisher|undefined {
  // Official 115 first-semester table: https://www.haps.tp.edu.tw/nss/p/100; verified grade-one routing only.
  if(school==='xingan')return grade===1 ? (course==='math' ? '翰林' : ['chinese','tones','medials','pairs'].includes(course) ? '康軒' : undefined) : undefined;
  if(grade===5)return school==='dongmen' ? (DONGMEN_GRADE5_BOOKS as Record<string,Publisher>)[course] : undefined;
  if(school==='dongmen')return undefined;
  if(grade===6)return school==='jianan' ? ({math:'康軒',chinese:'康軒',science:'翰林',social:'康軒',english:'何嘉仁'} as Record<string,Publisher>)[course] : undefined;
  if(course==='math' && (grade===1 || grade===2) && school)return SCHOOL_BOOKS[school][grade].math;
  if(grade===1 && ['tones','medials','pairs'].includes(course))return chinesePublisher(school,grade);
  if(grade===2 && ['words','pairs'].includes(course))return chinesePublisher(school,grade);
  if(course==='chinese')return chinesePublisher(school,grade);
  if((course==='english'||course==='science'||course==='social'||course==='math') && grade===4 && school)return SCHOOL_BOOKS[school][4][course];
  return undefined;
}
export function englishCurriculumNotice(school:SchoolId|undefined) {
  if(!school)return '四年級英文：學校尚未確認，目前使用通用題庫。';
  if(school==='dunhua')return '臺北市敦化國小・4 年級英文・翰林 Here We Go 7：對應冊次題庫待補，目前使用通用題。';
  return `${SCHOOL_NAMES[school]}・4 年級英文・${coursePublisher(school,4,'english')}版：優先練習家長提供的四上第一次評量筆試題；聽力音檔待補，115學年度完整範圍待確認。`;
}

export function scienceCurriculumNotice(school:SchoolId|undefined) {
  if(!school)return '四年級自然：學校尚未確認，目前使用通用題庫。';
  return `${SCHOOL_NAMES[school]}・4 年級自然・${coursePublisher(school,4,'science')}版：優先練習家長提供的四上第一次評量地表與水域題；115學年度範圍待確認，舊版月亮題暫不列入。`;
}

export function socialCurriculumNotice(school:SchoolId|undefined) {
  if(!school)return '四年級社會：學校尚未確認，目前使用通用題庫。';
  return `${SCHOOL_NAMES[school]}・4 年級社會・${coursePublisher(school,4,'social')}版：優先練習家長提供的四上第一次評量自然環境、傳統住屋與器物題；115學年度範圍待確認，舊版其他單元暫不列入。`;
}

export function mathCurriculumNotice(school:SchoolId|undefined,grade:1|4|5|6=4) {
  if(grade===5)return school==='dongmen' ? '臺北市東門國小・五年級數學・康軒版：優先練習家長提供的五上期中歷屆改編題，保留通用暖身；115當次評量範圍待確認。' : '五年級數學通用暖身：因數、分數、小數、幾何、時間與平均數；教材版本待確認。';
  if(grade===6)return '六年級數學・康軒版：使用家長提供的歷屆試卷改編題；建安115學年度教材表為草案，實際評量範圍待確認。';
  if(grade===1)return school ? `${SCHOOL_NAMES[school]}・1 年級數學・${coursePublisher(school,1,'math')}版：優先練習家長提供的一上第一次評量歷屆題；115學年度範圍待確認。` : '一年級數學：學校尚未確認，目前使用通用題庫。';
  if(!school)return '四年級數學：學校尚未確認，目前使用通用題庫。';
  if(school==='dunhua')return '臺北市敦化國小・4 年級數學・南一版：優先練習家長提供的四上期中歷屆題，涵蓋大數、乘除、角度與三角形；115學年度實際評量範圍待確認。';
  return `${SCHOOL_NAMES[school]}・4 年級數學・${coursePublisher(school,4,'math')}版：優先練習家長提供的四上第一次評量大數、乘除、角度與長度題；115學年度範圍待確認，舊卷三角形題暫不列入。`;
}

/** Publisher alone cannot distinguish different English books used in the same grade. */
export function eligibleExam(school:SchoolId|undefined,grade:1|2|4|5|6,course:string,q:{publisher?:string;examSources?:ExamSource[];curriculumMatch?:"hwg7-u1-u2"}) {
  if(!school || !q.examSources?.length || q.publisher!==coursePublisher(school,grade,course))return false;
  if(grade===5 && school==='dongmen' && course==='english')return q.examSources.some(source=>{const metadata=EXAM_SOURCES[source.id];return ('book' in metadata && metadata.book==='Here We Go 7') || (q.curriculumMatch==='hwg7-u1-u2' && 'compatibleBook' in metadata && metadata.compatibleBook==='Here We Go 7');});
  if(grade===4 && course==='english' && (school==='nantun'||school==='dunhua')){
    const requiredBook=school==='dunhua'?'Here We Go 7':'Here We Go 3';
    return q.examSources.some(source=>{
      const metadata=EXAM_SOURCES[source.id];
      return 'book' in metadata && metadata.book===requiredBook;
    });
  }
  return true;
}

/** Midterm supplements precede final supplements within the same unseen/seen lane. */
export function examPracticePriority(q:{examSources?:ExamSource[]}):number {
  return Math.min(...(q.examSources??[]).map(source=>{const metadata=EXAM_SOURCES[source.id];return 'grade' in metadata && metadata.grade===5 && 'phase' in metadata ? (metadata.phase==='midterm'?0:1) : 0;}),1);
}
