from playwright.sync_api import sync_playwright
from pathlib import Path
import json
OUT=Path('output/progress-top');BASE='http://localhost:4348';results=[];errors=[]
def login(b,suffix):
 print('fixture',suffix,flush=True)
 ctx=b.new_context(viewport={'width':390,'height':844});page=ctx.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);page.wait_for_load_state('networkidle');page.get_by_placeholder('英文字母、數字或底線').fill('console_'+suffix);page.get_by_placeholder('請輸入密碼').fill('0742');page.get_by_role('button',name='登入，繼續冒險 →').click();page.get_by_role('button',name='繼續挑戰',exact=True).click();page.locator('[data-answer-option]').first.wait_for();return ctx,page
measure='''()=>{const box=s=>{let e=document.querySelector(s),r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom,scroll:e.scrollHeight,client:e.clientHeight}};return {vw:innerWidth,vh:innerHeight,docH:document.documentElement.scrollHeight,docW:document.documentElement.scrollWidth,stage:box('.quiz-stage'),reading:box('.quiz-question-reading'),prompt:box('.question-panel h1'),bank:box('.quiz-answer-bank'),answers:[...document.querySelectorAll('[data-answer-option]')].map(e=>{let r=e.getBoundingClientRect();return {x:r.x,y:r.y,b:r.bottom,h:r.height,w:r.width}})}}'''
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=p.chromium.launch(channel='chrome',headless=True) if engine=='chromium' else p.webkit.launch(headless=True)
  for suffix in (['short','ruby','long','image','english','pictures','englishlong'] if engine=='chromium' else ['short','image','english']):
   ctx,page=login(b,suffix)
   sizes=[(320,568),(375,667),(390,844),(820,1180),(1180,820),(1366,768),(812,375)] if engine=='chromium' else [(390,844),(820,1180),(1180,820)]
   for w,h in sizes:
    page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(160)
    if suffix=='image':page.locator('.question-figure img').wait_for();page.wait_for_function('()=>document.querySelector(".question-figure img").complete')
    m=page.evaluate(measure);assert m['docW']<=w and m['docH']<=h+1,(engine,suffix,w,m)
    assert m['stage']['h']>=50 and m['stage']['b']<=m['reading']['y'],(engine,suffix,w,m)
    assert m['reading']['h']>=55,(engine,suffix,w,'reading collapsed',m)
    assert all(a['y']>=m['stage']['b'] and a['b']<=h and a['h']>=44 and a['x']>=0 and a['x']+a['w']<=w+1 for a in m['answers']),(engine,suffix,w,m)
    assert m['bank']['scroll']<=m['bank']['client']+1,(engine,suffix,w,'answers need scroll',m)
    if suffix=='short':assert m['prompt']['b']<=m['reading']['b'],m
    results.append({'engine':engine,'fixture':suffix,'viewport':[w,h],'pass':True,'stageHeight':round(m['stage']['h']),'readingHeight':round(m['reading']['h'])})
    if (suffix=='short' and w in [375,820,1180]) or (suffix in ['long','image','english','pictures','englishlong'] and w==390):page.screenshot(path=str(OUT/f'{engine}-{suffix}-{w}.png'))
   page.get_by_role('button',name='展開題目',exact=True).click();page.wait_for_timeout(100);expanded=page.evaluate(measure);assert expanded['stage']['h']>50 and expanded['docH']<=page.viewport_size['height']+1
   page.get_by_role('button',name='收合題目',exact=True).click();ctx.close()
  b.close()
 assert not errors,errors
 (OUT/'layout-results.json').write_text(json.dumps({'checks':results,'errors':errors,'pass':True},ensure_ascii=False,indent=2));print(json.dumps({'checks':len(results),'pass':True}))
