import {it,expect} from 'vitest';
import math from '../data/g4-math-kangxuan-114mid.json';
import science from '../data/g4-science-kangxuan-114mid.json';
import social from '../data/g4-social-kangxuan-114mid.json';
import chinese from '../data/g1-chinese-kangxuan-114mid.json';
import {MATH_EXAMS} from '../math-exams';
import {SCIENCE_EXAMS} from '../science-exams';
import {SOCIAL_EXAMS} from '../social-exams';
import {GRADE1_CHINESE_KANGXUAN_EXAMS} from '../grade1-chinese-kangxuan-exams';
import {EXAM_SOURCES} from '../exam-sources';

// Fixed source counts characterize the already-published expansions. Historical
// cohort tests must not mistake these later sources for their original batch.
const cohorts=[
 {name:'math',rows:math,bank:MATH_EXAMS,grade:4,count:132,counts:{'g4m-k1':31,'g4m-k2':23,'g4m-k3':27,'g4m-k4':22,'g4m-k5':29}},
 {name:'science',rows:science,bank:SCIENCE_EXAMS,grade:4,count:115,counts:{'g4sc-k1':25,'g4sc-k2':24,'g4sc-k3':24,'g4sc-k4':15,'g4sc-k5':28}},
 {name:'social',rows:social,bank:SOCIAL_EXAMS,grade:4,count:120,counts:{'g4so-k1':22,'g4so-k2':31,'g4so-k3':20,'g4so-k4':29,'g4so-k5':18}},
 {name:'chinese',rows:chinese,bank:GRADE1_CHINESE_KANGXUAN_EXAMS,grade:1,count:54,counts:{'g1ch-k1':9,'g1ch-k2':22,'g1ch-k4':5,'g1ch-k5':18}},
];
for(const c of cohorts)it(`preserves the published ${c.name} expansion's exact sources and answers`,()=>{
 const counts:Record<string,number>={};
 for(const row of c.rows)counts[row.sourceId]=(counts[row.sourceId]??0)+1;
 expect(counts).toEqual(c.counts);
 const ids=new Set(c.rows.map(row=>row.sourceId));
 const questions=c.bank.filter(q=>q.examSources?.some(s=>ids.has(s.id)));
 expect(questions).toHaveLength(c.count);
 for(const row of c.rows){
  const matches=questions.filter(q=>q.examSources!.some(s=>s.id===row.sourceId&&s.locator===row.locator));
  expect(matches).toHaveLength(1);
  const q=matches[0];expect(q.grade).toBe(c.grade);expect(q.publisher).toBe('康軒');
  expect(q.options[q.answer].text).toBe(row.options[row.answer]);
  expect(EXAM_SOURCES[row.sourceId as keyof typeof EXAM_SOURCES].status).toBe('active');
 }
});
