import json
from pathlib import Path
r=[]
def add(s,l,p,o,a,e,page=2,passage=None):
 d=dict(id=f'ex2-{s}-{l}',sourceId=s,locator=l,page=page,kind='筆試題整理／轉選擇（歧義選項與線索修訂）',prompt=p,options=o,answer=a,hint='Read the question and all the clues.',explanation=e)
 if passage:d['passage']=passage
 r.append(d)
s='he-cd114'
for l,p,o,a,e in [
('A1','A: ___ B: No, I’m not good.',['Can you read?','Are you Teddy?','Are you OK?'],2,'Are you OK? asks how someone is feeling.'),
('A2','Are you full?',['Yes, I am.','Yes, I do.','Yes, I can.'],0,'Answer Are you…? with Yes, I am.'),
('A3','Are you a teacher?',['You are my teacher.','Yes, I am full.','No, I am a student.'],2,'A student answers no to being a teacher.'),
('A4','___ the weather at Taipei 101? It’s sunny and hot.',["How’s","Where’s","What’s"],0,'How’s the weather? asks about weather.')]:add(s,l,p,o,a,e,1)
for l,p,o in [('D1','he / happy / ? / Is',['Is he happy?','He happy is?','Is happy he?']),('D2','sunny / . / in / It’s / Taiwan',["It’s sunny in Taiwan.","Sunny Taiwan in it’s.","It’s Taiwan sunny in."])]:add(s,l,'Choose the correct sentence: '+p,o,0,'Use the standard English word order.')
t='Day 1: sunny and hot — go to the beach and swim.\nDay 2: windy and warm — fly a kite in the park.\nDay 3: rainy and cool — stay home and read a book.'
for l,p,o,a in [('F1','How is the weather on Day 3?',['Sunny and hot.','Rainy and cool.','Windy and warm.'],1),('F2','Which day is best for flying a kite according to the table?',['Day 1.','Day 2.','Day 3.'],1),('F3','What does the table suggest on a sunny and hot day?',['Stay home and read.','Fly a kite.','Go to the beach and swim.'],2)]:add(s,l,p,o,a,'Match the activity and weather in the table.',passage=t)
s='he-tz114'
for l,p,o,a,e in [
('5-1','How’s the weather in Shulin? It’s ___.',['white','tall','warm'],2,'Warm describes weather.'),
('5-2','Who’s she? She’s my ___.',['grandpa','brother','sister'],2,'She refers to the sister.'),
('5-3','Is he a doctor? No, he’s ___. He’s a nurse.',['a doctor','can','not'],2,'No, he’s not. He’s a nurse.'),
('5-4','Let’s ___! One, two, three.',['count','no','fun'],0,'One, two, three are used when counting.'),
('5-6','Mom, I’m ___. I want to eat. Lunch is ready.',['hungry','nice','small'],0,'Hungry means wanting food.'),
('5-8','I have ___ idea.',['a','an','not'],1,'Use an before the vowel sound in idea.')]:add(s,l,p,o,a,e)
for l,words,o in [('7-1','Are / thirsty / you / ?',['Are you thirsty?','You thirsty are?','Thirsty are you.']),('7-2','How’s / weather / the / ?',["How’s the weather?","The weather how’s.","How’s weather the?"]),('7-3','No / she / isn’t / .',["No, she isn’t.","No, isn’t she.","She no isn’t."]),('7-4','Let’s / fun / have / !',["Let’s have fun!","Have let’s fun!","Let’s fun have!"]),('7-5','Watch / out / !',['Watch out!','Out watch!','Watch is out!'])]:add(s,l,'Choose the correct sentence: '+words,o,0,'Use the standard English word order.')
t="I’m Amy. It’s sunny and warm today. I play with Ella and Ryan. Later, it’s hot and I’m thirsty. Then, it’s rainy, and we go home. I’m tired but happy. My brother, Leo, is sad. He can’t play outside."
for l,p,a,e in [('8-1','It is sunny and warm at first.',0,'The first sentence about weather says sunny and warm.'),('8-2','Amy plays with Ella and Ryan.',0,'Amy names Ella and Ryan.'),('8-3','Later, it gets cold and Amy is thirsty.',1,'Amy says it gets hot and she is thirsty, not cold.'),('8-4','Amy is not tired.',1,'Amy says she is tired but happy.'),('8-5','Leo can play outside.',1,'Leo cannot play outside.')]:add(s,l,'True or False: '+p,['True','False'],a,e,passage=t)
s='he-my113'
for i,(w,n) in enumerate([('ten',10),('fifteen',15),('seventeen',17),('nineteen',19),('twenty',20),('eighteen',18)],1):add(s,f'E-{i}',f'Choose the number: {w}.',[str(n),str(n+1),str(n-1)],0,f'{w.capitalize()} means {n}.')
for l,p,o,e in [('G1','It’s ___.（溫暖）',['warm','cold','rainy'],'Warm means 溫暖.'),('G2','It’s ___.（寒冷）',['cold','hot','sunny'],'Cold means 寒冷.'),('G3','Are you ___?（口渴）Yes, I am.',['thirsty','hungry','full'],'Thirsty means 口渴.'),('G4a','Is she ___?（生氣）No, she’s not.',['angry','happy','full'],'Angry means 生氣.'),('G4b','She’s ___.（累）',['tired','hungry','happy'],'Tired means 累.')]:add(s,l,p,o,0,e)
for i,(p,o) in enumerate([('How is',["How’s","Who’s","What’s"]),('Who is',["Who’s","How’s","What’s"]),('she is',["she’s","he’s","it’s"]),('is not',["isn’t","aren’t","wasn’t"]),('What is',["What’s","Who’s","How’s"])],1):add(s,f'H-{i}',f'Choose the contraction of “{p}”.',o,0,f'{o[0]} is the contraction of {p}.')
# Deterministic rotation prevents correct answers always occupying the first slot.
for i,d in enumerate(r):
 k=i%len(d['options']);d['options']=d['options'][k:]+d['options'][:k];d['answer']=(d['answer']-k)%len(d['options'])
Path('src/data/english-extra-20261026.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(r))
