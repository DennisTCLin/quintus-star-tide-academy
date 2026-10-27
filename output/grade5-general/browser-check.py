# Synthetic account in task-owned local PostgreSQL only; never run against production.
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,uuid
base='http://127.0.0.1:47739';bank=json.load(open('/tmp/grade5-general-bank.json'));results=[]
with sync_playwright() as p:
 b=p.webkit.launch(headless=True);c=b.new_context(viewport={'width':834,'height':1194},reduced_motion='reduce')
 login=c.request.post(base+'/api/login',headers={'Origin':base},data={'username':'jayqa','password':'7722'});assert login.status==200
 def state():
  r=c.request.get(base+'/api/state');assert r.status==200;return r.json()
 def cmd(command):
  s=state();r=c.request.post(base+'/api/command',headers={'Origin':base,'X-CSRF-Token':s['csrf']},data={'id':str(uuid.uuid4()),'revision':s['family']['revision'],'command':dict(player='jay',**command)});assert r.status==200,(command,r.status,r.text());return r.json()
 before=state()['family']['profiles'];page=c.new_page();page.goto(base,wait_until='networkidle');assert page.locator('.subject-island-card').count()==5
 for width,height in [(393,852),(834,1194)]:
  page.set_viewport_size({'width':width,'height':height});page.locator('.archipelago-scene').scroll_into_view_if_needed();assert page.locator('.archipelago-stop').count()==5;assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');page.screenshot(path=f'output/grade5-general/five-islands-{width}.png')
 page.close()
 for course,label in [('math','數學'),('chinese','國語'),('english','英文'),('science','自然'),('social','社會')]:
  run=state()['family']['profiles']['jay']['run']
  if run and run['status']=='active':cmd(dict(type='quit',runId=run['id']))
  cmd(dict(type='start',course=course,practice=False,timing='relaxed'));ids=[]
  for i in range(6):
   s=state();r=s['family']['profiles']['jay']['run'];cmd(dict(type='ready-question',runId=r['id'],index=i));q=state()['questions']['jay'];assert q['grade']==5 and q['course']==course and 'answer' not in q and 'explanation' not in q
   if course!='math':assert q['id'].startswith('g5-general-')
   if i==0:
    page=c.new_page();page.goto(base,wait_until='networkidle');page.get_by_role('button',name='繼續挑戰',exact=True).click();page.locator('[data-answer-option]').first.wait_for();assert page.locator('[data-answer-option]').count()==4;assert q['prompt'] in page.locator('body').inner_text();page.screenshot(path=f'output/grade5-general/{course}-question.png',full_page=True);page.close()
   cmd(dict(type='answer',runId=r['id'],index=i,choice=bank[q['id']]['answer']));ids.append(q['id'])
   if i<5:cmd(dict(type='next',runId=r['id'],index=i))
  done=state()['family']['profiles']['jay']['run'];assert done['status']=='won' and len(done['answers'])==6
  results.append({'course':course,'questionIds':ids,'status':'won','reloadPreserved':True,'answerAndExplanationHiddenBeforeAnswer':True})
 after=state()['family']['profiles']
 for who in before:
  if who!='jay':assert before[who]==after[who],who
 c.request.post(base+'/api/logout',headers={'Origin':base,'X-CSRF-Token':state()['csrf']},data={});b.close()
report={'realLocalPostgres':True,'physicalDevice':False,'fiveIslands':True,'widths':[393,834],'otherProfilesUnchanged':True,'courses':results};Path('output/grade5-general/browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
