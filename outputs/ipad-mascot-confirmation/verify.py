import json,subprocess,time,re
from pathlib import Path
from urllib.request import Request,urlopen
from playwright.sync_api import sync_playwright,expect,TimeoutError as PWTimeout
ROOT=Path.cwd();OUT=ROOT/'outputs/ipad-mascot-confirmation';SITE='https://quintus-star-tide-academy-production.up.railway.app';checks=[];errors=[]
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import * as g from './build/game.mjs';const family=g.newFamily();console.log(JSON.stringify({family,questions:{},username:'olivia',playerId:'doudou',displayName:'測試航海員',csrf:'synthetic-only',day:g.taipeiDay(),verified:Object.fromEntries(g.PLAYERS.map(p=>[p.id,0])),legacy:false,canMigrate:false,guide:g.currentGuide(null,g.guideFacts(family.profiles.doudou))}));"],text=True));fixture['guide']['reply']='rest'
def check(name,ok=True):
 assert ok,name
 checks.append({'name':name,'pass':True});print('PASS',name,flush=True)
def wait(p,expr,timeout=20):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  if p.evaluate('()=>('+expr+')'):return
  p.wait_for_timeout(100)
 raise AssertionError(expr)
def moving(p,motion):
 wait(p,"(()=>{const v=document.querySelector('.tide-panel video'),i=document.querySelector('.tide-panel .tide-actor-poster');return v?.currentSrc.includes('/"+motion+".mp4')&&v.currentTime>.2&&v.videoWidth>0&&i?.dataset.frameReady==='true'})()")
def still(p):
 wait(p,"(()=>{const i=document.querySelector('.tide-panel .tide-actor-poster');return i&&i.complete&&i.naturalWidth>0&&getComputedStyle(i).opacity==='1'&&i.getBoundingClientRect().height>100})()")
def setup(b,mascot,mode='normal'):
 c=b.new_context(viewport={'width':834,'height':1194},is_mobile=True,has_touch=True,device_scale_factor=2,user_agent='Mozilla/5.0 (iPad; CPU OS 15_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1',reduced_motion='reduce' if mode=='reduced' else 'no-preference')
 p=c.new_page();p.set_default_timeout(20000);p.set_default_navigation_timeout(60000);p.on('pageerror',lambda e:errors.append(str(e)))
 if mode=='no-frame-callback':p.add_init_script('HTMLVideoElement.prototype.requestVideoFrameCallback=undefined;HTMLVideoElement.prototype.cancelVideoFrameCallback=undefined;')
 if mode=='pending':p.add_init_script("const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){return this.src.includes('/olivia-dog/')||this.src.includes('/tideglow-guide/')?new Promise(()=>{}):play.call(this)}")
 if mode=='rejected':p.add_init_script("const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){return this.src.includes('/olivia-dog/')||this.src.includes('/tideglow-guide/')?Promise.reject(new DOMException('Synthetic autoplay denial','NotAllowedError')):play.call(this)}")
 def api(route):
  u=route.request.url;data=fixture['guide'] if '/api/guide' in u else {'revision':0,'history':[],'available':False} if '/api/companion-talk' in u else {'invitations':[],'rooms':[],'players':[]} if '/api/battle' in u else dict(fixture,username='olivia' if mascot=='dog' else 'other-child')
  route.fulfill(json=data)
 p.route('**/api/**',api)
 if mode=='broken':p.route('**/assets/'+('olivia-dog' if mascot=='dog' else 'tideglow-guide')+'/**/*.mp4',lambda r:r.abort())
 p.goto(SITE,wait_until='domcontentloaded')
 try:p.wait_for_load_state('networkidle',timeout=10000)
 except PWTimeout:pass
 p.locator('.tide-launch').click();expect(p.locator('.tide-panel')).to_be_visible();return c,p
with sync_playwright() as pw:
 b=pw.webkit.launch()
 for mascot,name in [('dog','派對狗狗'),('tideglow','潮光獸')]:
  c,p=setup(b,mascot)
  for motion,label,target in [('pet','摸摸',None),('feed','餵點心',None),('play','星光球','接第 1 顆星光球'),('highfive','擊掌','和'+name+'擊掌'),('bubbles','吹泡泡','點第 1 個泡泡')]:
   p.get_by_role('button',name='一起休息',exact=True).click();p.locator('.tide-care-actions').get_by_role('button',name=label,exact=True).click()
   if target:p.get_by_role('button',name=target,exact=True).click()
   moving(p,motion)
   check(mascot+' '+motion+' decoded visible inline frame',p.locator('.tide-panel video').evaluate('(v)=>v.muted&&v.defaultMuted&&v.playsInline&&v.hasAttribute("webkit-playsinline")'))
   if motion in ['highfive','bubbles']:p.screenshot(path=str(OUT/(mascot+'-'+motion+'.png')))
   expect(p.locator('.tide-care-actions button').first).to_be_enabled(timeout=15000);check(mascot+' '+motion+' completes and unlocks')
  p.get_by_role('button',name='一起休息',exact=True).click();moving(p,'rest');p.wait_for_timeout(10000);moving(p,'rest');check(mascot+' rest stays visible through full loop')
  p.screenshot(path=str(OUT/(mascot+'-rest-portrait.png')))
  p.set_viewport_size({'width':1194,'height':834});moving(p,'rest');check(mascot+' landscape fits',p.evaluate('document.documentElement.scrollWidth<=innerWidth') and p.locator('.tide-panel').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'));p.screenshot(path=str(OUT/(mascot+'-rest-landscape.png')))
  p.locator('.tide-footer button').first.click();still(p);check(mascot+' pause retains sleeping pose','/rest.jpg' in p.locator('.tide-actor-poster').get_attribute('src'));p.locator('.tide-footer button').first.click();moving(p,'rest');check(mascot+' resumes after pause')
  p.locator('.tide-panel video').evaluate('(v)=>{v.pause();v.dispatchEvent(new Event("waiting"))}');still(p);expect(p.locator('.tide-panel video')).to_have_count(0,timeout=11000);still(p);check(mascot+' stalled video falls back without blank rectangle');p.get_by_role('button',name='一起休息',exact=True).click();moving(p,'rest');check(mascot+' recovers after stalled playback');c.close()
  for mode in ['no-frame-callback','reduced','pending','rejected','broken']:
   c,p=setup(b,mascot,mode)
   p.get_by_role('button',name='一起休息',exact=True).click()
   if mode=='no-frame-callback':moving(p,'rest');check(mascot+' works without video frame callback API')
   else:
    still(p);check(mascot+' '+mode+' retains visible sleeping image')
    if mode in ['pending','rejected','broken']:
     p.get_by_role('button',name='餵點心',exact=True).click();still(p);expect(p.locator('.tide-care-actions button').first).to_be_enabled(timeout=11000);still(p);check(mascot+' '+mode+' does not lock controls')
   c.close()
 b.close()
check('No JavaScript exceptions',not errors)
for mascot in ['olivia-dog','tideglow-guide']:
 for motion in ['highfive','bubbles','rest']:
  path='/assets/'+mascot+'/actions-v2/'+motion+'.mp4'
  with urlopen(Request(SITE+path,headers={'Range':'bytes=0-1023'}),timeout=30) as r:
   data=r.read();check(path+' Safari byte ranges',r.status==206 and len(data)==1024 and r.headers.get('Content-Range') is not None)
(OUT/'results.json').write_text(json.dumps({'pass':True,'checks':checks,'errors':errors,'url':SITE,'engine':'Playwright modern WebKit, iPad touch/viewport/UA emulation','physicalIPad':False,'actualIPadOS15Engine':False,'realAccountMutations':False},ensure_ascii=False,indent=2))
