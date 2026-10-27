from pathlib import Path
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,os,subprocess,importlib.util
root=Path.cwd();out=root/'outputs/ipad15-motion';site=os.environ.get('QA_URL','https://quintus-star-tide-academy-production.up.railway.app')
def fetch(path):
 with urlopen(Request(site+path,headers={'Cache-Control':'no-cache'}),timeout=40) as r:return r.read()
assert json.loads(fetch('/healthz'))['ok'] is True
assert fetch('/')==(root/'dist/index.html').read_bytes()
paths=[p for p in (root/'dist/assets').glob('*') if p.suffix in ['.js','.css']]+list((root/'dist/assets/companion-frames-v1').rglob('*.jpg'))
def check(p):
 data=fetch('/'+str(p.relative_to(root/'dist')));assert data==p.read_bytes(),str(p);return {'path':str(p.relative_to(root/'dist')),'sha256':hashlib.sha256(data).hexdigest()}
with ThreadPoolExecutor(max_workers=4) as pool:assets=list(pool.map(check,paths))
spec=importlib.util.spec_from_file_location('qa',out/'browser-qa.py');t=importlib.util.module_from_spec(spec);spec.loader.exec_module(t);t.q.base=site
with t.sync_playwright() as pw:
 b=pw.webkit.launch()
 for mascot in ['dog','tideglow']:
  c,p=t.setup(b,mascot)
  for motion,label,target in [('pet','摸摸',None),('feed','餵點心',None),('play','星光球','接第 1 顆星光球')]:t.action(p,motion,label,target);t.q.check('Production legacy '+mascot+' '+motion+' pixels advance and action completes')
  c.close()
  c,p=t.setup(b,mascot,'reject');t.action(p,'feed','餵點心');t.q.check('Production rejected video '+mascot+' animated feed');c.close()
 b.close()
 t.q.check('No production JS errors',not t.q.errors)
result={'pass':True,'runtime':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'deployment':os.environ.get('RELEASE_DEPLOYMENT'),'assets':assets,'checks':t.q.checks,'physicalDevice':False,'realStudentDataChanged':False}
(out/os.environ.get('QA_RESULT','production-verification.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'pass':True,'assets':len(assets),'UIchecks':len(t.q.checks)}))
