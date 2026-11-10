import { LEARNING_BANK, questionById, type LearningQuestion, type Grade, type Course } from './learning';
import { GENERATED_POOLS, generatedId } from './question-generator';

/** Reviewed teaching groups. No keyword/OCR inference and no textbook lesson numbers invented.
 * Unknown questions remain in the bank/history, but cannot enter adaptive assessment.
 * These are original foundation lessons; publisher-aligned exams need an explicit mapping.
 */
export type LearningTopic = { id:string; grade:Grade; course:Course; title:string; lesson:string; questions:string[]; prerequisite?:string };
export const LEARNING_TOPICS: LearningTopic[] = [];
const ids = (prefix:string, numbers:number[]) => numbers.map(n=>prefix+String(n).padStart(2,'0'));
function add(grade:Grade,course:Course,key:string,title:string,lesson:string,questions:string[],prerequisite?:string) {
  const checked=questions.filter(id=>{const q=questionById(id);return q && !q.retired && !q.rephraseOf && !q.examSources?.length && q.grade===grade && q.course===course;});
  if(checked.length)LEARNING_TOPICS.push({id:`${grade}:${course}:${key}`,grade,course,title,lesson,questions:checked,...(prerequisite?{prerequisite}: {})});
}
const mathLessons:Record<string,[string,string]>={
 add:['加法','把兩群數量合起來。先數第一群，再接著數第二群。例：2 顆加 3 顆，可以接著數 3、4、5，共 5 顆。'],
 sub:['減法','從原來的數量拿走一部分。例：5 顆拿走 2 顆，還剩 3 顆；用 5 − 2 = 3 表示。'],
 mul:['乘法','每組一樣多時，可以用乘法。例：3 組、每組 4 顆，是 4 + 4 + 4 = 12，也就是 4 × 3 = 12。較大的數可拆成十位與個位各算一次再相加。'],
 div:['除法','平均分，就是每份一樣多。例：14 顆糖分給 3 人，每人 4 顆，還剩 2 顆。檢查：3 × 4 + 2 = 14；餘數要比 3 小。'],
 fraction:['同分母分數加法','分母表示把整體分成幾份。分母相同時，只把分子相加，分母不變。例：1/5 + 2/5 = 3/5。'],
 area:['長方形面積','面積是在數裡面鋪了幾個單位正方形。長度為 4、寬度為 3 的長方形，每排 4 格，共 3 排，所以面積 4 × 3 = 12 平方單位。'],
 perimeter:['長方形周長','周長是沿外面走一圈的長度。長度為 4、寬度為 3，四條邊相加 4 + 3 + 4 + 3 = 14，也可以算 (4 + 3) × 2。'],
};
for(const pool of GENERATED_POOLS.filter(p=>!p.course || p.course==='math')) {
 const lesson=mathLessons[pool.skill];if(!lesson)continue;
 add(pool.grade,'math',`${pool.skill}-${pool.level}`,`${lesson[0]}・第 ${pool.level} 步`,lesson[1],pool.params.map((_,i)=>generatedId(pool,i)),pool.level>1?`${pool.grade}:math:${pool.skill}-${pool.level-1}`:undefined);
}
for(const grade of [1,2] as const) {
 const definitions:[Course,string,string,string][]=[
 ['tones','tone-','聽出聲調','先聽聲音往哪裡走。一聲平平的，二聲往上，三聲先低再上，四聲快速往下。像「媽、麻、馬、罵」，聲調不同，意思也不同。'],
 ['medials','medial-','拼讀注音','慢慢聽每個音，再把聲音連起來。ㄧ像衣服的「衣」，ㄨ像烏鴉的「烏」，ㄩ像魚的聲音；注意嘴形和中間的音。'],
 ['pairs','pair-c-ch-','分辨ㄘ與ㄔ','先聽再念：ㄘ的舌頭不捲，ㄔ的舌尖往上捲。例如「擦」與「插」，要注意開頭的聲音。'],
 ['pairs','pair-zh-z-','分辨ㄓ與ㄗ','先聽再念：ㄓ的舌尖往上捲，ㄗ不捲舌。例如「知」與「資」，注意開頭聲音的不同。'],
 ];
 for(const [course,prefix,title,lesson] of definitions)add(grade,course,prefix,title,lesson,LEARNING_BANK.filter(q=>q.id.startsWith(`g${grade}-${prefix}`)).map(q=>q.id));
 if(grade===2)for(const theme of ['market','breakfast','ocean','bath','toys','music','art','clothes','bugs','home','camp'])add(2,'words',theme,'生活詞語・'+({market:'蔬果',breakfast:'早餐',ocean:'海洋',bath:'浴室',toys:'玩具',music:'音樂',art:'美勞',clothes:'衣服',bugs:'昆蟲',home:'家裡',camp:'生活'}[theme]),'先看圖片，再聽詞語；把聲音、注音和圖片對起來。遇到不認識的詞，先看示範再練。',LEARNING_BANK.filter(q=>q.id.startsWith(`g2-word-${theme}-`)).map(q=>q.id));
}
const enThemes=[['字母配對','大寫與小寫是一對字母。例如 A 配 a、B 配 b。看清形狀，再找它的另一半。'],['英文數字','先認識數量，再連到英文。one 是 1，two 是 2，three 是 3；可以邊數手指邊念。'],['顏色','把英文與看得到的顏色連起來：red 是紅色、blue 是藍色、yellow 是黃色。'],['動物','把英文與動物連起來：cat 是貓、dog 是狗。先看示範，再自己找一次。'],['學用品','book 是書、pen 是筆、bag 是袋子。先指著實物念，再自己練習。'],['水果','apple 是蘋果、banana 是香蕉。先把聲音和圖片配起來，再自己認一次。'],['打招呼','見面可以說 Hello；早上說 Good morning；道別說 Goodbye。依情境選合適的回應。'],['生活句型','I am 可介紹年齡；I like 表示喜歡；This is 介紹東西。Sit down 是坐下，Stand up 是站起來。先想清楚句子要表達什麼，再選詞。']];
const enIds:string[][]=Array.from({length:8},()=>[]);let enIndex=0;
for(let n=0;n<26;n++)for(const [i,length] of [26,10,8,8,6,6,8,8].entries())if(n<length)enIds[i].push(`g1-en-v1-${String(++enIndex).padStart(3,'0')}`);
enThemes.forEach(([title,lesson],i)=>add(1,'english',`intro-${i}`,title,lesson,enIds[i]));
const definitions:[Grade,Course,string,string,string,string[]][]=[
 [4,'chinese','main-idea','找出文章重點','先問「整段都在說什麼」，再找能涵蓋主要行動與結果的標題；不要只挑其中一個小細節。',ids('c1-g4-chinese-',[1,3,5,7])],
 [4,'chinese','evidence','依文字找線索','先圈出問題要找的人、時間或改變，再回文章找直接證據；不要加入文中沒說的事情。',ids('c1-g4-chinese-',[2,4,6,8])],
 [4,'science','observe','觀察和猜想','觀察是眼睛看到、工具量到的紀錄；猜想是在解釋原因。例如「葉子變黃」是觀察，「可能缺水」是要查證的猜想。',ids('c1-g4-science-',[1,5,9])],
 [4,'science','fair-test','公平的實驗','想比較哪個條件，就只改變那個條件，其他條件保持相同。例：比較紙張厚薄時，飛機形狀、投出方式要相同。',ids('c1-g4-science-',[2,6,10])],
 [4,'science','data','依紀錄下結論','只說紀錄支持的結果。遇到明顯不同的測量，先確認方法再測一次；少量測試不能證明所有情況都一樣。',ids('c1-g4-science-',[3,4,7,8])],
 [4,'social','map','看地圖與圖例','先看指北針與圖例。圖上方為北時，右方是東、左方是西、下方是南；圖例告訴你符號代表什麼。',ids('c1-g4-social-',[1,3,5,7])],
 [4,'social','compare','比較資料的改變','先確認是同一個地方，再比較以前與現在。只說資料看得到的改變，不猜資料沒有提供的原因。',ids('c1-g4-social-',[2,4,6,8])],
 [4,'english','sequence','英文步驟順序','First 是首先，next 是接著，finally 是最後。先找這些詞，再依動作前後回答。',ids('c1-g4-english-',[2,6,10])],
 [4,'english','details','英文短文找線索','先找問題在問哪個時間、地點或人。on 是在上面、under 是在下面；再回到短文找一樣的人或物。',ids('c1-g4-english-',[1,3,5,7,9])],
 [5,'chinese','reading','閱讀找證據','把人物、問題、行動與結果連起來；代名詞要回前文找。答案只選有文字支持的說法，避免「所有」「一定」等過度推論。',ids('g5-general-chinese-',[1,2,3,9,10,11,13,14,15,16,17,18,19,20])],
 [5,'science','fair-test','公平實驗與資料','比較實驗時只改一個條件，其他保持一致。結論要符合量到的資料，不要把某次結果說成永遠都如此。',ids('g5-general-science-',[1,2,3])],
 [5,'social','evidence','社會資料判讀','先看資料來源與時間，只說能被資料支持的結果。比較新舊照片或地圖，可以找出變化；不夠的資訊要另外查證。',ids('g5-general-social-',[6,7,8,9,15,16,19,20])],
 [5,'english','details','英文短文找線索','先看問題在問什麼，再回短文找人、時間、地點或交通方式。把相關句子讀完整，不只看一個熟悉的字。',ids('g5-general-english-',[1,2,3,9,10])],
];
for(const [g,c,k,t,l,qs] of definitions)add(g,c,k,t,l,qs);
for(const [key,title,lesson] of [
 ['common-factor','公因數','因數可以把原數整除。先列出兩個數的因數，再找相同的；最大的一個就是最大公因數。例：8與12的共同因數有1、2、4，最大是4。'],
 ['common-multiple','公倍數','一個數乘1、2、3……得到它的倍數。兩個數都有的倍數叫公倍數，最小的正數叫最小公倍數。'],
 ['fraction-add','分數通分相加','分母不同要先通分，變成相同大小的份，再加分子。例如 1/3 + 1/6 = 2/6 + 1/6 = 3/6 = 1/2。'],
 ['fraction-subtract','分數通分相減','先把分母通分，再減分子，分母不變。例如 1/2 − 1/6 = 3/6 − 1/6 = 2/6 = 1/3。'],
 ['triangle-area','三角形面積','兩個一樣的三角形可拼成平行四邊形，所以三角形面積＝底×對應的高÷2。'],
 ['cuboid-volume','長方體體積','體積是在數裡面有幾個單位立方體。先算每層長×寬，再乘層數（高），單位是立方公分。'],
])add(5,'math',key,title,lesson,Array.from({length:10},(_,i)=>`g5-warmup-${key}-${i+1}`));
// Small, explicit six-grade groups; unfamiliar facts are taught, never assumed known.
for(const [c,k,t,l,nums] of [
 ['math','fraction','分數與小數','先通分再加減；求幾分之幾可用乘法。小數可改寫成分母為10、100等的分數，最後約分。例：0.5 = 5/10 = 1/2。',[1,4,6,12,14,18]],
 ['math','geometry','面積與體積','長方形面積是長×寬；三角形面積是底×高÷2；長方體體積是長×寬×高。圓周是直徑×圓周率，圓面積是半徑×半徑×圓周率。',[2,5,11,15,19]],
 ['chinese','idiom','理解成語','先理解成語描述的情境，再對照選項。看到不熟悉的成語，先看例子與解釋，不需要靠猜。',[1,2,4,6,7,9,10]],
 ['english','vocabulary','英文生活字彙','先把英文和生活情境連起來。遇到不熟的詞先學意思，接著自己回想；不知道時可以按提示。',[2,4,6,8,11,13,15,17,19]],
 ['science','changes','溫度與物質變化','溫度計用來測量冷熱。水變成水蒸氣稱為汽化；物理變化沒有產生新物質，化學變化產生新物質，例如燃燒。',[3,8,11,18]],
 ['science','life','生物的構造與功能','植物用水和二氧化碳在光照下製造養分，根吸收水分與礦物質。動物的器官有不同功能；皮膚保護身體，消化器官幫助處理食物。',[1,6,10,13,20]],
 ['social','geography','臺灣的地理位置','先認識地圖上的位置。臺灣西邊是臺灣海峽，中央有山脈；讀到山、河或離島名稱時，可以對照地圖記住位置。',[1,2,6,10,14]],
 ['social','civics','公民生活','公共生活要尊重每個人的權利。民主透過參與與選舉形成決定；遇到不同意見，要用理由討論。',[3,5,7,15,17,20]],
] as [Course,string,string,string,number[]][])add(6,c,k,t,l,ids(`g6gp-${({math:'m',chinese:'c',english:'e',science:'s',social:'so'} as Record<string,string>)[c]}`,nums));
add(5,'science','water','水的狀態與分離','固態冰融化成液態水；水蒸氣遇冷凝結成小水珠。攤開濕物可讓水更容易蒸發。物質溶解不代表消失，不溶的沙粒可用濾紙分離。',ids('g5-general-science-',[6,7,8,9,10]));
add(5,'science','measure','測量與天氣資料','先統一測量方法，再比較數值。雨量比大小可知道哪天雨多；風向是風從哪裡吹來。',ids('g5-general-science-',[11,12,13]));
add(5,'english','sentence','英文句子線索','單數與複數會影響動詞。There is 接一個，There are 接多個。現在進行式用 am、is、are 加上動詞 ing，表示正在做。',ids('g5-general-english-',[4,5,6,7,8,11,12]));
/** Explicit reviewed intersections from already-approved papers; source/book checked again at allocation. */
const examLinks:Record<string,string[]>={
 '1:math:add-1':['r6-g1m-20000588-iv3','r6-g1m-20000588-iv5'],
 '1:math:sub-1':['r6-g1m-20000588-i5','r6-g1m-20000588-iv1','r6-g1m-20000588-iv2','r6-g1m-20000588-iv4'],
 '2:math:mul-3':['f2-20003916-i10-8','f2-20003916-i10-7','f2-20003916-i10-2','f2-20003916-i10-6','f2-20003916-i10-9','f2-20003916-i10-4','f2-20003916-i11-7','f2-20003916-i11-9','f2-20003916-ii1-b','f2-20003916-iii4','f2-20003916-iii5'],
 '2:math:mul-2':['f2-20003916-i11-5','f2-20003916-i11-4','f2-20003916-ii4-a'],
};
for(const [id,questions] of Object.entries(examLinks)){
 const t=LEARNING_TOPICS.find(t=>t.id===id)!;
 for(const qid of questions){const q=questionById(qid);if(!q||q.grade!==t.grade||q.course!==t.course||!q.examSources)throw Error('Invalid reviewed concept link '+qid);t.questions.push(qid);}
}
export const TOPIC_BY_ID = Object.fromEntries(LEARNING_TOPICS.map(t=>[t.id,t]));
const QUESTION_TOPIC = new Map<string,LearningTopic>();
for(const t of LEARNING_TOPICS)for(const id of t.questions)QUESTION_TOPIC.set(id,t);
export const topicForQuestion=(q:LearningQuestion|string)=>QUESTION_TOPIC.get(typeof q==='string'?q:q.id);
export const topicsFor=(grade:Grade,course?:Course)=>LEARNING_TOPICS.filter(t=>t.grade===grade&&(!course||t.course===course));
