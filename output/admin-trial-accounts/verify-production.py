"""Read-only published bundle/asset and unauthenticated API checks; no production accounts created."""
import json,hashlib,urllib.request,urllib.error,concurrent.futures,time
from pathlib import Path
base='https://quintus-star-tide-academy-production.up.railway.app/'
m=json.loads(Path('/tmp/star-tide-wave4-release.json').read_text());preserved={r['path'] for r in json.loads((Path(m['stage'])/'preserved-assets.json').read_text())};samples={'assets/monsters/wave4/wave4-metal-01-entrance.mp4','assets/monsters/wave4/wave4-water-30.webp','assets/companion-launcher-v3/bow.png'};files=[r for r in m['dist'] if (r['path'] not in preserved and r['path'].endswith(('.js','.css','.html'))) or r['path'] in samples]
def check(r):
 for attempt in range(3):
  try:
   with urllib.request.urlopen(base+r['path']+'?verify=admin-trials',timeout=30) as response:data=response.read()
   break
  except (TimeoutError,urllib.error.URLError):
   if attempt==2:raise
   time.sleep(1)
 assert len(data)==r['bytes'] and hashlib.sha256(data).hexdigest()==r['sha256'],r['path']
 return {'path':r['path'],'bytes':len(data),'sha256':r['sha256']}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(check,files))
health=json.load(urllib.request.urlopen(base+'healthz'));assert health['ok'];guards=[]
for path in ['api/state','api/admin/trials']:
 try:urllib.request.urlopen(base+path);raise AssertionError('Unexpected anonymous access')
 except urllib.error.HTTPError as e:assert e.code==401;guards.append({'path':path,'status':401})
out=Path('output/admin-trial-accounts/production-assets.json');out.write_text(json.dumps({'runtimeCommit':m['commit'],'hashes':rows,'health':health,'anonymousGuards':guards,'productionPlayerWrites':False,'scope':'all compiled files and three unchanged media samples; public source and staged bytes also verified'},indent=2)+'\n');print('PASS',len(rows),'exact hashes; health; anonymous guards')
