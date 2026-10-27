import { describe,it,expect } from 'vitest';
import { ENGLISH_FOUNDATIONS } from '../english-foundations';
import { COURSES } from '../course-catalog';
import { LEARNING_BANK,questionById } from '../learning';
import { allocateQuestions,freshLearning,recordLearning,validateLearning } from '../learning-engine';
import { newFamily,startRun,answerRun,nextQuestion,validateFamily,allocateBattleQuestion,recordBattleAnswer } from '../adventure';

describe('grade-one English replacement',()=>{
  it('provides80 unique beginner questions with English speech and balanced answer positions',()=>{
    expect(ENGLISH_FOUNDATIONS).toHaveLength(80);
    expect(new Set(ENGLISH_FOUNDATIONS.map(q=>q.id)).size).toBe(80);
    const answers=[0,0,0];
    for(const q of ENGLISH_FOUNDATIONS){
      expect(q).toMatchObject({grade:1,course:'english',subject:'english'});
      expect(q.options).toHaveLength(3);expect(new Set(q.options.map(o=>o.text)).size).toBe(3);
      expect(q.speechText).toMatch(/^[A-Za-z]/);expect(q.speechText).not.toMatch(/[\u3400-\u9fff]/);
      expect(q.hint).not.toBe(q.explanation);expect(q.hint).not.toContain(q.options[q.answer].text);
      expect(q.options[q.answer].text).toBeTruthy();expect(q.explanation).toContain(q.options[q.answer].text);
      answers[q.answer]++;
    }
    expect(Math.max(...answers)-Math.min(...answers)).toBeLessThanOrEqual(1);
    for(const q of ENGLISH_FOUNDATIONS.filter(q=>q.prompt.includes('對應的小寫')))
      expect(q.options[q.answer].text).toBe(q.visual!.toLowerCase());
    const numberWords=['one','two','three','four','five','six','seven','eight','nine','ten'];
    for(const q of ENGLISH_FOUNDATIONS.filter(q=>q.prompt.includes('這個數字')))
      expect(q.options[q.answer].text).toBe(numberWords[Number(q.visual)-1]);
  });
  it('replaces only grade1 words entry, mixes fresh topics and rejects new retired voyages',()=>{
    expect(COURSES[1].map(c=>c.id)).toEqual(['english','tones','medials','pairs','math']);
    expect(COURSES[2].some(c=>c.id==='words')).toBe(true);expect(COURSES[4].some(c=>c.id==='english')).toBe(true);
    const state=freshLearning(),first=allocateQuestions(state,1,'english',5).map(x=>questionById(x.id)!);
    expect(first.some(q=>q.prompt.includes('小寫'))).toBe(true);expect(first.some(q=>q.prompt.includes('數字'))).toBe(true);expect(first.some(q=>q.prompt.includes('紅色'))).toBe(true);
    expect(()=>allocateQuestions(state,1,'words',5)).toThrow();
    const family=newFamily();startRun(family,'qingqing','english','new',1);
    expect(family.profiles.qingqing.run!.questions.every(id=>questionById(id)!.subject==='english')).toBe(true);
    const battle=allocateBattleQuestion(family,'doudou','english','new-battle');
    expect(questionById(battle.id)!.subject).toBe('english');
  });
  it('preserves retired questions, all six historical course keys, pending tokens and active voyage answers',()=>{
    const family=newFamily(),p=family.profiles.qingqing;
    startRun(family,'qingqing','english','old-run',1);
    const old=LEARNING_BANK.filter(q=>q.grade===1&&q.course==='words').slice(0,5);
    delete p.run!.answers;delete p.run!.encounter.route;p.run!.review=Array(5).fill(false);p.run!.course='words';p.run!.questions=old.map(q=>q.id);p.learning.seen=old.map(q=>q.id);
    p.learning.review={words:1,english:1,math:1,tones:1,medials:1,pairs:1};
    recordLearning(p.learning,old[0],true,false,false,p.day);
    p.learning.pending={token:'old-token',question:old[1].id,review:false};
    const coins=p.coins,owned=structuredClone(p.owned);
    const loaded=validateFamily(JSON.parse(JSON.stringify(family)));
    expect(loaded.profiles.qingqing.learning.pending).toEqual(p.learning.pending);
    expect(loaded.profiles.qingqing.learning.skills).toEqual(p.learning.skills);
    expect(loaded.profiles.qingqing.run!.questions.slice(0,5)).toEqual(old.map(q=>q.id));
    recordBattleAnswer(loaded,'qingqing','old-token',old[1].id,true,p.day);
    answerRun(loaded,'qingqing','old-run',0,old[0].answer,p.day);nextQuestion(loaded,'qingqing','old-run',0);
    expect(loaded.profiles.qingqing.run!.index).toBe(1);expect(loaded.profiles.qingqing.coins).toBe(coins+10);
    expect(loaded.profiles.qingqing.owned).toEqual(owned);expect(validateFamily(loaded)).toEqual(loaded);
    const corrupt=structuredClone(p.learning);corrupt.review.unrelated=1;expect(()=>validateLearning(corrupt,1)).toThrow();
    expect(old.every(q=>q.subject==='chinese'&&!!q.audio)).toBe(true);
  });
});
