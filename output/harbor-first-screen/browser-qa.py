from playwright.sync_api import sync_playwright
from pathlib import Path
import json
fixtures=json.loads(Path('/tmp/star-tide-harbor-private/local.json').read_text())
out=Path('output/harbor-first-screen');results=[];errors=[];offline_errors=[]
measure="""()=>{let e=document.querySelector('.harbor-departure-start'),r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom,right:r.right,scroll:scrollY,overflow:document.documentElement.scrollWidth>innerWidth+1,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),ruby:[...e.querySelectorAll('rt')].map(t=>{let q=t.getBoundingClientRect();return {x:q.x,right:q.right,y:q.y,b:q.bottom}})}}"""
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=p.chromium.launch(channel='chrome',headless=True) if engine=='chromium' else p.webkit.launch(headless=True)
  for f in fixtures:
   c=b.new_context(viewport={'width':375,'height':667});page=c.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:(offline_errors if '/api/state due to access control checks.' in str(e) and engine=='webkit' else errors).append(str(e)))
   page.route('**/api/dragon/**',lambda r:r.fulfill(status=503,content_type='application/json',body='{}'))
   page.goto('http://localhost:4364');page.get_by_placeholder('英文字母、數字或底線').fill(f['username']);page.get_by_placeholder('請輸入密碼').fill(f['password']);page.get_by_role('button',name='登入，繼續冒險 →').click();page.locator('.harbor-departure-start').wait_for();page.wait_for_timeout(350)
   sizes=[(320,568),(375,667),(375,812),(820,1180),(1180,820),(1440,900)] if f['state'] in ['new','ready'] else [(375,667)]
   for w,h in sizes:
    page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo(0,0)');page.wait_for_timeout(100);m=page.evaluate(measure)
    assert m['scroll']==0 and m['y']>=0 and m['b']<=h and m['h']>=48 and m['hit'] and not m['overflow'],(engine,f['grade'],f['state'],w,m)
    for rt in m['ruby']:assert rt['x']>=m['x'] and rt['right']<=m['right'] and rt['y']>=m['y'] and rt['b']<=m['b'],(f,rt,m)
    if f['grade']==2:assert len(m['ruby'])>=2
    results.append({'engine':engine,'grade':f['grade'],'state':f['state'],'viewport':[w,h],'ctaBottom':round(m['b'],1),'pass':True})
    if f['state']=='new' and w in [375,820] and h!=812:page.screenshot(path=str(out/f'{engine}-grade{f["grade"]}-{w}.png'))
   page.set_viewport_size({'width':375,'height':667});page.evaluate('scrollTo(0,0)')
   snap=lambda:page.evaluate('async()=>{let s=await(await fetch("/api/state")).json();let p=s.family.profiles[s.playerId];return {run:p.run,math:p.mathIsland,coins:p.coins}}')
   before=snap();cta=page.locator('.harbor-departure-start')
   expected='選一座島出發' if f['state']=='new' else '領取獎勵' if f['state']=='reward' else '繼續挑戰'
   assert cta.get_attribute('aria-label')==expected
   c.set_offline(True);page.evaluate('window.dispatchEvent(new Event("offline"))');page.wait_for_timeout(100);assert cta.is_disabled();c.set_offline(False);page.evaluate('window.dispatchEvent(new Event("online"))');page.wait_for_timeout(500);assert cta.is_enabled()
   cta.click()
   if f['state']=='new':page.get_by_role('dialog',name='選擇學習科目').wait_for()
   else:
    page.locator('.harbor-departure-start').wait_for(state='hidden')
    if f['state']=='ready':page.locator('.ready-start').wait_for()
   after=snap();assert before==after,(engine,f['state'],'navigation mutated learning')
   page.reload();page.locator('.harbor-departure-start').wait_for();assert before==snap()
   c.close()
  b.close()
assert not errors,errors
(out/'browser-results.json').write_text(json.dumps({'checks':results,'errors':errors,'webkitOfflineNetworkRejections':len(offline_errors),'flows':['new','ready','legacy reward','failed remediation','math','settled'],'offlineBlocks':True,'navigationAndReloadPreserveLearning':True},indent=2));print('PASS',len(results),'layout checks, 22 state flows')
