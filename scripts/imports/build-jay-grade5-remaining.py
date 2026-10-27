"""Root-curated continuation. Published first-wave questions and IDs are immutable."""
from pathlib import Path
import json,hashlib,re,unicodedata
base=Path('src/grade5-dongmen-exams.ts').read_text();published=json.loads(base[base.index('= ')+2:].rstrip().removesuffix(';'))
source_manifest=json.loads(Path('docs/jay-grade5-source-manifest.json').read_text());courses={'國語':'chinese','自然':'science','英語':'english'};source_course={r['index']:courses.get(r['subject']) for r in source_manifest['sources']}
def norm(s):return ''.join(unicodedata.normalize('NFKC',s).split())
def signature(q):
 prompt=q['prompt'];correct=q['options'][q['answer']]['text'];m=re.search(r'「([^」]+)」中「([^」]+)」.*(?:讀|音)',prompt)
 if m and len(m[2])==1:return (q['course'],'phonetic',m[2],correct)
 if len(correct)<=6 and re.search(r'寫法|應改|正確詞|修正|應改成',prompt):return(q['course'],'spelling',correct)
 return(q['course'],'exact',norm(prompt),norm(correct))
seen={signature(q):q['id'] for q in published};out=[];disposition=[];candidates=[];keys=set()
paths=sorted(Path('scripts/imports').glob('jay-remaining-*.json'))+[Path('scripts/imports/jay-grade5-remaining-root.json')]
# Retain existing candidate identities when adding equivalent sources later.
previous_ids=set()
target=Path('src/grade5-remaining-exams.ts')
if target.exists():
 t=target.read_text();previous_ids={q['id'] for q in json.loads(t[t.index('= ')+2:].rstrip().removesuffix(';'))}
for path in paths:
 for r in json.loads(path.read_text()):
  if isinstance(r,list):source,page,loc,prompt,correct,wrong,hint,explanation=r;course=source_course[source]
  else:source,page,loc,prompt,correct,wrong,hint,explanation=[r[k] for k in ['sourceIndex','page','locator','prompt','correct','wrong','hint','explanation']];course=r['course']
  assert course in ['chinese','science','english'] and source not in range(11,31)
  key=f'remaining:{course}:{source}:{page}:{loc}';qid='j5-'+hashlib.sha256(key.encode()).hexdigest()[:18];assert qid not in keys,(qid,path);keys.add(qid)
  assert not re.search(r'占位|不是本答案|候選需root|請勿直接使用',prompt+correct+explanation)
  choices=[correct,*wrong];assert 2<=len(choices)<=4 and len(set(map(norm,choices)))==len(choices),(qid,choices)
  offset=int(hashlib.sha256(key.encode()).hexdigest()[-4:],16)%len(choices);choices=choices[offset:]+choices[:offset]
  q=dict(id=qid,grade=5,course=course,subject=course,publisher='翰林',level=2,prompt=prompt,options=[{'text':s} for s in choices],answer=choices.index(correct),hint=hint,explanation=explanation,examSources=[dict(id=f'j5s{source}',page=page,locator=loc,kind='歷屆續批改編；必要文章與圖表資料已補齊')])
  candidates.append((qid in previous_ids,q,source,page,loc))
for _,q,source,page,loc in sorted(candidates,key=lambda x:(not x[0],x[2],x[3],x[4])):
 sig=signature(q)
 if sig in seen:
  disposition.append(dict(source=source,page=page,locator=loc,status='duplicate-learning-target',existingId=seen[sig]));continue
 seen[sig]=q['id'];out.append(q);disposition.append(dict(source=source,page=page,locator=loc,status='included',id=q['id']))
target.write_text("import type {LearningQuestion} from './learning';\nexport const GRADE5_REMAINING_EXAMS: LearningQuestion[] = "+json.dumps(out,ensure_ascii=False,indent=2)+';\n')
Path('output/jay-grade5-remaining/candidate-dispositions.json').write_text(json.dumps(disposition,ensure_ascii=False,indent=2)+'\n')
for course in ['chinese','science','english']:
 blind=[{k:q[k] for k in ['id','grade','course','prompt','options']} for q in out if q['course']==course]
 Path(f'output/jay-grade5-remaining/blind-{course}.json').write_text(json.dumps(blind,ensure_ascii=False,indent=2)+'\n')
print({'new':len(out),'candidates':len(candidates),'byCourse':{c:sum(q['course']==c for q in out) for c in ['chinese','science','english']},'deduplicated':len(candidates)-len(out)})
