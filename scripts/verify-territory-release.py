"""Compare published build and territory art bytes without touching player data."""
from pathlib import Path
import hashlib,json,urllib.request
BASE='https://quintus-star-tide-academy-production.up.railway.app'
rows=[]
for path in sorted(Path('dist/assets').glob('*.js'))+sorted(Path('dist/assets').glob('*.css'))+list(Path('dist/assets/territory').glob('*.webp')):
 relative=str(path.relative_to('dist'))
 with urllib.request.urlopen(BASE+'/'+relative,timeout=45) as response:
  data=response.read();assert data==path.read_bytes(),relative
  rows.append({'path':relative,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'contentType':response.headers.get('Content-Type')})
with urllib.request.urlopen(BASE+'/healthz',timeout=30) as response:
 assert response.status==200;health=response.read().decode()
result={'base':BASE,'commit':'444af84','deployment':'a93dde47-4b4c-4c6a-b522-5e18bb14bac7','health':health,'allAssetsByteIdentical':True,'assets':rows}
Path('outputs/territory/production-release.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False,indent=2))
