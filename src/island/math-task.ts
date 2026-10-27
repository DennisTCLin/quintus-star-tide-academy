export type MathSeed = { a:number; b:number; c:number; d:number; t:number; u:number };
export type MathDiagram = {kind:string; values:number[]; labels?:string[]; unit?:string; text?:string};
export type MathTask = {prompt:string; value:string; wrong:string[]; steps:string[]; diagram:MathDiagram};
export const fmt = (n:number) => String(Math.round(n*1e6)/1e6);
export const gcd = (a:number,b:number):number => b ? gcd(b,a%b) : Math.abs(a);
export const lcm = (a:number,b:number) => a/gcd(a,b)*b;
export const fraction = (n:number,d:number) => {if(!d)throw Error('Zero denominator');if(d<0){n=-n;d=-d;}const g=gcd(n,d);return d/g===1?String(n/g):`${n/g}/${d/g}`;};
export const mixed = (n:number,d:number) => n<d?fraction(n,d):n%d?`${Math.floor(n/d)} 又 ${fraction(n%d,d)}`:String(n/d);
export const fract = (n:number,d:number) => ({n:n/gcd(n,d),d:d/gcd(n,d)});
export function numeric(prompt:string,n:number,steps:string[],diagram:MathDiagram,unit='',gap=1):MathTask {
  const show=(v:number)=>`${fmt(v)}${unit?' '+unit:''}`;
  return {prompt,value:show(n),wrong:[n+gap,n-gap,n+2*gap,n+3*gap].filter(v=>v>=0).map(show),steps,diagram};
}
export function textual(prompt:string,value:string,wrong:string[],steps:string[],diagram:MathDiagram):MathTask {
  return {prompt,value,wrong:wrong.filter(v=>v!==value),steps,diagram};
}
export function rationalTask(prompt:string,n:number,d:number,steps:string[],diagram:MathDiagram):MathTask {
  return {prompt,value:fraction(n,d),wrong:[fraction(n+1,d),fraction(Math.max(0,n-1),d),fraction(n,d+1),fraction(n+2,d)],steps,diagram};
}
export const grid = (a:number,b:number):MathDiagram => ({kind:'grid',values:[a,b]});
export const equation = (...values:number[]):MathDiagram => ({kind:'equation',values});
export const timeText = (minutes:number) => `${Math.floor(minutes/60)%24} 時 ${minutes%60} 分`;
export const divideResult = (n:number,d:number) => `${Math.floor(n/d)} 餘 ${n%d}`;
