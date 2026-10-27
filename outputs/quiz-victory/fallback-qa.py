import json,os,copy
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('outputs/quiz-victory');data=json.loads((out/'fixtures.json').read_text());base=os.getenv('QA_URL','http://127.0.0.1:4334');checks=[];errors=[]
def check(name,ok=True):
 assert ok,name
 checks.append(name);print('PASS '+name,flush=True)
def setup(b,mode='normal',active=False,w=390,h=844,reduced=False,exhausted=False):
 c=b.new_context(viewport={'width':w,'height':h},has_touch=True,reduced_motion='reduce' if reduced else 'no-preference');p=c.new_page();p.set_default_timeout(10000);p.on('pageerror',lambda e:errors.append(str(e)))
 state={'value':copy.deepcopy(data[mode]['active' if active else 'won']),'commands':[]}
 def api(route):
  u=route.request.url
  if '/api/command' in u:
   cmd=route.request.post_data_json['command'];state['commands'].append(cmd);t=cmd['type']
   if t=='start' and exhausted:return route.fulfill(status=400,json={'error':'這個科目的題目已全部答對，請複習。'})
   if t=='answer':state['value']=copy.deepcopy(data[mode]['won'])
   elif t=='start':state['value']=copy.deepcopy(data[mode]['next'])
   elif t=='claim-reward':state['value']=copy.deepcopy(data[mode]['saved'])
   elif t=='review-start':state['value']['result']=False
   return route.fulfill(json=state['value'])
  value={'invitations':[],'rooms':[],'players':[]} if '/api/battle' in u else {'revision':0,'history':[],'available':False} if '/api/companion-talk' in u else state['value']
  route.fulfill(json=value)
 p.route('**/api/**',api);p.goto(base,wait_until='networkidle')
 p.get_by_role('button',name='領取獎勵' if mode=='pending' else '繼續挑戰' if active else '查看上次挑戰',exact=False).first.click()
 return c,p,state
def visible_cta(p):
 expect(p.locator('.victory-continue')).to_be_visible();p.wait_for_timeout(250)
 assert p.locator('.result-panel').evaluate('(e)=>e.getBoundingClientRect().top < document.querySelector(".quiz-encounter").getBoundingClientRect().top'),'Victory must precede capture/growth'
 return p.locator('.victory-continue').evaluate('(e)=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}')
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='chrome',headless=True)
  c,p,s=setup(b,mode='ruby',exhausted=True)
  p.locator('.victory-secondary').get_by_role('button',name='換個科目').click()
  p.get_by_role('dialog').get_by_role('button',name='開始詞語',exact=True).click()
  expect(p.get_by_role('dialog')).to_have_count(0)
  expect(p.get_by_role('button',name='開始複習',exact=True)).to_be_visible()
  p.get_by_role('button',name='確認同步',exact=False).click()
  p.get_by_role('button',name='開始複習',exact=True).click()
  check(engine+' other-course fallback visible and actionable',s['commands'][-1]['type']=='review-start' and s['commands'][-1]['course']=='words')
  c.close();b.close()
(out/'fallback-results.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
