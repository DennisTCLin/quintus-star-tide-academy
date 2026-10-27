import json,hashlib,re,time
from pathlib import Path
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor
ROOT=Path.cwd();BASE='https://quintus-star-tide-academy-production.up.railway.app';OUT=ROOT/'outputs/feifei-companion'
def fetch(path,headers=None):
 for attempt in range(3):
  try:
   with urlopen(Request(BASE+path,headers=headers or {}),timeout=60) as r:return r.status,r.read(),dict(r.headers)
  except Exception:
   if attempt==2:raise
   time.sleep(2)
status,body,_=fetch('/healthz');assert status==200
status,body,_=fetch('/');local=(ROOT/'dist/index.html').read_text();js=re.findall(r'src="(/assets/[^" ]+\.js)"',local);assert js
for path in js:assert path.encode() in body,path
files=list((ROOT/'public/assets/feifei-bow/v1').glob('*'))
def check(p):
 path='/'+str(p.relative_to(ROOT/'public'));status,data,_=fetch(path);assert status==200 and hashlib.sha256(data).digest()==hashlib.sha256(p.read_bytes()).digest(),path;return path
with ThreadPoolExecutor(max_workers=4) as pool:verified=list(pool.map(check,files))
ranges=[]
for motion in ['highfive','bubbles','rest']:
 status,data,h=fetch('/assets/feifei-bow/v1/'+motion+'.mp4',{'Range':'bytes=0-1023'});assert status==206 and len(data)==1024;ranges.append(motion)
result={'pass':True,'url':BASE,'entryScripts':js,'assetHashesMatched':verified,'range206':ranges}
(OUT/'production-assets.json').write_text(json.dumps(result,indent=2));print('PASS health, current entry,',len(verified),'asset hashes, 3 video range requests')
