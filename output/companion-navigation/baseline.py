from playwright.sync_api import sync_playwright
from pathlib import Path
import json
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for f in json.loads(Path('/tmp/star-tide-navigation-private/accounts.json').read_text()):
  c=b.new_context(viewport={'width':375,'height':667});page=c.new_page();page.route('**/api/dragon/**',lambda r:r.fulfill(status=503,content_type='application/json',body='{}'))
  page.goto('http://localhost:4386');page.get_by_placeholder('英文字母、數字或底線').fill(f['username']);page.get_by_placeholder('請輸入密碼').fill(f['password']);page.get_by_role('button',name='登入，繼續冒險 →').click();page.locator('.tide-launch').wait_for();page.wait_for_load_state('networkidle')
  for w,h in [(375,667),(820,1180),(1180,820)]:
   page.set_viewport_size({'width':w,'height':h});page.evaluate("document.querySelector('.family-nav').scrollIntoView({block:'end'})")
   data=page.evaluate('''()=>{let a=document.querySelector('.tide-launch').getBoundingClientRect(),nav=document.querySelector('.family-nav'),n=nav.getBoundingClientRect();return {position:getComputedStyle(document.querySelector('.tide-launcher')).position,overlap:a.left<n.right&&a.right>n.left&&a.top<n.bottom&&a.bottom>n.top,launcher:{x:a.x,y:a.y,w:a.width,h:a.height},nav:{x:n.x,y:n.y,w:n.width,h:n.height}}}''')
   rows.append({'grade':f['grade'],'viewport':[w,h],**data})
   if f['grade']==2 and w==375:page.screenshot(path='output/companion-navigation/before-phone.png')
  c.close()
 b.close()
Path('output/companion-navigation/baseline.json').write_text(json.dumps(rows,indent=2));assert any(x['overlap'] for x in rows);print('Reproduced overlap',sum(x['overlap'] for x in rows),'of',len(rows))
