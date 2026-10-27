import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { countOnCurrentSpeech, countOnFrame, countOnIntroduction, countOnLesson, type CountOnInput } from '../count-on';
import CountOnExplanation from '../CountOnExplanation';
import { newFamily, startRun, answerRun, nextQuestion, validateFamily } from '../adventure';
import { GENERATED_POOLS, generatedId } from '../question-generator';
import { questionById } from '../learning';
import dictionary from '../data/interface-zhuyin.json';

function input(a = 2, b = 3): CountOnInput {
  return { grade: 1, run: { course: 'math', settled: true, index: 0, questions: ['qa-add'] },
    question: { id: 'qa-add', grade: 1, course: 'math', prompt: `${a} + ${b} = ?`,
      options: [{text: String(a+b)}, {text: '99'}], answer: 0 } };
}
const render = (value: CountOnInput) => renderToStaticMarkup(createElement(CountOnExplanation, {
  ...value, sessionKey: 'qa', companion: { name: 'buddy', image: '/buddy.webp' },
  reduced: true, onSpeak: () => { throw new Error('No speech during render'); }, onStop: () => {},
}));
describe('child-paced count-on answer explanation', () => {
  it('counts every step for all 66 nonnegative additions up to ten, without changing the question', () => {
    let pairs = 0;
    for (let a=0;a<=10;a++) for (let b=0;b<=10-a;b++) {
      const value = input(a,b), before = structuredClone(value), lesson = countOnLesson(value)!;
      expect(lesson).toEqual({start:a,add:b,total:a+b});
      for (let k=0;k<=b;k++) expect(countOnFrame(lesson,k)).toEqual({added:k,count:a+k,remaining:b-k,complete:k===b});
      expect(countOnFrame(lesson,1000).count).toBe(a+b);
      expect(countOnFrame(lesson,-1).count).toBe(a);
      expect(countOnFrame(lesson,NaN).count).toBe(a);
      expect(countOnFrame(lesson,0.5).count).toBe(a);
      expect(value).toEqual(before); pairs++;
    }
    expect(pairs).toBe(66);
  });
  it('never reveals an unsubmitted, foreign, non-addition or contradictory answer', () => {
    const mutations: ((v: CountOnInput) => void)[] = [
      v=>{v.grade=2;}, v=>{v.question.grade=2;}, v=>{v.run.course='words';},
      v=>{v.question.course='words';}, v=>{v.run.settled=false;}, v=>{v.run.index=1;},
      v=>{v.question.id='other';}, v=>{delete v.question.answer;}, v=>{v.question.answer=-1;},
      v=>{v.question.answer=2;}, v=>{v.question.answer=0.5;}, v=>{v.question.options[0].text='6';},
      v=>{v.question.options[0].text='05';},
      ...['2 − 1 = ?', '2 × 3 = ?', '02 + 3 = ?', '-2 + 3 = ?', '2.5 + 3 = ?',
        '2 + 3 = ? extra', '8 + 3 = ?', '9007199254740993 + 0 = ?'].map(prompt => (v:CountOnInput)=>{v.question.prompt=prompt;}),
    ];
    for (const mutate of mutations) {
      const value=input(); mutate(value);
      expect(countOnLesson(value)).toBeUndefined(); expect(render(value)).toBe('');
    }
    expect(render(input())).toContain('和夥伴一起數一次');
    expect(render(input())).not.toContain('count-on-stars');
  });
  it('uses natural quantity speech while preserving equation numerals and zero', () => {
    expect(countOnIntroduction({start:2,add:2,total:4})).toContain('原本有兩顆星星。要再加兩顆');
    expect(countOnIntroduction({start:2,add:0,total:2})).toBe('原本有兩顆星星。再加零顆，還是兩顆。');
    expect(countOnCurrentSpeech({start:2,add:2,total:4},0)).toBe('現在有兩顆。還要加兩顆。');
    expect(countOnCurrentSpeech({start:2,add:2,total:4},2)).toBe('2加2等於4。');
    expect(countOnCurrentSpeech({start:0,add:0,total:0},0)).toBe('0加0等於0。');
    for (const [text, reading] of Object.entries(dictionary.phrases)) {
      if (text.includes('數一次')) expect(reading[text.indexOf('數一次')]).toBe('ㄕㄨˇ');
      if (text.includes('解說')) expect(reading.slice(text.indexOf('解說'),text.indexOf('解說')+2)).toEqual(['ㄐㄧㄝˇ','ㄕㄨㄛ']);
    }
  });
  for (const pattern of [[false,false,false], [true,true,true,true,true,true], [true,true,true,true,true,false]]) {
    it(`works after settled and terminal answers without changing saved progress: ${pattern}`, () => {
      const family = newFamily(), day='2026-10-25';
      startRun(family,'doudou','math','count-on-contract',0,false,day);
      const pool=GENERATED_POOLS.find(p=>p.grade===1 && p.skill==='add')!;
      const run=family.profiles.doudou.run!;
      run.questions=pool.params.slice(0,6).map((_,i)=>generatedId(pool,i));
      for(let i=0;i<pattern.length;i++) {
        const q=questionById(run.questions[i])!;
        expect(countOnLesson({grade:1,run,question:q})).toBeUndefined();
        answerRun(family,'doudou',run.id,i,pattern[i]?q.answer:(q.answer+1)%q.options.length,day,0);
        const before=JSON.stringify(family);
        const lesson=countOnLesson({grade:1,run,question:q})!;
        expect(lesson).toBeDefined();
        for(let k=0;k<25;k++) countOnFrame(lesson,k);
        expect(render({grade:1,run,question:q})).toContain('和夥伴一起數一次');
        expect(JSON.stringify(family)).toBe(before);
        expect(validateFamily(JSON.parse(before))).toEqual(family);
        if(i<pattern.length-1) nextQuestion(family,'doudou',run.id,i);
      }
      expect(run.status).toBe(pattern.length===3?'failed':'won');
      expect(run.reward).toBe(pattern.length===3?'none':'saved');
    });
  }
});
