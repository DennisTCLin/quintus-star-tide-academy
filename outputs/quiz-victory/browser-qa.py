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
  for w,h in [(320,568),(390,844),(820,1180),(1194,834)]:
   c,p,s=setup(b,w=w,h=h);check(f'{engine} reload victory CTA within viewport {w}',visible_cta(p));check(f'{engine} no overflow {w}',p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   p.screenshot(path=str(out/f'{engine}-{w}.png'));p.locator('.victory-continue').evaluate('(e)=>{e.click();e.click()}');expect(p.locator('.challenge-preparation')).to_be_visible();check(f'{engine} double click starts once {w}',len(s['commands'])==1 and s['commands'][0]['course']=='math' and not s['commands'][0]['practice']);c.close()
  for mode in ['normal','wrong-last']:
   c,p,s=setup(b,mode,active=True);p.locator('.answer-grid button').nth(data[mode]['choice']).click();expect(p.locator('.result-panel')).to_be_hidden();expect(p.locator('.victory-continue')).to_be_visible(timeout=12000);check(engine+' final '+mode+' waits for animation then shows victory',visible_cta(p));c.close()
  c,p,s=setup(b,active=True,reduced=True);p.locator('.answer-grid button').nth(data['normal']['choice']).click();expect(p.locator('.victory-continue')).to_be_visible(timeout=2500);check(engine+' reduced motion completes promptly');c.close()
  for mode in ['practice','old','pending','ruby']:
   c,p,s=setup(b,mode);expect(p.locator('.victory-continue')).to_be_visible()
   if mode=='pending':
    expect(p.locator('.victory-continue')).to_be_disabled();p.get_by_role('button',name='存一顆星',exact=False).click();expect(p.locator('.victory-continue')).to_be_enabled();check(engine+' legacy reward saves before continuation',len(s['commands'])==1 and s['commands'][0]['type']=='claim-reward')
   if mode=='ruby':
    check(engine+' grade-two CTA fits',visible_cta(p));p.screenshot(path=str(out/(engine+'-ruby.png')))
   if mode=='old':expect(p.locator('.victory-reward')).to_contain_text('先前')
   if mode=='practice':expect(p.locator('.victory-reward')).to_contain_text('練習')
   p.locator('.victory-continue').click();expect(p.locator('.challenge-preparation')).to_be_visible();check(engine+' preserves mode '+mode,s['commands'][-1]['practice']==(mode=='practice'));c.close()
  c,p,s=setup(b,exhausted=True);p.locator('.victory-continue').click();expect(p.locator('.victory-continue')).to_contain_text('複習');p.get_by_role('button',name='確認同步',exact=False).click();expect(p.locator('.victory-continue')).to_be_enabled();p.locator('.victory-continue').click();check(engine+' exhausted pool offers review',s['commands'][-1]['type']=='review-start');c.close()
  c,p,s=setup(b,mode='ruby',exhausted=True);p.locator('.victory-secondary').get_by_role('button',name='換個科目').click();p.get_by_role('dialog').get_by_role('button',name='開始詞語',exact=True).click();expect(p.get_by_role('dialog')).to_have_count(0);expect(p.get_by_role('button',name='開始複習',exact=True)).to_be_visible();p.get_by_role('button',name='確認同步',exact=False).click();p.get_by_role('button',name='開始複習',exact=True).click();check(engine+' returning home retains other course review fallback',s['commands'][-1]['type']=='review-start' and s['commands'][-1]['course']!='math');c.close()
  c,p,s=setup(b);p.evaluate("window.dispatchEvent(new Event('offline'))");expect(p.locator('.victory-continue')).to_be_disabled();expect(p.locator('.victory-next-hint')).to_contain_text('連線恢復');p.evaluate("window.dispatchEvent(new Event('online'))");expect(p.locator('.victory-continue')).to_be_enabled();check(engine+' offline and recovery preserve victory');c.close()
  b.close()
check('No JavaScript errors',not errors)
(out/'browser-results.json').write_text(json.dumps({'url':base,'checks':checks,'errors':errors,'realDevice':False},ensure_ascii=False,indent=2))
