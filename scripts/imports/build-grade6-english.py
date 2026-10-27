"""Parent-supplied historical written English exams; audio-dependent items excluded."""
from pathlib import Path
import json,hashlib
rows=[]
def q(f,p,loc,prompt,answer,wrong,explanation,passage=None):
 opts=[answer,*wrong.split('|')];assert len(opts)>=3 and len(set(opts))==len(opts),(f,loc)
 shift=int(hashlib.sha256(f'{f}:{loc}'.encode()).hexdigest()[:4],16)%len(opts);opts=opts[shift:]+opts[:shift]
 rows.append(dict(id='g6e-'+hashlib.sha256(f'{f}:{loc}'.encode()).hexdigest()[:18],grade=6,course='english',subject='english',publisher='何嘉仁',level=2 if passage else 1,prompt=(passage+'\n\n' if passage else '')+prompt,options=[{'text':x} for x in opts],answer=opts.index(answer),hint='Read the whole sentence and check the subject and meaning.',explanation=explanation,examSources=[dict(id=f'g6e{f}',page=p,locator=loc,kind='筆試文字改編；非原卷聽力')],**({'format':'short-passage'} if passage else {})))
# 1 大華114: original H3 has duplicate equivalent answers, excluded.
q(1,1,'F1','「中國」的英文是哪一個？','China','Japan|Korea','China means 中國。')
q(1,1,'F2','「騎腳踏車」的英文是哪一個？','ride a bike','go shopping|go traveling','ride a bike means 騎腳踏車。')
q(1,1,'F3','「韓國」的英文是哪一個？','Korea','China|Japan','Korea means 韓國。')
q(1,1,'F4','「旅行」的英文是哪一個？','go traveling','go shopping|ride a bike','go traveling means 旅行。')
q(1,2,'H1','Jack is from France. Where is Jack from?','He is from France.','She is from France.|I am from France.','Jack uses he; the answer refers to Jack.')
q(1,2,'H4','Choose the possessive adjective that refers to they: They like to visit ___ friends.','their','my|our','The possessive adjective for they is their.')
q(1,2,'K1','What ___ Eric and Sam like to do in ___ free time?','do / their','does / his|does / their','Eric and Sam are plural: do and their.')
q(1,2,'K2','Where ___ you from?','are','is|does','Use are with you.')
q(1,2,'K3','___ Tom from the UK? Yes, he is.','Is','Does|Are','The answer he is matches Is Tom...?')
q(1,2,'K4','What ___ Mom like to do in her free time?','does','do|is','Mom is third-person singular: does.')
p1='Corina is from France. She loves to go shopping with her mom on weekends. Ken is from Taiwan. On rainy days he stays home and plays video games. On sunny days he goes hiking with his family or rides his bike along the river.'
q(1,2,'I1','Where is Corina from?','France','Taiwan|the USA','The passage says Corina is from France.',p1)
q(1,2,'I2','What can Ken do on sunny days?','Ride his bike along the river.','Stay home and play video games.|Go shopping with Corina.','Sunny-day activities include riding his bike.',p1)
q(1,2,'I3','What does Corina like to do on weekends?','Go shopping with her mom.','Go hiking with Ken.|Play video games at home.','Corina loves shopping with her mom.',p1)
# 2 大墩113
for loc,prompt,ans,wrong,exp in [
 ('E1','她喜歡看電視。Choose the correct sentence.','She likes to watch TV.','She likes TV watch.|She like to watch TV.','Use likes to + verb after she.'),
 ('E2','他喜歡購物。Choose the correct sentence.','He likes to go shopping.','We like to go shopping together.|He likes to play basketball.','He likes to go shopping matches the meaning.'),
 ('E3','Emma likes to play basketball. What does she like to do?','She likes to play basketball.','She likes basketball play.|She likes to play baseball.','The activity is basketball, not baseball.'),
 ('E5','Lynn is from Korea. Is Lynn from Japan?','No, she is from Korea.',"Yes, she is.|She's from Japan.",'Korea and Japan are different countries.'),
 ('E6','Your friend is from France. Is your friend from France?','Yes, he is.',"No, he is from France.|He likes France.",'The question asks his country, not what he likes.'),
 ('E7','Do you like to cook? Choose the direct yes-answer.','Yes, I do.','Yes, I am.|Yes, I does.','A do-question uses do in its short answer.')]:q(2,1,loc,prompt,ans,wrong,exp)
p2='Kelly and Adam are from Vietnam. Nick is from the UK. Kelly likes shopping, visiting friends and playing video games. Adam likes playing video games, riding a bike and camping. Nick likes camping, playing video games and playing basketball.'
for loc,prompt,ans,wrong in [('F1','What does Kelly like to do, but Adam does not?','Go shopping.','Play video games.|Go camping.'),('F2','What does Nick like to do, but Kelly does not?','Play basketball.','Play video games.|Go shopping.'),('F3','What do all three children like to do?','Play video games.','Go camping.|Go shopping.'),('F4','What do Adam and Nick both like, but Kelly does not?','Go camping.','Go shopping.|Visit friends.'),('F5','Where are Kelly and Adam from?','Vietnam','the UK|France')]:q(2,2,loc,prompt,ans,wrong,'Compare each child’s country and activities in the passage.',p2)
p2g='Nina says: My mother is from France. My father and grandpa are from Australia. My grandma is from Japan. My dog Dave is from the UK.'
for loc,prompt,ans,wrong in [('G1-1','Who is from Japan?','Nina’s grandma','Nina’s mother|Nina’s father'),('G1-2','Where is Nina’s mother from?','France','Japan|Australia'),('G1-3','Where are Nina’s father and grandpa from?','Australia','France|the UK'),('G1-4','Where is Dave from?','the UK','Japan|France')]:q(2,2,loc,prompt,ans,wrong,'Use the country stated for that family member.',p2g)
p2h='Emma’s mom is from the USA. She likes to visit friends, shop, dance and cook. Wendy’s mom is from Vietnam. The two mothers learn Chinese together and dance at the park every Sunday morning. They also cook together and share food with their neighbors.'
for loc,prompt,ans,wrong in [('H1-1','Where is Emma’s mom from?','the USA','Vietnam|Japan'),('H1-2','Where is Wendy’s mom from?','Vietnam','the USA|Taiwan'),('H1-3','Which activities does Emma’s mom enjoy?','Shopping and dancing','Singing and swimming|Biking and hiking'),('H1-4','Which activity do the two mothers do together?','Cook and share food.','Go swimming.|Ride a bike.'),('H1-5','Where do the two mothers dance on Sunday mornings?','At the park.','At school.|At the beach.')]:q(2,2,loc,prompt,ans,wrong,'The passage states this country, activity or place.',p2h)
# 3 忠孝113; 5國聖113 repeats same Ruby passage and rearrangement.
for f,p,loc,prompt,ans,wrong,exp in [
 (3,2,'八1','Choose the correct word order.','Where are you from?','Where you are from?|Where from are you?','Use Where + are + you + from.'),
 (3,2,'八2','Choose the correct sentence. (He / from / Japan)','He is from Japan.','He from is Japan.|He are from Japan.','Use he is from + country.'),
 (3,2,'八3','Choose the correct question. (Ken / Vietnam)','Is Ken from Vietnam?','Does Ken from Vietnam?|Are Ken from Vietnam?','Use Is + Ken + from + country.'),
 (3,2,'八4','Choose the correct sentence.','I like to play video games.','I like play to video games.|I likes to play video games.','Use I like to + verb.'),
 (3,2,'九1','Is Mary from Korea? Yes, she ___.','is','does|are','Use is in the short answer to Is Mary...?'),
 (3,2,'九2','She ___ to play video games.','likes','like|liking','Third-person singular she takes likes.'),
 (3,2,'九3','Anna is a girl. ___ likes to ride a bike.','She','He|They','Use She to refer to Anna.'),
 (3,2,'九4','___ does Kenji like to do in his free time?','What','How|Where','Ask What for the activity.'),
 (5,3,'九1','Choose the correct question. (Ken / Vietnam)','Is Ken from Vietnam?','Does Ken from Vietnam?|Are Ken from Vietnam?','Use Is + Ken + from + country.'),
 (5,3,'九2','Choose the correct question.','What do you like to do in your free time?','What does you like to do in your free time?|What you do like to do in your free time?','Use What do you like to do...?'),
 (5,4,'十一1','He is from the UK. Is he from the UK?','Yes, he is.','No, he is not.|Yes, he does.','The short answer uses is.'),
 (5,4,'十一2','He is from Vietnam. Is he from Taiwan?',"No, he isn't. He's from Vietnam.","Yes, he is.|No, he isn't. He's from Japan.",'His stated country is Vietnam.'),
 (5,4,'十一3','Andy likes visiting friends. What does Andy like to do?','He likes to visit his friends.','He likes to watch TV.|He likes to go shopping.','Visit friends matches the stated activity.')]:q(f,p,loc,prompt,ans,wrong,exp)
ruby='Dear Tina, Summer Camp in Australia is fun. Amy is from Korea and can sing and dance well. Ben is from France and can draw well. Our teacher, Miss Lin, is from Taiwan, just like me. I hope I can visit you in the USA. Love, Ruby.'
for f,p,section in [(3,2,'十'),(5,3,'十')]:
 for loc,prompt,ans,wrong in [('1','Where is Tina?','the USA','Taiwan|Australia'),('2','Where is Ben from?','France','the UK|Korea'),('3','Where is Ruby from?','Taiwan','Korea|Australia')]:q(f,p,section+loc,prompt,ans,wrong,'Read the person’s location or country carefully; the camp location is not Ruby’s home country.',ruby)
# 4 成功113 written pp3–4: adapt picture prompts into explicit text clues.
for loc,prompt,ans,wrong,exp in [('一6','Which word has the same vowel sound as car?','arm','cake|fork','car and arm share the ar sound.'),('一7','Which word has the same vowel sound as port?','forty','goat|arm','port and forty share the or sound.'),('一8','Which word has the same stressed vowel sound as first?','surf','goat|forty','first and surf share the r-controlled vowel sound.'),('一9','Which word has the same stressed vowel sound as purple?','nurse','park|corn','purple and nurse share the r-controlled vowel sound.'),('三5','___ are you from? I’m from the USA.','Where','What|How','Where asks about a place.'),('三6','She is from Australia. Is she from the USA?',"No, she isn't. She's from Australia.","Yes, she is.|No, she's from Japan.",'Her country is Australia.'),('三7','She ___ to play video games.','likes','like|liking','She takes likes.'),('三8','___ does Ken like to do in his free time?','What','How|Where','What asks about his activity.')]:q(4,3,loc,prompt,ans,wrong,exp)
lily='Lily likes drawing and playing basketball with Mina. Ben likes camping with his family, but he cannot go camping this Sunday because it will rain. Lily will visit Mina and play video games with her on Sunday. Ben asks to join them, and Lily says yes.'
for loc,prompt,ans,wrong in [('五2','What sport does Lily like?','Basketball','Baseball|Swimming'),('五3','What does Ben like to do with his family?','Go camping.','Go shopping.|Play video games.'),('五4','Who will visit Mina on Sunday?','Lily and Ben','Ben’s family|Only Lily')]:q(4,4,loc,prompt,ans,wrong,'Use the activities and Sunday plan stated in the passage.',lily)
for loc,prompt,ans,wrong in [('八1','「護士」的英文是？','nurse','doctor|student'),('八2','「學生」的英文是？','student','nurse|doctor'),('八3','「騎」的英文是？','ride','walk|read'),('八4','「走路」的英文是？','walk','ride|draw'),('八5','「醫生」的英文是？','doctor','student|nurse')]:q(4,4,loc,prompt,ans,wrong,'Choose the word that matches the Chinese meaning.')
# Additional source proposals from the read-only visual audit are imported below.
extra=Path('scripts/imports/grade6-english-extra.json')
if extra.exists():
 for r in json.loads(extra.read_text()):q(**r)
unique={}
for r in rows:
 key=(r['prompt'],r['options'][r['answer']]['text'],tuple(sorted(x['text'] for x in r['options'])))
 if key in unique:unique[key]['examSources'].extend(r['examSources'])
 else:unique[key]=r
out=list(unique.values())
Path('src/grade6-english-exams.ts').write_text("import type {LearningQuestion} from './learning';\nexport const GRADE6_ENGLISH_EXAMS: LearningQuestion[] = "+json.dumps(out,ensure_ascii=False,indent=2)+';\n')
print(json.dumps({'rows':len(rows),'unique':len(out)}))
