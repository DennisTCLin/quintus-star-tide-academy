from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json,urllib.request,hashlib
base='https://quintus-star-tide-academy-production.up.railway.app'
m=json.load(open('/tmp/feifei-visibility-release.json'))
assets=[i for i in m['dist'] if i['path']=='index.html' or (i['path'].startswith('assets/') and i['path'].endswith(('.js','.css')))]
def verify(i):
 with urllib.request.urlopen(base+'/'+i['path'],timeout=45) as r:b=r.read()
 assert hashlib.sha256(b).hexdigest()==i['sha256'],i['path']
 return i['path']
with ThreadPoolExecutor(max_workers=4) as pool:paths=list(pool.map(verify,assets))
with urllib.request.urlopen(base+'/healthz',timeout=30) as r:health=r.status
try:
 urllib.request.urlopen(base+'/api/state',timeout=30)
 raise AssertionError('Unauthenticated state should remain protected')
except urllib.error.HTTPError as e:assert e.code==401
Path('output/feifei-battle-visibility/published.json').write_text(json.dumps({'commit':m['commit'],'url':base,'verifiedAssets':paths,'health':health,'unauthenticatedState':401,'deploymentId':'953c8d7d-1620-46c4-b04f-ad1edcd14379'},indent=2)+'\n')
print('Published assets match',len(paths),'files; health',health,'auth 401')
