"""Natural onboarding + combat on an isolated account, without forcing capture RNG."""
import json, os, re, subprocess, time, uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('TAMING_QA_URL','http://127.0.0.1:4242').rstrip('/')
OUT=ROOT/'outputs/creature-taming';OUT.mkdir(parents=True,exist_ok=True)
timings=[];retries=[]
def answer(q):
 return int(subprocess.check_output(['node','--input-type=module','-e',"import{questionById}from'./build/game.mjs';console.log(questionById(process.argv[1]).answer)",q['id']],cwd=ROOT))
def command(page,target):
 for attempt in range(3):
  sent=[]
  def track(req):
   if req.url.endswith('/api/command'):sent.append(True)
  page.on('request',track)
  try:
   started=time.perf_counter()
   with page.expect_response(lambda r:r.url.endswith('/api/command'),timeout=15000) as pending:target.click()
   response=pending.value;assert response.ok,response.text();timings.append(round((time.perf_counter()-started)*1000,1));return response.json()
  except PlaywrightTimeoutError:
   if not sent and any('正在同步，請稍後再試' in t for t in page.locator('.notice').all_inner_texts()):
    retries.append('poll busy, no command sent');page.wait_for_timeout(200);continue
   page.screenshot(path=str(OUT/'live-failure.png'),full_page=True);raise
  finally:page.remove_listener('request',track)
 raise AssertionError('sync remained busy')
with sync_playwright() as pw:
 b=pw.chromium.launch(channel='chrome',headless=True);ctx=b.new_context(viewport={'width':1440,'height':1000});other=b.new_context()
 username='qa_taming_'+uuid.uuid4().hex[:12];password='taming-isolated-qa-2026';headers={'Origin':BASE}
 r=ctx.request.post(BASE+'/api/register',data={'username':username,'password':password},headers=headers);assert r.ok,r.text();s=r.json()
 for kind in ['starter-draw','starter-confirm']:
  r=ctx.request.post(BASE+'/api/command',data={'id':str(uuid.uuid4()),'revision':s['family']['revision'],'command':{'type':kind,'player':'quintus'}},headers={**headers,'X-CSRF-Token':s['csrf']});assert r.ok,r.text();s=r.json()
 starter=s['family']['profiles']['quintus']['equipped'];assert s['family']['profiles']['quintus']['onboarding']['confirmed']
 r=other.request.post(BASE+'/api/login',data={'username':username,'password':password},headers=headers);assert r.ok,r.text()
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);page.get_by_role('button',name='選擇Quintus，4年級').click()
 s=command(page,page.locator('.training-start'));run=s['family']['profiles']['quintus']['run'];combat=run['encounter']['combat'];variant=run['encounter']['variant'];family=run['encounter']['monster']
 assert combat['version']==1 and combat['ally']['level']==1
 assert other.request.get(BASE+'/api/state').json()['family']['profiles']['quintus']['run']['encounter']==run['encounter']
 q=s['questions']['quintus'];choice=answer(q);hp_before=page.locator('[aria-label="怪物體力"]').get_attribute('aria-valuenow')
 s=command(page,page.locator('.answer-grid [data-answer-option]').nth((choice+1)%len(q['options'])))
 assert s['result'] is False and s['family']['profiles']['quintus']['growth']['xp']=={}
 page.wait_for_function('()=>document.querySelector(".quiz-stage").dataset.phase==="idle"')
 assert page.locator('[aria-label="怪物體力"]').get_attribute('aria-valuenow')==hp_before
 hp=[]
 for i in range(5):
  s=command(page,page.locator('.answer-grid [data-answer-option]').nth(choice));p=s['family']['profiles']['quintus']
  assert s['result'] is True and p['growth']['xp'][starter]==10*(i+1)
  assert p['run']['encounter']['combat']==combat
  page.wait_for_function('(hits)=>document.querySelector(".quiz-stage").dataset.hits===String(hits)&&document.querySelector(".quiz-stage").dataset.phase==="idle"',arg=i+1)
  hp.append(int(page.locator('[aria-label="怪物體力"]').get_attribute('aria-valuenow')))
  if i<4:
   s=command(page,page.get_by_role('button',name=re.compile('下一題')));choice=answer(s['questions']['quintus'])
 assert all(hp[i]<=hp[i-1] for i in range(1,5)) and hp[0]<combat['foe']['hp'] and hp[-1]==0
 capture=p['run']['capture'];assert capture['outcome'] in ['joined','duplicate','escaped'] and p['captureQuota']['attempts']==1
 assert s['captureReceipt']['runId']==run['id'] and s['captureReceipt']['outcome']==capture['outcome']
 assert p['learningRewards']['pending']=={'wood':20,'stone':12,'star':6} and p['learningRewards']['packs']==1
 page.locator('.capture-result').wait_for();page.screenshot(path=str(OUT/('production-victory.png' if BASE.startswith('https:') else 'local-victory.png')),full_page=True)
 otherp=other.request.get(BASE+'/api/state').json()['family']['profiles']['quintus'];assert otherp['run']['capture']==capture and otherp['owned']==p['owned'] and otherp['learningRewards']==p['learningRewards']
 if capture['outcome']=='joined':
  assert p['owned'][variant]==1
  s=command(page,page.locator('.capture-result button'));assert s['family']['profiles']['quintus']['equipped']==variant
 page.reload();page.get_by_role('button',name='選擇Quintus，4年級').click();page.locator('.training-resume').click()
 assert page.locator('.quiz-stage').get_attribute('data-hits')=='5'
 assert page.locator('.capture-result').count()==1
 s=command(page,page.locator('.reward-save'));assert s['family']['profiles']['quintus']['rewardStars']==1
 s=command(page,page.get_by_role('button',name='繼續學習',exact=True));new=s['family']['profiles']['quintus']['run']
 assert new['encounter']['monster']!=family and new['encounter']['combat']['version']==1
 assert new['companion']==(variant if capture['outcome']=='joined' else starter)
 assert not errors,errors
 report={'url':BASE,'isolatedAccount':username,'result':'PASS','starter':starter,'monster':variant,'capture':capture,'monsterHpAfterAnswers':hp,'commandUiRoundTripMs':timings,'checks':['natural E/D onboarding','frozen real combat stats','wrong-answer shield and correction','five completed answers +50XP and one material pack','server capture result +quota committed','cross-device outcome/ownership/materials preserved','refresh cannot reroll capture','reward claim remains one star','next encounter different family and current companion'],'pageErrors':errors,'backgroundSyncRetries':retries}
 (OUT/('production-cloud.json' if BASE.startswith('https:') else 'local-cloud.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False));b.close()
