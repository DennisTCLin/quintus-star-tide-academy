import { numeric, textual, rationalTask, fraction, mixed, gcd, lcm, fmt, type MathTask, type MathSeed, type MathDiagram } from './math-task';

export function fractionTask(kind:string,arg:string,extra:string,s:MathSeed):MathTask|undefined {
  const {a,b,c,t}=s,d=b%7+2,n=a%d+1,e=c%6+2,other=c%e+1;
  const picture:MathDiagram={kind:'fraction',values:[n,d]};
  switch(kind) {
    case 'fraction': {
      if(arg==='equal') {
        const parts=t%2?2:4;
        return textual(`把同一個整體分成 ${parts} 份，要叫做「${parts} 等分」，哪個條件一定要符合？`,'每一份一樣大',['每一份顏色一樣','每一份位置一樣','只要分成指定份數'],[`等分不只是數份數。`,`每份的面積或量都要相同。`,`分成 ${parts} 份，而且每份一樣大，才是 ${parts} 等分。`],{kind:'fraction',values:[1,parts]});
      }
      if(arg==='halfquarter'||arg==='unit') {
        const parts=arg==='halfquarter'?(t%2?2:4):d;
        return rationalTask(`把一張紙平均分成 ${parts} 份，塗色一份，是整張的幾分之幾？`,1,parts,[`先確認每一份一樣大。`,`分母是全部分成的份數 ${parts}；分子是塗色的份數一。`,`所以是一份 ${fraction(1,parts)}。`],{kind:'fraction',values:[1,parts]});
      }
      if(arg==='whole')return numeric(`每份是 1/${d}，要幾份才剛好合成一個整體？`,d,[`一個整體被平均分成 ${d} 份。`,`每份是 1/${d}。`,`${d} 個 1/${d} 合起來是 ${d}/${d} = 1。`],{kind:'fraction',values:[d,d]},'份');
      if(arg==='mixedkind') {
        const numerator=t%3===0?n:t%3===1?d+n:d*2;
        return textual(`${numerator}/${d} 是哪一類分數？`,numerator<d?'真分數':'假分數',['真分數','假分數','帶分數','無法判斷'],[`先比較分子和分母。`,`分子小於分母是真分數；分子大於或等於分母是假分數。`,`${numerator} ${numerator<d?'<':'≥'} ${d}，所以是${numerator<d?'真分數':'假分數'}。`],{kind:'fraction',values:[numerator,d]});
      }
      if(arg==='mixedconvert') {
        const numerator=a*d+n;
        return textual(`把 ${numerator}/${d} 化成整數或帶分數。`,mixed(numerator,d),[mixed(numerator+1,d),mixed(numerator+d,d),mixed(numerator,d+1)],[`用分子除以分母。`,`${numerator} ÷ ${d}，商 ${Math.floor(numerator/d)}，餘 ${numerator%d}。`,`完整的單位寫成整數，剩下的分數保留原分母：${mixed(numerator,d)}。`],{kind:'fraction',values:[numerator,d]});
      }
      if(arg==='equivalent'||arg==='reduce') {
        const k=c%4+2,div=gcd(n*k,d*k),num=arg==='reduce'?n*k:n,den=arg==='reduce'?d*k:d;
        if(arg==='reduce')return rationalTask(`把 ${num}/${den} 約成最簡分數。`,num,den,[`找分子和分母共同的因數。`,`${num} 和 ${den} 的最大公因數是 ${div}。`,`分子分母同除以 ${div}，得到 ${fraction(num,den)}。`],{kind:'fraction',values:[num,den]});
        return numeric(`${n}/${d} = □/${d*k}，空格是多少？`,n*k,[`分母從 ${d} 變成 ${d*k}，乘了 ${k}。`,`分子也要乘相同的數，分數大小才不變。`,`${n} × ${k} = ${n*k}。`],picture);
      }
      if(arg==='decimal') {
        const den=[2,4,5,10][t%4],num=a%den+1;
        return numeric(`把 ${num}/${den} 寫成小數。`,num/den,[`分數也表示分子除以分母。`,`${num} ÷ ${den}。`,`等於 ${fmt(num/den)}。`],{kind:'fraction',values:[num,den]},'',.05);
      }
      if(arg==='division')return rationalTask(`${a} 張餅平均分給 ${d} 人，每人幾張？`,a,d,[`平均分，使用除法。`,`${a} ÷ ${d} 可以寫成 ${a}/${d}。`,`每人是 ${fraction(a,d)} 張。`],{kind:'fraction',values:[a,d]});
      return rationalTask(arg==='units'?`${n} 個 1/${d} 合起來是多少？`:`圖中的塗色部分，是一個整體的幾分之幾？`,n,d,[`一個整體平均分成 ${d} 份。`,`塗色占其中 ${n} 份。`,`所以是 ${n}/${d}${gcd(n,d)>1?`，約分後是 ${fraction(n,d)}`:''}。`],picture);
    }
    case 'fractionop': {
      const same=extra==='same',den=same?d:e,m=same?c%d+1:other;
      const diagram:MathDiagram={kind:'fraction',values:[n,d,m,den]};
      if(arg==='compare') {
        const improper=extra==='improper',ln=improper?n+d:n,rn=improper?m+den:m,x=ln/d,y=rn/den;
        return textual(`比較 ${ln}/${d} 和 ${rn}/${den}，哪一個比較大？`,x===y?'一樣大':x>y?`${ln}/${d}`:`${rn}/${den}`,[`${ln}/${d}`,`${rn}/${den}`,'一樣大','無法比較'],[`比較時，兩個整體的大小要相同。`,d===den?'分母相同，比較分子就可以。':`通分到 ${lcm(d,den)}：${ln*lcm(d,den)/d}/${lcm(d,den)} 和 ${rn*lcm(d,den)/den}/${lcm(d,den)}。`,x===y?'兩個分數一樣大。':`${x>y?`${ln}/${d}`:`${rn}/${den}`} 比較大。`],{kind:'fraction',values:[ln,d,rn,den]});
      }
      if(arg==='addsub') {
        const sub=t%2===0,common=lcm(d,den),l=n*common/d,r=m*common/den,top=sub?Math.max(l,r):l,other=sub?Math.min(l,r):r,result=sub?top-other:top+other;
        const lhs=sub&&r>l?`${m}/${den}`:`${n}/${d}`,rhs=sub&&r>l?`${n}/${d}`:`${m}/${den}`;
        return rationalTask(`${lhs} ${sub?'−':'+'} ${rhs} = 多少？`,result,common,[d===den?`分母相同，每一份的大小一樣。`:`先通分成分母 ${common}。`,`${top}/${common} ${sub?'−':'+'} ${other}/${common}，分母不變，計算分子。`,`答案是 ${fraction(result,common)}。`],diagram);
      }
      if(arg==='timesinteger'||arg==='unitmultiple'||arg==='half') {
        const multiplier=arg==='half'?2:d,numerator=arg==='unitmultiple'||arg==='half'?1:n,whole=arg==='half'?a*2:a,resultN=whole*numerator;
        return rationalTask(`${whole} × ${numerator}/${multiplier} = 多少？`,resultN,multiplier,[`把 ${whole} 當成整數分數 ${whole}/1。`,`分子乘分子，分母乘分母：${whole} × ${numerator}，分母 ${multiplier}。`,`約分後是 ${fraction(resultN,multiplier)}。`],{kind:'fraction',values:[resultN,multiplier]});
      }
      if(arg==='productsize'||arg==='quotientsize') {
        const divisor=t%3===0?(d+1)/d:t%3===1?1:(d-1)/d,divide=arg==='quotientsize',x=divide?a/divisor:a*divisor;
        return textual(`${a} ${divide?'÷':'×'} ${fmt(divisor)}，結果和 ${a} 比，會怎樣？`,Math.abs(x-a)<1e-8?'一樣大':x>a?'比較大':'比較小',['比較大','比較小','一樣大','一定等於零'],[`先看${divide?'除數':'乘數'} ${fmt(divisor)} 和一的關係。`,divide?'除以小於一的正數會變大；除以大於一的數會變小。':'乘以小於一的正數會變小；乘以大於一的數會變大。',`這題結果${Math.abs(x-a)<1e-8?'一樣大':x>a?'比較大':'比較小'}。`],{kind:'bars',values:[a,divisor],labels:['原數','運算的數']});
      }
      if(arg==='divideinteger') return rationalTask(`${n}/${d} ÷ ${c} = 多少？`,n,d*c,[`除以 ${c}，就是平均分成 ${c} 份。`,`也可以乘以 ${c} 的倒數 1/${c}。`,`${n}/${d} × 1/${c} = ${fraction(n,d*c)}。`],picture);
      if(arg==='multiply') return rationalTask(`${n}/${d} × ${m}/${e} = 多少？`,n*m,d*e,[`先看整體的 ${n}/${d}。`,`再取這一部分的 ${m}/${e}。`,`分子相乘、分母相乘，再約分：${fraction(n*m,d*e)}。`],{kind:'fractiongrid',values:[n,d,m,e]});
      if(arg==='divide')return rationalTask(`${n}/${d} ÷ ${m}/${den} = 多少？`,n*den,d*m,[`除以一個分數，可以乘以它的倒數。`,`把除號改成乘號，第二個分數上下交換。`,`${n}/${d} × ${den}/${m} = ${fraction(n*den,d*m)}。`],diagram);
      if(arg==='mixed') {
        const decimal=(a%8+1)/10,num=Math.round(decimal*10)*d+n*10;
        return rationalTask(`${fmt(decimal)} + ${n}/${d} = 多少？`,num,10*d,[`先把 ${fmt(decimal)} 化成 ${Math.round(decimal*10)}/10。`,`分數通分，再把分子相加。`,`結果是 ${fraction(num,10*d)}。`],picture);
      }
      if(arg==='simplify')return rationalTask(`${n}/${d} × ${a} + ${n}/${d} × ${b} = 多少？`,n*(a+b),d,[`兩項都有 ${n}/${d}。`,`使用分配律，寫成 ${n}/${d} × (${a} + ${b})。`,`先算括號，再相乘，得到 ${fraction(n*(a+b),d)}。`],picture);
      if(arg==='four')return rationalTask(`${n}/${d} + ${m}/${e} × ${c} = 多少？`,n*e+m*c*d,d*e,[`先做乘法 ${m}/${e} × ${c}。`,`把 ${n}/${d} 和 ${m*c}/${e} 通分。`,`相加並約分，答案是 ${fraction(n*e+m*c*d,d*e)}。`],picture);
      throw Error(`Unknown fraction operation ${arg}`);
    }
    case 'ratio': {
      const k=c%4+2,x=a*k,y=b*k,div=gcd(x,y);
      if(arg==='equivalent')return numeric(`${a} : ${b} = □ : ${b*k}，空格是多少？`,a*k,[`後項從 ${b} 變成 ${b*k}，乘了 ${k}。`,`前項也乘相同的數。`,`${a} × ${k} = ${a*k}。`],{kind:'bars',values:[a,b],labels:['前項','後項']});
      if(arg==='simplify')return textual(`把 ${x} : ${y} 化成最簡單整數比。`,`${x/div} : ${y/div}`,[`${x/div+1} : ${y/div}`,`${x/div} : ${y/div+1}`,`${y/div+1} : ${x/div+1}`],[`先找前項和後項的最大公因數。`,`最大公因數是 ${div}，前後項都除以 ${div}。`,`得到 ${x/div} : ${y/div}。`],{kind:'bars',values:[x,y],labels:['前項','後項']});
      if(arg==='value')return rationalTask(`${a} : ${b} 的比值是多少？`,a,b,[`比值是前項除以後項。`,`${a} ÷ ${b} = ${a}/${b}。`,`約分後的比值是 ${fraction(a,b)}。`],{kind:'bars',values:[a,b]});
      if(arg==='base')return numeric(`甲有 ${a} 顆，乙是甲的 ${b} 倍。以甲為基準量，乙有幾顆？`,a*b,[`基準量是 ${a}。`,`比較量 = 基準量 × 倍數。`,`${a} × ${b} = ${a*b}。`],{kind:'bars',values:[a,a*b],labels:['甲','乙']});
      const small=a,big=a+b,total=(small+big)*k,difference=(big-small)*k;
      return numeric(`甲和乙的比是 ${small} : ${big}，兩人${arg==='sum'?`共有 ${total}`:`相差 ${difference}`}顆，甲有幾顆？`,small*k,[`把甲當 ${small} 份、乙當 ${big} 份。`,arg==='sum'?`共有 ${small+big} 份，每份 ${total} ÷ ${small+big} = ${k}。`:`相差 ${big-small} 份，每份 ${difference} ÷ ${big-small} = ${k}。`,`甲有 ${small} × ${k} = ${small*k} 顆。`],{kind:'bars',values:[small,big],labels:['甲','乙']},'顆');
    }
    case 'percent': {
      const total=[20,25,40,50,100][t%5],part=(a%4+1)*total/5,pct=part/total*100;
      if(arg==='ratio')return rationalTask(`全班 ${total} 人，有 ${part} 人參加，參加人數占全班的比率是多少？`,part,total,[`以全班人數作基準。`,`比率 = 參加人數 ÷ 全班人數。`,`${part}/${total} = ${fraction(part,total)}。`],{kind:'fraction',values:[part,total]});
      if(arg==='percent')return numeric(`${part}/${total} 是百分之幾？`,pct,[`百分率就是把基準量看成一百份。`,`${part} ÷ ${total} × 100 = ${pct}。`,`寫成 ${pct}%。`],{kind:'fraction',values:[part,total]},'%',10);
      const price=(a+2)*100,discount=(b%5+4)*10;
      return numeric(`原價 ${price} 元，現在售價是原價的 ${discount}%，售價是多少元？`,price*discount/100,[`把原價當成百分之百。`,`${discount}% = ${discount}/100。`,`${price} × ${discount}/100 = ${price*discount/100} 元。`],{kind:'bars',values:[price,price*discount/100],labels:['原價','售價']},'元',10);
    }
  }
}
