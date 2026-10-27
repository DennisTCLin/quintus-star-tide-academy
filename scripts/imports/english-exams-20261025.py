"""Reviewed first-semester grade-four written exercises. No inferred listening answers.
Picture-based items explicitly transcribed into text clues; no claim of original audio.
"""
import json
from pathlib import Path
rows=[]
def add(src,loc,prompt,options,answer,explanation,passage=None,kind='選擇題整理',page=2):
 offset=len(rows)%len(options); options=options[offset:]+options[:offset]
 row=dict(id=f'ex1-{src}-{loc}',sourceId=src,locator=loc,page=page,kind=kind,prompt=prompt,options=options,answer=(answer-offset)%len(options),hint='Read the whole sentence and check the clues.',explanation=explanation)
 row.update({'ex1-ke-dd112-E-5': {'prompt': '情境：天空正在飄雪。Is it sunny? No, it’s ___.'}, 'ex1-he-dd114-J-1': {'prompt': '情境：Ken 說自己不開心，而且很疲倦。Is Ken happy?'}, 'ex1-he-dd114-J-3': {'prompt': '情境：女孩說自己不難過，而是很生氣。Is she sad?'}, 'ex1-he-wx111-E-3': {'prompt': '情境：人物難過地掉眼淚。Does “happy” match?'}, 'ex1-he-dd114-K-b-2-3': {'prompt': 'True or False: The passage explicitly says that Grandma is thirsty at the end.', 'explanation': 'False: the passage predicts thirst if they go to Tainan, but does not state that Grandma is thirsty at the end.'}}.get(row["id"], {}))
 if passage:row['passage']=passage
 rows.append(row)
def tf(src,loc,statement,truth,passage,explanation):add(src,loc,'Is this statement true? '+statement,['True','False'],0 if truth else 1,explanation,passage,'是非題轉選擇')
def picture(src,loc,clue,options,answer,explanation,page=2):add(src,loc,clue,options,answer,explanation,kind='原圖文字化改編',page=page)
# Kang Hsuan: Dadun 112. F1 is a worked example, not an exam item.
for loc,prompt,opts,ans,ex in [
 ('F-2','It ___ sunny.',['is','am','can'],0,'It takes is: It is sunny.'),
 ('F-3',"It is 5:50. Choose the correctly written time.\nWhat time is it? It’s ___.",['five fifty','five fivety','five-fifty'],0,'5:50 is five fifty. Fifty is spelled f-i-f-t-y; do not put a hyphen between the hour and minutes.'),
 ('F-4',"It is 10:35. Choose the correctly written time.\nWhat time is it? It’s ten ___.",['thirty five','threety five','thirty-five'],2,'Write the compound number thirty-five with a hyphen.'),
 ('F-5',"How’s the weather?",["It’s the wind.","I’m the Winner.","It’s windy."],2,'Windy describes the weather.'),
 ('F-6','Hurry up! Time for school.',["Let’s go.",'Line up, please.','Good to meet you.'],0,'Let’s go is an appropriate response when it is time to leave.'),
 ('F-7',"What’s that?",["It’s twelve o’clock.","It’s a frog.","How’s the weather?"],1,'What’s that asks what something is.'),
 ('F-8',"A: ___ It’s the school bell. B: It’s four o’clock. Time to go home.",["Sorry, I’m late.",'Listen!','Line up, please.'],1,'Listen directs attention to the bell.'),
 ('F-9',"A: Hurry up! ___ B: Time to go to school.",["How’s the weather?","It’s sunny.","It’s seven thirty."],2,'Seven thirty gives the time.')]:add('ke-dd112',loc,prompt,opts,ans,ex,kind='時間線索補充改編' if loc in {'F-3','F-4'} else '選擇題整理')
for loc,clue,opts,ans,ex in [
 ('E-2','原圖時鐘是 9:40。It’s nine ___.',['forty','fourteen','four'],0,'9:40 is nine forty.'),
 ('E-3','原圖有人在太陽下流汗，溫度很高。It’s so ___.',['hot','cold','rainy'],0,'Hot means 熱.'),
 ('E-4','原圖電子鐘顯示 11:20。It’s eleven ___.',['twelve','twenty','thirty'],1,'11:20 is eleven twenty.'),
 ('E-5','情境：天空正在飄雪。Is it sunny? No, it’s ___.',['snowy','sunny','hot'],0,'Snowy describes snowy weather.')]:picture('ke-dd112',loc,clue,opts,ans,ex,1)
for loc,clue,opts,ans in [('G-1',"It’s cloudy. 哪種天氣符合句意？",['多雲','晴天','強風'],0),('G-2',"It’s sunny. 哪種天氣符合句意？",['晴天','下雨','寒冷'],0),('G-3',"It’s two fifteen. 選出相符的電子鐘。",['02:50','02:15','02:55'],1),('G-4',"It’s cold. 哪種情境符合句意？",['天氣寒冷，穿厚衣服','下雨，撐雨傘','多雲'],0)]:picture('ke-dd112',loc,clue,opts,ans,'Match the English description to the stated picture clue.')
p="Mom: Wake up, Lily! Come here. Dad’s calling.\nLily: OK!\nLily: Hi, Dad. I miss you.\nDad: Hi, Lily. I miss you, too.\nLily: What time is it in Tokyo?\nDad: It’s nine o’clock now. I’m going to work.\nLily: Cool! Oh, it’s eight o’clock in Taipei now. I’m going to the park with my friends! Bye!\nDad: Bye!"
add('ke-dd112','H-1-1','What time is it in Taipei now?',['08:00','08:20','09:00'],0,'Lily says it is eight o’clock in Taipei.',p,'閱讀選擇題整理')
add('ke-dd112','H-1-2','What time is it in Tokyo now?',["It’s nine o’clock.","It’s eight o’clock.","It’s seven o’clock."],0,'Dad says it is nine o’clock in Tokyo.',p,'閱讀問答轉選擇')
p="Fall is coming. The weather is cloudy in Taipei. It’s sunny in Taichung, but windy in Kaohsiung and Chiayi. What’s your favorite kind of weather?"
for i,(city,weather) in enumerate([('Taipei','cloudy'),('Taichung','sunny'),('Kaohsiung','windy'),('Chiayi','windy')],1):add('ke-dd112',f'H-2-{i}',f'How is the weather in {city}?',['cloudy','sunny','windy','rainy'],['cloudy','sunny','windy','rainy'].index(weather),f'The passage says {city} is {weather}.',p,'閱讀繪圖轉選擇')
# Kang Hsuan Wenxin 112
for i,(clue,word) in enumerate([('多雲','cloudy'),('下雨','rainy'),('人在烈日下流汗','hot'),('30','thirty'),('15','fifteen'),('50','fifty')],1):
 opts=['cloudy','rainy','hot'] if i<4 else ['thirty','fifteen','fifty','forty']
 picture('ke-wx112',f'E-{i}',f'原圖顯示「{clue}」。Choose the English word.',opts,opts.index(word),f'The matching word is {word}.')
p="Roy: Let’s go to the theme park.\nLily: How’s the weather?\nRoy: Yeah! It is sunny.\nLily: Great, we can have fun.\nRoy: What time is it now?\nLily: It’s seven in the morning.\nRoy: I can’t wait!\nLily: Me, too."
for i,(st,t) in enumerate([( "It’s eleven o’clock.",False),("It’s sunny.",True),('Roy and Lily want to go to school.',False),("It’s rainy. Roy and Lily can’t go to the theme park.",False)],1):tf('ke-wx112',f'F-{i}',st,t,p,'They plan to visit the theme park. It is sunny and seven in the morning.')
for i,(prompt,opts,ans) in enumerate([
 ("How’s the weather?",["We’re back.","It’s eight o’clock.","It’s sunny."],2),
 ("What’s that?",["It’s a dog.",'It are a bird.',"That’s ants."],0),
 ('What time is it?',['Listen!',"It’s ten forty.","That’s a bird."],1),
 ('What time is it in London?',["It’s foggy.","It’s five o’clock.","It’s the school bell."],1),
 ("Here’s your menu.",['Thank you.','Hurry up.','Sorry.'],0),
 # Original G6 depends on a school schedule; make the context explicit.
 ('School finishes at four. It’s four o’clock. What is it time to do?',['Time to have lunch.','Time to go to school.','Time to go home.'],2),
 ("It’s 3:20. Choose the matching time.",["It’s seven eleven.","It’s six thirty.","It’s three twenty."],2)],1):add('ke-wx112',f'G-{i}',prompt,opts,ans,'The correct response matches the question and the stated situation.',kind='選擇題改編' if i==6 else '選擇題整理')
for i,(clue,ans) in enumerate([('原圖是臺南的天氣預報，有太陽。',2),('原圖人物在寒風中發抖。',0)],1):picture('ke-wx112',f'H-{i}',clue+' Choose the matching sentence.',["It’s windy and cold.",'Line up, please.',"It’s sunny in Tainan.","Let’s go."],ans,'Match the weather and location in the clue.')
p="It’s sunny in London. It is four PM. Cathy is making a call to her sister, Ting. Ting is in Taiwan. It’s windy. She’s sleeping. It’s twelve o’clock in Taiwan at night. Will Ting answer the phone?"
tf('ke-wx112','I-1','It is windy in Taiwan.',True,p,'The passage says it is windy in Taiwan.')
tf('ke-wx112','I-2',"It’s twelve o’clock in London.",False,p,'It is four PM in London; midnight refers to Taiwan.')
# Kang Hsuan Dali111; source 4 is byte-identical and shares all mastery IDs.
for loc,expr,ans in [('A','35 - 10','twenty-five'),('B','23 + 27','fifty'),('C','19 - 4','fifteen'),('D','50 - 20','thirty')]:
 opts=['fifty','fifteen','thirty','twenty-five'];add('ke-dl111',f'E-{loc}',f'{expr} = ___ (choose the English number)',opts,opts.index(ans),f'The answer is {ans}.',kind='填空轉選擇')
for i,(clock,ans) in enumerate([('1:13',3),('10:25',1),('5:50',0),('8:00',2)],1):picture('ke-dl111',f'F-{i}',f'原圖時鐘顯示 {clock}。Choose the matching time.',["It’s five fifty.","It’s ten twenty-five.","It’s eight o’clock.","It’s one thirteen."],ans,f'The clock reads {clock}.')
for i,(prompt,opts,ans,ex) in enumerate([
 ("It’s ___ o’clock.",['thirty','fifteen','twelve'],2,'Twelve is a valid hour on a twelve-hour clock.'),
 ("A: How’s the ___? B: It’s sunny.",['time','weather','clock'],1,'Sunny describes weather.'),
 ("A: ___ time is it? B: It’s nine fifty.",['Who','What','How'],1,'Ask What time is it?'),
 ("It’s 9°C in Keelung. It’s ___.",['cold','hot','fifty'],0,'9°C is cold.'),
 ("It’s 35°C in Taichung. It’s ___.",['cold','hot','forty'],1,'35°C is hot.')],1):add('ke-dl111',f'G-{i}',prompt,opts,ans,ex)
picture('ke-dl111','H-1',"It’s sunny and hot. 哪種原圖情境符合句意？",['人在烈日下流汗','人在寒風中發抖'],0,'Sunny and hot means 晴朗且炎熱.')
for i,(words,opts) in enumerate([('How’s / ? / weather / the',["How’s the weather?","The how’s weather?","Weather the how’s?"]),('it / ? / time / What / is',['What time is it?','What is time it?','Time what it is?'])],1):add('ke-dl111',f'I-{i}','Choose the correct sentence: '+words,opts,0,'Use the standard question word order.',kind='重組句子轉選擇')
# Hanlin Dadun114: omit ambiguous K-a3; don't infer listening.
for i,(prompt,opts,ans,ex) in enumerate([
 ('She ___ not angry.',["isn’t",'is','are','am'],1,'She is not angry. The printed not is already present.'),
 ('___ have some fun.',['Let',"Let’s",'How',"How’s"],1,'Let’s means let us.'),
 ('___ the weather there?',["What’s","Who’s","How’s",'How old'],2,'How’s the weather asks about weather.'),
 ('A: ___ B: Yes, I am.',['Am I pretty?','Is it hot?','Are you tired?','Is he a cook?'],2,'Are you tired? is answered Yes, I am.'),
 ('A: ___ B: Great! It’s not rainy there.',["Let’s have some fun in the rain.",'Look at the pretty teacher.',"I have an idea. Let’s go to Nara.","It’s rainy and cool in Nara."],2,'The reply accepts the suggestion to go to Nara.')],1):add('he-dd114',f'H-{i}',prompt,opts,ans,ex)
for i,(clue,opts,ans) in enumerate([('原圖是 5°C，有人穿厚衣服。',['cold','hot','warm'],0),('原圖是數字 16。',['sixteen','sixty','six'],0),('原圖女孩緊抱肚子，表示肚子餓。',['hungry','full','happy'],0),('原圖是太陽。',['rainy','sunny','cloudy'],1)],1):picture('he-dd114',f'I-{i}',clue+' Choose the matching word.',opts,ans,'Choose the word matching the picture description.')
for i,(clue,question,opts,ans) in enumerate([('情境：Ken 說自己不開心，而且很疲倦。','Is Ken happy?',["No, he isn’t. He’s tired.","Yes, he is.","No, she isn’t."],0),('原圖樹葉被風吹動。','How is the weather?',["It’s windy.","It’s rainy.","It’s sunny."],0),('情境：女孩說自己不難過，而是很生氣。','Is she sad?',["Yes, she is.","No, she isn’t. She’s angry.","Yes, he is."],1)],1):picture('he-dd114',f'J-{i}',clue+' '+question,opts,ans,'Answer according to the person and feeling or weather described.')
p="My name is Bella. My mother and father are doctors. It’s windy and rainy today, but they go to work. They can help people. They’re tired every day, but they’re happy. I’m a happy teacher. My students and I have fun every day. My students are naughty. Sometimes, I am angry. When I’m angry, I can listen to music."
add('he-dd114','K-a-1','How is the weather today?',["It’s windy and cool.","It’s windy and rainy.","It’s warm and rainy."],1,'The passage says windy and rainy.',p,'閱讀選擇題整理')
add('he-dd114','K-a-2','Is Bella’s father tired?',["No, he isn’t. He’s happy.","Yes, he is. He’s tired and sad.","Yes, he is. He’s tired but happy."],2,'Bella says her parents are tired but happy.',p,'閱讀選擇題整理')
p="Amy: Grandma, I’m free today!\nGrandma: Good! Let’s go out!\nAmy: How’s the weather in Alishan?\nGrandma: It’s rainy, and it’s 5°C. Let’s not go!\nAmy: Then, let’s go to Tainan!\nGrandma: No. It’s cloudy but hot. I will be thirsty.\nAmy: We can stay in Taichung.\nGrandma: Good idea! It’s cool and partly cloudy.\nAmy: Let’s go have fun!"
for loc,statement,ans in [('K-b-1-1','Alishan is sunny and cold.',False),('K-b-1-2','Tainan is rainy and hot.',False),('K-b-1-3','Taichung is partly cloudy and cool.',True),('K-b-2-1','It’s cool and rainy in Alishan.',False),('K-b-2-2','It isn’t rainy in Tainan.',True),('K-b-2-3','Grandma is thirsty at the end.',False)]:tf('he-dd114',loc,statement,ans,p,'Alishan is rainy and cold (5°C); Tainan is cloudy and hot; Taichung is cool and partly cloudy. Grandma predicts she would be thirsty in Tainan, but they choose Taichung.')
# Hanlin Dadun114 page-one written picture choices.
for i,(clue,opts,ans) in enumerate([
 ('原圖人物舉起手指，頭上有代表想到點子的燈泡。',['I have an idea.','Watch out!','Are you ready?'],0),
 ('原圖人物摸著吃飽的肚子，桌上有食物。',['Are you full? Yes, I am.','Is Ian a cook? Yes, he is.','Are they tired? Yes, they are.'],0),
 ('原圖人物圍著桌上的桌遊玩。',['Are you OK?',"It’s a board game.",'Look at this kimono!'],1),
 ('原圖 Iris 想喝水。',['My sister is very full.',"Iris is not thirsty. She’s tired.",'Iris is thirsty.'],2)],1):picture('he-dd114',f'G-{i}',clue+' Choose the matching sentence.',opts,ans,'Match the written picture clue to the sentence.',1)
# Hanlin Siwei112 written table and holiday vocabulary.
for i,(clue,ans) in enumerate([('月餅',0),('柚子',1),('玉兔',2)],1):picture('he-sw112',f'10-{i}',f'原圖是{clue}。Choose the matching name.',['a moon cake','a pomelo','Jade Rabbit'],ans,'Match the Mid-Autumn Festival item to its English name.')
p='Table A:\nMax | Taichung | sunny, cool | happy\nKen | Tainan | rainy, warm | tired\nEmma | Alishan | windy, cold | hungry\nMay | Taipei | cloudy, hot | sad'
for i,(statement,t) in enumerate([( "I’m Max. I’m in Taichung. It’s sunny and hot. I’m happy.",False),("I’m May. I’m in Taipei. It’s sunny and hot. I’m sad.",False),("I’m Ken. I’m in Tainan. It’s rainy and warm. I’m tired.",True),("I’m Emma. I’m in Alishan. It’s windy and cold. I’m hungry.",True),("I’m Max. I’m in Taichung. It’s rainy and warm. I’m happy.",False),("I’m May. I’m in Taipei. It’s windy and cold. I’m sad.",False)],1):tf('he-sw112',f'11-{i}',statement,t,p,'Compare every detail with the matching row of Table A.')
# Hanlin Wenxin111. Personal weather/drawing G1–2 are not auto-graded.
for i,(clue,word,t) in enumerate([('人物在 36°C 的天氣下流汗','cold',False),('人物想喝水','thirsty',True),('人物掉眼淚','happy',False),('人物皺眉、生氣','angry',True)],1):picture('he-wx111',f'E-{i}',f'原圖：{clue}。Does “{word}” match?',['Yes','No'],0 if t else 1,'Match the feeling or weather to the described clue.')
picture('he-wx111','F-1','My brother is a cook. 選出符合原句的職業。',['廚師','司機'],0,'A cook prepares food.')
picture('he-wx111','F-2','It’s cloudy. 選出符合句意的天氣。',['多雲','強風'],0,'Cloudy means 多雲.')
p='Weather table (O means yes; X means no):\nTaiwan: sunny; not cloudy, cold, windy or rainy.\nJapan: cold and rainy; not sunny, cloudy or windy.\nThe USA: cloudy and windy; not sunny, cold or rainy.'
for i,(st,t) in enumerate([('It’s sunny in Taiwan.',True),('It’s cold and rainy in Japan.',True),('It’s sunny and windy in the USA.',False)],1):tf('he-wx111',f'H-1-{i}',st,t,p,'Use the weather table, not real-world weather.')
p='Bob is happy. Zoe is sad. She can’t find her book. Kelly is Bob’s mother. She’s very angry because Bob is bad.'
for i,(feeling,ans) in enumerate([('angry',2),('sad',1),('happy',0)],1):add('he-wx111',f'H-2-{i}',f'Who is {feeling}?',['Bob','Zoe','Kelly'],ans,f'The passage identifies who is {feeling}.',p,'閱讀表格轉選擇')
Path('src/data/english-exams-20261025.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
from collections import Counter
print(len(rows),dict(Counter(x['sourceId'] for x in rows)))
