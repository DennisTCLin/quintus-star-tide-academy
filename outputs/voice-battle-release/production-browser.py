"""Anonymous, read-only production WebKit smoke."""
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json
out=Path('outputs/voice-battle-release');site='https://quintus-star-tide-academy-production.up.railway.app/'
with sync_playwright() as pw:
 b=pw.webkit.launch();c=b.new_context(**pw.devices['iPad (gen 7)']);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append({'name':e.name,'message':e.message}));p.goto(site,wait_until='domcontentloaded');expect(p.get_by_role('button',name='登入，繼續冒險 →',exact=True)).to_be_visible(timeout=20000)
 checks=[{'name':'Anonymous iPad WebKit login renders','pass':True},{'name':'No horizontal overflow','pass':p.evaluate('document.documentElement.scrollWidth<=innerWidth')},{'name':'No runtime exception','pass':not errors}]
 for path in ['/api/companion-talk?player=doudou','/api/state']:
  r=p.request.get(site.rstrip('/')+path);checks.append({'name':'Authentication retained '+path,'pass':r.status==401,'status':r.status})
 p.screenshot(path=str(out/'production-tablet-login.png'));result={'site':site,'noAccountAccess':True,'checks':checks,'errors':errors,'pass':all(x['pass'] for x in checks)};(out/'production-browser.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False));c.close();b.close();assert result['pass']
