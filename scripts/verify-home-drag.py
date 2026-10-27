"""Real pointer input: grab offset, live preview, mouse/touch, cancellation and persistence."""
import os,json,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.getenv('HOME_QA_URL','http://127.0.0.1:4301').rstrip('/')
OUT=Path(os.getenv('HOME_QA_OUT','outputs/home-drag/local'));OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='chrome',headless=True)
 ctx=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 creds={'username':'qa_drag_'+uuid.uuid4().hex[:12],'password':'isolated-drag-2026'};headers={'Origin':BASE}
 r=ctx.request.post(BASE+'/api/register',data=creds,headers=headers);assert r.ok,r.text();state=r.json()
 for command in [{'type':'starter-draw'},{'type':'starter-confirm'},{'type':'home-decor','action':'open'}]:
  r=ctx.request.post(BASE+'/api/command',data={'id':str(uuid.uuid4()),'revision':state['family']['revision'],'command':{'player':'quintus',**command}},headers={**headers,'X-CSRF-Token':state['csrf']});assert r.ok,r.text();state=r.json()
 original=state['family']['profiles']['quintus'];errors=[]
 def enter(context):
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE,wait_until='networkidle');page.locator('.player-quintus').click();page.wait_for_load_state('networkidle');page.locator('.home-scene-actions button').nth(1).click();page.wait_for_load_state('networkidle');page.get_by_role('button',name='佈置房間',exact=True).click();expect(page.locator('.home-cabinet')).to_be_visible();page.locator('.room-stage').scroll_into_view_if_needed();page.locator('.room-stage img').evaluate_all('(imgs)=>Promise.all(imgs.map(img=>img.decode()))');return page
 def coords(item):return item.evaluate('(e)=>({x:parseFloat(e.style.left),y:parseFloat(e.style.top)})')
 def paint(page):page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
 def chair(page):return page.locator('.room-item').filter(has=page.locator('img[src*="chair-"]'))
 def save(page):
  with page.expect_response(lambda r:r.url.endswith('/api/command')) as pending:page.get_by_role('button',name='儲存佈置',exact=True).click()
  assert pending.value.ok,pending.value.text();return pending.value.json()
 page=enter(ctx);item=chair(page);stage=page.locator('.room-stage');box=stage.bounding_box();obj=item.bounding_box();before=coords(item)
 x,y=obj['x']+obj['width']*.3,obj['y']+obj['height']*.3
 assert page.evaluate('(p)=>document.elementFromPoint(p.x,p.y)?.closest(".room-item")?.getAttribute("aria-label")',{"x":x,"y":y})=='星潮軟椅，選取或拖曳';page.mouse.move(x,y);page.mouse.down();paint(page);assert coords(item)==before
 page.mouse.move(x+box['width']*.12,y+box['height']*.06,steps=10);paint(page);during=coords(item);assert abs(during['x']-46)<.2 and abs(during['y']-75)<.2,during
 expect(item).to_have_class('room-item selected dragging');assert item.evaluate('(e)=>getComputedStyle(e).cursor')=='grabbing';page.screenshot(path=str(OUT/'mouse-held.png'),full_page=True)
 page.mouse.up();paint(page);assert coords(item)=={'x':46,'y':75}
 page.get_by_role('button',name='↶ 撤銷',exact=True).click();assert coords(item)==before
 page.get_by_role('button',name='↷ 重做',exact=True).click();assert coords(item)=={'x':46,'y':75}
 state=save(page);p=state['family']['profiles']['quintus'];assert p['territory']['resources']==original['territory']['resources'];assert p['owned']==original['owned'];assert p['homeDecor']['items'][1]['x']==46
 # A captured pointer released outside the room clamps to safe room bounds.
 page.get_by_role('button',name='佈置房間',exact=True).click();stage.scroll_into_view_if_needed();box=stage.bounding_box();obj=item.bounding_box();page.mouse.move(obj['x']+obj['width']*.3,obj['y']+obj['height']*.3);page.mouse.down();page.mouse.move(box['x']+box['width']+100,box['y']+box['height']+100,steps=10);page.mouse.up();paint(page);assert coords(item)=={'x':83,'y':82},coords(item)
 page.get_by_role('button',name='取消變更',exact=True).click();assert coords(item)=={'x':46,'y':75}
 other=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,reduced_motion='reduce')
 login=other.request.post(BASE+'/api/login',data=creds,headers=headers);assert login.ok;assert login.json()['family']['profiles']['quintus']['homeDecor']['items'][1]['x']==46
 mobile=enter(other);target=chair(mobile);stage2=mobile.locator('.room-stage');stage2.scroll_into_view_if_needed();box=stage2.bounding_box();obj=target.bounding_box();cdp=other.new_cdp_session(mobile)
 x,y=obj['x']+obj['width']*.3,obj['y']+obj['height']*.3;scroll=mobile.evaluate('scrollY')
 def touch(kind,x=0,y=0):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind in ['touchEnd','touchCancel'] else [{'x':x,'y':y,'id':1,'radiusX':4,'radiusY':4,'force':1}]})
 touch('touchStart',x,y)
 for step in range(1,11):touch('touchMove',x-box['width']*.10*step/10,y-box['height']*.05*step/10)
 paint(mobile);during=coords(target);assert abs(during['x']-36)<.3 and abs(during['y']-70)<.3,during;assert abs(mobile.evaluate('scrollY')-scroll)<1
 mobile.screenshot(path=str(OUT/'touch-held.png'),full_page=True);touch('touchEnd');paint(mobile);assert coords(target)=={'x':36,'y':70};state=save(mobile)
 # Interrupted touch abandons only the in-flight movement.
 mobile.get_by_role('button',name='佈置房間',exact=True).click();stage2.scroll_into_view_if_needed();box=stage2.bounding_box();obj=target.bounding_box();x,y=obj['x']+obj['width']*.3,obj['y']+obj['height']*.3
 touch('touchStart',x,y);touch('touchMove',x+box['width']*.12,y);paint(mobile);assert coords(target)['x']>45
 touch('touchCancel');paint(mobile);assert coords(target)=={'x':36,'y':70};expect(mobile.get_by_role('button',name='儲存佈置',exact=True)).to_be_disabled()
 assert mobile.locator('.home-fine-position[open]').count()==0
 mobile.reload(wait_until='networkidle');mobile.locator('.player-quintus').click();mobile.locator('.home-scene-actions button').nth(1).click();expect(chair(mobile)).to_be_visible();assert coords(chair(mobile))=={'x':36,'y':70}
 assert not errors,errors
 report={'url':BASE,'checks':['direct mouse grab without prior selection','grab point retained without jump','live movement before release','one undo restores entire gesture; redo restores result','free movement preserves balances and companions','release outside room clamps safely','touch movement via Chrome touch input','touch does not scroll page','touch cancel restores saved position','cross-device login and reload preserve final coordinates','fine-position controls secondary and collapsed'],'pageErrors':errors,'scope':'isolated QA account; emulated touch, not a physical phone'}
 (OUT/'verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));browser.close()
