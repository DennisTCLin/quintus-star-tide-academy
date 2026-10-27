"""Real local PostgreSQL/API, independent WebKit phone/tablet sessions; no child accounts."""
from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import json, time, sys

OUT=Path('outputs/friends-device-audit')
cfg=json.loads(Path('/tmp/friends-device-qa-access.json').read_text())
checks=[]; posts=[]; diagnostics=[]
def check(name, ok=True, detail=None):
    assert ok, (name, detail)
    checks.append({'name':name,'pass':True,'detail':detail})
    print('PASS',name,flush=True)
def wait(fn, timeout=20):
    end=time.monotonic()+timeout
    while time.monotonic()<end:
        value=fn()
        if value:return value
        pages[0].wait_for_timeout(100)
    raise AssertionError('Condition timed out')
def room(i):
    r=pages[i].request.get(cfg['base']+'/api/online-battle?player='+cfg['players'][i]['player'])
    assert r.ok,(r.status,r.text())
    return r.json()['room']
def drop_once(i, action, status=None):
    captured=[]
    def route(r):
        body=r.request.post_data_json if r.request.method=='POST' else {}
        if body.get('action')==action:
            posts.append({'client':i,'body':body})
            if not captured:
                response=r.fetch();assert response.ok
                captured.append({'body':body,'room':response.json()['room']})
                if status:r.fulfill(status=status,json={'error':'Synthetic gateway failure after commit'})
                else:r.abort('connectionreset')
                return
        r.continue_()
    pages[i].route('**/api/online-battle',route)
    return captured,route
def open_room(i):
    p=pages[i]
    if not p.locator('dialog.social-dialog').count():p.locator('.online-battle-banner button').click()
    expect(p.locator('dialog.social-dialog')).to_be_visible()
def close_room(i):
    pages[i].locator('dialog.social-dialog').get_by_role('button',name='關閉',exact=True).click()
def retry(i, capture, route, name):
    p=pages[i];expect(p.get_by_role('button',name='確認同步',exact=True)).to_be_visible(timeout=15000)
    p.get_by_role('button',name='確認同步',exact=True).click()
    expect(p.get_by_role('button',name='確認同步',exact=True)).to_have_count(0)
    matching=[x for x in posts if x['client']==i and x['body']['commandId']==capture[0]['body']['commandId']]
    check(name,len(matching)==2 and matching[0]['body']==matching[1]['body'])
    p.unroute('**/api/online-battle',route)

with sync_playwright() as pw:
    browser=pw.webkit.launch()
    contexts=[browser.new_context(**pw.devices['iPhone 13']),browser.new_context(**pw.devices['iPad (gen 7)'])]
    pages=[c.new_page() for c in contexts]
    try:
        for i,p in enumerate(pages):
            p.on('pageerror',lambda e,i=i:diagnostics.append({'client':i,'name':e.name,'message':e.message}))
            p.goto(cfg['base']);p.wait_for_load_state('networkidle')
            p.locator('input[autocomplete=username]').fill(cfg['players'][i]['username'])
            p.locator('input[type=password]').fill(cfg['password'])
            p.get_by_role('button',name='登入，繼續冒險 →',exact=True).click()
            expect(p.locator('.friends-toggle')).to_be_visible(timeout=20000)
        expect(pages[0].locator('.friends-toggle')).to_contain_text('1 人在線',timeout=25000)
        expect(pages[1].locator('.friends-toggle')).to_contain_text('1 人在線',timeout=25000)
        check('Two authenticated mobile/tablet accounts see each other online')
        p=pages[0];p.locator('.friends-toggle').click();p.locator('.friend-row').click()
        capture,route=drop_once(0,'invite');p.get_by_role('button',name='邀請線上對戰',exact=True).click()
        retry(0,capture,route,'Lost invite response retries the original command')
        invite_id=capture[0]['room']['id'];check('Recipient receives exactly the committed invitation',room(1)['id']==invite_id)
        close_room(0);open_room(1)
        capture,route=drop_once(1,'accept');pages[1].get_by_role('button',name='接受並開始對戰',exact=True).click()
        retry(1,capture,route,'Lost accept response retries once and resumes the active battle')
        check('Both clients resume the same room',room(0)['id']==room(1)['id']==invite_id and room(0)['battle']==room(1)['battle'])
        open_room(0)
        current=room(0);side=current['battle']['turn'];p=pages[side]
        attack=p.get_by_role('button',name='普通攻擊',exact=True);expect(attack).to_be_enabled(timeout=15000)
        # The real browser is disconnected; no new game command should be offered.
        contexts[side].set_offline(True);p.wait_for_timeout(150)
        immediate={'navigatorOnline':p.evaluate('navigator.onLine'),'attackDisabled':attack.is_disabled(),'reconnecting':p.get_by_text('正在重新連線，暫停操作；連回後會同步最新進度。',exact=True).count()>0}
        if '--baseline' in sys.argv:
            (OUT/'offline-baseline.json').write_text(json.dumps(immediate,ensure_ascii=False,indent=2)+'\n')
            p.screenshot(path=str(OUT/'offline-baseline.png'))
            print('BASELINE',json.dumps(immediate),flush=True)
            sys.exit(0)
        if '--baseline-gateway' not in sys.argv:check('Offline immediately pauses battle controls',not immediate['navigatorOnline'] and immediate['attackDisabled'] and immediate['reconnecting'],immediate)
        contexts[side].set_offline(False);expect(attack).to_be_enabled(timeout=15000)
        check('Reconnect restores the same turn without sending a move',room(side)['revision']==current['revision'])
        delayed=[]
        def late_poll(r):
            response=r.fetch()
            contexts[side].set_offline(True)
            delayed.append(True)
            r.fulfill(response=response)
        p.route('**/api/online-battle?player=*',late_poll,times=1)
        p.evaluate("window.dispatchEvent(new Event('online'))")
        wait(lambda:bool(delayed));p.wait_for_timeout(200)
        check('Late successful poll cannot re-enable controls after offline',not p.evaluate('navigator.onLine') and attack.is_disabled())
        contexts[side].set_offline(False);expect(attack).to_be_enabled(timeout=15000)
        capture,route=drop_once(side,'move');attack.click();retry(side,capture,route,'Lost move response cannot apply damage twice')
        check('Retry preserves committed round and health',room(side)['battle']==capture[0]['room']['battle'])
        # A proxy 502 can lose the reply after the application already committed.
        current=room(0);side=current['battle']['turn'];p=pages[side];attack=p.get_by_role('button',name='普通攻擊',exact=True)
        expect(attack).to_be_enabled(timeout=15000);capture,route=drop_once(side,'move',502);attack.click()
        if '--baseline-gateway' in sys.argv:
            p.wait_for_timeout(1500)
            finding={'status':502,'committed':bool(capture),'retryOffered':p.get_by_role('button',name='確認同步',exact=True).count()>0}
            (OUT/'gateway-baseline.json').write_text(json.dumps(finding,indent=2)+'\n')
            print('BASELINE GATEWAY',json.dumps(finding),flush=True);sys.exit(0)
        retry(side,capture,route,'Gateway failure after commit retains an idempotent retry')
        check('Gateway retry leaves committed damage unchanged',room(side)['battle']==capture[0]['room']['battle'])
        for i,p in enumerate(pages):
            before=room(i);p.reload();expect(p.locator('.online-battle-banner')).to_be_visible(timeout=15000);open_room(i)
            check(f'Client {i} reload resumes the persisted room',room(i)['id']==before['id'] and room(i)['revision']==before['revision'])
        for w,h in [(320,640),(390,844),(768,1024),(1024,768)]:
            p=pages[0];p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(120)
            m=p.locator('dialog.social-dialog').evaluate('el=>{const r=el.getBoundingClientRect(),s=el.querySelector(".duel-stage")?.getBoundingClientRect();return {document:document.documentElement.scrollWidth,viewport:innerWidth,client:el.clientWidth,scroll:el.scrollWidth,left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:innerHeight,stage:s?{width:s.width,height:s.height}:null,hudClear:[...el.querySelectorAll(".duel-combatant")].every(c=>c.getBoundingClientRect().top>=el.querySelector(".duel-hud").getBoundingClientRect().bottom),caption:[...el.querySelectorAll(".duel-caption,.duel-caption-copy")].every(c=>c.scrollWidth<=c.clientWidth+1),minButton:Math.min(...[...el.querySelectorAll(".social-battle-actions button")].map(b=>b.getBoundingClientRect().height))}}')
            check(f'Battle dialog fits {w}x{h}',m['document']<=w and m['scroll']<=m['client']+1 and m['left']>=0 and m['right']<=w+1 and m['top']>=0 and m['bottom']<=h+1 and m['hudClear'] and m['caption'] and m['minButton']>=44 and m['stage'] is not None and m['stage']['width']>100 and m['stage']['height']>100,m)
            p.screenshot(path=str(OUT/f'battle-{w}.png'))
            if w==320:
                p.locator('.duel-combatant').first.evaluate("el=>el.scrollIntoView({block:'center'})")
                p.screenshot(path=str(OUT/'battle-320-scrolled.png'))
                visible=p.locator('dialog.social-dialog').evaluate('el=>{const d=el.getBoundingClientRect(),a=el.querySelector(".social-battle-actions").getBoundingClientRect();return [...el.querySelectorAll(".duel-combatant")].map(c=>{const r=c.getBoundingClientRect();return {width:r.width,height:r.height,visibleHeight:Math.min(r.bottom,a.top,d.bottom)-Math.max(r.top,d.top)}})}')
                check('Small-phone battle characters remain visible after scrolling',len(visible)==2 and all(c['visibleHeight']>=60 for c in visible),visible)
                p.locator('.duel-caption').evaluate("el=>el.scrollIntoView({block:'center'})")
                p.screenshot(path=str(OUT/'battle-320-caption.png'))
                p.locator('dialog.social-dialog').evaluate('el=>el.scrollTop=0')
        # Alternate real UI moves through natural combat completion, not concession.
        for _ in range(100):
            current=room(0)
            if current['status']=='finished':break
            side=current['battle']['turn'];p=pages[side]
            button=p.get_by_role('button',name='普通攻擊',exact=True);expect(button).to_be_enabled(timeout=15000);button.click()
            wait(lambda: room(0)['revision']>current['revision'])
        else:raise AssertionError('Battle did not finish')
        result=room(0);check('Natural match completion agrees on both clients',result['status']=='finished' and result['battle']['winner'] in [0,1] and result['battle']==room(1)['battle'])
        for i,p in enumerate(pages):
            expect(p.get_by_role('button',name='完成',exact=True)).to_be_enabled(timeout=15000)
            p.get_by_role('button',name='完成',exact=True).click();expect(p.locator('.online-battle-banner')).to_have_count(0)
        check('Both participants can dismiss the completed match')
        # Reverse the invite direction and complete a second real match.
        p=pages[1];p.locator('.friends-toggle').click();p.locator('.friend-row').click();p.get_by_role('button',name='邀請線上對戰',exact=True).click()
        open_room(0);pages[0].get_by_role('button',name='接受並開始對戰',exact=True).click()
        check('Tablet can invite phone and phone can accept',wait(lambda:room(1)['status']=='active'))
        open_room(1);before=room(1);contexts[1].set_offline(True);pages[1].wait_for_timeout(150)
        expect(pages[1].get_by_text('正在重新連線，暫停操作；連回後會同步最新進度。',exact=True)).to_be_visible()
        contexts[1].set_offline(False);pages[1].reload();expect(pages[1].locator('.online-battle-banner')).to_be_visible(timeout=15000);open_room(1)
        check('Tablet reconnect and reload retain reverse-invitation room',room(1)['id']==before['id'] and room(1)['revision']==before['revision'])
        for _ in range(100):
            current=room(0)
            if current['status']=='finished':break
            # Battle side is host/guest, not the browser context index.
            side=1-current['battle']['turn'];p=pages[side]
            button=p.get_by_role('button',name='普通攻擊',exact=True);expect(button).to_be_enabled(timeout=15000);button.click()
            wait(lambda:room(0)['revision']>current['revision'])
        else:raise AssertionError('Reverse battle did not finish')
        check('Reverse match naturally completes and agrees on both clients',room(0)['status']=='finished' and room(0)['battle']==room(1)['battle'])
        for p in pages:
            expect(p.get_by_role('button',name='完成',exact=True)).to_be_enabled(timeout=15000)
            p.get_by_role('button',name='完成',exact=True).click();expect(p.locator('.online-battle-banner')).to_have_count(0)
        evidence=pages[0].request.get(cfg['base']+'/qa/evidence').json()
        check('Matches and retries leave learning progress and rewards unchanged',evidence['learningUnchanged'])
        check('Only one receipt exists per committed move',len({(r['room'],r['member'],r['id']) for r in evidence['receipts']})==len(evidence['receipts']))
        allowed=[d for d in diagnostics if not (d['name']=='Fetch API cannot load http' and '/api/state due to access control checks.' in d['message'])]
        check('No application JavaScript exception',not allowed,allowed)
        (OUT/'browser-verification.json').write_text(json.dumps({'pass':True,'engine':'WebKit iPhone 13 / iPad gen7 emulation, real local PostgreSQL/API','physicalDevice':False,'productionAccountsUsed':False,'checks':checks,'diagnostics':diagnostics,'roomCount':len(evidence['rooms'])},ensure_ascii=False,indent=2)+'\n')
    except Exception:
        for i,p in enumerate(pages):
            p.screenshot(path=str(OUT/f'failure-{i}.png'));(OUT/f'failure-{i}.txt').write_text(p.locator('body').inner_text())
        raise
    finally:
        for c in contexts:c.close()
        browser.close()
