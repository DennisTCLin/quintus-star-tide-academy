import {expect,it} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GRADE6_SUPPLEMENT_EXAMS as bank} from '../grade6-supplement-exams';
import {GRADE6_GENERAL_PRACTICE} from '../grade6-general-practice';
import {questionById} from '../learning';
import {allocateQuestions,freshLearning} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {startStudy,answerStudy,pauseStudy} from '../study-review';
const read=(p:string)=>JSON.parse(readFileSync(new URL('../../'+p,import.meta.url),'utf8'));
const baseline=read('output/grade6-pending-media/baseline.json');
it('preserves all released IDs and content except documented retirement metadata',()=>{
 for(const old of baseline){const q=structuredClone(questionById(old.id))!;expect(q).toBeTruthy();if(q.retired){delete q.retired;delete q.retirementReason;q.examSources=old.examSources;}
 expect(createHash('sha256').update(JSON.stringify(q)).digest('hex')).toBe(old.hash);}
});
it('binds every figure to original PDF crop provenance and shipped bytes',()=>{
 const manifest=read('output/grade6-pending-media/media-manifest.json');const used=new Set(bank.flatMap(q=>q.image?[q.image]:[]));expect(used.size).toBeGreaterThan(20);
 for(const path of used){const entry=manifest.find((m:{asset:string})=>m.asset===path);expect(entry).toBeTruthy();const file=new URL('../../public'+path,import.meta.url);expect(existsSync(file)).toBe(true);expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(entry.assetSha256);expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);}
 for(const q of bank.filter(q=>q.image))expect(q.imageAlt).toBeTruthy();
});
it('does not allocate withdrawn questions but can finish an already-saved review',()=>{
 const withdrawn=bank.filter(q=>q.retired);expect(withdrawn).toHaveLength(2);
 const l=freshLearning();l.school='jianan';for(const q of bank.filter(q=>q.course==='chinese'&&!q.retired))markMastered(l,q.id);for(const q of GRADE6_GENERAL_PRACTICE.filter(q=>q.course==='chinese'))markMastered(l,q.id);
 const before=structuredClone(l.mastered);expect(()=>allocateQuestions(l,6,'chinese',1)).toThrow();expect(l.mastered).toEqual(before);
 const s=freshLearning();s.school='jianan';const q=withdrawn[0];markMastered(s,q.id);expect(()=>startStudy(s,6,'2026-10-27','new','all','chinese')).toThrow();
 // A session saved before withdrawal must retain its answer contract.
 s.study!.session={id:'old',mode:'all',course:'chinese',questions:[q.id],index:0,answers:[],retries:[],settled:false,assisted:false,status:'paused'};
 expect(startStudy(s,6,'2026-10-27','resume','all','chinese')).toBe(true);expect(answerStudy(s,6,'old',0,q.answer,'2026-10-27')).toBe(true);expect(s.study!.session!.status).toBe('complete');
 pauseStudy(s,'old',true);expect(()=>startStudy(s,6,'2026-10-28','next','all','chinese')).toThrow();
});
