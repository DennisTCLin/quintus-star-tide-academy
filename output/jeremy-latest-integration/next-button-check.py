"""Authenticated synthetic account on a task-owned localhost database; real player data is never used."""
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import os,json,time,subprocess,uuid
BASE=Path('/tmp/jeremy-latest-browser-base.txt').read_text().strip();OUT=Path('output/jeremy-latest-integration');meta=json.loads((OUT/'next-fixture-state.json').read_text());rows=[];errors=[];commands=[];navigation_errors=[]
PSQL='/opt/homebrew/opt/postgresql@17/bin/psql';DB='star_tide_latest_browser_20261026'
def reset_fixture():
 family=Path('/tmp/jeremy-latest-next-family.json').read_text().strip().replace("'","''")
 subprocess.run([PSQL,'-h','127.0.0.1','-p','55432','-d',DB,'-c',"DELETE FROM request_limits; UPDATE game_states SET family='"+family+"'::jsonb WHERE account_id=(SELECT account_id FROM player_logins WHERE username='ipad_next_qa')"],check=True,capture_output=True)
def state(c):return c.request.get(BASE+'/api/state').json()
def ready(b,correct=False):
 reset_fixture();c=b.new_context(viewport={'width':1024,'height':748},has_touch=True,reduced_motion='no-preference');r=c.request.post(BASE+'/api/login',headers={'Origin':BASE},data={'username':'ipad_next_qa','password':os.environ['QA_PASSWORD']});assert r.status==200
 s={'mode':'finished'};page=c.new_page();page.set_default_timeout(15000);page._qa_running=True;page.on('pageerror',lambda e:(errors if page._qa_running else navigation_errors).append(str(e)))
 def online(route):route.fulfill(json={'serverNow':int(time.time()*1000),'available':True,'room':None if s['mode']=='none' else {'id':'qa-room','status':s['mode'],'revision':1,'side':1 if s['mode']=='pending' else 0,'names':['很長名字的測試好友','QA'],'battle':None,'hostPet':'nebulafox','deadline':int(time.time()*1000)+120000,'reason':'timeout'}})
 page.route('**/api/online-battle*',online)
 def track(request):
  if request.url.endswith('/api/command'):commands.append(request.post_data_json['command'])
 page.on('request',track);page.goto(BASE,wait_until='networkidle');page.get_by_role('button',name='繼續挑戰',exact=True).click();page.locator('[data-answer-option]').first.wait_for();page.locator('[data-answer-option]').nth(meta['answer'] if correct else meta['wrong']).click()
 button=page.locator('.quiz-next-primary') if correct else page.get_by_role('button',name='看懂了，下一題',exact=True);button.wait_for()
 if correct:page.locator('.quiz-next-pause').click()
 return c,page,s,button
MEASURE='''()=>{const box=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}};const e=document.querySelector('.quiz-turn-actions button'),r=e.getBoundingClientRect();return {viewport:innerHeight,docWidth:document.documentElement.scrollWidth,docHeight:document.documentElement.scrollHeight,banner:document.querySelector('.online-battle-banner')?box('.online-battle-banner'):null,main:box('.family-main'),reading:box('.quiz-question-reading'),next:box('.quiz-turn-actions button'),canTap:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}}'''
def check(page,engine,w,h,mode,kind):
 page.wait_for_timeout(120);m=page.evaluate(MEASURE);assert m['docWidth']<=w+1 and m['docHeight']<=h+1,(engine,w,h,mode,m);assert m['reading']['height']>=63,(engine,w,h,mode,'reading collapsed',m);assert m['next']['top']>=0 and m['next']['bottom']<=h and m['next']['height']>=44 and m['canTap'],(engine,w,h,mode,m);rows.append(dict(engine=engine,width=w,height=h,mode=mode,kind=kind,**m));return m
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=getattr(p,engine).launch(headless=True);c,page,s,button=ready(b)
  initial=state(c)['family']['profiles'];assert initial['alston']['run']['index']==3 and initial['alston']['run']['answers']==[True,True,True,False]
  for w,h in [(320,568),(393,740),(768,940),(834,1194),(1024,748),(1180,820),(1366,1024),(812,375)]:
   page.set_viewport_size({'width':w,'height':h})
   for mode,title in [('finished','好友對戰結果'),('pending','很長名字的測試好友邀你對戰'),('active','好友線上對戰')]:
    s['mode']=mode;page.evaluate("dispatchEvent(new Event('pageshow'))");expect(page.locator('.online-battle-banner')).to_contain_text(title);check(page,engine,w,h,mode,'wrong')
   page.get_by_role('button',name='展開題目',exact=True).click();check(page,engine,w,h,mode,'expanded');page.get_by_role('button',name='收合題目',exact=True).click()
   s['mode']='none';page.evaluate("dispatchEvent(new Event('pageshow'))");page.locator('.online-battle-banner').wait_for(state='detached');check(page,engine,w,h,'none','wrong')
  s['mode']='finished';page.evaluate("dispatchEvent(new Event('pageshow'))");page.locator('.online-battle-banner').wait_for();page.set_viewport_size({'width':1024,'height':748});check(page,engine,1024,748,'finished','wrong');page.screenshot(path=str(OUT/('next-'+engine+'-after.png')))
  # A long wait is unnecessary; the manual next control is tappable while the banner remains.
  before=len([x for x in commands if x['type']=='advance-question']);button.evaluate('(e)=>{e.click();e.click()}');page.locator('.challenge-preparation').wait_for();after=state(c)['family']['profiles'];assert after['alston']['run']['index']==4;assert len([x for x in commands if x['type']=='advance-question'])==before+1;assert all(after[k]==initial[k] for k in initial if k!='alston');assert after['alston']['coins']==initial['alston']['coins'];page._qa_running=False;page.reload(wait_until='networkidle');page._qa_running=True;assert state(c)['family']['profiles']['alston']['run']['index']==4;page._qa_running=False;c.close()
  c,page,s,button=ready(b,correct=True)
  for w,h in [(393,740),(1024,748),(834,1194),(812,375)]:page.set_viewport_size({'width':w,'height':h});check(page,engine,w,h,'finished','correct-paused')
  before=len([x for x in commands if x['type']=='advance-question']);page.locator('.quiz-next-pause').click();page.locator('.challenge-preparation').wait_for();assert state(c)['family']['profiles']['alston']['run']['index']==4;assert len([x for x in commands if x['type']=='advance-question'])==before+1;page._qa_running=False;c.close();b.close()
 assert not errors,errors
 assert all('/api/state due to access control checks.' in e for e in navigation_errors),navigation_errors
 OUT.joinpath('next-browser-results.json').write_text(json.dumps({'pass':True,'layoutChecks':rows,'errors':errors,'navigationCancellationErrors':navigation_errors,'manualAndAutomaticAdvance':True,'doubleClickAdvancesOnce':True,'reloadPreservesIndex':True,'otherPlayersUnchanged':True,'realLocalPostgres':True,'friendNotifications':'synthetic responses only','physicalDevice':False,'productionMutations':False},ensure_ascii=False,indent=2)+'\n');print('PASS',len(rows),'layout checks plus manual/automatic next, reload and isolation')
