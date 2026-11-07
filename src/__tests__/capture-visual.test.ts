import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import CaptureChallenge from '../CaptureChallenge';
import {LEARNING_BANK} from '../learning';
import type {CaptureOutcome} from '../creature-rules';
vi.mock('../MonsterBestiary',()=>({MonsterArt:()=>null}));
vi.mock('../monsters',()=>({monsterById:()=>({name:'測試夥伴'})}));
const capture={monster:'test',chance:100,outcome:'pending',trial:{grade:1,answers:[],questions:[]}} as unknown as CaptureOutcome;
function render(question:any){return renderToStaticMarkup(createElement(CaptureChallenge,{capture,question,busy:false,online:true,onAnswer:async()=>{},onSkip:async()=>{},onClose:()=>{},onListen:()=>{}}));}
it('renders the actual counting fish stimulus before answer choices',()=>{
 const questions=LEARNING_BANK.filter(q=>q.prompt==='數一數，有幾條魚？');expect(questions.length).toBeGreaterThan(0);
 for(const q of questions){expect(q.visual).toBeTruthy();const html=render(q);expect(html).toContain(q.visual!);expect(html.indexOf(q.visual!)).toBeLessThan(html.indexOf('capture-answers'));}
});
it('preserves multiline visual conditions without adding an empty stimulus to text-only questions',()=>{
 const q=LEARNING_BANK.find(q=>q.visual)!;
 expect(render({...q,visual:'🐟 🐟\n🐟'})).toContain('🐟 🐟\n🐟');
 expect(render({...q,visual:undefined})).not.toContain('class="math-visual"');
});
