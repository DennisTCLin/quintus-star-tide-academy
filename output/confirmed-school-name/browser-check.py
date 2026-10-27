import json
from pathlib import Path
from playwright.sync_api import sync_playwright
access=json.loads(Path('/tmp/star-tide-confirmed-school/access.json').read_text());results=[]
expected={'jasper':'臺北市大安區幸安國小','jay':'臺北市東門國小','alston':'臺北市大安區建安國小'}
with sync_playwright() as p:
 for engine in [p.webkit,p.chromium]:
  b=engine.launch();page=b.new_page(viewport={'width':390,'height':844});page.goto(access['base']+'/admin');page.get_by_label('管理員帳號').fill(access['username']);page.get_by_label('密碼',exact=True).fill(access['password']);page.get_by_role('button',name='登入管理艙',exact=True).click();page.locator('.admin-person').wait_for()
  for username,name in expected.items():
   page.locator('.admin-student').filter(has_text=username).click();assert name in page.locator('.admin-person').inner_text()
   assert '學校待確認' not in page.locator('.admin-person').inner_text()
   for width in [390,1024]:
    page.set_viewport_size({'width':width,'height':844});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    page.screenshot(path=f'output/confirmed-school-name/{engine.name}-{username}-{width}.png',full_page=True);results.append({'engine':engine.name,'username':username,'width':width,'correctSchool':True,'noOverflow':True})
  search=page.get_by_placeholder('姓名、帳號或學校');search.fill('幸安');assert page.locator('.admin-student').count()==1;assert 'jasper' in page.locator('.admin-student').inner_text()
  rows=page.evaluate('async()=>await (await fetch("/api/admin/students")).json()')['students'];j=next(x for x in rows if x['username']=='jasper');assert j['school'] is None and j['schoolName']==expected['jasper']
  b.close()
Path('output/confirmed-school-name/browser-results.json').write_text(json.dumps(results,indent=2)+'\n');print({'viewChecks':len(results),'confirmedSchoolSearchPassed':True,'jasperPublisherUnassigned':True})
