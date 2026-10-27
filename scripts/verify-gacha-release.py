"""Verify the published runtime and illustrated machine match the checked build."""
import hashlib, json, os, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = os.getenv('GACHA_QA_URL', 'https://quintus-star-tide-academy-production.up.railway.app').rstrip('/')
OUT = ROOT / 'outputs/gacha-cinematic'

def get(path):
    with urllib.request.urlopen(BASE + path, timeout=45) as response:
        assert response.status == 200, (path, response.status)
        return response.read(), dict(response.headers)

html = get('/')[0].decode()
assets = []
files = sorted((ROOT/'dist/assets').glob('*.js')) + sorted((ROOT/'dist/assets').glob('*.css'))
files.append(ROOT/'dist/assets/gacha/starwish-machine.webp')
for path in files:
    relative = '/' + str(path.relative_to(ROOT/'dist'))
    if path.name.startswith('index.'):
        assert relative in html, ('root references old build', relative)
    if path.suffix == '.webp':
        relative += '?v=a9ee8fdfbf5f'
    data, headers = get(relative)
    assert data == path.read_bytes(), ('asset differs', relative)
    if path.suffix == '.webp':
        lowered = {k.lower(): v for k, v in headers.items()}
        assert lowered['content-type'].startswith('image/webp'), lowered
        assert 'immutable' in lowered.get('cache-control', ''), lowered
    assets.append({'path': relative, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
health = json.loads(get('/healthz')[0])
assert health['ok'], health
result = {'base': BASE, 'runtimeCommit': os.environ['GACHA_RELEASE_COMMIT'], 'deployment': os.environ['GACHA_DEPLOYMENT_ID'], 'health': health, 'allAssetsByteIdentical': True, 'assets': assets, 'result': 'PASS'}
OUT.mkdir(exist_ok=True, parents=True)
(OUT/'production-release.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(result, ensure_ascii=False, indent=2))
