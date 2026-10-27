exec(open('output/ready-screen/layout-qa.py').read().split('with sync_playwright() as p:')[0])
fixtures=json.loads((OUT/'fixtures.json').read_text());checks=[]
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=p.chromium.launch(channel='chrome',headless=True) if engine=='chromium' else p.webkit.launch(headless=True)
  c=b.new_context(viewport={'width':390,'height':744});page=c.new_page();page.set_default_timeout(15000)
  # Reset only our isolated synthetic fixture between engines.
  import subprocess
  subprocess.run(['node','output/ready-screen/reset-six.mjs'],check=True)
  page.route('**/exams/grade6/**',lambda route:route.abort())
  page.goto(BASE);page.wait_for_load_state('networkidle');page.get_by_placeholder('英文字母、數字或底線').fill('ready_6');page.get_by_placeholder('請輸入密碼').fill('0742');page.get_by_role('button',name='登入，繼續冒險 →').click();page.get_by_role('button',name='繼續挑戰',exact=True).click()
  retry=page.get_by_role('button',name='↻ 重新載入題圖',exact=True);retry.wait_for()
  state=page.evaluate('async()=>await(await fetch("/api/state")).json()');pid=state['playerId'];assert state['family']['profiles'][pid]['run']['challenge']['clock'] is None;assert pid not in state['questions'];assert set(state['questionAssets'][pid])=={'runId','index','images'}
  page.get_by_role('button',name='回到港口',exact=True).click();page.wait_for_timeout(300);assert page.evaluate('async()=>{const s=await(await fetch("/api/state")).json();return s.family.profiles[s.playerId].run.challenge.clock}') is None
  page.get_by_role('button',name='繼續挑戰',exact=True).click();retry.wait_for();page.unroute('**/exams/grade6/**');second=fixtures[-1]['questions'][1]['image'];page.route('**'+second,lambda route:route.abort());retry.click();page.locator('.ready-start:not([disabled])').wait_for();page.locator('.ready-start').click();page.locator('[data-answer-option]').first.wait_for()
  state=page.evaluate('async()=>await(await fetch("/api/state")).json()');clock=state['family']['profiles'][pid]['run']['challenge']['clock'];assert clock is not None
  page.locator('[data-answer-option]').nth(fixtures[-1]['questions'][0]['answer']).click();retry.wait_for()
  state=page.evaluate('async()=>await(await fetch("/api/state")).json()');r=state['family']['profiles'][pid]['run'];assert r['index']==1 and r['challenge']['clock'] is None
  # A background page may preload, but must not start the next question clock.
  page.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))')
  page.unroute('**'+second);retry.click();page.locator('.ready-start:not([disabled])').wait_for();page.wait_for_timeout(400)
  assert page.evaluate('async()=>{const s=await(await fetch("/api/state")).json();return s.family.profiles[s.playerId].run.challenge.clock}') is None
  page.locator('.ready-help summary').click();page.get_by_role('button',name='結束這場',exact=True).click();page.locator('dialog[open]').wait_for()
  page.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>false});document.dispatchEvent(new Event("visibilitychange"))');page.wait_for_timeout(1200)
  assert page.evaluate('async()=>{const s=await(await fetch("/api/state")).json();return s.family.profiles[s.playerId].run.challenge.clock}') is None
  page.get_by_role('button',name='▶ 繼續',exact=True).click();page.locator('[data-answer-option]').first.wait_for()
  state=page.evaluate('async()=>await(await fetch("/api/state")).json()');r=state['family']['profiles'][pid]['run'];assert r['index']==1 and r['challenge']['clock'] is not None
  current=r['challenge']['clock'];page.reload();page.get_by_role('button',name='繼續挑戰',exact=True).click();page.locator('[data-answer-option]').first.wait_for();state=page.evaluate('async()=>await(await fetch("/api/state")).json()');assert state['family']['profiles'][pid]['run']['challenge']['clock']==current
  checks.append({'engine':engine,'initialFailureNoClock':True,'leaveDoesNotStart':True,'retryThenStart':True,'nextFigureFailureNoClock':True,'backgroundPreloadNoClock':True,'resumeAutoStarts':True,'reloadKeepsClock':True,'quitModalBlocksAutoStart':True});c.close();b.close()
 (OUT/'flow-results.json').write_text(json.dumps(checks,indent=2));print('Flow PASS',len(checks))
