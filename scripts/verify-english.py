"""English UI fixtures and disposable-account authoritative voyage verification."""
import os,json,subprocess,uuid,copy
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.getenv('ENGLISH_QA_URL','http://127.0.0.1:4241').rstrip('/')
OUT=Path(os.getenv('ENGLISH_QA_OUT','/tmp/english-qa'));OUT.mkdir(parents=True,exist_ok=True)
SPEECH="""window.__spoken=[];Object.defineProperty(speechSynthesis,'speak',{value:(u)=>{window.__spoken.push({text:u.text,lang:u.lang});if(u.onend)u.onend();},configurable:true});"""
code="""import{newFamily,startRun,questionById,selectQuestions,taipeiDay}from'./build/game.mjs';
const family=newFamily(),id=process.argv[1];startRun(family,id,'english','fixture-en',0);
console.log(JSON.stringify({family,day:taipeiDay(),playerId:id,username:'fixture',csrf:'fixture',displayName:'QA',questions:{[id]:questionById(family.profiles[id].run.questions[0])},verified:{},legacy:false,canMigrate:false,english:selectQuestions(1,'english',[],parseInt(process.argv[2])).map(questionById)}));"""
errors=[];checks=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='chrome',headless=True)
 for player,width,offset in [('qingqing',320,0),('doudou',390,6),('qingqing',1440,7)]:
  state=json.loads(subprocess.check_output(['node','--input-type=module','-e',code,player,str(offset)],text=True));questions=state.pop('english');q=questions[0];run=state['family']['profiles'][player]['run'];run['questions']=[x['id'] for x in questions];state['questions'][player]=q
  page=browser.new_page(viewport={'width':width,'height':950});page.add_init_script(SPEECH);page.on('pageerror',lambda e:errors.append(str(e)))
  def route(r):
   if r.request.method=='POST':
    c=r.request.post_data_json['command'];assert c['type']=='answer',c
    assert c['choice']==q['answer'];run['settled']=True;state['result']=True;state['family']['revision']+=1
   r.fulfill(json=state)
  page.route('**/api/**',route);page.goto(BASE,wait_until='networkidle');expect(page.get_by_role('button',name='開始英文入門',exact=True)).to_be_visible();expect(page.get_by_role('button',name='開始聽音找圖',exact=True)).to_have_count(0)
  page.get_by_role('button',name='開始英文入門',exact=True).click();expect(page.locator('.question-panel')).to_be_visible();assert q['prompt'] in page.locator('.question-panel h1').inner_text()
  assert page.locator('.answer-grid [data-answer-option]').count()==3;assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  page.get_by_role('button',name='播放題目聲音',exact=True).click();spoken=page.evaluate('window.__spoken.at(-1)');assert spoken=={'text':q['speechText'],'lang':'en-US'},spoken
  page.locator('.answer-grid [data-answer-option]').nth(q['answer']).click();expect(page.locator('.answer-explanation')).to_be_visible();page.get_by_role('button',name='聽正確英文發音',exact=True).click();assert page.evaluate('window.__spoken.at(-1)')=={'text':q['options'][q['answer']]['text'],'lang':'en-US'}
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');page.screenshot(path=str(OUT/f'{player}-{width}.png'),full_page=True);checks.append({'player':player,'width':width,'question':q['id'],'speech':spoken,'PASS':True});page.close()
 if os.getenv('ENGLISH_REAL')=='1':
  a=browser.new_context(viewport={'width':390,'height':950});a.add_init_script(SPEECH);creds={'username':'qa_en_'+uuid.uuid4().hex[:12],'password':'isolated-english-qa-passphrase'};headers={'Origin':BASE}
  r=a.request.post(BASE+'/api/register',data=creds,headers=headers);assert r.ok,r.text();state=r.json()
  def command(c):
   global state
   r=a.request.post(BASE+'/api/command',data={'id':str(uuid.uuid4()),'revision':state['family']['revision'],'command':{'player':'qingqing',**c}},headers={**headers,'X-CSRF-Token':state['csrf']});assert r.ok,r.text();state=r.json();return state
  command({'type':'starter-draw'});command({'type':'starter-confirm'});page=a.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE,wait_until='networkidle');page.get_by_role('button',name='選擇晴晴，1年級').click()
  with page.expect_response(lambda r:r.url.endswith('/api/command')) as response:page.get_by_role('button',name='開始英文入門',exact=True).click()
  state=response.value.json();assert state['questions']['qingqing']['course']=='english'
  for i in range(5):
   q=state['questions']['qingqing'];assert 'answer' not in q
   page.get_by_role('button',name='播放題目聲音',exact=True).click();assert page.evaluate('window.__spoken.at(-1).lang')=='en-US'
   answer=int(subprocess.check_output(['node','--input-type=module','-e',"import{questionById}from'./build/game.mjs';console.log(questionById(process.argv[1]).answer)",q['id']],text=True))
   with page.expect_response(lambda r:r.url.endswith('/api/command')) as response:page.locator('.answer-grid [data-answer-option]').nth(answer).click()
   state=response.value.json();assert state['result'] is True
   if i<4:
    with page.expect_response(lambda r:r.url.endswith('/api/command')) as response:page.get_by_role('button',name='➜ 下一題',exact=True).click()
    state=response.value.json()
  p=state['family']['profiles']['qingqing'];assert p['run']['reward']=='pending';assert p['growth']['xp'][p['run']['companion']]==50;assert state['verified']['qingqing']==100
  page.reload(wait_until='networkidle');page.get_by_role('button',name='選擇晴晴，1年級').click();expect(page.get_by_role('button',name='領取上一趟獎勵',exact=True)).to_be_visible()
  checks.append({'realEnglishVoyage':True,'fiveAnswers':True,'xp':50,'verifiedScore':100,'reload':True,'PASS':True});a.close()
 assert not errors,errors
 result={'base':BASE,'checks':checks,'errors':errors,'speechNote':'Verified en-US speech calls with a browser spy; actual voice sound depends on installed device voices.'};(OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False,indent=2));browser.close()
