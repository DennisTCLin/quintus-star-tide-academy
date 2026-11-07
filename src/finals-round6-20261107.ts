import rows from './data/finals-round6-20261107.json';
import type {LearningQuestion} from './learning';

/** Individually reviewed self-contained source intersections. */
export const FINALS_ROUND6_20261107:LearningQuestion[]=rows.map(row=>({
 ...row,
 options:row.options.map(text=>({text,...(/^[ㄅ-ㄯˊˇˋ˙]+$/.test(text)?{zy:text}:{})})),
})) as LearningQuestion[];
