from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path('output/adaptive-learning-20261110/progression-final');results=[]
with sync_playwright() as pw:
 for engine,w,h in [('webkit',1024,768),('chromium',390,844)]:
  b=getattr(pw,engine).launch(headless=True);p=b.new_page(viewport={'width':w,'height':h});errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.goto('http://127.0.0.1:4398');p.get_by_label('帳號',exact=True).fill('adaptive_progression_ui');p.get_by_label('密碼',exact=True).fill('2947');p.get_by_role('button',name='登入，繼續冒險 →').click();p.get_by_role('button',name='登出',exact=True).wait_for()
  p.get_by_text('查看全部科目與夥伴',exact=True).click();p.get_by_role('button',name='去數學島',exact=True).click()
  card=p.locator('.isl-isle').first;card.wait_for();assert '下一關：玩一玩' in card.inner_text();assert '下一關：挑戰神獸' not in card.inner_text()
  p.screenshot(path=str(out/f'{engine}-after-three-correct.png'),full_page=True)
  card.click();boss=p.locator('.isl-stagebtn').nth(2);boss.wait_for();assert boss.is_disabled()
  assert not errors,errors
  p.screenshot(path=str(out/f'{engine}-boss-locked.png'),full_page=True)
  results.append({'engine':engine,'viewport':[w,h],'threeOfSixCompleted':True,'nextStageIsPractice':True,'bossButtonDisabled':True,'pageErrors':errors});b.close()
(out/'browser-results.json').write_text(json.dumps(results,indent=2)+'\n');print(results)
