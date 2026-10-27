import { numeric, textual, rationalTask, fraction, gcd, lcm, fmt, type MathTask, type MathSeed } from './math-task';

export function applicationTask(kind:string,arg:string,_extra:string,s:MathSeed):MathTask|undefined {
  const {a,b,c,d,t,u}=s;
  switch(kind) {
    case 'data': {
      const values=[a+2,b+3,c+4,d+5],labels=['甲','乙','丙','丁'],target=t%4;
      if(arg==='pie'||arg==='makepie') {const parts=[a,b,c,d],sum=parts.reduce((n,v)=>n+v,0),percent=[10,20,30,40],index=t%4;
        if(arg==='makepie')return numeric(`要把占全班 ${percent[index]}% 的項目畫成圓形圖，圓心角應是多少度？`,3.6*percent[index],[`完整一圈是三百六十度，代表百分之百。`,`每百分之一對應 3.6 度。`,`360 × ${percent[index]}/100 = ${3.6*percent[index]} 度。`],{kind:'pie',values:percent,labels},'度',36);
        return numeric(`圓形圖表示全班 ${sum*10} 人，${labels[index]}占 ${percent[index]}%，有幾人？`,sum*percent[index]/10,[`先讀圖例，找到${labels[index]}的百分率 ${percent[index]}%。`,`以全班 ${sum*10} 人為基準。`,`${sum*10} × ${percent[index]}/100 = ${sum*percent[index]/10} 人。`],{kind:'pie',values:percent,labels},'人');
      }
      const line=arg.includes('line'),diagram={kind:arg==='table'||arg==='sort'?'table':line?'line':'bar',values,labels};
      if(arg==='sort')return numeric(`調查紀錄：甲有 ${values[0]} 人、乙 ${values[1]} 人、丙 ${values[2]} 人、丁 ${values[3]} 人。表格的「合計」應填多少？`,values.reduce((n,v)=>n+v,0),[`先把相同類別的紀錄放在同一列。`,`${values.join(' + ')}。`,`共有 ${values.reduce((n,v)=>n+v,0)} 人。`],diagram,'人');
      if(arg==='makebar'||arg==='makeline')return numeric(`${labels[target]}的資料是 ${values[target]}，縱軸每一小格代表一，應標在第幾格？`,values[target],[`先看橫軸，找到${labels[target]}。`,`縱軸每一小格代表一。`,`從零往上數到 ${values[target]} 格，畫${line?'資料點，再依序連線':'長條'}。`],diagram,'格');
      return numeric(`${line?'折線圖':arg==='table'?'表格':'長條圖'}中，${labels[target]}的數值是多少？`,values[target],[`先讀圖表的標題、類別和單位。`,`找到${labels[target]}，對準它的${line?'資料點':arg==='table'?'資料列':'長條頂端'}。`,`讀出數值 ${values[target]}。`],diagram);
    }
    case 'pattern': {
      if(arg==='shape') {const symbols=['○','△','□'],offset=t%3,index=a+3;return textual(`規律是 ${Array.from({length:6},(_,i)=>symbols[(i+offset)%3]).join('、')}，第 ${index} 個圖案是什麼？`,symbols[(index-1+offset)%3],symbols,[`先找最短的重複單位，每三個一組。`,`用 ${index} 除以三，看它在這一組的第幾個。`,`第 ${index} 個是 ${symbols[(index-1+offset)%3]}。`],{kind:'pattern',values:[offset,index]});}
      if(arg==='parity') {const odd=t%2===0;return textual(`${2*a+(odd?1:0)} 和 ${2*b+(odd?1:0)} 相加，和是奇數還是偶數？`,'偶數',['奇數','偶數','一定是零','無法判斷'],[`偶數可以兩個兩個配成一組。`,odd?'兩個奇數各剩一個，剩下的兩個又能配成一組。':'兩個偶數合起來，每個都還能配成一組。',`和是 ${2*a+2*b+(odd?2:0)}，是偶數。`],{kind:'groups',values:[2*a+(odd?1:0),2*b+(odd?1:0)]});}
      if(arg==='square'){const start=a%4+1,next=start+4;return numeric(`數列 ${start**2}、${(start+1)**2}、${(start+2)**2}、${(start+3)**2}、□，下一個是多少？`,next**2,[`每一項是連續整數乘自己的平方數。`,`下一個正方形的邊長是 ${next}。`,`${next} × ${next} = ${next**2}。`],{kind:'grid',values:[next,next]});}
      if(arg==='multiply')return numeric(`${a} × ${b} = ${a*b}，${a*10} × ${b*10} 是多少？`,a*b*100,[`第一個乘數變十倍。`,`第二個乘數也變十倍，積共變一百倍。`,`${a*b} × 100 = ${a*b*100}。`],{kind:'equation',values:[a,b,10],text:`${a*10} × ${b*10}`},'',10);
      const start=a,gap=b%4+2;
      return numeric(arg==='tiles'?`用小方格排圖，第1圖 ${start+gap} 格、第2圖 ${start+2*gap} 格、第3圖 ${start+3*gap} 格，第4圖有幾格？`:`${start}、${start+gap}、${start+2*gap}、□，空格是多少？`,start+3*gap+(arg==='tiles'?gap:0),[`先比較每相鄰兩項。`,`每次增加 ${gap}。`,arg==='tiles'?`第4圖是 ${start+3*gap} + ${gap} = ${start+4*gap}。`:`下一項是 ${start+2*gap} + ${gap} = ${start+3*gap}。`],{kind:'bars',values:[start+gap,start+2*gap,start+3*gap],labels:['第一圖','第二圖','第三圖']});
    }
    case 'factors': {
      const x=a*(c%3+2),y=b*(c%3+2),div=gcd(x,y),multiple=lcm(x,y);
      if(arg==='prime') {const candidates=[7,9,11,15,17,21,23,25],n=candidates[t%candidates.length],prime=[7,11,17,23].includes(n);return textual(`${n} 是質數還是合數？`,prime?'質數':'合數',['質數','合數','一既不是質數也不是合數'],[`質數只有一和自己兩個正因數。`,`依序檢查能不能被比它小、且大於一的整數整除。`,prime?`${n} 只有一和 ${n} 兩個正因數，是質數。`:`${n} 有其他正因數，是合數。`],{kind:'factors',values:[n]});}
      if(arg==='primefactor') {const primes=[2,3,5],p=primes[t%3],q=primes[u%3],n=p*p*q;return textual(`${n} 的質因數分解是哪一個？`,`${p} × ${p} × ${q}`,[`${p} × ${q}`,`${p} × ${p*q+1}`,`${p+1} × ${p} × ${q}`],[`每個因數都必須是質數。`,`${n} ÷ ${p} = ${p*q}，再分解。`,`${n} = ${p} × ${p} × ${q}。`],{kind:'factors',values:[n,p,p,q]});}
      if(arg==='gcd')return numeric(`${x} 和 ${y} 的最大公因數是多少？`,div,[`公因數要能同時整除兩個數。`,`分別列出因數，找出共同的部分。`,`最大的共同因數是 ${div}。`],{kind:'factors',values:[x,y]});
      if(arg==='lcm'||arg==='story')return numeric(arg==='story'?`甲燈每 ${x} 秒亮一次，乙燈每 ${y} 秒亮一次。現在一起亮，至少幾秒後再一起亮？`:`${x} 和 ${y} 的最小公倍數是多少？`,multiple,[`要同時符合兩個週期，找共同的倍數。`,`用兩數乘積除以最大公因數：${x} × ${y} ÷ ${div}。`,`最小公倍數是 ${multiple}。`],{kind:'factors',values:[x,y]},arg==='story'?'秒':'');
      if(arg==='multiple')return numeric(`${a} 的第 ${b} 個正倍數是多少？`,a*b,[`正倍數從這個數的一倍開始。`,`${a} × ${b}。`,`第 ${b} 個正倍數是 ${a*b}。`],{kind:'groups',values:[a,b]});
      if(arg==='factor')return textual(`哪個數是 ${a*b} 的因數？`,String(a),[String(a*b+1),String(a*b+2),String(a*b+3)],[`因數必須能把原數整除。`,`${a*b} ÷ ${a} = ${b}，沒有餘數。`,`${a} 是 ${a*b} 的因數。`],{kind:'groups',values:[a,b]});
      return textual(`${a*b} 能不能被 ${a} 整除？`,'可以',['可以','不可以','只看個位就一定能判斷'],[`整除表示商是整數且沒有餘數。`,`${a*b} ÷ ${a} = ${b}。`,`沒有餘數，所以可以整除。`],{kind:'groups',values:[a,b]});
    }
    case 'average': {
      if(arg==='sumdiff') {const small=a*10+b,difference=c*2,big=small+difference,total=small+big;return numeric(`兩個數的和是 ${total}，差是 ${difference}，較大的數是多少？`,big,[`和加上差，會得到兩個較大的數。`,`${total} + ${difference} = ${2*big}。`,`再除以二，較大的數是 ${big}。`],{kind:'bars',values:[small,big],labels:['小數','大數']});}
      if(arg==='age') {const younger=a+5,older=younger+b,years=c;return numeric(`哥哥 ${older} 歲，妹妹 ${younger} 歲。${years} 年後兩人相差幾歲？`,b,[`現在的年齡差是 ${older} − ${younger} = ${b}。`,`每過一年，兩個人都增加一歲。`,`年齡差不變，還是 ${b} 歲。`],{kind:'bars',values:[older,younger],labels:['哥哥','妹妹']},'歲');}
      const values=[a*3,b*3,c*3],sum=values.reduce((n,v)=>n+v,0),mean=sum/3;
      if(arg==='missing')return numeric(`三次平均 ${fmt(mean)} 分，前兩次 ${values[0]}、${values[1]} 分，第三次幾分？`,values[2],[`先由平均乘次數，還原總分。`,`${fmt(mean)} × 3 = ${sum}。`,`${sum} − ${values[0]} − ${values[1]} = ${values[2]}。`],{kind:'bars',values:[values[0],values[1]],labels:['第一次','第二次']},'分');
      return numeric(`三次紀錄是 ${values.join('、')}，平均是多少？`,mean,[`先加總三次紀錄。`,`${values.join(' + ')} = ${sum}。`,`總和除以次數：${sum} ÷ 3 = ${fmt(mean)}。`],{kind:'bars',values,labels:['第一次','第二次','第三次']});
    }
    case 'speed': {
      const rate=(a+2)*10,hours=b%4+1,distance=rate*hours;
      if(arg==='convert')return numeric(`${rate} 公尺／秒，換成公尺／分是多少？`,rate*60,[`一分鐘有六十秒。`,`每秒走 ${rate} 公尺，一分鐘走六十次。`,`${rate} × 60 = ${rate*60} 公尺／分。`],{kind:'timeline',values:[1,60],labels:['秒','分']},'公尺／分',60);
      if(arg==='average') {const speed1=(a+2)*10,speed2=(b+2)*10,time1=c%3+1,time2=d%3+1,totalDistance=speed1*time1+speed2*time2,totalTime=time1+time2,result=Math.round(totalDistance/totalTime*100)/100;return numeric(`前段時速 ${speed1} 公里走 ${time1} 小時，後段時速 ${speed2} 公里走 ${time2} 小時。全程平均時速多少？四捨五入到小數點後兩位。`,result,[`平均速率用總距離除以總時間，不能直接平均兩個速率。`,`總距離 ${speed1} × ${time1} + ${speed2} × ${time2} = ${totalDistance}。`,`總時間 ${totalTime} 小時，${totalDistance} ÷ ${totalTime}，四捨五入後約 ${fmt(result)}。`],{kind:'timeline',values:[time1,time2],labels:[`${speed1} 公里／時`,`${speed2} 公里／時`]},'公里／時');}
      if(arg==='chase') {const slow=a*10,fast=slow+b,gap=b*c;return numeric(`甲在前方 ${gap} 公尺，甲每分走 ${slow} 公尺，乙同方向每分走 ${fast} 公尺。乙幾分鐘後追上甲？`,c,[`同方向追趕，每分鐘縮短的距離是兩人速率的差。`,`${fast} − ${slow} = ${b} 公尺／分。`,`${gap} ÷ ${b} = ${c} 分鐘。`],{kind:'bars',values:[slow,fast],labels:['甲速率','乙速率']},'分鐘');}
      if(arg==='distance')return numeric(`時速 ${rate} 公里，走 ${hours} 小時，共走幾公里？`,distance,[`速率表示每一單位時間走的距離。`,`距離 = 速率 × 時間。`,`${rate} × ${hours} = ${distance} 公里。`],{kind:'timeline',values:[rate,hours]},'公里',10);
      return numeric(`${hours} 小時走了 ${distance} 公里，時速是多少？`,rate,[`先確認距離和時間的單位。`,`速率 = 距離 ÷ 時間。`,`${distance} ÷ ${hours} = ${rate} 公里／時。`],{kind:'timeline',values:[distance,hours]},'公里／時',10);
    }
    case 'interval': {
      const intervals=a+b,gap=c*5;
      return numeric(`一條 ${intervals*gap} 公尺的直路，每隔 ${gap} 公尺種一棵樹，兩端都種，共種幾棵？`,intervals+1,[`先算有幾段間隔。`,`${intervals*gap} ÷ ${gap} = ${intervals} 段。`,`兩端都種，棵數比間隔多一：${intervals+1} 棵。`],{kind:'interval',values:[0,intervals*gap,intervals,gap]},'棵');
    }
    case 'combination':return numeric(`有 ${a} 種主餐、${b} 種飲料，各選一種，有幾種搭配？`,a*b,[`固定一種主餐時，可以搭配 ${b} 種飲料。`,`一共有 ${a} 種主餐。`,`${a} × ${b} = ${a*b} 種。`],{kind:'grid',values:[a,b]},'種');
    case 'probability': {
      const red=a+3,blue=b,green=c,sum=red+blue+green;
      return rationalTask(`袋中有 ${red} 顆紅球、${blue} 顆藍球、${green} 顆綠球，每顆被摸到的機會相同。摸到紅球的可能性是多少？`,red,sum,[`先數全部球：${red} + ${blue} + ${green} = ${sum}。`,`每顆機會相同，紅球占全部的 ${red}/${sum}。`,`可能性是 ${fraction(red,sum)}。`],{kind:'bag',values:[red,blue,green],labels:['紅球','藍球','綠球']});
    }
  }
}
