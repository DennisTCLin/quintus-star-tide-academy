import type { LearningQuestion } from './learning';

/** Original general warm-ups, not a publisher's textbook or a school's assessment. */
export const GRADE5_STARTER: LearningQuestion[] = [];
const gcd = (a:number,b:number):number => b ? gcd(b,a%b) : a;
const fraction = (a:number,b:number) => {const d=gcd(a,b);return b/d===1?String(a/d):`${a/d}/${b/d}`;};
function add(unit:string,index:number,prompt:string,answer:string,others:string[],hint:string,explanation:string) {
 const choices=[answer,...others];const offset=index%4;
 const values=[...choices.slice(offset),...choices.slice(0,offset)];
 GRADE5_STARTER.push({id:`g5-warmup-${unit}-${index+1}`,grade:5,course:'math',subject:'math',prompt,
  options:values.map(text=>({text})),answer:values.indexOf(answer),hint,explanation,skill:'math',level:2});
}
for(let i=0;i<10;i++) {
 const n=i+2;
 add('common-factor',i,`${2*n} 和 ${3*n} 的最大公因數是多少？`,String(n),[String(n+1),String(2*n),String(3*n)],
  '找出兩個數共同的因數，再選最大的。',`${2*n}=2×${n}，${3*n}=3×${n}。2 和 3 沒有大於 1 的公因數，所以最大公因數是 ${n}。`);
 add('common-multiple',i,`${n} 和 ${2*n} 的最小公倍數是多少？`,String(2*n),[String(n),String(3*n),String(4*n)],
  '較大的數如果是較小數的倍數，最小公倍數就是較大的數。',`${2*n} 是 ${n} 的 2 倍，且也是 ${2*n} 的倍數，所以最小公倍數是 ${2*n}。`);
 add('fraction-add',i,`1/${n}＋1/${2*n} 等於多少？`,fraction(3,2*n),[fraction(1,2*n),fraction(1,n),fraction(2,3*n)],
  '先通分成相同分母，再相加分子。',`1/${n}=2/${2*n}，所以 2/${2*n}＋1/${2*n}=3/${2*n}，約分後是 ${fraction(3,2*n)}。`);
 add('fraction-subtract',i,`1/2－1/${2*n} 等於多少？`,fraction(n-1,2*n),[fraction(n+1,2*n),fraction(1,2*n+2),'1/2'],
  '先把二分之一通分，再相減分子。',`1/2=${n}/${2*n}，相減得到 ${n-1}/${2*n}，約分後是 ${fraction(n-1,2*n)}。`);
 const base=2*(i+3),height=i+4,area=base*height/2;
 add('triangle-area',i,`三角形的底是 ${base} 公分，對應的高是 ${height} 公分，面積是多少平方公分？`,String(area),[String(area*2),String(area+base),String(area+height)],
  '三角形面積＝底×高÷2。',`${base}×${height}÷2=${area}，面積是 ${area} 平方公分。`);
 const length=i+3,width=i+4,depth=i+5,volume=length*width*depth;
 add('cuboid-volume',i,`長方體長 ${length} 公分、寬 ${width} 公分、高 ${depth} 公分，體積是多少立方公分？`,String(volume),[String(length+width+depth),String(volume+length),String(volume*2)],
  '長方體體積＝長×寬×高。',`${length}×${width}×${depth}=${volume}，體積是 ${volume} 立方公分。`);
}
