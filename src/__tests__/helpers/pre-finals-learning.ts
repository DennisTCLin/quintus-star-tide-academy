import {FINALS_NEXT100_20261107} from '../../finals-next100-20261107';
import type {Grade} from '../../learning';
import {freshLearning} from '../../learning-engine';
import {markMastered} from '../../mastered-questions';
import {FINALS_REVIEWED_20261107} from '../../finals-reviewed-20261107';
import {FINALS_ROUND3_20261107} from '../../finals-round3-20261107';
import {FINALS_FOLLOWUP_20261107} from '../../finals-followup-20261107';
/** Freeze historical-bank regression scenarios after a new reviewed batch is added.
 * Current-catalog allocation/exhaustion is covered separately by finals-reviewed and all-child tests.
 */
export function preFinalsLearning(grade:Grade){
 const state=freshLearning();
 for(const q of [...FINALS_REVIEWED_20261107,...FINALS_FOLLOWUP_20261107,...FINALS_ROUND3_20261107,...FINALS_NEXT100_20261107].filter(q=>q.grade===grade))markMastered(state,q.id);
 return state;
}
