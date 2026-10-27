from playwright.sync_api import sync_playwright
from pathlib import Path
import json
rows=[];console=[]
f=next(x for x in json.loads(Path('/tmp/star-tide-navigation-private/accounts.json').read_text()) if x.get('mascot')=='bow')
with sync_playwright() as p:
 for device in ['iPhone 13','iPad Pro 11']:
  b=p.webkit.launch(headless=True);c=b.new_context(**p.devices[device]);page=c.new_page();page.on('console',lambda m:console.append(m.text) if 'aria-hidden' in m.text else None)
  page.route('**/api/dragon/**',lambda r:r.fulfill(status=503,content_type='application/json',body='{}'))
  page.goto('http://localhost:4386');page.get_by_placeholder('英文字母、數字或底線').fill(f['username']);page.get_by_placeholder('請輸入密碼').fill(f['password']);page.get_by_role('button',name='登入，繼續冒險 →').tap();page.locator('.tide-launch').wait_for()
  for orientation in ['portrait','landscape']:
   if orientation=='landscape':v=page.viewport_size;page.set_viewport_size({'width':v['height'],'height':v['width']})
   for index in [7,0,3,0]:
    n=page.locator('.family-nav button').nth(index);n.scroll_into_view_if_needed();n.tap();assert n.get_attribute('aria-current')=='page'
   page.locator('.tide-launch').scroll_into_view_if_needed();page.locator('.tide-launch').tap();panel=page.locator('dialog.tide-panel');panel.wait_for()
   panel.locator('.tide-window-actions button').last.tap();panel.wait_for(state='hidden');page.wait_for_function("()=>document.activeElement.classList.contains('tide-launch')")
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   assert page.locator('.tide-launch-cutout').evaluate('(e)=>e.complete&&e.naturalWidth>0')
   rows.append({'deviceEmulation':device,'orientation':orientation,'navTaps':True,'modalTapCloseFocus':True,'cutoutLoaded':True})
  c.close();b.close()
Path('output/companion-navigation/touch-results.json').write_text(json.dumps({'checks':rows,'ariaWarnings':console,'physicalDeviceTest':False},indent=2));print('PASS',len(rows),'touch emulations')
