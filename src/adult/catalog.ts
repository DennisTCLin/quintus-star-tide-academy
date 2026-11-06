export type Track = 'everyday' | 'travel' | 'work';
export type Exercise = {
  id: string; lessonId: string; kind: 'choice' | 'listen' | 'order' | 'type';
  instruction: string; context?: string; prompt: string; options?: string[];
  answer: string; accepted?: string[]; words?: string[]; explanation: string; translation: string;
};
export type Lesson = { id: string; track: Track; title: string; subtitle: string; level: 'A1' | 'A2'; phrase: string; meaning: string; questions: Exercise[] };
export const TRACKS: { id: Track; label: string; description: string }[] = [
  { id: 'everyday', label: '日常生活', description: '從打招呼到把話接下去' },
  { id: 'travel', label: '旅行途中', description: '點餐、問路，自己說得清楚' },
  { id: 'work', label: '工作溝通', description: '約時間、問進度，說得得體' },
];
function lesson(id: string, track: Track, title: string, subtitle: string, level: Lesson['level'], phrase: string, meaning: string,
  rows: Omit<Exercise, 'id' | 'lessonId'>[]): Lesson {
  return { id, track, title, subtitle, level, phrase, meaning, questions: rows.map((q, i) => ({ ...q, id: `adult-en-v1-${id}-${i + 1}`, lessonId: id })) };
}
export const LESSONS: Lesson[] = [
  lesson('keep-talking', 'everyday', '讓對話繼續', '聽不懂時，也能自在接話', 'A1', 'Could you say that again?', '可以再說一次嗎？', [
    { kind:'choice', instruction:'選出合適的說法', context:'對方說得太快，你想請他再說一次。', prompt:'你會怎麼說？', options:['Could you say that again?','Could you write my name?','I am leaving tomorrow.'], answer:'Could you say that again?', explanation:'Could you…? 是禮貌提出請求的方式；say that again 表示把剛才的話再說一次。', translation:'可以再說一次嗎？' },
    { kind:'listen', instruction:'聽一句話，選出意思', prompt:'Could you speak more slowly?', options:['可以說慢一點嗎？','你明天有空嗎？','可以寫下地址嗎？'], answer:'可以說慢一點嗎？', explanation:'more slowly 是「更慢地」。當你跟不上語速時，可以用這句話請對方放慢。', translation:'可以說慢一點嗎？' },
    { kind:'order', instruction:'排出完整句子', prompt:'我正在學英文。', words:["English.",'learning',"I'm"], answer:"I'm learning English.", explanation:"I'm 是 I am 的縮寫。am learning 表示目前正在學習。", translation:'我正在學英文。' },
    { kind:'type', instruction:'填入缺少的單字', prompt:'Could you say that ___?', context:'請對方再說一次。', answer:'again', explanation:'again 的意思是「再一次」。Could you say that again? 是完整的請求。', translation:'可以再說一次嗎？' },
    { kind:'choice', instruction:'讀對話，選出回應', prompt:'A: Nice to meet you.\nB: ___', options:['Nice to meet you, too.','No, I am not late.','It costs ten dollars.'], answer:'Nice to meet you, too.', explanation:'回應初次見面的招呼時，句尾加 too，表示「我也很高興認識你」。', translation:'我也很高興認識你。' },
    { kind:'type', instruction:'自己把這句話打出來', prompt:'謝謝你的幫忙。', answer:'Thank you for your help.', accepted:['Thanks for your help.'], explanation:'Thank you for + 名詞，用來感謝對方的幫助。Thanks for your help 也可以。', translation:'謝謝你的幫忙。' },
  ]),
  lesson('make-plans', 'everyday', '約一個時間', '邀請、回應與確認時間', 'A2', 'Does Friday work for you?', '星期五你方便嗎？', [
    {kind:'choice',instruction:'選出合適的說法',context:'你想問朋友星期五方不方便。',prompt:'你會怎麼問？',options:['Does Friday work for you?','Do you work every Friday?','Friday is my first name.'],answer:'Does Friday work for you?',explanation:'work for you 在安排時間時，表示「對你合適／方便」，不是問有沒有上班。',translation:'星期五你方便嗎？'},
    {kind:'listen',instruction:'聽一句話，選出意思',prompt:"I'm free after six.",options:['我六點以後有空。','我六點以前有空。','這是免費的。'],answer:'我六點以後有空。',explanation:'free 在這裡指有空。after six 是六點以後。',translation:'我六點以後有空。'},
    {kind:'order',instruction:'排出完整句子',prompt:'我們在車站見面吧。',words:['the station.',"Let's",'at','meet'],answer:"Let's meet at the station.",explanation:"Let's + 原形動詞，用來提出一起做某事的建議。地點用 at the station。",translation:'我們在車站見面吧。'},
    {kind:'type',instruction:'填入缺少的單字',prompt:"I'm free ___ six.",context:'六點以後有空。',answer:'after',explanation:'after 表示在某個時間之後；before 表示之前。',translation:'我六點以後有空。'},
    {kind:'choice',instruction:'讀訊息，選出意思',prompt:'Can we move our lunch to Saturday?',options:['對方想改到星期六吃午餐。','對方想取消所有聚會。','對方已經訂好晚餐。'],answer:'對方想改到星期六吃午餐。',explanation:'move…to… 在這裡是把安排改到另一個時間。',translation:'我們可以把午餐改到星期六嗎？'},
    {kind:'type',instruction:'自己把這句話打出來',prompt:'星期五你方便嗎？',answer:'Does Friday work for you?',explanation:'單數的 Friday 搭配 Does，後面的 work 維持原形。',translation:'星期五你方便嗎？'},
  ]),
  lesson('coffee-order', 'travel', '點一杯咖啡', '從點餐到確認內用外帶', 'A1', "I'd like a coffee, please.", '我想要一杯咖啡，謝謝。', [
    {kind:'choice',instruction:'選出合適的說法',context:'在咖啡店，你想禮貌點一杯咖啡。',prompt:'你會怎麼說？',options:["I'd like a coffee, please.",'I like coffee yesterday.','You must give coffee.'],answer:"I'd like a coffee, please.",explanation:"I'd like 是 I would like 的縮寫，適合用於禮貌點餐。",translation:'我想要一杯咖啡，謝謝。'},
    {kind:'listen',instruction:'聽一句話，選出意思',prompt:'For here or to go?',options:['內用還是外帶？','現金還是刷卡？','熱的還是冰的？'],answer:'內用還是外帶？',explanation:'for here 是內用；to go 是外帶，這是美式英語常用說法。',translation:'內用還是外帶？'},
    {kind:'order',instruction:'排出完整句子',prompt:'請給我菜單。',words:['the menu,','have','Can I','please?'],answer:'Can I have the menu, please?',explanation:'Can I have…? 可用來索取東西。加 please 讓語氣更有禮貌。',translation:'可以給我菜單嗎？'},
    {kind:'type',instruction:'填入缺少的單字',prompt:'To ___, please.',context:'你要外帶。',answer:'go',explanation:'To go, please. 是「外帶，謝謝」。',translation:'外帶，謝謝。'},
    {kind:'choice',instruction:'讀對話，選出回應',prompt:'Staff: Would you like anything else?\nYou: ___',options:["That's all, thank you.",'It is next to the bank.','My room is upstairs.'],answer:"That's all, thank you.",explanation:"That's all 表示點餐已經完成，沒有其他需要。",translation:'這樣就好了，謝謝。'},
    {kind:'type',instruction:'自己把這句話打出來',prompt:'可以刷卡嗎？',answer:'Can I pay by card?',accepted:['Can I pay with a card?'],explanation:'pay by card 和 pay with a card 都可表示刷卡付款。',translation:'可以刷卡嗎？'},
  ]),
  lesson('find-way', 'travel', '找到你的方向', '聽懂問路與簡單指引', 'A2', 'How do I get to the station?', '請問要怎麼去車站？', [
    {kind:'choice',instruction:'選出合適的問法',prompt:'你想知道怎麼去車站。',options:['How do I get to the station?','When does my coffee arrive?','Who is your manager?'],answer:'How do I get to the station?',explanation:'How do I get to + 地點，是常見的問路句型。',translation:'請問要怎麼去車站？'},
    {kind:'listen',instruction:'聽一句話，選出意思',prompt:'Turn left at the next street.',options:['在下一個路口左轉。','在下一個路口右轉。','一直走，不要轉彎。'],answer:'在下一個路口左轉。',explanation:'left 是左邊；next street 指下一條街，在此是下一個路口。',translation:'在下一個路口左轉。'},
    {kind:'order',instruction:'排出完整句子',prompt:'車站就在銀行旁邊。',words:['the bank.','is next to','The station'],answer:'The station is next to the bank.',explanation:'next to 表示緊鄰、在旁邊。',translation:'車站就在銀行旁邊。'},
    {kind:'type',instruction:'填入缺少的單字',prompt:'Go ___ for two blocks.',context:'直走兩個街區。',answer:'straight',explanation:'Go straight 表示直走；for two blocks 表示走兩個街區的距離。',translation:'直走兩個街區。'},
    {kind:'choice',instruction:'讀指引，選出意思',prompt:'The museum is across from the park.',options:['博物館在公園對面。','博物館在公園裡面。','博物館離公園很遠。'],answer:'博物館在公園對面。',explanation:'across from 表示在對面，常用於描述隔著馬路相對的位置。',translation:'博物館在公園對面。'},
    {kind:'type',instruction:'自己把這句話打出來',prompt:'車站在哪裡？',answer:'Where is the station?',accepted:["Where's the station?"],explanation:"Where is…? 用來問位置；Where's 是 Where is 的縮寫。",translation:'車站在哪裡？'},
  ]),
  lesson('meeting-time', 'work', '把會議約好', '提出時間、確認與改期', 'A2', 'Could we meet at ten?', '我們可以十點開會嗎？', [
    {kind:'choice',instruction:'選出合適的說法',prompt:'你想禮貌提議十點開會。',options:['Could we meet at ten?','We met ten people.','You are ten minutes late.'],answer:'Could we meet at ten?',explanation:'Could we…? 用來提出共同安排的建議；時間點前用 at。',translation:'我們可以十點開會嗎？'},
    {kind:'listen',instruction:'聽一句話，選出意思',prompt:'Could we move the meeting to Thursday?',options:['我們可以把會議改到星期四嗎？','星期四的會議已取消。','請在星期四交報告。'],answer:'我們可以把會議改到星期四嗎？',explanation:'move the meeting to… 是把會議改到另一個時間，不表示取消。',translation:'我們可以把會議改到星期四嗎？'},
    {kind:'order',instruction:'排出完整句子',prompt:'我會寄給你邀請。',words:['an invitation.','send you',"I'll"],answer:"I'll send you an invitation.",explanation:"I'll 是 I will 的縮寫；send you an invitation 表示寄給你一份邀請。",translation:'我會寄給你邀請。'},
    {kind:'type',instruction:'填入缺少的單字',prompt:'Are you available ___ Monday?',context:'你星期一有空嗎？',answer:'on',explanation:'星期前用 on；時間點前用 at。',translation:'你星期一有空嗎？'},
    {kind:'choice',instruction:'讀訊息，選出意思',prompt:'Ten works for me. See you then.',options:['對方接受十點的安排。','對方只能開十分鐘。','對方想把會議取消。'],answer:'對方接受十點的安排。',explanation:'Ten works for me 表示十點對我合適。See you then 是到時見。',translation:'十點我可以，到時見。'},
    {kind:'type',instruction:'自己把這句話打出來',prompt:'你星期一有空嗎？',answer:'Are you available on Monday?',accepted:['Are you free on Monday?'],explanation:'available 和 free 都可表示有空；工作溝通用 available 很自然。',translation:'你星期一有空嗎？'},
  ]),
  lesson('ask-update', 'work', '問進度，也說清楚', '確認期限與簡短回覆', 'A2', 'Could you send me an update?', '可以告訴我最新進度嗎？', [
    {kind:'choice',instruction:'選出合適的說法',prompt:'你想禮貌詢問專案最新進度。',options:['Could you send me an update?','You have no time left.','I never use email.'],answer:'Could you send me an update?',explanation:'an update 指最新資訊或進度。Could you…? 讓詢問更禮貌。',translation:'可以告訴我最新進度嗎？'},
    {kind:'listen',instruction:'聽一句話，選出意思',prompt:"I'll send it by Friday.",options:['我最晚會在星期五寄出。','我星期五之後才會寄出。','我每個星期五都會寄出。'],answer:'我最晚會在星期五寄出。',explanation:'by Friday 表示最晚星期五，包含星期五；after Friday 才是星期五之後。',translation:'我最晚會在星期五寄出。'},
    {kind:'order',instruction:'排出完整句子',prompt:'這份報告什麼時候到期？',words:['due?','the report','When is'],answer:'When is the report due?',explanation:'be due 表示到期、應完成。When is…due? 用來確認截止時間。',translation:'這份報告什麼時候到期？'},
    {kind:'type',instruction:'填入缺少的單字',prompt:"I'll finish it ___ Friday.",context:'最晚星期五完成。',answer:'by',explanation:'by + 時間點，用來表達不晚於該時間的期限。',translation:'我最晚會在星期五完成。'},
    {kind:'choice',instruction:'讀訊息，選出意思',prompt:'I need one more day to finish the report.',options:['對方還需要一天完成報告。','對方昨天已經完成報告。','對方不會再寫這份報告。'],answer:'對方還需要一天完成報告。',explanation:'one more day 表示再多一天；to finish 說明需要這段時間的目的。',translation:'我還需要一天完成報告。'},
    {kind:'type',instruction:'自己把這句話打出來',prompt:'謝謝你告訴我最新進度。',answer:'Thanks for the update.',accepted:['Thank you for the update.'],explanation:'Thanks for the update 是收到進度回覆時常用的簡短感謝。',translation:'謝謝你告訴我最新進度。'},
  ]),
];
// Distribute the correct choice across positions, while keeping order stable on resume.
for (const l of LESSONS) for (const q of l.questions) if (q.options) {
  const hash = [...q.id].reduce((h,c) => Math.imul(h ^ c.charCodeAt(0),16777619) >>> 0,2166136261);
  const offset = hash % q.options.length; q.options = [...q.options.slice(offset),...q.options.slice(0,offset)];
}
export const EXERCISES = LESSONS.flatMap(l => l.questions);
export const exerciseById = (id: string) => EXERCISES.find(q => q.id === id);
export const lessonById = (id: string) => LESSONS.find(l => l.id === id);
