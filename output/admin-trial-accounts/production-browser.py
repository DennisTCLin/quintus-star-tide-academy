"""Published frontend visual smoke with synthetic admin API; never submits a creation to production."""
import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base='https://quintus-star-tide-academy-production.up.railway.app';rows=[]
with sync_playwright() as pw:
 for engine in ['chromium','webkit']:
  b=getattr(pw,engine).launch();p=b.new_page();p.goto(base+'/admin');p.get_by_label('管理員帳號',exact=True).wait_for(timeout=30000);rows.append({'engine':engine,'check':'actual anonymous login portal','pass':True});p.close()
  for role in ['super_admin','staff']:
   c=b.new_context(viewport={'width':1024,'height':900},has_touch=True);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   def api(route):
    assert route.request.method=='GET','Production smoke must not create accounts'
    path=route.request.url.split('/api/admin/')[1]
    if path=='session':data={'id':'00000000-0000-4000-8000-000000000001','username':'synthetic_preview','displayName':'Preview reviewer','role':role,'enabled':True,'canGrant':role=='super_admin','scope':'all','memberIds':[],'grantLimit':100,'mustChangePassword':False,'version':0,'csrf':'synthetic-only'}
    elif path=='students':data={'students':[],'updatedAt':'2026-10-27T00:00:00Z'}
    elif path=='presence':data={'serverNow':int(time.time()*1000),'students':[]}
    elif path=='grants':data={'receipts':[]}
    elif path=='trials':data={'trials':[],'grades':[{'grade':g,'label':str(g)} for g in [1,2,4,5,6]]}
    else:raise AssertionError(path)
    route.fulfill(json=data)
   p.route('**/api/admin/**',api);p.goto(base+'/admin');nav=p.get_by_role('navigation',name='管理功能');nav.wait_for(timeout=30000)
   if role=='super_admin':
    nav.get_by_role('button',name='試用帳號',exact=True).click();p.get_by_role('heading',name='建立試用帳號',exact=True).wait_for();expect(p.get_by_label('星幣',exact=True)).to_have_value('5000');expect(p.get_by_label('星願券',exact=True)).to_have_value('20');expect(p.get_by_label('星耀特邀券',exact=True)).to_have_value('5')
    for width in [393,768,1024]:p.set_viewport_size({'width':width,'height':900});p.wait_for_timeout(100);assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
   else:expect(nav.get_by_role('button',name='試用帳號',exact=True)).to_have_count(0)
   assert not errors,errors;rows.append({'engine':engine,'role':role,'check':'published UI gate and form defaults','syntheticAdminApi':True,'pass':True});c.close()
  b.close()
Path('output/admin-trial-accounts/production-browser.json').write_text(json.dumps({'checks':rows,'productionCreates':0,'physicalIPadTested':False},indent=2)+'\n');print('PASS',len(rows),'published UI smoke checks; no production account creation')
