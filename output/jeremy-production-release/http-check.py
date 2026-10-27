"""Read-only published artifact identity and authentication-boundary checks."""
from pathlib import Path
import json,hashlib,urllib.request,urllib.error,concurrent.futures
BASE='https://quintus-star-tide-academy-production.up.railway.app'
OUT=Path('output/jeremy-production-release');manifest=json.loads(Path('/tmp/star-tide-jeremy-release.json').read_text());preserved=json.loads((Path(manifest['stage'])/'preserved-assets.json').read_text());known={x['path'] for x in preserved}
files=[x for x in manifest['dist'] if x['path'] not in known]
for part in ['feifei-bow/v1','olivia-dog/actions-v2','tideglow-guide/actions-v2']:
 for motion in ['highfive','bubbles','rest']:
  path='assets/'+part+'/'+motion+'.mp4';files.append(next(x for x in manifest['dist'] if x['path']==path))
def fetch(path):
 with urllib.request.urlopen(urllib.request.Request(BASE+'/'+path,headers={'Cache-Control':'no-cache'}),timeout=45) as r:return r.status,r.read()
def verify(x):
 code,data=fetch(x['path']);assert code==200 and len(data)==x['bytes'] and hashlib.sha256(data).hexdigest()==x['sha256'],x['path'];return {'path':x['path'],'sha256':x['sha256'],'pass':True}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:rows=list(pool.map(verify,files))
status,health=fetch('healthz');assert status==200 and json.loads(health)['ok']
try:fetch('api/state');raise AssertionError('Unauthenticated state unexpectedly allowed')
except urllib.error.HTTPError as e:assert e.code==401,e.code
result={'commit':manifest['commit'],'deployment':'8197fb83-16ab-4045-aa49-093d75d67de5','url':BASE,'health':json.loads(health),'publicFilesMatched':rows,'unauthenticatedStateStatus':401,'productionMutations':False,'pass':True}
(OUT/'http-results.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS health, authentication boundary,',len(rows),'published file hashes')
