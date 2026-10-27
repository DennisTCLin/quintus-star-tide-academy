from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=[]
with sync_playwright() as p:
 b=p.webkit.launch(headless=True)
 for w,h in [(390,844),(820,1180)]:
  c=b.new_context(viewport={'width':w,'height':h});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  r=page.goto('https://quintus-star-tide-academy-production.up.railway.app/',wait_until='networkidle');assert r.status==200
  assert page.get_by_label('帳號',exact=True).is_visible();assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not errors
  status=c.request.get('https://quintus-star-tide-academy-production.up.railway.app/api/state').status;assert status==401
  out.append({'width':w,'height':h,'loginVisible':True,'overflow':False,'pageErrors':errors,'anonymousStateStatus':status});c.close()
 b.close()
Path('output/grade6-completion/public-browser-results.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
