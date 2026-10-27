"""Browser fixture and real-cloud checks; real mode creates isolated QA accounts."""
from playwright.sync_api import sync_playwright
import json,subprocess,time,uuid,os,copy
base=os.environ.get('TRAINING_QA_URL','http://127.0.0.1:4210').rstrip('/')
def fixture(player='quintus',count=55,active=False):
 code="""import{newFamily,ROSTER,startRun,answerRun,nextQuestion,questionById,taipeiDay}from'./build/game.mjs';const family=newFamily(),id=process.argv[1],p=family.profiles[id],pets=ROSTER.slice(0,Number(process.argv[2]));for(const [i,pet]of pets.entries()){p.owned[pet.id]=1;p.firstAcquired[pet.id]=null;p.growth.xp[pet.id]=i*50;}if(['true','pending'].includes(process.argv[3])){startRun(family,id,'math','training-fixture',0);if(process.argv[3]==='pending')for(let i=0;i<5;i++){const r=p.run;answerRun(family,id,r.id,r.index,questionById(r.questions[r.index]).answer);if(i<4)nextQuestion(family,id,r.id,r.index);}}console.log(JSON.stringify({family,questions:p.run?{[id]:questionById(p.run.questions[0])}:{},username:'fixture',playerId:id,displayName:'QA',csrf:'fixture',day:taipeiDay(),verified:{quintus:0,feifei:0,qingqing:0,doudou:0},legacy:false,canMigrate:false,portraits:ROSTER.map(p=>p.image)}));"""
 return json.loads(subprocess.check_output(['node','--input-type=module','-e',code,player,str(count),str(active).lower()],text=True))

def fixtures(browser):
 checks=[];metrics={}
 for player,width,height in [('quintus',1440,1000),('quintus',320,900),('feifei',390,844),('feifei',320,900),('qingqing',390,844),('feifei',390,844)]:
  state=fixture(player);ctx=browser.new_context(viewport={'width':width,'height':height});page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def route(r):
   if r.request.method=='POST' and r.request.url.endswith('/command'):
    c=r.request.post_data_json['command'];state['family']['profiles'][player]['equipped']=c['pet'];state['family']['revision']+=1;state['result']=True
   r.fulfill(status=200,content_type='application/json',body=json.dumps(state))
  page.route('**/api/**',route);page.goto(base);page.locator('.training-panel').wait_for()
  zoom=len(checks)==5
  if zoom:page.evaluate('document.documentElement.style.fontSize="200%"')
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(player,width,'overflow')
  assert page.locator('.training-choice').count()==4
  if player=='feifei':assert page.locator('.training-panel rt').count()>10
  page.locator('.training-panel').screenshot(path=f'/tmp/training-{player}-{width}-{zoom}.png')
  if not checks:
   page.wait_for_timeout(1000)
   urls=state['portraits']
   def assets():return page.evaluate('(urls)=>{let e=performance.getEntriesByType("resource").filter(e=>urls.map(u=>decodeURI(new URL(u,location.origin).pathname)).includes(decodeURI(new URL(e.name).pathname)));return {requests:e.length,bytes:e.reduce((n,e)=>n+e.encodedBodySize,0)}}',urls)
   metrics['collapsedPortraits']=assets()
  page.get_by_role('button',name='查看全部 55 位夥伴').click();assert page.locator('.training-choice').count()==55
  last=page.locator('.training-choice').last;last.scroll_into_view_if_needed();last.focus();last.press('Enter');page.wait_for_function('()=>document.querySelector(".training-choice:last-child").getAttribute("aria-pressed")==="true"');assert last.get_attribute('aria-pressed')=='true'
  assert page.locator('.training-name h2').inner_text()==last.locator('b').inner_text()
  assert page.locator('.training-level').inner_text()==last.locator('.training-choice-info strong').inner_text()
  assert page.locator('.training-portrait img').get_attribute('src')==last.locator('img').get_attribute('src')
  assert last.evaluate('(e)=>e===document.activeElement'),'keyboard focus lost'
  if not checks:metrics['keyboardFocusAfterSave']=True
  page.get_by_role('button',name='收起夥伴',exact=True).click();assert page.locator('.training-choice').count()==4;assert page.locator('.training-choice[aria-pressed=true]').count()==1
  if not checks:
   page.wait_for_timeout(800);metrics['expandedAndScrolledPortraits']=assets()
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(player,width,'expanded overflow')
  assert not errors,errors
  checks.append([player,width,'zoom200'if zoom else 'normal','PASS']);ctx.close()
 # Active-run explanation, failed save, latency, offline and broken art.
 state=fixture('quintus',4,True);ctx=browser.new_context(viewport={'width':390,'height':844});page=ctx.new_page();mode={'failure':False};calls=[]
 def mutable(r):
  if r.request.method=='POST':
   calls.append(r.request.post_data_json);page.wait_for_timeout(350)
   assert page.locator('.training-panel').get_attribute('aria-busy')=='true'
   if mode['failure']:r.fulfill(status=400,content_type='application/json',body=json.dumps({'error':'測試：夥伴已不在收藏中'}));return
   state['family']['profiles']['quintus']['equipped']=r.request.post_data_json['command']['pet'];state['family']['revision']+=1;state['result']=True
  r.fulfill(status=200,content_type='application/json',body=json.dumps(state))
 page.route('**/api/**',mutable);page.goto(base);page.locator('.training-panel').wait_for();current=page.locator('.training-name').inner_text();target=page.locator('.training-choice').nth(1)
 cdp=ctx.new_cdp_session(page);cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
 page.evaluate('window.trainingClick=0;window.trainingPaint=0;document.querySelectorAll(".training-choice")[1].addEventListener("click",()=>window.trainingClick=performance.now());new MutationObserver(()=>{if(!window.trainingPaint&&document.querySelector(".training-panel")?.getAttribute("aria-busy")==="true")requestAnimationFrame(()=>window.trainingPaint=performance.now())}).observe(document.body,{attributes:true,subtree:true})')
 target.dblclick();page.wait_for_function('()=>document.querySelectorAll(".training-choice")[1].getAttribute("aria-pressed")==="true"');assert len(calls)==1,'double click duplicated equip';assert page.locator('.training-name').inner_text()!=current;assert page.locator('.training-name h2').inner_text()==target.locator('b').inner_text();assert '下一趟' in page.locator('.training-journey-note').inner_text()
 metrics['pendingPaintMs4xCPU']=page.evaluate('window.trainingPaint-window.trainingClick');metrics['simulatedServerDelayMs']=350
 mode['failure']=True;page.locator('.training-choice').nth(2).click();page.get_by_text('這次還沒選好，請確認雲端同步後再試。',exact=True).wait_for();assert target.get_attribute('aria-pressed')=='true'
 mode['failure']=False
 if page.get_by_role('button',name='確認同步',exact=True).count():page.get_by_role('button',name='確認同步',exact=True).click()
 page.wait_for_function('()=>!document.querySelector(".training-choice").disabled')
 ctx.set_offline(True);page.wait_for_timeout(150);assert page.locator('.training-choice').first.is_disabled();ctx.set_offline(False);ctx.close();checks.append(['active/failure/delay/offline','PASS'])
 ctx=browser.new_context();page=ctx.new_page();state=fixture('quintus',4);page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps(state)))
 for url in state['portraits']:page.route('**'+url,lambda r:r.abort())
 page.goto(base);page.locator('.training-portrait .training-art-fallback').wait_for();assert page.locator('.training-choice').count()==4;ctx.close();checks.append(['broken-art','PASS'])
 # A completed voyage awaiting reward still owns its companion and XP.
 state=fixture('quintus',4,'pending');ctx=browser.new_context(viewport={'width':390,'height':844});page=ctx.new_page()
 def pending_route(r):
  if r.request.method=='POST':state['family']['profiles']['quintus']['equipped']=r.request.post_data_json['command']['pet'];state['family']['revision']+=1;state['result']=True
  r.fulfill(json=state)
 page.route('**/api/**',pending_route);page.goto(base);page.get_by_role('button',name='領取上一趟獎勵',exact=True).first.wait_for();before=page.locator('.training-name').inner_text();page.locator('.training-choice').nth(2).click();page.wait_for_function('()=>document.querySelectorAll(".training-choice")[2].getAttribute("aria-pressed")==="true"');assert page.locator('.training-name').inner_text()!=before;assert page.locator('.training-name h2').inner_text()==page.locator('.training-choice').nth(2).locator('b').inner_text();assert page.locator('.training-xp').get_attribute('aria-valuenow')=='50';assert '上一趟' in page.locator('.training-journey-note').inner_text();page.locator('.training-panel').screenshot(path='/tmp/training-pending-preview.png');page.set_viewport_size({'width':320,'height':900});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');ctx.close();checks.append(['pending-reward selection','PASS'])
 return {'checks':checks,'metrics':metrics,'scope':'Local intercepted fixtures; image bytes include only character art URLs. Not production capacity.'}

def real(browser):
 ctx=browser.new_context(viewport={'width':390,'height':844});other=browser.new_context(viewport={'width':1440,'height':1000});account='qa_train_'+uuid.uuid4().hex[:12];password='training-test-passphrase-2026';headers={'Origin':base}
 res=ctx.request.post(base+'/api/register',data={'username':account,'password':password},headers=headers);assert res.ok,res.text();s=res.json();snapshot=fixture('quintus',4)['family'];res=ctx.request.post(base+'/api/migrate',data={'id':str(uuid.uuid4()),'revision':s['family']['revision'],'snapshot':snapshot},headers={**headers,'X-CSRF-Token':s['csrf']});assert res.ok,res.text()
 other.request.post(base+'/api/login',data={'username':account,'password':password},headers=headers)
 page=ctx.new_page();second=other.new_page();errors=[]
 for view in [page,second]:view.on('pageerror',lambda e:errors.append(str(e)));view.goto(base);view.get_by_role('button',name='選擇Quintus，4年級').click();view.locator('.training-panel').wait_for()
 retry_ids=[]
 def lose_once(route):
  retry_ids.append(route.request.post_data_json['id']);response=route.fetch()
  if len(retry_ids)==1:route.abort('connectionreset')
  else:route.fulfill(response=response)
 page.route('**/api/command',lose_once)
 target=page.locator('.training-choice').nth(1);target.click();page.wait_for_function('()=>document.querySelectorAll(".training-choice")[1].getAttribute("aria-pressed")==="true"');second.wait_for_function('()=>document.querySelectorAll(".training-choice")[1].getAttribute("aria-pressed")==="true"',timeout=15000)
 assert len(retry_ids)==2 and retry_ids[0]==retry_ids[1]
 page.unroute('**/api/command')
 equipped=ctx.request.get(base+'/api/state').json()['family']['profiles']['quintus']['equipped'];page.reload();page.get_by_role('button',name='選擇Quintus，4年級').click();assert page.locator('.training-choice').nth(1).get_attribute('aria-pressed')=='true'
 with page.expect_response(lambda r:r.url.endswith('/api/command'))as response:page.get_by_role('button',name='開始陪練',exact=True).click()
 state=response.value.json();assert state['family']['profiles']['quintus']['run']['companion']==equipped
 # Change next-run companion from independent device while the run is active.
 second.wait_for_function('()=>!!document.querySelector(".training-journey-note")',timeout=15000);second.locator('.training-choice').nth(2).click();second.wait_for_function('()=>document.querySelectorAll(".training-choice")[2].getAttribute("aria-pressed")==="true"');page.wait_for_timeout(3500)
 assert second.locator('.training-name h2').inner_text()==second.locator('.training-choice').nth(2).locator('b').inner_text()
 question=ctx.request.get(base+'/api/state').json()['questions']['quintus'];answer=int(subprocess.check_output(['node','--input-type=module','-e',"import{questionById}from'./build/game.mjs';console.log(questionById(process.argv[1]).answer)",question['id']],text=True))
 with page.expect_response(lambda r:r.url.endswith('/api/command'))as response:page.locator('.answer-grid [data-answer-option]').nth(answer).click()
 p=response.value.json()['family']['profiles']['quintus'];assert p['run']['companion']==equipped;assert p['growth']['xp'][equipped]==10;assert p['growth']['xp'].get(p['equipped'],0)==0
 # Unowned and other-player selection remain protected by the server.
 s=ctx.request.get(base+'/api/state').json();unowned=next(x for x in fixture()['family']['profiles']['quintus']['owned'] if x not in p['owned']);bad=ctx.request.post(base+'/api/command',data={'id':str(uuid.uuid4()),'revision':s['family']['revision'],'command':{'type':'equip','player':'quintus','pet':unowned}},headers={**headers,'X-CSRF-Token':s['csrf']});assert bad.status==400
 second.locator('.training-panel').screenshot(path='/tmp/training-live-cloud.png');assert not errors,errors
 result={'realCloud':'PASS','lostResponseSameIdRetry':True,'crossDeviceSelection':True,'reload':True,'startUsesSelection':True,'activeRunXpStaysWithOriginal':True,'unownedRejected':True,'pageErrors':errors}
 ctx.close();other.close();return result

with sync_playwright()as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 result=real(b) if os.environ.get('TRAINING_REAL')=='1' else fixtures(b)
 print(json.dumps(result,ensure_ascii=False,indent=2));b.close()
