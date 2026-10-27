from playwright.sync_api import sync_playwright
import time
url='http://127.0.0.1:4197'
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);c=b.new_context();a=c.new_page();other=c.new_page();password='boundary-test-passphrase-2026'
 a.goto(url);a.wait_for_load_state('networkidle')
 reg=c.request.post(url+'/api/register',headers={'Origin':url},data={'username':'bound_a_'+str(int(time.time())),'password':password});assert reg.status==200
 a.reload();a.locator('.profile-card').first.wait_for();a.get_by_role('button',name='選擇Quintus，4年級').click();a.locator('.family-nav button').nth(6).click()
 a.get_by_label('確認目前密碼').fill(password);a.get_by_role('button',name='產生新的復原碼').click();a.locator('.recovery-code').wait_for();oldcode=a.locator('.recovery-code').inner_text()
 a.get_by_label('確認目前密碼').fill(password)
 def lost(route):
  route.fetch();route.abort()
 a.route('**/api/recovery-code',lost);a.get_by_role('button',name='產生新的復原碼').click();a.get_by_text('連線中斷，復原碼可能已更新。請再次產生新的復原碼，舊碼請勿使用。',exact=True).wait_for();assert oldcode not in a.locator('body').inner_text();a.unroute('**/api/recovery-code',lost)
 a.get_by_role('button',name='產生新的復原碼').click();a.locator('.recovery-code').wait_for();secret=a.locator('.recovery-code').inner_text();a.get_by_label('確認目前密碼').fill(password)
 # Same browser cookie jar, account switch performed from another tab.
 other.goto(url);state=c.request.get(url+'/api/state').json();r=c.request.post(url+'/api/logout',headers={'Origin':url,'X-CSRF-Token':state['csrf']},data={});assert r.status==200
 newname='bound_b_'+str(int(time.time()));r=c.request.post(url+'/api/register',headers={'Origin':url},data={'username':newname,'password':password});assert r.status==200
 a.bring_to_front();a.locator('.profile-card').first.wait_for(timeout=12000)
 assert secret not in a.locator('body').inner_text();assert a.get_by_label('確認目前密碼').count()==0
 assert newname in a.locator('.cloud-status').inner_text()
 print('PASS: uncertain rotation hides obsolete code; cross-tab account switch unmounts all prior private UI')
 b.close()
