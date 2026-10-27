"""Read-only deployed bundle/media verification; no account or game requests."""
import hashlib
import json
import re
from pathlib import Path
from urllib.request import urlopen, Request

root = Path(__file__).resolve().parents[2]
site = 'https://quintus-star-tide-academy-production.up.railway.app'

def get(path):
    with urlopen(Request(site + path, headers={'Cache-Control': 'no-cache'}), timeout=30) as response:
        return response.read()

local = (root / 'dist/index.html').read_text()
remote = get('/').decode()
script = re.search(r'<script[^>]+src="([^"]+)"', local).group(1)
styles = re.findall(r'<link[^>]+href="([^"]+\.css)"', local)
checks = [{'kind': 'health', 'pass': json.loads(get('/health'))['ok'] is True},
          {'kind': 'html-bundle-reference', 'path': script, 'pass': script in remote}]
for path in [script, *styles, *['/assets/tideglow-guide/' + p.name for p in sorted((root / 'public/assets/tideglow-guide').iterdir())]]:
    expected = root / 'dist' / path.lstrip('/')
    actual = hashlib.sha256(get(path)).hexdigest()
    checks.append({'path': path, 'sha256': actual, 'pass': actual == hashlib.sha256(expected.read_bytes()).hexdigest()})
result = {'site': site, 'noAccountAccess': True, 'checks': checks, 'pass': all(c['pass'] for c in checks)}
(root / 'outputs/tideglow-companion/production-verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
raise SystemExit(0 if result['pass'] else 1)
