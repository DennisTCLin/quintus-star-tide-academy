import type { Game, Item, SceneProps } from './games';
import { UPPER_PLANS, upperGameKey } from './upper-plans';
import { MATH_BOOKS } from './curriculum';
import { upperTask } from './upper-tasks';
import { MathDiagram } from './MathDiagram';
import type { MathSeed } from './math-task';
import { ri, shuffle, cn } from './rng';
import { questionId } from './question-contract';
import { Zy } from './zhuyin';
import './upper.css';

export const readMath = (text:string) => text
  .replace(/(\d+(?:\.\d+)?)\s*%/g,(_,n)=>'百分之'+n)
  .replace(/(\d+)\/(\d+)/g,(_,n,d)=>cn(+d)+'分之'+cn(+n))
  .replace(/(\d+)\.(\d+)/g,(_,n,d)=>cn(+n)+'點'+[...d].map(c=>cn(+c)).join(''))
  .replace(/×/g,'乘以').replace(/÷/g,'除以').replace(/−/g,'減').replace(/\+/g,'加').replace(/=/g,'等於').replace(/%/g,'百分率');
const resolve=(q:Item)=>upperTask(q.p.code,q.p.seed);
const actionNames:Record<string,string>={fraction:'分出相同的份',fractiongrid:'標出重疊的部分',groups:'排出相同的一組',grid:'排出一層方格',area:'拼一拼面積',circle:'沿圓心展開',clock:'看時針，再看分針',ruler:'對準起點量長度',solid:'一層一層堆',cylinder:'把底面往上堆',prism:'把底面往上堆',symmetry:'對摺找對稱點',angle:'轉動射線',protractor:'對準零度讀刻度',table:'找到對應的資料列',bar:'對準長條讀數值',line:'依順序連接資料點'};

function UpperScene(s:SceneProps) {
  const task=resolve(s.item),step=s.view.step??0,exam=s.mode==='boss'||s.mode==='mock',learn=s.mode==='learn';
  const ready=!learn||step>=task.steps.length,showDiagram=!(exam&&s.item.p.code.startsWith('fractionop:'));
  const correct=s.done?s.item.answer:null;
  const adjustable=learn&&!s.demo&&!s.done&&!ready&&['angle','protractor'].includes(task.diagram.kind);
  return <div className={'isl-scene isl-upper'+(exam?' isl-upper-exam':'')} data-teach-step={step}>
    {s.demo&&<p className="isl-upper-demo-prompt"><Zy text={task.prompt}/></p>}
    {showDiagram&&<div className="isl-upper-diagram"><MathDiagram diagram={task.diagram} step={learn?step:exam&&task.diagram.text==='area'?0:3} tool={ready?undefined:s.view.tool}/></div>}
    {adjustable&&<label className="isl-upper-tool"><Zy text="動一動射線，觀察角的大小"/><input type="range" min="0" max={task.diagram.kind==='protractor'?180:360} step="15" aria-label="調整角度" value={s.view.tool??task.diagram.values[0]} onChange={e=>s.act({tool:+e.target.value})}/><output>{s.view.tool??task.diagram.values[0]}°</output></label>}
    {learn&&step>0&&!s.demo&&<ol className="isl-upper-work" aria-label="解題步驟">{task.steps.slice(0,step).map((line,i)=><li key={i} className={i===step-1?'current':''}><span aria-hidden="true">{i+1}</span><Zy text={line}/></li>)}</ol>}
    {learn&&!s.demo&&!s.done&&!ready&&<button className="isl-action" disabled={s.busy} onClick={()=>s.act({next:true})}><Zy text={actionNames[task.diagram.kind]??'拆開數量，一步一步算'}/><small> {step+1}/{task.steps.length}</small></button>}
    {!s.demo&&ready&&<div className="isl-upper-options" role="group" aria-label="選擇答案">{s.item.p.options.map((option:string,i:number)=>{
      const id=String(i+1),tried=s.tried?.includes(id),right=correct===id;
      return <button key={id} className={'isl-upper-option'+(right?' right':tried?' wrong':'')} aria-label={'答案 '+id+'：'+option}
        disabled={s.done||s.busy||tried||s.eliminated===id} onClick={()=>s.choose(id)}><span className="isl-upper-option-number">{id}</span><Zy text={option}/>{s.done&&right&&<b aria-hidden="true">✓</b>}</button>;
    })}</div>}
    {s.done&&<p className="isl-upper-explanation"><Zy text={task.steps.at(-1)!}/></p>}
  </div>;
}

function makeUpperGame(unit:string,section:number,code:string,name:string):Game {
  const key=upperGameKey(unit,section);
  const make=()=>{
    const seed:MathSeed={a:ri(2,9),b:ri(2,9),c:ri(2,9),d:ri(2,9),t:ri(0,999999999),u:ri(0,999999999)},task=upperTask(code,seed);
    const candidates=[...new Set(task.wrong)].filter(v=>v!==task.value);
    if(candidates.length<2)throw Error('Not enough distinct answers: '+code);
    const options=shuffle([task.value,...shuffle(candidates).slice(0,3)]);
    return {id:questionId(key,{diagram:task.diagram,prompt:task.prompt},task.prompt),p:{code,seed,options},answer:String(options.indexOf(task.value)+1),choices:options.map((_,i)=>String(i+1)),text:task.prompt,say:readMath(task.prompt)};
  };
  const hints:Record<string,string>={fraction:'先看整體分成幾等份，再數取了幾份。',fractionop:'先確認運算符號；加減要通分，乘除要依規則計算。',divide:'想想除數乘幾，能得到被除數；有餘數時要比除數小。',multiply:'每一組一樣多，用每組的數量乘組數。',area:'先找底和垂直的高，再選對面積公式。',volume:'先算一層的底面積，再乘層數或高度。',surface:'把露在外面的面分別算出來，再相加。',percent:'把基準量當成百分之百，再求需要的部分。',speed:'先把單位統一，再用距離、速率和時間的關係。',factors:'因數可以整除原數；公倍數要同時是兩個數的倍數。',decimal:'小數點要對齊；注意位值，最後再檢查答案大小。'};
  const game:Game={k:key,unit,name,tip:hints[code.split(':')[0]]??'先找已知的數量，確認單位，再一步一步算。',make,
    init:()=>({step:0}),
    act:(_q,v,action)=>action.tool!==undefined?{...v,tool:action.tool}:{...v,step:Math.min(resolve(_q).steps.length,(v.step??0)+1)},
    actSay:(q,v)=>v.step>0?readMath(resolve(q).steps[v.step-1]):undefined,
    ready:(q,v,mode)=>mode!=='learn'||v.step>=resolve(q).steps.length,
    sceneChoice:()=>true,Scene:UpperScene,Exam:UpperScene,
    answerText:q=>readMath(q.p.options[Number(q.answer)-1]??q.answer),
    demo(){const q=make(),item:Item={...q,k:key,unit},task=upperTask(code,q.p.seed);return {item,steps:[{say:readMath(task.prompt),view:{step:0}},...task.steps.map((line,i)=>({say:readMath(line),view:{step:i+1,focus:i}}))]};},
  };
  return game;
}
export const UPPER_GAMES:Record<string,Game>=Object.fromEntries(MATH_BOOKS.filter(b=>b.grade>1).flatMap(b=>b.units.flatMap(unit=>{
  const plans=UPPER_PLANS[unit.id];if(!plans||plans.length!==unit.sections.length)throw Error('Incomplete section plan: '+unit.id);
  return plans.map((code,i)=>{const game=makeUpperGame(unit.id,i,code,unit.sections[i].replace(/^\d+-\d+ /,''));return [game.k,game];});
})));
