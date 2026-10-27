"""Real fourth-voyage rewards and isolated visual fixtures; never logs in real players."""
import os,json,subprocess,uuid,copy,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect,TimeoutError as PlaywrightTimeoutError
BASE=os.getenv('LEARNING_QA_URL','http://127.0.0.1:4301').rstrip('/')
OUT=Path(os.getenv('LEARNING_QA_OUT','outputs/learning-building-rewards'));OUT.mkdir(parents=True,exist_ok=True)
errors=[];checks=[];retries=[]
def correct(q):return int(subprocess.check_output(['node','--input-type=module','-e',"import{questionById}from'./build/game.mjs';console.log(questionById(process.argv[1]).answer)",q['id']],text=True))
def act(page,fn):
 for attempt in range(3):
  sent=[]
  def track(r):
   if r.url.endswith('/api/command'):sent.append(r.post_data_json['id'])
  page.on('request',track)
  try:
   with page.expect_response(lambda r:r.url.endswith('/api/command'),timeout=15000) as response:fn()
   r=response.value;assert r.ok,r.text();return r.json()
  except PlaywrightTimeoutError:
   if not sent and any('正在同步' in t for t in page.locator('.notice').all_inner_texts()):retries.append(attempt);continue
   page.screenshot(path=str(OUT/'failure.png'),full_page=True);raise
  finally:page.remove_listener('request',track)
 raise AssertionError('sync busy after3 attempts')
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='chrome',headless=True)
 a=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce');creds={'username':'qa_buildlearn_'+uuid.uuid4().hex[:10],'password':'isolated-building-learning-2026'};headers={'Origin':BASE}
 r=a.request.post(BASE+'/api/register',data=creds,headers=headers);assert r.ok,r.text();state=r.json()
 def command(c):
  global state
  r=a.request.post(BASE+'/api/command',data={'id':str(uuid.uuid4()),'revision':state['family']['revision'],'command':{'player':'quintus',**c}},headers={**headers,'X-CSRF-Token':state['csrf']});assert r.ok,r.text();state=r.json();return state
 command({'type':'starter-draw'});command({'type':'starter-confirm'});original=copy.deepcopy(state['family']['profiles'])
 for round in range(3):
  command({'type':'start','course':'math','practice':False})
  for i in range(5):
   run=state['family']['profiles']['quintus']['run'];q=state['questions']['quintus'];command({'type':'answer','runId':run['id'],'index':i,'choice':correct(q)})
   if i<4:command({'type':'next','runId':run['id'],'index':i})
  command({'type':'claim-reward','runId':run['id'],'choice':'save'})
 p=state['family']['profiles']['quintus'];pet=p['equipped'];assert p['growth']['xp'][pet]==150;assert p['learningRewards']['pending']=={'wood':60,'stone':36,'star':18};assert p['rewardRounds']==3
 # The first three voyages may now legitimately tame monsters; retain those too.
 owned_before_fourth=copy.deepcopy(p['owned'])
 for key,count in original['quintus']['owned'].items():assert owned_before_fourth[key]==count
 page=a.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE,wait_until='networkidle');page.locator('.player-quintus').click()
 state=act(page,lambda:page.locator('.learning-build-goal select').select_option('grove'));expect(page.locator('.learning-build-notice')).to_contain_text('已儲存')
 state=act(page,lambda:page.locator('.training-start').click())
 for i in range(5):
  q=state['questions']['quintus'];state=act(page,lambda:page.locator('.answer-grid [data-answer-option]').nth(correct(q)).click())
  if i<4:state=act(page,lambda:page.get_by_role('button',name='➜ 下一題',exact=True).click())
 p=state['family']['profiles']['quintus'];assert p['growth']['xp'][pet]==200;assert p['run']['encounter']['earned']==50;assert p['rewardRounds']==3;assert p['run']['reward']=='none';assert p['learningRewards']['pending']=={'wood':80,'stone':48,'star':24}
 expect(page.locator('.learning-build-notice')).to_contain_text('收到 1 份建材，累計 4 份')
 expect(page.get_by_role('button',name='繼續學習',exact=True)).to_be_enabled()
 expect(page.get_by_role('button',name='休息一下',exact=True)).to_be_visible();page.screenshot(path=str(OUT/'fourth-voyage.png'),full_page=True)
 checks.append('fourth voyage +50XP and fourth material pack; finish rewards remain3')
 page.get_by_role('button',name='休息一下',exact=True).click();expect(page.locator('.training-panel')).to_be_visible()
 page.locator('.learning-build-footer button').click();expect(page.get_by_role('button',name='開啟我的領地')).to_be_visible();state=act(page,lambda:page.get_by_role('button',name='開啟我的領地').click())
 p=state['family']['profiles']['quintus'];assert p['territory']['resources']=={'wood':260,'stone':198,'star':114};assert p['learningRewards']['pending']=={'wood':0,'stone':0,'star':0}
 state=act(page,lambda:page.get_by_role('button',name='確認建造',exact=True).click());assert len(state['family']['profiles']['quintus']['territory']['buildings'])==2
 for player in ['feifei','qingqing','doudou']:assert state['family']['profiles'][player]==original[player]
 assert state['family']['profiles']['quintus']['owned']==owned_before_fourth
 b=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');r=b.request.post(BASE+'/api/login',data=creds,headers=headers);assert r.ok
 assert r.json()['family']['profiles']['quintus']['growth']['xp'][pet]==200
 assert r.json()['family']['profiles']['quintus']['learningRewards']['goal']=='grove'
 q=b.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.goto(BASE,wait_until='networkidle');q.locator('.player-quintus').click();expect(q.locator('.learning-build-goal select')).to_have_value('grove');assert not q.evaluate('document.documentElement.scrollWidth>innerWidth');q.screenshot(path=str(OUT/'mobile-real.png'),full_page=True)
 q.reload(wait_until='networkidle');q.locator('.player-quintus').click();expect(q.locator('.learning-build-goal select')).to_have_value('grove')
 checks.append('rest/build/open/deposit/construct/relogin/reload/second-device and sibling/owned preservation')
 # Visual fixtures only: no writes or claim of actual resource earnings.
 for width,player in [(320,'feifei'),(390,'feifei'),(768,'quintus'),(1440,'quintus')]:
  ctx=browser.new_context(viewport={'width':width,'height':900},reduced_motion='reduce');v=ctx.new_page();seed=copy.deepcopy(state);seed['playerId']=player
  for profile in seed['family']['profiles'].values():profile.pop('onboarding',None)
  pp=seed['family']['profiles'][player];pp['learningRewards']={'progress':4,'packs':99,'pending':{'wood':12345,'stone':56789,'star':98765},'goal':'academy'};pp['territory']=copy.deepcopy(state['family']['profiles']['quintus']['territory']);pp['territory']['resources']={'wood':50000,'stone':50000,'star':50000}
  v.route('**/api/**',lambda route:route.fulfill(json=seed));v.on('pageerror',lambda e:errors.append(str(e)));v.goto(BASE,wait_until='networkidle');expect(v.locator('.learning-build-panel')).to_be_visible()
  assert not v.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width
  v.locator('.learning-build-panel').screenshot(path=str(OUT/f'panel-{width}.png'))
  v.evaluate("""()=>{const nodes=[...document.querySelectorAll('.learning-build-panel,.learning-build-panel *')];const sizes=nodes.map(e=>parseFloat(getComputedStyle(e).fontSize));nodes.forEach((e,i)=>e.style.fontSize=(sizes[i]*2)+'px');}""")
  assert not v.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,'text2x')
  checks.append({'fixtureWidth':width,'player':player,'textOnly200Percent':True})
  if width==1440:
   v.locator('.learning-build-footer button').click();expect(v.locator('.territory-blueprint[aria-pressed="true"]')).to_contain_text('雲上學院');checks.append('saved non-default building goal preselected on entering territory')
  ctx.close()
 assert not errors,errors
 result={'base':BASE,'checks':checks,'pageErrors':errors,'explicitNoRequestSyncRetries':retries,'realAccountScope':'isolated QA account only; layout fixtures are mocked'};(OUT/'browser-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False,indent=2));browser.close()
