import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MATH_BOOKS } from '../island/curriculum';
import { UPPER_PLANS } from '../island/upper-plans';
import { upperTask } from '../island/upper-tasks';
import { GAMES, ISLAND_UNITS, makeItem } from '../island/games';
import { setRandom } from '../island/rng';
import { MathDiagram } from '../island/MathDiagram';
import { isIslandQuestion } from '../island/schema';
import { readMath } from '../island/upper';
const seed={a:4,b:3,c:2,d:5,t:7,u:11};
afterEach(()=>setRandom(Math.random));
describe('Complete elementary math activities',()=>{
  it('has an explicit playable teaching plan for every recovered section',()=>{
    expect(ISLAND_UNITS).toHaveLength(110);
    expect(Object.keys(UPPER_PLANS)).toHaveLength(92);
    for(const book of MATH_BOOKS.filter(b=>b.grade>1)) for(const u of book.units) {
      expect(UPPER_PLANS[u.id],u.id).toHaveLength(u.sections.length);
      const playable=ISLAND_UNITS.find(p=>p.id===u.id)!;
      expect(playable.games).toHaveLength(u.sections.length);
      expect(playable.learn.reduce((a,b)=>a+b,0)).toBe(6);
      for(const key of playable.games) {
        const game=GAMES[key],q=makeItem(key);
        expect(game.unit).toBe(u.id);
        expect(isIslandQuestion(q.id),q.id).toBe(true);
        expect(q.choices).toContain(q.answer);
        expect(new Set(q.p.options).size).toBe(q.choices.length);
        expect(game.demo().steps.length).toBeGreaterThanOrEqual(4);
        expect(game.ready(q,game.init(q,'learn'),'learn')).toBe(false);
        expect(game.ready(q,{step:3},'learn')).toBe(true);
      }
    }
  });
  it('renders every mathematical diagram and produces finite, distinct answer cards over varied parameters',()=>{
    const codes=[...new Set(Object.values(UPPER_PLANS).flat())];
    for(let sample=0;sample<40;sample++)for(const code of codes) {
      const s={a:2+sample%8,b:2+(sample*3+1)%8,c:2+(sample*5+2)%8,d:2+(sample*7+3)%8,t:sample*7321,u:sample*1317+11};
      const task=upperTask(code,s),choices=[...new Set([task.value,...task.wrong])];
      expect(task.prompt.length,code).toBeLessThan(300);
      expect(task.prompt+task.value+task.steps.join(' '),code).not.toMatch(/NaN|Infinity|undefined/);
      expect(choices.length,code).toBeGreaterThanOrEqual(3);
      expect(task.diagram.values.every(Number.isFinite),code).toBe(true);
      if(sample===0||sample===39) {
        const html=renderToStaticMarkup(createElement(MathDiagram,{diagram:task.diagram,step:sample===0?0:3}));
        expect(html,code).not.toMatch(/NaN|Infinity|undefined/);
      }
    }
  });
  it('matches independently calculated number, fraction, geometry and application examples',()=>{
    const examples:Record<string,string>={
      'multiply:2,5':'15','convert:kg:g':'4000 公克','convert:mixedm:cm':'403 公分',
      'fractionop:multiply':'3/4','fractionop:divide:unlike':'4/3',
      'fractionop:addsub:same':'8/5','circle:area':'78.5 平方公分',
      'sector:perimeter':'37.12 公分','surface:box':'148 平方公分',
      'volume:box':'120 立方公分','average:mean':'9','speed:chase':'2 分鐘',
      'ratio:sum':'16 顆','percent:application':'420 元',
    };
    for(const [code,value] of Object.entries(examples))expect(upperTask(code,seed).value,code).toBe(value);
    expect(readMath('3/4 × 0.25')).toBe('四分之三 乘以 零點二五');
    expect(upperTask('fraction:part',seed).diagram.values).toHaveLength(2);
    expect(upperTask('fractionop:compare:unlike',seed).diagram.values).toHaveLength(4);
    const angle=Object.values(GAMES).find(g=>g.unit==='4A-03')!,q=makeItem(angle.k),task=upperTask(q.p.code,q.p.seed);
    const html=renderToStaticMarkup(createElement(angle.Scene,{item:q,view:{step:3,tool:0},mode:'learn',demo:false,done:false,act:()=>{},choose:()=>{},eliminated:null}));
    expect(html).not.toContain('aria-label="調整角度"');
    expect(html).toContain('aria-label="protractor '+task.diagram.values[0]+'"');
  });
});
