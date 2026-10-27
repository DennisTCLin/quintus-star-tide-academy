"""Production smoke using a newly created, isolated QA family; never reads real learners.
Uses normal starter and territory commands. Credentials remain in process memory.
"""
import json,os,uuid,time
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ISLAND_QA_URL','http://127.0.0.1:4242').rstrip('/')
OUT=Path(__file__).resolve().parents[1]/'outputs/island-life';OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(value,name):
 assert value,name
 checks.append(name);print('PASS '+name,flush=True)
def command(page,button):
 for _ in range(3):
  sent=[]
  def track(r):
   if r.url.endswith('/api/command'):sent.append(True)
  page.on('request',track)
  try:
   with page.expect_response(lambda r:r.url.endswith('/api/command'),timeout=15000)as reply:button.click()
   response=reply.value;check(response.status==200,'cloud command accepted');return response.json()
  except Exception:
   if not sent and '雲端狀態確認中' in page.locator('.notice').inner_text():page.wait_for_timeout(300);continue
   raise
  finally:page.remove_listener('request',track)
 raise AssertionError('cloud busy')
def open_map(page):
 page.locator('.family-nav button').nth(6).click();page.locator('.castle-view-switch button').nth(1).click();page.locator('.territory-map-viewport').scroll_into_view_if_needed()
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,channel='chrome');c=b.new_context(viewport={'width':1440,'height':1000});p=c.new_page();p.set_default_timeout(15000);p.on('pageerror',lambda e:errors.append(str(e)))
 username='qa_island_'+uuid.uuid4().hex[:12];password=uuid.uuid4().hex+'-A9'
 response=c.request.post(BASE+'/api/register',data={'username':username,'password':password},headers={'Origin':BASE});check(response.status==200,'isolated account created')
 p.goto(BASE);p.locator('.profile-card').first.click();state=command(p,p.locator('.starter-action'));pet=state['family']['profiles']['quintus']['onboarding']['pet'];p.locator('.starter-result').wait_for();state=command(p,p.locator('.starter-action'))
 p.locator('.family-nav button').nth(6).click();state=command(p,p.locator('.territory-welcome button').first);p.locator('.castle-view-switch button').nth(1).click();p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(250)
 check(p.locator('.island-pet').count()==1,'exactly the owned starter lives on island')
 check(p.locator('.island-pet').get_attribute('data-pet')==pet,'resident matches cloud-owned starter')
 check(p.locator('.castle-interior-hall img').evaluate('e=>e.complete&&e.naturalWidth>0'),'new Higgsfield castle loads')
 before=p.locator('.island-pet').get_attribute('style');p.wait_for_timeout(4000);check(p.locator('.island-pet').get_attribute('style')!=before,'live resident moves')
 state_before=c.request.get(BASE+'/api/state').json()['family']
 p.locator('.island-life-friends button').click();check('：'in p.locator('.island-life-greeting').inner_text(),'live greeting')
 p.locator('.island-life-actions button').click();p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(150);before=p.locator('.island-pet').get_attribute('style');p.wait_for_timeout(1000);check(p.locator('.island-pet').get_attribute('style')==before,'live pause works')
 check(c.request.get(BASE+'/api/state').json()['family']==state_before,'visual play preserves all cloud game data')
 p.locator('.island-habitat').screenshot(path=str(OUT/'production-owned-starter.png'))
 p.reload();p.locator('.profile-card').first.click();open_map(p);check(p.locator('.island-pet').get_attribute('data-pet')==pet,'reload restores owned resident')
 c2=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');r=c2.request.post(BASE+'/api/login',data={'username':username,'password':password},headers={'Origin':BASE});check(r.status==200,'second device login')
 p2=c2.new_page();p2.on('pageerror',lambda e:errors.append(str(e)));p2.goto(BASE);p2.locator('.profile-card').first.click();open_map(p2);p2.wait_for_timeout(250);check(p2.locator('.island-pet').get_attribute('data-pet')==pet,'second device displays same cloud companion')
 a=p2.locator('.island-pet').get_attribute('style');p2.wait_for_timeout(1000);check(p2.locator('.island-pet').get_attribute('style')==a,'second device reduced motion works')
 check(p2.evaluate('document.documentElement.scrollWidth<=innerWidth'),'production mobile no page overflow');check(not errors,'no browser runtime errors')
 p2.locator('.island-habitat').screenshot(path=str(OUT/'production-mobile-starter.png'))
 (OUT/'production-smoke.json').write_text(json.dumps(dict(base=BASE,account=username,starter=pet,checks=checks,pageErrors=errors),ensure_ascii=False,indent=2))
 c.close();c2.close();b.close()
