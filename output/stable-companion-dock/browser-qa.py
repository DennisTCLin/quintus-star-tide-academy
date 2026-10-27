from pathlib import Path
import json,os
ns={};exec(Path('output/floating-companion/browser-qa.py').read_text().split('with sync_playwright() as pw:')[0],ns)
out=Path('output/stable-companion-dock');rows=[]
geometry='''()=>{const shell=document.querySelector('.family-app'),host=document.querySelector('.tide-launcher'),button=host.querySelector('button'),s=shell.getBoundingClientRect(),r=button.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,shellBottom:s.bottom,scrollTop:shell.scrollTop,scrollHeight:shell.scrollHeight,clientHeight:shell.clientHeight,visible:getComputedStyle(host).visibility==='visible',position:getComputedStyle(host).position,overflow:document.documentElement.scrollWidth>innerWidth+1,windowY:scrollY}}'''
clear='''()=>{const shell=document.querySelector('.family-app').getBoundingClientRect(),l=document.querySelector('.tide-launch'),a=l.getBoundingClientRect();if(getComputedStyle(l.parentElement).visibility==='hidden')return false;return [...document.querySelectorAll('.family-app button,.family-app a[href],.family-app input,.family-app select,.family-app summary')].filter(e=>!e.closest('.tide-companion')&&getComputedStyle(e).visibility!=='hidden').every(e=>{const r=e.getBoundingClientRect(),b={left:r.left,right:r.right,top:Math.max(r.top,shell.top),bottom:Math.min(r.bottom,shell.bottom)};return !r.width||!r.height||b.top>=b.bottom||a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom})}'''
scroll='(y)=>document.querySelector(".family-app").scrollTo({top:y,behavior:"instant"})'
with ns['sync_playwright']() as pw:
 for engine in ['webkit','chromium']:
  b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='chrome')
  for mascot in ['dog','bow','tideglow']:
   for w,h in [(320,568),(390,844),(820,1180),(1180,820),(1440,900),(844,390)]:
    c,p=ns['setup'](b,mascot,w,h);m=p.evaluate(geometry);assert m['visible'] and m['position']=='fixed' and not m['overflow'],m
    assert m['shellBottom']+8<=m['y'] and m['bottom']<=h and m['x']>=0,m
    assert m['width']>=44 and m['height']>=44,m
    # Dock stays visible and at exactly the same anchor during and after scrolling.
    for y in range(0,m['scrollHeight'],173):
     p.evaluate(scroll,y);p.wait_for_timeout(20);now=p.evaluate(geometry)
     assert now['visible'] and abs(now['right']-m['right'])<1 and abs(now['bottom']-m['bottom'])<1 and abs(now['y']-m['y'])<1,(engine,mascot,w,y,m,now)
     assert p.evaluate(clear),(engine,mascot,w,y,'visible control overlap')
    p.evaluate(scroll,0)
    # All navigation controls are reachable in the reserved scrollport.
    for nav in p.locator('.family-nav button').all():
     nav.scroll_into_view_if_needed();assert nav.evaluate('(e)=>{let r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'),('nav target',engine,mascot,w)
    p.evaluate(scroll,0);p.locator('.tide-launch').tap();panel=p.locator('dialog.tide-panel');ns['expect'](panel).to_be_visible()
    assert abs(p.locator('.family-app.companion-docked').bounding_box()['height']-m['shellBottom'])<1
    panel.locator('.tide-tabs button').nth(1).tap();ns['expect'](panel.locator('.tide-voice-chat')).to_be_visible()
    panel.locator('.tide-window-actions button').last.tap();ns['expect'](panel).to_be_hidden();ns['expect'](p.locator('.tide-launch')).to_be_focused()
    assert abs(p.evaluate(geometry)['y']-m['y'])<1
    # Collection is dense and scrolls; page changes reset the actual scrollport.
    p.locator('.family-nav button').nth(1).click();p.wait_for_timeout(150);assert p.evaluate(geometry)['scrollTop']==0
    p.evaluate(scroll,1000);q=p.evaluate(geometry);assert q['visible'] and abs(q['y']-m['y'])<1 and p.evaluate(clear)
    p.locator('.family-nav button').first.click();p.wait_for_timeout(150);assert p.evaluate(geometry)['scrollTop']==0
    if w in [390,820,1440] and mascot=='dog':
     p.locator('.family-hero').scroll_into_view_if_needed();p.screenshot(path=str(out/f'{engine}-{w}.png'))
    rows.append({'engine':engine,'mascot':mascot,'viewport':[w,h],'stableDuringWholePageScroll':True,'navTargetsClear':True,'panelVoiceTabAndFocus':True,'pageReset':True,'geometry':m});print('PASS',engine,mascot,w,h,flush=True);c.close()
  b.close()
assert not ns['errors'] and not ns['commands'],(ns['errors'],ns['commands'])
(out/'browser-results.json').write_text(json.dumps({'layouts':rows,'errors':ns['errors'],'commands':ns['commands']},ensure_ascii=False,indent=2))
