import json,subprocess,os,time,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect,TimeoutError as PWTimeout
ROOT=Path.cwd();BASE=os.environ.get('FEIFEI_QA_URL','http://127.0.0.1:47731');OUT=ROOT/os.environ.get('FEIFEI_QA_OUTPUT','outputs/feifei-companion/browser');OUT.mkdir(parents=True,exist_ok=True);checks=[];errors=[]
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import * as g from './build/game.mjs';const family=g.newFamily();console.log(JSON.stringify({family,questions:{},username:'feifei',playerId:'feifei',displayName:'測試航海員',csrf:'synthetic-only',day:g.taipeiDay(),verified:Object.fromEntries(g.PLAYERS.map(p=>[p.id,0])),legacy:false,canMigrate:false,guide:g.currentGuide(null,g.guideFacts(family.profiles.feifei))}));"],text=True));fixture['guide']['reply']='rest'
def check(name):checks.append({'name':name,'pass':True});print('PASS',name,flush=True)
def wait(p,expr,timeout=20):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  if p.evaluate('()=>('+expr+')'):return
  p.wait_for_timeout(100)
 raise AssertionError(expr)
def setup(b,username='feifei',player='feifei',legacy=False,reduced=False,broken=False,width=834):
 options={'viewport':{'width':width,'height':1194},'has_touch':True,'reduced_motion':'reduce' if reduced else 'no-preference'}
 if legacy:options.update(is_mobile=True,user_agent='Mozilla/5.0 (iPad; CPU OS 15_4_1 like Mac OS X) AppleWebKit/605.1.15 Version/15.4 Mobile Safari/604.1')
 c=b.new_context(**options);p=c.new_page();p.set_default_timeout(20000);p.set_default_navigation_timeout(60000);p.on('pageerror',lambda e:errors.append(str(e)))
 def api(r):
  u=r.request.url;data=fixture['guide'] if '/api/guide' in u else {'revision':0,'history':[],'available':False} if '/api/companion-talk' in u else {'invitations':[],'rooms':[],'players':[]} if '/api/battle' in u else dict(fixture,username=username,playerId=player)
  r.fulfill(json=data)
 p.route('**/api/**',api)
 if broken:p.route('**/assets/feifei-bow/v1/*.mp4',lambda r:r.abort())
 p.goto(BASE,wait_until='domcontentloaded');p.locator('.tide-harbor-entry').wait_for();return c,p

def moving(p,motion,canvas):
 wait(p,"document.querySelector('.tide-panel .tide-actor')?.dataset.motion==='"+motion+"'")
 if canvas:
  wait(p,"document.querySelector('.tide-panel canvas')?.dataset.frame>1")
  x=p.locator('.tide-panel canvas').evaluate('(c)=>c.toDataURL()');p.wait_for_timeout(550);y=p.locator('.tide-panel canvas').evaluate('(c)=>c.toDataURL()');assert x!=y,motion+' frozen canvas'
 else:wait(p,"document.querySelector('.tide-panel video')?.currentTime>.15 && document.querySelector('.tide-panel .tide-actor-poster')?.dataset.frameReady==='true'")
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='chrome',headless=True)
  c,p=setup(b,legacy=engine=='webkit');assert '/feifei-bow/' in p.locator('.tide-harbor-entry img').get_attribute('src');p.locator('.tide-harbor-entry').click();expect(p.get_by_role('dialog',name='蝴蝶結寶寶 AI 學伴')).to_be_visible()
  for motion,label,target,count in [('pet','摸摸',None,1),('feed','餵點心',None,1),('play','星光球','接第 {n} 顆星光球',3),('highfive','擊掌','和蝴蝶結寶寶擊掌',1),('bubbles','吹泡泡','點第 {n} 個泡泡',3)]:
   p.get_by_role('button',name='一起休息',exact=True).click();p.locator('.tide-care-actions').get_by_role('button',name=label,exact=True).click()
   for n in range(1,count+1):
    if target:p.get_by_role('button',name=target.format(n=n),exact=True).click()
    moving(p,motion,engine=='webkit');expect(p.locator('.tide-care-actions button').first).to_be_enabled(timeout=16000)
   check(engine+' '+motion+' distinct motion and complete targets')
  p.get_by_role('button',name='一起休息',exact=True).click();moving(p,'rest',engine=='webkit');p.wait_for_timeout(8500);moving(p,'rest',engine=='webkit');check(engine+' continuous sleeping rest')
  p.locator('.tide-footer button').first.click();expect(p.locator('.tide-panel canvas,.tide-panel video')).to_have_count(0);assert '/rest.jpg' in p.locator('.tide-panel .tide-actor-poster').get_attribute('src');p.locator('.tide-footer button').first.click();moving(p,'rest',engine=='webkit');check(engine+' pause resume')
  for width in [390,834,1194]:
   p.set_viewport_size({'width':width,'height':1194 if width!=1194 else 834});assert p.evaluate('document.documentElement.scrollWidth<=innerWidth');p.screenshot(path=str(OUT/f'{engine}-{width}.png'))
  p.locator('.tide-tabs button').nth(1).click();p.locator('.tide-guided-fallback summary').click();assert '潮光獸' not in p.locator('.tide-panel').inner_text();assert '派對狗狗' not in p.locator('.tide-panel').inner_text();check(engine+' personalized chat and layouts');c.close()
  c,p=setup(b,broken=True);p.locator('.tide-harbor-entry').click();p.get_by_role('button',name='餵點心',exact=True).click();moving(p,'feed',True);check(engine+' failed video uses moving fallback');c.close()
  c,p=setup(b,reduced=True);p.locator('.tide-harbor-entry').click();p.get_by_role('button',name='一起休息',exact=True).click();expect(p.locator('.tide-panel video,.tide-panel canvas')).to_have_count(0);assert '/feifei-bow/v1/rest.jpg' in p.locator('.tide-panel .tide-actor-poster').get_attribute('src');check(engine+' reduced sleep pose');c.close()
  for username,player,path in [('jimmy','feifei','/tideglow'),('olivia','doudou','/olivia-dog'),('sunny','qingqing','/tideglow')]:
   c,p=setup(b,username,player,reduced=True);assert path in p.locator('.tide-harbor-entry img').get_attribute('src');p.locator('.tide-harbor-entry').click();assert path in p.locator('.tide-panel .tide-actor-poster').get_attribute('src');check(engine+' isolated identity '+username);c.close()
  if BASE.startswith('http://127.'):
   c=b.new_context(has_touch=True,user_agent='Mozilla/5.0 (iPad; CPU OS 15_4_1 like Mac OS X) Version/15.4 Mobile Safari');p=c.new_page();p.goto(BASE+'/outputs/feifei-companion/actor-qa.html');wait(p,"typeof window.showMotion==='function'")
   for motion in ['idle','greet','pet','feed','play','highfive','bubbles','rest','listening','thinking','speaking','cheering']:
    p.evaluate('(m)=>window.showMotion(m)',motion);wait(p,"document.querySelector('canvas')?.dataset.frame>1");x=p.locator('canvas').evaluate('(c)=>c.toDataURL()');p.wait_for_timeout(550);assert x!=p.locator('canvas').evaluate('(c)=>c.toDataURL()');check(engine+' all-state canvas '+motion)
   c.close()
  b.close()
assert not errors,errors
(OUT/'results.json').write_text(json.dumps({'pass':True,'checks':checks,'errors':errors,'url':BASE,'physicalIPad':False,'realAccountMutations':False},ensure_ascii=False,indent=2));print(len(checks),'PASS')
