from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json
OUT=Path('output/mobile-tablet-flow');BASE='http://localhost:4388';fixtures=json.loads(Path('/tmp/star-tide-flow-private/accounts.json').read_text());rows=json.loads((OUT/'flow-results.json').read_text())['checks'] if (OUT/'flow-results.json').exists() else [];errors=[];done={(r['engine'],r['grade'],r['flow']) for r in rows if 'flow' in r}
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=p.chromium.launch(channel='chrome') if engine=='chromium' else p.webkit.launch()
  for f in [f for f in fixtures if f['engine']==engine and f['state']!='voice' and (f['engine'],f['grade'],f['state']) not in done]:
   c=b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);page=c.new_page();page.set_default_timeout(20000);page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(BASE);page.get_by_placeholder('英文字母、數字或底線').fill(f['username']);page.get_by_placeholder('請輸入密碼').fill(f['password']);page.get_by_role('button',name='登入，繼續冒險 →').click();page.locator('.harbor-departure-start').wait_for();page.wait_for_load_state('networkidle')
   for w,h in [(375,667),(820,1180),(1180,820),(844,390)]:
    page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo({top:0,behavior:"instant"})');page.wait_for_timeout(80)
    assert page.locator('.harbor-departure-start').evaluate('(e)=>{let r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'),('home start',engine,f['grade'],w,h)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    for btn in page.locator('.family-nav button').all():
     btn.scroll_into_view_if_needed();assert btn.evaluate('(e)=>{let r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'),('nav covered',engine,f['grade'],w)
    rows.append({'engine':engine,'grade':f['grade'],'state':f['state'],'viewport':[w,h],'homeCTAVisibleWithoutScroll':True,'navigationHitTargetsClear':True})
   page.set_viewport_size({'width':820,'height':1180} if f['grade']<=2 else {'width':375,'height':667});page.evaluate('scrollTo(0,0)');page.locator('.harbor-departure-start').click()
   if f['state']=='new':
    picker=page.get_by_role('dialog',name='選擇學習科目');picker.wait_for();picker.locator('.course-picker-card').nth(1).click()
   page.locator('.ready-start:not([disabled])').wait_for()
   for w,h in [(320,568),(820,1180),(1180,820),(844,390)]:
    page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo({top:0,behavior:"instant"})');page.wait_for_timeout(120)
    assert page.locator('.ready-start').evaluate('(e)=>{let r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.height>=44}'),('ready below fold',engine,f['grade'],w,h)
    assert not page.locator('.tide-launch:visible').count()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   if f['state']=='new':
    # The selected mode is set explicitly for predictable end-to-end timing.
    page.locator('.challenge-modes label').nth(1).click();expect(page.locator('.challenge-modes input').nth(1)).to_be_checked()
   page.set_viewport_size({'width':820,'height':1180} if f['grade']<=2 else {'width':390,'height':844});page.locator('.ready-start').click()
   count=3 if f['state']=='lose' else 6
   for i in range(count):
    page.wait_for_function('i=>document.querySelector(".quiz-question-count")?.textContent.includes(`第 ${i+1}／`)',arg=i,timeout=30000)
    if page.locator('[data-answer-option]').first.is_disabled():
     page.get_by_role('button',name='播放題目聲音',exact=True).click()
    expect(page.locator('[data-answer-option]').first).to_be_enabled(timeout=20000)
    oracle=page.request.get(BASE+'/qa-oracle?username='+f['username']).json();assert oracle['run']['index']==i
    answer=(oracle['answer']+1)%oracle['options'] if f['state']=='lose' else oracle['answer']
    before=int(page.get_by_role('meter',name='夥伴生命').get_attribute('aria-valuenow'))
    page.locator('[data-answer-option]').nth(answer).tap()
    if f['state']=='lose':
     page.wait_for_function('hp=>Number(document.querySelector("[aria-label=夥伴生命]").getAttribute("aria-valuenow"))<hp',arg=before,timeout=20000)
     if i==count-1:expect(page.get_by_role('meter',name='夥伴生命')).to_have_attribute('aria-valuenow','0',timeout=20000)
     if i<count-1:page.get_by_role('button',name='看懂了，下一題',exact=True).click()
   page.locator('.quiz-result-failed' if f['state']=='lose' else '.quiz-victory').wait_for(timeout=30000)
   oracle=page.request.get(BASE+'/qa-oracle?username='+f['username']).json();r=oracle['run'];assert r['status']==('failed' if f['state']=='lose' else 'won') and len(r['answers'])==count,(f,r['status'],r['answers'])
   if f['state']=='lose':assert r['answers']==[False]*3
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.screenshot(path=str(OUT/f'{engine}-grade{f["grade"]}-{f["state"]}.png'))
   rows.append({'engine':engine,'grade':f['grade'],'flow':f['state'],'answers':count,'result':r['status'],'wrongAnswersReduceHP':f['state']=='lose'})
   c.close();(OUT/'flow-results.json').write_text(json.dumps({'checks':rows,'errors':errors,'complete':False},indent=2));print('PASS',engine,f['grade'],f['state'],flush=True)
  b.close()
assert not errors,errors
(OUT/'flow-results.json').write_text(json.dumps({'checks':rows,'errors':errors,'realChildDataTouched':False},indent=2));print('PASS all end-to-end flows',flush=True)
