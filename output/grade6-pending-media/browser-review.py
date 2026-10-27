from playwright.sync_api import sync_playwright
from pathlib import Path
import json,subprocess,re
out=Path('output/grade6-pending-media');base='http://127.0.0.1:4199';subprocess.run(['node',str(out/'seed-review.mjs')],check=True)
with sync_playwright() as p:
 b=p.webkit.launch();c=b.new_context(storage_state='tmp/alston-browser-session.json',viewport={'width':820,'height':1180});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def intercept(r):
  print('FIGURE',r.request.url,flush=True)
  r.continue_() if '?retry=' in r.request.url else r.abort()
 c.route('**/exams/grade6/**',intercept)
 page.goto(base,wait_until='networkidle');page.get_by_role('button',name=re.compile('接續複習 ·')).click();page.get_by_role('button',name='重新載入題圖').wait_for();assert page.locator('[data-answer-option]:disabled').count()==4
 page.get_by_role('button',name='重新載入題圖').click();page.wait_for_timeout(1000);print(page.locator('.question-figure').inner_html(),flush=True);page.wait_for_function("document.querySelector('.question-figure img')?.naturalWidth>0",polling=100);page.wait_for_function("!document.querySelector('[data-answer-option]').disabled")
 result=[]
 for width,height in [(390,844),(820,1180),(1180,820),(1440,900)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');page.screenshot(path=str(out/f'review-figure-{width}.png'),full_page=True);result.append({'viewport':[width,height],'noOverflow':True,'failedLoadBlockedAnswers':True,'retryRecovered':True})
 assert not errors; b.close()
(out/'browser-review-results.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
