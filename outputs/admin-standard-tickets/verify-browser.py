import asyncio,json,uuid
from pathlib import Path
from playwright.async_api import async_playwright,expect
out=Path('outputs/admin-standard-tickets');cfg=json.loads(Path('/tmp/star-tide-admin-standard-qa/access.json').read_text());base=cfg['base'];checks=[]
def check(name,ok=True):
 assert ok,name
 checks.append({'name':name,'pass':True});print('PASS',name,flush=True)
async def main():
 async with async_playwright() as p:
  for device in ['iPhone 13','iPad (gen 7)']:
   browser=await p.webkit.launch();ctx=await browser.new_context(**p.devices[device],reduced_motion='reduce');page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   async def roster():return (await (await page.request.get(base+'/api/admin/students')).json())['students']
   async def login(name):
    await page.goto(base+'/admin');await page.wait_for_load_state('networkidle');await page.get_by_label('管理員帳號',exact=True).fill(name);await page.get_by_label('密碼',exact=True).fill(cfg['password']);await page.get_by_role('button',name='登入管理艙',exact=True).tap();await expect(page.get_by_role('heading',name='學習與鼓勵')).to_be_visible()
   async def preview(amount,reason):
    await page.get_by_label('發放張數').fill(str(amount));await page.get_by_label('鼓勵原因',exact=True).fill(reason);await page.get_by_role('button',name='預覽發放',exact=True).tap();await expect(page.get_by_role('region',name='確認發放')).to_be_visible()
   try:
    await login(cfg['username']);before=await roster();target=before[0]
    normal=page.get_by_role('button',name='一般扭蛋券',exact=True);star=page.get_by_role('button',name='星耀券（高級）',exact=True)
    await expect(normal).to_have_attribute('aria-pressed','true');await expect(page.locator('.admin-grant-title')).to_contain_text('星願券');check(device+': ordinary tickets are clearly distinguished from premium stars')
    for w,h in ([(320,640),(390,844)] if device=='iPhone 13' else [(768,1024),(1024,768)]):
     await page.set_viewport_size({'width':w,'height':h});check(device+f': no horizontal overflow at {w}',await page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    await page.set_viewport_size(p.devices[device]['viewport']);await page.screenshot(path=str(out/(device+'-types.png')),full_page=True)
    await preview(2,'一般券本機測試');await expect(page.get_by_role('region',name='確認發放')).to_contain_text('2 張一般扭蛋券');await expect(normal).to_be_disabled();await expect(star).to_be_disabled();check(device+': preview freezes type and does not grant',await roster()==before)
    if device=='iPhone 13':
     async def lost_ack(route):
      r=await route.fetch();assert r.status==200;await route.abort('failed')
     await page.route('**/api/admin/tickets/grant',lost_ack);await page.get_by_role('button',name='確認發放',exact=True).tap();await expect(page.get_by_role('alert')).to_contain_text('尚未確認發放結果');await page.unroute('**/api/admin/tickets/grant',lost_ack)
    else:
     await ctx.set_offline(True);await page.get_by_role('button',name='確認發放',exact=True).tap();await expect(page.get_by_role('alert')).to_contain_text('尚未確認發放結果');await ctx.set_offline(False)
    await page.reload();await expect(page.get_by_role('region',name='確認發放')).to_contain_text('2 張一般扭蛋券');await expect(normal).to_have_attribute('aria-pressed','true');await page.get_by_role('button',name='核對並完成原發放').tap();await expect(page.get_by_role('status')).to_contain_text('2 張一般扭蛋券')
    if device=='iPhone 13':await expect(page.get_by_role('status')).to_contain_text('沒有重複發放')
    after=await roster();expected=[dict(x) for x in before];expected[0]['tickets']+=2;check(device+': reconnect and reload issue only ordinary balance exactly once',after==expected)
    await star.tap();await expect(page.locator('.admin-grant-title')).to_contain_text('高級券');await preview(1,'星耀券本機測試');await expect(page.get_by_role('region',name='確認發放')).to_contain_text('1 張星耀券');await page.get_by_role('button',name='確認發放',exact=True).tap();await expect(page.get_by_role('status')).to_contain_text('1 張星耀券');expected[0]['starTickets']+=1;check(device+': premium grant leaves ordinary balance and learning unchanged',await roster()==expected)
    await expect(page.locator('.admin-history')).to_contain_text('2 張一般扭蛋券');await expect(page.locator('.admin-history')).to_contain_text('1 張星耀券');check(device+': receipts identify both ticket types')
    # Simulate a pending request saved by the old UI, with no ticketType.
    auth=await (await page.request.get(base+'/api/admin/session')).json();legacy={'grantId':str(uuid.uuid4()),'username':target['username'],'amount':1,'reason':'舊版星耀待核對測試'}
    r=await page.request.post(base+'/api/admin/tickets/grant',data=legacy,headers={'Origin':base,'X-CSRF-Token':auth['csrf']});assert r.status==200;receipt=(await r.json())['receipt']
    await page.evaluate('([id,input,preview])=>sessionStorage.setItem("star-tide-admin-pending-grant-v2:"+id,JSON.stringify({owner:id,input,preview,attempted:true}))',[auth['id'],legacy,receipt]);await page.reload();await expect(star).to_have_attribute('aria-pressed','true');await expect(page.get_by_role('region',name='確認發放')).to_contain_text('1 張星耀券');await page.get_by_role('button',name='核對並完成原發放').tap();await expect(page.get_by_role('status')).to_contain_text('沒有重複發放');expected[0]['starTickets']+=1;check(device+': untyped legacy pending remains premium and replays without extra grant',await roster()==expected)
    await page.screenshot(path=str(out/(device+'-receipts.png')),full_page=True)
    await page.get_by_role('button',name='登出',exact=True).tap();await login('localstaff');await expect(normal).to_have_count(0);await expect(page.locator('.admin-grant-title')).to_contain_text('星耀券');check(device+': delegated star permission does not expose ordinary grants')
    check(device+': no JavaScript exceptions',not errors)
   finally:await ctx.close();await browser.close()
 (out/'browser-verification.json').write_text(json.dumps({'pass':True,'physicalDevice':False,'checks':checks},ensure_ascii=False,indent=2)+'\n')
asyncio.run(main())
