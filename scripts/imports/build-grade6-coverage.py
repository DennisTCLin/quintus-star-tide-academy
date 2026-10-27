"""Normalize independently reviewed source inventories into a reproducible disposition ledger."""
import json, hashlib, collections
from pathlib import Path
root=Path(__file__).resolve().parents[2]
def read(p):return json.loads((root/p).read_text())
def write(p,x):(root/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
records=[]
sources=read('output/grade6-completion/source-pages.json')
# IDs come from the generated bank so exact prompt deduplication resolves to the retained ID.
text=(root/'src/grade6-supplement-exams.ts').read_text()
bank=json.loads(text[text.index('= [')+2:].strip().removesuffix(';'))
lookup={(s['id'],s['locator']):q['id'] for q in bank for s in q['examSources']}
for course,prefix in [('chinese','g6c'),('social','g6so'),('science','g6sc')]:
 raw=read(f'output/grade6-completion/{course}-coverage-raw.json')
 rows=raw['records'] if isinstance(raw,dict) else raw
 for r in rows:
  sid=prefix+str(r['source']);out=dict(r,source=sid)
  if r['status']=='duplicate_answer_sheet':
   next(s for s in sources if s['id']==sid).setdefault('administrativePages',[]).append({'page':r['page'],'reason':r['reason']});continue
  canonical=out.pop('canonical',None)
  if canonical is None and 'canonicalLocator' in out:
   canonical={'source':out.pop('canonicalSource',r['source']),'locator':out.pop('canonicalLocator')}
  if r['status'] in ('existing','candidate'):
   target=canonical or r
   out['status']='included';out['questionId']=lookup[(prefix+str(target['source']),target['locator'])]
  elif r['status']=='duplicate':
   assert canonical,r
   key=(prefix+str(canonical['source']),canonical['locator'])
   out['duplicateOf']=lookup.get(key,':'.join(key))
  elif course=='social' and r['status']=='missing_image':
   out['status']='requires_image_asset'
  records.append(out)
for s in sources:s['itemCount']=sum(r['source']==s['id'] for r in records)
ledger={'version':1,'scope':'Parent-provided grade-six historical exams; one record per original response unit, not per generated question. Blank answer sheets excluded.','sources':sources,'records':records}
write('docs/content-review/grade6-coverage.json',ledger)
counts=collections.Counter(r['status'] for r in records)
write('output/grade6-completion/coverage-summary.json',{'sources':len(sources),'responseUnits':len(records),'questions':len(bank),'dispositions':dict(counts),'byCourse':{c:sum(q['course']==c for q in bank) for c in ('chinese','social','science')}})
lines=['# 六年級題庫：待補與疑義清單','','來源已有圖片、但尚未轉成網站圖資者標為 `requires_image_asset`；不代表原卷遺失圖片。重複題對應與全部逐題處置見同目錄 `grade6-coverage.json`。','']
for status in ('requires_image_asset','missing_image','missing_passage','ambiguous','outdated','pending_verification','open_ended'):
 pending=[r for r in records if r['status']==status]
 if not pending:continue
 lines += [f'## {status}（{len(pending)} 個原始作答單位）','','| 來源／頁／題 | 原題要求 | 待補原因 |','| --- | --- | --- |']
 for r in pending:
  clean=lambda x:str(x).replace('|','／').replace('\n',' ')
  lines.append(f"| {r['source']} / {r.get('page') or 'Word'} / {clean(r['locator'])} | {clean(r.get('originalSummary',''))} | {clean(r['reason'])} |")
 lines.append('')
(root/'docs/content-review/grade6-completion-pending.md').write_text('\n'.join(lines)+'\n')
print(dict(counts))
