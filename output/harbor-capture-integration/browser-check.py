import json
from pathlib import Path
from playwright.sync_api import sync_playwright
fixtures=json.loads(Path('/tmp/star-tide-harbor-capture-private/fixtures.json').read_text());results=[]
measure="""()=>{let e=document.querySelector('.harbor-departure-start'),r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),overflow:document.documentElement.scrollWidth>innerWidth+1}}"""
with sync_playwright() as p:
 for engine in ['webkit','chromium']:
  b=getattr(p,engine).launch()
  for f in [x for x in fixtures if x['engine']==engine]:
   c=b.new_context(viewport={'width':375,'height':667});page=c.new_page();page.set_default_timeout(15000)
   page.route('**/api/dragon/**',lambda r:r.fulfill(status=503,content_type='application/json',body='{}'))
   page.goto('http://127.0.0.1:4378');page.get_by_placeholder('英文字母、數字或底線').fill(f['username']);page.get_by_placeholder('請輸入密碼').fill(f['password']);page.get_by_role('button',name='登入，繼續冒險 →').click();page.locator('.harbor-departure-start').wait_for(state='attached')
   def state():return page.evaluate('async()=>await (await fetch("/api/state")).json()')
   def profile():return state()['family']['profiles'][f['player']]
   def capture():
    pr=profile();run=pr['mathIsland']['run'] if f['state']=='capture-island' else pr['run'];return run['capture']
   def ledger():
    pr=profile();return {k:pr.get(k) for k in ['run','mathIsland','coins','tickets','owned','learning','growth','milestones']}
   if f['state'].startswith('capture-'):
    page.get_by_role('button',name='稍後繼續',exact=True).click();cta=page.locator('.harbor-departure-start')
    assert cta.get_attribute('aria-label')=='繼續降服挑戰';assert page.locator('.capture-resume').count()==0
    assert page.get_by_role('button',name='繼續降服挑戰',exact=True).count()==1
    before=ledger()
    for width,height in [(320,568),(375,667),(820,1180)]:
     page.set_viewport_size({'width':width,'height':height});page.evaluate('scrollTo(0,0)');m=page.evaluate(measure);assert m['top']>=0 and m['bottom']<=height and m['height']>=48 and m['hit'] and not m['overflow'],(engine,f['state'],f['grade'],width,m)
     results.append({'engine':engine,'grade':f['grade'],'state':f['state'],'width':width,'singlePrimary':True,'visibleAndClickable':True})
    page.set_viewport_size({'width':375,'height':667});page.screenshot(path=f'output/harbor-capture-integration/{engine}-{f["grade"]}-{f["state"]}.png')
    c.set_offline(True);page.evaluate('window.dispatchEvent(new Event("offline"))');page.wait_for_timeout(100);assert cta.is_disabled();c.set_offline(False);page.evaluate('window.dispatchEvent(new Event("online"))');page.wait_for_timeout(400)
    cta.click();page.locator('.capture-overlay').wait_for();page.keyboard.press('Escape');page.locator('.capture-overlay').wait_for(state='hidden');assert page.evaluate('document.activeElement===document.querySelector(".harbor-departure-start")')
    assert before==ledger()
    # These existing callbacks receive React pointer events even though their prop type is () => void.
    page.locator('.training-resume').click();page.locator('.capture-overlay').wait_for();page.keyboard.press('Escape');page.locator('.capture-overlay').wait_for(state='hidden');assert before==ledger()
    page.locator('.family-nav button').nth(1).click();page.locator('.capture-resume').wait_for();page.locator('.capture-resume').click();page.locator('.capture-overlay').wait_for();page.keyboard.press('Escape');page.locator('.capture-overlay').wait_for(state='hidden');page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');assert page.evaluate('document.activeElement===document.querySelector(".capture-resume")');assert before==ledger()
    page.locator('.family-nav button').first.click();page.evaluate('scrollTo(0,0)');cta.click();page.locator('.capture-answers button').first.wait_for()
    if f['grade']==4:
     s=state();q=s['captureQuestions'][f['runId']];assert 'answer' not in q
     wrong=(f['captureAnswers'][0]+1)%len(q['options']);page.locator('.capture-answers button').nth(wrong).click();page.get_by_role('button',name='完成',exact=True).click();assert capture()['outcome']=='escaped'
     assert page.locator('.harbor-departure-start').get_attribute('aria-label')=='選一座島出發'
    else:
     page.locator('.capture-answers button').nth(f['captureAnswers'][0]).click();page.wait_for_timeout(250);assert len(capture()['trial']['answers'])==1
     page.reload();page.get_by_role('button',name='稍後繼續',exact=True).wait_for();assert len(capture()['trial']['answers'])==1
     page.get_by_role('button',name='稍後繼續',exact=True).click();page.locator('.harbor-departure-start').click();page.locator('.capture-answers button').first.wait_for();assert len(capture()['trial']['answers'])==1
     # These fixtures are allowed to finish locally; prior battle rewards must not increase.
     pr=profile();money={k:pr.get(k) for k in ['coins','tickets','growth','milestones']}
     for i in [1,2]:page.locator('.capture-answers button').nth(f['captureAnswers'][i]).click();page.wait_for_timeout(250)
     page.get_by_role('button',name='完成',exact=True).click();assert capture()['outcome'] in ['joined','duplicate'];pr=profile();assert money=={k:pr.get(k) for k in money}
     assert page.locator('.harbor-departure-start').get_attribute('aria-label')=='選一座島出發'
    results.append({'engine':engine,'grade':f['grade'],'state':f['state'],'closeReopen':True,'trainingCallbackResumesCapture':True,'globalCaptureFocusRestored':True,'offlineDisabled':True,'navigationPreservedLedger':True,'finishRestoresPicker':True})
   else:
    cta=page.locator('.harbor-departure-start');expected='選一座島出發' if f['state']=='new' else '領取獎勵' if f['state']=='legacy-reward' else '繼續挑戰';assert cta.get_attribute('aria-label')==expected
    before=ledger();cta.click()
    if f['state']=='new':page.get_by_role('dialog',name='選擇學習科目').wait_for()
    else:page.locator('.harbor-departure-start').wait_for(state='hidden')
    assert before==ledger();results.append({'engine':engine,'grade':f['grade'],'state':f['state'],'originalDestinationPreserved':True})
   c.close()
  b.close()
Path('output/harbor-capture-integration/browser-results.json').write_text(json.dumps(results,indent=2)+'\n');print({'checks':len(results),'isolatedSyntheticOnly':True})
