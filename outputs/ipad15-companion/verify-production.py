from pathlib import Path
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,re,subprocess,importlib.util
root=Path.cwd();site='https://quintus-star-tide-academy-production.up.railway.app';out=root/'outputs/ipad15-companion'
def get(path,headers=None):
 with urlopen(Request(site+path,headers={'Cache-Control':'no-cache',**(headers or {})}),timeout=40) as r:return r.status,r.read(),dict(r.headers)
entry=re.search(r'<script[^>]+src="([^"]+)"',(root/'dist/index.html').read_text()).group(1)
checks=[{'check':'health','pass':json.loads(get('/healthz')[1])['ok'] is True},{'check':'entry','pass':entry in get('/')[1].decode()}]
paths=['/'+str(p.relative_to(root/'dist')) for p in (root/'dist/assets').glob('*') if p.suffix in ['.js','.css']]
paths+=['/'+str(p.relative_to(root/'dist')) for p in (root/'dist/assets/olivia-dog').rglob('*') if p.is_file()]
paths+=['/'+str(p.relative_to(root/'dist')) for p in (root/'dist/assets/tideglow-guide/actions-v2').rglob('*') if p.is_file()]
def check(path):
 _,data,headers=get(path);return {'path':path,'pass':data==(root/'dist'/path.lstrip('/')).read_bytes(),'sha256':hashlib.sha256(data).hexdigest()}
with ThreadPoolExecutor(max_workers=4) as pool:checks.extend(pool.map(check,paths))
status,data,headers=get('/assets/olivia-dog/actions-v2/idle.mp4',{'Range':'bytes=0-1023'});checks.append({'check':'Safari media byte range','pass':status==206 and len(data)==1024 and any(k.lower()=='content-range' for k in headers)})
# Actual deployed UI with fully intercepted synthetic APIs; no real login or mutation.
spec=importlib.util.spec_from_file_location('dog_qa',out/'browser-qa.py');q=importlib.util.module_from_spec(spec);spec.loader.exec_module(q);q.base=site
with q.sync_playwright() as pw:
 b=pw.webkit.launch()
 for mode in ['normal','pending','broken-poster']:
  c,p=q.setup(b,mode,reduced=mode=='broken-poster')
  p.get_by_role('button',name='一起休息',exact=True).click()
  if mode=='normal':q.moving(p,'rest')
  else:q.usable_image(p)
  checks.append({'check':'Production WebKit '+mode,'pass':True});c.close()
 b.close()
checks.append({'check':'Production UI no JavaScript exception','pass':not q.errors})
result={'pass':all(x['pass'] for x in checks),'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'checks':checks,'realStudentDataChanged':False,'physicalDevice':False}
(out/'production-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'pass':result['pass'],'checks':len(checks)}));assert result['pass']
