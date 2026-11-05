/** Self-contained lossless storage encoding. It never equates seen with mastered. */
export type PackedSeen = {codec:'prefix-v1'; entries:[number,string][]};
const MAX_IDS=100_000, MAX_ID_LENGTH=512, MAX_TEXT=5_000_000;
const invalid=():never=>{throw Error('學習紀錄格式不正確，未更動進度');};
export function packSeen(ids:string[]):string[]|PackedSeen {
 if(ids.length>MAX_IDS||ids.some(id=>typeof id!=='string'||id.length>MAX_ID_LENGTH)||ids.reduce((n,id)=>n+id.length,0)>MAX_TEXT)return ids;
 let previous='';
 const entries:[number,string][]=ids.map(id=>{
  let n=0;while(n<previous.length&&n<id.length&&previous[n]===id[n])n++;
  const entry:[number,string]=[n,id.slice(n)];previous=id;return entry;
 });
 const packed:PackedSeen={codec:'prefix-v1',entries};
 return JSON.stringify(packed).length<JSON.stringify(ids).length?packed:ids;
}
export function unpackSeen(value:unknown):unknown {
 if(Array.isArray(value))return value; // Historical storage remains valid.
 if(!value||typeof value!=='object')return value;
 const p=value as Partial<PackedSeen>;
 if(p.codec!=='prefix-v1'||!Array.isArray(p.entries)||p.entries.length>MAX_IDS)invalid();
 let previous='',total=0;
 const ids:string[]=[];
 for(const entry of p.entries!){
  if(!Array.isArray(entry)||entry.length!==2)invalid();
  const [n,suffix]=entry;
  if(!Number.isSafeInteger(n)||n<0||n>previous.length||typeof suffix!=='string'||suffix.length>MAX_ID_LENGTH)invalid();
  const size=n+suffix.length;
  if(size>MAX_ID_LENGTH||(total+=size)>MAX_TEXT)invalid();
  previous=previous.slice(0,n)+suffix;ids.push(previous);
 }
 return ids;
}
type StoredFamily={profiles:Record<string,{learning?:{seen?:unknown}}>};
/** Called on a clone before the existing full validator; no policy is relaxed. */
export function decodeFamilySeen(value:unknown):void {
 if(!value||typeof value!=='object')return;
 const profiles=(value as StoredFamily).profiles;
 if(!profiles||typeof profiles!=='object'||Array.isArray(profiles))return;
 for(const profile of Object.values(profiles)){
  if(profile?.learning&&typeof profile.learning==='object')profile.learning.seen=unpackSeen(profile.learning.seen);
 }
}
/** Runtime data stays ordinary arrays; only actual JSON persistence is compact. */
export function withCompactSeen<T extends StoredFamily>(family:T):T {
 Object.defineProperty(family,'toJSON',{enumerable:false,configurable:true,value:function(this:T){
  const runtime=globalThis as typeof globalThis & {process?:{env?:Record<string,string|undefined>}};
  if(runtime.process?.env?.STAR_TIDE_COMPACT_SEEN_WRITES==='off')return {...this};
  return {...this,profiles:Object.fromEntries(Object.entries(this.profiles).map(([key,p])=>[
   key,p?.learning&&Array.isArray(p.learning.seen)?{...p,learning:{...p.learning,seen:packSeen(p.learning.seen)}}:p,
  ]))};
 }});
 return family;
}
