from playwright.sync_api import sync_playwright
import json,time,subprocess
# Creates disposable local accounts only.
base='http://127.0.0.1:4210'
def correct(q):return int(subprocess.check_output(['node','--input-type=module','-e',"import{questionById}from'./build/game.mjs';console.log(questionById(process.argv[1]).answer)",q['id']],text=True))
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);a=b.new_context(viewport={'width':390,'height':844});c=b.new_context(viewport={'width':1440,'height':1000});page=a.new_page();other=c.new_page();errors=[]
 for x in [page,other]:x.on('pageerror',lambda e:errors.append(str(e)));x.set_default_timeout(12000)
 username='quiz_ui_'+str(int(time.time()));password='quiz-ui-passphrase-2026'
 page.goto(base);page.get_by_role('button',name='第一次來？建立帳號').click();page.get_by_label('帳號',exact=True).fill(username);page.get_by_label('密碼',exact=True).fill(password);page.get_by_role('button',name='建立帳號 →',exact=True).click();page.get_by_label('我已安全保存復原碼').check();page.get_by_role('button',name='進入星潮學院 →').click();page.get_by_role('button',name='選擇Quintus，4年級').click()
 other.goto(base);other.get_by_label('帳號',exact=True).fill(username);other.get_by_label('密碼',exact=True).fill(password);other.get_by_role('button',name='登入，繼續冒險 →').click();other.get_by_role('button',name='選擇Quintus，4年級').click()
 with page.expect_response(lambda r:r.url.endswith('/api/command')) as r:page.locator('.course-card').first.click()
 state=r.value.json();q=state['questions']['quintus'];answer=correct(q)
 page.locator('.quiz-stage').wait_for();assert page.locator('[aria-label="怪物體力"]').get_attribute('aria-valuenow')=='100'
 page.screenshot(path='/tmp/quiz-mobile-before.png',full_page=True)
 with page.expect_response(lambda r:r.url.endswith('/api/command')) as r:page.locator('.answer-grid [data-answer-option]').nth((answer+1)%len(q['options'])).click()
 assert r.value.json()['family']['profiles']['quintus']['growth']['xp']=={}
 page.locator('.quiz-stage.action-guard').wait_for();assert '護盾' in page.locator('.quiz-message').inner_text()
 for i in range(5):
  with page.expect_response(lambda r:r.url.endswith('/api/command')) as r:page.locator('.answer-grid [data-answer-option]').nth(answer).click()
  state=r.value.json();profile=state['family']['profiles']['quintus'];run=profile['run'];assert profile['growth']['xp'][run['companion']]==10*(i+1)
  page.wait_for_function('(hits)=>document.querySelector(".quiz-stage").dataset.hits===String(hits)',arg=i+1)
  print('hit',i+1,'phase',page.locator('.quiz-stage').get_attribute('data-phase'),flush=True)
  page.wait_for_function('()=>["impact","settle"].includes(document.querySelector(".quiz-stage").dataset.phase)',polling=20);assert int(page.locator('[aria-label="怪物體力"]').get_attribute('aria-valuenow'))==80-i*20
  if i==0:page.locator('.quiz-stage').screenshot(path='/tmp/quiz-first-impact.png')
  if i==4:
   page.locator('.quiz-level-up').wait_for();page.screenshot(path='/tmp/quiz-level-up.png',full_page=True)
   page.locator('.quiz-stage[data-victory="true"]').wait_for();assert '50 XP' in page.locator('.quiz-message').inner_text() or '10 XP' in page.locator('.quiz-message').inner_text();break
  with page.expect_response(lambda r:r.url.endswith('/api/command')) as r:page.get_by_role('button',name='➜ 下一題').click()
  state=r.value.json();answer=correct(state['questions']['quintus'])
 print('five hits, correction XP and level-up passed',flush=True)
 other.wait_for_function('()=>document.querySelector(".training-level")?.textContent==="Lv.2"')
 page.reload();page.get_by_role('button',name='選擇Quintus，4年級').click();page.locator('.course-card').first.click();page.locator('.quiz-stage').wait_for();assert page.locator('.quiz-stage').get_attribute('data-hits')=='5';assert page.locator('.quiz-stage').get_attribute('data-phase')=='idle'
 for width in [320,390,1440]:
  page.set_viewport_size({'width':width,'height':900});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');page.screenshot(path=f'/tmp/quiz-result-{width}.png',full_page=True)
 page.get_by_role('button',name='存一顆星',exact=False).first.click()
 print('cross-device and reload passed',flush=True)
 assert not errors,errors
 print(json.dumps({'errors':errors,'state':'PASS','user':username}))
 b.close()
