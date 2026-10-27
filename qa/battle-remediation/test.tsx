// Local-only component regression harness; never contacts the production API.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import BattleAdvance from '../../src/BattleAdvance';
import BattleReview from '../../src/BattleReview';
import ChoiceView from '../../src/ChoiceView';
import {newFamily,startRun,answerRun,nextQuestion,correctRun} from '../../src/adventure';
import {questionById,LEARNING_BANK} from '../../src/learning';
import {canListenToEnglishChoices} from '../../src/english-choice-listening';
import {beginVoiceSession} from '../../src/voice';
import '../../src/styles.css';
import '../../src/family.css';
const app=document.querySelector('#root')!;
app.innerHTML='<main style="max-width:820px;margin:20px auto;padding:16px;color:#e8f9fc"><h1>戰後補練驗收</h1><button id="run">執行互動測試</button><pre id="report" style="white-space:pre-wrap"></pre><div id="fixture"></div></main>';
const node=document.querySelector('#fixture')!,root=createRoot(node),report=document.querySelector('#report')!;
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const render=(x:React.ReactNode)=>flushSync(()=>root.render(x));
function assert(ok:unknown,msg:string){if(!ok)throw Error(msg);report.textContent+='PASS '+msg+'\n';}
function button(text:string){return [...node.querySelectorAll('button')].find(x=>x.textContent?.includes(text))!;}
let counter=0,key=0;
const advance=(online=true)=><BattleAdvance key={key} grade={3} reduced busy={false} online={online} correct onAdvance={async()=>{counter++}}/>;
async function choicesReady(){for(let n=0;n<100;n++){const choices=[...node.querySelectorAll<HTMLButtonElement>('[data-answer-option]')];if(choices.length&&choices.every(b=>!b.disabled))return;await delay(20);}throw Error('Answer controls did not become ready');}
async function run(){
 report.textContent='';(document.querySelector('#run') as HTMLButtonElement).disabled=true;
 try{
 counter=0;key++;render(advance());await delay(650);assert(counter===1,'自動換題僅送出一次');await delay(650);assert(counter===1,'失敗後不自動重送');button('繼續下一題').click();await delay(30);assert(counter===2,'手動重試可繼續');
 counter=0;key++;render(advance());button('暫停換題').click();await delay(650);assert(counter===0,'暫停取消換題');button('▶ 繼續').click();await delay(650);assert(counter===1,'恢復後換題');
 counter=0;key++;render(advance());await delay(100);render(advance(false));await delay(650);assert(counter===0,'離線取消等待中的換題');render(advance());await delay(650);assert(counter===1,'重新連線後可換題');
 counter=0;key++;render(advance());render(null);await delay(650);assert(counter===0,'離開題目取消換題');
 counter=0;key++;Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});render(advance());await delay(650);assert(counter===0,'背景頁面不自動換題');Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));await delay(650);assert(counter===1,'回到頁面才換題');delete (document as any).visibilityState;
 const s=newFamily(),id='feifei',day='2026-10-25';startRun(s,id,'tones','review',1,false,day);const r=s.profiles[id].run!;
 for(let n=0;n<3;n++){const q=questionById(r.questions[r.index])!;answerRun(s,id,r.id,r.index,(q.answer+1)%q.options.length,day);if(r.status==='active')nextQuestion(s,id,r.id,r.index);}
 const items=r.answers!.flatMap((v,index)=>v?[]:[{index,question:questionById(r.questions[index])!}]);let listened='';
 const review=()=>render(<BattleReview run={r} items={items} grade={3} busy={false} online oldDay={false} onCorrect={async(i,c)=>{const yes=correctRun(s,id,r.id,i,c,day);review();return yes;}} onListen={q=>{listened=q.audio??q.prompt;return ()=>{};}} onSpeak={()=>()=>{}} onSkip={()=>{}} renderChoice={(c,q)=><ChoiceView choice={c} grade={2}/>}/>);
 review();button('聽題目').click();assert(listened===items[0].question.audio&&!!listened,'聲調題完整錄音來源傳到播放入口');
 let buttons=node.querySelectorAll<HTMLButtonElement>('.battle-review-choices button');buttons[(items[0].question.answer+1)%buttons.length].click();await choicesReady();assert(r.remediation!.corrected.length===0&&s.profiles[id].coins===0,'錯誤訂正不推進也不發獎勵');
 for(const item of items){await choicesReady();buttons=node.querySelectorAll('.battle-review-choices button');buttons[item.question.answer].click();await delay(30);}
 assert(r.remediation!.receipt?.coins===30,'三題訂正後一次補到半份');assert(node.querySelectorAll('.battle-review-choices button').length===0,'結算後移除重領入口');
 const english=LEARNING_BANK.find(q=>canListenToEnglishChoices(1,q))!;let heardOption='',answered=0,stops=0;
 const er=structuredClone(r);er.remediation!.corrected=[];er.remediation!.receipt=null;
 render(<BattleReview run={er} items={[{index:0,question:english}]} grade={1} busy={false} online oldDay={false} onCorrect={async()=>{answered++;return false;}} onListen={()=>beginVoiceSession(()=>{stops++;}).cancel} onSpeak={(text,isEnglish)=>{if(isEnglish)heardOption=text;return beginVoiceSession(()=>{stops++;}).cancel;}} onSkip={()=>{}} renderChoice={c=><ChoiceView choice={c} grade={1}/>}/>);
 const listenButtons=node.querySelectorAll<HTMLButtonElement>('.option-listen');assert(listenButtons.length===english.options.length,'英文補練保留逐項發音');listenButtons[0].click();assert(heardOption===english.options[0].text&&answered===0,'聽英文選項不送出答案');
 node.querySelector<HTMLButtonElement>('[data-answer-option]')!.click();await delay(30);assert(answered===1&&stops>0,'補練選答案先停止舊聲音');listenButtons[0].click();const priorStops=stops;render(null);assert(stops>priorStops,'離開補練題停止該題錄音');
 let newerMicCancelled=0;render(<BattleReview run={er} items={[{index:0,question:english}]} grade={1} busy={false} online oldDay={false} onCorrect={async()=>true} onListen={()=>beginVoiceSession(()=>{}).cancel} onSpeak={()=>beginVoiceSession(()=>{}).cancel} onSkip={()=>{}} renderChoice={c=>c.text}/>);node.querySelector<HTMLButtonElement>('.option-listen')!.click();const newerMic=beginVoiceSession(()=>{newerMicCancelled++;});render(null);assert(newerMic.isCurrent()&&newerMicCancelled===0,'補練離開不會取消後來開始的學伴麥克風');newerMic.cancel();
 const q=questionById('g2-word-art-0')!;render(<div className="battle-review"><h2>圖片選項與注音</h2><div className="battle-review-choices">{q.options.map((choice,i)=><button key={i}><ChoiceView choice={choice} grade={2}/></button>)}</div></div>);
 const tiles=[...node.querySelectorAll<HTMLElement>('.picture-tile')];assert(tiles.length===q.options.length&&new Set(tiles.map(t=>t.style.backgroundPosition)).size===q.options.length,'圖集每個選項使用不同裁切');assert(!!node.querySelector('ruby'),'二年級選項保留注音');
 report.textContent+='COMPLETE: all component checks passed\n';
 }catch(e){report.textContent+='FAIL '+String(e)}finally{(document.querySelector('#run') as HTMLButtonElement).disabled=false;}
}
document.querySelector('#run')!.addEventListener('click',()=>void run());
