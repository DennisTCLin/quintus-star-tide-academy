"""Local-only UI verification with disposable test account; no real player data."""
from playwright.sync_api import sync_playwright
import json,subprocess,time,os
base=os.environ.get('CLOUD_TEST_URL','http://127.0.0.1:4197')
assert '127.0.0.1' in base, 'This test creates disposable local accounts only'
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 a=browser.new_context(viewport={'width':390,'height':844});b=browser.new_context(viewport={'width':1280,'height':900})
 left=a.new_page();right=b.new_page();errors=[]
 for page in [left,right]:page.set_default_timeout(12000);page.on('pageerror',lambda e:errors.append(str(e)))
 account={'username':'ui_'+str(int(time.time())),'password':'browser-test-passphrase-2026'}
 left.goto(base);left.get_by_role('button',name='第一次來？建立帳號').click();left.get_by_label('家庭帳號',exact=True).fill(account['username']);left.get_by_label('密碼',exact=True).fill(account['password']);left.get_by_role('button',name='建立帳號 →',exact=True).click();left.get_by_text('收好你的帳號復原碼',exact=True).wait_for();print('registered',flush=True)
 assert len(left.locator('.recovery-code').inner_text())==64
 # Onboarding must not disappear when the automatic refresh interval elapses.
 left.wait_for_timeout(3500);assert left.locator('.recovery-code').is_visible()
 left.get_by_label('我已安全保存復原碼').check();left.get_by_role('button',name='進入星潮學院 →').click();left.locator('.profile-card').first.wait_for()
 assert left.locator('.profile-card').count()==4
 right.goto(base);right.get_by_label('家庭帳號',exact=True).fill(account['username']);right.get_by_label('密碼',exact=True).fill(account['password']);right.get_by_role('button',name='登入，繼續冒險 →').click();right.locator('.profile-card').first.wait_for()
 print('both logged in',flush=True)
 for page in [left,right]:page.get_by_role('button',name='選擇Quintus，4年級').click()
 with left.expect_response(lambda r:r.url.endswith('/api/command')) as response:left.locator('.course-card').first.click()
 state=response.value.json();question=state['questions']['quintus'];assert 'answer' not in question
 answer=int(subprocess.check_output(['node','--input-type=module','-e',"import{questionById}from'./build/game.mjs';console.log(questionById(process.argv[1]).answer)",question['id']],text=True))
 with left.expect_response(lambda r:r.url.endswith('/api/command')) as response:left.locator('.answer-grid [data-answer-option]').nth(answer).click()
 assert response.value.json()['verified']['quintus']==20
 print('answered',flush=True)
 # Independent device receives committed score without manual refresh.
 right.wait_for_function("() => [...document.querySelectorAll('.harbor-strip b')].some(x=>x.textContent==='20')",timeout=12000)
 print('cross device synchronized',flush=True)
 a.set_offline(True);left.wait_for_timeout(200)
 assert left.get_by_text('離線・暫停計分',exact=False).count()>=1
 assert left.get_by_role('button',name='➜ 下一題').is_disabled()
 a.set_offline(False);left.get_by_text('☁ 已儲存至雲端',exact=False).wait_for(timeout=15000)
 print('network reconnected',flush=True)
 left.reload();left.locator('.profile-card').first.wait_for();left.get_by_role('button',name='選擇Quintus，4年級').click()
 assert '20' in left.locator('.harbor-strip').inner_text()
 # Latest battle animation and quiz feature survives integration.
 left.locator('.family-nav button').nth(5).click()
 left.locator('.pet-picker button').first.click();left.get_by_role('button',name='⚔️ 開始對戰',exact=True).click()
 with left.expect_response(lambda r:r.url.endswith('/api/practice')) as response:left.locator('.battle-study button').click()
 quiz=response.value.json();assert 'answer' not in quiz
 answer=int(subprocess.check_output(['node','--input-type=module','-e',"import{questionById}from'./build/game.mjs';console.log(questionById(process.argv[1]).answer)",quiz['id']],text=True))
 with left.expect_response(lambda r:r.url.endswith('/api/practice')) as response:left.locator('.battle-question .answer-grid [data-answer-option]').nth(answer).click()
 assert response.value.status==200
 left.locator('.battle-quiz-result').wait_for();assert '獲得技能加成' in left.locator('.battle-quiz-result').inner_text()
 left.get_by_role('button',name='➜ 回到戰鬥',exact=True).click();left.locator('.combat-buff').wait_for();left.wait_for_timeout(1300)
 left.locator('.battle-controls button').first.click();left.locator('.battle-field.effect-attack').wait_for();left.screenshot(path='/tmp/star-tide-cloud-battle.png',full_page=True)
 print('battle animation and server quiz passed',flush=True)
 # All four profiles accessible and no mobile overflow at narrow widths.
 for width in [320,390,720]:
  left.set_viewport_size({'width':width,'height':900});left.reload();left.locator('.profile-card').first.wait_for();assert left.locator('.profile-card').count()==4;assert not left.evaluate('document.documentElement.scrollWidth>innerWidth')
 left.set_viewport_size({'width':390,'height':844});left.screenshot(path='/tmp/star-tide-cloud-profiles.png',full_page=True)
 left.get_by_role('button',name='登出',exact=True).click();left.get_by_role('heading',name='歡迎回到星潮').wait_for();assert left.locator('.profile-card').count()==0
 assert not errors,errors
 b.storage_state(path='/tmp/star-tide-cloud-hero-session.json')
 print(json.dumps({'cross_device_score':20,'offline_guard':True,'reload_persistence':True,'logout_isolation':True,'mobile_widths':[320,390,720],'browser_errors':errors}))
 browser.close()
