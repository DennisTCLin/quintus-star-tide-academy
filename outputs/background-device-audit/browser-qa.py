"""WebKit device emulation + synthetic lifecycle events, real local API/PostgreSQL.

Playwright WebKit tabs remain visible even after bring_to_front; this deliberately
injects Page Visibility/BFCache events and does not claim physical iOS suspension.
No game response is invented: held replies are fetched from the real API first.
"""
import asyncio, json, subprocess, sys, time
from pathlib import Path
from playwright.async_api import async_playwright, expect

OUT=Path('outputs/background-device-audit')
CFG=json.loads(Path('/tmp/background-device-qa-access.json').read_text())
BASELINE='--baseline' in sys.argv
checks=[]; releases=[]; errors=[]

def check(name, condition=True, detail=None):
    assert condition,(name,detail)
    checks.append({'name':name,'pass':True,'detail':detail})
    print('PASS',name,flush=True)

async def until(fn, timeout=15):
    end=asyncio.get_running_loop().time()+timeout
    while asyncio.get_running_loop().time()<end:
        value=await fn()
        if value:return value
        await asyncio.sleep(.08)
    raise AssertionError('Condition timed out')

class HeldReads:
    def __init__(self,page,limit=2):self.page=page;self.limit=limit;self.reads=[]
    async def install(self):await self.page.route('**/api/online-battle?player=*',self.route)
    async def route(self,route):
        if len(self.reads)>=self.limit:
            # A timeout or extra lifecycle event may start another valid fresh read.
            # Keep every later reply behind the same barrier until the test releases it.
            response=await route.fetch()
            print('READ extra fresh gated',time.monotonic(),len(self.reads),flush=True)
            await self.reads[-1]['release'].wait()
            try:await route.fulfill(response=response)
            except Exception:pass
            return
        item={'release':asyncio.Event(),'ready':False};self.reads.append(item);releases.append(item['release'])
        print('READ held start',time.monotonic(),len(self.reads)-1,flush=True)
        response=await route.fetch();item['state']=await response.json();item['ready']=True
        print('READ held ready',time.monotonic(),len(self.reads)-1,item['state'].get('room',{}).get('revision'),flush=True)
        await item['release'].wait()
        print('READ release',time.monotonic(),flush=True)
        try:await route.fulfill(response=response)
        except Exception:pass # An invalidated/aborted browser read needs no delivery.
    async def ready(self,n):return len(self.reads)>n and self.reads[n]['ready']
    async def wait(self,n):await until(lambda:self.ready(n),8)
    async def close(self):
        for item in self.reads:item['release'].set()
        await self.page.unroute('**/api/online-battle?player=*',self.route)

async def main():
    async with async_playwright() as pw:
        browser=await pw.webkit.launch()
        contexts=[await browser.new_context(**pw.devices[d]) for d in ['iPhone 13','iPad (gen 7)']]
        pages=[]
        for i,c in enumerate(contexts):
            await c.add_init_script("""window.__qaVisibility='visible';
              Object.defineProperty(document,'visibilityState',{get:()=>window.__qaVisibility,configurable:true});
              Object.defineProperty(document,'hidden',{get:()=>window.__qaVisibility==='hidden',configurable:true});""")
            page=await c.new_page();pages.append(page)
            page.on('pageerror',lambda e,i=i:errors.append({'client':i,'name':e.name,'message':e.message}))
        async def room(i=0):
            r=await pages[i].request.get(CFG['base']+'/api/online-battle?player='+CFG['players'][i]['player'])
            assert r.ok,(r.status,await r.text());return (await r.json())['room']
        async def visibility(i,value):
            print('VISIBILITY',i,value,time.monotonic(),flush=True)
            await pages[i].evaluate("v=>{window.__qaVisibility=v;document.dispatchEvent(new Event('visibilitychange'))}",value)
            await asyncio.sleep(.08)
        async def paused(i):
            return await pages[i].get_by_text('正在重新連線，暫停操作；連回後會同步最新進度。',exact=True).count()>0
        async def fresh_ui(i,current):
            await expect(pages[i].locator('.duel-stage')).to_have_attribute('data-round',str(current['battle']['round']),timeout=15000)
        async def attack(i,guard=False):
            before=await room(i);assert before['battle']['turn']==i
            button=pages[i].get_by_role('button',name='防守蓄能' if guard else '普通攻擊',exact=True)
            await expect(button).to_be_enabled(timeout=15000);await button.click()
            async def advanced():
                now=await room(i);return now if now['revision']>before['revision'] else None
            return await until(advanced)
        async def turn(i):
            current=await room(i)
            if current['battle']['turn']!=i:await attack(1-i,guard=True)
            await expect(pages[i].get_by_role('button',name='普通攻擊',exact=True)).to_be_enabled(timeout=15000)
        async def open_room(i):
            if not await pages[i].locator('dialog.social-dialog').count():
                await pages[i].locator('.online-battle-banner button').click()
            await expect(pages[i].locator('dialog.social-dialog')).to_be_visible()
        try:
            for i,p in enumerate(pages):
                await p.goto(CFG['base']);await p.wait_for_load_state('networkidle')
                await p.locator('input[autocomplete=username]').fill(CFG['players'][i]['username'])
                await p.locator('input[type=password]').fill(CFG['password'])
                await p.get_by_role('button',name='登入，繼續冒險 →',exact=True).click()
                await expect(p.locator('.friends-toggle')).to_be_visible(timeout=20000)
            for p in pages:await expect(p.locator('.friends-toggle')).to_contain_text('1 人在線',timeout=25000)
            await pages[0].locator('.friends-toggle').click();await pages[0].locator('.friend-row').click()
            await pages[0].get_by_role('button',name='邀請線上對戰',exact=True).click()
            await open_room(1);await pages[1].get_by_role('button',name='接受並開始對戰',exact=True).click();await open_room(0)
            async def active():
                current=await room();return current if current and current['status']=='active' else None
            initial=await until(active)
            # Both UIs must have observed acceptance before holding their next reads.
            # The randomly selected first player can act while the inviter still shows pending.
            for i in [0,1]:await fresh_ui(i,initial)
            check('Independent phone/tablet sessions join the same real battle',(await room(0))['id']==(await room(1))['id'])

            for i in [0,1]:
                await turn(1-i);before=await room(i)
                held=HeldReads(pages[i]);await held.install()
                await pages[i].evaluate("window.dispatchEvent(new Event('online'))");await held.wait(0)
                await visibility(i,'hidden');hidden_paused=await paused(i)
                current=await attack(1-i)
                await visibility(i,'visible')
                if BASELINE:
                    await asyncio.sleep(.2)
                    result={'hiddenPaused':hidden_paused,'freshReadStartedBeforeOldReply':len(held.reads)>1,'beforeRound':before['battle']['round'],'serverRound':current['battle']['round']}
                    held.reads[0]['release'].set();await asyncio.sleep(.3)
                    result['displayedRoundAfterOldReply']=await pages[i].locator('.duel-stage').get_attribute('data-round')
                    result['pausedAfterOldReply']=await paused(i)
                    (OUT/'baseline.json').write_text(json.dumps(result,indent=2)+'\n')
                    print('BASELINE',json.dumps(result),flush=True);await held.close();return
                check(f'Client {i}: hiding invalidates connectivity',hidden_paused)
                await held.wait(1)
                check(f'Client {i}: resume starts a fresh read before stale read finishes',held.reads[1]['state']['room']['revision']==current['revision'])
                check(f'Client {i}: commands stay paused while resume snapshot is pending',await paused(i) and await pages[i].get_by_role('button',name='普通攻擊',exact=True).is_disabled(),{'heldReads':len(held.reads),'released':[r['release'].is_set() for r in held.reads]})
                held.reads[1]['release'].set();await fresh_ui(i,current)
                await expect(pages[i].get_by_role('button',name='普通攻擊',exact=True)).to_be_enabled(timeout=15000)
                held.reads[0]['release'].set();await asyncio.sleep(.25)
                check(f'Client {i}: stale background reply cannot regress displayed round',await pages[i].locator('.duel-stage').get_attribute('data-round')==str(current['battle']['round']))
                check(f'Client {i}: lifecycle changes cause no extra move',(await room(i))['revision']==current['revision'])
                await held.close()

            # A successful POST response can also be older than the resumed world.
            await turn(0)
            post_ready=asyncio.Event();post_release=asyncio.Event();releases.append(post_release)
            async def hold_post(route):
                if route.request.method!='POST':return await route.continue_()
                response=await route.fetch();post_ready.set();await post_release.wait();await route.fulfill(response=response)
            await pages[0].route('**/api/online-battle',hold_post,times=1)
            await pages[0].get_by_role('button',name='普通攻擊',exact=True).click();await asyncio.wait_for(post_ready.wait(),8)
            await visibility(0,'hidden');current=await attack(1)
            held=HeldReads(pages[0],1);await held.install();await visibility(0,'visible')
            check('Resume while POST is in flight stays paused',await paused(0))
            post_release.set();await held.wait(0)
            check('Late POST completion cannot bypass the fresh-read barrier',await paused(0) and await pages[0].get_by_role('button',name='普通攻擊',exact=True).is_disabled())
            held.reads[0]['release'].set();await fresh_ui(0,current)
            await expect(pages[0].get_by_role('button',name='普通攻擊',exact=True)).to_be_enabled(timeout=15000)
            check('Late successful POST resumes latest round without another command',(await room())['revision']==current['revision'])
            await held.close()

            for i in [0,1]:
                await turn(i)
                committed=asyncio.Event();drop=asyncio.Event();releases.append(drop);posts=[]
                async def lose_reply(route):
                    if route.request.method!='POST':return await route.continue_()
                    body=route.request.post_data_json
                    if body.get('action')!='move':return await route.continue_()
                    posts.append(body)
                    if len(posts)==1:
                        response=await route.fetch();assert response.ok
                        committed.set();await drop.wait()
                        try:await route.abort('connectionreset')
                        except Exception:pass
                    else:await route.continue_()
                await pages[i].route('**/api/online-battle',lose_reply)
                await pages[i].get_by_role('button',name='普通攻擊',exact=True).click();await asyncio.wait_for(committed.wait(),8)
                await visibility(i,'hidden');await contexts[i].set_offline(True);drop.set()
                current=await attack(1-i)
                await contexts[i].set_offline(False);await visibility(i,'visible')
                retry=pages[i].get_by_role('button',name='確認同步',exact=True)
                await expect(retry).to_be_visible(timeout=15000);await retry.click();await expect(retry).to_have_count(0)
                check(f'Client {i}: offline/background replay keeps original command',len(posts)==2 and posts[0]==posts[1])
                now=await room(i)
                check(f'Client {i}: replay after opponent move never damages twice',now['revision']==current['revision'] and now['battle']==current['battle'])
                await fresh_ui(i,now);await expect(pages[i].get_by_role('button',name='普通攻擊',exact=True)).to_be_enabled(timeout=15000)
                await pages[i].unroute('**/api/online-battle',lose_reply)
                await pages[i].screenshot(path=str(OUT/f'resumed-{i}.png'))

            # BFCache-style restoration with visibility already reporting visible.
            await turn(1);await pages[0].evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))")
            check('Pagehide pauses commands even before visibility changes',await paused(0))
            current=await attack(1)
            held=HeldReads(pages[0],1);await held.install()
            await pages[0].evaluate("window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))")
            await held.wait(0);check('Persisted pageshow requires a fresh server snapshot',await paused(0))
            held.reads[0]['release'].set();await fresh_ui(0,current);await held.close()
            await expect(pages[0].get_by_role('button',name='普通攻擊',exact=True)).to_be_enabled(timeout=15000)

            # Local QA helper expires only this synthetic pair's active room.
            await visibility(0,'hidden');await visibility(1,'hidden')
            response=await pages[0].request.post(CFG['base']+'/qa/expire');assert response.ok
            for i in [0,1]:await visibility(i,'visible')
            for p in pages:
                await expect(p.get_by_text('有一方超過回合時間，這場已結束。學習進度與夥伴經驗不受影響。',exact=True)).to_be_visible(timeout=15000)
            check('Returning after the turn deadline shows a settled result',(await room())['status']=='finished' and (await room())['reason']=='timeout')
            for p in pages:await p.get_by_role('button',name='完成',exact=True).click()
            for p in pages:await expect(p.locator('.online-battle-banner')).to_have_count(0)
            evidence=await (await pages[0].request.get(CFG['base']+'/qa/evidence')).json()
            check('No learning or reward mutation',evidence['learningUnchanged'])
            check('Command receipts are unique',len({(x['room'],x['member'],x['id']) for x in evidence['receipts']})==len(evidence['receipts']))
            unexpected=[e for e in errors if not ('/api/state due to access control checks.' in e['message'])]
            check('No application JavaScript exception',not unexpected,unexpected)
            result={'pass':True,'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'physicalDevice':False,'lifecycle':'Synthetic Page Visibility and PageTransition events; real WebKit networking, API and PostgreSQL','checks':checks,'diagnostics':errors}
            (OUT/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
        except Exception:
            for i,p in enumerate(pages):
                await p.screenshot(path=str(OUT/f'failure-{i}.png'))
                (OUT/f'failure-{i}.txt').write_text(await p.locator('body').inner_text())
            raise
        finally:
            for event in releases:event.set()
            for c in contexts:await c.close()
            await browser.close()

asyncio.run(main())
