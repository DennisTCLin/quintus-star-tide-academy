import {it,expect} from 'vitest';
import {teachingExample} from '../adaptive-teaching';
import {generatedId,generatorPool} from '../question-generator';
import {questionById} from '../learning';
const q=(key:string,params:number[])=>{const p=generatorPool(key)!;return questionById(generatedId(p,p.params.findIndex(x=>JSON.stringify(x)===JSON.stringify(params))))!;};
it('works through current multiplication without changing the stored question',()=>{const source=q('g4-mul-1',[12,2]),before=JSON.stringify(source);const taught=teachingExample(source);expect(taught.explanation).toContain('10 × 2 = 20');expect(taught.explanation).toContain('2 × 2 = 4');expect(taught.explanation).toContain('20 + 4 = 24');expect(JSON.stringify(source)).toBe(before);expect({...taught,explanation:source.explanation}).toEqual(source);});
it('explains actual borrowing with a nonnegative decomposition',()=>{const source=q('g2-sub-1',[21,8]);expect(teachingExample(source).explanation).toContain('把 21 分成 10 和 11');expect(teachingExample(source).explanation).toContain('11 − 8 = 3');expect(teachingExample(source).explanation).toContain('10 + 3 = 13');});
it('gives concrete grade-one counting and preserves curated nonnumeric lessons',()=>{const source=q('g1-add-1',[1,1]);expect(teachingExample(source).explanation).toContain('從 1 開始，再往後數 1 個');const english=questionById('c1-g4-english-02')!;expect(teachingExample(english)).toBe(english);});
