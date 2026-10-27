from playwright.sync_api import sync_playwright
from pathlib import Path
import json,subprocess
base='http://127.0.0.1:4199';out=Path('output/grade6-pending-media');results=[]
with sync_playwright() as p:
 b=p.webkit.launch(headless=True)
 for course,label in [('science','自然'),('social','社會')]:
  subprocess.run(['node',str(out/'seed-figure-run.mjs'),course],check=True)
  c=b.new_context(storage_state='tmp/alston-browser-session.json',viewport={'width':820,'height':1180});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  # First load intentionally fails; retry succeeds using the original reviewed asset.
  def figure_route(route):
   print('FIGURE_REQUEST',route.request.url,flush=True)
   route.continue_() if '?retry=' in route.request.url else route.abort()
  c.route('**/exams/grade6/**',figure_route)
  page.goto(base,wait_until='networkidle');page.get_by_role('button',name='繼續'+label,exact=True).click();page.get_by_role('button',name='▶ 開始這題',exact=True).click()
  page.get_by_role('button',name='重新載入題圖').wait_for();buttons=page.locator('[data-answer-option]');assert buttons.count()==4
  assert all(buttons.nth(i).is_disabled() for i in range(4))
  page.get_by_role('button',name='重新載入題圖').click();page.wait_for_timeout(1000);print('AFTER_RETRY',page.locator('.question-figure').inner_html(),flush=True);page.wait_for_function("document.querySelector('.question-figure img')?.naturalWidth>0");page.wait_for_function("!document.querySelector('[data-answer-option]').disabled")
  c.unroute('**/exams/grade6/**')
  q=c.request.get(base+'/api/state').json()['questions']['alston'];assert q['image'];assert 'answer' not in q;assert 'explanation' not in q
  for width,height in [(390,844),(820,1180),(1180,820),(1440,900)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(course,width)
   img=page.locator('.question-figure img');assert img.evaluate('(img)=>img.complete&&img.naturalWidth>0')
   rect=img.bounding_box();assert rect['width']<=width and rect['height']>20
   page.screenshot(path=str(out/f'{course}-figure-{width}.png'),full_page=True)
   results.append({'course':course,'question':q['id'],'viewport':[width,height],'figureVisible':True,'noOverflow':True,'failedLoadBlockedAnswers':True,'retryRecovered':True,'apiAnswerHidden':True})
  with page.expect_popup() as popup:page.get_by_role('link',name='放大看題圖（另開視窗）').click()
  zoom=popup.value;zoom.wait_for_load_state();assert '/exams/grade6/' in zoom.url;assert zoom.locator('img').evaluate('(img)=>img.naturalWidth>0');zoom.close();assert not errors,errors;c.close()
 # Read-only HTTP validation of every used original figure.
 req=b.new_context();manifest=json.loads((out/'media-manifest.json').read_text())
 for asset in manifest:
  r=req.request.get(base+asset['asset']);assert r.status==200;assert r.headers['content-type'].startswith('image/webp')
 req.close();b.close()
(out/'browser-figure-results.json').write_text(json.dumps({'checks':results,'allFigureHttp200':len(manifest),'browser':'WebKit emulation; not physical iPad'},indent=2)+'\n');print(json.dumps(results))
