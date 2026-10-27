import { numberTask } from './math-numbers';
import { fractionTask } from './math-fractions';
import { geometryTask } from './math-geometry';
import { applicationTask } from './math-applications';
import type { MathSeed, MathTask } from './math-task';
export function upperTask(code:string,seed:MathSeed):MathTask {
  const [kind,arg='',extra='']=code.split(':');
  const result=numberTask(kind,arg,extra,seed)??fractionTask(kind,arg,extra,seed)??geometryTask(kind,arg,extra,seed)??applicationTask(kind,arg,extra,seed);
  if(!result)throw Error(`Missing math lesson: ${code}`);
  if(!result.value||result.steps.length<3)throw Error(`Incomplete math lesson: ${code}`);
  return result;
}
