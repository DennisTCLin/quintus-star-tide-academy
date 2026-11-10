import {writeFileSync} from 'node:fs';
import {LEARNING_BANK,questionById} from '../../src/learning';
import {GENERATED_POOLS,generatedId} from '../../src/question-generator';
import {freshLearning} from '../../src/learning-engine';
import {enableAdaptive,observeAdaptive,reportSchoolExposure,reviewEligible,challengeCandidates} from '../../src/adaptive-learning';
import {examEvidenceMatches} from '../../src/adaptive-source-evidence';
import {topicsFor,topicForQuestion} from '../../src/adaptive-catalog';
import {eligibleExam} from '../../src/school-curriculum';
import {EXPECTED_CHILD_CURRICULA} from '../../src/__tests__/helpers/child-curricula';
const all=[...new Map([...LEARNING_BANK,...GENERATED_POOLS.flatMap(p=>p.params.map((_,i)=>questionById(generatedId(p,i))!))].map(q=>[q.id,q])).values()];
const rows=[];
for(const [child,,grade,school,courses] of EXPECTED_CHILD_CURRICULA){
 const s=freshLearning();s.school=school;enableAdaptive(s);
 const base=all.filter(q=>!q.retired&&!q.rephraseOf&&q.grade===grade&&(!q.examSources?.length||eligibleExam(school,grade,q.course,q)));
 // Synthetic upper bound: every exact item independently solved, every reviewed
 // topic family reports school-taught. No claim about any real child's readiness.
 for(const q of base)observeAdaptive(s,q,true,false,'2026-11-10');
 for(const t of topicsFor(grade))reportSchoolExposure(s,grade,t.id,'taught','2026-11-10');
 for(const [course,[publisher]] of Object.entries(courses)){
  const bank=base.filter(q=>q.course===course),papers=bank.filter(q=>q.examSources?.length),review=bank.filter(q=>reviewEligible(s,q,grade)),challenge=challengeCandidates(s,grade,course as any);
  rows.push({child,grade,school,course,publisher,baselineEligible:bank.length,baselinePapers:papers.length,potentialVoluntaryReview:review.length,potentialChallenge:challenge.length,potentialReviewPapers:review.filter(q=>q.examSources?.length).length,potentialChallengePapers:challenge.filter(q=>q.examSources?.length).length,heldBookOrSeries:bank.filter(q=>!examEvidenceMatches(school,q)).length,heldUnmappedFromChallenge:bank.filter(q=>examEvidenceMatches(school,q)&&!topicForQuestion(q)).length,coldStartChallenge:0,actualChildCounts:'not-read-production'});
 }
}
writeFileSync('output/adaptive-learning-20261110/coverage.json',JSON.stringify({basis:'Candidate capacity under synthetic independent evidence; no production learner access. Baseline uses a4d1e62 catalog and publisher filtering (question IDs/content unchanged). Prior earned bits alone never imply readiness.',rows},null,2)+'\n');
