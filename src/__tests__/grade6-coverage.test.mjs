import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {coverageIssues} from '../../scripts/check-grade6-coverage.mjs';
import {GRADE6_SUPPLEMENT_EXAMS} from '../grade6-supplement-exams';
const read=()=>JSON.parse(readFileSync(new URL('../../docs/content-review/grade6-coverage.json',import.meta.url),'utf8'));
it('accounts for all source files and every registered question without dangling dispositions',()=>{
 const ledger=read();expect(ledger.sources).toHaveLength(30);expect(coverageIssues(ledger,GRADE6_SUPPLEMENT_EXAMS)).toEqual([]);
});
it('rejects a missing source item, unknown question and duplicate cycle',()=>{
 const missing=read();missing.records.pop();expect(coverageIssues(missing,GRADE6_SUPPLEMENT_EXAMS).some(x=>x.includes('count mismatch'))).toBe(true);
 const unknown=read();unknown.records.find(x=>x.status==='included').questionId='not-a-real-question';expect(coverageIssues(unknown,GRADE6_SUPPLEMENT_EXAMS).some(x=>x.includes('unregistered'))).toBe(true);
 const cyclic=read();const r=cyclic.records.find(x=>x.status==='duplicate');expect(r).toBeDefined();r.duplicateOf=`${r.source}:${r.locator}`;expect(coverageIssues(cyclic,GRADE6_SUPPLEMENT_EXAMS).some(x=>x.includes('cycle'))).toBe(true);
});
