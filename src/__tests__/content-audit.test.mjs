import {GRADE5_NEW_EXAMS} from '../grade5-new-exams';
import {afterAll,expect,it} from 'vitest';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {audit,ROOT,structuralIssues,solveGenerated,reviewIssues,digest} from '../../scripts/content-audit.mjs';
const temp=mkdtempSync(join(tmpdir(),'content-audit-negative-'));
afterAll(()=>rmSync(temp,{recursive:true,force:true}));
const baseline=JSON.parse(readFileSync(join(ROOT,'docs/content-review/approvals.json')));
const fixture={id:'fixture',grade:4,course:'math',prompt:'12 × 8 = ?',options:[{text:'96'},{text:'20'},{text:'86'}],answer:0,hint:'分組計算。',explanation:'12 × 8 = 96。'};
it('certifies current catalog with all finite variants and no network AI dependency',async()=>{
 const {report}=await audit({reportPath:join(temp,'pass.json')});
 expect(report.status).toBe('PASS');expect(report.counts).toEqual({static:4515+96+407+GRADE5_NEW_EXAMS.length,generated:23192,pools:42,approvedStatic:4515+96+407+GRADE5_NEW_EXAMS.length,approvedTemplates:42});
 expect(report.mediaFiles).toBeGreaterThan(0);expect(report.findings).toEqual([]);
});
it('rejects pending, quarantine, changed hashes, missing evidence and removed identities in an actual audit',async()=>{
 const m=structuredClone(baseline),ids=Object.keys(m.questions);
 delete m.questions[ids[0]];
 m.questions[ids[1]].status='quarantined';
 m.questions[ids[2]].hash='edited-content';
 m.questions[ids[3]].evidence='docs/content-review/nonexistent.md';
 m.questions.removed_id=structuredClone(m.questions[ids[4]]);
 m.templates.removed_template=structuredClone(Object.values(m.templates)[0]);
 m.policyHash='outdated-policy';
 const path=join(temp,'bad-approvals.json');writeFileSync(path,JSON.stringify(m));
 const {report}=await audit({manifestPath:path,reportPath:join(temp,'rejected.json')});
 expect(report.status).toBe('FAIL');const reasons=report.findings.map(f=>f.reason);
 for(const reason of ['not-reviewed','quarantined','stale-review','missing-evidence-file','removed-reviewed-question','removed-reviewed-template','stale-review-policy'])expect(reasons).toContain(reason);
});
it('flags incomplete prompts, missing referenced media and ambiguous options',()=>{
 expect(structuralIssues({...fixture,prompt:''})).toContain('missing-text');
 expect(structuralIssues({...fixture,prompt:'如下圖，角度是多少？'})).toContain('missing-visual-context');
 expect(structuralIssues({...fixture,prompt:'如下圖，角度是多少？',image:'/exams/grade6/example.webp',imageAlt:'角度示意圖'})).not.toContain('missing-visual-context');
 expect(structuralIssues({...fixture,image:'/missing-alt.webp'})).toContain('missing-image-alt');
 expect(structuralIssues({...fixture,prompt:'聽音檔後選答案'})).toContain('missing-audio-context');
 expect(structuralIssues({...fixture,options:[{text:'96'},{text:'９６'}]})).toContain('duplicate-options');
 expect(structuralIssues({...fixture,answer:9})).toContain('invalid-answer-index');
 expect(structuralIssues({...fixture,explanation:'EMBED object'})).toContain('extraction-artifact');
});
it('solves visible conditions independently of answer keys and catches boundary wording',()=>{
 expect(solveGenerated({...fixture,answer:1})).toBe('96');
 expect(solveGenerated({...fixture,prompt:'1/8 + 3/8 = ?'})).toBe('4/8');
 for(const [ask,expected] of [['第一站是哪裡','燈塔'],['離開第一站後，下一站是哪裡','公園'],['倒數第二站是哪裡','學校'],['最後一站是哪裡','碼頭']])expect(solveGenerated({...fixture,skill:'reading',prompt:`航線說明：先到燈塔，再到公園，接著到學校，最後到碼頭。${ask}？`})).toBe(expected);
 expect(solveGenerated({...fixture,prompt:'Mia has 1 red shell and 2 blue shells. How many shells does Mia have in total?'})).toBe('3');
 expect(()=>solveGenerated({...fixture,prompt:'參照不存在的圖回答'})).toThrow('unsupported');
});
it('binds approval to complete content rather than just stable ID',()=>{
 const original=digest(fixture),record={status:'approved',hash:original,reviewer:'test',evidence:'test'};
 expect(reviewIssues(record,digest({...fixture,hint:'改動過的提示'}))).toEqual(['stale-review']);
 expect(reviewIssues({...record,status:'pending'},original)).toEqual(['not-approved']);
 expect(reviewIssues({...record,reviewer:''},original)).toEqual(['missing-review-evidence']);
});
