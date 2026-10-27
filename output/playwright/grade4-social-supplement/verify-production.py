"""Anonymous production acceptance: compare built assets, health, and login boundary."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,urllib.request,urllib.error,datetime,subprocess
origin='https://quintus-star-tide-academy-production.up.railway.app'
files=[Path('dist/index.html'),*sorted(p for p in Path('dist/assets').iterdir() if p.suffix in {'.js','.css'}),*sorted(Path('dist/assets/subject-islands').glob('panorama-v2-*.webp'))]
def check(path):
 relative=path.relative_to('dist').as_posix()
 with urllib.request.urlopen(origin+'/'+relative,timeout=30) as response:
  body=response.read();status=response.status
 return {'path':relative,'status':status,'sha256Match':hashlib.sha256(body).digest()==hashlib.sha256(path.read_bytes()).digest()}
with ThreadPoolExecutor(max_workers=4) as pool:checks=list(pool.map(check,files))
with urllib.request.urlopen(origin+'/healthz',timeout=30) as response:health={'status':response.status,'body':json.load(response)}
boundaries={}
for route in ['/api/state','/api/admin/session','/api/admin/students','/api/admin/users','/api/admin/audit']:
 try:
  with urllib.request.urlopen(origin+route,timeout=30) as response:boundaries[route]=response.status
 except urllib.error.HTTPError as exc:boundaries[route]=exc.code
with urllib.request.urlopen(origin+'/admin',timeout=30) as response:
 adminPage={'status':response.status,'indexMatches':response.read()==Path('dist/index.html').read_bytes()}
result={'commit':subprocess.check_output(['git','rev-parse','14ef608f4d32d3c614036d0ef8d4955d3291bd01'],text=True).strip(),'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'anonymousOnly':True,'assets':checks,'health':health,'unauthenticatedStatus':boundaries,'adminPage':adminPage,'passed':all(x['sha256Match'] and x['status']==200 for x in checks) and health['body'].get('ok') is True and all(status==401 for status in boundaries.values()) and adminPage['status']==200 and adminPage['indexMatches']}
Path('output/playwright/grade4-social-supplement/production-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':result['passed'],'assetChecks':len(checks),'health':health,'unauthenticatedStatus':boundaries,'adminPage':adminPage}))
assert result['passed']
