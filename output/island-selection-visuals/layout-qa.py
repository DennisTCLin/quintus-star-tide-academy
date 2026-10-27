from playwright.sync_api import sync_playwright
from pathlib import Path
import json
OUT=Path('output/island-selection-visuals');BASE='http://localhost:4358';results=[];errors=[]
measure='''()=>{const obj=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom,right:r.right}};const scene=document.querySelector('.archipelago-scene');const buttons=[...scene.querySelectorAll('.archipelago-stop')];return{vw:innerWidth,vh:innerHeight,docW:document.documentElement.scrollWidth,scene:obj(scene),card:obj(document.querySelector('.journey-card')),cta:obj(document.querySelector('.journey-resume')),stops:buttons.map(e=>({...obj(e),text:e.textContent,hit:()=>false})),launcher:!!document.querySelector('.tide-launcher'),ruby:[...document.querySelectorAll('.archipelago-stop rt')].map(obj)}}'''
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=p.chromium.launch(channel='chrome',headless=True) if engine=='chromium' else p.webkit.launch(headless=True)
  for grade in [1,2,4,6]:
   c=b.new_context(viewport={'width':390,'height':844});page=c.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(BASE);page.get_by_placeholder('英文字母、數字或底線').fill('island_'+str(grade));page.get_by_placeholder('請輸入密碼').fill('0742');page.get_by_role('button',name='登入，繼續冒險 →').click();page.locator('#adventure-islands').wait_for();page.wait_for_load_state('networkidle')
   for w,h in [(320,568),(390,744),(820,1180),(1180,820),(1440,900),(812,375)]:
    page.set_viewport_size({'width':w,'height':h});page.evaluate("document.querySelector('#adventure-islands').scrollIntoView({block:'start',behavior:'instant'})");page.wait_for_timeout(200);m=page.evaluate(measure)
    assert m['docW']<=w+1,(engine,grade,w,'overflow',m)
    assert m['cta']['y']>=0 and m['cta']['b']<=h+1,(engine,grade,w,'cta hidden',m)
    assert not m['launcher'],(engine,grade,'mascot overlays')
    assert len(m['stops'])==5
    for i,x in enumerate(m['stops']):
     assert x['w']>=44 and x['h']>=44,(engine,grade,w,'small target',x)
     assert x['x']>=m['scene']['x']-1 and x['right']<=m['scene']['right']+1 and x['y']>=m['scene']['y']-1 and x['b']<=m['scene']['b']+1,(engine,grade,w,'outside map',m)
     for y in m['stops'][i+1:]:assert x['right']<=y['x'] or y['right']<=x['x'] or x['b']<=y['y'] or y['b']<=x['y'],(engine,grade,w,'overlap',x,y)
    for x in m['ruby']:assert x['x']>=m['scene']['x']-1 and x['right']<=m['scene']['right']+1,(engine,grade,w,'ruby clip',x)
    assert page.locator('.archipelago-stop[aria-current="location"]').count()==1
    results.append({'engine':engine,'grade':grade,'viewport':[w,h],'cardHeight':m['card']['h'],'mapHeight':m['scene']['h'],'pass':True})
    if w in [320,390,820]:page.screenshot(path=str(OUT/f'{engine}-grade{grade}-{w}.png'))
   # All map targets receive real pointer events, using the current island to avoid changing test progress.
   page.set_viewport_size({'width':390,'height':844});page.locator('.archipelago-stop[aria-current="location"]').click();page.locator('.ready-start').wait_for()
   c.close()
  b.close()
 assert not errors,errors
 (OUT/'layout-results.json').write_text(json.dumps({'checks':results,'errors':errors},indent=2));print('PASS',len(results))
