"""Use a new disposable account; earn tickets normally, then verify gacha recovery and equip."""
from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import os,json,subprocess,uuid
BASE=os.getenv('GACHA_QA_URL','http://127.0.0.1:4240').rstrip('/')
OUT=Path(os.getenv('GACHA_QA_OUT','/tmp/gacha-cloud'));OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True)
    a=browser.new_context(viewport={'width':390,'height':844});b=browser.new_context(viewport={'width':1440,'height':950})
    if os.getenv('GACHA_NO_TIMEOUT')=='1':
        for context in [a,b]:context.add_init_script("Object.defineProperty(AbortSignal, 'timeout', { value: undefined, configurable: true });")
    creds={'username':'qa_gacha_'+uuid.uuid4().hex[:12],'password':'isolated-gacha-qa-passphrase'}
    headers={'Origin':BASE};r=a.request.post(BASE+'/api/register',data=creds,headers=headers);assert r.ok,r.text();s=r.json()
    def command(c):
        global s
        r=a.request.post(BASE+'/api/command',data={'id':str(uuid.uuid4()),'revision':s['family']['revision'],'command':{'player':'quintus',**c}},headers={**headers,'X-CSRF-Token':s['csrf']})
        assert r.ok,r.text();s=r.json();return s
    command({'type':'starter-draw'});command({'type':'starter-confirm'})
    for round in range(2):
        command({'type':'start','course':'math','practice':False})
        for index in range(5):
            run=s['family']['profiles']['quintus']['run'];q=s['questions']['quintus']
            answer=int(subprocess.check_output(['node','--input-type=module','-e',"import{questionById}from'./build/game.mjs';console.log(questionById(process.argv[1]).answer)",q['id']],text=True))
            command({'type':'answer','runId':run['id'],'index':index,'choice':answer})
            if index<4:command({'type':'next','runId':run['id'],'index':index})
        command({'type':'claim-reward','runId':run['id'],'choice':'save'})
    assert s['family']['profiles']['quintus']['tickets']==1
    command({'type':'start','course':'math','practice':False});oldrun=s['family']['profiles']['quintus']['run'];oldgrowth=s['family']['profiles']['quintus']['growth']
    r=b.request.post(BASE+'/api/login',data=creds,headers=headers);assert r.ok
    left=a.new_page();right=b.new_page();errors=[]
    for page in [left,right]:
        page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE,wait_until='networkidle');page.get_by_role('button',name='選擇Quintus，4年級').click();page.get_by_role('button',name='扭蛋',exact=True).click()
    ids=[]
    def lose_once(route):
        body=route.request.post_data_json
        if body['command']['type']!='draw':route.continue_();return
        ids.append(body['id']);response=route.fetch()
        if len(ids)==1:route.abort('connectionreset')
        else:route.fulfill(response=response)
    left.route('**/api/command',lose_once)
    left.locator('.gacha-draw').click();left.get_by_role('button',name='確認轉扭蛋',exact=True).click()
    expect(left.locator('.gacha-result')).to_be_visible(timeout=15000);expect(right.locator('.gacha-result')).to_be_visible(timeout=15000)
    assert len(ids)==2 and ids[0]==ids[1],ids
    latest=a.request.get(BASE+'/api/state').json();p=latest['family']['profiles']['quintus'];receipt=p['lastDraw']
    assert p['tickets']==0 and p['draws']==1 and p['growth']==oldgrowth
    assert p['run']['companion']==oldrun['companion']
    assert all('lastDraw' not in latest['family']['profiles'][x] for x in ['feifei','qingqing','doudou'])
    left.unroute('**/api/command');left.reload(wait_until='networkidle');left.get_by_role('button',name='選擇Quintus，4年級').click();left.get_by_role('button',name='扭蛋',exact=True).click()
    expect(left.locator('.gacha-result')).to_be_visible();assert a.request.get(BASE+'/api/state').json()['family']['profiles']['quintus']['lastDraw']==receipt
    left.screenshot(path=str(OUT/'recovered-mobile.png'),full_page=True)
    left.get_by_role('button',name='選牠下趟陪練',exact=True).click();expect(left.locator('.training-panel')).to_be_visible()
    latest=a.request.get(BASE+'/api/state').json();p=latest['family']['profiles']['quintus']
    assert p['equipped']==receipt['pet'] and p['run']['companion']==oldrun['companion'] and p['growth']==oldgrowth
    left.get_by_role('button',name='登出',exact=True).click();expect(left.locator('.gacha-result')).to_have_count(0)
    assert not errors,errors
    result={'base':BASE,'earnedViaTwoVoyages':True,'lostResponseSameIdRetry':True,'oneTicketOneCard':True,'crossDevice':True,'reloadRecovery':True,'profileIsolation':True,'equipUsesNextVoyage':True,'originalXpPreserved':True,'logoutClearsResult':True,'errors':errors,'withoutAbortSignalTimeout':os.getenv('GACHA_NO_TIMEOUT')=='1'}
    (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False,indent=2));browser.close()
