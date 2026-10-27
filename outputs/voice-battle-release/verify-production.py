"""Read-only production byte comparison; no account or game-state access."""
import concurrent.futures,hashlib,json,re,sys
from pathlib import Path
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parents[2];SITE='https://quintus-star-tide-academy-production.up.railway.app'
def get(path):
 with urlopen(Request(SITE+path,headers={'Cache-Control':'no-cache'}),timeout=60) as r:return r.read(),r.headers.get('Content-Type','')
local=(ROOT/'dist/index.html').read_text();remote=get('/')[0].decode();script=re.search(r'<script[^>]+src="([^"]+)"',local).group(1);styles=re.findall(r'<link[^>]+href="([^"]+\.css)"',local)
checks=[{'kind':'health','pass':json.loads(get('/healthz')[0])['ok'] is True},{'kind':'entry-reference','path':script,'pass':script in remote}]
paths=[*sorted(set([script,*styles,*['/assets/'+p.name for pattern in ('*.js','*.css') for p in (ROOT/'dist/assets').glob(pattern)]])),*['/assets/tideglow-voice/kiki-20261025/'+p.name for p in sorted((ROOT/'public/assets/tideglow-voice/kiki-20261025').glob('*.mp3'))],*['/assets/tideglow-guide/'+p.name for p in sorted((ROOT/'public/assets/tideglow-guide').iterdir())]]
def verify(path):
 data,mime=get(path);expected=(ROOT/'dist'/path.lstrip('/')).read_bytes();sha=hashlib.sha256(data).hexdigest();mime_ok=not path.endswith('.mp3') or mime.startswith('audio/mpeg')
 return {'path':path,'bytes':len(data),'mime':mime,'sha256':sha,'pass':sha==hashlib.sha256(expected).hexdigest() and mime_ok}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:checks.extend(pool.map(verify,paths))
result={'site':SITE,'noAccountAccess':True,'checks':checks,'pass':all(x['pass'] for x in checks)}
(ROOT/'outputs/voice-battle-release'/('production-recovery-verification.json' if '--recovery' in sys.argv else 'production-verification.json')).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'pass':result['pass'],'checks':len(checks),'entry':script}));raise SystemExit(0 if result['pass'] else 1)
