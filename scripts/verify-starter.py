"""Onboarding UI fixtures and isolated real-cloud account. Never modifies existing players."""
from playwright.sync_api import sync_playwright, expect
import json, subprocess, os, uuid
from pathlib import Path
PLAIN="e=>{const c=e.cloneNode(true);c.querySelectorAll('rt,.brand-symbol-text').forEach(x=>x.remove());return c.textContent}"
BASE=os.getenv('STARTER_QA_URL','http://127.0.0.1:4235').rstrip('/')
OUT=Path(os.getenv('STARTER_QA_OUT','/tmp/starter-qa'));OUT.mkdir(parents=True,exist_ok=True)
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{newOnboardingFamily,taipeiDay,ROSTER}from'./build/game.mjs';console.log(JSON.stringify({family:newOnboardingFamily(),day:taipeiDay(),roster:ROSTER}))"],text=True))
def fixtures(browser):
    results=[]
    for player,width,motion in [('quintus',1440,'no-preference'),('feifei',320,'reduce'),('qingqing',390,'reduce')]:
        state=json.loads(json.dumps(fixture));roster=state.pop('roster');pet=next(x for x in roster if x['rarity']==('E' if player=='feifei' else 'D'))
        state.update(questions={},username='fixture',playerId=player,displayName='航海員',csrf='fixture',verified={},legacy=False,canMigrate=False)
        page=browser.new_page(viewport={'width':width,'height':950},reduced_motion=motion);errors=[];calls=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def api(route):
            if route.request.method=='POST':
                c=route.request.post_data_json['command'];calls.append(c['type']);p=state['family']['profiles'][player]
                if c['type']=='starter-draw':
                    p['onboarding']={'pet':pet['id'],'confirmed':False};p['owned']={pet['id']:1};p['firstAcquired']={pet['id']:None};p['equipped']=pet['id'];state['result']=pet['id']
                else:p['onboarding']['confirmed']=True;state['result']=True
                state['family']['revision']+=1
            route.fulfill(json=state)
        page.route('**/api/**',api);page.goto(BASE,wait_until='networkidle')
        expect(page.locator('.star-capsule-machine')).to_be_visible()
        page.screenshot(path=str(OUT/f'{player}-before.png'),full_page=True)
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(player,'intro overflow')
        if player=='feifei':assert page.locator('.starter-shell rt').count()>10
        page.screenshot(path=str(OUT/f'{player}-before.png'),full_page=True)
        page.locator('.starter-action').focus();page.locator('.starter-action').press('Enter')
        expect(page.locator('.starter-result')).to_be_visible();assert calls==['starter-draw']
        assert pet['name'] in page.locator('.starter-result-copy h2').evaluate(PLAIN)
        assert page.locator('.starter-result-copy h2').evaluate('(e)=>e===document.activeElement')
        page.wait_for_function("()=>document.querySelector('.starter-result-art img').naturalWidth>0")
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(player,'result overflow')
        page.screenshot(path=str(OUT/f'{player}-result.png'),full_page=True)
        page.reload(wait_until='networkidle');expect(page.locator('.starter-result')).to_be_visible();assert calls==['starter-draw']
        page.locator('.starter-action').click();expect(page.locator('.training-panel')).to_be_visible()
        assert pet['name'] in page.locator('.training-name h2').evaluate(PLAIN);assert calls==['starter-draw','starter-confirm']
        assert not errors,errors
        results.append({'player':player,'width':width,'reduced':motion,'PASS':True});page.close()
    return results

def real(browser):
    ctx=browser.new_context(viewport={'width':390,'height':844});ctx2=browser.new_context(viewport={'width':1440,'height':950})
    username='qa_starter_'+uuid.uuid4().hex[:12];password='starter-isolated-test-passphrase';headers={'Origin':BASE}
    r=ctx.request.post(BASE+'/api/register',data={'username':username,'password':password},headers=headers);assert r.ok,r.text()
    s=r.json();assert all(p['onboarding']=={'pet':None,'confirmed':False} for p in s['family']['profiles'].values())
    r=ctx2.request.post(BASE+'/api/login',data={'username':username,'password':password},headers=headers);assert r.ok
    page=ctx.new_page();page2=ctx2.new_page();errors=[]
    for p in [page,page2]:
        p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE,wait_until='networkidle');p.get_by_role('button',name='選擇Quintus，4年級').click()
        expect(p.locator('.star-capsule-machine')).to_be_visible()
    ids=[]
    def lose_once(route):
        ids.append(route.request.post_data_json['id']);response=route.fetch()
        if len(ids)==1:route.abort('connectionreset')
        else:route.fulfill(response=response)
    page.route('**/api/command',lose_once);page.get_by_role('button',name='免費轉一次',exact=True).click()
    expect(page.locator('.starter-result')).to_be_visible(timeout=15000)
    assert len(ids)==2 and ids[0]==ids[1]
    page.unroute('**/api/command');expect(page2.locator('.starter-result')).to_be_visible(timeout=15000)
    s=ctx.request.get(BASE+'/api/state').json();p=s['family']['profiles']['quintus'];pet=p['onboarding']['pet']
    assert p['owned']=={pet:1} and p['equipped']==pet and not p['onboarding']['confirmed']
    assert p['coins']==p['tickets']==p['draws']==0
    assert all(s['family']['profiles'][i]['onboarding']['pet'] is None for i in ['feifei','qingqing','doudou'])
    page.reload(wait_until='networkidle');page.get_by_role('button',name='選擇Quintus，4年級').click();expect(page.locator('.starter-result')).to_be_visible()
    assert page.locator('.starter-result-copy h2').evaluate(PLAIN)==page2.locator('.starter-result-copy h2').evaluate(PLAIN)
    page.screenshot(path=str(OUT/'real-result.png'),full_page=True)
    page.get_by_role('button',name='一起出發',exact=True).click();expect(page.locator('.training-panel')).to_be_visible()
    expect(page2.locator('.training-panel')).to_be_visible(timeout=15000)
    with page.expect_response(lambda r:r.url.endswith('/api/command')) as response:page.get_by_role('button',name='開始陪練',exact=True).click()
    s=response.value.json();assert s['family']['profiles']['quintus']['run']['companion']==pet
    page.reload(wait_until='networkidle');page.get_by_role('button',name='選擇Quintus，4年級').click()
    expect(page.locator('.training-panel')).to_be_visible();assert page.locator('.starter-shell').count()==0
    assert not errors,errors
    ctx.close();ctx2.close()
    return {'PASS':True,'sameIdLostResponseRetry':True,'crossDevice':True,'reloadBeforeConfirm':True,'singleCompanion':True,'startUsesDrawn':True,'otherProfilesUntouched':True,'errors':errors}
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    result={'base':BASE,'fixtures':fixtures(browser)}
    if os.getenv('STARTER_REAL')=='1':result['realCloud']=real(browser)
    browser.close();print(json.dumps(result,ensure_ascii=False,indent=2));(OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
