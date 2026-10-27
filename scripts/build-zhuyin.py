"""Build-time dictionary only; runtime has no dictionary service or Python dependency.
Requires pypinyin==0.55.0. Child-facing question pronunciations remain curated.
"""
import json,re
from pathlib import Path
from pypinyin import lazy_pinyin,Style
# Scan every maintained TypeScript module: generators/catalogues contain UI text too.
sources=sorted(p for p in Path('src').rglob('*')
 if p.suffix in {'.ts','.tsx'} and '__tests__' not in p.parts and 'vendor' not in p.parts and not p.name.endswith('.d.ts'))
reviewed=json.loads(Path('src/data/taiwan-zhuyin-overrides.json').read_text())
runs=set()
for path in sources:runs.update(re.findall(r'[\u3400-\u9fff]+',path.read_text()))
math_path=Path('curriculum/hanlin_elementary_math_curriculum.json')
if math_path.exists():
 for book in json.loads(math_path.read_text())['books']:
  for unit in book['units']:
   for text in [unit['title'],*unit['sections'],*unit['concepts']]:
    runs.update(re.findall(r'[\u3400-\u9fff]+',text))
garden=json.loads(Path('src/data/garden.json').read_text())
for t in garden['themes']:
 for x in t['items']:runs.add(x['word'])
for group in ['tones','medials','pairs']:
 for x in garden[group]:runs.add(x['word'])
phrases={s:lazy_pinyin(s,style=Style.BOPOMOFO) for s in sorted(runs) if len(s)>1}
chars={c:lazy_pinyin(c,style=Style.BOPOMOFO)[0] for c in sorted(set(''.join(runs)))}
# Taiwanese UI readings and context-sensitive polyphones; curated word corpus wins.
overrides={'家長':'ㄐㄧㄚ ㄓㄤˇ','成長':'ㄔㄥˊ ㄓㄤˇ','同行':'ㄊㄨㄥˊ ㄒㄧㄥˊ','航行':'ㄏㄤˊ ㄒㄧㄥˊ','一行':'ㄧˋ ㄏㄤˊ','銀行':'ㄧㄣˊ ㄏㄤˊ','重新':'ㄔㄨㄥˊ ㄒㄧㄣ','重複':'ㄔㄨㄥˊ ㄈㄨˋ','重試':'ㄔㄨㄥˊ ㄕˋ','重開':'ㄔㄨㄥˊ ㄎㄞ','重點':'ㄓㄨㄥˋ ㄉㄧㄢˇ','角色':'ㄐㄩㄝˊ ㄙㄜˋ','夥伴':'ㄏㄨㄛˇ ㄅㄢˋ','獎勵':'ㄐㄧㄤˇ ㄌㄧˋ','回復':'ㄏㄨㄟˊ ㄈㄨˋ','對應':'ㄉㄨㄟˋ ㄧㄥˋ','斐斐':'ㄈㄟˇ ㄈㄟˇ','晴晴':'ㄑㄧㄥˊ ㄑㄧㄥˊ','星潮':'ㄒㄧㄥ ㄔㄠˊ','什麼':'ㄕㄣˊ ˙ㄇㄜ','還原':'ㄏㄨㄢˊ ㄩㄢˊ','還有':'ㄏㄞˊ ㄧㄡˇ','還在':'ㄏㄞˊ ㄗㄞˋ','倒數':'ㄉㄠˋ ㄕㄨˇ','數學':'ㄕㄨˋ ㄒㄩㄝˊ','數一數':'ㄕㄨˇ ㄧˋ ㄕㄨˇ'}
overrides.update({'荳荳':'ㄉㄡˋ ㄉㄡˋ','挑戰':'ㄊㄧㄠˇ ㄓㄢˋ','累積':'ㄌㄟˇ ㄐㄧ','仔細':'ㄗˇ ㄒㄧˋ','處理':'ㄔㄨˇ ㄌㄧˇ','調整':'ㄊㄧㄠˊ ㄓㄥˇ'})
overrides.update({'五行':'ㄨˇ ㄒㄧㄥˊ'})
overrides.update({'還是':'ㄏㄞˊ ㄕˋ','一顆':'ㄧˋ ㄎㄜ','一張':'ㄧˋ ㄓㄤ','一半':'ㄧˊ ㄅㄢˋ','一個':'ㄧˊ ㄍㄜˋ','一定':'ㄧˊ ㄉㄧㄥˋ'})
for t in json.loads(Path('src/data/garden.json').read_text())['themes']:
 for x in t['items']:overrides[x['word']]=x['zy']
# Curated Taiwanese readings also correct generated full-sentence entries.
# Rewrite only known wrong readings, preserving e.g. 識's ㄓˋ polyphone.
for c,rule in reviewed['characterReadings'].items():
 if chars.get(c) in rule['from']:chars[c]=rule['to']
 for s,zs in phrases.items():
  for i,ch in enumerate(s):
   if ch==c and zs[i] in rule['from']:zs[i]=rule['to']
overrides.update({s:' '.join(z) for s,z in reviewed['phrases'].items()})
for word,reading in overrides.items():
 if len(word)!=len(reading.split()):raise ValueError(f'Invalid syllable count: {word}')
# Apply short phrase overrides inside generated sentence runs as well.
for s in phrases:
 for word,reading in sorted(overrides.items(),key=lambda x:len(x[0])):
  for match in re.finditer(re.escape(word),s):phrases[s][match.start():match.end()]=reading.split()
phrases.update({s:z.split() for s,z in overrides.items()})
# Written numeral annotations use the dictionary base tone consistently.
for s,zs in phrases.items():
 for i,c in enumerate(s):
  if c=='一':zs[i]='ㄧ'
  elif c=='不' and zs[i]=='ㄅㄨˊ':zs[i]='ㄅㄨˋ'
chars.update({'的':'˙ㄉㄜ','了':'˙ㄌㄜ','著':'˙ㄓㄜ','們':'˙ㄇㄣ','得':'˙ㄉㄜ'})
# Taiwan notation places the neutral-tone dot before the syllable.
normalize=lambda z:'˙'+z[:-1] if z.endswith('˙') else z
phrases={s:[normalize(z) for z in zs] for s,zs in phrases.items()}
chars={s:normalize(z) for s,z in chars.items()}
for s,zs in phrases.items():
 if len(s)!=len(zs):raise ValueError(f'Invalid generated syllable count: {s}')
Path('src/data/interface-zhuyin.json').write_text(json.dumps({'phrases':phrases,'chars':chars},ensure_ascii=False,separators=(',',':')))
print(f'{len(phrases)} phrases, {len(chars)} characters')
