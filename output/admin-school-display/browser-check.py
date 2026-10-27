import json
from pathlib import Path
from playwright.sync_api import sync_playwright
access=json.loads(Path('/tmp/star-tide-admin-school/access.json').read_text());results=[]
with sync_playwright() as p:
 for engine in [p.webkit,p.chromium]:
  b=engine.launch();page=b.new_page(viewport={'width':390,'height':844});page.goto(access['base']+'/admin');page.get_by_label('管理員帳號').fill(access['username']);page.get_by_label('密碼',exact=True).fill(access['password']);page.get_by_role('button',name='登入管理艙',exact=True).click()
  school=page.locator('.admin-person');school.wait_for();assert '6 年級 · 臺北市大安區建安國小' in school.inner_text(),school.inner_text()
  assert '學校待確認' not in school.inner_text()
  for width in [390,1024]:
   page.set_viewport_size({'width':width,'height':844});page.screenshot(path=f'output/admin-school-display/{engine.name}-{width}.png',full_page=True);results.append({'engine':engine.name,'width':width,'confirmedSchoolShown':True,'noUnknownLabelForAlston':True})
  # API evidence uses isolated synthetic record with initially unassigned school.
  s=page.evaluate('async()=>await (await fetch("/api/admin/students")).json()');assert s['students'][0]['school']=='jianan'
  b.close()
Path('output/admin-school-display/browser-results.json').write_text(json.dumps(results,indent=2)+'\n');print(results)
