# Published frontend, synthetic local admin responses only. No production login.
import json,urllib.request,http.cookiejar
from pathlib import Path
from playwright.sync_api import sync_playwright
access=json.loads(Path('/tmp/star-tide-admin-school/access.json').read_text());jar=http.cookiejar.CookieJar();op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar));base=access['base']
with op.open(urllib.request.Request(base+'/api/admin/login',data=json.dumps({'username':access['username'],'password':access['password']}).encode(),headers={'Content-Type':'application/json','Origin':base})) as r:auth=json.load(r)
payloads={'session':auth}
for path in ['students','grants','presence']:
 with op.open(base+'/api/admin/'+path) as r:payloads[path]=json.load(r)
results=[]
with sync_playwright() as p:
 b=p.webkit.launch();page=b.new_page(viewport={'width':1024,'height':800})
 def mock(route):
  key=route.request.url.split('/api/admin/',1)[1].split('?',1)[0]
  route.fulfill(status=200 if key in payloads else 404,content_type='application/json',body=json.dumps(payloads.get(key,{})))
 page.route('**/api/admin/**',mock);page.goto('https://quintus-star-tide-academy-production.up.railway.app/admin');page.locator('.admin-person').wait_for();assert '臺北市大安區建安國小' in page.locator('.admin-person').inner_text()
 assert '學校待確認' not in page.locator('.admin-person').inner_text()
 page.screenshot(path='output/admin-school-display/production-synthetic-admin.png',full_page=True)
 search=page.get_by_placeholder('姓名、帳號或學校');search.fill('建安');assert page.locator('.admin-student').count()==1
 results={'confirmedSchoolShown':True,'searchByJianan':True,'syntheticAdminResponsesOnly':True,'productionLogin':False};b.close()
Path('output/admin-school-display/production-browser.json').write_text(json.dumps(results,indent=2)+'\n');print(results)
