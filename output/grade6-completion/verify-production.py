"""Read-only public artifact verification after Railway reports SUCCESS."""
from pathlib import Path
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,os,subprocess
root=Path.cwd();site='https://quintus-star-tide-academy-production.up.railway.app'
def fetch(path):
 with urlopen(Request(site+path,headers={'Cache-Control':'no-cache'}),timeout=40) as r:return r.read()
health=json.loads(fetch('/healthz'));assert health['ok'] is True
local=(root/'dist/index.html').read_bytes();remote=fetch('/');assert remote==local,'index differs from built release'
paths=[p for p in (root/'dist/assets').glob('*') if p.suffix in ('.js','.css')]
def check(p):
 path='/'+str(p.relative_to(root/'dist'));data=fetch(path);expected=hashlib.sha256(p.read_bytes()).hexdigest();actual=hashlib.sha256(data).hexdigest();assert actual==expected,path
 return {'path':path,'bytes':len(data),'sha256':actual}
with ThreadPoolExecutor(max_workers=4) as pool:assets=list(pool.map(check,paths))
result={'runtime':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'deployment':os.environ['RELEASE_DEPLOYMENT'],'health':health,'indexMatches':True,'assets':assets,'scope':'Public health/index/all emitted JS and CSS byte verification; no child login or progress mutation.'}
(root/'output/grade6-completion/production-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'health':True,'matchingAssets':len(assets),'deployment':result['deployment']}))
