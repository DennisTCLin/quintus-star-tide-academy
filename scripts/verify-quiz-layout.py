from playwright.sync_api import sync_playwright
import subprocess,json
base='http://127.0.0.1:4210'
fixture=subprocess.check_output(['node','--input-type=module','-e',"import{newFamily,startRun,questionById,taipeiDay}from'./build/game.mjs';const family=newFamily();startRun(family,'feifei','math','edge-fixture',0);const r=family.profiles.feifei.run;console.log(JSON.stringify({family,questions:{feifei:questionById(r.questions[0])},username:'fixture',playerId:'feifei',displayName:'婓婓',csrf:'fixture',day:taipeiDay(),verified:{quintus:0,feifei:0,qingqing:0,doudou:0},legacy:false,canMigrate:false}));"],text=True)
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);checks=[]
 for width,height,reduced in [(320,900,False),(390,844,False),(1440,1000,False),(320,568,True),(640,360,True),(360,800,False)]:
  ctx=b.new_context(viewport={'width':width,'height':height},reduced_motion='reduce' if reduced else 'no-preference');page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body=fixture));page.goto(base);page.locator('.course-card').first.click();page.locator('.quiz-stage').wait_for()
  if width==360:page.evaluate('document.documentElement.style.fontSize="200%"')
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(width,height)
  assert page.locator('.quiz-hud rt').count()>0,'missing grade2ruby'
  buttons=page.locator('.answer-grid [data-answer-option]');buttons.first.scroll_into_view_if_needed()
  # Hit test verifies the sticky scene does not steal the answer click.
  assert buttons.first.evaluate('(el)=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'),(width,height,'covered answer')
  if height<600:assert page.locator('.quiz-encounter').evaluate('e=>getComputedStyle(e).position')=='relative'
  if reduced:assert page.locator('.quiz-stage [data-sprite=animated]').count()==0
  page.screenshot(path=f'/tmp/quiz-edge-{width}-{height}.png',full_page=True)
  assert not errors,errors
  checks.append([width,height,reduced,'PASS']);ctx.close()
 # Missing monster and atlas assets keep a usable picture/icon and scene.
 ctx=b.new_context(viewport={'width':390,'height':844});page=ctx.new_page();page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body=fixture));page.route('**/assets/battle/**',lambda r:r.abort());page.goto(base);page.locator('.course-card').first.click();page.locator('.quiz-monster > span').wait_for();assert page.locator('.quiz-stage [data-sprite=still] img').count()==1;checks.append(['asset-fallback','PASS'])
 print(json.dumps(checks));b.close()
