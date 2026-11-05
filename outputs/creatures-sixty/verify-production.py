"""Public, read-only verification; never authenticates as or mutates a child."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,os
root=Path.cwd();site='https://quintus-star-tide-academy-production.up.railway.app'
def fetch(path):
 with urlopen(Request(site+path,headers={'Cache-Control':'no-cache'}),timeout=60) as r:return r.read()
health=json.loads(fetch('/healthz'));assert health.get('ok') is True
try:fetch('/api/state');raise AssertionError('Anonymous state should be unauthorized')
except HTTPError as e:assert e.code==401
assert fetch('/')==(root/'dist/index.html').read_bytes(),'HTML differs from validated build'
items=[('/assets/'+p.name,p) for p in (root/'dist/assets').iterdir() if p.suffix in {'.js','.css'}]
for a in json.loads((root/'outputs/creatures-sixty/assets.json').read_text())['assets']:
 for f in a['files']:items.append(('/'+f['path'].removeprefix('public/')+'?v='+f['sha256'][:12],root/f['path']))
def check(item):
 url,p=item;data=fetch(url);actual=hashlib.sha256(data).hexdigest();assert actual==hashlib.sha256(p.read_bytes()).hexdigest(),url
 return {'url':url,'bytes':len(data),'sha256':actual}
with ThreadPoolExecutor(max_workers=5) as pool:assets=list(pool.map(check,items))
result={'runtime':'8a9acdd','deployment':os.environ['RELEASE_DEPLOYMENT'],'health':health,'anonymousState':401,'matchingHTML':True,'verifiedAssets':assets,'scope':'Public bytes only; no real student writes.'}
(root/'outputs/creatures-sixty/production.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':'PASS','runtime':result['runtime'],'verifiedAssets':len(assets),'deployment':result['deployment']}))
