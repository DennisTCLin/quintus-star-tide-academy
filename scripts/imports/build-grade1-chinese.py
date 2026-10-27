"""Manually reviewed grade-one source transcription; never infer readings from OCR."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[2]
rows=[]
def add(source,page,locator,course,prompt,correct,options,speech,explanation,kind):
 assert correct in options and len(set(options))==len(options)
 shift=len(rows)%len(options);opts=options[shift:]+options[:shift]
 rows.append(dict(id=f'cxg1-{source}-{hashlib.sha256(locator.encode()).hexdigest()[:12]}',sourceId=source,page=page,locator=locator,kind=kind,course=course,prompt=prompt,options=opts,answer=opts.index(correct),speechText=speech,hint='先聽清楚題目，再仔細比較注音和聲調。',explanation=explanation))
def word(source,page,locator,course,word,target,correct,options):
 p=f'「{word}」'+(f'的「{target}」' if target!=word else '')+'，正確的注音是哪一個？'
 speech=(f'{word}。請選出最後一個字的注音。' if correct.startswith('˙') else f'{word}。'+(f'{target}。' if target!=word else '')+'請選出正確的注音。')
 add(source,page,locator,course,p,correct,options,speech,f'「{word}」'+(f'的「{target}」' if target!=word else '')+f'讀作 {correct}。','注音選擇改編／裝置朗讀')
for loc,w,t,a,opts in [
 ('二1','螞蟻','蟻','ㄧˇ',['ㄧˇ','ㄨˇ','ㄩˇ']),('二2','房屋','屋','ㄨ',['ㄧ','ㄨ','ㄩ']),
 ('二3','金魚','魚','ㄩˊ',['ㄩˊ','ㄧˊ','ㄨˊ']),('二4','跳舞','舞','ㄨˇ',['ㄩˇ','ㄨˇ','ㄧˇ']),
 ('二5','雨傘','雨','ㄩˇ',['ㄧˇ','ㄨˇ','ㄩˇ'])]:word('g1ck1',1,loc,'medials',w,t,a,opts)
for loc,left,right,a,opts in [
 ('一1','ㄐ','ㄧ','ㄐㄧ',['ㄐㄧ','ㄑㄧ','ㄒㄧ']),('一2','ㄖ','ㄠˋ','ㄖㄠˋ',['ㄖㄠˊ','ㄖㄠˇ','ㄖㄠˋ']),
 ('一3','ㄍ','ㄨㄛˇ','ㄍㄨㄛˇ',['ㄍㄨㄛˇ','ㄎㄨㄛˇ','ㄍㄨㄛˋ']),('一4','ㄊ','ㄧㄠ','ㄊㄧㄠ',['ㄊㄧㄠ','ㄊㄧㄠˊ','ㄉㄧㄠ'])]:
 add('g1ck2',1,loc,'medials',f'{left} ＋ {right}，拼起來是哪個音？',a,opts,'請看畫面，把兩邊的注音拼起來，選出正確的音。',f'{left} 和 {right} 拼起來是 {a}。','拼音填寫改為選擇')
for loc,context,char,syllable,mark in [
 ('五1-友','好朋友一起玩遊戲','友','ㄧㄡˇ','ˇ'),('五1-遊','好朋友一起玩遊戲','遊','ㄧㄡˊ','ˊ'),
 ('五2-小','小狗餓了要喝奶','小','ㄒㄧㄠˇ','ˇ'),('五2-狗','小狗餓了要喝奶','狗','ㄍㄡˇ','ˇ'),('五2-奶','小狗餓了要喝奶','奶','ㄋㄞˇ','ˇ'),
 ('五3-忙','豬小弟忙著蓋房子','忙','ㄇㄤˊ','ˊ'),('五3-蓋','豬小弟忙著蓋房子','蓋','ㄍㄞˋ','ˋ'),
 ('五4-豆','小豆子發芽了','豆','ㄉㄡˋ','ˋ'),('五4-芽','小豆子發芽了','芽','ㄧㄚˊ','ˊ')]:
 name={'ˊ':'二','ˇ':'三','ˋ':'四'}[mark]
 add('g1ck2',2,loc,'tones',f'{context}。「{char}」的注音應標哪個聲調？',mark,['―','ˊ','ˇ','ˋ','˙'],f'{char}。請選出{char}的注音聲調。',f'「{char}」的注音是 {syllable}，標第{name}聲。','原空格聲調選擇改編／裝置朗讀')
for source,page,loc,w,t,a,opts in [
 ('g1ck1',2,'五4','飛機','飛機','ㄈㄟ ㄐㄧ',['ㄈㄟ ㄐㄧ','ㄏㄟ ㄐㄧ','ㄈㄟ ㄑㄧ']),
 ('g1ck1',2,'七3','河馬','馬','ㄇㄚˇ',['ㄇㄚ','ㄇㄚˊ','ㄇㄚˇ']),
 ('g1ck1',2,'七5','孔雀','雀','ㄑㄩㄝˋ',['ㄑㄩㄝˋ','ㄑㄩㄝˊ','ㄑㄩㄝˇ']),
 ('g1ck1',2,'七6','無尾熊','熊','ㄒㄩㄥˊ',['ㄒㄩㄥ','ㄒㄩㄥˊ','ㄒㄩㄥˇ']),
 ('g1ck1',2,'七10','變魔術','魔','ㄇㄛˊ',['ㄇㄛ','ㄇㄛˊ','ㄇㄛˇ']),
 ('g1ck2',1,'二2','汽車','汽車','ㄑㄧˋ ㄔㄜ',['ㄑㄧˋ ㄔㄜ','ㄐㄧˋ ㄔㄜ','ㄑㄧˋ ㄘㄜ']),
 ('g1ck2',1,'二3','鉛筆','鉛筆','ㄑㄧㄢ ㄅㄧˇ',['ㄑㄧㄢ ㄅㄧˇ','ㄑㄧㄥ ㄅㄧˇ','ㄑㄧㄢ ㄆㄧˇ']),
 ('g1ck2',1,'二4','巫婆','巫婆','ㄨ ㄆㄛˊ',['ㄨ ㄆㄛˊ','ㄨˊ ㄆㄛˊ','ㄨ ㄅㄛˊ']),
 ('g1ck2',1,'二5','牙齒','牙齒','ㄧㄚˊ ㄔˇ',['ㄧㄚˊ ㄔˇ','ㄧㄚˊ ㄘˇ','ㄧㄚˇ ㄔˇ']),
 ('g1ck2',1,'二6','青蛙','青蛙','ㄑㄧㄥ ㄨㄚ',['ㄑㄧㄥ ㄨㄚ','ㄑㄧㄣ ㄨㄚ','ㄑㄧㄥ ㄨㄛ']),
 ('g1ck2',1,'二8','眼鏡','眼鏡','ㄧㄢˇ ㄐㄧㄥˋ',['ㄧㄢˇ ㄐㄧㄥˋ','ㄧㄢˇ ㄐㄧㄣˋ','ㄧㄢˊ ㄐㄧㄥˋ']),
 ('g1ck2',1,'三1-1','蛋糕','蛋','ㄉㄢˋ',['ㄉㄢˋ','ㄉㄤˋ','ㄉㄢˇ']),
 ('g1ck2',1,'三1-2','盪鞦韆','盪','ㄉㄤˋ',['ㄉㄢˋ','ㄉㄤˋ','ㄊㄤˋ']),
 ('g1ck2',1,'三2-1','風箏','箏','ㄓㄥ',['ㄓㄣ','ㄓㄥ','ㄗㄥ']),
 ('g1ck2',1,'三2-2','珍珠','珍','ㄓㄣ',['ㄓㄣ','ㄓㄥ','ㄗㄣ']),
 ('g1ck2',1,'三3-2','影子','子','˙ㄗ',['˙ㄗ','ㄗˇ','ㄗˋ']),
 ('g1ck2',1,'三4-1','金魚','金','ㄐㄧㄣ',['ㄐㄧㄥ','ㄐㄧㄣ','ㄑㄧㄣ']),
 ('g1ck2',1,'三4-2','經常','經','ㄐㄧㄥ',['ㄐㄧㄣ','ㄐㄧㄥ','ㄑㄧㄥ']),
 ('g1ck3',1,'一1','房屋','房','ㄈㄤˊ',['ㄈㄤˊ','ㄈㄢˊ','ㄈㄤˇ']),
 ('g1ck3',1,'一2','掃地','掃','ㄙㄠˇ',['ㄙㄠˇ','ㄙㄠˋ','ㄕㄠˇ']),
 ('g1ck3',1,'一3','瀑布','布','ㄅㄨˋ',['ㄅㄨˋ','ㄆㄨˋ','ㄅㄨˇ']),
 ('g1ck3',1,'一4','喇叭','喇','ㄌㄚˇ',['ㄌㄚ','ㄌㄚˇ','ㄌㄚˋ']),
 ('g1ck3',1,'一5','蚯蚓','蚯','ㄑㄧㄡ',['ㄑㄧㄡ','ㄐㄧㄡ','ㄑㄧㄡˊ']),
 ('g1ck3',1,'二1','手帕','手','ㄕㄡˇ',['ㄕㄡˇ','ㄙㄡˇ','ㄕㄡˊ']),
 ('g1ck3',1,'二2','小寶寶','寶','ㄅㄠˇ',['ㄅㄠˇ','ㄆㄠˇ','ㄅㄠˊ']),
 ('g1ck3',1,'二3','獅子','獅','ㄕ',['ㄕ','ㄙ','ㄕˊ']),
 ('g1ck3',1,'二4','企鵝','企鵝','ㄑㄧˋ ㄜˊ',['ㄑㄧˋ ㄜˊ','ㄑㄧˇ ㄜˊ','ㄑㄧˋ ㄜˇ']),
 ('g1ck3',1,'二5','蚊子','蚊','ㄨㄣˊ',['ㄨㄣˊ','ㄨㄥˊ','ㄨㄣˇ']),
 ('g1ck3',1,'二6','珠寶','珠','ㄓㄨ',['ㄓㄨ','ㄗㄨ','ㄓㄨˊ']),
 ('g1ck3',1,'二7','小狗','狗','ㄍㄡˇ',['ㄍㄡˇ','ㄎㄡˇ','ㄍㄡˊ']),
 ('g1ck3',1,'二8','大象','象','ㄒㄧㄤˋ',['ㄒㄧㄤˋ','ㄒㄧㄢˋ','ㄒㄧㄤˇ']),
 ('g1ck3',1,'二9','燈泡','燈','ㄉㄥ',['ㄉㄣ','ㄉㄥ','ㄊㄥ']),
 ('g1ck3',1,'二10','蜜蜂','蜂','ㄈㄥ',['ㄈㄣ','ㄈㄥ','ㄏㄥ'])]:word(source,page,loc,'pairs',w,t,a,opts)
header="import { GRADE1_CHINESE_EXTRA_EXAMS } from './grade1-chinese-extra-exams';\nimport type { LearningQuestion } from './learning';\nimport type { ExamSource } from './exam-sources';\n// Reviewed transcription. Rebuild with scripts/imports/build-grade1-chinese.py.\nconst rows = "
footer=""";
const ORIGINAL_GRADE1_CHINESE_EXAMS:LearningQuestion[]=rows.map(row=>({
 id:row.id,grade:1,subject:'chinese',course:row.course as LearningQuestion['course'],publisher:'康軒',level:1,
 examSources:[{id:row.sourceId as ExamSource['id'],page:row.page,locator:row.locator,kind:row.kind}],
 prompt:row.prompt,speechText:row.speechText,options:row.options.map(text=>({text,zy:text})),
 answer:row.answer,hint:row.hint,explanation:row.explanation,
}));
export const GRADE1_CHINESE_EXAMS = [...ORIGINAL_GRADE1_CHINESE_EXAMS, ...GRADE1_CHINESE_EXTRA_EXAMS];
"""
(ROOT/'src/grade1-chinese-exams.ts').write_text(header+json.dumps(rows,ensure_ascii=False,indent=2)+footer)
print('questions',len(rows))
