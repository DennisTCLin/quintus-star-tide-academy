import type { ReactNode } from 'react';
import type { MathDiagram as Diagram } from './math-task';
import { fmt } from './math-task';
import { CircleAreaDiagram } from './CircleAreaDiagram';

const seq=(n:number)=>Array.from({length:Math.max(0,Math.min(200,n))},(_,i)=>i);
const colors=['#167b91','#cc683c','#59873b','#7653a1'];
export function MathDiagram({diagram,step=0,tool}:{diagram:Diagram;step?:number;tool?:number}) {
  const {kind,values:v,labels=[]}=diagram;
  const svg=(body:ReactNode,height=230)=><svg className="isl-math-svg" viewBox={'0 0 340 '+height} role="img" aria-label={(labels.join('、')||kind)+' '+v.map(fmt).join('、')}>{body}</svg>;
  const text=(x:number,y:number,value:string|number,size=16)=><text x={x} y={y} textAnchor="middle" fontSize={size} fill="#173e50">{value}</text>;
  if(kind==='circle'&&diagram.text==='area')return <CircleAreaDiagram radius={v[0]} step={step}/>;
  if(kind==='table')return <table className="isl-math-table"><caption>調查紀錄</caption><thead><tr><th>類別</th><th>數量</th></tr></thead><tbody>{v.map((n,i)=><tr key={i} className={step%v.length===i?'is-focus':''}><th>{labels[i]}</th><td>{fmt(n)}</td></tr>)}</tbody></table>;
  if(kind==='place') {
    const n=v[0],decimal=v.length>1&&v[1]<=3,parts=fmt(n).split(''),point=parts.indexOf('.');
    const names=['個','十','百','千','萬','十萬','百萬','千萬','億','十億'];
    return <div className="isl-math-place">{parts.map((ch,i)=><div key={i} className={i===step%parts.length?'is-focus':''}><small>{ch==='.'?'小數點':decimal&&point>=0&&i>point?['十分位','百分位','千分位'][i-point-1]:names[(point<0?parts.length:point)-i-1]??'位'}</small><b>{ch}</b></div>)}</div>;
  }
  if(kind==='money')return <div className="isl-math-money">{v.map((n,i)=><div key={i} className={step===i+1?'is-focus':''}><span>{n}<small>元</small></span><b>× {labels[i]} 枚</b></div>)}</div>;
  if(kind==='columns')return <div className="isl-math-columns"><p>{fmt(v[0])}</p><p>{v[2]<0?'−':'+'} {fmt(v[1])}</p><div>?</div></div>;
  if(['equation','units','scale','timeline','factors'].includes(kind))return <div className="isl-math-quantities">{diagram.text?<p>{diagram.text}</p>:v.slice(0,kind==='factors'&&v.length>2&&!step?1:undefined).map((n,i)=><span className={step===i+1?'is-focus':''} key={i}><small>{labels[i]??''}</small><b>{fmt(n)}</b></span>)}{kind==='units'&&<p>換成相同單位，再比較或計算。</p>}{kind==='timeline'&&<span className="isl-math-arrow" aria-hidden="true">→</span>}</div>;
  if(kind==='round') {
    const n=v[0],place=v[2],lo=Math.floor(n/place)*place,hi=lo+place;
    return svg(<><line x1="30" y1="125" x2="310" y2="125" stroke="#173e50" strokeWidth="3"/>{[lo,hi].map((value,i)=><g key={i}><line x1={30+i*280} y1="115" x2={30+i*280} y2="135" stroke="#173e50"/>{text(30+i*280,158,value)}</g>)}<circle cx={30+(n-lo)/place*280} cy="125" r="8" fill="#cc683c"/>{text(30+(n-lo)/place*280,98,n)}</>,190);
  }
  if(kind==='bars'||kind==='balance') {
    const max=Math.max(1,...v);
    return svg(<>{v.map((n,i)=><g key={i} className={step===i+1?'isl-math-highlight':''} style={{opacity:step===0?.3:step===1&&i>0?.3:1,transition:'opacity .35s ease'}}>{text(42,44+i*53,labels[i]??String.fromCharCode(65+i),15)}<rect x="80" y={23+i*53} width={n/max*180} height="28" rx="5" fill={colors[i%4]}/>{text(102+n/max*180,43+i*53,fmt(n),13)}</g>)}</>,Math.max(140,v.length*53+15));
  }
  if(kind==='groups'||kind==='bag') {
    const groups=kind==='bag'?v.length:Math.min(v[1],8),count=kind==='bag'?v:seq(groups).map(()=>Math.min(v[0],10));
    return <div className="isl-math-groups">{seq(groups).map(i=><div className={step>0&&i<(tool??step)?'is-focus':''} key={i} style={{opacity:step===0?.3:step===1&&i>0?.3:1,transform:step<2&&i>0?'translateY(10px)':'none',transition:'opacity .35s ease,transform .35s ease'}}><small>{kind==='bag'?labels[i]:'第 '+(i+1)+' 組'}</small><div>{seq(count[i]).map(j=><i key={j} style={{background:colors[i%4]}}/>)}</div>{kind!=='bag'&&v[0]>10&&<b>每組 {v[0]}</b>}</div>)}{kind!=='bag'&&(v[1]>8||v[0]>10)&&<p>共有 {v[1]} 組，每組 {v[0]} 個。圖中只畫出部分組別。</p>}{kind!=='bag'&&v[2]>0&&<p>另有 {v[2]} 個還沒分組。</p>}</div>;
  }
  if(kind==='fraction'||kind==='fractiongrid') {
    if(kind==='fractiongrid')return <div className="isl-math-fraction-grid" style={{gridTemplateColumns:'repeat('+v[1]+',minmax(0,1fr))'}}>{seq(v[1]*v[3]).map(i=><i key={i} className={step>=2&&i%v[1]<v[0]&&Math.floor(i/v[1])<v[2]?'filled':step>=1&&i%v[1]<v[0]?'partial':''}/>)}</div>;
    return <div className="isl-math-fractions">{[0,...(v.length>=4?[2]:[])].map(offset=>{const n=v[offset],d=v[offset+1],whole=Math.floor(n/d),rem=n%d;return <div key={offset}><p>每個整體分成 {d} 等份</p>{whole>0&&<b className="isl-math-wholes">{whole} 個完整整體{rem?'，再加下面的部分':''}</b>}{(rem>0||whole===0)&&<div className="isl-math-fraction-bar" style={{gridTemplateColumns:'repeat('+d+',minmax(0,1fr))'}}>{seq(d).map(i=><i key={i} style={{animationDelay:i*45+'ms'}} className={step>=2&&i<(tool??rem)?'filled':''}/>)}</div>}</div>;})}</div>;
  }
  if(kind==='decimalgrid')return <div className="isl-math-quantities"><span><small>一份</small><b>1/{v[1]}</b></span><span><small>份數</small><b>{v[0]}</b></span><p>每 {v[1]} 份合成一個整體。</p></div>;
  if(['grid','area','perimeter','parallelogram','trapezoid'].includes(kind)) {
    const w=v[0],h=kind==='trapezoid'?v[2]:v[1],sx=240/Math.max(1,w),sy=140/Math.max(1,h);
    return svg(<>{kind==='parallelogram'?<polygon points="70,180 290,180 250,40 30,40" fill="#bde5df" stroke="#167b91" strokeWidth="3"/>:kind==='trapezoid'?<polygon points="70,40 230,40 290,180 20,180" fill="#bde5df" stroke="#167b91" strokeWidth="3"/>:<rect x="40" y="40" width="240" height="140" fill="#bde5df" stroke="#167b91" strokeWidth="3"/>}
      {(kind==='grid'||kind==='area')&&w<=20&&h<=20&&<g stroke="#6a9f9c">{seq(w-1).map(i=><line key={'x'+i} x1={40+(i+1)*sx} x2={40+(i+1)*sx} y1="40" y2="180"/>)}{seq(h-1).map(i=><line key={'y'+i} x1="40" x2="280" y1={40+(i+1)*sy} y2={40+(i+1)*sy}/>)}</g>}
      {kind==='area'&&v.length===4&&<rect x={280-v[2]*sx} y="40" width={v[2]*sx} height={v[3]*sy} fill="#fffdf3" stroke="#cc683c" strokeWidth="2" strokeDasharray="5 3"/>}
      {text(160,210,'底 '+fmt(kind==='trapezoid'?v[1]:w))}{text(310,115,'高 '+fmt(h))}{kind==='trapezoid'&&text(150,28,'上底 '+v[0])}{(kind==='parallelogram'||kind==='trapezoid')&&<path d="M110 40 V180 h15 v-15 h-15" fill="none" stroke="#cc683c" strokeDasharray="5 3"/>}{kind==='perimeter'&&<rect className="isl-math-trace" x="40" y="40" width="240" height="140" fill="none" stroke="#cc683c" strokeWidth="5"/>}
    </>);
  }
  if(kind==='ruler') {
    const start=v[0],end=v[1],max=Math.ceil(end+1),px=280/Math.max(1,max);
    return svg(<><rect x="25" y="94" width="280" height="65" fill="#f6dfa2" rx="5"/>{seq(Math.min(31,max+1)).map(i=><g key={i}><line x1={25+i*px} x2={25+i*px} y1="94" y2="114" stroke="#173e50"/>{text(25+i*px,142,i,12)}</g>)}<line x1={25+start*px} x2={25+end*px} y1="65" y2="65" stroke="#cc683c" strokeWidth="12" strokeLinecap="butt"/>{text(165,33,'起點到終點的距離')}</>,185);
  }
  if(kind==='clock') {
    const hour=v[0],minute=v[1],point=(angle:number,r:number)=>[170+Math.sin(angle*Math.PI/180)*r,112-Math.cos(angle*Math.PI/180)*r];
    const h=point(hour%12*30+minute/2,49),m=point(minute*6,76);
    return svg(<><circle cx="170" cy="112" r="98" fill="#fffdf3" stroke="#173e50" strokeWidth="3"/>{seq(60).map(i=>{const p=point(i*6,94),q=point(i*6,i%5===0?87:90);return <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#426e7d" strokeWidth={i%5===0?2:1}/>;})}{seq(12).map(i=>{const p=point((i+1)*30,78);return <g key={i}>{text(p[0],p[1]+5,i+1)}</g>;})}<line className="isl-math-clock-hand" x1="170" y1="112" x2={h[0]} y2={h[1]} stroke="#cc683c" strokeWidth="7" strokeLinecap="round" opacity={step===0?.3:1}/><line className="isl-math-clock-hand" x1="170" y1="112" x2={m[0]} y2={m[1]} stroke="#167b91" strokeWidth="4" strokeLinecap="round" opacity={step<2?.3:1}/><circle cx="170" cy="112" r="5" fill="#173e50"/></>);
  }
  if(kind==='angle'||kind==='protractor') {
    const angle=tool??v[0],origin=kind==='protractor'?180:112,r=kind==='protractor'?120:85,x=170+Math.cos(angle*Math.PI/180)*r,y=origin-Math.sin(angle*Math.PI/180)*r;
    return svg(<>{kind==='protractor'&&<><path d="M40 180 A130 130 0 0 1 300 180" fill="#e0efe8" stroke="#426e7d"/>{seq(13).map(i=>{const deg=i*15,px=170+Math.cos(deg*Math.PI/180)*112,py=180-Math.sin(deg*Math.PI/180)*112;return <g key={i}>{text(px,py,deg,11)}</g>;})}</>}<line x1="170" y1={origin} x2="300" y2={origin} stroke="#173e50" strokeWidth="4"/><line className="isl-math-angle-ray" x1="170" y1={origin} x2={x} y2={y} stroke="#cc683c" strokeWidth="4"/><circle cx="170" cy={origin} r="5" fill="#173e50"/>{text(175,227,angle+'°')}{v[1]!==undefined&&text(260,25,'乙角 '+v[1]+'°')}</>,245);
  }
  if(kind==='triangle') {
    const angles=diagram.text==='angles',base=angles?1:v.length===2?v[0]:v[2];
    const x=angles?Math.sin(v[3]*Math.PI/180)*Math.cos(v[2]*Math.PI/180)/Math.sin((v[2]+v[3])*Math.PI/180):v.length===2?base/2:(v[0]**2+base**2-v[1]**2)/(2*base);
    const h=angles?Math.sin(v[3]*Math.PI/180)*Math.sin(v[2]*Math.PI/180)/Math.sin((v[2]+v[3])*Math.PI/180):v.length===2?v[1]:Math.sqrt(Math.max(0,v[0]**2-x*x));
    const scale=Math.min(240/Math.max(base,x,1),140/Math.max(h,.01)),left=170-base*scale/2;
    return svg(<><polygon points={left+',185 '+(left+base*scale)+',185 '+(left+x*scale)+','+(185-h*scale)} fill="#bde5df" stroke="#167b91" strokeWidth="3" className={step?'isl-math-trace':''}/>{angles?<>{text(left,207,v[2]+'°')}{text(left+base*scale,207,v[3]+'°')}</>:text(170,223,v.length===2?'底 '+v[0]+'，高 '+v[1]:'三邊：'+v.map(fmt).join('、'))}</>,245);
  }
  if(kind==='polygon') {
    const points=seq(v[0]).map(i=>(170+Math.cos(-Math.PI/2+i*2*Math.PI/v[0])*95)+','+(115+Math.sin(-Math.PI/2+i*2*Math.PI/v[0])*90)).join(' ');
    return svg(<polygon points={points} fill="#bde5df" stroke="#167b91" strokeWidth="3" className={step?'isl-math-trace':''}/>);
  }
  if(['solid','prism','pyramid','cylinder','sphere'].includes(kind)) {
    if(kind==='sphere')return svg(<><circle cx="170" cy="112" r="85" fill="#bde5df" stroke="#167b91" strokeWidth="3"/><ellipse cx="170" cy="112" rx="85" ry="25" fill="none" stroke="#426e7d" strokeDasharray="5 4"/></>);
    if(kind==='cylinder')return svg(<><path d="M90 55 V175 A80 25 0 0 0 250 175 V55" fill="#bde5df" stroke="#167b91" strokeWidth="3"/><ellipse cx="170" cy="55" rx="80" ry="25" fill="#d9f3eb" stroke="#167b91" strokeWidth="3"/>{text(170,60,'r = '+v[0])}{text(283,130,'高 '+v[1])}</>);
    if(kind==='prism'||kind==='pyramid') {
      const n=v[0],points=seq(n).map(i=>({x:170+Math.cos(i*2*Math.PI/n)*90,y:165+Math.sin(i*2*Math.PI/n)*28}));
      return svg(<><polygon points={points.map(p=>p.x+','+p.y).join(' ')} fill="#bde5df" stroke="#167b91" strokeWidth="2"/>{points.map((p,i)=><line key={i} x1={p.x} y1={p.y} x2={kind==='pyramid'?170:p.x} y2={kind==='pyramid'?35:p.y-105} stroke="#167b91" strokeWidth="2"/>)}{kind==='prism'&&<polygon points={points.map(p=>p.x+','+(p.y-105)).join(' ')} fill="#d9f3eb" stroke="#167b91" strokeWidth="2"/>}{text(170,222,n+' 角'+(kind==='pyramid'?'錐':'柱')+'；資料 '+v.slice(1).join('、'))}</>,245);
    }
    return svg(<><path d="M70 75 L135 35 L275 35 L275 150 L210 195 L70 195 Z" fill="#bde5df" stroke="#167b91" strokeWidth="3"/><path d="M70 75 H210 L275 35 M210 75 V195" fill="none" stroke="#167b91" strokeWidth="3"/><path d="M135 35 V150 H275 M135 150 L70 195" fill="none" stroke="#426e7d" strokeDasharray="5 4"/>{text(135,221,'長 '+v[0])}{text(269,196,'寬 '+v[1])}{text(310,107,'高 '+v[2])}</>,245);
  }
  if(kind==='circle'||kind==='pie') {
    const pie=kind==='pie',angle=pie?360:v[1],r=78,at=(deg:number)=>[170+Math.cos((deg-90)*Math.PI/180)*r,110+Math.sin((deg-90)*Math.PI/180)*r];let offset=0;
    return svg(<>{pie?v.map((value,i)=>{const start=offset;offset+=value/100*360;const p=at(start),q=at(offset);return <path key={i} d={'M170 110 L'+p[0]+' '+p[1]+' A'+r+' '+r+' 0 '+(offset-start>180?1:0)+' 1 '+q[0]+' '+q[1]+' Z'} fill={colors[i%4]} stroke="#fffdf3" strokeWidth="2"/>;}):<><circle cx="170" cy="110" r={r} fill="#eef4e9" stroke="#167b91" strokeWidth="3"/>{angle<360&&<path d={'M170 110 L170 '+(110-r)+' A'+r+' '+r+' 0 '+(angle>180?1:0)+' 1 '+at(angle).join(' ')+' Z'} fill="#bde5df" stroke="#167b91" strokeWidth="3"/>}{v[2]!==undefined&&<circle cx="170" cy="110" r={r*v[2]/v[0]} fill="#fffdf3" stroke="#cc683c" strokeWidth="2"/>}<line x1="170" y1="110" x2="248" y2="110" stroke="#cc683c" strokeWidth="3"/>{text(213,103,String(v[0]))}{angle<360&&text(170,215,angle+'°')}</>}{pie&&v.map((n,i)=><g key={i}><rect x={i*83+6} y="207" width="10" height="10" fill={colors[i%4]}/>{text(i*83+50,217,labels[i]+' '+n+'%',11)}</g>)}</>,235);
  }
  if(kind==='capacity')return svg(<>{v.map((n,i)=><g key={i}><path d={'M'+(55+i*150)+' 35 V175 Q'+(100+i*150)+' 195 '+(145+i*150)+' 175 V35'} fill="#fffdf3" stroke="#173e50" strokeWidth="3"/><rect x={58+i*150} y={175-n/Math.max(...v)*110} width="84" height={n/Math.max(...v)*110} fill="#a8dfe6"/>{text(100+i*150,214,(labels[i]??'')+' '+n+' 毫升',14)}</g>)}</>,240);
  if(kind==='bar'||kind==='line') {
    const max=Math.ceil(Math.max(...v)/5)*5,scale=150/max;
    return svg(<>{seq(6).map(i=><g key={i}><line x1="40" x2="320" y1={185-i*30} y2={185-i*30} stroke="#c5d9d2"/>{text(20,190-i*30,fmt(i*max/5),12)}</g>)}{kind==='line'&&<polyline points={v.map((n,i)=>(75+i*72)+','+(185-n*scale)).join(' ')} fill="none" stroke="#167b91" strokeWidth="3"/>}{v.map((n,i)=><g key={i}>{kind==='bar'?<rect x={55+i*72} y={185-n*scale} width="35" height={n*scale} fill={colors[i%4]}/>:<circle cx={75+i*72} cy={185-n*scale} r="6" fill={colors[i%4]}/>}{text(75+i*72,210,labels[i],14)}{text(75+i*72,174-n*scale,n,13)}</g>)}</>);
  }
  if(kind==='lines')return svg(<><line x1="40" y1="90" x2="300" y2="90" stroke="#167b91" strokeWidth="4"/><line x1={v[0]===90?170:40} y1={v[0]===90?30:155} x2={v[0]===90?170:300} y2={v[0]===90?195:155} stroke="#cc683c" strokeWidth="4"/>{v[0]===90&&<path d="M170 72 H188 V90" stroke="#173e50" fill="none"/>}</>);
  if(kind==='symmetry')return svg(<>{seq(11).map(i=><g key={i}><line x1={35+i*26} x2={35+i*26} y1="15" y2="223" stroke="#c5d9d2"/>{i<=8&&<line x1="35" x2="295" y1={15+i*26} y2={15+i*26} stroke="#c5d9d2"/>}</g>)}<line x1="165" x2="165" y1="10" y2="225" stroke="#cc683c" strokeDasharray="5 4" strokeWidth="3"/><circle cx={35+v[0]*26} cy={223-v[1]*26} r="7" fill="#167b91"/>{step>0&&<circle cx={35+(10-v[0])*26} cy={223-v[1]*26} r="7" fill="#cc683c"/>}{text(170,247,'每一格代表一個位置')}</>,260);
  if(kind==='calendar') {
    const [year,month,date]=v,first=new Date(Date.UTC(year,month-1,1)).getUTCDay(),days=new Date(Date.UTC(year,month,0)).getUTCDate();
    return <div className="isl-math-calendar"><b>{year} 年 {month} 月</b><div>{['日','一','二','三','四','五','六'].map(n=><b key={n}>{n}</b>)}{seq(first).map(i=><i key={'b'+i}/>)}{seq(days).map(i=><span key={i} className={i+1===date?'filled':step>1&&i+1===date+(v[3]??0)?'is-focus':''}>{i+1}</span>)}</div></div>;
  }
  if(kind==='pattern')return <div className="isl-math-pattern">{seq(6).map(i=><span key={i}>{['○','△','□'][(i+v[0])%3]}</span>)}</div>;
  if(kind==='numberline'||kind==='interval') {
    const min=v[0],max=v[1],parts=Math.min(20,kind==='interval'?v[2]:v[3]||10),mark=kind==='interval'?undefined:v[2];
    return svg(<><line x1="30" y1="105" x2="310" y2="105" stroke="#173e50" strokeWidth="3"/>{seq(parts+1).map(i=><g key={i}><line x1={30+i*280/parts} x2={30+i*280/parts} y1="97" y2="113" stroke="#173e50"/>{kind==='interval'&&<circle cx={30+i*280/parts} cy="90" r="5" fill="#59873b"/>}{(i===0||i===parts)&&text(30+i*280/parts,145,fmt(min+(max-min)*i/parts),14)}</g>)}{mark!==undefined&&<circle cx={30+(mark-min)/(max-min)*280} cy="105" r="7" fill="#cc683c"/>}</>,180);
  }
  throw Error('Missing diagram: '+kind);
}
