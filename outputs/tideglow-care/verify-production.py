"""Read-only deployment verification; never accesses a child account."""
import concurrent.futures, hashlib, json, re
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
SITE = 'https://quintus-star-tide-academy-production.up.railway.app'

def get(path):
    with urlopen(Request(SITE + path, headers={'Cache-Control': 'no-cache'}), timeout=60) as response:
        return response.read(), response.headers.get('Content-Type', '')

local = (ROOT / 'dist/index.html').read_text()
remote = get('/')[0].decode()
entry = re.search(r'<script[^>]+src="([^"]+)"', local).group(1)
checks = [
    {'check': 'health', 'pass': json.loads(get('/healthz')[0])['ok'] is True},
    {'check': 'entry-reference', 'path': entry, 'pass': entry in remote},
]
paths = ['/assets/' + file.name for pattern in ('*.js', '*.css') for file in (ROOT / 'dist/assets').glob(pattern)]
for folder in ('tideglow-voice/kiki-20261025', 'tideglow-voice/kiki-care-20261025', 'tideglow-guide', 'tideglow-care'):
    paths.extend('/assets/' + folder + '/' + file.name for file in (ROOT / 'public/assets' / folder).iterdir() if file.is_file())

def verify(path):
    data, mime = get(path)
    expected = (ROOT / 'dist' / path.lstrip('/')).read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    mime_ok = (not path.endswith('.mp3') or mime.startswith('audio/mpeg')) and (not path.endswith('.webp') or mime.startswith('image/webp'))
    return {'path': path, 'bytes': len(data), 'mime': mime, 'sha256': digest, 'pass': digest == hashlib.sha256(expected).hexdigest() and mime_ok}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    checks.extend(executor.map(verify, sorted(set(paths))))
result = {'site': SITE, 'entry': entry, 'noAccountAccess': True, 'checks': checks, 'pass': all(check['pass'] for check in checks)}
(ROOT / 'outputs/tideglow-care/production-verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'pass': result['pass'], 'checks': len(checks), 'entry': entry}))
raise SystemExit(0 if result['pass'] else 1)
