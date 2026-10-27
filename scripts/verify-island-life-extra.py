import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('qa',Path(__file__).with_name('verify-island-life.py'));q=importlib.util.module_from_spec(spec);spec.loader.exec_module(q)
with q.sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,channel='chrome')
 c,p,s,calls=q.setup(b,1440,1000)
 # Verify actual hit target and hover visual, not a forced click.
 target=next((e for e in p.locator('.island-pet').all() if e.evaluate('e=>e.style.pointerEvents==="auto"')),None)
 q.check(target is not None,'at least one free-ground pointer greeting')
 if target:
  target.hover();q.check(target.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgba(0, 0, 0, 0)','hover preserves transparent art')
  target.click();q.check('：'in q.plain(p.locator('.island-life-greeting')),'direct map greeting')
 p.locator('.territory-map-viewport').scroll_into_view_if_needed()
 # Simulated visibility event exercises JS lifecycle without changing game data.
 p.evaluate('Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"))');p.wait_for_timeout(150)
 a=q.positions(p);p.wait_for_timeout(750);q.check(a==q.positions(p),'hidden document stops simulation')
 p.evaluate('window.scrollTo(0,document.body.scrollHeight)');p.wait_for_timeout(200)
 p.evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))');p.wait_for_timeout(150)
 a=q.positions(p);p.wait_for_timeout(750);q.check(a==q.positions(p),'visible event does not resume offscreen map')
 p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(300)
 q.check('is-running'in p.locator('.island-habitat').get_attribute('class'),'visible onscreen resumes')
 metrics=p.evaluate('''async()=>{let a=[],last;await new Promise(resolve=>{function frame(t){if(last)a.push(t-last);last=t;if(a.length<120)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame)});a.sort((x,y)=>x-y);return {samples:a.length,p95:a[Math.floor(a.length*.95)],max:a.at(-1)}}''')
 q.check(metrics['p95']<50,'headless desktop frame pacing',**metrics)
 q.check(not calls,'cosmetic interactions send zero commands')
 # Day/night command kept separate from cosmetic interactions.
 p.locator('.territory-map-toolbar > div > button').last.click();p.wait_for_timeout(150)
 q.check('territory-night'in p.locator('.territory-page').get_attribute('class'),'night works with residents')
 p.locator('.territory-map-viewport').screenshot(path=str(q.OUT/'night-map.png'))
 # App preference (separate from OS preference) survives navigation.
 p.locator('.family-nav button').last.click();p.locator('.setting input[type=checkbox]').nth(1).check()
 p.locator('.family-nav button').nth(6).click();p.locator('.castle-view-switch button').nth(1).click();p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(150)
 a=q.positions(p);p.wait_for_timeout(800);q.check(a==q.positions(p),'app reduced preference stops JS')
 q.check('減少動態已開啟'in q.plain(p.locator('.island-life-actions')),'app reduced status')
 c.close()
 # Legacy family player switching exercises the mounted profile key.
 c=b.new_context(viewport=dict(width=1440,height=1000));p=c.new_page();s=q.fixture()
 def route(r):
  if any(t in r.request.url for t in ['/api/presence','/api/friends']):r.fulfill(json={'serverNow':s['serverNow'],'friends':[]})
  else:r.fulfill(json=s)
 p.route('**/api/**',route);p.goto(q.BASE);p.wait_for_load_state('networkidle');p.locator('.profile-card').nth(1).click()
 p.locator('.family-nav button').nth(6).click();p.locator('.castle-view-switch button').nth(1).click();p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(150)
 first=q.positions(p);p.get_by_label('切換玩家',exact=True).click();q.check(p.locator('.profile-card').count()==4,'player picker offers four profiles');p.locator('.profile-card').nth(2).click()
 p.locator('.family-nav button').nth(6).click();p.locator('.castle-view-switch button').nth(1).click();p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(150)
 q.check({x['id']for x in q.positions(p)}==set(s['family']['profiles']['qingqing']['owned']),'switch uses second player exact ownership')
 c.close()
 # Newly integrated catalog entries, captured monsters and garden pets coexist.
 c,p,s,calls=q.setup(b,390,844)
 pets=list(s['family']['profiles']['feifei']['owned']);new_ids=[x for x in pets if x.startswith('w2-')]
 owned=new_ids+['otter',pets[-4]]
 profile=s['family']['profiles']['feifei'];profile['owned']={x:1 for x in owned};profile['equipped']=new_ids[0];s['family']['revision']+=1
 p.reload();p.wait_for_load_state('networkidle');p.locator('.family-nav button').nth(6).click();p.locator('.castle-view-switch button').nth(1).click();p.locator('.territory-map-viewport').scroll_into_view_if_needed();p.wait_for_timeout(400)
 q.check(set(x['id']for x in q.positions(p))==set(owned),'new catalog and garden residents rendered')
 q.check(p.locator('.island-pet img').evaluate_all('(es)=>es.every(e=>e.complete&&e.naturalWidth>0)'),'new catalog art loads')
 q.check(p.locator('.island-pet[data-pet^="w2-"] img').evaluate_all('(es)=>es.every(e=>e.currentSrc.includes("-320.webp"))'),'new catalog uses lightweight thumbnails')
 p.locator('.territory-map-viewport').screenshot(path=str(q.OUT/'new-companions-390.png'))
 c.close()
 b.close()
(q.OUT/'extra-checks.json').write_text(json.dumps({'checks':q.checks,'issues':q.issues,'errors':q.errors,'visibilityNote':'visibility event simulated; browser paint/frame pacing real Chromium'},ensure_ascii=False,indent=2))
if q.issues or q.errors:raise SystemExit(1)
