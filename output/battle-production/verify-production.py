from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request,json,hashlib,re,datetime
ROOT=Path.cwd();BASE='https://quintus-star-tide-academy-production.up.railway.app';manifest=json.loads((ROOT/'src/data/battle-cinematics.json').read_text())
def fetch(path,method='GET',headers={}):
 with urllib.request.urlopen(urllib.request.Request(BASE+path,method=method,headers=headers),timeout=60) as r:return r.status,{k.lower():v for k,v in r.headers.items()},r.read()
status,headers,body=fetch('/healthz');assert status==200 and json.loads(body)['ok'];html=fetch('/')[2].decode();local=(ROOT/'dist/index.html').read_text()
js=re.findall(r'(?:src|href)="(/assets/[^\"]+\.(?:js|css))"',local)
for path in js:
 assert path in html,(path,'not deployed')
 remote=fetch(path)[2];assert hashlib.sha256(remote).digest()==hashlib.sha256((ROOT/'dist'/path.lstrip('/')).read_bytes()).digest()
def check(item):
 id,clip=item;file=ROOT/'public'/clip['src'].split('?')[0].lstrip('/');status,headers,_=fetch(clip['src'],'HEAD');assert status==200;assert int(headers['content-length'])==file.stat().st_size
 status,headers,data=fetch(clip['src'],headers={'Range':'bytes=0-1023'});assert status==206 and data==file.read_bytes()[:1024],id
 status,headers,poster=fetch(clip['poster']);assert poster==(ROOT/'public'/clip['poster'].split('?')[0].lstrip('/')).read_bytes(),id
 return {'move':id,'head':200,'range':206,'bytes':file.stat().st_size,'posterHash':'matched'}
with ThreadPoolExecutor(max_workers=8) as ex:checks=list(ex.map(check,manifest.items()))
for id in ['tideglow-1','cloudsail-3','astraltide-3']:
 clip=manifest[id];actual=fetch(clip['src'])[2];assert actual==(ROOT/'public'/clip['src'].split('?')[0].lstrip('/')).read_bytes()
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'base':BASE,'health':'PASS','entryBundlesMatch':js,'media':checks,'completeVideoHashSamples':['tideglow-1','cloudsail-3','astraltide-3'],'pass':True}
(ROOT/'output/battle-production/production-results.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(json.dumps({'health':200,'bundles':len(js),'clips':len(checks),'pass':True}))
