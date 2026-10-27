import json,hashlib,urllib.request,urllib.error,time,concurrent.futures,subprocess
from pathlib import Path
base='https://quintus-star-tide-academy-production.up.railway.app/'
m=json.loads(Path('output/corner-only-companion/release-manifest.json').read_text())
prior=json.loads(Path('output/stable-companion-dock/release-manifest.json').read_text())
old={r['path']:r['sha256'] for r in prior['dist']}
old.update({r['path']:r['sha256'] for r in json.loads(Path('output/admin-trial-accounts/production-assets.json').read_text())['hashes']})
changed=[r for r in m['dist'] if old.get(r['path'])!=r['sha256']];unchanged=[r for r in m['dist'] if old.get(r['path'])==r['sha256']]
samples=[r for r in unchanged if r['path'].endswith('.webp')][:3]+[r for r in unchanged if '/wave4/' in r['path'] and r['path'].endswith('.mp4')][:3]
def check(r):
 for attempt in range(3):
  try:
   req=urllib.request.Request(base+r['path']+'?flow='+m['commit'][:8]+'&attempt='+str(attempt),headers={'Cache-Control':'no-cache'})
   with urllib.request.urlopen(req,timeout=30) as response:data=response.read();ct=response.headers.get('Content-Type')
   assert len(data)==r['bytes'] and hashlib.sha256(data).hexdigest()==r['sha256'],r['path'];print('PASS',r['path'],flush=True);return {**r,'contentType':ct}
  except Exception:
   if attempt==2:raise
   time.sleep(.3)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:rows=list(pool.map(check,changed+samples))
health=json.loads(urllib.request.urlopen(base+'healthz',timeout=20).read());assert health['ok']
try:urllib.request.urlopen(base+'api/state',timeout=20);raise AssertionError('Missing login guard')
except urllib.error.HTTPError as e:assert e.code==401
report={'stagedCodeCommit':m['commit'],'changedFilesVerified':len(changed),'unchangedAssetHashesMatchPriorManifest':len(unchanged),'unchangedSamples':len(samples),'verifiedFiles':rows,'health':health,'unauthenticatedStateStatus':401,'studentWritesPerformed':False,'physicalIPad':False,'note':'All changed files and six unchanged samples re-downloaded. Remaining unchanged files verified in packaging against the prior manifest, not claimed re-downloaded.'}
Path('output/corner-only-companion/production-assets.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('PASS production changed-file hashes, media samples, health and authentication boundary',flush=True)
