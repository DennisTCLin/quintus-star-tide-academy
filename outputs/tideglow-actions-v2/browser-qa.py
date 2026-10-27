import json, subprocess, os, time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
ROOT=Path.cwd();OUT=ROOT/os.environ.get('TIDE_QA_OUTPUT','outputs/tideglow-actions-v2/browser');OUT.mkdir(parents=True,exist_ok=True)
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e', '''import * as g from './build/game.mjs';const family=g.newFamily();console.log(JSON.stringify({family,questions:{},username:'olivia',playerId:'doudou',displayName:'測試航海員',csrf:'local-ui-fixture',day:g.taipeiDay(),verified:{quintus:0,feifei:0,qingqing:0,doudou:0},legacy:false,canMigrate:false,guide:g.currentGuide(null,g.guideFacts(family.profiles.doudou))}));'''],text=True))
fixture['guide']['reply']='rest'
results=[];errors=[]
def wait_until(page, expression, timeout=20):
 deadline=time.monotonic()+timeout
 while time.monotonic()<deadline:
  if page.evaluate('() => ('+expression+')'):return
  page.wait_for_timeout(100)
 raise AssertionError(expression)
def setup(browser,width=1280,reduced=False,username='other-child',player='doudou',broken=False,rejected=False):
 c=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce' if reduced else 'no-preference')
 p=c.new_page();p.set_default_timeout(20000);p.set_default_navigation_timeout(60000);p.on('pageerror',lambda e:errors.append(str(e)))
 if rejected:p.add_init_script("const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){return this.src.includes('/feed.mp4') ? Promise.reject(new DOMException('Test autoplay denial','NotAllowedError')) : play.call(this)}")
 f=dict(fixture,username=username,playerId=player)
 def api(route):
  u=route.request.url
  data=fixture['guide'] if '/api/guide' in u else {'revision':0,'history':[],'available':False} if '/api/companion-talk' in u else {'invitations':[],'rooms':[],'players':[]} if '/api/battle' in u else f
  route.fulfill(json=data)
 p.route('**/api/**',api)
 if broken:p.route('**/assets/tideglow-guide/actions-v2/*.mp4',lambda route:route.abort())
 p.goto(os.environ.get('TIDE_QA_URL','http://127.0.0.1:4327'),wait_until='domcontentloaded')
 p.locator('.tide-launch').wait_for();p.locator('.tide-launch').click();p.locator('.tide-panel').wait_for()
 return c,p

def video(p, motion):
 wait_until(p, f"document.querySelector('.tide-panel video')?.currentSrc.includes('/{motion}.mp4') && document.querySelector('.tide-panel video')?.currentTime > .15")
 return p.locator('.tide-panel video')

def icons(p):
 wait_until(p,"[...document.querySelectorAll('.tide-care-actions img')].length===6 && [...document.querySelectorAll('.tide-care-actions img')].every(i=>i.complete && i.naturalWidth>0 && i.currentSrc.includes('care-actions-v2.webp'))")
with sync_playwright() as pw:
 b=pw.chromium.launch(channel='chrome',headless=True,args=['--autoplay-policy=no-user-gesture-required'])
 c,p=setup(b)
 icons(p)
 actions=[('pet','摸摸',None),('feed','餵點心',None),('play','星光球','接第 {n} 顆星光球'),('highfive','擊掌','和潮光獸擊掌'),('bubbles','吹泡泡','點第 {n} 個泡泡')]
 for motion,label,target in actions:
  p.locator('.tide-care-actions').get_by_role('button',name=label,exact=True).click()
  video(p,motion)
  hits=3 if motion in ['play','bubbles'] else 1
  for n in range(1,hits+1):
   if target:
    p.get_by_role('button',name=target.format(n=n),exact=True).click();video(p,motion)
   p.wait_for_timeout(1100)
   assert p.locator('.tide-care-actions button').first.is_disabled(),motion+' ended prematurely'
   p.locator('.tide-care-actions button').first.wait_for(state='visible')
   wait_until(p,"!document.querySelector('.tide-care-actions button').disabled")
  results.append({'action':motion,'correctVideo':'PASS','playsToEnd':'PASS','hits':hits})
 p.get_by_role('button',name='一起休息',exact=True).click();v=video(p,'rest');assert v.evaluate('(v)=>v.loop && v.muted')
 p.wait_for_timeout(11000);assert p.locator('.tide-panel .tide-actor').get_attribute('data-motion')=='rest';video(p,'rest')
 p.screenshot(path=str(OUT/'rest-playing.png'))
 p.get_by_role('button',name='餵點心',exact=True).click();video(p,'feed')
 p.get_by_role('button',name='一起休息',exact=True).click();video(p,'rest');p.wait_for_timeout(6000);video(p,'rest')
 p.locator('.tide-footer button').first.click();p.locator('.tide-panel .tide-actor img').wait_for();assert 'rest.jpg' in p.locator('.tide-panel .tide-actor img').get_attribute('src')
 p.locator('.tide-footer button').first.click();video(p,'rest')
 results.append({'restLoop11Seconds':'PASS','interruptAndStaleTimer':'PASS','pauseResumeRest':'PASS'})
 # Decode every production clip in Chromium, not only checking filenames.
 for motion in ['idle','greet','rest','pet','feed','play','highfive','bubbles','listening','thinking','speaking','cheering']:
  src=('/assets/tideglow-guide/actions-v2/' if motion in ['highfive','bubbles','rest'] else '/assets/tideglow-guide/')+motion+'.mp4'
  p.evaluate('(src)=>{window.qaVideo?.remove();const v=document.createElement("video");window.qaVideo=v;v.muted=true;v.src=src;document.body.append(v);v.play()}',src)
  wait_until(p,'window.qaVideo.currentTime>.1 && window.qaVideo.videoWidth>0')
  results.append({'decodedMotion':motion,'duration':p.evaluate('window.qaVideo.duration')})
 c.close()
 for width in [390,820,1440]:
  c,p=setup(b,width,reduced=True);icons(p);p.get_by_role('button',name='一起休息',exact=True).click()
  img=p.locator('.tide-panel .tide-actor img');assert 'rest.jpg' in img.get_attribute('src');assert p.locator('.tide-panel video').count()==0
  assert p.evaluate('document.documentElement.scrollWidth <= innerWidth');assert p.locator('.tide-panel').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
  p.screenshot(path=str(OUT/f'rest-{width}.png'));results.append({'width':width,'reducedRestPosterAndLayout':'PASS'});c.close()
 for player in ['quintus','feifei','qingqing','alston']:
  c,p=setup(b,player=player);icons(p)
  for motion,label,_ in actions:
   p.get_by_role('button',name='一起休息',exact=True).click()
   p.locator('.tide-care-actions').get_by_role('button',name=label,exact=True).click();video(p,motion)
   assert 'tideglow-guide' in p.locator('.tide-panel video').get_attribute('src')
  p.get_by_role('button',name='一起休息',exact=True).click();video(p,'rest')
  results.append({'profile':player,'allSixButtons':'PASS'});c.close()
 c,p=setup(b,username='olivia');icons(p)
 for motion,label in [('highfive','擊掌'),('bubbles','吹泡泡'),('rest','一起休息')]:
  p.locator('.tide-care-actions').get_by_role('button',name=label,exact=True).click();video(p,motion)
  assert 'olivia-dog/actions-v2/' in p.locator('.tide-panel video').get_attribute('src')
 results.append({'personalDogUnchanged':'PASS'});c.close()
 c,p=setup(b,rejected=True);p.get_by_role('button',name='餵點心',exact=True).click();wait_until(p,"!document.querySelector('.tide-care-actions button').disabled",timeout=2);results.append({'rejectedPlayUnlocksImmediately':'PASS'});c.close()
 c,p=setup(b,broken=True);p.get_by_role('button',name='一起休息',exact=True).click();img=p.locator('.tide-panel .tide-actor img');img.wait_for();assert 'rest.jpg' in img.get_attribute('src');results.append({'failedRestVideoUsesSleepPoster':'PASS'});c.close()
 b.close()
assert not errors,errors
(OUT/'results.json').write_text(json.dumps({'checks':results,'errors':errors,'scope':'Synthetic API fixtures, no account mutations','url':os.environ.get('TIDE_QA_URL','http://127.0.0.1:4327')},ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False))
