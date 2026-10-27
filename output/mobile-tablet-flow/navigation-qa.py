from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json
OUT=Path('output/mobile-tablet-flow');BASE='http://localhost:4388';fixtures=json.loads(Path('/tmp/star-tide-flow-private/accounts.json').read_text());rows=[];errors=[]
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=p.chromium.launch(channel='chrome') if engine=='chromium' else p.webkit.launch()
  for grade in [1,2,4,6]:
   f=next(x for x in fixtures if x['engine']==engine and x['grade']==grade and x['state']=='voice');c=b.new_context(**p.devices['iPad Pro 11' if grade in [2,4] else 'iPhone 13']);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);page.get_by_placeholder('英文字母、數字或底線').fill(f['username']);page.get_by_placeholder('請輸入密碼').fill(f['password']);page.get_by_role('button',name='登入，繼續冒險 →').click();page.locator('.family-nav').wait_for()
   for w,h in [(375,667),(820,1180),(1180,820),(844,390)]:
    page.set_viewport_size({'width':w,'height':h})
    for index in range(page.locator('.family-nav button').count()):
     button=page.locator('.family-nav button').nth(index);button.scroll_into_view_if_needed();page.wait_for_timeout(450)
     assert button.evaluate('(e)=>{let r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'),(engine,grade,w,index,'covered')
     button.tap();expect(button).to_have_attribute('aria-current','page');page.wait_for_timeout(150);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(engine,grade,w,index,'overflow')
    page.locator('.family-nav button').first.tap();page.evaluate('scrollTo({top:0,behavior:"instant"})');page.wait_for_timeout(600)
    assert page.locator('.harbor-departure-start').evaluate('(e)=>{let r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
    rows.append({'engine':engine,'grade':grade,'viewport':[w,h],'allNavigationPagesTouchable':True,'homeCTAVisible':True,'horizontalOverflow':False})
   page.screenshot(path=str(OUT/f'{engine}-grade{grade}-navigation.png'));c.close();(OUT/'navigation-results.json').write_text(json.dumps({'checks':rows,'pageErrors':errors,'complete':False},indent=2));print('PASS navigation',engine,grade,flush=True)
  b.close()
assert not errors,errors
(OUT/'navigation-results.json').write_text(json.dumps({'checks':rows,'pageErrors':errors},indent=2));print('PASS',len(rows),'navigation layouts')
