"""Published JS/CSS/media; synthetic identity and intercepted API only. No real player mutations."""
import os,copy
os.environ['FEIFEI_QA_URL']='https://quintus-star-tide-academy-production.up.railway.app'
os.environ['FEIFEI_QA_OUTPUT']='output/jeremy-production-release/browser'
exec(open('outputs/feifei-companion/browser-qa.py').read().split('with sync_playwright() as pw:')[0])
original=copy.deepcopy(fixture)
next_fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import * as g from './build/game.mjs';import{readFileSync}from'node:fs';const f=JSON.parse(readFileSync('/tmp/jeremy-latest-next-family.json'));const r=f.profiles.alston.run,q=g.questionById(r.questions[r.index]);g.answerRun(f,'alston',r.id,r.index,(q.answer+1)%q.options.length,g.taipeiDay());console.log(JSON.stringify({family:f,question:q}));"],text=True))
with sync_playwright() as pw:
 for engine in ['chromium','webkit']:
  b=getattr(pw,engine).launch(headless=True)
  for width,height in [(393,852),(834,1194)]:
   fixture=copy.deepcopy(original)
   c,p=setup(b,username='jay',player='jay',width=width,reduced=True);p.set_viewport_size({'width':width,'height':height});p.wait_for_load_state('networkidle')
   for subject in ['數學','國語','英文','自然','社會']:expect(p.get_by_role('button',name='從群島開始'+subject,exact=True)).to_have_count(1)
   expect(p.locator('.archipelago-stop')).to_have_count(5);check(engine+' '+str(width)+' published five subjects and animated-island structure')
   p.locator('.island-course-details > summary').click();p.get_by_role('button',name='去數學島',exact=True).click();expect(p.locator('#math-island[data-screen=map]')).to_be_visible()
   for name in ['一年級','二年級','三年級','四年級','五年級','六年級']:
    p.locator('.isl-grade-buttons').get_by_role('button',name=name,exact=True).click();assert p.locator('.isl-isle').count() in [8,9,10];assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
   p.locator('.isl-grade-buttons').get_by_role('button',name='五年級',exact=True).click();p.locator('.isl-isle').first.click();expect(p.locator('.isl-stagebtn')).to_have_count(3);p.screenshot(path=str(OUT/f'{engine}-{width}-math.png'));check(engine+' '+str(width)+' six math grades, three learning stages, no horizontal overflow');c.close()
  for username,player,path in [('feifei','feifei','/feifei-bow/'),('olivia','doudou','/olivia-dog')]:
   fixture=copy.deepcopy(original);c,p=setup(b,username=username,player=player,width=834,reduced=True)
   assert path in p.locator('.tide-harbor-entry img').get_attribute('src');p.locator('.tide-harbor-entry').click();p.get_by_role('button',name='一起休息',exact=True).click();poster=p.locator('.tide-panel .tide-actor-poster');assert path in poster.get_attribute('src');expect(poster).to_be_visible();p.wait_for_function('()=>document.querySelector(".tide-panel .tide-actor-poster")?.naturalWidth>0');check(engine+' personalized companion and rest poster '+username);c.close()
  fixture=copy.deepcopy(original);fixture['family']=next_fixture['family'];fixture['questions']={'alston':next_fixture['question']}
  c,p=setup(b,username='alston',player='alston',width=1024,reduced=True);p.set_viewport_size({'width':1024,'height':748})
  p.route('**/api/online-battle*',lambda r:r.fulfill(json={'serverNow':int(time.time()*1000),'available':True,'room':{'id':'release-qa','status':'finished','revision':1,'side':0,'names':['QA','QA'],'battle':None,'hostPet':'nebulafox','deadline':int(time.time()*1000)+120000,'reason':'timeout'}}))
  p.evaluate("dispatchEvent(new Event('pageshow'))");expect(p.locator('.online-battle-banner')).to_contain_text('好友對戰結果');p.get_by_role('button',name='繼續挑戰',exact=True).click();button=p.get_by_role('button',name='看懂了，下一題',exact=True);expect(button).to_be_visible()
  box=button.bounding_box();assert box and box['y']>=0 and box['y']+box['height']<=748 and box['height']>=44
  assert button.evaluate('(e)=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
  p.screenshot(path=str(OUT/f'{engine}-next.png'));check(engine+' published next button remains tappable with battle banner');c.close();b.close()
assert not errors,errors
(OUT/'results.json').write_text(json.dumps({'pass':True,'checks':checks,'errors':errors,'url':BASE,'realAssets':True,'api':'intercepted synthetic fixture','realAccountMutations':False,'physicalDevice':False},ensure_ascii=False,indent=2)+'\n')
print('PASS',len(checks),'published-asset browser checks')
