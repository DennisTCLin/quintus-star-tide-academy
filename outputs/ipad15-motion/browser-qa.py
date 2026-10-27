import importlib.util,json,os,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
spec=importlib.util.spec_from_file_location('baseqa',Path('outputs/ipad15-companion/browser-qa.py'));q=importlib.util.module_from_spec(spec);spec.loader.exec_module(q)
out=Path('outputs/ipad15-motion');out.mkdir(exist_ok=True);q.base=os.environ.get('QA_URL','http://127.0.0.1:4334')
legacy='Mozilla/5.0 (iPad; CPU OS 15_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1'
def setup(b,mascot='dog',mode='legacy',player='doudou',reduced=False):
 opts={'viewport':{'width':834,'height':1194},'has_touch':True,'device_scale_factor':1,'reduced_motion':'reduce' if reduced else 'no-preference'}
 if mode=='legacy':opts['user_agent']=legacy
 c=b.new_context(**opts);p=c.new_page();p.set_default_timeout(18000);p.on('pageerror',lambda e:q.errors.append(str(e)))
 p.add_init_script("window.qaHidden=false;Object.defineProperty(document,'visibilityState',{get:()=>window.qaHidden?'hidden':'visible'});")
 if mode in ['reject','pending']:p.add_init_script('HTMLMediaElement.prototype.play=function(){'+('return Promise.reject(new DOMException("blocked","NotAllowedError"));' if mode=='reject' else 'return new Promise(()=>{});')+'};')
 def api(route):
  u=route.request.url;data=q.fixture['guide'] if '/api/guide' in u else {'revision':0,'history':[],'available':False} if '/api/companion-talk' in u else {'invitations':[],'rooms':[],'players':[]} if '/api/battle' in u else dict(q.fixture,username='olivia' if mascot=='dog' else 'synthetic-'+player,playerId=player)
  route.fulfill(json=data)
 p.route('**/api/**',api);p.goto(q.base,wait_until='networkidle');p.locator('.tide-launch').tap();expect(p.locator('.tide-panel')).to_be_visible();return c,p

def frames_move(p,motion):
 canvas=p.locator('.tide-panel canvas')
 expect(canvas).to_have_attribute('data-motion',motion,timeout=15000);p.wait_for_function("()=>{const c=document.querySelector('.tide-panel canvas'),i=document.querySelector('.tide-panel .tide-actor-poster');return c&&Number(c.dataset.frame)>1&&i.dataset.frameReady==='true'}")
 first=canvas.evaluate('(c)=>c.toDataURL()');p.wait_for_timeout(650);second=canvas.evaluate('(c)=>c.toDataURL()');assert first!=second,'Actual canvas pixels did not change';return canvas

def action(p,motion,label,target=None,renderer='frames'):
 p.locator('.tide-care-actions').get_by_role('button',name='一起休息',exact=True).tap();p.locator('.tide-care-actions').get_by_role('button',name=label,exact=True).tap()
 if target:p.get_by_role('button',name=target,exact=True).tap()
 if renderer=='frames':frames_move(p,motion)
 else:q.moving(p,motion)
 if motion!='rest':expect(p.locator('.tide-care-actions button').first).to_be_enabled(timeout=18000)

def main():
 with sync_playwright() as pw:
  for engine in ['webkit','chromium']:
   b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='chrome',headless=True)
   for mascot in ['dog','tideglow']:
    name='派對狗狗' if mascot=='dog' else '潮光獸';c,p=setup(b,mascot)
    for motion,label,target in [('pet','摸摸',None),('feed','餵點心',None),('play','星光球','接第 1 顆星光球'),('highfive','擊掌','和'+name+'擊掌'),('bubbles','吹泡泡','點第 1 個泡泡'),('rest','一起休息',None)]:
     action(p,motion,label,target);q.check(engine+' '+mascot+' legacy '+motion+' actual footage pixels and completion')
    p.wait_for_timeout(7000);frames_move(p,'rest');q.check(engine+' '+mascot+' legacy rest loops across sheets')
    p.locator('.tide-footer button').first.tap();expect(p.locator('.tide-panel canvas')).to_have_count(0);q.usable_image(p);p.locator('.tide-footer button').first.tap();frames_move(p,'rest');q.check(engine+' '+mascot+' pause/resume')
    p.evaluate("window.qaHidden=true;document.dispatchEvent(new Event('visibilitychange'))");expect(p.locator('.tide-panel canvas')).to_have_count(0);p.evaluate("window.qaHidden=false;document.dispatchEvent(new Event('visibilitychange'))");frames_move(p,'rest');q.check(engine+' '+mascot+' background/return')
    for n in range(2):action(p,'pet','摸摸');q.check(engine+' '+mascot+' repeated touch '+str(n))
    p.screenshot(path=str(out/(engine+'-'+mascot+'.png')));c.close()
    c,p=setup(b,mascot,'normal')
    for motion,label,target in [('pet','摸摸',None),('feed','餵點心',None),('play','星光球','接第 1 顆星光球')]:action(p,motion,label,target,'video');q.check(engine+' '+mascot+' modern video '+motion)
    c.close()
    c,p=setup(b,mascot,'reject')
    for motion,label,target in [('pet','摸摸',None),('feed','餵點心',None),('play','星光球','接第 1 顆星光球')]:action(p,motion,label,target);q.check(engine+' '+mascot+' rejected video uses animated '+motion)
    c.close()
    c,p=setup(b,mascot,'pending');action(p,'feed','餵點心');q.check(engine+' '+mascot+' hung video still completes animated feed');c.close()
    c,p=setup(b,mascot,reduced=True);p.get_by_role('button',name='摸摸',exact=True).tap();expect(p.locator('.tide-panel canvas,.tide-panel video')).to_have_count(0);q.usable_image(p);q.check(engine+' '+mascot+' reduced motion intentionally static');c.close()
   if engine=='webkit':
    for player in ['quintus','feifei','qingqing','alston']:
     c,p=setup(b,'tideglow',player=player);action(p,'pet','摸摸');expect(p.locator('.tide-heading h2')).to_have_text('潮光獸');q.check('Other child '+player+' receives animated Tideglow');c.close()
   b.close()
  q.check('No JavaScript errors',not q.errors)
 (out/'browser-results.json').write_text(json.dumps({'pass':True,'checks':q.checks,'physicalIPadOS1541':False,'note':'Modern engines with iOS15 user agent route, actual canvas pixel changes, synthetic intercepted APIs, no student mutation.','url':q.base},ensure_ascii=False,indent=2)+'\n')

if __name__=="__main__":main()
