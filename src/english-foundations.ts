import type { LearningQuestion } from './learning';

// Original beginner exercises: letter recognition, everyday vocabulary and useful phrases.
// IDs and answers are persistent learning history; add new versions rather than rewriting them.
type Exercise = Omit<LearningQuestion, 'id' | 'grade' | 'course' | 'subject'>;
const groups: Exercise[][] = [];
function exercise(prompt: string, visual: string, correct: string, distractors: string[], speechText: string, explanation: string, level: 1 | 2 = 1): Exercise {
  return { prompt, visual, options: [correct, ...distractors].map(text => ({ text })), answer: 0,
    speechText, hint: "先找出題目裡的關鍵字，再比較三個英文選項。想一想字母形狀、數量或生活中使用的情境。", explanation, level };
}
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
groups.push([...letters].map((letter, i) => exercise(
  `找出大寫 ${letter} 對應的小寫字母。`, letter, letter.toLowerCase(),
  [letters[(i + 7) % 26].toLowerCase(), letters[(i + 15) % 26].toLowerCase()],
  `Find the lowercase letter ${letter}.`, `${letter} 的小寫是 ${letter.toLowerCase()}。大小寫是同一個字母的兩種寫法。`,
)));
const numbers = ['one','two','three','four','five','six','seven','eight','nine','ten'];
groups.push(numbers.map((word,i) => exercise('這個數字的英文是哪一個？', String(i+1), word,
  [numbers[(i+3)%10],numbers[(i+6)%10]], 'What number is this?', `${i+1} 的英文是 ${word}。`)));
const colors = [['red','紅色','🔴'],['blue','藍色','🔵'],['yellow','黃色','🟡'],['green','綠色','🟢'],['orange','橘色','🟠'],['purple','紫色','🟣'],['black','黑色','⚫'],['white','白色','⚪']];
groups.push(colors.map(([word,zh,icon],i) => exercise(`「${zh}」的英文是哪一個？`,icon,word,
  [colors[(i+2)%colors.length][0],colors[(i+5)%colors.length][0]],'Choose the colour word.',`${zh} 的英文是 ${word}。`)));
const animals = [['cat','貓','🐱'],['dog','狗','🐶'],['bird','鳥','🐦'],['fish','魚','🐟'],['rabbit','兔子','🐰'],['bear','熊','🐻'],['duck','鴨子','🦆'],['frog','青蛙','🐸']];
const school = [['book','書','📖'],['pencil','鉛筆','✏️'],['bag','書包','🎒'],['ruler','尺','📏'],['chair','椅子','🪑'],['desk','書桌','']];
const food = [['apple','蘋果','🍎'],['banana','香蕉','🍌'],['orange','柳橙','🍊'],['egg','蛋','🥚'],['milk','牛奶','🥛'],['bread','麵包','🍞']];
for (const vocabulary of [animals,school,food]) groups.push(vocabulary.map(([word,zh,icon],i) => exercise(
  `「${zh}」的英文是哪一個？`,icon,word,[vocabulary[(i+1)%vocabulary.length][0],vocabulary[(i+3)%vocabulary.length][0]],
  'Choose the English word.',`${zh} 的英文是 ${word}。`,
)));
const greetings = [
  ['見到朋友時，怎麼用英文打招呼？','👋','Hello!','Goodbye!','Good night!','Say hello to your friend.','Hello! 是「你好！」。'],
  ['早上見到老師，可以說什麼？','🌅','Good morning!','Good night!','Goodbye!','It is morning. What do you say?','Good morning! 是「早安！」。'],
  ['和朋友道別時，可以說什麼？','👋','Goodbye!','Hello!','Thank you!','Say goodbye to your friend.','Goodbye! 是「再見！」。'],
  ['收到別人的幫助，要怎麼道謝？','💝','Thank you!','Good night!','Hello!','Your friend helps you. What do you say?','Thank you! 是「謝謝你！」。'],
  ['不小心撞到朋友，怎麼道歉？','💬','Sorry!','Hello!','Good morning!','You bump into a friend. What do you say?','Sorry! 是「對不起！」。'],
  ['朋友說 Thank you!，怎麼回應？','🤝',"You're welcome!",'Good night!','Goodbye!','Thank you!',"You're welcome! 是「不客氣！」。"],
  ['要介紹自己叫 Tom，應該說什麼？','🙂','My name is Tom.','This is a book.','I like apples.','What is your name?','My name is Tom. 是「我的名字是 Tom。」。'],
  ['睡覺前和家人說晚安，應該說什麼？','🌙','Good night!','Good morning!','Hello!','It is bedtime. What do you say?','Good night! 是「晚安！」。'],
];
groups.push(greetings.map(([prompt,visual,correct,a,b,speech,explanation]) => exercise(prompt,visual,correct,[a,b],speech,explanation,2)));
const sentences = [
  ['我是六歲：I am ___ years old.','six','red','cat','I am blank years old.','six 是六；I am six years old. 是「我六歲」。'],
  ['我喜歡蘋果：I like ___.','apples','blue','seven','I like blank.','I like apples. 是「我喜歡蘋果」。'],
  ['這是一本書：This is a ___.','book','three','green','This is a blank.','This is a book. 是「這是一本書」。'],
  ['請坐下：___ down, please.','Sit','Cat','Blue','Blank down, please.','Sit down, please. 是「請坐下」。'],
  ['請站起來：___ up, please.','Stand','Milk','Five','Blank up, please.','Stand up, please. 是「請站起來」。'],
  ['打開你的書：Open your ___.','book','red','two','Open your blank.','Open your book. 是「打開你的書」。'],
  ['這是一隻狗：It is a ___.','dog','yellow','eight','It is a blank.','It is a dog. 是「這是一隻狗」。'],
  ['我有兩支鉛筆：I have ___ pencils.','two','apple','white','I have blank pencils.','I have two pencils. 是「我有兩支鉛筆」。'],
];
groups.push(sentences.map(([prompt,correct,a,b,speech,explanation]) => exercise(prompt,'',correct,[a,b],speech,explanation,2)));
// Interleave topics so early voyages mix abilities instead of serving26 consecutive letters.
const ordered: Exercise[] = [];
for(let i=0;i<Math.max(...groups.map(g=>g.length));i++) for(const group of groups) if(group[i]) ordered.push(group[i]);
export const ENGLISH_FOUNDATIONS: LearningQuestion[] = ordered.map((q,i) => {
  const offset=i%q.options.length,options=[...q.options.slice(offset),...q.options.slice(0,offset)];
  return {...q,id:`g1-en-v1-${String(i+1).padStart(3,'0')}`,grade:1,course:'english',subject:'english',options,answer:(q.options.length-offset)%q.options.length};
});
