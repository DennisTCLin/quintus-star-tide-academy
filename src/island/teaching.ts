import type { DemoStep, Item, SceneProps } from './games';
import { cn,cnq } from './rng';

/** One visible operation per spoken beat, using the exact quantities in the demonstration. */
export function teachingSteps(q:Item,tip:string,explanation:string,total:number):DemoStep[] {
  const p=q.p,beats:DemoStep[]=[{say:q.say,view:{step:0,focus:-1}}];
  const beat=(say:string,step=total,focus=-1)=>beats.push({say,view:{step,focus}});
  const count=(n:number,line:(i:number)=>string,offset=0)=>{
    for(let i=1;i<=n;i++)beat(line(i),i,i-1+offset);
  };
  switch(p.diagram) {
    case 'order':
      beat(tip,0);for(let i=1;i<=p.n;i++)beat(`${cn(i)}。`,i,p.reverse?p.n-i:i-1);
      break;
    case 'take':case 'subtraction':
      beat(tip,0);count(p.b,i=>`拿走第${cn(i)}個，還有${cnq(p.a-i)}個。`);
      if(!p.b)beat('沒有拿走，數量一樣。');break;
    case 'measure':case 'tile':
      beat(tip,0);count(total,i=>`${cn(i)}${p.diagram==='tile'?'片':'格'}。`);break;
    case 'coins':
      beat(tip,0);count(p.coins.length,i=>`加上${cn(p.coins[i-1])}元，現在是${cn(p.coins.slice(0,i).reduce((a:number,b:number)=>a+b,0))}元。`);break;
    case 'bars':
      beat(tip,total);for(let i=0;i<3;i++)beat(`看第${cn(i+1)}${p.vertical?'個':'條'}。`,total,i);break;
    case 'paths':
      beat('先看直直的線，沒有轉彎。',total,0);beat('再沿著彎彎的線看，這是曲線。',total,1);break;
    case 'groups':case 'difference':case 'diff20':
      beat(`先看第一排，有${cnq(p.a)}個。`,0,0);beat(`再看第二排，有${cnq(p.b)}個。`,0,1);beat(tip,total,2);break;
    case 'sequence':
      beat(`先看${cn(p.n-1)}。`,0,0);beat(`再來是${cn(p.n)}。`,total,1);beat(`接著是${cn(p.n+1)}。`,total,2);break;
    case 'shapes':case 'solid':case 'match':
      beat(tip,total);beat(explanation,total,+q.answer-1);break;
    case 'mosaic':
      beat(tip,0);count(p.n,i=>`第${cn(i)}片。`);break;
    case 'addition':
      beat(`先放${cnq(p.a)}個點點。`,0,0);
      count(p.b,i=>`再放一個，現在是${cn(p.a+i)}。`,p.a);break;
    case 'swap':
      beat(`先看${cn(p.a)}加${cn(p.b)}。`,0,0);beat('把兩群交換位置，總數不變。',total,1);break;
    case 'addpattern':case 'subpattern':
      beat('先看上面的算式。',0,0);beat(tip,total,1);break;
    case 'mixed':case 'story':
      beat(`先有${cn(p.a)}。`,0,0);beat(`加上${cn(p.b)}，變成${cn(p.a+p.b)}。`,total,1);
      beat(`再減${cn(p.c)}，剩下${cn(p.a+p.b-p.c)}。`,total,2);break;
    case 'lengthsum':case 'lengthdiff':
      beat(`先看${cn(p.a)}格。`,0,0);beat(tip,total,1);break;
    case 'bundles':case 'place':
      for(let i=1;i<=Math.floor(p.n/10);i++)beat(`${cn(i)}個十，是${cn(i*10)}。`,i,i-1);
      if(p.n%10)beat(`再加${cn(p.n%10)}個一。`,total,Math.floor(p.n/10));break;
    case 'numerals':case 'numbers':
      beat(tip,0);[p.a,p.b,p.c].forEach((n,i)=>beat(`${cn(n)}，有${cn(Math.floor(n/10))}個十和${cn(n%10)}個一。`,total,i));break;
    case 'skip':
      beat(tip,0);for(let i=0;i<4;i++)beat(cn(p.start+p.gap*i),total,i);break;
    case 'hundred':
      beat('先找同一排的數字，再接著數。',0,p.n-1);beat(explanation,total,p.n-1);break;
    case 'clock':case 'clockchoice':
      beat(`先看長針，指著${p.half?'六，是半點':'十二，是整點'}。`,total,0);
      beat('再看短針，走過幾，就是幾點。',total,1);break;
    case 'events':
      p.events.forEach((t:string,i:number)=>beat(t,total,i));break;
    case 'ribbons':case 'timeline':case 'moneycompare':case 'dateorder':
      beat(tip,0);beat('先看第一個。',total,0);beat('再看第二個，比一比。',total,1);break;
    case 'compose':
      beat('先看分開的兩片。',0);beat('把兩片慢慢拼在一起。',total);beat(tip,total);break;
    case 'cubes':
      beat(tip,0);p.heights.forEach((n:number,i:number)=>beat(`第${cn(i+1)}排有${cnq(n)}塊。`,total,i));break;
    case 'coin':
      beat(`先看這枚錢，上面寫著${cn(p.value)}元。`,0,0);
      beat(tip,total);break;
    case 'pay':
      beat(`售價是${cn(p.price)}元。`,0,0);beat(`已經付了${cn(p.paid)}元。`,0,1);beat(tip,total,2);break;
    case 'calendar':
      beat(`先看${cn(p.month)}月。`,0,0);beat(`找到${cn(p.date)}日。`,total,1);
      beat(tip,total,2);break;
    case 'columns':
      beat('先把十位和個位對齊。',0);
      beat(`先算個位，${cn(p.a%10)}${p.op==='+'?'加':'減'}${cn(p.b%10)}。`,total,1);
      beat(`再算十位，${cn(Math.floor(p.a/10))}${p.op==='+'?'加':'減'}${cn(Math.floor(p.b/10))}。`,total,0);break;
    case 'sort':
      beat(tip,0);count(p.objects.filter((n:number)=>n===p.target).length,i=>`找到第${cn(i)}個。`);break;
    case 'tally':
      beat(tip,0);count(p.counts[p.target],i=>`${cn(i)}。`);break;
    case 'table':
      beat(tip,0);if(p.total)p.counts.forEach((n:number,i:number)=>beat(`這一列有${cnq(n)}人。`,total,i));
      else beat(`找到題目問的水果，這一列有${cnq(p.counts[p.target])}人。`,total,p.target);break;
    default:beat(tip,total);
  }
  beats.push({say:explanation,view:{step:Math.max(total,...beats.map(b=>b.view.step??0)),show:true,focus:-1}});
  return beats;
}

export const teachingFocus=(s:SceneProps,index:number)=>s.demo&&s.view.focus===index?'isl-teach-point':'';
