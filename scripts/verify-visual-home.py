"""Isolated natural account, real decoration UI and cloud persistence. No real player login."""
import os,json,uuid,copy
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.getenv('HOME_QA_URL','http://127.0.0.1:4301').rstrip('/')
OUT=Path(os.getenv('HOME_QA_OUT','outputs/visual-home/browser'));OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='chrome',headless=True)
 ctx=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 creds={'username':os.getenv('HOME_QA_USER') or 'qa_home_'+uuid.uuid4().hex[:12],'password':'isolated-visual-home-2026'};headers={'Origin':BASE}
 r=ctx.request.post(BASE+('/api/login' if os.getenv('HOME_QA_USER') else '/api/register'),data=creds,headers=headers);assert r.ok,r.text();state=r.json()
 def api(c):
  global state
  r=ctx.request.post(BASE+'/api/command',data={'id':str(uuid.uuid4()),'revision':state['family']['revision'],'command':{'player':'quintus',**c}},headers={**headers,'X-CSRF-Token':state['csrf']});assert r.ok,r.text();state=r.json();return state
 
 if not state['family']['profiles']['quintus'].get('onboarding',{}).get('confirmed'):
  api({'type':'starter-draw'});api({'type':'starter-confirm'})
 original=copy.deepcopy(state['family']['profiles'])
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def action(fn):
  global state
  with page.expect_response(lambda r:r.url.endswith('/api/command')) as response:fn()
  r=response.value;assert r.ok,r.text();state=r.json();return state
 def nudge():
  if not page.locator('.home-fine-position[open]').count():page.locator('.home-fine-position > summary').click()
  page.get_by_role('button',name='微調→',exact=True).click()
 def enter():
  page.goto(BASE,wait_until='networkidle');page.locator('.player-quintus').click();expect(page.locator('.companion-home')).to_be_visible();page.wait_for_load_state('networkidle');page.locator('.home-island-bg').evaluate('(img)=>img.decode()')
 def room():page.locator('.home-scene-actions').get_by_role('button',name='進屋佈置',exact=True).click();expect(page.locator('.home-editor')).to_be_visible();page.wait_for_load_state('networkidle')
 enter();assert page.locator('.learning-build-panel').count()==0;page.screenshot(path=str(OUT/'home-desktop.png'),full_page=True)
 room();action(lambda:page.get_by_role('button',name='住進我的家 · 收下迎新家具',exact=True).click());expect(page.locator('.home-cabinet')).to_be_visible()
 p=state['family']['profiles']['quintus'];assert len(p['homeDecor']['items'])==3;initial_resources=copy.deepcopy(p['territory']['resources'])
 page.locator('.room-item').filter(has=page.locator('img[src*="chair-"]')).click()
 page.get_by_role('button',name='↻ 轉向',exact=True).click();nudge()
 page.get_by_role('button',name='↶ 撤銷',exact=True).click();page.get_by_role('button',name='↷ 重做',exact=True).click()
 page.get_by_role('button',name='牆面',exact=True).click();page.get_by_role('button',name='牆面：月夜',exact=True).click()
 page.get_by_role('button',name='地板',exact=True).click();page.get_by_role('button',name='地板：木紋',exact=True).click()
 page.screenshot(path=str(OUT/'room-editing-desktop.png'),full_page=True)
 action(lambda:page.get_by_role('button',name='儲存佈置',exact=True).click());expect(page.get_by_role('button',name='儲存佈置',exact=True)).to_have_count(0)
 d=state['family']['profiles']['quintus']['homeDecor'];assert d['items'][1]['rotation']==1 and d['items'][1]['x']==36;assert d['rooms'][0]=={'wall':'moon','floor':'wood'}
 assert state['family']['profiles']['quintus']['territory']['resources']==initial_resources
 page.get_by_role('button',name='佈置房間',exact=True).click();page.get_by_role('button',name='新家具',exact=True).click()
 page.locator('.home-catalog-grid button').filter(has_text='月光茶几').click()
 action(lambda:page.get_by_role('button',name='設為想要的家具',exact=True).click());expect(page.locator('.home-craft-detail')).to_contain_text('月光茶几')
 action(lambda:page.get_by_role('button',name='製作這件家具',exact=True).click())
 table_id=state['family']['profiles']['quintus']['homeDecor']['items'][-1]['id']
 page.get_by_role('button',name=f'選擇月光茶几 {table_id}',exact=True).click()
 stage=page.locator('.room-stage');box=stage.bounding_box();page.mouse.click(box['x']+box['width']*.57,box['y']+box['height']*.75)
 action(lambda:page.get_by_role('button',name='儲存佈置',exact=True).click())
 page.get_by_role('button',name='佈置房間',exact=True).click();page.get_by_role('button',name='新家具',exact=True).click();page.locator('.home-catalog-grid button').filter(has_text='星球小擺飾').click()
 action(lambda:page.get_by_role('button',name='製作這件家具',exact=True).click());globe_id=state['family']['profiles']['quintus']['homeDecor']['items'][-1]['id']
 page.get_by_role('button',name=f'選擇星球小擺飾 {globe_id}',exact=True).click();page.get_by_label('選擇支撐桌子').select_option(str(table_id))
 action(lambda:page.get_by_role('button',name='儲存佈置',exact=True).click());d=state['family']['profiles']['quintus']['homeDecor'];assert d['items'][-1]['parent']==table_id
 page.locator('.room-item').filter(has=page.locator('img[src*="chair-"]')).click();expect(page.locator('.room-resident')).to_contain_text('坐下休息');page.screenshot(path=str(OUT/'room-lived-in.png'),full_page=True);page.locator('.room-stage').screenshot(path=str(OUT/'room-scene.png'))
 page.get_by_role('button',name='佈置房間',exact=True).click();page.get_by_role('button',name=f'選擇月光茶几 {table_id}',exact=True).click()
 stage.scroll_into_view_if_needed();box=stage.bounding_box();obj=page.locator('.room-item.selected').bounding_box();page.mouse.move(obj['x']+obj['width']*.15,obj['y']+obj['height']*.85);page.mouse.down();page.mouse.move(obj['x']+obj['width']*.15+box['width']*(67-float(page.locator('.room-item.selected').evaluate('(e)=>parseFloat(e.style.left)')))/100,obj['y']+obj['height']*.85+box['height']*(79-float(page.locator('.room-item.selected').evaluate('(e)=>parseFloat(e.style.top)')))/100,steps=8);page.mouse.up()
 action(lambda:page.get_by_role('button',name='儲存佈置',exact=True).click());d=state['family']['profiles']['quintus']['homeDecor'];assert d['items'][-2]['x']==67;assert d['items'][-1]['parent']==table_id
 page.get_by_role('button',name='佈置房間',exact=True).click();page.get_by_role('button',name=f'選擇月光茶几 {table_id}',exact=True).click();page.get_by_role('button',name='收回',exact=True).click()
 page.get_by_role('button',name='取消變更',exact=True).click();expect(page.locator('.room-item').filter(has=page.locator('img[src*="table-"]'))).to_be_visible()
 # Unsaved navigation guard.
 page.locator('.room-item').filter(has=page.locator('img[src*="chair-"]')).click();nudge();page.once('dialog',lambda d:d.dismiss());page.get_by_role('button',name='← 領地',exact=True).click();expect(page.locator('.home-editor')).to_be_visible();page.once('dialog',lambda d:d.dismiss());page.get_by_role('button',name='登出',exact=True).click();expect(page.locator('.home-editor')).to_be_visible();page.get_by_role('button',name='取消變更',exact=True).click()
 saved=copy.deepcopy(state['family']['profiles']['quintus']['homeDecor'])
 other=browser.new_context(viewport={'width':390,'height':844},has_touch=True,reduced_motion='reduce');login=other.request.post(BASE+'/api/login',data=creds,headers=headers);assert login.ok;assert login.json()['family']['profiles']['quintus']['homeDecor']==saved
 for id in ['feifei','qingqing','doudou']:assert login.json()['family']['profiles'][id]==original[id]
 assert login.json()['family']['profiles']['quintus']['owned']==original['quintus']['owned']
 mobile=other.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)));mobile.goto(BASE,wait_until='networkidle');mobile.locator('.player-quintus').click();mobile.locator('.home-scene-actions').get_by_role('button',name='進屋佈置',exact=True).click();mobile.get_by_role('button',name='佈置房間',exact=True).click()
 mobile.locator('.room-item').filter(has=mobile.locator('img[src*="chair-"]')).tap();mobile.locator('.room-stage').scroll_into_view_if_needed();box=mobile.locator('.room-stage').bounding_box();mobile.touchscreen.tap(box['x']+box['width']*.40,box['y']+box['height']*.81)
 with mobile.expect_response(lambda r:r.url.endswith('/api/command')) as response:mobile.get_by_role('button',name='儲存佈置',exact=True).click()
 assert response.value.ok;assert response.value.json()['family']['profiles']['quintus']['homeDecor']['items'][1]['x']==40
 mobile.reload(wait_until='networkidle');mobile.locator('.player-quintus').click();mobile.locator('.home-scene-actions').get_by_role('button',name='進屋佈置',exact=True).click();expect(mobile.locator('.room-item')).to_have_count(5)
 widths=[]
 for width in [320,390,768,1440]:
  mobile.set_viewport_size({'width':width,'height':900});
  if mobile.get_by_role('button',name='佈置房間',exact=True).count():mobile.get_by_role('button',name='佈置房間',exact=True).click()
  assert not mobile.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width;mobile.screenshot(path=str(OUT/f'room-{width}.png'),full_page=True);widths.append(width)
 # Buy furniture through the UI until materials are insufficient, then start a fresh lesson.
 mobile.get_by_role('button',name='新家具',exact=True).click();mobile.locator('.home-catalog-grid button').filter(has_text='星夢小床').click()
 for _ in range(8):
  if mobile.get_by_role('button',name='和夥伴去學習',exact=True).count():break
  with mobile.expect_response(lambda r:r.url.endswith('/api/command')) as response:mobile.get_by_role('button',name='製作這件家具',exact=True).click()
  assert response.value.ok
  mobile.get_by_role('button',name='新家具',exact=True).click();mobile.locator('.home-catalog-grid button').filter(has_text='星夢小床').click()
 with mobile.expect_response(lambda r:r.url.endswith('/api/command')) as response:mobile.get_by_role('button',name='和夥伴去學習',exact=True).click()
 assert response.value.ok,response.value.text();assert response.value.json()['family']['profiles']['quintus']['run']['status']=='active'
 # Younger player: annotated labels must remain legible on narrow screens.
 state=ctx.request.get(BASE+'/api/state').json()
 api({'type':'starter-draw','player':'feifei'});api({'type':'starter-confirm','player':'feifei'});api({'type':'home-decor','action':'open','player':'feifei'})
 page.set_viewport_size({'width':390,'height':900});page.goto(BASE,wait_until='networkidle');page.locator('.player-feifei').click();page.locator('.home-scene-actions button').nth(1).click();page.locator('.home-edit-toolbar button').nth(1).click()
 expect(page.locator('.home-cabinet')).to_be_visible();assert page.locator('.home-cabinet ruby').count()>0
 for width in [320,390]:
  page.set_viewport_size({'width':width,'height':900});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width
  page.screenshot(path=str(OUT/f'room-grade2-{width}.png'),full_page=True)
 assert not errors,errors
 report={'base':BASE,'checks':['real account open once and original data preserved','free move/rotate/undo/redo/skins save','priced furniture crafting and persistent goal','tabletop attachment follows dragged table','storage cancel restores entire group','unsaved navigation and logout cancel','insufficient materials starts fresh learning','touch tap-to-place and second-device reload','grade two annotated controls at 320 and 390'],'widthsWithoutOverflow':widths,'pageErrors':errors,'scope':'Isolated new QA account only'}
 (OUT/'verification.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));browser.close()
