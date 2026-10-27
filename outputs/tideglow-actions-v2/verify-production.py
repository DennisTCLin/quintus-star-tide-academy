from pathlib import Path
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,re,subprocess,os
root=Path.cwd();site='https://quintus-star-tide-academy-production.up.railway.app'
def get(p):
 for attempt in range(3):
  try:
   with urlopen(Request(site+p,headers={'Cache-Control':'no-cache'}),timeout=40) as r:return r.read(),r.headers.get('Content-Type','')
  except (TimeoutError, OSError):
   if attempt==2:raise
entry=re.search(r'<script[^>]+src="([^"]+)"',(root/'dist/index.html').read_text()).group(1)
checks=[{'check':'health','pass':json.loads(get('/healthz')[0])['ok'] is True},{'check':'entry','pass':entry in get('/')[0].decode(),'path':entry}]
paths=[entry,'/assets/olivia-dog/hello-v1.mp4','/players/alston.jpg']+['/assets/tideglow-guide/'+m+'.mp4' for m in ['pet','feed','play']]+['/'+str(p.relative_to(root/'dist')) for d in ['assets/tideglow-guide/actions-v2','assets/olivia-dog/actions-v2','assets/companion-ui'] for p in (root/'dist'/d).glob('*')]
def check(path):
 data,mime=get(path);local=(root/'dist'/path.lstrip('/')).read_bytes()
 return {'path':path,'pass':data==local,'mime':mime,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
with ThreadPoolExecutor(max_workers=6) as pool:checks.extend(pool.map(check,paths))
result={'site':site,'deployment':os.environ.get('TIDE_DEPLOYMENT'),'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'checks':checks,'pass':all(c['pass'] for c in checks)}
(root/'outputs/tideglow-actions-v2/production-verification.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result));assert result['pass']
