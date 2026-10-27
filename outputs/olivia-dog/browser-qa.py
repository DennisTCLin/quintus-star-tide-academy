import json, subprocess, os, time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
ROOT=Path.cwd(); OUT=ROOT/os.environ.get('DOG_QA_OUTPUT','outputs/olivia-dog');OUT.mkdir(parents=True,exist_ok=True)
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e', '''import * as g from './build/game.mjs';const family=g.newFamily();console.log(JSON.stringify({family,questions:{},username:'olivia',playerId:'doudou',displayName:'測試航海員',csrf:'local-ui-fixture',day:g.taipeiDay(),verified:{quintus:0,feifei:0,qingqing:0,doudou:0},legacy:false,canMigrate:false,guide:g.currentGuide(null,g.guideFacts(family.profiles.doudou))}));'''],text=True))
fixture['guide']['reply']='rest'
results=[];errors=[]
def wait_until(page, expression):
 deadline=time.monotonic()+15
 while time.monotonic()<deadline:
  if page.evaluate('() => ('+expression+')'):return
  page.wait_for_timeout(100)
 raise AssertionError(expression)
def setup(browser,width=1280,reduced=False,username='olivia',broken=False):
 c=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce' if reduced else 'no-preference')
 p=c.new_page();p.set_default_timeout(15000);p.set_default_navigation_timeout(60000);p.on('pageerror',lambda e:errors.append(str(e)))
 f=dict(fixture,username=username)
 def api(route):
  u=route.request.url
  data=fixture['guide'] if '/api/guide' in u else {'revision':0,'history':[],'available':False} if '/api/companion-talk' in u else {'invitations':[],'rooms':[],'players':[]} if '/api/battle' in u else f
  route.fulfill(json=data)
 p.route('**/api/**',api)
 if broken:p.route('**/assets/olivia-dog/*.mp4',lambda route:route.abort())
 p.goto(os.environ.get('DOG_QA_URL','http://127.0.0.1:4327'),wait_until='domcontentloaded')
 try:p.wait_for_load_state('networkidle',timeout=10000)
 except PlaywrightTimeoutError:pass # Homepage video can keep requests active; verify the actual mascot below.
 p.locator('.tide-launch').wait_for()
 return c,p
with sync_playwright() as pw:
 b=pw.chromium.launch(channel='chrome',headless=True,args=['--autoplay-policy=no-user-gesture-required'])
 for width in [390,820,1440]:
  c,p=setup(b,width,reduced=True)
  assert 'dog' in p.locator('.tide-launch img').get_attribute('src')
  assert 'olivia-dog' in p.locator('.tide-harbor-entry img').get_attribute('src')
  p.screenshot(path=str(OUT/f'home-{width}.png'))
  p.locator('.tide-launch').click()
  panel=p.get_by_role('dialog',name='派對狗狗 AI 學伴');panel.wait_for()
  assert panel.locator('video').count()==0
  panel.get_by_role('button',name='摸摸派對狗狗',exact=True).click()
  p.wait_for_timeout(350)
  assert '舒服' in panel.locator('.tide-bubble').inner_text()
  panel.get_by_role('button',name='餵點心',exact=True).click();p.wait_for_timeout(350)
  assert '慢慢吃' in panel.locator('.tide-bubble').inner_text()
  panel.get_by_role('button',name='擊掌',exact=True).click()
  panel.get_by_role('button',name='和派對狗狗擊掌',exact=True).click();p.wait_for_timeout(350)
  assert '擊掌成功' in panel.locator('.tide-bubble').inner_text()
  panel.get_by_role('button',name='一起休息',exact=True).click()
  assert panel.locator('.tide-actor').get_attribute('data-motion')=='rest'
  assert p.evaluate('document.documentElement.scrollWidth <= innerWidth')
  assert panel.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
  p.screenshot(path=str(OUT/f'panel-{width}.png'))
  panel.locator('.tide-tabs button').nth(1).click()
  assert '潮光獸' not in panel.inner_text()
  panel.locator('.tide-guided-fallback summary').click()
  assert '小龍' not in panel.inner_text()
  assert '派對狗狗' in panel.locator('.tide-answers').inner_text()
  p.get_by_role('button',name='收起派對狗狗').click()
  wait_until(p, "document.querySelector('.tide-launch')===document.activeElement")
  results.append({'width':width,'care':'PASS','reducedMotion':'PASS','chatIdentity':'PASS','layout':'PASS','keyboardFocus':'PASS'});c.close()
 c,p=setup(b,username='other-child',reduced=True)
 assert 'tideglow-guide' in p.locator('.tide-launch img').get_attribute('src')
 results.append({'sameSlotOtherAccount':'PASS'});c.close()
 c,p=setup(b,broken=True)
 p.locator('.tide-launch img').wait_for();assert 'olivia-dog' in p.locator('.tide-launch img').get_attribute('src')
 results.append({'mediaFailureFallback':'PASS'});c.close()
 if os.environ.get('CHECK_VIDEO')=='1':
  c,p=setup(b)
  wait_until(p, "document.querySelector('.tide-launch video')?.currentTime > .1")
  p.screenshot(path=str(OUT/'animated-home.png'))
  p.locator('.tide-launch').click();p.locator('.tide-panel video').wait_for()
  wait_until(p, "document.querySelector('.tide-panel video')?.currentTime > .1")
  p.get_by_role('button',name='摸摸派對狗狗',exact=True).click()
  assert p.locator('.tide-panel .tide-actor').get_attribute('data-motion')=='pet'
  p.locator('.tide-panel .tide-footer button').first.click()
  p.locator('.tide-panel .tide-actor img').wait_for()
  assert p.locator('.tide-panel video').count()==0
  p.locator('.tide-panel .tide-footer button').first.click()
  wait_until(p, "document.querySelector('.tide-panel video')?.currentTime > .1")
  results.append({'videoPlaybackAndRestart':'PASS','pauseResume':'PASS'});c.close()
 b.close()
assert not errors,errors
(OUT/'browser-results.json').write_text(json.dumps({'checks':results,'errors':errors,'scope':'intercepted synthetic API responses; no real account mutations','pageUrl':os.environ.get('DOG_QA_URL','http://127.0.0.1:4327')},ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False))
