from pathlib import Path
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor
from playwright.sync_api import sync_playwright,expect
import json,hashlib,os,subprocess
out=Path('outputs/quiz-victory');site='https://quintus-star-tide-academy-production.up.railway.app'
def fetch(path):
 with urlopen(Request(site+path,headers={'Cache-Control':'no-cache'}),timeout=40) as r:return r.read()
assert json.loads(fetch('/healthz'))['ok']
assert fetch('/')==Path('dist/index.html').read_bytes()
paths=[p for p in Path('dist/assets').glob('*') if p.suffix in ['.js','.css']]
def verify(p):
 path='/'+p.relative_to('dist').as_posix();b=fetch(path);assert b==p.read_bytes(),path
 return {'path':path,'sha256':hashlib.sha256(b).hexdigest()}
with ThreadPoolExecutor(max_workers=4) as pool:assets=list(pool.map(verify,paths))
# Reuse fixture helpers only. All API requests are intercepted: no student writes.
helpers=Path(out/'browser-qa.py').read_text().split('with sync_playwright() as pw:')[0]
ns={};exec(helpers,ns);ns['base']=site
with sync_playwright() as pw:
 b=pw.webkit.launch()
 for w,h in [(320,568),(820,1180),(1194,834)]:
  c,p,s=ns['setup'](b,w=w,h=h)
  ns['check']('Production victory CTA '+str(w),ns['visible_cta'](p));p.screenshot(path=str(out/f'production-{w}.png'))
  p.locator('.victory-continue').evaluate('(e)=>{e.click();e.click()}');expect(p.locator('.challenge-preparation')).to_be_visible()
  ns['check']('Production next voyage once '+str(w),len(s['commands'])==1 and s['commands'][0]['course']=='math');c.close()
 c,p,s=ns['setup'](b,active=True);p.locator('.answer-grid button').nth(ns['data']['normal']['choice']).click();expect(p.locator('.result-panel')).to_be_hidden();expect(p.locator('.victory-continue')).to_be_visible(timeout=12000);ns['check']('Production final animation then victory',ns['visible_cta'](p));c.close();b.close()
ns['check']('No JavaScript errors',not ns['errors'])
(out/'production-verification.json').write_text(json.dumps({'runtime':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'deployment':os.getenv('RELEASE_DEPLOYMENT'),'assets':assets,'checks':ns['checks'],'realStudentWrites':False,'physicalIpad':False},ensure_ascii=False,indent=2))
print('PASS production',len(assets),'asset hashes',len(ns['checks']),'UI checks')
