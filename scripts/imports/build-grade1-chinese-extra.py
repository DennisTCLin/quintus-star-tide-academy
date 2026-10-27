"""Reviewed phonetic adaptations; no OCR or generated pronunciation answers."""
from pathlib import Path
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[2]
Path('/tmp/g1-new').mkdir(parents=True,exist_ok=True)
raw=json.loads((ROOT/'scripts/imports/grade1-chinese-extra-curated.json').read_text())
# Existing IDs/content stay byte-for-byte stable; skip identical existing prompts.
oldtext=(ROOT/'src/grade1-chinese-exams.ts').read_text()
old=json.loads(oldtext.split('const rows = ')[1].split(';\n')[0]);oldprompts={r['prompt'] for r in old}
out={};skipped=[]
for r in raw:
 mode=r['mode'];correct=r['correct'];course={'word':'pairs','blend':'medials','tone':'tones'}[mode]
 if mode=='word':
  prompt=f'「{r["word"]}」，正確的注音是哪一個？';speech=f'{r["word"]}。請選出正確的注音。'
  explanation=f'「{r["word"]}」讀作 {correct}。';kind='原圖詞語明確命名改編／裝置朗讀，非原卷音檔'
 elif mode=='blend':
  prompt=f'{r["left"]} ＋ {r["right"]}，拼起來是哪個音？';speech='請看畫面，把兩邊的注音拼起來，選出正確的音。'
  explanation=f'{r["left"]} 和 {r["right"]} 拼起來是 {correct}。';kind='原拼音填寫改為選擇；不匯入開放造詞'
 else:
  prompt=f'「{r["word"]}」的「{r["target"]}」，注音本調是哪一個？';speech=f'{r["word"]}。請選出{r["target"]}的注音本調。'
  if r['target']=='了':speech='圓了。請選出最後一個字的注音本調。'
  explanation=f'「{r["word"]}」的「{r["target"]}」注音是 {r["syllable"]}，'+('第一聲不標調號。' if correct=='―' else f'聲調符號是 {correct}。');kind='原聲調空格改編／裝置朗讀；問注音本調'
 if prompt in oldprompts:skipped.append({'source':r['source'],'locator':r['locator'],'reason':'existing exact prompt'});continue
 if mode=='tone':opts=['―','ˊ','ˇ','ˋ','˙']
 else:
  first,*rest=correct.split(' ');base=re.sub('[ˊˇˋ˙]','',first)
  marks=['','ˋ'] if mode=='word' and r['word'] in ['洗手','老鼠','雨傘','水桶'] else ['','ˊ','ˇ','ˋ']
  wrong=[base+t+(' '+' '.join(rest) if rest else '') for t in marks if base+t!=first][:2]
  if mode=='word' and r['word'] in ['洗手','老鼠','雨傘','水桶']:
   prompt=prompt.replace('正確的注音','正確的注音本調');speech='。'.join(r['word'])+'。請選出正確的注音本調。';explanation+='兩個第三聲連讀時，前字會變調；注音仍標本調。'
  opts=[correct,*wrong]
 assert len(opts)==len(set(opts))
 key=course+':'+prompt
 ref=dict(id=f'g1cxn{r["source"]}',page=r['page'],locator=r['locator'],kind=kind)
 if key in out:out[key]['examSources'].append(ref);continue
 shift=int(hashlib.sha256(key.encode()).hexdigest()[:6],16)%len(opts);opts=opts[shift:]+opts[:shift]
 out[key]=dict(id='cxg1-new-'+hashlib.sha256(key.encode()).hexdigest()[:16],grade=1,subject='chinese',course=course,publisher='康軒',level=1,prompt=prompt,speechText=speech,options=[dict(text=t,zy=t) for t in opts],answer=opts.index(correct),hint='先聽清楚詞語，再比較每個注音與聲調。' if mode=='word' else '先仔細比較題目中的注音與聲調。',explanation=explanation,examSources=[ref])
rows=list(out.values())
(ROOT/'src/grade1-chinese-extra-exams.ts').write_text("import type {LearningQuestion} from './learning';\n// Rebuild: scripts/imports/build-grade1-chinese-extra.py\nexport const GRADE1_CHINESE_EXTRA_EXAMS: LearningQuestion[] = "+json.dumps(rows,ensure_ascii=False,indent=2)+';\n')
Path('/tmp/g1-new/selection.json').write_text(json.dumps({'counts':{c:sum(r['course']==c for r in rows) for c in ['pairs','medials','tones']},'skipped':skipped},ensure_ascii=False,indent=2))
Path('/tmp/g1-new/blind.json').write_text(json.dumps([{k:v for k,v in r.items() if k not in ['answer','explanation','hint']} for r in rows],ensure_ascii=False,indent=2))
print('new',len(rows),'skipped existing',len(skipped))
