from pathlib import Path
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,os,subprocess
site='https://quintus-star-tide-academy-production.up.railway.app'
out=Path('outputs/outcome-motion')
def fetch(path):
 with urlopen(Request(site+path,headers={'Cache-Control':'no-cache'}),timeout=45) as r:return r.read()
assert json.loads(fetch('/healthz'))['ok']
assert fetch('/')==Path('dist/index.html').read_bytes()
paths=[p for p in Path('dist/assets').glob('*') if p.suffix in ['.js','.css']]+list(Path('dist/assets/outcome-motion-v1').glob('*'))
def verify(p):
 path='/'+p.relative_to('dist').as_posix();data=fetch(path);assert data==p.read_bytes(),path
 return {'path':path,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
with ThreadPoolExecutor(max_workers=4) as pool:assets=list(pool.map(verify,paths))
# Real production frontend/assets; all student APIs intercepted by synthetic fixtures.
helpers=(out/'browser-qa.py').read_text().rsplit('with sync_playwright() as pw:',1)[0]
ns={};exec(helpers,ns);ns['base']=site
with ns['sync_playwright']() as pw:
 b=pw.webkit.launch()
 for w,h in [(390,844),(820,1180)]:
  for mode in ['normal','defeat']:
   c,p,s=ns['setup'](b,mode,active=True,w=w,h=h)
   p.locator('.answer-grid button').nth(ns['data'][mode]['choice']).click()
   ns['expect'](p.locator('.result-panel')).to_be_hidden();ns['play_state'](p,'video')
   p.screenshot(path=str(out/f'production-{mode}-{w}.png'))
   ns['check'](f'Production {mode} Higgsfield video {w}',p.locator('.outcome-media').evaluate('(v)=>v.videoWidth>0&&v.currentTime>0'))
   ns['still'](p);ns['check'](f'Production {mode} ends once {w}',len(s['commands'])==1)
   if mode=='normal':
    ns['check'](f'Production continue visible {w}',ns['visible_cta'](p))
    p.locator('.victory-continue').evaluate('(e)=>{e.click();e.click()}')
    ns['expect'](p.locator('.challenge-preparation')).to_be_visible()
    ns['check'](f'Production continue starts once {w}',len(s['commands'])==2 and s['commands'][-1]['type']=='start')
   c.close()
 ns['FAULT']='legacy'
 for mode in ['normal','defeat']:
  c,p,s=ns['setup'](b,mode,w=820,h=1180)
  ns['still'](p);p.get_by_role('button',name='重播結算動畫').click();ns['play_state'](p,'frames')
  a=p.locator('.outcome-scene canvas').evaluate('(c)=>c.toDataURL()');p.wait_for_timeout(400);z=p.locator('.outcome-scene canvas').evaluate('(c)=>c.toDataURL()')
  ns['check']('Production legacy '+mode+' JPEG frames advance',a!=z)
  p.get_by_role('button',name='略過結算動畫').click();ns['still'](p);ns['check']('Production skip never awards '+mode,not s['commands']);c.close()
 b.close()
ns['check']('Production no JavaScript errors',not ns['errors'])
(Path('output/console-production')/'production-outcomes.json').write_text(json.dumps({'runtime':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'deployment':os.getenv('RELEASE_DEPLOYMENT'),'assets':assets,'checks':ns['checks'],'realStudentWrites':False,'physicalIpad15':False},ensure_ascii=False,indent=2))
print('PASS production',len(assets),'asset hashes',len(ns['checks']),'UI checks')
