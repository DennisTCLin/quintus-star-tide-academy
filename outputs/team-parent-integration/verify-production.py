"""Read-only entry/asset verification against the tested local build."""
import concurrent.futures, hashlib, json, re, subprocess
from pathlib import Path
from urllib.request import Request, urlopen
ROOT=Path(__file__).resolve().parents[2]
SITE='https://quintus-star-tide-academy-production.up.railway.app'
def get(path):
 with urlopen(Request(SITE+path,headers={'Cache-Control':'no-cache'}),timeout=40) as r:return r.read()
local=(ROOT/'dist/index.html').read_text();remote=get('/').decode()
paths=re.findall(r'(?:src|href)="(/assets/[^" ]+\.(?:js|css))"',local)
checks=[{'kind':'health','pass':json.loads(get('/healthz'))['ok'] is True}]
checks.extend({'kind':'entry','path':path,'pass':path in remote} for path in paths)
def compare(path):
 data=get(path);digest=hashlib.sha256(data).hexdigest()
 return {'path':path,'sha256':digest,'bytes':len(data),'pass':digest==hashlib.sha256((ROOT/'dist'/path.lstrip('/')).read_bytes()).hexdigest()}
assets=['/assets/'+p.name for p in (ROOT/'dist/assets').iterdir() if p.suffix in ['.js','.css']]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:checks.extend(pool.map(compare,assets))
result={'site':SITE,'runtimeCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'noAccountAccess':True,'checks':checks,'pass':all(c['pass'] for c in checks)}
(ROOT/'outputs/team-parent-integration/production-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'pass':result['pass'],'checks':len(checks),'entry':paths}))
raise SystemExit(0 if result['pass'] else 1)
