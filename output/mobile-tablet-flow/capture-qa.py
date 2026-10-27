from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,subprocess
OUT=Path('output/mobile-tablet-flow');BASE='http://localhost:4388';fixtures=json.loads(Path('/tmp/star-tide-flow-private/accounts.json').read_text());rows=[];errors=[]
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=p.chromium.launch(channel='chrome') if engine=='chromium' else p.webkit.launch()
  for grade in [1,2,4,6]:
   f=next(x for x in fixtures if x['engine']==engine and x['grade']==grade and x['state']=='ready');c=b.new_context(**p.devices['iPad Pro 11' if grade in [2,4] else 'iPhone 13']);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);page.get_by_placeholder('英文字母、數字或底線').fill(f['username']);page.get_by_placeholder('請輸入密碼').fill(f['password']);page.get_by_role('button',name='登入，繼續冒險 →').click();page.locator('.capture-overlay').wait_for()
   def oracle():return page.request.get(BASE+'/qa-oracle?username='+f['username']).json()['run']['capture']
   before=oracle();assert before['outcome']=='pending' and len(before['trial']['answers'])==0
   for i in range(3):
    expect(page.locator('#capture-title')).to_contain_text(str(i+1)+'／3');cap=oracle();qid=cap['trial']['questions'][i]
    answer=int(subprocess.check_output(['node','--input-type=module','-e','import {questionById} from "./build/game.mjs";console.log(questionById(process.argv[1]).answer)',qid],text=True))
    options=page.locator('.capture-answers button')
    if options.first.is_disabled():page.get_by_role('button',name='播放題目音檔',exact=True).click()
    expect(options.first).to_be_enabled(timeout=20000);options.nth(answer).tap()
    if i==0:
     expect(page.locator('#capture-title')).to_contain_text('2／3');page.get_by_role('button',name='稍後繼續',exact=True).click();page.reload();expect(page.locator('#capture-title')).to_contain_text('2／3')
   expect(page.locator('#capture-title')).to_contain_text('加入了');after=oracle();assert after['outcome'] in ['joined','duplicate'] and len(after['trial']['answers'])==3
   page.get_by_role('button',name='繼續冒險',exact=True).click();expect(page.locator('.capture-overlay')).to_have_count(0)
   page.locator('.family-nav button').first.click();page.evaluate('scrollTo({top:0,behavior:"instant"})');page.wait_for_timeout(500);assert page.locator('.harbor-departure-start').is_visible();page.locator('.harbor-departure-start').click();page.locator('.ready-start, .course-picker-card').first.wait_for();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');rows.append({'engine':engine,'grade':grade,'captureThreeCorrect':True,'closeReloadResume':True,'joinedOrDuplicateSaved':after['outcome'],'nextChallengeReachable':True});c.close();print('PASS capture',engine,grade,flush=True)
  b.close()
assert not errors,errors
(OUT/'capture-results.json').write_text(json.dumps({'checks':rows,'pageErrors':errors,'syntheticOnly':True},indent=2))
