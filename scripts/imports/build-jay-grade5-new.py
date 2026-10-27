"""Append-only source import: math/social matching publishers, reviewed English U1/U2 intersections."""
from pathlib import Path
import json,hashlib,unicodedata
outdir=Path('output/jay-grade5-new');outdir.mkdir(exist_ok=True)
manifest=json.loads(Path('docs/jay-grade5-new-source-manifest.json').read_text());sources={r['tag']:r for r in manifest['sources']}
def norm(s):return ''.join(unicodedata.normalize('NFKC',s).split())
seen={};ids=set();out=[];dispositions=[]
for course in ['math','social','english']:
 for r in json.loads(Path(f'scripts/imports/jay-new-{course}.json').read_text()):
  src=sources[r['sourceTag']];assert src['course']==course;assert 1<=r['page']<=src['pages'] and r['locator'];assert all(r[k].strip() for k in ['prompt','correct','hint','explanation'])
  assert not any(w in r['prompt']+r['explanation'] for w in ['占位','請勿直接使用','候選需root'])
  key='new:'+r['sourceTag']+':'+str(r['page'])+':'+r['locator'];h=hashlib.sha256(key.encode()).hexdigest();qid='j5n-'+h[:18];assert qid not in ids;ids.add(qid)
  sig=(course,norm(r['prompt']),norm(r['correct']))
  if sig in seen:dispositions.append(dict(sourceTag=r['sourceTag'],page=r['page'],locator=r['locator'],status='duplicate',existingId=seen[sig]));continue
  seen[sig]=qid;choices=[r['correct'],*r['wrong']];assert 2<=len(choices)<=4 and len(set(map(norm,choices)))==len(choices),(qid,choices)
  offset=int(h[-4:],16)%len(choices);choices=choices[offset:]+choices[:offset]
  q=dict(id=qid,grade=5,course=course,subject=course,publisher=src['publisher'],level=2,prompt=r['prompt'],options=[dict(text=c)for c in choices],answer=choices.index(r['correct']),hint=r['hint'],explanation=r['explanation'],examSources=[dict(id='j5n-'+r['sourceTag'],page=r['page'],locator=r['locator'],kind='五上歷屆改編；必要圖表及文章已轉為題幹資料' if course!='english' else '舊版國家／交通筆試改編；Here We Go7 U1/U2交集')])
  if course=='english':assert r['unit'] in [1,2];q['curriculumMatch']='hwg7-u1-u2'
  out.append(q);dispositions.append(dict(sourceTag=r['sourceTag'],page=r['page'],locator=r['locator'],status='included',id=qid))
Path('src/grade5-new-exams.ts').write_text("import type {LearningQuestion} from './learning';\nexport const GRADE5_NEW_EXAMS: LearningQuestion[] = "+json.dumps(out,ensure_ascii=False,indent=2)+';\n')
(outdir/'candidate-dispositions.json').write_text(json.dumps(dispositions,ensure_ascii=False,indent=2)+'\n')
for c in ['math','social','english']:(outdir/('blind-'+c+'.json')).write_text(json.dumps([{k:q[k] for k in ['id','grade','course','prompt','options']} for q in out if q['course']==c],ensure_ascii=False,indent=2)+'\n')
print({'new':len(out),'byCourse':{c:sum(q['course']==c for q in out)for c in ['math','social','english']}})
