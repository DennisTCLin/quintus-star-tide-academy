from playwright.sync_api import sync_playwright
import time,json,subprocess
base='http://127.0.0.1:4210'
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);c=b.new_context(viewport={'width':390,'height':844});page=c.new_page();page.set_default_timeout(15000)
 page.goto(base);page.get_by_role('button',name='第一次來？建立帳號').click();page.get_by_label('帳號',exact=True).fill('retry_'+str(int(time.time())));page.get_by_label('密碼',exact=True).fill('local-retry-check-2026');page.get_by_role('button',name='建立帳號 →',exact=True).click();page.get_by_label('我已安全保存復原碼').check();page.get_by_role('button',name='進入星潮學院 →').click();page.get_by_role('button',name='選擇Quintus，4年級').click()
 with page.expect_response(lambda r:r.url.endswith('/api/command')) as response:page.locator('.course-card').first.click()
 q=response.value.json()['questions']['quintus'];answer=int(subprocess.check_output(['node','--input-type=module','-e',"import{questionById}from'./build/game.mjs';console.log(questionById(process.argv[1]).answer)",q['id']],text=True))
 c.set_offline(True);page.wait_for_timeout(200);assert page.locator('.answer-grid [data-answer-option]').nth(answer).is_disabled();c.set_offline(False);page.wait_for_function('()=>!document.querySelector(".answer-grid [data-answer-option]").disabled')
 ids=[]
 def lose(route):
  ids.append(route.request.post_data_json['id'])
  response=route.fetch()
  if len(ids)==1:route.abort('connectionreset')
  else:route.fulfill(response=response)
 page.route('**/api/command',lose)
 page.locator('.answer-grid [data-answer-option]').nth(answer).click();page.wait_for_function('()=>document.querySelector(".quiz-stage").dataset.hits==="1"')
 assert len(ids)==2 and ids[0]==ids[1],ids
 state=page.request.get(base+'/api/state').json();profile=state['family']['profiles']['quintus'];assert sum(profile['growth']['xp'].values())==10
 page.reload();page.get_by_role('button',name='選擇Quintus，4年級').click();page.locator('.course-card').first.click();assert page.locator('.quiz-stage').get_attribute('data-phase')=='idle';assert page.locator('.quiz-stage').get_attribute('data-hits')=='1'
 print(json.dumps({'offline_answers_disabled':True,'lost_response_retry_same_id':True,'xp_once':10,'reload_does_not_replay':True}))
 b.close()
