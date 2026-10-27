import json,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('outputs/ipad15-companion');base=os.environ.get('QA_URL','http://127.0.0.1:4334');checks=[];errors=[]
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import * as g from './build/game.mjs';const family=g.newFamily();console.log(JSON.stringify({family,questions:{},username:'olivia',playerId:'doudou',displayName:'測試航海員',csrf:'synthetic-only',day:g.taipeiDay(),verified:Object.fromEntries(g.PLAYERS.map(p=>[p.id,0])),legacy:false,canMigrate:false,guide:g.currentGuide(null,g.guideFacts(family.profiles.doudou))}));"],text=True));fixture['guide']['reply']='rest'
def check(name,ok=True):
 assert ok,name
 checks.append({'name':name,'pass':True});print('PASS '+name,flush=True)
def setup(browser,mode='normal',width=834,username='olivia',reduced=False):
 c=browser.new_context(viewport={'width':width,'height':1194},has_touch=True,device_scale_factor=1,reduced_motion='reduce' if reduced else 'no-preference');p=c.new_page();p.set_default_timeout(15000);p.on('pageerror',lambda e:errors.append(str(e)))
 # Fault injection represents engine/network failures; it does not emulate iPadOS15 itself.
 p.add_init_script("""window.qaHidden=false;Object.defineProperty(document,'visibilityState',{get:()=>window.qaHidden?'hidden':'visible'});""")
 if mode in ['pending','rejected','no-frame']:
  p.add_init_script("""const original=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(this.src.includes('/olivia-dog/')){%s}return original.call(this);};""" % ("return new Promise(()=>{});" if mode=='pending' else "return Promise.reject(new DOMException('synthetic autoplay rejection','NotAllowedError'));" if mode=='rejected' else "return Promise.resolve();"))
 if mode=='no-frame-callback':p.add_init_script('HTMLVideoElement.prototype.requestVideoFrameCallback=undefined;HTMLVideoElement.prototype.cancelVideoFrameCallback=undefined;')
 def api(route):
  u=route.request.url;data=fixture['guide'] if '/api/guide' in u else {'revision':0,'history':[],'available':False} if '/api/companion-talk' in u else {'invitations':[],'rooms':[],'players':[]} if '/api/battle' in u else dict(fixture,username=username)
  route.fulfill(json=data)
 p.route('**/api/**',api)
 if mode=='broken-video':p.route('**/assets/olivia-dog/**/*.mp4',lambda route:route.abort())
 if mode=='broken-poster':p.route('**/assets/olivia-dog/actions-v2/*.jpg',lambda route:route.abort())
 p.goto(base,wait_until='networkidle');p.locator('.tide-launch').click();expect(p.locator('.tide-panel')).to_be_visible()
 return c,p

def poster(p):return p.locator('.tide-panel .tide-actor-poster')
def usable_image(p):
 p.wait_for_function("() => {const i=document.querySelector('.tide-panel .tide-actor-poster');return i&&i.complete&&i.naturalWidth>0&&getComputedStyle(i).opacity==='1'&&i.getBoundingClientRect().height>100}")
def moving(p,motion):
 p.wait_for_function("m=>{const v=document.querySelector('.tide-panel video'),i=document.querySelector('.tide-panel .tide-actor-poster');return v?.currentSrc.includes('/'+m+'.mp4')&&v.currentTime>.1&&v.videoWidth>0&&i?.dataset.frameReady==='true'}",arg=motion)
def main():
 with sync_playwright() as pw:
  for engine in ['webkit','chromium']:
   b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='chrome',headless=True)
   c,p=setup(b)
   for motion,label,target in [('pet','摸摸',None),('feed','餵點心',None),('play','星光球','接第 1 顆星光球'),('highfive','擊掌','和派對狗狗擊掌'),('bubbles','吹泡泡','點第 1 個泡泡')]:
    p.locator('.tide-care-actions').get_by_role('button',name='一起休息',exact=True).click();p.locator('.tide-care-actions').get_by_role('button',name=label,exact=True).click()
    if target:p.get_by_role('button',name=target,exact=True).click()
    moving(p,motion);expect(p.locator('.tide-care-actions button').first).to_be_disabled();expect(p.locator('.tide-care-actions button').first).to_be_enabled(timeout=15000);check(engine+': '+motion+' renders frames and completes')
   p.get_by_role('button',name='一起休息',exact=True).click();moving(p,'rest');check(engine+': rest loops with muted inline playback',p.locator('.tide-panel video').evaluate('(v)=>v.loop&&v.muted&&v.defaultMuted&&v.playsInline'))
   for signaled in [False,True]:
    p.locator('.tide-panel video').evaluate('(v,signaled)=>{v.pause();if(signaled)v.dispatchEvent(new Event("waiting"))}',signaled)
    if signaled:usable_image(p)
    expect(p.locator('.tide-panel video')).to_have_count(0,timeout=11000);usable_image(p);check(engine+': '+('signaled' if signaled else 'silent')+' post-start freeze returns visible still')
    p.get_by_role('button',name='一起休息',exact=True).click();moving(p,'rest')
   p.evaluate("window.qaHidden=true;document.dispatchEvent(new Event('visibilitychange'))");usable_image(p);check(engine+': background keeps a visible still');p.evaluate("window.qaHidden=false;document.dispatchEvent(new Event('visibilitychange'))");moving(p,'rest');check(engine+': foreground resumes animation')
   p.locator('.tide-footer button').first.click();usable_image(p);expect(p.locator('.tide-panel video')).to_have_count(0);p.locator('.tide-footer button').first.click();moving(p,'rest');check(engine+': pause and resume retain character')
   for w,h in [(390,844),(834,1194),(1194,834)]:
    p.set_viewport_size({'width':w,'height':h});check(engine+f': no overflow {w}',p.evaluate('document.documentElement.scrollWidth<=innerWidth') and p.locator('.tide-panel').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'))
   p.set_viewport_size({'width':834,'height':1194});p.screenshot(path=str(out/(engine+'-animated.png')));c.close()
   for mode in ['pending','no-frame','rejected','broken-video']:
    c,p=setup(b,mode);p.get_by_role('button',name='餵點心',exact=True).click();usable_image(p);check(engine+': '+mode+' preserves visible dog while loading')
    expect(p.locator('.tide-care-actions button').first).to_be_enabled(timeout=11000);usable_image(p);check(engine+': '+mode+' cannot lock care indefinitely')
    if mode=='pending':p.screenshot(path=str(out/(engine+'-pending-fallback.png')))
    c.close()
   c,p=setup(b,'broken-poster',reduced=True);p.get_by_role('button',name='一起休息',exact=True).click();usable_image(p);expect(poster(p)).to_have_attribute('src','/assets/olivia-dog/poster-v1.png');check(engine+': failed action still uses original dog drawing');c.close()
   c,p=setup(b,'no-frame-callback');p.get_by_role('button',name='一起休息',exact=True).click();moving(p,'rest');check(engine+': advancing decoded frame works without frame callback API');c.close()
   c,p=setup(b,username='other-child',reduced=True);usable_image(p);expect(poster(p)).to_have_attribute('src','/assets/tideglow-guide/actions-v2/rest.jpg');check(engine+': other child keeps tideglow under reduced motion');c.close()
   b.close()
 check('No JavaScript exceptions',not errors)
 (out/'browser-results.json').write_text(json.dumps({'pass':True,'checks':checks,'physicalDevice':False,'legacyEngine':False,'scope':'Modern WebKit and Chromium with synthetic API fixture and deterministic media faults. No production account login or state writes.','url':base},ensure_ascii=False,indent=2)+'\n')

if __name__=="__main__":main()
