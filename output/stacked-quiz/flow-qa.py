exec(open('output/stacked-quiz/layout-qa.py').read().split('with sync_playwright() as p:')[0])
answers=json.loads((OUT/'answers.json').read_text());flows=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);ctx,page=login(b,'sequence');page.set_viewport_size({'width':375,'height':667})
 for i in range(6):
  if page.get_by_role('button',name='▶ 開始這題',exact=True).count():page.get_by_role('button',name='▶ 開始這題',exact=True).click()
  page.locator('[data-answer-option]').first.wait_for();state=page.evaluate('async()=>await(await fetch("/api/state")).json()');pid=state['playerId'];q=state['questions'][pid];r=state['family']['profiles'][pid]['run'];assert r['index']==i
  m=page.evaluate(measure);assert m['stage']['h']>100 and all(a['b']<=667 for a in m['answers']),m
  before=page.locator('[aria-label="怪物體力"]').get_attribute('aria-valuenow');page.locator('[data-answer-option]').nth(answers[q['id']]).click()
  slot=3 if i==5 else i%2+1
  page.wait_for_function('id=>{const v=document.querySelector(`[data-clip="${id}"].is-ready video`);return v&&v.videoWidth===1280&&v.currentTime>0&&!v.paused}',arg='nebulafox-'+str(slot))
  assert page.evaluate('scrollY')==0
  assert not page.locator('.quiz-stage .duel-effect-layer').count()
  if i==0:page.screenshot(path=str(OUT/'phone-attack.png'))
  page.wait_for_function('()=>document.querySelector(".quiz-stage").dataset.phase==="settle"');after=page.locator('[aria-label="怪物體力"]').get_attribute('aria-valuenow');assert int(after)<=int(before)
  if i==0 or i==5:assert int(after)<int(before)
  flows.append({'question':i+1,'clip':slot,'visibleWithoutScroll':True,'hpBefore':before,'hpAfter':after})
  if i<5:
   for _ in range(75):
    state=page.evaluate('async()=>await(await fetch("/api/state")).json()')
    if state['family']['profiles'][pid]['run']['index']>i:break
    page.wait_for_timeout(150)
   else:raise AssertionError('No automatic next')
 ctx.close()
 ctx,page=login(b,'ruby');page.set_viewport_size({'width':375,'height':667});state=page.evaluate('async()=>await(await fetch("/api/state")).json()');pid=state['playerId'];q=state['questions'][pid];wrong=(answers[q['id']]+1)%len(q['options']);page.locator('[data-answer-option]').nth(wrong).click();page.locator('.answer-explanation').wait_for();button=page.get_by_role('button',name='看懂了，下一題',exact=True);box=button.bounding_box();assert box['y']+box['height']<=667;assert page.evaluate('scrollY')==0;page.wait_for_timeout(1400);page.screenshot(path=str(OUT/'phone-wrong.png'));button.click();page.wait_for_timeout(350);assert page.locator('.quiz-question-reading').evaluate('(e)=>e.scrollTop')==0;ctx.close()
 b.close();assert not errors,errors;(OUT/'flow-results.json').write_text(json.dumps({'sixQuestions':flows,'wrongAnswerContinue':True,'errors':errors,'pass':True},ensure_ascii=False,indent=2));print('six-question video + HP + wrong-answer continuation PASS')
