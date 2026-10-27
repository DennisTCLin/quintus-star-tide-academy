import os,json,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'outputs/course-controls';OUT.mkdir(exist_ok=True)
BASE=os.environ.get('CONTROL_URL','http://127.0.0.1:4242');MODE=os.environ.get('CONTROL_MODE','local')
JS=r'''import * as g from './build/game.mjs';let raw='';for await(const v of process.stdin)raw+=v;let {s,c,id='qingqing',grade=1,mode='fresh'}=JSON.parse(raw);if(!s){let family=g.newFamily();for(const p of Object.values(family.profiles)){p.owned={tideglow:1,cometcrane:1};p.equipped='tideglow';p.territory=g.territoryTransition(undefined,{action:'start'},Date.now(),p.owned);}s={family,questions:{},username:'controls-fixture',playerId:id,csrf:'fixture',day:g.taipeiDay(),verified:{},legacy:false,canMigrate:false,serverNow:Date.now()};if(mode!=='fresh'){g.startRun(s.family,id,mode==='picture'?'words':g.COURSES[grade][0].id,'controls-initial',1);if(mode==='pending')for(let i=0;i<6;i++){let r=family.profiles[id].run;g.answerRun(family,id,r.id,r.index,g.questionById(r.questions[r.index]).answer);if(i<5)g.nextQuestion(family,id,r.id,r.index);}if(mode==='picture'){let r=family.profiles[id].run;let n=r.questions.findIndex(q=>g.questionById(q).options.filter(o=>o.image).length===4);if(n<0)throw Error('fixture needs four pictures');r.index=n;}}}if(c){let p=s.family.profiles[c.player];if(c.type==='start')g.startRun(s.family,c.player,c.course,'controls-start',1);else if(c.type==='answer')g.answerRun(s.family,c.player,c.runId,c.index,c.choice);else if(c.type==='next')g.nextQuestion(s.family,c.player,c.runId,c.index);else if(c.type==='hint')g.markRunAssisted(s.family,c.player,c.runId,c.index);else throw Error('Unexpected command '+c.type);s.family.revision++;s.result=true;}for(const [pid,p]of Object.entries(s.family.profiles))if(p.run)s.questions[pid]=g.questionById(p.run.questions[p.run.index]);console.log(JSON.stringify(s));'''
def engine(**args):return json.loads(subprocess.check_output(['node','--input-type=module','-e',JS],input=json.dumps(args),text=True,cwd=ROOT))
def plain(loc):return loc.evaluate('e=>{let c=e.cloneNode(true);c.querySelectorAll("rt,rp").forEach(e=>e.remove());return c.textContent}')
checks=[];errors=[]
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,channel='chrome')
 cases=[('qingqing',1,390,844,'fresh'),('feifei',2,320,740,'fresh'),('quintus',4,1280,900,'fresh'),('qingqing',1,1024,768,'active'),('qingqing',1,820,1180,'pending'),('feifei',2,320,740,'picture')]
 if MODE=='production':cases=[cases[0],cases[5]]
 for player,grade,w,h,mode in cases:
  s=engine(id=player,grade=grade,mode=mode);calls=[];ctx=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');p=ctx.new_page();p.set_default_timeout(12000);p.on('pageerror',lambda e:errors.append(str(e)))
  p.add_init_script("HTMLMediaElement.prototype.play=function(){setTimeout(()=>this.dispatchEvent(new Event('ended')),20);return Promise.resolve()}")
  def route(r):
   global s
   if '/api/presence' in r.request.url or '/api/friends' in r.request.url:r.fulfill(json={'friends':[],'serverNow':s['serverNow']});return
   if r.request.method=='POST' and r.request.url.endswith('/command'):
    c=r.request.post_data_json['command'];calls.append(c);s=engine(s=s,c=c)
   r.fulfill(json=s)
  p.route('**/api/**',route);p.goto(BASE);p.wait_for_load_state('networkidle');p.locator('.family-hero-copy > .f-primary').click()
  if mode=='fresh':
   dialog=p.get_by_role('dialog',name='選擇學習科目');dialog.wait_for();assert not calls
   assert dialog.locator('.course-picker-card').count()==5
   assert not p.evaluate('document.documentElement.scrollWidth>innerWidth')
   dialog.screenshot(path=str(OUT/f'{MODE}-picker-{grade}-{w}.png'))
   p.keyboard.press('Escape');assert not calls and not p.locator('dialog[open]').count()
   p.locator('.family-hero-copy > .f-primary').click();dialog.get_by_role('button',name='開始數學',exact=True).click();p.locator('.quiz-learning').wait_for();assert calls[0]['course']=='math'
  else:
   p.locator('.family-app.quiz-active').wait_for();assert not calls and not p.locator('dialog[open]').count()
  if mode=='pending':
   assert p.locator('.result-panel').count()==1 and not p.locator('.quiz-next-dock').count();checks.append({'case':[grade,w,h,mode],'result':'PASS'});ctx.close();continue
  p.locator('.quiz-learning').wait_for()
  if mode=='picture':assert p.locator('.answer-grid .picture-tile').count()==4
  assert not p.evaluate('document.documentElement.scrollWidth>innerWidth'),f'overflow {grade} {w} {mode}'
  if p.locator('.option-listen').count():
   n=len(calls);p.locator('.option-listen').first.click();assert len(calls)==n
  q=s['questions'][player]
  if q.get('audio'):p.get_by_role('button',name='播放題目聲音').click()
  p.locator('.answer-grid [data-answer-option]').nth(q['answer']).click()
  dock=p.locator('.quiz-next-dock');dock.wait_for();bounds=dock.bounding_box();assert bounds['y']>=0 and bounds['y']+bounds['height']<=h+1,bounds
  nextbutton=dock.get_by_role('button',name='下一題',exact=False) if grade!=2 else dock.locator('.f-primary')
  assert nextbutton.evaluate('e=>{let r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
  assert len([c for c in calls if c['type']=='answer'])==1
  p.screenshot(path=str(OUT/f'{MODE}-answered-{grade}-{w}-{mode}.png'))
  dock.locator('button').first.click();assert p.locator('.answer-explanation').is_visible()
  index=s['family']['profiles'][player]['run']['index'];nextbutton.dblclick();p.wait_for_function('(i)=>document.querySelector(".question-meta")?.textContent.includes(`${i+2} / 6`)',arg=index)
  assert len([c for c in calls if c['type']=='next'])==1
  assert not p.locator('.quiz-next-dock').count()
  checks.append({'case':[grade,w,h,mode],'result':'PASS','onlyOneAnswerAndNext':True,'dockInViewport':bounds});ctx.close();print('PASS',grade,w,mode,flush=True)
 b.close()
(OUT/f'{MODE}-browser.json').write_text(json.dumps({'url':BASE,'scope':'Isolated API fixtures; no real player writes','checks':checks,'pageErrors':errors},ensure_ascii=False,indent=2)+'\n')
assert not errors,errors
print(json.dumps({'cases':len(checks),'pageErrors':errors}))
