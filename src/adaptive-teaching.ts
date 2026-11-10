import type {LearningQuestion} from './learning';
import {generatorPool} from './question-generator';

/** Render a worked example only in the teaching phase. The original question,
 * answer, explanation, ID and historical question hash are never changed. */
export function teachingExample(q:LearningQuestion):LearningQuestion {
 const m=/^n1-(g[124]-(?:add|sub|mul|div|fraction|area|perimeter)-[123])-([0-9a-z]+)$/.exec(q.id);
 if(!m)return q;
 const pool=generatorPool(m[1]),params=pool?.params[parseInt(m[2],36)];if(!pool||!params)return q;
 const [a,b]=params,at=Math.floor(a/10)*10,au=a%10,bt=Math.floor(b/10)*10,bu=b%10;
 let explanation=q.explanation;
 if(pool.skill==='add')explanation=a<10&&b<10?`從 ${a} 開始，再往後數 ${b} 個，最後是 ${a+b}。${a} + ${b} = ${a+b}。`:`把 ${a} 分成 ${at} 和 ${au}，把 ${b} 分成 ${bt} 和 ${bu}。先算 ${at} + ${bt} = ${at+bt}，再算 ${au} + ${bu} = ${au+bu}。合起來 ${at+bt} + ${au+bu} = ${a+b}。`;
 else if(pool.skill==='sub'){
  const tens=au<bu?at-10:at,ones=au<bu?au+10:au;
  explanation=a<10?`從 ${a} 個拿走 ${b} 個，再數剩下的，還有 ${a-b} 個。${a} − ${b} = ${a-b}。`:`把 ${a} 分成 ${tens} 和 ${ones}，把 ${b} 分成 ${bt} 和 ${bu}。先算 ${ones} − ${bu} = ${ones-bu}，再算 ${tens} − ${bt} = ${tens-bt}。合起來 ${tens-bt} + ${ones-bu} = ${a-b}。`;
 }else if(pool.skill==='mul')explanation=a<10?`${b} 個 ${a} 相加：${Array(b).fill(a).join(' + ')} = ${a*b}。所以 ${a} × ${b} = ${a*b}。`:`先把 ${a} 分成 ${at} 和 ${au}。${at} × ${b} = ${at*b}，${au} × ${b} = ${au*b}。再合起來：${at*b} + ${au*b} = ${a*b}。`;
 else if(pool.skill==='div')explanation=`先找 ${b} × ${at} = ${b*at}。${a*b} − ${b*at} = ${au*b}，剩下的可以再分 ${au} 份，因為 ${b} × ${au} = ${b*au}。共 ${at} + ${au} = ${a} 份。`;
 else if(pool.skill==='area')explanation=`每排 ${a} 格，共 ${b} 排。把每排的格數乘上排數：${a} × ${b} = ${a*b}，所以面積是 ${a*b} 平方公分。`;
 else if(pool.skill==='perimeter')explanation=`上下兩條邊合起來 ${a} + ${a} = ${2*a}，左右兩條邊合起來 ${b} + ${b} = ${2*b}。全部相加 ${2*a} + ${2*b} = ${2*(a+b)} 公分。`;
 return {...q,explanation};
}
