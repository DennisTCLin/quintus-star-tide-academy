// Synthetic families only. Exercise the current account/school mapping across every course.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as g from '../../build/game.mjs';
import {SCHOOL_ROSTER,applySchoolCurriculum} from '../../server/school-roster.mjs';
const day='2026-10-26',rows=[];
for(const student of SCHOOL_ROSTER)for(const course of g.COURSES[student.grade]){
 const f=g.newFamily(),id=student.playerId;
 applySchoolCurriculum(f,{username:student.username,player_id:id,member_id:'synthetic-curriculum-check'});
 const p=f.profiles[id];g.startRun(f,id,course.id,crypto.randomUUID(),42,false,day,'relaxed');const r=p.run;
 for(let i=0;i<6;i++){g.readyQuestion(f,id,r.id,i);g.answerRun(f,id,r.id,i,g.questionById(r.questions[i]).answer,day,0);if(i<5)g.nextQuestion(f,id,r.id,i);}
 assert.equal(r.capture.outcome,'pending');const t=r.capture.trial;assert.equal(new Set(t.questions).size,3);
 const before=structuredClone({coins:p.coins,tickets:p.tickets,growth:p.growth,learning:p.learning});
 for(let i=0;i<3;i++){const q=g.questionById(t.questions[i]);assert.equal(q.grade,student.grade);assert.equal(q.course,course.id);assert(!r.questions.includes(q.id));g.answerCapture(f,id,'voyage',r.id,i,q.answer,day);}
 assert.equal(r.capture.outcome,'joined');assert.equal(p.owned[r.capture.monster],1);assert.deepEqual({coins:p.coins,tickets:p.tickets,growth:p.growth,learning:p.learning},before);g.validateFamily(f);
 rows.push({account:student.username,grade:student.grade,course:course.id,passed:true});
}
writeFileSync('outputs/monster-wave4/capture-curricula.json',JSON.stringify({syntheticFamilies:true,realPlayerWrites:false,checks:rows},null,2)+'\n');console.log('PASS',rows.length,'account/course combinations: grade, course, new questions, guaranteed capture and preserved rewards');
