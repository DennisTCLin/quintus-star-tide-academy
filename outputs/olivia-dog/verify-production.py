from pathlib import Path
from urllib.request import Request,urlopen
import hashlib,json,re
root=Path.cwd();site='https://quintus-star-tide-academy-production.up.railway.app'
def get(p):
 with urlopen(Request(site+p,headers={'Cache-Control':'no-cache'}),timeout=30) as r:return r.read(),r.headers.get('Content-Type','')
index=(root/'dist/index.html').read_text();entry=re.search(r'<script[^>]+src="([^"]+)"',index).group(1)
checks=[{'check':'health','pass':json.loads(get('/healthz')[0])['ok'] is True},{'check':'entry','pass':entry in get('/')[0].decode(),'path':entry}]
for path in [entry,'/assets/olivia-dog/hello-v1.mp4','/assets/olivia-dog/poster-v1.png','/players/alston.jpg']:
 data,mime=get(path);local=(root/'dist'/path.lstrip('/')).read_bytes()
 checks.append({'path':path,'pass':data==local,'mime':mime,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
result={'site':site,'deployment':'d2eda160-2d7a-4a48-853b-3f9cb8cbe6be','sourceCommit':'f97ac5d214325437175c5d2e7630da1a96777ef1','checks':checks,'pass':all(c['pass'] for c in checks)}
(root/'outputs/olivia-dog/production-verification.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result));assert result['pass']
