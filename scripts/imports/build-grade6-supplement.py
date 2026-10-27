"""Curated, self-contained adaptations of parent-provided grade-six exam sources."""
from pathlib import Path
import json, hashlib, unicodedata
seen_ids=set()
rows=[]
for course,prefix,publisher in [('chinese','g6c','康軒'),('social','g6so','康軒'),('science','g6sc','翰林')]:
    source=Path(f'scripts/imports/grade6-{course}-curated.json')
    if not source.exists():continue
    for r in json.loads(source.read_text()):
        opts=[r['correct'],*r['wrong']]
        assert len(opts)>=3 and len(opts)==len(set(opts)),r
        key=f"{prefix}:{r['source']}:{r['locator']}"+r.get('idSuffix','')
        assert key not in seen_ids, f'Duplicate source locator: {key}'
        seen_ids.add(key)
        shift=int(hashlib.sha256(key.encode()).hexdigest()[:4],16)%len(opts)
        opts=opts[shift:]+opts[:shift]
        rows.append(dict(id=prefix+'-'+hashlib.sha256(key.encode()).hexdigest()[:18],grade=6,course=course,subject=course,publisher=publisher,level=r.get('level',2),prompt=r['prompt'],options=[{'text':s} for s in opts],answer=opts.index(r['correct']),hint=r.get('hint','先找題目中的關鍵資訊，再逐一比較選項。'),explanation=r['explanation'],examSources=[dict(id=f"{prefix}{r['source']}",page=r['page'],locator=r['locator'],kind='原卷圖資與文字改編；必要情境已補齊' if r.get('image') else '歷屆文字改編；必要情境已補齊')]))
        if r.get('retired'):
            rows[-1].update(retired=True,retirementReason=r['retirementReason'],examSources=[])
        if r.get('image'):
            rows[-1]['image']=r['image']
            rows[-1]['imageAlt']=r['imageAlt']
unique={}
for r in rows:
    normalize=lambda text: ''.join(unicodedata.normalize('NFKC',text).split())
    key=(r['course'],normalize(r['prompt']),normalize(r['options'][r['answer']]['text']),r.get('image'),r.get('retired',False))
    if key in unique:unique[key]['examSources'].extend(r['examSources'])
    else:unique[key]=r
out=list(unique.values())
Path('src/grade6-supplement-exams.ts').write_text("import type {LearningQuestion} from './learning';\nexport const GRADE6_SUPPLEMENT_EXAMS: LearningQuestion[] = "+json.dumps(out,ensure_ascii=False,indent=2)+';\n')
print({c:sum(r['course']==c for r in out) for c in ['chinese','social','science']})
