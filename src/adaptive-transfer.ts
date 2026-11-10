import {generatorPool} from './question-generator';
import type {LearningQuestion} from './learning';

/** Frozen numeric-template whitelist, not topic-wide mastery.
 * Exact pool fixes grade, operation and numeric range. Digit shape and carries /
 * borrows further separate procedures. Facts, papers, wording variants, geometry
 * and division are deliberately excluded until their transfer contracts are reviewed.
 */
export function transferSignature(q:LearningQuestion):string|undefined {
 if(q.examSources?.length||q.rephraseOf||q.course!=='math')return;
 const match=/^n1-(g[124]-(?:add|sub|mul|fraction)-[123])-([0-9a-z]+)$/.exec(q.id);
 if(!match)return;
 const pool=generatorPool(match[1]), index=parseInt(match[2],36),p=pool?.params[index];
 if(!pool||!p||index.toString(36)!==match[2])return;
 const [a,b,d]=p, digits=(n:number)=>String(n).length;
 if(pool.skill==='fraction')return `${pool.key}:proper-same-denominator:${d}:${digits(a)}:${digits(b)}:${digits(a+b)}:carry:${Number(a%10+b%10>=10)}`;
 if(pool.skill==='mul') {
  // Grade 2 uses the same multiplication table; grade 4 has a one-digit
  // multiplier and the same long-multiplication carry pattern.
  if(pool.grade===2)return `${pool.key}:table:${b}`;
  const ones=Math.floor((a%10)*b/10),tens=Math.floor(Math.floor(a/10)*b+ones);
  return `${pool.key}:${digits(a)}x${digits(b)}=${digits(a*b)}:carry:${Number(ones>0)}:${Number(tens>=10)}`;
 }
 let x=a,y=b,carry=0,pattern='';
 while(x>0||y>0){const left=x%10,right=y%10;carry=pool.skill==='add'?Number(left+right+carry>=10):Number(left-carry<right);pattern+=carry;x=Math.floor(x/10);y=Math.floor(y/10);}
 return `${pool.key}:${digits(a)}:${digits(b)}:${digits(pool.skill==='add'?a+b:a-b)}:${pattern}`;
}
