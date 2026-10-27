from playwright.sync_api import sync_playwright
from pathlib import Path
import json,os
OUT=Path('output/companion-navigation');accounts=json.loads(Path('/tmp/star-tide-navigation-private/accounts.json').read_text());rows=[];flows=[];errors=[];commands=[]
if os.environ.get('QA_MASCOTS_ONLY'):accounts=[f for f in accounts if f.get('mascot')]
measure='''()=>{const rect=e=>{let r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,b:r.bottom}};let l=document.querySelector('.tide-launch'),n=document.querySelector('.family-nav'),m=document.querySelector('.family-main');return{launcher:rect(l),nav:rect(n),main:rect(m),position:getComputedStyle(l.parentElement).position,overflow:document.documentElement.scrollWidth>innerWidth+1}}'''
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=p.chromium.launch(channel='chrome',headless=True) if engine=='chromium' else p.webkit.launch(headless=True)
  for f in accounts:
   c=b.new_context(viewport={'width':375,'height':667});page=c.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('request',lambda r:commands.append(r.url) if '/api/command' in r.url else None)
   page.route('**/api/dragon/**',lambda r:r.fulfill(status=503,content_type='application/json',body='{}'))
   page.goto('http://localhost:4386');page.get_by_placeholder('英文字母、數字或底線').fill(f['username']);page.get_by_placeholder('請輸入密碼').fill(f['password']);page.get_by_role('button',name='登入，繼續冒險 →').click();page.locator('.tide-launch').wait_for();page.wait_for_load_state('networkidle')
   snap=lambda:page.evaluate('async()=>{let s=await(await fetch("/api/state")).json();return s.family.profiles[s.playerId]}')
   before=snap()
   for w,h in [(320,568),(375,667),(390,844),(768,1024),(820,1180),(1024,768),(1180,820),(1366,1024),(1440,900),(844,390)]:
    page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo(0,0)');page.wait_for_timeout(80)
    # Navigation and companion are distinct document rows even when the nav is near the viewport bottom.
    page.evaluate("document.querySelector('.family-nav').scrollIntoView({block:'end'})");m=page.evaluate(measure)
    assert m['position']=='static' and m['launcher']['y']>=m['nav']['b'] and m['launcher']['b']<=m['main']['y'] and not m['overflow'],(engine,f['grade'],w,m)
    assert m['launcher']['h']>=44 and m['launcher']['w']>=44
    # Every nav target, including the horizontally scrolled final entries, must receive the pointer.
    for i in range(page.locator('.family-nav button').count()):
     button=page.locator('.family-nav button').nth(i);button.scroll_into_view_if_needed();assert button.evaluate('(e)=>{let r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'),(engine,f['grade'],w,i,'nav covered')
    page.locator('.tide-launch').scroll_into_view_if_needed();assert page.locator('.tide-launch').evaluate('(e)=>{let r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
    row_before=page.evaluate(measure);page.locator('.tide-launch').click();panel=page.locator('dialog.tide-panel');panel.wait_for()
    # Launching care leaves its reserved row and the document geometry intact.
    row_open=page.evaluate(measure);assert abs(row_open['main']['y']-row_before['main']['y'])<2,(engine,f['grade'],w,'layout shift',row_before,row_open)
    panel.locator('.tide-window-actions button').last.click();panel.wait_for(state='hidden');page.wait_for_function("()=>document.activeElement.classList.contains('tide-launch')")
    if w in [375,820] and f['grade'] in [1,2]:
     page.evaluate("document.querySelector('.family-nav').scrollIntoView({block:'start',behavior:'instant'})");page.wait_for_timeout(150);page.screenshot(path=str(OUT/f'{engine}-{f.get("mascot","tideglow")}-grade{f["grade"]}-{w}.png'))
    rows.append({'engine':engine,'grade':f['grade'],'mascot':f.get('mascot','tideglow'),'viewport':[w,h],'navAndLauncherSeparate':True,'allNavTargetsHit':True,'noHorizontalOverflow':True,'modalNoShiftAndReturnsFocus':True})
   # Real navigation across all eight destinations without modifying learning state.
   page.set_viewport_size({'width':375,'height':667})
   for i in range(8):
    button=page.locator('.family-nav button').nth(i);button.click();page.wait_for_timeout(100);assert button.get_attribute('aria-current')=='page'
    if i in [2,5]:assert page.locator('.tide-launch').count()==0
    elif page.locator('.tide-launch').count():
     m=page.evaluate(measure);assert m['launcher']['y']>=m['nav']['b'] and m['launcher']['b']<=m['main']['y'] and not m['overflow']
   page.locator('.family-nav button').first.click();page.locator('.tide-launch').wait_for()
   # The second home entry also returns focus to the control that opened the modal.
   page.locator('.tide-harbor-entry').click();panel=page.locator('dialog.tide-panel');panel.wait_for();panel.locator('.tide-window-actions button').last.click();page.wait_for_function("()=>document.activeElement.classList.contains('tide-harbor-entry')")
   page.locator('.tide-launch').scroll_into_view_if_needed();page.locator('.tide-launch').focus();page.keyboard.press('Enter');panel.wait_for();page.keyboard.press('Escape');page.wait_for_function("()=>document.activeElement.classList.contains('tide-launch')")
   geometry=lambda:page.evaluate("()=>({main:document.querySelector('.family-main').getBoundingClientRect().top+scrollY,row:document.querySelector('.tide-companion').getBoundingClientRect().height})")
   stable=geometry()
   page.emulate_media(reduced_motion='reduce');page.locator('.tide-launch').click();panel.wait_for();assert panel.locator('.tide-footer button').first.is_disabled();panel.get_by_role('button',name='暫時隱藏',exact=True).click();panel.wait_for(state='hidden');assert page.locator('.tide-launcher').get_attribute('class').find('tide-hidden')>=0;assert geometry()==stable,('hide shift',engine,f['grade'],stable,geometry())
   page.locator('.tide-launch').click();panel.wait_for();assert geometry()==stable,('reopen shift',engine,f['grade']);panel.locator('.tide-window-actions button').last.click()
   page.add_style_tag(content='.tide-launch > span {font-size:32px!important}.tide-launch rt{font-size:28px!important}')
   page.locator('.tide-launch').scroll_into_view_if_needed();m=page.evaluate(measure);assert not m['overflow'] and m['launcher']['y']>=m['nav']['b'] and m['launcher']['b']<=m['main']['y']
   stable=geometry();page.locator('.tide-launch').click();panel.wait_for();panel.get_by_role('button',name='暫時隱藏',exact=True).click();panel.wait_for(state='hidden');assert geometry()==stable
   page.locator('.tide-launch').click();panel.wait_for();assert geometry()==stable;panel.locator('.tide-window-actions button').last.click()
   # The separate course picker also hides the companion without removing its row.
   stable=geometry();page.locator('.harbor-departure-start').click();picker=page.get_by_role('dialog',name='選擇學習科目');picker.wait_for();assert not page.locator('.tide-launch').is_visible();assert geometry()==stable
   picker.get_by_role('button',name='關閉',exact=True).click();page.locator('.tide-launch').wait_for();assert geometry()==stable
   page.reload();page.locator('.tide-launch').wait_for();assert before==snap();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   flows.append({'engine':engine,'grade':f['grade'],'mascot':f.get('mascot','tideglow'),'allEightPages':True,'overlaySuppression':True,'bothEntryFocusRestored':True,'keyboardEscape':True,'hideReopenKeepsGeometry':True,'enlargedHideReopenKeepsGeometry':True,'coursePickerKeepsRowWhileSuppressed':True,'reducedMotion':True,'enlargedText':True,'reloadPreservesProfile':True});c.close()
  b.close()
assert not errors,errors
assert not commands,commands
OUT.joinpath('mascot-results.json' if os.environ.get('QA_MASCOTS_ONLY') else 'browser-results.json').write_text(json.dumps({'layout':rows,'flows':flows,'pageErrors':errors,'gameCommandsSubmitted':len(commands)},indent=2));print('PASS',len(rows),'layouts,',len(flows),'flow suites')
