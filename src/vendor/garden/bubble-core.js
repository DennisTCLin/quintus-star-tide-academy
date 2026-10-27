// Guided bubble missions: independent of the legacy active-round engine.
export const BUBBLE_GROUPS=[['ma','ㄇㄚ'],['ba','ㄅㄚ'],['yi','ㄧ'],['tang','ㄊㄤ'],['wu','ㄨ']];
export const BUBBLE_ITEMS=BUBBLE_GROUPS.flatMap(([group,base])=>[2,3].map(tone=>({id:`tone-${group}-${tone}`,group,tone,zy:base+(tone===2?'ˊ':'ˇ')})));
export const CARGO=[{id:'banana',icon:'🍌',name:'香蕉'},{id:'apple',icon:'🍎',name:'蘋果'},{id:'grapes',icon:'🍇',name:'葡萄'},{id:'melon',icon:'🍉',name:'西瓜'},{id:'bread',icon:'🥐',name:'麵包'},{id:'cookie',icon:'🍪',name:'餅乾'},{id:'kite',icon:'🪁',name:'風箏'},{id:'shell',icon:'🐚',name:'貝殼'},{id:'ball',icon:'🏐',name:'球'},{id:'drum',icon:'🥁',name:'鼓'},{id:'ribbon',icon:'🎀',name:'蝴蝶結'},{id:'sunflower',icon:'🌻',name:'向日葵'}];
export const bubbleItem=id=>BUBBLE_ITEMS.find(x=>x.id===id);
const shuffled=(a,rng)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function freshBubbles(){return {version:1,serial:0,round:null,pending:[],stats:{},history:[],picnic:null};}
const blankStat=()=>({independent:0,assisted:0,errors:0});
export function makeBoard(tones,cargo){
 const nodes=[];
 tones.forEach((tone,c)=>{const x=12.5+c*25;nodes.push({id:`b${c}a`,tone,x,y:13,anchor:true,links:[`b${c}b`]}, {id:`b${c}b`,tone,x,y:32,anchor:false,links:[`b${c}a`,`c${c}0`]});
 cargo[c].forEach((item,k)=>nodes.push({id:`c${c}${k}`,cargo:item,x,y:51+k*14,anchor:false,links:k?[`c${c}0`]:[`b${c}b`,...(cargo[c].length===2?[`c${c}1`]:[])]}));});return nodes;
}
export function resolveShot(nodes,column,tone){
 const target=`b${column}b`,byId=new Map(nodes.map(n=>[n.id,n]));if(byId.get(target)?.tone!==tone)return {match:false,popped:[],dropped:[],remaining:nodes};
 const shot={id:'shot',tone,anchor:false,links:[target]},all=[...nodes,shot];byId.set('shot',shot);
 const visit=(start,allow)=>{const seen=new Set(),stack=[...start];while(stack.length){const id=stack.pop(),n=byId.get(id);if(!n||seen.has(id)||!allow(n))continue;seen.add(id);for(const link of n.links)stack.push(link);if(id===target)stack.push('shot');}return seen;};
 const match=visit(['shot'],n=>n.tone===tone);if(match.size<3)return {match:false,popped:[],dropped:[],remaining:nodes};
 const rest=all.filter(n=>!match.has(n.id));const connected=visit(rest.filter(n=>n.anchor).map(n=>n.id),n=>!match.has(n.id));const dropped=rest.filter(n=>!connected.has(n.id));
 return {match:true,popped:[...match],dropped,remaining:rest.filter(n=>connected.has(n.id))};
}
function question(target,id,rng,review=false){const tones=shuffled([2,2,3,3],rng),items=shuffled(CARGO.map(x=>x.id),rng);const cargo=tones.map((_,c)=>items.slice(c*2,c*2+1+(c%2)));return {id,target,tones,cargo,heard:false,hinted:false,misses:[],settled:false,reward:0,selected:null,review};}
export function startBubbles(state,rng=Math.random){
 state.bubbles??=freshBubbles();const b=state.bubbles;if(b.round&&!b.round.done)return b.round;
 const rank=shuffled(BUBBLE_ITEMS,rng).sort((a,c)=>Number(b.pending.includes(c.id))-Number(b.pending.includes(a.id)));
 const targets=shuffled([2,3].flatMap(t=>rank.filter(i=>i.tone===t).slice(0,3)),rng);
 b.serial++;const id=`bubble-${Date.now().toString(36)}-${b.serial}-${Math.floor(rng()*1e8)}`;
 b.round={id,index:0,queue:targets.map((i,k)=>question(i.id,id+'-'+k,rng)),earned:0,rechecks:0,collected:[],done:false,mat:'sea',placements:[null,null,null,null],tutorial:b.serial>1};return b.round;
}
export const bubbleCurrent=s=>s.bubbles?.round?.queue[s.bubbles.round.index];
export function selectBubble(state,column){const q=bubbleCurrent(state);if(!q||q.settled||!q.heard||!Number.isInteger(column)||column<0||column>3)return false;q.selected=column;return true;}
export function hintBubble(state){const q=bubbleCurrent(state);if(q&&!q.settled){q.hinted=true;return true;}return false;}
export function shootBubble(state,rng=Math.random){
 const b=state.bubbles,r=b?.round,q=bubbleCurrent(state);if(!q||r.done||q.settled||!q.heard||q.selected===null||state.ledger.includes(q.id))return {ignored:true};
 const item=bubbleItem(q.target),tone=q.tones[q.selected];const result=resolveShot(makeBoard(q.tones,q.cargo),q.selected,item.tone);
 const st=b.stats[q.target]??=blankStat();
 if(!result.match){q.misses.push(tone);q.misses=q.misses.slice(-20);q.hinted=true;st.errors++;if(!b.pending.includes(q.target))b.pending.push(q.target);return {correct:false,column:q.selected};}
 q.settled=true;q.reward=q.hinted||q.misses.length?1:3;const independent=q.reward===3;
 st[independent?'independent':'assisted']++;state.coins+=q.reward;state.ledger.push(q.id);r.earned+=q.reward;
 const cargo=result.dropped.filter(n=>n.cargo).map(n=>n.cargo);r.collected.push(...cargo);
 if(independent)b.pending=b.pending.filter(id=>id!==q.target);else if(!b.pending.includes(q.target))b.pending.push(q.target);
 b.history.push({id:q.id,target:q.target,independent,review:q.review,reward:q.reward,misses:q.misses.length});b.history=b.history.slice(-120);
 if(!independent&&!q.review&&r.rechecks<2&&r.index+3<=r.queue.length){r.queue.splice(r.index+3,0,question(q.target,r.id+'-r'+r.rechecks,rng,true));r.rechecks++;}
 return {correct:true,column:q.selected,reward:q.reward,independent,cargo,...result};
}
export function nextBubble(state){const r=state.bubbles?.round,q=bubbleCurrent(state);if(!r||r.done||!q?.settled)return false;if(r.index+1<r.queue.length)r.index++;else{r.done=true;r.placements=r.collected.slice(0,4);while(r.placements.length<4)r.placements.push(null);savePicnic(state);}return true;}
export function savePicnic(s){const r=s.bubbles?.round;if(!r?.done)return false;s.bubbles.picnic={mat:r.mat,placements:[...r.placements]};return true;}
export function arrangeBubble(s,item,slot){const r=s.bubbles?.round;if(!r?.done||!r.collected.includes(item)||!Number.isInteger(slot)||slot<0||slot>3)return false;r.placements[slot]=item;savePicnic(s);return true;}
// Validate imported state before it can be rendered or rewarded. Missing field = legacy save.
export function validateBubbles(b,ledger){
 if(b===undefined)return;
 const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x),count=x=>Number.isSafeInteger(x)&&x>=0&&x<=1e7,ids=a=>Array.isArray(a)&&a.every(x=>CARGO.some(c=>c.id===x)),placements=a=>Array.isArray(a)&&a.length===4&&a.every(x=>x===null||CARGO.some(c=>c.id===x));
 const fail=()=>{throw Error('invalid bubble save');};
 if(!record(b)||b.version!==1||!count(b.serial)||!Array.isArray(b.pending)||b.pending.length>10||new Set(b.pending).size!==b.pending.length||b.pending.some(id=>!bubbleItem(id))||!record(b.stats)||!Array.isArray(b.history)||b.history.length>120)fail();
 for(const [id,st] of Object.entries(b.stats))if(!bubbleItem(id)||!record(st)||!['independent','assisted','errors'].every(k=>count(st[k])))fail();
 const historyIds=new Set();for(const h of b.history){if(!record(h)||typeof h.id!=='string'||historyIds.has(h.id)||!ledger.includes(h.id)||!bubbleItem(h.target)||typeof h.independent!=='boolean'||typeof h.review!=='boolean'||!count(h.misses)||h.reward!==(h.independent?3:1))fail();historyIds.add(h.id);}
 if(b.picnic!==null&&(!record(b.picnic)||!['sea','sunset','leaf'].includes(b.picnic.mat)||!placements(b.picnic.placements)))fail();
 const r=b.round;if(r===null)return;
 if(!record(r)||typeof r.id!=='string'||!/^bubble-[a-z0-9-]{3,90}$/.test(r.id)||!Array.isArray(r.queue)||r.queue.length<6||r.queue.length>8||!Number.isInteger(r.index)||r.index<0||r.index>=r.queue.length||typeof r.done!=='boolean'||typeof r.tutorial!=='boolean'||!count(r.earned)||!count(r.rechecks)||r.rechecks>2||!ids(r.collected)||r.collected.length>16||!['sea','sunset','leaf'].includes(r.mat)||!placements(r.placements))fail();
 const mains=r.queue.filter(q=>q&&!q.review);if(mains.length!==6||new Set(mains.map(q=>q.target)).size!==6||[2,3].some(t=>mains.filter(q=>bubbleItem(q.target)?.tone===t).length!==3))fail();
 let earned=0,rechecks=0,collect=[];const seen=new Set();
 for(let k=0;k<r.queue.length;k++){const q=r.queue[k];if(!record(q)||typeof q.id!=='string'||!q.id.startsWith(r.id+'-')||q.id.length>130||seen.has(q.id)||!bubbleItem(q.target)||!Array.isArray(q.tones)||q.tones.length!==4||q.tones.filter(t=>t===2).length!==2||q.tones.filter(t=>t===3).length!==2||!Array.isArray(q.cargo)||q.cargo.length!==4||q.cargo.some(a=>!ids(a)||a.length<1||a.length>2)||!['heard','hinted','settled','review'].every(f=>typeof q[f]==='boolean')||!Array.isArray(q.misses)||q.misses.length>20||q.misses.some(t=>![2,3].includes(t))||!(q.selected===null||Number.isInteger(q.selected)&&q.selected>=0&&q.selected<4)||!count(q.reward))fail();seen.add(q.id);rechecks+=Number(q.review);
 if(q.review&&!r.queue.slice(0,Math.max(0,k-2)).some(prior=>!prior.review&&prior.target===q.target&&prior.settled&&(prior.hinted||prior.misses.length)))fail();
 if(q.misses.length&&!q.hinted)fail();if(k<r.index&&!q.settled||k>r.index&&(q.settled||q.heard||q.hinted||q.misses.length||q.selected!==null)||q.selected!==null&&!q.heard)fail();
 if(q.settled){if(!q.heard||q.selected===null||q.tones[q.selected]!==bubbleItem(q.target).tone||q.reward!==(q.hinted||q.misses.length?1:3)||!ledger.includes(q.id))fail();earned+=q.reward;collect.push(...q.cargo[q.selected]);}else if(q.reward!==0||ledger.includes(q.id))fail();
 }
 if(earned!==r.earned||rechecks!==r.rechecks||r.queue.length!==6+rechecks||JSON.stringify(collect)!==JSON.stringify(r.collected)||r.done&&(r.index!==r.queue.length-1||r.queue.some(q=>!q.settled))||r.placements.some(id=>id!==null&&!r.collected.includes(id)))fail();
}
