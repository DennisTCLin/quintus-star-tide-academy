import { MATH_BOOKS, type MathGrade } from './curriculum';
import { UPPER_PLANS, upperGameKey } from './upper-plans';
export type IslandUnit = { id: string; n: number; title: string; games: string[]; guardian: string; place: string; learn: number[] };
export const GRADE_ONE_UNITS: IslandUnit[] = [
  { id: "1A-01", n: 1, title: "10以內的數", games: ["count", "find"], guardian: "crab-warden-metal", place: "數數海灣", learn: [3, 2] },
  { id: '1A-02', n: 2, title: '比長短', games: ['length','height','path','indirect'], guardian: 'cloud-warden-metal', place: '彩帶海岸', learn: [2,2,1,1] },
  { id: '1A-03', n: 3, title: '順序與多少', games: ['ordinal','compare','sequence10'], guardian: 'crab-warden-metal', place: '排隊沙灘', learn: [2,2,2] },
  { id: "1A-04", n: 4, title: "分與合", games: ["split", "merge", "zero"], guardian: "cloud-warden-metal", place: "糖果小島", learn: [2, 2, 2] },
  { id: '1A-05', n: 5, title: '認識形狀', games: ['shape','mosaic','solid','compose'], guardian: 'golem-warden-metal', place: '積木城堡', learn: [2,1,1,2] },
  { id: "1A-06", n: 6, title: "10以內的加法", games: ["boat", "hop", "add", "ten"], guardian: "golem-warden-metal", place: "小鴨碼頭", learn: [2, 1, 2, 1] },
  { id: '1A-07', n: 7, title: '10以內的減法', games: ['subtract','difference','mixed'], guardian: 'crab-warden-metal', place: '蘋果森林', learn: [2,2,2] },
  { id: '1A-08', n: 8, title: '30以內的數', games: ['count30','sequence30','compare30'], guardian: 'cloud-warden-metal', place: '小棒山谷', learn: [2,2,2] },
  { id: '1A-09', n: 9, title: '時間', games: ['clockhour','clockmatch','daytime','duration'], guardian: 'golem-warden-metal', place: '時鐘燈塔', learn: [2,2,1,1] },
  { id: '1B-01', n: 1, title: '20以內的加法', games: ['add20','swap20','addpattern'], guardian: 'crab-warden-metal', place: '湊十花園', learn: [2,2,2] },
  { id: '1B-02', n: 2, title: '長度', games: ['measure','lengthsum','lengthdiff'], guardian: 'cloud-warden-metal', place: '量量工坊', learn: [2,2,2] },
  { id: '1B-03', n: 3, title: '20以內的減法', games: ['sub20','diff20','subpattern'], guardian: 'golem-warden-metal', place: '減法果園', learn: [2,2,2] },
  { id: '1B-04', n: 4, title: '100以內的數', games: ['place100','sequence100','compare100','skipcount'], guardian: 'crab-warden-metal', place: '百數星城', learn: [2,1,1,2] },
  { id: '1B-05', n: 5, title: '形狀與形體', games: ['matchshape','tile','cubes'], guardian: 'cloud-warden-metal', place: '拼圖樂園', learn: [2,2,2] },
  { id: '1B-06', n: 6, title: '數數看有多少元', games: ['coinvalue','coinsum','exchange','pay','moneycompare'], guardian: 'golem-warden-metal', place: '錢幣市集', learn: [1,2,1,1,1] },
  { id: '1B-07', n: 7, title: '幾月幾日星期幾', games: ['calendar','weekday','tomorrow','dateorder'], guardian: 'crab-warden-metal', place: '月曆小屋', learn: [1,2,2,1] },
  { id: '1B-08', n: 8, title: '兩位數的加減法', games: ['add100','sub100','story100'], guardian: 'cloud-warden-metal', place: '加減車站', learn: [2,2,2] },
  { id: '1B-09', n: 9, title: '分類整理', games: ['sort','tally','table'], guardian: 'golem-warden-metal', place: '分類寶庫', learn: [2,2,2] },
];
export const ISLAND_UNITS: IslandUnit[] = [...GRADE_ONE_UNITS,...MATH_BOOKS.filter(b=>b.grade>1).flatMap(book=>book.units.map(u=>{
  const plans=UPPER_PLANS[u.id];
  if(!plans||plans.length!==u.sections.length)throw Error('Missing curriculum section '+u.id);
  return {id:u.id,n:u.unit,title:u.title,games:plans.map((_,i)=>upperGameKey(u.id,i)),
    guardian:['crab-warden-metal','cloud-warden-metal','golem-warden-metal'][(u.unit-1)%3],place:u.title+'島',
    learn:plans.map((_,i)=>Math.floor(6/plans.length)+(i<6%plans.length?1:0))};
}))];
export const LOCKED_UNITS: { n: number; title: string }[] = [];
export type Semester = '1A'|'1B'|'2A'|'2B'|'3A'|'3B'|'4A'|'4B'|'5A'|'5B'|'6A'|'6B';
export const unitGrade = (unit?:string):MathGrade => Number(unit?.[0]??1) as MathGrade;
export const gradeUnits = (grade:number) => ISLAND_UNITS.filter(u=>Number(u.id[0])===grade);
export const semesterUnits = (semester: Semester) => ISLAND_UNITS.filter(u => u.id.startsWith(semester));
export const ISLAND_KING = "golem-warden-metal";

export const UNIT_BY_ID: Record<string, IslandUnit> = Object.fromEntries(ISLAND_UNITS.map(u => [u.id, u]));
export const GAME_UNITS = Object.fromEntries(ISLAND_UNITS.flatMap(u => u.games.map(k => [k, {unit: u.id}])));
