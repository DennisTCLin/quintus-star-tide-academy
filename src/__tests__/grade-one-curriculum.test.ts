import {islandAfterDecliningCapture} from './helpers/capture';
import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import curriculum from '../../curriculum/hanlin_elementary_math_curriculum.json';
import { GAMES, makeItem, mixedExam, allScriptLines } from '../island/games';
import { GRADE_ONE_UNITS as ISLAND_UNITS } from '../island/catalog';
import { monthData } from '../island/lower';
import { Clock } from '../island/semester';
import { cn, setRandom } from '../island/rng';
import { isIslandQuestion, publicIslandRun, validateIsland } from '../island/schema';
import { appendDigit } from '../island/question-contract';
import { emptyPlayer, kingOpen, recordAnswer } from '../island/engine';
import { newFamily, validateFamily } from '../adventure';
import { startIsland, answerIsland, finishIsland } from '../island/server';
import { missingZhuyin, zhuyin } from '../island/zhuyin';

afterEach(()=>setRandom(Math.random));
const expected:Record<string,(p:any)=>number>={
  length:p=>[p.a,p.b,p.c].indexOf(Math.max(p.a,p.b,p.c))+1,
  height:p=>[p.a,p.b,p.c].indexOf(Math.max(p.a,p.b,p.c))+1,
  path:p=>p.curved?2:1, indirect:p=>p.reverse?2:1,
  ordinal:p=>p.total?p.n:p.reverse?p.n-p.at:p.at+1,
  compare:p=>p.a===p.b?3:p.a>p.b?1:2, sequence10:p=>p.n,
  shape:p=>p.kinds.indexOf(p.target)+1,mosaic:p=>p.n,solid:p=>p.target+1,compose:p=>p.target+1,
  subtract:p=>p.a-p.b,difference:p=>p.a-p.b,mixed:p=>p.a+p.b-p.c,
  count30:p=>p.n,sequence30:p=>p.n,compare30:p=>Math.max(p.a,p.b,p.c),
  clockhour:p=>p.hour,clockmatch:p=>p.target+1,
  daytime:p=>p.events.indexOf(p.target?'晚上睡覺':'早上起床')+1,duration:p=>p.reverse?1:2,
  add20:p=>p.a+p.b,swap20:p=>p.a+p.b,addpattern:p=>p.a+p.b+1,
  measure:p=>p.n,lengthsum:p=>p.a+p.b,lengthdiff:p=>p.a-p.b,
  sub20:p=>p.a-p.b,diff20:p=>p.a-p.b,subpattern:p=>p.a-p.b-1,
  place100:p=>p.n,sequence100:p=>p.n,compare100:p=>Math.max(p.a,p.b,p.c),skipcount:p=>p.start+p.gap*3,
  matchshape:p=>p.kinds.findIndex((k:number,i:number)=>k===p.kind&&p.sizes[i]===p.size)+1,
  tile:p=>p.rows*p.cols,cubes:p=>p.heights.reduce((a:number,b:number)=>a+b,0),
  coinvalue:p=>p.value,coinsum:p=>p.coins.reduce((a:number,b:number)=>a+b,0),exchange:p=>p.value/p.small,pay:p=>p.price-p.paid,
  moneycompare:p=>p.left.reduce((a:number,b:number)=>a+b,0)===p.right.reduce((a:number,b:number)=>a+b,0)?3:p.left.reduce((a:number,b:number)=>a+b,0)>p.right.reduce((a:number,b:number)=>a+b,0)?1:2,
  calendar:p=>p.date,weekday:p=>new Date(Date.UTC(2026,p.month-1,p.date)).getUTCDay(),
  tomorrow:p=>new Date(Date.UTC(2026,p.month-1,p.date+(p.dir?1:-1))).getUTCDate(),dateorder:p=>p.dates.indexOf(Math.min(...p.dates))+1,
  add100:p=>p.a+p.b,sub100:p=>p.a-p.b,story100:p=>p.a+p.b-p.c,
  sort:p=>p.objects.filter((k:number)=>k===p.target).length,tally:p=>p.counts[p.target],
  table:p=>p.total?p.counts.reduce((a:number,b:number)=>a+b,0):p.counts[p.target],
};
describe('一年級完整上下學期課程',()=>{
  it('18單元依課程資料順序對應、每個觀念有教學與考卷',()=>{
    expect(ISLAND_UNITS.map(u=>[u.id,u.title])).toEqual(curriculum.books.filter(b=>b.grade===1).flatMap(b=>b.units.map(u=>[u.id,u.title])));
    for(const u of ISLAND_UNITS){expect(u.learn.reduce((a,b)=>a+b,0)).toBeGreaterThanOrEqual(5);expect(u.games).toHaveLength(u.learn.length);for(const k of u.games){expect(GAMES[k].unit).toBe(u.id);expect(GAMES[k].demo().steps.length).toBeGreaterThanOrEqual(3);}}
  });
  it('新題型對照獨立算式，答案範圍、序號、日期、貨幣皆正確',()=>{
    for(let sample=0;sample<120;sample++) for(const [key,answer] of Object.entries(expected)){
      const q=makeItem(key,undefined,sample%2===0);expect(+q.answer,`${key}: ${q.text}`).toBe(answer(q.p));
      expect(isIslandQuestion(q.id),q.id).toBe(true);expect(q.say).not.toMatch(/二[顆隻個片條格]/);
      if(key==='add100')expect(q.p.a%10+q.p.b%10).toBeLessThan(10);
      if(key==='sub100')expect(q.p.a%10-q.p.b%10).toBeGreaterThanOrEqual(0);
      if(q.p.diagram==='calendar'){expect(q.p.date).toBeGreaterThan(0);expect(q.p.date).toBeLessThanOrEqual(monthData(q.p.month).days);}
    }
  });
  it('所有18單元實際完成三關、保存重讀、重領不重複，全部完成才解鎖島主',()=>{
    let s=newFamily();const id='qingqing',day='2026-10-25';
    for(const u of ISLAND_UNITS){
      expect(kingOpen(s.profiles[id].mathIsland??emptyPlayer())).toBe(false);
      for(const mode of ['learn','play','boss'] as const){
        const r=islandAfterDecliningCapture(s,id,mode,u.id,randomUUID(),day),hidden=publicIslandRun(r);
        expect(hidden.items.every(q=>q.answer==='')).toBe(true);validateIsland(s.profiles[id].mathIsland);
        for(let i=0;i<r.items.length;i++)answerIsland(s,id,r.id,i,r.items[i].answer,day);
        finishIsland(s,id,r.id,day);const before=JSON.stringify(s);finishIsland(s,id,r.id,day);expect(JSON.stringify(s)).toBe(before);
        s=validateFamily(JSON.parse(JSON.stringify(s)));
      }
    }
    expect(kingOpen(s.profiles[id].mathIsland!)).toBe(true);
    const r=islandAfterDecliningCapture(s,id,'mock',undefined,randomUUID(),day);expect(new Set(r.items.map(q=>q.unit)).size).toBe(6);
    for(let i=0;i<r.items.length;i++)answerIsland(s,id,r.id,i,r.items[i].answer,day);finishIsland(s,id,r.id,day);
    expect(s.profiles[id].mathIsland?.mock).toBe(1);expect(()=>validateFamily(s)).not.toThrow();
  });
  it('權威答題服務能接受並保存答案100',()=>{
    setRandom(()=>0.999);const hundred=makeItem('place100');expect(hundred.answer).toBe('100');setRandom(Math.random);
    const family=newFamily(),r=islandAfterDecliningCapture(family,'qingqing','learn','1B-04',randomUUID(),'2026-10-25');
    r.items[0]=hundred;const reply=answerIsland(family,'qingqing',r.id,0,'100','2026-10-25');
    expect(reply.correct).toBe(true);expect(r.answers[0]).toBe('100');expect(()=>validateFamily(family)).not.toThrow();
  });
  it('錯題池可以保存超過9種觀念，舊三島進度仍可重讀',()=>{
    const p=emptyPlayer();for(const k of Object.keys(GAMES))recordAnswer(p,{k},false,new Date('2026-10-25T12:00:00'));
    expect(p.pool.length).toBe(Object.keys(GAMES).length);expect(()=>validateIsland(p)).not.toThrow();
    expect(()=>validateIsland({...emptyPlayer(),units:{'1A-01':{learn:true,play:true,boss:1},'1A-04':{learn:true}}})).not.toThrow();
    for(const id of ['isl-g1-evil-12345678','isl-g1-count-zzzzzzzz','isl-g1-add100-1','isl-add-100-200'])expect(isIslandQuestion(id)).toBe(false);
  });
  it('數字鍵盤可輸入0、12、30、100並限制範圍；數字語音不拆成單字',()=>{
    expect(['1','0','0'].reduce<string|null>(appendDigit,null)).toBe('100');expect(appendDigit('10','1')).toBe('10');expect(appendDigit('0','2')).toBe('2');
    expect([0,10,11,19,20,30,50,99,100].map(cn)).toEqual(['零','十','十一','十九','二十','三十','五十','九十九','一百']);
    expect(renderToStaticMarkup(createElement(Clock,{hour:12,half:1}))).toContain('y2="168"');
  });
  it('新題目、示範、操作文字和解析都有注音，考卷圖示不直接揭曉答案',()=>{
    for(const line of allScriptLines())expect(missingZhuyin(line),line).toEqual([]);
    for(const g of Object.values(GAMES))for(let i=0;i<3;i++){
      const item=makeItem(g.k),props={item,view:g.init(item,'learn'),mode:'learn' as const,demo:false,done:false,act:()=>{},choose:()=>{},eliminated:null};
      for(const component of [g.Scene,g.Exam??g.Scene]){
        const html=renderToStaticMarkup(createElement(component,props));const text=html.replace(/<rt>.*?<\/rt>/g,'').replace(/<[^>]*>/g,'');expect(missingZhuyin(text),g.k+text).toEqual([]);
      }
      if(g.k==='sequence100')expect(renderToStaticMarkup(createElement(g.Exam!,{...props,mode:'boss'}))).toContain('?');
    }
    expect(zhuyin('長度曲線迴紋針星期厚薄').map(x=>x.zy)).toEqual(['ㄔㄤˊ','ㄉㄨˋ','ㄑㄩ','ㄒㄧㄢˋ','ㄏㄨㄟˊ','ㄨㄣˊ','ㄓㄣ','ㄒㄧㄥ','ㄑㄧˊ','ㄏㄡˋ','ㄅㄛˊ']);
  });
  it('混合考題每趟抽六個不同單元，重玩能涵蓋上下學期',()=>{
    const seen=new Set<string>();for(let i=0;i<40;i++){const qs=mixedExam(6);expect(new Set(qs.map(q=>q.unit)).size).toBe(6);qs.forEach(q=>seen.add(q.unit));}expect(seen.size).toBe(18);
  });
});
