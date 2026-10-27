"""Independent customer browser checks. Isolated reducer-generated fixtures, never live learners.
Run CREATURE_QA_URL=http://127.0.0.1:4241 /tmp/star-tide-hero-qa/bin/python scripts/verify-creature-taming.py
Screenshots are normal browser renders, no DOM style edits or forced clicks.
"""
import json, os, subprocess, time, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/creature-taming'; OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('CREATURE_QA_URL','http://127.0.0.1:4241').rstrip('/')
checks=[]; issues=[]; errors=[]; observations=[]; contexts=[]
NODE=r'''import * as g from './build/game.mjs';let text='';for await(const c of process.stdin)text+=c;const o=JSON.parse(text);let s=o.state;
if(!s){let family=g.newFamily(),id=o.player||'feifei',p=family.profiles[id],level=o.level||1;let pet=o.strong?'astraltide':o.recruit?g.MONSTER_CATALOG[0].id:'tideglow';if(o.recruit||o.strong){p.owned[pet]=1;p.firstAcquired[pet]=g.taipeiDay();p.equipped=pet;}p.growth.xp[pet]=o.xp??25*(level-1)*(level+2)/2;let day=g.taipeiDay();g.startRun(family,id,'math','browser-taming-'+o.mode+'-'+level,0,o.mode==='practice',o.mode==='old-day'?'2026-10-23':day);if(o.mode==='legacy')delete p.run.encounter.combat;if(o.mode==='daily-limit')p.captureQuota={day,attempts:3};if(['duplicate','capacity'].includes(o.mode)){p.owned[p.run.encounter.variant]=o.mode==='capacity'?10000:1;p.firstAcquired[p.run.encounter.variant]=day;p.growth.xp[p.run.encounter.variant]=225;}s={family,questions:{},username:'browser-creature-fixture',playerId:id,displayName:'QA',csrf:'fixture',day,verified:{quintus:0,feifei:0,qingqing:0,doudou:0},legacy:false,canMigrate:false};}
const id=s.playerId,p=s.family.profiles[id];const answer=(choice)=>g.answerRun(s.family,id,p.run.id,p.run.index,choice,s.day,o.mode==='escaped'?.999:0);
if(o.finish)while(p.run.status==='active'){answer(g.questionById(p.run.questions[p.run.index]).answer);if(p.run.status==='active')g.nextQuestion(s.family,id,p.run.id,p.run.index);}
const c=o.command;if(c){switch(c.type){case'answer':s.result=answer(c.choice);break;case'next':s.result=g.nextQuestion(s.family,id,p.run.id,p.run.index);break;case'equip':if(!p.owned[c.pet])throw Error('unowned equip');p.equipped=c.pet;s.result=true;break;case'hint':g.markRunAssisted(s.family,id,p.run.id,p.run.index);s.result=true;break;case'skill':s.result=g.useSkill(s.family,id,p.run.id,p.run.index);break;case'claim-reward':s.result=g.claimReward(s.family,id,p.run.id,c.choice);break;case'start':if(p.run?.status==='active')s.result=true;else {g.startRun(s.family,id,c.course,'browser-next-'+s.family.revision,20,!!c.practice,s.day);s.result=true;}break;default:throw Error('Unhandled fixture command '+c.type);}s.family.revision++;}
s.questions=p.run?{[id]:g.questionById(p.run.questions[p.run.index])}:{};s.fixtureMeta={monster:g.monsterById(p.run?.encounter.variant),pet:g.petById(p.equipped)};console.log(JSON.stringify(s));'''
def fixture(**kw):
 return json.loads(subprocess.check_output(['node','--input-type=module','-e',NODE],input=json.dumps(kw),text=True,cwd=ROOT))
def plain(loc):
 return loc.evaluate('(e)=>{let c=e.cloneNode(true);c.querySelectorAll("rt,rp").forEach(x=>x.remove());return c.textContent.replace(/\\s+/g," ").trim()}')
def check(ok,name,**detail):
 (checks if ok else issues).append({'check':name,**detail})
def overflow(page,label):
 m=page.evaluate('''()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('main *')].filter(e=>{let r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1}).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right}))})''')
 check(m['scroll']<=m['viewport'],label+' no horizontal overflow',**m)
def reachable(loc,label):
 loc.scroll_into_view_if_needed();ok=loc.evaluate('(e)=>{const r=e.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;return x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&e.contains(document.elementFromPoint(x,y))}')
 check(ok,label+' clickable center unobscured');return ok
def snap(page,name,full=False):
 path=OUT/f'browser-{name}.png';page.screenshot(path=str(path),full_page=full);return str(path)
def setup(browser,player='feifei',width=390,height=844,mode='joined',level=1,finish=False,reduced=True,**kw):
 state=fixture(player=player,mode=mode,level=level,finish=finish,**kw)
 ctx=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce' if reduced else 'no-preference');contexts.append(ctx)
 page=ctx.new_page();page.set_default_timeout(9000);page.on('pageerror',lambda e:errors.append({'context':[player,width,mode], 'error':str(e)}));calls=[]
 def route(r):
  if any(x in r.request.url for x in ['/api/presence','/api/friends']):r.fulfill(json={'serverNow':int(time.time()*1000),'friends':[]});return
  if r.request.method=='POST' and r.request.url.endswith('/command'):
   c=r.request.post_data_json['command'];calls.append(c)
   if finish and c['type']=='start':state['result']=True
   else:
    nextstate=fixture(state=state,command=c,mode=mode);state.clear();state.update(nextstate)
  r.fulfill(json=state)
 page.route('**/api/**',route);page.goto(BASE);page.wait_for_load_state('networkidle');page.locator('.training-panel').wait_for()
 return ctx,page,state,calls
def learn(page):
 (page.locator('.training-resume') if page.locator('.training-resume').count() else page.get_by_role('button',name='開始數學',exact=True)).click();page.locator('.quiz-stage').wait_for();page.wait_for_timeout(250)
def run_case(name,fn):
 if os.environ.get('CREATURE_QA_FILTER') and not any(x in name for x in os.environ['CREATURE_QA_FILTER'].split(',')):return
 try:fn();print(name,'DONE',flush=True)
 except Exception as e:issues.append({'check':name,'error':str(e),'traceback':traceback.format_exc()});print(name,'ERROR',str(e),flush=True)
 finally:
  for ctx in contexts[:]:
   try:ctx.close()
   except:pass
  contexts.clear()
def layout(browser,player,width,height,level):
 ctx,page,state,calls=setup(browser,player,width,height,level=level)
 label=f'{player}-{width}x{height}-lv{level}'
 check(page.locator('.training-name .creature-badges').count()==1,label+' training badges')
 check(page.locator('.training-current .creature-stats').count()==1,label+' training stats')
 overflow(page,label+' home');page.locator('.training-panel').scroll_into_view_if_needed();snap(page,label+'-training')
 learn(page);overflow(page,label+' quiz')
 check(page.locator('.quiz-hud .creature-badges').count()==2,label+' two HUD badges')
 check(page.locator('.quiz-hud .creature-level').all_text_contents()==['Lv.'+str(level)]*2,label+' frozen HUD levels')
 check(str(state['fixtureMeta']['monster']['rarity']) in plain(page.locator('.quiz-hud > div').nth(1)),label+' monster rarity')
 check(page.locator('.quiz-stage').evaluate('(e)=>e.classList.contains("duel-reduced")'),label+' reduced motion')
 rules=plain(page.locator('.capture-rules').first);check('%'in rules and '3 次'in rules,label+' precompletion chance/allowance',text=rules)
 reachable(page.locator('.answer-grid [data-answer-option]').first,label+' answer');page.locator('.quiz-encounter').scroll_into_view_if_needed();snap(page,label+'-quiz')
 page.locator('.quiz-stat-detail summary').click() if page.locator('.quiz-stat-detail summary').count() else page.locator('details').filter(has=page.locator('.quiz-stat-grid')).locator('summary').click()
 check(page.locator('.quiz-stat-grid .creature-stats').count()==2,label+' labeled HP/ATK/DEF')
 detail=plain(page.locator('.quiz-stat-grid').locator('..'));check('第五題會發動知識終結技' in detail and '完全保護' in detail,label+' protection and finisher explanation')
 page.locator('.quiz-stat-grid').scroll_into_view_if_needed();snap(page,label+'-stats')
 page.locator('.quiz-bestiary-link button').click();page.locator('.monster-grid').wait_for();overflow(page,label+' bestiary')
 check(page.locator('.monster-card').count()==30,label+' thirty monsters')
 check(page.locator('.monster-card .creature-badges').count()==30,label+' all monster badges')
 page.evaluate('window.scrollTo(0,0)');snap(page,label+'-bestiary');page.locator('.monster-card').first.scroll_into_view_if_needed();snap(page,label+'-bestiary-cards')
 for rank,count in [('E',6),('D',6),('C',3),('B',6),('A',6),('S',3)]:
  page.get_by_label('怪物稀有度',exact=True).select_option(rank);check(page.locator('.monster-card').count()==count,label+' rarity '+rank)
 page.get_by_label('怪物稀有度',exact=True).select_option('all')
 page.get_by_role('group',name='篩選怪物屬性').get_by_role('button',name='水',exact=False).click();check(page.locator('.monster-card').count()==6,label+' water filter')
 page.locator('select[name=monster-family]').select_option('golem');check(page.locator('.monster-card').count()==2,label+' family filter')
 page.locator('select[name=monster-form]').select_option('warden');check(page.locator('.monster-card').count()==1,label+' form filter')
 opener=page.locator('.monster-card');reachable(opener,label+' card');opener.click();page.locator('.monster-dialog[open]').wait_for()
 check(page.locator('.monster-dialog').evaluate('e=>e.scrollWidth<=e.clientWidth'),label+' modal content no overflow')
 check(page.locator('.monster-dialog .creature-stats').count()==1,label+' detail stats')
 for _ in range(4):
  page.keyboard.press('Tab');check(page.locator('.monster-dialog').evaluate('e=>e.contains(document.activeElement)||document.activeElement===document.body'),label+' modal keyboard excludes background controls')
 txt=plain(page.locator('.monster-dialog'));check('野外能力預覽' in txt and 'Lv.5'in txt and '夥伴技能' in txt,label+' preview/skill intro',text=txt)
 check(page.locator('.monster-dialog').evaluate('e=>e.contains(document.activeElement)'),label+' focus moves into modal')
 try:
  page.locator('input[name=monster-search]').click(trial=True,timeout=350);check(False,label+' modal blocks background clicks')
 except Exception:check(True,label+' modal blocks background clicks')
 reachable(page.locator('.monster-close'),label+' modal close visible')
 snap(page,label+'-detail');page.locator('.monster-note').scroll_into_view_if_needed();snap(page,label+'-detail-bottom')
 reachable(page.locator('.monster-dialog .f-secondary'),label+' modal audio')
 page.keyboard.press('Escape');check(page.locator('.monster-dialog').count()==0,label+' Escape closes modal');check(opener.evaluate('e=>e===document.activeElement'),label+' focus restored')
 opener.click();page.locator('.monster-dialog[open]').wait_for();page.locator('.monster-close').click();check(page.locator('.monster-dialog').count()==0,label+' close button closes modal');check(opener.evaluate('e=>e===document.activeElement'),label+' close button restores focus')
 page.locator('input[name=monster-search]').fill('找不到的怪物');check(page.locator('.bestiary-empty').is_visible(),label+' empty result');page.locator('.bestiary-empty button').click();check(page.locator('.monster-card').count()==30,label+' reset filters')
 page.locator('.bestiary-top button').first.click();page.locator('.pet-grid').wait_for();check('85' in plain(page.locator('.collection-heading')),label+' collection count85');check(page.locator('.pet-card .creature-badges').count()==page.locator('.pet-card').count(),label+' collection badges');overflow(page,label+' collection');snap(page,label+'-collection')
 ctx.close();contexts.remove(ctx)
def outcome(browser,mode,player='feifei',width=320,height=568):
 tag=mode if width==320 else f'{mode}-{width}'
 ctx,page,state,calls=setup(browser,player,width,height,mode=mode,finish=True,level=5)
 learn(page);page.locator('.capture-result').wait_for();capture=state['family']['profiles'][player]['run']['capture'];text=plain(page.locator('.capture-result'))
 check(state['family']['profiles'][player]['run']['status']=='won',mode+' learning won')
 check(any(t in plain(page.locator('.result-panel')) for t in ['五題完成','練習完成']),mode+' learning success remains explicit')
 check('完成挑戰'in plain(page.locator('.result-panel h1')),mode+' successful learning title')
 check('%'in text and '今日剩'in text,mode+' result rate/remaining')
 check(page.locator('.capture-result').evaluate('e=>[...e.querySelectorAll("h3,p,button")].every(c=>c.scrollWidth<=c.clientWidth+1)'),mode+f' {width}px capture text wraps without clipping');overflow(page,mode+' result');page.locator('.capture-result').scroll_into_view_if_needed();snap(page,tag+'-result');page.locator('.result-panel h1').scroll_into_view_if_needed();snap(page,tag+'-learning-success')
 expected={'joined':'加入了','duplicate':'又來作伴了','escaped':'通關、經驗值與獎勵都已保留','daily-limit':'今天三次降服機會已用完','legacy':'沿用先前的戰鬥規則','practice':'練習航程不使用降服機會','old-day':'先前日期的航程','capacity':'卡片已達上限'}[mode]
 check(expected in text,mode+' distinct result explanation',text=text)
 if mode in ['joined','duplicate']:
  check(('Lv.1' if mode=='joined' else 'Lv.4') in page.locator('.capture-result .creature-level').inner_text(),mode+' recruit level')
  recruit=state['family']['profiles'][player]['run']['capture']['monster'];reachable(page.locator('.capture-result button'),mode+' equip');page.locator('.capture-result button').click();page.wait_for_function('()=>document.querySelector(".capture-result button").disabled')
  check(state['family']['profiles'][player]['equipped']==recruit,mode+' equip command updates state');check('已選擇陪練'in plain(page.locator('.capture-result button')),mode+' immediate selected UI')
  page.locator('.result-panel .f-actions .f-primary').click();page.locator('.training-name').wait_for();check(plain(page.locator('.training-name h2'))==state['fixtureMeta']['pet']['name'],mode+' home selected recruit');snap(page,tag+'-equipped-training')
 page.reload();page.wait_for_load_state('networkidle');learn(page);check(state['family']['profiles'][player]['run']['capture']==capture,mode+' reload preserves outcome');check(page.locator('.capture-result').count()==1,mode+' reload UI')
 observations.append({'mode':mode,'outcome':capture,'commands':calls})
 ctx.close();contexts.remove(ctx)
def journey(browser,player,reduced,level=1,strong=False):
 ctx,page,state,calls=setup(browser,player,390,844,mode='joined',level=level,reduced=reduced,strong=strong)
 learn(page);label=f'five-answer-{player}-lv{level}-'+('early' if strong else 'reduced' if reduced else 'motion');allymax=page.locator('[aria-label="夥伴生命"]').get_attribute('aria-valuemax');hp=[]
 for i in range(5):
  q=state['questions'][player];wrong=(q['answer']+1)%len(q['options'])
  if i==0:
   # The hint route and wrong answer exercise both assisted and corrected eligibility.
   btn=page.locator('.question-panel .f-actions button').first;reachable(btn,label+' hint');btn.click();page.locator('.hint-box').wait_for()
  reachable(page.locator('.answer-grid [data-answer-option]').nth(wrong),label+f' q{i+1} wrong');page.locator('.answer-grid [data-answer-option]').nth(wrong).click();page.wait_for_timeout(250 if reduced else 1200)
  check(page.locator('[aria-label="夥伴生命"]').get_attribute('aria-valuenow')==allymax,label+f' q{i+1} wrong protects HP')
  check(state['family']['profiles'][player]['run']['status']=='active',label+f' q{i+1} correction available')
  reachable(page.locator('.answer-grid [data-answer-option]').nth(q['answer']),label+f' q{i+1} correct');page.locator('.answer-grid [data-answer-option]').nth(q['answer']).click();page.wait_for_timeout(300 if reduced else 1250)
  hp.append(int(page.locator('[aria-label="怪物體力"]').get_attribute('aria-valuenow')))
  if i<4:
   check(page.locator('.capture-result').count()==0,label+f' no premature capture q{i+1}')
   if hp[-1]==0:check('怪物已擊敗' in plain(page.locator('.quiz-battle-intro')),label+' early defeat explanation')
   if i==3:snap(page,label+'-four-complete');observations.append({'journey':label,'fourthAnswerHP':hp[-1]})
   page.locator('.question-panel .f-actions .f-primary').click();page.wait_for_timeout(100)
 page.locator('.capture-result').wait_for();check(state['family']['profiles'][player]['run']['capture']['outcome']=='joined',label+' assisted/corrected capture eligible');check(hp[-1]==0,label+' fifth finisher');check('五題完成'in plain(page.locator('.result-panel')),label+' learning success');snap(page,label+'-complete');observations.append({'journey':label,'hpAfterCorrectAnswers':hp,'commands':calls});overflow(page,label)
 ctx.close();contexts.remove(ctx)
def growth_arena(browser):
 player='feifei';ctx,page,state,calls=setup(browser,player,390,844,recruit=True,xp=40)
 recruit=state['family']['profiles'][player]['equipped'];name=state['fixtureMeta']['pet']['name'];learn(page);q=state['questions'][player];page.locator('.answer-grid [data-answer-option]').nth(q['answer']).click();page.wait_for_timeout(300)
 check(state['family']['profiles'][player]['growth']['xp'][recruit]==50,'recruit gains XP50')
 check(page.locator('.quiz-hud .creature-level').first.inner_text()=='Lv.1','run badge remains frozen Lv1');check(page.locator('.quiz-encounter > .growth-meter strong').inner_text()=='Lv.2','earned growth meter reaches Lv2');snap(page,'recruit-level-up')
 page.get_by_role('button',name='暫停並回到港口',exact=True).click();page.locator('.training-panel').wait_for();check(page.locator('.training-name .creature-level').inner_text()=='Lv.2','training recruit Lv2');page.locator('.family-nav button').nth(1).click();page.get_by_label('搜尋夥伴',exact=True).fill(name);check(page.locator('.pet-card').count()==1,'collection finds new recruit');check(page.locator('.pet-card .creature-level').inner_text()=='Lv.2','collection level grows');snap(page,'recruit-collection-growth')
 page.locator('.family-nav button').nth(5).click();page.locator('.pet-picker').wait_for();buttons=page.locator('.pet-picker button');target=next(x for x in buttons.all() if name in plain(x));reachable(target,'recruit picker');target.click();check(target.locator('.creature-level').inner_text()=='Lv.2','battle picker recruit level2');page.locator('.f-panel > .f-primary').click();page.locator('.duel-health').first.wait_for();meter=page.locator('.duel-health.side-0 [role=meter]');check(meter.get_attribute('aria-valuemax')=='108','arena actual maxHP108',max=meter.get_attribute('aria-valuemax'));check(meter.get_attribute('aria-valuenow')=='108','arena starts full actualHP');check(page.locator('.duel-health.side-0 .creature-level').inner_text()=='Lv.2','arena recruit badge');reachable(page.locator('.battle-controls button').first,'arena attack');page.locator('.duel-health.side-0').scroll_into_view_if_needed();snap(page,'recruit-arena-actual-maxhp');overflow(page,'recruit arena');observations.append({'growthCommands':calls})
 ctx.close();contexts.remove(ctx)
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='chrome',headless=True)
 for player in ['qingqing','feifei']:
  for width,height,level in [(320,568,1),(390,844,5),(1440,1000,1)]:run_case('layout-'+player+'-'+str(width),lambda p=player,w=width,h=height,l=level:layout(browser,p,w,h,l))
 for mode in ['joined','duplicate','escaped','daily-limit','legacy','practice','old-day','capacity']:run_case('outcome-'+mode,lambda m=mode:outcome(browser,m))
 for mode in ['joined','duplicate']:run_case('outcome-'+mode+'-390',lambda m=mode:outcome(browser,m,width=390,height=844))
 run_case('journey-grade1-reduced',lambda:journey(browser,'qingqing',True))
 run_case('journey-grade2-motion',lambda:journey(browser,'feifei',False))
 run_case('journey-grade2-early',lambda:journey(browser,'feifei',True,strong=True))
 run_case('growth-arena',lambda:growth_arena(browser))
 browser.close()
result={'url':BASE,'scope':'Isolated API fixtures derived by current build/game.mjs; UI uses normal clicks, no forced clicks or DOM style edits. Does not establish real backend persistence/concurrency.','passedChecks':len(checks),'checks':checks,'issues':issues,'pageErrors':errors,'observations':observations}
(OUT/'browser-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({'checks':len(checks),'issues':len(issues),'pageErrors':errors},ensure_ascii=False))
