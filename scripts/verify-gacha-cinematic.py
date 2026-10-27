"""Browser presentation contract. API fixtures never modify a learner's account."""
import asyncio, copy, json, os, subprocess
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.getenv('GACHA_QA_OUT',str(ROOT/'outputs/gacha-cinematic'))); OUT.mkdir(parents=True,exist_ok=True)
URL=os.getenv('GACHA_QA_URL','http://127.0.0.1:4199')
family=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{newFamily}from'./build/game.mjs';console.log(JSON.stringify(newFamily()))"],cwd=ROOT))
report={'url':URL,'cases':[],'pageErrors':[]}
observer="""window.gachaPhases=[];new MutationObserver(()=>{const e=document.querySelector('.gacha-machine');const phase=e?.dataset.phase;if(phase&&window.gachaPhases.at(-1)?.phase!==phase)window.gachaPhases.push({phase,ms:performance.now()});}).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['data-phase']});"""
async def plain(locator):
 return await locator.evaluate('(e)=>{const c=e.cloneNode(true);c.querySelectorAll("rt").forEach(x=>x.remove());return c.textContent}')

async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(channel='chrome',headless=True)
  async def scenario(name,width=390,player='quintus',delay=0,failure=False,reduced=False,action='normal',broken=False,height=900):
   ctx=await browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce' if reduced else 'no-preference')
   await ctx.add_init_script(observer)
   page=await ctx.new_page();page.set_default_timeout(12000)
   page.on('pageerror',lambda e:report['pageErrors'].append({'case':name,'error':str(e)}))
   state={'family':copy.deepcopy(family),'questions':{},'username':'gacha-cinematic-qa','playerId':player,'displayName':'QA','csrf':'fixture','day':family['profiles'][player]['day'],'verified':{'quintus':0,'feifei':0,'qingqing':0,'doudou':0},'legacy':False,'canMigrate':False}
   pr=state['family']['profiles'][player];pr['tickets']=0 if action=='zero' else 3
   calls=[]
   async def route(r):
    if r.request.url.endswith(('/api/presence','/api/friends')):
     await r.fulfill(json={'serverNow':0,'friends':[]});return
    if r.request.method=='POST':
     body=r.request.post_data_json;calls.append({'id':body['id'],'command':body['command']['type']})
     if failure:
      await r.fulfill(status=503,json={'error':'QA simulated unavailable'});return
     pr['tickets']-=1;pr['draws']+=1;pr['owned']['covegecko']=pr['owned'].get('covegecko',0)+1
     receipt={'id':body['id'],'pet':'covegecko','duplicate':pr['owned']['covegecko']>1,'copies':pr['owned']['covegecko']}
     pr['lastDraw']=receipt;state['family']['revision']+=1
     result={'kind':'pet','pet':'covegecko','receiptId':receipt['id'],'copies':receipt['copies'],'duplicate':receipt['duplicate'],'amount':0,'guaranteed':True}
     if action=='interleaved':
      pr['lastDraw']={'id':'other-device-Y','pet':'pebblefin','duplicate':False,'copies':1};pr['owned']['pebblefin']=1
     if delay:await asyncio.sleep(delay)
     await r.fulfill(json={**state,'result':result})
    else:await r.fulfill(json=state)
   await page.route('**/api/**',route)
   if broken:await page.route('**/assets/gacha/**',lambda r:r.abort())
   async def nav(text):
    await page.locator('.family-nav').wait_for()
    labels=await page.locator('.family-nav button').evaluate_all('(es)=>es.map(e=>{const c=e.cloneNode(true);c.querySelectorAll("rt").forEach(x=>x.remove());return c.textContent})')
    await page.locator('.family-nav button').nth(labels.index(text)).click()
   async def turn():
    await page.locator('.gacha-draw').click()
    assert await page.locator('.gacha-cancel').evaluate('e=>e===document.activeElement')
    await page.keyboard.press('Escape');assert await page.locator('.gacha-draw').evaluate('e=>e===document.activeElement')
    assert not calls or len(calls)==1
    await page.locator('.gacha-draw').click()
    await page.locator('.gacha-confirm .f-primary').evaluate('(e)=>{e.click();e.click();e.click()}')
   await page.goto(URL);await nav('扭蛋')
   if not broken:await page.locator('.gacha-machine-art').evaluate('e=>e.decode()')
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   if player=='feifei':assert await page.locator('.gacha-machine rt').count()>0
   if action=='zero':
    assert await page.locator('.gacha-draw').is_disabled();assert await page.locator('.gacha-earn-now').is_enabled()
   else:
    await turn()
    if not reduced:
     await page.locator('.phase-turning').wait_for()
     assert await page.locator('.gacha-visual').evaluate('(e)=>{let r=e.getBoundingClientRect();return r.top+r.height/2>0&&r.top+r.height/2<innerHeight}'),'animation not in viewport'
    if action=='unmount':
     await nav('港口');await asyncio.sleep(delay+1)
     assert await page.locator('.gacha-machine').count()==0
     await nav('扭蛋');assert await page.locator('.gacha-machine').get_attribute('data-phase')=='idle'
     assert await page.locator('.gacha-result').count()==1
    elif failure:
     await page.locator('.phase-idle').wait_for();assert await page.locator('.gacha-featured-result').count()==0
     assert pr['tickets']==3 and len(set(c['id'] for c in calls))==1
    else:
     if not reduced:
      await page.locator('.phase-mixing').wait_for();assert await page.locator('.gacha-result').count()==0
     if action=='skip':await page.locator('.gacha-skip').click()
     if action=='toggle-reduced':await page.emulate_media(reduced_motion='reduce')
     if delay and action!='unmount':
      await page.locator('.phase-waiting').wait_for();assert await page.locator('.gacha-reveal').count()==0
      assert await page.locator('.gacha-result').count()==0
     await page.locator('.phase-revealed').wait_for()
     assert len(calls)==1 and pr['tickets']==2
     assert await page.locator('.gacha-result-heading').evaluate('e=>e===document.activeElement')
     assert '灣光守宮' in await plain(page.locator('.gacha-result-heading'))
     for selector in ['.gacha-reveal .gacha-result-art','.gacha-result-heading']:
      assert await page.locator(selector).evaluate('(e)=>{const r=e.getBoundingClientRect();return r.top+r.height/2>0&&r.top+r.height/2<innerHeight}'),f'reveal offscreen: {selector}'
     phases=await page.evaluate('window.gachaPhases')
     names=[p['phase'] for p in phases]
     if not reduced and action not in ['skip','toggle-reduced']:
      for part in ['turning','mixing','dropping','opening','revealed']:assert part in names,names
      start=next(p['ms'] for p in phases if p['phase']=='turning');end=next(p['ms'] for p in phases if p['phase']=='revealed')
      assert end-start>=3350,(end-start)
     if reduced or action=='toggle-reduced':
      assert await page.locator('.gacha-machine *').evaluate_all('(es)=>es.every(e=>getComputedStyle(e).animationName==="none")')
     if action=='repeat':
      await turn();await page.locator('.phase-revealed').wait_for();assert len(calls)==2 and pr['owned']['covegecko']==2
      assert '遇見熟悉的夥伴' in await page.locator('.gacha-result').inner_text()
     if action=='interleaved':
      await asyncio.sleep(3);assert '灣光守宮' in await page.locator('.gacha-result-heading').inner_text()
      await page.reload();await nav('扭蛋');assert '石礁鰭' in await page.locator('.gacha-result-heading').inner_text()
      assert await page.locator('.gacha-machine').get_attribute('data-phase')=='idle'
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   await page.screenshot(path=str(OUT/f'check-{name}.png'),full_page=True)
   report['cases'].append({'name':name,'width':width,'height':height,'result':'PASS','commands':calls,'phases':await page.evaluate('window.gachaPhases')})
   (OUT/'browser-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
   print(name,'PASS',flush=True);await ctx.close()
  for width,player in [(1440,'quintus'),(768,'quintus'),(390,'quintus'),(320,'feifei')]:await scenario('instant-'+str(width),width,player)
  await scenario('short-screen-320',320,'feifei',height=568)
  await scenario('short-screen-390',390,'quintus',height=667)
  await scenario('zero-ticket',action='zero')
  await scenario('slow-response',delay=5)
  await scenario('server-failure',failure=True)
  await scenario('skip-before-response',delay=4,action='skip')
  await scenario('reduced-motion',reduced=True)
  await scenario('toggle-reduced',action='toggle-reduced')
  await scenario('leave-during-request',delay=3,action='unmount')
  await scenario('same-pet-again',action='repeat')
  await scenario('cross-device-receipt',action='interleaved')
  await scenario('missing-machine-art',broken=True)
  assert not report['pageErrors'],report['pageErrors']
  report['result']='PASS';(OUT/'browser-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
  print(json.dumps({'result':'PASS','cases':len(report['cases']),'pageErrors':report['pageErrors']}));await browser.close()
asyncio.run(main())
