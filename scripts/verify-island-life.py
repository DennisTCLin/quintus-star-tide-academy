"""Isolated browser fixtures for the cosmetic island habitat. No live player writes.
Run ISLAND_QA_URL=http://127.0.0.1:4242 /tmp/star-tide-hero-qa/bin/python scripts/verify-island-life.py
"""
import json, os, subprocess, time, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/island-life';OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('ISLAND_QA_URL','http://127.0.0.1:4242').rstrip('/')
checks=[];errors=[];issues=[]
NODE=r'''import * as g from './build/game.mjs';let f=g.newFamily(),all=g.ROSTER;for(const [i,p]of Object.values(f.profiles).entries()){let pets=i===0?all:i===1?[all[0],all[3],all[9],all[14],all[25],all[49],all[50],all[53],all.at(-1),...all.filter(c=>c.id.startsWith('w2-')).slice(0,3)]:[all[2],all[4]];p.owned=Object.fromEntries(pets.map(c=>[c.id,3]));p.equipped=pets[0].id;p.growth.xp[p.equipped]=225;p.territory=g.territoryTransition(undefined,{action:'start'},Date.now(),p.owned);if(i===0){p.territory.expansion=2;for(let n=1;n<24;n++)p.territory.buildings.push({id:n+1,kind:['grove','quarry','garden','well'][n%4],level:1,plot:n,resident:null});p.territory.nextId=25;}p.territory.buildings.push({id:99,kind:'garden',level:1,plot:null,resident:null});p.territory.nextId=100;}console.log(JSON.stringify({family:f,questions:{},username:'island-visual-fixture',csrf:'fixture',day:g.taipeiDay(),verified:{quintus:0,feifei:0,qingqing:0,doudou:0},legacy:false,canMigrate:false,serverNow:Date.now()}));'''
def fixture():return json.loads(subprocess.check_output(['node','--input-type=module','-e',NODE],cwd=ROOT,text=True))
def check(ok,name,**details):
 (checks if ok else issues).append(dict(check=name,**details));print(('PASS 'if ok else 'FAIL ')+name,flush=True)
def positions(p):return p.locator('.island-pet').evaluate_all('(es)=>es.map(e=>({id:e.dataset.pet,transform:e.style.transform,mood:e.dataset.mood}))')
def plain(loc):return loc.evaluate('(e)=>{let c=e.cloneNode(true);c.querySelectorAll("rt,rp").forEach(e=>e.remove());return c.textContent.replace(/\\s+/g,"")}')
def setup(browser,width,height,player='feifei',reduced=False,empty=False):
 s=fixture();s['playerId']=player
 if empty:s['family']['profiles'][player]['owned']={}
 c=browser.new_context(viewport=dict(width=width,height=height),reduced_motion='reduce'if reduced else 'no-preference')
 p=c.new_page();p.set_default_timeout(12000);p.on('pageerror',lambda e:errors.append(str(e)));calls=[]
 def route(r):
  if any(x in r.request.url for x in ['/api/presence','/api/friends']):r.fulfill(json={'serverNow':int(time.time()*1000),'friends':[]});return
  if r.request.method=='POST' and r.request.url.endswith('/command'):
   command=r.request.post_data_json['command'];calls.append(command)
   if command.get('type')=='territory' and command.get('action')=='theme':s['family']['profiles'][player]['territory']['theme']=command['theme'];s['family']['revision']+=1
  r.fulfill(json=s)
 p.route('**/api/**',route);p.goto(BASE);p.wait_for_load_state('networkidle');p.locator('.family-nav button').nth(6).click();p.locator('.castle-view-switch button').nth(1).click();p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(400)
 return c,p,s,calls

def layout(browser,width,height,player='feifei',reduced=False,empty=False):
 c,p,s,calls=setup(browser,width,height,player,reduced,empty);tag=f'{player}-{width}-'+('reduced'if reduced else 'motion')+('-empty'if empty else '')
 try:
  expected=min(len(s["family"]["profiles"][player]["owned"]),6 if width<=600 else 8)
  check(p.locator('.island-pet').count()==expected,tag+' bounded owned residents')
  check(p.evaluate('document.documentElement.scrollWidth<=innerWidth'),tag+' no page overflow')
  check(p.locator('.island-pet img').evaluate_all('(es)=>es.every(e=>e.complete&&e.naturalWidth>0)'),tag+' all images loaded')
  a=positions(p);p.wait_for_timeout(1700);b=positions(p)
  check((a==b)if reduced or empty else any(x['transform']!=y['transform'] for x,y in zip(a,b)),tag+' appropriate movement')
  p.locator('.territory-map-viewport').screenshot(path=str(OUT/(tag+'-map.png')))
  p.locator('.island-habitat').screenshot(path=str(OUT/(tag+'-habitat.png')))
  if empty:return
  p.locator('.island-life-friends button').first.focus();p.keyboard.press('Enter')
  check('：'in plain(p.locator('.island-life-greeting')),tag+' keyboard greeting')
  check(not calls,tag+' greeting never writes game state')
  p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(200)
  if not reduced:
   p.locator('.island-life-actions button').last.click();p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(100)
   a=positions(p);p.wait_for_timeout(1300);check(a==positions(p),tag+' pause freezes simulation')
   check(p.locator('.island-pet-body').evaluate_all('(es)=>es.every(e=>getComputedStyle(e).animationPlayState==="paused")'),tag+' pause freezes animation')
  old={x['id'] for x in positions(p)};p.locator('.island-life-actions button').first.click();check({x['id']for x in positions(p)}!=old,tag+' manual rotation');check(positions(p)[0]['id']==s['family']['profiles'][player]['equipped'],tag+' equipped stays')
  # Every plot centre remains reachable while companions move or rest.
  blocked=[]
  for i in range(24 if player=='quintus' else 8):
   loc=p.locator('.territory-plot').nth(i);loc.scroll_into_view_if_needed()
   if not loc.evaluate('(e)=>{let r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'):blocked.append(i)
  check(not blocked,tag+' building centres unobstructed',blocked=blocked)
  p.get_by_label('放大地圖',exact=True).click();p.get_by_label('放大地圖',exact=True).click();check('150%'in p.get_by_label('重設地圖縮放').inner_text(),tag+' zoom 150%');p.get_by_label('重設地圖縮放').click()
  # Real land selection via normal pointer, inspector opened without a cloud command.
  p.locator('.territory-plot').nth(1).click();check(p.locator('.territory-plot').nth(1).get_attribute('aria-pressed')=='true',tag+' plot click works')
  p.locator('.territory-map-viewport').scroll_into_view_if_needed()
  if not reduced:
   p.locator('.island-life-actions button').last.click();p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(100)
   check('is-running'in p.locator('.island-habitat').get_attribute('class'),tag+' resume')
   # Offscreen observer and visibility are independent pause sources.
   p.locator('.territory-workbench').scroll_into_view_if_needed();p.evaluate('window.scrollTo(0,document.body.scrollHeight)');p.wait_for_timeout(300)
   a=positions(p);p.wait_for_timeout(800);check(a==positions(p),tag+' offscreen paused')
   p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(300)
   p.emulate_media(reduced_motion='reduce');p.wait_for_timeout(100);a=positions(p);p.wait_for_timeout(800);check(a==positions(p),tag+' live OS reduce stops JS')
   p.emulate_media(reduced_motion='no-preference');p.wait_for_timeout(200)
  # Update owned data through the normal API refresh, including an equipped replacement.
  new=s['family']['profiles'][player];new['owned']={'otter':2};new['equipped']='otter';s['family']['revision']+=1
  p.evaluate('window.dispatchEvent(new Event("focus"))');p.wait_for_timeout(1100)
  # The cloud hook polls; reload tests ownership hydration and old actor cleanup as well.
  p.reload();p.wait_for_load_state('networkidle');p.locator('.family-nav button').nth(6).click();p.locator('.castle-view-switch button').nth(1).click()
  check([x['id']for x in positions(p)]==['otter'],tag+' new ownership removes old residents')
  p.locator('.castle-view-switch button').nth(0).click();check(p.locator('.island-pet').count()==0,tag+' exterior unmounts residents')
 finally:c.close()

if __name__=="__main__":
 with sync_playwright()as pw:
  b=pw.chromium.launch(headless=True,channel='chrome')
  for args in [(1440,1000,'feifei',False,False),(390,844,'feifei',False,False),(320,568,'quintus',False,False),(768,1024,'feifei',True,False),(390,844,'feifei',True,True)]:
   # Qingqing has only two owned: allow full batch assertion separately.
   if args[2]=='qingqing':continue
   try:layout(b,*args)
   except Exception as e:issues.append({'case':args,'error':str(e),'traceback':traceback.format_exc()});print('ERROR',args,str(e),flush=True)
  b.close()
 (OUT/'browser-checks.json').write_text(json.dumps(dict(base=BASE,checks=checks,issues=issues,pageErrors=errors),ensure_ascii=False,indent=2))
 print(json.dumps(dict(checks=len(checks),issues=len(issues),errors=errors)),flush=True)
 if issues or errors:raise SystemExit(1)
