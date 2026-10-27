"""Read-only release verification: health, auth guard, exact new asset and bundle hashes."""
import json,hashlib,urllib.request,urllib.error,concurrent.futures,time
from pathlib import Path
base='https://quintus-star-tide-academy-production.up.railway.app/'
manifest=json.loads(Path('/tmp/star-tide-wave4-release.json').read_text())
preserved={r['path'] for r in json.loads((Path(manifest['stage'])/'preserved-assets.json').read_text())}
files=[r for r in manifest['dist'] if r['path'] not in preserved]
def check(r):
 request=urllib.request.Request(base+r['path']+'?release=da7b8cc',headers={'Cache-Control':'no-cache'})
 with urllib.request.urlopen(request,timeout=60) as response:data=response.read();content=response.headers.get('Content-Type')
 assert len(data)==r['bytes'] and hashlib.sha256(data).hexdigest()==r['sha256'],r['path']
 return {'path':r['path'],'sha256':r['sha256'],'bytes':len(data),'contentType':content}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:rows=list(pool.map(check,files))
assert sum(r['path'].endswith('.mp4') for r in rows)==120
health=json.loads(urllib.request.urlopen(base+'healthz').read());assert health['ok']
try:urllib.request.urlopen(base+'api/state');raise AssertionError('State exposed without login')
except urllib.error.HTTPError as e:assert e.code==401
report={'runtimeCommit':manifest['commit'],'releasedCreatures':30,'newImages':60,'safeVideos':120,'backupActions':30,'verifiedFiles':rows,'health':health,'unauthenticatedStateStatus':401,'physicalIPad':False,'playerWritesPerformed':False}
Path('outputs/monster-wave4/production-assets.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS',len(rows),'exact asset/bundle hashes; health; login guard; no player writes')
