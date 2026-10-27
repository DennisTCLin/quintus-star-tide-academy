"""Exercise real server storage using a newly registered, isolated QA account."""
import json, os, re, subprocess, uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('MONSTER_QA_URL','http://127.0.0.1:4199').rstrip('/')
OUT=ROOT/'outputs/monster-bestiary'
sync_retries=[]
def command(page, target):
 # Background state polling can reject a click before any command is sent.
 # Retry only that explicit local busy notice; never replay an unknown outcome.
 for attempt in range(3):
  sent=[]
  def track(request):
   if request.url.endswith('/api/command'):sent.append(request.url)
  page.on('request',track)
  try:
   with page.expect_response(lambda r:r.url.endswith('/api/command'),timeout=15000) as response:target.click()
   result=response.value;assert result.ok,result.text()
   return result.json()
  except PlaywrightTimeoutError:
   notice=page.locator('.notice').all_inner_texts()
   if not sent and any('正在同步，請稍後再試' in text for text in notice):
    sync_retries.append({'attempt':attempt+1,'reason':'background poll busy; no command request sent'})
    page.wait_for_timeout(200)
    continue
   page.screenshot(path=str(OUT/'cloud-failure.png'),full_page=True)
   print(json.dumps({'failure':'command timeout','sent':len(sent),'notice':notice},ensure_ascii=False),flush=True)
   raise
  finally:page.remove_listener('request',track)
 raise AssertionError('Background sync remained busy after three attempts')
def correct(q):return int(subprocess.check_output(['node','--input-type=module','-e',"import{questionById}from'./build/game.mjs';console.log(questionById(process.argv[1]).answer)",q['id']],cwd=ROOT))
snapshot=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{newFamily}from'./build/game.mjs';console.log(JSON.stringify(newFamily()))"],cwd=ROOT))
with sync_playwright() as pw:
 b=pw.chromium.launch(channel='chrome',headless=True);ctx=b.new_context(viewport={'width':1440,'height':1000});other=b.new_context()
 username='qa_monster_'+uuid.uuid4().hex[:12];password='monster-qa-passphrase-2026';headers={'Origin':BASE}
 r=ctx.request.post(BASE+'/api/register',data={'username':username,'password':password},headers=headers);assert r.ok,r.text();s=r.json()
 r=ctx.request.post(BASE+'/api/migrate',data={'id':str(uuid.uuid4()),'revision':s['family']['revision'],'snapshot':snapshot},headers={**headers,'X-CSRF-Token':s['csrf']});assert r.ok,r.text()
 r=other.request.post(BASE+'/api/login',data={'username':username,'password':password},headers=headers);assert r.ok,r.text()
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);page.get_by_role('button',name='選擇Quintus，4年級').click()
 s=command(page,page.locator('.training-start'));run=s['family']['profiles']['quintus']['run'];variant=run['encounter']['variant'];family=run['encounter']['monster']
 assert variant and s['family']['profiles']['quintus']['lastMonsterVariant']==variant
 assert other.request.get(BASE+'/api/state').json()['family']['profiles']['quintus']['run']['encounter']==run['encounter']
 q=s['questions']['quintus'];answer=correct(q)
 s=command(page,page.locator('.answer-grid [data-answer-option]').nth((answer+1)%len(q['options'])))
 assert s['family']['profiles']['quintus']['growth']['xp']=={}
 page.locator('.quiz-stage.action-guard').wait_for();page.wait_for_function('()=>document.querySelector(".quiz-stage").dataset.phase==="idle"')
 for i in range(5):
  s=command(page,page.locator('.answer-grid [data-answer-option]').nth(answer))
  p=s['family']['profiles']['quintus'];assert p['growth']['xp'][run['companion']]==10*(i+1);assert p['run']['encounter']['variant']==variant
  page.wait_for_function('(hits)=>document.querySelector(".quiz-stage").dataset.hits===String(hits)&&document.querySelector(".quiz-stage").dataset.phase==="idle"',arg=i+1)
  assert page.locator('[aria-label="怪物體力"]').get_attribute('aria-valuenow')==str(80-i*20)
  if i==1:
   page.locator('.quiz-bestiary-link button').click();page.locator('.monster-grid').wait_for();page.locator('.bestiary-top button').last.click();assert page.locator('.quiz-stage').get_attribute('data-hits')=='2'
  if i<4:
   s=command(page,page.get_by_role('button',name=re.compile('下一題')))
   answer=correct(s['questions']['quintus'])
 assert p['run']['status']=='won' and p['run']['reward']=='pending'
 page.screenshot(path=str(OUT/'cloud-victory.png'),full_page=True)
 page.reload();page.get_by_role('button',name='選擇Quintus，4年級').click();page.locator('.training-resume').click()
 assert page.locator('.quiz-stage').get_attribute('data-hits')=='5'
 assert other.request.get(BASE+'/api/state').json()['family']['profiles']['quintus']['run']['encounter']['variant']==variant
 s=command(page,page.locator('.reward-save'))
 assert s['family']['profiles']['quintus']['rewardStars']==1
 page.get_by_role('button',name=re.compile('回港口')).click()
 s=command(page,page.locator('.training-start'))
 new=s['family']['profiles']['quintus']['run'];assert new['encounter']['monster']!=family and new['encounter']['variant']!=variant
 assert not errors,errors
 report={'url':BASE,'isolatedAccount':username,'result':'PASS','checks':['server selects and persists variant','cross-device identity','wrong-answer shield, five corrected hits and 50XP','bestiary and return preserve progress','reload preserves completed encounter and pending reward','claim one star','next voyage uses a different family'],'pageErrors':errors,'backgroundSyncRetries':sync_retries}
 (OUT/('production-cloud-verification.json' if BASE.startswith('https:') else 'cloud-verification.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False));b.close()
