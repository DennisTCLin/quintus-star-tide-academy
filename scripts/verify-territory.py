"""Real PostgreSQL territory flow in isolated QA accounts; never uses player accounts."""
import json, subprocess, time, uuid, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect, TimeoutError as PlaywrightTimeoutError
BASE=os.environ.get('TERRITORY_QA_URL','http://127.0.0.1:4287')
OUT=Path(os.environ.get('TERRITORY_QA_OUT','outputs/territory'));OUT.mkdir(exist_ok=True)
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import * as g from './build/game.mjs';let f=g.newFamily();for(const p of Object.values(f.profiles)){p.coins=456;p.tickets=3;p.milestones.masteryPoints=123;p.owned[g.ROSTER[1].id]=2;p.firstAcquired[g.ROSTER[1].id]=null;}console.log(JSON.stringify(f));"]))
rows=[];errors=[];sync_retries=[]
def click_command(page, target):
 # Background state polling can reject a click before any command is sent.
 # Retry only that explicit local busy notice; never replay an unknown outcome.
 for attempt in range(3):
  sent=[]
  def track(request):
   if request.url.endswith('/api/command'):sent.append(request.url)
  page.on('request',track)
  try:
   with page.expect_response(lambda r:r.url.endswith('/api/command'),timeout=15000) as response:target.click()
   result=response.value;assert result.ok,result.text()
   return result.json()
  except PlaywrightTimeoutError:
   notice=page.locator('.notice').all_inner_texts()
   if not sent and any('正在同步，請稍後再試' in text for text in notice):
    sync_retries.append({'attempt':attempt+1,'reason':'background poll busy; no command request sent'})
    page.wait_for_timeout(200)
    continue
   page.screenshot(path=str(OUT/'cloud-failure.png'),full_page=True)
   print(json.dumps({'failure':'command timeout','sent':len(sent),'notice':notice},ensure_ascii=False),flush=True)
   raise
  finally:page.remove_listener('request',track)
 raise AssertionError('Background sync remained busy after three attempts')

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,channel='chrome')
 ctx=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 username='landqa_'+uuid.uuid4().hex[:12];password='territory-test-password-2026'
 r=ctx.request.post(BASE+'/api/register',data={'username':username,'password':password},headers={'Origin':BASE});assert r.status==200,r.text();state=r.json()
 r=ctx.request.post(BASE+'/api/migrate',data={'id':str(uuid.uuid4()),'revision':0,'snapshot':fixture},headers={'Origin':BASE,'X-CSRF-Token':state['csrf']});assert r.status==200,r.text();state=r.json()
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE,wait_until='networkidle')
 initial_territory_assets=page.evaluate("performance.getEntriesByType('resource').filter(r=>r.name.includes('/territory/')||r.name.includes('TerritoryPage')).map(r=>r.name)")
 assert not initial_territory_assets,initial_territory_assets
 page.get_by_role('button',name='Quintus',exact=False).click()
 page.locator('.family-nav button').filter(has_text='領地').click()
 expect(page.get_by_role('button',name='開啟我的領地')).to_be_visible()
 click_command(page, page.get_by_role('button',name='開啟我的領地'))
 expect(page.locator('.territory-map')).to_be_visible()
 click_command(page, page.get_by_role('button',name='確認建造',exact=True))
 expect(page.locator('.territory-inspector h3').first).to_contain_text('靈木林場')
 page.screenshot(path=str(OUT/'first-build-desktop.png'),full_page=True)
 frame_metrics=page.evaluate('''async()=>{const times=[];let prev;await new Promise(resolve=>{function frame(t){if(prev!==undefined)times.push(t-prev);prev=t;if(times.length<120)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});times.sort((a,b)=>a-b);return {samples:times.length,p95FrameIntervalMs:times[Math.floor(times.length*.95)],maxFrameIntervalMs:times.at(-1),territoryResources:performance.getEntriesByType('resource').filter(r=>r.name.includes('/territory/')||r.name.includes('TerritoryPage')).map(r=>({name:r.name.split('/').at(-1),bytes:r.decodedBodySize,durationMs:r.duration}))};}''')
 (OUT/'frontend-performance.json').write_text(json.dumps({'scope':'Headless desktop Chromium, reduced motion; no mobile hardware or network throttle claim','noTerritoryAssetsOnEntry':True,**frame_metrics},indent=2))
 click_command(page, page.get_by_role('button',name='升到 2 級',exact=True))
 expect(page.locator('.territory-inspector h3').first).to_contain_text('2 級')
 page.get_by_role('button',name='免費搬移',exact=True).click()
 page.get_by_role('button',name='土地 3，空地',exact=True).click()
 click_command(page, page.get_by_role('button',name='放在這裡',exact=True))
 expect(page.locator('.territory-message')).to_contain_text('新的位置')
 click_command(page, page.get_by_role('button',name='收進收納屋',exact=True))
 page.get_by_role('tab',name='收納屋',exact=True).click()
 page.locator('.territory-storage .territory-blueprint').click()
 click_command(page, page.get_by_role('button',name='放在這裡',exact=True))
 expect(page.locator('.territory-inspector h3').first).to_contain_text('2 級')
 page.locator('.territory-resident-picker select').select_option(index=1)
 expect(page.locator('.territory-resident')).to_have_count(1)
 page.get_by_role('tab',name='和平委託',exact=True).click()
 click_command(page, page.get_by_role('button',name='完成委託',exact=True))
 expect(page.locator('.territory-message')).to_contain_text('新的和平委託')
 click_command(page, page.get_by_role('button',name='領取禮物',exact=True).first)
 click_command(page, page.get_by_role('button',name='星夜',exact=True))
 expect(page.locator('.territory-page')).to_have_class('territory-page territory-night')
 # Simulate a committed build whose response is lost, then automatic UUID retry.
 page.get_by_role('tab',name='建築圖鑑',exact=True).click()
 page.locator('.territory-blueprint').filter(has_text='繁花庭園').click()
 delivered=[]
 def dropped_response(route):
  body=route.request.post_data_json
  if body.get('command',{}).get('action')=='build':
   delivered.append(body['id'])
   if len(delivered)==1:
    result=route.fetch();assert result.status==200;route.abort('failed');return
  route.continue_()
 page.route('**/api/command',dropped_response)
 click_command(page, page.get_by_role('button',name='確認建造',exact=True))
 expect(page.locator('.territory-message')).to_contain_text('繁花庭園建好了')
 assert len(delivered)==2 and delivered[0]==delivered[1],delivered
 page.unroute('**/api/command',dropped_response)
 ctx.set_offline(True);expect(page.locator('.cloud-status')).to_have_class('cloud-status offline')
 expect(page.get_by_role('button',name='星夜',exact=True) if page.get_by_role('button',name='星夜',exact=True).count() else page.get_by_role('button',name='晨光',exact=True)).to_be_disabled()
 ctx.set_offline(False);expect(page.locator('.cloud-status')).not_to_have_class('cloud-status offline',timeout=15000)
 rows.append({'case':'lost-response-idempotent-retry-and-offline-recovery','result':'pass'})
 saved=ctx.request.get(BASE+'/api/state').json()
 for key,old in state['family']['profiles'].items():
  current=dict(saved['family']['profiles'][key]);current.pop('territory',None);assert current==old, key
 assert saved['verified']==state['verified']
 rows.append({'case':'real-build-upgrade-move-store-resident-commission-achievement-theme','result':'pass'})
 page.reload(wait_until='networkidle');page.locator('.player-quintus').click();page.locator('.family-nav button').filter(has_text='領地').click()
 expect(page.locator('.territory-page')).to_have_class('territory-page territory-night')
 expect(page.locator('.territory-resident')).to_have_count(1)
 second=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 login=second.request.post(BASE+'/api/login',data={'username':username,'password':password},headers={'Origin':BASE});assert login.status==200
 assert login.json()['family']['profiles']['quintus']['territory']==saved['family']['profiles']['quintus']['territory']
 q=second.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.goto(BASE,wait_until='networkidle');q.locator('.player-quintus').click();q.locator('.family-nav button').filter(has_text='領地').click();expect(q.locator('.territory-map')).to_be_visible()
 assert not q.evaluate('document.documentElement.scrollWidth>innerWidth+1')
 q.screenshot(path=str(OUT/'mobile-real.png'),full_page=True)
 click_command(q, q.get_by_role('button',name='晨光',exact=True));expect(q.locator('.territory-page')).to_have_class('territory-page ')
 rows.append({'case':'reload-second-device','result':'pass'})
 # Exercise complete layouts with synthetic response state; no synthetic write claims.
 advanced=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import * as g from './build/game.mjs';let t=g.territoryTransition(undefined,{action:'start'},Date.now(),{});t.renown=2000;t.expansion=2;t.resources={wood:3000,stone:3000,star:3000};const kinds=['grove','quarry','well','workshop','bakery','greenhouse','observatory','harbor','academy','fountain','statue','lantern','garden','bridge','pavilion'];for(let i=0;i<kinds.length;i++){t.buildings.push({id:i+2,kind:kinds[i],level:3,plot:i+1,resident:null});}t.nextId=17;console.log(JSON.stringify(t));"]))
 for width,player in [(1440,'quintus'),(768,'quintus'),(390,'qingqing'),(320,'feifei')]:
  ui=browser.new_context(viewport={'width':width,'height':900},reduced_motion='reduce');p=ui.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
  seed=json.loads(json.dumps(saved));seed['playerId']=player;seed['family']['profiles'][player]['territory']=advanced
  p.route('**/api/**',lambda route:route.fulfill(json=seed))
  p.goto(BASE,wait_until='networkidle');p.locator('.family-nav button').filter(has_text='領').click();expect(p.locator('.territory-map')).to_be_visible()
  if p.evaluate('document.documentElement.scrollWidth>innerWidth+1'):
   print(p.evaluate('({w:innerWidth,sw:document.documentElement.scrollWidth,out:[...document.querySelectorAll(\"body *\")].filter(e=>!e.closest(\".family-nav,.territory-map-viewport\")).map(e=>({cls:String(e.className),text:e.textContent.slice(0,25),x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right})).filter(r=>r.right>innerWidth+1).slice(0,30)})'))
  assert not p.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,'overflow')
  p.locator('.territory-map-shell').screenshot(path=str(OUT/f'map-{width}.png'))
  p.screenshot(path=str(OUT/f'layout-{width}.png'),full_page=True)
  p.get_by_role('button',name='放大地圖',exact=True).click();expect(p.get_by_role('button',name='重設地圖縮放')).to_have_text('125%')
  p.get_by_role('button',name='重設地圖縮放').click()
  p.evaluate('document.documentElement.style.fontSize="200%"')
  assert not p.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,'zoom overflow')
  rows.append({'case':'layout-reduced-motion-map-zoom-root-font-change','width':width,'player':player,'result':'pass'})
  ui.close()
 assert not errors,errors
 (OUT/'browser-verification.json').write_text(json.dumps({'cases':rows,'errors':errors,'preserved':'all four profiles excluding additive territory; verified scores identical','synthetic_scope':'populated layout only; gameplay on real PostgreSQL','base_url':BASE,'backgroundSyncRetries':sync_retries,'font_test_note':'Root font size change does not enlarge all fixed-pixel text; separate text-only simulation evidence covers that.'},ensure_ascii=False,indent=2))
 print('PASS',json.dumps(rows,ensure_ascii=False))


 browser.close()
