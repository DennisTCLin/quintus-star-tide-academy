from playwright.sync_api import sync_playwright
import json
from pathlib import Path
OUT=Path('output/adaptive-learning-20261110/expanded/browser');OUT.mkdir(exist_ok=True,parents=True)
results=[]
with sync_playwright() as pw:
 for engine,width,height,g in [('chromium',390,844,1),('webkit',1024,768,4),('chromium',375,812,6)]:
  browser=getattr(pw,engine).launch(headless=True);page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:4398');page.wait_for_load_state('networkidle');page.get_by_label('帳號',exact=True).fill(f'adaptive_release_ui_g{g}');page.get_by_label('密碼',exact=True).fill('2947');page.get_by_role('button',name='登入，繼續冒險 →').click()
  page.get_by_role('button',name='跟著我學',exact=True).wait_for();page.get_by_role('button',name='跟著我學',exact=True).click();page.get_by_role('button',name='還沒教，我想先學',exact=True).wait_for();page.get_by_role('button',name='還沒教，我想先學',exact=True).click()
  page.get_by_text('這一題需要的知識',exact=True).wait_for();page.screenshot(path=str(OUT/f'{engine}-g{g}-teaching.png'),full_page=True)
  prompt=page.locator('.study-session').inner_text()
  assert '答案：' in prompt and '看過解法後先練一次' in prompt
  page.get_by_role('button',name='看懂了，我來練習',exact=True).click();page.get_by_role('region',name='複習題目').wait_for();assert page.locator('.study-session .answer-grid button').count()>=2
  assert page.locator('.study-session .answer-grid button').first.is_enabled()
  page.locator('.study-session .answer-grid button').first.click();page.get_by_role('button',name='看懂了，下一題',exact=True).wait_for();page.get_by_role('button',name='看懂了，下一題',exact=True).click();page.get_by_text('這一題需要的知識',exact=True).wait_for()
  next_text=page.locator('.study-session').inner_text();assert next_text!=prompt
  page.get_by_role('button',name='先休息',exact=True).click();page.get_by_role('button',name='接續複習 · 第 2 題',exact=True).wait_for();page.reload();page.get_by_role('button',name='接續複習 · 第 2 題',exact=True).wait_for();page.get_by_role('button',name='接續複習 · 第 2 題',exact=True).click();page.get_by_text('這一題需要的知識',exact=True).wait_for()
  assert page.locator('.study-session').inner_text()==next_text
  overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth+1');assert not overflow
  page.screenshot(path=str(OUT/f'{engine}-g{g}-resume.png'),full_page=True)
  assert not errors,errors
  results.append({'engine':engine,'viewport':[width,height],'grade':g,'scope_to_teaching':True,'actual_example_visible':True,'practice_choices_visible':True,'next_item_teaching':True,'reload_resume_same_item':True,'horizontal_overflow':overflow,'page_errors':errors})
  browser.close()
(OUT/'browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False))
