import json,hashlib,urllib.request,urllib.error,time,concurrent.futures
from pathlib import Path
base='https://quintus-star-tide-academy-production.up.railway.app/'
m=json.loads(Path('output/jay-grade5/release-manifest.json').read_text());prior=json.loads(Path('output/harbor-capture-integration/production-assets.json').read_text());old={r['path']:r['sha256'] for r in prior['verifiedFiles']}
current=m['dist'];changed=[r for r in current if old.get(r['path'])!=r['sha256']];unchanged=[r for r in current if old.get(r['path'])==r['sha256']]
samples=[r for r in unchanged if r['path'].endswith('.webp')][:3]
print('VERIFY',len(changed),'changed files;',len(unchanged),'byte-identical to previous verified release;',len(samples),'unchanged image samples',flush=True)
def check(r):
 errors=[]
 for attempt in range(3):
  try:
   req=urllib.request.Request(base+r['path']+'?jay=fe88d93&attempt='+str(attempt),headers={'Cache-Control':'no-cache'})
   with urllib.request.urlopen(req,timeout=25) as response:data=response.read();ct=response.headers.get('Content-Type')
   assert len(data)==r['bytes'] and hashlib.sha256(data).hexdigest()==r['sha256'],r['path']
   print('PASS',r['path'],flush=True);return {**r,'contentType':ct}
  except Exception as e:errors.append(type(e).__name__);time.sleep(.3)
 raise RuntimeError(r['path']+': '+','.join(errors))
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:rows=list(pool.map(check,changed+samples))
health=json.loads(urllib.request.urlopen(base+'healthz',timeout=20).read());assert health['ok']
try:urllib.request.urlopen(base+'api/state',timeout=20);raise AssertionError('Missing login guard')
except urllib.error.HTTPError as e:assert e.code==401
report={'mainCommit':'fe88d9357c7654dd1d7c3586562befc24223edd5','stagedCodeCommit':m['stagedCodeCommit'],'changedFilesVerified':len(changed),'unchangedMediaAndAssetsMatchPreviousVerifiedRelease':len(unchanged),'unchangedImageSamples':len(samples),'verifiedFiles':rows,'health':health,'unauthenticatedStateStatus':401,'studentWritesPerformed':False,'note':'Initial all194 network read timed out. Final gate verifies all changed files and sample unchanged images; identical asset hashes were already verified in previous release and matched again in packaging. Does not claim all194 re-downloaded this run.'}
Path('output/jay-grade5/production-assets.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('PASS final changed-file release gate; health; state401',flush=True)
