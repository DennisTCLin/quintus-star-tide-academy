from playwright.sync_api import sync_playwright
import json,uuid
results=[]
baseline=set(sum(json.load(open('scripts/imports/grade6-supplement-baseline.json'))['idsByCourse'].values(),[]))
with sync_playwright() as p:
 b=p.webkit.launch(headless=True)
 for course,label in [('chinese','國語'),('science','自然'),('social','社會')]:
  c=b.new_context(storage_state='tmp/alston-browser-session.json',viewport={'width':820,'height':1180});page=c.new_page();page.set_default_timeout(15000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  st=c.request.get('http://127.0.0.1:4199/api/state').json();run=st['family']['profiles']['alston'].get('run')
  if run and run['status']=='active':
   r=c.request.post('http://127.0.0.1:4199/api/command',headers={'Origin':'http://127.0.0.1:4199','X-CSRF-Token':st['csrf']},data={'id':str(uuid.uuid4()),'revision':st['family']['revision'],'command':{'type':'quit','player':'alston','runId':run['id']}});assert r.status==200,r.text()
  page.goto('http://127.0.0.1:4199',wait_until='networkidle');assert page.locator('.subject-island-card').count()==5
  if course=='chinese':page.screenshot(path='output/grade6-completion/tablet-five-islands.png',full_page=True)
  page.get_by_role('button',name='開始'+label,exact=True).click();page.get_by_role('button',name='▶ 開始這題',exact=True).click();page.locator('[data-answer-option]').first.wait_for()
  current=c.request.get('http://127.0.0.1:4199/api/state').json()['questions']['alston'];assert current['id'] not in baseline,current['id'];assert current['course']==course
  for width,height in [(390,844),(820,1180),(1180,820),(1440,900)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(200)
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(course,width)
   assert page.locator('[data-answer-option]').count()==4
   assert '6 年級' in page.locator('body').inner_text()
   page.screenshot(path=f'output/grade6-completion/{course}-{width}.png',full_page=True)
   results.append({'course':course,'question':current['id'],'newQuestion':True,'width':width,'height':height,'overflow':False,'pageErrors':list(errors)})
  assert not errors,errors
  c.close()
 b.close()
open('output/grade6-completion/browser-results.json','w').write(json.dumps(results,indent=2));print(json.dumps(results))
