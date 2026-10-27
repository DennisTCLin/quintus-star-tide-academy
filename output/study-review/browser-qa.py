"""Real isolated PostgreSQL/API, WebKit phone and tablet. No production accounts."""
from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import json
OUT=Path('output/study-review');cfg=json.loads(Path('/tmp/study-review-qa.json').read_text());checks=[];errors=[];offline_diagnostics=[]
def check(name, condition=True):
 assert condition,name
 checks.append({'name':name,'passed':True});print('PASS',name,flush=True)
def state(page): return page.request.get(cfg['base']+'/api/state').json()
def session(page,player='quintus'): return state(page)['family']['profiles'][player]['learning']['study']['session']
def login(page,name):
 page.goto(cfg['base']);page.wait_for_load_state('networkidle')
 page.locator('input[autocomplete=username]').fill(name);page.locator('input[type=password]').fill(cfg['password']);page.get_by_role('button',name='登入，繼續冒險 →',exact=True).click()
 expect(page.locator('.study-entry')).to_be_visible(timeout=20000)
def resume(page): page.locator('.study-entry').get_by_role('button',name='接續複習',exact=False).click();expect(page.locator('.study-session')).to_be_visible()
def select(page,wrong=False,player='quintus'):
 s=state(page);q=s['studyQuestions'][player];answer=cfg['answers'][q['id']];choice=(answer+1)%len(q['options']) if wrong else answer
 page.locator('.study-session [data-answer-option]').nth(choice).click();expect(page.locator('.study-session .answer-explanation')).to_be_visible()
 return q
with sync_playwright() as pw:
 browser=pw.webkit.launch()
 phone=browser.new_context(**pw.devices['iPhone 13']);tablet=browser.new_context(**pw.devices['iPad (gen 7)']);small=browser.new_context(viewport={'width':320,'height':568},is_mobile=True,has_touch=True)
 p=phone.new_page();t=tablet.new_page();g=small.new_page()
 for page in [p,t,g]: page.on('pageerror',lambda e: (offline_diagnostics if '/api/state due to access control checks.' in str(e) else errors).append(str(e)))
 try:
  login(p,cfg['names'][0]);baseline=state(p)['family']['profiles']['quintus'];p.get_by_role('button',name='自由複習',exact=True).click();expect(p.locator('.study-session')).to_be_visible()
  check('Grade four review has no audio buttons',p.locator('.study-session [data-read-aloud]').count()==0)
  original=session(p)['questions'][0];select(p,True);check('Wrong answer shows full explanation and waits for explicit next',session(p)['index']==0)
  p.screenshot(path=str(OUT/'phone-explanation.png'),full_page=True)
  p.get_by_role('button',name='看懂了，下一題',exact=True).click();expect(p.locator('.study-eyebrow')).to_contain_text('2 / 6');current=session(p)['questions'][1]
  p.reload();expect(p.locator('.study-entry')).to_be_visible();resume(p);check('Reload resumes same current question',session(p)['questions'][1]==current)
  login(t,cfg['names'][0]);resume(t);check('Independent tablet resumes same cloud session',session(t)['id']==session(p)['id'])
  select(t);t.get_by_role('button',name='看懂了，下一題',exact=True).click();expect(t.locator('.study-eyebrow')).to_contain_text('3 / 6')
  p.reload();expect(p.locator('.study-entry')).to_be_visible();resume(p);check('Phone receives tablet progress',session(p)['index']==2)
  select(p);p.get_by_role('button',name='看懂了，下一題',exact=True).click();expect(p.locator('.study-eyebrow')).to_contain_text('4 / 6')
  check('Original retry follows two answered intervening questions',session(p)['questions'][3]==original)
  expect(p.locator('.study-eyebrow')).to_contain_text('原題重試')
  for i in range(3,6):
   select(p)
   if i<5:p.get_by_role('button',name='看懂了，下一題',exact=True).click();expect(p.locator('.study-eyebrow')).to_contain_text(f'{i+2} / 6')
  expect(p.get_by_role('heading',name='這組完成了')).to_be_visible();after=state(p)['family']['profiles']['quintus']
  check('Review preserves all original reward and profile fields',{k:v for k,v in baseline.items() if k!='learning'}=={k:v for k,v in after.items() if k!='learning'})
  p.get_by_role('button',name='再練一組',exact=True).click();expect(p.locator('.study-eyebrow')).to_contain_text('1 / 6');newid=session(p)['id']
  check('Continue creates another group',newid!=after['learning']['study']['session']['id'])
  p.get_by_role('button',name='先休息，保留這組',exact=True).click();expect(p.locator('.study-entry')).to_be_visible();resume(p);check('Pause preserves session identity',session(p)['id']==newid)
  phone.set_offline(True);expect(p.locator('.study-session [data-answer-option]').first).to_be_disabled();check('Offline disables answers');phone.set_offline(False)
  expect(p.locator('.study-session [data-answer-option]').first).to_be_enabled(timeout=20000)
  p.get_by_role('button',name='先休息，保留這組',exact=True).click();expect(p.locator('.study-entry')).to_be_visible();p.get_by_role('button',name='結束這組，重新選擇',exact=True).click();expect(p.get_by_role('button',name='自由複習',exact=True)).to_be_visible();check('Home can end a saved group without losing learning')
  p.get_by_role('button',name='家長',exact=True).click();expect(p.locator('.study-summary')).to_be_visible();check('Child scoped parent summary is shown',p.locator('.study-summary').count()==1)
  login(g,cfg['names'][1]);g.get_by_role('button',name='自由複習',exact=True).click();expect(g.locator('.study-session')).to_be_visible()
  check('Grade one offers listening',g.locator('.study-session [data-read-aloud]').count()==1)
  expect(g.locator('.study-session [data-answer-option]').first).to_be_disabled();g.locator('.study-session [data-read-aloud]').click();expect(g.locator('.study-session [data-answer-option]').first).to_be_enabled(timeout=30000);check('Recorded audio finishes before grade one choices unlock')
  select(g,player='qingqing');g.get_by_role('button',name='看懂了，下一題',exact=True).scroll_into_view_if_needed();check('320px phone scrolls to next action',g.evaluate('scrollY')>0)
  check('No horizontal page overflow',g.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  g.screenshot(path=str(OUT/'grade1-small-phone.png'),full_page=True)
  # Exhausted pool shows a usable route into review instead of an empty challenge.
  e=browser.new_page(viewport={'width':390,'height':844});login(e,cfg['names'][2])
  e.get_by_role('button',name='從群島開始數學',exact=True).click();expect(e.get_by_role('button',name='開始複習',exact=True)).to_be_visible(timeout=20000)
  e.get_by_role('button',name='開始複習',exact=True).click();expect(e.locator('.study-session [data-answer-option]').first).to_be_enabled();check('Exhausted bank offers real review questions')
  e.screenshot(path=str(OUT/'exhausted-review.png'),full_page=True)
  admin=browser.new_page(viewport={'width':390,'height':844});admin.goto(cfg['base']+'/admin');admin.wait_for_load_state('networkidle')
  admin.get_by_label('管理員帳號',exact=True).fill('review_admin_qa');admin.get_by_label('密碼',exact=True).fill('isolated-review-admin-2026');admin.get_by_role('button',name='登入管理艙',exact=True).click()
  expect(admin.locator('.admin-student').first).to_be_visible();admin.locator('.admin-student').filter(has_text=cfg['names'][0]).click();admin.get_by_role('button',name='查看這位孩子的家長艙').click()
  expect(admin.locator('.admin-parent .study-summary')).to_be_visible();expect(admin.locator('.admin-parent .study-summary')).to_contain_text('跨日再次答對')
  check('Super admin sees selected child review summary',admin.locator('.admin-parent .study-summary').count()==1)
  admin.locator('.admin-parent .study-summary').scroll_into_view_if_needed();check('Admin summary fits phone width',admin.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  admin.screenshot(path=str(OUT/'admin-summary-phone.png'),full_page=True)
  check('No unexpected browser runtime errors',not errors)
 finally:
  (OUT/'browser-verification.json').write_text(json.dumps({'checks':checks,'errors':errors,'expectedOfflineDiagnostics':offline_diagnostics,'passed':len(checks)>=20 and not errors},ensure_ascii=False,indent=2)+'\n')
  browser.close()
