import asyncio,json,uuid
from pathlib import Path
from playwright.async_api import async_playwright,expect
out=Path('outputs/admin-live-learning');cfg=json.loads(Path('/tmp/star-tide-admin-live-qa/access.json').read_text());base=cfg['base'];checks=[]
def check(name,ok=True):
 assert ok,name
 checks.append({'name':name,'pass':True});print('PASS',name,flush=True)
async def main():
 async with async_playwright() as p:
  for device in ['iPhone 13','iPad (gen 7)']:
   browser=await p.webkit.launch();ctx=await browser.new_context(**p.devices[device],reduced_motion='reduce');page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   child=await p.request.new_context(base_url=base,extra_http_headers={'Origin':base})
   r=await child.post('/api/login',data={'username':'report_one','password':'2840'});assert r.status==200;auth=await r.json();tab=str(uuid.uuid4());sequence=0
   async def beat(active):
    nonlocal sequence
    sequence+=1;r=await child.post('/api/presence',data={'clientId':tab,'sequence':sequence,'active':active,'player':'quintus','activity':'learning'},headers={'X-CSRF-Token':auth['csrf']});assert r.status==200
   async def login(name):
    await page.goto(base+'/admin');await page.get_by_label('管理員帳號',exact=True).fill(name);await page.get_by_label('密碼',exact=True).fill(cfg['password']);await page.get_by_role('button',name='登入管理艙',exact=True).tap();await expect(page.get_by_role('heading',name='學習與鼓勵')).to_be_visible()
   one=page.locator('.admin-student').filter(has_text='report_one');two=page.locator('.admin-student').filter(has_text='report_two')
   async def select_one():await one.tap();await expect(page.get_by_role('button',name='數學能力值 18，穩定航行',exact=True)).to_be_visible()
   try:
    await beat(True);await login(cfg['username']);await expect(one).to_contain_text('在線 · 正在答題冒險');await expect(two).to_contain_text('離線');check(device+': live presence separates same-grade children')
    await select_one();await page.get_by_role('button',name='數學能力值 18，穩定航行',exact=True).tap();await expect(page.locator('.admin-radar-detail')).to_contain_text('84 精熟點 · 7 次獨立答對');check(device+': radar uses canonical main-site growth and readable subject values')
    for w,h in ([(320,640),(390,844)] if device=='iPhone 13' else [(768,1024),(1024,768)]):
     await page.set_viewport_size({'width':w,'height':h});check(device+f': learning page has no horizontal overflow at {w}',await page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    await page.set_viewport_size(p.devices[device]['viewport']);await page.screenshot(path=str(out/(device+'-learning.png')),full_page=True)
    await beat(False);await expect(one).to_contain_text('離線',timeout=10000);check(device+': inactive child becomes offline automatically')
    await ctx.set_offline(True);await expect(one).to_contain_text('狀態待確認');await expect(page.locator('.admin-live-summary')).to_contain_text('正在確認');await beat(True);await ctx.set_offline(False);await expect(one).to_contain_text('在線 · 正在答題冒險',timeout=10000);check(device+': offline admin shows unknown and recovers live state after reconnect')
    await page.get_by_role('button',name='查看這位孩子的家長艙').tap();parent=page.get_by_role('region',name='所選孩子的家長艙');await expect(parent).to_contain_text('測試航海員一（report_one）');await expect(parent).to_contain_text('第一位專屬鼓勵');await expect(parent).not_to_contain_text('第二位專屬鼓勵');await expect(parent).to_contain_text('+2 張一般扭蛋券');await expect(parent).to_contain_text('最近雲端存檔');await expect(page.get_by_role('button',name='預覽發放',exact=True)).to_have_count(0);check(device+': parent view is selected-child-only, read-only, with collection/cloud/typed receipts')
    for w,h in ([(320,640),(390,844)] if device=='iPhone 13' else [(768,1024),(1024,768)]):
     await page.set_viewport_size({'width':w,'height':h});check(device+f': parent page has no horizontal overflow at {w}',await page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    await page.set_viewport_size(p.devices[device]['viewport']);await page.screenshot(path=str(out/(device+'-parent.png')),full_page=True)
    # Delay the second child's response, then change selection before it arrives.
    async def delayed(route):
     response=await route.fetch();await asyncio.sleep(1.5)
     try:await route.fulfill(response=response)
     except Exception:pass
    await page.route('**/api/admin/parent/'+cfg['children'][1]['memberId'],delayed)
    await two.tap();await expect(parent).not_to_contain_text('測試航海員一（report_one）');await one.tap();await expect(parent).to_contain_text('測試航海員一（report_one）');await asyncio.sleep(1.8);await expect(parent).not_to_contain_text('第二位專屬鼓勵');await page.unroute('**/api/admin/parent/'+cfg['children'][1]['memberId'],delayed);check(device+': delayed old child response cannot replace selected parent report')
    await two.tap();await expect(parent).to_contain_text('測試航海員二（report_two）');await expect(parent).to_contain_text('+3 張星耀券');await expect(parent).not_to_contain_text('第一位專屬鼓勵');await expect(page.get_by_role('button',name='數學能力值 12，航線點亮')).to_be_visible();check(device+': switching children changes radar and parent records together')
    # A valid 200-character reason and 32-character account must wrap on small screens.
    async def long_text(route):
     response=await route.fetch();data=await response.json();data['username']='u'*32;data['grants'][0]['reason']='Q'*200;await route.fulfill(response=response,json=data)
    await page.route('**/api/admin/parent/*',long_text);await page.get_by_role('button',name='重新整理',exact=True).tap();await expect(parent).to_contain_text('Q'*200)
    await page.set_viewport_size({'width':320,'height':640});check(device+': maximum-length parent grant reason and account wrap at 320',await page.evaluate('document.documentElement.scrollWidth<=innerWidth') and await parent.evaluate('(el)=>el.scrollWidth<=el.clientWidth'))
    await page.set_viewport_size(p.devices[device]['viewport']);await page.unroute('**/api/admin/parent/*');await page.get_by_role('button',name='重新整理',exact=True).tap();await expect(parent).to_contain_text('測試航海員二（report_two）')
    # A failed parent refresh retains the same child's last valid report and offers recovery.
    await page.route('**/api/admin/parent/*',lambda route:route.fulfill(status=503,content_type='application/json',body='{"error":"Synthetic unavailable"}'))
    await page.get_by_role('button',name='重新整理',exact=True).tap();await expect(parent.get_by_role('alert')).to_contain_text('Synthetic unavailable');await expect(parent).to_contain_text('測試航海員二（report_two）');await page.unroute('**/api/admin/parent/*');await parent.get_by_role('button',name='重新讀取家長艙').tap();await expect(parent.get_by_role('alert')).to_have_count(0);check(device+': unavailable parent report recovers without changing selected child')
    await page.get_by_role('button',name='登出',exact=True).tap();await login('localstaff');await expect(page.locator('.admin-student')).to_have_count(1);await expect(one).to_be_visible();await expect(page.get_by_role('button',name='家長艙',exact=True)).to_have_count(0);await expect(page.get_by_role('button',name='查看這位孩子的家長艙')).to_have_count(0);r=await page.request.get(base+'/api/admin/parent/'+cfg['children'][0]['memberId']);check(device+': delegated reader sees only assigned radar/presence and cannot open parent report',r.status==403)
    check(device+': no JavaScript exceptions',not errors)
   finally:await beat(False);await child.dispose();await ctx.close();await browser.close()
 (out/'browser-verification.json').write_text(json.dumps({'pass':True,'physicalDevice':False,'engine':'WebKit','checks':checks},ensure_ascii=False,indent=2)+'\n')
asyncio.run(main())
