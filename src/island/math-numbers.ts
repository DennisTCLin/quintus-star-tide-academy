import { equation, grid, numeric, textual, fmt, timeText, divideResult, type MathTask, type MathSeed } from './math-task';

const units:Record<string,[number,string]>={mm:[1,'毫米'],cm:[10,'公分'],m:[1000,'公尺'],km:[1000000,'公里'],g:[1,'公克'],kg:[1000,'公斤'],tonne:[1000000,'公噸'],ml:[1,'毫升'],l:[1000,'公升'],second:[1,'秒'],minute:[60,'分'],hour:[3600,'小時'],day:[86400,'日'],cm2:[1,'平方公分'],m2:[10000,'平方公尺'],hectare:[100000000,'平方公尺'],cm3:[1,'立方公分'],m3:[1000000,'立方公分']};
export function numberTask(kind:string,arg:string,extra:string,s:MathSeed):MathTask|undefined {
  const {a,b,c,d,t,u}=s;
  switch(kind) {
    case 'place': {
      if(arg==='tenfold'||arg==='shift') {
        const n=(a*100+b*10+c)*(arg==='shift'?10000:1),factor=arg==='shift'?[10,100,1000][t%3]:10;
        return numeric(`${n} 乘以 ${factor} 是多少？`,n*factor,[`十進位每往左一位，位值變成十倍。`,`${factor} 有 ${String(factor).length-1} 個零，把每個數字的位值往左移。`,`${n} × ${factor} = ${n*factor}。`],{kind:'place',values:[n,factor]});
      }
      const limit=+arg,n=limit===200?100+t%101:Math.max(10,Math.floor(limit/10))+t%(Math.floor(limit*.8))+u%10;
      const digits=String(n).split('').map(Number),decomp=digits.map((v,i)=>v*10**(digits.length-i-1)).filter(Boolean);
      return numeric(`位值表裡的數，合起來是多少？`,n,[`從最高位開始讀，每一位都有自己的位置。`,`${decomp.join(' + ')}。`,`合起來是 ${n}。`],{kind:'place',values:[n]},'',Math.max(1,10**(digits.length-2)));
    }
    case 'placevalue': {
      const n=+arg===200?100+t%100:100+t%900,position=t%3,place=10**position,count=Math.floor(n/place)%10;
      return numeric(`${n} 的${['個','十','百'][position]}位是幾？`,count,[`由右往左是個位、十位、百位。`,`找到${['個','十','百'][position]}位，它代表幾個 ${place}。`,`${n} 的${['個','十','百'][position]}位是 ${count}。`],{kind:'place',values:[n]});
    }
    case 'money': {
      const limit=+arg,denoms=limit<=100?[1,5,10]:limit<=1000?[1,10,100]:[10,100,1000],counts=[a%5+1,b%4+1,c%4+1],total=denoms.reduce((sum,n,i)=>sum+n*counts[i],0);
      return numeric(`這些錢一共是多少元？`,total,[`先分開數每一種面額。`,denoms.map((n,i)=>`${n} × ${counts[i]} = ${n*counts[i]}`).join('；')+'。',`把金額加起來，一共 ${total} 元。`],{kind:'money',values:denoms,labels:counts.map(n=>String(n))},'元',denoms[0]);
    }
    case 'compare': {
      const sign=arg==='sign',limit=sign?+extra:arg==='weight'?1000:+arg,n=10+t%Math.max(20,Math.floor(limit*.7)),m=t%4===0?n:Math.max(1,n+(u%31)-15);
      if(sign) return textual(`${n} □ ${m}，空格應放哪個符號？`,n===m?'=':n>m?'>':'<',['>','<','='],[`先比較最高位，位數相同再從左邊逐位比較。`,`${n} ${n===m?'等於':n>m?'大於':'小於'} ${m}。`,`開口朝向比較大的數。`],{kind:'bars',values:[n,m],labels:[String(n),String(m)]});
      const z=Math.max(n,m)+a;
      return numeric(`哪個數最大？${arg==='weight'?'單位都是公克。':''}`,z,[`先看位數，再從最高位比較。`,`${Math.min(n,m)} < ${Math.max(n,m)} < ${z}。`,`最大的數是 ${z}。`],{kind:'bars',values:[n,m,z],labels:[String(n),String(m),String(z)]},'',Math.max(1,a));
    }
    case 'arithmetic': {
      const limit=+extra||100,n=limit===20?a+b:Math.floor(limit/5)+t%Math.floor(limit/3),m=limit===20?c:10+u%Math.max(11,Math.floor(limit/4)),sub=arg==='sub'||(arg!=='add'&&t%2===1),left=sub?n+m:n,result=sub?n:n+m;
      const label=arg==='length'?'公分':arg==='weight'?'公克':arg==='capacity'?'毫升':'個';
      const prompt=arg==='add'||arg==='sub'?`${left} ${sub?'−':'+'} ${m} = 多少？`:`小島有 ${left} ${label}，${sub?'用了':'再加上'} ${m} ${label}，現在有多少${label}？`;
      return numeric(prompt,result,[`把個位和個位對齊，十位和十位對齊。`,sub?`從 ${left} 裡減去 ${m}，不夠減時向前一位借一。`:`先算個位，滿十就向十位進一。`,`${left} ${sub?'−':'+'} ${m} = ${result}。`],{kind:'columns',values:[left,m,sub?-1:1]});
    }
    case 'measure': {
      const start=a%5,end=start+b,unit=a%2+1;
      if(arg==='units') return numeric(`彩帶長 ${b*unit} 公分，每塊積木長 ${unit} 公分，要排幾塊才剛好？`,b,[`每一塊積木都要一樣長。`,`從起點一塊接一塊，不重疊也不留空隙。`,`${b*unit} ÷ ${unit} = ${b}，要 ${b} 塊。`],{kind:'ruler',values:[0,b*unit,unit]},'塊');
      return numeric(arg==='draw'?`從刻度 ${start} 畫到 ${end}，這段線長幾公分？`:`尺上的彩帶從 ${start} 到 ${end}，長幾公分？`,b,[`先找起點，這次不是從零開始。`,`終點刻度 ${end}，起點刻度 ${start}。`,`${end} − ${start} = ${b} 公分。`],{kind:'ruler',values:[start,end,1]},'公分');
    }
    case 'inverse': {
      if(arg==='multiply') return numeric(`${a} × □ = ${a*b}，空格是多少？`,b,[`乘法和除法可以互相驗算。`,`${a*b} ÷ ${a} = ${b}。`,`${a} × ${b} = ${a*b}，填 ${b}。`],{kind:'groups',values:[a,b]});
      const scale=+extra||10,n=a*scale+b,m=c*scale+d;
      if(arg==='difference') return numeric(`小熊有 ${n+m} 張，小兔有 ${n} 張。小熊多幾張？`,m,[`比較多多少，用大數減小數。`,`${n+m} − ${n} = ${m}。`,`${n} + ${m} = ${n+m}，驗算正確。`],{kind:'bars',values:[n+m,n],labels:['小熊','小兔']},'張');
      if(arg==='check') return textual(`計算 ${n+m} − ${m} = ${n}，哪個算式可以驗算？`,`${n} + ${m} = ${n+m}`,[`${n} − ${m} = ${n+m}`,`${n+m} + ${m} = ${n}`,`${m} − ${n} = ${n+m}`],[`減法是從全部拿走一部分。`,`用剩下的數加上拿走的數，應回到全部。`,`${n} + ${m} = ${n+m}，正好驗算原式。`],{kind:'bars',values:[n,m],labels:['剩下','拿走']});
      return numeric(`□ + ${m} = ${n+m}，空格是多少？`,n,[`全部是 ${n+m}，已知一部分是 ${m}。`,`用全部減去已知的部分。`,`${n+m} − ${m} = ${n}。`],{kind:'bars',values:[n,m],labels:['未知','已知']});
    }
    case 'capacity': {
      const left=a*50,right=b*50;
      if(arg==='conserve')return numeric(`把 ${left} 毫升的水，全部倒進較寬的杯子，沒有灑出來。現在有多少毫升？`,left,[`杯子的形狀變了。`,`沒有加入水，也沒有倒掉水。`,`水量還是 ${left} 毫升，不用只看水面的高低。`],{kind:'capacity',values:[left,left],labels:['原杯','寬杯']},'毫升',50);
      return textual(`同樣用一小杯量，甲杯裝 ${a} 小杯，乙杯裝 ${b} 小杯，誰容量較大？`,a===b?'一樣大':a>b?'甲杯':'乙杯',['甲杯','乙杯','一樣大','無法比較'],[`比較時使用相同的小杯。`,`甲杯可裝 ${a} 杯，乙杯可裝 ${b} 杯。`,a===b?'杯數一樣，容量一樣大。':`${a>b?'甲':'乙'}杯能裝較多小杯，容量較大。`],{kind:'capacity',values:[left,right],labels:['甲杯','乙杯']});
    }
    case 'multiply': {
      const allowed=arg.includes(',')?arg.split(',').map(Number):/^\d+$/.test(arg)?[+arg]:null;
      let n=allowed?allowed[t%allowed.length]:a,m=b;
      if(arg==='twodigit')n=10*a+c;
      if(arg==='threedigit')n=100*a+10*c+d;
      if(arg==='twoxtwo'){n=10*a+c;m=10*b+d;}
      if(arg==='twoxthree'){n=10*a+c;m=100*b+10*d+c;}
      const result=n*m;
      if(arg==='swap')return numeric(`${n} × ${m} = ${result}，${m} × ${n} 是多少？`,result,[`先看 ${n} 個 ${m}，總共 ${result}。`,`交換行和列，總數沒有改變。`,`${m} × ${n} 也等於 ${result}。`],{kind:'groups',values:[n,m]});
      return numeric(arg==='groups'||arg==='story'?`每盒有 ${n} 顆，${m} 盒一共有幾顆？`:`${n} × ${m} = 多少？`,result,[`相同數量的幾組，可以用乘法。`,n<20?`${n} 連加 ${m} 次，就是 ${n} × ${m}。`:`把 ${n} 依位值拆開，各自乘 ${m}，再相加。`,`${n} × ${m} = ${result}。`],{kind:'groups',values:[n,m]});
    }
    case 'divide': {
      const divisor=arg==='twodivisor'?10+a:arg==='threedivisor'?100+a*10:arg==='zeros'?a*10:b;
      const quotient=arg==='threedigit'?a*10+c:arg==='twodigit'?a+2:arg==='zeros'?b*10:c;
      const rem=arg==='remainder'?a%divisor:0,n=divisor*quotient+rem;
      if(arg==='remainder')return textual(`${n} ÷ ${divisor}，商和餘數是多少？`,divideResult(n,divisor),[`${quotient} 餘 ${rem+1}`,`${quotient+1} 餘 ${rem}`,`${Math.max(0,quotient-1)} 餘 ${divisor}`],[`每次分出 ${divisor} 個。`,`分成 ${quotient} 組，共分走 ${divisor*quotient} 個。`,`剩 ${rem} 個，比除數小；${divisor} × ${quotient} + ${rem} = ${n}。`],{kind:'groups',values:[divisor,quotient,rem]});
      const prompt=arg==='share'?`${n} 顆糖平均分給 ${divisor} 人，每人幾顆？`:arg==='group'?`${n} 顆糖，每袋裝 ${divisor} 顆，可裝幾袋？`:`${n} ÷ ${divisor} = 多少？`;
      return numeric(prompt,quotient,[`先確認全部有 ${n}，除數是 ${divisor}。`,`想想 ${divisor} 乘幾會得到 ${n}。`,`${divisor} × ${quotient} = ${n}，所以商是 ${quotient}。`],{kind:'groups',values:[divisor,quotient]});
    }
    case 'twostep': {
      const n=a+b+c,op=arg;let result:number,formula:string,first:string;
      switch(op){
        case 'addadd':result=n+b+c;formula=`${n} + ${b} + ${c}`;first=`先算 ${n} + ${b} = ${n+b}`;break;
        case 'subsub':result=n;formula=`${n+b+c} − ${b} − ${c}`;first=`先算 ${n+b+c} − ${b} = ${n+c}`;break;
        case 'addsub':result=n+b-c;formula=`${n} + ${b} − ${c}`;first=`先算 ${n} + ${b} = ${n+b}`;break;
        case 'muladd':result=a*b+c;formula=`${a} × ${b} + ${c}`;first=`先算 ${a} × ${b} = ${a*b}`;break;
        case 'mulsub':{const take=Math.min(c,a*b-1);result=a*b-take;formula=`${a} × ${b} − ${take}`;first=`先算 ${a} × ${b} = ${a*b}`;break;}
        case 'addmul':case 'parentheses':result=(a+b)*c;formula=`(${a} + ${b}) × ${c}`;first=`先算括號 ${a} + ${b} = ${a+b}`;break;
        case 'submul':result=a*c;formula=`(${a+b} − ${b}) × ${c}`;first=`先算括號 ${a+b} − ${b} = ${a}`;break;
        case 'adddivide':formula=`(${a*b} + ${a*c}) ÷ ${a}`;result=b+c;first=`先算 ${a*b} + ${a*c} = ${a*(b+c)}`;break;
        case 'mulmul':result=a*b*c;formula=`${a} × ${b} × ${c}`;first=`先算 ${a} × ${b} = ${a*b}`;break;
        case 'muldivide':result=a;formula=`${a} × ${b} ÷ ${b}`;first=`先算 ${a} × ${b} = ${a*b}`;break;
        case 'left':result=a*c;formula=`${a*b} ÷ ${b} × ${c}`;first=`乘除同級，從左到右先算 ${a*b} ÷ ${b} = ${a}`;break;
        case 'distribute':result=a*(b+c);formula=`${a} × ${b} + ${a} × ${c}`;first=`共同的 ${a} 可以提出，變成 ${a} × (${b} + ${c})`;break;
        case 'divdiv':result=a;formula=`${a*b*c} ÷ ${b} ÷ ${c}`;first=`連除可除以兩除數的積 ${b} × ${c} = ${b*c}`;break;
        case 'three':result=(a*b+c)*d;formula=`(${a} × ${b} + ${c}) × ${d}`;first=`先算括號中的乘法 ${a} × ${b} = ${a*b}`;break;
        default:throw Error(`Unknown operation ${op}`);
      }
      return numeric(`${formula} = 多少？`,result,[`有括號先算括號；再乘除，最後加減。`,`${first}。`,`${formula} = ${result}。`],{kind:'equation',values:[a,b,c],text:formula});
    }
    case 'convert': {
      const mixed=arg.startsWith('mixed'),from=arg.replace('mixed','');
      const src=units[from],dst=units[extra];if(!src||!dst)throw Error(`Unknown units ${arg}:${extra}`);
      let factor=src[0]/dst[0];
      // Surface/volume units already carry their conversion in the unit factor.
      const sourceName=from==='hectare'?'公頃':from==='m3'?'立方公尺':src[1];
      const targetName=extra==='m3'?'立方公尺':dst[1];
      const amount=factor<1?a/factor:from==='hectare'?a:a,tail=mixed?b*(factor>=1000?10:1):0,result=amount*factor+tail;
      if(from==='cm3'&&extra==='ml')factor=1;
      return numeric(`${amount} ${sourceName}${tail?` ${tail} ${targetName}`:''}，合起來是多少${targetName}？`,result,[`1 ${sourceName} = ${fmt(factor)} ${targetName}。`,`先把 ${amount} ${sourceName}換成 ${fmt(amount*factor)} ${targetName}。`,`${tail?`再加 ${tail}，`:''}答案是 ${fmt(result)} ${targetName}。`],{kind:'units',values:[amount,factor,tail],labels:[sourceName,targetName]},targetName,Math.min(10,Math.max(.1,factor)));
    }
    case 'round': {
      const place=+extra||10,n=place*(a+b)+(t%place),q=n/place;
      if(arg==='multiply') {const x=place*(a+1)+t%place,m=b,rounded=Math.round(x/place)*place;return numeric(`把 ${x} 四捨五入到${place===10?'十':'百'}位，再估算 ${x} × ${m}。`,rounded*m,[`先看要取到的位數。`,`${x} 約是 ${rounded}。`,`${rounded} × ${m} = ${rounded*m}，這是估計值。`],{kind:'round',values:[x,rounded,place]},'',place);}
      const rounded=arg==='floor'?Math.floor(q)*place:arg==='ceil'?Math.ceil(q)*place:Math.round(q)*place;
      return numeric(`${n} 用${arg==='floor'?'無條件捨去':arg==='ceil'?'無條件進入':'四捨五入'}取到 ${place} 位，是多少？`,rounded,[`先確定保留到 ${place} 位。`,arg==='floor'?'後面的位數全部捨去。':arg==='ceil'?'後面只要不是全零，就向保留位進一。':'看下一位：小於五捨去，五以上進一。',`${n} 的概數是 ${rounded}。`],{kind:'round',values:[n,rounded,place]},'',place);
    }
    case 'weight': {
      if(arg==='indirect')return textual(`天平實驗：甲比乙重，乙比丙重。最重的是誰？`,'甲',['乙','丙','三個一樣重'],[`先看甲和乙：甲比較重。`,`再看乙和丙：乙比較重。`,`由重到輕是甲、乙、丙，所以甲最重。`],{kind:'bars',values:[a+b+c,b+c,c],labels:['甲','乙','丙']});
      const n=a+b,m=b;return numeric(`天平平衡，左邊是 ${n} 個一樣重的小積木，右邊已有 ${m} 個，還要放幾個？`,a,[`天平平衡時，兩邊一樣重。`,`右邊要和左邊一樣多。`,`${n} − ${m} = ${a}，還要放 ${a} 個。`],{kind:'balance',values:[n,m]},'個');
    }
    case 'calendar': {
      const year=2024+(t%5),month=t%12+1,days=new Date(Date.UTC(year,month,0)).getUTCDate(),date=Math.min(days-3,a+b),add=c%3+1;
      if(arg==='year')return numeric(`${year} 年有幾個月？`,12,[`一年從一月開始。`,`十二月結束後，才進入下一年一月。`,`所以一年有十二個月。`],{kind:'calendar',values:[year,month,date]},'個月');
      if(arg==='weeks')return numeric(`過了 ${a} 個星期又 ${b%7} 天，一共幾天？`,a*7+b%7,[`一個星期有七天。`,`${a} × 7 = ${a*7}。`,`再加 ${b%7} 天，共 ${a*7+b%7} 天。`],{kind:'calendar',values:[year,month,date]},'天');
      return numeric(`${year} 年 ${month} 月 ${date} 日，再過 ${add} 天是幾日？`,date+add,[`先在月曆找到 ${date} 日。`,`從隔天開始，往後移 ${add} 格。`,`停在 ${date+add} 日。`],{kind:'calendar',values:[year,month,date,add]},'日');
    }
    case 'clock': {
      const hour=t%12+1,minute=u%60;
      if(arg==='parts')return numeric(`時鐘的分針走 ${a%6+1} 大格，是幾分鐘？`,(a%6+1)*5,[`鐘面一圈是十二大格、六十小格。`,`每一大格有五分鐘。`,`${a%6+1} × 5 = ${(a%6+1)*5} 分鐘。`],{kind:'clock',values:[hour,(a%6+1)*5]},'分',5);
      if(arg==='24'){const h=t%11+1,afternoon=u%2===0,result=h+(afternoon?12:0);return numeric(`${afternoon?'下午':'上午'} ${h} 時，在二十四時制是幾時？`,result,[`一天從零時開始，到二十三時。`,afternoon?'下午的時數加十二。':'上午一時到十一時，時數維持不變。',`所以是 ${result} 時。`],{kind:'clock',values:[h,0]},'時');}
      return textual(`時鐘現在是幾時幾分？`,timeText(hour*60+minute),[timeText(hour*60+(minute+5)%60),timeText((hour%12+1)*60+minute),timeText(hour*60+(minute+30)%60)],[`短針看時，長針看分。`,`短針在 ${hour} 和 ${hour%12+1} 之間，長針指向 ${minute} 分。`,`現在是 ${hour} 時 ${minute} 分。`],{kind:'clock',values:[hour,minute]});
    }
    case 'elapsed': {
      const start=arg==='overnight'?23*60+a%3*10:arg==='noon'?11*60+a*3:arg==='hours'?a*60+b*5:a*60+b*3,duration=arg==='overnight'||arg==='noon'?90+c*5:30+c*5,end=start+duration;
      return numeric(`從 ${timeText(start)} 到${end>=1440?'隔天 ':''}${timeText(end)}，經過幾分鐘？`,duration,[`先把起點和終點放到同一條時間線。`,`${end>=1440?'跨日的終點要加一天，也就是一千四百四十分鐘。':'一小時是六十分鐘，不是一百分鐘。'}`,`${end} − ${start} = ${duration} 分鐘。`],{kind:'timeline',values:[start,end],labels:[timeText(start),timeText(end)]},'分鐘',5);
    }
    case 'timeop': {
      const base=a*60+b*5,mult=c%4+2,divide=arg==='divide',minutes=base*mult;
      return numeric(divide?`${minutes} 分鐘平均分成 ${mult} 段，每段幾分鐘？`:`一段影片 ${a} 時 ${b*5} 分，連看 ${mult} 段，共幾分鐘？`,divide?base:minutes,[`先全部換成分鐘。`,`${a} × 60 + ${b*5} = ${base}。`,divide?`${minutes} ÷ ${mult} = ${base} 分鐘。`:`${base} × ${mult} = ${minutes} 分鐘。`],{kind:'timeline',values:[base,minutes]},'分鐘',5);
    }
    case 'decimal': {
      const digits=+extra||1,scale=10**digits,x=(a*scale+b*10+c)/scale,y=(b*scale+c*10+d)/scale;
      if(arg==='place'||arg==='digit') {
        const numerator=a*scale+b*10+c;
        if(arg==='digit')return numeric(`${fmt(x)} 的百分位數字是幾？`,numerator%10,[`小數點後第一位是十分位。`,`第二位是百分位。`,`${fmt(x)} 的百分位是 ${numerator%10}。`],{kind:'place',values:[x,digits]});
        return numeric(`${numerator} 個 ${fmt(1/scale)} 合起來是多少？`,x,[`把一個整體平均分成 ${scale} 份。`,`每份是 ${fmt(1/scale)}，現在共有 ${numerator} 份。`,`${numerator} ÷ ${scale} = ${fmt(x)}。`],{kind:'decimalgrid',values:[numerator,scale]},'',1/scale);
      }
      if(arg==='compare')return numeric(`哪個小數比較大？`,Math.max(x,y),[`小數點先對齊。`,`由整數位、十分位、百分位依序比較。`,`${fmt(Math.max(x,y))} 比較大。`],{kind:'bars',values:[x,y],labels:[fmt(x),fmt(y)]},'',1/scale);
      if(arg==='length')return numeric(`每公尺是 100 公分，${a*100+b*10+c} 公分是幾公尺？`,x,[`一公尺等於一百公分。`,`公分換成公尺，要除以一百。`,`${a*100+b*10+c} ÷ 100 = ${fmt(x)}。`],{kind:'ruler',values:[0,x,1]},'公尺',.01);
      if(arg==='addsub'){const sub=t%2===0,total=x+y;return numeric(`${fmt(sub?total:x)} ${sub?'−':'+'} ${fmt(y)} = 多少？`,sub?x:total,[`小數點對齊，相同位值才能相加減。`,`把數字暫時看成 ${scale} 分之幾來計算。`,`${fmt(sub?total:x)} ${sub?'−':'+'} ${fmt(y)} = ${fmt(sub?x:total)}。`],{kind:'columns',values:[sub?total:x,y,sub?-1:1]},'',1/scale);}
      if(arg==='four')return numeric(`${fmt(x)} + ${fmt(y)} × ${c} = 多少？`,x+y*c,[`先乘除，後加減。`,`${fmt(y)} × ${c} = ${fmt(y*c)}。`,`${fmt(x)} + ${fmt(y*c)} = ${fmt(x+y*c)}。`],{kind:'equation',values:[x,y,c],text:`${fmt(x)} + ${fmt(y)} × ${c}`},'',.01);
      if(arg==='rounddivision') {const dividend=a*10+c,divisor=b+1,result=Math.round(dividend/divisor*100)/100;return numeric(`${dividend} ÷ ${divisor}，商四捨五入到小數點後兩位。`,result,[`先做除法。`,`保留百分位，要看千分位，五以上進一。`,`商約為 ${fmt(result)}。`],equation(dividend,divisor),'',.01);}
      const isDivide=arg==='divideinteger'||arg==='dividedecimal',multiplier=arg==='multiplydecimal'?y:arg==='integermultiply'?x:b;
      const left=arg==='integermultiply'?b:x,right=arg==='dividedecimal'?b/scale:multiplier;
      const dividend=arg==='divideinteger'?x*b:arg==='dividedecimal'?x*right:left,result=isDivide?x:left*right;
      return numeric(`${fmt(dividend)} ${isDivide?'÷':'×'} ${fmt(right)} = 多少？`,result,[isDivide?'除數有小數時，被除數和除數同時乘十或一百，讓除數變整數。':'先按整數乘法算，再依小數位數放回小數點。',`${isDivide?`${fmt(dividend)} ÷ ${fmt(right)}`:`${fmt(left)} × ${fmt(right)}`}。`,`答案是 ${fmt(result)}。`],{kind:'equation',values:[dividend,right],text:`${fmt(dividend)} ${isDivide?'÷':'×'} ${fmt(right)}`},'',1/scale);
    }
  }
}
