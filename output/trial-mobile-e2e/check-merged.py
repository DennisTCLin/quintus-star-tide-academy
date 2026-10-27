import json,time,subprocess,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
expect.set_options(timeout=20000)
BASE='http://127.0.0.1:47889';OUT=Path('output/trial-mobile-e2e');(OUT/'screenshots').mkdir(exist_ok=True);results=[]
def answer(qid):
 return json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {questionById} from './build/game.mjs';console.log(JSON.stringify(questionById(process.argv[1])))",qid],text=True))['answer']
def touch(locator):
 locator.scroll_into_view_if_needed();expect(locator).to_be_enabled();r=locator.bounding_box();assert r and r['height']>=40,r
 assert locator.evaluate('(e)=>{let r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'),'button obscured'
 locator.tap()
def tap_during_read(p,target):
 held=[];writes=[]
 p.on('request',lambda r:writes.append(r) if '/api/command' in r.url else None)
 p.route('**/api/state',lambda r:held.append(r),times=1)
 p.evaluate("window.dispatchEvent(new Event('focus'))");p.wait_for_timeout(150)
 assert len(held)==1,'passive read did not start'
 touch(target);assert len(writes)==0,'write overtook passive read'
 held[0].fulfill(response=held[0].fetch())

def no_overflow(p):assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'horizontal overflow'
with sync_playwright() as pw:
 for engine,w,h in [('webkit',393,852),('webkit',1024,768)]:
  b=getattr(pw,engine).launch();c=b.new_context(viewport={'width':w,'height':h},has_touch=True,is_mobile=True,reduced_motion='reduce');p=c.new_page();p.set_default_timeout(20000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  case=f'merged-{engine}-{w}x{h}';print('START',case,flush=True)
  try:
   p.goto(BASE+'/admin',wait_until='domcontentloaded');p.get_by_label('管理員帳號',exact=True).fill('trial_super_qa');p.get_by_label('密碼',exact=True).fill('Synthetic-admin-trial-2026');touch(p.get_by_role('button',name='登入管理艙',exact=True));p.get_by_role('navigation',name='管理功能').wait_for();touch(p.get_by_role('navigation',name='管理功能').get_by_role('button',name='試用帳號',exact=True))
   p.get_by_role('heading',name='建立試用帳號',exact=True).wait_for();no_overflow(p)
   name=f'e2e_{engine[0]}_{w}_{int(time.time())}';p.get_by_label('登入帳號',exact=True).fill(name);p.get_by_label('四位數字密碼',exact=True).fill('0056');p.get_by_label('四位數字密碼',exact=True).blur();expect(p.get_by_label('四位數字密碼',exact=True)).to_have_value('0056');touch(p.get_by_role('button',name='建立試用帳號',exact=True));p.get_by_role('region',name='試用帳號建立完成').wait_for(timeout=45000);expect(p.locator('.admin-trial-result')).to_contain_text('0056');no_overflow(p);p.screenshot(path=str(OUT/'screenshots'/f'{case}-created.png'),full_page=True)
   p.goto(BASE,wait_until='domcontentloaded');p.get_by_placeholder('英文字母、數字或底線').fill(name);p.get_by_placeholder('請輸入密碼').fill('0056');touch(p.get_by_role('button',name='登入，繼續冒險 →',exact=True));p.locator('.family-nav').wait_for()
   def state():
    r=c.request.get(BASE+'/api/state');assert r.status==200,r.text();return r.json()
   st=state();pid=st['playerId']
   def profile():return state()['family']['profiles'][pid]
   initial=profile();assert initial['coins']==5000 and initial['tickets']==20 and initial['starTickets']==5
   monster=initial['run']['encounter']['variant'];assert monster.startswith('wave4-')
   print('CREATED',case,monster,flush=True)
   touch(p.locator('.family-nav button').nth(3));p.locator('.gacha-draw').wait_for();touch(p.locator('.gacha-draw'));touch(p.get_by_role('button',name='確認轉扭蛋',exact=True));p.locator('.gacha-result-heading').wait_for(timeout=45000);no_overflow(p)
   after=profile();assert after['tickets']==19 and after['starTickets']==5 and after['coins']==5000;assert sum(after['owned'].values())==sum(initial['owned'].values())+1
   p.screenshot(path=str(OUT/'screenshots'/f'{case}-draw.png'),full_page=True);print('DRAWN',case,flush=True)
   touch(p.locator('.family-nav button').first);touch(p.get_by_role('button',name='繼續挑戰',exact=True))
   for i in range(6):
    
    if i==0:touch(p.locator('.ready-start'))
    p.locator('[data-answer-option]').first.wait_for();expect(p.locator('.quiz-question-count')).to_contain_text(f'第 {i+1}／');expect(p.locator('[data-answer-option]').first).to_be_enabled();st=state();q=st['questions'][pid];assert 'answer' not in q
    opts=p.locator('[data-answer-option]');target=opts.nth(answer(q['id']))
    if i==0:tap_during_read(p,target)
    else:touch(target)
    if i==0:p.screenshot(path=str(OUT/'screenshots'/f'{case}-battle.png'),full_page=True)
   p.get_by_role('dialog',name='降服挑戰 1／3',exact=True).wait_for(timeout=45000);no_overflow(p);reward=profile();assert reward['run']['status']=='won'
   for i in range(3):
    p.get_by_role('dialog',name=f'降服挑戰 {i+1}／3',exact=True).wait_for();st=state();run=st['family']['profiles'][pid]['run'];q=st['captureQuestions'][run['id']];assert 'answer' not in q
    touch(p.locator('.capture-answers button').nth(answer(q['id'])))
    if i==0:
     p.get_by_role('dialog',name='降服挑戰 2／3',exact=True).wait_for();p.reload(wait_until='domcontentloaded');p.get_by_role('dialog',name='降服挑戰 2／3',exact=True).wait_for();assert len(profile()['run']['capture']['trial']['answers'])==1
   expect(p.locator('.capture-overlay')).to_contain_text('三題全對，降服成功！');final=profile();assert final['run']['capture']['outcome'] in ['joined','duplicate'];assert final['run']['capture']['monster']==monster;assert final['owned'].get(monster,0)==reward['owned'].get(monster,0)+1
   assert {k:final[k] for k in ['coins','tickets','starTickets']}=={k:reward[k] for k in ['coins','tickets','starTickets']}
   no_overflow(p);p.screenshot(path=str(OUT/'screenshots'/f'{case}-captured.png'),full_page=True);touch(p.get_by_role('button',name='繼續冒險',exact=True));p.reload(wait_until='domcontentloaded');saved=profile();assert saved['owned'][monster]==final['owned'][monster] and saved['tickets']==19
   assert not errors,errors;results.append({'engine':engine,'viewport':[w,h],'realLocalApiAndDatabase':True,'createdThroughUi':True,'grade':6,'standardDrawDebitOne':True,'sixBattleQuestions':True,'newMonster':monster,'threeCorrectCapture':True,'reloadAfterCaptureOne':True,'savedAfterReload':True,'noOverflow':True,'touchHitTargets':True,'passiveReadOverlap':True,'pageErrors':errors});print('PASS',case,flush=True)
  except Exception:
   p.screenshot(path=str(OUT/'screenshots'/f'{case}-FAILED.png'),full_page=True);Path('/tmp/trial-e2e-failed-body.txt').write_text(p.locator('body').inner_text());raise
  finally:c.close();b.close()
(OUT/'merged-results.json').write_text(json.dumps({'checks':results,'physicalDevices':False,'productionPlayerWrites':False},ensure_ascii=False,indent=2)+'\n')
