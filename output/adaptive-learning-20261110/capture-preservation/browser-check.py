from playwright.sync_api import sync_playwright, TimeoutError
from pathlib import Path
import json
out=Path('output/adaptive-learning-20261110/capture-preservation');results=[]
with sync_playwright() as pw:
 for engine,w,h in [('webkit',1024,768),('chromium',390,844)]:
  b=getattr(pw,engine).launch(headless=True);p=b.new_page(viewport={'width':w,'height':h});errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.goto('http://127.0.0.1:4398');p.wait_for_load_state('networkidle');p.get_by_label('帳號',exact=True).fill('adaptive_deferred_ui');p.get_by_label('密碼',exact=True).fill('2947');p.get_by_role('button',name='登入，繼續冒險 →').click();p.get_by_role('button',name='登出',exact=True).wait_for()
  try:p.get_by_role('button',name='先學會，再接續降服',exact=True).wait_for(timeout=5000)
  except TimeoutError:p.get_by_role('button',name='繼續降服挑戰',exact=True).click()
  p.get_by_role('button',name='先學會，再接續降服',exact=True).wait_for();assert p.locator('.capture-answers').count()==0
  p.screenshot(path=str(out/f'{engine}-deferred-capture.png'),full_page=True)
  p.get_by_role('button',name='先學會，再接續降服',exact=True).click();p.locator('.study-session').wait_for();assert p.locator('.capture-overlay').count()==0
  p.screenshot(path=str(out/f'{engine}-capture-preparation.png'),full_page=True)
  assert not p.evaluate('document.documentElement.scrollWidth>innerWidth+1');assert not errors,errors
  results.append({'engine':engine,'viewport':[w,h],'pendingCaptureVisible':True,'noQuestionOrChoicesBeforeReadiness':True,'prepareOpensLearning':True,'pageErrors':errors});b.close()
(out/'browser-results.json').write_text(json.dumps(results,indent=2)+'\n');print(results)
