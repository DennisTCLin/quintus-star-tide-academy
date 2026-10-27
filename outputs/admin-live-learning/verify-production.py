# Public production checks only: never logs in or issues real tickets.
import asyncio,hashlib,json,uuid,subprocess
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from concurrent.futures import ThreadPoolExecutor
from playwright.async_api import async_playwright,expect
base='https://quintus-star-tide-academy-production.up.railway.app';out=Path('outputs/admin-live-learning');checks=[]
def check(name,ok=True):
 assert ok,name
 checks.append({'name':name,'pass':True});print('PASS',name,flush=True)
def fetch(path,body=None):
 req=Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Origin':base,'Content-Type':'application/json'})
 try:
  with urlopen(req,timeout=30) as r:return r.status,r.read()
 except HTTPError as e:return e.code,e.read()
def asset(p):
 status,data=fetch('/assets/'+p.name);assert status==200 and hashlib.sha256(data).digest()==hashlib.sha256(p.read_bytes()).digest(),p.name
 return p.name
async def main():
 files=[p for p in Path('dist/assets').iterdir() if p.is_file() and p.suffix in {'.js','.css'}]
 with ThreadPoolExecutor(max_workers=4) as pool:matched=list(pool.map(asset,files))
 check('All '+str(len(matched))+' production JS/CSS assets match integrated build')
 status,html=fetch('/admin');check('Admin page is available',status==200)
 local=Path('dist/index.html').read_text();check('Admin entry serves integrated build',all(p.name in html.decode() for p in files if p.name.startswith('index.')))
 check('Health endpoint is healthy',fetch('/health')[0]==200)
 for path in ['session','students','grants','users','audit','presence','parent/00000000-0000-4000-8000-000000000001']:check('Anonymous '+path+' rejected',fetch('/api/admin/'+path)[0]==401)
 for kind in ['standard','star']:
  body={'grantId':str(uuid.uuid4()),'username':'synthetic_no_login','ticketType':kind,'amount':1,'reason':'unauthenticated boundary check'}
  for action in ['preview','grant']:check('Anonymous '+kind+' '+action+' rejected',fetch('/api/admin/tickets/'+action,body)[0]==401)
 async with async_playwright() as p:
  for device in ['iPhone 13','iPad (gen 7)']:
   browser=await p.webkit.launch();ctx=await browser.new_context(**p.devices[device]);page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   try:
    await page.goto(base+'/admin');await page.wait_for_load_state('networkidle');await expect(page.get_by_role('heading',name='星潮管理艙')).to_be_visible();await expect(page.get_by_role('button',name='登入管理艙',exact=True)).to_be_visible()
    check(device+' production login page has no overflow or JS error',not errors and await page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   finally:await ctx.close();await browser.close()
 (out/'production-verification.json').write_text(json.dumps({'pass':True,'releaseCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'assets':matched,'checks':checks,'productionAuthenticatedGrantTest':False,'productionStudentDataChanged':False,'physicalDevice':False},ensure_ascii=False,indent=2)+'\n')
asyncio.run(main())
