from playwright.sync_api import sync_playwright
import json
out=[]
with sync_playwright() as p:
 b=p.webkit.launch(headless=True)
 for width,height in [(390,844),(820,1180),(1180,820),(1440,900)]:
  c=b.new_context(storage_state='tmp/alston-browser-session.json',viewport={'width':width,'height':height});page=c.new_page();page.set_default_timeout(12000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4199',wait_until='networkidle')
  if page.get_by_role('button',name='繼續國語',exact=True).count():page.get_by_role('button',name='繼續國語',exact=True).click()
  if page.get_by_role('button',name='▶ 開始這題',exact=True).count():page.get_by_role('button',name='▶ 開始這題',exact=True).click()
  page.locator('[data-answer-option]').first.wait_for();assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),width
  assert '6 年級' in page.locator('body').inner_text();assert page.locator('[data-answer-option]').count()>=3
  page.screenshot(path=f'output/grade6-completion/long-question-{width}.png',full_page=True);assert not errors,errors
  out.append({'width':width,'height':height,'overflow':False,'errors':errors});c.close()
 b.close()
print(json.dumps(out));open('output/grade6-completion/long-browser-results.json','w').write(json.dumps(out,indent=2))
