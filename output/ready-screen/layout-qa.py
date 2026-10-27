from playwright.sync_api import sync_playwright
from pathlib import Path
import json
OUT=Path('output/ready-screen');BASE='http://localhost:4356';results=[];errors=[]
def login(b,grade,viewport):
 c=b.new_context(viewport=viewport);page=c.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE);page.wait_for_load_state('networkidle');page.get_by_placeholder('英文字母、數字或底線').fill('ready_'+str(grade));page.get_by_placeholder('請輸入密碼').fill('0742');page.get_by_role('button',name='登入，繼續冒險 →').click();page.get_by_role('button',name='繼續挑戰',exact=True).click();page.locator('.ready-start:not([disabled])').wait_for();return c,page
measure='''()=>{const box=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom}};return{vw:innerWidth,vh:innerHeight,docW:document.documentElement.scrollWidth,scroll:scrollY,start:box('.ready-start'),modes:[...document.querySelectorAll('.challenge-modes label')].map(e=>{const r=e.getBoundingClientRect();return{y:r.y,b:r.bottom,h:r.height}}),stage:box('.quiz-stage'),help:box('.ready-help'),launcher:!!document.querySelector('.tide-launcher')}}'''
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=p.chromium.launch(channel='chrome',headless=True) if engine=='chromium' else p.webkit.launch(headless=True)
  for grade in [1,2,4,6]:
   c,page=login(b,grade,{'width':390,'height':844})
   for w,h in [(320,568),(375,667),(390,744),(820,1180),(1180,820),(1440,900),(812,375)]:
    page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo(0,0)');page.wait_for_timeout(150);m=page.evaluate(measure)
    assert m['docW']<=w+1,(engine,grade,w,'overflow',m)
    assert m['start']['y']>=0 and m['start']['b']<=h+1 and m['start']['h']>=44,(engine,grade,w,'start hidden',m)
    assert all(x['y']>=0 and x['b']<=m['start']['y'] and x['h']>=44 for x in m['modes']),(engine,grade,w,'modes hidden',m)
    assert not page.locator('.tide-launcher:visible').count(),(engine,grade,'mascot overlap')
    assert page.locator('.challenge-modes input:checked').count()==1
    results.append({'engine':engine,'grade':grade,'viewport':[w,h],'pass':True,'stageHeight':m['stage']['h']})
    if w in [320,390,820]:page.screenshot(path=str(OUT/f'{engine}-grade{grade}-{w}.png'))
   c.close()
  b.close()
 assert not errors,errors
 (OUT/'layout-results.json').write_text(json.dumps({'checks':results,'errors':errors},indent=2));print('PASS',len(results))
