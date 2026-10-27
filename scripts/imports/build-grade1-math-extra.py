"""Visually reviewed Hanlin-classified first-grade exam adaptations, no OCR-derived keys."""
import json,hashlib
from pathlib import Path
rows=[]
def add(s,loc,page,prompt,options,answer,explanation,visual=None):
 options=[str(o) for o in options];answer=str(answer);assert options.count(answer)==1
 key=json.dumps([prompt,visual],ensure_ascii=False)
 if any(q['_key']==key for q in rows):return
 k=len(rows)%len(options);options=options[k:]+options[:k]
 q=dict(id='m1hx-'+hashlib.sha256(f'{s}:{loc}'.encode()).hexdigest()[:16],sourceId=f'g1hx{s}',page=page,locator=loc,kind='原卷條件重述／選擇題改編',prompt=prompt,options=options,answer=options.index(answer),hint='先看清楚題目的數量和方向，再慢慢數。',explanation=explanation,_key=key)
 if visual is not None:q['visual']=visual
 rows.append(q)
def num(s,l,p,prompt,n,e,visual=None):
 opts=[n,max(0,n-1),n+1]
 if len(set(opts))<3:opts=[0,1,2]
 add(s,l,p,prompt,opts,n,e,visual)
def total(s,l,p,a,b):num(s,l,p,f'{a} 和 {b} 合起來是多少？',a+b,f'{a} ＋ {b} ＝ {a+b}。')
def split(s,l,p,n,a):num(s,l,p,f'{n} 可以分成 {a} 和多少？',n-a,f'{a} ＋ {n-a} ＝ {n}。')
def missing(s,l,p,total_,part):num(s,l,p,f'{part} 和多少合起來是 {total_}？',total_-part,f'{part} ＋ {total_-part} ＝ {total_}。')
def count(s,l,p,kind,symbol,n):num(s,l,p,f'數一數，有幾{kind}？',n,(f'從一開始逐一數，共有 {n}。' if n else '沒有魚，所以是 0 條。'),' '.join([symbol]*n) if n else '（空的）')
def enough(s,l,p,item,n,people):add(s,l,p,f'有 {n} {item}，要分給 {people} 個小朋友，每人拿 1 個，夠不夠？',['夠','不夠'],'夠' if n>=people else '不夠',f'每人拿 1 個，需要 {people} 個；有 {n} 個，所以'+('夠。' if n>=people else '不夠。'))
# 1 和順114
for l,a in [('二1',3),('二2',2),('二3',5),('二4',4)]:missing(1,l,1,6,a)
for l,p,n,e in [('四1','按照 1 到 10 的順序，8 的前一個數是多少？',7,'7 的下一個數是 8。'),('四2','按照 1 到 10 的順序，9 的後一個數是多少？',10,'9 再多 1 是 10。'),('四3','按照數數的順序，4 和 6 中間的數是多少？',5,'順序是 4、5、6。'),('四4','按照數數的順序，1 和 3 中間的數是多少？',2,'順序是 1、2、3。')]:num(1,l,1,p,n,e)
for l,a,b,others in [('九1',6,4,['2 和 7','2 和 6']),('九2',5,5,['8 和 3','3 和 5']),('九3',3,7,['3 和 5','4 和 7']),('九4',9,1,['2 和 7','9 和 2'])]:add(1,l,1,'哪兩個數合起來是 10？',[f'{a} 和 {b}',*others],f'{a} 和 {b}',f'{a} ＋ {b} ＝ 10。')
num(1,'十',1,'有 8 顆蘋果，分成 3 顆和另一堆。另一堆有幾顆？',5,'3 ＋ 5 ＝ 8。')
seq='從左到右依序是：飛機、公車、噴射機、旅行車、卡車、貨車、水上飛機、熱氣球、汽車、摩托車。'
num(1,'十一1',2,seq+'貨車從左邊數排第幾個？',6,'由左邊逐一數，貨車是第 6 個。')
num(1,'十一2',2,seq+'熱氣球從右邊數排第幾個？',3,'從右邊數：摩托車、汽車、熱氣球，所以是第 3 個。')
for l,n,a in [('十三1',4,1),('十三3',10,2),('十三4',7,1)]:split(1,l,2,n,a)
total(1,'十三2',2,6,3);enough(1,'十六',2,'顆氣球',5,6)
# 2 明義113
for l,a,b in [('三1',7,3),('三3',2,4)]:total(2,l,2,a,b)
for l,n,a in [('三2',7,3),('三4',10,5)]:split(2,l,2,n,a)
for i,a in enumerate([1,3,4,0,5,2],1):missing(2,f'六{i}',2,10,a)
seq='櫃子從上到下依序放著：機器人、積木、玩偶、球、汽車。'
num(2,'五1',2,seq+'汽車從下往上數在第幾格？',1,'汽車在最下面，從下往上數是第 1 格。')
add(2,'五2',2,seq+'從上往下數，第 4 格是什麼？',['球','玩偶','積木'],'球','從上往下數：機器人、積木、玩偶、球。')
add(2,'五3',2,seq+'球在第 2 格，是從哪個方向數？',['從上往下','從下往上'],'從下往上','從下往上數，汽車第 1 格，球第 2 格。')
for l,left,answer in [('八1',3,'7 元的筆'),('八2',5,'5 元的餅乾'),('八3',2,'8 元的飲料')]:add(2,l,2,f'原本有 10 元，買一樣東西後剩 {left} 元，買的是哪一樣？',['8 元的飲料','7 元的筆','5 元的餅乾'],answer,f'10 減掉 {left} 是 {10-left}，所以花了 {10-left} 元。')
# 3 和順113
num(3,'一7-1',1,'7 個蛋糕分成 3 個和另一堆，另一堆有幾個？',4,'3 ＋ 4 ＝ 7。')
num(3,'一7-2',1,'9 顆蘋果分成 3 顆和另一堆，另一堆有幾顆？',6,'3 ＋ 6 ＝ 9。')
num(3,'二1',1,'書按照 1 到 10 號排好，7 號和 9 號中間少了一本書，少的是幾號？',8,'7、8、9 依序排列，中間是 8。')
split(3,'二2-1',1,8,3);split(3,'二2-2',1,7,7);total(3,'二2-3',1,5,4);total(3,'二2-4',1,2,6)
add(3,'三2-3',2,'有 6 隻青蛙和 7 個樂器，每隻青蛙拿 1 個樂器，夠不夠？',['夠','不夠'],'夠','6 隻青蛙需要 6 個樂器，7 個夠分。')
seq='櫃子由上到下依序是：書本、空格、法國號、笛子、其他樂器、鼓。'
num(3,'七1',2,seq+'一共有幾層？',6,'把空格也算一層，一共有 6 層。')
num(3,'七2',2,seq+'從上往下數，第幾層是空的？',2,'書本下面一層是空格，所以是第 2 層。')
num(3,'七3-笛',2,seq+'從下往上數，笛子在第幾層？',3,'從下往上數：鼓、其他樂器、笛子。')
num(3,'七3-書',2,seq+'從下往上數，書本在第幾層？',6,'書本在最上層，從下往上數是第 6 層。')
# 4 永安113
for i,a in enumerate([5,3,1,7],1):missing(4,f'三1-{i}',1,9,a)
seq='動物從左到右依序是：松鼠、猴子、狗、大象、豬、雞、兔子、山羊、老虎、烏龜。'
for l,p,n,e in [('五1左1','猴子從左邊數排第幾位？',2,'左邊第 1 位松鼠，第 2 位猴子。'),('五1左2','老虎從左邊數排第幾位？',9,'老虎是左邊第 9 位。'),('五1右1','雞從右邊數排第幾位？',5,'從右數：烏龜、老虎、山羊、兔子、雞。'),('五1右2','大象從右邊數排第幾位？',7,'大象在左邊第 4 位，共 10 位；從右邊數是第 7 位。')]:num(4,l,2,seq+p,n,e)
add(4,'五1左3',2,seq+'從左邊數，第 5 位是誰？',['豬','大象','猴子'],'豬','從左邊逐一數，第 5 位是豬。')
add(4,'五1右3',2,seq+'從右邊數，第 10 位是誰？',['松鼠','山羊','狗'],'松鼠','總共有 10 位，右邊第 10 位就是最左邊的松鼠。')
for i,a in enumerate([1,4,6],1):num(4,f'六{i}',2,f'媽媽買了 8 瓶牛奶，小小拿 {a} 瓶，剩下都給大大。大大拿幾瓶？',8-a,f'{a} ＋ {8-a} ＝ 8。')
# 5 忠孝113
count(5,'一1',1,'條魚','🐟',3);count(5,'一2',1,'條魚','🐟',0);count(5,'一3',1,'條魚','🐟',6)
for i,(w,n) in enumerate([('一',1),('三',3),('五',5),('六',6),('九',9)],1):add(5,f'四1-{i}',1,f'「{w}」是下列哪個數字？',[n,n+1,max(0,n-1)],n,f'「{w}」寫成數字是 {n}。')
seq='從左到右依序是：兔子、貓、老鼠、狗、馬、老虎、河馬。'
num(5,'四2右馬',1,seq+'馬從右邊數排第幾個？',3,'從右邊數：河馬、老虎、馬。');num(5,'四2右貓',1,seq+'貓從右邊數排第幾個？',6,'從右邊數，貓是第 6 個。');num(5,'四2左馬',1,seq+'馬從左邊數排第幾個？',5,'馬在狗後面，是左邊第 5 個。')
add(5,'四2左4',1,seq+'從左邊數第 4 個是誰？',['貓','狗','老鼠'],'狗','從左邊數：兔子、貓、老鼠、狗。')
for i,visible in enumerate([4,2,9,3],1):num(5,f'八{i}',1,f'一共有 10 個圓，露出 {visible} 個，遮住了幾個？',10-visible,f'{visible} ＋ {10-visible} ＝ 10。')
total(5,'九1',2,4,3);split(5,'九2',2,10,1);split(5,'九4',2,8,5)
for i,a in enumerate([3,8],1):num(5,f'十三{i}',2,f'共有 10 個人，帳篷裡有 {a} 人，其餘在外面。帳篷外有幾人？',10-a,f'{a} ＋ {10-a} ＝ 10。')
for i,hit in enumerate([5,4],1):num(5,f'十四{i}',2,f'投了 8 顆球，投進 {hit} 顆，沒投進幾顆？',8-hit,f'{hit} ＋ {8-hit} ＝ 8。')
num(5,'十四3',2,'投了 8 顆球，只有 1 顆沒投進，投進幾顆？',7,'7 ＋ 1 ＝ 8。')
# 6 和順112
count(6,'一3',1,'條魚','🐟',8);count(6,'一4',1,'條魚','🐟',5)
missing(6,'二3合',1,7,4);split(6,'二3分',1,7,4);split(6,'二6',1,8,2);total(6,'二7',1,3,6)
add(6,'二5黑',1,'從左邊開始數，黑色正方形在第幾個？',[3,4,5],4,'從左邊逐一數，黑色正方形是第 4 個。','□ □ □ ■ □ △ □ □')
add(6,'二5異',1,'從右邊開始數，三角形在第幾個？',[2,3,6],3,'從右邊數：正方形、正方形、三角形。','□ □ □ ■ □ △ □ □')
# 7 忠孝111
split(7,'二7',1,9,6)
add(7,'三2餅乾',1,'9 塊餅乾和 9 個圓，一樣多嗎？',['一樣多','不一樣多'],'一樣多','兩邊都是 9，所以一樣多。')
add(7,'三2方餅',1,'3 塊餅乾和 2 個圓，一樣多嗎？',['一樣多','不一樣多'],'不一樣多','3 比 2 多，所以不一樣多。')
enough(7,'四3球',2,'顆球',3,4)
for i,a in enumerate([4,8,3,2],1):missing(7,f'五1-{i}',2,8,a)
num(7,'七2爸',2,'爸爸丟了 7 個圈圈，套中 4 個，沒套中幾個？',3,'4 ＋ 3 ＝ 7。')
num(7,'七2媽',2,'媽媽丟了 7 個圈圈，全部套中，沒套中幾個？',0,'全部套中，所以沒套中的有 0 個。')
num(7,'七2新',2,'小新丟了 7 個圈圈，沒套中 5 個，套中幾個？',2,'2 ＋ 5 ＝ 7。')
add(7,'七2獎',2,'套中 5 個以上得汽車，套中 3～4 個得小熊，套中 2 個得氣球。小新套中 2 個，得到什麼？',['小熊','汽車','氣球'],'氣球','規則說套中 2 個可以得到氣球。')
# 8 美和110（卷首印翰林第1冊；9為完全重複）
# 一1 requires original visual choices; excluded rather than giving shape names away.
count(8,'四1狗',2,'隻小狗','🐶',5);count(8,'四1熊',2,'隻無尾熊','🐨',7)
add(8,'四1比',2,'有 5 隻小狗、7 隻無尾熊，哪一種比較多？',['小狗','無尾熊'],'無尾熊','7 比 5 多，所以無尾熊比較多。')
for l,p,n,e in [('四3前','按照數數的順序，4 的前一個數是多少？',3,'3 的下一個數是 4。'),('四3後','按照數數的順序，2 的後一個數是多少？',3,'2 再多 1 是 3。'),('四3中','按照數數的順序，6 和 8 中間的數是多少？',7,'順序是 6、7、8。')]:num(8,l,3,p,n,e)
# Identical wording is counted once across these supplied papers; source ledger records skipped duplicate file 9/10.
for q in rows:q.pop('_key')
# Keep the original question and mastery identity when prompt and visual are identical.
old=json.loads(Path('src/grade1-math-exams.ts').read_text().split('const rows = ',1)[1].split('];',1)[0]+']')
old_keys={(q['prompt'],q.get('visual')) for q in old}
rows=[q for q in rows if (q['prompt'],q.get('visual')) not in old_keys]
Path('src/data/grade1-math-extra-20261026.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print('new candidates',len(rows))
