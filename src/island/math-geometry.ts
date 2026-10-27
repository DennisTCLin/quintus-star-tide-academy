import { numeric, textual, rationalTask, fraction, fmt, grid, type MathTask, type MathSeed, type MathDiagram } from './math-task';

export function geometryTask(kind:string,arg:string,_extra:string,s:MathSeed):MathTask|undefined {
  const {a,b,c,t,u}=s;
  switch(kind) {
    case 'area': {
      const w=a+2,h=b+2,diagram:MathDiagram={kind:'area',values:[w,h]};
      if(arg==='compare')return textual(`兩張方格紙的每格一樣大，甲有 ${w*h} 格、乙有 ${w*h+c} 格，哪一張面積較大？`,'乙',['甲','兩張一樣大','無法比較'],[`比較面積，要使用相同大小的單位。`,`甲有 ${w*h} 格，乙有 ${w*h+c} 格。`,`乙比甲多 ${c} 格，所以乙比較大。`],{kind:'bars',values:[w*h,w*h+c],labels:['甲','乙']});
      if(arg==='unit')return numeric(`用邊長一公分的小正方形鋪滿，一排 ${w} 片，共 ${h} 排，面積是多少？`,w*h,[`邊長一公分的小正方形，面積是一平方公分。`,`每排 ${w} 片，共 ${h} 排。`,`${w} × ${h} = ${w*h} 平方公分。`],grid(w,h),'平方公分');
      if(arg==='irregular'||arg==='composite') {
        const cutw=Math.max(1,w-2),cuth=Math.max(1,h-2),area=w*h-cutw*cuth;
        return numeric(`長 ${w}、寬 ${h} 公分的長方形，右上角剪去 ${cutw} × ${cuth} 公分的小長方形，剩下面積是多少？`,area,[`先算完整長方形：${w} × ${h} = ${w*h}。`,`再算剪去部分：${cutw} × ${cuth} = ${cutw*cuth}。`,`${w*h} − ${cutw*cuth} = ${area} 平方公分。`],{kind:'area',values:[w,h,cutw,cuth]},'平方公分');
      }
      if(arg==='sameperimeter')return numeric(`甲長方形是 ${w} × ${h} 公分，乙長方形是 ${w+1} × ${h-1} 公分。乙的面積是多少？`,(w+1)*(h-1),[`兩張的長加寬一樣，所以周長相同。`,`周長相同，面積不一定相同。`,`乙的面積是 ${w+1} × ${h-1} = ${(w+1)*(h-1)} 平方公分。`],{kind:'area',values:[w+1,h-1]},'平方公分');
      if(arg==='triangle')return numeric(`三角形的底 ${w*2} 公分、高 ${h} 公分，面積是多少？`,w*h,[`找相互垂直的底和高。`,`兩個一樣的三角形能拼成平行四邊形。`,`底 × 高 ÷ 2 = ${w*2} × ${h} ÷ 2 = ${w*h}。`],{kind:'triangle',values:[w*2,h]},'平方公分');
      if(arg==='trapezoid')return numeric(`梯形的上底 ${w}、下底 ${w+2}、高 ${h} 公分，面積是多少？`,(w+1)*h,[`兩個全等梯形可以拼成一個平行四邊形。`,`底是上底加下底，高不變。`,`(${w} + ${w+2}) × ${h} ÷ 2 = ${(w+1)*h}。`],{kind:'trapezoid',values:[w,w+2,h]},'平方公分');
      if(arg==='change')return numeric(`平行四邊形的底 ${w}、高 ${h} 公分。高不變，底變成 ${c} 倍，新面積是多少？`,w*h*c,[`原面積是 ${w} × ${h} = ${w*h}。`,`高不變，底變 ${c} 倍，面積也變 ${c} 倍。`,`${w*h} × ${c} = ${w*h*c}。`],{kind:'parallelogram',values:[w*c,h]},'平方公分');
      return numeric(`圖形的底 ${w} 公分、高 ${h} 公分，面積是多少？`,w*h,[arg==='parallelogram'?'把斜邊旁的三角形平移，可以拼成長方形。':'一排的格數乘上排數，就是全部的格數。',`底是 ${w}，垂直的高是 ${h}。`,`${w} × ${h} = ${w*h} 平方公分。`],{kind:arg==='parallelogram'?'parallelogram':'area',values:[w,h]},'平方公分');
    }
    case 'perimeter': {
      const w=a+2,h=b+2;
      return numeric(`長方形的長 ${w} 公分、寬 ${h} 公分，沿外圍繞一圈共幾公分？`,2*(w+h),[`周長是外面一圈的長度，不是裡面的面積。`,`兩條長 ${w}，兩條寬 ${h}。`,`${w} + ${h} + ${w} + ${h} = ${2*(w+h)} 公分。`],{kind:'perimeter',values:[w,h]},'公分');
    }
    case 'polygon': {
      if(arg==='vertices') {const sides=t%4+3;return numeric(`這個 ${sides} 邊形有幾個頂點？`,sides,[`沿著外面的邊走一圈。`,`兩條邊相接的地方就是頂點。`,`${sides} 邊形有 ${sides} 個頂點，也有 ${sides} 個角。`],{kind:'polygon',values:[sides]},'個');}
      if(arg==='angles') {const n=t%4+3;return numeric(`${n} 邊形的內角和是多少度？`,(n-2)*180,[`從同一個頂點連向其他不相鄰頂點。`,`可以分成 ${n-2} 個三角形。`,`${n-2} × 180 = ${(n-2)*180} 度。`],{kind:'polygon',values:[n]},'度',180);}
      const square=t%2===0;
      if(arg==='family')return textual(`四個角都是直角，而且四條邊一樣長，是哪個圖形？`,'正方形',['一般梯形','平行四邊形但不是長方形','任意四邊形'],[`先看四個角，都是九十度。`,`再看四邊，長度完全相同。`,`四角都是直角、四邊等長，就是正方形。`],{kind:'area',values:[a,a]});
      return numeric(`${square?'正方形':'長方形'}有幾個直角？`,4,[`找到相鄰兩條邊形成的角。`,`依序查看四個角，每個都是九十度。`,`共有四個直角。`],{kind:'area',values:[a,square?a:b]},'個');
    }
    case 'classify':return textual(`哪一個是立體形體？`,'正方體',['正方形','三角形','圓形'],[`平面圖形只占一個面。`,`立體形體有長、寬、高，占有空間。`,`正方體是立體形體。`],{kind:'solid',values:[a,a,a]});
    case 'solid': {
      const base=t%4+3;
      if(arg==='box')return numeric(`一個正方體有幾個面？`,6,[`先看前後兩面。`,`再看左右兩面，最後看上下兩面。`,`兩面加兩面加兩面，共六個面。`],{kind:'solid',values:[a,a,a]},'個面');
      if(arg==='parallel')return numeric(`長方體共有幾組互相平行的相對面？`,3,[`先找前面和後面，它們互相平行。`,`左面和右面、上面和下面也各自平行。`,`一共三組。`],{kind:'solid',values:[a,b,c]},'組');
      if(arg==='prism')return numeric(`${base} 角柱有 ${base} 個側面，加上兩個底面，一共有幾個面？`,base+2,[`角柱上下兩個底面全等且互相平行。`,`底面有 ${base} 條邊，所以有 ${base} 個側面。`,`${base} + 2 = ${base+2} 個面。`],{kind:'prism',values:[base,a,b]},'個面');
      if(arg==='pyramid')return numeric(`${base} 角錐有一個底面和幾個三角形側面？`,base,[`角錐有一個底面，側面都會聚在同一個頂點。`,`底面的每條邊，都接著一個三角形側面。`,`${base} 角錐有 ${base} 個三角形側面。`],{kind:'pyramid',values:[base,a,b]},'個');
      return textual(`球和圓柱相比，哪個敘述正確？`,'球沒有平的底面',['球有兩個圓形底面','球有四個頂點','球的每個面都是正方形'],[`摸一摸球的表面，是連續的曲面。`,`球沒有角柱那樣的平底面或頂點。`,`圓柱有兩個圓形底面，球沒有。`],{kind:'sphere',values:[a]});
    }
    case 'angle': {
      const degrees=(t%11+1)*15,other=(u%11+1)*15;
      if(arg==='right')return textual(`圖上的角是 ${degrees} 度，和直角比較，屬於哪一種？`,degrees===90?'直角':degrees<90?'銳角':'鈍角',['銳角','直角','鈍角','平角'],[`直角是九十度。`,`小於九十度是銳角；大於九十度、小於一百八十度是鈍角。`,`${degrees} 度是${degrees===90?'直角':degrees<90?'銳角':'鈍角'}。`],{kind:'angle',values:[degrees]});
      if(arg==='parts')return textual(`角的兩條邊相交的共同端點，叫做什麼？`,'頂點',['半徑','圓心','周長'],[`先找兩條射線。`,`兩條射線有同一個起點。`,`這個共同端點叫做角的頂點。`],{kind:'angle',values:[degrees]});
      if(arg==='compare')return textual(`甲角 ${degrees} 度、乙角 ${other} 度，哪個角比較大？`,degrees===other?'一樣大':degrees>other?'甲角':'乙角',['甲角','乙角','一樣大','邊較長的角一定較大'],[`角的大小看張開的程度，不看邊長。`,`甲角 ${degrees} 度，乙角 ${other} 度。`,degrees===other?'兩個角一樣大。':`${degrees>other?'甲':'乙'}角的度數比較大。`],{kind:'angle',values:[degrees,other]});
      if(arg==='turn') {const turn=t%3+1;return numeric(`從原方向順時針轉 ${turn}/4 圈，轉了幾度？`,turn*90,[`完整一圈是三百六十度。`,`四分之一圈是九十度。`,`${turn} × 90 = ${turn*90} 度。`],{kind:'angle',values:[turn*90]},'度',90);}
      if(arg==='sum') {const x=a*5+10,y=b*5+10;return numeric(`相鄰的兩個角是 ${x} 度和 ${y} 度，合起來幾度？`,x+y,[`先確認兩個角沒有重疊。`,`相鄰角合起來，度數用加法。`,`${x} + ${y} = ${x+y} 度。`],{kind:'angle',values:[x,y]},'度',5);}
      return numeric(arg==='draw'?`要畫 ${degrees} 度的角，另一條射線應通過幾度的刻度？`:`量角器零度和角的一邊對齊，另一邊對到幾度？`,degrees,[`中心點對準頂點，零度線對齊角的一邊。`,`從正確的零度那一側開始讀刻度。`,`讀到 ${degrees} 度。`],{kind:'protractor',values:[degrees]},'度',15);
    }
    case 'triangle': {
      if(arg==='angles'){const x=(a%4+1)*10+20,y=(b%4+1)*10+20;return numeric(`三角形兩個角是 ${x} 度和 ${y} 度，第三個角幾度？`,180-x-y,[`三角形內角和是一百八十度。`,`已知兩角相加是 ${x+y} 度。`,`180 − ${x+y} = ${180-x-y} 度。`],{kind:'triangle',values:[a,b,x,y],text:'angles'},'度',10);}
      if(arg==='inequality'){const x=a+2,y=b+2,z=x+y+(t%3-1);return textual(`邊長 ${x}、${y}、${z} 公分，能不能圍成三角形？`,x+y>z&&x+z>y&&y+z>x?'可以':'不可以',['可以','不可以','只要最長邊較長就可以','只要兩邊一樣長就可以'],[`三角形任意兩邊的和，都要大於第三邊。`,`比較 ${x+y} 和 ${z}、${x+z} 和 ${y}、${y+z} 和 ${x}。`,x+y>z&&x+z>y&&y+z>x?'三組條件都符合，可以圍成。':'至少一組不符合，不能圍成三角形。'],{kind:'bars',values:[x,y,z],labels:['邊一','邊二','邊三']});}
      const equal=t%2===0,side=a+3;
      return textual(`三角形的三邊是 ${side}、${side}、${equal?side:side+1} 公分。最精確的分類是什麼？`,equal?'正三角形':'等腰但非正三角形',['正三角形','等腰但非正三角形','三邊都不等長','無法判斷'],[`觀察三條邊的長度。`,equal?'三條邊都一樣長。':'只有兩條邊一樣長。',equal?'正三角形也屬於等腰三角形；最精確名稱是正三角形。':'這是等腰三角形，但不是正三角形。'],{kind:'triangle',values:[side,side,equal?side:side+1]});
    }
    case 'congruent':return textual(`甲三角形三邊是 ${a+3}、${a+4}、${a+5} 公分。哪一組邊長和甲全等？`,`${a+3}、${a+4}、${a+5}`,[`${a+4}、${a+5}、${a+6}`,`${2*(a+3)}、${2*(a+4)}、${2*(a+5)}`,`${a+3}、${a+4}、${a+6}`],[`全等圖形的形狀和大小都相同。`,`旋轉或翻面不會改變邊長。`,`三邊完全對應相等的那一組，才和甲全等。`],{kind:'triangle',values:[a+3,a+4,a+5]});
    case 'lines': {
      const perpendicular=arg==='perpendicular';
      return textual(`兩條線${perpendicular?'相交成九十度':'在同一平面上，怎樣延長都不相交'}，叫做什麼？`,perpendicular?'互相垂直':'互相平行',['互相平行','互相垂直','一定重合','都是曲線'],[`先看兩條線的方向。`,perpendicular?'交角為九十度，就是垂直。':'同一平面上不相交的兩直線，就是平行。',perpendicular?'用直角工具可以檢查垂直。':'兩平行線之間的垂直距離處處相同。'],{kind:'lines',values:[perpendicular?90:0,a]});
    }
    case 'circle': {
      const r=a+1,diameter=2*r;
      if(arg==='parts'||arg==='compass')return numeric(arg==='compass'?`要畫直徑 ${diameter} 公分的圓，圓規兩腳應張開幾公分？`:`圓的直徑是 ${diameter} 公分，半徑是多少公分？`,r,[`圓心到圓周的距離叫半徑。`,`直徑經過圓心，是半徑的兩倍。`,`${diameter} ÷ 2 = ${r} 公分。`],{kind:'circle',values:[r,360]},'公分');
      if(arg==='pi')return numeric(`量得一個圓的周長 ${fmt(3.14*diameter)} 公分、直徑 ${diameter} 公分。周長除以直徑約是多少？`,3.14,[`圓周率是圓周長和直徑的比值。`,`${fmt(3.14*diameter)} ÷ ${diameter}。`,`約是 3.14，這是本題使用的圓周率近似值。`],{kind:'circle',values:[r,360]},'',.1);
      if(arg==='circumference')return numeric(`半徑 ${r} 公分的圓，圓周長是多少？圓周率用 3.14。`,6.28*r,[`先把半徑乘二，得到直徑 ${diameter}。`,`圓周長 = 直徑 × 圓周率。`,`${diameter} × 3.14 = ${fmt(6.28*r)} 公分。`],{kind:'circle',values:[r,360]},'公分',3.14);
      if(arg==='composite'){const small=r-1;return numeric(`大圓半徑 ${r} 公分，挖去同圓心、半徑 ${small} 公分的小圓，剩下面積多少？圓周率用 3.14。`,3.14*(r*r-small*small),[`先算大圓面積 ${r} × ${r} × 3.14。`,`再算挖去小圓的面積 ${small} × ${small} × 3.14。`,`相減得到 ${fmt(3.14*(r*r-small*small))} 平方公分。`],{kind:'circle',values:[r,360,small]},'平方公分',3.14);}
      return numeric(`半徑 ${r} 公分的圓，面積是多少？圓周率用 3.14。`,3.14*r*r,[`把圓切成許多小扇形再交錯排，接近長方形。`,`長接近半個圓周，寬是半徑。`,`面積 = 半徑 × 半徑 × 圓周率 = ${fmt(3.14*r*r)}。`],{kind:'circle',values:[r,360],text:'area'},'平方公分',3.14);
    }
    case 'sector': {
      const parts=[2,3,4,6,8,12][t%6],count=u%Math.min(3,parts-1)+1,angle=360*count/parts,r=parts*(a%3+1),share=count/parts;
      if(arg==='identify')return textual(`哪個敘述符合扇形？`,'由兩條半徑和一段圓弧圍成',['任何三條直線圍成','只要有弧線就是扇形','由兩個不同圓心畫成'],[`先找到同一個圓心。`,`從圓心畫出兩條半徑。`,`兩條半徑加上它們之間的一段圓弧，就圍成扇形。`],{kind:'circle',values:[r,angle]});
      if(arg==='fraction')return rationalTask(`扇形的圓心角 ${angle} 度，是全圓的幾分之幾？`,count,parts,[`完整一圓的圓心角是三百六十度。`,`${angle} ÷ 360 = ${fraction(count,parts)}。`,`所以占全圓的 ${fraction(count,parts)}。`],{kind:'circle',values:[r,angle]});
      if(arg==='angle')return numeric(`把圓平均分成 ${parts} 份，取 ${count} 份，圓心角幾度？`,angle,[`完整一圈三百六十度。`,`一份是 360 ÷ ${parts} = ${360/parts} 度。`,`取 ${count} 份，是 ${angle} 度。`],{kind:'circle',values:[r,angle]},'度',15);
      const arc=6.28*r*share,result=arg==='area'?3.14*r*r*share:arg==='perimeter'?arc+2*r:arc;
      return numeric(`半徑 ${r} 公分、圓心角 ${angle} 度的扇形，${arg==='area'?'面積':arg==='perimeter'?'周長':'弧長'}是多少？圓周率用 3.14。`,result,[`先求占全圓的比例：${angle}/360 = ${fraction(count,parts)}。`,arg==='area'?`全圓面積 ${r} × ${r} × 3.14，再乘這個比例。`:`全圓周長 ${2*r} × 3.14，再乘這個比例得到弧長。`,arg==='perimeter'?`扇形周長還要加兩條半徑：${fmt(arc)} + ${2*r} = ${fmt(result)}。`:`答案是 ${fmt(result)}。`],{kind:'circle',values:[r,angle]},arg==='area'?'平方公分':'公分',.1);
    }
    case 'volume': {
      const w=a%5+2,h=b%5+2,depth=c%5+2;
      if(arg==='displace') {const before=100+a*20,after=before+b*10;return numeric(`量杯原有 ${before} 毫升水，物體完全浸入後升到 ${after} 毫升，物體體積是多少立方公分？`,b*10,[`物體必須完全浸入，水沒有溢出。`,`排開的水量 = 放入後水量 − 原水量。`,`${after} − ${before} = ${b*10} 毫升，也就是 ${b*10} 立方公分。`],{kind:'capacity',values:[before,after],labels:['放入前','放入後']},'立方公分',10);}
      if(arg==='composite')return numeric(`兩個不重疊的長方體，體積分別是 ${w*h*depth} 和 ${w*h} 立方公分。合起來多少？`,w*h*(depth+1),[`把複合形體分成不重疊的兩部分。`,`第一部分 ${w*h*depth}，第二部分 ${w*h}。`,`相加是 ${w*h*(depth+1)} 立方公分。`],{kind:'solid',values:[w,h,depth+1]},'立方公分');
      if(arg==='prism') {const base=(a+1)*10,height=b+2;return numeric(`角柱底面積 ${base} 平方公分、高 ${height} 公分，體積多少？`,base*height,[`每一層的底面積都相同。`,`體積 = 底面積 × 高。`,`${base} × ${height} = ${base*height} 立方公分。`],{kind:'prism',values:[t%4+3,base,height]},'立方公分');}
      if(arg==='cylinder') {const r=a%5+2,height=b+2;return numeric(`圓柱半徑 ${r} 公分、高 ${height} 公分，體積多少？圓周率用 3.14。`,3.14*r*r*height,[`先算圓形底面積：${r} × ${r} × 3.14。`,`圓柱體積 = 底面積 × 高。`,`答案是 ${fmt(3.14*r*r*height)} 立方公分。`],{kind:'cylinder',values:[r,height]},'立方公分',3.14);}
      return numeric(`${arg==='inside'?'盒子內部':'長方體'}長 ${w}、寬 ${h}、高 ${depth} 公分，${arg==='inside'?'容積':'體積'}多少？`,w*h*depth,[`一層排 ${w} × ${h} = ${w*h} 個一立方公分的小正方體。`,`共有 ${depth} 層。`,`${w} × ${h} × ${depth} = ${w*h*depth} 立方公分。`],{kind:'solid',values:[w,h,depth]},'立方公分');
    }
    case 'surface': {
      const w=a%5+2,h=b%5+2,depth=c%5+2;
      if(arg==='cylinder'&&t%2===1){const k=a%3+1,base=6*k*k,perimeter=12*k,height=b+2,total=2*base+perimeter*height;return numeric(`三角柱的底面積 ${base} 平方公分、底面周長 ${perimeter} 公分、高 ${height} 公分，表面積多少？`,total,[`上下底面積合計 ${base} × 2 = ${base*2}。`,`各側面展開合成長方形：底面周長乘柱高，${perimeter} × ${height} = ${perimeter*height}。`,`表面積 = 兩底加側面，共 ${total} 平方公分。`],{kind:'prism',values:[3,base,height]},'平方公分');}
      if(arg==='cylinder') {const r=a%5+2,height=b+2,total=2*3.14*r*r+6.28*r*height;return numeric(`有上下底的圓柱，半徑 ${r}、高 ${height} 公分，表面積多少？圓周率用 3.14。`,total,[`上下兩個圓面積：2 × ${r} × ${r} × 3.14。`,`側面展開成長方形：圓周長 × 高 = ${fmt(6.28*r)} × ${height}。`,`相加是 ${fmt(total)} 平方公分。`],{kind:'cylinder',values:[r,height]},'平方公分',3.14);}
      if(arg==='joined')return numeric(`兩個邊長 ${w} 公分的正方體，完整貼合一個面，合起來的表面積多少？`,10*w*w,[`原來兩個正方體共有十二個面。`,`黏住的兩個面藏在裡面，不算外表。`,`剩十個面：10 × ${w} × ${w} = ${10*w*w}。`],{kind:'solid',values:[2*w,w,w]},'平方公分',w*w);
      return numeric(`長方體長 ${w}、寬 ${h}、高 ${depth} 公分，表面積多少？`,2*(w*h+w*depth+h*depth),[`前後、左右、上下各有一組相同的面。`,`三種面積是 ${w*h}、${w*depth}、${h*depth}。`,`2 × (${w*h} + ${w*depth} + ${h*depth}) = ${2*(w*h+w*depth+h*depth)}。`],{kind:'solid',values:[w,h,depth]},'平方公分');
    }
    case 'symmetry': {
      const x=a%4+1,y=b%7+1;
      if(arg==='axes') {const square=t%2===0;return numeric(`${square?'正方形':'長方形（長寬不同）'}有幾條對稱軸？`,square?4:2,[`沿對稱軸對摺，兩邊要完全重合。`,square?'水平、垂直和兩條對角線都能重合。':'水平和垂直中線可以；對角線不能讓長寬不同的長方形重合。',`共有 ${square?4:2} 條對稱軸。`],{kind:'area',values:[a,square?a:a+2]},'條');}
      return numeric(`對稱軸在第 5 條直線，點在橫向第 ${x} 格、縱向第 ${y} 格。對稱點的橫向位置是第幾格？`,10-x,[`對稱點和原點在對稱軸兩邊。`,`兩點到對稱軸的距離相同，都是 ${5-x} 格。`,`5 + ${5-x} = ${10-x}，縱向位置仍是 ${y}。`],{kind:'symmetry',values:[x,y,5]},'格');
    }
    case 'numberline': {
      const fractional=arg==='fraction',den=b%5+2,n=fractional?a%den+1:a+b,start=fractional?0:a,gap=fractional?1/den:1;
      if(fractional)return rationalTask(`零到一分成 ${den} 等份，標記在第 ${n} 格，表示多少？`,n,den,[`先看零和一之間被分成幾份。`,`每格是 1/${den}，從零向右走 ${n} 格。`,`位置是 ${fraction(n,den)}。`],{kind:'numberline',values:[0,1,n/den,den]});
      return numeric(`數線從 ${start} 開始，每格加 ${gap}，向右 ${b} 格是幾？`,n,[`先找起點 ${start}。`,`每格一，向右 ${b} 格就是加 ${b}。`,`${start} + ${b} = ${n}。`],{kind:'numberline',values:[start,start+b+2,n,b+2]});
    }
    case 'scale': {
      const factor=t%4+2,length=a+2;
      if(arg==='map') {const scale=[100,1000,10000][t%3];return numeric(`比例尺 1 : ${scale}，圖上長 ${length} 公分，實際長多少公分？`,scale*length,[`比例尺一比 ${scale}，代表圖上一公分對應實際 ${scale} 公分。`,`圖上有 ${length} 公分。`,`${length} × ${scale} = ${length*scale} 公分。`],{kind:'scale',values:[length,scale]},'公分',scale);}
      const shrink=u%2===0,original=shrink?length*factor:length,result=shrink?length:length*factor;
      return numeric(`原圖一邊長 ${original} 公分，${shrink?`縮小成 ${factor} 分之一`:`按 ${factor} 倍放大`}，對應邊要畫幾公分？`,result,[shrink?'縮小圖的每條對應邊都除以相同的數。':'放大圖的每條對應邊都乘相同倍數。',`角度與形狀不變。`,`${original} ${shrink?'÷':'×'} ${factor} = ${result} 公分。`],{kind:'scale',values:[original,factor]},'公分');
    }
  }
}
