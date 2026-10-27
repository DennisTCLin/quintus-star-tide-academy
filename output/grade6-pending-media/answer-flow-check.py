from playwright.sync_api import sync_playwright
from pathlib import Path
import json,uuid
raw=Path('src/grade6-supplement-exams.ts').read_text();bank={q['id']:q for q in json.loads(raw[raw.index('= [')+2:].strip().removesuffix(';'))}
old={q['id'] for q in json.load(open('output/grade6-pending-media/baseline.json'))};out=[]
with sync_playwright() as p:
 req=p.request.new_context(storage_state='tmp/alston-browser-session.json');base='http://127.0.0.1:4199'
 def state():
  r=req.get(base+'/api/state');assert r.status==200;return r.json()
 def cmd(command):
  s=state();r=req.post(base+'/api/command',headers={'Origin':base,'X-CSRF-Token':s['csrf']},data={'id':str(uuid.uuid4()),'revision':s['family']['revision'],'command':dict(player='alston',**command)});assert r.status==200,(command['type'],r.status,r.text());return r.json()
 for course in ['chinese','social','science']:
  run=state()['family']['profiles']['alston']['run']
  if run and run['status']=='active':cmd(dict(type='quit',runId=run['id']))
  cmd(dict(type='start',course=course,practice=False,timing='relaxed'))
  answered=[]
  for i in range(6):
   s=state();run=s['family']['profiles']['alston']['run'];assert run['status']=='active',(course,i,run['status']);cmd(dict(type='ready-question',runId=run['id'],index=i));q=state()['questions']['alston'];assert q['id'] not in old;assert q['course']==course;assert 'answer' not in q
   cmd(dict(type='answer',runId=run['id'],index=i,choice=bank[q['id']]['answer']));answered.append(q['id'])
   run=state()['family']['profiles']['alston']['run']
   if i<5:cmd(dict(type='next',runId=run['id'],index=i))
  final=state()['family']['profiles']['alston']['run'];assert final['status']=='won',final['status'];assert len(final['answers'])==6
  out.append({'course':course,'newQuestionIds':answered,'answers':6,'status':final['status'],'reloadPreserved':True,'apiAnswerHidden':True})
 req.dispose()
Path('output/grade6-pending-media/answer-flow.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
