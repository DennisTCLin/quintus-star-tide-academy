import {validateBubbles} from './bubble-core.js';
import {COMPANIONS,DEFAULT_COMPANION} from './companions.js';
export const VERSION=1;
export const ITEMS=[
{id:'bow',name:'草莓蝴蝶結',icon:'🎀',price:6,slot:'head'},
{id:'scarf',name:'森林小領巾',icon:'🧣',price:12,slot:'neck'},
{id:'crown',name:'星星小皇冠',icon:'👑',price:24,slot:'head'},
{id:'shirt',name:'海洋小背心',icon:'👕',price:18,slot:'body'},
{id:'ball',name:'彩色小皮球',icon:'🟠',price:8,slot:'toy'},
{id:'bed',name:'柔軟小睡墊',icon:'🛏️',price:20,slot:'bed'},
{id:'treat',name:'夥伴點心罐',icon:'🍪',price:4,slot:'food'}];
export function fresh(){return {version:VERSION,name:'棉花糖',companionId:DEFAULT_COMPANION,companionNames:{},coins:0,owned:[],equipped:{},stats:{},rounds:0,ledger:[],active:null,tutorial:false,history:[]};}
export function shuffle(a,rng=Math.random){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function stat(s,id){return s.stats[id]??={seen:0,first:0,independent:0,assisted:0,errors:0,streak:0,due:0};}
export function createRound(s,theme,mode='mix',rng=Math.random){
 const ranked=shuffle(theme.items,rng).sort((a,b)=>{const sa=stat(s,a.id),sb=stat(s,b.id);const score=x=>((x.errors||x.assisted)&&x.streak<3?100:0)+(x.due<=s.rounds?20:0)-x.seen;return score(sb)-score(sa);});
 const modes=mode==='mix'?['find','choose','find','order','choose','find']:Array(6).fill(mode);
 const seed=Date.now().toString(36)+'-'+Math.floor(rng()*1e8);
 const queue=ranked.slice(0,6).map((t,i)=>question(theme,t,modes[i],seed+'-'+i,rng));
 s.active={id:seed,theme:theme.id,index:0,queue,earned:0,rechecks:0,completed:0};return s.active;
}
export function question(theme,t,mode,id,rng=Math.random){
 const others=shuffle(theme.items.filter(x=>x.id!==t.id),rng);const second=others[0];
 return {id,target:t.id,second:second.id,mode,options:shuffle([t.id,...others.slice(0,2).map(x=>x.id)],rng),numbers:shuffle(theme.items.map(x=>x.id),rng),attempts:0,hinted:false,settled:false,step:0,misses:[],review:false};
}
export function markHint(q){q.hinted=true;}
export function expected(q){return q.mode==='order'&&q.step===1?q.second:q.target;}
export function answer(s,q,selected){
 if(q.settled)return {ignored:true};
 const id=expected(q),correct=id===selected;
 q.attempts++;
 if(!correct){q.misses.push(id);const st=stat(s,id);st.errors++;st.streak=0;st.due=s.rounds;return {correct:false,teach:q.misses.length>=2};}
 if(q.mode==='order'&&q.step===0){q.step=1;return {correct:true,partial:true};}
 return settle(s,q);
}
export function settle(s,q){
 if(q.settled||s.ledger.includes(q.id))return {ignored:true};
 q.settled=true;
 const independent=q.misses.length===0&&!q.hinted;
 const ids=q.mode==='order'?[q.target,q.second]:[q.target];
 let progress=false;
 for(const id of ids){const st=stat(s,id);progress||=st.errors>0&&independent;st.seen++;if(independent){st.first++;st.independent++;st.streak++;st.due=s.rounds+(st.streak>=3?4:1);}else{st.assisted++;st.streak=0;st.due=s.rounds;}}
 const reward=(independent?3:1)+(progress&&q.review?1:0);
 s.coins+=reward;s.ledger.push(q.id);s.active.earned+=reward;s.active.completed++;
 s.history.push({time:Date.now(),ids,mode:q.mode,independent,hints:q.hinted,misses:q.misses.length,reward});s.history=s.history.slice(-1000);
 return {correct:true,complete:true,reward,independent};
}
export function scheduleReview(s,q,theme,rng=Math.random){
 const r=s.active;if(!q.hinted&&!q.misses.length||r.rechecks>=2||q.review||r.index+3>r.queue.length)return false;
 const target=theme.items.find(x=>x.id===(q.misses[0]||q.target));
 const repeat=question(theme,target,q.mode==='choose'?'find':'choose',r.id+'-r'+r.rechecks,rng);repeat.review=true;
 const at=Math.min(r.index+3,r.queue.length);r.queue.splice(at,0,repeat);r.rechecks++;return true;
}
export function finishRound(s){if(!s.active||s.active.completed!==s.active.queue.length)return false;s.rounds++;const summary={earned:s.active.earned,total:s.active.completed};s.active=null;return summary;}
export function purchase(s,id){const item=ITEMS.find(x=>x.id===id);if(!item)return {ok:false};if(s.owned.includes(id))return {ok:false,reason:'owned'};if(s.coins<item.price)return {ok:false,reason:'funds'};s.coins-=item.price;s.owned.push(id);if(item.slot!=='food')s.equipped[item.slot]=id;return {ok:true};}
export function equip(s,id){const item=ITEMS.find(x=>x.id===id);if(!item||!s.owned.includes(id)||item.slot==='food')return false;if(s.equipped[item.slot]===id)delete s.equipped[item.slot];else s.equipped[item.slot]=id;return true;}
export function validateSave(v){
 const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const count=x=>Number.isSafeInteger(x)&&x>=0&&x<=1e7;
 if(!record(v)||v.version!==VERSION||!count(v.coins)||typeof v.name!=='string'||v.name.length>12||!Array.isArray(v.owned)||v.owned.some(id=>!ITEMS.some(i=>i.id===id))||!record(v.stats)||!Array.isArray(v.ledger)||v.ledger.some(id=>typeof id!=='string')||!count(v.rounds))throw Error('invalid save');
 for(const st of Object.values(v.stats)){if(!record(st))throw Error('invalid stats');for(const k of ['seen','first','independent','assisted','errors','streak','due'])if(!count(st[k]))throw Error('invalid stats');}
 validateBubbles(v.bubbles,v.ledger);
 // Validate before import or reward mutation. Older saves may omit these fields.
 const modes=['find','choose','order','tone','medial-listen','medial-build','medial-read','pair-listen','pair-read'];
 if(v.history!==undefined&&(!Array.isArray(v.history)||v.history.some(x=>!record(x)||!Number.isFinite(x.time)||x.time<0||!Array.isArray(x.ids)||x.ids.length<1||x.ids.some(id=>typeof id!=='string')||!modes.includes(x.mode)||typeof x.independent!=='boolean'||typeof x.hints!=='boolean'||!count(x.misses)||!count(x.reward))))throw Error('invalid history');
 const levels={pausedTones:['pair','all'],pausedMedials:['simple','blend'],pausedPairs:['c-ch','zh-z','m-f','en-eng']};
 for(const [field,allowed] of Object.entries(levels))if(v[field]!==undefined&&(!record(v[field])||Object.entries(v[field]).some(([level,r])=>!allowed.includes(level)||!record(r)||!Array.isArray(r.queue))))throw Error('invalid parked rounds');
 for(const [field,allowed] of Object.entries({toneLevel:levels.pausedTones,medialLevel:levels.pausedMedials,pairLevel:levels.pausedPairs}))if(v[field]!==undefined&&!allowed.includes(v[field]))throw Error('invalid level');
 const patterns={toneConfusions:/^[1-4]>[1-4]$/,medialConfusions:/^[ㄧㄨㄩ]>[ㄧㄨㄩ]$/,pairConfusions:/^(c-ch\|[ㄘㄔ]>[ㄘㄔ]|zh-z\|[ㄓㄗ]>[ㄓㄗ]|m-f\|[ㄇㄈ]>[ㄇㄈ]|en-eng\|[ㄣㄥ]>[ㄣㄥ])$/};
 for(const [field,pattern] of Object.entries(patterns))if(v[field]!==undefined&&(!record(v[field])||Object.entries(v[field]).some(([key,n])=>!pattern.test(key)||!count(n))))throw Error('invalid confusion counters');
 if(v.companionNames!==undefined&&(!record(v.companionNames)||Object.entries(v.companionNames).some(([id,n])=>!COMPANIONS.some(p=>p.id===id)||typeof n!=='string'||n.length>12)))throw Error('invalid companion names');
 if(v.equipped!==undefined&&!record(v.equipped))throw Error('invalid equipment');
 const companionId=COMPANIONS.some(p=>p.id===v.companionId)?v.companionId:DEFAULT_COMPANION;
 return {...fresh(),...v,companionId,history:v.history||[],companionNames:v.companionNames||{},equipped:Object.fromEntries(Object.entries(v.equipped||{}).filter(([slot,id])=>v.owned.includes(id)&&ITEMS.some(i=>i.id===id&&i.slot===slot)))};
}
