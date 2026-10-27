import json,time,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base='http://127.0.0.1:47888';out=Path('output/admin-trial-accounts');(out/'browser').mkdir(exist_ok=True);rows=[]
def login(p,user='trial_super_qa'):
 p.goto(base+'/admin');p.get_by_label('管理員帳號',exact=True).fill(user);p.get_by_label('密碼',exact=True).fill('Synthetic-admin-trial-2026');p.get_by_role('button',name='登入管理艙',exact=True).click();p.get_by_role('navigation',name='管理功能').wait_for()
def trials(p):p.get_by_role('navigation',name='管理功能').get_by_role('button',name='試用帳號',exact=True).click();p.get_by_role('heading',name='建立試用帳號',exact=True).wait_for()
with sync_playwright() as pw:
 for engine in ['chromium','webkit']:
  b=getattr(pw,engine).launch();c=b.new_context(viewport={'width':1024,'height':900},has_touch=True);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));login(p);trials(p)
  expect(p.locator('select option[value="3"]')).to_be_disabled();expect(p.get_by_label('星幣',exact=True)).to_have_value('5000');expect(p.get_by_label('星願券',exact=True)).to_have_value('20');expect(p.get_by_label('星耀特邀券',exact=True)).to_have_value('5')
  for width in [393,768,1024]:
   p.set_viewport_size({'width':width,'height':900});p.wait_for_timeout(100);assert p.evaluate('document.documentElement.scrollWidth<=innerWidth'),(engine,width)
   assert all(x.bounding_box()['height']>=44 for x in p.locator('.admin-trial-form button').all())
   p.screenshot(path=str(out/'browser'/f'{engine}-form-{width}.png'),full_page=True)
  p.set_viewport_size({'width':1024,'height':900});name=f'qa_trial_{engine[0]}_{int(time.time())}';p.get_by_label('登入帳號',exact=True).fill(name);p.get_by_label('四位數字密碼',exact=True).fill('0056');p.get_by_role('button',name='建立試用帳號',exact=True).click();p.get_by_role('region',name='試用帳號建立完成').wait_for(timeout=30000);expect(p.locator('.admin-trial-result')).to_contain_text(name);expect(p.locator('.admin-trial-result')).to_contain_text('0056')
  student=c.request.post(base+'/api/login',data={'username':name,'password':'0056'},headers={'Origin':base});assert student.status==200;d=student.json();profile=d['family']['profiles'][d['playerId']];assert profile['coins']==5000 and profile['tickets']==20 and profile['starTickets']==5 and profile['run']['encounter']['variant'].startswith('wave4-');assert profile['onboarding']['confirmed'];rows.append({'engine':engine,'case':'actual create + child login + resources + prepared boss','pass':True})
  # A definite duplicate must allow correcting the form, not permanently freeze it.
  p.get_by_role('button',name='再建立一個',exact=True).click();p.get_by_label('登入帳號',exact=True).fill(name);p.get_by_role('button',name='建立試用帳號',exact=True).click();expect(p.get_by_role('alert')).to_contain_text('已存在');expect(p.get_by_label('登入帳號',exact=True)).to_be_enabled();rows.append({'engine':engine,'case':'duplicate can be corrected without overwrite','pass':True})
  # Server commits, then the browser loses the response. Reload must reconcile, not create again.
  lost=name+'_lost';p.get_by_label('登入帳號',exact=True).fill(lost);p.get_by_label('四位數字密碼',exact=True).fill('0078')
  def lose(route):
   response=route.fetch();assert response.status==200,response.text();route.abort()
  p.route('**/api/admin/trials/create',lose,times=1);p.get_by_role('button',name='建立試用帳號',exact=True).click();p.get_by_role('button',name='核對建立結果',exact=True).wait_for();expect(p.get_by_role('button',name='核對建立結果',exact=True)).to_be_enabled(timeout=30000)
  saved=p.evaluate("Object.entries(sessionStorage).filter(([k])=>k.startsWith('star-tide-admin-trial-pending'))");assert len(saved)==1;s=json.loads(saved[0][1]);assert 'password' not in s['config'] and set(s)=={'requestId','config'}
  p.reload();trials(p);expect(p.get_by_label('四位數字密碼',exact=True)).to_have_value('');p.get_by_role('button',name='核對建立結果',exact=True).click();p.get_by_role('region',name='試用帳號建立完成').wait_for();expect(p.locator('.admin-trial-result')).to_contain_text(lost);assert not p.evaluate("Object.keys(sessionStorage).some(k=>k.startsWith('star-tide-admin-trial-pending'))")
  rows.append({'engine':engine,'case':'committed response loss + reload reconciliation; no password storage','pass':True})
  assert not errors,errors;c.close()
  c=b.new_context(viewport={'width':393,'height':852});p=c.new_page();login(p,'trial_staff_qa');expect(p.get_by_role('navigation',name='管理功能').get_by_role('button',name='試用帳號',exact=True)).to_have_count(0);rows.append({'engine':engine,'case':'staff has no trial creation entry','pass':True});c.close();b.close()
(out/'browser-results.json').write_text(json.dumps({'checks':rows,'count':len(rows),'database':'isolated local PostgreSQL','realApi':True},ensure_ascii=False,indent=2)+'\n');print('PASS',len(rows),'actual admin UI checks; both engines and three widths')
