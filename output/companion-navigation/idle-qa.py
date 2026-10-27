import asyncio,json,time
from pathlib import Path
from collections import defaultdict
from playwright.async_api import async_playwright
async def main():
 f=next(x for x in json.loads(Path('/tmp/star-tide-navigation-private/accounts.json').read_text()) if x['username']=='nav_qa_1')
 async with async_playwright() as p:
  async def run(port,label):
   b=await p.chromium.launch(channel='chrome',headless=True);c=await b.new_context(viewport={'width':375,'height':667});page=await c.new_page();await page.goto('http://localhost:'+str(port));await page.get_by_placeholder('英文字母、數字或底線').fill(f['username']);await page.get_by_placeholder('請輸入密碼').fill(f['password']);await page.get_by_role('button',name='登入，繼續冒險 →').click();await page.locator('.family-nav').wait_for();await page.wait_for_timeout(500)
   records=[];pending=set()
   async def capture(req):
    if '/api/' in req.url:
     try:records.append({'path':req.url.split('/api/')[1],'method':req.method,**await req.sizes()})
     except Exception:pass
   def listener(req):
    t=asyncio.create_task(capture(req));pending.add(t);t.add_done_callback(pending.discard)
   page.on('requestfinished',listener);start=time.monotonic();await page.wait_for_timeout(300000);duration=time.monotonic()-start;page.remove_listener('requestfinished',listener)
   if pending:await asyncio.gather(*list(pending))
   grouped=defaultdict(lambda:{'requests':0,'responseBodyBytes':0,'responseHeaderBytes':0})
   for r in records:
    q=grouped[r['path'].split('?')[0]];q['requests']+=1;q['responseBodyBytes']+=r['responseBodySize'];q['responseHeaderBytes']+=r['responseHeadersSize']
   result={'label':label,'seconds':round(duration,2),'visibility':await page.evaluate('document.visibilityState'),'api':dict(grouped),'totalResponseBodyBytes':sum(r['responseBodySize'] for r in records)};await b.close();return result
  result=await asyncio.gather(run(4387,'main-49bf714'),run(4386,'companion-navigation-clearance'))
  Path('output/companion-navigation/idle-results.json').write_text(json.dumps(result,indent=2));print('PASS 300-second baseline and changed harbor traffic measured')
asyncio.run(main())
