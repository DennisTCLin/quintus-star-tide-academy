from pathlib import Path
import os,json
import subprocess
os.environ['QA_URL']=os.getenv('CORNER_QA_URL','http://127.0.0.1:47892')
ns={};exec(Path('output/floating-companion/browser-qa.py').read_text().split('with sync_playwright() as pw:')[0].replace("wait_until='networkidle'","wait_until='domcontentloaded',timeout=45000"),ns)
OUT=Path('output/corner-only-companion');(OUT/'screenshots').mkdir(exist_ok=True);rows=[]
geometry='''()=>{const shell=document.querySelector('.family-app'),host=document.querySelector('.tide-launcher'),button=host.querySelector('button'),s=shell.getBoundingClientRect(),r=button.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,shellBottom:s.bottom,shellHeight:s.height,shellOverflow:getComputedStyle(shell).overflowY,windowY:scrollY,position:getComputedStyle(host).position,visible:getComputedStyle(host).visibility!=='hidden',overflow:document.documentElement.scrollWidth>innerWidth+1,documentLocked:getComputedStyle(document.documentElement).overflowY==='hidden',backgrounds:[host,button,host.parentElement].map(e=>getComputedStyle(e).backgroundColor)}}'''
hit='''e=>{let r=e.getBoundingClientRect();return r.width>0&&r.height>0&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'''
with ns['sync_playwright']() as pw:
 for engine in ['webkit','chromium']:
  b=getattr(pw,engine).launch()
  for mascot in ['dog','bow','tideglow']:
   for w,h in [(320,568),(390,844),(820,1180),(1024,768),(1440,900),(844,390)]:
    c,p=ns['setup'](b,mascot,w,h);p.set_default_timeout(15000);launch=p.locator('.tide-launch');panel=p.locator('dialog.tide-panel');m=p.evaluate(geometry)
    assert m['position']=='fixed' and m['visible'] and not m['overflow'] and not m['documentLocked'],m
    assert m['shellOverflow']=='visible' and m['shellHeight']>h,m
    assert all(x=='rgba(0, 0, 0, 0)' for x in m['backgrounds']),m
    assert m['right']<=w and m['bottom']<=h and m['x']>=0 and m['y']>=0,m
    for y in [0,350,950,2000,99999]:
     p.evaluate('y=>window.scrollTo({top:y,behavior:"instant"})',y);p.wait_for_timeout(60);now=p.evaluate(geometry)
     assert abs(now['x']-m['x'])<1 and abs(now['y']-m['y'])<1 and now['visible'],now
     assert now['shellBottom']>=h-2,('blank strip under content',engine,mascot,w,now)
     assert p.evaluate('''()=>[.05,.25,.5].every(x=>!!document.elementFromPoint(innerWidth*x,innerHeight-24)?.closest('.family-app'))'''),('bottom content missing',engine,w,y)
    assert p.evaluate('scrollY')>0
    # Essential controls can be brought into view and tapped without the fixed character blocking them.
    for btn in p.locator('.family-nav button').all():
     btn.evaluate('e=>e.scrollIntoView({block:"center",behavior:"instant"})');assert btn.evaluate(hit),(engine,mascot,w,'nav hit')
    last=p.locator('.family-app button:not(.tide-launch)').last;last.evaluate('e=>e.scrollIntoView({block:"center",behavior:"instant"})');assert last.evaluate(hit),(engine,mascot,w,'last control')
    p.locator('.family-hero').evaluate('e=>e.scrollIntoView({block:"center",behavior:"instant"})');y=p.evaluate('scrollY');height=p.evaluate('document.documentElement.scrollHeight')
    launch.tap();ns['expect'](panel).to_be_visible();panel.locator('.tide-tabs button').nth(1).tap();ns['expect'](p.locator('.tide-voice-chat')).to_be_visible();p.keyboard.press('Escape');ns['expect'](launch).to_be_focused()
    assert abs(p.evaluate('scrollY')-y)<2 and p.evaluate('document.documentElement.scrollHeight')==height
    p.keyboard.press('Home');assert p.evaluate('scrollY')==0
    p.keyboard.press('PageDown');assert p.evaluate('scrollY')>0
    p.keyboard.press('End');assert p.evaluate('Math.abs(scrollY+innerHeight-document.documentElement.scrollHeight)<2')
    # A focused text field hides only the small launcher, never changes layout.
    p.evaluate('''()=>{let e=document.createElement('input');e.id='qa-field';e.style.cssText='position:fixed;left:10px;top:10px';document.body.append(e);e.focus()}''');ns['expect'](launch).to_be_hidden();p.locator('#qa-field').evaluate('e=>e.blur()');ns['expect'](launch).to_be_visible();p.locator('#qa-field').evaluate('e=>e.remove()')
    p.keyboard.press('Home');p.locator('.family-hero').evaluate('e=>e.scrollIntoView({block:"center",behavior:"instant"})')
    if mascot=='dog':p.wait_for_timeout(500);p.screenshot(path=str(OUT/'screenshots'/f'{engine}-{w}x{h}.png'))
    rows.append({'engine':engine,'mascot':mascot,'viewport':[w,h],'normalDocumentScroll':True,'noBottomStrip':True,'transparentContainers':True,'stableCornerAcrossScroll':True,'navAndLastControlAccessible':True,'panelFocusNoLayoutShift':True,'keyboardAndInputFocus':True});print('PASS',engine,mascot,w,h,flush=True);c.close()
  b.close()
assert not ns['errors'] and not ns['commands'],(ns['errors'],ns['commands'])
alpha=json.loads(subprocess.check_output(['python3','-c',"from PIL import Image;import json;p=Image.open('public/assets/olivia-dog/poster-v1.png');print(json.dumps({'transparentPixels':p.getchannel('A').histogram()[0],'pixels':p.width*p.height}))"],text=True));assert alpha['transparentPixels']>alpha['pixels']*.4
(OUT/('production-browser.json' if os.getenv('CORNER_QA_URL') else 'browser-results.json')).write_text(json.dumps({'checks':rows,'dogImageAlpha':alpha,'apiFixtures':True,'productionPlayerWrites':False,'physicalIPad':False,'pageErrors':ns['errors']},ensure_ascii=False,indent=2)+'\n')
