import type { Game, Item, SceneProps } from './games';
import { cn, cnq, numOpts, ri, shuffle } from './rng';
import { Zy } from './zhuyin';
import { questionId } from './question-contract';
import { teachingSteps,teachingFocus } from './teaching';

// All diagrams are original, generated from quantities; no textbook images or questions.
export type Spec = Omit<Item, 'k' | 'unit'>;
const seq = (n: number) => Array.from({ length: n }, (_, i) => i);
export function question(k: string, p: Record<string, any>, answer: number, text: string, hi = 10): Spec {
  const say = text.replace(/\d+/g, (s, at) => /[顆隻個片條格]/.test(text[at + s.length] ?? '') ? cnq(+s) : cn(+s));
  return { id: `isl-g1-${k}-${Object.entries(p).filter(([key]) => key !== 'diagram').map(([, v]) => v).filter(v => typeof v !== 'object').join('-')}`, p, answer: String(answer), text, say, choices: numOpts(answer, 0, hi) };
}
const answerBox = (s: SceneProps) => <span className="isl-box">{s.done||s.view.show ? s.item.answer : s.pending ?? '?'}</span>;
function Shape({ kind }: { kind: number }) {
  return <svg viewBox="0 0 100 100" className="isl-shape" aria-label={['圓形', '三角形', '正方形', '長方形'][kind]} role="img">
    {kind === 0 ? <circle cx="50" cy="50" r="37" /> : kind === 1 ? <polygon points="50,8 94,88 6,88" /> : kind === 2 ? <rect x="14" y="14" width="72" height="72" /> : <rect x="5" y="27" width="90" height="46" />}
  </svg>;
}
export function Clock({ hour, half, focus=-1 }: { hour: number; half: number; focus?:number }) {
  const hand = (degrees: number, length: number) => ({ x: 100 + Math.sin(degrees * Math.PI / 180) * length, y: 100 - Math.cos(degrees * Math.PI / 180) * length });
  const h = hand((hour % 12) * 30 + half * 15, 45), m = hand(half * 180, 68);
  return <svg className="isl-clock" viewBox="0 0 200 200" role="img" aria-label="時鐘，短針表示時，長針表示分">
    <circle cx="100" cy="100" r="94" fill="#fffdf0" stroke="#234b62" strokeWidth="4" />
    {seq(12).map(i => { const pos = hand((i + 1) * 30, 79); return <text key={i} x={pos.x} y={pos.y + 5} textAnchor="middle" fill="#17324d" fontSize="16">{i + 1}</text>; })}
    <line className={focus===1?'isl-teach-point':''} x1="100" y1="100" x2={h.x} y2={h.y} stroke="#ca4459" strokeWidth="8" strokeLinecap="round" />
    <line className={focus===0?'isl-teach-point':''} x1="100" y1="100" x2={m.x} y2={m.y} stroke="#215da4" strokeWidth="4" strokeLinecap="round" />
    <circle cx="100" cy="100" r="5" fill="#17324d" />
  </svg>;
}

function Diagram(s: SceneProps) {
  const p = s.item.p, step = s.view.step ?? 0;
  const exam = s.mode === 'boss' || s.mode === 'mock';
  const helped = !exam && (step > 0 || s.done);
  switch (p.diagram) {
    case 'bars': return <div className={`isl-measure ${p.vertical ? 'vertical' : ''}`}>
      {[p.a, p.b, p.c].map((n, i) => <div className={`isl-measure-row ${teachingFocus(s,i)}`} key={i}><b>{i + 1}</b><span className="isl-measure-track"><span className="isl-bar" style={p.vertical ? { height: `${n * 15}px`, width: p.thick ? `${n * 6}px` : '30px' } : { width: `${n * 9}%`, marginLeft: !exam && !helped ? `${i * 6}%` : 0, height: p.thick ? `${n * 6}px` : '24px' }} /></span></div>)}
    </div>;
    case 'paths': return <svg className="isl-paths" viewBox="0 0 300 150" role="img" aria-label="一號是直線，二號是彎曲的線">
      <text x="10" y="42">1</text><path className={teachingFocus(s,0)} d="M45 35 L280 35" />
      <text x="10" y="118">2</text><path className={teachingFocus(s,1)} d="M45 110 Q100 15 160 110 T280 110" />
    </svg>;
    case 'order': return <div><p><Zy text={p.reverse ? '從右邊開始數 ←' : '從左邊開始數 →'} /></p><div className="isl-order-row">{seq(p.n).map(i => <span key={i} className={`${i===p.at?'target':''} ${teachingFocus(s,i)}`}>{i === p.at ? '🐰' : '🐢'}{helped && (!s.demo||(p.reverse?p.n-i:i+1)<=step) && <small>{p.reverse ? p.n - i : i + 1}</small>}</span>)}</div></div>;
    case 'groups': return <div className="isl-groups">{[p.a, p.b].map((n, j) => <div key={j} className={teachingFocus(s,j)}><b>{j + 1}</b><div className="isl-counters">{seq(n).map(i => <span className={s.demo&&s.view.focus===2&&i>=Math.min(p.a,p.b)?'isl-teach-point':''} key={i}>●</span>)}</div></div>)}</div>;
    case 'sequence': return <div className="isl-sequence">{[p.n - 1, '?', p.n + 1].map((v, i) => <span className={teachingFocus(s,i)} key={i}>{i === 1 && (s.done || s.view.show || (s.demo&&step>0)) ? p.n : v}</span>)}</div>;
    case 'shapes': return <div className="isl-shape-grid">{p.kinds.map((kind: number, i: number) => <div key={i} className={teachingFocus(s,i)}><b>{i + 1}</b><Shape kind={kind} /></div>)}</div>;
    case 'mosaic': return <div className="isl-mosaic">{seq(p.n).map(i => <span className={teachingFocus(s,i)} key={i}><Shape kind={1} /></span>)}</div>;
    case 'solid': return <div className="isl-shape-grid">{['⚽', '📦', '🥫'].map((v, i) => <div key={i} className={teachingFocus(s,i)}><b>{i + 1}</b><span className="isl-solid">{v}</span><Zy text={['球', '積木方塊', '圓罐'][i]} /></div>)}</div>;
    case 'take': return exam ? <p className="isl-paperline">{p.a} − {p.b} = {answerBox(s)}</p> : <div className="isl-counters isl-take">{seq(p.a).map(i => <span key={i} className={i >= p.a - Math.min(step, p.b) ? 'taken' : ''}>🍎</span>)}</div>;
    case 'difference': return <div className="isl-groups">{[p.a, p.b].map((n, j) => <div className={teachingFocus(s,j)} key={j}><Zy text={j === 0 ? '小熊' : '小兔'} /><div className="isl-counters">{seq(n).map(i => <span key={i} className={`${helped&&i>=p.b?'target':''} ${s.demo&&s.view.focus===2&&i>=p.b?'isl-teach-point':''}`}>●</span>)}</div></div>)}</div>;
    case 'mixed': return <div className="isl-equations"><p className={teachingFocus(s,0)}>{p.a}</p><p className={teachingFocus(s,1)}>+ {p.b}</p><p className={teachingFocus(s,2)}>− {p.c}</p><p className="isl-paperline">= {answerBox(s)}</p></div>;
    case 'bundles': return <div className="isl-bundles">{seq(Math.floor(p.n / 10)).map(i => <div className={`isl-bundle ${teachingFocus(s,i)}`} key={i}><div className="isl-counters">{seq(10).map(j => <span key={j}>│</span>)}</div><b>10</b></div>)}<div className={`isl-counters ${teachingFocus(s,Math.floor(p.n/10))}`}>{seq(p.n % 10).map(i => <span key={i}>│</span>)}</div></div>;
    case 'numerals': return <div className="isl-sequence">{[p.a, p.b, p.c].map((v, i) => <span className={teachingFocus(s,i)} key={i}><small>{i + 1}</small>{v}</span>)}</div>;
    case 'clock': return <Clock hour={p.hour} half={p.half} focus={s.demo?s.view.focus:-1} />;
    case 'clockchoice': return <div className="isl-clock-choices">{p.hours.map((h: number, i: number) => <div key={i}><b>{i + 1}</b><Clock hour={h} half={p.half} focus={s.demo?s.view.focus:-1} /></div>)}</div>;
    case 'events': return <div className="isl-event-grid">{p.events.map((t: string, i: number) => <div className={teachingFocus(s,i)} key={i}><b>{i + 1}</b><Zy text={t} /></div>)}</div>;
    case 'ribbons': return <div className="isl-measure">{[0,1].map(i=><div key={i} className={`isl-measure-row ${teachingFocus(s,i)}`}><b>{i+1}</b><span className="isl-measure-track"><span className="isl-bar" style={{width:`${(i===(p.reverse?1:0)?8:4)*10}%`,marginLeft:step?0:'8%',background:i?'#72c8d1':'#ec8075'}}/></span></div>)}<p><Zy text="同一條繩子"/></p><div className="isl-ribbon" style={{width:'60%',height:6}}/></div>;
    case 'timeline': return <div className="isl-measure">{[p.reverse?p.b:p.a,p.reverse?p.a:p.b].map((n,i)=><div key={i} className={`isl-measure-row ${teachingFocus(s,i)}`}><Zy text={i?'小兔':'小熊'}/><span className="isl-measure-track"><span className="isl-bar" style={{width:`${n*10}%`}}/>{n}<Zy text="點結束"/></span></div>)}</div>;
    default: return <p className="isl-paperline">{answerBox(s)}</p>;
  }
}

export type Definition = { k: string; unit: string; name: string; tip: string; action: string | ((q: Spec) => string); make: () => Spec; steps?: (q: Spec) => number; explanation: (q: Spec) => string };
export function activity(d: Definition, Draw: (s: SceneProps) => JSX.Element = Diagram): Game {
  const steps = (q: Spec) => d.steps?.(q) ?? 1;
  return {
    k: d.k, unit: d.unit, name: d.name, tip: d.tip, make: () => { const q=d.make(); return {...q,id:questionId(d.k,q.p,q.text)}; },
    init: () => ({ step: 0 }),
    act: (q, v) => ({ step: Math.min(steps(q), (v.step ?? 0) + 1) }),
    ready: (q, v, mode) => mode !== 'learn' || v.step >= steps(q),
    Scene(s) { const total = steps(s.item); return <div className="isl-scene isl-semester"><Draw {...s} />
      {!s.demo && !s.done && s.mode === 'learn' && s.view.step < total && <button className="isl-action" onClick={() => s.act({})}><Zy text={typeof d.action==='string'?d.action:d.action(s.item)} /></button>}
      {(s.view.step > 0 || s.demo) && s.mode === 'learn' && <p className="isl-cue"><Zy text={d.tip} /></p>}
      {s.done && <p><Zy text={d.explanation(s.item)} /></p>
    }</div>; },
    Exam(s) { return <div className="isl-paper isl-semester"><Draw {...s} />{!['take', 'mixed', 'none', 'addition', 'swap', 'addpattern', 'subtraction', 'subpattern', 'columns', 'story'].includes(s.item.p.diagram) && <p className="isl-paperline"><Zy text="答：" />{answerBox(s)}</p>}</div>; },
    demo() { const q=d.make(),item:Item={...q,k:d.k,unit:d.unit};
      return {item,steps:teachingSteps(item,d.tip,d.explanation(q),steps(q))}; },
  };
}
const defs: Definition[] = [];
const add = (d: Definition) => defs.push(d);
const labels = ['圓形', '三角形', '正方形', '長方形'];

// Length, height, thickness, straight/curved and indirect comparison.
add({ k:'length', unit:'1A-02', name:'對齊比長短', tip:'先把左邊對齊，再看哪一條伸得最遠。', action:'把左邊對齊',
  make() { const [a,b,c] = shuffle([3,5,8]); return question('length',{diagram:'bars',a,b,c},[a,b,c].indexOf(8)+1,'哪一條最長？填編號。'); },
  explanation:q=>`對齊後，第${cn(+q.answer)}條伸得最遠，所以最長。` });
add({ k:'height', unit:'1A-02', name:'比高矮和厚薄', tip:'底下放在同一條線上，再比高低。厚薄也能比。', action:'看看底下的線',
  make() { const [a,b,c]=shuffle([2,5,8]), thick=ri(0,1); return question('height',{diagram:'bars',a,b,c,vertical:1,thick},[a,b,c].indexOf(8)+1,thick?'哪一塊最厚？填編號。':'哪一根最高？填編號。'); },
  explanation:q=>`第${cn(+q.answer)}個${q.p.thick?'最厚':'最高'}。` });
add({ k:'path', unit:'1A-02', name:'直線與曲線', tip:'直直的沒有彎，彎彎的是曲線。', action:'沿著線看一遍',
  make() { const curved=ri(0,1); return question('path',{diagram:'paths',curved},curved?2:1,curved?'哪一條是曲線？填編號。':'哪一條是直線？填編號。'); }, explanation:q=>`第${cn(+q.answer)}條是${q.p.curved?'曲線':'直線'}。` });
add({ k:'indirect', unit:'1A-02', name:'用繩子比長短', tip:'用同一條繩子，分別比一比。', action:'拿同一條繩子比',
  make() { const reverse=ri(0,1); return question('indirect',{diagram:'ribbons',reverse},reverse?2:1,reverse?'藍帶比繩子長，紅帶比繩子短。哪一條長？紅帶填 1，藍帶填 2。':'紅帶比繩子長，藍帶比繩子短。哪一條長？紅帶填 1，藍帶填 2。'); }, explanation:q=>`比繩子長的那條更長，選${cn(+q.answer)}。` });

add({ k:'ordinal',unit:'1A-03',name:'第幾個與幾個',tip:'先看從哪邊開始，再一個一個數。',action:'標出排隊的位置',
  make() { const n=ri(3,8),at=ri(0,n-1),reverse=ri(0,1),total=ri(0,1); return question('ordinal',{diagram:'order',n,at,reverse,total},total?n:reverse?n-at:at+1,total?'排隊的動物一共有幾隻？':`從${reverse?'右':'左'}邊數，小兔排第幾個？`); }, explanation:q=>q.p.total?`全部有${cnq(q.p.n)}隻。`:`小兔排第${cn(+q.answer)}個。` });
add({ k:'compare',unit:'1A-03',name:'一一對應比多少',tip:'一個配一個，還有剩下的那邊比較多。',action:'把兩邊配一配',
  make() { const a=ri(1,9),b=ri(1,9); return question('compare',{diagram:'groups',a,b},a>b?1:a<b?2:3,'哪邊比較多？左邊填 1，右邊填 2，一樣多填 3。'); }, explanation:q=>q.p.a===q.p.b?'剛好配完，兩邊一樣多。':`第${cn(+q.answer)}邊有剩下，比較多。` });
add({ k:'sequence10',unit:'1A-03',name:'10 以內的順序',tip:'從左邊開始，接著往下數。',action:'指著格子數一遍',
  make() { const n=ri(2,9); return question('sequence10',{diagram:'sequence',n},n,'中間少了哪一個數字？'); }, explanation:q=>`${cn(q.p.n-1)}、${cn(q.p.n)}、${cn(q.p.n+1)}，中間是${cn(q.p.n)}。` });

add({ k:'shape',unit:'1A-05',name:'認識四種平面圖形',tip:'看邊和角，不用看顏色。正方形四條邊一樣長。',action:'沿著圖形的邊看一遍',
  make() { const target=ri(0,3), kinds=shuffle([0,1,2,3]); const q=question('shape',{diagram:'shapes',target},kinds.indexOf(target)+1,`哪一個是${labels[target]}？填編號。`); return {...q,id:`isl-shape-${kinds.join('')}-${target}`,p:{...q.p,kinds}}; }, explanation:q=>`第${cn(+q.answer)}個是${labels[q.p.target]}。` });
add({ k:'mosaic',unit:'1A-05',name:'拼圖與點數圖形',tip:'一片一片數，兩片三角形也能拼成四邊形。',action:'看看每一片三角形',
  make() { const n=ri(2,6); return question('mosaic',{diagram:'mosaic',n},n,'這幅拼圖用了幾片三角形？'); }, explanation:q=>`這裡有${cnq(q.p.n)}片三角形。` });
add({ k:'solid',unit:'1A-05',name:'平面、曲面與堆疊',tip:'球的表面彎彎的。方塊有平平的面。圓罐兩種面都有。',action:'看看三種物品的表面',
  make() { const target=ri(0,2); return question('solid',{diagram:'solid',target},target+1,['哪個表面都是彎的，容易滾動？填編號。','哪個都是平平的面，容易堆高？填編號。','哪個有平面，也有曲面？填編號。'][target]); }, explanation:q=>['球的表面都是彎的。','方塊的面都是平的。','圓罐上下是平面，旁邊是曲面。'][q.p.target] });

add({ k:'subtract',unit:'1A-07',name:'拿走與減法（含零）',tip:'拿走幾個，就劃掉幾個。剩下的是答案。',action:q=>q.p.b?'拿走一顆':'看看沒有拿走的蘋果',steps:q=>q.p.b || 1,
  make() { const a=ri(0,10),b=ri(0,a); return question('subtract',{diagram:'take',a,b},a-b,`有 ${a} 顆蘋果，拿走 ${b} 顆，還有幾顆？`); }, explanation:q=>`${cn(q.p.a)}減${cn(q.p.b)}等於${cn(+q.answer)}。` });
add({ k:'difference',unit:'1A-07',name:'相差多少',tip:'先一個配一個，沒有配到的就是多出來的。',action:'把兩排配一配',
  make() { const a=ri(2,10),b=ri(0,a); return question('difference',{diagram:'difference',a,b},a-b,`小熊有 ${a} 顆糖，小兔有 ${b} 顆。小熊比小兔多幾顆？`); }, explanation:q=>`${cn(q.p.a)}減${cn(q.p.b)}等於${cn(+q.answer)}，多了${cnq(+q.answer)}顆。` });
add({ k:'mixed',unit:'1A-07',name:'加一加，減一減',tip:'先算又來了多少，再算走了多少。',action:'先算加法，再算減法',
  make() { const a=ri(1,6),b=ri(0,10-a),c=ri(0,a+b); return question('mixed',{diagram:'mixed',a,b,c},a+b-c,`有 ${a} 隻小鳥，來了 ${b} 隻，又飛走 ${c} 隻。還有幾隻？`); }, explanation:q=>`先有${cnq(q.p.a+q.p.b)}隻，再減${cn(q.p.c)}，剩下${cnq(+q.answer)}隻。` });

add({ k:'count30',unit:'1A-08',name:'數到 30',tip:'一束是十根。先數整束，再數散開的。',action:'把十根圈成一束',
  make() { const n=ri(11,30); return question('count30',{diagram:'bundles',n},n,'小棒一共有幾根？',30); }, explanation:q=>`${cnq(Math.floor(q.p.n/10))}束和${cnq(q.p.n%10)}根，一共${cnq(q.p.n)}根。` });
add({ k:'sequence30',unit:'1A-08',name:'30 以內的順序',tip:'遇到十九，下一個是二十。二十九後面是三十。',action:'依序指著數字',
  make() { const n=ri(11,29); return question('sequence30',{diagram:'sequence',n},n,'中間少了哪一個數字？',30); }, explanation:q=>`${cn(q.p.n-1)}、${cn(q.p.n)}、${cn(q.p.n+1)}，中間是${cn(q.p.n)}。` });
add({ k:'compare30',unit:'1A-08',name:'30 以內比大小',tip:'先比有幾個十，再比剩下幾個一。',action:'看看哪個數比較大',
  make() { const [a,b,c]=shuffle(seq(20).map(i=>i+11)).slice(0,3); return question('compare30',{diagram:'numerals',a,b,c},Math.max(a,b,c),'哪個數最大？填那個數字。',30); }, explanation:q=>`${cn(+q.answer)}最大。` });

add({ k:'clockhour',unit:'1A-09',name:'認識整點和半點',tip:'長針指十二是整點，指六是半點。短針走過幾，就是幾點。',action:'看看長針，再看短針',
  make() { const hour=ri(1,12),half=ri(0,1); return question('clockhour',{diagram:'clock',hour,half},hour,half?'這是幾點半？填幾點的數字。':'這是幾點整？填幾點的數字。',12); }, explanation:q=>`這是${cn(q.p.hour)}點${q.p.half?'半':'整'}。` });
add({ k:'clockmatch',unit:'1A-09',name:'數字鐘和鐘面',tip:'整點的長針指十二，半點的長針指六。短針也會慢慢走。',action:'比一比三個鐘面',
  make() { const hours=shuffle(seq(12).map(i=>i+1)).slice(0,3),target=ri(0,2),half=ri(0,1); const q=question('clockmatch',{diagram:'clockchoice',target,half},target+1,`哪個鐘是 ${hours[target]} 點${half?'半':'整'}？填編號。`); return {...q,id:`isl-clockmatch-${hours.join('-')}-${target}-${half}`,p:{...q.p,hours}}; }, explanation:q=>`第${cn(+q.answer)}個鐘是${cn(q.p.hours[q.p.target])}點${q.p.half?'半':'整'}。` });
add({ k:'daytime',unit:'1A-09',name:'我的一天與先後',tip:'早上起床，接著吃午餐，晚上睡覺。',action:'把一天的事情想一遍',
  make() { const order=shuffle([0,1,2]),target=ri(0,1),events=order.map(i=>['早上起床','中午吃午餐','晚上睡覺'][i]); const q=question('daytime',{diagram:'events',target},order.indexOf(target?2:0)+1,target?'哪一件事最後做？填編號。':'哪一件事最先做？填編號。'); return {...q,id:`isl-daytime-${order.join('')}-${target}`,p:{...q.p,events}}; }, explanation:q=>q.p.target?'晚上睡覺在最後。':'早上起床在最前面。' });
add({ k:'duration',unit:'1A-09',name:'時間的長短與前後',tip:'同時開始，晚結束的花比較久。',action:'比一比結束的時間',
  make() { const a=ri(2,5),b=ri(6,9),reverse=ri(0,1); return question('duration',{diagram:'timeline',a,b,reverse},reverse?1:2,`兩人同時開始畫畫。小熊 ${reverse?b:a} 點畫完，小兔 ${reverse?a:b} 點畫完。誰畫得比較久？小熊填 1，小兔填 2。`); }, explanation:q=>`晚結束的畫得比較久，選${cn(+q.answer)}。` });

export const SEMESTER_GAMES: Record<string, Game> = Object.fromEntries(defs.map(d => [d.k, activity(d)]));
