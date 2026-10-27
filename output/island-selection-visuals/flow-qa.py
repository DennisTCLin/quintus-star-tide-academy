from playwright.sync_api import sync_playwright
import json
from pathlib import Path
out=[]
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=p.chromium.launch(channel='chrome',headless=True) if engine=='chromium' else p.webkit.launch(headless=True)
  c=b.new_context(viewport={'width':390,'height':844});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  # This UI verification must not invoke paid AI or TTS services.
  page.route('**/api/dragon/**',lambda route:route.fulfill(status=503,content_type='application/json',body='{"error":"QA offline"}'))
  page.goto('http://localhost:4358');page.get_by_placeholder('英文字母、數字或底線').fill('island_1');page.get_by_placeholder('請輸入密碼').fill('0742');page.get_by_role('button',name='登入，繼續冒險 →').click();page.locator('.journey-card').wait_for();page.wait_for_load_state('networkidle')
  snapshot=lambda:page.evaluate('async()=>{const s=await(await fetch("/api/state")).json();return s.family.profiles[s.playerId].run}')
  before=snapshot()
  page.locator('.archipelago-stop[aria-label="從群島開始數學"]').click();dialog=page.get_by_role('dialog',name='前往另一座島');dialog.wait_for();assert '結束這一趟' in dialog.inner_text();assert snapshot()['id']==before['id'];dialog.get_by_role('button',name='關閉',exact=True).click()
  # Normal-flow mascot entry opens the same modal; closing restores focus.
  page.locator('.tide-harbor-entry').click();panel=page.locator('dialog.tide-panel');panel.wait_for();panel.get_by_role('button',name='收起潮光獸',exact=True).click();panel.wait_for(state='hidden');page.wait_for_function("document.querySelector('.tide-harbor-entry')===document.activeElement")
  page.locator('.archipelago-scene').scroll_into_view_if_needed();page.wait_for_timeout(300)
  page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(200);assert not page.locator('.archipelago-atmosphere').count();assert page.locator('.archipelago-toolbar button').is_disabled()
  page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(300);page.locator('.archipelago-toolbar button').click();assert not page.locator('.archipelago-atmosphere').count()
  page.locator('.island-course-details > summary').click();assert page.locator('.subject-island-card:visible').count()==5
  page.evaluate('window.dispatchEvent(new Event("offline"))');page.wait_for_timeout(100);assert page.locator('.journey-resume').is_disabled();assert page.locator('.archipelago-stop:disabled').count()==5;assert snapshot()['id']==before['id']
  page.evaluate('window.dispatchEvent(new Event("online"))');page.wait_for_timeout(500);page.locator('.journey-resume').click();page.locator('.ready-start').wait_for();assert snapshot()['id']==before['id'];assert snapshot()['challenge']['clock'] is None
  assert not errors,errors
  out.append({'engine':engine,'switchConfirmationPreservesRun':True,'inlineCompanionOpenCloseFocus':True,'reduceMotionAndPause':True,'allSubjectsAccessible':True,'offlineBlocks':True,'resumeKeepsRunAndClock':True,'errors':errors});c.close();b.close()
Path('output/island-selection-visuals/flow-results.json').write_text(json.dumps(out,indent=2));print('Flow PASS',len(out))
