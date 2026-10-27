import {expect,it} from 'vitest';
import {LEARNING_BANK,ENGLISH_REPHRASES,questionById} from '../learning';
import {freshLearning,validateLearning} from '../learning-engine';
import {markMastered,hasMastered} from '../mastered-questions';
it('retains IDs and mastery after clarifying conditions and correcting character teaching',()=>{
 const ids=['cxg2-210c6057436fec93','mxg2-0dd0ff732860e189','mxg2-0ceb3d799a711b97','mxg2-4d777dc2e5db01a6'];
 const state=freshLearning();ids.forEach(id=>markMastered(state,id));
 const restored=validateLearning(JSON.parse(JSON.stringify(state)),2);
 ids.forEach(id=>expect(hasMastered(restored,id)).toBe(true));
 const character=questionById(ids[0])!;expect(character.prompt).toContain('「鬥」');expect(character.speechText).toBe(character.prompt);expect(character.options[character.answer].text).toBe('鬧');
 for(const id of ids.slice(1)){expect(questionById(id)!.prompt).toContain('各裝滿水');expect(questionById(id)!.prompt).toContain('沒有剩餘');}
});
it('provides answer-disambiguating evidence inside the question',()=>{
 for(const [id,text] of [['cx1-dd113-4-3','特殊'],['cx1-wx111-2-2','籃框'],['cx1-dl111-5a-3','捨不得'],['cx1-wx109-3-5','流水聲音'],['hc1-hc-wx108-2-4','少量油'],['math-03','不重疊'],['ex1-ke-dd112-E-5','天空正在飄雪'],['ex1-he-dd114-J-1','不開心'],['ex1-he-dd114-J-3','不難過'],['ex1-he-wx111-E-3','難過地'],['ex1-he-dd114-K-b-2-3','explicitly says']])expect(questionById(id)!.prompt).toContain(text);
 expect(questionById('mx1-hm7-1-6')!.explanation).not.toContain('依序');
});
it('keeps singular/plural grammar and count answers correct in every English rephrase',()=>{
 const qs=ENGLISH_REPHRASES.filter(q=>q.id.startsWith('r1-n1-g4-englishread-'));
 expect(qs).toHaveLength(250);
 for(const q of qs){
  const m=/has (\d+) blue (shells?) and (\d+) red (shells?)\./.exec(q.prompt)!;expect(m).toBeTruthy();
  expect(m[2]).toBe(+m[1]===1?'shell':'shells');expect(m[4]).toBe(+m[3]===1?'shell':'shells');
  const answer=q.prompt.includes('altogether')?+m[1]+ +m[3]:q.prompt.includes('number of red')?+m[3]:+m[1];
  expect(q.options[q.answer].text).toBe(String(answer));
 }
});
it('does not call two-symbol first-grade syllables the middle sound',()=>{
 const qs=LEARNING_BANK.filter(q=>q.id.startsWith('g1-medial-'));expect(qs).toHaveLength(9);
 for(const q of qs){expect(q.prompt).not.toContain('中間');expect(q.prompt).toContain('ㄧ、ㄨ或ㄩ');expect(q.audio).toBeTruthy();}
});
