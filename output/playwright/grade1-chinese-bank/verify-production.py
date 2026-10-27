"""Anonymous production acceptance: compare built assets, health, and login boundary."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,urllib.request,urllib.error,datetime
origin='https://quintus-star-tide-academy-production.up.railway.app'
files=[Path('dist/index.html'),*sorted(p for p in Path('dist/assets').iterdir() if p.suffix in {'.js','.css'})]
def check(path):
 relative=path.relative_to('dist').as_posix()
 with urllib.request.urlopen(origin+'/'+relative,timeout=30) as response:
  body=response.read();status=response.status
 return {'path':relative,'status':status,'sha256Match':hashlib.sha256(body).digest()==hashlib.sha256(path.read_bytes()).digest()}
with ThreadPoolExecutor(max_workers=4) as pool:checks=list(pool.map(check,files))
with urllib.request.urlopen(origin+'/healthz',timeout=30) as response:health={'status':response.status,'body':json.load(response)}
try:
 with urllib.request.urlopen(origin+'/api/state',timeout=30) as response:auth=response.status
except urllib.error.HTTPError as exc:auth=exc.code
result={'commit':'37e6091e60b99bbbc868f65d3c8153ee41184467','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'anonymousOnly':True,'assets':checks,'health':health,'unauthenticatedStateStatus':auth,'passed':all(x['sha256Match'] and x['status']==200 for x in checks) and health['body'].get('ok') is True and auth==401}
Path('output/playwright/grade1-chinese-bank/production-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':result['passed'],'assetChecks':len(checks),'health':health,'unauthenticatedStateStatus':auth}))
assert result['passed']
