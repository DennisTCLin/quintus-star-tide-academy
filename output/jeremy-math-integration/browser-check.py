"""Run only against the task-owned localhost PostgreSQL QA server; uses synthetic accounts."""
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,os,subprocess,uuid,time
BASE='http://127.0.0.1:47826';OUT=Path('output/jeremy-math-integration');checks=[];errors=[];teardown_errors=[]
DB='star_tide_jeremy_browser_20261026';PSQL='/opt/homebrew/opt/postgresql@17/bin/psql';PASSWORD=os.environ['MATH_QA_PASSWORD']
NAMES=['一年級','二年級','三年級','四年級','五年級','六年級']
def watch(page):
 page._qa_checking=True
 def receive(error):
  (errors if page._qa_checking else teardown_errors).append({'message':str(error),'stack':error.stack,'url':page.url,'lastCheck':checks[-1]['name'] if checks else ''})
 page.on('pageerror',receive)
def record(name,**extra):checks.append(dict(name=name,**extra));print('PASS',name,flush=True)
def raw(grade):
 q="SELECT family FROM game_states WHERE account_id=(SELECT account_id FROM player_logins WHERE username='mathqa_g%d')"%grade
 return json.loads(subprocess.check_output([PSQL,'-h','127.0.0.1','-p','55432','-d',DB,'-At','-c',q]))
def state(c):
 r=c.request.get(BASE+'/api/state');assert r.status==200;return r.json()
def command(c,**cmd):
 s=state(c);r=c.request.post(BASE+'/api/command',headers={'Origin':BASE,'X-CSRF-Token':s['csrf']},data={'id':str(uuid.uuid4()),'revision':s['family']['revision'],'command':cmd});assert r.status==200,(cmd,r.status,r.text());return r.json()
def login(browser,grade,width=393,height=852):
 c=browser.new_context(viewport={'width':width,'height':height},has_touch=True,reduced_motion='reduce');r=c.request.post(BASE+'/api/login',headers={'Origin':BASE},data={'username':'mathqa_g'+str(grade),'password':PASSWORD});assert r.status==200,r.text();return c
def open_math(page):
 page.goto(BASE,wait_until='networkidle');page.locator('.island-course-details > summary').click();page.get_by_role('button',name='去數學島',exact=True).click();page.locator('#math-island[data-screen=map]').wait_for()
def layout(page,label):
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),label
 bad=page.locator('#math-island button').evaluate_all('(xs)=>xs.filter(e=>e.getClientRects().length).map(e=>({text:e.getAttribute("aria-label")||e.textContent,x:e.getBoundingClientRect().left,r:e.getBoundingClientRect().right})).filter(e=>e.x < -1 || e.r > innerWidth+1)')
 assert not bad,(label,bad)
def wait_idle(page):
 page.wait_for_function('()=>!document.querySelector("#math-island .isl-next:disabled")')
def skip_demos(page):
 page.locator('#math-island .isl-lesson, #math-island .isl-upper').first.wait_for()
 if page.locator('.isl-lesson').count():
  page.locator('.isl-lesson > .isl-actions button').last.click();page.locator('.isl-q').wait_for()
def answer_upper(page,c,grade,player,wrong=False):
 skip_demos(page)
 while page.locator('.isl-upper .isl-action').count():page.locator('.isl-upper .isl-action').click()
 page.locator('.isl-upper-option').first.wait_for();r=raw(grade)['profiles'][player]['mathIsland']['run'];index=len(r['answers']);q=r['items'][index];choice=q['answer']
 if wrong:
  bad=next(x for x in q['choices'] if x!=choice);page.locator('.isl-upper-option').nth(int(bad)-1).click();page.wait_for_function('()=>document.querySelector(".isl-upper-option.wrong")')
  evidence=raw(grade)['profiles'][player]['mathIsland'];assert evidence['recent'][q['k']][-1] is False
 page.locator('.isl-upper-option').nth(int(choice)-1).click();page.locator('.isl-next').wait_for();expect(page.locator('.isl-next')).to_be_enabled()
 if wrong:
  now=raw(grade)['profiles'][player]['mathIsland'];assert now['recent']==evidence['recent'] and len(now['run']['answers'])==index+1
 layout(page,'answer cards');page.locator('.isl-next').click();page.wait_for_function('()=>!document.querySelector(".isl-next")')
with sync_playwright() as pw:
 for engine in ['chromium','webkit']:
  browser=getattr(pw,engine).launch(headless=True)
  c=login(browser,4);page=c.new_page();watch(page);open_math(page)
  for width,height in [(320,740),(393,852),(768,1024),(834,1194),(1024,768),(1440,900)]:
   page.set_viewport_size({'width':width,'height':height})
   for grade,name in enumerate(NAMES,1):
    page.locator('.isl-grade-buttons').get_by_role('button',name=name,exact=True).click();layout(page,f'{engine}-{width}-grade{grade}');assert page.locator('.isl-isle').count() in [8,9,10]
   record(f'{engine} six grade maps at {width}px')
  page.screenshot(path=str(OUT/(engine+'-tablet-map.png')),full_page=True);page._qa_checking=False;c.close()
  c=login(browser,5);page=c.new_page();watch(page)
  # This QA account may contain the initial reconnaissance round; release only that synthetic round.
  s=state(c);p=s['family']['profiles']['jay'];r=p.get('mathIsland',{}).get('run')
  if r and not r['completed']:command(c,type='island-quit',player='jay',runId=r['id'])
  before=raw(5)['profiles'];open_math(page);page.locator('.isl-isle').first.click();page.locator('.isl-stagebtn').first.click();page.locator('.isl-lesson').wait_for()
  page.get_by_role('button',name='暫停',exact=True).click();step=page.locator('.isl-lesson-frame').get_attribute('data-step');page.wait_for_timeout(1100);assert page.locator('.isl-lesson-frame').get_attribute('data-step')==step
  page.get_by_role('button',name='下一步教學',exact=True).click();expect(page.locator('.isl-lesson-frame')).to_have_attribute('data-step',str(int(step)+1));page.get_by_role('button',name='上一步教學',exact=True).click();expect(page.locator('.isl-lesson-frame')).to_have_attribute('data-step',step);page.get_by_role('button',name='從頭看',exact=True).click();expect(page.locator('.isl-lesson-frame')).to_have_attribute('data-step','0');layout(page,'lesson controls');record(engine+' teaching pause, replay and step controls')
  for i in range(6):answer_upper(page,c,5,'jay',wrong=(i==0))
  page.locator('#math-island[data-screen=result]').wait_for();assert raw(5)['profiles']['jay']['mathIsland']['units']['5A-01']['learn'];record(engine+' six-question teaching, wrong-first correction and mastery')
  page.get_by_role('button',name='下一關：玩一玩',exact=False).click()
  for i in range(6):answer_upper(page,c,5,'jay')
  page.locator('#math-island[data-screen=result]').wait_for();assert raw(5)['profiles']['jay']['mathIsland']['units']['5A-01']['play'];page.get_by_role('button',name='下一關：挑戰神獸',exact=False).click()
  for i in range(6):answer_upper(page,c,5,'jay')
  page.locator('#math-island[data-screen=result]').wait_for();p=raw(5)['profiles']['jay'];assert p['mathIsland']['units']['5A-01']['boss']==1;assert p['rewardRounds']>=2 and p['rewardStars']+2*p['tickets']>=1;record(engine+' practice, guardian completion and persisted rewards')
  page.screenshot(path=str(OUT/(engine+'-phone-result.png')),full_page=True);page.get_by_role('button',name='回地圖',exact=False).click();page.locator('.isl-isle').nth(1).click();page.locator('.isl-stagebtn').first.click();answer_upper(page,c,5,'jay');saved=raw(5)['profiles']['jay'];run_id=saved['mathIsland']['run']['id'];assert len(saved['mathIsland']['run']['answers'])==1
  page._qa_checking=False;page.reload(wait_until='networkidle');page._qa_checking=True;page.get_by_role('button',name='繼續挑戰',exact=True).click();page.locator('.isl-current-island').get_by_role('button',name='繼續玩',exact=False).click();page.locator('#math-island[data-screen=round]').wait_for();assert raw(5)['profiles']['jay']['mathIsland']['run']['id']==run_id;record(engine+' reload resumes same saved question')
  page.get_by_role('button',name='換小島',exact=True).click();page.locator('.isl-isle').nth(2).click();page.locator('.isl-switch-dialog[open]').wait_for();page.get_by_role('button',name='先不要',exact=True).click();assert raw(5)['profiles']['jay']['mathIsland']['run']['id']==run_id
  page.locator('.isl-isle').nth(2).click();page.locator('.isl-switch-dialog').get_by_role('button',name='換小島',exact=True).click();page.locator('#math-island[data-screen=round]').wait_for();after=raw(5)['profiles']['jay'];assert after['mathIsland']['run']['unit']=='5A-03' and after['coins']==saved['coins'];assert after['mathIsland']['units']==saved['mathIsland']['units'];assert after['mathIsland']['stats']==saved['mathIsland']['stats'];record(engine+' switch confirmation retains earned progress and rewards')
  page.locator('.isl-journey').get_by_role('button',name='換小島',exact=True).click();page.get_by_role('button',name='回港口',exact=False).click();page.locator('.archipelago-scene').wait_for();assert page.locator('.archipelago-stop').count()==5;assert page.locator('.tide-launch').is_visible();page.get_by_role('button',name='夥伴',exact=True).click();page.wait_for_timeout(100);page.get_by_role('button',name='扭蛋',exact=True).click();page.wait_for_timeout(100);record(engine+' home animated islands, companion launcher, collection and lottery retained')
  final=raw(5)['profiles'];assert all(before[k]==final[k] for k in before if k!='jay');record(engine+' other players unchanged');page._qa_checking=False;c.close();browser.close()
 assert not errors,errors
 assert all('/api/state due to access control checks.' in e['message'] for e in teardown_errors),teardown_errors
 OUT.joinpath('browser-results.json').write_text(json.dumps({'pass':True,'checks':checks,'pageErrors':errors,'contextTeardownErrors':teardown_errors,'realLocalPostgres':True,'physicalDevice':False,'productionMutations':False},ensure_ascii=False,indent=2)+'\n')
