"""Real Chromium, isolated account fixtures; never writes a live player."""
import importlib.util,json,time,traceback
from pathlib import Path
spec=importlib.util.spec_from_file_location('island_qa',Path(__file__).with_name('verify-island-life.py'))
q=importlib.util.module_from_spec(spec);spec.loader.exec_module(q)
OUT=q.ROOT/'outputs/island-animation';OUT.mkdir(exist_ok=True)
def enter(p):
 p.locator('.family-nav button').nth(6).click()
 p.locator('.territory-map-viewport').wait_for(state='visible')
 p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(500)
def snapshot(p):
 return p.locator('.island-pet').evaluate_all('es=>es.map(e=>({id:e.dataset.pet,pos:e.style.transform,mode:e.dataset.animation,frame:e.querySelector("canvas").dataset.frame,clip:e.querySelector("canvas").dataset.clip,pixels:e.querySelector("canvas").toDataURL()}))')
def setup(b,width,reduced=False,broken=None):
 s=q.fixture();s['playerId']='feifei';profile=s['family']['profiles']['feifei'];profile['owned']={'tideglow':1,'cometcrane':2,'pebblefin':1};profile['equipped']='tideglow'
 c=b.new_context(viewport={'width':width,'height':1000 if width>600 else 844},reduced_motion='reduce'if reduced else 'no-preference',device_scale_factor=2)
 p=c.new_page();p.set_default_timeout(12000);p.on('pageerror',lambda e:q.errors.append(str(e)));commands=[];assets=[]
 def route(r):
  if r.request.method=='POST' and r.request.url.endswith('/command'):commands.append(r.request.post_data_json)
  r.fulfill(json={'friends':[],'serverNow':s['serverNow']}if any(k in r.request.url for k in ['/api/presence','/api/friends'])else s)
 p.route('**/api/**',route)
 p.on('request',lambda r:assets.append(r.url)if '/assets/island-motion/'in r.url else None)
 if broken=='404':p.route('**/assets/island-motion/*walk.webp*',lambda r:r.fulfill(status=404,body='not found'))
 if broken=='dimensions':p.route('**/assets/island-motion/*walk.webp*',lambda r:r.fulfill(path=str(q.ROOT/'public/assets/companions/cometcrane.webp')))
 p.goto(q.BASE);p.wait_for_load_state('networkidle');enter(p)
 return c,p,s,commands,assets
def run(b,width,reduced=False,broken=None):
 c,p,s,commands,assets=setup(b,width,reduced,broken);tag=f'{width}-'+('reduced'if reduced else broken or 'frames')
 try:
  q.check(p.locator('.island-pet').count()==3,tag+' exact ownership without duplicate copies')
  q.check(p.evaluate('document.documentElement.scrollWidth<=innerWidth'),tag+' no page overflow')
  p.wait_for_timeout(1200)
  first=snapshot(p);seen={x['id']:set([x['pixels']])for x in first};seen_frames={x['id']:set([x.get('frame')])for x in first}
  for i in range(24):
   p.wait_for_timeout(200)
   for x in snapshot(p):seen[x['id']].add(x['pixels']);seen_frames[x['id']].add(x.get('frame'))
  last=snapshot(p)
  q.check(p.locator('.island-pet-body').evaluate_all('es=>es.every(e=>getComputedStyle(e).animationName==="none"&&getComputedStyle(e).transform==="none")'),tag+' no whole-portrait fake motion')
  if reduced:
   q.check(first==last,tag+' positions and pixels stay still');q.check(not assets,tag+' reduced motion loads no atlases')
  else:
   for pet in ['tideglow','cometcrane']:
    q.check(len(seen[pet])>8,tag+' actual changing image pixels '+pet,uniqueFrames=len(seen[pet]))
   a={x['id']:x for x in first};z={x['id']:x for x in last}
   for pet in ['tideglow','cometcrane']:
    q.check((a[pet]['pos']==z[pet]['pos'])if broken else(a[pet]['pos']!=z[pet]['pos']),tag+' correct movement/fallback '+pet)
   q.check(a['pebblefin']==z['pebblefin'],tag+' unregistered companion rests without sliding')
   q.check(len(set(assets))==6,tag+' only two residents load six clips',requests=len(set(assets)))
  p.locator('.territory-map-viewport').screenshot(path=str(OUT/(tag+'-map.png')))
  if not reduced and not broken:
   # Both greeting clips play while their feet remain in place.
   p.locator('.island-life-friends button[aria-label^="向潮光獸打招呼"]').click()
   p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(200)
   actor=p.locator('.island-pet[data-pet=tideglow]');q.check(actor.locator('canvas').get_attribute('data-clip')=='play',tag+' greeting plays articulated reaction')
   a=actor.evaluate('e=>e.style.transform');p.wait_for_timeout(700);q.check(a==actor.evaluate('e=>e.style.transform'),tag+' greeting stays grounded')
   p.locator('.island-life-actions button').last.click();p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(100)
   a=snapshot(p);p.wait_for_timeout(900);q.check(a==snapshot(p),tag+' pause freezes both pixels and position')
   p.locator('.island-life-actions button').last.click();p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(300)
   # Every plot centre remains clickable with the exact visual layer active.
   blocked=[]
   for i in range(8):
    loc=p.locator('.territory-plot').nth(i);loc.scroll_into_view_if_needed()
    if not loc.evaluate('e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'):blocked.append(i)
   q.check(not blocked,tag+' building centres remain accessible',blocked=blocked)
   p.locator('.territory-map-viewport').scroll_into_view_if_needed()
   p.evaluate('Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"))');p.wait_for_timeout(150)
   a=snapshot(p);p.wait_for_timeout(700);q.check(a==snapshot(p),tag+' hidden stops pixels and movement')
   p.evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))');p.wait_for_timeout(150)
   p.evaluate('window.scrollTo(0,document.body.scrollHeight)');p.wait_for_timeout(250)
   a=snapshot(p);p.wait_for_timeout(700);q.check(a==snapshot(p),tag+' offscreen stops pixels and movement')
   p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.emulate_media(reduced_motion='reduce');p.wait_for_timeout(200)
   a=snapshot(p);p.wait_for_timeout(700);q.check(a==snapshot(p),tag+' runtime OS reduction stops both')
   q.check(p.locator('.island-pet[data-animation=still]').count()==3,tag+' reduced uses portraits')
  q.check(not commands,tag+' all habitat interactions write no player data')
 finally:c.close()
if __name__=='__main__':
 with q.sync_playwright()as pw:
  b=pw.chromium.launch(headless=True,channel='chrome')
  for args in [(1440,False,None),(390,False,None),(320,True,None),(390,False,'404'),(390,False,'dimensions')]:
   try:run(b,*args)
   except Exception as e:q.issues.append({'case':args,'error':str(e),'traceback':traceback.format_exc()});print(traceback.format_exc(),flush=True)
  b.close()
 (OUT/'browser-checks.json').write_text(json.dumps({'checks':q.checks,'issues':q.issues,'pageErrors':q.errors},ensure_ascii=False,indent=2))
 print(json.dumps({'checks':len(q.checks),'issues':len(q.issues),'errors':q.errors}),flush=True)
 if q.issues or q.errors:raise SystemExit(1)
