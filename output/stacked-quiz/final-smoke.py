exec(open('output/stacked-quiz/layout-qa.py').read().split('with sync_playwright() as p:')[0])
checks=[]
with sync_playwright() as p:
 b=p.webkit.launch(headless=True)
 for suffix in ['englishlong','short']:
  ctx,page=login(b,suffix)
  for w,h in [(320,568),(390,844),(812,375),(820,1180),(1180,820)]:
   page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(180);m=page.evaluate(measure);assert m['docH']<=h+1 and m['docW']<=w and m['reading']['h']>=44 and all(a['b']<=h and a['x']+a['w']<=w+1 for a in m['answers']),m
   checks.append({'fixture':suffix,'viewport':[w,h],'pass':True})
   if w==812:page.screenshot(path=str(OUT/f'webkit-{suffix}-landscape.png'))
  ctx.close()
 b.close()
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':375,'height':667});page.goto(BASE);page.wait_for_load_state('networkidle');page.get_by_placeholder('英文字母、數字或底線').fill('console_sequence');page.get_by_placeholder('請輸入密碼').fill('0742');page.get_by_role('button',name='登入，繼續冒險 →').click();page.get_by_role('button',name='🎁 查看上次挑戰',exact=True).click();page.get_by_role('heading',name='挑戰勝利！',exact=True).wait_for();button=page.locator('.victory-continue');r=button.bounding_box();assert r['y']+r['height']<=667;page.screenshot(path=str(OUT/'victory-375.png'));button.click();page.get_by_role('button',name='▶ 開始這題',exact=True).click();page.locator('[data-answer-option]').first.wait_for();assert page.locator('.quiz-focused').count()==1;assert page.evaluate('document.documentElement.scrollHeight<=innerHeight+1');b.close()
 assert not errors,errors
 (OUT/'final-smoke-results.json').write_text(json.dumps({'postMergeWebKit':checks,'victoryButtonOnFirstScreen':True,'continueStartsNewRound':True,'errors':errors,'pass':True},indent=2));print('10 post-merge WebKit sizes + victory continuation PASS')
