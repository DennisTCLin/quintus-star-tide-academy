import type { Exercise, Lesson, Track } from './catalog';
type Row=Omit<Exercise,'id'|'lessonId'>;
function make(id:string,track:Track,title:string,subtitle:string,phrase:string,meaning:string,rows:Row[],category:'foundation'|'conversation'):Lesson{return{id,track,title,subtitle,phrase,meaning,level:category==='foundation'?'A1':'A2',category,questions:rows.map((q,i)=>({...q,lessonId:id,id:`adult-en-v1-${id}-${i+1}`}))};}
const choose=(prompt:string,answer:string,wrong1:string,wrong2:string,translation:string,explanation:string):Row=>({kind:'choice',instruction:'選出合適的答案',prompt,options:[answer,wrong1,wrong2],answer,translation,explanation});
const type=(prompt:string,answer:string,translation:string,explanation:string,accepted?:string[]):Row=>({kind:'type',instruction:'用英文完成這一句',prompt,answer,translation,explanation,accepted});
const listen=(prompt:string,answer:string,wrong1:string,wrong2:string,explanation:string):Row=>({...choose(prompt,answer,wrong1,wrong2,answer,explanation),kind:'listen',instruction:'聽一句話，選出意思'});
const order=(prompt:string,answer:string,words:string[],explanation:string):Row=>({kind:'order',instruction:'把字詞排成一句話',prompt,answer,words,translation:prompt,explanation});
export const FOUNDATIONS:Lesson[]=[
 make('hello','everyday','從打招呼開始','問候、介紹與告別','Hello, my name is Alex.','你好，我叫 Alex。',[
  choose('第一次見面，你想介紹自己。','Hello, my name is Alex.','Good night, yesterday.','Where is your coffee?','你好，我叫 Alex。','my name is… 表示「我的名字是……」，可以用來介紹自己。'),
  listen('Good morning.','早安。','晚安。','明天見。','morning 是早上；Good morning 是早上見面時的招呼。'),
  order('我的名字是 Alex。','My name is Alex.',['Alex.','is','My name'],'英文介紹姓名時，把 My name 放在句首，後面接 is 和名字。'),
  type('Hello, my ___ is Alex.','name','你好，我叫 Alex。','name 的意思是名字；my name 是我的名字。'),
  choose('朋友說：See you tomorrow.','明天見。','很高興認識你。','你從哪裡來？','明天見。','see you 是再見的說法；tomorrow 表示明天。'),
  type('早安。','Good morning.','早安。','Good morning 用來向人道早安。'),
 ],'foundation'),
 make('be-verbs','everyday','說說你是誰','I am、you are 與簡單狀態','I am from Taiwan.','我來自臺灣。',[
  choose('I ___ from Taiwan.','am','are','be','我來自臺灣。','主詞 I 搭配 am；from 用來說明來自哪裡。'),
  listen('You are welcome.','不客氣。','你遲到了。','我來自臺灣。','回應感謝時，可說 You are welcome，意思是不客氣。'),
  order('我是一名老師。','I am a teacher.',['a teacher.','I','am'],'I am + 身分；teacher 是單數職業，前面放 a。'),
  type('You ___ very kind.','are','你人真好。','主詞 you 搭配 are；kind 在這裡表示友善、體貼。'),
  choose('She is busy.','她正在忙。','她很餓。','她有空。','她正在忙。','she 搭配 is；busy 表示忙碌。'),
  type('我來自臺灣。','I am from Taiwan.','我來自臺灣。','I am 可以縮寫成 I\'m；Taiwan 是地名。',["I'm from Taiwan."]),
 ],'foundation'),
 make('everyday-things','everyday','身邊的物品','這是什麼、在哪裡與我的東西','This is my phone.','這是我的手機。',[
  choose('你想說這是你的手機。','This is my phone.','That is your morning.','This are my phone.','這是我的手機。','this 指靠近自己的單一事物，搭配 is；my 表示我的。'),
  listen('Where is my bag?','我的包包在哪裡？','你的包包多少錢？','那是我的包包。','Where is…? 用來問單一物品的位置。'),
  order('這是我的書。','This is my book.',['my book.','This','is'],'This is… 表示「這是……」；book 是書。'),
  type('填入「我的」：This is ___ phone.','my','這是我的手機。','my 放在名詞前面，說明物品是我的。'),
  choose('The keys are on the table.','鑰匙在桌上。','鑰匙在包包裡。','桌子在門旁邊。','鑰匙在桌上。','on 表示在上面；keys 是複數，所以用 are。'),
  type('我的包包在哪裡？','Where is my bag?','我的包包在哪裡？','Where is my…? 可以用來找自己的單一物品。',["Where's my bag?"]),
 ],'foundation'),
 make('numbers-time','travel','數字與時間','價格、數量與整點時間','It is ten dollars.','這是十元。',[
  choose('ten 是哪個數字？','10','2','12','ten = 10。','ten 是十；two 是二；twelve 是十二。'),
  listen('It is nine o\'clock.','現在九點。','現在五點。','現在七點。','nine 是九；o\'clock 用來表示整點。'),
  order('這是十元。','It is ten dollars.',['ten dollars.','It','is'],'dollar 是元；超過一元通常用複數 dollars。'),
  type('two + three = ___','five','二加三等於五。','five 是五；two 是二，three 是三。'),
  choose('The meeting starts at eight.','會議八點開始。','會議有八個人。','會議開了八天。','會議八點開始。','at eight 是在八點；starts 表示開始。'),
  type('現在十點。','It is ten o\'clock.','現在十點。','說明時間可用 It is…；o\'clock 表示整點。',["It's ten o'clock."]),
 ],'foundation'),
 make('likes-needs','everyday','喜歡什麼、需要什麼','I like 與 I need 的基本用法','I need some water.','我需要一些水。',[
  choose('你現在需要水，會怎麼說？','I need some water.','I like yesterday.','I am a water.','我需要一些水。','need 表示需要；water 是不可數名詞，可用 some water 表示一些水。'),
  listen('I like tea.','我喜歡茶。','我不喝茶。','我要兩杯咖啡。','like 表示喜歡；tea 是茶。'),
  order('我需要一枝筆。','I need a pen.',['a pen.','need','I'],'I need + 名詞，用來表達需要什麼。pen 是單數，前面用 a。'),
  type('表達喜歡咖啡：I ___ coffee.','like','我喜歡咖啡。','like 可以用來表示平常喜歡某種飲品。'),
  choose('Do you like coffee?','你喜歡咖啡嗎？','你的咖啡在哪裡？','咖啡多少錢？','你喜歡咖啡嗎？','Do you like…? 用來詢問對方喜不喜歡某件事物。'),
  type('我需要一些水。','I need some water.','我需要一些水。','need + some water 是表達當下需要水的自然說法。'),
 ],'foundation'),
 make('simple-questions','everyday','問一個簡單問題','what、where 與 when','What time is it?','現在幾點？',[
  choose('想詢問位置，要用哪一個字？','where','when','what','where 用來問位置。','where 問哪裡，when 問時間，what 問什麼。'),
  listen('What is your name?','你叫什麼名字？','你在哪裡？','你幾點離開？','What is your name? 是詢問姓名的基本問句。'),
  order('現在幾點？','What time is it?',['is it?','What time'],'What time 用來問幾點；完整句子是 What time is it?'),
  type('詢問位置：___ is the station?','Where','車站在哪裡？','Where is + 地點，用來詢問位置。'),
  choose('When is the meeting?','會議是什麼時候？','會議在哪裡？','誰參加會議？','會議是什麼時候？','when 用來詢問時間，不一定只問幾點。'),
  type('現在幾點？','What time is it?','現在幾點？','What time is it? 是詢問現在時間的完整問句。'),
 ],'foundation'),
];
const respond=(context:string,prompt:string,answer:string,accepted:string[],translation:string,explanation:string):Row=>({kind:'respond',instruction:'輪到你，用英文回應',context,prompt,answer,accepted,translation,explanation});
export const CONVERSATIONS:Lesson[]=[
 make('dialogue-cafe','travel','在咖啡店完成一次點餐','引導式對話：你是顧客，店員等你回應',"I'd like a coffee, please.",'我想要一杯咖啡，謝謝。',[
  respond('你想點一杯咖啡。','Barista: Hello! What would you like?',"I'd like a coffee, please.",['I would like a coffee, please.','Can I have a coffee, please?'],'我想要一杯咖啡，謝謝。','用 I\'d like 或 Can I have 禮貌點餐。'),
  respond('這次請選外帶。','Barista: For here or to go?','To go, please.',['To go.'],'外帶，謝謝。','to go 表示外帶；for here 表示內用。'),
  respond('店員問要不要加糖，你不需要。','Barista: Would you like sugar?','No, thank you.',['No, thanks.'],'不用，謝謝。','用 No, thank you 婉拒，比只說 No 更有禮貌。'),
  respond('你沒有其他需要。','Barista: Anything else?',"That's all, thank you.",['That is all, thank you.',"That's all, thanks."],'這樣就好了，謝謝。','That\'s all 表示點餐到此結束。'),
  respond('你想問能不能刷卡。','Barista: That is five dollars.','Can I pay by card?',['Can I pay with a card?'],'我可以刷卡嗎？','pay by card 表示用卡付款，這裡用問句確認。'),
  respond('店員把咖啡交給你，請道謝。','Barista: Here is your coffee. Have a nice day!','Thank you.',['Thanks.','Thank you, you too.'],'謝謝。','收到物品或祝福時，可以簡短道謝；也可加 you too 回祝對方。'),
 ],'conversation'),
 make('dialogue-meeting','work','把一場會議約好','引導式對話：你與同事安排會議','Are you available on Monday?','你星期一有空嗎？',[
  respond('你想問同事星期一有沒有空。','Colleague: We should discuss the project.','Are you available on Monday?',['Are you free on Monday?'],'你星期一有空嗎？','available 與 free 都可表達有空。'),
  respond('你想提議十點見面。','Colleague: Yes. What time works for you?','Could we meet at ten?',['Can we meet at ten?'],'我們可以十點見面嗎？','用 Could we…? 提出共同安排的建議。'),
  respond('同事提議改到星期五，你同意。','Colleague: Could we meet on Friday instead?','Friday works for me.',['Yes, Friday works for me.'],'星期五我可以。','works for me 表示對我合適；Friday 是單數，work 加 s。'),
  respond('你會寄出會議邀請。','Colleague: Great. Could you send an invitation?',"I'll send you an invitation.",['I will send you an invitation.'],'我會寄給你邀請。','I\'ll 是 I will，表示接下來的安排。'),
  respond('你想知道報告的截止時間。','Colleague: Please bring the report.','When is the report due?',['When do you need the report?'],'報告什麼時候到期？','When is…due? 可用來詢問截止時間。'),
  respond('同事說最晚星期四，你想感謝說明。','Colleague: By Thursday, please.','Thank you.',['Thanks.','Thanks for the information.'],'謝謝。','簡短道謝能自然結束工作上的確認。'),
 ],'conversation'),
 make('dialogue-station','travel','問路，走到車站','引導式對話：向路人確認方向','Where is the station?','車站在哪裡？',[
  respond('先禮貌引起路人的注意。','Passerby: Hello.','Excuse me.',['Hello, excuse me.'],'不好意思。','Excuse me 可以用在詢問或打擾別人之前。'),
  respond('你想問車站在哪裡。','Passerby: Can I help you?','Where is the station?',["Where's the station?"],'車站在哪裡？','Where is…? 用來問位置。'),
  respond('對方說太快，請他再說一次。','Passerby: Go straight, then turn left at the bank.','Could you say that again?',['Can you say that again?'],'可以再說一次嗎？','say that again 指把剛才的話再說一次。'),
  respond('你想再請對方放慢語速。','Passerby: Go straight for two blocks.','Could you speak more slowly?',['Can you speak more slowly?'],'可以說慢一點嗎？','more slowly 表示更慢地。'),
  respond('你想確認銀行在哪裡。','Passerby: Then turn left at the bank.','Where is the bank?',["Where's the bank?"],'銀行在哪裡？','同一個 Where is…? 句型可以換成不同地點。'),
  respond('已經聽懂指引，請感謝幫助。','Passerby: The bank is across from the park.','Thank you for your help.',['Thanks for your help.'],'謝謝你的幫忙。','Thank you for… 用來感謝某件具體的事。'),
 ],'conversation'),
];
