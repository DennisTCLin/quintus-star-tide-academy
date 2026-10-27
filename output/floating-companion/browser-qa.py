from pathlib import Path
import copy,json,os
from playwright.sync_api import sync_playwright,expect
out=Path('output/floating-companion');data=json.loads((out/'fixtures.json').read_text());base=os.getenv('QA_URL','http://127.0.0.1:49473')
rows=[];flows=[];errors=[];commands=[]
measure='''()=>{const e=document.querySelector('.tide-launch'),h=e.parentElement,r=e.getBoundingClientRect(),image=e.querySelector('img'),ir=image.getBoundingClientRect();return{visible:getComputedStyle(h).visibility!=='hidden',right:r.right,bottom:r.bottom,left:r.left,top:r.top,width:r.width,height:r.height,imageWidth:ir.width,imageHeight:ir.height,compact:h.dataset.compact,lift:h.style.transform,position:getComputedStyle(h).position,background:getComputedStyle(e).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth+1}}'''
# Use whole launcher rectangles: transparent pixels still receive taps.
clear='''()=>{const l=document.querySelector('.tide-launch'),h=l.parentElement;if(getComputedStyle(h).visibility==='hidden')return true;const a=l.getBoundingClientRect();return [...document.querySelectorAll('.family-app button,.family-app a[href],.family-app input,.family-app select,.family-app summary')].filter(e=>!e.closest('.tide-companion')&&getComputedStyle(e).visibility!=='hidden').every(e=>{let b=e.getBoundingClientRect();return !b.width||!b.height||a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom})}'''
def setup(browser,mascot,w,h):
 c=browser.new_context(viewport={'width':w,'height':h},has_touch=True);p=c.new_page();p.set_default_timeout(12000);p.on('pageerror',lambda e:errors.append(str(e)))
 state=copy.deepcopy(data[mascot])
 def api(route):
  u=route.request.url
  if '/api/command' in u:commands.append(route.request.post_data_json)
  if '/api/dragon' in u or '/api/guide' in u or '/api/companion-talk' in u:return route.fulfill(status=503,json={'error':'Synthetic offline voice provider'})
  if '/api/battle' in u:return route.fulfill(json={'invitations':[],'rooms':[],'players':[]})
  return route.fulfill(json=state)
 p.route('**/api/**',api);p.goto(base,wait_until='networkidle');expect(p.locator('.family-nav')).to_be_visible();expect(p.locator('.tide-launch')).to_be_attached();p.wait_for_timeout(150)
 return c,p
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='chrome',headless=True)
  for mascot in ['dog','bow','tideglow']:
   for w,h in [(320,568),(390,844),(820,1180),(1024,768),(1440,900),(844,390)]:
    c,p=setup(b,mascot,w,h);m=p.evaluate(measure)
    assert not m['overflow'] and m['position']=='fixed',(engine,mascot,w,m)
    assert p.evaluate(clear),(engine,mascot,w,'initial overlap',m)
    if m['visible']:
     assert m['right']<=w and m['left']>=0 and m['top']>=0 and m['bottom']<=h and m['width']>=44 and m['height']>=44,m
     assert m['background']=='rgba(0, 0, 0, 0)',m
    image=p.locator('.tide-launch-cutout');assert image.evaluate('(i)=>i.complete&&i.naturalWidth>0')
    assert p.locator('.tide-launch video,.tide-launch canvas').count()==0
    # Touch every nav item with the navigation at both ends of the viewport.
    for align in ['start','end']:
     p.locator('.family-nav').evaluate('(e,b)=>e.scrollIntoView({block:b,behavior:"instant"})',align)
     for i in range(p.locator('.family-nav button').count()):
      nav=p.locator('.family-nav button').nth(i);nav.scroll_into_view_if_needed();p.wait_for_timeout(35)
      assert nav.evaluate('(e)=>{let r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'),(engine,mascot,w,align,i,'nav obstructed')
      assert p.evaluate(clear),(engine,mascot,w,align,i,'overlap')
    # Sweep entire harbor; every sampled position must leave controls uncovered.
    total=p.evaluate('document.documentElement.scrollHeight')
    for y in range(0,total,200):
     p.evaluate('(y)=>scrollTo({top:y,behavior:"instant"})',y);p.wait_for_timeout(180);assert p.evaluate(clear),(engine,mascot,w,y,'scroll collision')
    p.evaluate('scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})');p.wait_for_timeout(250);m=p.evaluate(measure)
    assert m['visible'] and m['imageWidth']>60,(engine,mascot,w,'full mascot unavailable at page bottom',m)
    assert image.evaluate('(e)=>{let r=e.getBoundingClientRect();return e.closest("button").contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
    if w in [390,820,1440]:p.screenshot(path=str(out/f'{engine}-{mascot}-{w}.png'))
    # Modal starts without shifting document layout and restores keyboard focus.
    main_top=p.locator('.family-main').evaluate('(e)=>e.getBoundingClientRect().top+scrollY')
    p.locator('.tide-launch').tap();panel=p.locator('dialog.tide-panel');expect(panel).to_be_visible()
    actor=panel.locator('.tide-actor').bounding_box();assert actor['height']>=100 and abs(actor['width']-actor['height'])<2,(engine,mascot,w,'care actor squashed',actor)
    assert abs(p.locator('.family-main').evaluate('(e)=>e.getBoundingClientRect().top+scrollY')-main_top)<1
    panel.locator('.tide-window-actions button').last.tap();expect(panel).to_be_hidden();expect(p.locator('.tide-launch')).to_be_focused()
    p.keyboard.press('Enter');expect(panel).to_be_visible();p.keyboard.press('Escape');expect(panel).to_be_hidden();expect(p.locator('.tide-launch')).to_be_focused()
    rows.append({'engine':engine,'mascot':mascot,'viewport':[w,h],'allNavTargetsHit':True,'fullScrollSweepClear':True,'transparentLauncher':True,'modalFocusNoShift':True,'bottom':m})
    print('PASS',engine,mascot,w,'nav, scroll, transparent character, modal/focus',flush=True);c.close()
   # Both openers, temporary hide, enlarged text and course-picker suppression.
   c,p=setup(b,mascot,390,844);p.locator('.tide-harbor-entry').click();panel=p.locator('dialog.tide-panel');expect(panel).to_be_visible();panel.locator('.tide-window-actions button').last.click();expect(p.locator('.tide-harbor-entry')).to_be_focused()
   p.evaluate('scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})');p.wait_for_timeout(250);p.locator('.tide-launch').click();expect(panel).to_be_visible()
   panel.get_by_role('button',name='暫時隱藏',exact=True).click();expect(panel).to_be_hidden();expect(p.locator('.tide-launch-cutout')).to_be_hidden();p.locator('.tide-launch').click();expect(panel).to_be_visible();panel.locator('.tide-window-actions button').last.click();expect(p.locator('.tide-launch-cutout')).to_be_visible()
   p.emulate_media(reduced_motion='reduce');p.locator('.tide-launch').click();expect(panel).to_be_visible();assert panel.locator('.tide-footer button').first.is_disabled();panel.locator('.tide-window-actions button').last.click()
   p.add_style_tag(content='.tide-launch > span,.tide-launch ruby{font-size:32px!important;}');p.wait_for_timeout(150);assert p.evaluate(clear)
   flows.append({'engine':engine,'mascot':mascot,'bothOpenersRestoreFocus':True,'hideReopen':True,'reducedMotion':True,'enlargedText':True});c.close()
  b.close()
assert not errors,errors
assert not commands,commands
(out/'browser-results.json').write_text(json.dumps({'layouts':rows,'flows':flows,'pageErrors':errors,'gameCommands':commands,'physicalIpad15':False},ensure_ascii=False,indent=2))
print('PASS',len(rows),'layouts',len(flows),'flow suites; no game commands or JS errors')
