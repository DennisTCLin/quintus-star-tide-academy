import { describe, expect, it } from 'vitest';
import { ENGLISH_CONTEXTS_V1, ENGLISH_CONTEXT_CONCEPTS, ENGLISH_CONTEXT_MANIFEST } from '../english-contexts';
import { LEARNING_BANK, questionById } from '../learning';
import { GENERATED_POOLS } from '../question-generator';
import { allocateQuestions, freshLearning, validateLearning } from '../learning-engine';
import { newFamily, startRun, answerRun, nextQuestion, validateFamily, recordBattleAnswer } from '../adventure';
import { canListenToEnglishChoices } from '../english-choice-listening';
import { syllables } from '../readability';
import { questionSpeech, speechParts } from '../speech-text';

const question = (n: number) => questionById(`c1-g4-english-${String(n).padStart(2, '0')}`)!;
const correctText = (n: number) => { const q=question(n); return q.options[q.answer].text; };
const day = '2026-10-25';

describe('grade-four English contexts', () => {
  it('balances positions within each concept and keeps complete readable/spoken text', () => {
    expect(ENGLISH_CONTEXTS_V1).toHaveLength(16);
    expect(new Set(LEARNING_BANK.map(q=>q.id)).size).toBe(LEARNING_BANK.length);
    for (const concept of Object.keys(ENGLISH_CONTEXT_CONCEPTS)) {
      const items=ENGLISH_CONTEXT_MANIFEST.items.filter(x=>x.concept===concept);
      expect(items).toHaveLength(4);
      expect(new Set(items.map(x=>x.context)).size).toBe(4);
      expect(items.map(x=>questionById(x.id)!.answer).sort()).toEqual([0,1,2,3]);
    }
    for (const q of ENGLISH_CONTEXTS_V1) {
      expect(q.prompt.length).toBeLessThanOrEqual(200);
      expect(new Set(q.options.map(o=>o.text)).size).toBe(4);
      expect(q.options.every(o=>o.text.length<=40)).toBe(true);
      expect(questionSpeech(q)).toBe(q.prompt);
      expect(speechParts(questionSpeech(q))).toEqual([{text:q.prompt,lang:'en-US'}]);
      expect(canListenToEnglishChoices(4,q)).toBe(false);
      for (const text of [q.hint,q.explanation])
        expect(syllables(text).filter(x=>/[\u3400-\u9fff]/.test(x.text)&&!x.zy),q.id).toEqual([]);
    }
  });

  it('checks schedule and direction answers using separate time/set/coordinate oracles', () => {
    const hours: Record<string, number> = {'Ten in the morning.':10,'Eight in the morning.':8,'One in the afternoon.':13,'Six in the evening.':18};
    expect(question(5).options.filter(o=>hours[o.text]>=9&&hours[o.text]<12).map(o=>o.text)).toEqual([correctText(5)]);
    const clubs={art:'Monday',music:'Wednesday'};
    expect(correctText(1)).toBe(clubs.music);
    const tennis=new Set(['Tuesday','Thursday']),busy=new Set(['Tuesday']);
    expect(question(13).options.filter(o=>tennis.has(o.text)&&!busy.has(o.text)).map(o=>o.text)).toEqual([correctText(13)]);
    const before={day:'Tuesday',time:'nine',place:null,lunch:null},after={...before,day:'Friday'};
    expect(Object.keys(before).filter(k=>before[k as keyof typeof before]!==after[k as keyof typeof after])).toEqual(['day']);
    expect(correctText(9)).toBe('The day of the trip.');
    const stops=[[0,1],[0,0],[0,-1]];
    const directions=stops.slice(1).map((p,i)=>p[1]<stops[i][1]&&p[0]===stops[i][0]?'South':'other');
    expect(new Set(directions)).toEqual(new Set([correctText(15)]));
  });

  it('keeps reviewed polyphones contextual instead of changing direction words', () => {
    for (const [text,expected] of [
      ['落在這段時間裡','ㄌㄨㄛˋ ㄗㄞˋ ㄓㄜˋ ㄉㄨㄢˋ ㄕˊ ㄐㄧㄢ ㄌㄧˇ'],
      ['禮貌地','ㄌㄧˇ ㄇㄠˋ ˙ㄉㄜ'],['買東西','ㄇㄞˇ ㄉㄨㄥ ˙ㄒㄧ'],
      ['東西南北','ㄉㄨㄥ ㄒㄧ ㄋㄢˊ ㄅㄟˇ'],
    ]) expect(syllables(text).map(x=>x.zy).join(' '),text).toBe(expected);
    expect(question(13).explanation).not.toContain('星期六只有游泳');
  });

  it('reaches all contexts through real mixed allocations and saves without relabeling repeats as new', () => {
    for (const level of [1,2,3] as const) {
      let state=freshLearning();
      state.skills.englishread={level,recent:'',answered:0,correct:0,reviewDay:''};
      const fresh=new Set<string>();
      for(let i=0;i<80;i++) {
        const batch=allocateQuestions(state,4,'english',i%3===0?1:6);
        expect(new Set(batch.map(x=>x.id)).size).toBe(batch.length);
        for(const q of batch) {
          expect(questionById(q.id)).toMatchObject({grade:4,course:'english'});
          if(!q.review) {expect(fresh.has(q.id),q.id).toBe(false);fresh.add(q.id);}
        }
        state=validateLearning(JSON.parse(JSON.stringify(state)),4);
      }
      for(const q of ENGLISH_CONTEXTS_V1) expect(fresh.has(q.id),q.id).toBe(true);
      state.seen=LEARNING_BANK.filter(q=>q.grade===4&&q.course==='english').map(q=>q.id);
      for(const p of GENERATED_POOLS.filter(p=>p.grade===4&&p.course==='english'))state.cursors[p.key]=p.params.length;
      const review=allocateQuestions(state,4,'english',6);
      expect(review.every(q=>q.review)).toBe(true);
      expect(new Set(review.map(q=>q.id)).size).toBe(6);
    }
  });

  it('restores every new active/pending ID and refuses duplicate answers and cross-grade ownership', () => {
    for (const [i,q] of ENGLISH_CONTEXTS_V1.entries()) {
      let f=newFamily();startRun(f,'quintus','english',`english-context-${i}`,0,false,day);
      const run=f.profiles.quintus.run!;
      run.questions=[...ENGLISH_CONTEXTS_V1.slice(i),...ENGLISH_CONTEXTS_V1.slice(0,i)].slice(0,6).map(x=>x.id);
      f=validateFamily(JSON.parse(JSON.stringify(f)));
      answerRun(f,'quintus',run.id,0,q.answer,day);
      expect(f.profiles.quintus.learning.skills.englishread.correct).toBe(1);
      expect(()=>answerRun(f,'quintus',run.id,0,q.answer,day)).toThrow();
      expect(validateFamily(JSON.parse(JSON.stringify(f))).profiles.quintus.run!.answers).toEqual([true]);
      const pending=newFamily();pending.profiles.quintus.learning.pending={token:`pending-${i}`,question:q.id,review:false};
      const restored=validateFamily(JSON.parse(JSON.stringify(pending)));
      recordBattleAnswer(restored,'quintus',`pending-${i}`,q.id,true,day);
      expect(restored.profiles.quintus.learning.skills.englishread.correct).toBe(1);
      expect(()=>recordBattleAnswer(restored,'quintus',`pending-${i}`,q.id,true,day)).toThrow();
      for(const grade of [1,2] as const) expect(()=>validateLearning(pending.profiles.quintus.learning,grade)).toThrow();
    }
  });

  it('retains six-question success and three-mistake defeat for new English IDs', () => {
    for(const win of [true,false]) {
      const f=newFamily();startRun(f,'quintus','english',`terminal-${win}`,0,false,day);
      const r=f.profiles.quintus.run!;r.questions=ENGLISH_CONTEXTS_V1.slice(0,6).map(q=>q.id);
      for(let i=0;i<(win?6:3);i++) {
        const q=questionById(r.questions[i])!;
        answerRun(f,'quintus',r.id,i,win?q.answer:(q.answer+1)%4,day);
        if(i<(win?5:2))nextQuestion(f,'quintus',r.id,i);
      }
      expect(r.questions).toHaveLength(6);expect(r.status).toBe(win?'won':'failed');
      expect(r.reward).toBe(win?'saved':'none');expect(validateFamily(JSON.parse(JSON.stringify(f)))).toEqual(f);
    }
  });
});
